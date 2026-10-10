//<script>
// ============================================================
// Magisk模块守护进程 v1.2 (UFI-TOOLS 插件)
// 功能:
//   1. 开机后1小时窗口内监控指定 Magisk 模块是否处于启用状态
//   2. 发现模块被禁用(disable/remove标记)自动拉起
//   3. 拉起后宽限期内仍未恢复 -> 自动救援重启设备
//   4. 救援重启累计5次后进入放弃模式, 等待人工处理
//   5. 放弃模式落盘: 手动修复模块或清除记录后约30秒内自动恢复监控
//   6. 全部模块连续5分钟正常后重启计数才自动清零(防反复禁用导致重启循环)
//   7. 可选: 拉起成功后立即重启激活模块(解决拉起后本周期模块不生效问题)
//   8. 界面显示上次重启状态/剩余守护时间, 支持手动清除
//   9. 双层守护(watchdog): 监控子进程异常退出自动重启, 主进程常驻
//  10. 真正可停止: 停止标志文件机制, boot循环不再复活已停止的守护
//
// v1.2 修复/变更:
//   - [修] 停止守护后会被 boot 循环复活 -> 引入停止标志文件, 停止/卸载先写标志
//   - [修] 达到重启上限后「清除记录」无法恢复守护(放弃模式卡在内存) -> 落盘到state
//   - [修] 默认标记检查下救援重启几乎不触发、拉起后模块本周期不生效 -> 新增重启激活开关
//   - [修] 面板关闭时机不巧导致4秒轮询定时器泄漏 -> modalOpen 守卫
//   - [修] pkill -f 模式自匹配误杀宿主shell -> 改用 [.] 括号模式
//   - [修] sed 自定义分隔符 \|...| 在 toybox 兼容性存疑 -> 改用转义斜杠通用写法
//   - [修] 重复安装时旧进程仍跑旧脚本(新旧混跑) -> 安装前先停旧实例
//   - [修] 入口按钮无等待重试, DOM未就绪时按钮无声消失 -> 挂载重试
//   - [修] genGuardScript 模板中 '\0' 被 JS 转义为 NUL 字节 -> 改用 grep 读 cmdline
//   - [修] 主进程被杀重启会重置1小时窗口 -> 用 boot_id 识别同一开机周期沿用原窗口
//   - [修] 达到上限那一轮未重启也写入"上次重启时间" -> 仅真正重启时记录
//   - [修] state_set 用 awk -v 传值会解释反斜杠 -> 改用 ENVIRON 传递
//   - [修] 监控列表解析兼容模块名含 tab; 配置读取逐行 while read 兼容含空格 id
//   - [修] boot 文件末行无换行时追加会拼接破坏上一行 -> 追加前补换行
//   - [优] 4秒状态轮询防重入; 重启计数清零需连续5分钟正常; 安装后文案修正
// ============================================================
(async () => {
    const VERSION = '1.2'
    const NAME = 'magisk_guard'
    const LS_KEY = 'magisk_guard_mods'
    const LS_ROF = 'magisk_guard_reboot_on_fix'
    const GUARD_DIR = '/data/adb/magisk_guard'
    const SH_FILE = GUARD_DIR + '/guard.sh'
    const CONF_FILE = GUARD_DIR + '/modules.conf'
    const SETTING_FILE = GUARD_DIR + '/setting.conf'
    const STATE_FILE = GUARD_DIR + '/state.conf'
    const LOG_FILE = GUARD_DIR + '/guard.log'
    const PID_FILE = GUARD_DIR + '/guard.pid'
    const STOP_FILE = GUARD_DIR + '/stop'
    const BOOT_FILE = '/sdcard/ufi_tools_boot.sh'
    const BOOT_LINE = `while :; do sh ${SH_FILE} >/dev/null 2>&1; sleep 5; done >/dev/null 2>&1 &`
    const MAX_REBOOT = 5

    // ─── utils ────────────────────────────────────────────────
    const sq = (v) => `'${String(v ?? '').replace(/'/g, `'\\''`)}'`
    const esc = (v) => String(v ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
    const run = async (cmd, timeout = 30000) => {
        try {
            return await runShellWithRoot(cmd, timeout)
        } catch {
            return { success: false, content: '' }
        }
    }
    const wait = (ms) => new Promise((r) => setTimeout(r, ms))

    const checkRoot = async () => {
        try {
            const res = await run('whoami')
            return res.success && res.content && res.content.includes('root')
        } catch {
            return false
        }
    }

    // 上传文件到机内(upload_img -> mv 标准通道)
    const uploadFile = async (filename, content, destPath) => {
        try {
            const file = new File([content], filename, { type: 'text/plain' })
            const formData = new FormData()
            formData.append('file', file)
            const uploadRes = await (await fetch(`${KANO_baseURL}/upload_img`, {
                method: 'POST', headers: common_headers, body: formData,
            })).json()
            if (!uploadRes.url) return false
            const tempPath = `/data/data/com.minikano.f50_sms/files${uploadRes.url}`
            const moveRes = await run(`mv ${tempPath} ${destPath}`)
            return !!moveRes.success
        } catch {
            return false
        }
    }

    // ─── 守护脚本模板 ──────────────────────────────────────────
    // 注意: 本模板内不得出现 JS 会转义的序列(如 \0), 已用 grep 读 cmdline 规避
    const genGuardScript = () => `#!/system/bin/sh
# Magisk模块守护进程 v${VERSION} (由UFI-TOOLS插件生成)
GUARD_DIR="${GUARD_DIR}"
CONF="$GUARD_DIR/modules.conf"
SETTING="$GUARD_DIR/setting.conf"
STATE="$GUARD_DIR/state.conf"
LOG="$GUARD_DIR/guard.log"
PIDF="$GUARD_DIR/guard.pid"
STOPF="$GUARD_DIR/stop"
MODULES_BASE="/data/adb/modules"
WINDOW_SEC=3600
CHECK_INTERVAL=30
GRACE_SEC=120
GOOD_STREAK_CLEAR=10
MAX_REBOOT=${MAX_REBOOT}

mkdir -p "$GUARD_DIR"

# 停止标志: 存在则静默退出(不写日志, 防止boot循环每5秒刷屏)
if [ -f "$STOPF" ]; then
    exit 0
fi

# 日志超过2000行时截断保留最后500行, 防止无限增长
if [ -f "$LOG" ]; then
    LC="$(wc -l < "$LOG")"
    case "$LC" in ''|*[!0-9]*) LC=0 ;; esac
    if [ "$LC" -gt 2000 ]; then
        tail -n 500 "$LOG" > "$LOG.new" && mv "$LOG.new" "$LOG"
    fi
fi

# 校验pid是否真的是本守护进程(防止重启后PID复用造成误判)
# 用 grep 直接读 /proc cmdline, 避免 tr 处理 NUL 分隔符的兼容性问题
pid_alive() {
    [ -n "$1" ] || return 1
    grep -q "guard.sh" "/proc/$1/cmdline" 2>/dev/null
}

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG" 2>/dev/null; }
cleanup() { rm -f "$PIDF"; log "守护退出"; }

state_get() {
    v="$(sed -n "s/^$1=//p" "$STATE" 2>/dev/null | head -n 1)"
    [ -z "$v" ] && v="$2"
    echo "$v"
}
state_set() {
    touch "$STATE"
    # 值通过 ENVIRON 传递, 避免 awk -v 对反斜杠做转义解释
    VALUE="$2" awk -v key="$1=" '
        index($0, key) == 1 { if (!done) { print key ENVIRON["VALUE"]; done=1; next } }
        { print }
        END { if (!done) print key ENVIRON["VALUE"] }
    ' "$STATE" > "$STATE.tmp" 2>/dev/null && mv "$STATE.tmp" "$STATE"
}

# 返回值: 0=正常 1=异常(需拉起) 2=模块目录不存在(跳过)
check_module() {
    DIR="$MODULES_BASE/$1"
    [ -d "$DIR" ] || return 2
    CUSTOM="$GUARD_DIR/check_$1.sh"
    if [ -x "$CUSTOM" ]; then
        sh "$CUSTOM" >/dev/null 2>&1 && return 0 || return 1
    fi
    [ -f "$DIR/disable" ] && return 1
    [ -f "$DIR/remove" ] && return 1
    return 0
}

try_enable() {
    rm -f "$MODULES_BASE/$1/disable" "$MODULES_BASE/$1/remove" 2>/dev/null
}

reboot_now() {
    state_set last_reboot_time "$(date '+%Y-%m-%d %H:%M:%S')"
    sync
    sleep 2
    reboot
    exit 0
}

# ============ 监控子进程(worker): 由watchdog拉起, 异常退出会被自动重启 ============
worker_main() {
    STREAK=0
    while :; do
        DEADLINE="$(state_get guard_deadline 0)"
        case "$DEADLINE" in ''|*[!0-9]*|0) DEADLINE=$(( $(cut -d. -f1 /proc/uptime) + WINDOW_SEC )) ;; esac
        NOW="$(cut -d. -f1 /proc/uptime)"
        case "$NOW" in ''|*[!0-9]*) NOW=0 ;; esac
        if [ "$NOW" -ge "$DEADLINE" ]; then
            log "守护窗口(1小时)结束, 监控子进程退出"
            exit 0
        fi

        if [ ! -f "$CONF" ] || [ ! -s "$CONF" ]; then
            sleep "$CHECK_INTERVAL"
            continue
        fi

        # 放弃模式(落盘, 每轮重读): 只做被动观察, 手动修复或清除记录后自动解除
        GIVE_UP="$(state_get give_up 0)"
        if [ "$GIVE_UP" = "1" ]; then
            ANYBAD=0
            while IFS= read -r M; do
                [ -z "$M" ] && continue
                check_module "$M"
                [ "$?" = "1" ] && ANYBAD=1
            done < "$CONF"
            if [ "$ANYBAD" = "0" ]; then
                state_set give_up 0
                state_set reboot_count 0
                log "全部监控模块已恢复正常, 自动解除放弃模式"
            fi
            sleep "$CHECK_INTERVAL"
            continue
        fi

        # 逐行读配置(兼容含空格的模块id), 发现异常立即拉起
        BAD=""
        while IFS= read -r M; do
            [ -z "$M" ] && continue
            check_module "$M"
            R=$?
            [ "$R" = "2" ] && continue
            if [ "$R" = "1" ]; then
                BAD="$BAD$M
