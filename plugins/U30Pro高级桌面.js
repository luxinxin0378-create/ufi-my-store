//<script>
(async () => {
  const MODAL_NAME = 'kano_u30pro_launcher_manager_modal';
  const STYLE_ID = 'kano_u30pro_launcher_manager_style';
  const PACKAGE_NAME = 'com.ufitools.dashboard';
  const MAIN_ACTIVITY = `${PACKAGE_NAME}/.LauncherActivity`;
  const API_BASE = 'content://com.ufitools.dashboard.localapi';
  const UPDATE_URL = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/u30pro_launcher_update.json';
  const UPDATE_PROXY_URL = `/api/proxy/--${UPDATE_URL}`;
  const LOGIN_PROMPT_MODULE_URL = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/Magisk%E6%A8%A1%E5%9D%97/%E3%80%90%E5%8E%BB%E9%99%A4%E5%B1%8F%E5%B9%95%E7%99%BB%E5%BD%95%E5%BC%B9%E6%A1%86%E3%80%91U30Pro%E6%B4%9B%E5%A4%A9%E4%BE%9D%E4%B8%BB%E9%A2%98%E6%A8%A1%E5%9D%97.zip';
  const LOGIN_PROMPT_MODULE_FILE = '【去除屏幕登录弹框】U30Pro洛天依主题模块.zip';
  const WORK_DIR = '/data/local/tmp/kano_u30pro_launcher';
  const APK_PATH = `${WORK_DIR}/u30pro_launcher.apk`;
  const DOWNLOAD_LOG = `${WORK_DIR}/download.log`;
  const UPLOADS_DIR = '/data/data/com.minikano.f50_sms/files/uploads';
  const CURL = '/data/data/com.minikano.f50_sms/files/curl';
  const SSL_ENV = 'SSL_CERT_DIR=/system/etc/security/cacerts';

  const state = {
    busy: false,
    installed: false,
    version: '',
    isDefault: false,
    settings: null,
    dynamicWallpapers: [],
    release: null,
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const clean = (value) => String(value ?? '').replace(/\r/g, '').trim();
  const formatBytes = (bytes) => {
    let size = Number(bytes || 0);
    if (!Number.isFinite(size) || size < 0) size = 0;
    const units = ['B', 'KB', 'MB', 'GB'];
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return `${size.toFixed(index ? 1 : 0)} ${units[index]}`;
  };

  const run = async (command, timeout = 15000) => {
    try {
      const result = await runShellWithRoot(command, timeout);
      return {
        ok: !!result?.success,
        text: clean(result?.content),
        raw: result,
      };
    } catch (error) {
      console.error('[U30Pro高级桌面]', error);
      return { ok: false, text: String(error || 'Shell 执行失败'), raw: null };
    }
  };

  const injectStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .content{overflow:hidden;max-height:78vh}
      #${MODAL_NAME} .ulm-wrap{display:flex;flex-direction:column;gap:12px;max-height:78vh;min-height:0}
      #${MODAL_NAME} .ulm-scroll{display:flex;flex-direction:column;gap:12px;overflow-y:auto;min-height:0;padding-right:2px}
      #${MODAL_NAME} .ulm-card{padding:13px;border-radius:13px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.075)}
      #${MODAL_NAME} .ulm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      #${MODAL_NAME} .ulm-title{font-size:.78rem;font-weight:700;line-height:1.45}
      #${MODAL_NAME} .ulm-sub{margin-top:5px;font-size:.65rem;line-height:1.65;opacity:.78;word-break:break-word}
      #${MODAL_NAME} .ulm-status{display:inline-flex;align-items:center;padding:4px 9px;border-radius:99px;font-size:.62rem;background:rgba(255,255,255,.08)}
      #${MODAL_NAME} .ulm-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:11px}
      #${MODAL_NAME} button:disabled,#${MODAL_NAME} input:disabled,#${MODAL_NAME} select:disabled{opacity:.45;cursor:not-allowed}
      #${MODAL_NAME} .ulm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:11px}
      #${MODAL_NAME} .ulm-field{display:flex;flex-direction:column;gap:6px;min-width:0}
      #${MODAL_NAME} .ulm-field label{font-size:.64rem;opacity:.8}
      #${MODAL_NAME} .ulm-field input,#${MODAL_NAME} .ulm-field select{box-sizing:border-box;width:100%;min-height:37px;padding:7px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.16);color:inherit}
      #${MODAL_NAME} .ulm-progress{display:block;position:relative;flex:0 0 auto;margin:0}
      #${MODAL_NAME} .ulm-progress-text{font-size:.64rem;line-height:1.5;margin-bottom:6px}
      #${MODAL_NAME} .ulm-progress-track{height:7px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.06)}
      #${MODAL_NAME} .ulm-progress-bar{width:0%;height:100%;border-radius:inherit;background:var(--dark-btn-color-active);transition:width .2s ease}
      #${MODAL_NAME} .ulm-list{display:flex;flex-direction:column;gap:7px;margin-top:10px}
      #${MODAL_NAME} .ulm-item{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:9px 10px;border-radius:9px;background:rgba(255,255,255,.035);font-size:.64rem}
      #${MODAL_NAME} .ulm-danger{color:#ffb0b0}
      @media(max-width:640px){
        #${MODAL_NAME} .ulm-grid{grid-template-columns:1fr}
        #${MODAL_NAME} .ulm-card{padding:11px}
        #${MODAL_NAME} .ulm-actions button{flex:1 1 calc(50% - 8px)}
        #${MODAL_NAME} .ulm-head{gap:8px}
      }
    `;
    document.head.appendChild(style);
  };

  const getRoot = () => document.querySelector(`#${MODAL_NAME}`);
  const setProgress = (text, percent = 0, visible = true) => {
    const root = getRoot();
    const box = root?.querySelector('#ulm_progress');
    const textEl = root?.querySelector('#ulm_progress_text');
    const bar = root?.querySelector('#ulm_progress_bar');
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    if (box) box.style.display = 'block';
    if (textEl) textEl.textContent = visible ? (text || '处理中...') : '就绪';
    if (bar) bar.style.width = `${safePercent}%`;
    const percentEl = root?.querySelector('#ulm_progress_percent');
    if (percentEl) percentEl.textContent = visible ? `${Math.round(safePercent)}%` : '—';
  };

  const setBusy = (busy, text = '') => {
    state.busy = busy;
    const root = getRoot();
    root?.querySelectorAll('button,input,select').forEach((element) => {
      if (element.id === `${MODAL_NAME}_close`) return;
      element.disabled = busy || (element.dataset.requiresInstall === '1' && !state.installed);
    });
    if (busy && text) setProgress(text, 0, true);
  };

  const askConfirm = (id, title, message, confirmText = '确认', danger = false) => new Promise((resolve) => {
    const toast = createFixedToast(id, `
      <div style="pointer-events:all;width:88vw;max-width:480px">
        <div class="title" style="margin:0;${danger ? 'color:#ffb0b0' : ''}">${escapeHtml(title)}</div>
        <div style="margin-top:9px;font-size:.7rem;line-height:1.75;font-weight:normal">${escapeHtml(message)}</div>
        <div style="display:flex;justify-content:flex-end;gap:9px;margin-top:13px;flex-wrap:wrap">
          <button class="confirm">${escapeHtml(confirmText)}</button>
          <button class="cancel">取消</button>
        </div>
      </div>
    `);
    if (!toast) return resolve(false);
    const done = (value) => {
      toast.close();
      resolve(value);
    };
    toast.el.querySelector('.confirm')?.addEventListener('click', () => done(true));
    toast.el.querySelector('.cancel')?.addEventListener('click', () => done(false));
  });

  const downloadLoginPromptModule = () => {
    downloadUrl(LOGIN_PROMPT_MODULE_URL, LOGIN_PROMPT_MODULE_FILE);
    const toast = createFixedToast('ulm_login_prompt_module_notice', `
      <div style="pointer-events:all;width:88vw;max-width:500px">
        <div class="title" style="margin:0">模块下载已开始</div>
        <div style="margin-top:9px;font-size:.7rem;line-height:1.75;font-weight:normal">
          “去除登录提示模块”是一个 Magisk 模块 ZIP，文件将下载到当前浏览器设备。<br>
          下载完成后，请打开 <b>Magisk 管理器插件</b>，选择刚下载的 ZIP 文件进行安装。
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:13px">
          <button class="close">我知道了</button>
        </div>
      </div>
    `);
    toast?.el.querySelector('.close')?.addEventListener('click', () => toast.close());
  };

  const parseSettings = (text) => {
    const values = {};
    String(text || '').split(/\n/).forEach((line) => {
      const match = line.match(/(?:^|\s)key=([^,]+),\s*value=(.*)$/);
      if (match) values[clean(match[1])] = clean(match[2]);
    });
    return values;
  };

  const parseDynamicWallpapers = (text) => String(text || '')
    .split(/\n/)
    .map((line) => {
      const fields = {};
      line.replace(/(?:Row:\s*\d+\s+|,\s*)([a-z_]+)=([^,]*)/g, (_, key, value) => {
        fields[key] = clean(value);
        return '';
      });
      return Object.keys(fields).length ? fields : null;
    })
    .filter(Boolean);

  const compareVersions = (left, right) => {
    const a = String(left || '0').split(/[.-]/).map((part) => parseInt(part, 10) || 0);
    const b = String(right || '0').split(/[.-]/).map((part) => parseInt(part, 10) || 0);
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
      if ((a[i] || 0) > (b[i] || 0)) return 1;
      if ((a[i] || 0) < (b[i] || 0)) return -1;
    }
    return 0;
  };

  const normalizeRelease = (data) => {
    const version = clean(data?.version || data?.version_name);
    const downloadUrl = clean(data?.download_url || data?.url);
    if (!version || !downloadUrl || !/^https?:\/\//i.test(downloadUrl)) {
      throw new Error('更新信息缺少有效的 version 或 download_url');
    }
    return {
      version,
      releaseDate: clean(data?.release_date || data?.published_at),
      downloadUrl,
      changelog: Array.isArray(data?.changelog) ? data.changelog.map(clean).filter(Boolean) : [clean(data?.changelog)].filter(Boolean),
      sha256: clean(data?.sha256).toLowerCase(),
      minimumVersion: clean(data?.minimum_version),
    };
  };

  const fetchRelease = async () => {
    let lastError = null;
    for (const url of [UPDATE_PROXY_URL, UPDATE_URL]) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return normalizeRelease(await response.json());
      } catch (error) {
        lastError = error;
        console.warn('[U30Pro高级桌面] 更新源请求失败:', url, error);
      }
    }
    throw new Error(`无法获取更新信息：${lastError?.message || '网络请求失败'}`);
  };

  const refreshDeviceState = async () => {
    const packageResult = await run(`
if pm path ${shellQuote(PACKAGE_NAME)} >/dev/null 2>&1; then
  echo installed=1
  VERSION="$(dumpsys package ${shellQuote(PACKAGE_NAME)} 2>/dev/null | awk -F= '/versionName=/{print $2; exit}')"
  echo "version=$VERSION"
else
  echo installed=0
fi
`);
    const info = {};
    packageResult.text.split(/\n/).forEach((line) => {
      const index = line.indexOf('=');
      if (index > 0) info[line.slice(0, index)] = clean(line.slice(index + 1));
    });
    state.installed = packageResult.ok && info.installed === '1';
    state.version = state.installed ? (info.version || '未知') : '';
    state.settings = null;
    state.dynamicWallpapers = [];
    state.isDefault = false;
    if (state.installed) {
      const [settingsResult, dynamicResult] = await Promise.all([
        run(`content query --uri ${shellQuote(`${API_BASE}/settings`)}`, 15000),
        run(`content query --uri ${shellQuote(`${API_BASE}/dynamic_wallpapers`)}`, 15000),
      ]);
      if (settingsResult.ok) {
        state.settings = parseSettings(settingsResult.text);
        state.version = state.settings.version_name || state.version;
        state.isDefault = state.settings.is_default_launcher === 'true';
      }
      if (dynamicResult.ok) state.dynamicWallpapers = parseDynamicWallpapers(dynamicResult.text);
    }
    renderState();
  };

  const renderState = () => {
    const root = getRoot();
    if (!root) return;
    const status = root.querySelector('#ulm_app_status');
    const detail = root.querySelector('#ulm_app_detail');
    if (status) {
      status.textContent = state.installed ? '已安装' : '未安装';
      status.style.color = state.installed ? '#9cf2b1' : '#ffc19c';
    }
    if (detail) {
      detail.textContent = state.installed
        ? `版本 ${state.version || '未知'} · ${state.isDefault ? '当前默认桌面' : '尚未设为默认桌面'}`
        : '安装后即可使用桌面配置与壁纸管理功能';
    }
    const releaseEl = root.querySelector('#ulm_release_detail');
    if (releaseEl) {
      releaseEl.textContent = state.release
        ? `最新版本 ${state.release.version}${state.release.releaseDate ? ` · ${state.release.releaseDate}` : ''}`
        : '打开面板后会自动检查新版本';
    }
    root.querySelectorAll('[data-requires-install="1"]').forEach((element) => {
      element.disabled = state.busy || !state.installed;
    });
    const installButton = root.querySelector('#ulm_install');
    const updateButton = root.querySelector('#ulm_update');
    if (installButton) installButton.style.display = state.installed ? 'none' : '';
    if (updateButton) updateButton.style.display = state.installed ? '' : 'none';
    if (state.settings) {
      const password = root.querySelector('#ulm_password');
      const interval = root.querySelector('#ulm_interval');
      const source = root.querySelector('#ulm_traffic_source');
      if (password && document.activeElement !== password) password.value = state.settings.kano_password || 'admin';
      if (interval) interval.value = state.settings.refresh_interval_ms || '1000';
      if (source) source.value = state.settings.traffic_source || 'kano';
      const wallpaperType = root.querySelector('#ulm_wallpaper_type');
      if (wallpaperType) wallpaperType.value = state.settings.dashboard_wallpaper_type || 'static';
      const staticStatus = root.querySelector('#ulm_static_status');
      if (staticStatus) staticStatus.textContent = state.settings.static_wallpaper_exists === 'true'
        ? `已设置（${formatBytes(state.settings.static_wallpaper_size_bytes)}）`
        : '未设置，当前使用应用默认壁纸';
    }
    renderDynamicList();
  };

  const renderDynamicList = () => {
    const root = getRoot();
    const list = root?.querySelector('#ulm_dynamic_list');
    if (!list) return;
    if (!state.installed) {
      list.innerHTML = '<div class="ulm-sub">安装桌面后可用</div>';
      return;
    }
    if (!state.dynamicWallpapers.length) {
      list.innerHTML = '<div class="ulm-sub">尚未添加动态壁纸</div>';
      return;
    }
    list.innerHTML = state.dynamicWallpapers.map((item) => `
      <div class="ulm-item">
        <span>位置 ${escapeHtml(item.index)} · ${item.type === 'gif' ? 'GIF' : '视频'} · ${formatBytes(item.size_bytes)}${state.settings?.dashboard_dynamic_wallpaper_index === item.index ? ' · 当前使用' : ''}</span>
        <span style="display:flex;gap:7px;flex-shrink:0">
          ${state.settings?.dashboard_dynamic_wallpaper_index !== item.index ? `<button data-set-dashboard="${escapeHtml(item.index)}" ${state.busy ? 'disabled' : ''}>设为桌面</button>` : ``}
          <button data-replace-dynamic="${escapeHtml(item.index)}" ${state.busy ? 'disabled' : ''}>替换</button>
          <button data-delete-dynamic="${escapeHtml(item.index)}" class="ulm-danger" ${state.busy ? 'disabled' : ''}>删除</button>
        </span>
      </div>
    `).join('');
    list.querySelectorAll('[data-set-dashboard]').forEach((button) => {
      button.onclick = () => setDashboardWallpaper(button.dataset.setDashboard);
    });
    list.querySelectorAll('[data-replace-dynamic]').forEach((button) => {
      button.onclick = () => writeWallpaper('dynamic', button.dataset.replaceDynamic);
    });
    list.querySelectorAll('[data-delete-dynamic]').forEach((button) => {
      button.onclick = () => deleteDynamicWallpaper(button.dataset.deleteDynamic);
    });
  };

  const showUpdatePrompt = (release) => {
    const changelog = release.changelog.length
      ? `<ul style="margin:8px 0 0;padding-left:19px;font-weight:normal">${release.changelog.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : '<div style="margin-top:8px;font-weight:normal;opacity:.78">本次更新未提供更新说明</div>';
    const toast = createFixedToast('ulm_update_available', `
      <div style="pointer-events:all;width:88vw;max-width:500px">
        <div class="title" style="margin:0">发现 U30Pro 高级桌面新版本</div>
        <div style="margin-top:8px;font-size:.7rem;line-height:1.7">当前版本：${escapeHtml(state.version || '未安装')}<br>最新版本：${escapeHtml(release.version)}${release.releaseDate ? `<br>发布时间：${escapeHtml(release.releaseDate)}` : ''}</div>
        <div style="font-size:.68rem;line-height:1.65">${changelog}</div>
        <div style="display:flex;justify-content:flex-end;gap:9px;margin-top:13px;flex-wrap:wrap">
          <button class="install">${state.installed ? '下载并更新' : '下载并安装'}</button>
          <button class="later">稍后处理</button>
        </div>
      </div>
    `);
    toast?.el.querySelector('.install')?.addEventListener('click', async () => {
      toast.close();
      await installRelease(release);
    });
    toast?.el.querySelector('.later')?.addEventListener('click', () => toast.close());
  };

  const checkUpdates = async (manual = false) => {
    if (state.busy) return;
    if (manual) setBusy(true, '正在检查新版本...');
    try {
      if (manual) setProgress('正在通过反代接口获取版本信息...', 20, true);
      const release = await fetchRelease();
      if (manual) setProgress('版本信息获取完成，正在比较版本...', 75, true);
      state.release = release;
      renderState();
      const hasUpdate = !state.installed || compareVersions(release.version, state.version) > 0;
      if (manual) {
        setProgress(hasUpdate ? `检测到新版本 ${release.version}` : `当前已是最新版本 ${state.version}`, 100, true);
        await wait(500);
      }
      if (hasUpdate) showUpdatePrompt(release);
      else if (manual) createToast(`当前已是最新版本 ${state.version}`, 'pink', 3500);
    } catch (error) {
      if (manual) {
        setProgress(`检查更新失败：${error.message || '网络请求失败'}`, 100, true);
        createToast(error.message || '检查更新失败', 'red', 6000);
        await wait(650);
      }
      else console.warn('[U30Pro高级桌面] 自动检查更新失败:', error);
    } finally {
      if (manual) {
        setBusy(false);
        setProgress('', 0, false);
        renderState();
      }
    }
  };

  const getRemoteSize = async (url) => {
    const result = await run(`env ${SSL_ENV} ${shellQuote(CURL)} -fL -sI ${shellQuote(url)} | awk 'BEGIN{IGNORECASE=1}/^Content-Length:/{gsub("\\r","",$2);print $2}' | tail -n 1`, 20000);
    const size = parseInt(result.text || '0', 10);
    return Number.isFinite(size) ? size : 0;
  };

  const downloadRelease = async (release) => {
    const prepared = await run(`mkdir -p ${shellQuote(WORK_DIR)} && rm -f ${shellQuote(APK_PATH)} ${shellQuote(DOWNLOAD_LOG)}`);
    if (!prepared.ok) return { ok: false, message: '无法准备下载目录' };
    setProgress('正在获取安装包大小...', 6, true);
    const total = await getRemoteSize(release.downloadUrl);
    const started = await run(`(env ${SSL_ENV} ${shellQuote(CURL)} -fL --show-error ${shellQuote(release.downloadUrl)} -o ${shellQuote(APK_PATH)} && echo __DOWNLOAD_DONE__ || echo __DOWNLOAD_FAILED__) >${shellQuote(DOWNLOAD_LOG)} 2>&1 &`, 10000);
    if (!started.ok) return { ok: false, message: '无法启动安装包下载，请确认设备 curl 可用' };
    let completed = false;
    for (let i = 0; i < 600; i += 1) {
      const probe = await run(`
SIZE="$(wc -c < ${shellQuote(APK_PATH)} 2>/dev/null | tr -d ' \\r\\n')"
echo "size=${'$'}{SIZE:-0}"
if timeout 2s awk '{print}' ${shellQuote(DOWNLOAD_LOG)} 2>/dev/null | grep -q __DOWNLOAD_DONE__; then echo done=1; else echo done=0; fi
if timeout 2s awk '{print}' ${shellQuote(DOWNLOAD_LOG)} 2>/dev/null | grep -q __DOWNLOAD_FAILED__; then echo failed=1; else echo failed=0; fi
`, 5000);
      const size = parseInt(probe.text.match(/size=(\d+)/)?.[1] || '0', 10);
      const percent = total > 0 ? Math.min(100, Math.floor((size * 100) / total)) : 0;
      const overallPercent = 8 + (percent * 0.7);
      setProgress(total > 0
        ? `正在下载安装包... ${percent}%（${formatBytes(size)} / ${formatBytes(total)}）`
        : `正在下载安装包... 已下载 ${formatBytes(size)}`, total > 0 ? overallPercent : 12, true);
      if (/done=1/.test(probe.text)) {
        completed = true;
        break;
      }
      if (/failed=1/.test(probe.text)) {
        const logResult = await run(`timeout 2s awk '{print}' ${shellQuote(DOWNLOAD_LOG)} 2>/dev/null`, 5000);
        await run(`rm -f ${shellQuote(DOWNLOAD_LOG)}`, 5000);
        return { ok: false, message: `安装包下载失败：${clean(logResult.text) || '远端服务器未返回有效文件'}` };
      }
      await wait(1000);
    }
    await run(`rm -f ${shellQuote(DOWNLOAD_LOG)}`, 5000);
    if (!completed) return { ok: false, message: '安装包下载超时，请稍后重试' };
    if (release.sha256) {
      setProgress('下载完成，正在校验安装包...', 82, true);
      const sum = await run(`sha256sum ${shellQuote(APK_PATH)} 2>/dev/null | awk '{print $1}'`, 20000);
      if (clean(sum.text).toLowerCase() !== release.sha256) return { ok: false, message: '安装包 SHA-256 校验失败，已停止安装' };
    }
    return { ok: true };
  };

  const installRelease = async (providedRelease = null) => {
    if (state.busy) return;
    const wasInstalled = state.installed;
    setBusy(true, '正在准备安装...');
    setProgress('正在获取可安装版本...', 2, true);
    try {
      const release = providedRelease || state.release || await fetchRelease();
      state.release = release;
      setProgress(`准备安装版本 ${release.version}...`, 4, true);
      if (wasInstalled && compareVersions(release.version, state.version) <= 0) {
        const continueInstall = await askConfirm('ulm_reinstall_confirm', '重新安装当前版本', `设备当前版本为 ${state.version}，远端版本为 ${release.version}。是否仍要继续安装？`, '继续安装');
        if (!continueInstall) return;
      }
      const downloaded = await downloadRelease(release);
      if (!downloaded.ok) throw new Error(downloaded.message);
      setProgress('下载完成，正在调用系统安装器...', 85, true);
      const installResult = await run(`pm install -r -d ${shellQuote(APK_PATH)}`, 180000);
      if (!installResult.ok || !/Success/i.test(installResult.text)) throw new Error(installResult.text || '系统未能完成安装');
      if (!wasInstalled) {
        setProgress('安装成功，正在设为默认桌面...', 93, true);
        const defaultResult = await run(`cmd package set-home-activity ${shellQuote(MAIN_ACTIVITY)}`, 20000);
        if (!defaultResult.ok) createToast('桌面已安装，但自动设置默认桌面失败，可稍后手动设置', 'pink', 6000);
      }
      setProgress('安装成功，正在启动桌面...', 97, true);
      const launchResult = await run(`am start -n ${shellQuote(MAIN_ACTIVITY)}`, 20000);
      if (!launchResult.ok) throw new Error(`桌面已安装，但启动失败：${launchResult.text || '未知错误'}`);
      setProgress('正在自动设置UFI密码...', 99, true);
      await wait(3000);
      await autoPassSet();
      setProgress(`${wasInstalled ? '更新' : '安装'}完成，桌面已启动`, 100, true);
      createToast(`${wasInstalled ? '更新' : '安装'}完成，已启动 U30Pro 高级桌面`, 'pink', 5000);
      await wait(700);
    } catch (error) {
      setProgress(`操作失败：${error.message || error}`, 100, true);
      createToast(`操作失败：${error.message || error}`, 'red', 7000);
      await wait(800);
    } finally {
      await run(`rm -f ${shellQuote(APK_PATH)} ${shellQuote(DOWNLOAD_LOG)}`, 8000);
      await refreshDeviceState();
      setBusy(false);
      setProgress('', 0, false);
      renderState();
    }
  };

  const startLauncher = async () => {
    setBusy(true, '正在启动桌面...');
    setProgress('正在向系统发送桌面启动请求...', 30, true);
    const result = await run(`am start -n ${shellQuote(MAIN_ACTIVITY)}`, 20000);
    setProgress(result.ok ? '桌面启动请求已完成' : '桌面启动失败', 100, true);
    createToast(result.ok ? '已启动 U30Pro 高级桌面' : `启动失败：${result.text || '未知错误'}`, result.ok ? 'pink' : 'red', 5000);
    await wait(450);
    setBusy(false);
    setProgress('', 0, false);
    renderState();
  };

  const setDefaultLauncher = async () => {
    setBusy(true, '正在设置默认桌面...');
    setProgress('正在请求系统切换默认桌面...', 30, true);
    const result = await run(`cmd package set-home-activity ${shellQuote(MAIN_ACTIVITY)}`, 20000);
    setProgress('系统设置完成，正在确认默认桌面状态...', 78, true);
    await refreshDeviceState();
    setProgress(result.ok && state.isDefault ? '默认桌面设置完成' : '未能确认默认桌面状态', 100, true);
    createToast(result.ok && state.isDefault ? '已设为默认桌面' : '设置后未能确认默认状态，请重试', result.ok && state.isDefault ? 'pink' : 'red', 5000);
    await wait(500);
    setBusy(false);
    setProgress('', 0, false);
    renderState();
  };

  const uninstallLauncher = async () => {
    const first = await askConfirm('ulm_uninstall_confirm_1', '卸载 U30Pro 高级桌面', '卸载会移除应用及其本地配置、静态壁纸和动态壁纸。是否继续？', '继续', true);
    if (!first) return;
    const second = await askConfirm('ulm_uninstall_confirm_2', '再次确认卸载', '此操作不可撤销。请确认你已了解应用数据会一并删除。', '确认卸载', true);
    if (!second) return;
    setBusy(true, '正在卸载桌面...');
    setProgress('正在请求系统卸载应用...', 25, true);
    const result = await run(`pm uninstall ${shellQuote(PACKAGE_NAME)}`, 90000);
    setProgress('卸载命令执行完成，正在确认应用状态...', 82, true);
    await refreshDeviceState();
    const ok = result.ok && /Success/i.test(result.text) && !state.installed;
    setProgress(ok ? 'U30Pro 高级桌面已卸载' : '卸载未完成', 100, true);
    createToast(ok ? 'U30Pro 高级桌面已卸载' : `卸载失败：${result.text || '未知错误'}`, ok ? 'pink' : 'red', 6000);
    await wait(550);
    setBusy(false);
    setProgress('', 0, false);
    renderState();
  };

  const saveSettings = async () => {
    const root = getRoot();
    const password = clean(root?.querySelector('#ulm_password')?.value);
    const interval = root?.querySelector('#ulm_interval')?.value || '1000';
    const trafficSource = root?.querySelector('#ulm_traffic_source')?.value || 'kano';
    const wallpaperType = root?.querySelector('#ulm_wallpaper_type')?.value || 'static';
    if (!password) return createToast('UFI-TOOLS 密码不能为空', 'red', 4000);
    setBusy(true, '正在保存桌面设置...');
    setProgress('正在向桌面应用写入设置...', 25, true);
    const commands = [
      `content update --uri ${shellQuote(`${API_BASE}/settings/kano_password`)} --bind ${shellQuote(`value:s:${password}`)}`,
      `content update --uri ${shellQuote(`${API_BASE}/settings/refresh_interval_ms`)} --bind ${shellQuote(`value:l:${interval}`)}`,
      `content update --uri ${shellQuote(`${API_BASE}/settings/traffic_source`)} --bind ${shellQuote(`value:s:${trafficSource}`)}`,
      `content update --uri ${shellQuote(`${API_BASE}/settings/dashboard_wallpaper_type`)} --bind ${shellQuote(`value:s:${wallpaperType}`)}`,
    ];
    const result = await run(commands.join('\n'), 25000);
    setProgress('设置已提交，正在回读确认...', 75, true);
    await refreshDeviceState();
    const verified = result.ok
      && state.settings?.kano_password === password
      && state.settings?.refresh_interval_ms === interval
      && state.settings?.traffic_source === trafficSource;
    setProgress(verified ? '桌面设置保存完成' : '设置回读结果不一致', 100, true);
    createToast(verified ? '桌面设置已保存' : '设置已提交，但回读结果不一致，请重试', verified ? 'pink' : 'red', 5500);
    await wait(500);
    setBusy(false);
    setProgress('', 0, false);
    renderState();
  };

  const chooseFile = (accept) => new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);
    let settled = false;
    const finish = (file = null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };
    input.onchange = () => finish(input.files?.[0] || null);
    input.oncancel = () => finish(null);
    input.addEventListener('blur', () => setTimeout(() => {
      if (!input.files?.length) finish(null);
    }, 350), { once: true });
    input.click();
  });

  const uploadWithProgress = async (file) => {
    const form = new FormData();
    form.append('file', file);
    let progress = 8;
    setProgress(`正在通过 UFI 接口上传 ${file.name}...`, progress, true);
    const timer = setInterval(() => {
      progress = Math.min(70, progress + (progress < 35 ? 4 : 2));
      setProgress(`正在通过 UFI 接口上传 ${file.name}...`, progress, true);
    }, 700);
    try {
      const response = await fetch(`${KANO_baseURL}/upload_img`, {
        method: 'POST',
        headers: common_headers,
        body: form,
      });
      const result = await response.json();
      if (!result?.url) throw new Error(result?.error || `上传接口返回异常${response?.status ? `（HTTP ${response.status}）` : ''}`);
      setProgress('文件上传完成，正在准备写入桌面应用...', 75, true);
      const relativePath = String(result.url).startsWith('/uploads/')
        ? result.url
        : `/uploads/${String(result.url).split('/').pop()}`;
      return `/data/data/com.minikano.f50_sms/files${relativePath}`;
    } finally {
      clearInterval(timer);
    }
  };

  const waitWriteStatus = async () => {
    for (let i = 0; i < 120; i += 1) {
      const result = await run(`content query --uri ${shellQuote(`${API_BASE}/status`)}`, 8000);
      const status = {};
      result.text.replace(/(?:Row:\s*\d+\s+|,\s*)(state|message|timestamp_ms)=([^,]*)/g, (_, key, value) => {
        status[key] = clean(value);
        return '';
      });
      if (status.state === 'success') return { ok: true, message: status.message || '设置成功' };
      if (status.state === 'error') return { ok: false, message: status.message || '应用未能处理该文件' };
      setProgress(status.message || '应用正在处理文件...', Math.min(98, 86 + (i * 0.25)), true);
      await wait(500);
    }
    return { ok: false, message: '等待应用处理文件超时' };
  };

  const writeWallpaper = async (kind, replaceIndex = null) => {
    const isStatic = kind === 'static';
    const isReplacing = !isStatic && replaceIndex !== null;
    if (!isStatic && !isReplacing && state.dynamicWallpapers.length >= 5) return createToast('动态壁纸最多可添加 5 个，请先删除一个', 'red', 5000);
    const file = await chooseFile(isStatic ? 'image/jpeg,image/png,image/webp,image/*' : 'video/*,image/gif,.gif,.mp4,.webm,.mkv');
    if (!file) return;
    if (!isStatic && file.size > 300 * 1024 * 1024) return createToast('动态壁纸不能超过 300 MB', 'red', 5000);
    const type = isStatic ? '' : (/gif$/i.test(file.name) || file.type === 'image/gif' ? 'gif' : 'video');
    let tempPath = '';
    setBusy(true, `正在上传 ${file.name}...`);
    setProgress(`正在准备上传 ${file.name}...`, 3, true);
    try {
      tempPath = await uploadWithProgress(file);
      setProgress('上传完成，正在写入桌面应用...', 80, true);
      const uri = isStatic
        ? `${API_BASE}/wallpaper`
        : `${API_BASE}/dynamic_wallpapers/${isReplacing ? replaceIndex : 'new'}?type=${type}`;
      const writeResult = await run(`content write --uri ${shellQuote(uri)} < ${shellQuote(tempPath)}`, 360000);
      if (!writeResult.ok) throw new Error(writeResult.text || '无法将文件写入桌面应用');
      setProgress('文件已传入桌面应用，正在等待处理结果...', 86, true);
      const status = await waitWriteStatus();
      if (!status.ok) throw new Error(status.message);
      const successText = isStatic ? '静态壁纸设置完成' : (isReplacing ? `位置 ${replaceIndex} 的动态壁纸替换完成` : '动态壁纸添加完成');
      setProgress(successText, 100, true);
      createToast(successText, 'pink', 5000);
      await wait(550);
    } catch (error) {
      setProgress(`设置失败：${error.message || error}`, 100, true);
      createToast(`设置失败：${error.message || error}`, 'red', 7000);
      await wait(800);
    } finally {
      if (tempPath) await run(`rm -f ${shellQuote(tempPath)}`, 10000);
      await refreshDeviceState();
      setBusy(false);
      setProgress('', 0, false);
      renderState();
    }
  };

  const clearStaticWallpaper = async () => {
    const confirmed = await askConfirm('ulm_clear_static', '清除静态壁纸', '清除后将恢复使用应用默认壁纸。', '确认清除');
    if (!confirmed) return;
    setBusy(true, '正在清除静态壁纸...');
    setProgress('正在请求桌面应用清除静态壁纸...', 30, true);
    const result = await run(`content delete --uri ${shellQuote(`${API_BASE}/wallpaper`)}`, 20000);
    setProgress('清除请求已提交，正在确认结果...', 78, true);
    await refreshDeviceState();
    const cleared = result.ok && state.settings?.static_wallpaper_exists !== 'true';
    setProgress(cleared ? '静态壁纸已清除' : '未能确认清除结果', 100, true);
    createToast(cleared ? '静态壁纸已清除' : '清除后未能确认结果，请重试', cleared ? 'pink' : 'red', 5000);
    await wait(450);
    setBusy(false);
    setProgress('', 0, false);
    renderState();
  };

  const deleteDynamicWallpaper = async (index) => {
    const confirmed = await askConfirm(`ulm_delete_dynamic_${index}`, '删除动态壁纸', `确认删除位置 ${index} 的动态壁纸吗？`, '确认删除');
    if (!confirmed) return;
    const targetId = state.dynamicWallpapers.find((item) => item.index === String(index))?.id || '';
    setBusy(true, '正在删除动态壁纸...');
    setProgress(`正在删除位置 ${index} 的动态壁纸...`, 30, true);
    const result = await run(`content delete --uri ${shellQuote(`${API_BASE}/dynamic_wallpapers/${index}`)}`, 20000);
    setProgress('删除请求已提交，正在确认结果...', 78, true);
    await refreshDeviceState();
    const removed = result.ok && (targetId
      ? !state.dynamicWallpapers.some((item) => item.id === targetId)
      : !state.dynamicWallpapers.some((item) => item.index === String(index)));
    setProgress(removed ? '动态壁纸已删除' : '未能确认删除结果', 100, true);
    createToast(removed ? '动态壁纸已删除' : '删除后未能确认结果，请重试', removed ? 'pink' : 'red', 5000);
    await wait(450);
    setBusy(false);
    setProgress('', 0, false);
    renderState();
  };

  const setDashboardWallpaper = async (index) => {
    setBusy(true, '正在设置 Dashboard 壁纸...');
    setProgress(`正在将动态壁纸 ${index} 设为 Dashboard 壁纸...`, 30, true);
    const result = await run(`content update --uri ${shellQuote(`${API_BASE}/settings/dashboard_dynamic_wallpaper_index`)} --bind ${shellQuote(`value:s:${index}`)}`, 20000);
    setProgress('设置已提交，正在确认结果...', 78, true);
    await refreshDeviceState();
    const success = result.ok && state.settings?.dashboard_dynamic_wallpaper_index === String(index);
    setProgress(success ? 'Dashboard 壁纸设置完成' : '未能确认设置结果', 100, true);
    createToast(success ? 'Dashboard 壁纸已设为当前选择' : '设置后未能确认结果，请重试', success ? 'pink' : 'red', 5000);
    await wait(450);
    setBusy(false);
    setProgress('', 0, false);
    renderState();
  };

  const clearDynamicWallpapers = async () => {
    if (!state.dynamicWallpapers.length) return createToast('当前没有动态壁纸', 'pink', 3000);
    const confirmed = await askConfirm('ulm_clear_dynamic', '清空动态壁纸', '确认删除全部动态壁纸吗？此操作不可撤销。', '全部删除', true);
    if (!confirmed) return;
    setBusy(true, '正在清空动态壁纸...');
    setProgress('正在请求桌面应用清空动态壁纸...', 30, true);
    const result = await run(`content delete --uri ${shellQuote(`${API_BASE}/dynamic_wallpapers`)}`, 20000);
    setProgress('清空请求已提交，正在确认结果...', 78, true);
    await refreshDeviceState();
    const cleared = result.ok && state.dynamicWallpapers.length === 0;
    setProgress(cleared ? '动态壁纸已全部清空' : '未能确认清空结果', 100, true);
    createToast(cleared ? '动态壁纸已清空' : '清空后未能确认结果，请重试', cleared ? 'pink' : 'red', 5000);
    await wait(450);
    setBusy(false);
    setProgress('', 0, false);
    renderState();
  };

  const bindActions = () => {
    const root = getRoot();
    if (!root) return;
    root.querySelector('#ulm_refresh').onclick = async () => {
      setBusy(true, '正在刷新应用状态...');
      setProgress('正在读取应用和桌面配置...', 25, true);
      await refreshDeviceState();
      setProgress('应用状态刷新完成', 100, true);
      await wait(400);
      setBusy(false);
      setProgress('', 0, false);
      renderState();
    };
    root.querySelector('#ulm_install').onclick = () => installRelease();
    root.querySelector('#ulm_update').onclick = () => installRelease();
    root.querySelector('#ulm_check_update').onclick = () => checkUpdates(true);
    root.querySelector('#ulm_launch').onclick = startLauncher;
    root.querySelector('#ulm_default').onclick = setDefaultLauncher;
    root.querySelector('#ulm_uninstall').onclick = uninstallLauncher;
    root.querySelector('#ulm_download_login_module').onclick = downloadLoginPromptModule;
    root.querySelector('#ulm_save_settings').onclick = saveSettings;
    root.querySelector('#ulm_upload_static').onclick = () => writeWallpaper('static');
    root.querySelector('#ulm_clear_static').onclick = clearStaticWallpaper;
    root.querySelector('#ulm_add_dynamic').onclick = () => writeWallpaper('dynamic');
    root.querySelector('#ulm_clear_dynamic').onclick = clearDynamicWallpapers;
  };

  //自动设置ufi密码
  const autoPassSet = async () => {
    const token = KANO_TOKEN || localStorage.getItem('kano_token') || '';
    if (!token) {
      createToast('未检测现成的Token，请稍后手动设置 UFI-TOOLS 密码');
      return false
    }
    const command = `content update --uri ${shellQuote(`${API_BASE}/settings/kano_password`)} --bind ${shellQuote(`value:s:${token}`)}`
    const result = await run(command, 30000)
    const verified = result.ok
    if (verified) {
      if(state && state.settings && state.settings.kano_password) {
        state.settings.kano_password = token
      }
      renderState()
    } else {
      createToast('未检测现成的Token，请稍后手动设置 UFI-TOOLS 密码');
      return false
    }
    return true
  }

  const openModal = async () => {
    document.getElementById(MODAL_NAME)?.remove();
    injectStyle();
    const { id } = createModal({
      name: MODAL_NAME,
      title: 'U30Pro 高级桌面管理',
      maxWidth: '920px',
      isMask: true,
      showConfirm: false,
      onClose: () => !state.busy,
      contentStyle: 'max-height:78vh;',
      content: `
        <div class="ulm-wrap">
          <div id="ulm_progress" class="ulm-card ulm-progress">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
              <div id="ulm_progress_text" class="ulm-progress-text" style="margin-bottom:6px">就绪</div>
              <div id="ulm_progress_percent" style="font-size:.62rem;opacity:.72;white-space:nowrap">—</div>
            </div>
            <div class="ulm-progress-track"><div id="ulm_progress_bar" class="ulm-progress-bar"></div></div>
          </div>

          <div class="ulm-scroll">
          <div class="ulm-card">
            <div class="ulm-head">
              <div>
                <div class="ulm-title">应用管理</div>
                <div id="ulm_app_detail" class="ulm-sub">正在读取设备状态...</div>
              </div>
              <span id="ulm_app_status" class="ulm-status">检测中</span>
            </div>
            <div class="ulm-actions">
              <button id="ulm_install">安装桌面</button>
              <button id="ulm_update" data-requires-install="1">更新桌面</button>
              <button id="ulm_launch" data-requires-install="1">启动桌面</button>
              <button id="ulm_default" data-requires-install="1">设为默认桌面</button>
              <button id="ulm_refresh">刷新状态</button>
              <button id="ulm_uninstall" data-requires-install="1" class="ulm-danger">卸载桌面</button>
              <button id="ulm_download_login_module">安装去除登录提示模块</button>
            </div>
          </div>

          <div class="ulm-card">
            <div class="ulm-head">
              <div>
                <div class="ulm-title">版本更新</div>
                <div id="ulm_release_detail" class="ulm-sub">正在准备检查新版本...</div>
              </div>
              <button id="ulm_check_update">检查更新</button>
            </div>
          </div>

          <div class="ulm-card">
            <div class="ulm-title">桌面设置</div>
            <div class="ulm-sub">设置保存后会立即同步到高级桌面。</div>
            <div class="ulm-grid">
              <div class="ulm-field">
                <label for="ulm_password">UFI-TOOLS 密码</label>
                <div style="display:flex;align-items:center;gap:6px">
                  <input id="ulm_password" data-requires-install="1" type="password" autocomplete="off" placeholder="admin">
                  <button style="flex-shrink: 0;height: 100%;" id="auto_pass_get">自动获取</button>
                </div>
              </div>
              <div class="ulm-field">
                <label for="ulm_interval">主页刷新间隔</label>
                <select id="ulm_interval" data-requires-install="1">
                  <option value="1000">1 秒</option>
                  <option value="5000">5 秒</option>
                  <option value="10000">10 秒</option>
                </select>
              </div>
              <div class="ulm-field">
                <label for="ulm_traffic_source">月流量来源</label>
                <select id="ulm_traffic_source" data-requires-install="1">
                  <option value="kano">UFI-TOOLS 流量统计</option>
                  <option value="goform">官方后台 流量统计</option>
                </select>
              </div>
              <div class="ulm-field">
                <label for="ulm_wallpaper_type">主页壁纸类型</label>
                <select id="ulm_wallpaper_type" data-requires-install="1">
                  <option value="static">静态壁纸</option>
                  <option value="dynamic">动态壁纸</option>
                </select>
              </div>
            </div>
            <div class="ulm-field" style="margin-top:10px;justify-content:flex-end">
                <button id="ulm_save_settings" data-requires-install="1">保存设置</button>
            </div>
          </div>

          <div class="ulm-card">
            <div class="ulm-title">静态壁纸</div>
            <div id="ulm_static_status" class="ulm-sub">安装桌面后可用</div>
            <div class="ulm-actions">
              <button id="ulm_upload_static" data-requires-install="1">选择并设置壁纸</button>
              <button id="ulm_clear_static" data-requires-install="1">恢复默认壁纸</button>
            </div>
          </div>

          <div class="ulm-card">
            <div class="ulm-head">
              <div>
                <div class="ulm-title">动态壁纸</div>
                <div class="ulm-sub">支持视频和 GIF，最多 5 个，单个文件不超过 300 MB。</div>
              </div>
              <span class="ulm-status">不显示预览</span>
            </div>
            <div class="ulm-actions">
              <button id="ulm_add_dynamic" data-requires-install="1">添加动态壁纸</button>
              <button id="ulm_clear_dynamic" data-requires-install="1" class="ulm-danger">清空全部</button>
            </div>
            <div id="ulm_dynamic_list" class="ulm-list"><div class="ulm-sub">正在读取...</div></div>
          </div>
          </div>

        </div>
      `,
    });
    showModal(id);
    bindActions();
    setBusy(true, '正在读取设备状态...');
    setProgress('正在读取应用安装状态和桌面配置...', 20, true);
    await refreshDeviceState();
    setProgress('设备状态读取完成', 100, true);
    await wait(350);
    setBusy(false);
    setProgress('', 0, false);
    renderState();
    checkUpdates(false);

    const autoPassBtn = document.getElementById('auto_pass_get');
    if (autoPassBtn) {
      autoPassBtn.onclick = () => {
        const kanoSmsToken = KANO_TOKEN || localStorage.getItem("kano_sms_token");
        if (!kanoSmsToken) {
          createToast('未检测到 UFI-TOOLS 登录状态，请先登录');
          return;
        }
        const ulm_password = document.getElementById('ulm_password');
        if (ulm_password) {
          ulm_password.value = kanoSmsToken
          createToast("获取成功")
        };
      };
    }
  };

  const mainButton = document.createElement('button');
  mainButton.textContent = '高级桌面管理';
  mainButton.onclick = async () => {
    if (typeof checkAdvancedFunc === 'function' && !(await checkAdvancedFunc())) {
      createToast('请先启用高级功能', 'pink');
      return;
    }
    await openModal();
  };

  while (!document.querySelector('.actions-buttons')) await wait(150);
  if (!document.querySelector('[data-kano-u30pro-launcher-manager="1"]')) {
    mainButton.dataset.kanoU30proLauncherManager = '1';
    document.querySelector('.actions-buttons')?.appendChild(mainButton);
  }
})();
//</script>
