//<script>
(async () => {
  const TITLE = 'USB网络模式切换';
  const MODAL_NAME = 'kano_usb_network_manager_modal';
  const STYLE_ID = 'kano_usb_network_manager_style';
  const BASE_DIR = '/data/kano_usb_network_manager';
  const SCRIPT_DIR = `${BASE_DIR}/scripts`;
  const CONFIG_FILE = `${BASE_DIR}/config.env`;
  const DAEMON_FILE = `${BASE_DIR}/usb_network_daemon.sh`;
  const PID_FILE = `${BASE_DIR}/daemon.pid`;
  const LOG_FILE = `${BASE_DIR}/daemon.log`;
  const BOOT_SH_FILE = '/sdcard/ufi_tools_boot.sh';
  const BOOT_LINE = `sh ${DAEMON_FILE} start >/dev/null 2>&1 &`;

  const MODES = [
    { key: 'adb_ncm', label: 'ADB + NCM', script: 'adb_ncm.sh', hint: 'ADB 与 NCM 同时开启' },
    { key: 'adb_ecm', label: 'ADB + ECM', script: 'adb_ecm.sh', hint: 'ADB 与 ECM 同时开启' },
  ];

  const DEFAULT_CONFIG = {
    mode: 'adb_ncm',
    patrol: '1',
  };

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const shellQuote = (value = '') => `'${String(value).replace(/'/g, `'\\''`)}'`;

  const encodePayload = (value = '') => {
    try {
      return btoa(unescape(encodeURIComponent(String(value))));
    } catch {
      return '';
    }
  };

  const run = async (command, timeout = 30000) => {
    const res = await runShellWithRoot(command, timeout);
    return {
      ok: Boolean(res?.success),
      text: String(res?.content || '').trim(),
      raw: res,
    };
  };

  const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

  const scriptContentMap = {
    'ncm.sh': `#!/system/bin/sh
#先触发usb共享
/system/bin/svc usb setFunctions rndis
sleep 1
G=/config/usb_gadget/g1
UDC=$(ls /sys/class/udc | head -n1)

setprop sys.usb.config none
sleep 1

cd $G
echo "" > UDC

# 清掉旧的 rndis 绑定
rm -f configs/b.1/f*

# 创建 NCM function 实例
mkdir -p functions/ncm.usb0

# 绑定到配置
ln -s functions/ncm.usb0 configs/b.1/f1

echo "$UDC" > UDC
`,
    'ecm.sh': `#!/system/bin/sh
G=/config/usb_gadget/g1
UDC=$(ls /sys/class/udc | head -n1)

# 先触发 USB 共享
/system/bin/svc usb setFunctions rndis
sleep 1

setprop sys.usb.config none
sleep 1

cd $G
echo "" > UDC

# 清掉旧绑定
rm -f configs/b.1/f*
rmdir functions/ecm.usb0 2>/dev/null
rmdir functions/ncm.usb0 2>/dev/null

# 创建 ECM function 实例
mkdir -p functions/ecm.usb0

# 绑定到配置
ln -s functions/ecm.usb0 configs/b.1/f1

echo "$UDC" > UDC
`,
    'adb_ncm.sh': `#!/system/bin/sh
G=/config/usb_gadget/g1
UDC=$(ls /sys/class/udc | head -n1)

# 基于“普通 NCM 稳定”的流程，只额外挂上 ADB
svc usb setFunctions rndis
sleep 1

setprop sys.usb.config none
sleep 1

cd $G
echo "" > UDC

rm -f configs/b.1/f*
rmdir functions/ncm.usb0 2>/dev/null
rmdir functions/ecm.usb0 2>/dev/null

mkdir -p functions/ncm.usb0

start adbd
i=0
while [ "$(getprop sys.usb.ffs.ready)" != "1" ] && [ $i -lt 10 ]; do
    sleep 1
    i=$((i + 1))
done

echo ncm_adb > configs/b.1/strings/0x409/configuration 2>/dev/null
ln -s functions/ncm.usb0 configs/b.1/f1
ln -s functions/ffs.adb configs/b.1/f2

echo "$UDC" > UDC
`,
    'adb_ecm.sh': `#!/system/bin/sh
G=/config/usb_gadget/g1
UDC=$(ls /sys/class/udc | head -n1)

# 基于“普通 ECM 稳定”的流程，只额外挂上 ADB
svc usb setFunctions rndis
sleep 1

setprop sys.usb.config none
sleep 1

cd $G
echo "" > UDC

rm -f configs/b.1/f*
rmdir functions/ecm.usb0 2>/dev/null
rmdir functions/ncm.usb0 2>/dev/null

mkdir -p functions/ecm.usb0

start adbd
i=0
while [ "$(getprop sys.usb.ffs.ready)" != "1" ] && [ $i -lt 10 ]; do
    sleep 1
    i=$((i + 1))
done

echo ecm_adb > configs/b.1/strings/0x409/configuration 2>/dev/null
ln -s functions/ecm.usb0 configs/b.1/f1
ln -s functions/ffs.adb configs/b.1/f2

echo "$UDC" > UDC
`,
    'restore_rndis.sh': `#!/system/bin/sh
G=/config/usb_gadget/g1
UDC=$(ls /sys/class/udc | head -n1)
RNDIS_FUNC=""

setprop sys.usb.config none
sleep 1

echo "" > $G/UDC

# 清空所有 function 绑定
rm -f $G/configs/b.1/f*

# 之前手动创建的 ecm
rmdir $G/functions/ecm.usb0 2>/dev/null
rmdir $G/functions/ncm.usb0 2>/dev/null

for name in rndis.gs4 rndis.usb0; do
    if [ -d "$G/functions/$name" ]; then
        RNDIS_FUNC="$name"
        break
    fi
done

if [ -z "$RNDIS_FUNC" ]; then
    RNDIS_FUNC="$(ls $G/functions 2>/dev/null | grep '^rndis\\.' | head -n1)"
fi

# 恢复原厂组合（Unisoc）
if [ -d "$G/functions/ffs.adb" ]; then
    ln -s $G/functions/ffs.adb $G/configs/b.1/f1
fi
if [ -n "$RNDIS_FUNC" ] && [ -d "$G/functions/$RNDIS_FUNC" ]; then
    ln -s $G/functions/$RNDIS_FUNC $G/configs/b.1/f2
fi

echo "$UDC" > $G/UDC

setprop sys.usb.config rndis,adb
# 触发 usb 共享
svc usb setFunctions rndis
`,
    'usb_network_daemon.sh': `#!/system/bin/sh
BASE_DIR="/data/kano_usb_network_manager"
SCRIPT_DIR="$BASE_DIR/scripts"
CONFIG_FILE="$BASE_DIR/config.env"
PID_FILE="$BASE_DIR/daemon.pid"
LOG_FILE="$BASE_DIR/daemon.log"

load_config() {
  MODE="adb_ncm"
  DELAY_SECONDS="8"
  PATROL_ENABLED="1"
  [ -f "$CONFIG_FILE" ] && . "$CONFIG_FILE"
  [ -z "$MODE" ] && MODE="adb_ncm"
  [ -z "$PATROL_ENABLED" ] && PATROL_ENABLED="1"
}

log_msg() {
  mkdir -p "$BASE_DIR"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

get_state() {
  local udc_name
  udc_name="$(ls /sys/class/udc 2>/dev/null | head -n1)"
  if [ -n "$udc_name" ] && [ -f "/sys/class/udc/$udc_name/state" ]; then
    timeout 2s awk 'NR==1{print; exit}' "/sys/class/udc/$udc_name/state" 2>/dev/null
    return
  fi
  if [ -f /sys/class/android_usb/android0/state ]; then
    timeout 2s awk 'NR==1{print; exit}' /sys/class/android_usb/android0/state 2>/dev/null
    return
  fi
  echo unknown
}

is_connected() {
  case "$1" in
    configured|connected|suspended)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

run_mode_script() {
  local mode_key="$1"
  local script_name=""
  case "$mode_key" in
    adb_ncm) script_name="adb_ncm.sh" ;;
    adb_ecm) script_name="adb_ecm.sh" ;;
    *) return 1 ;;
  esac
  if [ ! -f "$SCRIPT_DIR/$script_name" ]; then
    log_msg "脚本不存在: $script_name"
    return 1
  fi
  if [ -f "$SCRIPT_DIR/restore_rndis.sh" ]; then
    log_msg "切换前先恢复到 ADB+RNDIS"
    sh "$SCRIPT_DIR/restore_rndis.sh" >> "$LOG_FILE" 2>&1
    sleep 1
  fi
  sh "$SCRIPT_DIR/$script_name" >> "$LOG_FILE" 2>&1
  local status=$?
  if [ $status -ne 0 ]; then
    log_msg "模式脚本执行失败，重新恢复 ADB+RNDIS 后补试一次: $mode_key"
    if [ -f "$SCRIPT_DIR/restore_rndis.sh" ]; then
      sh "$SCRIPT_DIR/restore_rndis.sh" >> "$LOG_FILE" 2>&1
      sleep 1
    fi
    sh "$SCRIPT_DIR/$script_name" >> "$LOG_FILE" 2>&1
    status=$?
  fi
  return $status
}

