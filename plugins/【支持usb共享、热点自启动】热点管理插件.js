//<script>
(async () => {
  const TITLE = '热点管理';
  const MODAL_NAME = 'kano_softap_manager_modal';
  const STYLE_ID = 'kano_softap_manager_style';
  const STORAGE_DIR = '/data/kano_softap_manager';
  const CONFIG_FILE = `${STORAGE_DIR}/config.json`;
  const SERVICE_FILE = `${STORAGE_DIR}/service.sh`;
  const BOOT_SH_FILE = '/sdcard/ufi_tools_boot.sh';
  const BOOT_LINE = `sh ${SERVICE_FILE} boot >/dev/null 2>&1 &`;
  const LEGACY_BOOT_LINE = `sh ${SERVICE_FILE} start &`;

  const DEFAULT_CONFIG = {
    ssid: 'KanoHotspot',
    security: 'wpa2',
    password: '12345678',
    band: '2',
    channelMode: 'auto',
    channel: '',
    countryCode: '',
    autoStartEnabled: false,
    autoBoot: false,
    usbTether: false,
  };

  const CHANNEL_OPTIONS = {
    // 2.4 GHz: IEEE 定义 1~14
    // 其中 12/13/14 是否可用取决于国家/地区；14 只在日本且仅限 802.11b/DSSS
    '2': [
      '1', '2', '3', '4', '5', '6', '7',
      '8', '9', '10', '11', '12', '13', '14',
    ],

    // 5 GHz: 标准 20 MHz 信道全集（主流 5 GHz 段）
    // 具体国家会裁掉一部分，尤其 DFS / 室内限制 / UNII-3/4
    '5': [
      '32',
      '36', '40', '44', '48',
      '52', '56', '60', '64',
      '68', '72', '76', '80', '84', '88', '92', '96',
      '100', '104', '108', '112', '116', '120', '124', '128',
      '132', '136', '140', '144',
      '149', '153', '157', '161', '165', '169', '173', '177',
    ],

    // 6 GHz: 标准 20 MHz 信道全集
    // 1~233 的奇数信道 + 特殊 ch2(5935 MHz)
    '6': [
      '2',
      '1', '5', '9', '13', '17', '21', '25', '29',
      '33', '37', '41', '45', '49', '53', '57', '61',
      '65', '69', '73', '77', '81', '85', '89', '93',
      '97', '101', '105', '109', '113', '117', '121', '125',
      '129', '133', '137', '141', '145', '149', '153', '157',
      '161', '165', '169', '173', '177', '181', '185', '189',
      '193', '197', '201', '205', '209', '213', '217', '221',
      '225', '229', '233',
    ],
  };

  const state = {
    config: { ...DEFAULT_CONFIG },
    bootEnabled: false,
    hotspotEnabled: false,
    hotspotFrequency: '',
    hotspotChannel: '',
    supportedFeatures: '',
    usbState: '',
    usbMonitorRunning: false,
    usbMonitorPid: '',
    wifiDump: '',
    countryCode: '',
    servicePreview: '',
    busy: false,
  };

  const wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
  const normalizeLine = (text = '') => String(text).replace(/\r/g, '').trim();
  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const shellQuote = (value = '') => `'${String(value).replace(/'/g, `'\\''`)}'`;
  const escapeSedPattern = (value = '') => String(value).replace(/[][\\/.*^$]/g, '\\$&').replace(/&/g, '\\&');

  const run = async (command, timeout = 30000) => {
    const res = await runShellWithRoot(command, timeout);
    return {
      ok: Boolean(res?.success),
      text: String(res?.content || '').trim(),
      raw: res,
    };
  };

  const encodePayload = (value) => {
    try {
      return btoa(unescape(encodeURIComponent(String(value || ''))));
    } catch {
      return '';
    }
  };

  const decodePayload = (value) => {
    try {
      return decodeURIComponent(escape(atob(String(value || ''))));
    } catch {
      return '';
    }
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .sm-wrap {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      #${MODAL_NAME} .sm-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      #${MODAL_NAME} .sm-card,
      #${MODAL_NAME} .sm-stat,
      #${MODAL_NAME} .sm-block {
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.04);
        backdrop-filter: blur(10px);
      }
      #${MODAL_NAME} .sm-card,
      #${MODAL_NAME} .sm-stat,
      #${MODAL_NAME} .sm-block {
        padding: 12px 14px;
      }
      #${MODAL_NAME} .sm-stat-label,
      #${MODAL_NAME} .sm-tip,
      #${MODAL_NAME} .sm-label {
        font-size: .66rem;
        line-height: 1.65;
        opacity: .82;
      }
      #${MODAL_NAME} .sm-stat-value {
        margin-top: 6px;
        font-size: .86rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .sm-head > .sm-title {
        flex-shrink: 0;
      }
      #${MODAL_NAME} .sm-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }
      #${MODAL_NAME} .sm-title {
        font-size: .8rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .sm-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      #${MODAL_NAME} .sm-form {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 12px;
      }
      #${MODAL_NAME} .sm-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      #${MODAL_NAME} .sm-field[data-span="full"] {
        grid-column: 1 / -1;
      }
      #${MODAL_NAME} .sm-field input,
      #${MODAL_NAME} .sm-field select,
      #${MODAL_NAME} .sm-field textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.1);
        background: rgba(255,255,255,.03);
        color: #fff;
        outline: none;
      }
      #${MODAL_NAME} .sm-field input:focus,
      #${MODAL_NAME} .sm-field select:focus,
      #${MODAL_NAME} .sm-field textarea:focus {
        border-color: rgba(102,195,255,.75);
        box-shadow: 0 0 0 3px rgba(102,195,255,.12);
      }
      #${MODAL_NAME} .sm-inline {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }
      #${MODAL_NAME} .sm-chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(255,255,255,.08);
        font-size: .62rem;
        font-weight: 700;
      }
      #${MODAL_NAME} .sm-chip[data-kind="good"] {
        color: #9dffbf;
        background: rgba(60,201,120,.16);
      }
      #${MODAL_NAME} .sm-chip[data-kind="warn"] {
        color: #ffd08a;
        background: rgba(255,173,51,.16);
      }
      #${MODAL_NAME} .sm-chip[data-kind="bad"] {
        color: #ffb3b3;
        background: rgba(255,82,82,.16);
      }
      #${MODAL_NAME} .sm-code,
      #${MODAL_NAME} pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: .62rem;
        line-height: 1.7;
        border-radius: 12px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.06);
        padding: 10px 12px;
        max-height: 260px;
        overflow: auto;
      }
      #${MODAL_NAME} .sm-loading-mask {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 10px;
        padding-top: 0;
        border-radius: 0;
        background: var(--dark-card-bg);
        backdrop-filter: blur(8px);
        z-index: 999999999;
        transition: opacity .2s ease;
      }
      #${MODAL_NAME} .sm-loading-mask[data-state="hidden"] {
        opacity: 0;
        pointer-events: none;
      }
      #${MODAL_NAME} .sm-loading-spinner {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 3px solid rgba(255,255,255,.18);
        border-top-color: rgba(255,255,255,.9);
        animation: sm-spin .8s linear infinite;
      }
      #${MODAL_NAME} .sm-loading-text {
        font-size: .7rem;
        font-weight: 700;
        opacity: .92;
      }
      #${MODAL_NAME} details {
        border-radius: 12px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.06);
        padding: 10px 12px;
      }
      #${MODAL_NAME} summary {
        cursor: pointer;
        font-size: .72rem;
        font-weight: 700;
      }
      @keyframes sm-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @media (max-width: 760px) {
        #${MODAL_NAME} .sm-head{
          flex-direction: column;
        }
        #${MODAL_NAME} .sm-grid,
        #${MODAL_NAME} .sm-form {
          grid-template-columns: 1fr;
        }
        #${MODAL_NAME} .sm-actions button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const setBusy = (busy) => {
    state.busy = busy;
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    root.querySelectorAll('button, input, select, textarea').forEach((el) => {
      if (el.dataset.lockIgnore === '1') return;
      el.disabled = busy;
    });
  };

  const setLoading = (loading, text = '正在加载...') => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    const mask = root.querySelector('#sm_loading_mask');
    const textEl = root.querySelector('#sm_loading_text');
    if (!mask) return;
    if (textEl) textEl.textContent = text;
    mask.dataset.state = loading ? 'visible' : 'hidden';
  };

  const ensureLoadingMask = (root) => {
    if (!root || root.querySelector('#sm_loading_mask')) return;
    const mask = document.createElement('div');
    mask.className = 'sm-loading-mask';
    mask.id = 'sm_loading_mask';
    mask.dataset.state = 'hidden';
    mask.innerHTML = `
      <div class="sm-loading-spinner"></div>
      <div class="sm-loading-text" id="sm_loading_text">正在加载...</div>
    `;
    root.appendChild(mask);
  };

  const normalizeConfig = (config = {}) => {
    const next = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    next.ssid = String(next.ssid || '').trim();
    next.security = String(next.security || 'wpa2').trim() || 'wpa2';
    next.password = String(next.password || '').trim();
    next.band = String(next.band || '2').trim() || '2';
    next.channelMode = String(next.channelMode || 'auto').trim() || 'auto';
    next.channel = String(next.channel || '').trim();
    next.countryCode = String(next.countryCode || '').trim().toUpperCase();
    next.autoStartEnabled = Boolean(next.autoStartEnabled);
    next.autoBoot = Boolean(next.autoBoot);
    next.usbTether = Boolean(next.usbTether);
    if (!['2', '5', '6', 'any', 'bridged'].includes(next.band)) next.band = '2';
    if (next.channelMode !== 'fixed') next.channelMode = 'auto';
    if (next.security === 'open') next.password = '';
    return next;
  };

  const getSecurityNeedsPassword = (security = '') => {
    const value = String(security || '').trim();
    return !['open', 'owe', 'owe_transition'].includes(value);
  };

  const getChannelFrequency = (band, channel) => {
    const b = String(band).trim();
    const ch = Number.parseInt(String(channel || '').trim(), 10);

    if (!Number.isFinite(ch) || ch <= 0) return null;

    if (b === '2') {
      // 2.4 GHz: ch1~13 按通式；ch14 特例
      if (ch === 14) return 2484;
      if (ch >= 1 && ch <= 13) return 2407 + ch * 5;
      return null;
    }

    if (b === '5') {
      // 主流 5 GHz 标准段
      const valid5 = new Set([
        32,
        36, 40, 44, 48,
        52, 56, 60, 64,
        68, 72, 76, 80, 84, 88, 92, 96,
        100, 104, 108, 112, 116, 120, 124, 128,
        132, 136, 140, 144,
        149, 153, 157, 161, 165, 169, 173, 177,
      ]);
      if (!valid5.has(ch)) return null;
      return 5000 + ch * 5;
    }

    if (b === '6') {
      // 6 GHz: ch2 为特殊信道 5935 MHz；其余标准 20 MHz 信道为奇数
      if (ch === 2) return 5935;
      if (ch >= 1 && ch <= 233 && ch % 4 === 1) {
        return 5950 + ch * 5;
      }
      return null;
    }

    return null;
  };

  const buildStartCommand = (config) => {
    const safe = normalizeConfig(config);
    const passphrase = getSecurityNeedsPassword(safe.security) ? safe.password : '';
    const bandArg = safe.band ? ` -b ${safe.band}` : '';
    return `cmd wifi start-softap ${shellQuote(safe.ssid)} ${safe.security} ${shellQuote(passphrase)}${bandArg}`;
  };

  const buildServiceScript = (config) => {
    const safe = normalizeConfig(config);
    const passphrase = getSecurityNeedsPassword(safe.security) ? safe.password : '';
    const useCountry = safe.countryCode ? `cmd wifi force-country-code enabled ${safe.countryCode}` : 'cmd wifi force-country-code disabled';
    let useChannel = 'cmd wifi force-softap-channel disabled';
    const useHotspotBoot = safe.autoBoot;
    const useUsbTether = safe.usbTether;
    if (safe.channelMode === 'fixed') {
      const frequency = getChannelFrequency(safe.band, safe.channel);
      if (frequency) {
        useChannel = `cmd wifi force-softap-channel enabled ${frequency}`;
      }
    }
    const bandArg = safe.band ? ` -b ${safe.band}` : '';
    return `#!/system/bin/sh
# kano auto generated: softap manager

PATH=/system/bin:/system/xbin:/vendor/bin:$PATH

CONFIG_DIR=${STORAGE_DIR}
SCRIPT_PATH=${SERVICE_FILE}
RNDIS_MONITOR_PID="$CONFIG_DIR/rndis_monitor.pid"
RNDIS_MONITOR_START_LOCK="$CONFIG_DIR/rndis_monitor_start.lock"
RUN_LOG="$CONFIG_DIR/run.log"
ANDROID_SVC="/system/bin/svc"
ANDROID_CMD="/system/bin/cmd"

log_line() {
  mkdir -p "$CONFIG_DIR"
  printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo '[no-date]')" "$*"
}

run_and_log() {
  desc="$1"
  shift
  output="$("$@" 2>&1)"
  status=$?
  log_line "[$desc] exit=$status output=\${output:-<empty>}"
  return $status
}

usb_rndis() {
  log_line "[usb_rndis] begin state=$(getprop sys.usb.state 2>/dev/null)"
  run_and_log "usb_rndis.setFunctions" "$ANDROID_SVC" usb setFunctions rndis || true
  sleep 1
  if rndis_status; then
    log_line "[usb_rndis] setFunctions success state=$(getprop sys.usb.state 2>/dev/null)"
    return 0
  fi

  log_line "[usb_rndis] setFunctions no-effect state=$(getprop sys.usb.state 2>/dev/null)"
  run_and_log "usb_rndis.setFunction" "$ANDROID_SVC" usb setFunction rndis || true
  sleep 1
  if rndis_status; then
    log_line "[usb_rndis] setFunction success state=$(getprop sys.usb.state 2>/dev/null)"
    return 0
  fi

  log_line "[usb_rndis] failed state=$(getprop sys.usb.state 2>/dev/null)"
  return 1
}

rndis_status() {
  getprop sys.usb.state | grep -q "rndis"
  return $?
}

is_rndis_monitor_running() {
  if [ ! -f "$RNDIS_MONITOR_PID" ]; then
    return 1
  fi

  pid="$(cat "$RNDIS_MONITOR_PID" 2>/dev/null)"
  if [ -z "$pid" ] || [ ! -d "/proc/$pid" ]; then
    return 1
  fi

  if ! kill -0 "$pid" >/dev/null 2>&1; then
    return 1
  fi

  tr '\\000' ' ' < "/proc/$pid/cmdline" 2>/dev/null | grep -q 'usb-monitor'
  return $?
}

stop_rndis_monitor() {
  if is_rndis_monitor_running; then
    pid="$(cat "$RNDIS_MONITOR_PID" 2>/dev/null)"
    log_line "[stop_rndis_monitor] killing pid=$pid"
    kill "$pid" >/dev/null 2>&1 || true
  fi
  rm -f "$RNDIS_MONITOR_PID"
  rm -rf "$RNDIS_MONITOR_START_LOCK"
  log_line "[stop_rndis_monitor] pid file removed"
}

start_rndis_monitor() {
  ${useUsbTether ? 'true' : 'false'} || return 0

  if ! mkdir "$RNDIS_MONITOR_START_LOCK" >/dev/null 2>&1; then
    log_line "[start_rndis_monitor] start lock busy, skip duplicate launch"
    return 0
  fi

  if is_rndis_monitor_running; then
    pid="$(cat "$RNDIS_MONITOR_PID" 2>/dev/null)"
    rm -rf "$RNDIS_MONITOR_START_LOCK"
    log_line "[start_rndis_monitor] already running pid=$pid"
    return 0
  fi
  rm -f "$RNDIS_MONITOR_PID"

  log_line "[start_rndis_monitor] launching usb-monitor"
  sh "$SCRIPT_PATH" usb-monitor >/dev/null 2>&1 &
  echo $! > "$RNDIS_MONITOR_PID"
  rm -rf "$RNDIS_MONITOR_START_LOCK"
  log_line "[start_rndis_monitor] launched pid=$!"
}

start_hotspot() {
  mkdir -p "$CONFIG_DIR"
  log_line "[start_hotspot] begin ssid=${safe.ssid} band=${safe.band} security=${safe.security} usbTether=${safe.usbTether}"
  stop_rndis_monitor
  "$ANDROID_CMD" wifi stop-softap >/dev/null 2>&1
  sleep 1
  ${useCountry}
  ${useChannel}
  "$ANDROID_CMD" wifi start-softap ${shellQuote(safe.ssid)} ${safe.security} ${shellQuote(passphrase)}${bandArg}
  start_rndis_monitor
  log_line "[start_hotspot] end"
}

stop_hotspot() {
  log_line "[stop_hotspot] begin"
  "$ANDROID_CMD" wifi stop-softap >/dev/null 2>&1
  "$ANDROID_CMD" wifi force-softap-channel disabled
  log_line "[stop_hotspot] end"
}

stop_rndis_monitor_fn() {
  log_line "[stop_rndis_monitor_fn] begin"
  stop_rndis_monitor
  log_line "[stop_rndis_monitor_fn] end"
}

start_rndis_monitor_fn() {
  log_line "[start_rndis_monitor_fn] begin"
  stop_rndis_monitor
  sleep 1
  start_rndis_monitor
  log_line "[start_rndis_monitor_fn] end"
}

status_hotspot() {
  "$ANDROID_CMD" wifi status
}

case "$1" in
  start)
    log_line "[entry] start pid=$$ ppid=$PPID state=$(getprop sys.usb.state 2>/dev/null)"
    start_hotspot
    ;;
  boot)
    (
      log_line "[entry] boot pid=$$ ppid=$PPID state=$(getprop sys.usb.state 2>/dev/null) autoBoot=${useHotspotBoot} usbTether=${useUsbTether} id=$(id 2>/dev/null)"
      log_line "[entry] boot svc_path=$(command -v svc 2>/dev/null) cmd_path=$(command -v cmd 2>/dev/null) android_svc=$ANDROID_SVC android_cmd=$ANDROID_CMD getenforce=$(getenforce 2>/dev/null || echo unknown)"
      ${useHotspotBoot ? 'start_hotspot' : ':'}
      ${!useHotspotBoot && useUsbTether ? 'start_rndis_monitor' : ':'}
      log_line "[entry] boot end state=$(getprop sys.usb.state 2>/dev/null)"
    ) >/dev/null 2>&1 &
    exit 0
    ;;
  stop)
    log_line "[entry] stop pid=$$ ppid=$PPID"
    stop_hotspot
    ;;
  stop-rndis)
    stop_rndis_monitor_fn
    ;;
  start-rndis)
    start_rndis_monitor_fn
    ;;
  restart)
    log_line "[entry] restart pid=$$ ppid=$PPID"
    stop_hotspot
    sleep 1
    start_hotspot
    ;;
  status)
    log_line "[entry] status pid=$$ ppid=$PPID"
    status_hotspot
    ;;
  usb-monitor)
    log_line "[entry] usb-monitor pid=$$ ppid=$PPID cmdline=$(tr '\\000' ' ' < /proc/$$/cmdline 2>/dev/null) state=$(getprop sys.usb.state 2>/dev/null) id=$(id 2>/dev/null)"
    current_pid="$(cat "$RNDIS_MONITOR_PID" 2>/dev/null)"
    if [ -n "$current_pid" ] && [ "$current_pid" != "$$" ]; then
      log_line "[entry] usb-monitor stale duplicate pid=$$ owner=$current_pid exit"
      exit 0
    fi
    while true
    do
      log_line "[usb-monitor] tick pid=$$ state=$(getprop sys.usb.state 2>/dev/null)"
      if ! rndis_status; then
        log_line "[usb-monitor] rndis missing, invoking usb_rndis"
        usb_rndis >/dev/null 2>&1 || true
      else
        log_line "[usb-monitor] rndis already enabled"
      fi
      sleep 5
    done
    ;;
  *)
    echo "usage: $0 {start|stop|restart|status|usb-monitor|start-rndis|stop-rndis|boot}"
    exit 1
    ;;
