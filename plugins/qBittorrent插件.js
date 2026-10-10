//<script>
(() => {
    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami')
        if (res.content) {
            if (res.content.includes('root')) {
                return true
            }
        }
        return false
    }

    //创建随机数
    const createRandomString = (length = 8) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    const isqbitRunning = async () => {
        const status = await runShellWithRoot('pgrep qbittorrent_nox')
        const running_qbit = document.querySelector('#running_qbit')
        const isR = status.content != null && status.content != undefined && status.content != ''
        if (running_qbit) {
            running_qbit.innerHTML = isR ? "qBittorrent - 🟢运行中" : "qBittorrent - 🔴已停止"
        }
        return isR
    }

    async function isELF(file) {
        const blob = file.slice(0, 4); // 前4字节
        const buffer = await blob.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        return bytes[0] === 0x7F &&
            bytes[1] === 0x45 &&
            bytes[2] === 0x4C &&
            bytes[3] === 0x46;
    }


    // 检测是否开机自启
    const checkIsBootUp = async () => {
        const res = await runShellWithRoot(`
        grep -q '/data/qbittorrent/qBittorrent.Service start' /sdcard/ufi_tools_boot.sh
        echo $?
        `)
        return res.content.trim() == '0';
    }

    //监测是否已经安装过了
    const checkIsInstalled = async () => {
        const res = await runShellWithRoot(`
        ls /data/qbittorrent/qBittorrent.Service
        `)
        return res.success && res.content && res.content.includes('qBittorrent.Service');
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
                        mv  /data/data/com.minikano.f50_sms/files/${res.url} /data/qbittorrent/data/qBittorrent/config/qBittorrent.conf
                    `)
                if (resShell.success) {
                    createToast(`上传成功！正在重启核心...`, 'pink')
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


    const showDialog = (message, title = "提示") => {
        let timer = null
        const containerId = "toast_" + createRandomString(4)
        const id = 'close_message_btn_' + createRandomString(4)
        const id_download = 'download_btn_' + createRandomString(4)
        const id_clear = 'clear_btn_' + createRandomString(4)
        const id_refresh = 'clear_btn_' + createRandomString(4)
        const message1 = message.replaceAll('\n', "<br>")
        const { el, close } = createFixedToast(containerId, `
        <div style="pointer-events:all;width:80vw;max-width:800px">
            <div class="title" style="margin:0" data-i18n="system_notice">${title}</div>
            <div class="content_message" style="margin:10px 0;max-height: 400px;overflow: auto;font-size: .64rem;">${message1}</div>
            <div style="text-align:right">
                <button style="font-size:.64rem" id="${id}" data-i18n="close_btn">${t('close_btn')}</button>
                <button style="font-size:.64rem" id="${id_download}" data-i18n="only_download">${t('only_download')}</button>
                <button style="font-size:.64rem" id="${id_refresh}">刷新</button>
                <button style="font-size:.64rem" id="${id_clear}">清空日志</button>
            </div>
        </div>
        `)
        const btn = el.querySelector(`#${id}`)
        const download = el.querySelector(`#${id_download}`)
        const clearBtn = el.querySelector(`#${id_clear}`)
        const rBtn = el.querySelector(`#${id_refresh}`)
        if (!btn) {
            close()
            return
        }
        if (download) {
            download.onclick = async () => {
                const t = Math.floor(Date.now() + Math.random())
                const file = new File([message1.replaceAll("<br>", "\n")], { type: 'text/plain' });
                const url = URL.createObjectURL(file);
                const a = document.createElement('a');
                a.download = `kano_qbit_log_${t}.txt`;
                a.href = url;
                document.body.appendChild(a)
                a.click();
                URL.revokeObjectURL(url);
                a.remove()
            }
        }

        if (clearBtn) {
            clearBtn.onclick = async () => {
                const res = await runShellWithRoot(`echo "" > /data/qbittorrent/data/qBittorrent/data/logs/qbittorrent.log`)
                if (res.success) {
                    createToast("日志已清空", 'pink')
                    close()
                } else {
                    createToast(`清空日志失败`, 'red')
                }
            }
        }

        const refresh = async (flag = false) => {
            const msg_el = el.querySelector(`.content_message`)
            const res = await runShellWithRoot(`timeout 2s awk '{print}' /data/qbittorrent/data/qBittorrent/data/logs/qbittorrent.log`)
            if (res.success) {
                msg_el.innerHTML = res.content.replaceAll('\n', "<br>")
                flag && createToast("日志已刷新")
            } else {
                flag && createToast("获取日志失败", 'red')
            }
        }

        if (rBtn) {
            rBtn.onclick = async () => {
                await refresh(true)
            }
        }

        if (timer) clearInterval(timer)
        timer = setInterval(async () => { await refresh() }, 1000)

        btn.onclick = async () => {
            if (timer) clearInterval(timer)
            close()
        }
    }

    const btn_enabled = document.createElement('button')
    btn_enabled.textContent = "安装"
    let disabled_btn_enabled = false
    btn_enabled.onclick = async (e) => {
        if (disabled_btn_enabled) return
        disabled_btn_enabled = true
        try {
            if (!(await checkAdvanceFunc())) {
                disabled_btn_enabled = false
                createToast("没有开启高级功能，无法使用！", 'red')
                return
            }
            if (await checkIsInstalled()) {
                disabled_btn_enabled = false
                createToast("已经安装过qBittorrent了！", 'red')
                return
            }

            createToast("下载所需组件中...")
            const res0 = await runShellWithRoot(`/data/data/com.minikano.f50_sms/files/curl -L "https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/qbittorrent_nox.zip" -o /data/kano_qBittorrent.zip --output /data/kano_qBittorrent.zip --write-out "DOWNLOAD_DONE\nTotal: %{size_download} bytes\nSpeed: %{speed_download} B/s\nTime: %{time_total} sec\n" > /data/kano_qbit_latest.dlog 2>&1 &`, 100 * 1000)
            if (!res0.success) {
                btn_enabled.disabled = false;
                return createToast("下载依赖失败!", 'red')
            }

            let log = ''
            const max_times = 600 // 最多等待10分钟
            let count_times = 0
            const { el, close } = createFixedToast("kano_qbit_toast", `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">等待日志中...</pre>`, '')

            const interval = setInterval(async () => {
                const dlog = await runShellWithRoot("timeout 2s  awk '{print}' /data/kano_qbit_latest.dlog")
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

            await runShellWithRoot("rm -f /data/kano_qbit_latest.dlog")

            createToast("解压qBittorrent文件...")
            const res2 = await runShellWithRoot(`
        cd /data/
        mkdir -p qbittorrent
        unzip kano_qBittorrent.zip -d /data/qbittorrent/
        `)
            if (!res2.success) return createToast("解压qBittorrent文件出错!", 'red')

            createToast("检查依赖文件，可能需要一点时间...")
            const res3 = await runShellWithRoot(`
        ls /data/qbittorrent
        `)
            if (!res3.success || !res3.content.includes('qBittorrent.Service')) return createToast("检查qBittorrent依赖文件失败!", 'red')

            createToast("正在安装qBittorrent，设置qBittorrent自启动...")
            const res5 = await runShellWithRoot(`
cp /data/qbittorrent/data/qBittorrent/config/qBittorrent.conf /data/data/com.minikano.f50_sms/files/uploads/default_qbit.conf
chmod 777 -Rf /data/qbittorrent
grep -qxF '/data/qbittorrent/qBittorrent.Service start' /sdcard/ufi_tools_boot.sh || echo '/data/qbittorrent/qBittorrent.Service start' >> /sdcard/ufi_tools_boot.sh
        `)
            if (!res5.success) return createToast("设置qBittorrent自启动失败!", 'red')

            createToast("启动qBittorrent...")
            const res6 = await runShellWithRoot(`
        /data/qbittorrent/qBittorrent.Service start
        `)
            if (!res6.success) return createToast("启动qBittorrent失败!", 'red')

            createToast(`<div style="width:300px;text-align:center;pointer-events: all;">
                启动qBittorrent成功！<br />
                web地址(端口默认是2334)<br />
                <a href="http://192.168.0.1:2334" target="_blank">http://192.168.0.1:2334</a><br />
                用户名默认为admin<br />
                密码默认为123456<br />
                依赖文件路径:/data/qbittorrent/<br/>
                输出:${res6.content}
        </div>
        `, '', 20000)

            disabled_btn_enabled = false

            checkIsBootUp().then(isBootUp => {
                const boot_on = document.querySelector('#qBittorrent_boot_on')
                if (!boot_on) return
                if (isBootUp) {
                    boot_on.style.background = "var(--dark-btn-color-active)"
                } else {
                    boot_on.style.background = ""
                }
            })
            setTimeout(() => {
                isqbitRunning()
            }, 3000);
        } finally {
            disabled_btn_enabled = false
            await runShellWithRoot(`rm -f /data/kano_qBittorrent.zip`)
        }
    }
    const btn_disabled = document.createElement('button')
    btn_disabled.textContent = "卸载"
    let ct = 0
    let tmer = null
    btn_disabled.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        ct++
        tmer && clearTimeout(tmer)
        tmer = setTimeout(() => {
            ct = 0
        }, 3000);
        if (ct < 3) { return createToast("再点一次卸载qBittorrent") }
        createToast("卸载中...", 'red')
        const res = await runShellWithRoot(`
        /data/qbittorrent/qBittorrent.Service stop
        sleep 1
        rm -rf /data/qbittorrent
        sed -i '/qBittorrent.Service/d' /sdcard/ufi_tools_boot.sh
        `)
        if (!res.success) return createToast("卸载失败！", 'red')
        createToast(`<div style="width:300px;text-align:center">
        卸载结果：${res.content}<br/>
        如果没有错误即视为卸载成功
        </div>`)
        await isqbitRunning()
        checkIsBootUp().then(isBootUp => {
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })
    }

    const btn_restart = document.createElement('button')
    btn_restart.textContent = "重启"
    btn_restart.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (!await checkIsInstalled()) {
            createToast("没有安装qBittorrent，请先安装！", 'red')
            return
        }
        createToast("重启qBittorrent中...", 'pink')
        const res = await runShellWithRoot(`
        /data/qbittorrent/qBittorrent.Service stop
        sleep 1
        /data/qbittorrent/qBittorrent.Service start
        `)
        if (!res.success) return createToast("重启失败！", 'red')
        createToast(`<div style="width:300px;text-align:center">
            ${res.content.replaceAll('\n', "<br/>")}
        </div>`, 'pink')
        await isqbitRunning()
    }

    //一键上传
    const uploadEl = document.createElement('input')
    uploadEl.type = 'file'
    uploadEl.onchange = async (e) => {
        if (!e?.target?.files) return
        const file = e.target.files[0];
        if (file) {
            if (!(await checkAdvanceFunc())) {
                createToast("没有开启高级功能，无法使用！", 'red')
                return
            }
            if (!await checkIsInstalled()) {
                createToast("没有安装qBittorrent，请先安装！", 'red')
                return
            }
            await runShellWithRoot(`
                        rm -f /data/data/com.minikano.f50_sms/files/uploads/qbit_config_backup*
                    `)
            // 检查文件大小
            if (file.size > 1 * 1024 * 1024) {
                createToast(`文件大小不能超过${1}MB！`, 'red')
            } else {
                try {
                    await saveConfig(file)
                } finally {
                    uploadEl.value = ''
                }
            }
        }
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
            createToast("没有安装qBittorrent，请先安装！", 'red')
            return
        }
        const res = await runShellWithRoot(`
        timeout 5s  awk '{print}' /data/qbittorrent/data/qBittorrent/config/qBittorrent.conf
        `)
        if (!res.success) return createToast("备份失败！", 'red')

        const { el, close } = createFixedToast('kano_eidt_qbit_message', `
                <div style="pointer-events:all;width:80vw;max-width:800px;">
                    <div class="title" style="margin:0" data-i18n="system_notice">编辑 config</div>
                    <div style="margin:10px 0" class="inner"></div>
                    <div style="text-align:right">
                        <button style="font-size:.64rem" id="save_eidt_qbit_message_btn" data-i18n="plugin_modal_submit_btn">${t('plugin_modal_submit_btn')}</button>
                        <button style="font-size:.64rem" id="close_eidt_qbit_message_btn" data-i18n="close_btn">${t('close_btn')}</button>
                    </div>
                </div>
                `)

        const textarea = document.createElement('textarea')
        textarea.style.width = "100%"
        textarea.style.height = "700px"
        textarea.style.maxHeight = "60vh"
        textarea.style.border = "none"
        textarea.value = res.content
        el.querySelector('.inner').appendChild(textarea)
        const btn = el.querySelector('#close_eidt_qbit_message_btn')
        const sbtn = el.querySelector('#save_eidt_qbit_message_btn')
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
            const file = new File([v], "qBittorrent.conf", { type: "text/plain" });
            if (! await saveConfig(file)) { return }
            close()
        }
    }

    const uploadBtn = document.createElement('button')
    uploadBtn.classList.add('btn')
    uploadBtn.textContent = "上传配置"
    uploadBtn.onclick = async () => {
        if (!await checkIsInstalled()) {
            createToast("没有安装qBittorrent，请先安装！", 'red')
            return
        }
        uploadEl.click()
    }

    const stopBtn = document.createElement('button')
    stopBtn.classList.add('btn')
    stopBtn.textContent = "停止"
    stopBtn.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        createToast("干掉qBittorrent中...", 'pink')
        const res = await runShellWithRoot(`
        /data/qbittorrent/qBittorrent.Service stop
        sleep 1
        `)
        if (!res.success) return createToast("停止失败！", 'red')
        createToast(`<div style="width:300px;text-align:center">
            ${res.content.replaceAll('\n', "<br/>")}
        </div>`, 'pink')
        await isqbitRunning()
    }

    const backupBtn = document.createElement('button')
    backupBtn.classList.add('btn')
    backupBtn.textContent = "备份配置"
    backupBtn.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (!await checkIsInstalled()) {
            createToast("没有安装qBittorrent，请先安装！", 'red')
            return
        }
        createToast("备份qBittorrent中...", 'pink')
        const t = Math.floor(Date.now() + Math.random())
        const res = await runShellWithRoot(`
        rm -f /data/data/com.minikano.f50_sms/files/uploads/qbit_config_backup*
        sleep 1
        cp /data/qbittorrent/data/qBittorrent/config/qBittorrent.conf /data/data/com.minikano.f50_sms/files/uploads/qbit_config_backup_${t}.conf
        chmod 777 /data/data/com.minikano.f50_sms/files/uploads/qbit_config_backup_${t}.conf
        `)
        if (!res.success) return createToast("备份失败！", 'red')
        const a = document.createElement('a')
        a.download = `qBittorrent配置备份_config_${t}.conf`
        a.href = `/api/uploads/qbit_config_backup_${t}.conf`
        a.target = "_blank"
        a.style.display = "none"
        document.body.appendChild(a)
        a.click()
        a.remove()
    }

    (async () => {
        const wait = (sec = 100) => new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            }, sec);
        })
        const qbitContainer = document.querySelector('.functions-container')
        while (!UFI_DATA.lan_ipaddr) {
            await wait()
        }

        qbitContainer.insertAdjacentHTML("afterend", `
<div id="IFRAME_KANO" style="width: 100%; margin-top: 10px;">
    <div class="title" style="margin: 6px 0 ;">
        <strong id="running_qbit">qBittorrent</strong>
        <div style="display: inline-block;" id="collapse_qbit_btn"></div>
    </div>
    <div class="collapse" id="collapse_qbit" data-name="close" style="height: 0px; overflow: hidden;">
        <div class="collapse_box">
        <div id="qbit_action_box" style="margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap"></div>
        </div>
    </div>
</div>
`)
        const open = document.createElement('button')
        open.classList.add('btn')
        open.textContent = "打开WebUI"
        open.onclick = () => {
            const a = document.createElement('a')
            a.href = `http://${UFI_DATA.lan_ipaddr}:2334`
            a.target = "_blank"
            a.style.display = "none"
            document.body.appendChild(a)
            a.click()
            a.remove()
        }

        const boot_on = document.createElement('button')
        boot_on.id = "qBittorrent_boot_on"
        boot_on.classList.add('btn')
        boot_on.textContent = "开机自启"
        boot_on.style.background = ""
        boot_on.addEventListener('click', async () => {
            if (!(await checkAdvanceFunc())) {
                createToast("没有开启高级功能，无法使用！", 'red')
                return
            }
            if (!await checkIsInstalled()) {
                createToast("没有安装qBittorrent，请先安装！", 'red')
                return
            }
            const isBootUp = await checkIsBootUp();
            if (isBootUp) {
                //关闭
                await runShellWithRoot(`
                sed -i '/qBittorrent.Service/d' /sdcard/ufi_tools_boot.sh
            `)
                boot_on.style.background = ""
                createToast("已取消开机自启", 'pink')
            } else {
                //开启
                await runShellWithRoot(`
                grep -qxF '/data/qbittorrent/qBittorrent.Service start' /sdcard/ufi_tools_boot.sh || echo '/data/qbittorrent/qBittorrent.Service start' >> /sdcard/ufi_tools_boot.sh
            `)
                boot_on.style.background = "var(--dark-btn-color-active)"
                createToast("已设置开机自启", 'pink')
            }
        })

        checkIsBootUp().then(isBootUp => {
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })

        if (localStorage.getItem("#collapse_qbit") == 'open') {
            await isqbitRunning()
        }

        const uploadCore = document.createElement('button')
        uploadCore.textContent = "更新主程序"
        const uploadCoreInput = document.createElement('input')
        uploadCoreInput.type = 'file'
        uploadCoreInput.accept = '*/*'
        uploadCoreInput.style.display = 'none'

        uploadCoreInput.onchange = async (e) => {
            e.stopPropagation()
            if (!(e.target) || !(e.target.files)) return
            if (e.target.files.length == 0) return
            const file = e.target.files[0];
            if (!file) return
            if (!(await checkAdvanceFunc())) {
                createToast("没有开启高级功能，无法使用！", 'red')
                return
            }
            // 检查文件格式
            if (!await isELF(file)) {
                createToast("只能上传主程序二进制文件!", 'red')
                uploadCoreInput.value = ''
                return
            }
            // 检查文件大小
            if (file.size > 50 * 1024 * 1024) {
                createToast(`文件大小不能超过${50}MB！`, 'red')
                uploadCoreInput.value = ''
                return
            }

            const { close } = createFixedToast('upload_core_toast', "上传主程序中...")

            // 上传文件
            try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await (await fetch(`${KANO_baseURL}/upload_img`, {
                    method: "POST",
                    headers: common_headers,
                    body: formData,
                })).json()

                if (res.url) {
                    close()
                    let foundFile = await runShellWithRoot(`
                        ls /data/data/com.minikano.f50_sms/files/${res.url}
                    `)
                    if (!foundFile.content) {
                        throw "上传失败"
                    }
                    createToast("上传成功，正在停止主程序...", '')
                    stopBtn.click()
                    let resShell = await runShellWithRoot(`
                        rm -f /data/qbittorrent/qbittorrent_nox
                        mv /data/data/com.minikano.f50_sms/files/${res.url} /data/qbittorrent/qbittorrent_nox
                        chmod 755 /data/qbittorrent/qbittorrent_nox
                    `, 120 * 1000)
                    createToast("解压主程序...", '')
                    if (resShell.success) {
                        createToast("上传主程序完成,正在启动主程序...", 'pink')
                        uploadCoreInput.value = ''
                        btn_restart.click()
                        return
                    }
                }
                throw res.error || '上传失败'
            } catch (e) {
                console.error(e);
                createToast(`上传失败!`, 'red')
                uploadCoreInput.value = ''
                return
            } finally {
                close()
            }
        }

        uploadCore.onclick = async () => {
            if (!await checkIsInstalled()) {
                createToast("没有安装qBittorrent，请先安装！", 'red')
                return
            }
            uploadCoreInput.click()
        }

        const showLogBtn = document.createElement('button')
        showLogBtn.textContent = "查看日志"
        showLogBtn.onclick = async () => {
            if (!checkAdvanceFunc()) {
                return createToast("没有开启高级功能，无法使用！")
            }

            const res = await runShellWithRoot(`
        timeout 2s awk \'{print}\' /data/qbittorrent/data/qBittorrent/data/logs/qbittorrent.log
        `)
            if (!res.success) return createToast("获取日志失败！", 'red')
            if (!res.content) return createToast("日志内容为空！", 'red')
            showDialog(res.content, "qBittorrent日志")
        }

        const qbitBox = document.querySelector('#qbit_action_box')
        qbitBox.appendChild(uploadCoreInput)
        qbitBox.appendChild(editBtn)
        qbitBox.appendChild(uploadBtn)
        qbitBox.appendChild(backupBtn)
        qbitBox.appendChild(btn_enabled)
        qbitBox.appendChild(stopBtn)
        qbitBox.appendChild(btn_restart)
        qbitBox.appendChild(btn_disabled)
        qbitBox.appendChild(boot_on)
        qbitBox.appendChild(open)
        qbitBox.appendChild(uploadCore)
        qbitBox.appendChild(showLogBtn)

        let colTimer = null
        let colTimer1 = null
        collapseGen("#collapse_qbit_btn", "#collapse_qbit", "#collapse_qbit", (e) => {
            checkIsBootUp().then(isBootUp => {
                if (isBootUp) {
                    boot_on.style.background = "var(--dark-btn-color-active)"
                } else {
                    boot_on.style.background = ""
                }
            })
            colTimer && clearTimeout(colTimer)
            colTimer1 && clearTimeout(colTimer1)
        })
        await isqbitRunning()
    })()
})()
//</script >