restore_safe_mode() {
  if [ -f "$SCRIPT_DIR/restore_rndis.sh" ]; then
    log_msg "USB 已断开，恢复到安全模式 ADB+RNDIS"
    sh "$SCRIPT_DIR/restore_rndis.sh" >> "$LOG_FILE" 2>&1
  fi
}

start_loop() {
  mkdir -p "$BASE_DIR"
  echo $$ > "$PID_FILE"
  log_msg "守护进程启动"
  if [ -f "$SCRIPT_DIR/restore_rndis.sh" ]; then
    log_msg "初始化 USB 到 ADB+RNDIS"
    sh "$SCRIPT_DIR/restore_rndis.sh" >> "$LOG_FILE" 2>&1
    sleep 2
  fi
  local last_link_state="idle"
  local connected_since=0
  local applied_key=""
  while true; do
    load_config
    local state now key
    state="$(get_state)"
    if is_connected "$state"; then
      now="$(date +%s)"
      if [ "$last_link_state" != "connected" ]; then
        connected_since="$now"
        applied_key=""
        log_msg "检测到 USB 已连接，等待 \${DELAY_SECONDS}s 后切换到 \${MODE}"
      fi
      last_link_state="connected"
      if [ "$PATROL_ENABLED" = "1" ] && [ $((now - connected_since)) -ge "$DELAY_SECONDS" ]; then
        key="\${MODE}_\${connected_since}"
        if [ "$applied_key" != "$key" ]; then
          log_msg "执行模式脚本: $MODE"
          run_mode_script "$MODE"
          applied_key="$key"
        fi
      fi
    else
      if [ "$last_link_state" = "connected" ]; then
        log_msg "USB 已断开"
      fi
      last_link_state="idle"
      connected_since=0
      applied_key=""
    fi
    sleep 2
  done
}