esac
`;
  };

  const writeRemoteFile = async (path, content, mode = '600') => {
    const encoded = encodePayload(content);
    if (!encoded) return false;
    const parent = path.substring(0, path.lastIndexOf('/')) || '/';
    const res = await run(`
mkdir -p ${shellQuote(parent)}
printf '%s' ${shellQuote(encoded)} | base64 -d > ${shellQuote(path)}
chmod ${mode} ${shellQuote(path)}
`, 30000);
    return res.ok;
  };

  const readRemoteText = async (path) => {
    const res = await run(`timeout 2s awk '{print}' ${shellQuote(path)} 2>/dev/null || true`, 30000);
    return String(res.text || '');
  };

  const readConfig = async () => {
    const raw = await readRemoteText(CONFIG_FILE);
    if (!normalizeLine(raw)) return { ...DEFAULT_CONFIG };
    try {
      return normalizeConfig(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  };

  const checkBootEnabled = async () => {
    const res = await run(`
touch ${shellQuote(BOOT_SH_FILE)}
grep -qxF ${shellQuote(BOOT_LINE)} ${shellQuote(BOOT_SH_FILE)}
echo $?
`, 30000);
    return res.ok && normalizeLine(res.text).endsWith('0');
  };

  const ensureBootHook = async () => {
    const res = await run(`
