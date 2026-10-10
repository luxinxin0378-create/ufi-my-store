//<script>
(async () => {
  const TITLE = 'USB接外设/连电脑模式切换助手';
  const MODAL_NAME = 'kano_usb_mode_switch_modal';
  const STYLE_ID = 'kano_usb_mode_switch_style';
  const DEBUGFS_DIR = '/sys/kernel/debug';
  const SYSFS_MODE_FILE = '/sys/kernel/debug/25100000.dwc3/mode';
  const DATA_DIR = '/data/kano_usb_mode_switch';
  const TARGET_FILE = `${DATA_DIR}/target_mode`;
  const APPLY_SCRIPT = `${DATA_DIR}/apply.sh`;
  const APPLY_SCRIPT_VERSION = '2';
  const BOOT_FILE = '/sdcard/ufi_tools_boot.sh';
  const BOOT_LINE = `sh ${APPLY_SCRIPT} &`;
  const MAGISK_MODULE_ID = 'kano_usb_mode_boot';
  const MAGISK_MODULE_VERSION = '1.0.2';
  const MAGISK_MODULE_DIR = `/data/adb/modules/${MAGISK_MODULE_ID}`;
  const MAGISK_MODULE_UPDATE_DIR = `/data/adb/modules_update/${MAGISK_MODULE_ID}`;
  const MAGISK_MODULE_ZIP = `/data/local/tmp/${MAGISK_MODULE_ID}.zip`;
  const MAGISK_MODULE_B64 = 'UEsDBBQAAAAIAIeAQ11AbYm3hQAAAKoAAAALAAAAbW9kdWxlLnByb3A1js0KwjAQhO95inmC4s85BysePYn0WLbdlQTb3ZAmgm8vUTwOM3zfRPZPUhvrNo2rsYyTWXFKq/j7rcfVWHDRQDoLo2/dS/IWTf2+23WHfzobiz86qiVY/hIdyzbnmErbDhQLHpZxUs4WGc2C2da0SBuAlJGrogRB87YroJSWN36Uzn0AUEsDBBQAAAAIAIeAQ10GbYVBhgAAALsAAAAKAAAAc2VydmljZS5zaI3LQQrCMBAF0H1O8RtFdGGjrgriSUoJaTOaYNoJTqQWengXXsDlW7xNZWSRQqPp42QkqDnERGiht/sHlfziDFmk7pmLHXjMiQr5g0Z1gz5rdFd4VoAkooyL8jyR+qFRLY53GO+KM083sX1Lb0f2ZGWOZQjG5ZyWWgI6rCvoEwtOSsJfZae+UEsDBBQAAAAIAIeAQ12OL7vLJwAAACgAAAAMAAAAY3VzdG9taXplLnNoK04tiS9ILcpVUFLx9XcJcAzx0C9OLSrLTE7VK85QUjAAQXNTUy4AUEsBAhQAFAAAAAgAh4BDXUBtibeFAAAAqgAAAAsAAAAAAAAAAAAAAAAAAAAAAG1vZHVsZS5wcm9wUEsBAhQAFAAAAAgAh4BDXQZthUGGAAAAuwAAAAoAAAAAAAAAAAAAAAAArgAAAHNlcnZpY2Uuc2hQSwECFAAUAAAACACHgENdji+7yycAAAAoAAAADAAAAAAAAAAAAAAAAABcAQAAY3VzdG9taXplLnNoUEsFBgAAAAADAAMAqwAAAK0BAAAAAA==';

  const state = {
    busy: false,
    mode: 'unknown',
    nodeAvailable: false,
    bootEnabled: false,
    bootTarget: 'host',
    applyInstalled: false,
    applyVersion: '',
    magiskModuleInstalled: false,
    magiskModuleEnabled: false,
    magiskModulePending: false,
    magiskModuleVersion: '',
    refreshedAt: '',
  };

  const wait = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
  const shellQuote = (value = '') => `'${String(value).replace(/'/g, `'\\''`)}'`;
  const normalizeMode = (value = '') => {
    const text = String(value).trim().toLowerCase();
    const matched = text.match(/(?:^|\s)(host|device)(?=\s|$)/);
    return matched?.[1] || 'unknown';
  };
  const modeLabel = (mode) => {
    if (mode === 'host') return 'Host（主机）';
    if (mode === 'device') return 'Device（设备）';
    return '未知';
  };
  const run = async (command, timeout = 15000) => {
    try {
      const res = await runShellWithRoot(command, timeout);
      return {
        ok: Boolean(res?.success),
        text: String(res?.content || '').replace(/\r/g, '').trim(),
      };
    } catch (error) {
      return { ok: false, text: String(error?.message || error || '') };
    }
  };

  const DEBUGFS_MOUNT_COMMAND = `
if [ ! -e ${SYSFS_MODE_FILE} ]; then
  mount -t debugfs debugfs ${DEBUGFS_DIR}
fi
`;

  const applyScriptContent = `#!/system/bin/sh
# kano_usb_mode_switch_apply_version=${APPLY_SCRIPT_VERSION}
if [ ! -e ${SYSFS_MODE_FILE} ]; then
  mount -t debugfs debugfs ${DEBUGFS_DIR}
fi
case "$(head -n 1 ${TARGET_FILE} 2>/dev/null)" in
  host) echo host > ${SYSFS_MODE_FILE} ;;
  device) echo device > ${SYSFS_MODE_FILE} ;;
  *) exit 1 ;;