stop_loop() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(timeout 2s awk 'NR==1{print; exit}' "$PID_FILE" 2>/dev/null)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      sleep 1
      kill -9 "$pid" 2>/dev/null
      log_msg "守护进程已停止"
    fi
    rm -f "$PID_FILE"
  fi
}

status_loop() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(timeout 2s awk 'NR==1{print; exit}' "$PID_FILE" 2>/dev/null)"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "running:$pid"
      exit 0
    fi
  fi
  echo "stopped"
  exit 1
}

case "$1" in
  start)
    if [ -f "$PID_FILE" ]; then
      pid="$(timeout 2s awk 'NR==1{print; exit}' "$PID_FILE" 2>/dev/null)"
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        exit 0
      fi
    fi
    start_loop
    ;;
  stop)
    stop_loop
    ;;
  restart)
    stop_loop
    sleep 1
    start_loop
    ;;
  once)
    load_config
    run_mode_script "$MODE"
    ;;
  status)
    status_loop
    ;;
  *)
    echo "usage: $0 {start|stop|restart|once|status}"
    exit 1
    ;;
esac
`,
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .usbm-wrap {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      #${MODAL_NAME} .usbm-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      #${MODAL_NAME} .usbm-card,
      #${MODAL_NAME} .usbm-panel {
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.08);
        background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
        backdrop-filter: blur(10px);
      }
      #${MODAL_NAME} .usbm-card,
      #${MODAL_NAME} .usbm-panel {
        padding: 12px 14px;
      }
      #${MODAL_NAME} .usbm-label {
        font-size: .64rem;
        opacity: .72;
        margin-bottom: 6px;
      }
      #${MODAL_NAME} .usbm-value {
        font-size: .86rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .usbm-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      #${MODAL_NAME} .usbm-title {
        font-size: .8rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .usbm-tip {
        font-size: .66rem;
        line-height: 1.7;
        opacity: .8;
      }
      #${MODAL_NAME} .usbm-mode-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      #${MODAL_NAME} .usbm-mode {
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.03);
        padding: 12px;
        cursor: pointer;
        transition: all .2s ease;
      }
      #${MODAL_NAME} .usbm-mode.active {
        border-color: rgba(105, 199, 120, .7);
        box-shadow: 0 0 0 2px rgba(105, 199, 120, .16);
        background: rgba(75, 181, 98, .12);
      }
      #${MODAL_NAME} .usbm-mode-name {
        font-size: .78rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .usbm-mode-tip {
        font-size: .64rem;
        opacity: .78;
        margin-top: 4px;
        line-height: 1.6;
      }
      #${MODAL_NAME} .usbm-inline {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }
      #${MODAL_NAME} .usbm-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }
      #${MODAL_NAME} .usbm-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 160px;
      }
      #${MODAL_NAME} .usbm-field input,
      #${MODAL_NAME} .usbm-field select {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.1);
        outline: none;
        color: #fff;
        background: rgba(255,255,255,.04);
      }
      #${MODAL_NAME} .usbm-pre {
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        font-size: .62rem;
        line-height: 1.65;
        max-height: 180px;
        overflow: auto;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.06);
      }
      #${MODAL_NAME} .usbm-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: .62rem;
        font-weight: 700;
        background: rgba(255,255,255,.08);
      }
      #${MODAL_NAME} .usbm-good {
        color: #99ffc2;
        background: rgba(77, 197, 118, .16);
      }
      #${MODAL_NAME} .usbm-warn {
        color: #ffd48f;
        background: rgba(255, 184, 76, .16);
      }
      @media (max-width: 760px) {
        #${MODAL_NAME} .usbm-grid,
        #${MODAL_NAME} .usbm-mode-grid {
          grid-template-columns: 1fr;
        }
        #${MODAL_NAME} .usbm-head {
          flex-direction: column;
          align-items: flex-start;
        }
        #${MODAL_NAME} .usbm-actions button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const writeRemoteFile = async (path, content, mode = '755') => {
    const encoded = encodePayload(content);
    if (!encoded) return false;
    const dir = path.slice(0, path.lastIndexOf('/')) || '/';
    const res = await run(`
