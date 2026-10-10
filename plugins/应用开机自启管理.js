//<script>
(async () => {
  const TITLE = '应用开机自启管理';
  const MODAL_NAME = 'kano_auto_launch_app_modal';
  const FORM_TOAST_ID = 'kano_auto_launch_app_form_toast';
  const STYLE_ID = 'kano_auto_launch_app_style';
  const STORAGE_DIR = '/data/kano_auto_launch_app';
  const STORAGE_FILE = `${STORAGE_DIR}/apps.json`;
  const AUTOSTART_SCRIPT = `${STORAGE_DIR}/autostart.sh`;
  const BOOT_SH_FILE = '/sdcard/ufi_tools_boot.sh';
  const BOOT_LINE = `sh ${AUTOSTART_SCRIPT} &`;

  const state = {
    entries: [],
    busy: false,
    scriptPreview: '',
    bootEnabled: false,
    loadedAt: '',
  };

  const wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const shellQuote = (value = '') => `'${String(value).replace(/'/g, `'\\''`)}'`;
  const normalizeLine = (text = '') => String(text).replace(/\r/g, '').trim();
  const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const inferDisplayName = (packageName = '') => {
    const value = String(packageName || '').trim();
    if (!value) return '';
    const parts = value.split('.');
    return parts[parts.length - 1] || value;
  };

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
      #${MODAL_NAME} .ala-wrap {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      #${MODAL_NAME} .ala-panel,
      #${MODAL_NAME} .ala-card,
      #${MODAL_NAME} .ala-stat {
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.035);
        backdrop-filter: blur(10px);
      }
      #${MODAL_NAME} .ala-panel,
      #${MODAL_NAME} .ala-card,
      #${MODAL_NAME} .ala-stat {
        padding: 12px 14px;
      }
      #${MODAL_NAME} .ala-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      #${MODAL_NAME} .ala-stat-label {
        font-size: .64rem;
        opacity: .7;
        margin-bottom: 6px;
      }
      #${MODAL_NAME} .ala-stat-value {
        font-size: .86rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .ala-panel-head,
      #${MODAL_NAME} .ala-card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }
      #${MODAL_NAME} .ala-panel-title,
      #${MODAL_NAME} .ala-card-title {
        font-size: .78rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .ala-tip,
      #${MODAL_NAME} .ala-empty {
        font-size: .66rem;
        line-height: 1.7;
        opacity: .8;
      }
      #${MODAL_NAME} .ala-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        width: 100%;
      }
      #${MODAL_NAME} .ala-actions{
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        width: 100%;
        justify-content: end;
      }
      #${MODAL_NAME} .ala-list {
        display: grid;
        gap: 10px;
        margin-top: 10px;
      }
      #${MODAL_NAME} .ala-chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 9px;
        border-radius: 999px;
        font-size: .62rem;
        font-weight: 700;
        background: rgba(255,255,255,.08);
      }
      #${MODAL_NAME} .ala-chip[data-kind="good"] {
        background: rgba(60,201,120,.16);
        color: #9dffbf;
      }
      #${MODAL_NAME} .ala-chip[data-kind="warn"] {
        background: rgba(255,173,51,.16);
        color: #ffd08a;
      }
      #${MODAL_NAME} .ala-card-main {
        margin-top: 8px;
        display: grid;
        gap: 8px;
      }
      #${MODAL_NAME} .ala-code {
        white-space: pre-wrap;
        word-break: break-word;
        font-size: .62rem;
        line-height: 1.6;
        padding: 9px 10px;
        border-radius: 10px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.06);
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
      #${MODAL_NAME} pre {
        white-space: pre-wrap;
        word-break: break-word;
        margin: 10px 0 0;
        font-size: .62rem;
        line-height: 1.65;
        max-height: 260px;
        overflow: auto;
      }
      .ala-form-wrap {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: min(92vw, 860px);
      }
      .ala-form-tip {
        font-size: .66rem;
        line-height: 1.7;
        opacity: .85;
      }
      .ala-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .ala-form-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .ala-form-field[data-span="full"] {
        grid-column: 1 / -1;
      }
      .ala-form-label {
        font-size: .66rem;
        font-weight: 700;
      }
      .ala-form-field input,
      .ala-form-field select,
      .ala-form-field textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 7px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.1);
        outline: none;
        color: #fff;
        background: rgba(255,255,255,.04);
      }
      .ala-form-field textarea {
        min-height: 68px;
        resize: vertical;
      }
      .ala-form-field input:focus,
      .ala-form-field select:focus,
      .ala-form-field textarea:focus {
        border-color: rgba(102,195,255,.75);
        box-shadow: 0 0 0 3px rgba(102,195,255,.12);
      }
      .ala-form-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 180px;
        overflow: auto;
        padding: 8px;
        border-radius: 10px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.06);
      }
      .ala-form-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 6px 4px;
        border-radius: 8px;
      }
      .ala-form-item input[type="radio"] {
        width: fit-content;
        flex: 0 0 auto;
      }
      .ala-form-item:hover {
        background: rgba(255,255,255,.04);
      }
      .ala-form-item code {
        word-break: break-all;
      }
      .ala-form-search {
        margin-bottom: 8px;
      }
      .ala-form-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;
      }
      .ala-inline-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .ala-inline-check {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: .62rem;
        white-space: nowrap;
        opacity: .9;
      }
      .ala-inline-check input {
        width: auto;
        margin: 0;
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} .ala-grid,
        .ala-form-grid {
          grid-template-columns: 1fr;
        }
        #${MODAL_NAME} .ala-panel-head,
        #${MODAL_NAME} .ala-card-head {
          flex-direction: column;
          align-items: center;
        }
        #${MODAL_NAME} .ala-actions button,
        .ala-form-actions button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const setBusy = (busy) => {
    state.busy = busy;
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (root) {
      root.querySelectorAll('button, input, textarea, select').forEach((el) => {
        if (el.dataset.lockIgnore === '1') return;
        el.disabled = busy;
      });
    }
    const formRoot = document.getElementById(FORM_TOAST_ID);
    if (formRoot) {
      formRoot.querySelectorAll('button, input, textarea, select').forEach((el) => {
        if (el.dataset.lockIgnore === '1') return;
        el.disabled = busy;
      });
    }
  };

  const normalizeEntry = (entry = {}) => {
    const delay = Number.parseInt(String(entry.delaySeconds ?? '0').trim(), 10);
    const type = String(entry.type || 'activity').trim() || 'activity';
    const componentType = type === 'service' || type === 'foreground-service' ? 'service' : 'activity';
    return {
      id: String(entry.id || `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`),
      name: String(entry.name || '').trim(),
      appPath: String(entry.appPath || '').trim(),
      packageName: String(entry.packageName || '').trim(),
      type,
      componentType,
      componentName: String(entry.componentName || '').trim(),
      componentLabel: String(entry.componentLabel || entry.componentName || '').trim(),
      args: String(entry.args || '').trim(),
      delaySeconds: Number.isFinite(delay) && delay >= 0 ? delay : 0,
      createdAt: String(entry.createdAt || new Date().toISOString()),
      updatedAt: String(entry.updatedAt || new Date().toISOString()),
    };
  };

  const buildCommand = (entry) => {
    const target = normalizeEntry(entry);
    const amCmd = target.type === 'service'
      ? 'am startservice'
      : target.type === 'foreground-service'
        ? 'am start-foreground-service'
        : 'am start';
    const argPart = target.args ? ` ${target.args}` : '';
    const baseCmd = `${amCmd} -n ${shellQuote(`${target.packageName}/${target.componentName}`)}${argPart}`;
    if (target.delaySeconds > 0) {
      return `( sleep ${target.delaySeconds}; ${baseCmd} ) &`;
    }
    return `${baseCmd} &`;
  };

  const buildAutostartScript = (entries = state.entries) => {
    const lines = [
      '#!/system/bin/sh',
      '# kano auto generated: auto launch apps',
      '',
      'PATH=/system/bin:/system/xbin:/vendor/bin:$PATH',
      '',
    ];
    entries.map(normalizeEntry).forEach((entry) => {
      lines.push(`# ${entry.name || entry.packageName}`);
      lines.push(buildCommand(entry));
      lines.push('');
    });
    return `${lines.join('\n').trim()}\n`;
  };

  const writeRemoteFile = async (path, content, mode = '600') => {
    const encoded = encodePayload(content);
    if (!encoded) return false;
    const res = await run(`
mkdir -p ${shellQuote(path.substring(0, path.lastIndexOf('/')) || '/')}
printf '%s' ${shellQuote(encoded)} | base64 -d > ${shellQuote(path)}
chmod ${mode} ${shellQuote(path)}
`, 20000);
    return res.ok;
  };

  const readJsonEntries = async () => {
    const res = await run(`timeout 2s awk '{print}' ${shellQuote(STORAGE_FILE)} 2>/dev/null || true`, 4000);
    const raw = normalizeLine(res.text);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeEntry);
    } catch {
      return [];
    }
  };

  const checkBootEnabled = async () => {
    const res = await run(`
touch ${shellQuote(BOOT_SH_FILE)}
grep -qxF ${shellQuote(BOOT_LINE)} ${shellQuote(BOOT_SH_FILE)}
echo $?
`, 8000);
    return res.ok && normalizeLine(res.text).endsWith('0');
  };

  const ensureBootHook = async () => {
    const res = await run(`
touch ${shellQuote(BOOT_SH_FILE)}
grep -qxF ${shellQuote(BOOT_LINE)} ${shellQuote(BOOT_SH_FILE)} || echo ${shellQuote(BOOT_LINE)} >> ${shellQuote(BOOT_SH_FILE)}
`, 12000);
    return res.ok;
  };

  const removeBootHook = async () => {
    const escapedLine = BOOT_LINE.replace(/\//g, '\\/');
    const res = await run(`
touch ${shellQuote(BOOT_SH_FILE)}
sed -i '\\#^${escapedLine.replace(/&/g, '\\&')}$#d' ${shellQuote(BOOT_SH_FILE)}
`, 12000);
    return res.ok;
  };

  const persistAll = async () => {
    const jsonOk = await writeRemoteFile(STORAGE_FILE, JSON.stringify(state.entries), '600');
    if (!jsonOk) return false;
    const scriptOk = await writeRemoteFile(AUTOSTART_SCRIPT, buildAutostartScript(), '755');
    if (!scriptOk) return false;
    const bootOk = await ensureBootHook();
    if (!bootOk) return false;
    state.scriptPreview = buildAutostartScript();
    state.bootEnabled = true;
    return true;
  };

  const refreshState = async () => {
    state.entries = await readJsonEntries();
    state.scriptPreview = buildAutostartScript();
    state.bootEnabled = await checkBootEnabled();
    state.loadedAt = new Date().toLocaleString('zh-CN', { hour12: false });
  };

  const getTypeLabel = (type) => {
    if (type === 'service') return '后台服务';
    if (type === 'foreground-service') return '前台服务';
    return '普通应用';
  };

  const renderEntries = () => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    const listEl = root.querySelector('#ala_entry_list');
    const countEl = root.querySelector('#ala_entry_count');
    const bootEl = root.querySelector('#ala_boot_status');
    const updatedEl = root.querySelector('#ala_loaded_at');
    const scriptEl = root.querySelector('#ala_script_preview');

    if (countEl) countEl.textContent = String(state.entries.length);
    if (bootEl) {
      bootEl.textContent = state.bootEnabled ? '已接入 /sdcard/ufi_tools_boot.sh' : '未接入主开机脚本';
      bootEl.style.color = state.bootEnabled ? '#9dffbf' : '#ffd08a';
    }
    if (updatedEl) updatedEl.textContent = state.loadedAt || '未加载';
    if (scriptEl) scriptEl.textContent = state.scriptPreview || '#!/system/bin/sh';

    if (!listEl) return;
    if (!state.entries.length) {
      listEl.innerHTML = `<div class="ala-empty">当前还没有自启动条目。点击“新增条目”后，先选择已安装应用，再从解析到的 activity / service 列表里选择目标组件。</div>`;
      return;
    }

    listEl.innerHTML = state.entries.map((entry) => `
      <div class="ala-card">
        <div class="ala-card-head">
          <div>
            <div class="ala-card-title">${escapeHtml(entry.name || entry.packageName)}</div>
            <div class="ala-tip">${escapeHtml(entry.packageName)} · ${escapeHtml(entry.appPath)}</div>
          </div>
          <div class="ala-actions">
            <button data-action="run-now" data-id="${escapeHtml(entry.id)}">立即启动</button>
            <button data-action="edit" data-id="${escapeHtml(entry.id)}">修改</button>
            <button data-action="delete" data-id="${escapeHtml(entry.id)}">删除</button>
          </div>
        </div>
        <div class="ala-card-main">
          <div class="ala-chips">
            <span class="ala-chip" data-kind="good">${escapeHtml(getTypeLabel(entry.type))}</span>
            <span class="ala-chip">${escapeHtml(entry.componentType)}</span>
            <span class="ala-chip">${entry.delaySeconds > 0 ? `${entry.delaySeconds}s 后启动` : '立即启动'}</span>
          </div>
          <div class="ala-tip">组件：<code>${escapeHtml(`${entry.packageName}/${entry.componentName}`)}</code></div>
          <div class="ala-tip">参数：<code>${escapeHtml(entry.args || '(无)')}</code></div>
          <div class="ala-code">${escapeHtml(buildCommand(entry))}</div>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-action="run-now"]').forEach((btn) => {
      btn.onclick = async () => {
        await runEntryNow(btn.dataset.id || '');
      };
    });
    listEl.querySelectorAll('[data-action="edit"]').forEach((btn) => {
      btn.onclick = async () => {
        await openEntryForm(btn.dataset.id || '');
      };
    });
    listEl.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.onclick = async () => {
        await deleteEntry(btn.dataset.id || '');
      };
    });
  };

  const render = () => {
    renderEntries();
  };

  const listInstalledApps = async () => {
    const [allRes, userRes] = await Promise.all([
      run(`
timeout 8s pm list packages -f 2>/dev/null | awk -F= '
  {
    pkg=$2
    path=$1
    sub(/^package:/,"",path)
    print pkg "\\t" path
  }'
`, 10000),
      run(`timeout 8s pm list packages -3 2>/dev/null | awk -F: '{print $2}'`, 10000),
    ]);
    const userSet = new Set(
      String(userRes.text || '')
        .split(/\r?\n/)
        .map((line) => normalizeLine(line))
        .filter(Boolean),
    );
    const apps = String(allRes.text || '')
      .split(/\r?\n/)
      .map((line) => normalizeLine(line))
      .filter(Boolean)
      .map((line) => {
        const [packageName, appPath] = line.split('\t');
        const label = inferDisplayName(packageName);
        return {
          packageName: String(packageName || '').trim(),
          appPath: String(appPath || '').trim(),
          label,
          sortLabel: label.toLowerCase(),
          isUserApp: userSet.has(String(packageName || '').trim()),
        };
      })
      .filter((item) => item.packageName);

    const appMap = new Map(apps.map((item) => [item.packageName, item]));
    const missingUserPackages = [...userSet].filter((pkg) => pkg && !appMap.has(pkg));

    if (missingUserPackages.length) {
      for (const pkg of missingUserPackages) {
        const pathRes = await run(`timeout 8s pm path ${shellQuote(pkg)} 2>/dev/null | awk -F: '/^package:/{print $2; exit}'`, 10000);
        const appPath = normalizeLine(pathRes.text);
        appMap.set(pkg, {
          packageName: pkg,
          appPath,
          label: inferDisplayName(pkg),
          sortLabel: inferDisplayName(pkg).toLowerCase(),
          isUserApp: true,
        });
      }
    }

    return [...appMap.values()]
      .filter((item) => item.packageName && item.appPath)
      .sort((a, b) => {
        const byLabel = a.sortLabel.localeCompare(b.sortLabel, 'en');
        if (byLabel !== 0) return byLabel;
        return a.packageName.localeCompare(b.packageName, 'en');
      });
  };

  const resolveAppByPackage = async (packageName) => {
    const apps = await listInstalledApps();
    return apps.find((item) => item.packageName === packageName) || null;
  };

  const splitDumpSection = (dump = '', startMarker = '', endMarkers = []) => {
    const lines = String(dump || '').split(/\r?\n/);
    const startIndex = lines.findIndex((line) => normalizeLine(line) === startMarker);
    if (startIndex < 0) return '';
    let endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i += 1) {
      const line = normalizeLine(lines[i]);
      if (endMarkers.includes(line)) {
        endIndex = i;
        break;
      }
    }
    return lines.slice(startIndex + 1, endIndex).join('\n');
  };

  const extractComponentsFromSection = (section = '', packageName = '') => {
    const packagePattern = escapeRegExp(packageName);
    const fullRegex = new RegExp(`${packagePattern}/[^\\s\\]}]+`, 'g');
    const found = new Set();
    String(section || '').split(/\r?\n/).forEach((lineRaw) => {
      const line = String(lineRaw || '');
      const fullMatches = line.match(fullRegex) || [];
      fullMatches.forEach((match) => {
        const component = match.slice(packageName.length + 1).trim();
        if (component) found.add(component);
      });
      const shortRegex = /(^|\s)(\.[A-Za-z0-9_$.]+)/g;
      let shortMatch = shortRegex.exec(line);
      while (shortMatch) {
        const component = String(shortMatch[2] || '').trim();
        if (component) found.add(component);
        shortMatch = shortRegex.exec(line);
      }
    });
    return [...found];
  };

  const extractComponentsByKeyword = (dump = '', packageName = '', keyword = '') => {
    const lines = String(dump || '')
      .split(/\r?\n/)
      .filter((line) => line.toLowerCase().includes(String(keyword || '').toLowerCase()));
    return extractComponentsFromSection(lines.join('\n'), packageName);
  };

  const getAppMeta = async (packageName, appPath = '') => {
    if (!packageName) {
      return { ok: false, message: '请先选择应用' };
    }
    let resolvedPath = String(appPath || '').trim();
    if (!resolvedPath) {
      const appInfo = await resolveAppByPackage(packageName);
      resolvedPath = appInfo?.appPath || '';
    }
    if (!resolvedPath) {
      return { ok: false, message: '未能解析应用安装路径，请确认该应用仍然已安装' };
    }
    const dumpRes = await run(`timeout 10s dumpsys package ${shellQuote(packageName)} 2>/dev/null`, 15000);
    const dump = String(dumpRes.text || '');
    if (!dump) {
      return { ok: false, message: '读取应用包信息失败，dumpsys package 没有返回内容' };
    }
    const activitiesSection = splitDumpSection(dump, 'Activities:', ['Receivers:', 'Services:', 'Providers:', 'Instrumentation:', 'Permissions:']);
    const servicesSection = splitDumpSection(dump, 'Services:', ['Providers:', 'Instrumentation:', 'Permissions:', 'Key Set Manager:']);
    const activityNames = extractComponentsFromSection(activitiesSection, packageName);
    const serviceNames = extractComponentsFromSection(servicesSection, packageName);
    if (!activityNames.length) {
      extractComponentsByKeyword(dump, packageName, 'activity').forEach((name) => activityNames.push(name));
    }
    if (!serviceNames.length) {
      extractComponentsByKeyword(dump, packageName, 'service').forEach((name) => serviceNames.push(name));
    }
    const activities = [...new Set(activityNames)].map((name) => ({ type: 'activity', name }));
    const services = [...new Set(serviceNames)].map((name) => ({ type: 'service', name }));
    const components = [...activities, ...services];
    if (!components.length) {
      return {
        ok: false,
        message: '未解析到可用 activity/service，请确认应用已正确安装，或该 ROM 的 dumpsys 输出格式与预期不同',
      };
    }
    return {
      ok: true,
      packageName,
      appPath: resolvedPath,
      activities,
      services,
      components,
    };
  };

  const closeFormToast = () => {
    document.getElementById(FORM_TOAST_ID)?.remove();
  };

  const ask = (id, title, body, ok = '确认', cancel = '取消') => new Promise((resolve) => {
    const old = document.getElementById(id);
    if (old) old.remove();
    const { el, close } = createFixedToast(
      id,
      `<div style="pointer-events:all;width:90vw;max-width:520px;"><div class="title" style="margin:0">${title}</div><div style="margin-top:10px;font-size:.7rem;line-height:1.7">${body}</div><div style="margin-top:12px;text-align:right;display: flex;justify-content: end;gap: 10px;"><button class="ok">${ok}</button><button class="cancel">${cancel}</button></div></div>`,
      {
        pointerEvents: 'all',
        zIndex: '100000',
      },
    );
    const done = (v) => {
      close();
      resolve(v);
    };
    el.querySelector('.ok')?.addEventListener('click', () => done(true));
    el.querySelector('.cancel')?.addEventListener('click', () => done(false));
  });

  const gatherFormData = (fallback = {}) => {
    const root = document.getElementById(FORM_TOAST_ID);
    if (!root) return normalizeEntry(fallback);
    const type = String(root.querySelector('#ala_form_type')?.value || fallback.type || 'activity').trim();
    const componentInput = root.querySelector(`input[name="ala_component_pick"]:checked`);
    const selectedOption = root.querySelector('#ala_form_package option:checked');
    const selectedPath = selectedOption?.dataset?.path || root.querySelector('#ala_form_path')?.value || '';
    return normalizeEntry({
      ...fallback,
      name: root.querySelector('#ala_form_name')?.value || selectedOption?.dataset?.label || '',
      appPath: selectedPath,
      packageName: root.querySelector('#ala_form_package')?.value || fallback.packageName || '',
      type,
      componentType: type === 'activity' ? 'activity' : 'service',
      componentName: componentInput?.value || root.querySelector('#ala_form_component_name')?.value || '',
      componentLabel: componentInput?.dataset.label || componentInput?.value || '',
      args: root.querySelector('#ala_form_args')?.value || '',
      delaySeconds: root.querySelector('#ala_form_delay')?.value || '0',
      id: fallback.id,
      createdAt: fallback.createdAt,
    });
  };

  const renderInstalledAppOptions = (apps = [], selectedPackage = '', keyword = '', hideNonUserApps = false) => {
    const selectEl = document.querySelector('#ala_form_package');
    if (!selectEl) return;
    const filter = String(keyword || '').trim().toLowerCase();
    const currentSelected = apps.find((item) => item.packageName === selectedPackage) || null;
    const effectiveSelectedPackage = hideNonUserApps && currentSelected && !currentSelected.isUserApp
      ? ''
      : selectedPackage;
    let filtered = apps.filter((item) => {
      if (hideNonUserApps && !item.isUserApp) {
        return false;
      }
      if (!filter) return true;
      const text = `${item.label} ${item.packageName} ${item.appPath}`.toLowerCase();
      return text.includes(filter);
    });
    if (!filtered.length) {
      selectEl.innerHTML = '<option value="">没有匹配的应用</option>';
      selectEl.value = '';
      const pathEl = document.querySelector('#ala_form_path');
      if (pathEl) pathEl.value = '';
      return;
    }
    selectEl.innerHTML = filtered.map((item) => `
      <option
        value="${escapeHtml(item.packageName)}"
        data-path="${escapeHtml(item.appPath)}"
        data-label="${escapeHtml(item.label)}"
        data-user-app="${item.isUserApp ? '1' : '0'}"
        ${item.packageName === effectiveSelectedPackage ? 'selected' : ''}
      >
        ${escapeHtml(`${item.label} · ${item.packageName}${item.isUserApp ? '' : ' · 系统'}`)}
      </option>
    `).join('');
    if (!filtered.some((item) => item.packageName === effectiveSelectedPackage)) {
      selectEl.value = filtered[0].packageName;
    }
    syncSelectedAppDisplay();
  };

  const syncSelectedAppDisplay = () => {
    const root = document.getElementById(FORM_TOAST_ID);
    if (!root) return null;
    const selectEl = root.querySelector('#ala_form_package');
    const pathEl = root.querySelector('#ala_form_path');
    const nameEl = root.querySelector('#ala_form_name');
    const option = selectEl?.selectedOptions?.[0];
    if (!selectEl || !option) return null;
    const appInfo = {
      packageName: selectEl.value || '',
      appPath: option.dataset.path || '',
      label: option.dataset.label || inferDisplayName(selectEl.value || ''),
    };
    if (pathEl) pathEl.value = appInfo.appPath;
    if (nameEl && !String(nameEl.value || '').trim()) {
      nameEl.value = appInfo.label;
    }
    return appInfo;
  };

  const getSelectedComponentPool = (meta, type) => {
    if (type === 'activity') return meta.activities;
    return meta.services;
  };

  const renderFormComponentList = (meta, selectedType, selectedName = '') => {
    const listEl = document.querySelector('#ala_form_component_list');
    const hiddenInput = document.querySelector('#ala_form_component_name');
    const searchEl = document.querySelector('#ala_form_component_search');
    if (!listEl || !hiddenInput) return;
    const pool = getSelectedComponentPool(meta, selectedType);
    if (!pool.length) {
      hiddenInput.value = '';
      if (searchEl) searchEl.value = '';
      listEl.innerHTML = `<div class="ala-form-tip">当前类型没有解析到可选组件。可以切换类型，或重新检查路径和应用安装状态。</div>`;
      return;
    }
    const initialTargetName = selectedName && pool.some((item) => item.name === selectedName)
      ? selectedName
      : pool[0].name;
    hiddenInput.value = initialTargetName;

    const renderFiltered = () => {
      const keyword = String(searchEl?.value || '').trim().toLowerCase();
      const filtered = !keyword
        ? pool
        : pool.filter((item) => item.name.toLowerCase().includes(keyword));
      const currentSelected = hiddenInput.value && pool.some((item) => item.name === hiddenInput.value)
        ? hiddenInput.value
        : initialTargetName;

      if (!filtered.length) {
        listEl.innerHTML = `<div class="ala-form-tip">没有匹配的组件，请换个关键字试试。</div>`;
        return;
      }

      const targetName = filtered.some((item) => item.name === currentSelected)
        ? currentSelected
        : filtered[0].name;
      hiddenInput.value = targetName;
      listEl.innerHTML = filtered.map((item) => `
        <label class="ala-form-item">
          <input
            type="radio"
            name="ala_component_pick"
            value="${escapeHtml(item.name)}"
            data-label="${escapeHtml(item.name)}"
            ${item.name === targetName ? 'checked' : ''}
          >
          <span><code>${escapeHtml(item.name)}</code></span>
        </label>
      `).join('');
      listEl.querySelectorAll('input[name="ala_component_pick"]').forEach((radio) => {
        radio.onchange = () => {
          if (radio.checked) hiddenInput.value = radio.value;
        };
      });
    };

    if (searchEl) {
      searchEl.oninput = () => {
        renderFiltered();
      };
    }
    renderFiltered();
  };

  const analyzeFormApp = async (fallback = {}) => {
    const root = document.getElementById(FORM_TOAST_ID);
    if (!root) return null;
    const appInfo = syncSelectedAppDisplay();
    if (!appInfo?.packageName) {
      createToast('请先选择应用', 'red');
      return null;
    }
    setBusy(true);
    createToast('正在解析包名和可启动组件...', 'pink');
    try {
      const meta = await getAppMeta(appInfo.packageName, appInfo.appPath);
      if (!meta.ok) {
        root.querySelector('#ala_form_component_list').innerHTML = `<div class="ala-form-tip" style="color:#ffbbbb;">${escapeHtml(meta.message || '解析失败')}</div>`;
        createToast(meta.message || '解析失败', 'red', 5000);
        return null;
      }
      root.querySelector('#ala_form_package').value = meta.packageName;
      root.querySelector('#ala_form_path').value = meta.appPath || appInfo.appPath || '';
      const currentType = String(root.querySelector('#ala_form_type')?.value || fallback.type || 'activity').trim();
      const preferredType = currentType === 'service' || currentType === 'foreground-service'
        ? (meta.services.length ? currentType : 'activity')
        : 'activity';
      root.querySelector('#ala_form_type').value = preferredType;
      renderFormComponentList(meta, preferredType, fallback.componentName || '');
      root.querySelector('#ala_form_meta').dataset.meta = encodePayload(JSON.stringify(meta));
      createToast(`解析成功：${meta.packageName}，activity ${meta.activities.length} 个，service ${meta.services.length} 个`, 'green', 5000);
      return meta;
    } finally {
      setBusy(false);
    }
  };

  const runCurrentFormSelectionNow = async (fallback = {}) => {
    const root = document.getElementById(FORM_TOAST_ID);
    if (!root) return;
    const draft = gatherFormData(fallback);
    if (!draft.packageName) {
      createToast('请先选择应用', 'red');
      return;
    }
    if (!draft.componentName) {
      createToast('请先解析应用并选择组件', 'red');
      return;
    }
    setBusy(true);
    createToast('正在立即启动当前选择的组件...', 'pink');
    try {
      const res = await run(buildCommand({ ...draft, delaySeconds: 0 }), 12000);
      if (!res.ok) {
        createToast(res.text || '启动失败', 'red', 5000);
        return;
      }
      createToast('已触发立即启动', 'green');
    } finally {
      setBusy(false);
    }
  };

  const readFormMeta = () => {
    const holder = document.querySelector('#ala_form_meta');
    const raw = holder?.dataset?.meta || '';
    if (!raw) return null;
    try {
      return JSON.parse(decodePayload(raw));
    } catch {
      return null;
    }
  };

  const validateEntry = async (entry) => {
    if (!entry.name) return { ok: false, message: '名称不能为空' };
    if (!entry.appPath) return { ok: false, message: '请选择一个已安装应用' };
    if (!entry.packageName) return { ok: false, message: '请先点击“解析应用”获取包名' };
    if (!entry.componentName) return { ok: false, message: '请选择要启动的 activity/service' };
    if (!Number.isFinite(entry.delaySeconds) || entry.delaySeconds < 0) {
      return { ok: false, message: '延迟秒数必须为大于等于 0 的整数' };
    }
    const existsRes = await run(`[ -f ${shellQuote(entry.appPath)} ] && echo OK || echo NO`, 5000);
    if (normalizeLine(existsRes.text) !== 'OK') {
      return { ok: false, message: 'APK 路径不存在，请重新确认' };
    }
    return { ok: true };
  };

  const saveEntry = async (draft) => {
    const validated = await validateEntry(draft);
    if (!validated.ok) {
      createToast(validated.message || '参数校验失败', 'red');
      return false;
    }
    const existingIndex = state.entries.findIndex((item) => item.id === draft.id);
    const nextEntry = normalizeEntry({
      ...draft,
      updatedAt: new Date().toISOString(),
      createdAt: draft.createdAt || new Date().toISOString(),
    });
    if (existingIndex >= 0) {
      state.entries.splice(existingIndex, 1, nextEntry);
    } else {
      state.entries.push(nextEntry);
    }
    setBusy(true);
    createToast(existingIndex >= 0 ? '正在更新条目和自启动脚本...' : '正在保存条目并生成自启动脚本...', 'pink');
    try {
      const ok = await persistAll();
      if (!ok) {
        createToast('写入 apps.json / autostart.sh / 主开机脚本失败', 'red', 5000);
        await refreshState();
        render();
        return false;
      }
      await refreshState();
      render();
      createToast(existingIndex >= 0 ? '条目已更新' : '条目已新增', 'green');
      closeFormToast();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const deleteEntry = async (id) => {
    const entry = state.entries.find((item) => item.id === id);
    if (!entry) return;
    const yes = await ask(
      'ala_delete_confirm_toast',
      '确认删除',
      `确认删除 <code>${escapeHtml(entry.name || entry.packageName)}</code> 吗？`
    );
    if (!yes) return;
    state.entries = state.entries.filter((item) => item.id !== id);
    setBusy(true);
    createToast('正在删除条目并重写自启动脚本...', 'pink');
    try {
      const ok = await persistAll();
      if (!ok) {
        createToast('删除后写回失败，已重新读取设备状态', 'red', 5000);
      } else {
        createToast('条目已删除', 'green');
      }
      await refreshState();
      render();
    } finally {
      setBusy(false);
    }
  };

  const runEntryNow = async (id) => {
    const entry = state.entries.find((item) => item.id === id);
    if (!entry) return;
    setBusy(true);
    createToast('正在后台启动目标应用...', 'pink');
    try {
      const res = await run(buildCommand({ ...entry, delaySeconds: 0 }), 12000);
      if (!res.ok) {
        createToast(res.text || '启动失败', 'red', 5000);
        return;
      }
      createToast('已触发后台启动', 'green');
    } finally {
      setBusy(false);
    }
  };

  const uninstallPluginData = async () => {
    const yes = await ask(
      'ala_uninstall_confirm_toast',
      '确认清除',
      '确认清除此插件生成的开机自启数据吗？这会删除 <code>/data/kano_auto_launch_app</code>，并从 <code>/sdcard/ufi_tools_boot.sh</code> 中移除接入行。'
    );
    if (!yes) return;
    setBusy(true);
    createToast('正在清除插件生成的数据...', 'pink');
    try {
      const res = await run(`
