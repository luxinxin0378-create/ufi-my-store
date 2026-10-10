<script>
(() => {
    const container = document.querySelector('.functions-container');
    container.insertAdjacentHTML("afterend", `
<div id="BATTERY_DISPLAY" style="width: 100%; margin-top: 10px;">
    <div class="title" style="margin: 6px 0; color: #fff; display: flex; align-items: center; gap: 15px;">
        <strong style="color:#fff;">电池监控</strong>
        <div style="display: inline-block;" id="collapse_battery_btn"></div>
    </div>
    <div class="collapse" id="collapse_battery" data-name="close" style="height: 0px; overflow: hidden;">
        <div class="collapse_box" style="background: rgba(30, 30, 46, 0);">
            <ul class="deviceList" style="margin:0;padding:0;list-style:none;">
                <li style="padding:2px; margin-bottom: 2px; border-radius: 2px; background: rgba(30, 30, 46, 0);">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; align-items: start;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                            <div style="background: rgba(68, 71, 90, 0.2); padding: 12px; border-radius: 10px; width: 100%; box-sizing: border-box;">
                                <div style="position: relative; width: 150px; height: 150px; margin: -10px auto 6px auto;">
                                    <svg width="150" height="150" viewBox="0 0 150 150">
                                        <defs>
                                            <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stop-color="#bd93f9" />
                                                <stop offset="50%" stop-color="#ffffff" />
                                                <stop offset="100%" stop-color="#FFAEB9" />
                                            </linearGradient>
                                        </defs>
                                        <circle cx="75" cy="75" r="65" fill="none" stroke="rgba(68, 71, 90, 0.1)" stroke-width="8" />
                                        <circle id="battery_ring" cx="75" cy="75" r="65" fill="none" stroke="#50fa7b" 
                                                stroke-width="8" stroke-dasharray="408.2" stroke-dashoffset="0" 
                                                stroke-linecap="round" transform="rotate(-90 75 75)" />
                                        <circle id="battery_glow_ring" cx="75" cy="75" r="65" fill="none" 
                                                stroke="url(#glowGradient)" stroke-width="8" stroke-dasharray="0 408.2" 
                                                stroke-dashoffset="0" stroke-linecap="round" 
                                                transform="rotate(-90 75 75)" opacity="0" />
                                        <text id="battery_percent" x="75" y="75" text-anchor="middle" 
                                              dominant-baseline="middle" font-size="30" fill="#f8f8f2" font-weight="bold">--%</text>
                                        <text id="battery_status" x="75" y="105" text-anchor="middle" 
                                              dominant-baseline="middle" font-size="14" fill="#6272a4">状态</text>
                                    </svg>
                                    <div id="battery_icon" style="position: absolute; top: 18px; left: 50%; transform: translateX(-50%); font-size: 23px;">🔋</div>
                                </div>
                                <div style="margin-top: 0; padding-bottom: 0;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px; align-items: center;">
                                        <div style="font-size: 14px; color: #bd93f9;">内存</div>
                                        <div id="mem_capacity" style="font-size: 14px; color: #f8f8f2; text-align: right;">0.00 / 0.00 <span style="color: #5cdbd3;">GB</span></div>
                                    </div>
                                    <div style="position: relative; height: 12px; background: rgba(68, 71, 90, 0.1); border-radius: 10px; overflow: hidden;">
                                        <div id="mem_usage_bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, rgba(80, 250, 123, 0.6), rgba(97, 165, 194, 0.6), rgba(255, 77, 166, 0.6)); box-shadow: 0 0 10px rgba(74,168,255,0.4); border-radius: 10px;"></div>
                                        <div id="mem_usage_percent" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 11px; color: #f8f8f2; text-shadow: 0 0 2px rgba(0,0,0,0.8); font-weight: bold; pointer-events: none; display: flex; align-items: center; gap: 2px;">
                                            <span>--</span>
                                            <span style="color: #5cdbd3;">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px;">
                                <div style="background: rgba(68, 71, 90, 0.2); padding: 2px 4px; border-radius: 10px;">
                                    <div style="font-size: 12px; color: #bd93f9; display: flex; justify-content: space-between; align-items: center;">
                                        <span>CPU<span style="color: #5cdbd3;">°C</span></span>
                                    </div>
                                    <div id="cpu_temp" style="font-size: 20px; color: #50fa7b; font-weight: bold; margin-top: 1px;">--</div>
                                </div>
                                <div style="background: rgba(68, 71, 90, 0.2); padding: 2px 4px; border-radius: 10px;">
                                    <div style="font-size: 12px; color: #bd93f9; display: flex; justify-content: space-between; align-items: center;">
                                        <span>电池<span style="color: #5cdbd3;">°C</span></span>
                                    </div>
                                    <div id="battery_temp" style="font-size: 20px; color: #50fa7b; font-weight: bold; margin-top: 1px;">--</div>
                                </div>
                                <div style="background: rgba(68, 71, 90, 0.2); padding: 2px 4px; border-radius: 10px;">
                                    <div style="font-size: 12px; color: #bd93f9;">功率<span style="color: #5cdbd3;"> W</span></div>
                                    <div id="battery_power" style="font-size: 16px; color: #f8f8f2; margin-top: 1px;">--</div>
                                </div>
                                <div style="background: rgba(68, 71, 90, 0.2); padding: 2px 4px; border-radius: 10px;">
                                    <div style="font-size: 12px; color: #bd93f9;">电压<span style="color: #5cdbd3;"> V</span></div>
                                    <div id="battery_voltage" style="font-size: 16px; color: #f8f8f2; margin-top: 1px;">--</div>
                                </div>
                                <div style="background: rgba(68, 71, 90, 0.2); padding: 2px 4px; border-radius: 10px;">
                                    <div style="font-size: 12px; color: #bd93f9;">电流<span style="color: #5cdbd3;"> mA</span></div>
                                    <div id="battery_current" style="font-size: 16px; color: #f8f8f2; margin-top: 1px;">--</div>
                                </div>
                                <div style="background: rgba(68, 71, 90, 0.2); padding: 2px 4px; border-radius: 10px;">
                                    <div style="font-size: 12px; color: #bd93f9;">技术<span style="color: #5cdbd3;"> Li</span></div>
                                    <div id="battery_tech" style="font-size: 16px; color: #f8f8f2; margin-top: 1px;">--</div>
                                </div>
                                <div style="grid-column: 1 / -1; background: rgba(68, 71, 90, 0.2); padding: 4px 8px 12px; border-radius: 10px; margin-top: 1px; box-sizing: border-box;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px; align-items: center;">
                                        <div style="font-size: 14px; color: #bd93f9;">电量</div>
                                        <div id="battery_capacity" style="font-size: 14px; color: #f8f8f2; text-align: right; cursor: pointer;">0/0 <span style="color: #5cdbd3;">mAh</span></div>
                                    </div>
                                    <div style="position: relative; height: 12px; background: rgba(68, 71, 90, 0.1); border-radius: 10px; overflow: hidden;">
                                        <div id="battery_capacity_bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, rgba(255,20,147, 0.6), rgba(250,173,20, 0.6), rgba(138,43,226, 0.6), rgba(30,144,255, 0.6), rgba(82,193,26, 0.6)); border-radius: 10px;"></div>
                                        <div id="battery_remain_time" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 10px; color: #f8f8f2; text-shadow: 0 0 2px #000; font-weight: bold; pointer-events: none; display: none;">--</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</div>
`);

    const STORAGE_KEY = 'battery_design_capacity';
    const getSavedCapacity = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && !isNaN(parseInt(saved))) return parseInt(saved);
        } catch(e) {}
        return 4500;
    };
    const saveCapacity = (value) => {
        try { localStorage.setItem(STORAGE_KEY, value.toString()); } catch(e) {}
    };

    const PLUGIN_CONFIG = {
        INSTALL_DIR: "/data/battery_monitor",
        BINARY_PATH: "/data/battery_monitor/battery_monitor",
        DESIGN_CAPACITY: getSavedCapacity(),
        REAL_TIME_UPDATE_INTERVAL: 1000,
        FULL_UPDATE_INTERVAL: 5000,
        BATTERY_PATHS: {
            CAPACITY: "/sys/class/power_supply/battery/capacity",
            STATUS: "/sys/class/power_supply/battery/status",
            TEMP: "/sys/class/power_supply/battery/temp",
            VOLTAGE: "/sys/class/power_supply/battery/voltage_now",
            CURRENT: "/sys/class/power_supply/battery/current_now",
            TECHNOLOGY: "/sys/class/power_supply/battery/technology",
            CHARGE_FULL: "/sys/class/power_supply/battery/charge_full",
            CHARGE_FULL_DESIGN: "/sys/class/power_supply/battery/charge_full_design",
            CHARGE_COUNTER: "/sys/class/power_supply/battery/charge_counter"
        },
        STATUS_MAP: {
            "Charging": {text: "充电中", color: "#50fa7b", icon: "⚡️"},
            "Discharging": {text: "放电中", color: "#ffb86c", icon: "🔋"},
            "Full": {text: "已充满", color: "#8be9fd", icon: "💯"},
            "DirectPower": {text: "直供电", color: "#8be9fd", icon: "🔌"},
            "Unknown": {text: "未知", color: "#bd93f9", icon: "❓"}
        },
        DIRECT_POWER_THRESHOLD: 1
    };

    const pluginState = {
        installed: false,
        running: false,
        monitoring: false,
        fullUpdateTimer: null,
        realTimeTimer: null,
        isPageVisible: true,
        hasPermission: false,
        batteryData: {
            level: 0, status: "Unknown", temperature: 0, voltage: 0, current: 0,
            technology: "Unknown", chargeFull: 0, chargeFullDesign: 0, chargeCounter: 0,
            cpuTemperature: "--", isDirectPower: false
        },
        memData: { memUsagePercent: 0, usedMemGB: 0, totalMemGB: 0 }
    };

    const getElement = (id) => document.getElementById(id);
    const isExpanded = () => {
        const collapseEl = getElement('collapse_battery');
        return collapseEl && collapseEl.getAttribute('data-name') !== 'close';
    };

    const shouldUpdate = () => {
        return pluginState.isPageVisible && isExpanded() && pluginState.running && pluginState.installed;
    };

    const checkAdvancedFunc = async () => {
        const res = await runShellWithRoot('whoami');
        return res.content?.includes('root') ?? false;
    };

    const getBatteryColor = (level) => {
        const colors = [
            [5, "#ff5555"], [10, "#ff6e6e"], [15, "#ff8787"], [20, "#ffa0a0"],
            [25, "#ffb9b9"], [30, "#ffb86c"], [35, "#ffc285"], [40, "#ffcc9e"],
            [45, "#ffd6b7"], [50, "#ffe0d0"], [55, "#e6e05e"], [60, "#e9e97a"],
            [65, "#ecec96"], [70, "#efefb2"], [75, "#8be9fd"], [80, "#9aecfd"],
            [85, "#a9effd"], [90, "#b8f2fd"], [95, "#c7f5fd"], [100, "#50fa7b"]
        ];
        return colors.find(([threshold]) => level <= threshold)?.[1] || "#50fa7b";
    };
    
    const getTemperatureColor = (tempC) => {
        const colors = [
            [10, "#00FFFF"], [20, "#00C78C"], [25, "#00A86B"], [30, "#228B22"],
            [35, "#9ACD32"], [40, "#ADFF2F"], [45, "#FF8C00"], [50, "#FF4500"],
            [55, "#FF6347"], [Infinity, "#DC143C"]
        ];
        return colors.find(([threshold]) => tempC <= threshold)?.[1] || "#DC143C";
    };
    
    const getCpuTemperatureColor = (tempC) => {
        if (tempC <= 10) return "#f8f8f2";
        if (tempC <= 15) return "#d4d4dc";
        if (tempC <= 20) return "#50fa7b";
        if (tempC <= 25) return "#8be9fd";
        if (tempC <= 30) return "#98d8f0";
        if (tempC <= 35) return "#a5e6e6";
        if (tempC <= 40) return "#b2f2bb";
        if (tempC <= 45) return "#8ce98c";
        if (tempC <= 50) return "#f1fa8c";
        if (tempC <= 55) return "#ffb86c";
        if (tempC <= 60) return "#ff8c42";
        if (tempC <= 65) return "#ff6b6b";
        if (tempC <= 70) return "#ff5555";
        if (tempC <= 75) return "#ff3333";
        if (tempC <= 80) return "#ff0000";
        if (tempC <= 85) return "#cc0000";
        if (tempC <= 90) return "#990000";
        return "#660000";
    };
    
    const updateBatteryRemainTime = () => {
        const { level, status, current, isDirectPower } = pluginState.batteryData;
        const timeEl = getElement('battery_remain_time');
        const designMAh = PLUGIN_CONFIG.DESIGN_CAPACITY;
        const currentMA = Math.abs(current / 1000);
        if (isDirectPower || !["Charging", "Discharging"].includes(status) || level === 0) {
            timeEl.style.display = 'none';
            return;
        }
        timeEl.style.display = 'block';
        let totalMinutes = 0;
        if (status === "Charging") {
            const remainMAh = designMAh * (100 - level) / 100;
            totalMinutes = Math.round(remainMAh / currentMA * 60);
        } else if (status === "Discharging") {
            const usableMAh = designMAh * level / 100;
            totalMinutes = Math.round(usableMAh / currentMA * 60);
        }
        if (totalMinutes <= 0) {
            timeEl.style.display = 'none';
            return;
        }
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const prefix = status === "Charging" ? "充满：" : "可用：";
        timeEl.textContent = hours === 0 ? `${prefix}${mins}分` : `${prefix}${hours}时${mins}分`;
    };
    
    const updateDirectPowerState = () => {
        const { current } = pluginState.batteryData;
        const currentMA = Math.abs(current / 1000);
        pluginState.batteryData.isDirectPower = currentMA <= PLUGIN_CONFIG.DIRECT_POWER_THRESHOLD;
    };
    
    const readCpuTemperature = async () => {
        try {
            if (typeof UFI_DATA !== 'undefined' && UFI_DATA?.cpu_temp !== undefined) {
                const temp = UFI_DATA.cpu_temp;
                return temp > 1000 ? temp / 1000 : temp;
            }
            const result = await runShellWithRoot('cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | head -1');
            if (result.success && result.content?.trim()) {
                const temp = parseInt(result.content.trim());
                return temp > 1000 ? temp / 1000 : temp;
            }
            return "--";
        } catch (error) {
            return "--";
        }
    };
    
    const readMemoryInfo = async () => {
        try {
            if (typeof UFI_DATA !== 'undefined' && UFI_DATA?.memInfo) {
                const memInfo = UFI_DATA.memInfo;
                const memUsagePercent = Number(memInfo.mem_usage_percent || 0);
                const usedMemKB = Number(memInfo.mem_used_kb || 0);
                const totalMemKB = Number(memInfo.mem_total_kb || 0);
                pluginState.memData = {
                    memUsagePercent,
                    usedMemGB: usedMemKB / (1024 ** 2),
                    totalMemGB: totalMemKB / (1024 ** 2)
                };
                return;
            }
            const result = await runShellWithRoot('free | grep Mem | awk \'{print $2, $3}\'');
            if (result.success && result.content.trim()) {
                const [totalMemKB, usedMemKB] = result.content.trim().split(' ').map(Number);
                pluginState.memData = {
                    memUsagePercent: (usedMemKB / totalMemKB) * 100,
                    usedMemGB: usedMemKB / (1024 ** 2),
                    totalMemGB: totalMemKB / (1024 ** 2)
                };
            }
        } catch (error) {
            pluginState.memData = { memUsagePercent: 0, usedMemGB: 0, totalMemGB: 0 };
        }
    };
    
    const readBatteryFile = async (path) => {
        try {
            const result = await runShellWithRoot(`cat ${path} 2>/dev/null`);
            return result.success && result.content.trim() ? result.content.trim() : null;
        } catch {
            return null;
        }
    };

    const installPlugin = async () => {
        if (!pluginState.hasPermission) return false;
        try {
            const monitorScript = `#!/system/bin/sh
while true; do
    sleep 5
done`;
            await runShellWithRoot(`mkdir -p ${PLUGIN_CONFIG.INSTALL_DIR} && chmod 755 ${PLUGIN_CONFIG.INSTALL_DIR}`);
            await runShellWithRoot(`echo '${monitorScript}' > ${PLUGIN_CONFIG.BINARY_PATH} && chmod 755 ${PLUGIN_CONFIG.BINARY_PATH}`);
            await runShellWithRoot(`echo '{"update_interval":5000}' > ${PLUGIN_CONFIG.INSTALL_DIR}/battery_monitor.conf`);
            await runShellWithRoot(`
                if [ -f "/sdcard/ufi_tools_boot.sh" ]; then
                    if ! grep -q "battery_monitor" "/sdcard/ufi_tools_boot.sh"; then
                        echo "nohup ${PLUGIN_CONFIG.BINARY_PATH} &" >> /sdcard/ufi_tools_boot.sh
                    fi
                else
                    echo "#!/system/bin/sh" > /sdcard/ufi_tools_boot.sh
                    echo "nohup ${PLUGIN_CONFIG.BINARY_PATH} &" >> /sdcard/ufi_tools_boot.sh
                    chmod 755 /sdcard/ufi_tools_boot.sh
                fi
            `);
            pluginState.installed = true;
            return true;
        } catch (error) {
            createToast(`安装失败: ${error.message}`, 'red');
            return false;
        }
    };

    const startService = async () => {
        if (!pluginState.hasPermission || !pluginState.installed) return false;
        try {
            await runShellWithRoot(`
                if [ -f "${PLUGIN_CONFIG.INSTALL_DIR}/monitor.pid" ]; then
                    kill -15 $(cat ${PLUGIN_CONFIG.INSTALL_DIR}/monitor.pid) 2>/dev/null
                    sleep 1
                    kill -9 $(cat ${PLUGIN_CONFIG.INSTALL_DIR}/monitor.pid) 2>/dev/null
                    rm -f ${PLUGIN_CONFIG.INSTALL_DIR}/monitor.pid
                fi
                pkill -f "${PLUGIN_CONFIG.BINARY_PATH}" 2>/dev/null
            `);
            const result = await runShellWithRoot(`
                nohup ${PLUGIN_CONFIG.BINARY_PATH} &
                PID=$!
                echo $PID > ${PLUGIN_CONFIG.INSTALL_DIR}/monitor.pid
                echo $PID
            `);
            if (result.success && result.content.trim()) {
                pluginState.running = true;
                return true;
            }
            return false;
        } catch (error) {
            return false;
        }
    };

    const fetchRealTimeInfo = async () => {
        if (!shouldUpdate()) return;
        const [cpuTempRaw, voltage, current, status] = await Promise.all([
            readCpuTemperature(),
            readBatteryFile(PLUGIN_CONFIG.BATTERY_PATHS.VOLTAGE),
            readBatteryFile(PLUGIN_CONFIG.BATTERY_PATHS.CURRENT),
            readBatteryFile(PLUGIN_CONFIG.BATTERY_PATHS.STATUS)
        ]);
        
        pluginState.batteryData.cpuTemperature = cpuTempRaw;
        pluginState.batteryData.voltage = parseInt(voltage) || 0;
        pluginState.batteryData.current = parseInt(current) || 0;
        pluginState.batteryData.status = PLUGIN_CONFIG.STATUS_MAP[status] ? status : "Unknown";
        
        updateRealTimeDisplay();
        updateDirectPowerState();
        updateBatteryRemainTime();
    };
    
    const fetchFullUpdateInfo = async () => {
        if (!shouldUpdate()) return;
        const [batteryTempRaw, capacity] = await Promise.all([
            readBatteryFile(PLUGIN_CONFIG.BATTERY_PATHS.TEMP),
            readBatteryFile(PLUGIN_CONFIG.BATTERY_PATHS.CAPACITY)
        ]);
        
        pluginState.batteryData.temperature = batteryTempRaw !== null ? parseInt(batteryTempRaw) || "--" : "--";
        pluginState.batteryData.level = parseInt(capacity) || 0;
        
        updateFullDisplay();
        updateBatteryRemainTime();
    };
    
    const fetchNonRealTimeInfo = async () => {
        if (!shouldUpdate()) return;
        const [technology, chargeFull, chargeFullDesign, chargeCounter] = await Promise.all([
            readBatteryFile(PLUGIN_CONFIG.BATTERY_PATHS.TECHNOLOGY),
            readBatteryFile(PLUGIN_CONFIG.BATTERY_PATHS.CHARGE_FULL),
            readBatteryFile(PLUGIN_CONFIG.BATTERY_PATHS.CHARGE_FULL_DESIGN),
            readBatteryFile(PLUGIN_CONFIG.BATTERY_PATHS.CHARGE_COUNTER)
        ]);
        
        pluginState.batteryData.technology = technology || "未知";
        pluginState.batteryData.chargeFull = parseInt(chargeFull) || 0;
        pluginState.batteryData.chargeFullDesign = parseInt(chargeFullDesign) || 0;
        pluginState.batteryData.chargeCounter = parseInt(chargeCounter) || 0;
        
        updateNonRealTimeDisplay();
    };

    const updateRealTimeDisplay = () => {
        const { cpuTemperature, voltage, current } = pluginState.batteryData;
        const cpuTempEl = getElement('cpu_temp');
        if (cpuTemperature === "--") {
            cpuTempEl.textContent = "--";
            cpuTempEl.style.color = "#bd93f9";
        } else {
            const cpuTempC = cpuTemperature > 0 ? cpuTemperature.toFixed(1) : "--";
            cpuTempEl.textContent = `${cpuTempC}`;
            cpuTempEl.style.color = getCpuTemperatureColor(parseFloat(cpuTempC) || 0);
        }
        getElement('battery_voltage').textContent = voltage > 0 ? `${(voltage / 1000000).toFixed(2)}` : "--";
        
        const currentInMA = current / 1000;
        const currentElement = getElement('battery_current');
        if (current !== 0) {
            const absCurrent = Math.abs(Math.round(currentInMA));
            const signColor = current > 0 ? "#b2f2bb" : "#ff3333";
            currentElement.innerHTML = `<span style="color: ${signColor}">${current > 0 ? '+' : '-'}</span><span style="color: #f8f8f2">${absCurrent}</span>`;
            const power = Math.abs((voltage / 1000000) * (current / 1000000));
            getElement('battery_power').textContent = power.toFixed(2);
        } else {
            currentElement.textContent = "0";
            currentElement.style.color = "#f8f8f2";
            getElement('battery_power').textContent = "0.00";
        }
    };
    
    const updateFullDisplay = () => {
        const { temperature, level, status, isDirectPower } = pluginState.batteryData;
        const statusConfig = isDirectPower 
            ? PLUGIN_CONFIG.STATUS_MAP.DirectPower 
            : PLUGIN_CONFIG.STATUS_MAP[status] || PLUGIN_CONFIG.STATUS_MAP.Unknown;
        
        const batteryTempEl = getElement('battery_temp');
        if (temperature === "--" || isNaN(temperature)) {
            batteryTempEl.textContent = "--";
            batteryTempEl.style.color = "#bd93f9";
        } else {
            const tempC = temperature > 0 ? (temperature / 10).toFixed(1) : "--";
            batteryTempEl.textContent = `${tempC}`;
            batteryTempEl.style.color = getTemperatureColor(parseFloat(tempC) || 0);
        }
        
        const ring = getElement('battery_ring');
        if (ring) {
            ring.style.strokeDashoffset = 408.2 * (1 - level / 100);
            ring.style.stroke = getBatteryColor(level);
        }
        getElement('battery_percent').textContent = `${level}%`;
        getElement('battery_status').textContent = statusConfig.text;
        getElement('battery_status').style.fill = statusConfig.color;
        getElement('battery_icon').textContent = statusConfig.icon;
    };
    
    const updateNonRealTimeDisplay = () => {
        const { technology, level } = pluginState.batteryData;
        getElement('battery_tech').textContent = technology;
        const currentCapacity = Math.round(PLUGIN_CONFIG.DESIGN_CAPACITY * level / 100);
        getElement('battery_capacity_bar').style.width = `${level}%`;
        getElement('battery_capacity').innerHTML = `${currentCapacity}/${PLUGIN_CONFIG.DESIGN_CAPACITY} <span style="color: #5cdbd3;">mAh</span>`;
        
        const capacityEl = getElement('battery_capacity');
        if (capacityEl && !capacityEl.dataset.clickBind) { 
            capacityEl.dataset.clickBind = "true"; 
            capacityEl.addEventListener('click', () => { 
                const newCap = prompt("请输入电池设计容量（mAh，范围1-10000）", PLUGIN_CONFIG.DESIGN_CAPACITY);
                if (newCap === null) return;
                
                const numCap = parseInt(newCap);
                if (numCap && numCap >= 1 && numCap <= 10000) {
                    PLUGIN_CONFIG.DESIGN_CAPACITY = numCap;
                    saveCapacity(numCap);
                    createToast(`电池设计容量已修改为 ${numCap} mAh`, 'green');
                    updateNonRealTimeDisplay();
                    updateBatteryRemainTime();
                } else {
                    createToast("输入错误！请输入1-10000的正整数", 'red');
                }
            });
        }
    };
    
    const updateMemoryDisplay = async () => {
        await readMemoryInfo();
        const { memUsagePercent, usedMemGB, totalMemGB } = pluginState.memData;
        const memBar = getElement('mem_usage_bar');
        if (memBar) memBar.style.width = `${Math.max(0, Math.min(100, memUsagePercent))}%`;
        const memCapacityEl = getElement('mem_capacity');
        if (memCapacityEl) memCapacityEl.innerHTML = `${usedMemGB.toFixed(2)} / ${totalMemGB.toFixed(2)} <span style="color: #5cdbd3;">GB</span>`;
        const memPercentEl = getElement('mem_usage_percent');
        if (memPercentEl) memPercentEl.innerHTML = `<span>${memUsagePercent.toFixed(1)}</span><span style="color: #5cdbd3;">%</span>`;
    };

    const clearTimers = () => {
        if (pluginState.fullUpdateTimer) clearInterval(pluginState.fullUpdateTimer);
        if (pluginState.realTimeTimer) clearInterval(pluginState.realTimeTimer);
        pluginState.fullUpdateTimer = null;
        pluginState.realTimeTimer = null;
    };
    
    const startMonitoring = () => {
        if (!shouldUpdate()) return;
        
        if (pluginState.monitoring) {
            fetchRealTimeInfo();
            fetchFullUpdateInfo();
            fetchNonRealTimeInfo();
            updateMemoryDisplay();
            return;
        }
        
        clearTimers();
        fetchRealTimeInfo();
        fetchFullUpdateInfo();
        fetchNonRealTimeInfo();
        updateMemoryDisplay();
        
        pluginState.realTimeTimer = setInterval(() => {
            if (shouldUpdate()) {
                fetchRealTimeInfo();
                updateMemoryDisplay();
            }
        }, PLUGIN_CONFIG.REAL_TIME_UPDATE_INTERVAL);
        
        pluginState.fullUpdateTimer = setInterval(() => {
            if (shouldUpdate()) {
                fetchFullUpdateInfo();
                fetchNonRealTimeInfo();
            }
        }, PLUGIN_CONFIG.FULL_UPDATE_INTERVAL);
        
        pluginState.monitoring = true;
    };

    const setupCollapseObserver = () => {
        const collapseEl = getElement('collapse_battery');
        if (!collapseEl) return;
        
        const observer = new MutationObserver(() => {
            if (shouldUpdate()) {
                startMonitoring();
            } else {
                clearTimers();
                pluginState.monitoring = false;
            }
        });
        
        observer.observe(collapseEl, {
            attributes: true,
            attributeFilter: ['data-name']
        });
        
        return observer;
    };

    const initCollapse = () => {
        try {
            collapseGen("#collapse_battery_btn", "#collapse_battery", "#collapse_battery", () => {});
            setupCollapseObserver();
            
            setTimeout(() => {
                if (shouldUpdate()) {
                    startMonitoring();
                }
            }, 100);
        } catch (e) {
            console.error('initCollapse error:', e);
        }
    };

    const autoInstallAndStart = async () => {
        try {
            pluginState.hasPermission = await checkAdvancedFunc();
            if (!pluginState.hasPermission) {
                createToast("需要开启高级功能才能使用此插件", 'red');
                initCollapse();
                return;
            }
            
            const check = await runShellWithRoot(`[ -d "${PLUGIN_CONFIG.INSTALL_DIR}" ] && echo "installed"`);
            pluginState.installed = check.success && check.content?.includes('installed');
            
            if (!pluginState.installed) {
                createToast("正在自动安装插件...", "blue");
                await installPlugin();
            }
            
            const running = await runShellWithRoot(`
                if [ -f "${PLUGIN_CONFIG.INSTALL_DIR}/monitor.pid" ]; then
                    if kill -0 $(cat ${PLUGIN_CONFIG.INSTALL_DIR}/monitor.pid) 2>/dev/null; then
                        echo "running"
                    fi
                fi
            `);
            pluginState.running = running.success && running.content?.includes('running');
            
            if (!pluginState.running) {
                createToast("正在自启动服务...", "blue");
                await startService();
            }
            
            initCollapse();
            
            if (shouldUpdate()) {
                startMonitoring();
            }
        } catch (error) {
            createToast(`自启动失败: ${error.message}`, 'red');
            initCollapse();
        }
    };
    
    document.addEventListener('visibilitychange', () => {
        pluginState.isPageVisible = !document.hidden;
        if (shouldUpdate()) {
            startMonitoring();
        } else {
            clearTimers();
            pluginState.monitoring = false;
        }
    });

    // ============================================================
    // ★ 光流带：插电时显示，不插电时隐藏
    // 插电判断：status === "Charging" || status === "Full" || isDirectPower
    // ============================================================
    const startGlowAnimation = () => {
        const glowRing = getElement('battery_glow_ring');
        if (!glowRing) return;

        const CIRC = 408.2;      // 2 * π * 65
        const period = 8000;     // 一个完整周期(ms)：从0画到360

        const animate = (timestamp) => {
            const { status, isDirectPower } = pluginState.batteryData;

            // 插电：Charging / Full / DirectPower → 显示光流层
            const plugged =
                status === "Charging" ||
                status === "Full" ||
                isDirectPower;

            // 不插电 → 完全隐藏
            if (!plugged) {
                glowRing.setAttribute('opacity', '0');
                requestAnimationFrame(animate);
                return;
            }

            const now = timestamp || performance.now();
            const t = (now % period) / period; // 0 → 1

            const visible = CIRC * t;
            glowRing.setAttribute('stroke-dasharray', `${visible} ${CIRC - visible}`);
            glowRing.setAttribute('stroke-dashoffset', '0');
            // 未开始和满圈后都是 0，直接消失
            glowRing.setAttribute('opacity', (t > 0 && t < 1) ? '1' : '0');

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(startGlowAnimation, 150);
        });
    } else {
        setTimeout(startGlowAnimation, 150);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(autoInstallAndStart, 100);
        });
    } else {
        setTimeout(autoInstallAndStart, 100);
    }
})();
</script>