"
                try_enable "$M"
                log "检测到模块 $M 未启用, 已尝试拉起"
            fi
        done < "$CONF"

        if [ -z "$BAD" ]; then
            STREAK=$((STREAK + 1))
            CNT="$(state_get reboot_count 0)"
            case "$CNT" in ''|*[!0-9]*) CNT=0 ;; esac
            # 计数清零需连续5分钟全部正常, 防止"禁用-拉起-清零"无限循环
            if [ "$CNT" != "0" ] && [ "$STREAK" -ge "$GOOD_STREAK_CLEAR" ]; then
                state_set reboot_count 0
                log "全部模块连续正常$((GOOD_STREAK_CLEAR * CHECK_INTERVAL))秒, 重启计数已自动清零"
            fi
            sleep "$CHECK_INTERVAL"
            continue
        fi
        STREAK=0

        sleep "$GRACE_SEC"

        STILL=""
        while IFS= read -r M; do
            [ -z "$M" ] && continue
            check_module "$M"
            R=$?
            [ "$R" = "1" ] && STILL="$STILL$M
"
        done <<EOF
$BAD
EOF

        PREV="$(state_get reboot_count 0)"
        case "$PREV" in ''|*[!0-9]*) PREV=0 ;; esac
        CNT=$((PREV + 1))

        if [ -z "$STILL" ]; then
            # 拉起复查通过。默认仅拉起不重启; 开启 reboot_on_fix 后重启一次以激活模块
            ROF="$(sed -n 's/^reboot_on_fix=//p' "$SETTING" 2>/dev/null | head -n 1)"
            if [ "$ROF" = "1" ]; then
                if [ "$CNT" -gt "$MAX_REBOOT" ]; then
                    state_set give_up 1
                    state_set last_reboot_reason "模块[$(echo $BAD)]拉起成功但已累计$MAX_REBOOT次救援重启, 停止自动拉起, 请人工处理"
                    log "已达最大重启上限($MAX_REBOOT), 停止拉起动作, 等待人工清除记录"
                    continue
                fi
                state_set reboot_count "$CNT"
                state_set last_reboot_module "$(echo $BAD)"
                state_set last_reboot_reason "模块[$(echo $BAD)]被禁用, 自动拉起成功, 重启以激活模块"
                log "拉起复查通过:$(echo $BAD) , 执行第$CNT次重启以激活模块(上限$MAX_REBOOT)"
                reboot_now
            fi
            log "拉起后复查通过:$(echo $BAD) , 重启计数清空"
            state_set reboot_count 0
            continue
        fi

        if [ "$CNT" -gt "$MAX_REBOOT" ]; then
            state_set give_up 1
            state_set last_reboot_reason "累计已执行$MAX_REBOOT次救援重启仍异常, 停止自动拉起, 请人工处理"
            log "已达最大重启上限($MAX_REBOOT), 停止拉起动作, 等待人工清除记录"
            continue
        fi

        state_set reboot_count "$CNT"
        state_set last_reboot_module "$(echo $STILL)"
        state_set last_reboot_reason "开机1小时内模块[$(echo $STILL)]未能保持启用, 自动拉起并救援重启"
        log "模块$(echo $STILL) 复查仍异常, 执行第$CNT次救援重启(上限$MAX_REBOOT)"
        reboot_now
    done
}

