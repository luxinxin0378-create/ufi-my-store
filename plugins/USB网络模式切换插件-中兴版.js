//<script>
(async () => {
  const TITLE = 'USB网络模式切换';
  const BASE_DIR = '/data/kano_usb_mode';
  const SWITCH_FILE = `${BASE_DIR}/switch.sh`;
  const MODE_FILE = `${BASE_DIR}/mode.env`;
  const LOG_FILE = `${BASE_DIR}/switch.log`;
  const BOOT_SH_FILE = '/sdcard/ufi_tools_boot.sh';
  const VER_TAG = 'KANO_USB_MODE_VER=7';
  const BOOT_LINE = `nohup sh ${SWITCH_FILE} monitor >/dev/null 2>&1 & #kano_usb_mode_switch`;
  const OLD_BASE_DIR = '/data/kano_usb_network_manager';
  const OLD_DAEMON = `${OLD_BASE_DIR}/usb_network_daemon.sh`;

  const MODES = [
    { key: 'ecm', label: 'ECM', hint: 'Mac / Linux 首选' },
    { key: 'ncm', label: 'NCM', hint: '新版 Windows / macOS 原生支持' },
    { key: 'rndis', label: 'RNDIS', hint: 'Windows 传统网络共享' },
  ];

  const SWITCH_SH = `#!/system/bin/sh
# USB 网络模式切换: setprop 让厂商 init 组合, 再补桥接和 MAC 冲突修复
# ${VER_TAG}
G=/config/usb_gadget/g1
BASE=/data/kano_usb_mode
LOG=$BASE/switch.log
PIDFILE=$BASE/monitor.pid
LOCK=$BASE/switch.lock
MODE_FILE=$BASE/mode.env
mkdir -p $BASE 2>/dev/null
log() { echo "[$(date '+%H:%M:%S')] $1" >> $LOG; }

# 守护模式: 插拔后厂商框架会套回 rndis, 发现实际模式与所选不符就重放切换
if [ "$1" = "monitor" ]; then
  OPID=$(cat $PIDFILE 2>/dev/null)
  # 僵尸进程 kill -0 也会成功, 必须检查 cmdline 非空才算真活着
  if [ -n "$OPID" ] && kill -0 "$OPID" 2>/dev/null && [ -n "$(cat /proc/$OPID/cmdline 2>/dev/null)" ]; then
    exit 0
  fi
  echo $$ > $PIDFILE
  log "monitor started"
  while true; do
    WANT=$(cat $MODE_FILE 2>/dev/null)
    case "$WANT" in ecm|ncm|rndis) ;; *)
      # 读不到有效目标绝不猜默认值, 否则会和用户选择打架
      sleep 3
      continue
      ;;
    esac
    STATE=$(getprop sys.usb.state)
    case "$STATE" in
      *rndis*|*ecm*|*ncm*)
        case "$STATE" in
          *"$WANT"*) ;;
          *)
            log "detect $STATE != $WANT, re-apply"
            sh "$0"
            ;;
        esac
        ;;
    esac
    sleep 3
  done
fi

# 互斥锁: 同一时间只允许一个切换实例; 排队等待, 后到的意图以锁释放后重新读取的目标为准
i=0
until mkdir $LOCK 2>/dev/null; do
  LPID=$(cat $LOCK/pid 2>/dev/null)
  if [ -z "$LPID" ] || ! kill -0 "$LPID" 2>/dev/null; then
    rm -rf $LOCK
    continue
  fi
  i=$((i + 1))
  if [ $i -gt 25 ]; then
    rm -rf $LOCK
    i=0
  fi
  sleep 1
done
echo $$ > $LOCK/pid

MODE=$1
[ -z "$MODE" ] && MODE=$(cat $MODE_FILE 2>/dev/null)
case "$MODE" in ecm|ncm|rndis) ;;
  *)
    log "no valid mode, exit"
    rm -rf $LOCK
    exit 0
    ;;
esac
echo "$MODE" > $MODE_FILE

# ADB 动态检测: 当前或持久配置里带 adb 就跟着带, 不手动 start adbd
CUR="$(getprop sys.usb.config)"
[ -z "$CUR" ] && CUR="$(getprop persist.sys.usb.config)"
case "$CUR" in *adb*) SUF=",adb" ;; *) SUF="" ;; esac

UDC=$(cat $G/UDC)
log "switch to $MODE,mtp$SUF (from: $CUR)"
setprop sys.usb.config "$MODE,mtp$SUF"

i=0
while [ $i -lt 15 ]; do
  case "$(getprop sys.usb.state)" in *"$MODE"*) break ;; esac
  sleep 1
  i=$((i + 1))
done

case "$MODE" in rndis) FN=rndis.gs4 ;; *) FN=$MODE.gs0 ;; esac
IF=$(cat $G/functions/$FN/ifname 2>/dev/null)
[ -z "$IF" ] && IF=usb0
log "netdev: $IF"

brctl addif br0 "$IF" 2>/dev/null

# MAC 冲突修复: 厂商把 host 侧 MAC 和设备侧写成同一个, 导致 USB 客户端被内网隔离
BAD="$(getprop persist.sys.usb.tethering)"
CURMAC="$(cat /sys/class/net/$IF/address)"
if [ -n "$BAD" ] && [ "$CURMAC" = "$BAD" ]; then
  M=$(printf "02:%02x:%02x:%02x:%02x:%02x" $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)))
  ifconfig "$IF" down
  ip link set "$IF" address "$M"
  ifconfig "$IF" up
  ip neigh flush all
  log "mac fixed: $CURMAC -> $M"
  echo "" > $G/UDC
  sleep 2
  [ -n "$(cat $G/UDC)" ] || echo "$UDC" > $G/UDC
fi

brctl addif br0 "$IF" 2>/dev/null
log "done: $(getprop sys.usb.state) if=$IF mac=$(cat /sys/class/net/$IF/address)"
rm -rf $LOCK
`;

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

  const run = async (command, timeout = 15000) => {
    try {
      const res = await runShellWithRoot(command, timeout);
      return { ok: Boolean(res?.success), text: String(res?.content || '').trim() };
    } catch {
      return { ok: false, text: '' };
    }
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

  const getActiveMode = (state) => {
    for (const m of MODES) {
      if (state.includes(m.key)) return m.key;
    }
    return '';
  };

  const getStatus = async () => {
    const res = await run('getprop sys.usb.state; getprop sys.usb.config; echo "MON=$([ -f ' + BASE_DIR + '/monitor.pid ] || exit 0; P=$(cat ' + BASE_DIR + '/monitor.pid 2>/dev/null); [ -n "$P" ] && kill -0 $P 2>/dev/null && [ -n "$(cat /proc/$P/cmdline 2>/dev/null)" ] && echo running || echo stopped)"; for FN in ecm.gs0 ncm.gs0 rndis.gs4; do IF=$(cat /config/usb_gadget/g1/functions/$FN/ifname 2>/dev/null); [ -n "$IF" ] && echo "IF_' + '$FN=$IF:$(cat /sys/class/net/$IF/operstate 2>/dev/null)"; done; echo "LOGTAIL=$(tail -n 4 ' + LOG_FILE + ' 2>/dev/null | tr \'\\n\' \'|\')"; echo "MODEENV=$(cat ' + MODE_FILE + ' 2>/dev/null)"', 8000);
    const lines = res.text.split('\n');
    const conf = lines[1] || '';
    const ifs = {};
    lines.forEach((line) => {
      const m = line.match(/^IF_(\S+)=(.+)$/);
      if (m) ifs[m[1]] = m[2];
    });
    const mon = (lines.find((l) => l.startsWith('MON=')) || 'MON=stopped').slice(4) === 'running' ? 'running' : 'stopped';
    const logtail = (lines.find((l) => l.startsWith('LOGTAIL=')) || 'LOGTAIL=').slice(8);
    const modeenv = (lines.find((l) => l.startsWith('MODEENV=')) || 'MODEENV=').slice(8);
    return { state: lines[0] || '', conf: lines[1] || '', ifs, logtail, mon, modeenv, activeMode: getActiveMode(lines[0] || '') };
  };

  const isBootEnabled = async () => {
    const res = await run(`grep -q 'kano_usb_mode_switch' ${shellQuote(BOOT_SH_FILE)} 2>/dev/null && echo on`, 8000);
    return res.ok && res.text === 'on';
  };

  const setBootEnabled = async (enabled) => {
    const cmd = enabled
      ? `grep -q 'kano_usb_mode_switch' ${shellQuote(BOOT_SH_FILE)} 2>/dev/null || { [ -s ${shellQuote(BOOT_SH_FILE)} ] && [ -n "$(tail -c1 ${shellQuote(BOOT_SH_FILE)})" ] && echo >> ${shellQuote(BOOT_SH_FILE)}; echo ${shellQuote(encodePayload(BOOT_LINE + '\n'))} | base64 -d >> ${shellQuote(BOOT_SH_FILE)}; }`
      : `sed -i '/kano_usb_mode_switch/d' ${shellQuote(BOOT_SH_FILE)}`;
    const res = await run(cmd, 12000);
    return res.ok;
  };

  const applyMode = async (mode) => {
    await run(`nohup sh ${shellQuote(SWITCH_FILE)} ${mode} >/dev/null 2>&1 &`, 6000);
  };

  const restoreDefault = async () => {
    await run(`nohup sh -c 'setprop sys.usb.config charging,adb' >/dev/null 2>&1 &`, 6000);
  };

  const uninstallAll = async () => {
    await run(`
sed -i '/kano_usb_mode_switch/d' ${shellQuote(BOOT_SH_FILE)} 2>/dev/null
rm -rf ${shellQuote(BASE_DIR)}
`, 15000);
  };

  const ensureStyle = () => {
    if (document.getElementById('kano_usb_mode_style')) return;
    const style = document.createElement('style');
    style.id = 'kano_usb_mode_style';
    style.textContent = `
      #kano_usb_network_manager_modal .usbs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
        margin-bottom: 12px;
      }
      #kano_usb_network_manager_modal .usbs-card {
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.03);
        padding: 12px 14px;
      }
      #kano_usb_network_manager_modal .usbs-label {
        font-size: .64rem;
        opacity: .72;
        margin-bottom: 6px;
      }
      #kano_usb_network_manager_modal .usbs-value {
        font-size: .7rem;
        font-weight: 800;
        word-break: break-word;
      }
      #kano_usb_network_manager_modal .usbs-mode {
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.03);
        padding: 12px;
        cursor: pointer;
        transition: all .2s ease;
      }
      #kano_usb_network_manager_modal .usbs-mode.active {
        border-color: rgba(105, 199, 120, .7);
        box-shadow: 0 0 0 2px rgba(105, 199, 120, .16);
        background: rgba(75, 181, 98, .12);
      }
      #kano_usb_network_manager_modal .usbs-mode-name {
        font-size: .78rem;
        font-weight: 800;
      }
      #kano_usb_network_manager_modal .usbs-mode-tip {
        font-size: .64rem;
        opacity: .78;
        margin-top: 4px;
        line-height: 1.6;
      }
      #kano_usb_network_manager_modal .usbs-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 12px;
      }
      #kano_usb_network_manager_modal .usbs-tip {
        font-size: .66rem;
        line-height: 1.7;
        opacity: .8;
        margin-bottom: 10px;
      }
      #kano_usb_network_manager_modal .usbs-log {
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        font-size: .62rem;
        line-height: 1.65;
        max-height: 160px;
        overflow: auto;
        padding: 10px 12px;
        border-radius: 12px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.06);
      }
      @media (max-width: 760px) {
        #kano_usb_network_manager_modal .usbs-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const ensureInstalled = async () => {
    const res = await run(`grep -q '${VER_TAG}' ${shellQuote(SWITCH_FILE)} 2>/dev/null && echo ok`, 8000);
    if (res.ok && res.text === 'ok') return 'current';
    await run(`sh ${shellQuote(OLD_DAEMON)} stop 2>/dev/null; sed -i '/usb_network_daemon.sh/d' ${shellQuote(BOOT_SH_FILE)} 2>/dev/null; true`, 10000);
    const ok = await writeRemoteFile(SWITCH_FILE, SWITCH_SH, '755');
    return ok ? 'updated' : 'failed';
  };

  let bootEnabled = false;
  let lastChosen = ''; // 插件侧记住所选模式, mode.env 丢失时自动恢复

  const buildContent = (status, loading) => `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <div class="usbs-grid">
        <div class="usbs-card">
          <div class="usbs-label">当前 USB 状态</div>
          <div class="usbs-value" id="usbs_state">${loading ? '获取中...' : escapeHtml(status.state || '未知')}</div>
        </div>
        <div class="usbs-card">
          <div class="usbs-label">ADB</div>
          <div class="usbs-value" id="usbs_adb">${loading ? '...' : (/adb/.test(status.conf) ? '开启（切换时自动保留）' : '关闭（切换时不会挂上）')}</div>
        </div>
        <div class="usbs-card">
          <div class="usbs-label">守护进程</div>
          <div class="usbs-value" id="usbs_mon">${loading ? '...' : (status.mon === 'running' ? `运行中${status.modeenv ? `(目标${escapeHtml(status.modeenv)})` : ''}` : '未运行')}</div>
        </div>
        <div class="usbs-card">
          <div class="usbs-label">开机自动应用</div>
          <div class="usbs-value" id="usbs_boot_text">${bootEnabled ? '已开启' : '未开启'}</div>
        </div>
      </div>

      <div>
        <div class="usbs-tip">点击卡片立即切换，切换耗时约 5~15 秒，期间 USB 网络会闪断、电脑会重新枚举。ADB 是否保留由设备当前状态动态决定，无需关心。</div>
        <div style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:10px;" id="usbs_mode_grid">
          ${MODES.map((m) => `
            <div class="usbs-mode ${status.activeMode === m.key ? 'active' : ''}" data-mode="${escapeHtml(m.key)}">
              <div class="usbs-mode-name">${escapeHtml(m.label)}</div>
              <div class="usbs-mode-tip">${escapeHtml(m.hint)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="usbs-actions">
        <div id="usbs_boot_switch_box" style="margin-right:auto;"></div>
        <button id="usbs_restore_btn">恢复厂商默认</button>
        <button id="usbs_reload_btn">刷新状态</button>
        <button id="usbs_clear_btn">清除插件</button>
      </div>

      <div>
        <div class="usbs-tip">切换日志（tail）</div>
        <pre class="usbs-log" id="usbs_log">${escapeHtml(loading ? '暂无日志' : status.logtail || '暂无日志')}</pre>
      </div>
    </div>
  `;

  const openModal = async () => {
    ensureStyle();
    document.querySelector('#kano_usb_network_manager_modal')?.remove();
    const { id, el } = createModal({
      name: 'kano_usb_network_manager_modal',
      title: TITLE,
      maxWidth: '760px',
      showConfirm: false,
      onClose: () => true,
      contentStyle: 'max-height:75vh;',
      content: buildContent({}, true),
    });
    showModal(id);

    const bindCards = () => {
      el.querySelectorAll('.usbs-mode').forEach((node) => {
        node.onclick = async () => {
          const mode = node.dataset.mode;
          lastChosen = mode;
          createToast(`正在切换到 ${mode.toUpperCase()}，请稍候（USB 会闪断）...`, 'pink', 5000);
          await applyMode(mode);
        };
      });
    };
    bindCards();

    const bootBox = el.querySelector('#usbs_boot_switch_box');
    let bootSwitch = null;
    if (bootBox && typeof createSwitch === 'function') {
      bootSwitch = createSwitch({
        text: '开机守护（插拔后保持所选模式）',
        value: bootEnabled,
        onChange: () => { },
      });
      bootBox.appendChild(bootSwitch);
      bootSwitch.onclick = async () => {
        const next = !bootEnabled; // input.checked 在 click 时可能还是旧值, 以插件自身状态为准
        const ok = await setBootEnabled(next);
        if (!ok) {
          createToast('更新开机守护失败', 'red', 5000);
          return;
        }
        bootEnabled = next;
        bootSwitch.update?.(bootEnabled);
        const t = el.querySelector('#usbs_boot_text');
        if (t) t.textContent = bootEnabled ? '已开启' : '未开启';
        if (bootEnabled) {
          await run(`nohup sh ${shellQuote(SWITCH_FILE)} monitor >/dev/null 2>&1 &`, 6000);
          createToast('已开启开机守护（插拔后保持模式）', 'green');
        } else {
          await run(`[ -f ${shellQuote(`${BASE_DIR}/monitor.pid`)} ] && kill $(cat ${shellQuote(`${BASE_DIR}/monitor.pid`)}) 2>/dev/null; rm -f ${shellQuote(`${BASE_DIR}/monitor.pid`)}; true`, 6000);
          createToast('已关闭开机守护', 'green');
        }
      };
    }

    const refresh = async () => {
      const status = await getStatus();
      // mode.env 丢失/被清时自动用插件记住的所选模式恢复, 保证守护不空转
      if (lastChosen && status.modeenv !== lastChosen) {
        await run(`mkdir -p ${shellQuote(BASE_DIR)}; echo ${shellQuote(lastChosen)} > ${shellQuote(MODE_FILE)}`, 8000);
      }
      const stateEl = el.querySelector('#usbs_state');
      const adbEl = el.querySelector('#usbs_adb');
      const monEl = el.querySelector('#usbs_mon');
      if (stateEl) stateEl.textContent = status.state || '未知';
      if (adbEl) adbEl.textContent = /adb/.test(status.conf) ? '开启（切换时自动保留）' : '关闭（切换时不会挂上）';
      if (monEl) monEl.textContent = status.mon === 'running' ? `运行中${status.modeenv ? `(目标${status.modeenv})` : ''}` : '未运行';
      el.querySelectorAll('.usbs-mode').forEach((node) => {
        node.classList.toggle('active', node.dataset.mode === status.activeMode);
      });
      const logEl = el.querySelector('#usbs_log');
      if (logEl) logEl.textContent = status.logtail || '暂无日志';
    };

    el.querySelector('#usbs_restore_btn').onclick = async () => {
      createToast('正在恢复厂商默认（charging,adb）...', 'pink', 4000);
      await restoreDefault();
    };
    el.querySelector('#usbs_reload_btn').onclick = async () => {
      await refresh();
      createToast('状态已刷新', 'green');
    };
    el.querySelector('#usbs_clear_btn').onclick = async () => {
      await uninstallAll();
      bootEnabled = false;
      lastChosen = '';
      const t = el.querySelector('#usbs_boot_text');
      if (t) t.textContent = '未开启';
      if (bootSwitch) bootSwitch.update?.(false);
      createToast('已清除插件配置和开机自启', 'green');
      await refresh();
    };

    const poll = setInterval(async () => {
      if (!document.getElementById('kano_usb_network_manager_modal')) {
        clearInterval(poll);
        return;
      }
      await refresh();
    }, 3000);

    (async () => {
      const installResult = await ensureInstalled();
      if (installResult === 'updated') {
        createToast('切换脚本已更新到最新版', 'green', 4000);
      } else if (installResult === 'failed') {
        createToast('切换脚本安装失败，切换功能不可用', 'red', 6000);
      }
      bootEnabled = await isBootEnabled();
      const status = await getStatus();
      if (!lastChosen && status.activeMode) lastChosen = status.activeMode;
      const t = el.querySelector('#usbs_boot_text');
      if (t) t.textContent = bootEnabled ? '已开启' : '未开启';
      if (bootSwitch) bootSwitch.update?.(bootEnabled);
      await refresh();
    })();
  };

  const mainBtn = document.createElement('button');
  mainBtn.textContent = TITLE;
  mainBtn.onclick = async () => {
    if (!(await checkAdvancedFunc())) {
      createToast('请先启用高级功能', 'pink');
      return;
    }
    try {
      const simSlot = await (await fetchWithTimeout("/api/sim_slot")).json();
      if (!(simSlot == null || simSlot == undefined)) {
        createToast('此插件只能在中兴版UFI后台设备上使用', 'red');
        return;
      }
    } catch { }
    await openModal();
  };

  const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
  while (!document.querySelector('.actions-buttons')) {
    await wait(120);
  }
  document.querySelector('.actions-buttons')?.appendChild(mainBtn);
})();
//</script>