mkdir -p ${shellQuote(dir)}
printf '%s' ${shellQuote(encoded)} | base64 -d > ${shellQuote(path)}
chmod ${mode} ${shellQuote(path)}
`, 20000);
    return res.ok;
  };

  const buildConfigText = (config = DEFAULT_CONFIG) => {
    const mode = MODES.some((item) => item.key === config.mode) ? config.mode : DEFAULT_CONFIG.mode;
    const patrol = String(config.patrol) === '0' ? '0' : '1';
    return [
      '#!/system/bin/sh',
      `MODE="${mode}"`,
      `PATROL_ENABLED="${patrol}"`,
      '',
    ].join('\n');
  };

  const installManagedFiles = async (config = null) => {
    const tasks = [];
    Object.entries(scriptContentMap).forEach(([name, content]) => {
      const target = name === 'usb_network_daemon.sh' ? DAEMON_FILE : `${SCRIPT_DIR}/${name}`;
      tasks.push(writeRemoteFile(target, content, '755'));
    });
    const configText = buildConfigText(config || await readConfig());
    tasks.push(writeRemoteFile(CONFIG_FILE, configText, '644'));
    const results = await Promise.all(tasks);
    return results.every(Boolean);
  };

  const readConfig = async () => {
    const res = await run(`timeout 2s awk '{print}' ${shellQuote(CONFIG_FILE)} 2>/dev/null || true`, 6000);
    const config = { ...DEFAULT_CONFIG };
    String(res.text || '').split(/\r?\n/).forEach((line) => {
      const trimmed = String(line || '').trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return;
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx);
      const rawValue = trimmed.slice(idx + 1).trim().replace(/^"/, '').replace(/"$/, '');
      if (key === 'MODE') config.mode = rawValue;
      if (key === 'PATROL_ENABLED') config.patrol = rawValue;
    });
    if (!MODES.some((item) => item.key === config.mode)) config.mode = DEFAULT_CONFIG.mode;
    config.patrol = String(config.patrol) === '0' ? '0' : '1';
    return config;
  };

  const saveConfig = async (config) => writeRemoteFile(CONFIG_FILE, buildConfigText(config), '644');

  const checkBootEnabled = async () => {
    const res = await run(`