# worker 分支(由watchdog以 sh $0 --worker 参数拉起)
if [ "$1" = "--worker" ]; then
    worker_main
    exit 0
fi

# ============ 主入口: 停止标志 + 防多开 + watchdog 保活 ============
OLD="$(cat "$PIDF" 2>/dev/null)"
if [ "$OLD" != "$$" ] && pid_alive "$OLD"; then
    log "守护已在运行(PID=$OLD), 本次启动退出"
    exit 0
fi
echo $$ > "$PIDF"
trap 'cleanup; exit 0' INT TERM

# 窗口计算: 用 boot_id 识别开机周期, 同周期内主进程被杀重启沿用原窗口, 不重置计时
NOW="$(cut -d. -f1 /proc/uptime)"
case "$NOW" in ''|*[!0-9]*) NOW=0 ;; esac
BOOT_ID="$(head -n 1 /proc/sys/kernel/random/boot_id 2>/dev/null)"
SAVED_ID="$(state_get boot_id '')"
if [ -n "$BOOT_ID" ] && [ "$BOOT_ID" = "$SAVED_ID" ]; then
    DEADLINE="$(state_get guard_deadline 0)"
    case "$DEADLINE" in ''|*[!0-9]*) DEADLINE=0 ;; esac
    if [ "$DEADLINE" -le "$NOW" ]; then
        log "本开机周期守护窗口已结束, 主进程保持待机, 下次开机自动重新开始"
        while :; do sleep 300; done
    fi
    log "守护主进程重启(同一开机周期), 沿用原守护窗口"
