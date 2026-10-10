//<script>
(async () => {
    // ==========================
    // author: labwbt
    // Navidrome installer script for F50 (参考 OpenList 脚本改写)
    // - 默认端口: 4533
    // - 首次登录请在网页上创建管理员账号（脚本不会自动设置密码）
    // ==========================

    const DOWNLOAD_URL = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/navidrome.tar.gz'
    const pluginPath = "/data/navidrome"
    const bootSH = '/sdcard/ufi_tools_boot.sh'
    const logFile = '/sdcard/navidrome_log.log'
    const runtimeLogFile = "/data/navidrome/data/navidrome.log"
    const ND_PORT = 4533
    // startCommand 用于写入开机自启脚本，使用环境变量 ND_PORT
    const startCommand = `cd ${pluginPath} && nohup ${pluginPath}/navidrome --configfile ${pluginPath}/navidrome.toml >> ${logFile} 2>&1 &`

    const runShellWithRootWrapper = async (cmd, timeout) => {
        // convenience wrapper to keep logs consistent (原脚本直接调用 runShellWithRoot)
        return await runShellWithRoot(cmd, timeout)
    }

    const killProcessByName = async (processName) => {
        const psResult = await runShellWithRoot(`ps -ef | grep "${processName}" | grep -v grep`);
        const lines = (psResult.content || '').trim().split('\n').filter(l => l.trim() !== '');

        if (lines.length === 0) {
            return {
                success: false,
                content: "未找到相关进程"
            };
        }

        let killed = 0;
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[1];
            if (pid && /^\d+$/.test(pid)) {
                await runShellWithRoot(`kill ${pid}`);
                killed++;
            }
        }
        if (killed === 0) {
            return {
                success: false,
                content: "未找到可杀死的进程"
            };
        } else {
            return {
                success: true,
                content: `已杀死 ${killed} 个进程`
            };
        }
    };

    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami')
        if (res.content && res.content.includes('root')) return true
        return false
    }

    const checkIsBootUp = async () => {
        const res = await runShellWithRoot(`
        grep -q '${startCommand}' ${bootSH}
        echo $?
        `)
        return res.content.trim() == '0';
    }

    const checkIsInstalled = async () => {
        const res = await runShellWithRoot(`
        ls ${pluginPath}
        `)
        if (!res.success || !res.content.includes('navidrome')) return false
        return true
    }

    // 启动 Navidrome 并实时读取日志等待就绪
    const startNavidrome = async (cb = () => { }) => {
        createToast("启动 Navidrome 中...")
        const res7 = await runShellWithRoot(`
        ${startCommand}
        `)
        if (!res7.success) return createToast("启动 Navidrome 失败!", 'red')

        const { el, close } = createFixedToast('navidrome_toast', `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">等待日志中...</pre>`)

        let timer = null
        const timeout = 100 * 1000
        const t_now = performance.now()
        timer && clearTimeout(timer)
        timer = setInterval(async () => {
            const res = await runShellWithRoot(`timeout 2s awk '{print}' ${logFile}`)
            el.style.maxHeight = '400px'
            el.style.overflow = 'auto'
            el.innerHTML = `<pre style="pointer-events: all;white-space: pre-wrap;min-width:300px;text-align: center;">${res.content}<br>等待启动完成...</pre>`
            el.scrollTo({ top: 99999 })
            // 根据 Navidrome 启动日志寻找关键字 (常见为 'Listening on' 或  'Started'，不同版本略有差异)
            if (res.content && (res.content.includes('Started') || res.content.includes('Listening') || res.content.includes(`:${ND_PORT}`))) {
                cb && cb()
                setTimeout(() => {
                    close()
                }, 2000);
                clearInterval(timer)
            }
            if ((performance.now() - t_now) >= timeout) {
                close()
                clearInterval(timer)
            }
        }, 1000);
    }

    // UI 元素 - 按钮：安装 / 卸载 / 启动 / 停止 / 重启 / 导出日志 / 开机自启
    const btn_enabled = document.createElement('button')
    btn_enabled.textContent = "安装 Navidrome"
    let disabled_btn_enabled = false
    btn_enabled.onclick = async (e) => {
        if (disabled_btn_enabled) return
        disabled_btn_enabled = true
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能或未获取 root，无法使用！", 'red')
            disabled_btn_enabled = false
            return
        }
        if (await checkIsInstalled()) {
            createToast("已检测到已安装的 Navidrome！")
            disabled_btn_enabled = false
            return
        }

        createToast("下载所需组件中...")
        const res0 = await runShellWithRoot(`/data/data/com.minikano.f50_sms/files/curl -L "${DOWNLOAD_URL}" -o /data/kano_navidrome.tar.gz --output /data/kano_navidrome.tar.gz --write-out "DOWNLOAD_DONE\nTotal: %{size_download} bytes\nSpeed: %{speed_download} B/s\nTime: %{time_total} sec\n" > /data/kano_navidrome_latest.dlog 2>&1 &`, 100 * 1000)
        if (!res0.success) {
            btn_enabled.disabled = false;
            return createToast("下载依赖失败!", 'red')
        }

        let log = ''
        const max_times = 600 // 最多等待10分钟
        let count_times = 0
        const { el, close } = createFixedToast("kano_navidrome_toast", `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">等待日志中...</pre>`, '')

        const interval = setInterval(async () => {
            const dlog = await runShellWithRoot("timeout 2s  awk '{print}' /data/kano_navidrome_latest.dlog")
            const lines = dlog.content.split('\n'); // 按换行符拆分成数组
            log = lines.slice(-6).join('\n');
            el.innerHTML = `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">${log.replaceAll('\n', "<br>")}</pre>`
            if (log.includes('DOWNLOAD_DONE')) {
                setTimeout(() => {
                    close()
                }, 2000);
            }
        }, 1000)

        while (true) {
            if (max_times <= count_times) {
                clearInterval(interval)
                btn_enabled.disabled = false;
                return ("下载超时，请检查网络连接或稍后重试！", 'red')
            }
            if (log.includes('DOWNLOAD_DONE')) {
                clearInterval(interval)
                break
            }
            count_times++
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        await runShellWithRoot("rm -f /data/kano_navidrome_latest.dlog")

        createToast("解压 Navidrome 文件...")
        const res2 = await runShellWithRoot(`
        cd /data
        mkdir -p ${pluginPath}
        tar -zxf kano_navidrome.tar.gz -C ${pluginPath}
        rm -f kano_navidrome.tar.gz
        `)
        if (!res2.success) {
            disabled_btn_enabled = false
            return createToast("解压 Navidrome 文件出错!", 'red')
        }

        createToast("检查依赖文件...")
        const res3 = await runShellWithRoot(`
        ls ${pluginPath}
        `)
        if (!res3.success || !res3.content.includes('navidrome')) {
            disabled_btn_enabled = false
            return createToast("检查 Navidrome 依赖文件失败!", 'red')
        }

        createToast("设置权限并配置开机自启...")
        const res5 = await runShellWithRoot(`
chmod 777 -Rf ${pluginPath}
grep -qxF '${startCommand}' ${bootSH} || echo '${startCommand}' >> ${bootSH}
mkdir -p /data/navidrome
cat > /data/navidrome/navidrome.toml <<EOF
MusicFolder = "/sdcard/Music"
Address = "0.0.0.0"
Port = 4533
LogLevel = "info"
EOF
        `)
        if (!res5.success) {
            disabled_btn_enabled = false
            return createToast("设置权限/自启动失败!", 'red')
        }

        createToast("安装完成，正在启动 Navidrome...")
        startNavidrome(() => {
            createToast(`<div style="width:300px;text-align:center;pointer-events: all;">
            Navidrome 启动成功！<br />
            访问地址：<br/>
            <a href="http://${UFI_DATA.lan_ipaddr}:${ND_PORT}" target="_blank">http://${UFI_DATA.lan_ipaddr}:${ND_PORT}</a><br/>
            首次访问请通过网页创建管理员账号（会在首次加载时提示）。<br/>
            音乐保存路径(openlist可挂载): "/storage/emulated/0/Music" <br/>
            启动日志: ${logFile}<br/>
    </div>
    `, '', 20000)

        })

        disabled_btn_enabled = false

        checkIsBootUp().then(isBootUp => {
            const boot_on = document.querySelector('#navidrome_boot_on')
            if (!boot_on) return
            boot_on.style.background = isBootUp ? "var(--dark-btn-color-active)" : ""
        })
    }

    const btn_disabled = document.createElement('button')
    btn_disabled.textContent = "卸载 Navidrome"
    let ct = 0
    btn_disabled.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        ct++
        if (ct < 2) { createToast("再点一次卸载 Navidrome") }
        tmer = setTimeout(() => { ct = 0 }, 3000);
        if (ct < 2) return
        createToast("卸载中...", 'red')
        const killResult = await killProcessByName('navidrome')
        createToast(killResult.content)
        const res = await runShellWithRoot(`
        rm -rf ${pluginPath}
        sed -i '/navidrome/d' ${bootSH}
        `)
        if (!res.success) return createToast("卸载失败！", 'red')
        createToast(`卸载成功!`, 'green')
    }

    const btn_restart = document.createElement('button')
    btn_restart.textContent = "重启 Navidrome"
    btn_restart.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (! await checkIsInstalled()) {
            return createToast("你还没有安装 Navidrome！")
        }
        createToast("重启 Navidrome 中...", 'green')
        const killResult = await killProcessByName('navidrome')
        createToast(killResult.content)
        startNavidrome(() => {
            createToast(`重启成功`, 'green')
        })
    }

    const stopBtn = document.createElement('button')
    stopBtn.classList.add('btn')
    stopBtn.textContent = "停止 Navidrome"
    stopBtn.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (! await checkIsInstalled()) {
            return createToast("你还没有安装 Navidrome！")
        }
        createToast("停止 Navidrome 中...", 'green')
        const killResult = await killProcessByName('navidrome')
        createToast(killResult.content)
        createToast(`停止成功！`, 'green')
    }

    const wait = (sec = 100) => new Promise((resolve) => { setTimeout(() => { resolve() }, sec); })
    const container = document.querySelector('.functions-container')
    while (!UFI_DATA.lan_ipaddr) {
        await wait()
    }

    container.insertAdjacentHTML("afterend", `
<div id="IFRAME_NAVIDROME" style="width: 100%; margin-top: 10px;">
    <div class="title" style="margin: 6px 0 ;">
        <strong>Navidrome</strong>
        <div style="display: inline-block;" id="collapse_navidrome_btn"></div>
    </div>
    <div class="collapse" id="collapse_navidrome" data-name="close" style="height: 0px; overflow: hidden;">
        <div class="collapse_box">
        <div id="nav_action_box" style="margin-bottom:8px;display:flex;gap:10px;flex-wrap:wrap"></div>
        </div>
    </div>
</div>
`)

    const btn_open = document.createElement('button')
    btn_open.classList.add('btn')
    btn_open.textContent = "打开Navid"
    btn_open.onclick = () => {
        createToast("正在打开Navidrome面板...")
        const a = document.createElement('a')
        a.href = `http://${UFI_DATA.lan_ipaddr}:${ND_PORT}`
        a.target = "_blank"
        a.click()
    }

    const exportBtn = document.createElement('button')
    exportBtn.classList.add('btn')
    exportBtn.textContent = "导出运行日志"
    exportBtn.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (! await checkIsInstalled()) {
            return createToast("你还没有安装 Navidrome！")
        }
        createToast("导出运行日志中...", '')
        const t = Math.floor(Date.now() + Math.random())
        const res = await runShellWithRoot(`
                rm -f /data/data/com.minikano.f50_sms/files/uploads/navidrome_log_*
                sleep 1
                cp ${logFile} /data/data/com.minikano.f50_sms/files/uploads/navidrome_log_${t}.log || cp ${runtimeLogFile} /data/data/com.minikano.f50_sms/files/uploads/navidrome_log_${t}.log
                chmod 777 /data/data/com.minikano.f50_sms/files/uploads/navidrome_log_${t}.log
                `)
        if (!res.success) return createToast("导出失败！", 'red')
        const a = document.createElement('a')
        a.download = `navidrome日志_${t}.log`
        a.href = `/api/uploads/navidrome_log_${t}.log`
        a.target = "_blank"
        a.style.display = "none"
        document.body.appendChild(a)
        a.click()
        a.remove()
    }

    const boot_on = document.createElement('button')
    boot_on.id = "navidrome_boot_on"
    boot_on.classList.add('btn')
    boot_on.textContent = "开机自启"
    boot_on.style.background = ""
    boot_on.addEventListener('click', async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (! await checkIsInstalled()) {
            return createToast("你还没有安装 Navidrome！")
        }
        const isBootUp = await checkIsBootUp();
        if (isBootUp) {
            //关闭
            await runShellWithRoot(`
                sed -i '/navidrome/d' ${bootSH}
            `)
            boot_on.style.background = ""
            createToast("已取消开机自启", 'green')
        } else {
            //开启
            await runShellWithRoot(`
                grep -qxF '${startCommand}' ${bootSH} || echo '${startCommand}' >> ${bootSH}
            `)
            boot_on.style.background = "var(--dark-btn-color-active)"
            createToast("已设置开机自启", 'green')
        }
    })

    checkIsBootUp().then(isBootUp => {
        if (isBootUp) {
            boot_on.style.background = "var(--dark-btn-color-active)"
        } else {
            boot_on.style.background = ""
        }
    })

    const mmBox = document.querySelector('#nav_action_box')
    mmBox.appendChild(btn_enabled)
    mmBox.appendChild(stopBtn)
    mmBox.appendChild(btn_restart)
    mmBox.appendChild(btn_disabled)
    mmBox.appendChild(exportBtn)
    mmBox.appendChild(boot_on)
    mmBox.appendChild(btn_open)
    collapseGen("#collapse_navidrome_btn", "#collapse_navidrome", "#collapse_navidrome", (e) => { })
})()
//</script>