grep -qxF ${shellQuote(BOOT_LINE)} ${shellQuote(BOOT_SH_FILE)} 2>/dev/null
echo $?
`, 8000);
    return res.ok && String(res.text).trim().endsWith('0');
  };

  const setBootEnabled = async (enabled) => {
    const cmd = enabled
      ? `
grep -qxF ${shellQuote(BOOT_LINE)} ${shellQuote(BOOT_SH_FILE)} || echo ${shellQuote(BOOT_LINE)} >> ${shellQuote(BOOT_SH_FILE)}
`
      : `
sed -i '\\#^${BOOT_LINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/').replace(/&/g, '\\&')}$#d' ${shellQuote(BOOT_SH_FILE)}
`;
    const res = await run(cmd, 12000);
    return res.ok;
  };

  const daemonStatus = async () => {
    const res = await run(`sh ${shellQuote(DAEMON_FILE)} status`, 8000);
    return {
      running: res.ok && String(res.text).startsWith('running:'),
      text: res.text || 'stopped',
    };
  };

  const restartDaemon = async () => {
    await run(`sh ${shellQuote(DAEMON_FILE)} stop`, 8000);
    const res = await run(`nohup sh ${shellQuote(DAEMON_FILE)} start >/dev/null 2>&1 &`, 8000);
    return res.ok;
  };

  const stopDaemon = async () => {
    const res = await run(`sh ${shellQuote(DAEMON_FILE)} stop`, 8000);
    return res.ok;
  };

  const applyModeNow = async (modeKey) => {
    const found = MODES.find((item) => item.key === modeKey);
    if (!found) return false;
    const res = await run(`sh ${shellQuote(`${SCRIPT_DIR}/${found.script}`)}`, 20000);
    return res.ok;
  };

  const restoreRndis = async () => {
    const res = await run(`sh ${shellQuote(`${SCRIPT_DIR}/restore_rndis.sh`)}`, 20000);
    return res.ok;
  };

  const readLogPreview = async () => {
    const res = await run(`timeout 2s awk 'NR<=120{lines[NR]=$0} END{for(i=NR;i>=1;i--) print lines[i]}' ${shellQuote(LOG_FILE)} 2>/dev/null || true`, 5000);
    return res.text || '暂无日志';
  };

  const uninstallAll = async () => {
    const res = await run(`