else
    DEADLINE=$((NOW + WINDOW_SEC))
    state_set guard_deadline "$DEADLINE"
    state_set boot_id "$BOOT_ID"
fi
log "===== Magisk模块守护启动 PID=$$ 守护窗口1小时 ====="
log "首次启动等待45秒..."
sleep 45

# watchdog: 无限循环拉起监控子进程, 子进程异常退出3秒后自动重启;
# 窗口结束后主进程保持待机存活(不再监控), 下次开机自动重新开始
while :; do
    NOW="$(cut -d. -f1 /proc/uptime)"
    case "$NOW" in ''|*[!0-9]*) NOW=0 ;; esac
    if [ "$NOW" -ge "$DEADLINE" ]; then
        log "守护窗口(1小时)已结束, 主进程保持待机, 下次开机自动重新开始"
        while :; do sleep 300; done
    fi
    sh "$0" --worker &
    W=$!
    wait "$W"
    RC=$?
    NOW="$(cut -d. -f1 /proc/uptime)"
    case "$NOW" in ''|*[!0-9]*) NOW=0 ;; esac
    if [ "$NOW" -ge "$DEADLINE" ]; then
        log "监控子进程退出(码$RC), 窗口已结束, 主进程进入待机"
        while :; do sleep 300; done
    fi
    log "监控子进程异常退出(码$RC), 3秒后自动重启"
    sleep 3
done
`

    // ─── 机内数据读取 ──────────────────────────────────────────
    const listModules = async () => {
        const res = await run(`
