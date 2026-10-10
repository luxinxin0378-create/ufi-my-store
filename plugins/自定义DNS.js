//<script>
(async () => {
    const NAME = "kano_iptables_dns"
    const SH_DIR = "/data/kano_iptables_dns"
    const SH_FILE = "/data/kano_iptables_dns/kano_iptables_dns.sh"
    const CONF_FILE = "/data/kano_iptables_dns/kano_iptables_dns_conf.conf"
    const html = `
<div class="modal" style="padding:15px;width: 77%; max-width: 300px; opacity: 1;">
    <div class="title">DNS 编辑</div>
    <div class="title" style="font-size:.64rem;margin-top: 10px;font-style: italic;" id="DNSTextInfo"></div>
    <div class="content" style="max-height: 350px;padding: 15px 0px 0 0px;">
        <input style="width:100%;box-sizing: border-box;padding: 10px" placeholder="223.5.5.5" />
    </div>
    <div class="btn" style="text-align: right;margin-top: 10px;">
        <button id="saveDNSBtn" onclick="saveDNS()">保存</button>
        <button onclick="restoreDNS()">还原</button>
        <button onclick="closeModal('#DNSModal')">关闭</button>
    </div>
</div>
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

    const genSH = (ip = '') => {
        return `#!/system/bin/sh
route_line="$(ip route get ${ip} 2>/dev/null | head -n 1)"
route_dev="$(printf '%s\n' "$route_line" | awk '{for(i=1;i<=NF;i++) if ($i=="dev") {print $(i+1); exit}}')"
route_via="$(printf '%s\n' "$route_line" | awk '{for(i=1;i<=NF;i++) if ($i=="via") {print $(i+1); exit}}')"

if [ -n "$route_dev" ]; then
    if [ -n "$route_via" ]; then
        ip route replace ${ip}/32 via "$route_via" dev "$route_dev"
    else
        ip route replace ${ip}/32 dev "$route_dev"
    fi
fi

while iptables -t nat -C PREROUTING -p udp --dport 53 -j DNAT --to-destination ${ip} 2>/dev/null; do
    iptables -t nat -D PREROUTING -p udp --dport 53 -j DNAT --to-destination ${ip}
done
while iptables -t nat -C PREROUTING -p tcp --dport 53 -j DNAT --to-destination ${ip} 2>/dev/null; do
    iptables -t nat -D PREROUTING -p tcp --dport 53 -j DNAT --to-destination ${ip}
done
while iptables -t nat -C OUTPUT -p udp --dport 53 -j DNAT --to-destination ${ip} 2>/dev/null; do
    iptables -t nat -D OUTPUT -p udp --dport 53 -j DNAT --to-destination ${ip}
done
while iptables -t nat -C OUTPUT -p tcp --dport 53 -j DNAT --to-destination ${ip} 2>/dev/null; do
    iptables -t nat -D OUTPUT -p tcp --dport 53 -j DNAT --to-destination ${ip}
done
while iptables -t nat -C OUTPUT -d ${ip} -j RETURN 2>/dev/null; do
    iptables -t nat -D OUTPUT -d ${ip} -j RETURN
done

iptables -t nat -I PREROUTING 1 -p udp --dport 53 -j DNAT --to-destination ${ip}
iptables -t nat -I PREROUTING 1 -p tcp --dport 53 -j DNAT --to-destination ${ip}
iptables -t nat -I OUTPUT 1 -d ${ip} -j RETURN
iptables -t nat -I OUTPUT 2 -p udp --dport 53 -j DNAT --to-destination ${ip}
iptables -t nat -I OUTPUT 2 -p tcp --dport 53 -j DNAT --to-destination ${ip}
sync
`
    }

    //ip合法检查
    const isRealIP = (ip) => {
        return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)
    }

    //检查是否自启
    const isBootUp = async () => {
        const res = await runShellWithRoot(`timeout 2s  awk '{print}' /sdcard/ufi_tools_boot.sh | grep ${NAME}`)
        return (res.content && res.content.includes(NAME))
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

    const restore = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return false;
        }
        const conf = await runShellWithRoot(`timeout 2s  awk '{print}' ${CONF_FILE}`)
        createToast("还原中...")
        if (conf.content.trim() == "") {
            createToast("配置文件中没有值，重启后会自动重置DNS")
        } else {
            await runShellWithRoot(`
            while ip route del ${conf.content.trim()}/32 >/dev/null 2>&1; do :; done
            while iptables -t nat -C PREROUTING -p udp --dport 53 -j DNAT --to-destination ${conf.content.trim()} 2>/dev/null; do
                iptables -t nat -D PREROUTING -p udp --dport 53 -j DNAT --to-destination ${conf.content.trim()}
            done
            while iptables -t nat -C PREROUTING -p tcp --dport 53 -j DNAT --to-destination ${conf.content.trim()} 2>/dev/null; do
                iptables -t nat -D PREROUTING -p tcp --dport 53 -j DNAT --to-destination ${conf.content.trim()}
            done
            while iptables -t nat -C OUTPUT -p udp --dport 53 -j DNAT --to-destination ${conf.content.trim()} 2>/dev/null; do
                iptables -t nat -D OUTPUT -p udp --dport 53 -j DNAT --to-destination ${conf.content.trim()}
            done
            while iptables -t nat -C OUTPUT -p tcp --dport 53 -j DNAT --to-destination ${conf.content.trim()} 2>/dev/null; do
                iptables -t nat -D OUTPUT -p tcp --dport 53 -j DNAT --to-destination ${conf.content.trim()}
            done
            while iptables -t nat -C OUTPUT -d ${conf.content.trim()} -j RETURN 2>/dev/null; do
                iptables -t nat -D OUTPUT -d ${conf.content.trim()} -j RETURN
            done
        `)
        }
        await runShellWithRoot(`sed -i '/kano_iptables_dns/d' /sdcard/ufi_tools_boot.sh`)
        await runShellWithRoot(`rm -rf ${SH_FILE}`)
        await runShellWithRoot(`rm -rf ${SH_DIR}`)
        await runShellWithRoot(`rm -rf ${CONF_FILE}`)
        init()

        isBtn1Disabled = false
        isBtnDisabled = false
        return createToast("已还原并取消自启")
    }

    //save
    const save = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return false;
        }
        const textarea = document.querySelector('#DNSModal input');
        if (textarea) {
            const DNS_text = textarea.value.trim();
            if (!DNS_text || DNS_text == "") {
                return createToast("请输入DNS地址！", "pink")
            }
            if(!isRealIP(DNS_text)){
                return createToast("请输入合法的DNS地址！", "pink")
            }
            createToast("保存中...")
            await runShellWithRoot(`mkdir -p ${SH_DIR}`)
            //保存配置供前端读取
            if (!await uploadFile("kano_iptables_dns_conf.conf", DNS_text, CONF_FILE)) {
                return createToast("传输文件失败！", "red")
            }
            //上传
            if (!await uploadFile("kano_iptables_dns.sh", genSH(DNS_text), SH_FILE)) {
                return createToast("传输文件失败！", "red")
            }
            await runShellWithRoot(`grep -qxF 'sh ${SH_FILE} &' /sdcard/ufi_tools_boot.sh || echo 'sh ${SH_FILE} &' >> /sdcard/ufi_tools_boot.sh`)
            await runShellWithRoot(`sh ${SH_FILE} &`)
            init()
            createToast("已保存并设置自启")
        }
    }

    const init = async () => {
        const textarea = document.querySelector('#DNSModal input');
        const saveDNSBtn = document.querySelector("#DNSModal #saveDNSBtn")
        const DNSTextInfo = document.querySelector("#DNSModal #DNSTextInfo")

        if (!(await checkRoot())) {
            return;
        }
        if (textarea) {
            const conf = await runShellWithRoot(`timeout 2s  awk '{print}' ${CONF_FILE}`)
            //已经设置了并且自启
            if ((conf.content && conf.content.trim && conf.content.trim() != '') && await isBootUp()) {
                textarea.disabled = true
                saveDNSBtn.disabled = true
                textarea.style.background = "var(--dark-btn-disabled-color)"
                saveDNSBtn.style.background = "var(--dark-btn-disabled-color)"
                DNSTextInfo.textContent = "DNS已锁定，如需更改请点击还原"
            } else {
                textarea.disabled = false
                saveDNSBtn.disabled = false
                textarea.style.background = ""
                saveDNSBtn.style.background = ""
                DNSTextInfo.textContent = ""
            }
            textarea.value = conf.content.trim();
        }
    }

    window.saveDNS = () => {
        save()
    }

    window.restoreDNS = () => {
        restore()
    }

    const modal = document.createElement('div')
    modal.classList.add('mask')
    modal.id = "DNSModal"
    modal.style.display = 'none'
    modal.innerHTML = html;

    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal('#DNSModal');
        }
    }

    document.querySelector('.container').appendChild(modal);

    const btn = document.createElement('button')
    btn.textContent = "自定义DNS"
    btn.onclick = async (e) => {
        await init()
        showModal('#DNSModal')
    }

    document.querySelector('.actions-buttons').appendChild(btn)
})();
//</script>
