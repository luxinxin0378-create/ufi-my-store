//<script>
(async () => {

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
    grep -q '/data/kano_HP/service.sh start' /sdcard/ufi_tools_boot.sh
    echo $?
    `)
        return res.content.trim() == '0';
    }

    const checkIsInstalled = async () => {
        const res = await runShellWithRoot(`
    ls /data/kano_HP/
    `)
        return res.content.includes("hp");
    }



    const showConf = async () => {
        try {
            const HP_config = document.querySelector('#HP_config')
            if (HP_config) {
                const res = await runShellWithRoot(`timeout 2s awk \'{print}\' /data/kano_HP/code`)
                HP_config.value = res.content
            }
        } catch { }
    }

    const installBtn = document.createElement('button')
    installBtn.textContent = "安装HP"
    installBtn.onclick = async () => {
        if (checkWeakToken()) { return createToast(`检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！`, "red", 8000) }

        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }

        if (await checkIsInstalled()) {
            return createToast("你已经安装了")
        }

        createToast("开始下载安装包...")

        // 下载压缩包
        const res1 = await runShellWithRoot(`
    cd /data && /data/data/com.minikano.f50_sms/files/curl -L https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/kano_HP.zip -o kano_HP.zip
    `, 100 * 1000)
        if (!res1.success) return createToast("下载HP客户端压缩包失败", 'red')

        // 解压
        createToast("解压安装包...")
        const res2 = await runShellWithRoot(`
    cd /data && rm -rf kano_HP && mkdir -p kano_HP && unzip kano_HP.zip -d /data/kano_HP/
    `)
        if (!res2.success) return createToast("解压失败", 'red')

        // 设置权限
        createToast("设置执行权限...")
        const res3 = await runShellWithRoot(`
    chmod +x /data/kano_HP/hp /data/kano_HP/service.sh
    `)
        if (!res3.success) return createToast("设置权限失败", 'red')

        // 设置自启动
        createToast("设置HP客户端自启动...")
        const res4 = await runShellWithRoot(`
grep -qxF '/data/kano_HP/service.sh start' /sdcard/ufi_tools_boot.sh || echo '/data/kano_HP/service.sh start' >> /sdcard/ufi_tools_boot.sh
    `)
        if (!res4.success) return createToast("写入自启动失败", 'red')

        // 启动
        createToast("启动HP客户端...")
        const res5 = await runShellWithRoot(`/data/kano_HP/service.sh start`)
        if (!res5.success) return createToast("启动失败", 'red')

        createToast(`HP客户端 安装成功！`, '', 6000)

        //连接码显示
        await showConf()

        checkIsBootUp().then(isBootUp => {
            const boot_on = document.querySelector('#hp_boot_on')
            if (!boot_on) return
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })
    }

    const uninstallBtn = document.createElement('button')
    uninstallBtn.textContent = "卸载HP"
    let countUn = 0
    let ctimer = null
    uninstallBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        ctimer && clearTimeout(ctimer)
        ctimer = setTimeout(() => {
            countUn = 0
        }, 3000);

        if (countUn++ < 2) return createToast("再点一次卸载HP客户端")

        createToast("正在停止HP客户端...")
        await runShellWithRoot(`/data/kano_HP/service.sh stop`)

        createToast("清理目录和自启动...")
        const res1 = await runShellWithRoot(`
    rm -rf /data/kano_HP
    sed -i '/kano_HP/d' /sdcard/ufi_tools_boot.sh
    `)
        if (!res1.success) return createToast("卸载失败", 'red')

        createToast("卸载成功", 'green')

        await showConf()
        checkIsBootUp().then(isBootUp => {
            const boot_on = document.querySelector('#hp_boot_on')
            if (!boot_on) return
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })
    }

    const stopBtn = document.createElement('button')
    stopBtn.textContent = "停止HP"
    stopBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        if (!await checkIsInstalled()) {
            return createToast("你还没有安装")
        }
        const res = await runShellWithRoot(`/data/kano_HP/service.sh stop`)
        if (!res.success) return createToast("停止失败", 'red')
        createToast(res.content.replaceAll('\n', "<br>"), '')
    }

    const restartBtn = document.createElement('button')
    restartBtn.textContent = "重启HP"
    restartBtn.onclick = async () => {
        if (checkWeakToken()) { return createToast(`检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！`, "red", 8000) }

        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        if (!await checkIsInstalled()) {
            return createToast("你还没有安装")
        }
        const res = await runShellWithRoot(`
        /data/kano_HP/service.sh stop
        sleep 1
        /data/kano_HP/service.sh start
        `)
        if (!res.success) return createToast("重启失败", 'red')
        createToast(res.content.replaceAll('\n', "<br>"), '')
    }

    const hasToolbox = () => {
        return document.querySelector('#collapse_toolbox .collapse_box')
    }

    //生成日志
    let oldLog = ''
    const genLog = async () => {
        const HP_textarea = document.querySelector("#HP_textarea")
        if (HP_textarea) {
            const res = await runShellWithRoot(`timeout 2s  awk \'{print}\' /sdcard/HP_LOG.txt`)
            if (oldLog == "" || oldLog != res.content) {
                HP_textarea.scrollTo({
                    top: HP_textarea.scrollHeight,
                    behavior: "smooth",
                })
            }
            oldLog = res.content
            HP_textarea.value = `${res.content}\n`
        }
    }

    //保存连接码
    const saveConfig = async (conf) => {
        try {
            const file = new File([conf], "code", { type: "text/plain" });
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
            mv /data/data/com.minikano.f50_sms/files${res.url} /data/kano_HP/code
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
        }
    }


    const mmContainer = document.querySelector('.functions-container')
    mmContainer.insertAdjacentHTML("afterend", `
            <div id="IFRAME_KANO_HP" style="width: 100%; margin-top: 10px;">
                <div class="title" style="margin: 6px 0 ;">
                    <strong>HP客户端</strong>
                    <div style="display: inline-block;" id="collapse_HP_btn"></div>
                </div>
                <div class="collapse" id="collapse_HP" data-name="close" style="height: 0px; overflow: hidden;">
                    <div class="collapse_box">
                        <div id="HP_action_box" style="margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap"></div>
                        <ul class="deviceList">
                            <li style="padding:10px;display: grid;grid-template-columns: 1fr 1fr;gap: 8px;">
                                <div>
                                    <div class="title">
                                        <span>连接码</span>
                                        <button style="margin: 0 !important;padding: 2px 6px;" onclick="kanoSaveFrpConfig()">保存</button>
                                        <button style="margin: 0 !important;padding: 2px 6px;" onclick="kanoReadFrpConfig()">读取</button>
                                    </div>
                                    <textarea id="HP_config" style="margin-top: 4px;font-size:12px !important;border:none;padding:4px;margin:0;width:100%;height:300px;border-radius: 10px;overflow-x: hidden;background:transparent;"></textarea>
                                </div>
                                <div>
                                    <div class="title">
                                        <span>日志</span>
                                        <button style="margin: 0 !important;padding: 2px 6px;" onclick="kanoReadFrpLog()">刷新</button></div>
                                    <textarea id="HP_textarea" disabled style="margin-top: 4px;font-size:12px !important;border:none;padding:4px;margin:0;width:100%;height:300px;border-radius: 10px;overflow-x: hidden;background:transparent;"></textarea>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            `)

    const boot_on = document.createElement('button')
    boot_on.id = "hp_boot_on"
    boot_on.classList.add('btn')
    boot_on.textContent = "开机自启"
    boot_on.style.background = ""
    boot_on.addEventListener('click', async () => {
        if (checkWeakToken()) { return createToast(`检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！`, "red", 8000) }
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }

        if (!(await checkIsInstalled())) {
            return createToast('你还没有安装')
        }

        const isBootUp = await checkIsBootUp();
        if (isBootUp) {
            //关闭
            await runShellWithRoot(`
                sed -i '/kano_HP/d' /sdcard/ufi_tools_boot.sh
            `)
            boot_on.style.background = ""
            createToast("已取消开机自启", 'green')
        } else {
            //开启
            await runShellWithRoot(`
grep -qxF '/data/kano_HP/service.sh start' /sdcard/ufi_tools_boot.sh || echo '/data/kano_HP/service.sh start' >> /sdcard/ufi_tools_boot.sh
                `)
            boot_on.style.background = "var(--dark-btn-color-active)"
            createToast("已设置开机自启", 'green')
        }
    })

    const mmBox = document.querySelector('#HP_action_box')
    mmBox.appendChild(installBtn)
    mmBox.appendChild(uninstallBtn)
    mmBox.appendChild(stopBtn)
    mmBox.appendChild(restartBtn)
    mmBox.appendChild(boot_on)
    collapseGen("#collapse_HP_btn", "#collapse_HP", "#collapse_HP", (newVal) => {
        // newVal ? 'open' : 'close'
        if (newVal == 'open') {
            Log_INTERVAL && Log_INTERVAL()
            Log_INTERVAL = requestInterval(() => genLog(), 2000)
        } else {
            Log_INTERVAL && Log_INTERVAL()
        }
    })

    setTimeout(() => {
        checkIsBootUp().then(isBootUp => {
            const boot_on = document.querySelector('#hp_boot_on')
            if (!boot_on) return
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })
    }, 1000);

    if (localStorage.getItem("#collapse_HP") == 'open') {
        Log_INTERVAL = requestInterval(() => genLog(), 2000)
    }

    window.kanoSaveFrpConfig = () => {
        const HP_config = document.querySelector('#HP_config')
        if (!HP_config) return
        createToast('配置保存中...')
        saveConfig(HP_config.value)
    }

    window.kanoReadFrpConfig = () => {
        showConf()
        createToast('配置读取成功')
    }

    window.kanoReadFrpLog = () => {
        genLog()
        createToast('日志已刷新')
    }

    //连接码显示
    let counter = 0
    let inter = setInterval(async () => {
        counter++;
        if (counter >= 10) clearInterval(inter)
        const HP_config = document.querySelector('#HP_config')
        if (HP_config) {
            const res = await runShellWithRoot(`timeout 2s awk \'{print}\' /data/kano_HP/code`, 2000)
            HP_config.value = res.content
            clearInterval(inter)
        }
    }, 1000);

})()
//</script>