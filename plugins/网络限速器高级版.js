//<script>
(async () => {
    let switchContainer = null

    // ====== 常量：固定脚本 & 配置路径（不再上传 sh）======
    const LIMIT_SH = "/data/kano_net_tc/limit.sh"
    const PLUGIN_PATH = "/data/kano_net_tc/"
    const BOOT_SH = "/sdcard/ufi_tools_boot.sh"
    const PKG_URL = "https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/kano_net_tc_limiter"

    // 注意：你说必须用 awk 输出，否则拿不到返回
    const runLimit = async (args) => {
        // args 例子：--list / --limit 1.2.3.4 20 / --release 1.2.3.4 / --apply / --purge
        return await runShellWithRoot(`timeout 2s sh ${LIMIT_SH} ${args} | awk '{print}'`)
    }

    const isInstalled = async () => {
        try {
            const res = await runShellWithRoot("ls /data/kano_net_tc")
            return res.content.includes("limit.sh")
        } catch (e) {
            return false
        }
    }

    // 检测是否开机自启
    const checkIsBootUp = async () => {
        const res = await runShellWithRoot(`
        grep -q 'kano_net_tc' /sdcard/ufi_tools_boot.sh
        echo $?
        `)
        return res.content.trim() == '0';
    }

    // ====== UI（尽可能复用你原来的样式结构）======
    const html = `
<div class="title">网络限速器(高级版)</div>
<div class="content" style="max-height: 90%;overflow-y: scroll; padding-top: 10px; width: 80vw; max-width: 420px;font-size: .9rem;">
    <div id="kano_limit_tc_overlay" style="display: none;flex-direction:column;align-items: center;justify-content: center;position: absolute;background: #000000a6;z-index: 1;left: 10px;top: 50px;bottom: 50px;right: 10px;border-radius: 10px;">
        <p>需要安装依赖才可以使用</p>
        <button>点我安装</button>
    </div>
    <div style="margin: 10px 0">
        <span>设备的 IP 地址：</span>
        <input class="ip" style="padding:6px;margin: 6px 0; width: 100%" type="text" placeholder="例如 192.168.1.50"></input>
    </div>
    <div style="margin: 10px 0">
        <span>限速值(Mbps)：</span>
        <input class="speed" style="padding:6px;margin: 6px 0; width: 100%" type="number" min="1" max="9999" placeholder="限速Mbps"></input>
    </div>

    <div style="margin: 10px 0">
        <span>当前限速列表：</span>
    </div>

    <div class="limit_list" style="margin: 6px 0;max-height: 200px;overflow: auto;"></div>

    <div class="sw"></div>

    <div style="margin:10px 0">
        <button onclick="submit_net_settings(true)">添加/更新限速</button>
        <button onclick="submit_net_settings(false)">解除该IP限速</button>
    </div>
</div>
<div class="btn" style="text-align: right;">
    <button type="button" onclick="closeModal('#netLimitModal')" data-i18n="close_btn">关闭</button>
</div>
`

    // ====== Root 检查（逻辑）======
    const checkRoot = async () => {
        try {
            const res = await runShellWithRoot('whoami');
            return res.success && res.content.includes('root');
        } catch {
            return false;
        }
    };

    // ====== 开机自启（开机20s后执行，防止被ufi清除tc规则）======
    const saveLimitToBoot = async () => {
        try {
            const bootLine = `(sleep 20; sh ${LIMIT_SH} --apply) >/dev/null 2>&1 &`
            const res = await runShellWithRoot(`
sed -i '/${LIMIT_SH.replace(/\//g, '\\/')}/d' ${BOOT_SH}
grep -qxF '${bootLine}' ${BOOT_SH} || echo '${bootLine}' >> ${BOOT_SH}
`)
            return res.success
        } catch {
            return false
        }
    }

    const removeLimitFromBoot = async () => {
        try {
            const res = await runShellWithRoot(`sed -i '/${LIMIT_SH.replace(/\//g, '\\/')}/d' ${BOOT_SH}`)
            return res.success
        } catch {
            return false
        }
    }

    // ====== 解析 --list 返回的 JSON（脚本现在输出的是转义 JSON，需要先反转义）======
    const parseEscapedJson = (s) => {
        if (!s) return null
        const raw = (s || '').replace(/\n/g, '').trim()
        if (!raw) return null
        // 你的 limit.sh 现在会把 " 变成 \"，所以这里反转义回来再 JSON.parse
        // 同时兼容“本来就没转义”的情况
        try {
            if (raw.includes('\\"')) {
                const unescaped = raw.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
                return JSON.parse(unescaped)
            }
            return JSON.parse(raw)
        } catch {
            return null
        }
    }

    // ====== 读取当前限速列表（来自 config）======
    const fetchLimitList = async () => {
        try {
            const res = await runLimit(`--list`)
            if (!res?.success) return []
            const obj = parseEscapedJson(res.content)
            if (!obj || !obj.done || !Array.isArray(obj.config)) return []
            // config: [{ip, mbit}]
            return obj.config
        } catch {
            return []
        }
    }

    // ====== 渲染列表：展示“当前限速的 IP”，支持“改/解”======
    const renderLimitList = async () => {
        const wrap = document.querySelector("#netLimitModal .limit_list")
        if (!wrap) return
        const list = await fetchLimitList()

        if (!list.length) {
            wrap.innerHTML = `<div style="margin: 8px 0; opacity: 0.75;">暂无限速设备</div>`
            return
        }

        wrap.innerHTML = list.map(item => {
            const ip = item.ip
            const mbit = item.mbit
            // 复用你现有按钮风格（直接用 button），不搞新组件
            return `
<div class="limit_row" style="display:flex; align-items:center; gap:8px; margin: 8px 0;">
    <div style="flex:1;">
        <div><b style="font-size:.7rem">${ip}</b></div>
        <div style="opacity:.8; font-size: .66rem;">${mbit} Mbps</div>
    </div>
    <div>
        <input class="row_speed" data-ip="${ip}" value="${mbit}" type="number" min="1" max="9999"
        style="padding:6px;max-width: 88px;" />
        <button onclick="updateRowLimit('${ip}')">更改</button>
        <button onclick="releaseRowLimit('${ip}')">解除</button>
    </div>
</div>
`
        }).join('')
    }

    // ====== 设置/解除限速（调用 limit.sh）======
    const setLimit = async (ip, speed) => {
        let speedInt = Math.round(speed)
        const res = await runLimit(`--limit ${ip} ${speedInt}`)
        return !!res?.success
    }

    const releaseLimit = async (ip) => {
        const res = await runLimit(`--release ${ip}`)
        return !!res?.success
    }

    // ====== 输入校验（简单一点）======
    const isIPv4 = (ip) => /^((25[0-5]|2[0-4]\d|[0-1]?\d?\d)\.){3}(25[0-5]|2[0-4]\d|[0-1]?\d?\d)$/.test((ip || '').trim())

    // ====== 顶部区域：添加/更新 / 解除（复用你 submit_net_settings 的入口）======
    const submit_net_settings = async (enable = false) => {
        if (!await checkRoot()) return createToast("没有开启高级功能，无法使用", 'pink')

        const ip = document.querySelector("#netLimitModal .ip")?.value?.trim()
        const speedStr = document.querySelector("#netLimitModal .speed")?.value?.trim()

        if (!ip || !isIPv4(ip)) return createToast("请输入正确的IP地址", 'pink')

        if (enable) {
            if (!speedStr) return createToast("请输入限速值", 'pink')
            const speed = Number(speedStr)
            if (!Number.isFinite(speed) || speed <= 0) return createToast("限速值不正确", 'pink')

            const ok = await setLimit(ip, speed)
            if (!ok) return createToast("设置限速失败！", 'pink')

            createToast("设置限速成功！")

            // 开机自启：沿用你原来的开关逻辑
            if (window.net_limit_boot) {
                switchContainer.update(true);
                window.net_limit_boot = true;
                (await saveLimitToBoot()) ? createToast("已设置开机自启动!") : createToast("设置开机自启动失败！", 'pink')
            }
            await renderLimitList()
            return
        } else {
            const ok = await releaseLimit(ip)
            if (!ok) return createToast("解除限速失败！", 'pink')

            createToast("已解除限速")
            if (window.net_limit_boot) {
                // 你原来“取消限速”会清 boot；但现在是多设备：
                // 这里更合理的是：只要 config 里还有条目，就保留 boot apply；空了才移除
                const list = await fetchLimitList()
                const willBeEmpty = !list.some(x => x.ip === ip) && list.length <= 1
                if (willBeEmpty) {
                    switchContainer.update(false);
                    window.net_limit_boot = false;
                    (await removeLimitFromBoot()) ? createToast("已清除开机脚本!") : createToast("清除开机脚本失败！", 'pink')
                }
            }
            await renderLimitList()
            return
        }
    }

    window.submit_net_settings = submit_net_settings

    // ====== 列表内：更改/解除 ======
    window.updateRowLimit = async (ip) => {
        if (!await checkRoot()) return createToast("没有开启高级功能，无法使用", 'pink')
        const input = document.querySelector(`#netLimitModal .row_speed[data-ip="${ip}"]`)
        const speedStr = input?.value?.trim()
        if (!speedStr) return createToast("请输入限速值", 'pink')
        const speed = Number(speedStr)
        if (!Number.isFinite(speed) || speed <= 0) return createToast("限速值不正确", 'pink')

        const ok = await setLimit(ip, speed)
        if (!ok) return createToast("更改限速失败！", 'pink')
        createToast("已更新限速")

        if (window.net_limit_boot) {
            (await saveLimitToBoot()) ? createToast("已设置开机自启动!") : createToast("设置开机自启动失败！", 'pink')
        }
        await renderLimitList()
    }

    window.releaseRowLimit = async (ip) => {
        if (!await checkRoot()) return createToast("没有开启高级功能，无法使用", 'pink')
        const ok = await releaseLimit(ip)
        if (!ok) return createToast("解除限速失败！", 'pink')
        createToast("已解除限速")

        // 如果没有任何限速了，就移除开机脚本；否则保留 apply
        const list = await fetchLimitList()
        if (window.net_limit_boot && (!list || list.length === 0)) {
            switchContainer.update(false);
            (await removeLimitFromBoot()) ? createToast("已清除开机脚本!") : createToast("清除开机脚本失败！", 'pink')
        }

        await renderLimitList()
    }

    const install = async () => {
        try {
            if (!await checkRoot()) return createToast("没有开启高级功能，无法使用", 'pink')
            createToast("下载所需依赖中...")
            const res1 = await runShellWithRoot(`
cd /data && /data/data/com.minikano.f50_sms/files/curl -L ${PKG_URL} -o limit.sh
`, 100 * 1000)
            if (!res1.success) {
                createToast("下载所需依赖失败", 'pink')
                return false
            }

            const res2 = await runShellWithRoot(`
cd /data && rm -rf ${PLUGIN_PATH} && mkdir -p ${PLUGIN_PATH} && mv limit.sh ${PLUGIN_PATH}
`)
            if (!res2.success) {
                createToast("移动文件失败", 'pink')
                return false
            }

            const res3 = await runShellWithRoot(`
chmod 777 ${PLUGIN_PATH}*
`)
            if (!res3.success) {
                createToast("设置权限失败", 'pink')
                return false
            }

            createToast("安装成功")
            return true
        } catch {
            createToast("执行失败", 'pink')
            return false
        }
    }

    // ====== 挂载 Modal / Button（结构）======
    const el = document.createElement('div')
    el.id = "netLimitModal"
    el.classList.add('modal')
    el.style.opacity = "1"
    el.style.display = "none"
    el.innerHTML = html
    document.querySelector('.container').appendChild(el)

    const btn = document.createElement('button')
    btn.textContent = "网络限速器(高级版)"
    btn.onclick = async () => {
        showModal("#netLimitModal")
        //检测是否安装依赖
        const isInstalledPlugin = await isInstalled()
        const overlay = document.querySelector("#kano_limit_tc_overlay")
        const overlayBtn = document.querySelector("#kano_limit_tc_overlay button")
        if (!isInstalledPlugin) {
            overlay.style.display = "flex"
            overlayBtn.onclick = async () => {
                const res = await install()
                if (res) {
                    overlay.style.display = "none"
                }
            }
        } else {
            overlay.style.display = "none"
            await renderLimitList()
        }
    }
    document.querySelector('.actions-buttons').appendChild(btn)

    setTimeout(async () => {
        // ====== 开机自启开关（沿用 createSwitch）======
        let sw = document.querySelector('#netLimitModal .sw')
        if (sw) {
            sw.appendChild(
                switchContainer = createSwitch({
                    text: '开机自启',
                    value: await checkIsBootUp(),
                    className: 'kano_netLimit_switch',
                    onChange: async (checked) => {
                        window.net_limit_boot = checked
                        if (!await checkRoot()) return createToast("没有开启高级功能，无法使用", 'pink')

                        if (checked) {
                            // 只要打开开关，就把 apply 写进开机脚本（即使目前为空也无所谓）
                            ; (await saveLimitToBoot()) ? createToast("已设置开机自启动!") : createToast("设置开机自启动失败！", 'pink')
                        } else {
                            ; (await removeLimitFromBoot()) ? createToast("已清除开机脚本!") : createToast("清除开机脚本失败！", 'pink')
                        }
                    }
                })
            )
        }
    }, 500)
})();
//</script>
