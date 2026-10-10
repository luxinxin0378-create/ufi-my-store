//<script>
(async () => {
  const MODAL_NAME = 'kano_magisk_module_store_modal';
  const STYLE_ID = 'kano_magisk_module_store_style';
  const LIST_API = '/api/proxy/--https://pan.kanokano.cn/api/fs/list';
  const REMOTE_PATH = '/UFI-TOOLS-UPDATE/Magisk模块';
  const DOWNLOAD_BASE = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/Magisk模块';

  const state = {
    busy: false,
    modules: [],
    lastError: '',
    query: '',
    updatedAt: '',
  };

  const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
  const esc = (text) =>
    String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  const clean = (text) =>
    String(text || '')
      .replace(/[\r\u2000-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
      .trim();
  const formatBytes = (bytes) => {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };
  const getTimeText = (item = {}) =>
    clean(
      item.modified ||
      item.updated_at ||
      item.updatedAt ||
      item.create_time ||
      item.created_at ||
      item.createdAt ||
      '',
    ) || '-';
  const getDownloadUrl = (name = '') => `${DOWNLOAD_BASE}/${encodeURIComponent(name)}`;
  const getFilteredModules = () => {
    const query = clean(state.query).toLowerCase();
    if (!query) return state.modules;
    return state.modules.filter((item) => String(item.name || '').toLowerCase().includes(query));
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .ms-wrap {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      #${MODAL_NAME} .ms-hero,
      #${MODAL_NAME} .ms-card,
      #${MODAL_NAME} .ms-item {
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.04);
      }
      #${MODAL_NAME} .ms-hero,
      #${MODAL_NAME} .ms-card,
      #${MODAL_NAME} .ms-item {
        padding: 14px;
      }
      #${MODAL_NAME} .ms-hero {
        position: relative;
        overflow: hidden;
      }
      #${MODAL_NAME} .ms-hero::after {
        content: '';
        position: absolute;
        right: -22px;
        bottom: -36px;
        width: 128px;
        height: 128px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(255,183,77,.22), transparent 68%);
      }
      #${MODAL_NAME} .ms-title {
        margin: 0 0 8px;
        font-size: .98rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .ms-sub {
        font-size: .68rem;
        line-height: 1.75;
        opacity: .86;
      }
      #${MODAL_NAME} .ms-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      #${MODAL_NAME} .ms-stat-label {
        font-size: .62rem;
        opacity: .66;
        margin-bottom: 5px;
      }
      #${MODAL_NAME} .ms-stat-value {
        font-size: .84rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .ms-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
      }
      #${MODAL_NAME} .ms-section-title {
        font-size: .78rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .ms-tip {
        font-size: .64rem;
        opacity: .72;
      }
      #${MODAL_NAME} .ms-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      #${MODAL_NAME} .ms-toolbar input {
        flex: 1;
        min-width: 220px;
        padding: 6px;
      }
      #${MODAL_NAME} .ms-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #${MODAL_NAME} .ms-item {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        position: relative;
        padding-bottom: 54px;
      }
      #${MODAL_NAME} .ms-name {
        font-size: .8rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .ms-meta {
        display: grid;
        grid-template-columns: 88px minmax(0, 1fr);
        gap: 6px 10px;
        margin-top: 8px;
        font-size: .66rem;
        line-height: 1.65;
      }
      #${MODAL_NAME} .ms-meta .k {
        opacity: .68;
      }
      #${MODAL_NAME} .ms-meta .v {
        word-break: break-all;
      }
      #${MODAL_NAME} .ms-actions {
        display: flex;
        flex-shrink: 0;
        align-items: center;
        gap: 8px;
        position: absolute;
        right: 14px;
        bottom: 14px;
      }
      #${MODAL_NAME} .ms-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: .62rem;
        font-weight: 700;
        background: rgba(255,255,255,.08);
      }
      #${MODAL_NAME} .ms-chip-ok {
        color: #95ffb2;
        background: rgba(89,212,130,.16);
      }
      #${MODAL_NAME} .ms-chip-bad {
        color: #ffb0b0;
        background: rgba(255,80,80,.16);
      }
      #${MODAL_NAME} .ms-empty {
        font-size: .68rem;
        line-height: 1.75;
        opacity: .8;
      }
      @media (max-width: 760px) {
        #${MODAL_NAME} .ms-grid {
          grid-template-columns: 1fr;
        }
        #${MODAL_NAME} .ms-item {
          flex-direction: column;
        }
        #${MODAL_NAME} .ms-actions {
          width: auto;
          right: 14px;
          bottom: 14px;
        }
        #${MODAL_NAME} .ms-actions button {
          width: auto;
        }
        #${MODAL_NAME} .ms-meta {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const renderList = () => {
    const items = getFilteredModules();
    if (state.lastError) {
      return `<div class="ms-empty">加载失败：<span style="color:#ffb0b0">${esc(state.lastError)}</span></div>`;
    }
    if (!state.modules.length) {
      return '<div class="ms-empty">当前目录下没有找到可下载的 ZIP 模块。</div>';
    }
    if (!items.length) {
      return '<div class="ms-empty">没有匹配到搜索结果，请换个关键字再试。</div>';
    }
    return items.map((item, index) => `
      <div class="ms-item">
        <div style="flex:1;min-width:0">
          <div class="ms-name">${esc(item.name)}</div>
          <div class="ms-meta">
            <div class="k">文件大小</div>
            <div class="v">${esc(formatBytes(item.size))}</div>
            <div class="k">更新时间</div>
            <div class="v">${esc(item.timeText)}</div>
          </div>
        </div>
        <div class="ms-actions">
          <button data-download-index="${index}">下载</button>
        </div>
      </div>
    `).join('');
  };

  const render = () => {
    const visibleItems = getFilteredModules();
    const setText = (selector, text) => {
      const el = document.querySelector(selector);
      if (el) el.textContent = text;
    };
    const list = document.querySelector('#ms_list');
    const refreshBtn = document.querySelector('#ms_refresh_btn');
    const searchInput = document.querySelector('#ms_search');
    if (list) list.innerHTML = renderList();
    if (refreshBtn) refreshBtn.disabled = state.busy;
    if (searchInput && searchInput.value !== state.query) searchInput.value = state.query;
    setText('#ms_total_count', `${state.modules.length}`);
    setText('#ms_filtered_count', `${visibleItems.length}`);
    setText('#ms_updated_at', state.updatedAt || '-');
    const statusEl = document.querySelector('#ms_status');
    if (statusEl) {
      statusEl.className = `ms-chip ${state.lastError ? 'ms-chip-bad' : 'ms-chip-ok'}`;
      statusEl.textContent = state.busy ? '加载中' : (state.lastError ? '加载失败' : '可下载');
    }
  };

  const fetchModules = async () => {
    state.busy = true;
    state.lastError = '';
    render();
    try {
      const response = await fetch(LIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: REMOTE_PATH,
          password: '',
          page: 1,
          per_page: 0,
          refresh: false,
        }),
      });
      const data = await response.json();
      const list = Array.isArray(data?.data?.content) ? data.data.content : [];
      state.modules = list
        .filter((item) => item && !item.is_dir && /\.zip$/i.test(String(item.name || '')))
        .map((item) => ({
          name: String(item.name || '').trim(),
          size: Number(item.size) || 0,
          timeText: getTimeText(item),
          url: getDownloadUrl(item.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' }));
      state.updatedAt = new Date().toLocaleString();
      if (!state.modules.length) {
        createToast('未找到可下载的 Magisk 模块 ZIP', 'pink', 4000);
      }
    } catch (error) {
      console.error(error);
      state.lastError = clean(error?.message || error) || '未知错误';
      createToast(`模块列表加载失败：${state.lastError}`, 'red', 5000);
    } finally {
      state.busy = false;
      render();
    }
  };

  const openDownload = (name = '') => {
    if (!name) return;
    const url = getDownloadUrl(name);
    downloadUrl(url, name);
  };

  const bindEvents = (el) => {
    el.querySelector('#ms_refresh_btn')?.addEventListener('click', async () => {
      await fetchModules();
    });
    el.querySelector('#ms_search')?.addEventListener('input', (event) => {
      state.query = String(event?.target?.value || '');
      render();
    });
    el.addEventListener('click', (event) => {
      const target = event.target?.closest?.('[data-download-index]');
      if (!target) return;
      const index = parseInt(target.getAttribute('data-download-index') || '-1', 10);
      const item = getFilteredModules()[index];
      if (!item) return;
      openDownload(item.name);
    });
  };

  const open = async () => {
    document.querySelector(`#${MODAL_NAME}`)?.remove();
    ensureStyle();
    const { id, el } = createModal({
      name: MODAL_NAME,
      title: 'Magisk模块商店',
      maxWidth: '980px',
      showConfirm: false,
      contentStyle: 'max-height:76vh;',
      isMask: true,
      onClose: () => true,
      content: `
        <div class="ms-wrap">
          <div class="ms-hero">
            <div class="ms-title">Magisk 模块在线商店</div>
            <div class="ms-sub">
              这里集中展示设备可用的 Magisk 模块安装包，按需选择后即可直接下载。<br>
              支持搜索筛选，方便快速定位目标模块。
            </div>
          </div>
          <div class="ms-grid">
            <div class="ms-card">
              <div class="ms-stat-label">ZIP 总数</div>
              <div class="ms-stat-value" id="ms_total_count">0</div>
            </div>
            <div class="ms-card">
              <div class="ms-stat-label">当前显示</div>
              <div class="ms-stat-value" id="ms_filtered_count">0</div>
            </div>
            <div class="ms-card">
              <div class="ms-stat-label">最近刷新</div>
              <div class="ms-stat-value" id="ms_updated_at">-</div>
            </div>
          </div>
          <div class="ms-card">
            <div class="ms-head">
              <div class="ms-section-title">模块列表</div>
              <div id="ms_status" class="ms-chip ms-chip-ok">可下载</div>
            </div>
            <div class="ms-toolbar">
              <input id="ms_search" class="input" placeholder="搜索模块名，例如 shamiko / zygisk / 字体..." />
              <button id="ms_refresh_btn">刷新列表</button>
            </div>
            <div class="ms-tip" style="margin-top:10px">下载按钮会直接打开对应 ZIP 的下载链接。</div>
          </div>
          <div id="ms_list" class="ms-list"></div>
        </div>
      `,
    });
    bindEvents(el);
    showModal(id);
    render();
    await fetchModules();
  };

  const button = document.createElement('button');
  button.textContent = 'Magisk模块商店';
  button.onclick = async () => {
    await open();
  };

  while (!document.querySelector('.actions-buttons')) await wait(150);
  document.querySelector('.actions-buttons')?.appendChild(button);
})();
//</script>