esac
`;

  const toBase64 = (value) => {
    if (typeof encodeBase64 === 'function') return encodeBase64(value);
    return btoa(value);
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .ums-wrap { display:flex; flex-direction:column; gap:12px; }
      #${MODAL_NAME} .ums-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
      #${MODAL_NAME} .ums-card { padding:12px 14px; border-radius:14px; border:1px solid rgba(255,255,255,.09); background:rgba(255,255,255,.04); }
      #${MODAL_NAME} .ums-label { font-size:.64rem; opacity:.72; margin-bottom:6px; }
      #${MODAL_NAME} .ums-value { font-size:.86rem; font-weight:800; word-break:break-word; }
      #${MODAL_NAME} .ums-title { font-size:.78rem; font-weight:800; margin-bottom:8px; }
      #${MODAL_NAME} .ums-tip { font-size:.66rem; line-height:1.7; opacity:.78; }
      #${MODAL_NAME} .ums-actions { display:flex; flex-wrap:wrap; gap:9px; margin-top:10px; }
      #${MODAL_NAME} button[data-active="true"] { background:var(--dark-btn-color-active); }
      #${MODAL_NAME} button:disabled { opacity:.5; cursor:not-allowed; }
      @media (max-width:520px) { #${MODAL_NAME} .ums-grid { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  };

  const setBusy = (busy) => {
    state.busy = Boolean(busy);
    const root = document.querySelector(`#${MODAL_NAME}`);
    root?.querySelectorAll('button').forEach((button) => {
      button.disabled = state.busy;
    });
  };

  const readState = async () => {
    const res = await run(`
${DEBUGFS_MOUNT_COMMAND}
if [ -e ${shellQuote(SYSFS_MODE_FILE)} ]; then
  echo 'NODE=1'
  printf 'MODE='
  timeout 2s awk '{print $0}' ${shellQuote(SYSFS_MODE_FILE)}
else
  echo 'NODE=0'
  echo 'MODE='
fi
if [ -f ${shellQuote(BOOT_FILE)} ] && grep -qF ${shellQuote(APPLY_SCRIPT)} ${shellQuote(BOOT_FILE)}; then echo 'HOOK=1'; else echo 'HOOK=0'; fi
if [ -f ${shellQuote(TARGET_FILE)} ]; then
  printf 'TARGET='
  timeout 2s awk 'NR == 1 {print $0; exit}' ${shellQuote(TARGET_FILE)}
else
  echo 'TARGET='
fi
if [ -f ${shellQuote(APPLY_SCRIPT)} ]; then
  echo 'APPLY=1'
  printf 'APPLY_VERSION='
  sed -n 's/^# kano_usb_mode_switch_apply_version=//p' ${shellQuote(APPLY_SCRIPT)} | head -n 1
else
  echo 'APPLY=0'
  echo 'APPLY_VERSION='
fi
MODULE_DIR=''
MODULE_PENDING=0
if [ -f ${shellQuote(`${MAGISK_MODULE_UPDATE_DIR}/module.prop`)} ]; then
  MODULE_DIR=${shellQuote(MAGISK_MODULE_UPDATE_DIR)}
  MODULE_PENDING=1
elif [ -f ${shellQuote(`${MAGISK_MODULE_DIR}/module.prop`)} ]; then
  MODULE_DIR=${shellQuote(MAGISK_MODULE_DIR)}
fi
if [ -n "$MODULE_DIR" ]; then
  echo 'MAGISK_MODULE=1'
  echo "MAGISK_MODULE_PENDING=$MODULE_PENDING"
  if [ -f "$MODULE_DIR/disable" ]; then echo 'MAGISK_MODULE_ENABLED=0'; else echo 'MAGISK_MODULE_ENABLED=1'; fi
  printf 'MAGISK_MODULE_VERSION='
  sed -n 's/^version=//p' "$MODULE_DIR/module.prop" | head -n 1
else
  echo 'MAGISK_MODULE=0'
  echo 'MAGISK_MODULE_PENDING=0'
  echo 'MAGISK_MODULE_ENABLED=0'
  echo 'MAGISK_MODULE_VERSION='
fi
`);
    const values = {};
    res.text.split('\n').forEach((line) => {
      const index = line.indexOf('=');
      if (index > 0) values[line.slice(0, index)] = line.slice(index + 1).trim();
    });
    state.nodeAvailable = values.NODE === '1';
    state.mode = normalizeMode(values.MODE);
    state.bootEnabled = values.HOOK === '1';
    const savedTarget = normalizeMode(values.TARGET);
    if (savedTarget !== 'unknown') state.bootTarget = savedTarget;
    state.applyInstalled = values.APPLY === '1';
    state.applyVersion = values.APPLY_VERSION || '';
    state.magiskModuleInstalled = values.MAGISK_MODULE === '1';
    state.magiskModuleEnabled = values.MAGISK_MODULE_ENABLED === '1';
    state.magiskModulePending = values.MAGISK_MODULE_PENDING === '1';
    state.magiskModuleVersion = values.MAGISK_MODULE_VERSION || '';
    state.refreshedAt = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    return res.ok && Object.prototype.hasOwnProperty.call(values, 'NODE');
  };

  const render = () => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    const setText = (selector, value) => {
      const el = root.querySelector(selector);
      if (el) el.textContent = value;
    };
    setText('#ums_current_mode', state.nodeAvailable ? modeLabel(state.mode) : '节点不存在');
    setText('#ums_node_status', state.nodeAvailable ? '可用' : '不可用');
    setText('#ums_boot_status', state.bootEnabled ? '已启用' : '未启用');
    setText('#ums_boot_target', modeLabel(state.bootTarget));
    const moduleStatus = !state.magiskModuleInstalled
      ? '未安装'
      : `${state.magiskModuleEnabled ? '已启用' : '已禁用'} · v${state.magiskModuleVersion || '未知'}${state.magiskModulePending ? '（待重启）' : ''}`;
    setText('#ums_magisk_status', moduleStatus);
    setText('#ums_refreshed_at', state.refreshedAt || '--');
    const nodeEl = root.querySelector('#ums_node_status');
    const bootEl = root.querySelector('#ums_boot_status');
    if (nodeEl) nodeEl.style.color = state.nodeAvailable ? '#9dffbf' : '#ff8f8f';
    if (bootEl) bootEl.style.color = state.bootEnabled ? '#9dffbf' : '#ffd08a';
    root.querySelector('#ums_host_btn')?.setAttribute('data-active', String(state.mode === 'host'));
    root.querySelector('#ums_device_btn')?.setAttribute('data-active', String(state.mode === 'device'));
    root.querySelector('#ums_target_host_btn')?.setAttribute('data-active', String(state.bootTarget === 'host'));
    root.querySelector('#ums_target_device_btn')?.setAttribute('data-active', String(state.bootTarget === 'device'));
    const bootToggle = root.querySelector('#ums_boot_toggle_btn');
    if (bootToggle) {
      bootToggle.textContent = state.bootEnabled ? '关闭开机自启' : '启用开机自启';
      bootToggle.setAttribute('data-active', String(state.bootEnabled));
    }
    const moduleButton = root.querySelector('#ums_magisk_install_btn');
    if (moduleButton) {
      moduleButton.textContent = state.magiskModuleInstalled ? '重新安装/更新增强自启动模块' : '安装增强自启动模块';
      moduleButton.setAttribute('data-active', String(state.magiskModuleInstalled && state.magiskModuleEnabled));
    }
    root.querySelectorAll('button').forEach((button) => {
      button.disabled = state.busy;
    });
  };

  const refresh = async (notify = false) => {
    setBusy(true);
    try {
      const ok = await readState();
      render();
      if (notify) {
        const message = ok
          ? (state.nodeAvailable ? 'USB 模式状态已刷新' : 'debugfs 已检查，但 USB 模式节点不存在')
          : '状态刷新失败，请检查 Root 权限';
        createToast(message, ok && state.nodeAvailable ? 'green' : 'red');
      }
    } finally {
      setBusy(false);
      render();
    }
  };

  const showHostLockoutWarning = () => new Promise((resolve) => {
    let countDown = 5;
    const { el, close } = createFixedToast(
      'ums_host_lockout_warning',
      `
        <div style="pointer-events:all;width:90vw;max-width:500px;">
          <div class="title" style="margin:0;color:#ffb3b3;">热点已关闭，存在失联风险</div>
          <div style="margin-top:12px;padding:12px;border-radius:12px;background:rgba(255,70,70,.12);border:1px solid rgba(255,90,90,.28);font-size:.72rem;line-height:1.8;">
            当前开机目标是 Host（接外设）模式，但设备热点处于关闭状态。<br /><br />
            如果继续安装增强自启动模块或启用开机自启，设备重启后可能只能通过网口连接；USB 和热点等其他访问方式可能都无法使用，严重时会导致设备失联。<br /><br />
            请确认你已经准备好可用的网口连接和恢复方案。
          </div>
          <div style="margin-top:12px;text-align:right;display:flex;justify-content:flex-end;gap:10px;">
            <button class="ums_host_risk_continue" disabled>请等待 ${countDown}s</button>
            <button class="ums_host_risk_cancel">取消</button>
          </div>
        </div>
      `,
    );
    const continueBtn = el.querySelector('.ums_host_risk_continue');
    const cancelBtn = el.querySelector('.ums_host_risk_cancel');
    const timer = setInterval(() => {
      countDown -= 1;
      if (!continueBtn) return;
      if (countDown > 0) {
        continueBtn.textContent = `请等待 ${countDown}s`;
        return;
      }
      clearInterval(timer);
      continueBtn.disabled = false;
      continueBtn.textContent = '我已知晓风险，继续';
    }, 1000);
    const done = (accepted) => {
      clearInterval(timer);
      close();
      resolve(accepted);
    };
    continueBtn?.addEventListener('click', () => done(true));
    cancelBtn?.addEventListener('click', () => done(false));
  });

  const confirmHostAutostartRisk = async () => {
    if (state.bootTarget !== 'host') return true;
    try {
      const { WiFiModuleSwitch } = await getData(new URLSearchParams({
        cmd: 'queryWiFiModuleSwitch,queryAccessPointInfo',
      }));
      if (String(WiFiModuleSwitch) === '1') return true;
    } catch (error) {
      console.warn('查询热点开关状态失败，将显示 Host 自启风险警告：', error);
    }
    return showHostLockoutWarning();
  };

  const switchMode = async (mode) => {
    if (mode !== 'host' && mode !== 'device') return;
    setBusy(true);
    createToast(`正在切换到 ${modeLabel(mode)}...`, 'pink');
    try {
      const switchCommand = mode === 'host'
        ? 'echo host > /sys/kernel/debug/25100000.dwc3/mode'
        : 'echo device > /sys/kernel/debug/25100000.dwc3/mode';
      const writeRes = await run(switchCommand);
      await readState();
      if (writeRes.ok) {
        createToast(`已切换到 ${modeLabel(mode)}`, 'green');
      } else {
        createToast('切换失败：设备节点不可写或当前内核不支持', 'red', 5000);
      }
    } finally {
      setBusy(false);
      render();
    }
  };

  const saveBootTarget = async (mode, notify = true) => {
    if (mode !== 'host' && mode !== 'device') return false;
    const res = await run(`
set -e
mkdir -p ${shellQuote(DATA_DIR)}
printf '%s\\n' ${shellQuote(mode)} > ${shellQuote(TARGET_FILE)}
chmod 700 ${shellQuote(DATA_DIR)}
chmod 600 ${shellQuote(TARGET_FILE)}
`);
    if (res.ok) state.bootTarget = mode;
    if (notify) createToast(res.ok ? `开机目标已设为 ${modeLabel(mode)}` : '保存开机目标失败', res.ok ? 'green' : 'red');
    return res.ok;
  };

  const writeApplyScript = async () => {
    const encodedScript = toBase64(applyScriptContent);
    if (!encodedScript) return false;
    const res = await run(`
mkdir -p ${shellQuote(DATA_DIR)}
TMP_SCRIPT=${shellQuote(`${APPLY_SCRIPT}.tmp`)}
rm -f "$TMP_SCRIPT"
if ! printf '%s' ${shellQuote(encodedScript)} | base64 -d > "$TMP_SCRIPT"; then
  rm -f "$TMP_SCRIPT"
  exit 1
fi
if ! grep -qxF '# kano_usb_mode_switch_apply_version=${APPLY_SCRIPT_VERSION}' "$TMP_SCRIPT"; then
  rm -f "$TMP_SCRIPT"
  exit 1
fi
if ! chmod 700 ${shellQuote(DATA_DIR)} "$TMP_SCRIPT"; then
  rm -f "$TMP_SCRIPT"
  exit 1
fi
if ! mv "$TMP_SCRIPT" ${shellQuote(APPLY_SCRIPT)}; then
  rm -f "$TMP_SCRIPT"
  exit 1
fi
`, 15000);
    return res.ok;
  };

  const updateDependenciesIfNeeded = async () => {
    if ((!state.bootEnabled && !state.applyInstalled) || state.applyVersion === APPLY_SCRIPT_VERSION) return;
    setBusy(true);
    createToast('检测到依赖版本更新，正在自动更新依赖中...', 'pink', 5000);
    try {
      const ok = await writeApplyScript();
      await readState();
      createToast(ok ? '开机自启依赖已自动更新' : '开机自启依赖自动更新失败', ok ? 'green' : 'red', 5000);
    } finally {
      setBusy(false);
      render();
    }
  };

  const enableBoot = async () => {
    const targetOk = await saveBootTarget(state.bootTarget, false);
    if (!targetOk) return false;
    const scriptOk = await writeApplyScript();
    if (!scriptOk) return false;
    const res = await run(`
set -e
mkdir -p ${shellQuote(DATA_DIR)}
touch ${shellQuote(BOOT_FILE)}
sed -i '/kano_usb_mode_switch/d' ${shellQuote(BOOT_FILE)}
printf '%s\\n' ${shellQuote(BOOT_LINE)} >> ${shellQuote(BOOT_FILE)}
for MODULE_PATH in ${shellQuote(MAGISK_MODULE_DIR)} ${shellQuote(MAGISK_MODULE_UPDATE_DIR)}; do
  if [ -d "$MODULE_PATH" ]; then
    rm -f "$MODULE_PATH/disable"
  fi
done
true
`, 20000);
    return res.ok;
  };

  const disableBoot = async () => {
    const res = await run(`
STATUS=0
if [ -f ${shellQuote(BOOT_FILE)} ]; then
  sed -i '/kano_usb_mode_switch/d' ${shellQuote(BOOT_FILE)} || STATUS=1
fi
for MODULE_PATH in ${shellQuote(MAGISK_MODULE_DIR)} ${shellQuote(MAGISK_MODULE_UPDATE_DIR)}; do
  [ ! -d "$MODULE_PATH" ] || touch "$MODULE_PATH/disable" || STATUS=1
done
rm -f ${shellQuote(`${BOOT_FILE}.kano_usb_mode.tmp`)} || STATUS=1
rm -rf ${shellQuote(DATA_DIR)} || STATUS=1
exit "$STATUS"
`, 15000);
    return res.ok;
  };

  const installMagiskModule = async () => {
    setBusy(true);
    const acceptedRisk = await confirmHostAutostartRisk();
    if (!acceptedRisk) {
      setBusy(false);
      render();
      return;
    }
    createToast('正在检查 Magisk 环境并安装增强自启动模块...', 'pink', 6000);
    try {
      const moduleAction = state.bootEnabled
        ? 'rm -f "$MODULE_PATH/disable"'
        : 'touch "$MODULE_PATH/disable"';
      const res = await run(`
if ! command -v magisk >/dev/null 2>&1; then
  echo '__NO_MAGISK__'
  exit 127
fi
mkdir -p /data/local/tmp || exit 1
if ! printf '%s' ${shellQuote(MAGISK_MODULE_B64)} | base64 -d > ${shellQuote(MAGISK_MODULE_ZIP)}; then
  rm -f ${shellQuote(MAGISK_MODULE_ZIP)}
  exit 1
fi
magisk --install-module ${shellQuote(MAGISK_MODULE_ZIP)}
STATUS=$?
rm -f ${shellQuote(MAGISK_MODULE_ZIP)}
if [ "$STATUS" -ne 0 ]; then
  for MODULE_PATH in ${shellQuote(MAGISK_MODULE_DIR)} ${shellQuote(MAGISK_MODULE_UPDATE_DIR)}; do
    [ ! -d "$MODULE_PATH" ] || touch "$MODULE_PATH/disable"
  done
  exit "$STATUS"
fi
for MODULE_PATH in ${shellQuote(MAGISK_MODULE_DIR)} ${shellQuote(MAGISK_MODULE_UPDATE_DIR)}; do
  [ ! -d "$MODULE_PATH" ] || ${moduleAction}
done
echo '__MODULE_INSTALLED__'
`, 300000);
      await readState();
      if (res.text.includes('__NO_MAGISK__')) {
        createToast('未检测到 Magisk 环境，无法安装增强自启动模块', 'red', 7000);
      } else if (res.ok && res.text.includes('__MODULE_INSTALLED__')) {
        const suffix = state.bootEnabled ? '重启后生效' : '当前开机自启未开启，模块已保持禁用';
        createToast(`增强自启动模块安装成功，${suffix}`, 'green', 7000);
      } else {
        createToast(`增强自启动模块安装失败${res.text ? `：${res.text}` : ''}`, 'red', 7000);
      }
    } finally {
      setBusy(false);
      render();
    }
  };

  const toggleBoot = async () => {
    setBusy(true);
    if (!state.bootEnabled) {
      const acceptedRisk = await confirmHostAutostartRisk();
      if (!acceptedRisk) {
        setBusy(false);
        render();
        return;
      }
    }
    createToast(state.bootEnabled ? '正在关闭 USB 模式开机自启...' : '正在启用 USB 模式开机自启...', 'pink');
    try {
      const wasEnabled = state.bootEnabled;
      const ok = wasEnabled ? await disableBoot() : await enableBoot();
      if (!wasEnabled && !ok) await disableBoot();
      await readState();
      createToast(
        ok && state.bootEnabled !== wasEnabled
          ? (state.bootEnabled ? `已启用，开机切换到 ${modeLabel(state.bootTarget)}` : '已关闭开机自启')
          : '开机自启设置失败，请检查存储权限',
        ok && state.bootEnabled !== wasEnabled ? 'green' : 'red',
        5000,
      );
    } finally {
      setBusy(false);
      render();
    }
  };

  const chooseBootTarget = async (mode) => {
    setBusy(true);
    try {
      if (state.bootEnabled) {
        await saveBootTarget(mode);
        await readState();
      } else {
        state.bootTarget = mode;
        createToast(`开机目标已设为 ${modeLabel(mode)}`, 'green');
      }
    } finally {
      setBusy(false);
      render();
    }
  };

  const openModal = async () => {
    ensureStyle();
    document.querySelector(`#${MODAL_NAME}`)?.remove();
    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '620px',
      contentStyle: 'max-height:72vh;',
      showConfirm: false,
      onClose: () => true,
      content: `
        <div class="ums-wrap">
          <div class="ums-grid">
            <div class="ums-card"><div class="ums-label">当前 USB 模式</div><div class="ums-value" id="ums_current_mode">读取中...</div></div>
            <div class="ums-card"><div class="ums-label">内核模式节点</div><div class="ums-value" id="ums_node_status">读取中...</div></div>
            <div class="ums-card"><div class="ums-label">开机自启</div><div class="ums-value" id="ums_boot_status">读取中...</div></div>
            <div class="ums-card"><div class="ums-label">开机目标模式</div><div class="ums-value" id="ums_boot_target">读取中...</div></div>
          </div>
          <div class="ums-card">
            <div class="ums-title">立即切换</div>
            <div class="ums-tip">切换会立即执行，USB 连接可能会短暂断开。</div>
            <div class="ums-actions">
              <button id="ums_host_btn">切换到 Host</button>
              <button id="ums_device_btn">切换到 Device</button>
              <button id="ums_refresh_btn">刷新状态</button>
            </div>
          </div>
          <div class="ums-card">
            <div class="ums-title">开机自动切换</div>
            <div class="ums-tip">先选择目标模式，再启用自启。</div>
            <div class="ums-actions">
              <button id="ums_target_host_btn">目标：Host</button>
              <button id="ums_target_device_btn">目标：Device</button>
              <button id="ums_boot_toggle_btn">启用开机自启</button>
            </div>
          </div>
          <div class="ums-card">
            <div class="ums-title">增强开机自启动（Magisk）</div>
            <div class="ums-tip">需要设备已安装 Magisk。模块会等待系统完全启动，再调用同一个 USB 模式切换脚本；关闭上方开机自启时，模块也会同步禁用。</div>
            <div class="ums-tip" style="margin-top:7px;">模块状态：<span id="ums_magisk_status">读取中...</span> · 内置版本 ${MAGISK_MODULE_VERSION}</div>
            <div class="ums-actions">
              <button id="ums_magisk_install_btn">安装增强自启动模块</button>
            </div>
          </div>
          <div class="ums-tip">状态刷新时间：<span id="ums_refreshed_at">--</span></div>
        </div>
      `,
    });
    el.style.width = '94%';
    el.querySelector('#ums_host_btn').onclick = async () => switchMode('host');
    el.querySelector('#ums_device_btn').onclick = async () => switchMode('device');
    el.querySelector('#ums_refresh_btn').onclick = async () => refresh(true);
    el.querySelector('#ums_target_host_btn').onclick = async () => chooseBootTarget('host');
    el.querySelector('#ums_target_device_btn').onclick = async () => chooseBootTarget('device');
    el.querySelector('#ums_boot_toggle_btn').onclick = async () => toggleBoot();
    el.querySelector('#ums_magisk_install_btn').onclick = async () => installMagiskModule();
    showModal(id);
    await refresh(false);
    await updateDependenciesIfNeeded();
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

  while (!document.querySelector('.actions-buttons')) await wait(120);
  document.querySelector('.actions-buttons')?.appendChild(mainBtn);
})();
//</script>
