//<script>
(async () => {
  const pluginPath = '/data/picoclaw';
  const downloadUrl =
    'https://gh-proxy.org/https://github.com/sipeed/picoclaw/releases/latest/download/picoclaw_Linux_arm64.tar.gz';
  const tarFile = '/data/kano_picoclaw.tar.gz';
  const dlogFile = '/data/picoclaw/kano_picoclaw_latest.dlog';
  const logFile = '/data/picoclaw/picoclaw_runtime.log';
  const bootSH = '/sdcard/ufi_tools_boot.sh';
  const sslEnv = 'SSL_CERT_DIR=/system/etc/security/cacerts';
  const homeEnv = `HOME=${pluginPath}`;
  const curlBin = '/data/data/com.minikano.f50_sms/files/curl';
  const uploadsDir = '/data/data/com.minikano.f50_sms/files/uploads';
  const UFI_SKILLS_URL =
    'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/ClawSkillsForUFI_TOOLS.zip';
  const SKILL_PACK_OUT_FILE = '/data/ClawSkillsForUFI_TOOLS.zip';
  const PICO_CLAW_SKILLS_DIR = '/data/picoclaw/.picoclaw/workspace/skills';
  const PICO_CLAW_PID_FILE = '/data/picoclaw/.picoclaw/.picoclaw.pid';

  const defaultTitleText = '🦞 PicoClaw · 皮皮虾，我们走！';
  const updateTitleText = '🦞 PicoClaw · 皮皮虾，有更新！';

  const startCommand = `cd ${pluginPath} && rm -f ${PICO_CLAW_PID_FILE} && nohup env ${homeEnv} ${sslEnv} ${pluginPath}/picoclaw gateway>/dev/null 2>&1&`;

  const wait = (ms = 100) => new Promise((r) => setTimeout(r, ms));
  const run = async (cmd, t) => await runShellWithRoot(cmd, t);

  // 检测是否开机自启
  const checkIsBootUp = async () => {
    const res = await runShellWithRoot(`
        grep -q '${pluginPath}' /sdcard/ufi_tools_boot.sh
        echo $?
        `);
    return res.content.trim().replaceAll('\n', '') == '0';
  };

  //下载url
  const downloadUrlLink = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || url.split('/').pop() || 'download';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    createToast(t('download_ing'), 'pink');
  };

  const cleanText = (v) =>
    String(v || '')
      .replace(/[\u2000-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
      .trim();

  const checkRoot = async () => {
    const r = await run('whoami');
    return !!(r?.content && r.content.includes('root'));
  };

  const isInstalled = async () => {
    const r = await run(`[ -x "${pluginPath}/picoclaw" ]&&echo OK||echo NO`);
    return r.success && cleanText(r.content) === 'OK';
  };

  const isRunning = async () => {
    const r = await run('pgrep picoclaw');
    return r.success && r.content && r.content.trim().length > 0;
  };

  const formatBytes = (bytes) => {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const getFileSize = async (path) => {
    const r = await run(`[ -f "${path}" ]&&stat -c%s "${path}"||echo 0`);
    if (!r?.success) return 0;
    const n = parseInt(String(r.content || '0').trim(), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const getRemoteSize = async (downloadUrl = '') => {
    if (!downloadUrl) return 0;
    const r = await run(
      `env ${sslEnv} ${curlBin} -L -sI "${downloadUrl}" | awk 'BEGIN{IGNORECASE=1}/^Content-Length:/{gsub("\\r","",$2);print $2}' | tail -n 1`,
      15000,
    );
    if (!r?.success) return 0;
    const n = parseInt(String(r.content || '0').trim(), 10);
    return Number.isFinite(n) ? n : 0;
  };

  const getLocalVersion = async () => {
    if (!(await isInstalled())) return null;
    const r = await run(
      `cd "${pluginPath}"&&env ${homeEnv} ${sslEnv} ./picoclaw version`,
      5000,
    );
    if (!r?.success) return null;
    const m = String(r.content || '').match(
      /picoclaw\s+([0-9]+(?:\.[0-9]+){0,3})/i,
    );
    return m ? m[1] : null;
  };

  const getRemoteVersion = async () => {
    const r = await run(
      `env ${sslEnv} ${curlBin} -s https://api.github.com/repos/sipeed/picoclaw/releases/latest`,
      10000,
    );
    if (!r?.success) return null;
    const m = String(r.content || '').match(
      /"tag_name"\s*:\s*"v?([0-9]+(?:\.[0-9]+){0,3})"/i,
    );
    return m ? m[1] : null;
  };

  const isNewerVersion = (remote, local) => {
    if (!remote || !local) return false;
    const ra = remote.split('.').map((v) => parseInt(v, 10) || 0);
    const la = local.split('.').map((v) => parseInt(v, 10) || 0);
    const len = Math.max(ra.length, la.length);
    for (let i = 0; i < len; i++) {
      const rv = ra[i] || 0;
      const lv = la[i] || 0;
      if (rv > lv) return true;
      if (rv < lv) return false;
    }
    return false;
  };

  const setTitleState = (hasUpdate = false) => {
    const titleEl = document.querySelector('#picoclaw_title_text');
    if (titleEl)
      titleEl.textContent = hasUpdate ? updateTitleText : defaultTitleText;
  };

  const setVersionInfo = (local, remote) => {
    const infoEl = document.querySelector('#picoclaw_version_info');
    if (!infoEl) return;
    infoEl.textContent = `当前版本：${local || '-'} ｜ 最新版本：${remote || '-'}`;
  };

  const refreshVersionInfo = async (showToast = false) => {
    const [installed, remoteVersion] = await Promise.all([
      isInstalled(),
      getRemoteVersion(),
    ]);

    let localVersion = null;
    if (installed) {
      localVersion = await getLocalVersion();
    }

    const hasUpdate = !!(
      installed &&
      localVersion &&
      remoteVersion &&
      isNewerVersion(remoteVersion, localVersion)
    );

    setTitleState(hasUpdate);
    setVersionInfo(localVersion, remoteVersion);

    if (showToast) {
      if (!installed) {
        createToast('你还没有安装PicoClaw！', 'red');
      } else if (!localVersion || !remoteVersion) {
        createToast('无法获取版本信息', 'red');
      } else if (hasUpdate) {
        createToast(`发现新版本 ${remoteVersion}`, 'green');
      } else {
        createToast('已经是最新版本', 'green');
      }
    }

    return { installed, localVersion, remoteVersion, hasUpdate };
  };

  const ensureProgressUI = () => {
    let panel = document.querySelector('#picoclaw_progress_panel');
    if (panel) return panel;

    const html = `
<div id="picoclaw_progress_panel" style="
  position:fixed;
  left:50%;
  top:20px;
  transform:translateX(-50%);
  z-index:999999;
  min-width:300px;
  max-width:92vw;
  background:rgba(30,30,30,0.97);
  color:#ff9f1a;
  border:1px solid rgba(255,159,26,0.35);
  border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,0.28);
  padding:12px 14px;
  display:none;
">
  <div id="picoclaw_progress_text" style="
    font-size:13px;
    line-height:1.4;
    margin-bottom:8px;
    word-break:break-all;
  ">正在准备下载...</div>
  <div style="
    width:100%;
    height:8px;
    background:rgba(255,255,255,0.12);
    border-radius:999px;
    overflow:hidden;
  ">
    <div id="picoclaw_progress_bar" style="
      width:0%;
      height:100%;
      background:#ff9f1a;
      border-radius:999px;
      transition:width .2s ease;
    "></div>
  </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    return document.querySelector('#picoclaw_progress_panel');
  };

  const showProgress = (text, percent) => {
    ensureProgressUI();
    const panel = document.querySelector('#picoclaw_progress_panel');
    const textEl = document.querySelector('#picoclaw_progress_text');
    const bar = document.querySelector('#picoclaw_progress_bar');

    if (panel) panel.style.display = 'block';
    if (textEl) textEl.textContent = text || '处理中...';
    if (bar) {
      const p = Math.max(0, Math.min(100, Number(percent) || 0));
      bar.style.width = `${p}%`;
    }
  };

  const hideProgress = () => {
    const panel = document.querySelector('#picoclaw_progress_panel');
    if (panel) panel.style.display = 'none';
  };

  let logPaused = false;
  let lastLogContent = '';

  const clearLog = async () => {
    const { close, el } = createFixedToast(
      'picoClawToastClearLog',
      `<div class="title" style="margin:0">插件提示</div>
      <div style="pointer-events: all;text-align:center;min-width: 100px">
      <p>确认清空日志？</p>
      <div style="text-align:right;">
      <button class="ok">确认</button>
      <button class="cancel">取消</button>
      </div>
      </div>`,
    );
    const ok = el.querySelector('.ok');
    const cancel = el.querySelector('.cancel');
    if (ok) {
      ok.onclick = async () => {
        close();
        const r = await run(`: > "${logFile}"`);
        if (!r?.success) return createToast('清空日志失败', 'red');
        lastLogContent = '';
        const logEl = document.querySelector('#picoclaw_log_view');
        if (logEl) logEl.textContent = '暂无日志';
      };
    }
    if (cancel) {
      cancel.onclick = () => {
        close();
      };
    }
  };

  const toggleLogPaused = () => {
    logPaused = !logPaused;
    const btn = document.querySelector('#pauseResumeLogBtn');
    if (btn) btn.textContent = logPaused ? '恢复' : '暂停';
  };

  const updateLogView = async (force = false) => {
    if (logPaused && !force) return;

    const logEl = document.querySelector('#picoclaw_log_view');
    if (!logEl) return;

    const r = await runShellWithRoot(`timeout 2s sh -c \"awk '{print}' ${logFile} | tail -n 100\" || echo \"暂无日志\"`);

    if (!r?.success) {
      logEl.textContent = '读取日志失败';
      return;
    }

    const content = String(r.content || '暂无日志');
    if (content === lastLogContent && !force) return;

    lastLogContent = content;
    logEl.textContent = content;
    logEl.scrollTop = logEl.scrollHeight;
  };

  const cmdOnboard = `rm -f ${PICO_CLAW_PID_FILE} && cd ${pluginPath}&&: > "${logFile}"&&env ${homeEnv} ${sslEnv} ./picoclaw onboard >> "${logFile}" 2>&1`;
  const cmdGateway = `rm -f ${PICO_CLAW_PID_FILE} && cd ${pluginPath}&&: > "${logFile}"&&nohup env ${homeEnv} ${sslEnv} ./picoclaw gateway >> "${logFile}" 2>&1 &`;
  const cmdPublic = `rm -f ${PICO_CLAW_PID_FILE} && cd ${pluginPath}&&: > "${logFile}"&&nohup env ${homeEnv} ${sslEnv} ./picoclaw-launcher -public >> "${logFile}" 2>&1 &`;
  const cmdStop = `rm -f ${PICO_CLAW_PID_FILE} && pkill picoclaw`;
  const cmdRestart = `rm -f ${PICO_CLAW_PID_FILE} && pkill picoclaw;cd ${pluginPath}&&: > "${logFile}"&&nohup env ${homeEnv} ${sslEnv} ./picoclaw gateway >> "${logFile}" 2>&1 &`;
  const cmdUninstall = `pkill picoclaw;rm -rf ${pluginPath}`;

  let uninstallClick = 0;

  const downloadFilesForClaw = async (
    progressPrefix = '正在下载 PicoClaw...',
    url = downloadUrl,
    outFile = tarFile,
  ) => {
    await run(`mkdir -p "$(dirname "${dlogFile}")"`);

    showProgress('正在获取下载信息...', 0);
    const totalSize = await getRemoteSize(url);

    if (totalSize > 0) {
      showProgress(`${progressPrefix} 0% (0 B / ${formatBytes(totalSize)})`, 0);
    } else {
      showProgress(progressPrefix, 0);
    }

    const dl = await run(
      `env ${sslEnv} ${curlBin} -L "${url}" -o "${outFile}" --write-out "DOWNLOAD_DONE\\n">"${dlogFile}" 2>&1&`,
      100000,
    );
    if (!dl.success) return { success: false, error: '下载失败' };

    let ok = false;
    let lastPercent = 0;

    for (let i = 0; i < 600; i++) {
      const [l, size] = await Promise.all([
        run(`timeout 2s awk '{print}' "${dlogFile}"`),
        getFileSize(outFile),
      ]);

      if (totalSize > 0) {
        const percent = Math.max(
          0,
          Math.min(100, Math.floor((size * 100) / totalSize)),
        );
        if (percent >= lastPercent) {
          lastPercent = percent;
          showProgress(
            `${progressPrefix} ${percent}% (${formatBytes(size)} / ${formatBytes(totalSize)})`,
            percent,
          );
        }
      } else {
        showProgress(`${progressPrefix} 已下载 ${formatBytes(size)}`, 0);
      }

      if ((l.content || '').includes('DOWNLOAD_DONE')) {
        ok = true;
        break;
      }
      await wait(1000);
    }

    await run(`rm -f "${dlogFile}"`);
    if (!ok) return { success: false, error: '下载超时' };

    return { success: true };
  };

  const installPlugin = async () => {
    if (!(await checkRoot()))
      return createToast('没有开启高级功能，无法使用！', 'red');

    const downloaded = await downloadFilesForClaw('正在下载 PicoClaw...');
    if (!downloaded.success) {
      hideProgress();
      return createToast(downloaded.error, 'red');
    }

    showProgress('下载完成，正在安装...', 100);

    const ex = await run(
      `mkdir -p "${pluginPath}"&&tar -zxf "${tarFile}" -C "${pluginPath}"&&rm -f "${tarFile}"&&chmod -R 777 "${pluginPath}"`,
    );
    if (!ex.success) {
      hideProgress();
      return createToast('安装失败', 'red');
    }

    showProgress('设置权限完成，初始化 PicoClaw...', 100);
    await updateLogView(true);

    const onboardTask = run(cmdOnboard, 120000);

    let onboardDone = false;
    onboardTask.finally(() => {
      onboardDone = true;
    });

    while (!onboardDone) {
      await wait(500);
      await updateLogView(true);
    }

    const o = await onboardTask;
    if (!o.success) {
      hideProgress();
      await updateLogView(true);
      return createToast('onboard 初始化失败', 'red');
    }

    showProgress('正在配置开机启动...', 100);

    await run(
      `grep -qxF '${startCommand}' "${bootSH}"||echo '${startCommand}'>>"${bootSH}"`,
    );

    showProgress('安装并初始化完成，已设置开机启动', 100);
    await wait(1500);
    hideProgress();

    const { close, el } = createFixedToast(
      'picoClawToastSuccessInstalled',
      `<div class="title" style="pointer-events: all;margin:0">插件提示</div>
      <div style="pointer-events: all;text-align:center;min-width: 100px">
      <p>接下来你可以下载/更新UFI技能包，访问/控制设备更轻松！</p>
      <div style="text-align:right;">
      <button class="ok">确认</button>
      <button class="cancel">取消</button>
      </div>
      </div>`,
    );
    const ok = el.querySelector('.ok');
    const cancel = el.querySelector('.cancel');
    if (ok) {
      ok.onclick = async () => {
        close();
      };
    }
    if (cancel) {
      cancel.onclick = () => {
        close();
      };
    }

    await updateButtonStates();
    await updateLogView(true);
    await refreshVersionInfo();
    checkIsBootUp().then((isBootUp) => {
      const boot_on = document.querySelector('#pico_claw_boot_on');
      if (!boot_on) return;
      if (isBootUp) {
        boot_on.style.background = 'var(--dark-btn-color-active)';
      } else {
        boot_on.style.background = '';
      }
    });
  };

  const updatePlugin = async () => {
    if (!(await checkRoot()))
      return createToast('没有开启高级功能，无法使用！', 'red');

    const info = await refreshVersionInfo();
    if (!info.installed) return createToast('你还没有安装PicoClaw！', 'red');
    if (!info.localVersion || !info.remoteVersion)
      return createToast('无法获取版本信息', 'red');
    if (!info.hasUpdate) return createToast('已经是最新版本', 'green');

    const downloaded = await downloadFilesForClaw(
      `正在下载更新 ${info.remoteVersion}...`,
    );
    if (!downloaded.success) {
      hideProgress();
      return createToast(downloaded.error, 'red');
    }

    showProgress('下载完成，正在更新...', 100);

    await run(cmdStop);

    const ex = await run(
      `mkdir -p "${pluginPath}"&&tar -zxf "${tarFile}" -C "${pluginPath}"&&rm -f "${tarFile}"&&chmod -R 777 "${pluginPath}"`,
    );

    if (!ex.success) {
      hideProgress();
      return createToast('更新失败', 'red');
    }

    await run(
      `grep -qxF '${startCommand}' "${bootSH}"||echo '${startCommand}'>>"${bootSH}"`,
    );

    const r = await run(cmdGateway);
    if (!r.success) {
      hideProgress();
      return createToast('更新后启动失败', 'red');
    }

    let started = false;
    for (let i = 0; i < 3; i++) {
      await wait(100);
      if (await isRunning()) {
        started = true;
        break;
      }
    }

    hideProgress();

    if (started) {
      createToast(
        `更新成功：${info.localVersion} → ${info.remoteVersion}`,
        'green',
      );
    } else {
      createToast('更新完成，但启动失败', 'red');
    }

    await updateButtonStates();
    await updateLogView(true);
    await refreshVersionInfo();
    checkIsBootUp().then((isBootUp) => {
      const boot_on = document.querySelector('#pico_claw_boot_on');
      if (!boot_on) return;
      if (isBootUp) {
        boot_on.style.background = 'var(--dark-btn-color-active)';
      } else {
        boot_on.style.background = '';
      }
    });
  };

  const uninstallPlugin = async () => {
    if (!(await checkRoot()))
      return createToast('没有开启高级功能，无法使用！', 'red');

    uninstallClick++;
    if (uninstallClick < 3) {
      createToast(`再点${3 - uninstallClick}次执行卸载`, 'red');
      setTimeout(() => {
        uninstallClick = 0;
      }, 3000);
      return;
    }

    createToast('卸载中...', 'red');
    const r = await run(cmdUninstall);
    if (!r.success) return createToast('卸载失败', 'red');

    await run(`sed -i '/picoclaw/d' "${bootSH}"`);

    createToast('卸载成功', 'green');
    uninstallClick = 0;
    await updateButtonStates();
    await updateLogView(true);
    await refreshVersionInfo();
    checkIsBootUp().then((isBootUp) => {
      const boot_on = document.querySelector('#pico_claw_boot_on');
      if (!boot_on) return;
      if (isBootUp) {
        boot_on.style.background = 'var(--dark-btn-color-active)';
      } else {
        boot_on.style.background = '';
      }
    });
  };

  const startPlugin = async () => {
    if (!(await checkRoot()))
      return createToast('没有开启高级功能，无法使用！', 'red');

    if (await isRunning()) {
      createToast('服务已在运行中', 'green');
      await updateButtonStates();
      await updateLogView(true);
      return;
    }

    const r = await run(cmdGateway);
    if (!r.success) return createToast('启动失败', 'red');

    let started = false;
    for (let i = 0; i < 3; i++) {
      await wait(100);
      if (await isRunning()) {
        started = true;
        break;
      }
    }

    if (started) {
      createToast('启动成功', 'green');
    } else {
      createToast('启动失败', 'red');
    }

    await updateButtonStates();
    await updateLogView(true);
  };

  const stopPlugin = async () => {
    if (!(await checkRoot()))
      return createToast('没有开启高级功能，无法使用！', 'red');

    const r = await run(cmdStop);
    if (!r.success) return createToast('停止失败', 'red');
    createToast('已停止', 'green');
    await updateButtonStates();
    await updateLogView(true);
  };

  const updateButtonStates = async () => {
    const installed = await isInstalled();
    const running = await isRunning();

    installUninstallBtn.textContent = installed ? '卸载' : '安装';
    installUninstallBtn.onclick = installed ? uninstallPlugin : installPlugin;

    if (installed) {
      startStopBtn.disabled = false;
      startStopBtn.textContent = running ? '停止' : '启动';
      startStopBtn.onclick = running ? stopPlugin : startPlugin;
      startStopBtn.style.opacity = '1';
      btnUpdate.disabled = false;
      btnUpdate.style.opacity = '1';
    } else {
      startStopBtn.disabled = true;
      startStopBtn.textContent = '启动';
      startStopBtn.style.opacity = '0.5';
      btnUpdate.disabled = true;
      btnUpdate.style.opacity = '0.5';
    }
  };

  while (!UFI_DATA?.lan_ipaddr) await wait();

  const container = document.querySelector('.functions-container');
  container.insertAdjacentHTML(
    'afterend',
    `
<div id="PICOCLAW_PANEL" style="width:100%;margin-top:10px;">
  <div class="title" style="margin:6px 0;">
    <strong id="picoclaw_title_text">🦞 PicoClaw · 皮皮虾，我们走！</strong>
    <div style="display:inline-block;" id="collapse_picoclaw_btn"></div>
  </div>
  <div class="collapse" id="collapse_picoclaw" data-name="close" style="height:0;overflow:hidden;">
    <div class="collapse_box">
      <div id="picoclaw_warning" style="display: flex;flex-direction: column;gap: 4px;;margin-bottom:10px;padding:8px;background-color:rgba(255,0,0,0.1);border-left:3px solid red;border-radius:4px;">
        <span style="color:pink;font-size:13px;font-weight:bold;">小龙虾默认限制工作空间权限，你可以在配置文件里面设置 "restrict_to_workspace": false 即可拥有完整权限</span>
        <span style="color:pink;font-size:13px;font-weight:bold;">安装完成后请进入管理面板配置你的AI接口与聊天接口</span>
      </div>
      <div id="picoclaw_action_box" style="margin-bottom:8px;display:flex;gap:10px;flex-wrap:wrap"></div>
      <div id="picoclaw_log_box" style="
        margin-top:8px;
        background:rgba(0,0,0,0.35);
        border:1px solid rgba(255,255,255,0.08);
        border-radius:8px;
        padding:8px;
      ">
        <div style="
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          margin-bottom:6px;
        ">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-size:12px;font-weight:bold;color:#ddd;">运行日志</div>
            <div id="picoclaw_version_info" style="font-size:12px;color:#bfbfbf;">当前版本：- ｜ 最新版本：-</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap: nowrap;min-width: fit-content;">
            <button id="clearLogBtn" class="btn" style="padding:4px 10px;font-size:12px;">清空</button>
            <button id="pauseResumeLogBtn" class="btn" style="padding:4px 10px;font-size:12px;">暂停</button>
          </div>
        </div>
        <pre id="picoclaw_log_view" style="
          margin:0;
          height:500px;
          overflow:auto;
          white-space:pre-wrap;
          word-break:break-all;
          font-size:12px;
          line-height:1.45;
          color:#ddd;
        ">暂无日志</pre>
      </div>
    </div>
  </div>
</div>`,
  );

  const box = document.querySelector('#picoclaw_action_box');

  const installUninstallBtn = document.createElement('button');
  installUninstallBtn.classList.add('btn');
  installUninstallBtn.textContent = '安装';

  const startStopBtn = document.createElement('button');
  startStopBtn.classList.add('btn');
  startStopBtn.textContent = '启动';
  startStopBtn.disabled = true;
  startStopBtn.style.opacity = '0.5';

  const btnRestart = document.createElement('button');
  btnRestart.classList.add('btn');
  btnRestart.textContent = '重启';
  btnRestart.onclick = async () => {
    if (!(await checkRoot()))
      return createToast('没有开启高级功能，无法使用！', 'red');
    if (!(await isInstalled()))
      return createToast('你还没有安装PicoClaw！', 'red');

    const r = await run(cmdRestart);
    if (!r.success) return createToast('重启失败', 'red');

    let started = false;
    for (let i = 0; i < 3; i++) {
      await wait(100);
      if (await isRunning()) {
        started = true;
        break;
      }
    }

    if (!started) return createToast('重启失败', 'red');
    createToast('重启成功', 'green');
    await updateButtonStates();
    await updateLogView(true);
  };

  const btnConfig = document.createElement('button');
  btnConfig.classList.add('btn');
  btnConfig.textContent = '打开面板';

  btnConfig.onclick = async () => {
    if (!(await checkRoot()))
      return createToast('没有开启高级功能，无法使用！', 'red');
    if (!(await isInstalled()))
      return createToast('你还没有安装PicoClaw！', 'red');

    const url = `http://${UFI_DATA.lan_ipaddr}:18800`;
    await runShellWithRoot(
      "pkill picoclaw",
    );
    await run(cmdPublic);
    createToast('面板已打开', 'pink');
    setTimeout(async () => {
      await updateButtonStates();
      await updateLogView(true);
      window.open(url, '_blank');
    }, 200);
  };

  const btnConfig1 = document.createElement('button');
  btnConfig1.classList.add('btn');
  btnConfig1.textContent = '打开面板(备用)';

  btnConfig1.onclick = async () => {
    if (!(await checkRoot()))
      return createToast('没有开启高级功能，无法使用！', 'red');
    if (!(await isInstalled()))
      return createToast('你还没有安装PicoClaw！', 'red');

    const url = `http://${UFI_DATA.lan_ipaddr}:18800`;
    await runShellWithRoot(
      "pkill picoclaw",
    );
    const randomPass = Math.random().toString(36).slice(-8);
    const cmdPublicWithDefaultPass = `cd ${pluginPath}&&: > "${logFile}"&&nohup env ${homeEnv} ${sslEnv} PICOCLAW_LAUNCHER_TOKEN=${randomPass} ./picoclaw-launcher -public >> "${logFile}" 2>&1 &`;
    await run(cmdPublicWithDefaultPass);
    const { close, el } = createFixedToast(
      'picoClawbackupWebEntry',
      `<div class="title" style="pointer-events: all;margin:0">插件提示</div>
      <div style="pointer-events: all;text-align:center;min-width: 100px">
      <p>此为备用入口，密码为 <span onclick="copyText(event)" style="color:pink;font-weight:bold">${randomPass}</span> (点击复制)，忘记密码时可以用此方法登录，登录后可以修改密码</p>
      <div style="text-align:right;">
      <button class="ok">确认</button>
      <button class="cancel">取消</button>
      </div>
      </div>`,
    );
    const ok = el.querySelector('.ok');
    const cancel = el.querySelector('.cancel');
    if (ok) {
      ok.onclick = async () => {
        close();
      };
    }
    if (cancel) {
      cancel.onclick = () => {
        close();
      };
    }
    setTimeout(async () => {
      await updateButtonStates();
      await updateLogView(true);
      window.open(url, '_blank');
    }, 200);
  };


  const btnGithubLink = document.createElement('button');
  btnGithubLink.classList.add('btn');
  btnGithubLink.textContent = '开源链接(记得star)';

  btnGithubLink.onclick = async () => {
    const url = `https://github.com/sipeed/picoclaw`;
    setTimeout(async () => {
      window.open(url, '_blank');
    }, 200);
  };

  const btnUpdate = document.createElement('button');
  btnUpdate.classList.add('btn');
  btnUpdate.textContent = '更新PicoClaw';
  btnUpdate.disabled = true;
  btnUpdate.style.opacity = '0.5';
  btnUpdate.onclick = updatePlugin;

  const bootOnBtn = document.createElement('button');
  bootOnBtn.id = 'pico_claw_boot_on';
  bootOnBtn.classList.add('btn');
  bootOnBtn.textContent = '开机自启';
  bootOnBtn.style.background = '';
  bootOnBtn.addEventListener('click', async () => {
    if (!(await checkRoot())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    if (!(await isInstalled())) {
      createToast('没有安装PicoClaw，请先安装！', 'red');
      return;
    }
    const isBootUp = await checkIsBootUp();
    if (isBootUp) {
      //关闭
      await runShellWithRoot(`sed -i '/picoclaw/d' "${bootSH}"`);
      bootOnBtn.style.background = '';
      createToast('已取消开机自启', 'green');
    } else {
      //开启
      await runShellWithRoot(
        `grep -qxF '${startCommand}' "${bootSH}"||echo '${startCommand}'>>"${bootSH}"`,
      );
      bootOnBtn.style.background = 'var(--dark-btn-color-active)';
      createToast('已设置开机自启', 'green');
    }
  });

  const downloadSkillsPack = async () => {
    if (!(await checkRoot())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    const downloaded = await downloadFilesForClaw(
      '正在下载：UFI技能包',
      UFI_SKILLS_URL,
      SKILL_PACK_OUT_FILE,
    );
    if (!downloaded.success) {
      hideProgress();
      return createToast(downloaded.error, 'red');
    }
    hideProgress();
    createToast('下载完成,即将解压文件', 'pink', 1000, async () => {
      //解压文件
      createToast('解压文件...');
      const res = await runShellWithRoot(`
        cd ${PICO_CLAW_SKILLS_DIR}
        rm -rf ${PICO_CLAW_SKILLS_DIR}/mifi-status
        unzip ${SKILL_PACK_OUT_FILE} -d ${PICO_CLAW_SKILLS_DIR}
        chmod -R 777 ${PICO_CLAW_SKILLS_DIR}/mifi-status/*
        `);
      if (!res.success) return createToast('解压文件出错!', 'red');
      createToast(
        `安装完成!\nskill路径：${PICO_CLAW_SKILLS_DIR}/mifi-status`,
        'pink',
      );
    });
  };
  const uploadSkill = document.createElement('button');
  uploadSkill.textContent = '安装/更新UFI技能包';
  uploadSkill.onclick = async () => {
    if (!(await isInstalled())) {
      createToast('没有安装PicoClaw，请先安装！', 'red');
      return;
    }

    if (!(await checkRoot())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }

    const res = await runShellWithRoot(
      `ls ${PICO_CLAW_SKILLS_DIR}/mifi-status`,
    );
    if (res.content.includes('SKILL.md')) {
      const { close, el } = createFixedToast(
        'picoClawToastHasDownloadSkills',
        `<div class="title" style="pointer-events: all;margin:0">插件提示</div>
      <div style="pointer-events: all;text-align:center;min-width: 100px">
      <p>技能包已存在，下载会覆盖旧版技能包，确认？</p>
      <div style="text-align:right;">
      <button class="ok">确认</button>
      <button class="cancel">取消</button>
      </div>
      </div>`,
      );
      const ok = el.querySelector('.ok');
      const cancel = el.querySelector('.cancel');
      if (ok) {
        ok.onclick = async () => {
          close();
          downloadSkillsPack();
        };
      }
      if (cancel) {
        cancel.onclick = () => {
          close();
        };
      }
    } else {
      downloadSkillsPack();
    }
  };

  const packAndExportFiles = async ({
    filePath = '/data/picoclaw/.picoclaw',
    tmpDir = '/data/.tmpdir',
    outPackageFileName = 'ExportedData.tar.gz',
  }) => {
    if (!(await isInstalled())) {
      createToast('没有安装PicoClaw，请先安装！', 'red');
      return;
    }

    if (!(await checkRoot())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    await runShellWithRoot(`cd ${tmpDir} && rm -f ${outPackageFileName}`);
    const res = await runShellWithRoot(
      `cd ${tmpDir} && tar -zcf ${outPackageFileName} ${filePath}`,
    );
    runShellWithRoot(`chmod 777 ${tmpDir}/${outPackageFileName}`);
    if (!res.success) return false;
    const res1 = await runShellWithRoot(
      `cd ${tmpDir} && ls ${outPackageFileName}`,
    );
    return res1.content.includes(outPackageFileName);
  };

  const exportDataBox = document.createElement('div');
  exportDataBox.innerHTML = `
            <div class="modal" id="PicoClawExportDataBox" style="width: 77%;max-width: 500px;display: none;z-index: 0;">
                <div class="title">数据导出</div>
                <style>
                .kano_picoClaw_data_export {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr); /* PC 默认 4 列 */
                    max-height: 350px;
                    padding: 10px 0px 10px 0px;
                    gap: 10px;
                }
                .kano_picoClaw_data_export button {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                @media (max-width: 360px) {
                    .kano_picoClaw_data_export {
                        grid-template-columns: repeat(1, 1fr);
                    }
                }
                @media (min-width: 361px) and (max-width: 480px) {
                    .kano_picoClaw_data_export {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                @media (min-width: 481px) and (max-width: 767px) {
                    .kano_picoClaw_data_export {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                @media (min-width: 768px) {
                    .kano_picoClaw_data_export {
                        grid-template-columns: repeat(4, 1fr);
                    }
                }</style>
                <div class="content kano_picoClaw_data_export">
                <button id="kano_picoClaw_data_export_config">导出配置文件</button>
                <button id="kano_picoClaw_data_export_all">导出整个环境</button>
                <button id="kano_picoClaw_data_export_skills">导出所有技能</button>
                <button id="kano_picoClaw_data_export_memory">导出记忆</button>
                </div>
                <div class="btn" style="text-align: right;">
                    <button onclick="closeModal('#PicoClawExportDataBox')">关闭</button>
                </div>
            </div>
        `;

  const menuSection = document.body;
  menuSection.appendChild(exportDataBox);

  const exportFn = async (filePath, filename) => {
    const { close } = createFixedToast(
      'kano_picoClaw_data_export_config_toast',
      '正在导出',
    );
    const success = await packAndExportFiles({
      filePath,
      tmpDir: uploadsDir,
      outPackageFileName: `${filename}`,
    });
    if (!success) {
      close();
      return createToast('导出失败！！', 'pink');
    }
    if (downloadUrlLink) {
      downloadUrlLink('/api/uploads/' + `${filename}`, `${filename}`);
      close();
    }
  };

  const exportMemoryEl = document.querySelector(
    '#kano_picoClaw_data_export_memory',
  );

  if (exportMemoryEl) {
    let timer = null;
    exportMemoryEl.onclick = async () => {
      exportFn(
        '/data/picoclaw/.picoclaw/workspace/memory',
        'ExportedMemory.tar.gz',
      );
      createToast('8秒后会自动清理文件，请及时下载', 'pink', 8000);
      timer && clearTimeout(timer);
      timer = setTimeout(async () => {
        await runShellWithRoot(`rm -f ${uploadsDir}/ExportedMemory.tar.gz`);
      }, 8000);
    };
  }

  const exportSkillsEl = document.querySelector(
    '#kano_picoClaw_data_export_skills',
  );
  if (exportSkillsEl) {
    let timer = null;
    exportSkillsEl.onclick = async () => {
      exportFn(
        '/data/picoclaw/.picoclaw/workspace/skills',
        'ExportedSkills.tar.gz',
      );
      createToast('8秒后会自动清理文件，请及时下载', 'pink', 8000);
      timer && clearTimeout(timer);
      timer = setTimeout(async () => {
        await runShellWithRoot(`rm -f ${uploadsDir}/ExportedSkills.tar.gz`);
      }, 8000);
    };
  }

  const exportConfigEl = document.querySelector(
    '#kano_picoClaw_data_export_config',
  );
  if (exportConfigEl) {
    let timer = null;
    exportConfigEl.onclick = async () => {
      exportFn('/data/picoclaw/.picoclaw/config.json', 'ExportedConfig.tar.gz');
      createToast('8秒后会自动清理文件，请及时下载', 'pink', 8000);
      timer && clearTimeout(timer);
      timer = setTimeout(async () => {
        await runShellWithRoot(`rm -f ${uploadsDir}/ExportedConfig.tar.gz`);
      }, 8000);
    };
  }

  const exportAllEl = document.querySelector('#kano_picoClaw_data_export_all');
  if (exportAllEl) {
    let timer = null;
    exportAllEl.onclick = async () => {
      exportFn('/data/picoclaw/.picoclaw', 'ExportedData.tar.gz');
      createToast('8秒后会自动清理文件，请及时下载', 'pink', 8000);
      timer && clearTimeout(timer);
      timer = setTimeout(async () => {
        await runShellWithRoot(`rm -f ${uploadsDir}/ExportedData.tar.gz`);
      }, 8000);
    };
  }

  const exportData = document.createElement('button');
  exportData.textContent = '数据导出';
  exportData.onclick = async () => {
    if (!(await isInstalled())) {
      createToast('没有安装PicoClaw，请先安装！', 'red');
      return;
    }
    if (!(await checkRoot())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    showModal('#PicoClawExportDataBox');
  };

  box.appendChild(installUninstallBtn);
  box.appendChild(startStopBtn);
  box.appendChild(btnRestart);
  box.appendChild(btnConfig);
  box.appendChild(btnConfig1);
  box.appendChild(uploadSkill);
  box.appendChild(btnUpdate);
  box.appendChild(exportData);
  box.appendChild(bootOnBtn);
  box.appendChild(btnGithubLink);

  const clearLogBtn = document.querySelector('#clearLogBtn');
  const pauseResumeLogBtn = document.querySelector('#pauseResumeLogBtn');

  clearLogBtn.onclick = async () => {
    await clearLog();
  };

  pauseResumeLogBtn.onclick = () => {
    toggleLogPaused();
  };

  setTimeout(async () => {
    await updateButtonStates();
    await updateLogView(true);
    await refreshVersionInfo();
  }, 500);

  let Log_INTERVAL = null;

  if (localStorage.getItem('#collapse_picoclaw') == 'open') {
    Log_INTERVAL = requestInterval(() => {
      updateLogView();
    }, 1000);
  }

  requestInterval(() => {
    refreshVersionInfo();
  }, 300000);

  checkIsBootUp().then((isBootUp) => {
    const boot_on = document.querySelector('#pico_claw_boot_on');
    if (!boot_on) return;
    if (isBootUp) {
      boot_on.style.background = 'var(--dark-btn-color-active)';
    } else {
      boot_on.style.background = '';
    }
  });

  collapseGen(
    '#collapse_picoclaw_btn',
    '#collapse_picoclaw',
    '#collapse_picoclaw',
    (newVal) => {
      // newVal ? 'open' : 'close'
      if (newVal == 'open') {
        Log_INTERVAL && Log_INTERVAL();
        Log_INTERVAL = requestInterval(() => {
          updateLogView();
        }, 1000);
      } else {
        Log_INTERVAL && Log_INTERVAL();
      }
    },
  );
})();
//</script>