touch ${shellQuote(BOOT_SH_FILE)}
grep -qxF ${shellQuote(BOOT_LINE)} ${shellQuote(BOOT_SH_FILE)} || echo ${shellQuote(BOOT_LINE)} >> ${shellQuote(BOOT_SH_FILE)}
`, 30000);
    return res.ok;
  };

  const removeBootHook = async () => {
    const res = await run(`
touch ${shellQuote(BOOT_SH_FILE)}
sed -i '\\#^${escapeSedPattern(BOOT_LINE)}$#d' ${shellQuote(BOOT_SH_FILE)}
sed -i '\\#^${escapeSedPattern(LEGACY_BOOT_LINE)}$#d' ${shellQuote(BOOT_SH_FILE)}
`, 30000);
    return res.ok;
  };

  const persistConfig = async (config, autoStartEnabled) => {
    const safe = normalizeConfig(config);
    const jsonOk = await writeRemoteFile(CONFIG_FILE, JSON.stringify({ ...safe, autoStartEnabled: Boolean(autoStartEnabled) }, null, 2), '600');
    if (!jsonOk) return false;
    const serviceOk = await writeRemoteFile(SERVICE_FILE, buildServiceScript(safe), '755');
    if (!serviceOk) return false;
    if (autoStartEnabled) {
      const bootOk = await ensureBootHook();
      if (!bootOk) return false;
    } else {
      const removeOk = await removeBootHook();
      if (!removeOk) return false;
    }
    state.servicePreview = buildServiceScript(safe);
    state.bootEnabled = Boolean(autoStartEnabled);
    state.config = { ...safe, autoStartEnabled: Boolean(autoStartEnabled) };
    return true;
  };

  const collectStatus = async () => {
    const [featureRes, countryRes, dumpRes, hotspotRes, usbStateRes, usbMonitorRes] = await Promise.all([
      run('cmd wifi get-softap-supported-features', 30000),
      run('cmd wifi get-country-code', 30000),
      run('dumpsys wifi', 30000),
      run(`
