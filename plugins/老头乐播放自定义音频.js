//<script>
(async () => {
  const TITLE = '老头乐播放自定义音频';
  const MODAL_NAME = 'kano_beep_custom_audio_modal';
  const STYLE_ID = 'kano_beep_custom_audio_style';

  const state = {
    isPlaying: false,
    path: '',
    busy: false,
  };

  const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .beep-wrap {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      #${MODAL_NAME} .beep-tip {
        font-size: .66rem;
        line-height: 1.7;
        opacity: .82;
      }
      #${MODAL_NAME} .beep-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }
      #${MODAL_NAME} .beep-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      #${MODAL_NAME} .beep-label {
        font-size: .68rem;
        font-weight: 700;
      }
      #${MODAL_NAME} input {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.1);
        outline: none;
        color: #fff;
        background: rgba(255,255,255,.04);
      }
      #${MODAL_NAME} input:focus {
        border-color: rgba(102,195,255,.75);
        box-shadow: 0 0 0 3px rgba(102,195,255,.12);
      }
      #${MODAL_NAME} .beep-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      #${MODAL_NAME} .beep-status {
        font-size: .68rem;
        font-weight: 700;
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} .beep-actions button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const setBusy = (busy) => {
    state.busy = busy;
    const root = document.getElementById(MODAL_NAME);
    if (!root) return;
    root.querySelectorAll('button, input').forEach((el) => {
      if (el.dataset.lockIgnore === '1') return;
      el.disabled = busy;
    });
  };

  const syncForm = () => {
    const root = document.getElementById(MODAL_NAME);
    if (!root) return;
    const input = root.querySelector('#kano_beep_custom_audio_path');
    const playBtn = root.querySelector('#kano_beep_custom_audio_toggle');
    const status = root.querySelector('#kano_beep_custom_audio_status');

    if (input && document.activeElement !== input) {
      input.value = state.path || '';
    }
    if (playBtn) {
      playBtn.textContent = state.isPlaying ? '停止播放' : '播放';
    }
    if (status) {
      status.textContent = state.isPlaying ? '当前状态：播放中' : '当前状态：未播放';
      status.style.color = state.isPlaying ? '#9dffbf' : '#ffd08a';
    }
  };

  const postBeep = async (beep, path) => {
    const res = await fetch(`${KANO_baseURL}/beep_my_device`, {
      method: 'POST',
      headers: {
        ...(common_headers || {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        beep: beep ? '1' : '0',
        path: String(path.replaceAll("/api/uploads/", "/") || '').trim(),
      }),
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      throw new Error(typeof data === 'string' ? data : data?.error || `HTTP ${res.status}`);
    }
    return data;
  };

  const handleTogglePlay = async () => {
    const root = document.getElementById(MODAL_NAME);
    if (!root || state.busy) return;

    const input = root.querySelector('#kano_beep_custom_audio_path');
    const path = String(input?.value || '').trim();

    if (!state.isPlaying && !path) {
      createToast('请先输入音频 URL 或文件路径', 'red');
      return;
    }

    state.path = path;
    setBusy(true);
    try {
      await postBeep(!state.isPlaying, state.path);
      state.isPlaying = !state.isPlaying;
      syncForm();
      createToast(state.isPlaying ? '已开始播放' : '已停止播放', 'green');
    } catch (error) {
      createToast(`操作失败：${error?.message || error}`, 'red', 5000);
    } finally {
      setBusy(false);
    }
  };

  const openModal = () => {
    ensureStyle();
    document.getElementById(MODAL_NAME)?.remove();

    const { id } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '720px',
      showConfirm: false,
      onClose: () => true,
      content: `
        <div class="beep-wrap">
          <div class="beep-tip">
            “上传文件管理”会直接打开系统现成的上传文件列表。把音频上传后，将它的 URL 或路径填到下面输入框，再点播放。
          </div>
          <div class="beep-field">
            <span class="beep-label">音频 URL / 路径</span>
            <input id="kano_beep_custom_audio_path" spellcheck="false" placeholder="例如：/uploads/test.mp3">
          </div>
          <div class="beep-row">
            <span class="beep-status" id="kano_beep_custom_audio_status"></span>
          </div>
          <div class="beep-actions">
            <button id="kano_beep_custom_audio_upload" data-lock-ignore="1">上传文件管理</button>
            <button id="kano_beep_custom_audio_toggle">${state.isPlaying ? '停止播放' : '播放'}</button>
          </div>
        </div>
      `,
    });

    showModal(id);
    syncForm();

    const root = document.getElementById(MODAL_NAME);
    if (!root) return;

    const input = root.querySelector('#kano_beep_custom_audio_path');
    const uploadBtn = root.querySelector('#kano_beep_custom_audio_upload');
    const toggleBtn = root.querySelector('#kano_beep_custom_audio_toggle');

    input?.addEventListener('input', (event) => {
      state.path = String(event.target?.value || '');
    });

    uploadBtn?.addEventListener('click', () => {
      if (typeof handleOpenUploadFilesList !== 'function') {
        createToast('未找到 handleOpenUploadFilesList()', 'red');
        return;
      }
      handleOpenUploadFilesList();
    });

    toggleBtn?.addEventListener('click', async () => {
      await handleTogglePlay();
    });
  };

  const main = async () => {
    while (!document.querySelector('.actions-buttons')) {
      await wait();
    }
    if (document.getElementById('kano_beep_custom_audio_entry_btn')) return;
    const btn = document.createElement('button');
    btn.id = 'kano_beep_custom_audio_entry_btn';
    btn.textContent = TITLE;
    btn.onclick = openModal;
    document.querySelector('.actions-buttons')?.appendChild(btn);
  };

  await main();
})();
//</script>