for d in /data/adb/modules/* ; do
  [ -d "$d" ] || continue
  [ -f "$d/module.prop" ] || continue
  p() { grep "^$1=" "$d/module.prop" 2>/dev/null | head -n 1 | cut -d '=' -f 2- ; }
  id="$(basename "$d")"
  nm="$(p name)"
  [ -z "$nm" ] && nm="$id"
  ver="$(p version)"
  en=1
  [ -f "$d/disable" ] && en=0
  rm=0
  [ -f "$d/remove" ] && rm=1
  printf '%s\\t%s\\t%s\\t%s\\t%s\\n' "$id" "$nm" "$ver" "$en" "$rm"
done
`, 30000)
        if (!res.success || !res.content) return []
        // 从两端定位固定列(id首列, removed/enabled/version为末三列), 兼容名称中含 tab
        return res.content.split('\n').filter((l) => l.trim()).map((line) => {
            const parts = line.split('\t')
            if (parts.length < 5) return null
            const id = parts[0]
            const removed = parts[parts.length - 1] === '1'
            const enabled = parts[parts.length - 2] === '1'
            const version = parts[parts.length - 3] || '-'
            const name = parts.slice(1, parts.length - 3).join(' ') || id
            return { id, name, version, enabled, removed }
        }).filter(Boolean).filter((m) => m.id)
    }

    const readStatus = async () => {
        const res = await run(`
RUN=0
PID="$(cat ${sq(PID_FILE)} 2>/dev/null)"
if [ -n "$PID" ] && [ -r "/proc/$PID/cmdline" ]; then
    grep -q "guard.sh" "/proc/$PID/cmdline" 2>/dev/null && RUN=1
fi
AUTO=0
grep -q "magisk_guard/guard.sh" ${sq(BOOT_FILE)} 2>/dev/null && AUTO=1
CNT="$(sed -n 's/^reboot_count=//p' ${sq(STATE_FILE)} 2>/dev/null | head -n 1)"
[ -z "$CNT" ] && CNT=0
GU="$(sed -n 's/^give_up=//p' ${sq(STATE_FILE)} 2>/dev/null | head -n 1)"
[ -z "$GU" ] && GU=0
ROF="$(sed -n 's/^reboot_on_fix=//p' ${sq(SETTING_FILE)} 2>/dev/null | head -n 1)"
LRT="$(sed -n 's/^last_reboot_time=//p' ${sq(STATE_FILE)} 2>/dev/null | head -n 1)"
LRM="$(sed -n 's/^last_reboot_module=//p' ${sq(STATE_FILE)} 2>/dev/null | head -n 1)"
LRR="$(sed -n 's/^last_reboot_reason=//p' ${sq(STATE_FILE)} 2>/dev/null | head -n 1)"
DL="$(sed -n 's/^guard_deadline=//p' ${sq(STATE_FILE)} 2>/dev/null | head -n 1)"
NOW="$(cut -d. -f1 /proc/uptime)"
case "$DL" in ''|*[!0-9]*) DL="" ;; esac
case "$NOW" in ''|*[!0-9]*) NOW=0 ;; esac
REMAIN=""
if [ -n "$DL" ]; then
    REMAIN=$((DL - NOW))
    [ "$REMAIN" -lt 0 ] && REMAIN=0
fi
echo "RUN=$RUN"
echo "PID=$PID"
echo "AUTO=$AUTO"
echo "CNT=$CNT"
echo "GU=$GU"
echo "ROF=$ROF"
echo "LRT=$LRT"
echo "LRM=$LRM"
echo "LRR=$LRR"
echo "REMAIN=$REMAIN"
echo "---LOG---"
[ -f ${sq(LOG_FILE)} ] && timeout 2s tail -n 10 ${sq(LOG_FILE)} 2>/dev/null
`, 15000)
        const st = { run: false, pid: '', auto: false, cnt: 0, gu: false, rof: '', lrt: '', lrm: '', lrr: '', remain: null, log: '' }
        if (!res.success || !res.content) return st
        const lines = res.content.split('\n')
        let inLog = false
        const logLines = []
        for (const l of lines) {
            if (l === '---LOG---') { inLog = true; continue }
            if (inLog) { logLines.push(l); continue }
            const kv = l.match(/^(\w+)=(.*)$/)
            if (kv) {
                const [, k, v] = kv
                if (k === 'RUN') st.run = v === '1'
                if (k === 'PID') st.pid = v
                if (k === 'AUTO') st.auto = v === '1'
                if (k === 'CNT') st.cnt = parseInt(v) || 0
                if (k === 'GU') st.gu = v === '1'
                if (k === 'ROF') st.rof = v
                if (k === 'LRT') st.lrt = v
                if (k === 'LRM') st.lrm = v
                if (k === 'LRR') st.lrr = v
                if (k === 'REMAIN') st.remain = v !== '' ? (parseInt(v) || 0) : null
            }
        }
        st.log = logLines.join('\n').trim()
        return st
    }

    // ─── 操作 ──────────────────────────────────────────────────
    const getCheckedIds = () =>
        [...document.querySelectorAll('#mg_mod_list input[type="checkbox"]:checked')].map((i) => i.value)

    const saveConf = async (ids) => {
        if (!ids.length) return createToast('请至少勾选一个模块', 'red')
        localStorage.setItem(LS_KEY, JSON.stringify(ids))
        const ok = await uploadFile('modules.conf', ids.join('\n'), CONF_FILE)
        if (ok) createToast('监控列表已保存', 'green')
        else createToast('保存监控列表失败', 'red')
        return ok
    }

    const saveRofSetting = async (on) => {
        localStorage.setItem(LS_ROF, on ? '1' : '0')
        await run(`mkdir -p ${sq(GUARD_DIR)}`)
        return await uploadFile('setting.conf', `reboot_on_fix=${on ? '1' : '0'}`, SETTING_FILE)
    }

    const startDaemon = async () => {
        // 先移除停止标志再启动, boot循环复活的新实例也能正常驻留
        await run(`rm -f ${sq(STOP_FILE)}; nohup sh ${SH_FILE} >/dev/null 2>&1 &`)
        await wait(800)
        let st = await readStatus()
        if (!st.run) {
            await run(`rm -f ${sq(STOP_FILE)}; nohup sh ${SH_FILE} >/dev/null 2>&1 &`)
            await wait(800)
            st = await readStatus()
        }
        if (st.run) createToast('守护进程已启动', 'green')
        else createToast('守护进程可能未启动成功, 请刷新查看', 'pink')
    }

    const stopDaemon = async () => {
        // 先写停止标志(boot循环拉起的新实例会静默退出), 再杀进程
        await run(`
mkdir -p ${sq(GUARD_DIR)}
touch ${sq(STOP_FILE)}
rm -f ${sq(PID_FILE)}
pkill -f "magisk_guard/guard[.]sh" 2>/dev/null
true
`)
        createToast('守护进程已停止(已写入停止标志, 开机自启也不会再拉起)')
    }

    const clearRecord = async () => {
        await run(`
mkdir -p ${sq(GUARD_DIR)}
touch ${sq(STATE_FILE)}
sed -i '/^last_reboot_/d' ${sq(STATE_FILE)}
sed -i '/^give_up=/d' ${sq(STATE_FILE)}
sed -i 's/^reboot_count=.*/reboot_count=0/' ${sq(STATE_FILE)}
true
`)
        createToast('已清除重启记录与计数, 放弃模式将在约30秒内自动解除', 'green')
    }

    const installDaemon = async (ids, rofOn = true) => {
        createToast('正在安装守护...')
        // 先停掉旧实例(写标志防复活), 避免覆盖脚本后新旧版本混跑
        await run(`