dumpsys wifi | awk '
BEGIN { in_softap=0; enabled=0 }
/^Dump of SoftApManager id=/ { in_softap=1; next }
/^Dump of / && $0 !~ /^Dump of SoftApManager id=/ { in_softap=0 }
in_softap && /current StateMachine mode: StartedState/ { enabled=1 }
END { print enabled ? "true" : "false" }
'
`, 30000),
      run('getprop sys.usb.state', 30000),
      run(`
pid_file=${shellQuote(`${STORAGE_DIR}/rndis_monitor.pid`)}
if [ ! -f "$pid_file" ]; then
  echo "running=false"
  echo "pid="
  exit 0
fi
pid="$(cat "$pid_file" 2>/dev/null)"
if [ -z "$pid" ] || [ ! -d "/proc/$pid" ]; then
  echo "running=false"
  echo "pid="
  exit 0
fi
if ! kill -0 "$pid" >/dev/null 2>&1; then
  echo "running=false"
  echo "pid="
  exit 0
fi
cmdline="$(tr '\\000' ' ' < "/proc/$pid/cmdline" 2>/dev/null)"
if echo "$cmdline" | grep -q 'usb-monitor'; then
  echo "running=true"
  echo "pid=$pid"
else
  echo "running=false"
  echo "pid=$pid"
