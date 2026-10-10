//<script>
(async () => {
  const MODAL_NAME = 'kano_lty_rom_helper_modal';
  const UPLOADS_DIR = '/data/data/com.minikano.f50_sms/files/uploads';
  const IMAGE_ITEMS = [
    { key: 'bg1', label: '主屏 1 背景图', path: '/data/u30pro_bg1.png' },
    { key: 'bg2', label: '主屏 2 背景图', path: '/data/u30pro_bg2.png' },
    { key: 'lock', label: '锁屏背景图', path: '/data/u30pro_lock.png' },
    { key: 'qs', label: '状态栏下拉背景图', path: '/data/u30pro_qs.png' },
  ];
  const WEB_RESTART_TOAST_NAME = 'kano_lty_restart_web_confirm_toast';

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
  const previewUrlFor = (filename) => `/api/uploads/${filename}?ts=${Date.now()}`;
  const getBaseName = (path) => String(path).split('/').pop() || 'download.png';
  const formatSizeKB = (bytes) => `${(Number(bytes || 0) / 1024).toFixed(2)} KB`;

  const state = {
    files: {},
  };

  const openFilePicker = (accept = 'image/png,image/*') => new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '-9999px';
    input.style.opacity = '0';
    document.body.appendChild(input);

    let settled = false;
    const finish = (file = null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };

    input.onchange = () => {
      finish(input.files?.[0] || null);
    };
    input.oncancel = () => {
      finish(null);
    };
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!settled && !input.files?.length) {
          finish(null);
        }
      }, 300);
    }, { once: true });

    input.click();
  });

  const run = async (command, timeout = 15000) => {
    const res = await runShellWithRoot(command, timeout);
    return {
      ok: !!res?.success,
      text: String(res?.content || '').trim(),
      raw: res,
    };
  };

  const askRestartWebProcess = () => new Promise((resolve) => {
    const { el, close } = createFixedToast(
      WEB_RESTART_TOAST_NAME,
      `<div style="pointer-events:all;width:90vw;max-width:520px;">
        <div class="title" style="margin:0">重启 Web 进程</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.75">
          机型切换已完成，是否现在重启 <code>com.zte.web</code>？<br />
          该进程会自动重新拉起，用于尽快加载新的机型状态。
        </div>
        <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end">
          <button class="restart">立即重启</button>
          <button class="cancel">取消</button>
        </div>
      </div>`,
    );
    const done = (value) => {
      close();
      resolve(value);
    };
    el.querySelector('.restart')?.addEventListener('click', () => done(true));
    el.querySelector('.cancel')?.addEventListener('click', () => done(false));
  });

  const restartWebProcess = async () => run(`
PIDS="$(pidof com.zte.web 2>/dev/null || true)"
if [ -n "$PIDS" ]; then
  kill -9 $PIDS 2>/dev/null || true
fi
sync
echo "__DONE__"
`, 15000);

  const readImageState = async (item) => {
    const res = await run(`
FILE=${shellQuote(item.path)}
if [ -f "$FILE" ]; then
  SIZE="$(wc -c < "$FILE" 2>/dev/null | tr -d ' \r\n')"
  [ -n "$SIZE" ] || SIZE=0
  echo "__EXISTS__:$SIZE"
else
  echo "__MISSING__"
fi
`);
    if (!res.ok) return { ok: false, exists: false, detail: '读取失败' };
    if (res.text.startsWith('__EXISTS__:')) {
      const size = Number(res.text.split(':')[1] || 0);
      return {
        ok: true,
        exists: true,
        size,
        detail: `已自定义${Number.isFinite(size) ? `，${formatSizeKB(size)}` : ''}`,
      };
    }
    return { ok: true, exists: false, detail: '未设置，使用默认背景' };
  };

  const publishPreviewImage = async (item) => {
    const previewName = `kano_lty_preview_${item.key}.png`;
    const res = await run(`
SRC=${shellQuote(item.path)}
DEST=${shellQuote(`${UPLOADS_DIR}/${previewName}`)}
if [ ! -f "$SRC" ]; then
  echo "__MISSING__"
  exit 0
fi
mkdir -p ${shellQuote(UPLOADS_DIR)}
cp "$SRC" "$DEST"
chmod 644 "$DEST"
echo "__READY__"
`);
    if (!res.ok || res.text !== '__READY__') return null;
    return previewUrlFor(previewName);
  };

  const uploadImageToDevice = async (item, file) => {
    const uploadedName = await uploadFileKano(file, false);
    if (!uploadedName) {
      return { ok: false, message: '上传失败' };
    }
    const tempPath = `${UPLOADS_DIR}/${uploadedName}`;
    const moveRes = await run(`
SRC=${shellQuote(tempPath)}
DEST=${shellQuote(item.path)}
[ -f "$SRC" ] || exit 1
mv "$SRC" "$DEST"
chmod 644 "$DEST"
sync
`, 20000);
    if (!moveRes.ok) {
      return { ok: false, message: moveRes.text || '移动到目标路径失败' };
    }
    return { ok: true };
  };

  const resetImageToDefault = async (item) => {
    return run(`
rm -f ${shellQuote(item.path)}
sync
`);
  };

  const renderImageCards = () => `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
      ${IMAGE_ITEMS.map((item) => `
        <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.04);display:flex;flex-direction:column;gap:10px;">
          <div>
            <div class="title" style="font-size:.76rem;margin:0 0 6px 0;">${item.label}</div>
            <div id="lty_status_${item.key}" style="font-size:.66rem;line-height:1.6;opacity:.9;">读取中...</div>
          </div>
          <div style="border-radius:10px;overflow:hidden;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);min-height:160px;display:flex;align-items:center;justify-content:center;flex:1">
            <div id="lty_preview_link_${item.key}" style="display:none;width:100%;height:100%;align-items:center;justify-content:center;padding:8px;">
              <img id="lty_preview_${item.key}" alt="${item.label}" style="max-width:100%;max-height:220px;object-fit:contain;" />
            </div>
            <div id="lty_placeholder_${item.key}" style="padding:18px;text-align:center;font-size:.66rem;line-height:1.7;opacity:.78;">当前未设置自定义图片<br />使用系统默认背景</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div id="lty_file_name_${item.key}" style="font-size:.64rem;opacity:.82;">未选择文件</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="lty_pick_${item.key}">选择文件</button>
            <button id="lty_upload_${item.key}">上传替换</button>
            <button id="lty_download_${item.key}">下载图片</button>
            <button id="lty_refresh_${item.key}">刷新预览</button>
            <button id="lty_reset_${item.key}">恢复默认</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const setImagePreview = (key, url) => {
    const imgEl = document.querySelector(`#lty_preview_${key}`);
    const linkEl = document.querySelector(`#lty_preview_link_${key}`);
    const placeholderEl = document.querySelector(`#lty_placeholder_${key}`);
    if (!imgEl || !linkEl || !placeholderEl) return;
    if (url) {
      imgEl.src = url;
      linkEl.style.display = 'flex';
      placeholderEl.style.display = 'none';
      return;
    }
    imgEl.removeAttribute('src');
    linkEl.style.display = 'none';
    placeholderEl.style.display = '';
  };

  const downloadCurrentImage = async (item) => {
    const url = await publishPreviewImage(item);
    if (!url) {
      createToast('当前没有可下载的自定义图片', 'pink');
      return;
    }
    try {
      const res = await fetch(url, { headers: common_headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = getBaseName(item.path);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error(error);
      createToast('下载失败', 'red', 5000);
    }
  };

  const refreshImageCard = async (item) => {
    const statusEl = document.querySelector(`#lty_status_${item.key}`);
    if (!statusEl) return;

    statusEl.textContent = '读取中...';
    const imageState = await readImageState(item);
    statusEl.textContent = imageState.detail;

    if (!imageState.ok || !imageState.exists) {
      setImagePreview(item.key, null);
      return;
    }
    const url = await publishPreviewImage(item);
    setImagePreview(item.key, url);
  };

  const resetPendingImageSelection = (item) => {
    state.files[item.key] = null;
    const fileNameEl = document.querySelector(`#lty_file_name_${item.key}`);
    if (fileNameEl) {
      fileNameEl.textContent = '未选择文件';
    }
  };

  const refreshAll = async () => {
    await Promise.all(IMAGE_ITEMS.map((item) => refreshImageCard(item)));
  };

  const bindImageActions = (item) => {
    const pickBtn = document.querySelector(`#lty_pick_${item.key}`);
    const fileNameEl = document.querySelector(`#lty_file_name_${item.key}`);
    const uploadBtn = document.querySelector(`#lty_upload_${item.key}`);
    const downloadBtn = document.querySelector(`#lty_download_${item.key}`);
    const refreshBtn = document.querySelector(`#lty_refresh_${item.key}`);
    const resetBtn = document.querySelector(`#lty_reset_${item.key}`);
    if (!pickBtn || !fileNameEl || !uploadBtn || !downloadBtn || !refreshBtn || !resetBtn) return;

    pickBtn.onclick = async () => {
      const file = await openFilePicker();
      state.files[item.key] = file || null;
      fileNameEl.textContent = file ? `已选择：${file.name}` : '未选择文件';
      if (!file) {
        await refreshImageCard(item);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(item.key, String(reader.result || ''));
      };
      reader.readAsDataURL(file);
    };

    uploadBtn.onclick = async () => {
      const file = state.files[item.key];
      if (!file) {
        createToast('请先选择图片文件', 'pink');
        return;
      }
      uploadBtn.disabled = true;
      createToast(`正在上传 ${item.label}...`, 'pink');
      const result = await uploadImageToDevice(item, file);
      uploadBtn.disabled = false;
      if (!result.ok) {
        createToast(result.message || '上传失败', 'red', 5000);
        return;
      }
      resetPendingImageSelection(item);
      createToast(`${item.label} 已更新`, 'green');
      await refreshImageCard(item);
    };

    downloadBtn.onclick = async () => {
      downloadBtn.disabled = true;
      await downloadCurrentImage(item);
      downloadBtn.disabled = false;
    };

    refreshBtn.onclick = async () => {
      refreshBtn.disabled = true;
      resetPendingImageSelection(item);
      await refreshImageCard(item);
      refreshBtn.disabled = false;
    };

    resetBtn.onclick = async () => {
      resetBtn.disabled = true;
      const result = await resetImageToDefault(item);
      resetBtn.disabled = false;
      if (!result.ok) {
        createToast(result.text || '恢复默认失败', 'red', 5000);
        return;
      }
      resetPendingImageSelection(item);
      createToast(`${item.label} 已恢复默认`, 'green');
      await refreshImageCard(item);
    };
  };

  const openModal = async () => {
    document.querySelector(`#${MODAL_NAME}`)?.remove();
    const { id } = createModal({
      name: MODAL_NAME,
      title: 'U30Pro 洛天依主题模块辅助工具',
      maxWidth: '1080px',
      isMask: true,
      showConfirm: false,
      contentStyle: 'max-height:78vh;',
      onClose: () => true,
      content: `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="padding:12px;border-radius:12px;background:rgba(255,255,255,.04);">
            <div class="title" style="font-size:.78rem;margin:0 0 8px 0;">背景图管理</div>
            <div style="font-size:.66rem;line-height:1.7;opacity:.82;margin-bottom:10px;">
              上传后会先进入宿主 uploads 目录，再移动到目标路径。恢复默认会直接删除对应文件。
            </div>
            ${renderImageCards()}
          </div>
        </div>
      `,
    });

    showModal(id);
    IMAGE_ITEMS.forEach(bindImageActions);
    await refreshAll();
  };

  const btn = document.createElement('button');
  btn.textContent = '洛天依模块辅助';
  btn.onclick = async () => {
    if (!(await checkAdvancedFunc())) {
      createToast('请先启用高级功能', 'pink');
      return;
    }
    await openModal();
  };

  while (!document.querySelector('.actions-buttons')) {
    await sleep(150);
  }
  document.querySelector('.actions-buttons')?.appendChild(btn);
})();
//</script>
