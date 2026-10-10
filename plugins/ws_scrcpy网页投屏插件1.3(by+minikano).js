//<script>
(async () => {
    const pluginName = "ws_scrcpy"
    const pluginName_CN = "网页投屏"
    const pluginPath = "/data/kano_ws_scrcpy"
    const bootSH = '/sdcard/ufi_tools_boot.sh'
    const logFile = 'data/kano_ws_scrcpy/ws_scrcpy_LOG.txt'
    const configFile = 'data/kano_ws_scrcpy/config.yaml'
    const DEFAULT_PORT = 9527
    const runtimeLogFile = logFile
    const download_url = "https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/ws_scrcpy.tar.gz"
    const startCommand = `(cd ${pluginPath} && sh service.sh start)`
    const stopCommand = `(cd ${pluginPath} && sh service.sh stop)`

    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami')
        if (res.content) {
            if (res.content.includes('root')) {
                return true
            }
        }
        return false
    }

    const saveConfig = async (file) => {
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await (await fetch(`${KANO_baseURL}/upload_img`, {
                method: "POST",
                headers: common_headers,
                body: formData,
            })).json()

            if (res.url) {
                let foundFile = await runShellWithRoot(`
                        ls /data/data/com.minikano.f50_sms/files/${res.url}
                    `)
                if (!foundFile.content) {
                    throw "上传失败"
                }
                let resShell = await runShellWithRoot(`
                        mv  /data/data/com.minikano.f50_sms/files/${res.url} ${configFile}
                    `)
                if (resShell.success) {
                    createToast(`上传成功！正在重启${pluginName}...`, 'green')
                    btn_restart.click()
                    return true
                }
            }
            else throw res.error || ''
        }
        catch (e) {
            console.error(e);
            createToast(`上传失败!`, 'red')
            return false
        }
    }

    const wait = (sec = 100) => new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, sec);
    })

    const killProcess = async () => {
        const psResult = await runShellWithRoot(stopCommand);
        return {
            success: true,
            content: psResult.content && psResult.content.replaceAll('\n', "<br>")
        };
    };

    const checkIsRunning = async () => {
        // `${ pluginName } _status`
        const psResult = await runShellWithRoot(`ps -ef | grep -v grep | grep ${pluginName}`);
        return psResult.content.includes(pluginName)
    }

    const setRunningElementText = (isRunning) => {
        const titleEl = document.querySelector(`#${pluginName}_status`)
        if (titleEl) {
            if (isRunning) {
                titleEl.textContent = `${pluginName_CN} - 🟢运行中`
            } else {
                titleEl.textContent = `${pluginName_CN} - 🔴已停止`
            }
        }
    }

    const getPort = async () => {
        if (!(await checkAdvanceFunc())) {
            return DEFAULT_PORT
        }
        try {
            const result = await runShellWithRoot(`grep -m1 'port:' ${configFile} | awk '{print $2}'`);
            const port = result.content.trim().replace(/\D/g, '')
            if (isNaN(port) || !port) return DEFAULT_PORT
            return port
        } catch {
            return DEFAULT_PORT
        }
    }

    const renderPort = async () => {
        const port = await getPort()
        document.getElementById(`${pluginName}_iframe`).src = `http://${UFI_DATA.lan_ipaddr}:${port}/?t=` + Date.now();
    }

    // 检测是否开机自启
    const checkIsBootUp = async () => {
        const res = await runShellWithRoot(`
        grep -q '${startCommand}' ${bootSH}
        echo $?
        `)
        return res.content.trim().includes('0');
    }

    const checkIsInstalled = async () => {
        const res = await runShellWithRoot(`
        ls ${pluginPath}
        `)
        if (!res.success || !res.content.includes('service.sh')) return false
        return true
    }

    //启动并输出日志
    const start = async (cb = () => { }) => {
        createToast(`启动${pluginName}中...`)
        const res7 = await runShellWithRoot(`
        ${startCommand}
        `)
        if (!res7.success) return createToast(`启动${pluginName}失败!`, 'red')

        const { el, close } = createFixedToast(`${pluginName}_toast`, `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">等待日志中...</pre>`)

        let timer = null
        const timeout = 60 * 1000
        const t_now = performance.now()
        timer && clearTimeout(timer)
        let oldContent = ''
        timer = setInterval(async () => {
            const res = await runShellWithRoot(`timeout 2s  awk '{print}' ${logFile}`)
            el.style.maxHeight = '400px'
            el.style.overflow = 'auto'
            el.innerHTML = `<pre style="pointer-events: all;white-space: pre-wrap;min-width:300px;text-align: center;">${res.content}<br>等待启动完成(${Math.floor((timeout - (performance.now() - t_now)) / 1000)}s)...</pre>`
            if (oldContent != res.content) {
                el.scrollTo({
                    top: 99999
                })
            }
            oldContent = res.content
            if (res.content.includes('Listening on:') && res.content.includes('localhost')) {
                cb && cb()
                setTimeout(() => {
                    close()
                    refresh && refresh.click()
                }, 2000);
                clearTimeout(timer)
            }
            if ((performance.now() - t_now) >= timeout) {
                if (!(res.content.includes('Listening on:') && res.content.includes('localhost'))) {
                    createToast(`启动${pluginName}失败!`, 'red')
                }
                close()
                refresh && refresh.click()
                clearTimeout(timer)
            }
        }, 1000);
    }


    const btn_enabled = document.createElement('button')
    btn_enabled.textContent = `安装${pluginName}`
    let disabled_btn_enabled = false
    btn_enabled.onclick = async (e) => {
        if (disabled_btn_enabled) return
        disabled_btn_enabled = true
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (await checkIsInstalled()) {
            return createToast("你已经安装过了！")
        }

        createToast("下载所需组件中...")
        const res0 = await runShellWithRoot(`/data/data/com.minikano.f50_sms/files/curl -L "${download_url}" -o /data/${pluginName}.tar.gz --output /data/${pluginName}.tar.gz --write-out "DOWNLOAD_DONE\nTotal: %{size_download} bytes\nSpeed: %{speed_download} B/s\nTime: %{time_total} sec\n" > /data/kano_${pluginName}_latest.dlog 2>&1 &`, 100 * 1000)
        if (!res0.success) {
            btn_enabled.disabled = false;
            return createToast("下载依赖失败!", 'red')
        }

        let log = ''
        const max_times = 600 // 最多等待10分钟
        let count_times = 0
        const { el, close } = createFixedToast(`kano_${pluginName}_toast`, `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">等待日志中...</pre>`, '')

        const interval = setInterval(async () => {
            const dlog = await runShellWithRoot(`timeout 2s  awk '{print}' /data/kano_${pluginName}_latest.dlog`)
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

        await runShellWithRoot(`rm -f /data/kano_${pluginName}_latest.dlog`)

        const { close: closeDecompressToast } = createFixedToast('decompressing', `解压依赖文件...`)
        const res2 = await runShellWithRoot(`
        cd /data
        mkdir -p ${pluginPath}
        tar -zxf ${pluginName}.tar.gz -C ${pluginPath}
        rm -f ${pluginName}.tar.gz
        `, 100 * 1000)
        closeDecompressToast()
        if (!res2.success) return createToast(`解压依赖文件出错!`, 'red')

        createToast("检查依赖文件，可能需要一点时间...")
        const res3 = await runShellWithRoot(`
        ls /data/kano_${pluginName}
        `)
        if (!res3.success || !res3.content.includes("service.sh")) return createToast("检查依赖文件失败!", 'red')

        createToast(`正在安装${pluginName},设置权限...`)
        const res5 = await runShellWithRoot(`chmod 777 ${pluginPath}`)
        if (!res5.success) return createToast(`设置${pluginName}权限失败!`, 'red')

        start(() => {
            createToast(`<div style="width:300px;text-align:center;pointer-events: all;">
            启动${pluginName}成功！<br />
            面板端口默认是${DEFAULT_PORT}<br />
            依赖文件路径:${pluginPath}<br/>
            安装日志:${logFile}<br/>
            提示:为了你的设备安全，请在不需要投屏时关闭此服务！<br/>
    </div>
    `, '', 20000)
            setTimeout(() => {
                refresh && refresh.click()
            }, 2000);
        })

        disabled_btn_enabled = false

        checkIsBootUp().then(isBootUp => {
            const boot_on = document.querySelector(`#${pluginName}_boot_on`)
            if (!boot_on) return
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
            renderPort()
        })
        await wait(1 * 1000)
        const isRunning = await checkIsRunning()
        setRunningElementText(isRunning)
    }

    const btn_disabled = document.createElement('button')
    btn_disabled.textContent = `卸载${pluginName}`
    let ct = 0
    btn_disabled.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        ct++
        if (ct < 2) { createToast(`再点一次卸载${pluginName}`) }
        tmer = setTimeout(() => {
            ct = 0
        }, 3000);
        if (ct < 2) return
        const { close: closeUninstallToast } = createFixedToast('uninstalling', "卸载中...", 'red')
        const killResult = await killProcess()
        createToast(killResult.content)
        const res = await runShellWithRoot(`
        sed -i '/${pluginName}/d' ${bootSH}
        rm -rf ${pluginPath}
        `, 100 * 1000)
        closeUninstallToast()
        if (!res.success) return createToast("卸载失败！", 'red')
        createToast(`卸载成功!`, 'pink')
        await wait(1 * 1000)
        const isRunning = await checkIsRunning()
        setRunningElementText(isRunning)
    }

    const btn_restart = document.createElement('button')
    btn_restart.textContent = `重启${pluginName}`
    btn_restart.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (! await checkIsInstalled()) {
            return createToast(`你还没有安装${pluginName}！`)
        }
        createToast(`重启${pluginName}中...`, 'pink')
        const killResult = await killProcess()
        createToast(killResult.content)
        start(() => {
            createToast(`重启成功`, 'pink')
        })
        await wait(1 * 1000)
        const isRunning = await checkIsRunning()
        setRunningElementText(isRunning)
    }

    const stopBtn = document.createElement('button')
    stopBtn.classList.add('btn')
    stopBtn.textContent = `停止${pluginName}`
    stopBtn.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (! await checkIsInstalled()) {
            return createToast(`你还没有安装${pluginName}！`)
        }
        createToast(`干掉${pluginName}中...`, 'pink')
        const killResult = await killProcess()
        createToast(killResult.content)
        createToast(`停止成功！`, 'pink')
        await wait(1 * 1000)
        const isRunning = await checkIsRunning()
        setRunningElementText(isRunning)
    }

    const container = document.querySelector('.functions-container')
    while (!UFI_DATA.lan_ipaddr) {
        await wait()
    }
    container.insertAdjacentHTML("afterend", `
<div id="${pluginName}_IFRAME_KANO" style="width: 100%; margin-top: 10px;">
    <div class="title" style="margin: 6px 0 ;">
        <strong id="${pluginName}_status">${pluginName_CN}</strong>
        <div style="display: inline-block;" id="collapse_${pluginName}_btn"></div>
    </div>
    <div class="collapse" id="collapse_${pluginName}" data-name="close" style="height: 0px; overflow: hidden;">
        <div class="collapse_box">
        <div class="title"style="font-style: italic;font-size: .7rem;margin-bottom: 10px;">
    提醒：千万不要按投屏内的<b>音量键</b>，会恢复出厂设置!!!!!
    </div>
        <div id="${pluginName}_action_box" style="margin-bottom:8px;display:flex;gap:10px;flex-wrap:wrap"></div>
            <ul class="deviceList">
<li style="padding:10px">
        <iframe id="${pluginName}_iframe" src="javascript:;" style="border:none;padding:0;margin:0;width:100%;height:calc(100vh - 150px);border-radius: 10px;overflow: hidden;opacity: 1;"></iframe>
</li> </ul>
        </div>
    </div>
</div>
`)
    const refresh = document.createElement('button')
    refresh.classList.add('btn')
    refresh.textContent = "重载页面"
    refresh.onclick = renderPort

    const openInNewTab = document.createElement('button')
    openInNewTab.classList.add('btn')
    openInNewTab.textContent = "打开页面"
    openInNewTab.onclick = () => {
        getPort().then(port => {
            const a = document.createElement('a')
            a.href = `http://${UFI_DATA.lan_ipaddr}:${port}/?t=` + Date.now();
            a.target = "_blank"
            a.click()
            setTimeout(() => {
                a.remove()
            }, 100);
        })
    }

    const adbbtn = document.createElement('button')
    adbbtn.classList.add('btn')
    adbbtn.textContent = "强开ADB"
    adbbtn.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        const res = await runShellWithRoot(`
        setprop persist.adb.secure 0
        setprop persist.service.adb.enable 1
        setprop service.adb.tcp.port 5555
        `, 100 * 1000)
        if (!res.success) return createToast("开启失败！", 'red')
        const mode = (await runShellWithRoot("getprop sys.usb.config")).content.trim().replace('\n', '')
        if (mode.includes("adb")) {
            createToast("有线 ADB 已开启，无需重复开启")
        } else {
            await runShellWithRoot(`setprop sys.usb.config ${mode},adb`)
        }
        const resp = await runShellWithRoot(`
                stop adbd
                start adbd
            `)
        if (!resp.success) return createToast("开启失败！", 'red')
        createToast("开启成功！", 'pink')
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
            return createToast(`你还没有安装${pluginName}！`)
        }
        createToast("导出运行日志中...", '')
        const t = Math.floor(Date.now() + Math.random())
        const res = await runShellWithRoot(`
                rm -f /data/data/com.minikano.f50_sms/files/uploads/${pluginName}_log_*
                sleep 1
                cp ${runtimeLogFile} /data/data/com.minikano.f50_sms/files/uploads/${pluginName}_log_${t}.log
                chmod 777 /data/data/com.minikano.f50_sms/files/uploads/${pluginName}_log_${t}.log
                `)
        if (!res.success) return createToast("停止失败！", 'red')
        const a = document.createElement('a')
        a.download = `${pluginName}日志_${t}.log`
        a.href = `/api/uploads/${pluginName}_log_${t}.log`
        a.target = "_blank"
        a.style.display = "none"
        document.body.appendChild(a)
        a.click()
        a.remove()
    }

    const editBtn = document.createElement('button')
    editBtn.classList.add('btn')
    editBtn.textContent = "编辑配置"
    editBtn.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (!await checkIsInstalled()) {
            createToast(`没有安装${pluginName}，请先安装！`, 'red')
            return
        }
        const res = await runShellWithRoot(`
        timeout 5s  awk '{print}' ${configFile}
        `)
        if (!res.success) return createToast("获取配置失败！", 'red')

        const { el, close } = createFixedToast('kano_eidt_scrcpy_message', `
                <div style="pointer-events:all;width:80vw;max-width:800px;">
                    <div class="title" style="margin:0" data-i18n="system_notice">编辑 YAML</div>
                    <div style="margin:10px 0" class="inner"></div>
                    <div style="text-align:right">
                        <button style="font-size:.64rem" id="save_eidt_scrcpy_message_btn" data-i18n="plugin_modal_submit_btn">${t('plugin_modal_submit_btn')}</button>
                        <button style="font-size:.64rem" id="close_eidt_scrcpy_message_btn" data-i18n="close_btn">${t('close_btn')}</button>
                    </div>
                </div>
                `)

        const textarea = document.createElement('textarea')
        textarea.style.width = "100%"
        textarea.style.height = "500px"
        textarea.style.maxHeight = "60vh"
        textarea.style.border = "none"
        //禁用拼写检查
        textarea.setAttribute('spellcheck', "false")
        textarea.value = res.content
        el.querySelector('.inner').appendChild(textarea)
        const btn = el.querySelector('#close_eidt_scrcpy_message_btn')
        const sbtn = el.querySelector('#save_eidt_scrcpy_message_btn')
        if (!btn) {
            close()
            return
        }
        btn.onclick = async () => {
            close()
        }
        sbtn.onclick = async () => {
            const v = textarea.value
            if (!v || v.trim().length == 0) {
                return createToast("配置不能为空！", 'red')
            }
            createToast("正在保存...", '')
            const file = new File([v], "config.yaml", { type: "text/plain" });
            if (! await saveConfig(file)) { return }
            close()
        }
    }

    const boot_on = document.createElement('button')
    boot_on.id = `${pluginName}_boot_on`
    boot_on.classList.add('btn')
    boot_on.textContent = "开机自启"
    boot_on.style.background = ""
    boot_on.addEventListener('click', async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (! await checkIsInstalled()) {
            return createToast(`你还没有安装${pluginName}！`)
        }
        renderPort()
        const isBootUp = await checkIsBootUp();
        if (isBootUp) {
            //关闭
            await runShellWithRoot(`
                sed -i '/${pluginName}/d' ${bootSH}
            `)
            boot_on.style.background = ""
            createToast("已取消开机自启", 'pink')
        } else {
            //开启
            await runShellWithRoot(`
                grep -qxF '${startCommand}' ${bootSH} || echo '${startCommand}' >> ${bootSH}
            `)
            boot_on.style.background = "var(--dark-btn-color-active)"
            createToast("已设置开机自启", 'pink')
        }
    })
    const mmBox = document.querySelector(`#${pluginName}_action_box`)
    mmBox.appendChild(btn_enabled)
    mmBox.appendChild(stopBtn)
    mmBox.appendChild(btn_restart)
    mmBox.appendChild(btn_disabled)
    mmBox.appendChild(editBtn)
    mmBox.appendChild(exportBtn)
    mmBox.appendChild(openInNewTab)
    mmBox.appendChild(adbbtn)
    mmBox.appendChild(boot_on)
    mmBox.appendChild(refresh)

    let colTimer = null
    let colTimer1 = null
    collapseGen(`#collapse_${pluginName}_btn`, `#collapse_${pluginName}`, `#collapse_${pluginName}`, (e) => {
        checkIsBootUp().then(isBootUp => {
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })
        colTimer && clearTimeout(colTimer)
        colTimer1 && clearTimeout(colTimer1)
        if (e == 'open') {
            colTimer1 = setTimeout(() => {
                refresh.click()
            }, 300);
        } else {
            colTimer = setTimeout(() => {
                document.getElementById(`${pluginName}_iframe`).src = `javascript:;`;
            }, 300);
        }
    })

    checkIsRunning().then(isRunning => {
        setRunningElementText(isRunning)
    })

    let intval = setInterval(() => {
        if (UFI_DATA.loginfo == "ok") {
            checkIsBootUp().then(isBootUp => {
                if (isBootUp) {
                    boot_on.style.background = "var(--dark-btn-color-active)"
                } else {
                    boot_on.style.background = ""
                }
            })
            clearInterval(intval)
        }
    }, 500);

    if (localStorage.getItem(`#collapse_${pluginName}`) == 'open') {
        refresh.click()
        checkIsRunning().then(isRunning => {
            setRunningElementText(isRunning)
        })
    }
})()
//</script >