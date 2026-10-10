//<script>
(() => {
    const refreshBtn_kano = document.createElement('button')
    refreshBtn_kano.classList.add('btn')
    refreshBtn_kano.textContent = "双卡双待自启"
    let status = false

    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami')
        if (res.content) {
            if (res.content.includes('root')) {
                return true
            }
        }
        return false
    }

    const togglePM = async (flag = false) => {
        try {
            if (flag) {
                await runShellWithRoot(`/data/data/com.minikano.f50_sms/files/zreq -pwd Wa@9w+YWRtaW4= -method POST -body "goformId=CAR_MODE_SETTING&car_mode_dual_sim_switch=1"`)
                await runShellWithRoot(`grep -qxF '(sleep 15 && /data/data/com.minikano.f50_sms/files/zreq -pwd Wa@9w+YWRtaW4= -method POST -body "goformId=CAR_MODE_SETTING&car_mode_dual_sim_switch=1")&' /sdcard/ufi_tools_boot.sh || echo '(sleep 15 && /data/data/com.minikano.f50_sms/files/zreq -pwd Wa@9w+YWRtaW4= -method POST -body "goformId=CAR_MODE_SETTING&car_mode_dual_sim_switch=1")&' >> /sdcard/ufi_tools_boot.sh`)
                createToast('已开启双卡双待+自启动')

            }
            else {
                await runShellWithRoot(`/data/data/com.minikano.f50_sms/files/zreq -pwd Wa@9w+YWRtaW4= -method POST -body "goformId=CAR_MODE_SETTING&car_mode_dual_sim_switch=0"`)
                await runShellWithRoot(`sed -i '/car_mode_dual_sim_switch/d' /sdcard/ufi_tools_boot.sh`)
                createToast('已关闭双卡双待+自启动')
            }
        } catch {
            createToast('切换失败')
        }
    }

    const init = async () => {
        const res = await runShellWithRoot(`
        grep -q 'car_mode_dual_sim_switch' /sdcard/ufi_tools_boot.sh
        echo $?
        `)
        if (res.content) {
            if (res.content.trim() == '0') {
                status = true
                refreshBtn_kano.style.backgroundColor = 'var(--dark-btn-color-active)'
            }
        }
    }

    const start = async () => {
        const canUse = await checkAdvanceFunc()
        if (!canUse) {
            createToast('请先打开高级功能')
            return
        }
        if (status) {
            await togglePM(false)
            status = false
            refreshBtn_kano.style.backgroundColor = ''
        }
        else {
            await togglePM(true)
            status = true
            refreshBtn_kano.style.backgroundColor = 'var(--dark-btn-color-active)'
        }
    }

    refreshBtn_kano.onclick = start

    collapseBtn_menu.nextElementSibling.querySelector('.collapse_box').appendChild(refreshBtn_kano)

    let r = setInterval(() => {
        if (UFI_DATA.loginfo != "ok") return
        init()
        clearInterval(r)
    }, 300);
})()
//</script>