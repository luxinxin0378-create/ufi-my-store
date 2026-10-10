//<script>
// ============================================================
// 插件名称: 樱花映射SakuraFrp插件 (UFI-TOOLS)
// 开发者: 史志佳 (ShiZhijia)
// 主页:   https://www.shizhijia.vip/
// B站:    https://space.bilibili.com/504975413
// GitHub: https://github.com/Bilibili-ShiZhijia
// ============================================================
(async () => {
    if (document.querySelector('#KANO_SFRP_PANEL')) return

    // ===================== 常量 =====================
    const DIR = '/data/kano_sakurafrp'
    const BIN = DIR + '/frpc'
    const SERVICE = DIR + '/service.sh'
    const INSTALL_LOG = DIR + '/install.log'
    const CURL = '/data/data/com.minikano.f50_sms/files/curl'
    const FRPC_VER = '0.51.0-sakura-14'
    const FRPC_BASE = 'https://nya.globalslb.net/natfrp/client/frpc/' + FRPC_VER

    // ===================== 弱口令检查 =====================
    const checkWeakToken = () => {
        if (typeof SHA256 === 'function' && typeof KANO_TOKEN !== 'undefined') {
            const weakTokenList = ['admin', 'password', '666', '6666', '12345', '123456', '1234567', '12345678', '123456789', '1234567890', 'root']
            for (let token of weakTokenList) {
                if (SHA256(token) == KANO_TOKEN.toUpperCase()) return true
            }
        }
        return false
    }

    const checkAdvance = async () => {
        try {
            const res = await runShellWithRoot('whoami')
            return !!(res.content && res.content.includes('root'))
        } catch (e) { return false }
    }

    const isInstalled = async () => {
        try {
            const res = await runShellWithRoot('ls ' + SERVICE)
            return !!(res.success && res.content && res.content.includes('service.sh'))
        } catch (e) { return false }
    }

    // ===================== 实时安装日志面板 =====================
    let logPollTimer = null
    let logOverlay = null
    let logBusy = false
    let logStartAt = 0
    let postRan = false

    const stopLogPoll = () => {
        if (logPollTimer) { logPollTimer(); logPollTimer = null }
    }

    const openLogPanel = (title) => {
        stopLogPoll()
        if (logOverlay) { logOverlay.close(); logOverlay = null }
        logOverlay = createFixedToast('kano_sfrp_install_log_toast', `
            <div style="pointer-events:all;width:86vw;max-width:560px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:.8rem;">${title || '樱花映射插件安装日志'}</span>
                    <span id="kano_sfrp_log_status" style="font-size:.72rem;color:#ffd166;">安装中...</span>
                </div>
                <textarea id="kano_sfrp_log_text" readonly spellcheck="false" style="margin-top:8px;width:100%;height:300px;max-height:55vh;box-sizing:border-box;font-family:monospace;font-size:12px;font-weight:normal;border:none;border-radius:8px;padding:8px;background:rgba(0,0,0,.3);color:#9fe8ff;resize:none;"></textarea>
                <div style="text-align:right;margin-top:8px;">
                    <button id="kano_sfrp_log_close" style="font-size:.64rem;">关闭</button>
                </div>
            </div>
        `, { width: 'fit-content', fontWeight: 'normal' })
        const btn = logOverlay.el.querySelector('#kano_sfrp_log_close')
        if (btn) btn.onclick = () => {
            stopLogPoll()
            logBusy = false
            if (logOverlay) { logOverlay.close(); logOverlay = null }
        }
        logBusy = true
        logStartAt = Date.now()
        postRan = false
    }

    const appendLog = async (text) => {
        const line = text.replace(/"/g, '')
        await runShellWithRoot('echo "' + line + '" >> ' + INSTALL_LOG)
        const ta = document.querySelector('#kano_sfrp_log_text')
        if (ta) {
            ta.value += line + '\n'
            ta.scrollTop = ta.scrollHeight
        }
    }

    const finishInstallLog = async (ok, failMsg) => {
        if (!logBusy) return
        logBusy = false
        stopLogPoll()
        const st = document.querySelector('#kano_sfrp_log_status')
        if (st) {
            st.textContent = ok ? '安装完成' : '安装失败'
            st.style.color = ok ? '#7ce38b' : '#ff6b6b'
        }
        const ta = document.querySelector('#kano_sfrp_log_text')
        if (ta) {
            const hasMarker = ta.value.includes('INSTALL_OK') || ta.value.includes('INSTALL_FAIL')
            if (!hasMarker) {
                ta.value += '\n' + (ok ? '全部步骤已完成' : ('失败原因: ' + (failMsg || '未知'))) + '\n'
                ta.scrollTop = ta.scrollHeight
            }
        }
        createToast(ok ? '樱花映射插件安装成功！' : ('安装失败: ' + (failMsg || '请查看日志')), ok ? 'green' : 'red', 6000)
        refreshStatus()
        bootUpAction()
        loadKey()
        if (ok && logOverlay) {
            const ov = logOverlay
            setTimeout(() => { try { ov.close() } catch (e) { } }, 8000)
        }
    }

    const refreshInstallLog = async () => {
        const ta = document.querySelector('#kano_sfrp_log_text')
        if (!ta) return
        const res = await runShellWithRoot("timeout 2s awk '{print}' " + INSTALL_LOG + ' | tail -n 80')
        const text = res.content || ''
        if (ta.value !== text) {
            ta.value = text
            ta.scrollTop = ta.scrollHeight
        }
        if (text.includes('INSTALL_OK')) {
            stopLogPoll()
            if (!postRan) {
                postRan = true
                await postInstallSteps()
            }
            await finishInstallLog(true)
        } else if (text.includes('INSTALL_FAIL')) {
            const line = text.split('\n').filter(l => l.includes('INSTALL_FAIL')).pop() || 'INSTALL_FAIL'
            await finishInstallLog(false, line.replace('INSTALL_FAIL:', '').replace('INSTALL_FAIL', '').trim())
        } else if (Date.now() - logStartAt > 600000) {
            await finishInstallLog(false, '安装超时(10分钟)')
        }
    }

    const startInstallPolling = () => {
        stopLogPoll()
        logPollTimer = requestInterval(refreshInstallLog, 1000)
    }

    // ===================== 安装 =====================
    const install = async () => {
        if (checkWeakToken()) return createToast('检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！', 'red', 8000)
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (await isInstalled()) return createToast('樱花映射插件已经安装，请勿重复安装！', 'red')

        const installSh = `#!/bin/sh
LOG=${DIR}/install.log
exec 1>$LOG 2>&1
log() { echo "[$(date '+%H:%M:%S')] $*"; }
DIR=${DIR}
CURL=${CURL}
log "=== 樱花映射插件在线安装开始 ==="
mkdir -p $DIR
chmod 700 $DIR
if [ ! -x "$CURL" ]; then
  log "INSTALL_FAIL: 未找到 curl 工具 ($CURL)"
  exit 1
fi
log "[1/4] 下载 frpc (arm64)..."
$CURL -fsSL -m 300 ${FRPC_BASE}/frpc_linux_arm64 -o $DIR/frpc
if [ ! -s $DIR/frpc ]; then
  log "  主源失败, 尝试备用源 getfrp.sh ..."
  $CURL -fsSL -m 300 https://getfrp.sh/d/frpc_linux_arm64 -o $DIR/frpc
fi
if [ ! -s $DIR/frpc ]; then
  log "INSTALL_FAIL: frpc 下载失败, 请检查网络"
  exit 1
fi
chmod 777 $DIR/frpc
log "[2/4] 验证二进制..."
V=$($DIR/frpc -v 2>&1 | head -n1)
if [ -z "$V" ]; then
  log "  UPX 版无法运行, 改试 noupx 版本..."
  $CURL -fsSL -m 300 ${FRPC_BASE}/frpc_linux_arm64_noupx -o $DIR/frpc
  chmod 777 $DIR/frpc
  V=$($DIR/frpc -v 2>&1 | head -n1)
fi
if [ -z "$V" ]; then
  log "INSTALL_FAIL: frpc 无法运行 (内核不兼容?)"
  exit 1
fi
log "  frpc 版本: $V"
log "[3/4] 初始化配置文件..."
touch $DIR/args.txt $DIR/frpc.ini $DIR/frpc.log
chmod 600 $DIR/args.txt $DIR/frpc.ini
chmod 777 $DIR/frpc.log
log "[4/4] 安装完成"
log "INSTALL_OK"
exit 0
`

        openLogPanel()
        await runShellWithRoot('mkdir -p ' + DIR)
        const ok = await saveConfig(new File([installSh], 'install.sh', { type: 'text/plain' }), DIR + '/install.sh')
        if (!ok) return finishInstallLog(false, '写入安装脚本失败')
        await runShellWithRoot('chmod 777 ' + DIR + '/install.sh')
        const runRes = await runShellWithRoot('nohup sh ' + DIR + '/install.sh >/dev/null 2>&1 & echo $!')
        if (!runRes.success) return finishInstallLog(false, '启动安装脚本失败')
        startInstallPolling()
    }

    // ===================== 收尾步骤 =====================
    const SERVICE_SH_CONTENT = `#!/bin/sh
# ============================================================
#  UFI-TOOLS 樱花映射 SakuraFrp 插件 - 服务脚本
#  安装目录: /data/kano_sakurafrp
# ============================================================

DIR=/data/kano_sakurafrp
BIN=$DIR/frpc
PIDFILE=$DIR/frpc.pid
LOGFILE=$DIR/frpc.log

is_running() {
  [ -f "$PIDFILE" ] && kill -0 $(cat $PIDFILE) 2>/dev/null
}

start() {
  if is_running; then
    echo "frpc已在运行 (pid $(cat $PIDFILE))"
    return 0
  fi
  if [ ! -x "$BIN" ]; then
    echo "错误: frpc 未安装, 请先安装插件"
    return 1
  fi
  MODE=
  if [ -f "$DIR/frpc.ini" ] && [ -s "$DIR/frpc.ini" ]; then
    MODE=config
  elif [ -f "$DIR/args.txt" ] && [ -s "$DIR/args.txt" ]; then
    MODE=quick
  else
    echo "错误: 请先填写访问密钥或配置文件"
    return 1
  fi
  if [ "$MODE" = config ]; then
    nohup $BIN -c $DIR/frpc.ini >> $LOGFILE 2>&1 &
  else
    nohup $BIN -f $(head -n1 $DIR/args.txt) >> $LOGFILE 2>&1 &
  fi
  echo $! > $PIDFILE
  sleep 2
  if is_running; then
    echo "frpc已启动 (模式=$MODE pid=$(cat $PIDFILE))"
  else
    echo "frpc启动失败, 请查看运行日志"
    return 1
  fi
}

stop() {
  if [ -f "$PIDFILE" ]; then
    kill $(cat $PIDFILE) 2>/dev/null
    rm -f "$PIDFILE"
  fi
  pkill -f kano_sakurafrp/frpc 2>/dev/null
  sleep 1
  echo "frpc已停止"
}

status() {
  if is_running; then
    echo "RUNNING=1"
    echo "PID=$(cat $PIDFILE)"
  else
    echo "RUNNING=0"
  fi
  echo "VERSION=$($BIN -v 2>&1 | head -n1)"
}

restart() {
  stop
  sleep 1
  start
}

case "$1" in
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  status) status ;;
  *) echo "用法: $0 {start|stop|restart|status}" ;;
esac
`

    const postInstallSteps = async () => {
        await appendLog('')
        await appendLog('=== 收尾步骤 (由插件界面执行) ===')
        await appendLog('写入服务脚本...')
        const ok1 = await saveConfig(new File([SERVICE_SH_CONTENT], 'service.sh', { type: 'text/plain' }), SERVICE)
        if (!ok1) { await appendLog('警告: 服务脚本写入失败, 请卸载后重装'); return }
        await runShellWithRoot('chmod 777 ' + SERVICE)
        await appendLog('设置开机自启...')
        await runShellWithRoot("grep -qxF '" + SERVICE + " start' /sdcard/ufi_tools_boot.sh || echo '" + SERVICE + " start' >> /sdcard/ufi_tools_boot.sh")
        await appendLog('安装完成, 请填写访问密钥后启动隧道')
    }

    // ===================== 卸载 =====================
    const uninstall = async () => {
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (!await isInstalled()) return createToast('尚未安装，无需卸载', 'red')
        openLogPanel('樱花映射插件卸载日志')
        await runShellWithRoot('echo "=== 樱花映射插件卸载开始 ===" > ' + INSTALL_LOG)
        await appendLog('停止 frpc...')
        const r1 = await runShellWithRoot(SERVICE + ' stop')
        for (const l of (r1.content || '').split('\n').filter(l => l.trim())) await appendLog(l)
        await appendLog('清理开机自启...')
        const r2 = await runShellWithRoot("sed -i '/kano_sakurafrp/d' /sdcard/ufi_tools_boot.sh")
        if (!r2.success) await appendLog('警告: 清理开机自启失败')
        await appendLog('删除安装目录...')
        const r3 = await runShellWithRoot('rm -rf ' + DIR)
        if (r3.success) {
            await appendLog('卸载完成')
            await finishInstallLog(true)
        } else {
            await finishInstallLog(false, '卸载失败: ' + (r3.content || ''))
        }
    }

    // ===================== 服务状态 =====================
    let curStatus = { running: false, version: '', mode: '' }

    const refreshStatus = async () => {
        if (!await isInstalled()) {
            curStatus = { running: false, version: '', mode: '' }
            const st = document.querySelector('#kano_sfrp_status_line')
            if (st) st.innerHTML = '<span style="color:#8a93a6;">○ 未安装</span>'
            return
        }
        try {
            const res = await runShellWithRoot(SERVICE + ' status')
            const c = res.content || ''
            curStatus.running = c.includes('RUNNING=1')
            const get = (k) => {
                const m = c.match(new RegExp('^' + k + '=(.*)$', 'm'))
                return m ? m[1].trim() : ''
            }
            curStatus.version = get('VERSION')
            curStatus.mode = c.includes('MODE=') ? get('MODE') : ''
        } catch (e) { }
        const st = document.querySelector('#kano_sfrp_status_line')
        if (st) {
            st.innerHTML = curStatus.running
                ? '<span style="color:#7ce38b;">● frpc 运行中</span>'
                + (curStatus.mode ? '　模式: ' + curStatus.mode : '')
                + (curStatus.version ? '　版本: ' + curStatus.version : '')
                : '<span style="color:#8a93a6;">○ frpc 未运行</span>'
                + (curStatus.version ? '　版本: ' + curStatus.version : '')
        }
    }

    // ===================== 访问密钥 =====================
    const loadKey = async () => {
        const inp = document.querySelector('#kano_sfrp_key')
        if (!inp) return
        const res = await runShellWithRoot("timeout 2s awk '{print}' " + DIR + '/args.txt')
        const line = (res.content || '').trim()
        if (line) {
            const key = line.split(':')[0]
            inp.dataset.saved = key
            inp.value = key.slice(0, 4) + '****' + key.slice(-2)
            inp.placeholder = '已保存 (' + key.slice(0, 4) + '****)'
        }
    }

    const saveKey = async () => {
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (!await isInstalled()) return createToast('请先安装插件', 'red')
        const inp = document.querySelector('#kano_sfrp_key')
        if (!inp) return
        const key = (inp.dataset.saved && inp.value.includes('****')) ? inp.dataset.saved : inp.value.trim()
        if (!/^[A-Za-z0-9_.]{6,}$/.test(key)) return createToast('访问密钥格式错误 (在 www.natfrp.com/user/ 获取)', 'red', 6000)
        const ok = await saveConfig(new File([key], 'args.txt', { type: 'text/plain' }), DIR + '/args.txt')
        if (!ok) return createToast('写入密钥失败', 'red')
        await runShellWithRoot('chmod 600 ' + DIR + '/args.txt')
        inp.dataset.saved = key
        inp.value = key.slice(0, 4) + '****' + key.slice(-2)
        createToast('访问密钥已保存 (600权限)', 'green')
    }

    const getKeyFromInput = () => {
        const inp = document.querySelector('#kano_sfrp_key')
        if (!inp) return ''
        if (inp.value.includes('****') && inp.dataset.saved) return inp.dataset.saved
        return inp.value.trim()
    }

    // ===================== 隧道列表 (设备端 curl 调用 API) =====================
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const refreshTunnels = async () => {
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (!await isInstalled()) return createToast('请先安装插件', 'red')
        if (!/^[A-Za-z0-9_.]{6,}$/.test(getKeyFromInput()) && !(await readKeyFromDevice())) {
            return createToast('请先保存访问密钥', 'red')
        }
        createToast('正在拉取隧道列表...')
        const r = await runShellWithRoot('KEY=$(head -n1 ' + DIR + '/args.txt | cut -d: -f1); ' + CURL + ' -fsSL -m 20 -H "Authorization: Bearer $KEY" https://api.natfrp.com/v4/tunnels -o ' + DIR + '/tunnels.json && echo TUNNELS_OK', 30 * 1000)
        if (!r.success || !r.content.includes('TUNNELS_OK')) return createToast('拉取失败, 请检查网络或密钥', 'red')
        const read = await runShellWithRoot("timeout 2s awk '{print}' " + DIR + '/tunnels.json')
        const raw = (read.content || '').trim()
        if (!raw) return createToast('返回内容为空', 'red')
        let data
        try {
            data = JSON.parse(raw)
        } catch (e) {
            let errMsg = '接口返回异常'
            try { errMsg = JSON.parse(raw).msg || errMsg } catch (e2) { }
            return createToast(errMsg, 'red', 6000)
        }
        if (!Array.isArray(data)) return createToast('隧道数据格式异常', 'red')
        const box = document.querySelector('#kano_sfrp_tunnel_list')
        if (!box) return
        if (!data.length) {
            box.innerHTML = '<div style="color:#8a93a6;padding:6px;">当前账号下没有隧道，请到 www.natfrp.com 创建</div>'
            return
        }
        const statusTxt = (t) => {
            if (!t.online) return '<span style="color:#8a93a6;">离线</span>'
            if (t.status === 2) return '<span style="color:#ff6b6b;">封禁</span>'
            return '<span style="color:#7ce38b;">在线</span>'
        }
        const localTxt = (t) => (t.local_ip && t.local_ip !== '127.0.0.1' ? t.local_ip + ':' : '') + (t.local_port || '')
        box.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:.72rem;">'
            + '<tr style="color:#8a93a6;text-align:left;"><th>选</th><th>名称</th><th>ID</th><th>类型</th><th>节点</th><th>状态</th><th>本地端口</th><th>远端</th></tr>'
            + data.map(t => {
                return '<tr style="border-top:1px solid rgba(255,255,255,.06);">'
                    + '<td><input type="checkbox" class="kano_sfrp_tunnel_ck" value="' + t.id + '"></td>'
                    + '<td>' + esc(t.name) + '</td><td>' + t.id + '</td><td>' + esc(t.type) + '</td>'
                    + '<td>' + esc(t.node) + '</td><td>' + statusTxt(t) + '</td>'
                    + '<td>' + esc(localTxt(t)) + '</td><td>' + esc(t.remote) + '</td></tr>'
            }).join('') + '</table>'
        createToast('已获取 ' + data.length + ' 条隧道', 'green')
    }

    const readKeyFromDevice = async () => {
        try {
            const res = await runShellWithRoot("timeout 2s awk '{print}' " + DIR + '/args.txt')
            const key = (res.content || '').trim().split(':')[0]
            return /^[A-Za-z0-9_.]{6,}$/.test(key)
        } catch (e) { return false }
    }

    // ===================== 生成配置并启动 =====================
    const genConfigAndStart = async () => {
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (!await isInstalled()) return createToast('请先安装插件', 'red')
        const cks = Array.from(document.querySelectorAll('.kano_sfrp_tunnel_ck:checked')).map(i => i.value)
        if (!cks.length) return createToast('请先勾选隧道', 'red')
        const ids = cks.join(',')
        if (!/^\d+(,\d+)*$/.test(ids)) return createToast('隧道ID异常', 'red')
        createToast('正在生成配置文件...')
        const r = await runShellWithRoot('KEY=$(head -n1 ' + DIR + '/args.txt | cut -d: -f1); V=$(' + BIN + ' -v 2>&1 | head -n1); ' + CURL + ' -fsSL -m 20 -X POST -H "Authorization: Bearer $KEY" -d "query=' + ids + '&frpc=$V" https://api.natfrp.com/v4/tunnel/config -o ' + DIR + '/frpc.ini && echo CONFIG_OK', 30 * 1000)
        const read = await runShellWithRoot("timeout 2s awk '{print}' " + DIR + '/frpc.ini')
        const content = read.content || ''
        const ta = document.querySelector('#kano_sfrp_conf')
        if (!r.success || !r.content.includes('CONFIG_OK')) {
            if (ta) ta.value = content
            return createToast('生成失败 (已显示接口返回内容)', 'red', 6000)
        }
        if (content.trim().startsWith('{')) {
            if (ta) ta.value = content
            let errMsg = '生成失败'
            try { errMsg = JSON.parse(content.trim()).msg || errMsg } catch (e) { }
            return createToast(errMsg, 'red', 6000)
        }
        if (ta) ta.value = content
        createToast('配置已生成, 正在启动 frpc...', 'green')
        const s = await runShellWithRoot(SERVICE + ' start')
        createToast((s.content || '').replace(/\n/g, '<br>'), '')
        refreshStatus()
        genLog()
    }

    // ===================== 快速模式 =====================
    const quickStart = async () => {
        if (checkWeakToken()) return createToast('检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！', 'red', 8000)
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (!await isInstalled()) return createToast('请先安装插件', 'red')
        const ids = document.querySelector('#kano_sfrp_quick_ids').value.trim()
        if (!/^\d+(,\d+)*$/.test(ids)) return createToast('隧道ID格式错误 (如 12345 或 12345,23456)', 'red')
        const key = getKeyFromInput()
        if (!/^[A-Za-z0-9_.]{6,}$/.test(key)) return createToast('请先填写并保存访问密钥', 'red')
        const ok = await saveConfig(new File([key + ':' + ids], 'args.txt', { type: 'text/plain' }), DIR + '/args.txt')
        if (!ok) return createToast('写入密钥失败', 'red')
        await runShellWithRoot('chmod 600 ' + DIR + '/args.txt')
        await runShellWithRoot('> ' + DIR + '/frpc.ini')
        createToast('已切换到快速模式, 正在启动...')
        const r = await runShellWithRoot(SERVICE + ' start')
        createToast((r.content || '').replace(/\n/g, '<br>'), '')
        refreshStatus()
        genLog()
    }

    // ===================== 配置文件模式 =====================
    const showConf = async () => {
        const ta = document.querySelector('#kano_sfrp_conf')
        if (!ta) return
        const res = await runShellWithRoot("timeout 2s awk '{print}' " + DIR + '/frpc.ini')
        ta.value = res.content || '# 配置模式: 在此粘贴 frpc.ini 后保存, 再点启动\n'
    }

    const saveConf = async () => {
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (!await isInstalled()) return createToast('请先安装插件', 'red')
        const ta = document.querySelector('#kano_sfrp_conf')
        if (!ta) return
        if (!ta.value.trim()) return createToast('配置内容为空', 'red')
        const ok = await saveConfig(new File([ta.value], 'frpc.ini', { type: 'text/plain' }), DIR + '/frpc.ini')
        if (!ok) return createToast('保存失败', 'red')
        await runShellWithRoot('chmod 600 ' + DIR + '/frpc.ini')
        createToast('配置已保存, 正在启动 frpc (配置模式)...', 'green')
        const r = await runShellWithRoot(SERVICE + ' start')
        createToast((r.content || '').replace(/\n/g, '<br>'), '')
        refreshStatus()
        genLog()
    }

    // ===================== 运行日志 =====================
    const genLog = async () => {
        const ta = document.querySelector('#kano_sfrp_log')
        if (!ta) return
        const res = await runShellWithRoot("timeout 2s awk '{print}' " + DIR + '/frpc.log | tail -n 60')
        const text = (res.content || '') + '\n'
        if (ta.value === text) return
        ta.value = text
        ta.scrollTop = ta.scrollHeight
    }

    // ===================== 服务动作 =====================
    const doStart = async () => {
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (!await isInstalled()) return createToast('请先安装插件', 'red')
        const res = await runShellWithRoot(SERVICE + ' start')
        const c = res.content || ''
        createToast(c.replace(/\n/g, '<br>'), (c.includes('已启动') || c.includes('已在运行')) ? 'green' : 'red', 6000)
        refreshStatus()
        genLog()
    }

    const doStop = async () => {
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (!await isInstalled()) return createToast('请先安装插件', 'red')
        const res = await runShellWithRoot(SERVICE + ' stop')
        createToast((res.content || '').replace(/\n/g, '<br>'), '')
        refreshStatus()
        genLog()
    }

    const doRestart = async () => {
        if (checkWeakToken()) return createToast('检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！', 'red', 8000)
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (!await isInstalled()) return createToast('请先安装插件', 'red')
        const res = await runShellWithRoot(SERVICE + ' restart')
        createToast((res.content || '').replace(/\n/g, '<br>'), '')
        refreshStatus()
        genLog()
    }

    // ===================== 开机自启 =====================
    const checkIsBootUp = async () => {
        try {
            const res = await runShellWithRoot("grep -q '" + SERVICE + " start' /sdcard/ufi_tools_boot.sh; echo $?")
            return res.content.trim() == '0'
        } catch (e) { return false }
    }

    const bootUpAction = async () => {
        const isBootUp = await checkIsBootUp()
        const el = document.querySelector('#kano_sfrp_boot')
        if (el) el.style.background = isBootUp ? 'var(--dark-btn-color-active)' : ''
    }

    // ===================== 使用说明弹窗 =====================
    const HELP_HTML = `
        <div style="text-align:left;color:#c9d4e3;">
            <p><b style="color:#9fe8ff;">功能</b><br>樱花映射（SakuraFrp）内网穿透客户端 frpc，为内网服务提供外网访问能力，支持 TCP / UDP / HTTP(S) 等隧道。</p>
            <p><b style="color:#9fe8ff;">安装</b><br>点【安装frpc】自动下载 frpc 0.51.0-sakura-14（arm64，含 UPX→noupx→官方源三级回退），全程实时日志。安装完成请填写访问密钥。</p>
            <p><b style="color:#9fe8ff;">获取密钥</b><br>登录 <a href="https://www.natfrp.com/user/" target="_blank" rel="noopener" style="color:#9fe8ff;">www.natfrp.com/user/</a> 获取访问密钥，填入面板输入框 → 点【保存】。</p>
            <p><b style="color:#9fe8ff;">三种启动方式</b><br>① 快速模式：填隧道ID（如 12345 或 12345,23456）→【快速启动】，适合单节点隧道；<br>② 隧道列表：点【拉取隧道列表】→ 勾选要启动的隧道 →【按勾选启动】，自动生成 frpc.ini，适合跨节点多隧道；<br>③ 配置文件模式：手动粘贴 frpc.ini →【保存并启动】。</p>
            <p><b style="color:#9fe8ff;">运行日志</b><br>实时显示 frpc 连接状态与报错，排查问题先看这里。</p>
            <p><b style="color:#9fe8ff;">安全</b><br>访问密钥保存为 600 权限、界面掩码显示；API 调用全程走设备端，不在浏览器暴露。</p>
            <p><b style="color:#9fe8ff;">卸载</b><br>连点 4 次【卸载】确认，自动停 frpc、删目录与开机自启。</p>
            <p><b style="color:#9fe8ff;">常见问题</b><br>① 隧道列表拉取失败 → 检查密钥是否保存、设备能否访问 api.natfrp.com；<br>② 隧道显示封禁 → 到官网申诉处理；<br>③ frpc 启动即退出 → 看运行日志，通常是隧道配置或本地服务未就绪。</p>
            <p style="text-align:right;color:#8a93a6;">开发者 <a href="https://www.shizhijia.vip/" target="_blank" rel="noopener" style="color:#9fe8ff;">史志佳</a>
            · <a href="https://space.bilibili.com/504975413" target="_blank" rel="noopener" style="color:#9fe8ff;">B站</a>
            · <a href="https://github.com/Bilibili-ShiZhijia" target="_blank" rel="noopener" style="color:#9fe8ff;">GitHub</a></p>
        </div>
    `

    const showHelp = () => {
        const old = document.querySelector('#kano_sfrp_help')
        if (old) old.remove()
        createModal({
            name: 'kano_sfrp_help',
            isMask: true,
            title: '📖 樱花映射SakuraFrp 使用说明',
            maxWidth: '720px',
            content: HELP_HTML,
            contentStyle: 'font-size:.72rem;line-height:1.8;max-height:62vh;overflow-y:auto;',
            showConfirm: false,
            closeBtnText: '关闭',
            onClose: () => true,
        })
        showModal('#kano_sfrp_help')
    }

    // ===================== 界面 =====================
    const mmContainer = document.querySelector('.functions-container')
    if (!mmContainer) return
    mmContainer.insertAdjacentHTML('afterend', `
        <div id="KANO_SFRP_PANEL" style="width: 100%; margin-top: 10px;">
            <div class="title" style="margin: 6px 0 ;">
                <strong>樱花映射 SakuraFrp</strong>
                <div style="display: inline-block;" id="collapse_sfrp_btn"></div>
            </div>
            <div class="collapse" id="collapse_sfrp" data-name="close" style="height: 0px; overflow: hidden;">
                <div class="collapse_box">
                    <div id="kano_sfrp_action_box" style="margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;"></div>
                    <div id="kano_sfrp_status_line" style="font-size:.72rem;color:#8a93a6;margin-bottom:8px;">加载中...</div>
                    <ul class="deviceList">
                        <li style="padding:10px;display: grid;grid-template-columns: 1fr 1fr;gap: 8px;">
                            <div>
                                <div class="title">
                                    <span>访问密钥</span>
                                    <button style="margin: 0 !important;padding: 2px 6px;" id="kano_sfrp_save_key">保存</button>
                                </div>
                                <input id="kano_sfrp_key" placeholder="在 www.natfrp.com/user/ 获取" style="margin:6px 0;width:100%;box-sizing:border-box;font-size:12px;border:none;padding:6px;border-radius:6px;background:rgba(255,255,255,.06);color:inherit;">
                                <div class="title">
                                    <span>隧道列表</span>
                                    <button style="margin: 0 !important;padding: 2px 6px;" id="kano_sfrp_refresh_tunnels">拉取隧道列表</button>
                                    <button style="margin: 0 !important;padding: 2px 6px;" id="kano_sfrp_gen_start">按勾选启动</button>
                                </div>
                                <div id="kano_sfrp_tunnel_list" style="margin-top:6px;max-height:260px;overflow-y:auto;font-size:.72rem;">
                                    <div style="color:#8a93a6;padding:6px;">保存访问密钥后点击【拉取隧道列表】</div>
                                </div>
                                <div class="title" style="margin-top:8px;">
                                    <span>快速模式</span>
                                    <button style="margin: 0 !important;padding: 2px 6px;" id="kano_sfrp_quick_start">快速启动</button>
                                </div>
                                <div style="display:flex;gap:6px;margin:6px 0;align-items:center;">
                                    <input id="kano_sfrp_quick_ids" placeholder="隧道ID, 多个用逗号分隔 如 12345,23456" style="flex:1;font-size:12px;border:none;padding:6px;border-radius:6px;background:rgba(255,255,255,.06);color:inherit;">
                                </div>
                                <div style="font-size:.64rem;color:#8a93a6;">快速模式 = 访问密钥 + 隧道ID, 适合单节点隧道; 多条隧道跨节点请用【按勾选启动】生成配置。</div>
                            </div>
                            <div>
                                <div class="title">
                                    <span>配置文件 frpc.ini</span>
                                    <button style="margin: 0 !important;padding: 2px 6px;" id="kano_sfrp_save_conf">保存并启动</button>
                                    <button style="margin: 0 !important;padding: 2px 6px;" id="kano_sfrp_read_conf">读取</button>
                                </div>
                                <textarea id="kano_sfrp_conf" style="margin-top: 4px;font-size:12px !important;border:none;padding:4px;margin:0;width:100%;height:240px;border-radius: 10px;overflow-x: hidden;background:transparent;" placeholder="# 按勾选启动会自动生成; 也可手动粘贴 frpc.ini"></textarea>
                                <div class="title" style="margin-top:8px;">
                                    <span>运行日志</span>
                                    <button style="margin: 0 !important;padding: 2px 6px;" id="kano_sfrp_refresh_log">刷新</button>
                                </div>
                                <textarea id="kano_sfrp_log" disabled style="margin-top: 4px;font-size:12px !important;border:none;padding:4px;margin:0;width:100%;height:160px;border-radius: 10px;overflow-x: hidden;background:transparent;"></textarea>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    `)

    // ===================== 按钮 =====================
    const actionBox = document.querySelector('#kano_sfrp_action_box')

    const installBtn = document.createElement('button')
    installBtn.textContent = '安装frpc'
    installBtn.title = '从 SakuraFrp CDN 下载 frpc arm64 (' + FRPC_VER + ')'
    installBtn.onclick = install

    const uninstallBtn = document.createElement('button')
    let uCount = 0
    let uTimer = null
    uninstallBtn.textContent = '卸载'
    uninstallBtn.onclick = async () => {
        if (uTimer) clearTimeout(uTimer)
        uTimer = setTimeout(() => { uCount = 0 }, 2000)
        if (uCount++ < 3) return createToast('再点一次卸载')
        await uninstall()
    }

    const startBtn = document.createElement('button')
    startBtn.textContent = '启动'
    startBtn.onclick = doStart

    const stopBtn = document.createElement('button')
    stopBtn.textContent = '停止'
    stopBtn.onclick = doStop

    const restartBtn = document.createElement('button')
    restartBtn.textContent = '重启'
    restartBtn.onclick = doRestart

    const bootBtn = document.createElement('button')
    bootBtn.id = 'kano_sfrp_boot'
    bootBtn.textContent = '开机自启'
    bootBtn.onclick = async () => {
        if (!await checkAdvance()) return createToast('没有开启高级功能，无法使用！', 'red')
        if (!await isInstalled()) return createToast('没有安装，请先安装！', 'red')
        if (await checkIsBootUp()) {
            await runShellWithRoot("sed -i '/kano_sakurafrp/d' /sdcard/ufi_tools_boot.sh")
            createToast('已取消开机自启', 'green')
        } else {
            await runShellWithRoot("grep -qxF '" + SERVICE + " start' /sdcard/ufi_tools_boot.sh || echo '" + SERVICE + " start' >> /sdcard/ufi_tools_boot.sh")
            createToast('已设置开机自启', 'green')
        }
        bootUpAction()
    }

    actionBox.appendChild(installBtn)
    actionBox.appendChild(uninstallBtn)
    actionBox.appendChild(startBtn)
    actionBox.appendChild(stopBtn)
    actionBox.appendChild(restartBtn)
    actionBox.appendChild(bootBtn)

    const helpBtn = document.createElement('button')
    helpBtn.textContent = '📖 使用说明'
    helpBtn.title = '查看插件详细使用方法与说明'
    helpBtn.onclick = showHelp
    actionBox.appendChild(helpBtn)

    // 面板内控件
    const bindPanel = () => {
        const el = document.querySelector('#KANO_SFRP_PANEL')
        if (!el) return
        const sk = el.querySelector('#kano_sfrp_save_key')
        const rt = el.querySelector('#kano_sfrp_refresh_tunnels')
        const gs = el.querySelector('#kano_sfrp_gen_start')
        const qs = el.querySelector('#kano_sfrp_quick_start')
        const sc = el.querySelector('#kano_sfrp_save_conf')
        const rc = el.querySelector('#kano_sfrp_read_conf')
        const rl = el.querySelector('#kano_sfrp_refresh_log')
        if (sk) sk.onclick = saveKey
        if (rt) rt.onclick = refreshTunnels
        if (gs) gs.onclick = genConfigAndStart
        if (qs) qs.onclick = quickStart
        if (sc) sc.onclick = saveConf
        if (rc) rc.onclick = showConf
        if (rl) rl.onclick = genLog
    }
    bindPanel()

    // ===================== 折叠面板与轮询 =====================
    let Log_INTERVAL = null
    collapseGen('#collapse_sfrp_btn', '#collapse_sfrp', '#collapse_sfrp', (newVal) => {
        if (newVal == 'open') {
            Log_INTERVAL && Log_INTERVAL()
            Log_INTERVAL = requestInterval(() => {
                refreshStatus()
                genLog()
            }, 3000)
        } else {
            Log_INTERVAL && Log_INTERVAL()
        }
    })

    if (localStorage.getItem('#collapse_sfrp') == 'open') {
        Log_INTERVAL = requestInterval(() => {
            refreshStatus()
            genLog()
        }, 3000)
    }

    // 初始加载
    refreshStatus()
    loadKey()
    showConf()
    bootUpAction()
})()
//</script>
