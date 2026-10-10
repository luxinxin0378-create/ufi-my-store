//<script>
(async () => {
    const checkRoot = async () => {
        try {
            const res = await runShellWithRoot('whoami');
            return res.success && res.content.includes('root');
        } catch {
            return false;
        }
    };

    const switchDataCard = async (slot = 1) => {
        createToast("切换中...");
        const simSubIds = await getSimSubIds();
        if (simSubIds[slot] === undefined) {
            createToast("获取SIM卡信息失败！", "red");
            return;
        }
        await runShellWithRoot(`service call isub 33 i32 ${simSubIds[slot]}`);
        select.value = slot
    };

    const getSimSubIds = async () => {
        try { return (await (await fetchWithTimeout("/api/getSubIds")).json()).subIds } catch { }
    }

    const select = document.createElement('select');
    select.classList.add('select')
    const option = document.createElement('option');
    const option2 = document.createElement('option');
    option.value = "0";
    option.textContent = "SIM1";
    option.dataset.i18n = "sim1";
    option2.value = "1";
    option2.textContent = "SIM2";
    option2.dataset.i18n = "sim2";
    select.appendChild(option);
    select.appendChild(option2);

    let count = 0;
    const stop = setInterval(async () => {
        if ((UFI_DATA.loginfo == "ok" && UFI_DATA.sim_slot) || count++ > 20) {
            select.value = UFI_DATA.sim_slot;
            count = 0;
            clearInterval(stop);
        }
        console.log("Waiting for loginfo...");
    }, 300)

    select.onchange = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return;
        }

        select.disabled = true;
        try {
            if (select.value.trim() != "0" && select.value.trim() != "1") return
            await switchDataCard(select.value.trim());
        } finally {
            select.disabled = false;
        }
    };

    document.querySelector('.actions-buttons').appendChild(select);
})();
//</script>