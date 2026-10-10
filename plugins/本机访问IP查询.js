//<script>
(async () => {
  const TITLE = '本机访问IP查询';
  const MODAL_NAME = 'network_entry_probe_modal';
  const STYLE_ID = 'network_entry_probe_style';

  const state = {
    busy: false,
    routes: [],
    accessList: [],
    rawRoute: '',
    refreshedAt: '',
  };

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const copyTextValue = async (text) => {
    const value = String(text || '').trim();
    if (!value) {
      createToast('没有可复制的内容', 'red');
      return;
    }
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.style.position = 'absolute';
        textArea.style.opacity = '0';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      createToast('复制成功', 'green');
    } catch (e) {
      createToast('复制失败', 'red');
    }
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .nep-wrap {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #${MODAL_NAME} .nep-panel,
      #${MODAL_NAME} .nep-card {
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.035);
        backdrop-filter: blur(10px);
      }
      #${MODAL_NAME} .nep-panel,
      #${MODAL_NAME} .nep-card {
        padding: 10px 12px;
      }
      #${MODAL_NAME} .nep-tip {
        font-size: .64rem;
        line-height: 1.5;
        opacity: .78;
      }
      #${MODAL_NAME} .nep-panel-title,
      #${MODAL_NAME} .nep-card-title {
        font-size: .76rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .nep-panel-head,
      #${MODAL_NAME} .nep-card-head,
      #${MODAL_NAME} .nep-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }
      #${MODAL_NAME} .nep-actions,
      #${MODAL_NAME} .nep-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      #${MODAL_NAME} .nep-actions {
        margin-top: 6px;
      }
      #${MODAL_NAME} .nep-list {
        display: grid;
        gap: 8px;
        margin-top: 8px;
      }
      #${MODAL_NAME} .nep-chip {
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: .6rem;
        font-weight: 700;
        background: rgba(255,255,255,.08);
      }
      #${MODAL_NAME} .nep-chip[data-kind="good"] {
        color: #9dffbf;
        background: rgba(60,201,120,.16);
      }
      #${MODAL_NAME} .nep-chip[data-kind="warn"] {
        color: #ffd08a;
        background: rgba(255,173,51,.16);
      }
      #${MODAL_NAME} .nep-empty {
        font-size: .64rem;
        line-height: 1.55;
        opacity: .75;
      }
      #${MODAL_NAME} .nep-address {
        margin-top: 6px;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.06);
      }
      #${MODAL_NAME} .nep-address code,
      #${MODAL_NAME} code,
      #${MODAL_NAME} pre {
        word-break: break-all;
        white-space: pre-wrap;
      }
      #${MODAL_NAME} button {
        padding: 7px 10px;
        font-size: .68rem;
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} {
          width: 96% !important;
        }
        #${MODAL_NAME} .content {
          margin: 6px 0 !important;
        }
        #${MODAL_NAME} .nep-panel,
        #${MODAL_NAME} .nep-card {
          padding: 8px 10px;
          border-radius: 10px;
        }
        #${MODAL_NAME} .nep-panel-title,
        #${MODAL_NAME} .nep-card-title {
          font-size: .72rem;
        }
        #${MODAL_NAME} .nep-tip,
        #${MODAL_NAME} .nep-empty {
          font-size: .6rem;
        }
        #${MODAL_NAME} .nep-address {
          padding: 7px 9px;
        }
        #${MODAL_NAME} .nep-actions button {
          flex: 1 1 calc(50% - 3px);
          min-width: 0;
        }
        #${MODAL_NAME} .nep-row,
        #${MODAL_NAME} .nep-card-head,
        #${MODAL_NAME} .nep-panel-head {
          flex-direction: column;
          gap: 6px;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const parseRouteLine = (line = '') => {
    const clean = String(line || '').trim();
    if (!clean) return null;
    const dev = clean.match(/\bdev\s+(\S+)/)?.[1] || '';
    const src = clean.match(/\bsrc\s+(\S+)/)?.[1] || '';
    const proto = clean.match(/\bproto\s+(\S+)/)?.[1] || '';
    const scope = clean.match(/\bscope\s+(\S+)/)?.[1] || '';
    const via = clean.match(/\bvia\s+(\S+)/)?.[1] || '';
    const metric = clean.match(/\bmetric\s+(\S+)/)?.[1] || '';
    const network = clean.split(/\s+/)[0] || '';
    const isDefault = network === 'default';
    return {
      raw: clean,
      dev,
      src,
      proto,
      scope,
      via,
      metric,
      network,
      isDefault,
    };
  };

  const buildAccessList = (routes = []) => {
    const protocol = location.protocol || 'http:';
    const port = location.port ? `:${location.port}` : '';
    const path = '/';
    const dedupe = new Map();

    routes.forEach((route) => {
      if (!route?.src) return;
      const url = `${protocol}//${route.src}${port}${path}`;
      const key = `${route.src}|${route.dev}`;
      if (!dedupe.has(key)) {
        dedupe.set(key, {
          ip: route.src,
          dev: route.dev || '-',
          network: route.network || '-',
          via: route.via || '',
          url,
          kind: route.dev === 'wlan0' ? 'good' : 'warn',
        });
      }
    });

    return [...dedupe.values()];
  };

  const setBusy = (busy) => {
    state.busy = busy;
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    root.querySelectorAll('button').forEach((button) => {
      if (button.dataset.lockIgnore === '1') return;
      button.disabled = busy;
    });
  };

  const renderRoutes = () => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    const accessListEl = root.querySelector('#nep_access_list');

    if (accessListEl) {
      if (!state.accessList.length) {
        accessListEl.innerHTML = `<div class="nep-empty">当前没有从路由表解析到带 <code>src</code> 的本机地址。可以先确认设备网络已正常联网，再点击刷新。</div>`;
      } else {
        accessListEl.innerHTML = state.accessList.map((item) => `
          <div class="nep-card">
            <div class="nep-card-head">
              <div>
                <div class="nep-card-title">${escapeHtml(item.ip)}</div>
                <div class="nep-tip">接口 ${escapeHtml(item.dev)}，来自 ${escapeHtml(item.network)}</div>
              </div>
              <div class="nep-chips">
                <span class="nep-chip" data-kind="${item.kind}">${escapeHtml(item.dev)}</span>
                ${item.via ? `<span class="nep-chip">网关 ${escapeHtml(item.via)}</span>` : ''}
              </div>
            </div>
            <div class="nep-address">
              <div class="nep-tip">建议访问地址</div>
              <code>${escapeHtml(item.url)}</code>
            </div>
            <div class="nep-actions">
              <button data-copy-type="ip" data-value="${escapeHtml(item.ip)}">复制 IP</button>
              <button data-copy-type="url" data-value="${escapeHtml(item.url)}">复制访问地址</button>
            </div>
          </div>
        `).join('');
      }
    }

    root.querySelectorAll('[data-copy-type]').forEach((button) => {
      button.onclick = async () => {
        await copyTextValue(button.dataset.value || '');
      };
    });
  };

  const refreshRoutes = async (silent = false) => {
    if (!silent) createToast('正在读取 ip route...', 'pink');
    setBusy(true);
    try {
      const res = await runShellWithUser('timeout 2s ip route', 5000);
      const raw = String(res?.content?.content || '').trim();
      if (!res?.success || !res?.content?.done || !raw) {
        state.rawRoute = raw;
        state.routes = [];
        state.accessList = [];
        renderRoutes();
        createToast('读取 ip route 失败', 'red');
        return false;
      }

      const routes = raw
        .split(/\r?\n/)
        .map(parseRouteLine)
        .filter(Boolean);

      state.rawRoute = raw;
      state.routes = routes;
      state.accessList = buildAccessList(routes);
      state.refreshedAt = new Date().toLocaleString('zh-CN', { hour12: false });
      renderRoutes();
      if (!silent) {
        createToast(`已解析 ${state.accessList.length} 个本机访问地址`, 'green');
      }
      return true;
    } catch (e) {
      state.routes = [];
      state.accessList = [];
      renderRoutes();
      createToast('读取路由信息异常', 'red');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const copyAllAddresses = async () => {
    const text = state.accessList.map((item) => `${item.ip}    ${item.url}    ${item.dev}`).join('\n');
    await copyTextValue(text);
  };

  const bindEvents = (el, id) => {
    el.querySelector('#nep_copy_all_btn').onclick = async () => {
      await copyAllAddresses();
    };
    showModal(id);
    const modalRoot = document.querySelector(`#${MODAL_NAME}`);
    const closeBtn = modalRoot?.querySelector(`#${MODAL_NAME}_close`);
    const actionBar = closeBtn?.parentElement;
    if (actionBar && closeBtn && !actionBar.querySelector('#nep_refresh_inline_btn')) {
      const refreshBtn = document.createElement('button');
      refreshBtn.id = 'nep_refresh_inline_btn';
      refreshBtn.textContent = '刷新';
      refreshBtn.style.marginRight = "10px"
      refreshBtn.onclick = async () => {
        await refreshRoutes();
      };
      actionBar.insertBefore(refreshBtn, closeBtn);
    }
  };

  const openModal = async () => {
    ensureStyle();
    document.querySelector(`#${MODAL_NAME}`)?.remove();

    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '920px',
      showConfirm: false,
      onClose: () => true,
      contentStyle: 'max-height:72vh;',
      content: `
        <div class="nep-wrap">
          <div class="nep-panel">
            <div class="nep-panel-head">
              <div class="nep-panel-title">建议访问地址</div>
              <div class="nep-actions" style="margin-top:0;">
                <button id="nep_copy_all_btn">复制全部访问地址</button>
              </div>
            </div>
            <div class="nep-list" id="nep_access_list"></div>
          </div>
        </div>
      `,
    });

    el.style.width = '96%';
    bindEvents(el, id);
    renderRoutes();
    await refreshRoutes(true);
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

  document.querySelector('.actions-buttons')?.appendChild(mainBtn);
})();
//</script>