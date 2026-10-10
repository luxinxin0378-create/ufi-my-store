//<script>
(async () => {

    let Log_INTERVAL = null

    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami')
        if (res.content) {
            if (res.content.includes('root')) {
                return true
            }
        }
        return false
    }

    // 检测是否开机自启
    const checkIsBootUp = async () => {
        const res = await runShellWithRoot(`
    grep -q '/data/kano_miniupnpd/service.sh start' /sdcard/ufi_tools_boot.sh
    echo $?
    `)
        return res.content.trim() == '0';
    }

    const bootUpAction = () => {
        checkIsBootUp().then(isBootUp => {
            const boot_on = document.querySelector('#miniUPnP_boot_on')
            if (!boot_on) return
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })
    }


    const showConf = async () => {
        try {
            const miniUPnP_config = document.querySelector('#miniUPnP_config')
            if (miniUPnP_config) {
                const res = await runShellWithRoot(`timeout 2s awk '{print}' /data/kano_miniupnpd/miniupnpd.conf`)
                miniUPnP_config.value = res.content
            }
        } catch { }
    }

    const isInstall = async () => {
        const res = await runShellWithRoot(`ls /data/kano_miniupnpd/service.sh`)
        if (res.success && res.content) {
            return true
        }
        return false
    }

    const installBtn = document.createElement('button')
    installBtn.textContent = "安装miniUPnP"
    installBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }

        if (await isInstall()) {
            return createToast("miniUPnP已经安装，请勿重复安装！", 'red')
        }

        createToast("开始下载安装包...")

        // 下载压缩包
        const res1 = await runShellWithRoot(`
    cd /data && /data/data/com.minikano.f50_sms/files/curl -L https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/kano_miniupnpd.zip -o kano_miniupnpd.zip
    `, 100 * 1000)
        if (!res1.success) return createToast("下载miniUPnP压缩包失败", 'red')

        // 解压
        createToast("解压安装包...")
        const res2 = await runShellWithRoot(`
    cd /data && rm -rf kano_miniupnpd && mkdir -p kano_miniupnpd && unzip kano_miniupnpd.zip -d /data/kano_miniupnpd/
    `)
        if (!res2.success) return createToast("解压失败", 'red')

        // 设置权限
        createToast("设置执行权限...")
        const res3 = await runShellWithRoot(`
    chmod 777 /data/kano_miniupnpd/miniupnpd /data/kano_miniupnpd/service.sh
    `)
        if (!res3.success) return createToast("设置权限失败", 'red')

        // 设置自启动
        createToast("设置miniUPnP自启动...")
        const res4 = await runShellWithRoot(`
grep -qxF '/data/kano_miniupnpd/service.sh start' /sdcard/ufi_tools_boot.sh || echo '/data/kano_miniupnpd/service.sh start' >> /sdcard/ufi_tools_boot.sh
    `)
        if (!res4.success) return createToast("写入自启动失败", 'red')

        // 启动
        createToast("启动miniUPnP...")
        const res5 = await runShellWithRoot(`/data/kano_miniupnpd/service.sh start`)
        if (!res5.success) return createToast("启动失败", 'red')

        createToast(`miniUPnP 安装成功！`, '', 6000)

        //配置文件显示
        await showConf()
        bootUpAction()
    }

    const uninstallBtn = document.createElement('button')
    let count = 0
    let timer = null
    uninstallBtn.textContent = "卸载miniUPnP"
    uninstallBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
            count = 0
        }, 2000)
        if (count++ < 3) {
            return createToast("再点一次卸载miniUPnP")
        }
        createToast("正在停止miniUPnP...")
        await runShellWithRoot(`/data/kano_miniupnpd/service.sh stop`)

        createToast("清理目录和自启动...")
        const res1 = await runShellWithRoot(`
    rm -rf /data/kano_miniupnpd
    sed -i '/kano_miniupnpd/d' /sdcard/ufi_tools_boot.sh
    `)
        if (!res1.success) return createToast("卸载失败", 'red')

        createToast("卸载成功", 'green')

        await showConf()
        genLog()
        bootUpAction()
    }

    const stopBtn = document.createElement('button')
    stopBtn.textContent = "停止miniUPnP"
    stopBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        const res = await runShellWithRoot(`/data/kano_miniupnpd/service.sh stop`)
        if (!res.success) return createToast("停止失败", 'red')
        createToast(res.content.replaceAll('\n', "<br>"), '')
        genLog()
        bootUpAction()
    }

    const restartBtn = document.createElement('button')
    restartBtn.textContent = "重启miniUPnP"
    restartBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        const res = await runShellWithRoot(`
        /data/kano_miniupnpd/service.sh stop
        sleep 1
        /data/kano_miniupnpd/service.sh start
        `)
        if (!res.success) return createToast("重启失败", 'red')
        createToast(res.content.replaceAll('\n', "<br>"), '')
        genLog()
        bootUpAction()
    }

    const hasToolbox = () => {
        return document.querySelector('#collapse_toolbox .collapse_box')
    }

    //生成日志
    let pervLogText = ''
    const genLog = async () => {
        const miniUPnP_textarea = document.querySelector("#miniUPnP_textarea")
        if (miniUPnP_textarea) {
            const res = await runShellWithRoot(`timeout 2s  awk \'{print}\' /data/kano_miniupnpd/miniupnpd.log | tail -n 40`)
            pervLogText = `${res.content}\n`
            if (miniUPnP_textarea.value == pervLogText) return
            miniUPnP_textarea.value = `${res.content}\n`
            miniUPnP_textarea.scrollTo({
                top: miniUPnP_textarea.scrollHeight,
                behavior: "smooth",
            })
        }
    }

    //保存配置文件
    const saveConfig = async (conf) => {
        try {
            const file = new File([conf], "miniupnpd.conf", { type: "text/plain" });
            const formData = new FormData();
            formData.append("file", file);
            const res = await (await fetch(`${KANO_baseURL}/upload_img`, {
                method: "POST",
                headers: common_headers,
                body: formData,
            })).json()

            if (res.url) {
                let foundFile = await runShellWithRoot(`
            ls /data/data/com.minikano.f50_sms/files${res.url}
            `)
                if (!foundFile.content) {
                    throw "上传失败"
                }
                let resShell = await runShellWithRoot(`
            mv /data/data/com.minikano.f50_sms/files${res.url} /data/kano_miniupnpd/miniupnpd.conf
            `)
                if (resShell.success) {
                    createToast(`上传成功！正在重启服务...`, 'green')
                    restartBtn.click()
                    await showConf()
                }
            }
            else throw res.error || ''
        }
        catch (e) {
            console.error(e);
            createToast(`上传失败!`, 'red')
        } finally {
            genLog()
            bootUpAction()
        }
    }


    const mmContainer = document.querySelector('.functions-container')
    mmContainer.insertAdjacentHTML("afterend", `
            <div id="IFRAME_KANO_miniUPnP" style="width: 100%; margin-top: 10px;">
                <div class="title" style="margin: 6px 0 ;">
                    <strong>miniUPnP</strong>
                    <div style="display: inline-block;" id="collapse_miniUPnP_btn"></div>
                </div>
                <div class="collapse" id="collapse_miniUPnP" data-name="close" style="height: 0px; overflow: hidden;">
                    <div class="collapse_box">
                        <div id="miniUPnP_action_box" style="margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap"></div>
                        <ul class="deviceList">
                            <li style="padding:10px;display: grid;grid-template-columns: 1fr 1fr;gap: 8px;">
                                <div>
                                    <div class="title">
                                        <span>配置文件</span>
                                        <button style="margin: 0 !important;padding: 2px 6px;" onclick="kanoSaveFrpConfig()">保存</button>
                                        <button style="margin: 0 !important;padding: 2px 6px;" onclick="kanoReadFrpConfig()">读取</button>
                                    </div>
                                    <textarea id="miniUPnP_config" style="margin-top: 4px;font-size:12px !important;border:none;padding:4px;margin:0;width:100%;height:300px;border-radius: 10px;overflow-x: hidden;background:transparent;"></textarea>
                                </div>
                                <div>
                                    <div class="title">
                                        <span>日志</span>
                                        <button style="margin: 0 !important;padding: 2px 6px;" onclick="kanoReadFrpLog()">刷新</button></div>
                                    <textarea id="miniUPnP_textarea" disabled style="margin-top: 4px;font-size:12px !important;border:none;padding:4px;margin:0;width:100%;height:300px;border-radius: 10px;overflow-x: hidden;background:transparent;"></textarea>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            `)

    const boot_on = document.createElement('button')
    boot_on.id = "miniUPnP_boot_on"
    boot_on.classList.add('btn')
    boot_on.textContent = "开机自启"
    boot_on.style.background = ""
    boot_on.addEventListener('click', async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (!await isInstall()) {
            createToast("没有安装，请先安装！", 'red')
            return
        }
        const isBootUp = await checkIsBootUp();
        if (isBootUp) {
            //关闭
            await runShellWithRoot(`sed -i '/kano_miniupnpd/d' /sdcard/ufi_tools_boot.sh`)
            boot_on.style.background = ""
            createToast("已取消开机自启", 'green')
        } else {
            //开启
            await runShellWithRoot(`grep -qxF '/data/kano_miniupnpd/service.sh start' /sdcard/ufi_tools_boot.sh || echo '/data/kano_miniupnpd/service.sh start' >> /sdcard/ufi_tools_boot.sh`)
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

    const mmBox = document.querySelector('#miniUPnP_action_box')
    mmBox.appendChild(installBtn)
    mmBox.appendChild(uninstallBtn)
    mmBox.appendChild(stopBtn)
    mmBox.appendChild(restartBtn)
    mmBox.appendChild(boot_on)
    collapseGen("#collapse_miniUPnP_btn", "#collapse_miniUPnP", "#collapse_miniUPnP", (newVal) => {
        // newVal ? 'open' : 'close'
        if (newVal == 'open') {
            Log_INTERVAL && Log_INTERVAL()
            Log_INTERVAL = requestInterval(() => genLog(), 2000)
        } else {
            Log_INTERVAL && Log_INTERVAL()
        }
    })

    if (localStorage.getItem("#collapse_miniUPnP") == 'open') {
        Log_INTERVAL = requestInterval(() => genLog(), 2000)
    }

    window.kanoSaveFrpConfig = () => {
        const miniUPnP_config = document.querySelector('#miniUPnP_config')
        if (!miniUPnP_config) return
        createToast('配置保存中...')
        saveConfig(miniUPnP_config.value)
    }

    window.kanoReadFrpConfig = () => {
        showConf()
        createToast('配置读取成功')
    }

    window.kanoReadFrpLog = () => {
        genLog()
        createToast('日志已刷新')
    }

    //配置文件显示
    let counter = 0
    let inter = setInterval(async () => {
        counter++;
        if (counter >= 10) clearInterval(inter)
        const miniUPnP_config = document.querySelector('#miniUPnP_config')
        if (miniUPnP_config) {
            const res = await runShellWithRoot(`timeout 2s awk \'{print}\' /data/kano_miniupnpd/miniupnpd.conf`, 2000)
            miniUPnP_config.value = res.content
            clearInterval(inter)
        }
    }, 1000);

})()
//</script>