mkdir -p ${sq(GUARD_DIR)}
touch ${sq(STOP_FILE)}
pkill -f "magisk_guard/guard[.]sh" 2>/dev/null
true
`)
        await wait(600)
        if (!(await uploadFile('guard.sh', genGuardScript(), SH_FILE))) {
            return createToast('传输守护脚本失败!', 'red')
        }
        await run(`chmod 755 ${sq(SH_FILE)}`)
        if (!(await saveConf(ids))) return
        if (!(await saveRofSetting(rofOn))) createToast('拉起后重启开关写入设备失败', 'red')
        // 先清除旧的 boot 行(兼容 v1.0/v1.1), 补尾换行后再写入, 重复安装幂等
        await run(`sed -i '/magisk_guard\\/guard.sh/d' ${sq(BOOT_FILE)} 2>/dev/null; [ -n "$(tail -c 1 ${sq(BOOT_FILE)} 2>/dev/null)" ] && echo >> ${sq(BOOT_FILE)}; echo ${sq(BOOT_LINE)} >> ${sq(BOOT_FILE)}`)
        await startDaemon()
        await wait(3000)
        const after = await readStatus()
        if (!after.run) createToast('未检测到守护运行, 请稍后点刷新确认并查看日志', 'red')
    }

    const uninstallDaemon = async () => {
        createToast('正在卸载守护...')
        // 顺序: 移除自启行 -> 写停止标志(封死复活窗口) -> 杀进程 -> 等一轮boot循环 -> 补杀 + 删目录
        await run(`
sed -i '/magisk_guard\\/guard.sh/d' ${sq(BOOT_FILE)} 2>/dev/null
mkdir -p ${sq(GUARD_DIR)}
touch ${sq(STOP_FILE)}
pkill -f "magisk_guard/guard[.]sh" 2>/dev/null
true
`)
        await wait(6000)
        await run(`
