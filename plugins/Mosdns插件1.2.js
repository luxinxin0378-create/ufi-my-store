//<script>
(async () => {
  const MODAL_NAME = 'kano_mosdns_modal';
  const STYLE_ID = 'kano_mosdns_style';
  const TITLE = 'Mosdns 分流';
  const VERSION = 'v1.2';
  const SERVICE_MARK = '# ufi-mosdns-service-v1.2';

  const MD_DIR = '/data/mosdns';
  const BIN_FILE = `${MD_DIR}/mosdns`;
  const ZIP_FILE = `${MD_DIR}/mosdns-linux-arm64.zip`;
  const CONFIG_FILE = `${MD_DIR}/config.yaml`;
  const UPSTREAMS_CONF = `${MD_DIR}/upstreams.conf`;
  const SERVICE_SH = `${MD_DIR}/service.sh`;
  const CN_FILE = `${MD_DIR}/cn_domains.txt`;
  const CN_RAW_FILE = `${MD_DIR}/cn_domains.raw`;
  const CN_TMP_FILE = `${MD_DIR}/cn_domains.tmp`;
  const LOG_FILE = `${MD_DIR}/mosdns.log`;

  const BOOT_SH_FILE = '/sdcard/ufi_tools_boot.sh';
  const BOOT_MARK = 'mosdns-autostart';
  const BOOT_COMMAND = `sh ${SERVICE_SH} boot & # ${BOOT_MARK}`;

  const CURL_BIN = '/data/data/com.minikano.f50_sms/files/curl';
  const CURL_ENV = 'env SSL_CERT_DIR=/system/etc/security/cacerts';
  const BIN_URLS = [
    'https://github.com/IrineSistiana/mosdns/releases/download/v5.3.4/mosdns-linux-arm64.zip',
    'https://ghproxy.net/https://github.com/IrineSistiana/mosdns/releases/download/v5.3.4/mosdns-linux-arm64.zip',
    'https://ghfast.top/https://github.com/IrineSistiana/mosdns/releases/download/v5.3.4/mosdns-linux-arm64.zip',
    'https://mirror.ghproxy.com/https://github.com/IrineSistiana/mosdns/releases/download/v5.3.4/mosdns-linux-arm64.zip',
  ];
  const CN_LIST_URLS = [
    'https://cdn.jsdelivr.net/gh/felixonmars/dnsmasq-china-list@master/accelerated-domains.china.conf',
    'https://fastly.jsdelivr.net/gh/felixonmars/dnsmasq-china-list@master/accelerated-domains.china.conf',
    'https://testingcf.jsdelivr.net/gh/felixonmars/dnsmasq-china-list@master/accelerated-domains.china.conf',
    'https://ghfast.top/https://raw.githubusercontent.com/felixonmars/dnsmasq-china-list/master/accelerated-domains.china.conf',
  ];
  const LISTEN_PORT = 6353;
  const DEFAULT_CHINA_LIST = ['223.5.5.5', '119.29.29.29'];
  const DEFAULT_FOREIGN_LIST = ['tls://8.8.8.8', 'tls://1.1.1.1'];
  const DEFAULT_BOOTSTRAP_LIST = ['223.5.5.5', '119.29.29.29'];

  const BIN_DL_BASE = '/data/md_bin_download';
  const LIST_DL_BASE = '/data/md_list_download';
  const LIST_UPDATE_BASE = '/data/md_list_update';
  const CUSTOM_DL_BASE = '/data/md_custom_download';
  const AUTO_UPDATE_FILE = `${MD_DIR}/.auto_update`;
  const NO_HIJACK_FILE = `${MD_DIR}/.no_hijack`;
  const CUSTOM_JSON = `${MD_DIR}/custom_lists.json`;
  const CUSTOM_SETS_CONF = `${MD_DIR}/custom_sets.conf`;
  const CACHE_TMP = `${MD_DIR}/.cache_args.tmp`;

  const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;
  const DOMAIN_RE = /^(?=.{1,253}$)[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

  const wait = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
  const run = async (cmd, timeout) => await runShellWithRoot(cmd, timeout);
  const cleanText = (v) => String(v || '').trim();
  const lastLine = (v) => cleanText(v).split('\n').pop().trim();
  const serviceSucceeded = (res) => !!res?.success && lastLine(res.content) === 'ok';
  const shellQuote = (v) => "'" + String(v).replace(/'/g, "'\\''") + "'";
  const isIPv4 = (v) => IPV4_RE.test(v) && v.split('.').every((n) => Number(n) <= 255 && (n === '0' || !n.startsWith('0')));

  const state = {
    busy: false,
    uninstallClicks: 0,
    restoreClicks: 0,
    deleteId: null,
    deleteClicks: 0,
    deleteTimer: null,
    logTimer: null,
    searchTimer: null,
    showClosedLogs: false,
  };

  // 是否可公开解析的域名（排除 IP 字面量与 localhost/.local/.lan 等本机名）
  const isDomainName = (s) => {
    const v = String(s || '').trim();
    if (!v || IPV4_RE.test(v) || v.includes(':')) return false;
    const lower = v.toLowerCase();
    if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local') || lower.endsWith('.lan')) return false;
    return DOMAIN_RE.test(lower);
  };

  // UDP/TCP 上游必须是 IP；域名上游需要明确选择 DoT 或 DoH。
  const okUpstreamLine = (value) => {
    const line = String(value || '').trim();
    if (!line || /[\s\\'"`$<>{}|;]/.test(line)) return false;
    try {
      const u = new URL(line.includes('://') ? line : `udp://${line}`);
      const protocol = u.protocol.slice(0, -1);
      if (!['udp', 'tcp', 'tls', 'https'].includes(protocol) || u.username || u.password || u.hash) return false;
      if (u.port && (!/^\d+$/.test(u.port) || Number(u.port) < 1 || Number(u.port) > 65535)) return false;
      const ip = isIPv4(u.hostname) || /^\[[0-9a-f:]+\]$/i.test(u.hostname);
      if (!ip && !isDomainName(u.hostname)) return false;
      if (protocol === 'udp' || protocol === 'tcp') return ip && !u.pathname && !u.search;
      if (protocol === 'tls') return !u.pathname && !u.search;
      return true;
    } catch {
      return false;
    }
  };

  const normalizeUpstream = (line) => line.trim().replace(/^[a-z]+:\/\//i, (s) => s.toLowerCase());
  const okDownloadUrl = (value) => {
    if (/[\s\x00-\x1f\x7f]/.test(value)) return false;
    try {
      const u = new URL(value);
      return ['http:', 'https:'].includes(u.protocol) && !!u.hostname && !u.username && !u.password;
    } catch {
      return false;
    }
  };

  // 按上游/名单变更重生成配置，同时保留缓存参数与日志等级。
  const SERVICE_CONTENT = String.raw`#!/system/bin/sh
# Mosdns 服务脚本（由 UFI-TOOLS Mosdns 插件生成）
${SERVICE_MARK}
DIR="/data/mosdns"
BIN="$DIR/mosdns"
BB="/data/adb/magisk/busybox"
PORT=6353
PIDFILE="$DIR/mosdns.pid"

# upstreams.conf 只作为数据读取，绝不 source/eval，兼容旧版多行格式。
read_upstream() {
  [ -f "$DIR/upstreams.conf" ] || return 0
  awk -v key="$1" '
    !reading && index($0, key "=\"") == 1 {
      reading=1; line=substr($0, length(key)+3)
      if (substr(line, length(line), 1) == "\"") {
        print substr(line, 1, length(line)-1); exit
      }
      print line; next
    }
    reading {
      if (substr($0, length($0), 1) == "\"") {
        print substr($0, 1, length($0)-1); exit
      }
      print
    }
  ' "$DIR/upstreams.conf"
}
CHINA_DNS=$(read_upstream CHINA_DNS)
FOREIGN_DNS=$(read_upstream FOREIGN_DNS)
BOOTSTRAP_DNS=$(read_upstream BOOTSTRAP_DNS)
[ -z "$CHINA_DNS" ] && CHINA_DNS="${DEFAULT_CHINA_LIST.join('\n')}"
[ -z "$FOREIGN_DNS" ] && FOREIGN_DNS="${DEFAULT_FOREIGN_LIST.join('\n')}"
[ -z "$BOOTSTRAP_DNS" ] && BOOTSTRAP_DNS="${DEFAULT_BOOTSTRAP_LIST.join('\n')}"

emit_upstreams() {
  bs_total=$(printf '%s\n' "$BOOTSTRAP_DNS" | grep -c .)
  [ "$bs_total" -gt 0 ] || return 1
  printf '%s\n' "$1" | while IFS= read -r line; do
    [ -z "$line" ] && continue
    printf '        - addr: "%s"\n' "$line"
    case "$line" in
      tls://*|https://*)
        hostpart=$(printf '%s\n' "$line" | sed 's|^[a-z]*://||; s|/.*$||; s|:[0-9]*$||')
        case "$hostpart" in
          \[*\]) ;; # IPv6 字面量不需要 bootstrap
          *[!0-9.]*)
            bs_idx=$((bs_idx + 1))
            bs_line=$(printf '%s\n' "$BOOTSTRAP_DNS" | awk -v n="$bs_idx" -v t="$bs_total" 'NR == ((n - 1) % t) + 1 { print; exit }')
            printf '          bootstrap: "%s"\n' "$bs_line"
            ;;
        esac
        ;;
    esac
  done
}

gen_config() {
  # 重生成时保留已有缓存插件段和日志等级；恢复默认操作会显式删除配置。
  cache_block=""
  cache_enabled=1
  log_level="info"
  if [ -f "$DIR/config.yaml" ]; then
    cache_block=$(awk '/^  - tag: cache[[:space:]]*$/{f=1; print; next} f && /^  - tag: /{exit} f{print}' "$DIR/config.yaml")
    main_block=$(awk '/^  - tag: main_sequence[[:space:]]*$/{f=1; next} f && /^  - tag: /{exit} f{print}' "$DIR/config.yaml")
    if [ -n "$main_block" ] && ! printf '%s\n' "$main_block" | grep -qE '^      - exec: \$cache[[:space:]]*$'; then
      cache_enabled=0
    fi
    old_level=$(awk '/^log:/{f=1; next} f && /^[^[:space:]]/{exit} f && /^  level:/{print $2; exit}' "$DIR/config.yaml" | tr -d "\"'")
    case "$old_level" in debug|info|warn|error|dpanic|panic|fatal) log_level="$old_level" ;; esac
  fi
  bs_idx=0
  {
    printf 'log:\n  level: %s\n  file: "/data/mosdns/mosdns.log"\n\nplugins:\n' "$log_level"
    if [ -n "$cache_block" ]; then
      printf '%s\n' "$cache_block"
    else
      cat <<"MD_CACHE"
  - tag: cache
    type: cache
    args:
      size: 10000
MD_CACHE
    fi
    cat <<"MD_HEAD"
  - tag: cn_domains
    type: domain_set
    args:
      files:
        - "/data/mosdns/cn_domains.txt"
MD_HEAD
    if [ -f "$DIR/custom_sets.conf" ]; then
      while read -r setname setgroup setfile; do
        [ -z "$setname" ] && continue
        cat <<MD_CSET
  - tag: $setname
    type: domain_set
    args:
      files:
        - "$DIR/$setfile"
MD_CSET
      done < "$DIR/custom_sets.conf"
    fi
    cat <<"MD_MID"
  - tag: forward_china
    type: forward
    args:
      upstreams:
MD_MID
    emit_upstreams "$CHINA_DNS" || return 1
    cat <<"MD_MID2"
  - tag: forward_foreign
    type: forward
    args:
      upstreams:
MD_MID2
    emit_upstreams "$FOREIGN_DNS" || return 1
    cat <<"MD_MID3"
  - tag: main_sequence
    type: sequence
    args:
MD_MID3
    if [ "$cache_enabled" = 1 ]; then
      cat <<"MD_CACHE_EXEC"
      - exec: $cache
      - matches: has_resp
        exec: accept
MD_CACHE_EXEC
    else
      printf '      # md-cache-disabled: $cache\n'
    fi
    # 用户自定义名单优先，避免内置国内名单遮蔽用户指定的国外规则。
    if [ -f "$DIR/custom_sets.conf" ]; then
      while read -r setname setgroup setfile; do
        [ -z "$setname" ] && continue
        tgt="forward_china"
        [ "$setgroup" = "foreign" ] && tgt="forward_foreign"
        printf '      - matches: "qname $%s"\n        exec: $%s\n' "$setname" "$tgt"
        printf '      - matches: has_resp\n        exec: accept\n'
      done < "$DIR/custom_sets.conf"
    fi
    cat <<"MD_TAIL"
      - matches: "qname $cn_domains"
        exec: $forward_china
      - matches: has_resp
        exec: accept
      - exec: $forward_foreign
  - tag: udp_server
    type: udp_server
    args:
      entry: main_sequence
      listen: ":6353"
  - tag: tcp_server
    type: tcp_server
    args:
      entry: main_sequence
      listen: ":6353"
MD_TAIL
  } > "$DIR/config.yaml.new" && mv "$DIR/config.yaml.new" "$DIR/config.yaml"
}

del_legacy_cdns() {
  iptables -t nat -D OUTPUT -j CDNS_REDIRECT_DNS 2>/dev/null
  iptables -t nat -F CDNS_REDIRECT_DNS 2>/dev/null
  iptables -t nat -X CDNS_REDIRECT_DNS 2>/dev/null
  iptables -t nat -D PREROUTING -j CDNS_REDIRECT_LAN 2>/dev/null
  iptables -t nat -F CDNS_REDIRECT_LAN 2>/dev/null
  iptables -t nat -X CDNS_REDIRECT_LAN 2>/dev/null
  ip6tables -D INPUT -i br0 -j CDNS_BLOCK_DNS 2>/dev/null
  ip6tables -D OUTPUT -j CDNS_BLOCK_DNS 2>/dev/null
  ip6tables -F CDNS_BLOCK_DNS 2>/dev/null
  ip6tables -X CDNS_BLOCK_DNS 2>/dev/null
}

del_rules() {
  iptables -t nat -D OUTPUT -j MDNS_REDIRECT_DNS 2>/dev/null
  iptables -t nat -F MDNS_REDIRECT_DNS 2>/dev/null
  iptables -t nat -X MDNS_REDIRECT_DNS 2>/dev/null
  iptables -t nat -D PREROUTING -j MDNS_REDIRECT_LAN 2>/dev/null
  iptables -t nat -F MDNS_REDIRECT_LAN 2>/dev/null
  iptables -t nat -X MDNS_REDIRECT_LAN 2>/dev/null
  ip6tables -D INPUT -i br0 -j MDNS_BLOCK_DNS 2>/dev/null
  ip6tables -D OUTPUT -j MDNS_BLOCK_DNS 2>/dev/null
  ip6tables -F MDNS_BLOCK_DNS 2>/dev/null
  ip6tables -X MDNS_BLOCK_DNS 2>/dev/null
  return 0
}

add_rules() {
  del_legacy_cdns
  del_rules
  iptables -t nat -N MDNS_REDIRECT_DNS || return 1
  iptables -t nat -A MDNS_REDIRECT_DNS -m owner --uid-owner 0 --gid-owner 3004 -j RETURN || return 1
  iptables -t nat -A MDNS_REDIRECT_DNS -p udp --dport 53 -j REDIRECT --to-ports "$PORT" || return 1
  iptables -t nat -A MDNS_REDIRECT_DNS -p tcp --dport 53 -j REDIRECT --to-ports "$PORT" || return 1
  iptables -t nat -I OUTPUT -j MDNS_REDIRECT_DNS || return 1
  iptables -t nat -N MDNS_REDIRECT_LAN || return 1
  iptables -t nat -A MDNS_REDIRECT_LAN -i br0 -p udp --dport 53 -j REDIRECT --to-ports "$PORT" || return 1
  iptables -t nat -A MDNS_REDIRECT_LAN -i br0 -p tcp --dport 53 -j REDIRECT --to-ports "$PORT" || return 1
  iptables -t nat -I PREROUTING -j MDNS_REDIRECT_LAN || return 1
  if ip6tables -L INPUT >/dev/null 2>&1; then
    ip6tables -N MDNS_BLOCK_DNS || return 1
    ip6tables -A MDNS_BLOCK_DNS -p udp --dport 53 -j DROP || return 1
    ip6tables -A MDNS_BLOCK_DNS -p tcp --dport 53 -j DROP || return 1
    ip6tables -I INPUT -i br0 -j MDNS_BLOCK_DNS || return 1
    ip6tables -I OUTPUT -j MDNS_BLOCK_DNS || return 1
  fi
  return 0
}

stop_proc() {
  killall mosdns 2>/dev/null
  rm -f "$PIDFILE"
}

start_proc() {
  [ -x "$BB" ] && [ -x "$BIN" ] || { echo "mosdns/busybox executable missing"; return 1; }
  if [ ! -f "$DIR/config.yaml" ] || [ "$DIR/upstreams.conf" -nt "$DIR/config.yaml" ] || [ "$DIR/custom_sets.conf" -nt "$DIR/config.yaml" ]; then
    gen_config || { echo "mosdns config generation failed"; return 1; }
  fi
  stop_proc
  sleep 1
  env SSL_CERT_DIR=/system/etc/security/cacerts "$BB" setuidgid root:net_raw "$BIN" start -d "$DIR" -c "$DIR/config.yaml" >> "$DIR/mosdns.log" 2>&1 &
  proc_pid=$!
  printf '%s\n' "$proc_pid" > "$PIDFILE"
  sleep 2
  if kill -0 "$proc_pid" 2>/dev/null; then
    echo "mosdns running, pid: $proc_pid"
    return 0
  fi
  rm -f "$PIDFILE"
  echo "mosdns start failed"
  return 1
}

start_service() {
  if ! start_proc; then
    del_rules
    return 1
  fi
  if [ -f "$DIR/.no_hijack" ]; then
    del_rules
  elif ! add_rules; then
    del_rules
    echo "mosdns DNS redirect failed; rules removed"
    return 1
  fi
  echo ok
}

case "$1" in
  start) start_service ;;
  stop) stop_proc; del_rules; echo stopped ;;
  restart) stop_proc; del_rules; sleep 1; start_service ;;
  boot)
    sleep 10
    start_service || exit 1
    # MD_AUTO_UPDATE
    echo boot-done
    ;;
  delrules) del_rules; echo rules-deleted ;;
  status) pgrep mosdns >/dev/null 2>&1 && echo running || echo stopped ;;
  *) echo "usage: $0 start|stop|restart|boot|status|delrules"; exit 1 ;;
esac
`;

  const AUTO_UPDATE_BLOCK = String.raw`    # >>> mosdns-auto-update >>>
    ( sleep 30
      [ -f "$DIR/.auto_update" ] || exit 0
      NOW=$(date +%s)
      LAST=$(stat -c %Y "$DIR/cn_domains.txt" 2>/dev/null || echo 0)
      if [ $((NOW - LAST)) -ge 604800 ]; then
        RAW="$DIR/cn_domains.auto.raw"
        TMP="$DIR/cn_domains.auto.tmp"
        echo "[$(date)] cn_domains older than 7 days, updating"
        if ! env SSL_CERT_DIR=/system/etc/security/cacerts ${CURL_BIN} -fLsS --connect-timeout 15 --max-time 120 --proto '=http,https' --proto-redir '=http,https' "${CN_LIST_URLS[0]}" -o "$RAW"; then
          rm -f "$RAW"
          echo "[$(date)] download failed, keep old list"
          exit 1
        fi
        if ! awk -F/ '/^server=\// {print $2}' "$RAW" > "$TMP"; then
          rm -f "$RAW" "$TMP"
          exit 1
        fi
        rm -f "$RAW"
        CNT=$(wc -l < "$TMP" 2>/dev/null || echo 0)
        if [ "$CNT" -ge 100000 ]; then
          mv "$TMP" "$DIR/cn_domains.txt" || exit 1
          # 用户已手动停止服务时，更新任务不能将它重新启动。
          if pgrep mosdns >/dev/null 2>&1; then
            start_service || { echo "[$(date)] restart failed, DNS redirect removed"; exit 1; }
          fi
          echo "[$(date)] updated: $CNT lines"
        else
          rm -f "$TMP"
          echo "[$(date)] update failed: $CNT lines, keep old"
        fi
      fi
    ) >> "$DIR/update.log" 2>&1 &
    # <<< mosdns-auto-update <<<`;

  const buildServiceContent = (withUpdate) =>
    SERVICE_CONTENT.replace('    # MD_AUTO_UPDATE', withUpdate ? AUTO_UPDATE_BLOCK : '');

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .md-shell {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      #${MODAL_NAME} .md-hero {
        position: relative;
        overflow: hidden;
        border-radius: 18px;
        padding: 16px;
        color: #f6f8fb;
        background:
          radial-gradient(circle at top right, rgba(106, 208, 255, 0.26), transparent 38%),
          linear-gradient(135deg, rgba(9, 36, 59, 0.96), rgba(14, 85, 103, 0.92));
        border: 1px solid rgba(123, 219, 255, 0.18);
      }
      #${MODAL_NAME} .md-hero-title {
        margin: 0 0 6px;
        font-size: 1rem;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      #${MODAL_NAME} .md-hero-sub {
        font-size: .7rem;
        line-height: 1.7;
        opacity: .9;
      }
      #${MODAL_NAME} .md-tabs {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding-bottom: 2px;
      }
      #${MODAL_NAME} .md-tab {
        flex-shrink: 0;
        min-height: 30px;
        padding: 5px 12px;
        border-radius: 999px;
        font-size: .66rem;
        font-weight: 700;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.04);
        opacity: .75;
        white-space: nowrap;
      }
      #${MODAL_NAME} .md-tab[data-active="1"] {
        background: linear-gradient(90deg, var(--dark-btn-color), var(--dark-btn-color-active));
        border-color: transparent;
        opacity: 1;
      }
      #${MODAL_NAME} .md-tabpage {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      #${MODAL_NAME} .md-tabpage[hidden] {
        display: none !important;
      }
      #${MODAL_NAME} .md-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      #${MODAL_NAME} .md-card,
      #${MODAL_NAME} .md-status-panel,
      #${MODAL_NAME} .md-action-panel {
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.035);
        backdrop-filter: blur(12px);
      }
      #${MODAL_NAME} .md-card {
        padding: 10px 12px;
      }
      #${MODAL_NAME} .md-card-label {
        font-size: .64rem;
        opacity: .72;
        margin-bottom: 6px;
      }
      #${MODAL_NAME} .md-card-sub {
        margin-top: 6px;
        font-size: .62rem;
        line-height: 1.45;
        opacity: .76;
      }
      #${MODAL_NAME} .md-card-value {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: .86rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .md-card-value--between {
        justify-content: space-between;
      }
      #${MODAL_NAME} .md-chip {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: .64rem;
        font-weight: 700;
      }
      #${MODAL_NAME} .md-chip[data-kind="on"] {
        color: #08270f;
        background: #9cf6b6;
      }
      #${MODAL_NAME} .md-chip[data-kind="off"] {
        color: #ffe2e2;
        background: rgba(255, 107, 107, 0.18);
      }
      #${MODAL_NAME} .md-chip[data-kind="warn"] {
        color: #ffeec7;
        background: rgba(255, 196, 87, 0.18);
      }
      #${MODAL_NAME} .md-switch {
        position: relative;
        width: 52px;
        height: 30px;
        border: 0;
        padding: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.15);
        transition: background .2s ease, opacity .2s ease;
        flex-shrink: 0;
      }
      #${MODAL_NAME} .md-switch::after {
        content: "";
        position: absolute;
        left: 4px;
        top: 4px;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #ffffff8a;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.25);
        transition: transform .2s ease;
      }
      #${MODAL_NAME} .md-switch[data-on="1"] {
            background: linear-gradient(90deg, var(--dark-btn-color), var(--dark-btn-color-active));
      }
      #${MODAL_NAME} .md-switch[data-on="1"]::after {
        transform: translateX(22px);
      }
      #${MODAL_NAME} .md-switch:disabled {
        opacity: .45;
      }
      #${MODAL_NAME} .md-status-panel,
      #${MODAL_NAME} .md-action-panel {
        padding: 14px;
      }
      #${MODAL_NAME} .md-panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
      }
      #${MODAL_NAME} .md-panel-title {
        font-size: .78rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .md-panel-tip {
        font-size: .64rem;
        opacity: .72;
      }
      #${MODAL_NAME} .md-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      #${MODAL_NAME} .md-actions button {
        min-height: 30px;
        font-size: .66rem;
        white-space: normal;
      }
      #${MODAL_NAME} .md-progress-shell {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #${MODAL_NAME} .md-progress-shell[hidden] {
        display: none !important;
      }
      #${MODAL_NAME} .md-progress-text {
        font-size: .68rem;
        line-height: 1.6;
        word-break: break-all;
      }
      #${MODAL_NAME} .md-progress-track {
        width: 100%;
        height: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.09);
      }
      #${MODAL_NAME} .md-progress-bar {
        width: 0%;
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #58d68d, #7be0ff);
        transition: width .2s ease;
      }
      #${MODAL_NAME} .md-log {
        margin: 10px 0;
        max-height: 160px;
        overflow: auto;
        border-radius: 12px;
        padding: 10px;
        font-size: .64rem;
        line-height: 1.6;
        color: #dfe6ef;
        background: rgb(6 13 23 / 42%);
        white-space: pre-wrap;
        word-break: break-word;
      }
      #${MODAL_NAME} .md-info-line {
        font-size: .68rem;
        line-height: 1.6;
        opacity: .85;
        word-break: break-all;
      }
      #${MODAL_NAME} .md-switch-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
      }
      #${MODAL_NAME} .md-switch-info {
        min-width: 0;
      }
      #${MODAL_NAME} .md-switch-label {
        font-size: .72rem;
        font-weight: 700;
      }
      #${MODAL_NAME} .md-switch-tip {
        margin-top: 3px;
        font-size: .62rem;
        line-height: 1.5;
        opacity: .7;
      }
      #${MODAL_NAME} .md-input {
        width: 100%;
        min-height: 32px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 6px 10px;
        font-size: .68rem;
        color: #dfe6ef;
        background: rgb(6 13 23 / 42%);
        box-sizing: border-box;
      }
      #${MODAL_NAME} .md-conf-editor {
        width: 100%;
        min-height: 120px;
        resize: vertical;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 10px;
        font-family: monospace;
        font-size: .66rem;
        line-height: 1.6;
        color: #dfe6ef;
        background: rgb(6 13 23 / 42%);
        white-space: pre;
        box-sizing: border-box;
      }
      #${MODAL_NAME} .md-conf-editor:disabled {
        opacity: .45;
      }
      #${MODAL_NAME} .md-log-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      #${MODAL_NAME} .md-log-search {
        flex: 1;
        min-width: 140px;
      }
      #${MODAL_NAME} .md-log-sel {
        width: auto;
        min-width: 96px;
      }
      #${MODAL_NAME} .md-log-toolbar button {
        min-height: 32px;
        font-size: .64rem;
        padding: 4px 12px;
        white-space: nowrap;
      }
      #${MODAL_NAME} .md-log-table {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 10px;
        max-height: 46vh;
        overflow: auto;
      }
      #${MODAL_NAME} .md-logrow {
        display: grid;
        grid-template-columns: auto auto auto minmax(0, 1fr);
        gap: 8px;
        align-items: baseline;
        padding: 6px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(255, 255, 255, 0.03);
      }
      #${MODAL_NAME} .md-logtime {
        font-family: monospace;
        font-size: .62rem;
        opacity: .7;
      }
      #${MODAL_NAME} .md-lv {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: .58rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .md-lv[data-kind="debug"] {
        color: #e2e2e2;
        background: rgba(255, 255, 255, 0.12);
      }
      #${MODAL_NAME} .md-lv[data-kind="info"] {
        color: #d6ecff;
        background: rgba(86, 156, 255, 0.22);
      }
      #${MODAL_NAME} .md-lv[data-kind="warn"] {
        color: #ffeec7;
        background: rgba(255, 196, 87, 0.18);
      }
      #${MODAL_NAME} .md-lv[data-kind="error"] {
        color: #ffd6d6;
        background: rgba(255, 107, 107, 0.25);
      }
      #${MODAL_NAME} .md-lv[data-kind="raw"] {
        color: #e2e2e2;
        background: rgba(255, 255, 255, 0.08);
      }
      #${MODAL_NAME} .md-logtag {
        font-size: .62rem;
        font-weight: 700;
        opacity: .8;
        word-break: break-all;
      }
      #${MODAL_NAME} .md-logmsg {
        font-size: .64rem;
        line-height: 1.5;
        word-break: break-word;
      }
      #${MODAL_NAME} .md-yaml-editor {
        min-height: 320px;
      }
      #${MODAL_NAME} .md-up-label {
        font-size: .68rem;
        font-weight: 700;
        margin-bottom: 6px;
      }
      #${MODAL_NAME} .md-form-num {
        max-width: 170px;
        flex-shrink: 0;
      }
      #${MODAL_NAME} .md-cl-table {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #${MODAL_NAME} .md-cl-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.03);
      }
      #${MODAL_NAME} .md-cl-info {
        min-width: 0;
      }
      #${MODAL_NAME} .md-cl-title {
        font-size: .72rem;
        font-weight: 700;
        word-break: break-all;
      }
      #${MODAL_NAME} .md-cl-meta {
        margin-top: 3px;
        font-size: .62rem;
        opacity: .7;
      }
      #${MODAL_NAME} .md-cl-actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }
      #${MODAL_NAME} .md-cl-actions button {
        min-height: 28px;
        font-size: .62rem;
        padding: 4px 12px;
        white-space: nowrap;
      }
      #${MODAL_NAME} .md-cl-form {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
        margin-top: 10px;
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} .md-grid {
          grid-template-columns: 1fr;
        }
        #${MODAL_NAME} .md-actions button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const checkRoot = async () => {
    try {
      const res = await run('whoami');
      return !!(res?.success && String(res.content || '').includes('root'));
    } catch {
      return false;
    }
  };

  const isInstalled = async () => {
    const res = await run(`[ -x "${BIN_FILE}" ] && [ -f "${SERVICE_SH}" ] && echo 1 || echo 0`);
    return res?.success && lastLine(res.content) === '1';
  };

  const getRunningPid = async () => {
    const res = await run(`pgrep mosdns | head -n 1`);
    if (!res?.success) return '';
    const pid = cleanText(res.content).split('\n')[0].trim();
    return /^\d+$/.test(pid) ? pid : '';
  };

  const isRunning = async () => !!(await getRunningPid());

  const isBootEnabled = async () => {
    const res = await run(`grep -qF "${BOOT_MARK}" "${BOOT_SH_FILE}" 2>/dev/null && echo 1 || echo 0`);
    return res?.success && lastLine(res.content) === '1';
  };

  const isAutoUpdateEnabled = async () => {
    const res = await run(`[ -f "${AUTO_UPDATE_FILE}" ] && echo 1 || echo 0`);
    return res?.success && lastLine(res.content) === '1';
  };

  const getCnInfo = async () => {
    const [countRes, dateRes] = await Promise.all([
      run(`wc -l < "${CN_FILE}" 2>/dev/null || echo 0`),
      run(`stat -c %y "${CN_FILE}" 2>/dev/null | cut -d" " -f1`),
    ]);
    const lines = parseInt(lastLine(countRes?.content), 10) || 0;
    const date = cleanText(dateRes?.content).split('\n')[0].trim() || '-';
    return { lines, date };
  };

  const getFileSize = async (path) => {
    const res = await run(`[ -f "${path}" ] && stat -c%s "${path}" || echo 0`);
    if (!res?.success) return 0;
    const n = parseInt(lastLine(res.content), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const fmtBytes = (n) => {
    if (!Number.isFinite(n) || n <= 0) return '0 B';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  };

  // 从 URL 提取镜像名（主机名）
  const mirrorName = (url) => {
    const m = String(url).match(/^https?:\/\/([^/]+)/i);
    return m ? m[1] : String(url).slice(0, 40);
  };

  // 每次尝试使用独立临时文件；curl 退出码、HTTP 状态和文件大小均通过才替换目标。
  const downloadOneMirror = async ({ url, output, logFile, doneMark, label, mirrorTag, percentStart, percentEnd, timeoutSec }) => {
    if (!okDownloadUrl(url)) return { ok: false, done: true, size: 0, lastLog: '下载 URL 无效' };
    const seconds = Math.max(1, Math.min(1800, Math.ceil(Number(timeoutSec) || 120)));
    const token = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const part = `${output}.${token}.part`;
    const httpFile = `${part}.http`;
    const resultFile = `${part}.result`;
    const pidFile = `${part}.pid`;
    const q = shellQuote;
    let done = false;
    let ok2xx = false;
    let exitCode = null;
    let lastLog = '';
    try {
      const script = `(
  ${CURL_ENV} ${q(CURL_BIN)} -fLsS --connect-timeout 15 --max-time ${seconds} --proto '=http,https' --proto-redir '=http,https' --url ${q(url)} -o ${q(part)} --write-out '%{http_code}' > ${q(httpFile)} 2> ${q(logFile)} &
  curl_pid=$!
  printf '%s\\n' "$curl_pid" > ${q(pidFile)}
  wait "$curl_pid"
  curl_rc=$?
  http_code=$(cat ${q(httpFile)} 2>/dev/null)
  printf '%s:%s:%s\\n' ${q(doneMark)} "$curl_rc" "$http_code" > ${q(resultFile + '.tmp')}
  mv ${q(resultFile + '.tmp')} ${q(resultFile)}
) </dev/null >/dev/null 2>&1 &`;
      const startRes = await run(script, 10000);
      if (!startRes?.success) return { ok: false, done: false, size: 0, lastLog: cleanText(startRes?.content) };
      const maxRounds = Math.ceil(seconds / 2) + 3;
      for (let i = 0; i < maxRounds; i++) {
        await wait(2000);
        const [logRes, resultRes, size] = await Promise.all([
          run(`cat ${q(logFile)} 2>/dev/null`),
          run(`cat ${q(resultFile)} 2>/dev/null`),
          getFileSize(part),
        ]);
        lastLog = cleanText(logRes?.content) || lastLog;
        const pct = Math.round(percentStart + (percentEnd - percentStart) * Math.min(0.98, (i + 1) / maxRounds));
        updateProgress(`${label}下载中（${mirrorTag}）... 已下载 ${fmtBytes(size)}`, pct, lastLog || `${label}下载任务已启动`);
        const fields = lastLine(resultRes?.content).split(':');
        if (fields[0] === doneMark && /^\d+$/.test(fields[1]) && /^\d{3}$/.test(fields[2])) {
          done = true;
          exitCode = Number(fields[1]);
          ok2xx = /^2\d\d$/.test(fields[2]);
          if (exitCode !== 0 || !ok2xx) lastLog += `\ncurl 退出码 ${exitCode}，HTTP ${fields[2]}`;
          break;
        }
      }
      const size = await getFileSize(part);
      let ok = done && exitCode === 0 && ok2xx && size > 0;
      if (ok) {
        const moved = await run(`mv ${q(part)} ${q(output)}`, 15000);
        ok = !!moved?.success;
        if (!ok) lastLog += '\n保存下载文件失败';
      }
      if (done && size === 0) lastLog += '\n下载文件为空';
      return { ok, done, ok2xx, exitCode, size, lastLog };
    } finally {
      // 只终止本次尝试的 curl；独立 part 文件也避免不同镜像互相覆盖。
      await run(`if [ ! -f ${q(resultFile)} ] && [ -f ${q(pidFile)} ]; then
  p=$(cat ${q(pidFile)})
  case "$p" in ''|*[!0-9]*) ;; *)
    if tr '\\000' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -qF ${q(part)}; then
      kill "$p" 2>/dev/null
      for n in 1 2; do
        [ -f ${q(resultFile)} ] && break
        sleep 1
      done
    fi
  ;; esac
fi
rm -f ${[part, httpFile, pidFile, resultFile, resultFile + '.tmp'].map(q).join(' ')}`, 15000);
    }
  };

  // 多镜像轮询下载：urls 为数组，逐个尝试，任一镜像真完成即成功；全部失败时汇总各镜像原因
  const downloadWithPoll = async ({ urls, output, logBase, doneMark, label, percentStart, percentEnd, timeoutSec = 120 }) => {
    const urlList = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
    if (urlList.length === 0) return { ok: false, message: `${label}下载地址为空` };
    const span = (percentEnd - percentStart) / urlList.length;
    const fails = [];

    for (let idx = 0; idx < urlList.length; idx++) {
      const url = urlList[idx];
      const mirrorTag = urlList.length > 1 ? `镜像 ${idx + 1}/${urlList.length}：${mirrorName(url)}` : mirrorName(url);
      const logFile = `${logBase}_${idx + 1}.dlog`;
      const ps = Math.round(percentStart + idx * span);
      const pe = Math.round(percentStart + (idx + 1) * span);
      updateProgress(`${label}下载中（${mirrorTag}）...`, ps);
      const r = await downloadOneMirror({ url, output, logFile, doneMark, label, mirrorTag, percentStart: ps, percentEnd: pe, timeoutSec });
      await run(`rm -f "${logFile}"`);
      if (r.ok) {
        return { ok: true, size: r.size, mirror: mirrorTag, detail: r.lastLog };
      }
      const reason = !r.done ? `超时（>${timeoutSec}s）` : '下载未完整成功';
      const logTail = lastLine(r.lastLog);
      fails.push(logTail ? `${mirrorName(url)}：${reason}，${logTail}` : `${mirrorName(url)}：${reason}`);
    }
    return { ok: false, message: `${label}下载失败：${fails.join('；')}`, detail: fails.join('\n') };
  };

  const getPanelRoot = () => document.querySelector(`#${MODAL_NAME}`);

  // 标签页切换（纯前端，隐藏/显示页面 div）
  const switchTab = (name) => {
    const root = getPanelRoot();
    if (!root) return;
    root.querySelectorAll('.md-tab').forEach((t) => {
      t.dataset.active = t.dataset.tab === name ? '1' : '0';
    });
    root.querySelectorAll('.md-tabpage').forEach((p) => {
      p.hidden = p.dataset.page !== name;
    });
  };

  const updateProgress = (text, percent = 0, detail = '') => {
    const root = getPanelRoot();
    if (!root) return;
    const panel = root.querySelector('#md_progress_shell');
    const textEl = root.querySelector('#md_progress_text');
    const bar = root.querySelector('#md_progress_bar');
    const log = root.querySelector('#md_progress_log');
    if (panel) panel.hidden = false;
    if (textEl) textEl.textContent = text || '处理中...';
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
    if (log && detail) log.textContent = detail;
  };

  const setBusy = (busy) => {
    state.busy = busy;
    const root = getPanelRoot();
    if (!root) return;
    root.querySelectorAll('button').forEach((btn) => {
      if (btn.dataset.lockIgnore === '1') return;
      btn.disabled = busy;
    });
  };

  const setLogText = (text) => {
    const root = getPanelRoot();
    const log = root?.querySelector('#md_progress_log');
    if (log) log.textContent = text || '等待操作...';
  };

  const ensureRootOrToast = async () => {
    if (!(await checkRoot())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return false;
    }
    try {
      if (await isInstalled()) await ensureServiceShCurrent();
      return true;
    } catch (err) {
      createToast(`升级 Mosdns 服务脚本失败：${String(err.message || err)}`, 'red', 7000);
      return false;
    }
  };

  const writeTextFile = async (path, content, executable = false) => {
    const b64 = btoa(unescape(encodeURIComponent(content)));
    const tmp = `${path}.write.tmp`;
    return await run(`printf '%s' ${shellQuote(b64)} | base64 -d > ${shellQuote(tmp)} && ${executable ? `chmod 755 ${shellQuote(tmp)} && ` : ''}mv ${shellQuote(tmp)} ${shellQuote(path)}`, 15000);
  };

  // 保留旧版数据格式供界面回填；新版 service.sh 不会将这些内容作为 Shell 执行。
  const writeUpstreamsConf = async (chinaLines, foreignLines, bootstrapLines) => {
    if (!chinaLines.length || !foreignLines.length || !bootstrapLines.length || ![...chinaLines, ...foreignLines].every(okUpstreamLine) || !bootstrapLines.every(isIPv4)) return false;
    chinaLines = chinaLines.map(normalizeUpstream);
    foreignLines = foreignLines.map(normalizeUpstream);
    const content = `CHINA_DNS="${chinaLines.join('\n')}"\nFOREIGN_DNS="${foreignLines.join('\n')}"\nBOOTSTRAP_DNS="${bootstrapLines.join('\n')}"\n`;
    const res = await writeTextFile(UPSTREAMS_CONF, content);
    return !!res?.success;
  };

  const writeServiceScript = async (withUpdate = false) => {
    return await writeTextFile(SERVICE_SH, buildServiceContent(withUpdate), true);
  };

  const enableBoot = async () => {
    await run(`grep -qF "${BOOT_MARK}" "${BOOT_SH_FILE}" 2>/dev/null || echo "${BOOT_COMMAND}" >> "${BOOT_SH_FILE}"`);
  };

  const disableBoot = async () => {
    await run(`[ -f "${BOOT_SH_FILE}" ] && sed -i "/${BOOT_MARK}/d" "${BOOT_SH_FILE}"`);
  };

  const refreshStatus = async () => {
    const root = getPanelRoot();
    if (!root) return;

    const [installed, pid, bootEnabled, autoUpdate, cnInfo, hijackOff, cacheEnabled] = await Promise.all([
      isInstalled(),
      getRunningPid(),
      isBootEnabled(),
      isAutoUpdateEnabled(),
      getCnInfo(),
      isHijackOff(),
      isCacheEnabled(),
    ]);
    const running = !!pid;

    const installedEl = root.querySelector('#md_installed');
    const runningEl = root.querySelector('#md_running');
    const runningSwitch = root.querySelector('#md_running_switch');
    const bootEl = root.querySelector('#md_boot');
    const bootSwitch = root.querySelector('#md_boot_switch');
    const installBtn = root.querySelector('#md_install_btn');
    const uninstallBtn = root.querySelector('#md_uninstall_btn');
    const startBtn = root.querySelector('#md_start_btn');
    const stopBtn = root.querySelector('#md_stop_btn');
    const restartBtn = root.querySelector('#md_restart_btn');
    const listInfoEl = root.querySelector('#md_list_info');
    const autoSwitch = root.querySelector('#md_autoupdate_switch');
    const updateListBtn = root.querySelector('#md_update_list_btn');
    const upSaveBtn = root.querySelector('#md_up_save_btn');
    const upChina = root.querySelector('#md_up_china');
    const upForeign = root.querySelector('#md_up_foreign');
    const upBootstrap = root.querySelector('#md_up_bootstrap');
    const logRefreshBtn = root.querySelector('#md_log_refresh_btn');
    const logClearBtn = root.querySelector('#md_log_clear_btn');
    const logVerboseBtn = root.querySelector('#md_log_verbose');
    const hijackSwitch = root.querySelector('#md_hijack_switch');
    const cacheSwitch = root.querySelector('#md_cache_enabled');
    const cacheSize = root.querySelector('#md_cache_size');
    const cacheLazy = root.querySelector('#md_cache_lazy');
    const cachePersist = root.querySelector('#md_cache_persist');
    const cacheSaveBtn = root.querySelector('#md_cache_save_btn');
    const clAddBtn = root.querySelector('#md_cl_add_btn');
    const confEditor = root.querySelector('#md_conf_editor');
    const confSaveBtn = root.querySelector('#md_conf_save_btn');
    const confRestoreBtn = root.querySelector('#md_conf_restore_btn');

    if (installedEl) {
      installedEl.textContent = installed ? '已安装' : '未安装';
      installedEl.dataset.kind = installed ? 'on' : 'off';
    }
    if (runningEl) {
      if (!installed) {
        runningEl.textContent = '未安装';
        runningEl.dataset.kind = 'off';
      } else if (running) {
        runningEl.textContent = `运行中 (PID: ${pid})`;
        runningEl.dataset.kind = 'on';
      } else {
        runningEl.textContent = '已停止';
        runningEl.dataset.kind = 'warn';
      }
    }
    if (runningSwitch) {
      runningSwitch.dataset.on = running ? '1' : '0';
      runningSwitch.setAttribute('aria-checked', running ? 'true' : 'false');
      runningSwitch.disabled = state.busy || !installed;
      runningSwitch.title = installed ? (running ? '点击停止服务' : '点击启动服务') : '请先安装 Mosdns';
    }
    if (bootEl) {
      bootEl.textContent = bootEnabled ? '已启用' : '未启用';
      bootEl.dataset.kind = bootEnabled ? 'on' : 'off';
    }
    if (bootSwitch) {
      bootSwitch.dataset.on = bootEnabled ? '1' : '0';
      bootSwitch.setAttribute('aria-checked', bootEnabled ? 'true' : 'false');
      bootSwitch.disabled = state.busy || !installed;
      bootSwitch.title = installed ? (bootEnabled ? '点击关闭开机启动' : '点击开启开机启动') : '请先安装 Mosdns';
    }
    if (installBtn) installBtn.disabled = state.busy || installed;
    if (uninstallBtn) uninstallBtn.disabled = state.busy || !installed;
    if (startBtn) startBtn.disabled = state.busy || !installed || running;
    if (stopBtn) stopBtn.disabled = state.busy || !installed || !running;
    if (restartBtn) restartBtn.disabled = state.busy || !installed;
    if (listInfoEl) {
      listInfoEl.textContent = installed
        ? `名单：${cnInfo.lines} 行 · 更新于 ${cnInfo.date || '-'}`
        : '名单：未安装';
    }
    if (autoSwitch) {
      autoSwitch.dataset.on = autoUpdate ? '1' : '0';
      autoSwitch.setAttribute('aria-checked', autoUpdate ? 'true' : 'false');
      autoSwitch.disabled = state.busy || !installed;
      autoSwitch.title = installed ? (autoUpdate ? '点击关闭名单自动更新' : '点击开启名单自动更新') : '请先安装 Mosdns';
    }
    if (updateListBtn) updateListBtn.disabled = state.busy || !installed;
    if (upSaveBtn) upSaveBtn.disabled = state.busy || !installed;
    if (upChina) upChina.disabled = !installed;
    if (upForeign) upForeign.disabled = !installed;
    if (upBootstrap) upBootstrap.disabled = !installed;
    if (logRefreshBtn) logRefreshBtn.disabled = !installed;
    if (logClearBtn) logClearBtn.disabled = state.busy || !installed;
    if (logVerboseBtn) logVerboseBtn.disabled = state.busy || !installed;
    if (confEditor) confEditor.disabled = !installed;
    if (confSaveBtn) confSaveBtn.disabled = state.busy || !installed;
    if (confRestoreBtn) confRestoreBtn.disabled = state.busy || !installed;
    if (hijackSwitch) {
      const hijack = !hijackOff;
      hijackSwitch.dataset.on = hijack ? '1' : '0';
      hijackSwitch.setAttribute('aria-checked', hijack ? 'true' : 'false');
      hijackSwitch.disabled = state.busy || !installed;
      hijackSwitch.title = !installed
        ? '请先安装 Mosdns'
        : hijack
          ? '当前接管 53 端口（单机模式），点击切换为后端模式'
          : '当前后端模式（配合 AGH 前端），点击接管 53 端口';
    }
    if (cacheSwitch) {
      cacheSwitch.dataset.on = cacheEnabled ? '1' : '0';
      cacheSwitch.setAttribute('aria-checked', cacheEnabled ? 'true' : 'false');
      cacheSwitch.disabled = state.busy || !installed;
      cacheSwitch.title = cacheEnabled ? '点击关闭缓存并重启，保留参数' : '点击开启缓存并重启';
    }
    if (cacheSize) cacheSize.disabled = state.busy || !installed || !cacheEnabled;
    if (cacheLazy) cacheLazy.disabled = state.busy || !installed || !cacheEnabled;
    if (cachePersist) cachePersist.disabled = state.busy || !installed || !cacheEnabled;
    if (cacheSaveBtn) cacheSaveBtn.disabled = state.busy || !installed || !cacheEnabled;
    if (clAddBtn) clAddBtn.disabled = state.busy || !installed;
    await renderCustomLists();
  };

  const installPlugin = async () => {
    if (!(await ensureRootOrToast())) return;
    if (await isInstalled()) {
      createToast('Mosdns 已安装，如需重装请先卸载', 'red');
      return;
    }

    setBusy(true);
    try {
      setLogText('准备安装 Mosdns...');

      updateProgress('正在创建安装目录...', 5);
      await run(`mkdir -p "${MD_DIR}"`);

      updateProgress('正在下载 mosdns 压缩包（约 6.6MB，多镜像轮询）...', 10);
      const zipDl = await downloadWithPoll({
        urls: BIN_URLS,
        output: ZIP_FILE,
        logBase: BIN_DL_BASE,
        doneMark: 'MD_BIN_DONE',
        label: 'mosdns 压缩包',
        percentStart: 10,
        percentEnd: 35,
      });
      if (!zipDl.ok) {
        updateProgress('压缩包下载失败', 10, zipDl.detail || zipDl.message);
        createToast(zipDl.message, 'red', 8000);
        return;
      }
      if ((zipDl.size || 0) < 1000000) {
        updateProgress('压缩包校验失败', 35, `文件大小异常：${zipDl.size} B`);
        createToast('mosdns 压缩包校验失败，请检查网络后重试', 'red', 5000);
        return;
      }

      updateProgress('正在解压 mosdns 二进制...', 40);
      const unzipRes = await run(`unzip -o "${ZIP_FILE}" "mosdns" -d "${MD_DIR}"`, 60000);
      await run(`chmod 755 "${BIN_FILE}" && rm -f "${ZIP_FILE}"`);
      if (!unzipRes?.success || (await getFileSize(BIN_FILE)) < 5000000) {
        updateProgress('解压失败', 40, cleanText(unzipRes?.content));
        createToast('解压 mosdns 二进制失败', 'red');
        return;
      }

      updateProgress('正在下载国内域名名单（约 11 万行）...', 50);
      const listDl = await downloadWithPoll({
        urls: CN_LIST_URLS,
        output: CN_RAW_FILE,
        logBase: LIST_DL_BASE,
        doneMark: 'MD_LIST_DONE',
        label: '国内域名名单',
        percentStart: 50,
        percentEnd: 70,
      });
      if (!listDl.ok) {
        updateProgress('国内域名名单下载失败', 50, listDl.detail || listDl.message);
        createToast(listDl.message, 'red', 8000);
        return;
      }

      updateProgress('正在转换域名名单...', 75);
      const convRes = await run(`awk -F/ "/^server=\\// {print \\\$2}" "${CN_RAW_FILE}" > "${CN_TMP_FILE}" && rm -f "${CN_RAW_FILE}"`, 30000);
      const countRes = await run(`wc -l < "${CN_TMP_FILE}" 2>/dev/null || echo 0`);
      const listCount = parseInt(lastLine(countRes?.content), 10) || 0;
      if (!convRes?.success || listCount < 100000) {
        await run(`rm -f "${CN_TMP_FILE}"`);
        updateProgress('国内域名名单转换失败', 75, `有效行数：${listCount}`);
        createToast('转换国内域名名单失败，请检查网络后重新安装', 'red', 5000);
        return;
      }
      await run(`mv "${CN_TMP_FILE}" "${CN_FILE}"`);

      updateProgress('正在写入默认上游配置...', 82);
      if (!(await writeUpstreamsConf(DEFAULT_CHINA_LIST, DEFAULT_FOREIGN_LIST, DEFAULT_BOOTSTRAP_LIST))) {
        createToast('写入上游配置失败', 'red');
        return;
      }

      updateProgress('正在写入服务脚本...', 88);
      const shRes = await writeServiceScript(false);
      await run(`chmod 755 "${SERVICE_SH}"`);
      if (!shRes?.success) {
        createToast('写入服务脚本失败', 'red');
        return;
      }

      updateProgress('正在写入后端模式标记（默认不接管 53，配合 AGH 前端）...', 92);
      await run(`touch "${NO_HIJACK_FILE}"`);

      updateProgress('正在生成配置并启动 Mosdns...', 96, `域名名单：${listCount} 行`);
      const startRes = await run(`sh "${SERVICE_SH}" start`, 40000);
      const detail = cleanText(startRes?.content);
      updateProgress('安装完成', 100, detail);
      if (serviceSucceeded(startRes) && (await isRunning())) {
        createToast(
          `<div>Mosdns 安装完成并已启动（后端模式，未接管 53 端口）<br>监听 0.0.0.0:${LISTEN_PORT}，请将 AdGuardHome 上游设为 127.0.0.1:${LISTEN_PORT}<br>国内 → ${DEFAULT_CHINA_LIST.join(' / ')}，其余 → ${DEFAULT_FOREIGN_LIST[0]}</div>`,
          'green',
          10000,
        );
      } else {
        createToast('安装完成，但启动可能失败，请到「查询日志」页查看', 'red', 8000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
      await loadUpstreams();
      await loadConfig();
    }
  };

  const uninstallPlugin = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }

    state.uninstallClicks += 1;
    if (state.uninstallClicks < 3) {
      createToast(`再点 ${3 - state.uninstallClicks} 次执行卸载`, 'red');
      setTimeout(() => {
        state.uninstallClicks = 0;
      }, 3000);
      return;
    }

    setBusy(true);
    try {
      updateProgress('正在停止进程并清除 iptables 规则...', 30);
      const stopRes = await run(`[ -f "${SERVICE_SH}" ] && sh "${SERVICE_SH}" stop || killall mosdns 2>/dev/null`, 20000);

      updateProgress('正在移除开机自启...', 50, cleanText(stopRes?.content));
      await disableBoot();

      updateProgress('正在删除安装目录...', 75);
      await run(`rm -rf "${MD_DIR}"`);
      await run(`rm -f "${BIN_DL_BASE}"_*.dlog "${LIST_DL_BASE}"_*.dlog "${LIST_UPDATE_BASE}"_*.dlog "${CUSTOM_DL_BASE}"_*.dlog`);

      updateProgress('卸载完成', 100, '已删除 /data/mosdns（含日志、缓存、名单、更新标记）及下载临时文件');
      createToast(
        '<div>Mosdns 卸载完成<br>进程已停止 · iptables 规则已清除 · 自启已移除 · 文件已清除</div>',
        'green',
        8000,
      );
    } finally {
      state.uninstallClicks = 0;
      setBusy(false);
      await refreshStatus();
    }
  };

  const startService = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }

    setBusy(true);
    try {
      updateProgress('正在启动 Mosdns...', 60);
      const res = await run(`sh "${SERVICE_SH}" start`, 40000);
      const detail = cleanText(res?.content);
      updateProgress('启动命令已执行', 100, detail);
      if (serviceSucceeded(res) && (await isRunning())) {
        createToast('已启动 Mosdns', 'green', 5000);
      } else {
        createToast(`启动可能失败：${detail || '无输出'}`, 'red', 5000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const stopService = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }

    setBusy(true);
    try {
      updateProgress('正在停止 Mosdns（含 iptables 规则）...', 60);
      const res = await run(`sh "${SERVICE_SH}" stop`, 20000);
      updateProgress('服务已停止', 100, cleanText(res?.content));
      createToast('已停止 Mosdns', 'green', 5000);
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const restartService = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }

    setBusy(true);
    try {
      updateProgress('正在重启 Mosdns...', 45);
      const res = await run(`sh "${SERVICE_SH}" restart`, 50000);
      const detail = cleanText(res?.content);
      updateProgress('重启完成', 100, detail);
      if (serviceSucceeded(res) && (await isRunning())) {
        createToast('重启完成', 'green', 5000);
      } else {
        createToast(`重启可能失败：${detail || '无输出'}`, 'red', 5000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const toggleRunningEnabled = async () => {
    if (await isRunning()) {
      await stopService();
    } else {
      await startService();
    }
  };

  const toggleBootEnabled = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }

    setBusy(true);
    try {
      const enabled = await isBootEnabled();
      if (enabled) {
        await disableBoot();
        createToast('已取消开机自启', 'green');
      } else {
        await enableBoot();
        createToast('已设置开机自启', 'green');
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const toggleAutoUpdate = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }

    setBusy(true);
    try {
      const enabled = await isAutoUpdateEnabled();
      if (enabled) {
        updateProgress('正在关闭名单自动更新...', 60);
        const res = await writeServiceScript(false);
        await run(`chmod 755 "${SERVICE_SH}"`);
        await run(`rm -f "${AUTO_UPDATE_FILE}"`);
        if (!res?.success) {
          createToast('更新服务脚本失败', 'red');
          return;
        }
        createToast('已关闭名单自动更新', 'green');
      } else {
        updateProgress('正在开启名单自动更新...', 60);
        const res = await writeServiceScript(true);
        await run(`chmod 755 "${SERVICE_SH}"`);
        if (!res?.success) {
          createToast('更新服务脚本失败', 'red');
          return;
        }
        await run(`touch "${AUTO_UPDATE_FILE}"`);
        createToast('已开启名单自动更新：开机启动时若名单超过 7 天未更新将后台静默更新', 'green', 5000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const updateCnList = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }

    setBusy(true);
    try {
      updateProgress('正在下载最新域名名单...', 20);
      const dl = await downloadWithPoll({
        urls: CN_LIST_URLS,
        output: CN_RAW_FILE,
        logBase: LIST_UPDATE_BASE,
        doneMark: 'MD_LIST_UPDATE_DONE',
        label: '域名名单',
        percentStart: 20,
        percentEnd: 60,
      });
      if (!dl.ok) {
        updateProgress('名单下载失败', 20, dl.detail || dl.message);
        createToast(dl.message, 'red', 8000);
        return;
      }

      updateProgress('正在转换并校验名单...', 70);
      const convRes = await run(`awk -F/ "/^server=\\// {print \\\$2}" "${CN_RAW_FILE}" > "${CN_TMP_FILE}" && rm -f "${CN_RAW_FILE}"`, 30000);
      const countRes = await run(`wc -l < "${CN_TMP_FILE}" 2>/dev/null || echo 0`);
      const n = parseInt(lastLine(countRes?.content), 10) || 0;
      if (!convRes?.success || n < 100000) {
        await run(`rm -f "${CN_TMP_FILE}"`);
        updateProgress('名单校验失败，已保留旧名单', 70, `有效行数：${n}`);
        createToast(`名单校验失败（${n} 行），已保留旧名单`, 'red', 5000);
        return;
      }

      updateProgress('正在替换名单并重启 Mosdns...', 85);
      await run(`mv "${CN_TMP_FILE}" "${CN_FILE}"`);
      const res = await run(`sh "${SERVICE_SH}" restart`, 50000);
      const detail = cleanText(res?.content);
      updateProgress('名单更新完成', 100, detail);
      if (serviceSucceeded(res) && (await isRunning())) {
        createToast(`名单已更新（${n} 行）并重启生效`, 'green', 5000);
      } else {
        createToast(`名单已更新（${n} 行），但 Mosdns 未在运行，请手动启动`, 'red', 8000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  // ---------- 查询日志页（可视化表格） ----------
  // mosdns 日志行通常是：时间\t级别\t插件\t消息\t{可选JSON}；兼容空格/紧凑格式，方便识别设备日志复制出来的内容。
  const parseLogLine = (line) => {
    const rawLine = String(line);
    const parts = rawLine.split('\t');
    let ts = '';
    let level = '';
    let tag = '';
    let message = '';
    let jsonPart = '';
    if (parts.length >= 4) {
      ts = parts[0] || '';
      level = (parts[1] || '').trim().toUpperCase();
      tag = parts[2] || '';
      message = parts[3] || '';
      jsonPart = parts.slice(4).join('\t').trim();
    } else {
      // 兼容 "时间 WARN tcp_server 消息" 及 "12:38:52WARNtcp_server消息"。
      let match = rawLine.match(/^(\S+?)\s+(DEBUG|INFO|WARN|ERROR|DPANIC|PANIC|FATAL)\s+([A-Za-z0-9_.-]+)\s+([\s\S]*)$/i);
      if (!match) match = rawLine.match(/^((?:\d{4}-\d{2}-\d{2}[T ])?\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\s*(DEBUG|INFO|WARN|ERROR|DPANIC|PANIC|FATAL)\s*(tcp_server)\s*([\s\S]*)$/i);
      if (!match) return null;
      [, ts, level, tag, message] = match;
      level = level.toUpperCase();
      const jsonMatch = message.match(/(?:^|\s)(\{[\s\S]*\})\s*$/);
      if (jsonMatch) {
        jsonPart = jsonMatch[1];
        message = message.slice(0, jsonMatch.index).trim();
      }
    }
    const rawMessage = message;
    const tm = ts.match(/T(\d{2}:\d{2}:\d{2})/);
    const time = tm ? tm[1] : ts.trim();
    let errorText = '';
    if (jsonPart.startsWith('{')) {
      try {
        const obj = JSON.parse(jsonPart);
        errorText = typeof obj.error === 'string' ? obj.error : '';
        if (obj.qname && obj.error) {
          message = `${obj.qname} → ${obj.error}`;
        } else {
          const bits = [];
          for (const k of ['qname', 'qtype', 'upstream', 'error', 'elapsed']) {
            if (obj[k] !== undefined && obj[k] !== '') bits.push(String(obj[k]));
          }
          if (bits.length > 0) message = `${message}：${bits.join(' | ')}`;
        }
      } catch {
        // JSON 解析失败则保留原文
      }
    }
    const inlineError = rawMessage.trim().match(/^(entry err|failed to write response)\s*[:：]\s*(.*)$/);
    const event = inlineError ? inlineError[1] : rawMessage.trim();
    const error = (errorText || (inlineError ? inlineError[2] : '')).trim();
    // 仅折叠 TCP 客户端提前断开的两类 WARN；真实 WARN 等级仍保留在解析结果中。
    const connectionClosed = level === 'WARN' && tag.trim() === 'tcp_server' && (
      (event === 'entry err' && error === 'connection ctx canceled') ||
      (event === 'failed to write response' && (error === 'use of closed network connection' || error.endsWith(': use of closed network connection')))
    );
    return { time, level, tag, message, connectionClosed };
  };

  const buildLogRow = (parsed, rawLine) => {
    const row = document.createElement('div');
    row.className = 'md-logrow';
    const timeEl = document.createElement('span');
    timeEl.className = 'md-logtime';
    const lvEl = document.createElement('span');
    lvEl.className = 'md-lv';
    const tagEl = document.createElement('span');
    tagEl.className = 'md-logtag';
    const msgEl = document.createElement('span');
    msgEl.className = 'md-logmsg';
    if (parsed) {
      timeEl.textContent = parsed.time || '-';
      const kind = ['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(parsed.level) ? parsed.level.toLowerCase() : 'raw';
      lvEl.dataset.kind = kind;
      lvEl.textContent = parsed.level || '?';
      tagEl.textContent = parsed.tag || '-';
      msgEl.textContent = parsed.message || '';
    } else {
      timeEl.textContent = '-';
      lvEl.dataset.kind = 'raw';
      lvEl.textContent = '未解析';
      tagEl.textContent = '-';
      msgEl.textContent = rawLine;
    }
    row.appendChild(timeEl);
    row.appendChild(lvEl);
    row.appendChild(tagEl);
    row.appendChild(msgEl);
    return row;
  };

  const renderLogs = async () => {
    const root = getPanelRoot();
    const box = root?.querySelector('#md_log_table');
    if (!box) return;
    box.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'md-info-line';
    if (!(await isInstalled())) {
      empty.textContent = '(未安装)';
      box.appendChild(empty);
      return;
    }
    const res = await run(`[ -f "${LOG_FILE}" ] && tail -200 "${LOG_FILE}" || echo ""`, 15000);
    const rawLines = String(res?.content || '').split('\n').filter((l) => l.trim());
    const kw = String(root.querySelector('#md_log_search')?.value || '').trim().toLowerCase();
    const lv = root.querySelector('#md_log_level')?.value || 'all';

    let shown = 0;
    let folded = 0;
    for (let i = rawLines.length - 1; i >= 0; i--) {
      const parsed = parseLogLine(rawLines[i]);
      const searchText = parsed ? `${parsed.tag} ${parsed.message}` : rawLines[i];
      if (lv !== 'all' && (!parsed || parsed.level !== lv)) continue;
      if (kw && !searchText.toLowerCase().includes(kw)) continue;
      if (!state.showClosedLogs && parsed?.connectionClosed) {
        folded++;
        continue;
      }
      box.appendChild(buildLogRow(parsed, rawLines[i]));
      shown++;
    }
    const closedBtn = root.querySelector('#md_log_closed');
    if (closedBtn) {
      closedBtn.textContent = state.showClosedLogs ? '折叠连接关闭日志' : '显示连接关闭日志';
      closedBtn.setAttribute('aria-pressed', state.showClosedLogs ? 'true' : 'false');
    }
    if (folded > 0) {
      const notice = document.createElement('div');
      notice.className = 'md-info-line';
      notice.textContent = `已折叠 ${folded} 条 TCP 连接结束日志，点击「显示连接关闭日志」可查看。原始 WARN 日志已保留。`;
      box.appendChild(notice);
    }
    if (shown === 0 && folded === 0) {
      empty.textContent = rawLines.length === 0 ? '(暂无日志)' : '(无匹配日志)';
      box.appendChild(empty);
    }
  };

  // 自动刷新：开启后每 5 秒重新拉取（busy 期间跳过）
  const setLogAutoRefresh = (on) => {
    clearInterval(state.logTimer);
    state.logTimer = null;
    if (on) {
      state.logTimer = setInterval(() => {
        if (state.busy) return;
        renderLogs();
      }, 5000);
    }
  };

  const clearQueryLog = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }
    await run(`: > "${LOG_FILE}"`);
    await renderLogs();
    createToast('查询日志已清空', 'green');
  };

  // 详细模式：按 config.yaml 当前 log level 回填开关
  const loadLogVerbose = async () => {
    const root = getPanelRoot();
    const sw = root?.querySelector('#md_log_verbose');
    if (!sw) return;
    if (!(await isInstalled())) {
      sw.dataset.on = '0';
      sw.setAttribute('aria-checked', 'false');
      return;
    }
    const res = await run(`grep -E "^  level: " "${CONFIG_FILE}" 2>/dev/null | head -n 1`, 15000);
    const on = cleanText(res?.content).includes('debug');
    sw.dataset.on = on ? '1' : '0';
    sw.setAttribute('aria-checked', on ? 'true' : 'false');
  };

  const toggleLogVerbose = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }
    const sw = getPanelRoot()?.querySelector('#md_log_verbose');
    const next = sw?.dataset.on !== '1';

    setBusy(true);
    try {
      updateProgress(next ? '正在开启详细模式（log level → debug）...' : '正在关闭详细模式（log level → info）...', 50);
      await run(`sed -i "s|^  level: .*|  level: ${next ? 'debug' : 'info'}|" "${CONFIG_FILE}"`, 15000);
      const res = await run(`sh "${SERVICE_SH}" restart`, 50000);
      const detail = cleanText(res?.content);
      await run('sleep 2');
      const pid = await getRunningPid();
      if (serviceSucceeded(res) && pid) {
        updateProgress(next ? '详细模式已开启' : '详细模式已关闭', 100, detail);
        createToast(next ? '已开启详细模式：日志量会显著变大，不用时请关闭' : '已关闭详细模式', 'green', 6000);
      } else {
        const logRes = await run(`[ -f "${LOG_FILE}" ] && tail -20 "${LOG_FILE}" || echo "(暂无日志)"`, 15000);
        updateProgress('重启或 DNS 规则应用失败', 100, cleanText(logRes?.content));
        createToast('重启或 DNS 规则应用失败，请检查日志', 'red', 8000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
      await loadLogVerbose();
      await renderLogs();
    }
  };

  const loadUpstreams = async () => {
    const root = getPanelRoot();
    const chinaEl = root?.querySelector('#md_up_china');
    const foreignEl = root?.querySelector('#md_up_foreign');
    const bsEl = root?.querySelector('#md_up_bootstrap');
    if (!chinaEl || !foreignEl) return;
    if (!(await isInstalled())) {
      chinaEl.value = '';
      foreignEl.value = '';
      chinaEl.disabled = true;
      foreignEl.disabled = true;
      if (bsEl) {
        bsEl.value = '';
        bsEl.disabled = true;
      }
      return;
    }
    const res = await run(`cat "${UPSTREAMS_CONF}" 2>/dev/null`, 15000);
    const text = String(res?.content || '');
    const mc = text.match(/CHINA_DNS="([\s\S]*?)"/);
    const mf = text.match(/FOREIGN_DNS="([\s\S]*?)"/);
    const mb = text.match(/BOOTSTRAP_DNS="([\s\S]*?)"/);
    const fill = (m, def) =>
      (m && m[1] ? m[1] : def.join('\n'))
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n');
    chinaEl.disabled = false;
    foreignEl.disabled = false;
    if (bsEl) bsEl.disabled = false;
    chinaEl.value = fill(mc, DEFAULT_CHINA_LIST);
    foreignEl.value = fill(mf, DEFAULT_FOREIGN_LIST);
    if (bsEl) bsEl.value = fill(mb, DEFAULT_BOOTSTRAP_LIST);
  };

  const saveUpstreams = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }
    const root = getPanelRoot();
    const parseLines = (sel) =>
      String(root?.querySelector(sel)?.value || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    const chinaLines = parseLines('#md_up_china');
    const foreignLines = parseLines('#md_up_foreign');
    const bootstrapLines = parseLines('#md_up_bootstrap');

    if (chinaLines.length === 0) {
      createToast('国内上游至少需要一条', 'red');
      return;
    }
    if (foreignLines.length === 0) {
      createToast('国外上游至少需要一条（它是默认方向，删除会导致全网解析失败）', 'red', 5000);
      return;
    }
    for (const l of chinaLines) {
      if (!okUpstreamLine(l)) {
        createToast('国内上游格式错误：UDP/TCP 必须使用 IP，域名请填写 tls://域名 或 https://域名/dns-query', 'red', 7000);
        return;
      }
    }
    for (const l of foreignLines) {
      if (!okUpstreamLine(l)) {
        createToast('国外上游格式错误：UDP/TCP 必须使用 IP，域名请填写 tls://域名 或 https://域名/dns-query', 'red', 7000);
        return;
      }
    }
    const bsLines = bootstrapLines.length > 0 ? bootstrapLines : [...DEFAULT_BOOTSTRAP_LIST];
    for (const l of bsLines) {
      if (!isIPv4(l)) {
        createToast('Bootstrap DNS 必须是合法 IPv4 地址，每段为 0～255（它自身不能依赖域名解析）', 'red', 5000);
        return;
      }
    }

    setBusy(true);
    try {
      updateProgress('正在写入上游配置...', 45);
      if (!(await writeUpstreamsConf(chinaLines, foreignLines, bsLines))) {
        createToast('写入上游配置失败', 'red');
        return;
      }

      updateProgress('正在重生成配置并重启 Mosdns...', 70);
      const res = await run(`sh "${SERVICE_SH}" restart`, 50000);
      const detail = cleanText(res?.content);
      await run('sleep 2');
      const pid = await getRunningPid();
      if (serviceSucceeded(res) && pid) {
        updateProgress('上游已保存并重启', 100, detail);
        createToast('上游已保存并重启', 'green', 5000);
        await loadConfig();
      } else {
        const logRes = await run(`[ -f "${LOG_FILE}" ] && tail -20 "${LOG_FILE}" || echo "(暂无日志)"`, 15000);
        updateProgress('重启或 DNS 规则应用失败', 100, cleanText(logRes?.content));
        createToast('配置或 DNS 规则应用失败，请到「查询日志」页检查', 'red', 8000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const loadConfig = async () => {
    const root = getPanelRoot();
    const editor = root?.querySelector('#md_conf_editor');
    if (!editor) return;
    if (!(await isInstalled())) {
      editor.value = '';
      editor.disabled = true;
      editor.placeholder = '安装后可在线编辑 config.yaml';
      return;
    }
    const res = await run(`cat "${CONFIG_FILE}" 2>/dev/null`, 15000);
    editor.disabled = false;
    editor.value = String(res?.content || '');
  };

  const saveConfig = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }
    const editor = getPanelRoot()?.querySelector('#md_conf_editor');
    const content = migrateGeneratedConfig(editor?.value ?? '');
    if (!content.trim()) {
      createToast('配置内容为空，未保存', 'red');
      return;
    }

    setBusy(true);
    try {
      updateProgress('正在保存配置...', 40);
      const backup = `${CONFIG_FILE}.last-good`;
      const backupRes = await run(`cp "${CONFIG_FILE}" ${shellQuote(backup)}`, 15000);
      if (!backupRes?.success) {
        createToast('备份现有配置失败，未修改配置', 'red');
        return;
      }
      const wRes = await writeTextFile(CONFIG_FILE, content);
      if (!wRes?.success) {
        createToast('写入配置失败', 'red');
        return;
      }

      updateProgress('正在重启 Mosdns...', 70);
      const res = await run(`sh "${SERVICE_SH}" restart`, 50000);
      const detail = cleanText(res?.content);
      await run('sleep 2');
      const pid = await getRunningPid();
      if (serviceSucceeded(res) && pid) {
        updateProgress('配置已保存并重启', 100, detail);
        createToast('配置已保存并重启', 'green', 5000);
        if (editor) editor.value = content;
      } else {
        const logRes = await run(`[ -f "${LOG_FILE}" ] && tail -20 "${LOG_FILE}" || echo "(暂无日志)"`, 15000);
        const restoreRes = await run(`cp ${shellQuote(backup)} "${CONFIG_FILE}" && sh "${SERVICE_SH}" restart`, 50000);
        const restored = serviceSucceeded(restoreRes) && (await isRunning());
        updateProgress(restored ? '新配置启动失败，已恢复原配置' : '新配置和恢复启动均失败', 100, `${detail}\n${cleanText(logRes?.content)}\n${cleanText(restoreRes?.content)}`);
        createToast(restored ? '新配置未生效，已恢复原配置和服务，请修正后重试' : '恢复启动失败，请检查日志；失败的 DNS 重定向已清除', 'red', 8000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  // 恢复默认模板：删除 config.yaml，restart 时 service.sh 按当前 upstreams.conf 重新生成
  const restoreConfig = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }

    state.restoreClicks += 1;
    if (state.restoreClicks < 3) {
      createToast(`再点 ${3 - state.restoreClicks} 次恢复默认模板`, 'red');
      setTimeout(() => {
        state.restoreClicks = 0;
      }, 3000);
      return;
    }

    setBusy(true);
    try {
      updateProgress('正在按当前上游恢复默认模板配置...', 45);
      await run(`rm -f "${CONFIG_FILE}"`);
      const res = await run(`sh "${SERVICE_SH}" restart`, 50000);
      const detail = cleanText(res?.content);
      await run('sleep 2');
      const pid = await getRunningPid();
      await loadConfig();
      if (serviceSucceeded(res) && pid) {
        updateProgress('已恢复默认模板并重启', 100, detail);
        createToast('已按当前上游恢复默认模板配置并重启', 'green', 5000);
      } else {
        const logRes = await run(`[ -f "${LOG_FILE}" ] && tail -20 "${LOG_FILE}" || echo "(暂无日志)"`, 15000);
        updateProgress('重启或 DNS 规则应用失败', 100, cleanText(logRes?.content));
        createToast('恢复后进程未运行，请检查日志', 'red', 8000);
      }
    } finally {
      state.restoreClicks = 0;
      setBusy(false);
      await refreshStatus();
    }
  };

  // ---------- 运行模式（接管 53 端口开关） ----------
  // 标记文件存在 = 不接管（后端模式，配合 AGH 前端）；不存在 = 接管（单机模式）
  const isHijackOff = async () => {
    const res = await run(`[ -f "${NO_HIJACK_FILE}" ] && echo 1 || echo 0`);
    return res?.success && lastLine(res.content) === '1';
  };

  // 只迁移可确认由 v1.0 生成的主序列，保留缓存参数和其余手工配置。
  const migrateGeneratedConfig = (content) => {
    const text = content.replace(/\r\n/g, '\n');
    return text.replace(/(  - tag: main_sequence\n    type: sequence\n    args:\n)([\s\S]*?)(?=^  - tag: |(?![\s\S]))/m, (all, head, body) => {
      const old = body.trimEnd() + '\n';
      const match = old.match(/^      - exec: \$cache\n      - matches: "qname \$cn_domains"\n        exec: \$forward_china\n((?:      - matches: "qname \$cu_\d+"\n        exec: \$forward_(?:china|foreign)\n)*)      - exec: \$forward_foreign\n$/);
      if (!match) return all;
      const accept = '      - matches: has_resp\n        exec: accept\n';
      const custom = match[1].replace(/(        exec: \$forward_(?:china|foreign)\n)/g, '$1' + accept);
      return head + '      - exec: $cache\n' + accept + custom + '      - matches: "qname $cn_domains"\n        exec: $forward_china\n' + accept + '      - exec: $forward_foreign\n';
    });
  };

  // 首次操作时升级已安装的服务，避免只替换 JS 后设备仍执行旧 service.sh。
  let serviceUpgrade = null;
  const ensureServiceShCurrent = async () => {
    if (serviceUpgrade) return await serviceUpgrade;
    serviceUpgrade = (async () => {
      const res = await run(`grep -qxF ${shellQuote(SERVICE_MARK)} "${SERVICE_SH}" 2>/dev/null && echo 1 || echo 0`);
      if (res?.success && lastLine(res.content) === '1') return;
      const configRes = await run(`cat "${CONFIG_FILE}" 2>/dev/null`, 15000);
      if (configRes?.success && cleanText(configRes.content)) {
        const old = String(configRes.content);
        const next = migrateGeneratedConfig(old);
        if (next !== old) {
          const backup = `${CONFIG_FILE}.pre-${VERSION}.bak`;
          const saved = await run(`[ -f ${shellQuote(backup)} ] || cp -p "${CONFIG_FILE}" ${shellQuote(backup)}`, 15000);
          if (!saved?.success || !(await writeTextFile(CONFIG_FILE, next))?.success) throw new Error('迁移旧配置失败');
          await run(`touch -r ${shellQuote(backup)} "${CONFIG_FILE}"`, 15000);
        }
      }
      const saved = await run(`[ -f "${SERVICE_SH}.pre-${VERSION}.bak" ] || cp "${SERVICE_SH}" "${SERVICE_SH}.pre-${VERSION}.bak"`, 15000);
      if (!saved?.success || !(await writeServiceScript(await isAutoUpdateEnabled()))?.success) throw new Error('写入新服务脚本失败');
    })();
    try {
      return await serviceUpgrade;
    } finally {
      serviceUpgrade = null;
    }
  };

  const toggleHijack = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }

    setBusy(true);
    try {
      await ensureServiceShCurrent();
      const off = await isHijackOff();
      if (off) {
        updateProgress('正在切换为接管模式（53 → 6353）...', 50);
        await run(`rm -f "${NO_HIJACK_FILE}"`);
        const res = await run(`sh "${SERVICE_SH}" restart`, 50000);
        const detail = cleanText(res?.content);
        await run('sleep 2');
        if (serviceSucceeded(res) && (await getRunningPid())) {
          updateProgress('已接管 53 端口', 100, detail);
          createToast('已接管 53 端口并重启（单机模式）', 'green', 5000);
        } else {
          updateProgress('重启或 DNS 规则应用失败', 100, detail);
          createToast('重启或 DNS 规则应用失败，请检查日志', 'red', 8000);
        }
      } else {
        updateProgress('正在切换为后端模式（不接管 53）...', 50);
        await run(`touch "${NO_HIJACK_FILE}"`);
        const res = await run(`sh "${SERVICE_SH}" delrules`, 20000);
        updateProgress('已切换为后端模式', 100, cleanText(res?.content));
        createToast('已切换为后端模式：mosdns 仅监听 6353，53 端口规则已清除（进程未中断）', 'green', 6000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  // ---------- 缓存设置 ----------
  const mainSequencePattern = () => /(  - tag: main_sequence\n    type: sequence\n    args:\n)([\s\S]*?)(?=^  - tag: |(?![\s\S]))/m;
  const cacheEnabledInConfig = (content) => {
    const main = String(content || '').replace(/\r\n/g, '\n').match(mainSequencePattern());
    return !!main && /^      - exec: \$cache[ \t]*$/m.test(main[2]);
  };

  const configWithCacheEnabled = (content, enabled) => {
    const text = String(content).replace(/\r\n/g, '\n');
    if (!mainSequencePattern().test(text)) throw new Error('未找到默认格式的 main_sequence，请检查高级配置');
    if (enabled && !/^  - tag: cache[ \t]*$/m.test(text)) throw new Error('未找到 cache 插件，请先恢复默认模板');
    return text.replace(mainSequencePattern(), (_, head, body) => {
      const rule = /^      (?:- exec: \$cache|# md-cache-disabled: \$cache)[ \t]*\n(?:      - matches: has_resp\n        exec: accept\n)?/gm;
      const replacement = enabled ? '      - exec: $cache\n      - matches: has_resp\n        exec: accept\n' : '      # md-cache-disabled: $cache\n';
      let found = false;
      const next = body.replace(rule, () => {
        if (found) return '';
        found = true;
        return replacement;
      });
      return head + (found ? next : replacement + next);
    });
  };

  const isCacheEnabled = async () => {
    const res = await run(`cat "${CONFIG_FILE}" 2>/dev/null`, 15000);
    return !!res?.success && cacheEnabledInConfig(res.content);
  };

  const toggleCacheEnabled = async () => {
    if (state.busy) return;
    setBusy(true);
    let old = '';
    let configWritten = false;
    try {
      if (!(await ensureRootOrToast())) return;
      if (!(await isInstalled())) {
        createToast('请先安装 Mosdns', 'red');
        return;
      }
      const current = await run(`cat "${CONFIG_FILE}"`, 15000);
      if (!current?.success) throw new Error('读取配置失败');
      old = String(current.content);
      const enabled = !cacheEnabledInConfig(old);
      const next = configWithCacheEnabled(old, enabled);
      if (!(await writeTextFile(`${CONFIG_FILE}.cache-switch.bak`, old))?.success) throw new Error('备份配置失败');
      updateProgress(enabled ? '正在开启 DNS 缓存...' : '正在关闭 DNS 缓存...', 45);
      if (!(await writeTextFile(CONFIG_FILE, next))?.success) throw new Error('写入配置失败');
      configWritten = true;
      const res = await run(`sh "${SERVICE_SH}" restart`, 50000);
      if (!serviceSucceeded(res) || !(await isRunning())) throw new Error(cleanText(res?.content) || '重启服务失败');
      updateProgress(enabled ? 'DNS 缓存已开启' : 'DNS 缓存已关闭', 100, cleanText(res.content));
      createToast(enabled ? '已开启 DNS 缓存并重启' : '已关闭 DNS 缓存并重启，缓存参数已保留', 'green', 5000);
    } catch (err) {
      let detail = String(err.message || err);
      if (configWritten) {
        let recovered = false;
        try {
          const restored = await writeTextFile(CONFIG_FILE, old);
          if (!restored?.success) throw new Error('恢复原配置失败');
          const retry = await run(`sh "${SERVICE_SH}" restart`, 50000);
          recovered = serviceSucceeded(retry) && (await isRunning());
          detail += `\n${cleanText(retry?.content)}`;
        } catch (restoreErr) {
          detail += `\n${String(restoreErr.message || restoreErr)}`;
        }
        updateProgress('缓存切换失败', 100, detail);
        createToast(recovered ? '缓存切换失败，已恢复原配置和服务' : '缓存切换失败，恢复启动也未成功，请检查日志', 'red', 8000);
      } else {
        updateProgress('缓存切换失败', 100, detail);
        createToast(`缓存切换失败：${detail}`, 'red', 7000);
      }
    } finally {
      setBusy(false);
      await loadCacheSettings();
      await loadConfig();
      await refreshStatus();
    }
  };

  const loadCacheSettings = async () => {
    const root = getPanelRoot();
    const sizeEl = root?.querySelector('#md_cache_size');
    const lazyEl = root?.querySelector('#md_cache_lazy');
    const persistSw = root?.querySelector('#md_cache_persist');
    if (!sizeEl || !lazyEl || !persistSw) return;
    if (!(await isInstalled())) {
      sizeEl.value = '';
      lazyEl.value = '';
      persistSw.dataset.on = '0';
      persistSw.setAttribute('aria-checked', 'false');
      return;
    }
    const res = await run(`awk "/^  - tag: cache\\$/{f=1; next} /^  - tag: /{f=0} f" "${CONFIG_FILE}" 2>/dev/null`, 15000);
    const block = String(res?.content || '');
    const ms = block.match(/^\s*size: (\d+)\s*$/m);
    const ml = block.match(/^\s*lazy_cache_ttl: (\d+)\s*$/m);
    sizeEl.value = ms ? ms[1] : '10000';
    lazyEl.value = ml ? ml[1] : '0';
    const persist = /^\s*dump_file: /m.test(block);
    persistSw.dataset.on = persist ? '1' : '0';
    persistSw.setAttribute('aria-checked', persist ? 'true' : 'false');
  };

  const saveCacheSettings = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }
    const root = getPanelRoot();
    const size = parseInt(String(root?.querySelector('#md_cache_size')?.value || '').trim(), 10);
    if (!Number.isFinite(size) || size < 0) {
      createToast('缓存条数必须是不小于 0 的数字', 'red');
      return;
    }
    const lazy = parseInt(String(root?.querySelector('#md_cache_lazy')?.value || '').trim(), 10);
    if (!Number.isFinite(lazy) || lazy < 0) {
      createToast('乐观缓存 TTL 必须是不小于 0 的数字', 'red');
      return;
    }
    const persist = root?.querySelector('#md_cache_persist')?.dataset.on === '1';

    setBusy(true);
    try {
      updateProgress('正在检查 cache 插件段...', 30);
      const hasRes = await run(`grep -qF "  - tag: cache" "${CONFIG_FILE}" && echo 1 || echo 0`, 15000);
      if (lastLine(hasRes?.content) !== '1') {
        createToast('未找到 cache 插件段，请先在「高级配置」恢复默认模板', 'red', 6000);
        return;
      }

      updateProgress('正在写入缓存设置...', 50);
      let block = `  - tag: cache\n    type: cache\n    args:\n      size: ${size}\n`;
      if (lazy > 0) block += `      lazy_cache_ttl: ${lazy}\n`;
      if (persist) block += `      dump_file: "/data/mosdns/cache.dump"\n      dump_interval: 600\n`;
      const b64 = btoa(unescape(encodeURIComponent(block)));
      await run(`echo "${b64}" | base64 -d > "${CACHE_TMP}"`, 15000);
      // awk 定位 "  - tag: cache" 到下一个 "  - tag:" 之间的块，整体替换
      const awkRes = await run(
        `awk "BEGIN{while ((getline l < \\"${CACHE_TMP}\\") > 0) blk = blk l \\"\\n\\"} /^  - tag: cache\\$/{printf \\"%s\\", blk; skip=1; next} /^  - tag: /{skip=0} !skip" "${CONFIG_FILE}" > "${CONFIG_FILE}.ctmp" && mv "${CONFIG_FILE}.ctmp" "${CONFIG_FILE}" && rm -f "${CACHE_TMP}"`,
        20000,
      );
      if (!awkRes?.success) {
        createToast('写入缓存设置失败', 'red');
        return;
      }

      updateProgress('正在重启 Mosdns...', 75);
      const res = await run(`sh "${SERVICE_SH}" restart`, 50000);
      const detail = cleanText(res?.content);
      await run('sleep 2');
      const pid = await getRunningPid();
      if (serviceSucceeded(res) && pid) {
        updateProgress('缓存设置已保存并重启', 100, detail);
        createToast('缓存设置已保存并重启', 'green', 5000);
        await loadConfig();
      } else {
        const logRes = await run(`[ -f "${LOG_FILE}" ] && tail -20 "${LOG_FILE}" || echo "(暂无日志)"`, 15000);
        updateProgress('重启或 DNS 规则应用失败', 100, cleanText(logRes?.content));
        createToast('重启或 DNS 规则应用失败，请检查日志', 'red', 8000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  // ---------- 自定义名单库 ----------
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const readCustomLists = async () => {
    const res = await run(`cat "${CUSTOM_JSON}" 2>/dev/null || echo "[]"`, 15000);
    try {
      const arr = JSON.parse(String(res?.content || '').trim() || '[]');
      return Array.isArray(arr) ? arr.filter((it) => it && /^\d+$/.test(String(it.id)) && typeof it.url === 'string') : [];
    } catch {
      return [];
    }
  };

  const writeCustomLists = async (lists) => {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(lists, null, 2))));
    const res = await run(`echo "${b64}" | base64 -d > "${CUSTOM_JSON}"`, 15000);
    return !!res?.success;
  };

  // 把 json 条目写成 service.sh 可读的 custom_sets.conf（每行：tag 分组 文件名），gen_config 据此生成插件与规则
  const writeCustomSetsConf = async (lists) => {
    const content = lists.map((it) => `cu_${it.id} ${it.group === 'foreign' ? 'foreign' : 'china'} custom_${it.id}.txt`).join('\n') + '\n';
    const b64 = btoa(unescape(encodeURIComponent(content)));
    const res = await run(`echo "${b64}" | base64 -d > "${CUSTOM_SETS_CONF}"`, 15000);
    return !!res?.success;
  };

  // 下载并转换自定义名单：dnsmasq 格式（server=/域名/）用 awk 提取，否则按纯域名行过滤注释空行
  const fetchCustomList = async (url, id) => {
    const rawFile = `${MD_DIR}/custom_${id}.raw`;
    const tmpFile = `${MD_DIR}/custom_${id}.tmp`;
    const finalFile = `${MD_DIR}/custom_${id}.txt`;

    const dl = await downloadWithPoll({
      urls: [url],
      output: rawFile,
      logBase: CUSTOM_DL_BASE,
      doneMark: 'MD_CUSTOM_DONE',
      label: '自定义名单',
      percentStart: 25,
      percentEnd: 60,
    });
    if (!dl.ok) return { ok: false, message: dl.message, detail: dl.detail };

    const convRes = await run(
      `if grep -qE "^server=/" "${rawFile}"; then awk -F/ "/^server=\\// {print \\\$2}" "${rawFile}" > "${tmpFile}"; else grep -vE "^#|^[[:space:]]*\\$|^!" "${rawFile}" > "${tmpFile}"; fi`,
      30000,
    );
    const countRes = await run(`wc -l < "${tmpFile}" 2>/dev/null || echo 0`);
    const n = parseInt(lastLine(countRes?.content), 10) || 0;
    if (!convRes?.success || n < 10) {
      await run(`rm -f "${rawFile}" "${tmpFile}"`);
      return { ok: false, message: `名单转换失败（有效 ${n} 行，需 ≥10 行）`, lines: n };
    }
    await run(`mv "${tmpFile}" "${finalFile}" && rm -f "${rawFile}"`);
    return { ok: true, lines: n };
  };

  // 写 json + custom_sets.conf 后重生成并重启，含存活检查
  const applyCustomChanges = async (lists, okMsg) => {
    if (!(await writeCustomLists(lists))) {
      createToast('写入 custom_lists.json 失败', 'red');
      return;
    }
    if (!(await writeCustomSetsConf(lists))) {
      createToast('写入 custom_sets.conf 失败', 'red');
      return;
    }
    updateProgress('正在重生成配置并重启 Mosdns...', 85);
    const res = await run(`sh "${SERVICE_SH}" restart`, 50000);
    const detail = cleanText(res?.content);
    await run('sleep 2');
    const pid = await getRunningPid();
    if (serviceSucceeded(res) && pid) {
      updateProgress('操作完成', 100, detail);
      createToast(okMsg, 'green', 5000);
      await loadConfig();
    } else {
      const logRes = await run(`[ -f "${LOG_FILE}" ] && tail -20 "${LOG_FILE}" || echo "(暂无日志)"`, 15000);
      updateProgress('重启或 DNS 规则应用失败', 100, cleanText(logRes?.content));
      createToast('重启或 DNS 规则应用失败，请检查日志', 'red', 8000);
    }
  };

  const addCustomList = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 Mosdns！', 'red');
      return;
    }
    const root = getPanelRoot();
    const noteEl = root?.querySelector('#md_cl_note');
    const urlEl = root?.querySelector('#md_cl_url');
    const groupEl = root?.querySelector('#md_cl_group');
    const note = String(noteEl?.value || '').trim();
    const url = String(urlEl?.value || '').trim();
    const group = groupEl?.value === 'foreign' ? 'foreign' : 'china';
    if (!note) {
      createToast('请填写备注', 'red');
      return;
    }
    if (!okDownloadUrl(url)) {
      createToast('请填写合法的 http(s) URL', 'red');
      return;
    }

    const lists = await readCustomLists();
    const id = Date.now();
    setBusy(true);
    try {
      updateProgress(`正在下载「${note}」...`, 25);
      const r = await fetchCustomList(url, id);
      if (!r.ok) {
        updateProgress('添加失败', 25, r.detail || r.message);
        createToast(r.message, 'red', 5000);
        return;
      }
      lists.push({ id, note, url, group, file: `custom_${id}.txt`, lines: r.lines, updated: todayStr() });
      await applyCustomChanges(lists, `已添加「${note}」（${r.lines} 行，${group === 'foreign' ? '国外' : '国内'}组）`);
      if (noteEl) noteEl.value = '';
      if (urlEl) urlEl.value = '';
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const updateCustomList = async (id) => {
    if (!(await ensureRootOrToast())) return;
    const lists = await readCustomLists();
    const item = lists.find((x) => String(x.id) === String(id));
    if (!item) {
      createToast('条目不存在', 'red');
      return;
    }

    setBusy(true);
    try {
      updateProgress(`正在更新「${item.note}」...`, 25);
      const r = await fetchCustomList(item.url, item.id);
      if (!r.ok) {
        updateProgress('更新失败', 25, r.detail || r.message);
        createToast(r.message, 'red', 5000);
        return;
      }
      item.lines = r.lines;
      item.updated = todayStr();
      await applyCustomChanges(lists, `「${item.note}」已更新（${r.lines} 行）并重启生效`);
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const deleteCustomList = async (id) => {
    if (!(await ensureRootOrToast())) return;
    const lists = await readCustomLists();
    const item = lists.find((x) => String(x.id) === String(id));
    if (!item) return;

    if (state.deleteId !== String(id)) {
      state.deleteId = String(id);
      state.deleteClicks = 0;
    }
    state.deleteClicks += 1;
    if (state.deleteClicks < 3) {
      createToast(`再点 ${3 - state.deleteClicks} 次删除「${item.note}」`, 'red');
      clearTimeout(state.deleteTimer);
      state.deleteTimer = setTimeout(() => {
        state.deleteId = null;
        state.deleteClicks = 0;
      }, 3000);
      return;
    }
    state.deleteId = null;
    state.deleteClicks = 0;

    setBusy(true);
    try {
      updateProgress(`正在删除「${item.note}」...`, 50);
      const next = lists.filter((x) => String(x.id) !== String(id));
      await run(`rm -f "${MD_DIR}/custom_${item.id}.txt"`);
      await applyCustomChanges(next, `已删除「${item.note}」`);
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const renderCustomLists = async () => {
    const root = getPanelRoot();
    const box = root?.querySelector('#md_cl_table');
    if (!box) return;
    const lists = await readCustomLists();
    box.innerHTML = '';
    if (lists.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'md-info-line';
      empty.textContent = '暂无自定义名单';
      box.appendChild(empty);
      return;
    }
    lists.forEach((it) => {
      const row = document.createElement('div');
      row.className = 'md-cl-row';

      const info = document.createElement('div');
      info.className = 'md-cl-info';
      const title = document.createElement('div');
      title.className = 'md-cl-title';
      title.textContent = it.note || `名单 ${it.id}`;
      const meta = document.createElement('div');
      meta.className = 'md-cl-meta';
      meta.textContent = `${it.group === 'foreign' ? '国外' : '国内'} · ${it.lines || 0} 行 · 更新于 ${it.updated || '-'}`;
      info.appendChild(title);
      info.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'md-cl-actions';
      const upd = document.createElement('button');
      upd.type = 'button';
      upd.textContent = '更新';
      upd.disabled = state.busy;
      upd.onclick = async () => {
        await updateCustomList(it.id);
      };
      const del = document.createElement('button');
      del.type = 'button';
      del.textContent = '删除';
      del.disabled = state.busy;
      del.onclick = async () => {
        await deleteCustomList(it.id);
      };
      actions.appendChild(upd);
      actions.appendChild(del);

      row.appendChild(info);
      row.appendChild(actions);
      box.appendChild(row);
    });
  };

  const bindEvents = (el, id) => {
    const installBtn = el.querySelector('#md_install_btn');
    const uninstallBtn = el.querySelector('#md_uninstall_btn');
    const startBtn = el.querySelector('#md_start_btn');
    const stopBtn = el.querySelector('#md_stop_btn');
    const restartBtn = el.querySelector('#md_restart_btn');
    const refreshBtn = el.querySelector('#md_refresh_btn');
    const runningSwitch = el.querySelector('#md_running_switch');
    const bootSwitch = el.querySelector('#md_boot_switch');
    const updateListBtn = el.querySelector('#md_update_list_btn');
    const autoSwitch = el.querySelector('#md_autoupdate_switch');
    const upSaveBtn = el.querySelector('#md_up_save_btn');
    const logRefreshBtn = el.querySelector('#md_log_refresh_btn');
    const logClearBtn = el.querySelector('#md_log_clear_btn');
    const logAuto = el.querySelector('#md_log_auto');
    const logVerbose = el.querySelector('#md_log_verbose');
    const logClosed = el.querySelector('#md_log_closed');
    const logSearch = el.querySelector('#md_log_search');
    const logLevel = el.querySelector('#md_log_level');
    const hijackSwitch = el.querySelector('#md_hijack_switch');
    const cacheEnabled = el.querySelector('#md_cache_enabled');
    const cacheSaveBtn = el.querySelector('#md_cache_save_btn');
    const cachePersist = el.querySelector('#md_cache_persist');
    const clAddBtn = el.querySelector('#md_cl_add_btn');
    const confSaveBtn = el.querySelector('#md_conf_save_btn');
    const confRestoreBtn = el.querySelector('#md_conf_restore_btn');

    installBtn.onclick = async () => {
      await installPlugin();
    };
    uninstallBtn.onclick = async () => {
      await uninstallPlugin();
    };
    startBtn.onclick = async () => {
      await startService();
    };
    stopBtn.onclick = async () => {
      await stopService();
    };
    restartBtn.onclick = async () => {
      await restartService();
    };
    updateListBtn.onclick = async () => {
      await updateCnList();
    };
    autoSwitch.onclick = async () => {
      await toggleAutoUpdate();
    };
    upSaveBtn.onclick = async () => {
      await saveUpstreams();
    };
    logRefreshBtn.onclick = async () => {
      await renderLogs();
      createToast('日志已刷新', 'pink');
    };
    logClearBtn.onclick = async () => {
      await clearQueryLog();
    };
    logAuto.onclick = () => {
      const on = logAuto.dataset.on !== '1';
      logAuto.dataset.on = on ? '1' : '0';
      logAuto.setAttribute('aria-checked', on ? 'true' : 'false');
      setLogAutoRefresh(on);
      createToast(on ? '已开启自动刷新（每 5 秒）' : '已关闭自动刷新', 'green');
    };
    logVerbose.onclick = async () => {
      await toggleLogVerbose();
    };
    logClosed.onclick = async () => {
      state.showClosedLogs = !state.showClosedLogs;
      await renderLogs();
    };
    logSearch.oninput = () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => {
        renderLogs();
      }, 300);
    };
    logLevel.onchange = () => {
      renderLogs();
    };
    hijackSwitch.onclick = async () => {
      await toggleHijack();
    };
    cacheSaveBtn.onclick = async () => {
      await saveCacheSettings();
    };
    cacheEnabled.onclick = async () => {
      await toggleCacheEnabled();
    };
    cachePersist.onclick = () => {
      const on = cachePersist.dataset.on === '1';
      cachePersist.dataset.on = on ? '0' : '1';
      cachePersist.setAttribute('aria-checked', on ? 'false' : 'true');
    };
    clAddBtn.onclick = async () => {
      await addCustomList();
    };
    confSaveBtn.onclick = async () => {
      await saveConfig();
    };
    confRestoreBtn.onclick = async () => {
      await restoreConfig();
    };
    refreshBtn.onclick = async () => {
      if (!(await ensureRootOrToast())) return;
      createToast('正在刷新状态...', 'pink');
      await refreshStatus();
      await loadUpstreams();
      await loadCacheSettings();
      await renderLogs();
      await loadLogVerbose();
    };
    runningSwitch.onclick = async () => {
      await toggleRunningEnabled();
    };
    bootSwitch.onclick = async () => {
      await toggleBootEnabled();
    };

    // 标签页切换；下载等长任务期间允许切换页面查看，故不参与 busy 禁用
    el.querySelectorAll('.md-tab').forEach((tab) => {
      tab.dataset.lockIgnore = '1';
      tab.onclick = () => {
        switchTab(tab.dataset.tab);
      };
    });

    const closeBtn = el.querySelector(`#${MODAL_NAME}_close`);
    if (closeBtn) {
      closeBtn.parentElement?.insertBefore(refreshBtn, closeBtn);
      refreshBtn.style.marginRight = '8px';
    }

    showModal(id);
  };

  const openModal = async () => {
    ensureStyle();
    document.querySelector(`#${MODAL_NAME}`)?.remove();

    const { el, id } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '760px',
      showConfirm: false,
      onClose: () => {
        clearInterval(state.logTimer);
        state.logTimer = null;
        return true;
      },
      contentStyle: 'max-height:72vh;',
      content: `
        <div class="md-shell">
          <div class="md-hero">
            <p class="md-hero-title">Mosdns 分流 ${VERSION}</p>
            <div class="md-hero-sub">国内域名 → 国内上游直连，其余 → 国外可信上游（上游 DNS 页可自定义，支持域名 + bootstrap 自动解析）<br>监听 0.0.0.0:${LISTEN_PORT}；默认后端模式配合 AGH 前端，「接管 53 端口」开关可切换单机模式</div>
          </div>

          <div class="md-tabs">
            <button class="md-tab" data-tab="status" data-active="1" type="button">服务状态</button>
            <button class="md-tab" data-tab="upstream" data-active="0" type="button">上游 DNS</button>
            <button class="md-tab" data-tab="list" data-active="0" type="button">域名名单</button>
            <button class="md-tab" data-tab="rules" data-active="0" type="button">分流规则</button>
            <button class="md-tab" data-tab="log" data-active="0" type="button">查询日志</button>
            <button class="md-tab" data-tab="advanced" data-active="0" type="button">高级配置</button>
          </div>

          <div class="md-tabpage" data-page="status">
            <div class="md-grid">
              <div class="md-card">
                <div class="md-card-label">安装状态</div>
                <div class="md-card-value"><span class="md-chip" id="md_installed" data-kind="off">检测中</span></div>
                <div class="md-card-sub">监听：0.0.0.0:${LISTEN_PORT}</div>
              </div>
              <div class="md-card">
                <div class="md-card-label">运行状态</div>
                <div class="md-card-value md-card-value--between">
                  <span class="md-chip" id="md_running" data-kind="warn">检测中</span>
                  <button id="md_running_switch" class="md-switch" type="button" role="switch" aria-checked="false"></button>
                </div>
              </div>
              <div class="md-card">
                <div class="md-card-label">开机启动</div>
                <div class="md-card-value md-card-value--between">
                  <span class="md-chip" id="md_boot" data-kind="off">检测中</span>
                  <button id="md_boot_switch" class="md-switch" type="button" role="switch" aria-checked="false"></button>
                </div>
              </div>
            </div>

            <div class="md-action-panel">
              <div class="md-panel-head">
                <div class="md-panel-title">功能按钮</div>
                <div class="md-panel-tip">卸载需连点 3 次确认</div>
              </div>
              <div class="md-actions">
                <button id="md_install_btn">安装</button>
                <button id="md_uninstall_btn">卸载</button>
                <button id="md_start_btn">启动</button>
                <button id="md_stop_btn">停止</button>
                <button id="md_restart_btn">重启</button>
              </div>
            </div>

            <div class="md-action-panel">
              <div class="md-panel-head">
                <div class="md-panel-title">运行模式</div>
                <div class="md-panel-tip">默认后端模式（配合 AGH 前端）</div>
              </div>
              <div class="md-switch-row">
                <div class="md-switch-info">
                  <div class="md-switch-label">接管 53 端口</div>
                  <div class="md-switch-tip">单机模式（无 AGH）时开启；与 AdGuardHome 配合（AGH 前端）时关闭，否则两个插件抢 53 端口</div>
                </div>
                <button id="md_hijack_switch" class="md-switch" type="button" role="switch" aria-checked="false"></button>
              </div>
            </div>

            <div class="md-action-panel">
              <div class="md-panel-head">
                <div class="md-panel-title">缓存设置</div>
                <div class="md-panel-tip">开关切换后自动重启服务</div>
              </div>
              <div class="md-switch-row">
                <div class="md-switch-info">
                  <div class="md-switch-label">启用 DNS 缓存</div>
                  <div class="md-switch-tip">关闭后查询直接走上游；缓存参数保留，重新开启后继续使用</div>
                </div>
                <button id="md_cache_enabled" class="md-switch" type="button" role="switch" aria-label="启用 DNS 缓存" aria-checked="false"></button>
              </div>
              <div class="md-switch-row" style="margin-top:8px;">
                <div class="md-switch-info">
                  <div class="md-switch-label">缓存条数</div>
                  <div class="md-switch-tip">size，默认 10000</div>
                </div>
                <input class="md-input md-form-num" id="md_cache_size" type="number" min="0" placeholder="10000">
              </div>
              <div class="md-switch-row" style="margin-top:8px;">
                <div class="md-switch-info">
                  <div class="md-switch-label">乐观缓存 TTL（秒）</div>
                  <div class="md-switch-tip">lazy_cache_ttl，0 = 关闭，建议 86400</div>
                </div>
                <input class="md-input md-form-num" id="md_cache_lazy" type="number" min="0" placeholder="0">
              </div>
              <div class="md-switch-row" style="margin-top:8px;">
                <div class="md-switch-info">
                  <div class="md-switch-label">缓存持久化</div>
                  <div class="md-switch-tip">开 = dump_file cache.dump + dump_interval 600；关 = 删除这两行</div>
                </div>
                <button id="md_cache_persist" class="md-switch" type="button" role="switch" aria-checked="false"></button>
              </div>
              <div class="md-actions" style="margin-top:10px;">
                <button id="md_cache_save_btn">保存并重启</button>
              </div>
            </div>

            <div class="md-status-panel">
              <div class="md-panel-head">
                <div class="md-panel-title">操作进度</div>
                <div class="md-panel-tip">首次安装需下载约 6.6MB 压缩包与 11 万行名单</div>
              </div>
              <div class="md-progress-shell" id="md_progress_shell" hidden>
                <div class="md-progress-text" id="md_progress_text">等待操作...</div>
                <div class="md-progress-track">
                  <div class="md-progress-bar" id="md_progress_bar"></div>
                </div>
              </div>
              <pre class="md-log" id="md_progress_log">等待操作...</pre>
            </div>
          </div>

          <div class="md-tabpage" data-page="upstream" hidden>
            <div class="md-action-panel">
              <div class="md-panel-head">
                <div class="md-panel-title">上游 DNS</div>
                <div class="md-panel-tip">写入 /data/mosdns/upstreams.conf 后重生成 config.yaml 并重启</div>
              </div>
              <div class="md-up-label">国内上游（每行一条）</div>
              <textarea class="md-conf-editor" id="md_up_china" spellcheck="false" placeholder="223.5.5.5&#10;119.29.29.29"></textarea>
              <div class="md-up-label" style="margin-top:8px;">国外（可信）上游（每行一条，至少一条）</div>
              <textarea class="md-conf-editor" id="md_up_foreign" spellcheck="false" placeholder="tls://8.8.8.8&#10;tls://1.1.1.1"></textarea>
              <div class="md-up-label" style="margin-top:8px;">Bootstrap DNS（解析上游域名用，每行一个 IPv4）</div>
              <textarea class="md-conf-editor" id="md_up_bootstrap" spellcheck="false" style="min-height:60px;" placeholder="223.5.5.5&#10;119.29.29.29"></textarea>
              <div class="md-switch-tip" style="margin-top:6px;">上游每行一条：IP（可带端口）、udp://IP、tcp://IP、tls://域名 或 https://域名/dns-query。域名不能省略协议。国内和国外的 DoT/DoH 域名上游均使用 Bootstrap DNS（每行一个 IPv4，同组上游按顺序分配）；引导 DNS 失效会导致对应上游查询失败，请填写可达地址。</div>
              <div class="md-actions" style="margin-top:10px;">
                <button id="md_up_save_btn">保存并重启</button>
              </div>
            </div>
          </div>

          <div class="md-tabpage" data-page="list" hidden>
            <div class="md-action-panel">
              <div class="md-panel-head">
                <div class="md-panel-title">域名名单</div>
                <div class="md-panel-tip">来源：felixonmars/dnsmasq-china-list（jsDelivr）</div>
              </div>
              <div class="md-info-line" id="md_list_info">名单：检测中...</div>
              <div class="md-switch-row" style="margin-top:10px;">
                <div class="md-switch-info">
                  <div class="md-switch-label">自动更新</div>
                  <div class="md-switch-tip">开机启动时检查：名单超过 7 天未更新则后台静默更新并重启生效</div>
                </div>
                <button id="md_autoupdate_switch" class="md-switch" type="button" role="switch" aria-checked="false"></button>
              </div>
              <div class="md-actions" style="margin-top:10px;">
                <button id="md_update_list_btn">手动更新名单</button>
              </div>
            </div>
          </div>

          <div class="md-tabpage" data-page="rules" hidden>
            <div class="md-action-panel">
              <div class="md-panel-head">
                <div class="md-panel-title">自定义名单库</div>
                <div class="md-panel-tip">支持 dnsmasq（server=/域名/）与纯域名两种格式</div>
              </div>
              <div class="md-cl-table" id="md_cl_table"><div class="md-info-line">暂无自定义名单</div></div>
              <div class="md-cl-form">
                <input class="md-input" id="md_cl_note" type="text" placeholder="备注（如：广告域名）">
                <input class="md-input" id="md_cl_url" type="text" placeholder="名单 URL（https://...）">
                <select class="md-input" id="md_cl_group">
                  <option value="china">国内（forward_china）</option>
                  <option value="foreign">国外（forward_foreign）</option>
                </select>
              </div>
              <div class="md-switch-tip" style="margin-top:8px;">每条名单生成一个 domain_set 插件（tag: cu_序号），优先于内置国内名单匹配，按列表顺序命中即返回；变更后自动重生成配置并重启，保留缓存参数和日志等级。</div>
              <div class="md-actions" style="margin-top:10px;">
                <button id="md_cl_add_btn">添加</button>
              </div>
            </div>
          </div>

          <div class="md-tabpage" data-page="log" hidden>
            <div class="md-action-panel">
              <div class="md-panel-head">
                <div class="md-panel-title">查询日志</div>
                <div class="md-panel-tip">tail -200 mosdns.log，最新在前</div>
              </div>
              <div class="md-log-toolbar">
                <input class="md-input md-log-search" id="md_log_search" type="text" placeholder="搜索域名或关键词">
                <select class="md-input md-log-sel" id="md_log_level">
                  <option value="all">全部</option>
                  <option value="DEBUG">DEBUG</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </select>
                <button id="md_log_refresh_btn" type="button">刷新</button>
                <button id="md_log_clear_btn" type="button">清空日志</button>
                <button id="md_log_closed" type="button" aria-pressed="false">显示连接关闭日志</button>
              </div>
              <div class="md-switch-row" style="margin-top:8px;">
                <div class="md-switch-info">
                  <div class="md-switch-label">自动刷新</div>
                  <div class="md-switch-tip">开启后每 5 秒重新拉取最新 200 行</div>
                </div>
                <button id="md_log_auto" class="md-switch" type="button" role="switch" aria-checked="false"></button>
              </div>
              <div class="md-switch-row" style="margin-top:8px;">
                <div class="md-switch-info">
                  <div class="md-switch-label">详细模式（记录每条查询）</div>
                  <div class="md-switch-tip">开启后 log level 改为 debug 并重启，日志量会显著变大</div>
                </div>
                <button id="md_log_verbose" class="md-switch" type="button" role="switch" aria-checked="false"></button>
              </div>
              <div class="md-log-table" id="md_log_table"></div>
            </div>
          </div>

          <div class="md-tabpage" data-page="advanced" hidden>
            <div class="md-action-panel">
              <div class="md-panel-head">
                <div class="md-panel-title">高级配置</div>
                <div class="md-panel-tip">config.yaml 全文编辑；恢复默认需连点 3 次</div>
              </div>
              <textarea class="md-conf-editor md-yaml-editor" id="md_conf_editor" spellcheck="false" placeholder="载入中..."></textarea>
              <div class="md-switch-tip" style="margin-top:6px;">说明：上游在「上游 DNS」页修改，保存后按模板重生成 config.yaml；修改上游或自定义名单会重生成其他配置，但保留缓存插件参数和日志等级；未变动时保留全文。恢复默认 = 按当前上游用内置模板重新生成。</div>
              <div class="md-actions" style="margin-top:10px;">
                <button id="md_conf_save_btn">保存并重启</button>
                <button id="md_conf_restore_btn">恢复默认模板</button>
              </div>
            </div>
          </div>
        </div>
      `,
    });

    el.style.width = '95%';
    const footerBtnBox = el.querySelector('.btn');
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'md_refresh_btn';
    refreshBtn.type = 'button';
    refreshBtn.textContent = '刷新状态';
    footerBtnBox?.appendChild(refreshBtn);
    bindEvents(el, id);
    await refreshStatus();
    await loadUpstreams();
    await loadConfig();
    await loadCacheSettings();
    await renderLogs();
    await loadLogVerbose();
  };

  const mainBtn = document.createElement('button');
  mainBtn.textContent = TITLE;
  mainBtn.dataset.lockIgnore = '1';
  mainBtn.onclick = async () => {
    await openModal();
  };

  document.querySelector('.actions-buttons')?.appendChild(mainBtn);
})();
//</script>
