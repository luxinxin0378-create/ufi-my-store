//<script>
(async () => {
  const TITLE = '一键改串插件';
  const MODAL_NAME = 'imei_writer_plugin_modal';
  const STYLE_ID = 'imei_writer_plugin_style';

  const executeATCommand = async (command, slot = null) => {
    const targetSlot = slot == null ? '0' : String(slot);
    try {
      const commandEnc = encodeURIComponent(command);
      const res = await (
        await fetch(`${KANO_baseURL}/AT?command=${commandEnc}&slot=${targetSlot}`, {
          headers: common_headers,
        })
      ).json();
      return res;
    } catch (e) {
      return null;
    }
  };

  const execAT = async (command, slot) => {
    if (!command) return { ok: false, data: null };
    try {
      const res = await executeATCommand(command, slot);
      if (!res || res.error) return { ok: false, data: null };
      return { ok: true, data: res.result };
    } catch (e) {
      return { ok: false, data: null };
    }
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .imei-panel {
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.035);
        backdrop-filter: blur(10px);
        padding: 14px;
      }
      #${MODAL_NAME} .imei-row {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
      }
      #${MODAL_NAME} .imei-row:last-child {
        margin-bottom: 0;
      }
      #${MODAL_NAME} .imei-input,
      #${MODAL_NAME} .imei-select {
        box-sizing: border-box;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.1);
        color: #fff;
        outline: none;
      }
      #${MODAL_NAME} .imei-input {
        flex: 1;
        width: 100%;
      }
      #${MODAL_NAME} .imei-select {
        min-width: 110px;
        background: rgba(0,0,0,.15);
      }
      #${MODAL_NAME} .imei-input:focus,
      #${MODAL_NAME} .imei-select:focus {
        border-color: rgba(102, 195, 255, 0.7);
        box-shadow: 0 0 0 3px rgba(102, 195, 255, 0.12);
      }
      #${MODAL_NAME} .imei-log {
        width: 100%;
        min-height: 180px;
        box-sizing: border-box;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(0,0,0,.18);
        color: #fff;
        font-size: .68rem;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        overflow: auto;
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} .imei-row {
          flex-direction: column;
        }
        #${MODAL_NAME} .imei-row button,
        #${MODAL_NAME} .imei-input,
        #${MODAL_NAME} .imei-select {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const setBusy = (busy) => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    root.querySelectorAll('button, input, select').forEach((el) => {
      el.disabled = busy;
    });
  };

  const appendLog = (message) => {
    const logEl = document.querySelector('#imei_plugin_log');
    if (!logEl) return;
    const time = new Date().toLocaleString('zh-CN', { hour12: false });
    const oldText = logEl.textContent || '';
    logEl.textContent = oldText ? `${oldText}\n[${time}] ${message}` : `[${time}] ${message}`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  const getSlot = () => String(document.querySelector('#imei_plugin_slot')?.value || '0');

  const getIMEI = () => String(document.querySelector('#imei_plugin_input')?.value || '').trim();

  const confirmWriteIMEI = (slot, imei) => new Promise((resolve) => {
    const { el, close } = createFixedToast(
      'imei_plugin_confirm_write',
      `
        <div style="min-width:280px;line-height:1.7;pointer-events:all">
          <div style="font-size:.74rem;margin-bottom:10px;">确认写入当前 IMEI？</div>
          <div style="font-size:.68rem;opacity:.88;">槽位：${slot}</div>
          <div style="font-size:.68rem;opacity:.88;">IMEI：${imei}</div>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">
            <button id="imei_plugin_confirm_cancel" type="button">取消</button>
            <button id="imei_plugin_confirm_ok" type="button">确认写入</button>
          </div>
        </div>
      `
    );

    const done = (result) => {
      close();
      resolve(result);
    };

    const cancelBtn = el?.querySelector('#imei_plugin_confirm_cancel');
    const okBtn = el?.querySelector('#imei_plugin_confirm_ok');

    if (!cancelBtn || !okBtn) {
      done(false);
      return;
    }

    cancelBtn.onclick = () => {
      done(false);
    };
    okBtn.onclick = () => {
      done(true);
    };
  });

  const queryIMEI = async () => {
    const slot = getSlot();
    setBusy(true);
    appendLog(`slot${slot} 查询开始: AT+SPIMEI?`);
    try {
      const res = await execAT('AT+SPIMEI?', slot);
      const text = String(res?.data || '').trim() || '无返回';
      appendLog(`槽位${slot} 查询返回:\n${text}`);
      if (!res?.ok || !text.includes('OK')) {
        createToast('查询失败', 'red');
        return;
      }
      createToast('查询成功', 'green');
    } finally {
      setBusy(false);
    }
  };

  const writeIMEI = async () => {
    const slot = getSlot();
    const imei = getIMEI();
    if (!/^\d{15}$/.test(imei)) {
      createToast('请输入15位IMEI', 'red');
      return;
    }

    const confirmed = await confirmWriteIMEI(slot, imei);
    if (!confirmed) {
      createToast('已取消写入', 'pink');
      return;
    }

    const command = `AT+SPIMEI=${slot},"${imei}"`;
    setBusy(true);
    appendLog(`slot${slot} 写入开始: ${command}`);
    try {
      const res = await execAT(command, slot);
      const text = String(res?.data || '').trim() || '无返回';
      appendLog(`slot${slot} 写入返回:\n${text}`);
      if (!res?.ok || !text.includes('OK')) {
        createToast('写入失败', 'red');
        return;
      }
      createToast('写入成功', 'green');
    } finally {
      setBusy(false);
    }
  };

  const clearLog = () => {
    const logEl = document.querySelector('#imei_plugin_log');
    if (!logEl) return;
    logEl.textContent = '';
    createToast('日志已清空', 'green');
  };

  const openModal = async () => {
    ensureStyle();
    document.querySelector(`#${MODAL_NAME}`)?.remove();

    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '720px',
      showConfirm: false,
      onClose: () => true,
      content: `
        <div class="imei-panel">
          <div class="imei-row">
            <select id="imei_plugin_slot" class="imei-select">
              <option value="0">槽位0</option>
              <option value="1">槽位1</option>
            </select>
            <input id="imei_plugin_input" class="imei-input" type="text" inputmode="numeric" placeholder="请输入15位IMEI">
            <button id="imei_plugin_query_btn">查询</button>
            <button id="imei_plugin_write_btn">写入</button>
          </div>
          <pre id="imei_plugin_log" class="imei-log"></pre>
        </div>
      `,
    });

    const closeBtn = el.querySelector(`#${MODAL_NAME}_close`);
    if (closeBtn?.parentElement) {
      const clearBtn = document.createElement('button');
      clearBtn.id = 'imei_plugin_clear_btn';
      clearBtn.type = 'button';
      clearBtn.textContent = '清空日志';
      clearBtn.style.marginRight = '8px';
      clearBtn.onclick = () => {
        clearLog();
      };
      closeBtn.parentElement.insertBefore(clearBtn, closeBtn);
    }

    el.querySelector('#imei_plugin_query_btn').onclick = async () => {
      await queryIMEI();
    };
    el.querySelector('#imei_plugin_write_btn').onclick = async () => {
      await writeIMEI();
    };

    showModal(id);
    appendLog('插件已打开，可选择 槽位0 或 槽位1 进行查询/写入');
  };

  const mainBtn = document.createElement('button');
  mainBtn.textContent = TITLE;
  mainBtn.onclick = async () => {
    await openModal();
  };

  document.querySelector('.actions-buttons')?.appendChild(mainBtn);
})();
//</script>
