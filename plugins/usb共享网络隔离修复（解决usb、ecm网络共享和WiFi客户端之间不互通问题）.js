//<script>
(async () => {
    const BOOT_FILE = '/sdcard/ufi_tools_boot.sh';
    const RULE = `nohup sh -c 'U=$(cat /config/usb_gadget/g1/UDC); M=$(printf "02:%02x:%02x:%02x:%02x:%02x" $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256))); ifconfig usb0 down; ip link set usb0 address $M; ifconfig usb0 up; ip neigh flush all; echo "" > /config/usb_gadget/g1/UDC; sleep 2; [ -n "$(cat /config/usb_gadget/g1/UDC)" ] || echo $U > /config/usb_gadget/g1/UDC' >/dev/null 2>&1 & #kano_usb_network_isolation_fix`;
    const RULE_B64 = btoa(RULE); 
    const BOOT_LINE = `echo '${RULE_B64}' | base64 -d | sh #kano_usb_network_isolation_fix`;
    const BOOT_LINE_B64 = btoa(BOOT_LINE + '\n'); 

    const checkRoot = async () => {
        try {
            const res = await runShellWithRoot('whoami');
            return res.success && res.content.includes('root');
        } catch {
            return false;
        }
    };

    const isEnabled = async () => {
        try {
            const res = await runShellWithRoot(`grep -h 'kano_usb_network_isolation_fix' ${BOOT_FILE} 2>/dev/null`);
            return res.success && res.content.trim() !== '';
        } catch {
            return false;
        }
    };

    const enableHardwareForward = async () => {
        createToast("开启中...");
        await runShellWithRoot(`grep -q 'kano_usb_network_isolation_fix' ${BOOT_FILE} 2>/dev/null || { [ -s ${BOOT_FILE} ] && [ -n "$(tail -c1 ${BOOT_FILE})" ] && echo >> ${BOOT_FILE}; echo '${BOOT_LINE_B64}' | base64 -d >> ${BOOT_FILE}; }`);
        createToast("已开启USB网络隔离修复,重启生效");
        createToast("已设置开机自动应用");
    };

    const disableHardwareForward = async () => {
        createToast("关闭中...");
        await runShellWithRoot(`sed -i '/kano_usb_network_isolation_fix/d' ${BOOT_FILE}`);
        createToast("已关闭USB网络隔离修复,重启生效");
        createToast("已取消开机自动应用");
    };

    const btn = document.createElement('button');

    const refreshButtonText = async () => {
        btn.textContent = "启用USB网络隔离修复";
        btn.style.background = (await isEnabled()) ? 'var(--dark-btn-color-active)' : ""
    };

    btn.onclick = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return;
        }

        btn.disabled = true;
        try {
            if (await isEnabled()) {
                await disableHardwareForward();
            } else {
                await enableHardwareForward();
            }
            await refreshButtonText();
        } finally {
            btn.disabled = false;
        }
    };

    await refreshButtonText();
    document.querySelector('.actions-buttons').appendChild(btn);
})();
//</script>