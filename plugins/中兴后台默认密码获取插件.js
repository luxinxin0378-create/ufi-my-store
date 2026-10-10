//<script>
(async () => {
  const TITLE = '中兴后台默认密码';
  const BTN_ID = 'kano_zte_admin_password_btn';
  const MODAL_NAME = 'kano_zte_admin_password_modal';
  const STYLE_ID = 'kano_zte_admin_password_style';
  const UNIVERSAL_PASSWORD = 'Wa@9w+YWRtaW4=';

  const state = {
    loading: false,
    imeis: [],
    adminText: '',
    candidates: [],
  };

  const wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const run = async (command, timeout = 15000) => {
    const res = await runShellWithRoot(command, timeout);
    return {
      ok: Boolean(res?.success),
      text: String(res?.content || '').trim(),
      raw: res,
    };
  };

  const normalizeLine = (value = '') => String(value || '').replace(/\r/g, '').trim();

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .kzp-wrap {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #${MODAL_NAME} .kzp-panel,
      #${MODAL_NAME} .kzp-card {
        border-radius: 14px;
        padding: 10px 12px;
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.08);
        backdrop-filter: blur(10px);
      }
      #${MODAL_NAME} .kzp-panel-head,
      #${MODAL_NAME} .kzp-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
      }
      #${MODAL_NAME} .kzp-panel-title,
      #${MODAL_NAME} .kzp-card-title {
        font-size: .74rem;
        font-weight: 800;
        line-height: 1.35;
      }
      #${MODAL_NAME} .kzp-tip,
      #${MODAL_NAME} .kzp-empty {
        font-size: .62rem;
        line-height: 1.5;
        opacity: .82;
      }
      #${MODAL_NAME} .kzp-actions,
      #${MODAL_NAME} .kzp-card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      #${MODAL_NAME} .kzp-list {
        display: grid;
        gap: 8px;
      }
      #${MODAL_NAME} .kzp-card-main {
        display: grid;
        gap: 6px;
        margin-top: 6px;
      }
      #${MODAL_NAME} .kzp-code,
      #${MODAL_NAME} .kzp-raw {
        white-space: pre-wrap;
        word-break: break-word;
        font-size: .6rem;
        line-height: 1.45;
        border-radius: 10px;
        padding: 7px 9px;
        background: rgba(255,255,255,.03);
        border: 1px solid rgba(255,255,255,.06);
      }
      #${MODAL_NAME} .kzp-chip {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: .58rem;
        font-weight: 700;
        background: rgba(255,255,255,.08);
      }
      #${MODAL_NAME} .kzp-card-head .kzp-tip {
        margin-top: 2px;
      }
      #${MODAL_NAME} .kzp-card-actions button,
      #${MODAL_NAME} .kzp-actions button {
        margin: 0 !important;
        padding: 4px 9px;
        min-height: 28px;
        font-size: .62rem;
        line-height: 1.2;
      }
      #${MODAL_NAME} .kzp-chip[data-kind="ok"] {
        background: rgba(60,201,120,.16);
        color: #9dffbf;
      }
      #${MODAL_NAME} .kzp-chip[data-kind="warn"] {
        background: rgba(255,173,51,.16);
        color: #ffd08a;
      }
      #${MODAL_NAME} .kzp-chip[data-kind="info"] {
        background: rgba(98,176,255,.16);
        color: #9bd2ff;
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} .kzp-card-head {
          flex-direction: column;
          align-items: stretch;
          gap: 6px;
          margin-bottom: 8px;
        }
        #${MODAL_NAME} .kzp-panel-head {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }
        #${MODAL_NAME} .kzp-panel,
        #${MODAL_NAME} .kzp-card {
          padding: 8px 10px;
          border-radius: 12px;
        }
        #${MODAL_NAME} .kzp-wrap {
          gap: 8px;
        }
        #${MODAL_NAME} .kzp-list {
          gap: 6px;
        }
        #${MODAL_NAME} .kzp-card-main {
          margin-top: 4px;
          gap: 4px;
        }
        #${MODAL_NAME} .kzp-card-actions {
          display: grid;
          grid-template-columns: auto auto;
          justify-content: space-between;
          align-items: center;
        }
        #${MODAL_NAME} .kzp-actions {
          flex: 0 0 auto;
          flex-wrap: nowrap;
        }
        #${MODAL_NAME} .kzp-actions button {
          width: auto;
          white-space: nowrap;
        }
        #${MODAL_NAME} .kzp-card-actions button {
          width: auto;
          justify-self: end;
          padding: 3px 8px;
          min-height: 26px;
          font-size: .58rem;
        }
        #${MODAL_NAME} .kzp-panel-title,
        #${MODAL_NAME} .kzp-card-title {
          font-size: .7rem;
        }
        #${MODAL_NAME} .kzp-tip,
        #${MODAL_NAME} .kzp-empty,
        #${MODAL_NAME} .kzp-code {
          font-size: .58rem;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const isValidImei = (value = '') => {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length < 14 || digits.length > 17) return false;
    if (/^0+$/.test(digits)) return false;
    return true;
  };

  const collectImeis = (text = '') => {
    const found = new Set();
    const matches = String(text || '').match(/\d{14,17}/g) || [];
    matches.forEach((item) => {
      const digits = item.replace(/\D/g, '');
      if (isValidImei(digits)) {
        found.add(digits);
      }
    });
    return [...found];
  };

  const parseAdminText = (text = '') => {
    return String(text || '')
      .split(/\r?\n/)
      .map((line) => normalizeLine(line))
      .filter(Boolean)
      .join('\n')
      .trim();
  };

  const getImeiCandidates = async () => {
    try {
      const res = await (await fetchWithTimeout('/api/AT?command=AT%2BCGSN&slot=0')).json();
      return collectImeis(res?.result || '');
    } catch {
      return [];
    }
  };

  const getAdminText = async () => {
    const res = await run(`timeout 2s awk '{print}' /mnt/vendor/admin.txt 2>/dev/null || true`, 4000);
    return parseAdminText(res.text);
  };

  const buildCandidates = (imeis, adminText) => {
    const passwordSet = new Set();
    const candidates = [];
    const pushCandidate = (password, label, source, kind) => {
      const normalized = String(password || '').trim();
      if (!normalized || passwordSet.has(normalized)) return;
      passwordSet.add(normalized);
      candidates.push({ password: normalized, label, source, kind });
    };

    imeis.forEach((imei, index) => {
      pushCandidate(
        imei.slice(-6),
        index === 0 ? 'IMEI 后六位（当前优先命中）' : 'IMEI 后六位（多卡设备候选）',
        `IMEI: ${imei}`,
        index === 0 ? 'ok' : 'info',
      );
    });

    if (adminText) {
      pushCandidate(
        adminText,
        imeis.length ? 'admin.txt 文本（IMEI 不可用时命中）' : 'admin.txt 文本（当前优先命中）',
        '/mnt/vendor/admin.txt',
        imeis.length ? 'warn' : 'ok',
      );
    }

    pushCandidate(
      'admin',
      imeis.length || adminText ? '默认密码 admin（前两者失效时再试）' : '默认密码 admin（当前优先命中）',
      '内置默认值',
      imeis.length || adminText ? 'warn' : 'ok',
    );

    pushCandidate(
      UNIVERSAL_PASSWORD,
      '万能密码（最终兜底）',
      '固定常量；无法用于改密场景',
      'info',
    );

    return candidates;
  };

  const setBusy = (busy) => {
    state.loading = busy;
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    root.querySelectorAll('button').forEach((btn) => {
      btn.disabled = busy;
    });
  };

  const render = () => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;

    const listEl = root.querySelector('#kzp_list');

    if (!listEl) return;
    if (state.loading && !state.candidates.length) {
      listEl.innerHTML = `<div class="kzp-empty">正在读取 IMEI 和 /mnt/vendor/admin.txt，请稍候...</div>`;
      return;
    }

    listEl.innerHTML = state.candidates.map((item, index) => `
      <div class="kzp-card">
        <div class="kzp-card-head">
          <div>
            <div class="kzp-card-title">${index + 1}. ${escapeHtml(item.label)}</div>
            <div class="kzp-tip">${escapeHtml(item.source)}</div>
          </div>
          <div class="kzp-card-actions">
            <span class="kzp-chip" data-kind="${escapeHtml(item.kind)}">${escapeHtml(item.kind === 'ok' ? '优先尝试' : item.kind === 'warn' ? '备用' : '兜底')}</span>
            <button data-copy="${escapeHtml(item.password)}">复制</button>
          </div>
        </div>
        <div class="kzp-card-main">
          <div class="kzp-code">${escapeHtml(item.password)}</div>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.onclick = () => {
        copyText({
          target: {
            innerText: btn.dataset.copy || '',
          },
        });
      };
    });
  };

  const refreshPasswords = async () => {
    setBusy(true);
    createToast('正在读取中兴后台默认密码候选...', 'pink');
    try {
      const [imeis, adminText] = await Promise.all([
        getImeiCandidates(),
        getAdminText(),
      ]);
      state.imeis = imeis;
      state.adminText = adminText;
      state.candidates = buildCandidates(imeis, adminText);
      render();
      createToast('密码候选已更新', 'green');
    } finally {
      setBusy(false);
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
        <div class="kzp-wrap">
          <div class="kzp-panel">
            <div class="kzp-panel-head">
              <div>
                <div class="kzp-panel-title">候选密码</div>
                <div class="kzp-tip">按规则顺序展示，越靠前越优先。</div>
              </div>
              <div class="kzp-actions">
                <button id="kzp_refresh_btn">刷新候选</button>
              </div>
            </div>
            <div class="kzp-list" id="kzp_list"></div>
          </div>
        </div>
      `,
    });

    el.style.width = '96%';
    el.querySelector('#kzp_refresh_btn').onclick = async () => {
      await refreshPasswords();
    };

    showModal(id);
    render();
    await refreshPasswords();
  };

  const mainBtn = document.createElement('button');
  mainBtn.id = BTN_ID;
  mainBtn.textContent = TITLE;
  mainBtn.onclick = async () => {
    if (typeof checkAdvancedFunc === 'function' && !(await checkAdvancedFunc())) {
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
