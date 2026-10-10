//<script>
(async () => {
  const TITLE = '进程管理器';
  const MODAL_NAME = 'kano_process_manager_modal';
  const STYLE_ID = 'kano_process_manager_style';

  const state = {
    busy: false,
    loadedAt: '',
    query: '',
    sortBy: 'rss',
    processes: [],
    filtered: [],
    packages: new Set(),
  };

  const wait = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));
  const shellQuote = (value = '') => `'${String(value).replace(/'/g, `'\\''`)}'`;
  const normalizeLine = (value = '') => String(value).replace(/\r/g, '').trim();
  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const formatTime = (value = '') => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };
  const formatKib = (value) => {
    const kib = Number(value) || 0;
    if (!kib) return '-';
    const bytes = kib * 1024;
    return formatBytes(bytes);
  };
  const inferPackageName = (name = '', packageSet = new Set()) => {
    const raw = String(name || '').trim();
    if (!raw) return '';
    const candidate = raw.split(':')[0].trim();
    if (candidate && packageSet.has(candidate)) return candidate;
    const matches = raw.match(/[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+/g) || [];
    for (const item of matches.sort((a, b) => b.length - a.length)) {
      const normalized = item.split(':')[0].trim();
      if (packageSet.has(normalized)) return normalized;
    }
    for (const item of matches.sort((a, b) => b.length - a.length)) {
      if (item.includes('.')) return item.split(':')[0].trim();
    }
    return '';
  };

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
      #${MODAL_NAME} .pm-wrap {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      #${MODAL_NAME} .pm-panel,
      #${MODAL_NAME} .pm-stat {
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.03);
        backdrop-filter: blur(10px);
      }
      #${MODAL_NAME} .pm-panel,
      #${MODAL_NAME} .pm-stat {
        padding: 8px 10px;
      }
      #${MODAL_NAME} .pm-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
      }
      #${MODAL_NAME} .pm-stat-label {
        font-size: .56rem;
        opacity: .68;
        margin-bottom: 2px;
      }
      #${MODAL_NAME} .pm-stat-value {
        font-size: .68rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .pm-panel-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
        margin-bottom: 6px;
      }
      #${MODAL_NAME} .pm-panel-title {
        font-size: .68rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .pm-panel-tip {
        font-size: .55rem;
        opacity: .72;
      }
      #${MODAL_NAME} .pm-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }
      #${MODAL_NAME} .pm-toolbar input {
        min-width: 180px;
        flex: 1;
        box-sizing: border-box;
        padding: 5px 8px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,.1);
        color: #fff;
        background: rgba(255,255,255,.04);
        outline: none;
        font-size: .6rem;
      }
      #${MODAL_NAME} .pm-toolbar select {
        min-width: 110px;
        box-sizing: border-box;
        padding: 5px 8px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,.1);
        color: #fff;
        background: rgba(255,255,255,.04);
        outline: none;
        font-size: .6rem;
      }
      #${MODAL_NAME} .pm-toolbar input:focus {
        border-color: rgba(102,195,255,.75);
        box-shadow: 0 0 0 3px rgba(102,195,255,.12);
      }
      #${MODAL_NAME} .pm-chip {
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: .58rem;
        font-weight: 700;
        background: rgba(255,255,255,.08);
      }
      #${MODAL_NAME} .pm-chip[data-kind="good"] {
        background: rgba(89,212,130,.16);
        color: #95ffb2;
      }
      #${MODAL_NAME} .pm-chip[data-kind="warn"] {
        background: rgba(255,144,84,.16);
        color: #ffc299;
      }
      #${MODAL_NAME} .pm-list {
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 8px;
        overflow: hidden;
        background: rgba(255,255,255,.02);
      }
      #${MODAL_NAME} .pm-table-scroll {
        overflow-x: auto;
        overflow-y: hidden;
        -webkit-overflow-scrolling: touch;
      }
      #${MODAL_NAME} .pm-table-scroll::-webkit-scrollbar {
        height: 6px;
      }
      #${MODAL_NAME} .pm-table-scroll::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,.18);
        border-radius: 999px;
      }
      #${MODAL_NAME} .pm-list-inner {
        min-width: 640px;
      }
      #${MODAL_NAME} .pm-table-head,
      #${MODAL_NAME} .pm-row {
        display: grid;
        grid-template-columns: 54px 58px 72px 60px minmax(0, 1fr) 84px;
        gap: 6px;
        align-items: center;
      }
      #${MODAL_NAME} .pm-table-head {
        padding: 5px 8px;
        font-size: .54rem;
        font-weight: 700;
        opacity: .72;
        background: rgba(255,255,255,.04);
        position: sticky;
        top: 0;
        z-index: 1;
      }
      #${MODAL_NAME} .pm-row {
        padding: 4px 8px;
        border-top: 1px solid rgba(255,255,255,.05);
        min-height: 28px;
      }
      #${MODAL_NAME} .pm-row:hover {
        background: rgba(255,255,255,.035);
      }
      #${MODAL_NAME} .pm-col {
        font-size: .58rem;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #${MODAL_NAME} .pm-col[data-kind="main"] {
        font-size: .6rem;
        font-weight: 700;
      }
      #${MODAL_NAME} .pm-col[data-kind="sub"] {
        opacity: .72;
      }
      #${MODAL_NAME} .pm-actions {
        display: flex;
        justify-content: flex-end;
      }
      #${MODAL_NAME} .pm-action-head {
        text-align: right;
      }
      #${MODAL_NAME} .pm-actions button {
        padding: 3px 8px;
        min-height: 24px;
        font-size: .56rem;
      }
      #${MODAL_NAME} .pm-empty {
        text-align: center;
        padding: 12px 8px;
        font-size: .58rem;
        opacity: .74;
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} .pm-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        #${MODAL_NAME} .pm-panel-head {
          flex-direction: column;
          align-items: stretch;
        }
        #${MODAL_NAME} .pm-toolbar button {
          width: 100%;
        }
        #${MODAL_NAME} .pm-toolbar select {
          width: 100%;
        }
        #${MODAL_NAME} .pm-panel {
          padding: 8px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const setBusy = (busy) => {
    state.busy = busy;
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    root.querySelectorAll('button, input, select').forEach((el) => {
      if (el.dataset.lockIgnore === '1') return;
      el.disabled = busy;
    });
  };

  const applyFilter = () => {
    const keyword = normalizeLine(state.query).toLowerCase();
    if (!keyword) {
      state.filtered = [...state.processes];
    } else {
      state.filtered = state.processes.filter((item) => {
        const haystacks = [
          item.name,
          item.packageName,
          item.user,
          String(item.pid),
        ];
        return haystacks.some((value) => String(value || '').toLowerCase().includes(keyword));
      });
    }
    state.filtered.sort((a, b) => {
      if (state.sortBy === 'cpu') {
        if ((b.cpu || 0) !== (a.cpu || 0)) return (b.cpu || 0) - (a.cpu || 0);
        if ((b.rss || 0) !== (a.rss || 0)) return (b.rss || 0) - (a.rss || 0);
      } else {
        if ((b.rss || 0) !== (a.rss || 0)) return (b.rss || 0) - (a.rss || 0);
        if ((b.cpu || 0) !== (a.cpu || 0)) return (b.cpu || 0) - (a.cpu || 0);
      }
      return String(a.name || '').localeCompare(String(b.name || ''), 'en');
    });
  };

  const listPackages = async () => {
    const res = await run("timeout 8s pm list packages 2>/dev/null | awk -F: '{print $2}'", 10000);
    return new Set(
      String(res.text || '')
        .split(/\r?\n/)
        .map((line) => normalizeLine(line))
        .filter(Boolean),
    );
  };

  const listProcesses = async (packageSet) => {
    const res = await run(`
