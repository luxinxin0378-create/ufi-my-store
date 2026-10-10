//热点检测修复：参照热点管理直接执行dumpsys管道，接口超时30秒；兼容缩进和状态附加文字
//界面调整：恢复原字体样式，采用外层蒙版与内层实色弹窗
//0.8.2修复：停用时检查自启动移除和进程退出，失败不再提示成功
//0.8.2修复：脚本和配置先暂存校验，应用失败回滚，防止新旧规则不一致
//0.8.2修复：使用JSON.parse读取热点配置，支持单行JSON和转义字符；保存时同步到后台
//0.8.2修复：手动热点操作核对命令结果和实际状态，失败不再提示已开启/关闭
//0.8.2完善：保存/停用互斥，后台启动确认进程存活；保留10秒检测和10KB日志上限
//<script>
(async () => {
    const MODAL_ID = 'kano_bm_modal'
    const STYLE_ID = 'kano_bm_style'
    const NAME = 'kano_low_battery'
    const CONFIG_FILE = '/sdcard/kano_low_battery_config.conf'
    const SH_FILE = '/sdcard/kano_low_battery.sh'
    const LOG_FILE = '/sdcard/kano_low_battery_log.log'
    const BOOT_SH_FILE = '/sdcard/ufi_tools_boot.sh'
    const HOTSPOT_CFG_FILE = '/data/kano_softap_manager/config.json'

    let CONFIG = {
        enabled: false,
        car: { enabled: false, delayMinutes: 20 },
        t: [
            { level: 20, action: 'hotspot_off', enabled: true },
            { level: 5, action: 'shutdown', enabled: true },
        ]
    }

    const ACT = {
        none: '无操作',
        hotspot_off: '关闭热点',
        hotspot_on: '打开热点',
        shutdown: '关闭电源',
        reboot: '重启',
    }

    const DEFAULT_HOTSPOT = { ssid: 'KanoHotspot', security: 'wpa2', password: '12345678', band: '2' }
    const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'"
    let operationBusy = false

    // 前台与后台使用同一状态解析；无可识别输出时不能当作关闭。
    const HOTSPOT_STATUS_COMMAND = `dumpsys wifi | awk '
BEGIN { inside=0; enabled=0; stopped=0 }
{
    line=$0
    sub(/^[[:space:]]+/, "", line)
    sub(/[[:space:]]+$/, "", line)
    if (line ~ /^Dump of SoftApManager([[:space:]:]|$)/) { inside=1; next }
    if (line ~ /^Dump of /) { inside=0 }
    if (inside && line ~ /^current StateMachine mode:[[:space:]]*StartedState([[:space:]]|$)/) enabled=1
    if (inside && line ~ /^current StateMachine mode:[[:space:]]*IdleState([[:space:]]|$)/) stopped=1
}
END { print enabled ? "true" : (stopped ? "false" : "unknown") }
'`

    // 后台与手动热点控制共用同一套外部电源识别。
    const POWER_READER = `# 不使用 Cl5.1 的充电开关判断插拔电；软件停充不等于电源断开。
read_power() {
    POWER=-1
    for supply in /sys/class/power_supply/*; do
        [ -r "$supply/type" ] || continue
        TYPE=$(cat "$supply/type" 2>/dev/null)
        case "$TYPE" in Battery|Unknown|'') continue ;; esac
        for field in present online; do
            [ -r "$supply/$field" ] || continue
            VALUE=$(cat "$supply/$field" 2>/dev/null)
            case "$VALUE" in
                1) POWER=1; return ;;
                0) POWER=0 ;;
            esac
        done
    done
    # 部分驱动停充时 online=0，继续核对 Android 外部供电标志。
    FRAMEWORK_POWER=$(dumpsys battery | awk '
        /AC powered:|USB powered:|Wireless powered:|Dock powered:/ {
            if ($NF == "true") on=1
            if ($NF == "true" || $NF == "false") known=1
        }
        END { print known ? (on ? 1 : 0) : -1 }')
    if [ "$FRAMEWORK_POWER" = 1 ]; then POWER=1; return; fi
    if [ "$FRAMEWORK_POWER" = 0 ]; then POWER=0; fi
    # 仅当没有外部电源信息时使用正向充电状态兜底。
    # Discharging / Not charging 不能证明拔电，保留未知状态。
    if [ "$POWER" = -1 ]; then
        STATUS=$(cat /sys/class/power_supply/battery/status 2>/dev/null)
        case "$STATUS" in Charging|Full) POWER=1 ;; esac
    fi
}
`

    // 两个功能共用一个守护进程，先检查低电量，再处理车载热点。
    const genScript = (hotspot = DEFAULT_HOTSPOT, settings = CONFIG) => {
        const active = settings.enabled ? settings.t.filter(t => t.enabled && t.action !== 'none') : []
        const blockLevels = active.filter(t => ['hotspot_off', 'shutdown', 'reboot'].includes(t.action)).map(t => t.level)
        const rules = active.map((t, i) => {
            const cmd = { hotspot_off: ':', hotspot_on: '[ "$LOW_BLOCK" = 1 ] || start_hotspot', shutdown: 'reboot -p', reboot: 'reboot' }[t.action]
            const grace = ['shutdown', 'reboot'].includes(t.action) ? ' && [ "$ELAPSED" -ge 60 ]' : ''
            return `
    if [ "$CAPACITY" -gt ${t.level} ]; then
        TRIGGERED_${i}=0
    elif [ "$TRIGGERED_${i}" != 1 ]${grace}; then
        log "电量 $CAPACITY% ≤ ${t.level}%，执行: ${ACT[t.action]}"
        ${cmd}
        TRIGGERED_${i}=1
    fi`
        }).join('\n')
        return `#!/system/bin/sh
# kano auto generated: low battery manager 0.8.2 / car hotspot
LOG_FILE="${LOG_FILE}"
STATE_FILE="/data/local/tmp/kano_low_battery_car.state"
CHECK_INTERVAL=10
LOG_MAX_BYTES=10240
CAR_ENABLED=${settings.car.enabled ? 1 : 0}
DELAY_SECONDS=${settings.car.delayMinutes * 60}
BLOCK_LEVEL=${blockLevels.length ? Math.max(...blockLevels) : -1}
CAPACITY_PATH="/sys/class/power_supply/battery/capacity"
BOOT_ID=$(cat /proc/sys/kernel/random/boot_id)
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
    LOG_BYTES=$(wc -c < "$LOG_FILE" 2>/dev/null)
    if [ "\${LOG_BYTES:-0}" -ge "$LOG_MAX_BYTES" ]; then
        : > "$LOG_FILE"
    fi
}
monotonic() { cut -d. -f1 /proc/uptime; }
hotspot_on() {
    HOTSPOT_STATE=$(
${HOTSPOT_STATUS_COMMAND}
    )
    [ "$HOTSPOT_STATE" = true ]
}
start_hotspot() {
    hotspot_on && return
    # 由保存时的 JSON.parse 解析并安全引用，避免 shell 按行解析 JSON。
    H_SSID=${quote(hotspot.ssid)}
    H_SEC=${quote(hotspot.security)}
    H_PASS=${quote(hotspot.password)}
    H_BAND=${quote(hotspot.band)}
    if [ "$H_SEC" = open ]; then
        cmd wifi start-softap "$H_SSID" "$H_SEC" -b "$H_BAND"
    else
        cmd wifi start-softap "$H_SSID" "$H_SEC" "$H_PASS" -b "$H_BAND"
    fi
}
${POWER_READER}
START_TIME=$(monotonic)
UNPLUGGED_AT=-1
PREV_POWER=-1
LAST_BLOCK=-1
# 保存拔电起点，提交设置或重启守护进程不会重新计时；重启设备后重新计时。
if [ "$CAR_ENABLED" = 1 ] && [ -r "$STATE_FILE" ]; then
    read SAVED_BOOT SAVED_AT < "$STATE_FILE"
    case "$SAVED_AT" in ''|*[!0-9]*) ;; *)
        if [ "$SAVED_BOOT" = "$BOOT_ID" ] && [ "$SAVED_AT" -le "$START_TIME" ]; then
            UNPLUGGED_AT=$SAVED_AT
        fi ;;
    esac
else
    rm -f "$STATE_FILE"
fi
log "管理服务 0.8.2 已启动，车载热点=$CAR_ENABLED，拔电延时=${settings.car.delayMinutes}分钟"
check_battery() {
    LOW_BLOCK=0
    if [ "$POWER" = 1 ]; then
        # 插电跳过所有低电量动作，并使下一次拔电可以重新触发。
${active.map((_, i) => `        TRIGGERED_${i}=0`).join('\n')}
        return
    fi
    CAPACITY=$(cat "$CAPACITY_PATH" 2>/dev/null)
    case "$CAPACITY" in ''|*[!0-9]*)
        # 配置了保护时，无法读取电量就暂不允许车载热点开启。
        [ "$BLOCK_LEVEL" -ge 0 ] && LOW_BLOCK=1
        return ;;
    esac
    if [ "$CAPACITY" -le "$BLOCK_LEVEL" ]; then LOW_BLOCK=1; fi
    ELAPSED=$((NOW - START_TIME))
${rules}
}
check_car() {
    [ "$CAR_ENABLED" = 1 ] || return
    case "$POWER" in
        1)
            if [ "$PREV_POWER" != 1 ]; then log "已插电，取消拔电倒计时"; fi
            UNPLUGGED_AT=-1
            rm -f "$STATE_FILE"
            [ "$LOW_BLOCK" = 1 ] || start_hotspot
            ;;
        0)
            if [ "$UNPLUGGED_AT" = -1 ]; then
                UNPLUGGED_AT=$NOW
                printf '%s %s\n' "$BOOT_ID" "$UNPLUGGED_AT" > "$STATE_FILE"
                log "未插电，开始 ${settings.car.delayMinutes} 分钟倒计时"
            fi
            if [ "$((NOW - UNPLUGGED_AT))" -ge "$DELAY_SECONDS" ]; then
                hotspot_on
                if [ "$HOTSPOT_STATE" != false ]; then
                    log "拔电延时已到，关闭热点"
                    cmd wifi stop-softap
                fi
            fi
            ;;
        *) return ;;
    esac
    PREV_POWER=$POWER
}
while true; do
    NOW=$(monotonic)
    read_power
    check_battery
    if [ "$LOW_BLOCK" = 1 ]; then
        # 持续强制关闭，避免车载功能或其他操作重新开启。
        cmd wifi stop-softap >/dev/null 2>&1
        [ "$LAST_BLOCK" = 1 ] || log "低电量保护优先：禁止开启热点"
    fi
    LAST_BLOCK=$LOW_BLOCK
    check_car
    sleep "$CHECK_INTERVAL"
done
`
    }

    // ─── helpers ──────────────────────────────────────────────────────────────
    const checkRoot = async () => {
        try {
            const res = await runShellWithRoot('whoami')
            return res.success && res.content.includes('root')
        } catch { return false }
    }

    const uploadFile = async (filename, content, destPath) => {
        try {
            const file = new File([content], filename, { type: 'text/plain' })
            const formData = new FormData()
            formData.append('file', file)
            const uploadRes = await (await fetch(`${KANO_baseURL}/upload_img`, {
                method: 'POST', headers: common_headers, body: formData,
            })).json()
            if (uploadRes.url) {
                const tempPath = `/data/data/com.minikano.f50_sms/files${uploadRes.url}`
                const moveRes = await runShellWithRoot(`mv ${quote(tempPath)} ${quote(destPath)}`)
                return moveRes.success
            }
            return false
        } catch { return false }
    }

    const processList = async () => {
        const r = await runShellWithRoot('ps -ef')
        if (!r.success) throw new Error('无法读取后台进程')
        return String(r.content).split('\n').filter(line => {
            const args = line.trim().split(/\s+/)
            return args.includes(SH_FILE) && !args.includes('-c')
        }).map(line => line.trim().split(/\s+/)[1]).filter(pid => /^\d+$/.test(pid))
    }
    const killProcessByName = async () => {
        for (const pid of await processList()) {
            const r = await runShellWithRoot(`kill ${pid}`)
            if (!r.success && (await processList()).includes(pid)) throw new Error('无法结束旧后台进程')
        }
        for (let i = 0; i < 10; i++) {
            if (!(await processList()).length) return
            await new Promise(r => setTimeout(r, 200))
        }
        throw new Error('后台进程尚未退出，请重试')
    }
    const startService = async () => {
        const r = await runShellWithRoot(`/system/bin/sh ${SH_FILE} >/dev/null 2>&1 < /dev/null &`)
        if (!r.success) throw new Error('启动后台失败')
        await new Promise(r => setTimeout(r, 500))
        if (!(await processList()).length) throw new Error('后台进程启动后已退出')
    }

    // ─── hotspot status ──────────────────────────────────────────────────────
    const getHotspotStatus = async () => {
        try {
            const r = await runShellWithRoot(HOTSPOT_STATUS_COMMAND, 30000)
            const value = String(r?.content ?? '').replace(/\r/g, '').trim()
            // 与参考插件一致，以命令返回的明确状态为准。
            return ['true', 'false'].includes(value) ? value === 'true' : null
        } catch { return null }
    }

    const getHotspotCfg = async () => {
        const r = await runShellWithRoot(`if [ -f ${quote(HOTSPOT_CFG_FILE)} ]; then cat ${quote(HOTSPOT_CFG_FILE)}; else printf '%s' '{}'; fi`)
        if (!r.success) throw new Error('无法读取热点配置')
        let parsed
        try { parsed = JSON.parse(String(r.content).trim()) } catch { throw new Error('热点配置不是有效 JSON') }
        if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('热点配置格式错误')
        const cfg = { ...DEFAULT_HOTSPOT, ...parsed }
        for (const key of Object.keys(DEFAULT_HOTSPOT)) {
            if (!['string', 'number'].includes(typeof cfg[key]) || String(cfg[key]).includes('\0')) throw new Error('热点配置字段无效：' + key)
            cfg[key] = String(cfg[key])
        }
        return cfg
    }

    // ─── config read/write ────────────────────────────────────────────────────
    const getConfig = async () => {
        if (!(await checkRoot())) return false
        // 读取配置文件
        const res = await runShellWithRoot(`timeout 2s awk '{print}' ${CONFIG_FILE} 2>/dev/null || true`)
        if (res.success && res.content.trim()) {
            try {
                const j = JSON.parse(res.content.trim())
                if (Array.isArray(j.t)) CONFIG.t = j.t.slice(0, 2).map(t => ({
                    level: Math.min(60, Math.max(1, Math.round(Number(t.level) || 20))),
                    action: Object.prototype.hasOwnProperty.call(ACT, t.action) ? t.action : 'none',
                    enabled: t.enabled === true,
                }))
                CONFIG.enabled = j.enabled === true
                CONFIG.car = { enabled: j.car?.enabled === true, delayMinutes: Math.min(1440, Math.max(1, Math.round(Number(j.car?.delayMinutes) || 20))) }
                // 兼容 0.7：旧配置的总开关通过自启动记录判断。
                CONFIG.legacy = typeof j.enabled !== 'boolean' 
            } catch { }
        }
        // 判断是否已安装到自启动
        const res1 = await runShellWithRoot(`timeout 2s awk '{print}' ${BOOT_SH_FILE} 2>/dev/null || true`)
        if (res1.success) {
            const installed = res1.content.includes(NAME)
            if (CONFIG.legacy) CONFIG.enabled = installed
            if (!installed) { CONFIG.enabled = false; CONFIG.car.enabled = false }
        }
    }

    // 暂存两份文件，操作失败时恢复配置、脚本、自启动以及原先的运行状态。
    const applySettings = async (stop) => {
        if (operationBusy) return createToast('正在应用设置，请稍候', 'red')
        operationBusy = true
        const files = [CONFIG_FILE, SH_FILE, BOOT_SH_FILE]
        let backedUp = false
        let changed = false
        let wasRunning = false
        const checked = async command => {
            const r = await runShellWithRoot(command)
            if (!r.success) throw new Error('设备操作失败：' + String(r.content || '请检查权限'))
            return r
        }
        try {
            if (!(await checkRoot())) throw new Error('没有开启高级功能，无法使用！')
            const next = JSON.parse(JSON.stringify({ enabled: stop ? false : CONFIG.enabled, car: { ...CONFIG.car, enabled: stop ? false : CONFIG.car.enabled }, t: CONFIG.t }))
            const shouldRun = next.enabled || next.car.enabled
            // 先读取热点并生成不可变快照；上传失败不会触碰当前脚本和配置。
            if (shouldRun) {
                const hotspot = await getHotspotCfg()
                if (!await uploadFile('kano_low_battery.sh.next', genScript(hotspot, next), SH_FILE + '.next')) throw new Error('传输脚本失败，当前设置未更改')
                await checked(`/system/bin/sh -n ${SH_FILE}.next`)
            }
            await checked(`printf '%s' ${quote(JSON.stringify(next, null, 2))} > ${CONFIG_FILE}.next`)
            wasRunning = (await processList()).length > 0
            // 只备份本插件文件；自启动文件保留其他插件条目。
            for (const file of files) {
                await checked(`rm -f ${file}.bm-backup ${file}.bm-absent && if [ -f ${file} ]; then cp -p ${file} ${file}.bm-backup; else touch ${file}.bm-absent; fi`)
            }
            backedUp = true
            changed = true
            await killProcessByName()
            if (shouldRun) await checked(`mv ${SH_FILE}.next ${SH_FILE}`)
            await checked(`mv ${CONFIG_FILE}.next ${CONFIG_FILE}`)
            await checked(`touch ${BOOT_SH_FILE} && sed '/${NAME}/d' ${BOOT_SH_FILE} > ${BOOT_SH_FILE}.next`)
            if (shouldRun) await checked(`printf '%s\n' '/system/bin/sh ${SH_FILE} &' >> ${BOOT_SH_FILE}.next`)
            await checked(`cat ${BOOT_SH_FILE}.next > ${BOOT_SH_FILE}`)
            if (shouldRun) await startService()
            else await checked('rm -f /data/local/tmp/kano_low_battery_car.state')
            CONFIG.enabled = next.enabled
            CONFIG.car.enabled = next.car.enabled
            createToast(shouldRun ? '已保存，后台运行中' : '已确认后台停用并移除自启动')
        } catch (error) {
            let restored = !changed
            if (backedUp && changed) {
                try {
                    await killProcessByName()
                    for (const file of files) {
                        await checked(`if [ -f ${file}.bm-backup ]; then cp -p ${file}.bm-backup ${file}; elif [ -f ${file}.bm-absent ]; then rm -f ${file}; else exit 1; fi`)
                    }
                    if (wasRunning) await startService()
                    restored = true
                } catch { restored = false }
            }
            createToast(`${error.message}；${restored ? '未应用新设置' : '恢复未完成，请检查后台状态，备份已保留'}`, 'red')
        } finally {
            // 不删除备份，方便异常后恢复；暂存文件下一次保存时会覆盖。
            try { await getConfig() } catch { }
            operationBusy = false
        }
    }
    const install = () => applySettings(false)
    const uninstall = () => applySettings(true)

    // ─── style ────────────────────────────────────────────────────────────────
    const injectStyle = () => {
        if (document.getElementById(STYLE_ID)) return
        const s = document.createElement('style')
        s.id = STYLE_ID
        s.textContent = `
#${MODAL_ID} .bm-wrap{display:flex;flex-direction:column;gap:12px}
#${MODAL_ID} .bm-card{border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);padding:12px 14px;display:flex;flex-direction:column;gap:10px}
#${MODAL_ID} .bm-row{display:flex;align-items:center;gap:10px}
#${MODAL_ID} .bm-row span.lbl{font-size:.7rem;opacity:.75;flex-shrink:0;min-width:3.5em}
#${MODAL_ID} .bm-row .val{font-weight:700;font-size:.82rem;min-width:2.8em;text-align:right;flex-shrink:0}
#${MODAL_ID} input[type=range]{flex:1;accent-color:#4ddb8a;height:4px}
#${MODAL_ID} select{padding:7px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;width:100%;font-size:.78rem;outline:none}
#${MODAL_ID} .sw{position:relative;display:inline-block;width:38px;height:22px;flex-shrink:0}
#${MODAL_ID} .sw input{opacity:0;width:0;height:0}
#${MODAL_ID} .sw-sl{position:absolute;inset:0;background:#444;border-radius:999px;cursor:pointer;transition:.25s}
#${MODAL_ID} .sw-sl:before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.25s}
#${MODAL_ID} .sw input:checked+.sw-sl{background:#4ddb8a}
#${MODAL_ID} .sw input:checked+.sw-sl:before{transform:translateX(16px)}
#${MODAL_ID} .bm-info{text-align:center;font-size:.72rem;padding:8px;border-radius:10px;background:rgba(77,219,138,.08);border:1px solid rgba(77,219,138,.2)}
#${MODAL_ID} .bm-head{display:flex;align-items:center;justify-content:space-between}
#${MODAL_ID} .bm-title{font-weight:700;font-size:.8rem}
#${MODAL_ID} .bm-ctl{border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);padding:12px 14px}
#${MODAL_ID} .bm-ctl-title{font-weight:700;font-size:.78rem;margin-bottom:10px;display:flex;align-items:center;gap:6px}
#${MODAL_ID} .bm-ctl-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid rgba(255,255,255,.06)}
#${MODAL_ID} .bm-ctl-row:first-of-type{border-top:none}
#${MODAL_ID} .bm-ctl-label{font-size:.72rem;font-weight:600}
#${MODAL_ID} .bm-ctl-info{font-size:.58rem;opacity:.45;margin-top:2px}
#${MODAL_ID} .bm-ctl-right{display:flex;align-items:center;gap:8px}
#${MODAL_ID} .bm-st{font-size:.62rem;padding:2px 8px;border-radius:999px;font-weight:600}
#${MODAL_ID} .bm-st.on{color:#9dffbf;background:rgba(60,201,120,.16)}
#${MODAL_ID} .bm-st.off{color:#ffb3b3;background:rgba(255,82,82,.16)}
#${MODAL_ID} .bm-st.unk{color:#ffd08a;background:rgba(255,173,51,.12)}
#${MODAL_ID} .bm-pwr-row{display:flex;gap:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}
#${MODAL_ID} .bm-pwr-btn{flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;font-size:.75rem;font-weight:700;cursor:pointer;text-align:center;transition:.18s}
#${MODAL_ID} .bm-pwr-btn:active{transform:scale(.96);background:rgba(255,255,255,.12)}
#${MODAL_ID} .bm-pwr-btn.danger{border-color:rgba(255,82,82,.3);color:#ffb3b3}
#${MODAL_ID} .bm-help-btn{width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:.7rem;font-weight:700;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:.18s}
#${MODAL_ID} .bm-help-btn:active{background:rgba(255,255,255,.14)}
#${MODAL_ID} .bm-help{display:none;font-size:.62rem;line-height:1.65;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);margin-top:8px}
#${MODAL_ID} .bm-help.on{display:block}
#${MODAL_ID} .bm-help h4{font-size:.68rem;margin:8px 0 4px;opacity:.85}
#${MODAL_ID} .bm-help h4:first-child{margin-top:0}
#${MODAL_ID} .bm-help .ex{padding:6px 8px;border-radius:8px;background:rgba(77,219,138,.06);border:1px solid rgba(77,219,138,.12);margin:4px 0 6px}`
        document.head.appendChild(s)
    }

    // ─── device control ──────────────────────────────────────────────────────
    const renderCtl = async () => {
        const root = document.querySelector(`#${MODAL_ID}`)
        if (!root) return
        const stEl = root.querySelector('#bm_hotspot_st')
        const swEl = root.querySelector('#bm_hotspot_sw')
        const refBtn = root.querySelector('#bm_hotspot_refresh')
        if (!stEl || !swEl) return
        // 显示加载中，禁用开关和刷新按钮
        stEl.className = 'bm-st unk'
        stEl.textContent = '检测中...'
        swEl.disabled = true
        if (refBtn) refBtn.disabled = true
        const on = await getHotspotStatus()
        if (on !== null) swEl.checked = on
        swEl.disabled = false
        if (refBtn) refBtn.disabled = false
        stEl.className = 'bm-st ' + (on === null ? 'unk' : on ? 'on' : 'off')
        stEl.textContent = on === null ? '状态未知' : on ? '已开启' : '已关闭'
    }

    window.bmCtlHotspot = async (checked) => {
        if (!checked) {
            if (!confirm('关闭热点后，已连接的设备将断开连接。\n开启会自动读取 热点管理插件 的内容\n确定要关闭吗？')) {
                const swEl = document.querySelector('#bm_hotspot_sw')
                if (swEl) swEl.checked = true
                return
            }
        }
        const stEl = document.querySelector('#bm_hotspot_st')
        if (stEl) { stEl.className = 'bm-st unk'; stEl.textContent = '...' }
        try {
        let commandResult
        if (checked) {
            // 根据已保存配置校验，避免尚未提交的界面修改绕过保护。
            const cfgResult = await runShellWithRoot(`cat ${CONFIG_FILE} 2>/dev/null`)
            const bootResult = await runShellWithRoot(`cat ${BOOT_SH_FILE} 2>/dev/null`)
            if (bootResult.content?.includes(NAME)) {
                try {
                    const saved = JSON.parse(cfgResult.content)
                    if (saved.enabled !== false) {
                        const levels = saved.t.filter(t => t.enabled && ['hotspot_off', 'shutdown', 'reboot'].includes(t.action)).map(t => Number(t.level))
                        const powerResult = await runShellWithRoot(`${POWER_READER}\nread_power\nprintf '%s' "$POWER"`)
                        const externallyPowered = powerResult.success && String(powerResult.content ?? '').trim() === '1'
                        if (levels.length && !externallyPowered) {
                            const battery = await runShellWithRoot('cat /sys/class/power_supply/battery/capacity')
                            const raw = String(battery.content ?? '').trim()
                            if (!/^\d+$/.test(raw) || Number(raw) <= Math.max(...levels)) {
                                createToast('低电量保护生效，暂时不能开启热点', 'red')
                                await renderCtl()
                                return
                            }
                        }
                    }
                } catch {
                    createToast('无法读取低电量保护配置，请先保存设置', 'red')
                    await renderCtl()
                    return
                }
            }
            const hcfg = await getHotspotCfg()
            const password = hcfg.security === 'open' ? '' : ` ${quote(hcfg.password)}`
            commandResult = await runShellWithRoot(`cmd wifi start-softap ${quote(hcfg.ssid)} ${quote(hcfg.security)}${password} -b ${quote(hcfg.band)}`)
        } else {
            commandResult = await runShellWithRoot('cmd wifi stop-softap')
        }
        let actual = null
        if (commandResult.success) {
            for (let i = 0; i < 5; i++) {
                await new Promise(r => setTimeout(r, 1000))
                actual = await getHotspotStatus()
                if (actual === checked) break
            }
        }
        await renderCtl()
        if (commandResult.success && actual === checked) createToast(checked ? '热点 已开启' : '热点 已关闭')
        else createToast('热点操作失败或状态未确认，请刷新检查', 'red')
        } catch (error) {
            createToast(error.message || '热点操作失败', 'red')
            await renderCtl()
        }
    }

    window.bmCtlReboot = async () => {
        if (!confirm('确定要重启设备？')) return
        createToast('正在重启...', 'red')
        await runShellWithRoot('reboot')
    }

    window.bmCtlShutdown = async () => {
        if (!confirm('确定要关机？')) return
        createToast('正在关机...', 'red')
        await runShellWithRoot('reboot -p')
    }

    // ─── render ───────────────────────────────────────────────────────────────
    const cardHtml = (t, i) => {
        const actOpts = Object.entries(ACT)
            .map(([k, v]) => `<option value="${k}"${t.action === k ? ' selected' : ''}>${v}</option>`)
            .join('')
        return `<div class="bm-card">
  <div class="bm-head">
    <span class="bm-title">阈值 ${i + 1}</span>
    <label class="sw"><input type="checkbox" ${t.enabled ? 'checked' : ''} onchange="bmTog(${i},this.checked)"><span class="sw-sl"></span></label>
  </div>
  <div class="bm-row">
    <span class="lbl">电量 ≤</span>
    <input type="range" min="1" max="60" value="${t.level}" oninput="bmLv(${i},this.value)">
    <span class="val" id="bm_lv${i}">${t.level}%</span>
  </div>
  <div>
    <div style="font-size:.68rem;opacity:.7;margin-bottom:4px">触发动作</div>
    <select onchange="bmAct(${i},this.value)">${actOpts}</select>
  </div>
</div>`
    }

    const renderBody = () => {
        const root = document.querySelector(`#${MODAL_ID}`)
        if (!root) return
        const wrap = root.querySelector('#bm_wrap')
        if (!wrap) return

        const statusText = `低电量保护：${CONFIG.enabled ? '启用' : '停用'} · 车载热点：${CONFIG.car.enabled ? '启用' : '停用'}（修改后请保存）`

        wrap.innerHTML = `
<div class="bm-ctl">
    <div class="bm-ctl-title">📡 设备控制</div>
    <div class="bm-ctl-row">
        <div>
            <div class="bm-ctl-label">WiFi 热点</div>
            <div class="bm-ctl-info">Root Shell 控制</div>
        </div>
        <div class="bm-ctl-right">
            <span class="bm-st unk" id="bm_hotspot_st">点击右边刷新</span>
            <button id="bm_hotspot_refresh" onclick="bmCtlRefresh()" style="padding:2px 8px;font-size:.65rem;border-radius:8px;opacity:.8">刷新</button>
            <label class="sw"><input type="checkbox" id="bm_hotspot_sw" disabled onchange="bmCtlHotspot(this.checked)"><span class="sw-sl"></span></label>
        </div>
    </div>
    <div class="bm-pwr-row">
        <div class="bm-pwr-btn" onclick="bmCtlReboot()">🔄 重启</div>
        <div class="bm-pwr-btn danger" onclick="bmCtlShutdown()">⏻ 关机</div>
    </div>
</div>

<div class="bm-row bm-head" style="padding:0 2px">
    <div style="display:flex;align-items:center;gap:6px">
        <span class="bm-title">低电量保护</span>
        <label class="sw"><input type="checkbox" ${CONFIG.enabled ? 'checked' : ''} onchange="bmEnable(this.checked)"><span class="sw-sl"></span></label>
        <div class="bm-help-btn" onclick="bmHelp()">?</div>
    </div>
</div>
<div class="bm-help" id="bm_help_box">
    <h4>📖 规则说明</h4>
    • 后台 Shell 脚本每 <b>10秒</b>统一检测电量和插拔电状态<br>
    • 日志达到 <b>10 KB</b> 自动清空，后续继续记录<br>
    • <b>独立于浏览器</b>运行，关闭网页/换浏览器不受影响<br>
    • 检测到外部电源时跳过全部低电量动作，停充/充满也按插电处理；拔电后恢复保护<br>
    • 电量 <b>≤ 阈值</b> 时触发动作；关热点持续生效，其他动作每次越过阈值执行一次<br>
    • 电量回升超过阈值后自动重置，再降到时再次触发<br>
    • 后台服务启动后 <b>60秒安全期</b>：关机/重启被禁止，防循环<br>
    • 提交后自动注册为<b>开机自启动</b>

    <h4>💡 场景举例</h4>
    <div class="ex">
        设置：阈值1 = 20% 关热点，阈值2 = 5% 关机<br><br>
        ▶ 电量 25% → 19%：触发"关热点" ✅<br>
        ▶ 继续降到 4%：触发"关机" ✅<br>
        ▶ 插电，即使低于关机阈值：跳过低电量动作 ✅<br>
        ▶ 拔电后：恢复低电量保护，服务启动安全期仍有效<br>
        ▶ 放置耗电到 4%：再次触发"关机" ✅
    </div>
</div>
<div class="bm-info" id="bm_lvtxt">${statusText}</div>
${CONFIG.t.map(cardHtml).join('')}
<div class="bm-card">
    <div class="bm-head">
        <span class="bm-title">🚗 车载热点</span>
        <label class="sw"><input type="checkbox" ${CONFIG.car.enabled ? 'checked' : ''} onchange="bmCarEnable(this.checked)"><span class="sw-sl"></span></label>
    </div>
    <div class="bm-row">
        <span class="lbl">拔电后</span>
        <input type="number" min="1" max="1440" step="1" value="${CONFIG.car.delayMinutes}" onchange="bmCarDelay(this)" style="width:85px">
        <span class="lbl">分钟关闭热点</span>
    </div>
    <div style="font-size:.65rem;opacity:.75;line-height:1.7">
        插电自动开启热点，重新插电取消倒计时，检测间隔 10 秒。延时可设 1–1440 分钟，默认 20 分钟。<br>
        两项独立启停；插电时跳过低电量保护，车载热点可直接开启。拔电后若命中已启用的低电量关闭类阈值，优先关闭热点，不等待车载倒计时。外部供电状态未知时仍检查低电量，车载功能不执行插拔电动作。<br>
        保存时同步热点管理插件的配置；修改热点名称或密码后请重新保存本插件。启用时已拔电则立即开始计时；保存设置保留拔电起点，设备重启后重新计时。
    </div>
</div>
<div style="display:flex;gap:8px">
    <button onclick="bmSubmit()" style="flex:1">保存并应用</button>
    <button onclick="bmUninstall()" style="flex:1;font-size:.75rem;opacity:.7">全部停用</button>
</div>
<div style="box-sizing:border-box;margin-top:6px">
    <div style="font-size:.7rem;opacity:.7;margin-bottom:4px">后台日志</div>
    <textarea id="bm_log" disabled style="margin-bottom:0;border:none;box-sizing:border-box;width:100%;min-height:80px;font-size:.65rem;background:rgba(0,0,0,.3);color:#ccc;border-radius:8px;padding:8px"></textarea>
</div>`
    }

    const refreshLog = async () => {
        const el = document.querySelector('#bm_log')
        if (!el) return
        const r = await runShellWithRoot(`tail -20 ${LOG_FILE} 2>/dev/null || echo "(暂无日志)"`)
        el.value = String(r?.content ?? '').trim()
    }

    // ─── window functions ─────────────────────────────────────────────────────
    window.bmEnable = v => { CONFIG.enabled = v }
    window.bmCarEnable = v => { CONFIG.car.enabled = v }
    window.bmCarDelay = el => {
        CONFIG.car.delayMinutes = Math.min(1440, Math.max(1, Math.round(Number(el.value) || 20)))
        el.value = CONFIG.car.delayMinutes
    }
    window.bmCtlRefresh = () => { renderCtl() }
    window.bmLv = (i, v) => {
        CONFIG.t[i].level = Number(v)
        const el = document.querySelector(`#bm_lv${i}`)
        if (el) el.textContent = v + '%'
    }
    window.bmAct = (i, v) => { CONFIG.t[i].action = v }
    window.bmTog = (i, v) => { CONFIG.t[i].enabled = v }
    window.bmHelp = () => {
        const el = document.querySelector('#bm_help_box')
        if (el) el.classList.toggle('on')
    }
    window.bmSubmit = async () => {
        await install()
        renderBody()
        renderCtl()          // 不 await，后台刷新热点状态
        setTimeout(refreshLog, 2000)
    }
    window.bmUninstall = async () => {
        if (!confirm('确定要停用低电量保护和车载热点？')) return
        await uninstall()
        renderBody()
    }
    window.close_battery_manager = () => closeModal(`#${MODAL_ID}`)

    // ─── mount ────────────────────────────────────────────────────────────────
    injectStyle()
    // 不在挂载阶段 await getConfig，避免按钮出现慢

    let el = document.querySelector(`#${MODAL_ID}`)
    if (!el) {
        el = document.createElement('div')
        el.id = MODAL_ID
        el.classList.add('mask')
        el.style.display = 'none'
        el.innerHTML = `
<div class="modal" style="width:92%;max-width:380px;max-height:85vh;overflow-y:auto;opacity:1;background:#20242b;">
<div class="title" style="justify-content:space-between">
    <span>低电量管理 0.8.2-小土豆</span>
    <button onclick="close_battery_manager()" style="border-radius:50%;padding:0 8px">✕</button>
</div>
<div class="content" style="max-height:90%;overflow-y:auto;padding:12px 0">
    <div class="bm-wrap" id="bm_wrap"></div>
</div>
<div class="btn" style="text-align:right;margin-top:6px">
    <button type="button" onclick="close_battery_manager()">关闭</button>
</div>
</div>`
        el.onclick = event => { if (event.target === el) window.close_battery_manager() }
        document.querySelector('.container').appendChild(el)
    }

    const btn = document.createElement('button')
    btn.textContent = '低电量管理'
    btn.onclick = async () => {
        // 1. 立即弹出弹窗（用当前 CONFIG 默认值先渲染）
        showModal(`#${MODAL_ID}`)
        renderBody()
        // 2. 异步加载配置，加载完再刷新界面
        await getConfig()
        renderBody()
        // 3. 状态和日志异步加载，不阻塞显示
        renderCtl()
        refreshLog()
    }
    document.querySelector('.actions-buttons').appendChild(btn)
})();
//</script>