fi
`, 30000),
    ]);
    state.wifiDump = dumpRes.ok ? dumpRes.text : '';
    state.hotspotEnabled = normalizeLine(hotspotRes.text) === 'true';
    state.hotspotFrequency = dumpRes.ok ? parseCurrentHotspotFrequency(dumpRes.text) : '';
    state.hotspotChannel = state.hotspotFrequency ? getChannelFromFrequency(state.hotspotFrequency) : '';
    state.supportedFeatures = featureRes.ok ? featureRes.text : '读取失败';
    state.countryCode = countryRes.ok ? parseCountryCodeText(countryRes.text) : '读取失败';
    state.usbState = usbStateRes.ok ? normalizeLine(usbStateRes.text) : '读取失败';
    state.usbMonitorRunning = usbMonitorRes.ok ? /running=true/i.test(usbMonitorRes.text) : false;
    state.usbMonitorPid = usbMonitorRes.ok ? (usbMonitorRes.text.match(/pid=(.*)/)?.[1] || '') : '';
  };

  const refreshState = async () => {
    state.config = await readConfig();
    state.bootEnabled = await checkBootEnabled();
    state.config.autoStartEnabled = state.bootEnabled;
    state.servicePreview = buildServiceScript(state.config);
    await collectStatus();
  };

  const getBootChip = () => {
    if (state.bootEnabled) return '<span class="sm-chip" data-kind="good">已启用开机自启总开关</span>';
    return '<span class="sm-chip" data-kind="warn">未启用开机自启总开关</span>';
  };

  const parseCountryCodeText = (text = '') => {
    const value = String(text || '').trim();
    if (!value) return '';
    const matched = value.match(/([A-Z]{2})$/);
    return matched ? matched[1] : value;
  };

  const getChannelFromFrequency = (frequency = '') => {
    const freq = Number.parseInt(String(frequency || '').trim(), 10);
    if (!Number.isFinite(freq) || freq <= 0) return '';
    if (freq === 2484) return '14';
    if (freq >= 2412 && freq <= 2472) {
      return String(Math.round((freq - 2407) / 5));
    }
    if (freq >= 5000 && freq <= 5895) {
      return String(Math.round((freq - 5000) / 5));
    }
    if (freq >= 5955 && freq <= 7115) {
      return String(Math.round((freq - 5950) / 5));
    }
    return '';
  };

  const parseCurrentHotspotFrequency = (text = '') => {
    const value = String(text || '');
    if (!value) return '';
    const direct = value.match(/mCurrentSoftApInfoMap[^\n]*frequency=\s*(\d+)/i);
    if (direct) return direct[1];
    const fallback = value.match(/channel_frequency=(\d+)/i);
    if (fallback) return fallback[1];
    return '';
  };

  const getChannelSummary = (config) => {
    const safe = normalizeConfig(config);
    if (safe.channelMode !== 'fixed') return '自动信道';
    const frequency = getChannelFrequency(safe.band, safe.channel);
    return frequency ? `固定信道 ${safe.channel} (${frequency} MHz)` : '固定信道参数无效';
  };

  const getBandLabel = (band) => {
    const value = String(band || '').trim();
    if (value === '2') return '2.4GHz';
    if (value === '5') return '5GHz';
    if (value === '6') return '6GHz';
    if (value === 'any') return '自动';
    if (value === 'bridged') return '双频';
    return value || '--';
  };

  const syncChannelOptions = () => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    const bandEl = root.querySelector('#sm_band');
    const channelEl = root.querySelector('#sm_channel');
    const modeEl = root.querySelector('#sm_channel_mode');
    if (!bandEl || !channelEl || !modeEl) return;
    const band = String(bandEl.value || '2');
    const options = CHANNEL_OPTIONS[band] || [];
    const current = String(channelEl.value || '').trim();
    channelEl.innerHTML = options.length
      ? options.map((item) => `<option value="${escapeHtml(item)}" ${item === current ? 'selected' : ''}>信道 ${escapeHtml(item)} (${getChannelFrequency(band, item)} MHz)</option>`).join('')
      : '<option value="">当前频段不支持固定信道</option>';
    if (options.length && !options.includes(current)) {
      channelEl.value = options[0];
    }
    channelEl.disabled = modeEl.value !== 'fixed' || !options.length;
    channelEl.style.opacity = channelEl.disabled ? '.55' : '1';
    channelEl.style.pointerEvents = channelEl.disabled ? 'none' : 'auto';
  };

  const syncAutoStartOptions = () => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    const masterEl = root.querySelector('#sm_auto_start_enabled');
    const hotspotEl = root.querySelector('#sm_boot');
    const usbEl = root.querySelector('#sm_usb_tether');
    if (!masterEl || !hotspotEl || !usbEl) return;
    const disabled = !masterEl.checked;
    hotspotEl.disabled = disabled || state.busy;
    usbEl.disabled = disabled || state.busy;
    hotspotEl.style.opacity = disabled ? '.55' : '1';
    usbEl.style.opacity = disabled ? '.55' : '1';
  };

  const gatherFormData = () => {
    const safe = normalizeConfig({
      ssid: document.querySelector('#sm_ssid')?.value || '',
      security: document.querySelector('#sm_security')?.value || 'wpa2',
      password: document.querySelector('#sm_password')?.value || '',
      band: document.querySelector('#sm_band')?.value || '2',
      channelMode: document.querySelector('#sm_channel_mode')?.value || 'auto',
      channel: document.querySelector('#sm_channel')?.value || '',
      countryCode: document.querySelector('#sm_country')?.value || '',
      autoStartEnabled: document.querySelector('#sm_auto_start_enabled')?.checked || false,
      autoBoot: document.querySelector('#sm_boot')?.checked || false,
      usbTether: document.querySelector('#sm_usb_tether')?.checked || false,
    });
    return safe;
  };

  const validateConfig = (config) => {
    const safe = normalizeConfig(config);
    if (!safe.ssid) return { ok: false, message: 'SSID 不能为空' };
    if (safe.ssid.length > 32) return { ok: false, message: 'SSID 长度不能超过 32 个字符' };
    if (getSecurityNeedsPassword(safe.security)) {
      if (safe.password.length < 8 || safe.password.length > 63) {
        return { ok: false, message: 'WPA 密码长度必须在 8 到 63 个字符之间' };
      }
    }
    if (safe.countryCode && !/^[A-Z]{2}$/.test(safe.countryCode)) {
      return { ok: false, message: '国家码必须是两个大写字母，例如 CN 或 US' };
    }
    if (safe.channelMode === 'fixed') {
      if (!['2', '5', '6'].includes(safe.band)) {
        return { ok: false, message: '固定信道只支持 2/5/6GHz，any 或 bridged 请改用自动信道' };
      }
      if (!safe.channel) {
        return { ok: false, message: '固定信道模式下必须选择一个信道' };
      }
      if (!getChannelFrequency(safe.band, safe.channel)) {
        return { ok: false, message: '当前信道与频段组合无效' };
      }
    }
    return { ok: true, config: safe };
  };

  const render = () => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    root.querySelector('#sm_boot_status').innerHTML = getBootChip();
    root.querySelector('#sm_hotspot_status').innerHTML = state.hotspotEnabled
      ? '<span class="sm-chip" data-kind="good">已启用</span>'
      : '<span class="sm-chip" data-kind="warn">未启用</span>';
    root.querySelector('#sm_country_status').textContent = state.countryCode || '--';
    root.querySelector('#sm_actual_channel_status').textContent = state.hotspotEnabled ? state.hotspotFrequency
      ? `${state.hotspotChannel ? `信道 ${state.hotspotChannel} / ` : ''}${state.hotspotFrequency} MHz`
      : '--' : "--";
    root.querySelector('#sm_usb_monitor_preview').textContent = [
      `巡检状态: ${state.usbMonitorRunning ? '运行中' : '未运行'}`,
      `PID: ${state.usbMonitorPid || '--'}`,
      `sys.usb.state: ${state.usbState || '--'}`,
    ].join('\n');
    root.querySelector('#sm_feature_preview').textContent = state.supportedFeatures || '--';
    root.querySelector('#sm_service_preview').textContent = state.servicePreview || '--';
    root.querySelector('#sm_command_preview').textContent = buildStartCommand(state.config);
    root.querySelector('#sm_summary').innerHTML = `
      <span class="sm-chip">${escapeHtml(state.config.security)}</span>
      <span class="sm-chip">${escapeHtml(getBandLabel(state.config.band))}</span>
      <span class="sm-chip">${escapeHtml(getChannelSummary(state.config))}</span>
      ${state.config.autoStartEnabled ? '<span class="sm-chip">总自启已启用</span>' : '<span class="sm-chip" data-kind="warn">总自启未启用</span>'}
      ${state.config.autoBoot ? '<span class="sm-chip">热点自启已启用</span>' : ''}
      ${state.config.usbTether ? '<span class="sm-chip">USB 共享巡检已启用</span>' : ''}
      ${state.config.countryCode ? `<span class="sm-chip">${escapeHtml(state.config.countryCode)}</span>` : '<span class="sm-chip" data-kind="warn">自动国家码</span>'}
    `;
    syncChannelOptions();
    syncAutoStartOptions();
  };

  const saveCurrentConfig = async (toastText = '正在保存配置...') => {
    const validated = validateConfig(gatherFormData());
    if (!validated.ok) {
      createToast(validated.message, 'red', 5000);
      return false;
    }
    setBusy(true);
    if (toastText) {
      createToast(toastText, 'pink');
    }
    try {
      const ok = await persistConfig(validated.config, validated.config.autoStartEnabled);
      if (!ok) {
        createToast('写入配置或脚本失败', 'red', 5000);
        return false;
      }
      await refreshState();
      syncFormValues();
      render();
      createToast('配置已保存', 'pink');
      return true;
    } finally {
      setBusy(false);
    }
  };

  const syncFormValues = () => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    root.querySelector('#sm_ssid').value = state.config.ssid || '';
    root.querySelector('#sm_security').value = state.config.security || 'wpa2';
    root.querySelector('#sm_password').value = state.config.password || '';
    root.querySelector('#sm_band').value = state.config.band || '2';
    root.querySelector('#sm_channel_mode').value = state.config.channelMode || 'auto';
    root.querySelector('#sm_country').value = state.config.countryCode || '';
    root.querySelector('#sm_auto_start_enabled').checked = Boolean(state.bootEnabled);
    root.querySelector('#sm_boot').checked = Boolean(state.config.autoBoot);
    root.querySelector('#sm_usb_tether').checked = Boolean(state.config.usbTether);
    syncChannelOptions();
    syncAutoStartOptions();
    if (root.querySelector('#sm_channel') && state.config.channel) {
      root.querySelector('#sm_channel').value = state.config.channel;
    }
    const passwordWrap = root.querySelector('#sm_password_wrap');
    if (passwordWrap) {
      passwordWrap.style.display = getSecurityNeedsPassword(root.querySelector('#sm_security').value) ? '' : 'none';
    }
  };

  const startHotspotNow = async () => {
    let loadingToast = null;
    setBusy(true);
    loadingToast = createFixedToast('sm_start_hotspot_loading', '正在保存并启动热点...', {
      color: 'pink',
      pointerEvents: 'none',
    });
    try {
      const saved = await saveCurrentConfig('');
      if (!saved) return;
      const res = await run(`${SERVICE_FILE} start`, 30000);
      if (!res.ok) {
        createToast(res.text || '热点启动失败', 'red', 6000);
        return;
      }
      await collectStatus();
      render();
      createToast('热点启动命令已下发', 'pink');
    } finally {
      loadingToast?.close?.();
      setBusy(false);
    }
  };

  const stopHotspotNow = async () => {
    setBusy(true);
    createToast('正在停止热点...', 'pink');
    try {
      const res = await run(`