(ps -A 2>/dev/null || ps 2>/dev/null) | awk '
  NR == 1 {
    for (i = 1; i <= NF; i++) {
      if ($i == "PID") pid = i;
      else if ($i == "USER") user = i;
      else if ($i == "RSS") rss = i;
      else if ($i == "VSZ" || $i == "VSS") vsz = i;
      else if ($i == "NAME" || $i == "CMD" || $i == "COMMAND" || $i == "ARGS") name = i;
    }
    next
  }
  {
    if (!pid) next;
    p = $pid;
    if (p !~ /^[0-9]+$/) next;
    u = user ? $user : "-";
    r = rss ? $rss : "0";
    v = vsz ? $vsz : "0";
    if (name) {
      n = $name;
      for (i = name + 1; i <= NF; i++) n = n " " $i;
    } else {
      n = $NF;
    }
    gsub(/\\r/, "", n);
    if (n != "") print p "\\t" u "\\t" r "\\t" v "\\t" n;
  }'
`, 20000);

    return String(res.text || '')
      .split(/\r?\n/)
      .map((line) => normalizeLine(line))
      .filter(Boolean)
      .map((line) => {
        const [pid, user, rss, vsz, ...rest] = line.split('\t');
        const name = rest.join('\t').trim();
        const packageName = inferPackageName(name, packageSet);
        return {
          pid: Number(pid) || 0,
          user: String(user || '-').trim(),
          rss: Number(rss) || 0,
          vsz: Number(vsz) || 0,
          cpu: 0,
          name,
          packageName,
        };
      })
      .filter((item) => item.pid > 0 && item.name);
  };

  const listCpuUsage = async () => {
    const res = await run(`
