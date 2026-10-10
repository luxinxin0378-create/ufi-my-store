//<script>
(async () => {
    const BOOT_FILE = '/sdcard/ufi_tools_boot.sh';
    const RULE = 'echo 0 > /proc/net/sfp/enable &';

    const checkRoot = async () => {
        try {
            const res = await runShellWithRoot('whoami');
            return res.success && res.content.includes('root');
        } catch {
            return false;
        }
    };

    const isDisabled = async () => {
        try {
            const res = await runShellWithRoot(`awk '{print $1}' /proc/net/sfp/enable`);
            return res.success && res.content.trim() === '0';
        } catch {
            return false;
        }
    };

    const enableHardwareForward = async () => {
        createToast("开启中...");
        await runShellWithRoot(`sed -i '\\|/proc/net/sfp/enable|d' ${BOOT_FILE}`);
        await runShellWithRoot(`echo 1 > /proc/net/sfp/enable`);
        createToast("已开启硬件转发");
        createToast("已取消开机自动应用");
    };

    const disableHardwareForward = async () => {
        createToast("关闭中...");
        await runShellWithRoot(`grep -qxF '${RULE}' ${BOOT_FILE} 2>/dev/null || echo '${RULE}' >> ${BOOT_FILE}`);
        await runShellWithRoot(`echo 0 > /proc/net/sfp/enable`);
        createToast("已禁用硬件转发");
        createToast("已设置开机自动应用");
    };

    const btn = document.createElement('button');

    const refreshButtonText = async () => {
        btn.textContent = (await isDisabled()) ? "启用硬件转发" : "禁用硬件转发";
        btn.style.background = (await isDisabled()) ? 'var(--dark-btn-color-active)' : ""
    };

    btn.onclick = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return;
        }

        btn.disabled = true;
        try {
            if (await isDisabled()) {
                await enableHardwareForward();
            } else {
                await disableHardwareForward();
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