//<script>
(() => {
    const wrap = (p) => new Proxy(p, {
        get(t, prop, r) {
            if (prop === "lan_ipaddr") return location.hostname;
            return Reflect.get(t, prop, r);
        },
        set(t, prop, val, r) {
            if (prop === "lan_ipaddr") return true; // 吞掉覆盖
            return Reflect.set(t, prop, val, r);
        }
    });

    const installUfiHook = () => {
        // 如果已经是我们包过的，就别重复包
        const already = window.UFI_DATA;
        let _val = already ? wrap(already) : undefined;

        // 有些页面把 UFI_DATA 定义成不可配置，这里要 try
        try {
            Object.defineProperty(window, "UFI_DATA", {
                configurable: true,
                get() { return _val; },
                set(v) { _val = wrap(v); }
            });

            // 关键：定义完后，把当前值再写回去一次，确保 getter 里不空
            if (already) window.UFI_DATA = already;
        } catch {
            // 如果不可 redefine，那就只能退化为：直接替换一次（不保证后续重新赋值还能拦）
            try { window.UFI_DATA = _val; } catch { }
        }
    };
    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami')
        if (res.content) {
            if (res.content.includes('root')) {
                return true
            }
        }
        return false
    }
    let hasDoneTtydFix = false
    let hasDoneIframeFix = false
    let hasDoneFix = false
    let oHostName = null
    let installed = false
    let interval = setInterval(async () => {
        if (UFI_DATA.loginfo != "ok") { return }
        //补齐参数
        if (UFI_DATA) {
            if (!oHostName) {
                oHostName = UFI_DATA.lan_ipaddr
            }
            if (!installed) {
                installUfiHook();
                installed = true
            }
            // UFI_DATA.lan_ipaddr = location.hostname
        }
        //修复TTYD
        const ttyd = document.querySelector("#TTYD iframe")
        if (ttyd && !hasDoneTtydFix) {
            ttyd.src = `http://${location.hostname}:1146`
            hasDoneTtydFix = true
        }
        const IFRAME = document.querySelector(".container iframe")
        if (IFRAME && !hasDoneIframeFix) {
            const src = IFRAME.src.replace(oHostName, location.hostname)
            IFRAME.src = src
            hasDoneIframeFix = true
        }
        if (runShellWithRoot && !hasDoneFix) {
            if (await checkAdvanceFunc()) {
                await runShellWithRoot(`chmod -R 777 /data/data/com.minikano.f50_sms/files/uploads`)
                hasDoneFix = true
            }
        }

        if (hasDoneFix && hasDoneIframeFix && hasDoneTtydFix && installed && oHostName) {
            console.log("清除定时器");
            clearInterval(interval);
        }
    }, 500)
})()
//</script >