if [ -x ${shellQuote(SERVICE_FILE)} ]; then
  ${shellQuote(SERVICE_FILE)} stop
else
  cmd wifi stop-softap >/dev/null 2>&1
  cmd wifi force-softap-channel disabled
fi
`, 30000);
      if (!res.ok) {
        createToast(res.text || '热点停止失败', 'red', 5000);
        return;
      }
      await collectStatus();
      render();
      createToast('热点已停止', 'pink');
    } finally {
      setBusy(false);
    }
  };

  const stopRndisMonitorNow = async () => {
    setBusy(true);
    createToast('正在停止Rndis巡检...', 'pink');
    try {
      const res = await run(`
if [ -x ${shellQuote(SERVICE_FILE)} ]; then
  ${shellQuote(SERVICE_FILE)} stop-rndis
fi
`, 30000);
      if (!res.ok) {
        createToast(res.text || 'Rndis巡检停止失败', 'red', 5000);
        return;
      }
      await collectStatus();
      render();
      createToast('Rndis巡检已停止', 'pink');
    } finally {
      setBusy(false);
    }
  };

  const startRndisMonitorNow = async () => {
    setBusy(true);
    createToast('正在启动Rndis巡检...', 'pink');
    try {
      const res = await run(`
if [ -x ${shellQuote(SERVICE_FILE)} ]; then
  ${shellQuote(SERVICE_FILE)} start-rndis
