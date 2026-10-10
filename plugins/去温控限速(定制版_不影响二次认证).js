<script>
    (async () => {
        const SH_DIR = "/data/fuck_zte_net_limit"
        const SH_FILE = "/data/fuck_zte_net_limit/fuck_zte.sh"
        const BOOT_SH_FILE = "/sdcard/ufi_tools_boot.sh"
        const SCRIPT_CONTENT = `#!/system/bin/sh
settings put global sim_network_limit 1:0
settings put global restrict_device_data_connect 0
umount /system/bin/tc 2>/dev/null
disable_tc() {
    tc qdisc del dev sipa_eth0 root 2>/dev/null
    tc qdisc del dev sipa_eth8 root 2>/dev/null
    for dev in $(ls /sys/class/net); do

        case "$dev" in
            lo)
                continue
                ;;
        esac

        tc qdisc del dev $dev root 2>/dev/null
        tc qdisc del dev $dev ingress 2>/dev/null

    done
}

if [ -d /data/fuck_zte_net_limit ]; then
    rm -f /data/fuck_zte_net_limit/tc
fi

disable_tc &
disable_tc &

touch /data/fuck_zte_net_limit/tc

mount --bind /data/fuck_zte_net_limit/tc /system/bin/tc

pm disable com.zte.zdm
pm uninstall -k --user 0 com.zte.zdm
pm uninstall -k --user 0 cn.zte.aftersale
pm uninstall -k --user 0 com.zte.zdmdaemon
pm uninstall -k --user 0 com.zte.zdmdaemon.install
pm uninstall -k --user 0 com.zte.analytics
pm uninstall -k --user 0 com.zte.neopush
settings put global sim_network_limit 1:0
settings put global restrict_device_data_connect 0
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
        grep -q 'fuck_zte.sh' /sdcard/ufi_tools_boot.sh
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
        const uninstall = async () => {
            if (!(await checkRoot())) {
                createToast("没有开启高级功能，无法使用！", "red");
                return false;
            }
            createToast("卸载中...")
            await runShellWithRoot(`sed -i '/fuck_zte/d' /sdcard/ufi_tools_boot.sh`)
            await runShellWithRoot(`
            umount /system/etc/hosts 2>/dev/null
            umount /system/bin/tc 2>/dev/null
            `)
            await runShellWithRoot(`rm -rf ${SH_FILE}`)
            await runShellWithRoot(`rm -rf ${SH_DIR}`)

            isBtn1Disabled = false
            isBtnDisabled = false
            return createToast("已移除去云控,重启后生效")
        }

        //安装
        const install = async () => {
            if (!(await checkRoot())) {
                return createToast("没有开启高级功能，无法使用！", "red");
            }

            if (await checkIsBootUp()) {
                return createToast("你已经安装了！", "red")
            }

            if (!(await runShellWithRoot(`mkdir -p ${SH_DIR}`)).success) {
                return createToast("创建文件夹失败！", "red")
            }
            //上传
            if (!await uploadFile("fuck_zte.sh", SCRIPT_CONTENT, SH_FILE)) {
                return createToast("传输文件失败！", "red")
            }
            await runShellWithRoot(`grep -qxF 'sh ${SH_FILE} &' /sdcard/ufi_tools_boot.sh || echo 'sh ${SH_FILE} &' >> /sdcard/ufi_tools_boot.sh`)
            await runShellWithRoot(`sh ${SH_FILE} &`)
            createToast("已屏蔽云控域名！")
            createToast("已禁止OTA更新！")
            createToast("已去除所有限速！")
            createToast("已设置开机自启！")
        }

        const btn = document.createElement('button')
        btn.textContent = "启用去云控"
        btn.onclick = async (e) => {
            await install()
        }

        const btn1 = document.createElement('button')
        btn1.textContent = "移除去云控"

        btn1.onclick = async (e) => {
            await uninstall()
        }
        document.querySelector('.actions-buttons').appendChild(btn)
        document.querySelector('.actions-buttons').appendChild(btn1)
    })();
</script>