(top -b -n 1 2>/dev/null || top -n 1 2>/dev/null || timeout 8s top -n 1 2>/dev/null) | awk '
  {
    currentPid = 0;
    currentCpu = 0;

    if (!headerFound) {
      pid = 0;
      cpu = 0;
      splitStateCpu = 0;
      for (i = 1; i <= NF; i++) {
        key = $i;
        gsub(/[^A-Za-z0-9%]/, "", key);
        if (key == "PID") pid = i;
        else if (key == "%CPU" || key == "CPU%" || key == "CPU") cpu = i;
        else if (key == "S%CPU") {
          cpu = i;
          splitStateCpu = 1;
        }
      }
      if (pid && cpu) {
        headerFound = 1;
        pidIndex = pid;
        cpuIndex = splitStateCpu ? (cpu + 1) : cpu;
        next;
      }
    }

    if (!headerFound) next;
    if (NF < pidIndex || NF < cpuIndex) next;

    currentPid = $pidIndex;
    currentCpu = $cpuIndex;
    gsub(/%/, "", currentCpu);
    gsub(/[^0-9.]/, "", currentCpu);

    if (currentPid ~ /^[0-9]+$/ && currentCpu ~ /^[0-9.]+$/) {
      print currentPid "\\t" currentCpu;
    }
  }'
