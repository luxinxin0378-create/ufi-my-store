//<script>
(async () => {
  const SCRIPT_NAME = '5555.sh';
  const SCRIPT_DIR = '/data/kano_5555_control';
  const SCRIPT_PATH = `${SCRIPT_DIR}/${SCRIPT_NAME}`;
  const BOOT_SH_FILE = '/sdcard/ufi_tools_boot.sh';
  const IFACE = 'br0';
  const PORT = '5555';
  const ACTIVE_TEXT = '仅允许本机访问无线ADB';
  const STYLE_ID = 'kano_wireless_adb_guard_style';
  const BOOT_LINE = `sh ${SCRIPT_PATH} 1 ${IFACE} ${PORT} &`;
  const SCRIPT_CONTENT = `#!/system/bin/sh

ACTION="\${1:-1}"     # 1=enable restriction, 0=restore
IFACE="\${2:-br0}"
PORT="\${3:-5555}"
IPT="\${IPT:-iptables}"

SELF_IP="$(
  ip -4 addr show dev "$IFACE" 2>/dev/null \
  | awk '/inet / {print $2}' \
  | cut -d/ -f1 \
  | head -n1
)"

SUBNET="$(
  ip route show dev "$IFACE" 2>/dev/null \
  | awk '/scope link/ {print $1; exit}'
)"

if [ -z "$SELF_IP" ] || [ -z "$SUBNET" ]; then
  echo "请确认 $IFACE 已正确配置 IP 地址，并且路由表中有对应的接口" >&2
  exit 1
fi

$IPT -D INPUT -p tcp -s "$SELF_IP" -d "$SELF_IP" --dport "$PORT" -j ACCEPT 2>/dev/null
$IPT -D INPUT -p tcp -s "$SUBNET" --dport "$PORT" -j DROP 2>/dev/null

if [ "$ACTION" = "1" ]; then
  $IPT -I INPUT 1 -p tcp -s "$SELF_IP" -d "$SELF_IP" --dport "$PORT" -j ACCEPT
  $IPT -I INPUT 2 -p tcp -s "$SUBNET" --dport "$PORT" -j DROP
  echo "已启用：只有 $SELF_IP 可以访问 :$PORT"
else
  echo "已还原：所有 IP 都可以访问 :$PORT"
fi
`;

  const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
  const shellQuote = (value) => `'${String(value || '').replace(/'/g, `'\\''`)}'`;
  const run = async (command, timeout = 30000) => {
    const res = await runShellWithRoot(command, timeout);
    return {
      ok: Boolean(res?.success),
      text: String(res?.content || '').trim(),
      raw: res,
    };
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .kano-wireless-adb-btn.is-active {
        background: var(--dark-btn-color-active);
      }
    `;
    document.head.appendChild(style);
  };

  const checkRoot = async () => {
    try {
      const res = await run('whoami');
      return res.ok && res.text.includes('root');
    } catch {
      return false;
    }
  };

  const uploadFile = async (filename, content, destPath) => {
    try {
      const file = new File([content], filename, { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await (await fetch(`${KANO_baseURL}/upload_img`, {
        method: 'POST',
        headers: common_headers,
        body: formData,
      })).json();
      if (!uploadRes?.url) return false;
      const tempPath = `/data/data/com.minikano.f50_sms/files${uploadRes.url}`;
      const moveRes = await run(`mv ${shellQuote(tempPath)} ${shellQuote(destPath)} && chmod 755 ${shellQuote(destPath)}`, 20000);
      return moveRes.ok;
    } catch {
      return false;
    }
  };

  const ensureScript = async () => {
    const mkdirRes = await run(`mkdir -p ${shellQuote(SCRIPT_DIR)}`, 10000);
    if (!mkdirRes.ok) return false;
    const exists = await run(`[ -s ${shellQuote(SCRIPT_PATH)} ] && echo OK || echo MISS`);
    if (exists.text === 'OK') {
      await run(`chmod 755 ${shellQuote(SCRIPT_PATH)}`, 10000);
      return true;
    }
    return uploadFile(SCRIPT_NAME, SCRIPT_CONTENT, SCRIPT_PATH);
  };

  const enableBootStart = async () => {
    const res = await run(`touch ${shellQuote(BOOT_SH_FILE)} && grep -qxF ${shellQuote(BOOT_LINE)} ${shellQuote(BOOT_SH_FILE)} || echo ${shellQuote(BOOT_LINE)} >> ${shellQuote(BOOT_SH_FILE)}`, 20000);
    return res.ok;
  };

  const disableBootStart = async () => {
    const res = await run(`touch ${shellQuote(BOOT_SH_FILE)} && sed -i '\\#^sh ${SCRIPT_PATH.replace(/\//g, '\\/')} 1 ${IFACE} ${PORT} &$#d' ${shellQuote(BOOT_SH_FILE)}`, 20000);
    return res.ok;
  };

  const getCurrentState = async () => {
    const cmd = `
IFACE=${shellQuote(IFACE)}
PORT=${shellQuote(PORT)}
IPT="\${IPT:-iptables}"
SELF_IP="$(
  ip -4 addr show dev "$IFACE" 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 | head -n1
)"
SUBNET="$(
  ip route show dev "$IFACE" 2>/dev/null | awk '/scope link/ {print $1; exit}'
)"
if [ -z "$SELF_IP" ] || [ -z "$SUBNET" ]; then
  echo "__STATE_ERROR__"
  exit 1
fi
if $IPT -C INPUT -p tcp -s "$SELF_IP" -d "$SELF_IP" --dport "$PORT" -j ACCEPT >/dev/null 2>&1 \
  && $IPT -C INPUT -p tcp -s "$SUBNET" --dport "$PORT" -j DROP >/dev/null 2>&1; then
  echo "ON"
else
  echo "OFF"
fi
`;
    const res = await run(cmd, 15000);
    if (!res.ok || res.text.includes('__STATE_ERROR__')) {
      return { ok: false, enabled: false, message: res.text || `未能读取 ${IFACE} 状态` };
    }
    return { ok: true, enabled: res.text.includes('ON') };
  };

  const setButtonState = (btn, enabled, busy = false) => {
    btn.disabled = busy;
    btn.classList.toggle('is-active', enabled);
    btn.textContent = ACTIVE_TEXT;
    btn.style.opacity = busy ? '.72' : '1';
  };

  const applyToggle = async (enable) => {
    const res = await run(`sh ${shellQuote(SCRIPT_PATH)} ${enable ? '1' : '0'} ${shellQuote(IFACE)} ${shellQuote(PORT)}`, 20000);
    if (!res.ok) {
      return { ok: false, message: res.text || (enable ? '启用失败' : '关闭失败') };
    }
    const bootOk = enable ? await enableBootStart() : await disableBootStart();
    if (!bootOk) {
      return { ok: false, message: enable ? '已执行限制，但写入开机自启失败' : '已关闭限制，但移除开机自启失败' };
    }
    const state = await getCurrentState();
    if (!state.ok) {
      return { ok: false, message: state.message || '状态刷新失败' };
    }
    return {
      ok: true,
      enabled: state.enabled,
      message: res.text || (state.enabled ? '已启用并写入开机自启' : '已关闭并取消开机自启'),
    };
  };

  ensureStyle();

  const btn = document.createElement('button');
  btn.className = 'kano-wireless-adb-btn';
  setButtonState(btn, false, true);

  btn.onclick = async () => {
    if (!(await checkRoot())) {
      createToast('请先启用高级功能', 'red');
      return;
    }
    const previousState = btn.classList.contains('is-active');
    setButtonState(btn, previousState, true);
    if (!(await ensureScript())) {
      setButtonState(btn, previousState, false);
      createToast('传输 5555.sh 失败', 'red', 5000);
      return;
    }
    const enable = !previousState;
    const result = await applyToggle(enable);
    setButtonState(btn, result.ok ? result.enabled : previousState, false);
    createToast(result.message || (result.ok ? '操作完成' : '操作失败'), result.ok ? 'green' : 'red', 5000);
  };

  while (!document.querySelector('.actions-buttons')) {
    await wait(150);
  }
  document.querySelector('.actions-buttons')?.appendChild(btn);

  if (!(await checkRoot())) {
    setButtonState(btn, false, false);
    return;
  }

  if (requestInterval) {
    let fn = requestInterval(async () => {
      if (window.UFI_DATA.loginfo == 'ok') {
        const initialState = await getCurrentState();
        setButtonState(btn, initialState.ok ? initialState.enabled : false, false);
        if (!initialState.ok && initialState.message) {
          createToast(initialState.message, 'pink', 4000);
        }
        fn && fn();
      }
    }, 300);
  }

})();
//</script>
