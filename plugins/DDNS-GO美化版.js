<script>
(() => {
    /**
     * Toast消息类型枚举
     */
    const TOAST_TYPES = {
        SUCCESS: 'green',
        ERROR: 'red',
        WARNING: 'orange',
        INFO: 'blue',
        DEFAULT: ''
    }

    /**
     * Toast消息管理器
     */
    const ToastManager = {
        success: (message, duration = 3000) => {
            createToast(message, TOAST_TYPES.SUCCESS, duration)
        },
        error: (message, duration = 5000) => {
            createToast(message, TOAST_TYPES.ERROR, duration)
        },
        warning: (message, duration = 4000) => {
            createToast(message, TOAST_TYPES.WARNING, duration)
        },
        info: (message, duration = 3000) => {
            createToast(message, TOAST_TYPES.INFO, duration)
        },
        loading: (message) => {
            createToast(`⏳ ${message}`, TOAST_TYPES.INFO, 2000)
        },
        successWithLink: (title, url, linkText, extraInfo = '', duration = 20000) => {
            const message = `<div style="width:300px;text-align:center;pointer-events: all;">
                ${title}<br />
                <a href="${url}" target="_blank">${linkText}</a><br />
                ${extraInfo}
            </div>`
            createToast(message, TOAST_TYPES.SUCCESS, duration)
        },
        result: (title, content, type = TOAST_TYPES.SUCCESS, duration = 10000) => {
            const message = `<div style="width:300px;text-align:center">
                ${title}<br/>
                ${content.replaceAll('\n', "<br/>")}
            </div>`
            createToast(message, type, duration)
        }
    }

    /**
     * 操作状态管理器
     */
    const OperationManager = {
        executeWithState: async (operation, button, loadingText) => {
            const originalText = button.textContent
            const originalDisabled = button.disabled
            try {
                button.disabled = true
                button.textContent = loadingText
                ToastManager.loading(loadingText)
                const result = await operation()
                return result
            } catch (error) {
                ToastManager.error(`操作失败: ${error.message}`)
                throw error
            } finally {
                button.disabled = originalDisabled
                button.textContent = originalText
            }
        }
    }

    /**
     * 检查高级功能是否开启
     */
    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami')
        return res.content?.includes('root') ?? false
    }

    /**
     * 验证高级功能权限
     */
    const validateAdvancedPermission = async () => {
        if (!(await checkAdvanceFunc())) {
            ToastManager.error("没有开启高级功能，无法使用！")
            return false
        }
        return true
    }

    /**
     * 创建安装DDNS_GO按钮
     */
    const btn_enabled = document.createElement('button')
    btn_enabled.textContent = "安装DDNS_GO"
    let disabled_btn_enabled = false

    /**
     * 安装DDNS_GO的核心逻辑
     */
    const installDDNS = async () => {
        if (!(await validateAdvancedPermission())) return

        try {
            ToastManager.loading("正在下载DDNS_GO...")
            const res1 = await runShellWithRoot(`
                /data/data/com.minikano.f50_sms/files/curl -L https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/ddns-go --output /data/adb/ddns_go_android
            `, 100 * 1000)
            if (!res1.success) throw new Error("下载DDNS_GO依赖失败!")

            ToastManager.loading("正在配置DDNS_GO文件...")
            const res2 = await runShellWithRoot(`
                cd /data/
                mkdir -p ddns_go
                mv /data/adb/ddns_go_android /data/ddns_go/ddns_go_android
            `)
            if (!res2.success) throw new Error("配置DDNS_GO文件出错!")

            ToastManager.loading("正在检查DDNS_GO依赖文件...")
            const res3 = await runShellWithRoot(`
                ls /data/ddns_go
            `)
            if (!res3.success || !res3.content.includes('ddns_go')) throw new Error("检查DDNS_GO依赖文件失败!")

            ToastManager.loading("正在修改DDNS_GO目录权限...")
            const res4 = await runShellWithRoot(`
                chmod 777 /data/ddns_go/ddns_go_android
            `)
            if (!res4.success) throw new Error("修改DDNS_GO目录权限失败!")

            ToastManager.loading("正在设置自启动...")
            const res5 = await runShellWithRoot(`
                grep -qxF 'nohup /data/ddns_go/ddns_go_android &' /sdcard/ufi_tools_boot.sh || echo 'nohup /data/ddns_go/ddns_go_android &' >> /sdcard/ufi_tools_boot.sh
            `)
            if (!res5.success) throw new Error("设置DDNS_GO自启动失败!")

            ToastManager.loading("正在启动DDNS_GO...")
            const res6 = await runShellWithRoot(`nohup /data/ddns_go/ddns_go_android > /dev/null 2>&1 &`, 100)

            ToastManager.loading("正在验证DDNS_GO启动状态...")
            await new Promise(resolve => setTimeout(resolve, 3000))
            const checkRes = await runShellWithRoot(`
                ps | grep ddns_go | grep -v grep
            `)
            if (!checkRes.success || !checkRes.content || !checkRes.content.includes('ddns_go')) {
                throw new Error("启动DDNS_GO失败!进程未找到")
            }

            ToastManager.successWithLink(
                "🎉 启动DDNS_GO成功！<br />web地址(端口默认是9876)",
                "http://192.168.0.1:9876/",
                "http://192.168.0.1:9876/",
                `配置文件路径:/sdcard/.ddns_go_config.yaml<br/>进程信息:${checkRes.content.trim()}`
            )
        } catch (error) {
            ToastManager.error(error.message)
        }
    }

    btn_enabled.onclick = async () => {
        if (disabled_btn_enabled) return
        disabled_btn_enabled = true
        try {
            await OperationManager.executeWithState(installDDNS, btn_enabled, "安装中...")
        } finally {
            disabled_btn_enabled = false
        }
    }

    /**
     * 创建卸载DDNS_GO按钮
     */
    const btn_disabled = document.createElement('button')
    btn_disabled.textContent = "卸载DDNS_GO"
    let ct = 0
    let tmer = null

    /**
     * 卸载DDNS_GO的核心逻辑
     */
    const uninstallDDNS = async () => {
        try {
            ToastManager.loading("正在停止DDNS_GO服务...")
            const res = await runShellWithRoot(`
                pkill ddns_go
                sleep 1
                rm -rf /data/ddns_go
                sed -i '/ddns_go_android/d' /sdcard/ufi_tools_boot.sh
            `)
            if (!res.success) throw new Error("卸载失败！")
            ToastManager.result(
                "✅ 卸载完成",
                res.content || "DDNS_GO已成功卸载",
                TOAST_TYPES.SUCCESS
            )
        } catch (error) {
            ToastManager.error(error.message)
        }
    }

    btn_disabled.onclick = async () => {
        if (!(await validateAdvancedPermission())) return
        ct++
        if (ct < 2) {
            ToastManager.warning("⚠️ 再点一次确认卸载DDNS_GO")
            tmer = setTimeout(() => ct = 0, 3000)
            return
        }
        await OperationManager.executeWithState(uninstallDDNS, btn_disabled, "卸载中...")
        ct = 0
        if (tmer) clearTimeout(tmer)
    }

    /**
     * 创建重启DDNS_GO按钮
     */
    const btn_restart = document.createElement('button')
    btn_restart.textContent = "重启DDNS_GO"

    /**
     * 重启DDNS_GO的核心逻辑
     */
    const restartDDNS = async () => {
        try {
            ToastManager.loading("正在停止DDNS_GO服务...")
            const stopRes = await runShellWithRoot(`
                pkill ddns_go
                sleep 2
            `)
            ToastManager.loading("正在启动DDNS_GO服务...")
            const startRes = await runShellWithRoot(`nohup /data/ddns_go/ddns_go_android > /dev/null 2>&1 &`, 100)
            ToastManager.loading("正在验证DDNS_GO服务状态...")
            await new Promise(resolve => setTimeout(resolve, 3000))
            const checkRes = await runShellWithRoot(`
                ps | grep ddns_go | grep -v grep
            `)
            if (checkRes.success && checkRes.content && checkRes.content.includes('ddns_go')) {
                ToastManager.successWithLink(
                    "🔄 重启DDNS_GO成功！<br />服务已正常运行",
                    "http://192.168.0.1:9876/",
                    "点击访问DDNS_GO管理界面",
                    `进程信息: ${checkRes.content.trim()}`,
                    15000
                )
            } else {
                ToastManager.warning("⚠️ 重启可能失败，请检查DDNS_GO服务状态")
            }
        } catch (error) {
            ToastManager.error(`重启失败: ${error.message}`)
        }
    }

    btn_restart.onclick = async () => {
        if (!(await validateAdvancedPermission())) return
        await OperationManager.executeWithState(restartDDNS, btn_restart, "重启中...")
    }

    /**
     * 创建停止DDNS_GO按钮
     */
    const stopBtn = document.createElement('button')
    stopBtn.classList.add('btn')
    stopBtn.textContent = "停止DDNS_GO"

    /**
     * 停止DDNS_GO的核心逻辑
     */
    const stopDDNS = async () => {
        try {
            ToastManager.loading("正在停止DDNS_GO服务...")
            const res = await runShellWithRoot(`
                pkill ddns_go
                sleep 1
            `)
            if (!res.success) throw new Error("停止失败！")
            ToastManager.result(
                "⏹️ 停止完成",
                res.content || "DDNS_GO服务已停止",
                TOAST_TYPES.SUCCESS
            )
        } catch (error) {
            ToastManager.error(error.message)
        }
    }

    stopBtn.onclick = async () => {
        if (!(await validateAdvancedPermission())) return
        await OperationManager.executeWithState(stopDDNS, stopBtn, "停止中...")
    }

    /**
     * 创建刷新网页按钮
     */
    const refresh = document.createElement('button')
    refresh.classList.add('btn')
    refresh.textContent = "刷新网页"
    refresh.onclick = () => {
        window.location.reload(true)
    }

    /**
     * 初始化DDNS_GO插件面板
     */
    (() => {
        const mmContainer = document.querySelector('.functions-container')
        mmContainer.insertAdjacentHTML("afterend", `
            <div id="IFRAME_DDNS_GO" style="width: 100%; margin-top: 10px;">
                <div class="title" style="margin: 6px 0;">
                    <strong>🌐 DDNS_GO</strong>
                    <div style="display: inline-block;" id="collapse_ddns_go_btn"></div>
                </div>
                <div class="collapse" id="collapse_ddns_go" data-name="close" style="height: 0px; overflow: hidden;">
                    <div class="collapse_box">
                        <div id="ddns_go_action_box" style="margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap"></div>
                        <ul class="deviceList">
                            <li style="padding:10px">
                                <iframe id="ddns_go_iframe" src="http://192.168.0.1:9876/" style="border:none;padding:0;margin:0;width:100%;height:500px;border-radius: 10px;overflow: hidden;opacity: .6;"></iframe>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        `)
        const ddnsGoBox = document.querySelector('#ddns_go_action_box')
        ddnsGoBox.appendChild(btn_enabled)
        ddnsGoBox.appendChild(stopBtn)
        ddnsGoBox.appendChild(btn_restart)
        ddnsGoBox.appendChild(btn_disabled)
        ddnsGoBox.appendChild(refresh)
        collapseGen("#collapse_ddns_go_btn", "#collapse_ddns_go", "#collapse_ddns_go", () => {})
    })()
})()
</script>