fi
`, 30000);
      if (!res.ok) {
        createToast(res.text || 'Rndis巡检启动失败', 'red', 5000);
        return;
      }
      await collectStatus();
      render();
      createToast('Rndis巡检已启动', 'pink');
    } finally {
      setBusy(false);
    }
  };

  const toggleBootOnly = async () => {
    const validated = validateConfig(gatherFormData());
    if (!validated.ok) {
      createToast(validated.message, 'red', 5000);
      return;
    }
    validated.config.autoStartEnabled = !state.bootEnabled;
    setBusy(true);
    createToast(validated.config.autoStartEnabled ? '正在启用开机自启总开关...' : '正在取消开机自启总开关...', 'pink');
    try {
      const ok = await persistConfig(validated.config, validated.config.autoStartEnabled);
      if (!ok) {
        createToast('更新开机自启失败', 'red', 5000);
        return;
      }
      await refreshState();
      syncFormValues();
      render();
      createToast(validated.config.autoStartEnabled ? '已启用开机自启总开关' : '已取消开机自启总开关', 'pink');
    } finally {
      setBusy(false);
    }
  };

  const ask = (id, title, body, ok = '确认', cancel = '取消') => new Promise((resolve) => {
    const { el, close } = createFixedToast(id, `<div style="pointer-events:all;width:90vw;max-width:520px;"><div class="title" style="margin:0">${title}</div><div style="margin-top:10px;font-size:.7rem;line-height:1.7">${body}</div><div style="margin-top:12px;text-align:right;display: flex;justify-content: end;gap: 10px;"><button class="ok">${ok}</button><button class="cancel">${cancel}</button></div></div>`);
    const done = (v) => { close(); resolve(v); }; el.querySelector('.ok')?.addEventListener('click', () => done(true)); el.querySelector('.cancel')?.addEventListener('click', () => done(false));
  });

  const clearPluginData = async () => {
    const yes = await ask('sm_clear_data', '确认清除插件数据', '确认清除插件数据，是否继续？', '继续', '取消');
    if (!yes) return;
    setBusy(true);
    createToast('正在清除插件数据...', 'pink');
    try {
      const res = await run(`
if [ -x ${shellQuote(SERVICE_FILE)} ]; then
  ${shellQuote(SERVICE_FILE)} stop >/dev/null 2>&1 || true
else
  cmd wifi stop-softap >/dev/null 2>&1 || true
  cmd wifi force-softap-channel disabled || true
