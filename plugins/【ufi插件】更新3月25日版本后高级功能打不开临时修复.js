//<script>
(() => {
    const refreshBtn_kano = document.createElement('button')
    refreshBtn_kano.classList.add('btn')
    refreshBtn_kano.textContent = "修复高级功能"

    const start = async () => {
        const res = JSON.stringify(await runShellWithUser(
            "sed -i 's/\\r$//' /data/data/com.minikano.f50_sms/files/samba_exec.sh"
        ))
        createToast('已修复，等待20s高级功能恢复正常就可以去更新了')
        createToast("结果：" + res)
    }

    refreshBtn_kano.onclick = start

    collapseBtn_menu.nextElementSibling.querySelector('.collapse_box').appendChild(refreshBtn_kano)
})()
//</script>