`, 20000);
    const cpuMap = new Map();
    String(res.text || '')
      .split(/\r?\n/)
      .map((line) => normalizeLine(line))
      .filter(Boolean)
      .forEach((line) => {
        const [pid, cpu] = line.split('\t');
        const pidNum = Number(pid) || 0;
        const cpuNum = Number(cpu) || 0;
        if (pidNum > 0) cpuMap.set(pidNum, cpuNum);
      });
    return cpuMap;
  };

  const renderStats = () => {
    const setText = (selector, value) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = value;
    };
    const packages = new Set(state.processes.map((item) => item.packageName).filter(Boolean));
    setText('#kpm_stat_total', String(state.processes.length));
    setText('#kpm_stat_visible', String(state.filtered.length));
    setText('#kpm_stat_apps', String(packages.size));
    setText('#kpm_stat_time', formatTime(state.loadedAt));
  };

  const confirmKill = (proc) => new Promise((resolve) => {
    const label = escapeHtml(proc.packageName || proc.name);
    const extra = proc.packageName && proc.packageName !== proc.name
      ? `<div style="margin-top:6px;font-size:.66rem;opacity:.78"><code>${escapeHtml(proc.name)}</code></div>`
      : '';
    const { el, close } = createFixedToast(
      'kpm_confirm_kill',
      `<div style="pointer-events:all;width:90vw;max-width:520px;">
        <div class="title" style="margin:0">确认结束进程</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.7">
          将尝试结束 <b>${label}</b>，PID <code>${escapeHtml(String(proc.pid))}</code>。<br>
          如果识别到包名，还会附带执行一次 <code>am force-stop</code>。
          ${extra}
        </div>
        <div style="margin-top:12px;text-align:right;display:flex;justify-content:end;gap:10px;">
          <button class="ok">确认</button>
          <button class="cancel">取消</button>
        </div>
      </div>`,
    );
    const done = (value) => {
      close();
      resolve(value);
    };
    el.querySelector('.ok')?.addEventListener('click', () => done(true));
    el.querySelector('.cancel')?.addEventListener('click', () => done(false));
  });

  const killProcess = async (proc) => {
    if (!proc?.pid) return;
    if (!await confirmKill(proc)) return;
    setBusy(true);
    const pkg = proc.packageName || '';
    const res = await run(`
PID=${shellQuote(String(proc.pid))}
PKG=${shellQuote(pkg)}
if [ -n "$PKG" ]; then
  am force-stop "$PKG" >/dev/null 2>&1
fi
kill -15 "$PID" >/dev/null 2>&1
sleep 1
if kill -0 "$PID" >/dev/null 2>&1; then
  kill -9 "$PID" >/dev/null 2>&1
fi
if kill -0 "$PID" >/dev/null 2>&1; then
  echo "__KILL_FAILED__"
  exit 1
