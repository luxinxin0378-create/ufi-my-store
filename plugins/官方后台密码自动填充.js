//<script>
(() => {
    const method = "0" // 1是登录方式1 0是登录方式2，只有登录方式2才能用万能密码
    const password = "Wa@9w+YWRtaW4="

    //下面不用改
    const loginMethodEl = document.querySelector("#login_method")
    const pwdEl = document.querySelector("#PWDINPUT")
    loginMethodEl.value = method
    pwdEl.value = password
})()
//</script>