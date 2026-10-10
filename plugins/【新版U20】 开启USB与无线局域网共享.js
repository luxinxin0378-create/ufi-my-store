//<script>
(async () => {
    "use strict";

    const PLUGIN_ID = "kano_lan_share";
    const SH_DIR = "/data/kano_lan_share";
    const SH_FILE = `${SH_DIR}/kano_lan_share.sh`;
    const PID_FILE = `${SH_DIR}/kano_lan_share.pid`;
    const BOOT_FILE = "/sdcard/ufi_tools_boot.sh";

    // 允许无线网 192.168.88.0/24 主动访问 USB/有线网 192.168.99.0/24，
    // 有线侧仅放行已建立连接的返回流量。
    const RULE_WIFI_TO_USB =
        "-i wlan0 -o usb0 -s 192.168.88.0/24 -d 192.168.99.0/24 -j ACCEPT";
    const RULE_USB_RETURN =
        "-i usb0 -o wlan0 -s 192.168.99.0/24 -d 192.168.88.0/24 " +
        "-m state --state RELATED,ESTABLISHED -j ACCEPT";

    const SCRIPT_CONTENT = `#!/system/bin/sh
SH_DIR="${SH_DIR}"
PID_FILE="${PID_FILE}"

mkdir -p "$SH_DIR"

# 防止插件被重复启动后产生多个守护进程。
if [ -f "$PID_FILE" ]; then
    OLD_PID="$(cat "$PID_FILE" 2>/dev/null)"
    if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
        exit 0
    fi
fi

echo $$ > "$PID_FILE"
trap 'rm -f "$PID_FILE"' EXIT INT TERM

while true; do
    if iptables -nL fw_FORWARD >/dev/null 2>&1; then
        iptables -C fw_FORWARD ${RULE_WIFI_TO_USB} >/dev/null 2>&1 || \\
            iptables -I fw_FORWARD 1 ${RULE_WIFI_TO_USB}

        iptables -C fw_FORWARD ${RULE_USB_RETURN} >/dev/null 2>&1 || \\
            iptables -I fw_FORWARD 2 ${RULE_USB_RETURN}
    fi
    sleep 20
done
`;

    const checkRoot = async () => {
        try {
            const res = await runShellWithRoot("whoami");
            return Boolean(res && res.success && res.content.includes("root"));
        } catch (_) {
            return false;
        }
    };

    const uploadFile = async (filename, content, destPath) => {
        try {
            const file = new File([content], filename, { type: "text/plain" });
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`${KANO_baseURL}/upload_img`, {
                method: "POST",
                headers: common_headers,
                body: formData,
            });
            const uploadRes = await response.json();

            // 上传接口返回的路径属于外部数据，只接受普通文件路径字符。
            if (!uploadRes.url || !/^\/[A-Za-z0-9._/-]+$/.test(uploadRes.url)) {
                return false;
            }

            const tempPath = `/data/data/com.minikano.f50_sms/files${uploadRes.url}`;
            const moveRes = await runShellWithRoot(
                `mv '${tempPath}' '${destPath}' && chmod 700 '${destPath}'`
            );
            return Boolean(moveRes && moveRes.success);
        } catch (_) {
            return false;
        }
    };

    const applyRulesOnce = async () => {
        return runShellWithRoot(`
iptables -C fw_FORWARD ${RULE_WIFI_TO_USB} >/dev/null 2>&1 || \\
    iptables -I fw_FORWARD 1 ${RULE_WIFI_TO_USB}
iptables -C fw_FORWARD ${RULE_USB_RETURN} >/dev/null 2>&1 || \\
    iptables -I fw_FORWARD 2 ${RULE_USB_RETURN}
`);
    };

    const removeRules = async () => {
        return runShellWithRoot(`
while iptables -C fw_FORWARD ${RULE_WIFI_TO_USB} >/dev/null 2>&1; do
    iptables -D fw_FORWARD ${RULE_WIFI_TO_USB}
done
while iptables -C fw_FORWARD ${RULE_USB_RETURN} >/dev/null 2>&1; do
    iptables -D fw_FORWARD ${RULE_USB_RETURN}
done
`);
    };

    const stopWatcher = async () => {
        await runShellWithRoot(`
if [ -f '${PID_FILE}' ]; then
    PID="$(cat '${PID_FILE}' 2>/dev/null)"
    [ -n "$PID" ] && kill "$PID" 2>/dev/null
fi
rm -f '${PID_FILE}'
`);
    };

    const installPersistent = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return;
        }

        createToast("正在安装局域网共享守护脚本……");

        const mkdirRes = await runShellWithRoot(`mkdir -p '${SH_DIR}'`);
        if (!mkdirRes || !mkdirRes.success) {
            createToast("创建插件目录失败！", "red");
            return;
        }

        await stopWatcher();

        if (!(await uploadFile("kano_lan_share.sh", SCRIPT_CONTENT, SH_FILE))) {
            createToast("传输守护脚本失败！", "red");
            return;
        }

        const startRes = await runShellWithRoot(`
touch '${BOOT_FILE}'
grep -qxF "sh ${SH_FILE} >/dev/null 2>&1 &" '${BOOT_FILE}' || \\
    echo "sh ${SH_FILE} >/dev/null 2>&1 &" >> '${BOOT_FILE}'
sh '${SH_FILE}' >/dev/null 2>&1 &
sync
`);

        if (!startRes || !startRes.success) {
            createToast("启动守护脚本失败！", "red");
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 600));
        await refreshStatus();
        createToast("局域网共享已开启，并已设置开机自启！");
    };

    const enableOnce = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return;
        }
        const res = await applyRulesOnce();
        await refreshStatus();
        createToast(
            res && res.success ? "局域网共享已临时开启！" : "添加规则失败！",
            res && res.success ? undefined : "red"
        );
    };

    const disableAndUninstall = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return;
        }

        createToast("正在关闭局域网共享……");
        await stopWatcher();
        await runShellWithRoot(`
sed -i '/kano_lan_share\\.sh/d' '${BOOT_FILE}' 2>/dev/null
`);
        await removeRules();
        await runShellWithRoot(`rm -rf '${SH_DIR}'; sync`);
        await refreshStatus();
        createToast("局域网共享已关闭，自启配置已移除！");
    };

    let statusEl = null;

    const getStatus = async () => {
        const res = await runShellWithRoot(`
iptables -C fw_FORWARD ${RULE_WIFI_TO_USB} >/dev/null 2>&1
R1=$?
iptables -C fw_FORWARD ${RULE_USB_RETURN} >/dev/null 2>&1
R2=$?
grep -qF '${SH_FILE}' '${BOOT_FILE}' 2>/dev/null
BOOT=$?
RUN=1
if [ -f '${PID_FILE}' ]; then
    PID="$(cat '${PID_FILE}' 2>/dev/null)"
    [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null && RUN=0
fi
echo "R1=$R1 R2=$R2 BOOT=$BOOT RUN=$RUN"
`);

        const text = res && res.content ? res.content : "";
        const match = text.match(/R1=(\d+)\s+R2=(\d+)\s+BOOT=(\d+)\s+RUN=(\d+)/);
        if (!match) {
            return { readable: false };
        }
        return {
            readable: true,
            rules: match[1] === "0" && match[2] === "0",
            boot: match[3] === "0",
            running: match[4] === "0",
        };
    };

    async function refreshStatus() {
        if (!statusEl) return;
        statusEl.textContent = "正在读取状态……";
        try {
            const status = await getStatus();
            if (!status.readable) {
                statusEl.textContent = "状态：读取失败";
                statusEl.style.color = "#ff7b7b";
                return;
            }
            const enabled = status.rules;
            statusEl.textContent =
                `状态：${enabled ? "已开启" : "已关闭"} ｜ ` +
                `守护进程：${status.running ? "运行中" : "未运行"} ｜ ` +
                `开机自启：${status.boot ? "已设置" : "未设置"}`;
            statusEl.style.color = enabled ? "#77e39b" : "#ffcf70";
        } catch (_) {
            statusEl.textContent = "状态：读取失败";
            statusEl.style.color = "#ff7b7b";
        }
    }

    const makeButton = (text, handler) => {
        const button = document.createElement("button");
        button.textContent = text;
        button.onclick = async () => {
            button.disabled = true;
            try {
                await handler();
            } finally {
                button.disabled = false;
            }
        };
        return button;
    };

    if (document.getElementById(`${PLUGIN_ID}_button`)) return;

    const mainBtn = document.createElement("button");
    mainBtn.id = `${PLUGIN_ID}_button`;
    mainBtn.textContent = "局域网共享";
    mainBtn.onclick = async () => {
        const { id, el } = createModal({
            name: PLUGIN_ID,
            title: "局域网共享",
            maxWidth: "460px",
            onClose: () => true,
            onConfirm: () => true,
            content: `
                <div style="display:flex;gap:12px;flex-direction:column">
                    <div class="title" style="font-size:.7rem">无线访问有线</div>
                    <div style="font-size:.68rem;line-height:1.6;opacity:.85">
                        允许 192.168.88.x 无线设备访问 192.168.99.x USB/有线设备；
                        有线侧只允许返回已经建立的连接。
                    </div>
                    <div class="lan_share_status" style="font-size:.68rem">正在读取状态……</div>
                    <div class="lan_share_actions" style="display:flex;gap:10px;flex-wrap:wrap"></div>
                </div>
            `,
        });

        statusEl = el.querySelector(".lan_share_status");
        const actions = el.querySelector(".lan_share_actions");
        actions.appendChild(makeButton("永久开启", installPersistent));
        actions.appendChild(makeButton("临时开启", enableOnce));
        actions.appendChild(makeButton("关闭并移除自启", disableAndUninstall));
        actions.appendChild(makeButton("刷新状态", refreshStatus));

        showModal(id);
        await refreshStatus();
    };

    const mount = document.querySelector(".actions-buttons");
    if (!mount) {
        createToast("未找到插件按钮区域，局域网共享插件加载失败！", "red");
        return;
    }
    mount.appendChild(mainBtn);
})();
//</script>
