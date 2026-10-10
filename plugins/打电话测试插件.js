//<script>
(async () => {
  const TITLE = '拨号测试插件';
  const MODAL_NAME = 'dial_test_plugin_modal';
  const STYLE_ID = 'dial_test_plugin_style';

  const getATSlot = () => {
    const atSlotValue = document.querySelector('#AT_SLOT')?.value?.trim();
    return /^\d+$/.test(atSlotValue || '') ? atSlotValue : '0';
  };

  const executeATCommand = async (command, slot = null) => {
    const targetSlot = slot == null ? getATSlot() : slot;
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

  const execAT = async (command) => {
    if (!command) return { ok: false, data: null };
    try {
      const res = await executeATCommand(command);
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
      #${MODAL_NAME} .dial-panel {
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.035);
        backdrop-filter: blur(10px);
        padding: 14px;
      }
      #${MODAL_NAME} .dial-row {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      #${MODAL_NAME} .dial-input {
        flex: 1;
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.1);
        color: #fff;
        outline: none;
      }
      #${MODAL_NAME} .dial-input:focus {
        border-color: rgba(102, 195, 255, 0.7);
        box-shadow: 0 0 0 3px rgba(102, 195, 255, 0.12);
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} .dial-row {
          flex-direction: column;
        }
        #${MODAL_NAME} .dial-row button,
        #${MODAL_NAME} .dial-input {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const setBusy = (busy) => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    root.querySelectorAll('button, input').forEach((el) => {
      el.disabled = busy;
    });
  };

  const dial = async () => {
    const input = document.querySelector('#dial_test_number');
    const number = String(input?.value || '').trim();
    if (!number) {
      createToast('请输入号码', 'red');
      return;
    }

    setBusy(true);
    createToast(`正在拨打 ${number}`, 'pink');
    try {
      const res = await execAT(`ATD${number};`);
      if (!res?.ok || !String(res.data || '').includes('OK')) {
        createToast('拨号失败', 'red');
        return;
      }
      createToast('拨号指令已发送', 'green');
    } finally {
      setBusy(false);
    }
  };

  const hangup = async () => {
    setBusy(true);
    createToast('正在挂断', 'pink');
    try {
      const res = await execAT('ATH');
      if (!res?.ok || !String(res.data || '').includes('OK')) {
        createToast('挂断失败', 'red');
        return;
      }
      createToast('挂断指令已发送', 'green');
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
      maxWidth: '640px',
      showConfirm: false,
      onClose: () => true,
      content: `
        <div class="dial-panel">
          <div class="dial-row">
            <input id="dial_test_number" class="dial-input" type="text" inputmode="numeric" placeholder="请输入号码" value="">
            <button id="dial_test_dial_btn">拨号</button>
            <button id="dial_test_hangup_btn">挂断</button>
          </div>
        </div>
      `,
    });

    el.querySelector('#dial_test_dial_btn').onclick = async () => {
      await dial();
    };

    el.querySelector('#dial_test_hangup_btn').onclick = async () => {
      await hangup();
    };

    showModal(id);
  };

  const mainBtn = document.createElement('button');
  mainBtn.textContent = TITLE;
  mainBtn.onclick = async () => {
    await openModal();
  };

  document.querySelector('.actions-buttons')?.appendChild(mainBtn);
})();
//</script>