pkill -f "magisk_guard/guard[.]sh" 2>/dev/null
rm -rf ${sq(GUARD_DIR)}
true
`)
        createToast('守护已卸载', 'green')
    }

    // ─── UI ────────────────────────────────────────────────────
    let refreshTimer = null
    let refreshBusy = false
    let uninstallArmed = false
    let modalOpen = false

    const renderStatus = (st, el) => {
        const box = el.querySelector('#mg_status_box')
        if (!box) return
        const runBadge = st.run ? '<span style="color:#52c41a">【运行中】</span>' : '<span style="color:#ff4d4f">【未运行】</span>'
        const autoBadge = st.auto ? '<span style="color:#52c41a">已安装</span>' : '<span style="color:#faad14">未安装</span>'
        const giveUpTip = st.gu ? '<div style="color:#ff4d4f">已放弃自动拉起: 手动修复模块或清除记录后约30秒内自动恢复</div>' : ''
        const remainText = (() => {
            if (!st.run || typeof st.remain !== 'number') return '-'
            if (st.remain <= 0) return '<span style="color:#faad14">窗口已结束, 待机中(下次开机自动开始)</span>'
            const h = Math.floor(st.remain / 3600)
            const m = Math.floor((st.remain % 3600) / 60)
            const s = st.remain % 60
            return `${h}时${String(m).padStart(2, '0')}分${String(s).padStart(2, '0')}秒`
        })()
        const cntColor = st.cnt >= MAX_REBOOT ? '#ff4d4f' : st.cnt > 0 ? '#faad14' : '#52c41a'
        let recordHtml = '无记录'
        if (st.lrt) {
            recordHtml = `
                <div>时间:${esc(st.lrt)}</div>
                <div>模块:${esc(st.lrm || '-')}</div>
                <div>原因:${esc(st.lrr || '-')}</div>`
        }
        box.innerHTML = `
            <div>守护进程:${runBadge}${st.run && st.pid ? `(PID:${esc(st.pid)})` : ''}</div>
            <div>开机自启:${autoBadge}</div>
            <div>救援重启计数:<span style="color:${cntColor};font-weight:bold">${st.cnt}</span> / ${MAX_REBOOT}</div>
            <div>剩余守护时间:<span style="font-weight:bold">${remainText}</span></div>
            ${giveUpTip}
            <div>上次重启记录:</div>
            <div style="padding-left:12px">${recordHtml}</div>`
    }

    const renderModules = (modules, el) => {
        const wrap = el.querySelector('#mg_mod_list')
        if (!wrap) return
        let saved = []
        try { saved = JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch {}
        // 捕获当前未保存的勾选, 重建列表时保留
        const curChecked = new Set([...wrap.querySelectorAll('input[type="checkbox"]:checked')].map((i) => i.value))
        const savedIds = new Set(saved)
        wrap.innerHTML = modules.length
            ? modules.map((m) => {
                const flags = []
                if (!m.enabled) flags.push('<span style="color:#ff4d4f">[已禁用]</span>')
                if (m.removed) flags.push('<span style="color:#faad14">[待删除]</span>')
                const isChecked = savedIds.has(m.id) || curChecked.has(m.id) ? 'checked' : ''
                return `
                    <label style="display:flex;align-items:center;gap:6px">
                        <input type="checkbox" value="${esc(m.id)}" ${isChecked}>
                        <span>${esc(m.name)}<small> (${esc(m.id)}) v${esc(m.version)} ${flags.join(' ')}</small></span>
                    </label>`
            }).join('')
            : '<div>未读取到任何 Magisk 模块</div>'
    }

    const refreshStatus = async (el) => {
        if (refreshBusy) return null
        refreshBusy = true
        try {
            const st = await readStatus()
            if (!modalOpen) return st
            renderStatus(st, el)
            const logEl = el.querySelector('#mg_log')
            if (logEl) logEl.value = st.log || '(暂无日志)'
            // 设备端已存在开关配置时以设备为准回显
            const rofEl = el.querySelector('#mg_rof')
            if (rofEl && st.rof !== '') rofEl.checked = st.rof === '1'
            return st
        } finally {
            refreshBusy = false
        }
    }

    const openModal = async () => {
        if (modalOpen) {
            return createToast('Magisk守护面板已打开')
        }
        modalOpen = true
        if (!(await checkRoot())) {
            modalOpen = false
            return createToast('请先打开高级功能', 'red')
        }

        const { id, el } = createModal({
            name: NAME,
            title: `Magisk模块守护进程 v${VERSION}`,
            maxWidth: '520px',
            onClose: () => {
                if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
                uninstallArmed = false
                modalOpen = false
                return true
            },
            onConfirm: () => true,
            content: `
    <div style="display:flex;flex-direction:column;gap:12px;font-size:.75rem">
        <div>
            <div class="title" style="font-size:.7rem;margin-bottom:6px">运行状态</div>
            <div id="mg_status_box">加载中...</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn" id="mg_btn_install">安装并启动守护</button>
            <button class="btn" id="mg_btn_start">启动守护</button>
            <button class="btn" id="mg_btn_stop">停止守护</button>
            <button class="btn" id="mg_btn_uninstall">卸载守护</button>
            <button class="btn" id="mg_btn_clear">清除重启记录</button>
            <button class="btn" id="mg_btn_refresh">刷新状态</button>
        </div>
        <div>
            <div class="title" style="font-size:.7rem;margin-bottom:6px">监控模块(勾选需要守护的模块)</div>
            <div id="mg_mod_list" style="max-height:220px;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:4px"></div>
            <div style="margin-top:8px"><button class="btn" id="mg_btn_save">保存监控列表</button></div>
            <label style="display:flex;align-items:flex-start;gap:6px;margin-top:8px;line-height:1.5">
                <input type="checkbox" id="mg_rof" style="margin-top:3px">
                <span>拉起成功后立即救援重启以激活模块<br>
                <small style="opacity:.7">默认只删标记不重启, 但被拉起的模块要下次重启才真正生效; 开启后每次成功拉起都会重启一次设备(仍受重启上限保护)</small></span>
            </label>
        </div>
        <div>
            <div class="title" style="font-size:.7rem;margin-bottom:6px">守护说明</div>
            <div style="opacity:.75;line-height:1.6">
                开机后1小时内每30秒检查勾选的模块是否被禁用, 发现即自动拉起(删除 disable/remove 标记);
                拉起后120秒复查, 仍异常将救援重启设备; 累计重启达${MAX_REBOOT}次后进入放弃模式停止拉起,
                手动修复模块或点「清除重启记录」后约30秒内自动恢复监控; 全部模块连续5分钟正常后计数才自动清零。
                「停止守护」会写入停止标志, 开机自启循环也不会再拉起; 重新「安装并启动」或「启动守护」即恢复。
                双层守护: 监控子进程异常退出3秒后自动拉起, 主进程常驻; boot侧外层循环会在主进程被强杀后重新拉起。
                1小时窗口结束后主进程待机, 本开机周期内不再监控, 下次开机自动重新开始(同周期内守护自身被重启不重置窗口)。
                高级用法: 可在 ${GUARD_DIR} 下放置可执行的自定义检查脚本 check_模块id.sh,
                退出码0=正常 1=异常, 可实现功能级检测(默认只检测标记文件)。
            </div>
        </div>
        <div>
            <div class="title" style="font-size:.7rem;margin-bottom:6px">守护日志</div>
            <textarea id="mg_log" readonly rows="6"
                style="width:100%;font-size:.65rem;background:transparent;color:inherit;border:1px solid var(--dark-border-color,#555);border-radius:6px;padding:6px;box-sizing:border-box"></textarea>
        </div>
    </div>
    `,
        })

        // 绑定按钮
        el.querySelector('#mg_btn_save').onclick = async () => {
            const ids = getCheckedIds()
            if (!ids.length) return createToast('请至少勾选一个模块', 'red')
            await saveConf(ids)
        }

        el.querySelector('#mg_btn_install').onclick = async () => {
            const ids = getCheckedIds()
            if (!ids.length) return createToast('请先勾选监控模块再安装', 'red')
            await installDaemon(ids, el.querySelector('#mg_rof')?.checked)
            await refreshStatus(el)
        }

        el.querySelector('#mg_btn_start').onclick = async () => {
            createToast('正在启动守护...')
            await startDaemon()
            await refreshStatus(el)
        }

        el.querySelector('#mg_btn_stop').onclick = async () => {
            await stopDaemon()
            await refreshStatus(el)
        }

        el.querySelector('#mg_btn_clear').onclick = async () => {
            await clearRecord()
            await refreshStatus(el)
        }

        el.querySelector('#mg_btn_refresh').onclick = async () => {
            createToast('刷新中...')
            const mods = await listModules()
            if (!modalOpen) return
            renderModules(mods, el)
            await refreshStatus(el)
        }

        const btnUninstall = el.querySelector('#mg_btn_uninstall')
        btnUninstall.onclick = async () => {
            if (!uninstallArmed) {
                uninstallArmed = true
                btnUninstall.textContent = '再点一次确认卸载'
                setTimeout(() => {
                    uninstallArmed = false
                    if (btnUninstall.isConnected) btnUninstall.textContent = '卸载守护'
                }, 3000)
                return
            }
            uninstallArmed = false
            btnUninstall.textContent = '卸载守护'
            await uninstallDaemon()
            await refreshStatus(el)
        }

        // 拉起后重启激活开关: 变更即保存到设备
        const rofCb = el.querySelector('#mg_rof')
        try { rofCb.checked = (localStorage.getItem(LS_ROF) ?? '1') !== '0' } catch { rofCb.checked = true }
        rofCb.onchange = async () => {
            const ok = await saveRofSetting(rofCb.checked)
            if (ok) createToast(rofCb.checked ? '已开启: 拉起成功后重启激活模块' : '已关闭: 拉起成功后仅拉起不重启', 'green')
            else createToast('开关写入设备失败', 'red')
        }

        showModal(id)

        // 首屏加载 + 定时刷新(任意一步发现面板已关闭则立即止损, 防止定时器泄漏)
        const mods = await listModules()
        if (!modalOpen) return
        renderModules(mods, el)
        await refreshStatus(el)
        if (!modalOpen) return
        refreshTimer = setInterval(() => {
            if (!modalOpen) {
                clearInterval(refreshTimer)
                refreshTimer = null
                return
            }
            refreshStatus(el)
        }, 4000)
    }

    // ─── 入口按钮 ───────────────────────────────────────────────
    const mainBtn = document.createElement('button')
    mainBtn.classList.add('btn')
    mainBtn.textContent = 'Magisk守护'
    mainBtn.onclick = openModal

    // 等待宿主 DOM 就绪再挂载(插件执行时机可能早于页面渲染)
    const mountBtn = async () => {
        for (let i = 0; i < 300; i++) {
            const box = document.querySelector('.actions-buttons')
            if (box) {
                if (!box.contains(mainBtn)) box.appendChild(mainBtn)
                return
            }
            await wait(120)
        }
    }
    mountBtn()
})()
//</script>
