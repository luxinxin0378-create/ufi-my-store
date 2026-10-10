//<script>
(() => {
    const sleep = (ms = 200) => new Promise(resolve => setTimeout(resolve, ms))

    const DEFAULT_RATE = 51
    const DEFAULT_LATENCY = 40
    const DEFAULT_TEMP_THRESHOLD = 55
    const WAN_IF = "sipa_eth0"
    const BOOT_SCRIPT = "/sdcard/ufi_f50_tbf_boot.sh"
    const BOOT_MARKER = "ufi_f50_tbf_boot"
    const BOOT_LOG = "/data/local/tmp/f50_tbf_boot.log"
    const TEMP_GUARD_SCRIPT = "/sdcard/ufi_temp_guard.sh"
    const TEMP_GUARD_MARKER = "ufi_temp_guard"
    const TEMP_GUARD_LOG = "/data/local/tmp/f50_temp_guard.log"
    const IRQ_BACKUP_FILE = "/data/local/tmp/f50_irq_affinity_backup.conf"
    const WATCHDOG_SCRIPT = "/sdcard/ufi_net_watchdog.sh"
    const WATCHDOG_MARKER = "ufi_net_watchdog"
    const WATCHDOG_LOG = "/data/local/tmp/ufi_net_watchdog.log"

    // 公共网络调优命令（2G RAM + 2G swap，start_limit和自启脚本复用）
    const SYSCTL_TUNE = [
        '# TCP缓冲调优（512KB，充分利用5G下行带宽，2G内存足够支撑）',
        'sysctl -w net.core.wmem_max=524288 || true',
        'sysctl -w net.core.rmem_max=524288 || true',
        'sysctl -w net.ipv4.tcp_wmem="4096 16384 524288" || true',
        'sysctl -w net.ipv4.tcp_rmem="4096 87380 524288" || true',
        '# socket辅助缓冲区增大到64K',
        'sysctl -w net.core.optmem_max=65536 || true',
        '# 长连接优化：空闲后不重置拥塞窗口（微信视频友好）',
        'sysctl -w net.ipv4.tcp_slow_start_after_idle=0 || true',
        '# 不保存旧RTT指标，避免5G波动后旧指标影响新连接',
        'sysctl -w net.ipv4.tcp_no_metrics_save=1 || true',
        '# MTU探测，避免5G网络PMTU黑洞',
        'sysctl -w net.ipv4.tcp_mtu_probing=1 || true',
        '# 增大网卡积压队列，视频大包突发不丢包',
        'sysctl -w net.core.netdev_max_backlog=2000 || true',
        '# 增大网络处理预算，减少中断频率提高吞吐量',
        'sysctl -w net.core.netdev_budget=600 || true',
        '# 内存调优（2G RAM + 2G swap）',
        '# swappiness=60：从固件默认150降到Linux默认60，减少频繁swap换入换出导致的网络延迟，同时避免OOM',
        'sysctl -w vm.swappiness=60 || true',
        '# 保留16MB最低空闲内存给内核，避免网络处理时OOM',
        'sysctl -w vm.min_free_kbytes=16384 || true',
        '# 积极回收文件缓存（默认100），路由器场景文件缓存不重要',
        'sysctl -w vm.vfs_cache_pressure=150 || true',
        '# conntrack调优，缩短UDP超时防止NAT表占满',
        'sysctl -w net.netfilter.nf_conntrack_max=16384 || true',
        'sysctl -w net.netfilter.nf_conntrack_udp_timeout=30 || true',
        'sysctl -w net.netfilter.nf_conntrack_udp_timeout_stream=60 || true',
    ]

    // 统一按钮样式
    const BTN = 'padding:6px 14px;font-size:12px;background:#1565c0;color:#fff;border:none;border-radius:4px;cursor:pointer;'
    const BTN_GRAY = 'padding:6px 14px;font-size:12px;background:#546e7a;color:#fff;border:none;border-radius:4px;cursor:pointer;'
    const BTN_GREEN = 'padding:6px 14px;font-size:12px;background:#2e7d32;color:#fff;border:none;border-radius:4px;cursor:pointer;'
    const BTN_RED = 'padding:6px 14px;font-size:12px;background:#c62828;color:#fff;border:none;border-radius:4px;cursor:pointer;'
    const BTN_BLUE = 'padding:6px 14px;font-size:12px;background:#0277bd;color:#fff;border:none;border-radius:4px;cursor:pointer;'

    // 生成自启脚本（TBF + 网络调优 + RPS + 二次重刷对抗固件覆盖；硬中断不持久化，仅手动操作）
    const genBootLines = (rate, latency, rpsMask) => {
        const lines = [
            '#!/system/bin/sh',
            `LOG=${BOOT_LOG}`,
            `WAN_IF=${WAN_IF}`,
            `RATE=${rate}`,
            'echo "=== boot start $(date) ===" >> $LOG',
            '# 等待5G网卡出现，最多60秒',
            'COUNT=0; while [ $COUNT -lt 60 ]; do [ -d /sys/class/net/$WAN_IF ] && break; sleep 1; COUNT=$((COUNT+1)); done',
            '[ $COUNT -ge 60 ] && echo "错误：网卡超时" >> $LOG && exit 1',
            '# 等待modem拨号稳定',
            'sleep 10',
            '# 1. TBF限速',
            'tc qdisc del dev $WAN_IF root 2>/dev/null',
            `tc qdisc add dev $WAN_IF root tbf rate \${RATE}mbit burst 15k latency ${latency}ms 2>>$LOG`,
            '# 2. 网络调优（TCP缓冲+长连接+conntrack+内存）',
            ...SYSCTL_TUNE.map(l => l.replace(/\|\| true/g, '2>>$LOG || true')),
            '# 3. RPS接收软中断分散（网络性能核心，可稳定保持）',
            `echo ${rpsMask} > /sys/class/net/$WAN_IF/queues/rx-0/rps_cpus 2>>$LOG || true`,
            '# 4. 等待5秒让系统服务启动完毕，二次重刷（对抗固件init脚本覆盖vm.swappiness等参数）',
            'sleep 5',
            '# 二次重刷网络调优',
            ...SYSCTL_TUNE.filter(l => !l.startsWith('#')).map(l => l.replace(/\|\| true/g, '2>>$LOG || true')),
            '# 二次重刷RPS',
            `echo ${rpsMask} > /sys/class/net/$WAN_IF/queues/rx-0/rps_cpus 2>>$LOG || true`,
            '# 5. Modem开机关闭PSM/eDRX（等待AT端口就绪，路由转发场景必须关闭省电休眠）',
            'sleep 8',
            'echo -e "AT+CPSMS=0\\r" > /dev/ttyUSB2 2>>$LOG || true',
            'sleep 0.3',
            'echo -e "AT+CEDRXS=0\\r" > /dev/ttyUSB2 2>>$LOG || true',
            'echo "Modem PSM/eDRX已关闭" >> $LOG',
        ]
        lines.push('echo "拥塞控制: $(sysctl -n net.ipv4.tcp_congestion_control)" >> $LOG')
        lines.push('tc qdisc show dev $WAN_IF >> $LOG')
        lines.push('echo "=== boot done $(date) ===" >> $LOG')
        return lines
    }

    // 生成温度监控脚本（高温自动关闭TBF降负载，不再重刷硬中断）
    const genTempGuardLines = (rate, latency, threshold) => {
        const thresholdMilli = threshold * 1000
        return [
            '#!/system/bin/sh',
            `# F50 温度监控，高温自动关闭TBF降低CPU负载`,
            `LOG=${TEMP_GUARD_LOG}`,
            `WAN_IF=${WAN_IF}`,
            `RATE=${rate}`,
            `LATENCY=${latency}`,
            `TEMP_THRESHOLD=${thresholdMilli}`,
            'TBF_ENABLED=0',
            '',
            'log_msg() {',
            '    echo "$(date \'+%Y-%m-%d %H:%M:%S\') $1" >> $LOG',
            '}',
            '',
            'while true; do',
            '    MAX_TEMP=0',
            '    for z in /sys/class/thermal/thermal_zone*/temp; do',
            '        [ -f "$z" ] || continue',
            '        T=$(cat "$z" 2>/dev/null)',
            '        if [ -n "$T" ] && [ "$T" -gt "$MAX_TEMP" ] 2>/dev/null; then',
            '            MAX_TEMP=$T',
            '        fi',
            '    done',
            '',
            '    if [ "$MAX_TEMP" -ge "$TEMP_THRESHOLD" ] 2>/dev/null; then',
            '        if [ "$TBF_ENABLED" = "1" ]; then',
            '            tc qdisc del dev $WAN_IF root 2>/dev/null',
            '            TBF_ENABLED=0',
            '            log_msg "高温 ${MAX_TEMP}, 关闭TBF限速降负载"',
            '        fi',
            '    else',
            '        if [ "$TBF_ENABLED" = "0" ]; then',
            '            tc qdisc del dev $WAN_IF root 2>/dev/null',
            '            tc qdisc add dev $WAN_IF root tbf rate ${RATE}mbit burst 15k latency ${LATENCY}ms 2>/dev/null',
            '            if [ $? -eq 0 ]; then',
            '                TBF_ENABLED=1',
            '                log_msg "温度正常 ${MAX_TEMP}, 恢复TBF限速"',
            '            fi',
            '        fi',
            '    fi',
            '',
            '    sleep 30',
            'done'
        ]
    }

    // 生成断流守护脚本（每10秒ping网关，连续3次失败自动重启WiFi，冷却60秒）
    const genWatchdogLines = () => {
        return [
            '#!/system/bin/sh',
            '# F50 断流自动检测守护：ping网关失败3次自动重启WiFi',
            `LOG=${WATCHDOG_LOG}`,
            'PING_TARGET="223.5.5.5"',
            'FAIL_THRESHOLD=3',
            'COOLDOWN=60',
            'FAIL_COUNT=0',
            'COOLDOWN_END=0',
            '',
            'log_msg() {',
            '    echo "$(date \'+%Y-%m-%d %H:%M:%S\') $1" >> $LOG',
            '}',
            '',
            'log_msg "断流守护启动，检测目标: $PING_TARGET，阈值: ${FAIL_THRESHOLD}次"',
            '',
            'while true; do',
            '    NOW=$(date +%s)',
            '    # 冷却期跳过检测',
            '    if [ "$NOW" -lt "$COOLDOWN_END" ] 2>/dev/null; then',
            '        sleep 10',
            '        continue',
            '    fi',
            '    # ping检测（发2个包，超时3秒）',
            '    if ping -c 2 -W 3 "$PING_TARGET" > /dev/null 2>&1; then',
            '        FAIL_COUNT=0',
            '    else',
            '        FAIL_COUNT=$((FAIL_COUNT + 1))',
            '        log_msg "ping失败，连续第${FAIL_COUNT}次"',
            '        if [ "$FAIL_COUNT" -ge "$FAIL_THRESHOLD" ]; then',
            '            log_msg "连续失败${FAIL_THRESHOLD}次，判定断流，重启WiFi"',
            '            # 重启WiFi驱动',
            '            svc wifi disable 2>/dev/null || true',
            '            sleep 3',
            '            svc wifi enable 2>/dev/null || true',
            '            sleep 5',
            '            # 兜底：ifconfig方式',
            '            WLAN_IF=$(ls /sys/class/net/ | grep -E "wlan|wifi" | head -1)',
            '            if [ -n "$WLAN_IF" ]; then',
            '                ifconfig "$WLAN_IF" down 2>/dev/null || true',
            '                sleep 2',
            '                ifconfig "$WLAN_IF" up 2>/dev/null || true',
            '            fi',
            '            log_msg "WiFi已重启，进入${COOLDOWN}秒冷却期"',
            '            FAIL_COUNT=0',
            '            COOLDOWN_END=$(($(date +%s) + COOLDOWN))',
            '        fi',
            '    fi',
            '    sleep 10',
            'done'
        ]
    }

    const tbfModal = () => {
        const modal = document.createElement('div')
        modal.id = "f50TbfModal"
        modal.style.cssText = 'display:none'
        modal.classList.add('modal')
        modal.innerHTML = `
            <div class="title">F50 上行限速器</div>
            <div class="content" style="max-height: 90%;overflow-y: scroll; padding-top: 10px; width: 88vw; max-width: 540px;">
                <div style="font-size:12px;color:#666;margin-bottom:10px;">
                    网卡: ${WAN_IF} | 算法: tbf | 展锐T760专用 | v2.0.4
                </div>

                <!-- Tab按钮 -->
                <div style="display:flex;gap:4px;margin-bottom:10px;">
                    <button id="f50_tab_btn_limit" class="f50_tab_btn" onclick="f50_switch_tab('limit')" style="flex:1;padding:8px;background:#1565c0;color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:bold;">限速</button>
                    <button id="f50_tab_btn_irq" class="f50_tab_btn" onclick="f50_switch_tab('irq')" style="flex:1;padding:8px;background:#546e7a;color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:bold;">中断均衡</button>
                    <button id="f50_tab_btn_system" class="f50_tab_btn" onclick="f50_switch_tab('system')" style="flex:1;padding:8px;background:#546e7a;color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:bold;">系统</button>
                </div>

                <!-- 输出区域（全局共享） -->
                <div id="f50_tbf_output" style="background:#0d1117;color:#c9d1d9;padding:10px;border-radius:4px;font-family:monospace;font-size:11px;white-space:pre-wrap;word-break:break-all;min-height:80px;max-height:180px;overflow:auto;margin-bottom:10px;">点击按钮开始操作...</div>

                <!-- Tab: 限速 -->
                <div id="f50_tab_limit">
                    <div class="card-inner" style="margin-bottom:10px;">
                        <div class="title" style="font-size:13px;margin-bottom:10px;color:#333;">限速设置</div>
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                            <span style="font-size:13px;color:#333;white-space:nowrap;">上行限速:</span>
                            <input id="f50_tbf_rate" value="${DEFAULT_RATE}" style="width:70px;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;color:#333;">
                            <span style="font-size:13px;color:#333;">Mbps</span>
                            <span style="font-size:13px;color:#333;white-space:nowrap;margin-left:12px;">延迟阈值:</span>
                            <input id="f50_tbf_latency" value="${DEFAULT_LATENCY}" style="width:60px;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;color:#333;">
                            <span style="font-size:13px;color:#333;">ms</span>
                        </div>
                        <div style="font-size:11px;color:#888;margin-bottom:6px;">快捷带宽:</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
                            <button onclick="f50_set_rate(40)" style="${BTN_GRAY}">40M</button>
                            <button onclick="f50_set_rate(45)" style="${BTN_GRAY}">45M</button>
                            <button onclick="f50_set_rate(51)" style="${BTN}">51M(推荐)</button>
                            <button onclick="f50_set_rate(55)" style="${BTN_GRAY}">55M</button>
                            <button onclick="f50_set_rate(60)" style="${BTN_GRAY}">60M(满速)</button>
                        </div>
                        <div style="font-size:11px;color:#888;margin-bottom:6px;">延迟阈值:</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button onclick="f50_set_latency(25)" style="${BTN_GRAY}">25ms(激进)</button>
                            <button onclick="f50_set_latency(30)" style="${BTN_GRAY}">30ms</button>
                            <button onclick="f50_set_latency(40)" style="${BTN}">40ms(推荐)</button>
                            <button onclick="f50_set_latency(50)" style="${BTN_GRAY}">50ms(旧版)</button>
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        <button onclick="f50_start_limit()" style="flex:1;min-width:80px;padding:10px;background:#4CAF50;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:bold;">启用限速</button>
                        <button onclick="f50_stop_limit()" style="flex:1;min-width:80px;padding:10px;background:#f44336;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:bold;">关闭限速</button>
                        <button onclick="f50_refresh_status()" style="flex:1;min-width:80px;padding:10px;background:#2196F3;color:#fff;border:none;border-radius:4px;font-size:13px;font-weight:bold;">刷新状态</button>
                    </div>
                </div>

                <!-- Tab: 中断均衡 -->
                <div id="f50_tab_irq" style="display:none;">
                    <div class="card-inner" style="margin-bottom:10px;">
                        <div class="title" style="font-size:13px;margin-bottom:8px;color:#333;">软中断（RPS）</div>
                        <div style="font-size:11px;color:#666;margin-bottom:8px;">分散NET_RX接收软中断，解决CPU0单核瓶颈</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                            <button onclick="f50_irq_status()" style="flex:1;min-width:90px;padding:7px;background:#0277bd;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">查看软中断状态</button>
                        </div>
                        <div style="font-size:12px;color:#333;margin-bottom:6px;">RPS接收软中断分散:</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button onclick="f50_set_rps('ff')" style="${BTN_GRAY}">全8核(ff)</button>
                            <button onclick="f50_set_rps('f0')" style="${BTN}">大核(f0)推荐</button>
                            <button onclick="f50_set_rps('e')" style="${BTN_GRAY}">小核除CPU0(e)</button>
                            <button onclick="f50_set_rps('1')" style="${BTN_GRAY}">恢复默认(1)</button>
                        </div>
                    </div>
                    <div class="card-inner" style="margin-bottom:10px;">
                        <div class="title" style="font-size:13px;margin-bottom:8px;color:#333;">硬中断（IRQ亲和性）</div>
                        <div style="font-size:11px;color:#666;margin-bottom:8px;">高负载非系统中断绑大核，减轻小核压力（wcn_pcie被驱动锁定不可改）</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
                            <button onclick="f50_irq_hw_status()" style="flex:1;min-width:90px;padding:7px;background:#0277bd;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">查看硬中断状态</button>
                        </div>
                        <div style="font-size:12px;color:#333;margin-bottom:6px;">中断绑核:</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button onclick="f50_irq_hw_set('f0')" style="${BTN}">绑大核(f0)推荐</button>
                            <button onclick="f50_irq_hw_set('ff')" style="${BTN_GRAY}">全核均衡(ff)</button>
                            <button onclick="f50_irq_hw_restore()" style="${BTN_GRAY}">恢复默认</button>
                        </div>
                    </div>
                </div>

                <!-- Tab: 系统 -->
                <div id="f50_tab_system" style="display:none;">
                    <div class="card-inner" style="margin-bottom:10px;">
                        <div class="title" style="font-size:13px;margin-bottom:8px;color:#333;">温度监控（高温自动降负载）</div>
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
                            <span style="font-size:13px;color:#333;white-space:nowrap;">高温阈值:</span>
                            <input id="f50_temp_threshold" value="${DEFAULT_TEMP_THRESHOLD}" style="width:60px;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;color:#333;">
                            <span style="font-size:13px;color:#333;">℃</span>
                            <span style="font-size:11px;color:#666;margin-left:8px;">超过此温度自动关闭TBF</span>
                        </div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button onclick="f50_enable_temp_guard()" style="flex:1;min-width:80px;padding:7px;background:#2e7d32;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">启用温度监控</button>
                            <button onclick="f50_disable_temp_guard()" style="flex:1;min-width:80px;padding:7px;background:#c62828;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">关闭温度监控</button>
                            <button onclick="f50_check_temp()" style="flex:1;min-width:80px;padding:7px;background:#0277bd;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">查看温度状态</button>
                        </div>
                    </div>
                    <div class="card-inner" style="margin-bottom:10px;">
                        <div class="title" style="font-size:13px;margin-bottom:8px;color:#333;">开机自启</div>
                        <div style="font-size:11px;color:#666;margin-bottom:8px;">重启自动加载：限速+TCP缓冲+conntrack+RPS+硬中断+温度监控</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button onclick="f50_enable_autostart()" style="flex:1;min-width:80px;padding:7px;background:#2e7d32;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">启用自启</button>
                            <button onclick="f50_disable_autostart()" style="flex:1;min-width:80px;padding:7px;background:#c62828;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">取消自启</button>
                            <button onclick="f50_check_autostart()" style="flex:1;min-width:80px;padding:7px;background:#0277bd;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">查看状态</button>
                        </div>
                    <div class="card-inner" style="margin-bottom:10px;">
                        <div class="title" style="font-size:13px;margin-bottom:8px;color:#333;">断流自动守护（断网自动重启WiFi）</div>
                        <div style="font-size:11px;color:#666;margin-bottom:8px;">每10秒ping 223.5.5.5，连续3次失败自动重启WiFi驱动，冷却60秒</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button onclick="f50_enable_watchdog()" style="flex:1;min-width:80px;padding:7px;background:#2e7d32;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">启用断流守护</button>
                            <button onclick="f50_disable_watchdog()" style="flex:1;min-width:80px;padding:7px;background:#c62828;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">关闭断流守护</button>
                            <button onclick="f50_check_watchdog()" style="flex:1;min-width:80px;padding:7px;background:#0277bd;color:#fff;border:none;border-radius:4px;font-size:11px;font-weight:bold;">查看守护状态</button>
                        </div>
                    </div>
                    <div class="card-inner" style="margin-bottom:10px;">
                        <div class="title" style="font-size:13px;margin-bottom:8px;color:#333;">实时状态诊断</div>
                        <div style="font-size:11px;color:#666;margin-bottom:8px;">一键收集：TBF状态/RPS掩码/conntrack/温度/软中断/dmesg WiFi报错</div>
                        <div style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button onclick="f50_diagnose()" style="flex:1;min-width:120px;padding:10px;background:#6a1b9a;color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:bold;">一键诊断</button>
                        </div>
                    </div>
                </div>

                <!-- 说明 -->
                <div style="padding:10px;background:#fff8e1;border-radius:4px;font-size:11px;color:#5d4037;line-height:1.6;">
                    <b>使用说明：</b><br>
                    1. 限速建议实际上行x0.85，60M上行建议51M<br>
                    2. 延迟阈值建议40ms，平衡5G抖动与缓冲膨胀<br>
                    3. 启用限速时自动应用16项网络调优（2G RAM+2G swap优化）<br>
                    4. RPS大核(f0)将NET_RX从CPU0分散到大核<br>
                    5. 硬中断绑大核(f0)减轻小核压力（wcn_pcie不可改，重启失效仅手动）<br>
                    6. 开机自启内置：sleep8后自动下发AT关闭PSM/eDRX（无操作UI）<br>
                    7. 断流守护：断网30秒内自动重启WiFi，不需要手动开关<br>
                    8. tbf只能限制上行，下行无法限速<br>
                    9. WiFi侧配合：关闭802.11r，2.4G/5G分开SSID<br>
                    10. 自启日志: ${BOOT_LOG}，温度日志: ${TEMP_GUARD_LOG}，断流日志: ${WATCHDOG_LOG}
                </div>
            </div>
            <div class="btn" style="text-align: right;">
                <button type="button" id="f50_tbf_close_btn">关闭</button>
            </div>`
        return modal
    }

    const modal = tbfModal()
    document.querySelector('.container').appendChild(modal)

    const f50_log = (msg) => {
        const out = document.getElementById('f50_tbf_output')
        if (out) out.innerText = msg
    }

    const f50_run = async (cmd) => {
        const res = await runShellWithRoot(cmd)
        return res.success ? res.content : `[错误] ${res.content || '执行失败'}`
    }

    // Tab切换
    window.f50_switch_tab = (tab) => {
        const tabs = ['limit', 'irq', 'system']
        tabs.forEach(t => {
            const el = document.getElementById('f50_tab_' + t)
            const btn = document.getElementById('f50_tab_btn_' + t)
            if (el) el.style.display = (t === tab) ? 'block' : 'none'
            if (btn) btn.style.background = (t === tab) ? '#1565c0' : '#546e7a'
        })
    }

    window.f50_set_rate = (val) => {
        document.getElementById('f50_tbf_rate').value = val
    }

    window.f50_set_latency = (val) => {
        document.getElementById('f50_tbf_latency').value = val
    }

    window.f50_start_limit = async () => {
        const rate = document.getElementById('f50_tbf_rate').value
        const latency = document.getElementById('f50_tbf_latency').value
        if (!rate || isNaN(rate) || rate <= 0) { createToast('请输入有效的限速值', 'red'); return }
        if (!latency || isNaN(latency) || latency <= 0) { createToast('请输入有效的延迟阈值', 'red'); return }
        f50_log('正在启用上行限速 + 网络调优...\n限速: ' + rate + 'Mbps | 延迟: ' + latency + 'ms')
        // 1. TBF限速
        const tbfCmd = `tc qdisc del dev ${WAN_IF} root 2>/dev/null; tc qdisc add dev ${WAN_IF} root tbf rate ${rate}mbit burst 15k latency ${latency}ms && echo '[OK] TBF限速已启用' || echo '[ERR] 限速失败'`
        const tbfRes = await f50_run(tbfCmd)
        // 2. 网络调优（TCP缓冲+长连接+conntrack+内存）
        const tuneCmd = SYSCTL_TUNE.filter(l => !l.startsWith('#')).join('; ')
        await f50_run(tuneCmd)
        await sleep(300)
        const status = await f50_run(`tc qdisc show dev ${WAN_IF}`)
        f50_log(tbfRes + '\n[OK] 网络调优参数已应用（TCP缓冲/长连接/conntrack/swap）\n\n' + status)
        if (tbfRes.indexOf('OK') >= 0) {
            createToast('限速+调优已启用: ' + rate + 'Mbps', 'pink')
        } else {
            createToast('限速失败', 'red')
        }
    }

    window.f50_stop_limit = async () => {
        f50_log('正在关闭上行限速...')
        const res = await f50_run(`tc qdisc del dev ${WAN_IF} root 2>/dev/null; echo '[成功] 限速已关闭'`)
        await sleep(300)
        const status = await f50_run(`tc qdisc show dev ${WAN_IF}`)
        f50_log(res + '\n\n' + status)
        createToast('限速已关闭', 'pink')
    }

    window.f50_refresh_status = async () => {
        f50_log('正在查询状态...')
        const qdisc = await f50_run(`tc qdisc show dev ${WAN_IF}`)
        const tx = await f50_run(`cat /sys/class/net/${WAN_IF}/statistics/tx_bytes 2>/dev/null`)
        const rx = await f50_run(`cat /sys/class/net/${WAN_IF}/statistics/rx_bytes 2>/dev/null`)
        const txMB = (parseInt(tx.trim()) / 1024 / 1024).toFixed(2)
        const rxMB = (parseInt(rx.trim()) / 1024 / 1024).toFixed(2)
        let text = '========== 当前队列状态 ==========\n' + qdisc + '\n\n'
        text += '========== 网卡流量统计 ==========\n'
        text += '已发送(TX): ' + txMB + ' MB\n'
        text += '已接收(RX): ' + rxMB + ' MB\n\n'
        if (qdisc.indexOf('tbf') >= 0) {
            text += '状态: 限速已启用'
        } else {
            text += '状态: 限速未启用(满速运行)'
        }
        f50_log(text)
    }

    // ===== 中断均衡（RPS） =====

    window.f50_irq_status = async () => {
        f50_log('正在查询中断状态...')
        const softirq = await f50_run(`cat /proc/softirqs | grep -E 'NET_RX|NET_TX'`)
        const rps = await f50_run(`cat /sys/class/net/${WAN_IF}/queues/rx-0/rps_cpus 2>/dev/null`)
        const queues = await f50_run(`ls /sys/class/net/${WAN_IF}/queues/`)

        let text = '========== 网络软中断分布 ==========\n'
        text += '          CPU0    CPU1    CPU2    CPU3    CPU4    CPU5    CPU6    CPU7\n'
        const lines = softirq.trim().split('\n')
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/)
            const name = parts[0]
            const vals = parts.slice(1, 9)
            text += name.padEnd(8) + ' ' + vals.map(v => v.padStart(7)).join(' ') + '\n'
        })

        text += '\n========== RPS 当前配置 ==========\n'
        text += 'RPS (接收软中断掩码): ' + rps.trim() + '\n'
        text += '网卡队列: ' + queues.trim() + '\n'

        const rxLine = lines.find(l => l.includes('NET_RX'))
        if (rxLine) {
            const rxVals = rxLine.trim().split(/\s+/).slice(1, 9).map(Number)
            const maxRx = Math.max(...rxVals)
            const minRx = Math.min(...rxVals.filter(v => v > 0))
            const ratio = minRx > 0 ? (maxRx / minRx).toFixed(1) : '∞'
            text += '\n========== 均衡性评估 ==========\n'
            text += 'NET_RX 最大/最小比值: ' + ratio + '\n'
            if (parseFloat(ratio) > 3) {
                text += '严重不均衡，建议设置RPS大核(f0)或全核(ff)\n'
            } else if (parseFloat(ratio) > 1.5) {
                text += '轻微不均衡，可考虑设置RPS\n'
            } else {
                text += '分布较均衡\n'
            }
        }

        f50_log(text)
    }

    window.f50_set_rps = async (mask) => {
        f50_log(`正在设置RPS接收软中断掩码: ${mask}...`)
        const res = await f50_run(`echo ${mask} > /sys/class/net/${WAN_IF}/queues/rx-0/rps_cpus && echo '[成功] RPS已设置为 ${mask}' || echo '[错误] RPS设置失败'`)
        await sleep(200)
        const verify = await f50_run(`cat /sys/class/net/${WAN_IF}/queues/rx-0/rps_cpus`)
        const maskName = mask === 'ff' ? '全8核' : mask === 'f0' ? '大核(CPU4-7)' : mask === 'e' ? '小核除CPU0(CPU1-3)' : mask === '1' ? '默认(仅CPU0)' : mask
        f50_log(`${res}\n\n当前RPS掩码: ${verify.trim()}\n\n说明: ${maskName}\n\nNET_RX软中断将分散到对应核心处理`)
        createToast('RPS已设置: ' + maskName, 'pink')
    }

    // ===== 硬中断均衡（IRQ亲和性） =====

    // 获取可绑定的中断列表（排除系统中断和IPI中断，只保留有负载的）
    const f50_get_bindable_irqs = async () => {
        const cmd = `awk 'NR>1 && NF>10 {
            irq=$1; gsub(/:/,"",irq); gsub(/^[ \t]+/,"",irq);
            cnt=$2; gsub(/^[ \t]+/,"",cnt);
            name=$NF; gsub(/^[ \t]+/,"",name);
            if (cnt+0 > 0 && irq !~ /^IPI/ && name !~ /timer|arch_timer|vgic|kvm|sched|ipi|resched|LOC|CAL|interrupts/) {
                print irq " " cnt " " name
            }
        }' /proc/interrupts | sort -k2 -rn | head -20`
        const res = await f50_run(cmd)
        return res.trim().split('\n').filter(l => l.trim())
    }

    window.f50_irq_hw_status = async () => {
        f50_log('正在查询硬中断状态...')
        const irqs = await f50_get_bindable_irqs()
        let text = '========== 高负载硬中断（可绑定） ==========\n\n'
        text += '中断名称              号    计数      亲和性\n'
        text += '--------------------  ----  --------  ------\n'
        for (const line of irqs) {
            const parts = line.split(/\s+/)
            const irq = parts[0]
            const cnt = parts[1]
            const name = parts.slice(2).join(' ')
            const affinity = await f50_run(`cat /proc/irq/${irq}/smp_affinity 2>/dev/null || echo N/A`)
            const nameDisp = name.length > 20 ? name.substring(0, 19) + '…' : name
            text += nameDisp.padEnd(20) + '  ' + irq.padEnd(4) + '  ' + cnt.padEnd(8) + '  ' + affinity.trim() + '\n'
        }
        text += '\n========== 说明 ==========\n'
        text += '- 已自动排除系统中断和IPI核间中断\n'
        text += '- 只显示有实际负载的中断（计数>0），按负载排序\n'
        text += '- wcn_pcie(WiFi)亲和性被驱动锁定为ff，无法修改\n'
        text += '- 其他中断绑大核(f0)可减轻小核CPU0-3压力\n'
        f50_log(text)
    }

    window.f50_irq_hw_set = async (mask) => {
        f50_log(`正在设置硬中断亲和性: ${mask}...`)
        // 先备份当前亲和性
        const backupCmd = `for irq_dir in /proc/irq/[0-9]*; do
            [ -d "$irq_dir" ] || continue
            irq_num=$(basename "$irq_dir")
            aff=$(cat /proc/irq/$irq_num/smp_affinity 2>/dev/null)
            [ -n "$aff" ] && echo "$irq_num $aff"
        done > ${IRQ_BACKUP_FILE} && echo '[成功] 已备份当前亲和性' || echo '[警告] 备份失败'`
        const backupRes = await f50_run(backupCmd)

        // 设置亲和性
        const setCmd = `COUNT=0
for irq_dir in /proc/irq/[0-9]*; do
    [ -d "$irq_dir" ] || continue
    irq_num=$(basename "$irq_dir")
    # 读取中断名称
    IRQ_NAME=$(awk -v n="$irq_num" '$1==n":"{print $NF}' /proc/interrupts 2>/dev/null)
    # 跳过系统关键中断
    case "$IRQ_NAME" in
        timer|arch_timer|vgic*|kvm*|sched*|ipi*|resched*|LOC*|CAL*) continue ;;
    esac
    # 只处理有负载的中断
    IRQ_CNT=$(awk -v n="$irq_num" '$1==n":"{print $2}' /proc/interrupts 2>/dev/null)
    [ -n "$IRQ_CNT" ] && [ "$IRQ_CNT" -gt 0 ] 2>/dev/null || continue
    # 设置亲和性
    if echo ${mask} > /proc/irq/$irq_num/smp_affinity 2>/dev/null; then
        COUNT=$((COUNT+1))
    fi
done
echo "[成功] 已设置 $COUNT 个中断的亲和性为 ${mask}"`
        const setRes = await f50_run(setCmd)

        await sleep(300)
        const maskName = mask === 'f0' ? '大核(CPU4-7)' : mask === 'ff' ? '全8核' : mask
        f50_log(`${backupRes}\n${setRes}\n\n说明: ${maskName}\n\n高负载非系统中断已绑定到指定核心处理`)
        createToast('硬中断已绑定: ' + maskName, 'pink')
    }

    window.f50_irq_hw_restore = async () => {
        f50_log('正在恢复硬中断默认亲和性...')
        const checkBackup = await f50_run(`test -f ${IRQ_BACKUP_FILE} && echo EXISTS || echo NOTFOUND`)
        if (checkBackup.indexOf('NOTFOUND') >= 0) {
            f50_log('[提示] 没有找到备份文件，将所有可绑定中断恢复为ff(全核)\n\n如果之前未设置过硬中断亲和性，此操作无影响')
            const restoreCmd = `COUNT=0
for irq_dir in /proc/irq/[0-9]*; do
    [ -d "$irq_dir" ] || continue
    irq_num=$(basename "$irq_dir")
    IRQ_NAME=$(awk -v n="$irq_num" '$1==n":"{print $NF}' /proc/interrupts 2>/dev/null)
    case "$IRQ_NAME" in
        timer|arch_timer|vgic*|kvm*|sched*|ipi*|resched*) continue ;;
    esac
    echo ff > /proc/irq/$irq_num/smp_affinity 2>/dev/null && COUNT=$((COUNT+1))
done
echo "[成功] 已恢复 $COUNT 个中断为全核(ff)"`
            const res = await f50_run(restoreCmd)
            f50_log(res)
            createToast('已恢复为全核', 'pink')
            return
        }
        const restoreCmd = `COUNT=0
while read irq_num aff; do
    [ -n "$irq_num" ] || continue
    echo "$aff" > /proc/irq/$irq_num/smp_affinity 2>/dev/null && COUNT=$((COUNT+1))
done < ${IRQ_BACKUP_FILE}
echo "[成功] 已从备份恢复 $COUNT 个中断的亲和性"
rm -f ${IRQ_BACKUP_FILE}`
        const res = await f50_run(restoreCmd)
        f50_log(res + '\n\n已从备份文件恢复原始亲和性，并删除备份')
        createToast('已恢复默认亲和性', 'pink')
    }

    // ===== 温度监控 =====

    window.f50_enable_temp_guard = async () => {
        const rate = document.getElementById('f50_tbf_rate').value
        const latency = document.getElementById('f50_tbf_latency').value
        const threshold = document.getElementById('f50_temp_threshold').value
        if (!threshold || isNaN(threshold) || threshold <= 0) {
            createToast('请输入有效的温度阈值', 'red')
            return
        }
        f50_log('正在启用温度监控...\n高温阈值: ' + threshold + '℃\n限速: ' + rate + 'Mbps / ' + latency + 'ms')

        try {
            const lines = genTempGuardLines(rate, latency, threshold)
            const quotedLines = lines.map(l => `'${l.replace(/'/g, "'\\''")}'`).join(' ')
            const writeCmd = `printf '%s\\n' ${quotedLines} > ${TEMP_GUARD_SCRIPT} && chmod 755 ${TEMP_GUARD_SCRIPT} && echo '[成功] 温度监控脚本已写入' || echo '[错误] 写入失败'`
            const writeRes = await f50_run(writeCmd)

            if (writeRes.indexOf('错误') >= 0) {
                f50_log('[错误] 温度监控脚本写入失败\n\n' + writeRes)
                createToast('温度监控脚本写入失败', 'red')
                return
            }

            await f50_run(`pkill -f '${TEMP_GUARD_SCRIPT}' 2>/dev/null`)
            await sleep(500)

            const startCmd = `nohup sh ${TEMP_GUARD_SCRIPT} >/dev/null 2>&1 & echo $!`
            const pidRes = await f50_run(startCmd)

            const registerCmd = `touch /sdcard/ufi_tools_boot.sh && grep -qxF 'sh ${TEMP_GUARD_SCRIPT} &' /sdcard/ufi_tools_boot.sh || echo 'sh ${TEMP_GUARD_SCRIPT} &' >> /sdcard/ufi_tools_boot.sh && echo '[成功] 已注册到开机脚本' || echo '[错误] 注册失败'`
            const regRes = await f50_run(registerCmd)

            f50_log(`温度监控已启用\n\n高温阈值: ${threshold}℃\n恢复参数: ${rate}Mbps / ${latency}ms\n监控脚本: ${TEMP_GUARD_SCRIPT}\n日志: ${TEMP_GUARD_LOG}\n进程PID: ${pidRes.trim()}\n\n${writeRes}\n${regRes}\n\n每30秒检测一次温度，超过阈值自动关闭TBF降负载`)
            createToast('温度监控已启用', 'pink')
        } catch (e) {
            f50_log('[错误] ' + e.message)
            createToast('启用温度监控失败', 'red')
        }
    }

    window.f50_disable_temp_guard = async () => {
        f50_log('正在关闭温度监控...')
        await f50_run(`pkill -f '${TEMP_GUARD_SCRIPT}' 2>/dev/null`)
        await f50_run(`sed -i '/${TEMP_GUARD_MARKER}/d' /sdcard/ufi_tools_boot.sh 2>/dev/null`)
        await f50_run(`rm -f ${TEMP_GUARD_SCRIPT}`)
        await sleep(300)
        f50_log(`温度监控已关闭\n\n进程已终止\n开机注册已移除\n脚本文件已删除\n\n注意：TBF限速状态保持不变，如需关闭请点"关闭限速"`)
        createToast('温度监控已关闭', 'pink')
    }

    window.f50_check_temp = async () => {
        f50_log('正在查询温度状态...')

        const tempCmd = `for z in /sys/class/thermal/thermal_zone*/temp; do [ -f "$z" ] && cat "$z"; done 2>/dev/null | sort -rn | head -1`
        const maxTemp = await f50_run(tempCmd)
        const tempVal = parseInt(maxTemp.trim())
        const tempC = isNaN(tempVal) ? '未知' : (tempVal / 1000).toFixed(1) + '℃'

        const procCheck = await f50_run(`ps | grep '${TEMP_GUARD_SCRIPT}' | grep -v grep | wc -l`)
        const procRunning = parseInt(procCheck.trim()) > 0

        const bootCheck = await f50_run(`grep -c '${TEMP_GUARD_MARKER}' /sdcard/ufi_tools_boot.sh 2>/dev/null || echo 0`)
        const bootRegistered = parseInt(bootCheck.trim()) > 0

        const logCheck = await f50_run(`cat ${TEMP_GUARD_LOG} 2>/dev/null | tail -10`)

        let text = '========== 温度状态 ==========\n\n'
        text += '当前最高温度: ' + tempC + '\n'
        text += '监控进程: ' + (procRunning ? '运行中' : '未运行') + '\n'
        text += '开机自启: ' + (bootRegistered ? '已注册' : '未注册') + '\n\n'

        if (logCheck.trim() && !logCheck.includes('No such')) {
            text += '========== 最近温度监控日志 ==========\n' + logCheck
        } else {
            text += '暂无温度监控日志（启用后高温/恢复时会记录）'
        }

        f50_log(text)
    }

    // ===== 断流自动守护 =====

    window.f50_enable_watchdog = async () => {
        f50_log('正在启用断流自动守护...')
        try {
            const lines = genWatchdogLines()
            const quotedLines = lines.map(l => `'${l.replace(/'/g, "'\\''")}'`).join(' ')
            const writeCmd = `printf '%s\\n' ${quotedLines} > ${WATCHDOG_SCRIPT} && chmod 755 ${WATCHDOG_SCRIPT} && echo '[成功] 断流守护脚本已写入' || echo '[错误] 写入失败'`
            const writeRes = await f50_run(writeCmd)

            if (writeRes.indexOf('错误') >= 0) {
                f50_log('[错误] 断流守护脚本写入失败\n\n' + writeRes)
                createToast('断流守护脚本写入失败', 'red')
                return
            }

            await f50_run(`pkill -f '${WATCHDOG_SCRIPT}' 2>/dev/null`)
            await sleep(500)

            const startCmd = `nohup sh ${WATCHDOG_SCRIPT} >/dev/null 2>&1 & echo $!`
            const pidRes = await f50_run(startCmd)

            const registerCmd = `touch /sdcard/ufi_tools_boot.sh && grep -qxF 'sh ${WATCHDOG_SCRIPT} &' /sdcard/ufi_tools_boot.sh || echo 'sh ${WATCHDOG_SCRIPT} &' >> /sdcard/ufi_tools_boot.sh && echo '[成功] 已注册到开机脚本' || echo '[错误] 注册失败'`
            const regRes = await f50_run(registerCmd)

            f50_log(`断流自动守护已启用\n\n检测目标: 223.5.5.5\n检测间隔: 10秒\n失败阈值: 连续3次\n恢复动作: 自动重启WiFi驱动\n冷却时间: 60秒\n\n脚本: ${WATCHDOG_SCRIPT}\n日志: ${WATCHDOG_LOG}\n进程PID: ${pidRes.trim()}\n\n${writeRes}\n${regRes}\n\n断网后约30秒内自动重启WiFi恢复，不需要手动操作`)
            createToast('断流守护已启用', 'pink')
        } catch (e) {
            f50_log('[错误] ' + e.message)
            createToast('启用断流守护失败', 'red')
        }
    }

    window.f50_disable_watchdog = async () => {
        f50_log('正在关闭断流守护...')
        await f50_run(`pkill -f '${WATCHDOG_SCRIPT}' 2>/dev/null`)
        await f50_run(`sed -i '/${WATCHDOG_MARKER}/d' /sdcard/ufi_tools_boot.sh 2>/dev/null`)
        await f50_run(`rm -f ${WATCHDOG_SCRIPT}`)
        await sleep(300)
        f50_log(`断流守护已关闭\n\n进程已终止\n开机注册已移除\n脚本文件已删除`)
        createToast('断流守护已关闭', 'pink')
    }

    window.f50_check_watchdog = async () => {
        f50_log('正在查询断流守护状态...')

        const procCheck = await f50_run(`ps | grep '${WATCHDOG_SCRIPT}' | grep -v grep | wc -l`)
        const procRunning = parseInt(procCheck.trim()) > 0

        const bootCheck = await f50_run(`grep -c '${WATCHDOG_MARKER}' /sdcard/ufi_tools_boot.sh 2>/dev/null || echo 0`)
        const bootRegistered = parseInt(bootCheck.trim()) > 0

        const logCheck = await f50_run(`cat ${WATCHDOG_LOG} 2>/dev/null | tail -15`)

        let text = '========== 断流守护状态 ==========\n\n'
        text += '守护进程: ' + (procRunning ? '运行中' : '未运行') + '\n'
        text += '开机自启: ' + (bootRegistered ? '已注册' : '未注册') + '\n\n'

        if (logCheck.trim() && !logCheck.includes('No such')) {
            text += '========== 最近断流守护日志 ==========\n' + logCheck
        } else {
            text += '暂无断流守护日志（启用后断流/重启时会记录）'
        }

        f50_log(text)
    }

    // ===== 实时状态诊断 =====

    // 解析RPS掩码，返回活跃核心索引数组
    const parseRpsMask = (mask) => {
        const hex = mask.trim().toLowerCase()
        const num = parseInt(hex, 16)
        if (isNaN(num)) return []
        const activeCpus = []
        for (let i = 0; i < 8; i++) {
            if (num & (1 << i)) activeCpus.push(i)
        }
        return activeCpus
    }

    // 获取RPS掩码对应的核心范围描述
    const getRpsCpuDesc = (mask) => {
        const cpus = parseRpsMask(mask)
        if (cpus.length === 0) return '无核心'
        if (cpus.length === 8) return '全8核(CPU0-7)'
        const bigCores = cpus.filter(c => c >= 4)
        const smallCores = cpus.filter(c => c < 4)
        let desc = 'CPU' + cpus.join(',')
        if (bigCores.length === 4 && smallCores.length === 0) desc += ' (大核)'
        if (smallCores.length === 3 && bigCores.length === 0) desc += ' (小核除CPU0)'
        if (cpus.length === 1 && cpus[0] === 0) desc += ' (仅CPU0)'
        return desc
    }

    window.f50_diagnose = async () => {
        f50_log('正在收集系统状态...')

        // 1. TBF状态
        const tbfStatus = await f50_run(`tc qdisc show dev ${WAN_IF} 2>/dev/null`)
        const tbfStats = await f50_run(`tc -s qdisc show dev ${WAN_IF} 2>/dev/null | grep -A5 'overlimits'`)

        // 2. RPS掩码
        const rpsMask = await f50_run(`cat /sys/class/net/${WAN_IF}/queues/rx-0/rps_cpus 2>/dev/null`)
        const rpsMaskTrim = rpsMask.trim()
        const activeCpus = parseRpsMask(rpsMaskTrim)

        // 3. conntrack
        const conntrackCount = await f50_run(`cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null || echo N/A`)
        const conntrackMax = await f50_run(`cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null || echo N/A`)

        // 4. 最高温度
        const maxTemp = await f50_run(`for z in /sys/class/thermal/thermal_zone*/temp; do [ -f "$z" ] && cat "$z"; done 2>/dev/null | sort -rn | head -1`)
        const tempVal = parseInt(maxTemp.trim())
        const tempC = isNaN(tempVal) ? '未知' : (tempVal / 1000).toFixed(1) + '℃'

        // 5. 软中断分布
        const softirq = await f50_run(`cat /proc/softirqs | grep -E 'NET_RX|NET_TX'`)

        // 6. dmesg WiFi相关（分三类：正常统计/资源耗尽/skb警告）
        const dmesgAll = await f50_run(`dmesg 2>/dev/null | grep -iE 'sprd-wlan|sc2355' | tail -30`)
        // 资源耗尽错误：free_num后面跟小数字（<10）
        const dmesgResourceErr = dmesgAll.split('\n').filter(l => {
            const m = l.match(/free_num[=:]\s*(\d+)/)
            return m && parseInt(m[1]) < 10
        })
        // skb警告：data len / skb need
        const dmesgSkbWarn = dmesgAll.split('\n').filter(l => l.includes('data len') && l.includes('skb need'))
        // 正常统计日志（total free num）
        const dmesgNormal = dmesgAll.split('\n').filter(l => l.includes('total free num') || l.includes('total tx_num'))

        // 7. 内存
        const memInfo = await f50_run(`free -m 2>/dev/null | head -2`)

        // 8. swappiness
        const swappiness = await f50_run(`cat /proc/sys/vm/swappiness 2>/dev/null`)

        let text = '========== F50 实时状态诊断 v2.0.4 ==========\n\n'

        // 【1. TBF限速状态】
        text += '【1. TBF限速状态】\n' + tbfStatus.trim() + '\n'
        if (tbfStats.trim()) {
            text += tbfStats.trim() + '\n'
            // 计算丢包率
            const droppedMatch = tbfStats.match(/dropped\s+(\d+)/)
            const pktMatch = tbfStats.match(/\((\d+)\s*pkt/)
            if (droppedMatch && pktMatch) {
                const dropped = parseInt(droppedMatch[1])
                const totalPkt = parseInt(pktMatch[1])
                if (totalPkt > 0) {
                    const dropRate = (dropped / totalPkt * 100).toFixed(2)
                    text += '丢包率: ' + dropRate + '% (' + dropped + '/' + totalPkt + ')\n'
                    if (parseFloat(dropRate) > 1) {
                        text += '⚠️ 丢包率过高(>1%)，建议降低上行带宽或增大latency\n'
                    }
                }
            }
        }
        text += '\n'

        // 【2. RPS软中断】
        text += '【2. RPS软中断】\n'
        text += '当前掩码: ' + rpsMaskTrim + ' (' + getRpsCpuDesc(rpsMaskTrim) + ')\n'
        text += '活跃核心数: ' + activeCpus.length + ' 个\n\n'

        // 【3. Conntrack连接跟踪】
        text += '【3. Conntrack连接跟踪】\n'
        text += '当前连接数: ' + conntrackCount.trim() + ' / 上限: ' + conntrackMax.trim() + '\n'
        const ctCount = parseInt(conntrackCount.trim())
        const ctMax = parseInt(conntrackMax.trim())
        if (!isNaN(ctCount) && !isNaN(ctMax) && ctMax > 0) {
            const ctPct = (ctCount / ctMax * 100).toFixed(1)
            text += '使用率: ' + ctPct + '%\n'
            if (parseFloat(ctPct) > 80) text += '⚠️ 连接表使用率过高(>80%)，可能导致NAT丢包\n'
            else if (parseFloat(ctPct) > 50) text += '⚠️ 连接表使用率偏高(>50%)，注意观察\n'
        }
        text += '\n'

        // 【4. 温度】
        text += '【4. 温度】\n'
        text += '当前最高温度: ' + tempC + '\n'
        if (!isNaN(tempVal)) {
            if (tempVal >= 65000) text += '🔴 温度过高(>=65℃)，严重降频风险，建议立即降负载\n'
            else if (tempVal >= 55000) text += '⚠️ 温度偏高(>=55℃)，可能触发降频\n'
            else if (tempVal >= 45000) text += '🟡 温度正常偏高(45-55℃)，持续观察\n'
            else text += '🟢 温度正常(<45℃)\n'
        }
        text += '\n'

        // 【5. 网络软中断分布】
        text += '【5. 网络软中断分布】\n'
        text += '          CPU0    CPU1    CPU2    CPU3    CPU4    CPU5    CPU6    CPU7\n'
        const lines = softirq.trim().split('\n')
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/)
            const name = parts[0]
            const vals = parts.slice(1, 9)
            text += name.padEnd(8) + ' ' + vals.map(v => v.padStart(7)).join(' ') + '\n'
        })

        // NET_RX 均衡性评估（仅在RPS活跃核心范围内比较）
        const rxLine = lines.find(l => l.includes('NET_RX'))
        if (rxLine && activeCpus.length > 1) {
            const rxValsAll = rxLine.trim().split(/\s+/).slice(1, 9).map(Number)
            // 只取RPS活跃核心的NET_RX值
            const rxValsActive = activeCpus.map(i => rxValsAll[i] || 0)
            const maxRx = Math.max(...rxValsActive)
            const minRx = Math.min(...rxValsActive.filter(v => v > 0))
            const ratio = minRx > 0 ? (maxRx / minRx).toFixed(1) : '∞'

            text += '\nNET_RX 均衡性评估（RPS活跃核心范围: CPU' + activeCpus.join(',') + '）\n'
            text += '活跃核心最大值: ' + maxRx + '\n'
            text += '活跃核心最小值: ' + (minRx > 0 ? minRx : '0(部分核心无负载)') + '\n'
            text += '最大/最小比值: ' + ratio + '\n'

            if (minRx > 0) {
                if (parseFloat(ratio) > 5) text += '🔴 活跃核心内严重不均衡(>5)，RPS哈希分布不均，可尝试ff全核\n'
                else if (parseFloat(ratio) > 3) text += '⚠️ 活跃核心内不均衡(>3)，可观察是否影响性能\n'
                else if (parseFloat(ratio) > 1.5) text += '🟡 活跃核心内轻微不均衡(>1.5)，正常范围\n'
                else text += '🟢 活跃核心内分布均衡\n'
            } else {
                text += '⚠️ 部分活跃核心无NET_RX负载，可能RPS设置未生效或流量过低\n'
            }
        } else if (rxLine && activeCpus.length === 1) {
            text += '\nNET_RX 均衡性: RPS仅1个活跃核心(CPU' + activeCpus[0] + ')，跳过均衡性评估\n'
        } else if (rxLine && activeCpus.length === 0) {
            text += '\n⚠️ RPS掩码解析失败，无法评估均衡性\n'
        }
        text += '\n'

        // 【6. WiFi芯片dmesg分析】
        text += '【6. WiFi芯片dmesg分析】\n'
        text += '最近30条sprd-wlan/sc2355日志分类统计:\n'
        text += '  正常TX统计日志: ' + dmesgNormal.length + ' 条\n'
        text += '  skb缓冲区警告: ' + dmesgSkbWarn.length + ' 条\n'
        text += '  TX资源耗尽错误: ' + dmesgResourceErr.length + ' 条\n\n'

        if (dmesgResourceErr.length > 0) {
            text += '🔴 检测到TX资源耗尽错误（free_num<10）:\n'
            dmesgResourceErr.slice(-5).forEach(l => text += '  ' + l.trim() + '\n')
            text += '\n⚠️ 这是iPhone偶发断网的根因！WiFi芯片PCIe TX资源被安卓视频大包抢占\n'
            text += '建议：降低TBF上行带宽到40-45Mbps，或增大latency到50ms\n'
        } else if (dmesgSkbWarn.length > 0) {
            text += '🟡 检测到skb缓冲区警告（非致命）:\n'
            dmesgSkbWarn.slice(-3).forEach(l => text += '  ' + l.trim() + '\n')
            text += '\n说明：data len与skb need不匹配，轻微性能损失，不影响网络连通性\n'
        } else if (dmesgNormal.length > 0) {
            text += '🟢 仅正常TX统计日志，WiFi芯片运行正常\n'
            text += '最近1条正常统计: ' + dmesgNormal[dmesgNormal.length - 1].trim().substring(0, 100) + '...\n'
        } else {
            text += '🟢 无WiFi相关日志（正常）\n'
        }
        text += '\n'

        // 【7. 内存状态】
        text += '【7. 内存状态】\n' + memInfo.trim() + '\n'
        // 解析内存使用率
        const memLines = memInfo.trim().split('\n')
        if (memLines.length >= 2) {
            const memParts = memLines[1].trim().split(/\s+/)
            const memTotal = parseInt(memParts[1])
            const memUsed = parseInt(memParts[2])
            const memFree = parseInt(memParts[3])
            if (!isNaN(memTotal) && memTotal > 0) {
                const memPct = (memUsed / memTotal * 100).toFixed(1)
                text += '内存使用率: ' + memPct + '% (used ' + memUsed + 'M / total ' + memTotal + 'M)\n'
                if (parseFloat(memPct) > 95) text += '🔴 内存使用率极高(>95%)，free仅' + memFree + 'M，可能OOM或频繁swap\n'
                else if (parseFloat(memPct) > 85) text += '⚠️ 内存使用率偏高(>85%)，建议清理后台进程\n'
                else text += '🟢 内存使用率正常\n'
            }
        }
        text += '\n'

        // 【8. Swappiness】
        text += '【8. Swappiness】\n'
        text += '当前值: ' + swappiness.trim() + ' (60=Linux默认, 150=固件默认)\n'
        const swapVal = parseInt(swappiness.trim())
        if (!isNaN(swapVal)) {
            if (swapVal >= 150) text += '🔴 swappiness=150(固件默认)，频繁swap导致网络延迟，建议降到60\n'
            else if (swapVal >= 100) text += '⚠️ swappiness过高(>=100)，可能频繁swap\n'
            else if (swapVal <= 20) text += '⚠️ swappiness过低(<=20)，可能OOM风险\n'
            else text += '🟢 swappiness合理(20-100)\n'
        }

        text += '\n========== 诊断完成 =========='

        f50_log(text)
        createToast('诊断完成', 'pink')
    }

    // ===== 开机自启 =====

    window.f50_enable_autostart = async () => {
        const rate = document.getElementById('f50_tbf_rate').value
        const latency = document.getElementById('f50_tbf_latency').value
        const threshold = document.getElementById('f50_temp_threshold').value
        if (!rate || isNaN(rate) || rate <= 0) {
            createToast('请先设置限速值', 'red')
            return
        }
        if (!latency || isNaN(latency) || latency <= 0) {
            createToast('请先设置延迟阈值', 'red')
            return
        }

        const curRps = await f50_run(`cat /sys/class/net/${WAN_IF}/queues/rx-0/rps_cpus 2>/dev/null`)
        const rpsMask = curRps.trim() || 'f0'

        f50_log(`正在启用开机自启...\n限速: ${rate}Mbps\n延迟: ${latency}ms\n高温阈值: ${threshold}℃\nRPS: ${rpsMask}\n\n[1/4] 写入TBF+RPS+网络调优自启脚本...`)

        try {
            const lines = genBootLines(rate, latency, rpsMask)
            const quotedLines = lines.map(l => `'${l.replace(/'/g, "'\\''")}'`).join(' ')
            const writeCmd = `printf '%s\\n' ${quotedLines} > ${BOOT_SCRIPT} && chmod 755 ${BOOT_SCRIPT} && echo '[成功] 自启脚本已写入' || echo '[错误] 写入失败'`
            const writeRes = await f50_run(writeCmd)

            if (writeRes.indexOf('错误') >= 0) {
                f50_log('[错误] 自启脚本写入失败\n\n' + writeRes)
                createToast('自启脚本写入失败', 'red')
                return
            }

            f50_log(`正在启用开机自启...\n\n[1/5] TBF+RPS自启脚本...\n${writeRes}\n\n[2/5] 写入温度监控脚本...`)

            const tempLines = genTempGuardLines(rate, latency, threshold)
            const tempQuoted = tempLines.map(l => `'${l.replace(/'/g, "'\\''")}'`).join(' ')
            const tempWriteCmd = `printf '%s\\n' ${tempQuoted} > ${TEMP_GUARD_SCRIPT} && chmod 755 ${TEMP_GUARD_SCRIPT} && echo '[成功] 温度监控脚本已写入' || echo '[错误] 写入失败'`
            const tempWriteRes = await f50_run(tempWriteCmd)

            f50_log(`正在启用开机自启...\n\n[1/5] TBF+RPS自启脚本...\n${writeRes}\n\n[2/5] 温度监控脚本...\n${tempWriteRes}\n\n[3/5] 写入断流守护脚本...`)

            const watchdogLines = genWatchdogLines()
            const watchdogQuoted = watchdogLines.map(l => `'${l.replace(/'/g, "'\\''")}'`).join(' ')
            const watchdogWriteCmd = `printf '%s\\n' ${watchdogQuoted} > ${WATCHDOG_SCRIPT} && chmod 755 ${WATCHDOG_SCRIPT} && echo '[成功] 断流守护脚本已写入' || echo '[错误] 写入失败'`
            const watchdogWriteRes = await f50_run(watchdogWriteCmd)

            f50_log(`正在启用开机自启...\n\n[1/5] TBF+RPS自启脚本...\n${writeRes}\n\n[2/5] 温度监控脚本...\n${tempWriteRes}\n\n[3/5] 断流守护脚本...\n${watchdogWriteRes}\n\n[4/5] 注册到开机脚本...`)

            const registerCmd = `touch /sdcard/ufi_tools_boot.sh && grep -qxF 'sh ${BOOT_SCRIPT} &' /sdcard/ufi_tools_boot.sh || echo 'sh ${BOOT_SCRIPT} &' >> /sdcard/ufi_tools_boot.sh; grep -qxF 'sh ${TEMP_GUARD_SCRIPT} &' /sdcard/ufi_tools_boot.sh || echo 'sh ${TEMP_GUARD_SCRIPT} &' >> /sdcard/ufi_tools_boot.sh; grep -qxF 'sh ${WATCHDOG_SCRIPT} &' /sdcard/ufi_tools_boot.sh || echo 'sh ${WATCHDOG_SCRIPT} &' >> /sdcard/ufi_tools_boot.sh && echo '[成功] 已注册到开机脚本' || echo '[错误] 注册失败'`
            const regRes = await f50_run(registerCmd)

            await sleep(200)

            const verifyCmd = `echo '========== 开机脚本内容 ==========' && cat /sdcard/ufi_tools_boot.sh && echo '' && echo '========== TBF自启脚本 ==========' && ls -la ${BOOT_SCRIPT} && echo '' && echo '========== 温度监控脚本 ==========' && ls -la ${TEMP_GUARD_SCRIPT} && echo '' && echo '========== 断流守护脚本 ==========' && ls -la ${WATCHDOG_SCRIPT}`
            const verifyRes = await f50_run(verifyCmd)

            f50_log(`开机自启已启用\n\n限速: ${rate}Mbps / 延迟${latency}ms\n高温阈值: ${threshold}℃\nRPS: ${rpsMask}\n\n包含：\n  - TBF限速自启（TCP缓冲+conntrack+16项网络调优）\n  - RPS软中断分散自启（网络性能核心，可稳定保持）\n  - 温度监控自启（高温自动降负载）\n  - 断流守护自启（断网30秒内自动重启WiFi）\n  - 开机内置：sleep8后自动下发AT关闭PSM/eDRX（无操作UI）\n  - 二次重刷机制（对抗固件init脚本覆盖vm.swappiness等参数）\n\n注意：硬中断亲和性不做开机持久化（展锐Android驱动会重置），需要时手动点「绑大核」\n\n${verifyRes}\n\n重启设备后约25秒自动加载全部优化`)
            createToast('开机自启已启用', 'pink')
        } catch (e) {
            f50_log('[错误] ' + e.message)
            createToast('启用自启失败', 'red')
        }
    }

    window.f50_disable_autostart = async () => {
        f50_log('正在取消开机自启...')
        await f50_run(`sed -i '/${BOOT_MARKER}/d' /sdcard/ufi_tools_boot.sh 2>/dev/null`)
        await f50_run(`sed -i '/${TEMP_GUARD_MARKER}/d' /sdcard/ufi_tools_boot.sh 2>/dev/null`)
        await f50_run(`sed -i '/${WATCHDOG_MARKER}/d' /sdcard/ufi_tools_boot.sh 2>/dev/null`)
        await f50_run(`rm -f ${BOOT_SCRIPT} ${TEMP_GUARD_SCRIPT} ${WATCHDOG_SCRIPT}`)
        await f50_run(`pkill -f '${TEMP_GUARD_SCRIPT}' 2>/dev/null`)
        await f50_run(`pkill -f '${WATCHDOG_SCRIPT}' 2>/dev/null`)
        await sleep(200)
        const verify = await f50_run(`grep -cE '${BOOT_MARKER}|${TEMP_GUARD_MARKER}|${WATCHDOG_MARKER}' /sdcard/ufi_tools_boot.sh 2>/dev/null || echo 0`)
        f50_log(`开机自启已取消\n\nTBF自启脚本已删除\n温度监控脚本已删除，进程已终止\n断流守护脚本已删除，进程已终止\n开机脚本注册项已移除\n\n剩余匹配数: ${verify.trim()}`)
        createToast('已取消开机自启', 'pink')
    }

    window.f50_check_autostart = async () => {
        f50_log('正在查询开机自启状态...')
        const bootCheck = await f50_run(`grep -c '${BOOT_MARKER}' /sdcard/ufi_tools_boot.sh 2>/dev/null || echo 0`)
        const tempBootCheck = await f50_run(`grep -c '${TEMP_GUARD_MARKER}' /sdcard/ufi_tools_boot.sh 2>/dev/null || echo 0`)
        const watchdogBootCheck = await f50_run(`grep -c '${WATCHDOG_MARKER}' /sdcard/ufi_tools_boot.sh 2>/dev/null || echo 0`)
        const scriptCheck = await f50_run(`ls -la ${BOOT_SCRIPT} 2>/dev/null && echo EXISTS || echo NOTFOUND`)
        const tempScriptCheck = await f50_run(`ls -la ${TEMP_GUARD_SCRIPT} 2>/dev/null && echo EXISTS || echo NOTFOUND`)
        const watchdogScriptCheck = await f50_run(`ls -la ${WATCHDOG_SCRIPT} 2>/dev/null && echo EXISTS || echo NOTFOUND`)
        const tempProcCheck = await f50_run(`ps | grep '${TEMP_GUARD_SCRIPT}' | grep -v grep | wc -l`)
        const watchdogProcCheck = await f50_run(`ps | grep '${WATCHDOG_SCRIPT}' | grep -v grep | wc -l`)
        const rpsCheck = await f50_run(`cat /sys/class/net/${WAN_IF}/queues/rx-0/rps_cpus 2>/dev/null`)
        const logCheck = await f50_run(`cat ${BOOT_LOG} 2>/dev/null | tail -10`)

        let text = '========== 开机自启状态 ==========\n\n'
        text += 'TBF限速自启注册: ' + (parseInt(bootCheck.trim()) > 0 ? '已注册' : '未注册') + '\n'
        text += '温度监控自启注册: ' + (parseInt(tempBootCheck.trim()) > 0 ? '已注册' : '未注册') + '\n'
        text += '断流守护自启注册: ' + (parseInt(watchdogBootCheck.trim()) > 0 ? '已注册' : '未注册') + '\n'
        text += 'TBF自启脚本文件: ' + (scriptCheck.indexOf('EXISTS') >= 0 ? '存在' : '不存在') + '\n'
        text += '温度监控脚本文件: ' + (tempScriptCheck.indexOf('EXISTS') >= 0 ? '存在' : '不存在') + '\n'
        text += '断流守护脚本文件: ' + (watchdogScriptCheck.indexOf('EXISTS') >= 0 ? '存在' : '不存在') + '\n'
        text += '温度监控进程: ' + (parseInt(tempProcCheck.trim()) > 0 ? '运行中' : '未运行') + '\n'
        text += '断流守护进程: ' + (parseInt(watchdogProcCheck.trim()) > 0 ? '运行中' : '未运行') + '\n'
        text += '当前RPS掩码: ' + rpsCheck.trim() + '\n\n'

        if (logCheck.trim() && !logCheck.includes('错误') && !logCheck.includes('No such')) {
            text += '========== 最近TBF自启日志 ==========\n' + logCheck
        } else {
            text += '暂无TBF自启日志（重启设备后会自动生成）'
        }
        f50_log(text)
    }

    // 创建入口按钮
    const btn = document.createElement('button')
    btn.textContent = "上行限速器"
    btn.onclick = () => {
        showModal('#' + modal.id)
        setTimeout(() => { f50_refresh_status() }, 300)
    }

    const btns = document.querySelector('.actions-buttons')
    if (btns) {
        btns.appendChild(btn)
    }

    modal.querySelector('#f50_tbf_close_btn').onclick = () => {
        closeModal('#' + modal.id)
    }
})()
//</script>