rm -rf ${shellQuote(STORAGE_DIR)}
touch ${shellQuote(BOOT_SH_FILE)}
sed -i '/kano_auto_launch_app/d' ${shellQuote(BOOT_SH_FILE)}
`, 20000);
      if (!res.ok) {
        createToast('清除失败', 'red', 5000);
        return;
      }
      state.entries = [];
      state.scriptPreview = '#!/system/bin/sh\n';
      state.bootEnabled = false;
      state.loadedAt = new Date().toLocaleString('zh-CN', { hour12: false });
      render();
      closeFormToast();
      createToast('清除完成', 'green');
    } finally {
      setBusy(false);
    }
  };

  const buildFormHtml = (entry = {}) => {
    const draft = normalizeEntry(entry);
    return `
      <div class="ala-form-wrap" style="pointer-events: all;overflow: auto;max-height: calc(100vh - 56px);">
        <div class="ala-form-tip">
          新增时先从已安装应用里选中目标，再点“解析应用”。路径由插件自动带出，避免用户手填。
        </div>
        <div id="ala_form_meta" data-meta=""></div>
        <div class="ala-form-grid">
          <label class="ala-form-field">
            <span class="ala-form-label">显示名称</span>
            <input id="ala_form_name" value="${escapeHtml(draft.name)}" placeholder="例如：设置 App">
          </label>
          <label class="ala-form-field">
            <span class="ala-form-label">搜索应用</span>
            <input id="ala_form_search" value="" placeholder="输入包名关键字筛选">
          </label>
          <label class="ala-form-field">
            <span class="ala-inline-head">
              <span class="ala-form-label">已安装应用</span>
              <label class="ala-inline-check">
                <input id="ala_form_hide_system" type="checkbox">
                <span>用户应用</span>
              </label>
            </span>
            <select id="ala_form_package"></select>
          </label>
          <label class="ala-form-field">
            <span class="ala-form-label">APK 路径</span>
            <input id="ala_form_path" value="${escapeHtml(draft.appPath)}" placeholder="选择应用后自动带出" readonly>
          </label>
          <label class="ala-form-field">
            <span class="ala-form-label">启动类型</span>
            <select id="ala_form_type">
              <option value="activity" ${draft.type === 'activity' ? 'selected' : ''}>普通应用 activity</option>
              <option value="service" ${draft.type === 'service' ? 'selected' : ''}>后台服务 startservice</option>
              <option value="foreground-service" ${draft.type === 'foreground-service' ? 'selected' : ''}>前台服务 start-foreground-service</option>
            </select>
          </label>
          <label class="ala-form-field">
            <span class="ala-form-label">延迟启动秒数</span>
            <input id="ala_form_delay" type="number" min="0" step="1" value="${escapeHtml(String(draft.delaySeconds || 0))}" placeholder="0">
          </label>
          <label class="ala-form-field" data-span="full">
            <span class="ala-form-label">启动参数</span>
            <textarea id="ala_form_args" placeholder="例如：-a android.intent.action.VIEW -d https://example.com">${escapeHtml(draft.args || '')}</textarea>
          </label>
          <input id="ala_form_component_name" type="hidden" value="${escapeHtml(draft.componentName)}">
          <label class="ala-form-field" data-span="full">
            <span class="ala-form-label">可选组件</span>
            <input
              id="ala_form_component_search"
              class="ala-form-search"
              placeholder="搜索组件名，例如 MainActivity / Service"
            >
            <div id="ala_form_component_list" class="ala-form-list">
              <div class="ala-form-tip">点击“解析应用”后显示 activity / service 列表。</div>
            </div>
          </label>
        </div>
        <div class="ala-form-actions">
          <button id="ala_form_analyze_btn">解析应用</button>
          <button id="ala_form_run_now_btn">立即启动</button>
          <button id="ala_form_save_btn">${draft.id ? '保存修改' : '确认新增'}</button>
          <button id="ala_form_cancel_btn">关闭</button>
        </div>
      </div>
    `;
  };

  const openEntryForm = async (id = '') => {
    const entry = state.entries.find((item) => item.id === id) || {};
    closeFormToast();
    const toast = createFixedToast(FORM_TOAST_ID, buildFormHtml(entry), {
      width: 'min(100vw - 22px, 920px)',
      maxHeight: '78vh',
      overflow: 'auto',
      pointerEvents: 'all',
      zIndex: '99999',
    });
    await wait(30);
    const root = toast?.el || document.getElementById(FORM_TOAST_ID);
    if (!root) return;
    setBusy(true);
    const installedApps = await listInstalledApps();
    renderInstalledAppOptions(installedApps, entry.packageName || '', '', root.querySelector('#ala_form_hide_system')?.checked);
    setBusy(false);
    const rerenderAppOptions = () => {
      renderInstalledAppOptions(
        installedApps,
        root.querySelector('#ala_form_package')?.value || entry.packageName || '',
        root.querySelector('#ala_form_search')?.value || '',
        Boolean(root.querySelector('#ala_form_hide_system')?.checked),
      );
    };
    root.querySelector('#ala_form_search').oninput = () => {
      rerenderAppOptions();
    };
    root.querySelector('#ala_form_hide_system').onchange = () => {
      rerenderAppOptions();
    };
    root.querySelector('#ala_form_package').onchange = () => {
      syncSelectedAppDisplay();
    };
    root.querySelector('#ala_form_cancel_btn').onclick = () => closeFormToast();
    root.querySelector('#ala_form_analyze_btn').onclick = async () => {
      await analyzeFormApp(entry);
    };
    root.querySelector('#ala_form_run_now_btn').onclick = async () => {
      await runCurrentFormSelectionNow(entry);
    };
    root.querySelector('#ala_form_type').onchange = () => {
      const meta = readFormMeta();
      if (!meta) return;
      const selectedType = String(root.querySelector('#ala_form_type')?.value || 'activity').trim();
      renderFormComponentList(meta, selectedType, '');
    };
    root.querySelector('#ala_form_save_btn').onclick = async () => {
      const draft = gatherFormData(entry);
      await saveEntry(draft);
    };

    if (entry.packageName) {
      syncSelectedAppDisplay();
      const meta = await getAppMeta(entry.packageName, entry.appPath);
      if (meta.ok) {
        root.querySelector('#ala_form_package').value = meta.packageName;
        root.querySelector('#ala_form_path').value = meta.appPath || entry.appPath || '';
        root.querySelector('#ala_form_meta').dataset.meta = encodePayload(JSON.stringify(meta));
        renderFormComponentList(meta, entry.type, entry.componentName);
      }
    }
  };

  const forceRewrite = async () => {
    setBusy(true);
    createToast('正在重建 autostart.sh 并检查主开机脚本接入...', 'pink');
    try {
      const ok = await persistAll();
      if (!ok) {
        createToast('重建失败', 'red', 5000);
        return;
      }
      await refreshState();
      render();
      createToast('已重建完成', 'green');
    } finally {
      setBusy(false);
    }
  };

  const openModal = async () => {
    ensureStyle();
    document.querySelector(`#${MODAL_NAME}`)?.remove();
    await refreshState();

    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '980px',
      showConfirm: false,
      onClose: () => {
        closeFormToast();
        return true;
      },
      contentStyle: 'max-height:72vh;',
      content: `
        <div class="ala-wrap">
          <div class="ala-grid">
            <div class="ala-stat">
              <div class="ala-stat-label">条目数量</div>
              <div class="ala-stat-value" id="ala_entry_count">0</div>
            </div>
            <div class="ala-stat">
              <div class="ala-stat-label">主开机脚本接入状态</div>
              <div class="ala-stat-value" id="ala_boot_status">读取中</div>
            </div>
            <div class="ala-stat">
              <div class="ala-stat-label">最近刷新时间</div>
              <div class="ala-stat-value" id="ala_loaded_at">读取中</div>
            </div>
          </div>

          <div class="ala-panel">
            <div class="ala-panel-head">
              <div>
                <div class="ala-panel-title">操作区</div>
                <div class="ala-tip">新增条目时支持选择 activity / service，并生成对应的 <code>am start</code> / <code>am startservice</code> 命令。</div>
              </div>
              <div class="ala-actions">
                <button id="ala_add_btn">新增条目</button>
                <button id="ala_reload_btn">刷新列表</button>
                <button id="ala_rebuild_btn">重建脚本</button>
                <button id="ala_uninstall_btn">清除插件数据</button>
              </div>
            </div>
          </div>

          <div class="ala-panel">
            <div class="ala-panel-head">
              <div>
                <div class="ala-panel-title">当前自启动条目</div>
                <div class="ala-tip">删除或修改后会立即重写 <code>${AUTOSTART_SCRIPT}</code>。</div>
              </div>
            </div>
            <div class="ala-list" id="ala_entry_list"></div>
          </div>

          <details>
            <summary>查看生成的 autostart.sh</summary>
            <pre id="ala_script_preview"></pre>
          </details>
        </div>
      `,
    });

    el.style.width = '96%';
    el.querySelector('#ala_add_btn').onclick = async () => {
      await openEntryForm();
    };
    el.querySelector('#ala_reload_btn').onclick = async () => {
      setBusy(true);
      try {
        await refreshState();
        render();
        createToast('已刷新设备上的列表和脚本状态', 'green');
      } finally {
        setBusy(false);
      }
    };
    el.querySelector('#ala_rebuild_btn').onclick = async () => {
      await forceRewrite();
    };
    el.querySelector('#ala_uninstall_btn').onclick = async () => {
      await uninstallPluginData();
    };

    showModal(id);
    render();
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