fi
echo "__KILL_OK__"
`, 15000);
    setBusy(false);
    if (res.ok && res.text.includes('__KILL_OK__')) {
      createToast(`已结束 PID ${proc.pid}`, 'green');
      await refresh();
      return;
    }
    createToast(`结束失败：${res.text || '未知错误'}`, 'red', 5000);
  };

  const renderList = () => {
    const listEl = document.querySelector('#kpm_list');
    if (!listEl) return;
    if (!state.filtered.length) {
      listEl.innerHTML = `<div class="pm-empty">当前没有匹配的进程</div>`;
      return;
    }
    listEl.innerHTML = `
      <div class="pm-table-scroll">
        <div class="pm-list-inner">
          <div class="pm-table-head">
            <div>PID</div>
            <div>CPU%</div>
            <div>RSS</div>
            <div>USER</div>
            <div>NAME</div>
            <div class="pm-action-head">ACTION</div>
          </div>
          ${state.filtered.map((item) => `
            <div class="pm-row">
              <div class="pm-col">${escapeHtml(String(item.pid))}</div>
              <div class="pm-col">${escapeHtml((Number(item.cpu) || 0).toFixed(1))}</div>
              <div class="pm-col">${escapeHtml(formatKib(item.rss))}</div>
              <div class="pm-col">${escapeHtml(item.user)}</div>
              <div class="pm-col" data-kind="main" title="${escapeHtml(item.name)}">${escapeHtml(item.packageName || item.name)}</div>
              <div class="pm-actions">
                <button data-action="kill" data-pid="${escapeHtml(String(item.pid))}">结束</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    listEl.querySelectorAll('[data-action="kill"]').forEach((button) => {
      button.onclick = async () => {
        const pid = Number(button.dataset.pid) || 0;
        const target = state.processes.find((item) => item.pid === pid);
        if (!target) {
          createToast('进程列表已过期，请先刷新', 'red');
          return;
        }
        await killProcess(target);
      };
    });
  };

  const render = () => {
    applyFilter();
    renderStats();
    renderList();
    const keywordEl = document.querySelector('#kpm_search');
    if (keywordEl && keywordEl.value !== state.query) keywordEl.value = state.query;
    const sortEl = document.querySelector('#kpm_sort');
    if (sortEl && sortEl.value !== state.sortBy) sortEl.value = state.sortBy;
  };

  const refresh = async (showToast = false) => {
    try {
      setBusy(true);
      const packageSet = await listPackages();
      const [processList, cpuMap] = await Promise.all([
        listProcesses(packageSet),
        listCpuUsage(),
      ]);
      state.packages = packageSet;
      state.processes = processList.map((item) => ({
        ...item,
        cpu: cpuMap.get(item.pid) || 0,
        packageName: item.packageName || inferPackageName(item.name, packageSet),
      }));
      state.loadedAt = new Date().toISOString();
      render();
      if (showToast) createToast(`已刷新，共 ${state.processes.length} 个进程`, 'green');
    } catch (error) {
      console.error(error);
      createToast(`刷新失败：${error}`, 'red', 5000);
    } finally {
      setBusy(false);
    }
  };

  const bindEvents = (root) => {
    root.querySelector('#kpm_refresh_btn').onclick = async () => {
      await refresh(true);
    };
    root.querySelector('#kpm_sort').onchange = (event) => {
      state.sortBy = String(event.target.value || 'rss');
      render();
    };
    root.querySelector('#kpm_search').oninput = (event) => {
      state.query = String(event.target.value || '');
      render();
    };
    root.querySelector('#kpm_clear_btn').onclick = () => {
      state.query = '';
      render();
    };
  };

  const openModal = async () => {
    document.querySelector(`#${MODAL_NAME}`)?.remove();
    ensureStyle();
    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '1080px',
      showConfirm: false,
      contentStyle: 'max-height:76vh;',
      isMask: true,
      onClose: () => true,
      content: `
        <div class="pm-wrap">
          <div class="pm-grid">
            <div class="pm-stat">
              <div class="pm-stat-label">总进程数</div>
              <div class="pm-stat-value" id="kpm_stat_total">0</div>
            </div>
            <div class="pm-stat">
              <div class="pm-stat-label">当前显示</div>
              <div class="pm-stat-value" id="kpm_stat_visible">0</div>
            </div>
            <div class="pm-stat">
              <div class="pm-stat-label">识别到应用</div>
              <div class="pm-stat-value" id="kpm_stat_apps">0</div>
            </div>
            <div class="pm-stat">
              <div class="pm-stat-label">最近刷新</div>
              <div class="pm-stat-value" id="kpm_stat_time">-</div>
            </div>
          </div>
          <div class="pm-panel">
            <div class="pm-panel-head">
              <div class="pm-panel-title">筛选与操作</div>
              <div class="pm-panel-tip">接近 top 的紧凑列表</div>
            </div>
            <div class="pm-toolbar">
              <input id="kpm_search" type="text" placeholder="例如 com.android.systemui / mediaserver / 1234">
              <select id="kpm_sort">
                <option value="rss">按内存排序</option>
                <option value="cpu">按 CPU 排序</option>
              </select>
              <button id="kpm_clear_btn" data-lock-ignore="1">清空筛选</button>
              <button id="kpm_refresh_btn">刷新列表</button>
            </div>
          </div>
          <div class="pm-panel">
            <div class="pm-panel-head">
              <div class="pm-panel-title">进程列表</div>
              <div class="pm-panel-tip">支持 RSS / CPU 自定义排序</div>
            </div>
            <div id="kpm_list" class="pm-list">
              <div class="pm-empty">正在加载...</div>
            </div>
          </div>
        </div>
      `,
    });
    bindEvents(el);
    showModal(id);
    await refresh();
  };

  const mainBtn = document.createElement('button');
  mainBtn.textContent = TITLE;
  mainBtn.onclick = async () => {
    const who = await run('whoami', 5000);
    if (!who.ok || !String(who.text || '').includes('root')) {
      createToast('请先启用高级功能', 'red');
      return;
    }
    await openModal();
  };

  while (!document.querySelector('.actions-buttons')) {
    await wait(150);
  }
  document.querySelector('.actions-buttons')?.appendChild(mainBtn);
})();
//</script>
