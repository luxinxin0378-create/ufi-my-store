//<script>
(() => {
    const cpolarPath = "/data/cpolar"
    const bootSH = '/sdcard/ufi_tools_boot.sh'
    const bootLogFile = '/sdcard/cpolar_log.log'
    const startCommand = `echo "[cpolar] boot $(date)" >> ${bootLogFile}; cd ${cpolarPath} && chmod +x ${cpolarPath}/cpolar || true; nohup ${cpolarPath}/cpolar start-all -dashboard=on -daemon=on -config=${cpolarPath}/.cpolar/cpolar.yml -log=${cpolarPath}/logs/access.log >> ${bootLogFile} 2>&1 &`

    const checkWeakToken = () => {
        if (SHA256) {
            let weakTokenList = [
                "admin",
                "password",
                "666",
                "6666",
                "12345",
                "123456",
                "1234567",
                "12345678",
                "123456789",
                "1234567890",
                "root",
            ]
            for (let token of weakTokenList) {
                if (SHA256(token) == KANO_TOKEN.toUpperCase()) {
                    return true
                }
            }
            return false
        }
    }

    const checkIsBootUp = async () => {
        // 先尝试精确匹配我们写入的整行命令，其次回退到模糊匹配关键字
        const exact = await runShellWithRoot(`grep -qxF '${startCommand}' ${bootSH} 2>/dev/null; echo $?`)
        if (exact.content && exact.content.trim() === '0') return true
        const fuzzy = await runShellWithRoot(`grep -q 'cpolar start-all' ${bootSH} 2>/dev/null; echo $?`)
        return !!(fuzzy.content && fuzzy.content.trim() === '0')
    }

    const checkIsInstalled = async () => {
        const res = await runShellWithRoot(`
    ls ${cpolarPath}
    `)
        return !!(res.success && res.content && res.content.includes('cpolar'))
    }
    const sleep = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms))
    const btn_enabled = document.createElement('button')
    btn_enabled.textContent = "安装cpolar"
    btn_enabled.onclick = async () => {
        if (checkWeakToken()) { return createToast(`检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！`, "red", 8000) }
        // 若已安装则直接提示并返回
        const installed = await runShellWithRoot(`
    [ -f ${cpolarPath}/cpolar ] && echo YES || echo NO
    `)
        if (installed.success && (installed.content || '').includes('YES')) {
            return createToast('已检测到 cpolar 安装，跳过下载与解压', 'green')
        }
        createToast("准备安装环境……")
        // 预创建目录
        const prep = await runShellWithRoot(`
    cd /data/
    rm -f cpolar.zip
    mkdir -p cpolar
    `)
        if (!prep.success) return createToast("准备目录失败!", 'red')
        createToast("安装目录就绪：/data/cpolar（已清理旧压缩包）", 'green')

        // 固定使用指定 arm64 版本
        createToast("正在下载 cpolar 3.3.12（arm64）……")
        let res1 = await runShellWithRoot(`
    /data/data/com.minikano.f50_sms/files/curl -fSL https://www.cpolar.com/static/downloads/releases/3.3.12/cpolar-stable-linux-arm64.zip -o /data/cpolar.zip
    `, 100 * 1000)
        if (!res1.success) return createToast("下载cpolar失败!", 'red')
        createToast("下载完成：/data/cpolar.zip", 'green')

        createToast("解压到 /data/cpolar ……")
        const res2 = await runShellWithRoot(`
    cd /data/
    unzip -o cpolar.zip -d /data/cpolar/
    `)
        if (!res2.success) return createToast("解压cpolar文件出错!", 'red')
        createToast("解压完成", 'green')

        createToast("验证可执行文件……")
        const res3 = await runShellWithRoot(`
    ls /data/cpolar
    `)
        if (!res3.success || !res3.content.includes('cpolar')) return createToast("未找到cpolar可执行文件!", 'red')
        createToast("已找到可执行文件：/data/cpolar/cpolar", 'green')

        const res4 = await runShellWithRoot(`
    chmod +x /data/cpolar/cpolar || true
    echo 'binary_ready' || true
    `)
        if (!res4.success) return createToast("设置执行权限失败!", 'red')
        createToast("已设置执行权限", 'green')

        createToast("初始化配置与日志目录……")
        const res5 = await runShellWithRoot(`
    mkdir -p /data/cpolar/.cpolar
    touch /data/cpolar/.cpolar/cpolar.yml
    # 仅当文件为空时写入默认配置，避免覆盖用户已有配置
    if [ ! -s /data/cpolar/.cpolar/cpolar.yml ]; then
      cat > /data/cpolar/.cpolar/cpolar.yml << 'EOF'
tunnels:
  cpolar-web-ui-9200:
    proto: http
    addr: "9200"
    region: cn_top
  ufi-tool-2333:
    proto: http
    addr: "2333"
    region: cn_top
EOF
    fi
    mkdir -p /data/cpolar/logs
    `)
        if (!res5.success) return createToast("创建配置文件失败!", 'red')
        // 检测默认隧道是否存在并提示
        const tunnelsCheck = await runShellWithRoot(`
    if grep -q 'cpolar-web-ui-9200' /data/cpolar/.cpolar/cpolar.yml && grep -q 'ufi-tool-2333' /data/cpolar/.cpolar/cpolar.yml; then
      echo DEFAULT_OK
    else
      echo NO_DEFAULT
    fi
    `)
        if (tunnelsCheck.success && (tunnelsCheck.content || '').includes('DEFAULT_OK')) {
            createToast('已创建默认隧道（9200 / 2333）', 'green', 3000)
        } else {
            createToast('检测到已有隧道配置或未创建默认隧道（未覆盖）', '', 3000)
        }
        createToast("配置已就绪：/data/cpolar/.cpolar/cpolar.yml；日志目录：/data/cpolar/logs", 'green')
        // 安装完成后，自动设置开机自启（幂等）
        await runShellWithRoot(`
    touch ${bootSH}
    chmod 0777 ${bootSH} 2>/dev/null || true
    grep -qxF '${startCommand}' ${bootSH} || echo '${startCommand}' >> ${bootSH}
    `)
        createToast('已设置开机自启', 'green', 3000)

        createToast(`<div style="width:300px;text-align:center">
            安装cpolar成功！<br />可执行文件：/data/cpolar/cpolar<br />请点击“配置Token”完成授权
    </div>
    `, '', 3000)

        // 安装后输出版本
        const verOut = await runShellWithRoot(`
    /data/cpolar/cpolar version
    `)
        if (verOut.success && verOut.content) {
            const first = (verOut.content.split('\n')[0] || '').trim()
            if (first) createToast('cpolar 版本: ' + first, 'green')
        }

        // 安装后尝试启动并刷新按钮状态
        createToast('尝试启动 cpolar...', '', 5000)
        await sleep(600)
        await runShellWithRoot(`/data/cpolar/cpolar start-all -dashboard=on -daemon=on -config=/data/cpolar/.cpolar/cpolar.yml -log=/data/cpolar/logs/access.log || true`)
        for (let i = 0; i < 8; i++) {
            const r = await runShellWithRoot(`ps -ef | grep -E "cpolar(:|\\s)" | grep -v grep`)
            if (r.success && r.content && r.content.trim() !== '') {
                createToast('已启动（后台守护）', 'green', 3000)
                const btn = document.getElementById('cpolar_start_btn')
                if (btn) {
                    btn.style.backgroundColor = 'var(--dark-btn-color-active)'
                    btn.textContent = '停止cpolar'
                }
                // 同步自启按钮状态
                const bootBtnEl = document.getElementById('cpolar_boot_on')
                if (bootBtnEl) {
                    // 稍作延迟再刷新，确保脚本已写入
                    setTimeout(() => { try { refreshBootBtn && refreshBootBtn() } catch { } }, 300)
                }
                // 提示并在2秒后刷新页面
                createToast('2秒后刷新页面', '', 2000)
                try { setTimeout(() => location.reload(), 2000) } catch { }
                break
            }
            await runShellWithRoot(`sleep 0.5`)
        }
    }
    const btn_disabled = document.createElement('button')
    btn_disabled.textContent = "卸载cpolar"
    btn_disabled.onclick = async () => {
        btn_disabled.disabled = true
        createToast('开始卸载cpolar……', '')

        // 若无安装/残留则直接跳过
        const preCheck = await runShellWithRoot(`
    CHECK=0
    [ -f /data/cpolar/cpolar ] && CHECK=1
    [ -d /data/cpolar/logs ] && CHECK=1
    [ -f /data/cpolar.zip ] && CHECK=1
    ps -ef | grep -E "cpolar(:|\\s)" | grep -v grep >/dev/null 2>&1 && CHECK=1 || true
    echo $CHECK
    `)
        if (preCheck.success && (preCheck.content || '').trim() === '0') {
            createToast('未检测到已安装的 cpolar，跳过卸载', 'green')
            btn_disabled.disabled = false
            return
        }

        // 停止可能存在的进程
        createToast('准备停止 cpolar 进程……', '')
        const stopAll = await runShellWithRoot(`
    /data/cpolar/cpolar stop-all >/dev/null 2>&1 || true
    for i in 1 2 3 4 5; do
      PIDS="$(ps -ef | grep -E 'cpolar(:|\\s)' | grep -v grep | tr -s ' ' | cut -d ' ' -f 2)"
      [ -z "$PIDS" ] && break
      kill $PIDS >/dev/null 2>&1 || true
      sleep 0.4
    done
    PIDS2="$(ps -ef | grep -E 'cpolar(:|\\s)' | grep -v grep | tr -s ' ' | cut -d ' ' -f 2)"
    [ -z "$PIDS2" ] || kill -9 $PIDS2 >/dev/null 2>&1 || true
    `)
        if (!stopAll.success) {
            createToast('尝试停止进程时发生异常', 'red')
        }
        {
            const still = await runShellWithRoot(`ps -ef | grep -E "cpolar(:|\\s)" | grep -v grep`)
            if (still.success && still.content && still.content.trim() !== '') {
                createToast('仍检测到进程存活，已尝试强制结束，请稍后重试', 'red')
            } else {
                createToast('已停止所有 cpolar 进程', 'green')
            }
        }

        // 删除下载的压缩包
        createToast('清理安装包 /data/cpolar.zip ……', '')
        const delZip = await runShellWithRoot(`
    if [ -f /data/cpolar.zip ]; then rm -f /data/cpolar.zip; echo REMOVED; else echo SKIP; fi
    `)
        if (!delZip.success) return createToast('删除下载压缩包失败！', 'red')
        if ((delZip.content || '').includes('REMOVED')) createToast('已清理安装包', 'green')
        else createToast('未发现安装包，跳过', 'green')

        // 删除可执行文件
        createToast('移除二进制文件 /data/cpolar/cpolar ……', '')
        const delBin = await runShellWithRoot(`
    if [ -f /data/cpolar/cpolar ]; then rm -f /data/cpolar/cpolar; echo REMOVED; else echo SKIP; fi
    `)
        if (!delBin.success) return createToast('删除可执行文件失败！', 'red')
        if ((delBin.content || '').includes('REMOVED')) createToast('已移除二进制文件', 'green')
        else createToast('未发现可执行文件，跳过', 'green')

        // 删除日志文件（保留配置文件）
        createToast('清空运行日志……', '')
        const delLogs = await runShellWithRoot(`
    if [ -d /data/cpolar/logs ]; then rm -rf /data/cpolar/logs; echo REMOVED; else echo SKIP; fi
    `)
        if (!delLogs.success) return createToast('删除日志失败！', 'red')
        if ((delLogs.content || '').includes('REMOVED')) createToast('已清空日志目录', 'green')
        else createToast('未发现日志目录，跳过', 'green')

        // 删除配置文件（应用户需求，完全卸载）
        createToast('删除配置文件……', '')
        const delCfg = await runShellWithRoot(`
    if [ -d /data/cpolar/.cpolar ]; then rm -rf /data/cpolar/.cpolar; echo REMOVED; else echo SKIP; fi
    `)
        if (!delCfg.success) return createToast('删除配置失败！', 'red')
        if ((delCfg.content || '').includes('REMOVED')) createToast('已删除配置目录', 'green')
        else createToast('未发现配置目录，跳过', 'green')

        // 清理目录下残留
        createToast('清理目录残留文件……', '')
        const cleanResidue = await runShellWithRoot(`
    if [ -d /data/cpolar ]; then
      find /data/cpolar -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null || true
    fi
    echo OK
    `)
        if (!cleanResidue.success) return createToast('清理残留文件失败！', 'red')
        createToast('已清理目录残留', 'green')

        // 清理自启动脚本项
        createToast('移除自启动项……', '')
        const cleanBoot = await runShellWithRoot(`
    sed -i '/cpolar/d' /sdcard/ufi_tools_boot.sh || true
    `)
        if (!cleanBoot.success) return createToast('清理自启动脚本失败！', 'red')
        createToast('已移除自启动项', 'green')

        // 如目录已空则尝试删除 /data/cpolar
        const tryRemoveDir = await runShellWithRoot(`
    rmdir /data/cpolar 2>/dev/null && echo REMOVED || echo KEEP
    `)
        if (tryRemoveDir.success && (tryRemoveDir.content || '').includes('REMOVED')) {
            createToast('已删除目录：/data/cpolar', 'green')
        } else {
            const hasCfg = await runShellWithRoot(`[ -d /data/cpolar/.cpolar ] && echo YES || echo NO`)
            if (hasCfg.success && (hasCfg.content || '').includes('YES')) {
                createToast('已保留目录用于存放配置：/data/cpolar/.cpolar', 'green')
            } else {
                createToast('目录仍存在，可能有占用或权限限制', 'red')
            }
        }

        createToast('卸载完成', 'green')
        // 卸载完成后提示并刷新页面
        createToast('2秒后刷新页面', '', 2000)
        try { setTimeout(() => location.reload(), 2000) } catch { }
        btn_disabled.disabled = false
    }
    (() => {
        // 配置Token
        const tokenBtn = document.createElement('button')
        tokenBtn.classList.add('btn')
        tokenBtn.textContent = "配置Token"
        tokenBtn.onclick = async () => {
            const token = window.prompt('请输入 cpolar authtoken')
            if (!token) return
            const res = await runShellWithRoot(`
    /data/cpolar/cpolar authtoken "${token}"
    `)
            if (!res.success) return createToast("配置Token失败！", 'red')
            createToast("配置Token成功！", 'green')
        }
        // 暂不立即追加，稍后统一按顺序追加

        // 启动/停止 cpolar（切换）
        const startBtn = document.createElement('button')
        startBtn.id = 'cpolar_start_btn'
        startBtn.classList.add('btn')
        const LIGHT = ''
        const DARK = 'var(--dark-btn-color-active)'
        const setStartBtnStyle = (running) => {
            startBtn.style.backgroundColor = running ? DARK : LIGHT
            startBtn.textContent = running ? '停止cpolar' : '启动cpolar'
        }
        const isRunning = async () => {
            const r = await runShellWithRoot(`ps -ef | grep -E "cpolar(:|\\s)" | grep -v grep`)
            return !!(r.success && r.content && r.content.trim() !== '')
        }
        const refreshStartBtn = async () => setStartBtnStyle(await isRunning())
        setStartBtnStyle(false)
        startBtn.onclick = async () => {
            const running = await isRunning()
            startBtn.disabled = true
            if (running) {
                createToast('正在停止...', '')
                const stopRes = await runShellWithRoot(`
    /data/cpolar/cpolar stop-all >/dev/null 2>&1 || true
    for i in 1 2 3 4 5; do
      PIDS=\"$(ps -ef | grep -E 'cpolar(:|\\s)' | grep -v grep | tr -s ' ' | cut -d ' ' -f 2)\"
      [ -z \"$PIDS\" ] && break
      kill $PIDS >/dev/null 2>&1 || true
      sleep 0.5
    done
    PIDS2=\"$(ps -ef | grep -E 'cpolar(:|\\s)' | grep -v grep | tr -s ' ' | cut -d ' ' -f 2)\"
    [ -z \"$PIDS2\" ] || kill -9 $PIDS2 >/dev/null 2>&1 || true
    `)
                startBtn.disabled = false
                if (!stopRes.success) return createToast('停止失败！', 'red')
                if (await isRunning()) {
                    setStartBtnStyle(true)
                    return createToast('仍有进程存活，已尝试强制结束，请重试', 'red')
                }
                setStartBtnStyle(false)
                return createToast('已停止', 'green')
            }
            if (checkWeakToken()) { return createToast(`检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！`, "red", 8000) }
            createToast('正在启动...', '')
            await runShellWithRoot(`/data/cpolar/cpolar start-all -dashboard=on -daemon=on -config=/data/cpolar/.cpolar/cpolar.yml -log=/data/cpolar/logs/access.log || true`)
            startBtn.disabled = false
            // 启动后进行多次轮询确认
            for (let i = 0; i < 8; i++) {
                if (await isRunning()) {
                    setStartBtnStyle(true)
                    return createToast('已启动（后台守护）', 'green')
                }
                await runShellWithRoot(`sleep 0.5`)
            }
            setStartBtnStyle(false)
            return createToast('启动未检测到进程，请检查日志', 'red')
        }
        // 暂不立即追加，稍后统一按顺序追加

        // 检测运行状态
        const statusBtn = document.createElement('button')
        statusBtn.classList.add('btn')
        statusBtn.textContent = "检测运行状态"
        statusBtn.onclick = async () => {
            const res = await runShellWithRoot(`
    ps -ef | grep -E "cpolar(:|\\s)" | grep -v grep
    `)
            const ver = await runShellWithRoot(`
    /data/cpolar/cpolar version
    `)
            let versionText = ''
            if (ver.success && ver.content) {
                versionText = ' 版本: ' + (ver.content.split('\n')[0] || '').trim()
            }
            if (res.success && res.content && res.content.trim() !== '') {
                createToast("cpolar 运行中" + versionText, 'green')
            } else {
                createToast("cpolar 未在运行" + versionText, 'red')
            }
        }
        // 暂不立即追加，稍后统一按顺序追加

        // 打开 Web UI 按钮（固定地址）
        const openUiBtn = document.createElement('button')
        openUiBtn.classList.add('btn')
        openUiBtn.textContent = "打开Web UI"
        openUiBtn.onclick = () => {
            if (checkWeakToken()) { return createToast(`检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！`, "red", 8000) }
            const url = 'http://192.168.0.1:9200'
            try { window.open(url, '_blank') } catch { location.href = url }
        }

        // 开机自启按钮
        const bootBtn = document.createElement('button')
        bootBtn.id = 'cpolar_boot_on'
        bootBtn.classList.add('btn')
        bootBtn.textContent = '开机自启'
        const setBootBtnStyle = (enabled) => {
            bootBtn.style.backgroundColor = enabled ? DARK : LIGHT
        }
        const refreshBootBtn = async () => setBootBtnStyle(await checkIsBootUp())
        bootBtn.addEventListener('click', async () => {
            if (!await checkIsInstalled()) {
                return createToast('你还没有安装cpolar！')
            }
            const isBootUp = await checkIsBootUp()
            if (isBootUp) {
                await runShellWithRoot(`
            sed -i '/cpolar/d' ${bootSH}
            `)
                setBootBtnStyle(false)
                createToast('已取消开机自启', 'green')
            } else {
                if (checkWeakToken()) { return createToast(`检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！`, "red", 8000) }
                await runShellWithRoot(`
            touch ${bootSH}
            chmod 0777 ${bootSH} || true
            grep -qxF '${startCommand}' ${bootSH} || echo '${startCommand}' >> ${bootSH}
            `)
                setBootBtnStyle(true)
                createToast('已设置开机自启', 'green')
            }
        })

        // 构建与 OpenList 相似的折叠卡片（不包含 iframe）并统一按顺序追加按钮
        const container = document.querySelector('.functions-container')
        const cardHtml = `
<div id="CPOLAR_CARD" style="width: 100%; margin-top: 10px;">
<div class="title" style="margin: 6px 0 ;">
    <strong>cpolar</strong>
    <div style="display: inline-block;" id="collapse_cpolar_btn"></div>
</div>
<div class="collapse" id="collapse_cpolar" data-name="close" style="height: 0px; overflow: hidden;">
    <div class="collapse_box">
        <div id="cpl_action_box" style="margin-bottom:8px;display:flex;gap:10px;flex-wrap:wrap"></div>
    </div>
</div>
</div>`
        if (container) {
            container.insertAdjacentHTML('afterend', cardHtml)
            const box = document.querySelector('#cpl_action_box')
            // 追加按钮顺序
            box.appendChild(btn_enabled)
            box.appendChild(startBtn)
            box.appendChild(statusBtn)
            box.appendChild(openUiBtn)
            box.appendChild(tokenBtn)
            box.appendChild(bootBtn)
            box.appendChild(btn_disabled)
            // 折叠交互
            collapseGen("#collapse_cpolar_btn", "#collapse_cpolar", "#collapse_cpolar", (e) => { })
            // 初始化按钮状态
            refreshStartBtn()
            refreshBootBtn()
            // 额外的延迟刷新，确保页面刚刷新/开机加载时状态能稳定同步
            setTimeout(() => { refreshStartBtn(); refreshBootBtn() }, 600)
            setTimeout(() => { refreshStartBtn(); refreshBootBtn() }, 1500)
        }
    })()
})()
//</script>