fi
rm -rf ${shellQuote(STORAGE_DIR)}
touch ${shellQuote(BOOT_SH_FILE)}
sed -i '/kano_softap_manager/d' ${shellQuote(BOOT_SH_FILE)}
`, 30000);
      if (!res.ok) {
        createToast('清除失败', 'red', 5000);
        return;
      }
      state.config = { ...DEFAULT_CONFIG };
      state.bootEnabled = false;
      state.hotspotEnabled = false;
      state.servicePreview = buildServiceScript(state.config);
      await collectStatus();
      syncFormValues();
      render();
      createToast('插件数据已清除', 'pink');
    } finally {
      setBusy(false);
    }
  };

  const openModal = async () => {
    ensureStyle();
    document.querySelector(`#${MODAL_NAME}`)?.remove();

    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '980px',
      showConfirm: false,
      contentStyle: 'max-height:72vh;',
      onClose: () => true,
      content: `
        <div class="sm-wrap">
          <div class="sm-grid">
            <div class="sm-stat">
              <div class="sm-stat-label">开机自启状态</div>
              <div class="sm-stat-value" id="sm_boot_status"></div>
            </div>
            <div class="sm-stat">
              <div class="sm-stat-label">热点是否已启用</div>
              <div class="sm-stat-value" id="sm_hotspot_status"></div>
            </div>
            <div class="sm-stat">
              <div class="sm-stat-label">国家码</div>
              <div class="sm-stat-value" id="sm_country_status">--</div>
            </div>
            <div class="sm-stat">
              <div class="sm-stat-label">实际信道</div>
              <div class="sm-stat-value" id="sm_actual_channel_status">--</div>
            </div>
          </div>

          <div class="sm-card">
            <div class="sm-head">
              <div class="sm-title">热点配置</div>
              <div class="sm-actions" id="sm_summary"></div>
            </div>
            <div class="sm-form">
              <label class="sm-field">
                <span class="sm-label">SSID</span>
                <input id="sm_ssid" placeholder="输入热点名称">
              </label>
              <label class="sm-field">
                <span class="sm-label">安全类型</span>
                <select id="sm_security">
                  <option value="open">open</option>
                  <option value="wpa2">wpa2</option>
                  <option value="wpa3">wpa3</option>
                  <option value="wpa3_transition">wpa3_transition</option>
                  <option value="owe">owe</option>
                  <option value="owe_transition">owe_transition</option>
                </select>
              </label>
              <label class="sm-field" id="sm_password_wrap">
                <span class="sm-label">密码</span>
                <input id="sm_password" placeholder="8-63 位密码">
              </label>
              <label class="sm-field">
                <span class="sm-label">频段</span>
                <select id="sm_band">
                  <option value="2">2.4GHz</option>
                  <option value="5">5GHz</option>
                  <option value="6">6GHz</option>
                  <option value="any">自动</option>
                  <option value="bridged">双频</option>
                </select>
              </label>
              <label class="sm-field">
                <span class="sm-label">信道模式</span>
                <select id="sm_channel_mode">
                  <option value="auto">自动</option>
                  <option value="fixed">固定</option>
                </select>
              </label>
              <label class="sm-field">
                <span class="sm-label">固定信道(不一定有用)</span>
                <select id="sm_channel"></select>
              </label>
              <label class="sm-field">
                <span class="sm-label">国家码</span>
                <input id="sm_country" maxlength="2" placeholder="例如 CN">
              </label>
              <label class="sm-field">
                <span class="sm-label">开机自启总开关</span>
                <div class="sm-inline" style="height: 33px;">
                  <input id="sm_auto_start_enabled" type="checkbox" style="width:auto;">
                  <span class="sm-tip">控制开机时是否执行热点和 USB 网络共享自启服务</span>
                </div>
              </label>
              <label class="sm-field">
                <span class="sm-label">热点自启</span>
                <div class="sm-inline" style="height: 33px;">
                  <input id="sm_boot" type="checkbox" style="width:auto;">
                  <span class="sm-tip">开机后自动启动热点</span>
                </div>
              </label>
              <label class="sm-field">
                <span class="sm-label">USB 网络共享</span>
                <div class="sm-inline" style="height: 33px;">
                  <input id="sm_usb_tether" type="checkbox" style="width:auto;">
                  <span class="sm-tip">开机后自动巡检并打开 USB 网络共享</span>
                </div>
              </label>
            </div>
          </div>

          <div class="sm-card">
            <div class="sm-head">
              <div class="sm-title">操作区</div>
              <div class="sm-actions">
                <button id="sm_save_btn">保存配置</button>
                <button id="sm_start_btn">立即启动</button>
                <button id="sm_stop_btn">停止热点</button>
                <button id="sm_rndis_btn">启动 USB 共享巡检</button>
                <button id="sm_stop_rndis_btn">停止 USB 共享巡检</button>
                <button id="sm_boot_btn">切换自启</button>
                <button id="sm_refresh_btn">刷新状态</button>
                <button id="sm_clear_btn">清除配置</button>
              </div>
            </div>
          </div>

          <div class="sm-block">
            <div class="sm-title" style="margin-bottom:8px;">当前 USB 共享巡检状态</div>
            <pre id="sm_usb_monitor_preview"></pre>
          </div>

          <details>
            <summary>查看热点能力</summary>
            <pre id="sm_feature_preview" style="margin-top: 10px;"></pre>
          </details>

          <details>
            <summary>查看启动命令预览</summary>
            <pre id="sm_command_preview" style="margin-top: 10px;"></pre>
          </details>

          <details>
            <summary>查看生成的 service.sh</summary>
            <pre id="sm_service_preview" style="margin-top: 10px;"></pre>
          </details>
        </div>
      `,
    });

    el.style.width = '96%';
    ensureLoadingMask(el);
    showModal(id);
    setLoading(true, '正在加载...');

    el.querySelector('#sm_security').onchange = () => {
      const wrap = el.querySelector('#sm_password_wrap');
      wrap.style.display = getSecurityNeedsPassword(el.querySelector('#sm_security').value) ? '' : 'none';
      syncChannelOptions();
    };
    el.querySelector('#sm_band').onchange = () => syncChannelOptions();
    el.querySelector('#sm_channel_mode').onchange = () => syncChannelOptions();
    el.querySelector('#sm_auto_start_enabled').onchange = () => syncAutoStartOptions();
    el.querySelector('#sm_save_btn').onclick = async () => {
      await saveCurrentConfig();
    };
    el.querySelector('#sm_start_btn').onclick = async () => {
      await startHotspotNow();
    };
    el.querySelector('#sm_stop_btn').onclick = async () => {
      await stopHotspotNow();
    };
    el.querySelector('#sm_rndis_btn').onclick = async () => {
      await startRndisMonitorNow();
    };
    el.querySelector('#sm_stop_rndis_btn').onclick = async () => {
      await stopRndisMonitorNow();
    };
    el.querySelector('#sm_boot_btn').onclick = async () => {
      await toggleBootOnly();
    };
    el.querySelector('#sm_refresh_btn').onclick = async () => {
      setBusy(true);
      try {
        await refreshState();
        syncFormValues();
        render();
        createToast('状态已刷新', 'pink');
      } finally {
        setBusy(false);
      }
    };
    el.querySelector('#sm_clear_btn').onclick = async () => {
      await clearPluginData();
    };

    try {
      await refreshState();
      syncFormValues();
      render();
    } finally {
      setLoading(false);
    }
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
