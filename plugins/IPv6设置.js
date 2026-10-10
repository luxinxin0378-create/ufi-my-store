//<script>
(async () => {
    const SH_DIR = "/data/kano_disable_v6"
    const SH_FILE = "/data/kano_disable_v6/kano_disable_v6.sh"
    const SCRIPT_CONTENT = `#!/system/bin/sh
ip6tables -P INPUT DROP
ip6tables -P OUTPUT DROP
ip6tables -P FORWARD DROP
sysctl -w net.ipv6.conf.default.disable_ipv6=1
sync
`

    //检查高级功能是否开启
    const checkRoot = async () => {
        try {
            const res = await runShellWithRoot('whoami');
            return res.success && res.content.includes('root');
        } catch {
            return false;
        }
    };

    const checkIsBootUp = async () => {
        const res = await runShellWithRoot(`
        grep -q 'kano_disable_v6.sh' /sdcard/ufi_tools_boot.sh
        echo $?
        `)
        return res.content.trim() == '0';
    }


    //上传脚本文件，移动到机内目标目录
    const uploadFile = async (filename, content, destPath) => {
        try {
            const file = new File([content], filename, { type: "text/plain" });
            const formData = new FormData();
            formData.append("file", file);

            const uploadRes = await (await fetch(`${KANO_baseURL}/upload_img`, {
                method: "POST",
                headers: common_headers,
                body: formData,
            })).json();

            if (uploadRes.url) {
                const tempPath = `/data/data/com.minikano.f50_sms/files${uploadRes.url}`;
                const moveRes = await runShellWithRoot(`mv ${tempPath} ${destPath}`);
                if (moveRes.success) {
                    return true;
                } else { throw new Error(`移动文件失败: ${moveRes.content}`); }
            } else { return false; }
        } catch (e) {
            return false;
        }
    };

    //卸载
    const uninstall = async (needBootUp = false) => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return false;
        }
        createToast("卸载中...")
        if (needBootUp) {
            await runShellWithRoot(`sed -i '/kano_disable_v6/d' /sdcard/ufi_tools_boot.sh`)
            await runShellWithRoot(`rm -rf ${SH_FILE}`)
            await runShellWithRoot(`rm -rf ${SH_DIR}`)
            await runShellWithRoot(`rm -rf ${SH_DIR}`)
        }

        await runShellWithRoot(`
        ip6tables -P INPUT ACCEPT
        ip6tables -P OUTPUT ACCEPT
        ip6tables -P FORWARD ACCEPT
        sysctl -w net.ipv6.conf.default.disable_ipv6=0
        `)

        isBtn1Disabled = false
        isBtnDisabled = false
        createToast("已启用IPv6,重新连接WiFi并开关一下数据流量即可生效（也可直接重启）")
    }

    //安装
    const install = async (needBootUp = false) => {
        if (!(await checkRoot())) {
            return createToast("没有开启高级功能，无法使用！", "red");
        }

        if (needBootUp) {
            if (await checkIsBootUp()) {
                return createToast("你已经安装了！", "red")
            }
            if (!(await runShellWithRoot(`mkdir -p ${SH_DIR}`)).success) {
                return createToast("创建文件夹失败！", "red")
            }
            //上传
            if (!await uploadFile("kano_disable_v6.sh", SCRIPT_CONTENT, SH_FILE)) {
                return createToast("传输文件失败！", "red")
            }
            await runShellWithRoot(`sh ${SH_FILE} &`)
            await runShellWithRoot(`grep -qxF 'sh ${SH_FILE} &' /sdcard/ufi_tools_boot.sh || echo 'sh ${SH_FILE} &' >> /sdcard/ufi_tools_boot.sh`)
            createToast("已设置开机自启！")
        } else {
            await runShellWithRoot(`
            ip6tables -P INPUT DROP
            ip6tables -P OUTPUT DROP
            ip6tables -P FORWARD DROP
            sysctl -w net.ipv6.conf.default.disable_ipv6=1
            `)
        }
        createToast("已禁用IPv6,重新连接WiFi并开关一下数据流量即可全局生效")
    }

    const btn = document.createElement('button')
    btn.textContent = "禁用IPv6(设置自启)"
    btn.onclick = async (e) => {
        await install(true)
    }

    const btn0 = document.createElement('button')
    btn0.textContent = "禁用IPv6(单次生效)"
    btn0.onclick = async (e) => {
        await install()
    }

    const btn1 = document.createElement('button')
    btn1.textContent = "启用IPv6(移除自启)"

    btn1.onclick = async (e) => {
        await uninstall(true)
    }

    const btn2 = document.createElement('button')
    btn2.textContent = "启用IPv6(单次生效)"

    btn2.onclick = async (e) => {
        await uninstall()
    }


    const btn3 = document.createElement('button')
    btn3.textContent = "重启网络(AT)"

    let deb = null
    let isD = false
    btn3.onclick = (e) => {
        deb && clearTimeout(deb)
        if (isD) {
            return createToast("冷却中，请勿重复点击", "pink")
        }
        isD = true
        handleAT('AT+CFUN=1,1')
        setTimeout(() => {
            isD = false
        }, 5000);
    }

    const btn4 = document.createElement('button')
    btn4.textContent = "重启设备"

    btn4.onclick = (e) => {
        runShellWithRoot('reboot')
        createToast('重启成功')
    }


    const mainBtn = document.createElement('button')
    mainBtn.textContent = "IPv6设置"
    mainBtn.onclick = async (e) => {
        const { id, el } = createModal({
            name: "v6_switch",
            title: 'IPv6设置',
            maxWidth: "400px",
            onClose: () => true,
            onConfirm: () => true,
            content: `
    <div style="display:flex;gap:10px;flex-direction: column">
        <div class="title" style="font-size: .7rem">IPv6操作</div>
        <div style="display:flex;gap:10px;flex-wrap: wrap" class="v6_inner"></div>
        <div style="display:flex;gap:10px;flex-wrap: wrap" class="v6_inner1"></div>
        <div class="title" style="font-size: .7rem">快捷操作</div>
        <div style="display:flex;gap:10px;flex-wrap: wrap" class="v6_inner2"></div>
    </div>
    `
        })
        const inner = el.querySelector('.v6_inner')
        const inner1 = el.querySelector('.v6_inner1')
        const inner2 = el.querySelector('.v6_inner2')
        if (inner) {
            inner.appendChild(btn)
            inner.appendChild(btn0)
        }
        if (inner1) {
            inner1.appendChild(btn1)
            inner1.appendChild(btn2)
        }
        if (inner2) {
            inner2.appendChild(btn3)
            inner2.appendChild(btn4)
        }
        showModal(id)
    }


    document.querySelector('.actions-buttons').appendChild(mainBtn)
})();
//</script>