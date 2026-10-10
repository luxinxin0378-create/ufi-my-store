//<script>
(async () => {
  const MODAL_NAME = 'kano_agh_modal';
  const STYLE_ID = 'kano_agh_style';
  const TITLE = 'ADGuard Home';

  const AGH_DIR = '/data/agh';
  const ZIP_FILE = '/data/kano_ad_guard_home.zip';
  const DOWNLOAD_LOG = '/data/agh_install_download.dlog';
  const INSTALL_SCRIPT = '/data/adg_customize.sh';
  const BOOT_SH_FILE = '/sdcard/ufi_tools_boot.sh';
  const BOOT_COMMAND = 'sh /data/agh/boot.sh &';
  const START_SCRIPT = 'sh /data/agh/boot.sh';
  const ACTION_SCRIPT = '/data/agh/action.sh';
  const CONFIG_FILE = '/data/agh/agh/bin/AdGuardHome.yaml';
  const UPLOADS_DIR = '/data/data/com.minikano.f50_sms/files/uploads';
  const CURL_BIN = '/data/data/com.minikano.f50_sms/files/curl';
  const DOWNLOAD_URL = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/kano_ad_guard_home.zip';

  const wait = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
  const run = async (cmd, timeout) => await runShellWithRoot(cmd, timeout);
  const cleanText = (v) => String(v || '').trim();

  const state = {
    busy: false,
    uninstallClicks: 0,
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .agh-shell {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      #${MODAL_NAME} .agh-hero {
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
      #${MODAL_NAME} .agh-hero-title {
        margin: 0 0 6px;
        font-size: 1rem;
        font-weight: 800;
        letter-spacing: 0.02em;
      }
      #${MODAL_NAME} .agh-hero-sub {
        font-size: .7rem;
        line-height: 1.7;
        opacity: .9;
      }
      #${MODAL_NAME} .agh-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      #${MODAL_NAME} .agh-card,
      #${MODAL_NAME} .agh-status-panel,
      #${MODAL_NAME} .agh-action-panel {
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.035);
        backdrop-filter: blur(12px);
      }
      #${MODAL_NAME} .agh-card {
        padding: 10px 12px;
      }
      #${MODAL_NAME} .agh-card-label {
        font-size: .64rem;
        opacity: .72;
        margin-bottom: 6px;
      }
      #${MODAL_NAME} .agh-card-sub {
        margin-top: 6px;
        font-size: .62rem;
        line-height: 1.45;
        opacity: .76;
      }
      #${MODAL_NAME} .agh-card-value {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: .86rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .agh-card-value--between {
        justify-content: space-between;
      }
      #${MODAL_NAME} .agh-chip {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: .64rem;
        font-weight: 700;
      }
      #${MODAL_NAME} .agh-chip[data-kind="on"] {
        color: #08270f;
        background: #9cf6b6;
      }
      #${MODAL_NAME} .agh-chip[data-kind="off"] {
        color: #ffe2e2;
        background: rgba(255, 107, 107, 0.18);
      }
      #${MODAL_NAME} .agh-chip[data-kind="warn"] {
        color: #ffeec7;
        background: rgba(255, 196, 87, 0.18);
      }
      #${MODAL_NAME} .agh-switch {
        position: relative;
        width: 52px;
        height: 30px;
        border: 0;
        padding: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.15);
        transition: background .2s ease, opacity .2s ease;
      }
      #${MODAL_NAME} .agh-switch::after {
        content: '';
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
      #${MODAL_NAME} .agh-switch[data-on="1"] {
            background: linear-gradient(90deg, var(--dark-btn-color), var(--dark-btn-color-active));
      }
      #${MODAL_NAME} .agh-switch[data-on="1"]::after {
        transform: translateX(22px);
      }
      #${MODAL_NAME} .agh-switch:disabled {
        opacity: .45;
      }
      #${MODAL_NAME} .agh-status-panel,
      #${MODAL_NAME} .agh-action-panel {
        padding: 14px;
      }
      #${MODAL_NAME} .agh-panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
      }
      #${MODAL_NAME} .agh-panel-title {
        font-size: .78rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .agh-panel-tip {
        font-size: .64rem;
        opacity: .72;
      }
      #${MODAL_NAME} .agh-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      #${MODAL_NAME} .agh-actions button {
        min-height: 30px;
        font-size: .66rem;
        white-space: normal;
      }
      #${MODAL_NAME} .agh-progress-shell {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #${MODAL_NAME} .agh-progress-shell[hidden] {
        display: none !important;
      }
      #${MODAL_NAME} .agh-progress-text {
        font-size: .68rem;
        line-height: 1.6;
        word-break: break-all;
      }
      #${MODAL_NAME} .agh-progress-track {
        width: 100%;
        height: 10px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.09);
      }
      #${MODAL_NAME} .agh-progress-bar {
        width: 0%;
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #58d68d, #7be0ff);
        transition: width .2s ease;
      }
      #${MODAL_NAME} .agh-log {
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
      #${MODAL_NAME} .agh-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: .66rem;
        line-height: 1.6;
        opacity: .82;
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} .agh-grid,
        #${MODAL_NAME} .agh-actions {
          grid-template-columns: 1fr;
        }
        #${MODAL_NAME} .agh-action-panel .agh-actions {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        #${MODAL_NAME} .agh-actions button {
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
    const res = await run(`[ -x "${ACTION_SCRIPT}" ] && echo 1 || echo 0`);
    return res?.success && cleanText(res.content) === '1';
  };

  const isRunning = async () => {
    const res = await run(`pgrep -f 'AdGuardHome|/data/agh/boot.sh'`);
    return !!(res?.success && cleanText(res.content));
  };

  const isBootEnabled = async () => {
    const res = await run(`grep -qxF '${BOOT_COMMAND}' "${BOOT_SH_FILE}" && echo 1 || echo 0`);
    return res?.success && cleanText(res.content).split('\n').pop() === '1';
  };

  const getDirSizeBytes = async (path) => {
    const res = await run(`[ -d "${path}" ] && du -sb "${path}" 2>/dev/null | awk '{print $1}' || echo 0`, 10000);
    if (!res?.success) return 0;
    const n = parseInt(cleanText(res.content), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const getRemoteSize = async () => {
    const res = await run(
      `env SSL_CERT_DIR=/system/etc/security/cacerts ${CURL_BIN} -L -sI "${DOWNLOAD_URL}" | awk 'BEGIN{IGNORECASE=1}/^Content-Length:/{gsub("\\r","",$2);print $2}' | tail -n 1`,
      15000,
    );
    if (!res?.success) return 0;
    const n = parseInt(cleanText(res.content), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const getFileSize = async (path) => {
    const res = await run(`[ -f "${path}" ] && stat -c%s "${path}" || echo 0`);
    if (!res?.success) return 0;
    const n = parseInt(cleanText(res.content), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const getPanelRoot = () => document.querySelector(`#${MODAL_NAME}`);

  const updateProgress = (text, percent = 0, detail = '') => {
    const root = getPanelRoot();
    if (!root) return;
    const panel = root.querySelector('#agh_progress_shell');
    const textEl = root.querySelector('#agh_progress_text');
    const bar = root.querySelector('#agh_progress_bar');
    const log = root.querySelector('#agh_progress_log');
    if (panel) panel.hidden = false;
    if (textEl) textEl.textContent = text || '处理中...';
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
    if (log && detail) log.textContent = detail;
  };

  const hideProgress = () => {
    const root = getPanelRoot();
    if (!root) return;
    const panel = root.querySelector('#agh_progress_shell');
    if (panel) panel.hidden = true;
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
    const log = root?.querySelector('#agh_progress_log');
    if (log) log.textContent = text || '等待操作...';
  };

  const ensureRootOrToast = async () => {
    if (await checkRoot()) return true;
    createToast('没有开启高级功能，无法使用！', 'red');
    return false;
  };

  const refreshStatus = async () => {
    const root = getPanelRoot();
    if (!root) return;

    const [installed, running, bootEnabled, dirSize] = await Promise.all([
      isInstalled(),
      isRunning(),
      isBootEnabled(),
      getDirSizeBytes(AGH_DIR),
    ]);

    const installedEl = root.querySelector('#agh_installed');
    const sizeEl = root.querySelector('#agh_size');
    const runningEl = root.querySelector('#agh_running');
    const runningSwitch = root.querySelector('#agh_running_switch');
    const bootEl = root.querySelector('#agh_boot');
    const bootSwitch = root.querySelector('#agh_boot_switch');
    const addressEl = root.querySelector('#agh_address');
    const installBtn = root.querySelector('#agh_install_btn');
    const toggleBtn = root.querySelector('#agh_toggle_btn');
    const restartBtn = root.querySelector('#agh_restart_btn');
    const openBtn = root.querySelector('#agh_open_btn');
    const exportBtn = root.querySelector('#agh_export_btn');

    if (installedEl) {
      installedEl.textContent = installed ? '已安装' : '未安装';
      installedEl.dataset.kind = installed ? 'on' : 'off';
    }
    if (sizeEl) {
      sizeEl.textContent = `目录占用：${installed ? formatBytes(dirSize, true).replaceAll("&nbsp;", "").trim() : '-'}`;
    }
    if (runningEl) {
      runningEl.textContent = running ? '运行中' : '已停止';
      runningEl.dataset.kind = running ? 'on' : 'warn';
    }
    if (runningSwitch) {
      runningSwitch.dataset.on = running ? '1' : '0';
      runningSwitch.setAttribute('aria-checked', running ? 'true' : 'false');
      runningSwitch.disabled = state.busy || !installed;
      runningSwitch.title = installed ? (running ? '点击停止服务' : '点击启动服务') : '请先安装 ADGuard Home';
    }
    if (bootEl) {
      bootEl.textContent = bootEnabled ? '已启用' : '未启用';
      bootEl.dataset.kind = bootEnabled ? 'on' : 'off';
    }
    if (bootSwitch) {
      bootSwitch.dataset.on = bootEnabled ? '1' : '0';
      bootSwitch.setAttribute('aria-checked', bootEnabled ? 'true' : 'false');
      bootSwitch.disabled = state.busy || !installed;
      bootSwitch.title = installed ? (bootEnabled ? '点击关闭开机启动' : '点击开启开机启动') : '请先安装 ADGuard Home';
    }
    if (addressEl) {
      addressEl.textContent = installed ? `管理页：${location.protocol}//${location.hostname}:3000` : '管理页：安装后可用';
    }
    if (installBtn) installBtn.textContent = installed ? '卸载 ADGuard Home' : '安装 ADGuard Home';
    if (toggleBtn) toggleBtn.textContent = running ? '停止服务' : '启动服务';
    if (toggleBtn) toggleBtn.disabled = state.busy || !installed;
    if (restartBtn) restartBtn.disabled = state.busy || !installed;
    if (openBtn) openBtn.disabled = !installed;
    if (exportBtn) exportBtn.disabled = !installed;
  };

  const toggleBootEnabled = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 ADGuard Home！', 'red');
      return;
    }

    setBusy(true);
    try {
      const enabled = await isBootEnabled();
      if (enabled) {
        await run(`sed -i '/agh.*boot.sh/d' "${BOOT_SH_FILE}"`);
        createToast('已取消开机自启', 'green');
      } else {
        await run(`grep -qxF '${BOOT_COMMAND}' "${BOOT_SH_FILE}" || echo '${BOOT_COMMAND}' >> "${BOOT_SH_FILE}"`);
        createToast('已设置开机自启', 'green');
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const toggleRunningEnabled = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 ADGuard Home！', 'red');
      return;
    }

    setBusy(true);
    try {
      const running = await isRunning();
      if (running) {
        updateProgress('正在停止 ADGuard Home...', 60);
        const res = await run(`"${ACTION_SCRIPT}" stop`);
        updateProgress('服务已停止', 100, cleanText(res?.content));
        createToast('已停止 ADGuard Home', 'green', 5000);
      } else {
        updateProgress('正在启动 ADGuard Home...', 60);
        const res = await run(`${START_SCRIPT}`);
        updateProgress('服务已启动', 100, cleanText(res?.content));
        createToast('已启动 ADGuard Home', 'green', 5000);
      }
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const downloadPackageWithProgress = async () => {
    await run(`rm -f "${DOWNLOAD_LOG}" "${ZIP_FILE}"`);

    updateProgress('正在获取下载信息...', 0);
    const totalSize = await getRemoteSize();
    if (totalSize > 0) {
      updateProgress(`正在下载 ADGuard Home... 0% (0 B / ${formatBytes(totalSize)})`, 0);
    } else {
      updateProgress('正在下载 ADGuard Home...', 0);
    }

    const startRes = await run(
      `env SSL_CERT_DIR=/system/etc/security/cacerts ${CURL_BIN} -L "${DOWNLOAD_URL}" -o "${ZIP_FILE}" --write-out "DOWNLOAD_DONE\\n" > "${DOWNLOAD_LOG}" 2>&1 &`,
      10000,
    );
    if (!startRes?.success) return { ok: false, message: '下载任务启动失败' };

    let done = false;
    let lastPercent = 0;
    for (let i = 0; i < 600; i++) {
      const [logRes, size] = await Promise.all([
        run(`timeout 2s awk '{print}' "${DOWNLOAD_LOG}"`),
        getFileSize(ZIP_FILE),
      ]);

      if (totalSize > 0) {
        const percent = Math.max(0, Math.min(100, Math.floor((size * 100) / totalSize)));
        if (percent >= lastPercent) {
          lastPercent = percent;
          updateProgress(
            `正在下载 ADGuard Home... ${percent}% (${formatBytes(size)} / ${formatBytes(totalSize)})`,
            percent,
            cleanText(logRes?.content),
          );
        }
      } else {
        updateProgress(`正在下载 ADGuard Home... 已下载 ${formatBytes(size)}`, 0, cleanText(logRes?.content));
      }

      if (String(logRes?.content || '').includes('DOWNLOAD_DONE')) {
        done = true;
        break;
      }
      await wait(1000);
    }

    await run(`rm -f "${DOWNLOAD_LOG}"`);
    if (!done) return { ok: false, message: '下载超时' };
    return { ok: true };
  };

  const installPlugin = async () => {
    if (!(await ensureRootOrToast())) return;
    const bootRes = await run(`timeout 2s awk '{print}' "${BOOT_SH_FILE}"`);
    if (String(bootRes?.content || '').includes('agh/boot.sh')) {
      createToast('ADGuard 已经启用啦~', 'red', 5000);
      return;
    }

    setBusy(true);
    try {
      setLogText('准备安装...');

      const downloaded = await downloadPackageWithProgress();
      if (!downloaded.ok) {
        createToast(downloaded.message, 'red');
        return;
      }

      updateProgress('下载完成，正在清理旧文件...', 92);
      await run(`rm -rf "${AGH_DIR}" && rm -f "${INSTALL_SCRIPT}"`);

      updateProgress('正在解压安装脚本...', 94);
      const unzipRes = await run(`cd /data && unzip -o "${ZIP_FILE}" "adg_customize.sh" -d /data >/dev/null 2>&1`);
      if (!unzipRes?.success) {
        createToast('解压安装脚本失败', 'red');
        return;
      }

      updateProgress('正在校验安装脚本...', 96);
      const checkRes = await run(`ls /data`);
      if (!checkRes?.success || !String(checkRes.content || '').includes('adg_customize.sh')) {
        createToast('检查安装脚本失败', 'red');
        return;
      }

      updateProgress('正在设置脚本权限...', 97);
      const chmodRes = await run(`chmod 777 "${INSTALL_SCRIPT}"`);
      if (!chmodRes?.success) {
        createToast('设置脚本权限失败', 'red');
        return;
      }

      updateProgress('正在执行安装脚本，这一步可能需要一点时间...', 98);
      const installRes = await run(`"${INSTALL_SCRIPT}"`, 60 * 1000);
      if (!installRes?.success) {
        updateProgress('安装脚本执行失败', 98, cleanText(installRes?.content));
        createToast('安装 ADGuard 失败', 'red');
        return;
      }

      updateProgress('正在写入开机启动...', 99, cleanText(installRes.content));
      await run(`grep -qxF '${BOOT_COMMAND}' "${BOOT_SH_FILE}" || echo '${BOOT_COMMAND}' >> "${BOOT_SH_FILE}"`);
      await run(`${START_SCRIPT}`);

      updateProgress('安装完成，正在刷新状态...', 100, cleanText(installRes.content));
      createToast(
        `<div>已启用 ADGuard Home<br>地址：${location.protocol}//${location.hostname}:3000<br>默认账号密码均为 root</div>`,
        'green',
        10000,
      );
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const uninstallPlugin = async () => {
    if (!(await ensureRootOrToast())) return;

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
      updateProgress('正在卸载 ADGuard Home...', 30);
      await run(`sed -i '/agh.*boot.sh/d' "${BOOT_SH_FILE}"`);
      const stopRes = await run(`"${ACTION_SCRIPT}" stop`);
      updateProgress('正在清理安装目录...', 70, cleanText(stopRes?.content));
      await run(`"${AGH_DIR}/uninstall.sh"`);
      updateProgress('卸载完成，正在刷新状态...', 100, cleanText(stopRes?.content));
      createToast('卸载完成', 'green', 5000);
    } finally {
      state.uninstallClicks = 0;
      setBusy(false);
      await refreshStatus();
    }
  };

  const restartPlugin = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 ADGuard Home！', 'red');
      return;
    }

    setBusy(true);
    try {
      updateProgress('正在重启 ADGuard Home...', 45);
      await run(`"${ACTION_SCRIPT}" stop`);
      await run('sleep 2');
      const res = await run(`${START_SCRIPT}`);
      updateProgress('重启完成', 100, cleanText(res?.content));
      createToast('重启完成', 'green', 5000);
    } finally {
      setBusy(false);
      await refreshStatus();
    }
  };

  const exportConfig = async () => {
    if (!(await ensureRootOrToast())) return;
    const res = await run(`timeout 2s awk '{print}' "${CONFIG_FILE}"`);
    if (!res?.success) {
      createToast('导出配置失败', 'red', 5000);
      return;
    }

    const content = String(res.content || '');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AdGuardHome.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    createToast('配置导出成功', 'green', 5000);
  };

  const importConfig = async () => {
    if (!(await ensureRootOrToast())) return;
    if (!(await isInstalled())) {
      createToast('你还没有安装 ADGuard Home！', 'red');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml,text/yaml,text/x-yaml,application/x-yaml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!/\.ya?ml$/i.test(file.name)) {
        createToast('请选择 YAML 配置文件', 'red');
        return;
      }

      setBusy(true);
      try {
        updateProgress('正在上传配置文件...', 25);
        const uploadedName = await uploadFileKano(file, true);
        if (!uploadedName) {
          createToast('上传配置文件失败', 'red');
          return;
        }

        const uploadedPath = `${UPLOADS_DIR}/${uploadedName}`;
        updateProgress('正在停止 ADGuard Home...', 45);
        await run(`"${ACTION_SCRIPT}" stop`);

        updateProgress('正在覆盖配置文件...', 75);
        const moveRes = await run(`mv -f "${uploadedPath}" "${CONFIG_FILE}"`);
        if (!moveRes?.success) {
          updateProgress('配置覆盖失败', 75, cleanText(moveRes?.content));
          createToast('覆盖配置文件失败', 'red');
          return;
        }

        updateProgress('正在启动 ADGuard Home...', 90);
        const startRes = await run(`${START_SCRIPT}`);
        updateProgress('配置导入完成', 100, cleanText(startRes?.content));
        createToast('配置导入完成', 'green', 5000);
      } finally {
        setBusy(false);
        await refreshStatus();
      }
    };
    input.click();
  };

  const bindEvents = (el, id) => {
    const installBtn = el.querySelector('#agh_install_btn');
    const toggleBtn = el.querySelector('#agh_toggle_btn');
    const restartBtn = el.querySelector('#agh_restart_btn');
    const openBtn = el.querySelector('#agh_open_btn');
    const exportBtn = el.querySelector('#agh_export_btn');
    const importBtn = el.querySelector('#agh_import_btn');
    const refreshBtn = el.querySelector('#agh_refresh_btn');
    const runningSwitch = el.querySelector('#agh_running_switch');
    const bootSwitch = el.querySelector('#agh_boot_switch');

    installBtn.onclick = async () => {
      if (await isInstalled()) {
        await uninstallPlugin();
      } else {
        await installPlugin();
      }
    };
    toggleBtn.onclick = async () => {
      await toggleRunningEnabled();
    };
    restartBtn.onclick = async () => {
      await restartPlugin();
    };
    openBtn.onclick = async () => {
      if (!(await isInstalled())) {
        createToast('你还没有安装 ADGuard Home！', 'red');
        return;
      }
      window.open(`${location.protocol}//${location.hostname}:3000`, '_blank');
    };
    exportBtn.onclick = async () => {
      await exportConfig();
    };
    importBtn.onclick = async () => {
      await importConfig();
    };
    refreshBtn.onclick = async () => {
      if (!(await ensureRootOrToast())) return;
      createToast('正在刷新状态...', 'pink');
      await refreshStatus();
    };
    runningSwitch.onclick = async () => {
      await toggleRunningEnabled();
    };
    bootSwitch.onclick = async () => {
      await toggleBootEnabled();
    };

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
      onClose: () => true,
      contentStyle: 'max-height:72vh;',
      content: `
        <div class="agh-shell">
          <div class="agh-grid">
            <div class="agh-card">
              <div class="agh-card-label">状态</div>
              <div class="agh-card-value"><span class="agh-chip" id="agh_installed" data-kind="off">检测中</span></div>
              <div class="agh-card-sub" id="agh_size">目录占用：-</div>
            </div>
            <div class="agh-card">
              <div class="agh-card-label">运行状态</div>
              <div class="agh-card-value agh-card-value--between">
                <span class="agh-chip" id="agh_running" data-kind="warn">检测中</span>
                <button id="agh_running_switch" class="agh-switch" type="button" role="switch" aria-checked="false"></button>
              </div>
            </div>
            <div class="agh-card">
              <div class="agh-card-label">开机启动</div>
              <div class="agh-card-value agh-card-value--between">
                <span class="agh-chip" id="agh_boot" data-kind="off">检测中</span>
                <button id="agh_boot_switch" class="agh-switch" type="button" role="switch" aria-checked="false"></button>
              </div>
            </div>
          </div>

          <div class="agh-action-panel">
            <div class="agh-panel-head">
              <div class="agh-panel-title">功能按钮</div>
              <div class="agh-panel-tip">默认面板账号密码均为 root</div>
            </div>
            <div class="agh-actions">
              <button id="agh_install_btn">安装 ADGuard Home</button>
              <button id="agh_toggle_btn">启动服务</button>
              <button id="agh_restart_btn">重启服务</button>
              <button id="agh_open_btn">打开管理页</button>
              <button id="agh_export_btn">导出配置</button>
              <button id="agh_import_btn">导入配置</button>
            </div>
            <div class="agh-panel-head" style="margin-top: 10px;margin-bottom: 0;">
              <div class="agh-panel-tip">小提示：请不要和其他代理软件一起使用，会冲突</div>
            </div>
          </div>

          <div class="agh-status-panel">
            <div class="agh-panel-head">
              <div class="agh-panel-title">安装进度</div>
              <div class="agh-panel-tip" id="agh_address">管理页：安装后可用</div>
            </div>
            <div class="agh-progress-shell" id="agh_progress_shell" hidden>
              <div class="agh-progress-text" id="agh_progress_text">等待操作...</div>
              <div class="agh-progress-track">
                <div class="agh-progress-bar" id="agh_progress_bar"></div>
              </div>
            </div>
            <pre class="agh-log" id="agh_progress_log">等待操作...</pre>
          </div>
        </div>
      `,
    });

    el.style.width = '95%';
    const footerBtnBox = el.querySelector('.btn');
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'agh_refresh_btn';
    refreshBtn.type = 'button';
    refreshBtn.textContent = '刷新状态';
    footerBtnBox?.appendChild(refreshBtn);
    bindEvents(el, id);
    await refreshStatus();
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
