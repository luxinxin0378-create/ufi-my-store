//<script>
(async () => {
    const CONFIG_FILE = "/sdcard/kano_charge_control_config.conf"
    const SH_FILE = "/sdcard/kano_charge_control.sh"
    const LOG_FILE = "/sdcard/kano_charge_control_log.log"
    const BOOT_SH_FILE = "/sdcard/ufi_tools_boot.sh"
    const NAME = "kano_charge_control"
    //配置
    let CONFIG = {
        enabled: false,
        max_charge: 80,
        start_charge: 1
    }

    const SCRIPT_CONTENT = `#!/system/bin/sh
CONFIG_FILE="${CONFIG_FILE}"
LOG_FILE="${LOG_FILE}"
CHECK_INTERVAL=5  # 定时检测电量的间隔（秒）

CHARGE_PATHS=(
  "/sys/devices/platform/charger-manager/power_supply/battery/charger.0/stop_charge"
  "/sys/class/power_supply/battery/charger.0/stop_charge"
  "/sys/class/power_supply/interface/battery_charging_enabled"
  "/sys/class/zte_power_supply/zte_battery/battery_charging_enabled"
  "/sys/class/power_supply/battery/battery_charging_enabled"
)

BATTERY_STATUS_PATH="/sys/class/power_supply/battery/status"
CAPACITY_PATH="/sys/class/power_supply/battery/capacity"

rm -rf "$LOG_FILE"

is_magisk_env() {
    [ -d /sbin/.magisk ] || command -v magisk >/dev/null
}

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
}

get_current_switch_state() {
    for path in "\${CHARGE_PATHS[@]}"; do
        if [ -r "$path" ]; then
            state=$(cat "$path" 2>/dev/null)
            if [ "$state" = "0" ] || [ "$state" = "1" ]; then
                case "$path" in
                    *stop_charge)
                        if [ "$state" = "1" ]; then
                            echo "0"
                        else
                            echo "1"
                        fi
                        ;;
                    *)
                echo "$state"
                        ;;
                esac
                return
            fi
        fi
    done
    echo "-1"
}

get_physical_charging_status() {
    if [ -r "$BATTERY_STATUS_PATH" ]; then
        status=$(cat "$BATTERY_STATUS_PATH" 2>/dev/null)
        case "$status" in
            "Charging"|"Full") echo "1" ;;
            "Discharging") echo "0" ;;
            *) echo "-1" ;;
        esac
    else
        echo "-1"
    fi
}

apply_switch_state() {
    target="$1"
    for path in "\${CHARGE_PATHS[@]}"; do
        if [ -w "$path" ]; then
            real_target="$target"
            case "$path" in
                *stop_charge)
                    if [ "$target" = "1" ]; then
                        real_target="0"
                    else
                        real_target="1"
                    fi
                    ;;
            esac
            echo "$real_target" > "$path"
            sleep 0.1
            if [ "$(cat "$path" 2>/dev/null)" = "$real_target" ]; then
                log "充电开关已设置为 $target"
                return
            fi
        fi
    done
    log "未能成功设置充电开关为 $target"
}

handle_charging_logic() {
    if [ ! -f "$CONFIG_FILE" ]; then
        log "配置文件不存在：$CONFIG_FILE"
        return
    fi

    MAX_CHARGE=$(grep '^max_charge=' "$CONFIG_FILE" | cut -d= -f2)
    START_CHARGE=$(grep '^start_charge=' "$CONFIG_FILE" | cut -d= -f2)

    if [ -z "$MAX_CHARGE" ] || [ -z "$START_CHARGE" ]; then
        log "配置文件格式错误"
        return
    fi

    if [ ! -f "$CAPACITY_PATH" ]; then
        log "无法读取电池容量"
        return
    fi

    CAPACITY=$(cat "$CAPACITY_PATH")
    CURRENT_SWITCH_STATE=$(get_current_switch_state)
    CURRENT_PHYSICAL_CHARGING=$(get_physical_charging_status)

    TARGET_SWITCH_STATE=$CURRENT_SWITCH_STATE

    # 区间逻辑
    if [ "$CAPACITY" -ge "$MAX_CHARGE" ]; then
        TARGET_SWITCH_STATE=0          # 强制关闭
    elif [ "$CAPACITY" -ge "$START_CHARGE" ] && [ "$CAPACITY" -lt "$MAX_CHARGE" ]; then
        TARGET_SWITCH_STATE=1          # 阈值强制开启
    else
        TARGET_SWITCH_STATE=$CURRENT_SWITCH_STATE  # 低于 start_charge，不干预
    fi

    # 插入充电器时，在阈值允许充电
    if [ "$LAST_PHYSICAL_CHARGING" = "0" ] && [ "$CURRENT_PHYSICAL_CHARGING" = "1" ]; then
        log "检测到插入充电器，电量 $CAPACITY%"
        if [ "$CAPACITY" -gt "$START_CHARGE" ] && [ "$CAPACITY" -lt "$MAX_CHARGE" ]; then
            TARGET_SWITCH_STATE=1
        fi
    fi

    if [ "$TARGET_SWITCH_STATE" != "$CURRENT_SWITCH_STATE" ] && [ "$TARGET_SWITCH_STATE" != "-1" ]; then
        if [ "$TARGET_SWITCH_STATE" = "0" ]; then
            # 关闭充电的原因
            if [ "$CAPACITY" -ge "$MAX_CHARGE" ]; then
                REASON="电量 $CAPACITY% >= 最大 $MAX_CHARGE%，强制关闭充电"
            else
                REASON="其他原因触发关闭充电"
            fi
            log "准备关闭充电：$REASON"
        else
            # 开启充电的原因
            if [ "$CAPACITY" -ge "$START_CHARGE" ] && [ "$CAPACITY" -lt "$MAX_CHARGE" ]; then
                REASON="电量 $CAPACITY% 在区间 $START_CHARGE%~$MAX_CHARGE%，强制开启充电"
            else
                REASON="其他原因触发开启充电"
            fi
            log "准备开启充电：$REASON"
        fi
        apply_switch_state "$TARGET_SWITCH_STATE"
    fi

    LAST_PHYSICAL_CHARGING=$CURRENT_PHYSICAL_CHARGING
}

LAST_PHYSICAL_CHARGING=$(get_physical_charging_status)
log "充电控制脚本启动..."

# 启动 inotifyd 监听
inotify_callback() {
    log "检测到充电状态文件变化"
    handle_charging_logic
}

# 创建 FIFO 路径
TMP_DIR="/data/local/tmp"
FIFO="$TMP_DIR/inotify_pipe"
rm -f "$FIFO"
mkfifo "$FIFO"

# 启动 inotifyd，根据环境选择参数
if is_magisk_env; then
    log "检测到 Magisk 环境,正常启动"
    # Magisk busybox inotifyd 用法: inotifyd <handler> <file>:<events>
    inotifyd /system/bin/sh -c "echo event >> $FIFO" "$BATTERY_STATUS_PATH:m" &
else
    log "非 Magisk 环境,正常启动"
    inotifyd "$FIFO":"$BATTERY_STATUS_PATH" &
fi

# 读取 FIFO，文件变化时触发回调
(
    while read -r event; do
        inotify_callback
    done < "$FIFO"
) &

# 定时检测
while true; do
    handle_charging_logic
    sleep "$CHECK_INTERVAL"
done`

    const html = `
<div class="title" style="justify-content:space-between">
    <span>充电控制器-老头乐</span>
    <button onclick="showHelp()" style="border-radius: 50%">?</button>
    </div>
<div class="content" style="max-height: 90%;font-size:14px;overflow-y: scroll; padding-top: 10px;">
    <span>自动模式</span>
    <div style="margin-top: 8px;display: inline-block;" id="collapse_charge_plugin_btn"></div>
    <button style="margin-left: 6px;" onclick="disable_charge()">关闭充电</button>
    <button onclick="enable_charge()">启用充电</button>
    <div id="collapse_charge_plugin" class="collapse" data-name="close" style="height: 0px; overflow: auto;">
        <div class="collapse_box" style="overflow:hidden">
            <div style="margin: 10px 0;display:flex;justify-content:space-between;align-items:center">
                <span style="min-width: 6em;">定量停充(%):</span><input id="stop_charge_val" style="flex:1;width:100%" type="range" id="charge-threshold" min="1" max="100" value="20"><span id="stop_charge_label" style="min-width: 4em">20 %</span>
            </div>
            <div style="display:flex;gap:10px;margin-bottom:10px">
                <button onclick="submit_charge_settings()" style="flex:1" data-i18n="submit_btn">提交</button>
            </div>
            
            <div style="box-sizing:border-box">
                <div class="title" style="font-size:14px;margin-bottom:10px">日志</div>
                <textarea id="charger_log" disabled style="margin-bottom:10px;border:none;box-sizing:border-box;width:100%;min-height:100px"></textarea>
            </div>
        </div>
    </div>
</div>
<div class="btn" style="text-align: right;margin-top:6px;">
    <button type="button" onclick="close_charge_settings()" data-i18n="close_btn">关闭</button>
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

    // 切换充电状态
    const toggleCharge = async (enableCharge) => {
        try {
            const flag = enableCharge ? "1" : "0";
            const res = await runShellWithRoot(`
                    [ -w /sys/devices/platform/charger-manager/power_supply/battery/charger.0/stop_charge ] && echo ${enableCharge ? "0" : "1"} > /sys/devices/platform/charger-manager/power_supply/battery/charger.0/stop_charge
                    [ -w /sys/class/power_supply/battery/charger.0/stop_charge ] && echo ${enableCharge ? "0" : "1"} > /sys/class/power_supply/battery/charger.0/stop_charge
                    [ -w /sys/class/power_supply/interface/battery_charging_enabled ] && echo ${flag} > /sys/class/power_supply/interface/battery_charging_enabled
                    [ -w /sys/class/zte_power_supply/zte_battery/battery_charging_enabled ] && echo ${flag} > /sys/class/zte_power_supply/zte_battery/battery_charging_enabled
                    [ -w /sys/class/power_supply/battery/battery_charging_enabled ] && echo ${flag} > /sys/class/power_supply/battery/battery_charging_enabled
                `);
            return res.success;
        } catch (e) {
            return false;
        }
    };

    //获取设置
    const getConfig = async () => {
        if (!(await checkRoot())) {
            return false;
        }
        const res = await runShellWithRoot(`timeout 2s  awk \'{print}\' ${CONFIG_FILE}`);
        const res1 = await runShellWithRoot(`timeout 2s  awk \'{print}\' ${BOOT_SH_FILE}`);
        if (res.success) {
            const configText = res.content
            const maxMatch = configText.match(/max_charge=(\d+)/);
            const startMatch = configText.match(/start_charge=(\d+)/);

            const maxCharge = maxMatch ? parseInt(maxMatch[1], 10) : null;
            const startCharge = startMatch ? parseInt(startMatch[1], 10) : null;

            if (maxCharge) {
                CONFIG.max_charge = maxCharge
            }
            if (startCharge) {
                CONFIG.start_charge = startCharge
            }
        }
        if (res1) {
            let enabled = res1.content.includes(NAME)
            CONFIG.enabled = enabled
            localStorage.setItem('collapse_charge_plugin', enabled ? 'open' : 'close')
        }
    }


    //获取日志
    let oldLog = null
    const getLog = async () => {
        if (!(await checkRoot())) {
            return false;
        }
        const charger_log = document.querySelector('#charger_log')
        if (charger_log) {
            let res = await runShellWithRoot(`timeout 2s  awk \'{print}\' ${LOG_FILE}`);
            if ((res.content != oldLog) || (oldLog == null)) {
                setTimeout(() => {
                    // 滚动到最底部
                    charger_log.scrollTo({
                        top: charger_log.scrollHeight,
                        behavior: "smooth"
                    })
                }, 100);
            }
            oldLog = res.content
            charger_log.value = res.content
        }
    }

    //杀死指定进程
    const killProcessByName = async (processName) => {
        const psResult = await runShellWithRoot(`ps -ef | grep "${processName}" | grep -v grep`);
        const lines = psResult.content.trim().split('\n');

        if (lines.length === 0 || (lines.length === 1 && lines[0].trim() === '')) {
            return {
                success: false,
                content: "未找到相关进程"
            };
        }

        let killed = 0;

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[1];
            const name = parts.slice(2).join(' ');
            if (pid && /^\d+$/.test(pid)) {
                const res = await runShellWithRoot(`kill ${pid}`);
                killed++;
            }
        }

        if (killed === 0) {
            return {
                success: false,
                content: "未找到可杀死的进程"
            };
        } else {
            return {
                success: true,
                content: `已杀死 ${killed} 个进程`
            };
        }
    };

    //设置阈值
    const setRange = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return false;
        }
        //清除日志
        await runShellWithRoot(`timeout 2s  echo "max_charge=${CONFIG.max_charge}\nstart_charge=${CONFIG.start_charge}" > ${CONFIG_FILE}`);
        const charger_log = document.querySelector('#charger_log')
        await killProcessByName(NAME)
        await runShellWithRoot(`/system/bin/sh ${SH_FILE} &`)
        createToast("设置成功，等待日志刷新...")
    }

    //卸载
    const uninstall = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return false;
        }
        await runShellWithRoot(`sed -i '/kano_charge_control/d' /sdcard/ufi_tools_boot.sh`)
        await runShellWithRoot(`rm -rf ${CONFIG_FILE}`)
        await runShellWithRoot(`rm -rf ${SH_FILE}`)
        await runShellWithRoot(`rm -rf ${LOG_FILE}`)
        await killProcessByName(NAME)
        createToast("正在恢复充电模式")
        await toggleCharge(true)
        createToast("充电模式已恢复")
        return createToast("脚本已停用")
    }

    //安装
    const install = async () => {
        if (!(await checkRoot())) {
            createToast("没有开启高级功能，无法使用！", "red");
            return false;
        }
        //上传
        if (!await uploadFile("kano_charge_control.sh", SCRIPT_CONTENT, SH_FILE)) {
            return createToast("传输文件失败！", "red")
        }
        await runShellWithRoot(`grep -qxF '/system/bin/sh ${SH_FILE} &' /sdcard/ufi_tools_boot.sh || echo '/system/bin/sh ${SH_FILE} &' >> /sdcard/ufi_tools_boot.sh`)
        await runShellWithRoot(`/system/bin/sh ${SH_FILE} &`)
        return createToast("已启用并设为自启动")
    }

    window.submit_charge_settings = async () => {
        if (Number(CONFIG.max_charge) <= Number(CONFIG.start_charge)) {
            return createToast("触发充电值必须大于1%", 'red')
        }
        await setRange()
    }

    window.enable_charge = async () => {
        if(CONFIG.enabled){
            return createToast("请先关闭自动模式", "red")
        }
        await toggleCharge(true)
        createToast("设置成功")
    }
    window.disable_charge = async () => {
        if(CONFIG.enabled){
            return createToast("请先关闭自动模式", "red")
        }
        await toggleCharge(false)
        createToast("设置成功")
    }

    const initWindow = async () => {
        const stop_charge_val = document.querySelector('#stop_charge_val')

        if (stop_charge_val) {
            const stop_charge_label = document.querySelector('#stop_charge_label')
            stop_charge_label.innerHTML = CONFIG.max_charge + " %"
            stop_charge_val.value = CONFIG.max_charge
            stop_charge_val.oninput = (e) => {
                const target = e.target
                stop_charge_label.innerHTML = target.value + " %"
                CONFIG.max_charge = target.value
            }
        }
    }


    const el = document.createElement('div')
    el.id = "charge_plugin"
    el.classList.add('modal')
    el.style.opacity = "1"
    el.style.maxWidth = "400px"
    el.style.width = '90%'
    el.style.display = "none"
    el.innerHTML = html
    document.querySelector('.container').appendChild(el)



    //创建折叠开关
    collapseGen('#collapse_charge_plugin_btn', '#collapse_charge_plugin', 'collapse_charge_plugin', async (status) => {
        //设置总开关
        if (status == "open") {
            createToast("开启中..")
            await setRange()
            await install()
            CONFIG.enabled = true
        } else {
            createToast("关闭中..")
            await uninstall()
            CONFIG.enabled = false
        }
    })

    await getConfig()
    initWindow()

    const btn = document.createElement('button')
    let timer = null
    btn.textContent = "充电控制器"
    btn.onclick = async (e) => {
        showModal("#charge_plugin")
        timer && timer()
        getLog()
        timer = requestInterval(getLog, 2000)
        await getConfig()
        initWindow()
    }

    window.close_charge_settings = () => {
        timer && timer()
        closeModal('#charge_plugin')
    }
    document.querySelector('.actions-buttons').appendChild(btn)

    window.showHelp = () => {
        const message = `安装并配置充电百分比后，插件会自动管理充电
            当电量在低于设定值时自动开启充电，达到设定值上限会自动关闭充电
            插入充电器时，若电量在设定值以下时也会自动开启充电。
            所有操作均有日志记录，无需用户手动干预，保证电池健康和充电安全。
            您也可以将“禁用充电”视为直供电模式，此时充电电流为0
            `.replaceAll('\n', "<br>")
        const { el, close } = createFixedToast('kano_help_message', `
                    <div style="pointer-events:all;width:80vw;max-width:300px">
                        <div class="title" style="margin:0" data-i18n="system_notice">使用说明</div>
                        <div style="margin:10px 0">${message}</div>
                        <div style="text-align:right">
                            <button style="font-size:.64rem" id="close_message_btn" data-i18n="pay_btn_dismiss">${t('pay_btn_dismiss')}</button>
                        </div>
                    </div>
                    `)
        const btn = el.querySelector('#close_message_btn')
        if (!btn) {
            close()
            return
        }
        btn.onclick = async () => {
            close()
        }
    }
})();
//</script>