sh ${shellQuote(DAEMON_FILE)} stop 2>/dev/null || true
rm -rf ${shellQuote(BASE_DIR)}
touch ${shellQuote(BOOT_SH_FILE)}
sed -i '/kano_usb_network_manager/d' ${shellQuote(BOOT_SH_FILE)}
`, 20000);
    return res.ok;
  };

  const getState = async () => {
    const [config, bootEnabled, daemon, logText] = await Promise.all([
      readConfig(),
      checkBootEnabled(),
      daemonStatus(),
      readLogPreview(),
    ]);
    return { config, bootEnabled, daemon, logText };
  };

  const renderModeCards = (selectedMode) => MODES.map((item) => `
    <div class="usbm-mode ${item.key === selectedMode ? 'active' : ''}" data-mode="${escapeHtml(item.key)}">
      <div class="usbm-mode-name">${escapeHtml(item.label)}</div>
      <div class="usbm-mode-tip">${escapeHtml(item.hint)}</div>
    </div>
  `).join('');

  const buildContent = (state) => `
    <div class="usbm-wrap">
      <div class="usbm-grid">
        <div class="usbm-card">
          <div class="usbm-label">当前预设模式</div>
          <div class="usbm-value" id="usbm_current_mode">${escapeHtml(MODES.find((i) => i.key === state.config.mode)?.label || DEFAULT_CONFIG.mode)}</div>
        </div>
        <div class="usbm-card">
          <div class="usbm-label">开机自启</div>
          <div class="usbm-value" id="usbm_boot_status">${state.bootEnabled ? '已开启' : '未开启'}</div>
        </div>
        <div class="usbm-card">
          <div class="usbm-label">巡检守护</div>
          <div class="usbm-value" id="usbm_daemon_status">${state.daemon.running ? '运行中' : '未运行'}</div>
        </div>
      </div>

      <div class="usbm-panel">
        <div class="usbm-head">
          <div>
            <div class="usbm-title">模式预设</div>
            <div class="usbm-tip">使用前请确保手机没有设置锁屏密码，否则只有解锁后切换网络模式才能生效！；NCM、ECM 模式下不要热插拔，尽量先点击“恢复到 ADB + RNDIS”再插拔，否则设备可能会死机重启。</div>
          </div>
          <div class="usbm-inline" style="flex-shrink: 0;">
            <span class="usbm-badge ${state.config.patrol === '1' ? 'usbm-good' : 'usbm-warn'}" id="usbm_patrol_badge">${state.config.patrol === '1' ? '巡检已开启' : '巡检已关闭'}</span>
          </div>
        </div>
        <div class="usbm-mode-grid" id="usbm_mode_grid">${renderModeCards(state.config.mode)}</div>
      </div>

      <div class="usbm-panel">
        <div class="usbm-head">
          <div class="usbm-title">配置与控制</div>
        </div>
        <div class="usbm-inline" style="align-items:flex-end;">
          <div id="usbm_patrol_switch_box"></div>
          <div id="usbm_boot_switch_box"></div>
        </div>
        <div class="usbm-actions" style="margin-top:12px;">
          <button id="usbm_save_btn">保存配置</button>
          <button id="usbm_apply_btn">立即切换到预设模式</button>
          <button id="usbm_restore_btn">恢复到 ADB + RNDIS</button>
          <button id="usbm_reload_btn">刷新状态</button>
          <button id="usbm_clear_btn">清除配置</button>
        </div>
      </div>

      <div class="usbm-panel">
        <div class="usbm-head">
          <div>
            <div class="usbm-title">守护日志预览</div>
            <div class="usbm-tip">这里只显示插件目录下守护脚本写入的日志，便于确认插入 USB 8 秒后的自动切换是否触发。</div>
          </div>
          <div class="usbm-actions">
            <button id="usbm_log_toggle_btn">开启日志刷新</button>
          </div>
        </div>
        <pre class="usbm-pre" id="usbm_log_preview">${escapeHtml(state.logText)}</pre>
      </div>
    </div>
  `;

  const ensureLogRefreshState = (modalEl) => {
    if (!modalEl.__usbmLogState) {
      modalEl.__usbmLogState = {
        timer: null,
        enabled: true,
      };
    }
    return modalEl.__usbmLogState;
  };

  const bindModalEvents = async (modalEl, refreshFn) => {
    let currentState = await getState();
    let selectedMode = currentState.config.mode;
    const logState = ensureLogRefreshState(modalEl);

    const patrolSwitch = createSwitch({
      text: 'USB 巡检自动切换',
      value: currentState.config.patrol === '1',
      onChange: () => {},
    });
    const bootSwitch = createSwitch({
      text: '开机自启守护脚本',
      value: currentState.bootEnabled,
      onChange: () => {},
    });
    const patrolBox = modalEl.querySelector('#usbm_patrol_switch_box');
    const bootBox = modalEl.querySelector('#usbm_boot_switch_box');
    if (patrolBox) {
      patrolBox.innerHTML = '';
      patrolBox.appendChild(patrolSwitch);
    }
    if (bootBox) {
      bootBox.innerHTML = '';
      bootBox.appendChild(bootSwitch);
    }

    const syncModeUi = () => {
      modalEl.querySelectorAll('.usbm-mode').forEach((el) => {
        el.classList.toggle('active', el.dataset.mode === selectedMode);
      });
      const currentModeEl = modalEl.querySelector('#usbm_current_mode');
      if (currentModeEl) {
        currentModeEl.textContent = MODES.find((item) => item.key === selectedMode)?.label || DEFAULT_CONFIG.mode;
      }
    };

    const getSelectedModeFromUi = () => {
      const activeEl = modalEl.querySelector('.usbm-mode.active');
      const modeKey = activeEl?.dataset?.mode || selectedMode || DEFAULT_CONFIG.mode;
      return MODES.some((item) => item.key === modeKey) ? modeKey : DEFAULT_CONFIG.mode;
    };

    modalEl.querySelectorAll('.usbm-mode').forEach((el) => {
      el.onclick = () => {
        selectedMode = el.dataset.mode || DEFAULT_CONFIG.mode;
        syncModeUi();
      };
    });

    modalEl.querySelector('#usbm_save_btn').onclick = async () => {
      const nextConfig = {
        mode: selectedMode,
        patrol: patrolSwitch.querySelector('input')?.checked ? '1' : '0',
      };
      const bootEnabled = Boolean(bootSwitch.querySelector('input')?.checked);

      createToast('正在写入模式脚本和配置...', 'pink');
      const installed = await installManagedFiles(nextConfig);
      if (!installed) {
        createToast('写入插件文件失败', 'red', 5000);
        return;
      }
      const bootOk = await setBootEnabled(bootEnabled);
      if (!bootOk) {
        createToast('更新 ufi_tools_boot.sh 失败', 'red', 5000);
        return;
      }
      if (bootEnabled) {
        await restartDaemon();
      } else {
        await stopDaemon();
      }
      createToast('配置已保存', 'green');
      currentState = await refreshFn();
      selectedMode = currentState.config.mode;
      patrolSwitch.update?.(currentState.config.patrol === '1');
      bootSwitch.update?.(currentState.bootEnabled);
      syncModeUi();
    };

    modalEl.querySelector('#usbm_apply_btn').onclick = async () => {
      const modeToApply = getSelectedModeFromUi();
      createToast('已下发切换指令，请等待设备重枚举', 'pink', 4000);
      applyModeNow(modeToApply);
    };

    modalEl.querySelector('#usbm_restore_btn').onclick = async () => {
      await stopDaemon();
      createToast('已停止巡检并下发恢复指令，请等待设备重枚举', 'pink', 4000);
      await restoreRndis();
      currentState = await refreshFn();
      selectedMode = currentState.config.mode;
      patrolSwitch.update?.(currentState.config.patrol === '1');
      bootSwitch.update?.(currentState.bootEnabled);
      syncModeUi();
    };

    modalEl.querySelector('#usbm_reload_btn').onclick = async () => {
      currentState = await refreshFn();
      selectedMode = currentState.config.mode;
      patrolSwitch.update?.(currentState.config.patrol === '1');
      bootSwitch.update?.(currentState.bootEnabled);
      syncModeUi();
      createToast('状态已刷新', 'green');
    };

    modalEl.querySelector('#usbm_clear_btn').onclick = async () => {
      createToast('正在清除插件配置和开机自启...', 'pink');
      const ok = await uninstallAll();
      if (!ok) {
        createToast('清除失败', 'red', 5000);
        return;
      }
      createToast('已清除配置', 'green');
      currentState = await refreshFn();
      selectedMode = DEFAULT_CONFIG.mode;
      patrolSwitch.update?.(false);
      bootSwitch.update?.(false);
      syncModeUi();
    };

    const syncLogButton = (running) => {
      const btn = modalEl.querySelector('#usbm_log_toggle_btn');
      if (!btn) return;
      btn.textContent = running ? '停止日志刷新' : '开启日志刷新';
      btn.style.background = running ? 'var(--dark-btn-color-active)' : '';
    };

    const stopLogRefresh = () => {
      if (logState.timer) {
        clearInterval(logState.timer);
        logState.timer = null;
      }
      logState.enabled = false;
      syncLogButton(false);
    };

    const refreshLogOnly = async () => {
      const logEl = modalEl.querySelector('#usbm_log_preview');
      if (!logEl) return;
      const logText = await readLogPreview();
      logEl.textContent = logText || '暂无日志';
    };

    modalEl.querySelector('#usbm_log_toggle_btn').onclick = async () => {
      if (logState.timer) {
        stopLogRefresh();
        createToast('已停止日志自动刷新', 'pink', 2500);
        return;
      }
      await refreshLogOnly();
      logState.enabled = true;
      logState.timer = setInterval(() => {
        refreshLogOnly();
      }, 1000);
      syncLogButton(true);
      createToast('已开启日志自动刷新', 'pink', 2500);
    };

    if (logState.enabled && !logState.timer) {
      await refreshLogOnly();
      logState.timer = setInterval(() => {
        refreshLogOnly();
      }, 1000);
    }
    syncLogButton(Boolean(logState.enabled));

    const closeBtn = modalEl.querySelector(`#${MODAL_NAME}_close`);
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        stopLogRefresh();
      });
    }
  };

  const openModal = async () => {
    ensureStyle();
    await installManagedFiles(await readConfig());
    const state = await getState();
    document.querySelector(`#${MODAL_NAME}`)?.remove();
    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '980px',
      showConfirm: false,
      onClose: () => true,
      contentStyle: 'max-height:75vh;',
      content: buildContent(state),
    });

    const refreshModal = async () => {
      const nextState = await getState();
      el.querySelector('.content').innerHTML = buildContent(nextState);
      await bindModalEvents(el, refreshModal);
      return nextState;
    };

    showModal(id);
    await bindModalEvents(el, refreshModal);
  };

  const mainBtn = document.createElement('button');
  mainBtn.textContent = TITLE;
  mainBtn.onclick = async () => {
    if (!(await checkAdvancedFunc())) {
      createToast('请先启用高级功能', 'pink');
      return;
    }
    await openModal();
  };

  while (!document.querySelector('.actions-buttons')) {
    await wait(120);
  }
  document.querySelector('.actions-buttons')?.appendChild(mainBtn);
})();
//</script>
