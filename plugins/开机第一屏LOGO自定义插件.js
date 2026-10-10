//<script>
(async () => {
  const MODAL_NAME = 'android_logo_customizer_modal';
  const STYLE_ID = 'android_logo_customizer_style';
  const UPLOADS_DIR = '/data/data/com.minikano.f50_sms/files/uploads';
  const state = {
    busy: false,
    logoPartition: null,
    partitionSize: 0,
    screenWidth: 0,
    screenHeight: 0,
    file: null,
    imageUrl: '',
    imageBitmap: null,
    sourceWidth: 0,
    sourceHeight: 0,
    previewScale: 1,
    minScale: 1,
    offsetX: 0,
    offsetY: 0,
    dragActive: false,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginX: 0,
    dragOriginY: 0,
    outputBlob: null,
    outputSize: 0,
    uploadName: '',
    uploadPath: '',
  };

  const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
  const shellQuote = (value) => `'${String(value || '').replace(/'/g, `'\\''`)}'`;
  const escapeHtml = (text) =>
    String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  const formatBytesLocal = (bytes) => {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };
  const getTimestamp = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  };
  const runRoot = async (command, timeout = 30000) => {
    const res = await runShellWithRoot(command, timeout);
    return {
      ok: Boolean(res?.success),
      text: String(res?.content || '').trim(),
      raw: res,
    };
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const safariLikely = /^((?!chrome|android).)*safari/i.test(navigator.userAgent || '');

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .logo-wrap {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      #${MODAL_NAME} .logo-hero,
      #${MODAL_NAME} .logo-panel,
      #${MODAL_NAME} .logo-stat,
      #${MODAL_NAME} .logo-preview-shell,
      #${MODAL_NAME} .logo-upload-card {
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
        backdrop-filter: blur(10px);
      }
      #${MODAL_NAME} .logo-hero {
        padding: 16px;
        position: relative;
        overflow: hidden;
      }
      #${MODAL_NAME} .logo-hero::after {
        content: '';
        position: absolute;
        right: -30px;
        bottom: -42px;
        width: 160px;
        height: 160px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(255,180,90,.3), transparent 66%);
      }
      #${MODAL_NAME} .logo-title {
        margin: 0 0 6px;
        font-size: 1rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .logo-subtitle,
      #${MODAL_NAME} .logo-note {
        font-size: .68rem;
        line-height: 1.75;
        opacity: .8;
      }
      #${MODAL_NAME} .logo-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      #${MODAL_NAME} .logo-stat {
        padding: 12px;
      }
      #${MODAL_NAME} .logo-stat-label {
        opacity: .7;
        font-size: .62rem;
        margin-bottom: 6px;
      }
      #${MODAL_NAME} .logo-stat-value {
        font-size: .82rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .logo-panel {
        padding: 14px;
      }
      #${MODAL_NAME} .logo-panel-title {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
        margin-bottom: 10px;
        font-size: .78rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .logo-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 5px 10px;
        font-size: .62rem;
        font-weight: 700;
        background: rgba(255,255,255,.08);
      }
      #${MODAL_NAME} .logo-badge[data-kind="ok"] {
        color: #9af3aa;
        background: rgba(112,210,120,.16);
      }
      #${MODAL_NAME} .logo-badge[data-kind="warn"] {
        color: #ffd198;
        background: rgba(255,167,81,.16);
      }
      #${MODAL_NAME} .logo-badge[data-kind="bad"] {
        color: #ffb0b0;
        background: rgba(255,82,82,.16);
      }
      #${MODAL_NAME} .logo-kv {
        display: grid;
        grid-template-columns: 120px minmax(0, 1fr);
        gap: 8px 10px;
        font-size: .68rem;
        line-height: 1.65;
      }
      #${MODAL_NAME} .logo-kv-key {
        opacity: .68;
      }
      #${MODAL_NAME} .logo-kv-value {
        word-break: break-all;
      }
      #${MODAL_NAME} .logo-actions,
      #${MODAL_NAME} .logo-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      #${MODAL_NAME} .logo-preview-shell {
        padding: 12px;
        height: 380px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-direction:column;
      }
      #${MODAL_NAME} .logo-preview-stage {
        position: relative;
        overflow: hidden;
        border-radius: 14px;
        flex: 0 0 auto;
        margin: 0 auto;
        background:
          linear-gradient(45deg, rgba(255,255,255,.06) 25%, transparent 25%, transparent 75%, rgba(255,255,255,.06) 75%),
          linear-gradient(45deg, rgba(255,255,255,.06) 25%, transparent 25%, transparent 75%, rgba(255,255,255,.06) 75%);
        background-position: 0 0, 10px 10px;
        background-size: 20px 20px;
        touch-action: none;
      }
      #${MODAL_NAME} .logo-preview-stage canvas {
        width: 100%;
        height: 100%;
        display: block;
        cursor: grab;
      }
      #${MODAL_NAME} .logo-preview-stage[data-dragging="1"] canvas {
        cursor: grabbing;
      }
      #${MODAL_NAME} .logo-preview-meta {
        margin-top: 10px;
        font-size: .66rem;
        display: flex;
        flex-wrap: wrap;
        gap: 8px 14px;
        opacity: .8;
      }
      #${MODAL_NAME} input[type="range"] {
        width: min(320px, 100%);
      }
      #${MODAL_NAME} .logo-upload-card {
        padding: 12px;
      }
      #${MODAL_NAME} .logo-danger {
        color: #ffaaaa;
      }
      #${MODAL_NAME} .logo-good {
        color: #9af3aa;
      }
      @media (max-width: 760px) {
        #${MODAL_NAME} .logo-grid {
          grid-template-columns: 1fr 1fr;
        }
        #${MODAL_NAME} .logo-kv {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const resetImageState = () => {
    if (state.imageUrl && String(state.imageUrl).startsWith('blob:')) {
      URL.revokeObjectURL(state.imageUrl);
    }
    state.file = null;
    state.imageUrl = '';
    state.imageBitmap = null;
    state.sourceWidth = 0;
    state.sourceHeight = 0;
    state.previewScale = 1;
    state.minScale = 1;
    state.offsetX = 0;
    state.offsetY = 0;
    state.outputBlob = null;
    state.outputSize = 0;
    state.uploadName = '';
    state.uploadPath = '';
  };

  const invalidateUploadedOutput = () => {
    state.uploadName = '';
    state.uploadPath = '';
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsDataURL(file);
    });

  const findLogoPartition = async () => {
    const res = await runRoot(`
for base in /dev/block/bootdevice/by-name /dev/block/by-name /dev/block/platform/*/by-name /dev/block/platform/*/*/by-name; do
  [ -d "$base" ] || continue
  for name in logo LOGO; do
    path="$base/$name"
    [ -e "$path" ] || continue
    real="$(readlink -f "$path" 2>/dev/null)"
    printf '%s\\t%s\\t%s\\n' "$name" "$path" "$real"
    exit 0
  done
done
exit 1
`, 20000);
    if (!res.ok || !res.text) return null;
    const [name, linkPath, realPath] = String(res.text || '').split('\t');
    return {
      name: String(name || 'logo').trim(),
      linkPath: String(linkPath || '').trim(),
      realPath: String(realPath || '').trim(),
    };
  };

  const getPartitionSize = async (partitionPath) => {
    if (!partitionPath) return 0;
    const res = await runRoot(`
PART=${shellQuote(partitionPath)}
if blockdev --getsize64 "$PART" >/dev/null 2>&1; then
  blockdev --getsize64 "$PART"
elif busybox blockdev --getsize64 "$PART" >/dev/null 2>&1; then
  busybox blockdev --getsize64 "$PART"
elif [ -f /sys/class/block/"$(basename "$PART")"/size ]; then
  sectors="$(timeout 2s awk '{print}' /sys/class/block/"$(basename "$PART")"/size | tr -d '\\r\\n')"
  expr "$sectors" \\* 512
else
  echo 0
fi
`, 20000);
    return Number.parseInt(String(res.text || '0').trim(), 10) || 0;
  };

  const getScreenSize = async () => {
    const res = await runRoot(`
wm size 2>/dev/null | awk '
  /Override size:/ { print $3; found=1; exit }
  /Physical size:/ { if (!found) print $3 }
'
`, 20000);
    const match = String(res.text || '').match(/(\d+)x(\d+)/);
    if (!match) return { width: 320, height: 480, raw: '320x480' };
    return {
      width: Number.parseInt(match[1], 10) || 320,
      height: Number.parseInt(match[2], 10) || 480,
      raw: `${match[1]}x${match[2]}`,
    };
  };

  const setBusy = (busy, text = '') => {
    state.busy = busy;
    const statusEl = document.querySelector('#logo_job_status');
    const controls = document.querySelectorAll(`#${MODAL_NAME} button, #${MODAL_NAME} input`);
    controls.forEach((item) => {
      if (item.id === `${MODAL_NAME}_close`) return;
      if (busy) {
        if (!item.dataset.logoDisabled) item.dataset.logoDisabled = item.disabled ? '1' : '0';
        item.disabled = true;
      } else {
        item.disabled = item.dataset.logoDisabled === '1';
        delete item.dataset.logoDisabled;
      }
    });
    if (statusEl) statusEl.textContent = text || (busy ? '处理中...' : '空闲');
    refreshUi();
  };

  const getPreviewMetrics = () => {
    const stage = document.querySelector('#logo_preview_stage');
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    return { stage, width, height };
  };

  const constrainOffsets = () => {
    if (!state.imageBitmap) return;
    const metrics = getPreviewMetrics();
    if (!metrics) return;
    const drawWidth = state.sourceWidth * state.previewScale;
    const drawHeight = state.sourceHeight * state.previewScale;
    const minX = Math.min(0, metrics.width - drawWidth);
    const minY = Math.min(0, metrics.height - drawHeight);
    const maxX = Math.max(0, metrics.width - drawWidth);
    const maxY = Math.max(0, metrics.height - drawHeight);
    state.offsetX = clamp(state.offsetX, minX, maxX);
    state.offsetY = clamp(state.offsetY, minY, maxY);
  };

  const drawPreview = () => {
    const canvas = document.querySelector('#logo_preview_canvas');
    const metrics = getPreviewMetrics();
    if (!canvas || !metrics) return;
    canvas.width = metrics.width;
    canvas.height = metrics.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!state.imageBitmap) {
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('选择图片后在这里预览', canvas.width / 2, canvas.height / 2);
      return;
    }
    constrainOffsets();
    const drawWidth = state.sourceWidth * state.previewScale;
    const drawHeight = state.sourceHeight * state.previewScale;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(state.imageBitmap, state.offsetX, state.offsetY, drawWidth, drawHeight);
  };

  const stageSizeForScreen = () => {
    const shell = document.querySelector('#logo_preview_shell');
    const shellWidth = Math.max(240, Math.round(shell?.clientWidth || 320) - 24);
    if (!state.screenWidth || !state.screenHeight) return { width: Math.min(320, shellWidth), height: 180 };
    const ratio = state.screenWidth / state.screenHeight;
    const maxHeight = 350;
    const naturalWidth = Math.round(maxHeight * ratio);
    const width = Math.min(shellWidth, naturalWidth);
    const height = Math.round(width / ratio);
    return { width: Math.max(1, width), height: Math.max(1, height) };
  };

  const updatePreviewShell = () => {
    const stage = document.querySelector('#logo_preview_stage');
    if (!stage) return;
    const { width, height } = stageSizeForScreen();
    stage.style.width = `${width}px`;
    stage.style.height = `${height}px`;
    drawPreview();
  };

  const computeMinScale = () => {
    if (!state.imageBitmap) return 1;
    const metrics = getPreviewMetrics();
    if (!metrics) return 1;
    return Math.max(metrics.width / state.sourceWidth, metrics.height / state.sourceHeight);
  };

  const updateScaleInput = () => {
    const input = document.querySelector('#logo_zoom_range');
    const label = document.querySelector('#logo_zoom_text');
    if (!input || !label) return;
    const minScale = state.minScale || 1;
    const maxScale = Math.max(minScale * 4, minScale + 0.01);
    input.min = String(minScale);
    input.max = String(maxScale);
    input.step = String(Math.max(minScale / 100, 0.01));
    input.value = String(state.previewScale || minScale);
    label.textContent = `${(state.previewScale / minScale).toFixed(2)}x`;
  };

  const bmp24FromCanvas = (canvas) => {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const rowSize = ((width * 3) + 3) & ~3;
    const pixelDataSize = rowSize * height;
    const fileSize = 14 + 40 + pixelDataSize;
    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint8(offset++, 0x42);
    view.setUint8(offset++, 0x4d);
    view.setUint32(offset, fileSize, true); offset += 4;
    view.setUint16(offset, 0, true); offset += 2;
    view.setUint16(offset, 0, true); offset += 2;
    view.setUint32(offset, 54, true); offset += 4;
    view.setUint32(offset, 40, true); offset += 4;
    view.setInt32(offset, width, true); offset += 4;
    view.setInt32(offset, height, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, 24, true); offset += 2;
    view.setUint32(offset, 0, true); offset += 4;
    view.setUint32(offset, pixelDataSize, true); offset += 4;
    view.setInt32(offset, 2835, true); offset += 4;
    view.setInt32(offset, 2835, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;

    for (let y = height - 1; y >= 0; y--) {
      const rowStart = y * width * 4;
      for (let x = 0; x < width; x++) {
        const i = rowStart + x * 4;
        view.setUint8(offset++, imageData[i + 2]);
        view.setUint8(offset++, imageData[i + 1]);
        view.setUint8(offset++, imageData[i]);
      }
      while ((offset - 54) % rowSize !== 0) {
        view.setUint8(offset++, 0);
      }
    }
    return new Blob([buffer], { type: 'application/octet-stream' });
  };

  const rebuildOutputBlob = async () => {
    if (!state.imageBitmap || !state.screenWidth || !state.screenHeight) {
      state.outputBlob = null;
      state.outputSize = 0;
      refreshUi();
      return;
    }
    const metrics = getPreviewMetrics();
    if (!metrics) return;
    const canvas = document.createElement('canvas');
    canvas.width = state.screenWidth;
    canvas.height = state.screenHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const scaleX = state.screenWidth / metrics.width;
    const scaleY = state.screenHeight / metrics.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      state.imageBitmap,
      state.offsetX * scaleX,
      state.offsetY * scaleY,
      state.sourceWidth * state.previewScale * scaleX,
      state.sourceHeight * state.previewScale * scaleY,
    );
    const blob = bmp24FromCanvas(canvas);
    const previousSize = state.outputSize;
    state.outputBlob = blob;
    state.outputSize = blob.size;
    if (previousSize !== blob.size || state.uploadPath) {
      invalidateUploadedOutput();
    }
    refreshUi();
  };

  const queueRebuild = (() => {
    let timer = null;
    return () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        timer = null;
        await rebuildOutputBlob();
      }, 80);
    };
  })();

  const centerImage = () => {
    if (!state.imageBitmap) return;
    const metrics = getPreviewMetrics();
    if (!metrics) return;
    state.minScale = computeMinScale();
    state.previewScale = Math.max(state.previewScale || 0, state.minScale);
    const drawWidth = state.sourceWidth * state.previewScale;
    const drawHeight = state.sourceHeight * state.previewScale;
    state.offsetX = (metrics.width - drawWidth) / 2;
    state.offsetY = (metrics.height - drawHeight) / 2;
    constrainOffsets();
    updateScaleInput();
    drawPreview();
    queueRebuild();
  };

  const setScaleKeepingCenter = (nextScale) => {
    const metrics = getPreviewMetrics();
    if (!metrics || !state.imageBitmap) return;
    const prevScale = state.previewScale;
    const centerX = metrics.width / 2;
    const centerY = metrics.height / 2;
    const imageCenterX = (centerX - state.offsetX) / prevScale;
    const imageCenterY = (centerY - state.offsetY) / prevScale;
    state.previewScale = clamp(nextScale, state.minScale, Math.max(state.minScale * 4, state.minScale + 0.01));
    state.offsetX = centerX - imageCenterX * state.previewScale;
    state.offsetY = centerY - imageCenterY * state.previewScale;
    constrainOffsets();
    updateScaleInput();
    drawPreview();
    queueRebuild();
  };

  const bindPreviewEvents = () => {
    const stage = document.querySelector('#logo_preview_stage');
    const zoom = document.querySelector('#logo_zoom_range');
    const resetBtn = document.querySelector('#logo_reset_view_btn');
    if (!stage || !zoom || !resetBtn) return;
    zoom.oninput = () => {
      setScaleKeepingCenter(Number.parseFloat(zoom.value) || state.minScale || 1);
    };
    resetBtn.onclick = () => {
      centerImage();
    };
    const beginDrag = (clientX, clientY) => {
      if (!state.imageBitmap) return;
      state.dragActive = true;
      state.dragStartX = clientX;
      state.dragStartY = clientY;
      state.dragOriginX = state.offsetX;
      state.dragOriginY = state.offsetY;
      stage.dataset.dragging = '1';
    };
    const moveDrag = (clientX, clientY) => {
      if (!state.dragActive) return;
      state.offsetX = state.dragOriginX + (clientX - state.dragStartX);
      state.offsetY = state.dragOriginY + (clientY - state.dragStartY);
      constrainOffsets();
      drawPreview();
      queueRebuild();
    };
    const endDrag = () => {
      state.dragActive = false;
      stage.dataset.dragging = '0';
    };
    stage.onpointerdown = (event) => {
      stage.setPointerCapture(event.pointerId);
      beginDrag(event.clientX, event.clientY);
    };
    stage.onpointermove = (event) => {
      moveDrag(event.clientX, event.clientY);
    };
    stage.onpointerup = () => endDrag();
    stage.onpointercancel = () => endDrag();
    stage.onwheel = (event) => {
      event.preventDefault();
      const factor = event.deltaY > 0 ? 0.94 : 1.06;
      setScaleKeepingCenter((state.previewScale || state.minScale || 1) * factor);
    };
  };

  const refreshUi = () => {
    const supportEl = document.querySelector('#logo_support_state');
    const partitionEl = document.querySelector('#logo_partition_path');
    const sizeEl = document.querySelector('#logo_partition_size');
    const resolutionEl = document.querySelector('#logo_resolution');
    const fileEl = document.querySelector('#logo_current_file');
    const outputEl = document.querySelector('#logo_output_size');
    const statusEl = document.querySelector('#logo_output_state');
    const infoEl = document.querySelector('#logo_upload_info');
    const downloadBtn = document.querySelector('#logo_download_btn');
    const uploadBtn = document.querySelector('#logo_upload_btn');
    const flashBtn = document.querySelector('#logo_flash_btn');
    const previewMeta = document.querySelector('#logo_preview_meta');

    if (supportEl) {
      supportEl.dataset.kind = state.logoPartition ? 'ok' : 'bad';
      supportEl.textContent = state.logoPartition ? '支持' : '不支持';
    }
    if (partitionEl) partitionEl.textContent = state.logoPartition?.linkPath || '-';
    if (sizeEl) sizeEl.textContent = state.partitionSize > 0 ? formatBytesLocal(state.partitionSize) : '-';
    if (resolutionEl) resolutionEl.textContent = state.screenWidth && state.screenHeight ? `${state.screenWidth} x ${state.screenHeight}` : '-';
    if (fileEl) fileEl.textContent = state.file ? `${state.file.name} (${formatBytesLocal(state.file.size)})` : '未选择';
    if (outputEl) outputEl.textContent = state.outputSize > 0 ? formatBytesLocal(state.outputSize) : '-';

    const fits = state.outputSize > 0 && state.partitionSize > 0 && state.outputSize <= state.partitionSize;
    if (statusEl) {
      statusEl.dataset.kind = !state.outputSize ? 'warn' : fits ? 'ok' : 'bad';
      statusEl.textContent = !state.outputSize
        ? '等待生成'
        : fits
          ? '大小校验通过'
          : '超过分区大小，禁止上传刷写';
    }
    if (previewMeta) {
      previewMeta.innerHTML = `
        <span>源图：${state.sourceWidth || '-'} x ${state.sourceHeight || '-'}</span>
        <span>输出：${state.screenWidth || '-'} x ${state.screenHeight || '-'}</span>
        <span>缩放：${state.imageBitmap ? `${(state.previewScale / (state.minScale || 1)).toFixed(2)}x` : '-'}</span>
      `;
    }
    if (infoEl) {
      infoEl.innerHTML = state.uploadName
        ? `
          <div class="logo-upload-card">
            <div class="logo-kv">
              <div class="logo-kv-key">上传文件名</div>
              <div class="logo-kv-value">${escapeHtml(state.uploadName)}</div>
              <div class="logo-kv-key">远端路径</div>
              <div class="logo-kv-value">${escapeHtml(state.uploadPath)}</div>
            </div>
          </div>
        `
        : '<div class="logo-note">生成 BMP bin 后，可先上传，再执行刷写。若重新调整裁切，上传状态会自动失效。</div>';
    }
    if (downloadBtn) downloadBtn.disabled = state.busy;
    if (uploadBtn) uploadBtn.disabled = state.busy;
    if (flashBtn) flashBtn.disabled = state.busy;
  };

  const refreshDeviceState = async () => {
    const [partition, screen] = await Promise.all([findLogoPartition(), getScreenSize()]);
    state.logoPartition = partition;
    state.partitionSize = partition ? await getPartitionSize(partition.realPath || partition.linkPath) : 0;
    state.screenWidth = screen.width;
    state.screenHeight = screen.height;
    if (state.imageBitmap) {
      invalidateUploadedOutput();
    }
    updatePreviewShell();
    if (state.imageBitmap) {
      state.minScale = computeMinScale();
      state.previewScale = Math.max(state.previewScale, state.minScale);
      constrainOffsets();
      updateScaleInput();
      drawPreview();
      queueRebuild();
    }
    refreshUi();
  };

  const loadImageFile = async (file) => {
    resetImageState();
    state.file = file;
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (error) {
      objectUrl = '';
    }
    state.imageUrl = objectUrl;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    if ('decoding' in image) {
      image.decoding = 'async';
    }
    const loaded = await new Promise((resolve, reject) => {
      let settled = false;
      const done = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };
      image.onload = () => done(resolve, image);
      image.onerror = async () => {
        try {
          const dataUrl = await fileToDataUrl(file);
          state.imageUrl = dataUrl;
          image.onerror = () => done(reject, new Error('图片加载失败'));
          image.onload = () => done(resolve, image);
          image.src = dataUrl;
        } catch (error) {
          done(reject, error);
        }
      };
      image.src = state.imageUrl || '';
    });
    if (typeof loaded.decode === 'function') {
      try {
        await loaded.decode();
      } catch (error) {
      }
    }
    state.sourceWidth = loaded.naturalWidth || loaded.width;
    state.sourceHeight = loaded.naturalHeight || loaded.height;
    if (!state.sourceWidth || !state.sourceHeight) {
      throw new Error('图片尺寸读取失败');
    }
    state.imageBitmap = loaded;
    invalidateUploadedOutput();
    updatePreviewShell();
    centerImage();
    refreshUi();
  };

  const pickImage = async () => {
    if (!state.logoPartition) {
      createToast('当前设备未检测到 logo 分区，不支持操作', 'red', 5000);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.heic,.heif';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '-9999px';
    document.body.appendChild(input);
    input.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      input.remove();
      if (!file) {
        if (safariLikely) {
          createToast('未选择图片或 Safari 未返回文件', 'red', 4000);
        }
        return;
      }
      try {
        setBusy(true, '正在加载图片...');
        await loadImageFile(file);
        setBusy(false, '图片已载入');
      } catch (error) {
        console.error(error);
        resetImageState();
        drawPreview();
        refreshUi();
        setBusy(false, '载入失败');
        createToast(`图片读取失败：${error}`, 'red', 5000);
      }
    }, { once: true });
    input.click();
  };

  const promptDeleteUpload = (filename) => {
    if (!filename) return;
    const { el, close } = createFixedToast(
      'logo_delete_upload_cache_toast',
      `
      <div style="pointer-events:all;width:88vw;max-width:420px;">
        <div class="title" style="margin:0">建议清理上传缓存</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.7;">
          logo bin 已刷写完成，缓存文件仍保留在 uploads 目录。<br />
          文件名：<code>${escapeHtml(filename)}</code>
        </div>
        <div style="margin-top:12px;text-align:right;">
          <button class="logo_download_cache_file">下载图片</button>
          <button class="logo_confirm_delete_cache">确认删除缓存</button>
          <button class="logo_close_delete_cache">稍后</button>
        </div>
      </div>
      `,
    );
    el.querySelector('.logo_download_cache_file')?.addEventListener('click', () => {
      downloadUrl(`/api/uploads/${filename}`, filename);
      createToast('已开始下载缓存文件', 'green');
    });
    el.querySelector('.logo_confirm_delete_cache')?.addEventListener('click', async () => {
      try {
        const res = await (await fetchWithTimeout(`${KANO_baseURL}/delete_img`, {
          method: 'POST',
          headers: common_headers,
          body: JSON.stringify({ file_name: filename }),
        })).json();
        if (res?.result === 'success') {
          createToast('缓存文件已删除', 'green');
          await refreshDeviceState();
          close();
        } else {
          createToast(`删除缓存失败：${res?.error || ''}`, 'red', 5000);
        }
      } catch (error) {
        createToast(`删除缓存失败：${error}`, 'red', 5000);
      }
    });
    el.querySelector('.logo_close_delete_cache')?.addEventListener('click', () => close());
  };

  const buildOutputFile = () => {
    if (!state.outputBlob || !state.file) return null;
    const base = String(state.file.name || 'logo').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_') || 'logo';
    return new File([state.outputBlob], `${base}_${state.screenWidth}x${state.screenHeight}_${getTimestamp()}.bin`, {
      type: 'application/octet-stream',
    });
  };

  const downloadOutput = async () => {
    if (!state.logoPartition?.realPath && !state.logoPartition?.linkPath) {
      createToast('未检测到 logo 分区', 'red');
      return;
    }
    const filename = `logo_partition_${state.screenWidth || 0}x${state.screenHeight || 0}_${getTimestamp()}.bin`;
    const outPath = `${UPLOADS_DIR}/${filename}`;
    try {
      setBusy(true, '正在从 logo 分区导出 bin...');
      const res = await runRoot(`
PART=${shellQuote(state.logoPartition.realPath || state.logoPartition.linkPath)}
OUT=${shellQuote(outPath)}
rm -f "$OUT"
dd if="$PART" of="$OUT" bs=4M 2>&1
sync
if [ -f "$OUT" ]; then
  echo "__OK__"
fi
`, 600000);
      setBusy(false, '空闲');
      if (!res.ok || !res.text.includes('__OK__')) {
        createToast('导出 logo 分区失败', 'red', 5000);
        return;
      }
      downloadUrl(`/api/uploads/${filename}`, filename);
      createToast('已开始下载当前 logo 分区 bin', 'green');
    } catch (error) {
      console.error(error);
      setBusy(false, '导出失败');
      createToast(`导出失败：${error}`, 'red', 5000);
    }
  };

  const uploadOutput = async () => {
    if (!state.file) {
      createToast('请先选择图片', 'red');
      return;
    }
    if (!state.outputBlob) {
      createToast('请先选择并调整图片', 'red');
      return;
    }
    if (!state.partitionSize || state.outputSize > state.partitionSize) {
      createToast('生成结果超过 logo 分区大小，禁止上传', 'red', 5000);
      return;
    }
    const file = buildOutputFile();
    if (!file) return;
    try {
      setBusy(true, '正在上传 logo bin...');
      const uploadedName = await uploadFileKano(file, true);
      if (!uploadedName) {
        setBusy(false, '上传失败');
        return;
      }
      state.uploadName = uploadedName;
      state.uploadPath = `${UPLOADS_DIR}/${uploadedName}`;
      setBusy(false, '上传完成');
      refreshUi();
      createToast('logo bin 已上传，可执行刷写', 'green');
    } catch (error) {
      console.error(error);
      setBusy(false, '上传失败');
      createToast(`上传失败：${error}`, 'red', 5000);
    }
  };

  const flashLogo = async () => {
    if (!state.file) {
      createToast('请先选择图片', 'red');
      return;
    }
    if (!state.logoPartition?.realPath && !state.logoPartition?.linkPath) {
      createToast('未检测到 logo 分区', 'red');
      return;
    }
    if (!state.uploadPath) {
      createToast('请先上传生成后的 logo bin', 'red');
      return;
    }
    if (!state.partitionSize || state.outputSize > state.partitionSize) {
      createToast('大小校验未通过，禁止刷写', 'red');
      return;
    }
    const { el, close } = createFixedToast(
      'logo_flash_confirm_toast',
      `
      <div style="pointer-events:all;width:88vw;max-width:460px;">
        <div class="title" style="margin:0">确认刷写开机第一屏</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.7;">
          logo 分区：<code>${escapeHtml(state.logoPartition.linkPath || '-')}</code><br />
          块设备：<code>${escapeHtml(state.logoPartition.realPath || '-')}</code><br />
          分辨率：<code>${escapeHtml(`${state.screenWidth}x${state.screenHeight}`)}</code><br />
          生成文件大小：<code>${escapeHtml(formatBytesLocal(state.outputSize))}</code><br />
          此操作会直接覆盖设备的开机第一屏内容。
        </div>
        <div style="margin-top:12px;text-align:right;">
          <button class="logo_confirm_flash_btn">确认刷写</button>
          <button class="logo_cancel_flash_btn">取消</button>
        </div>
      </div>
      `,
    );
    el.querySelector('.logo_cancel_flash_btn')?.addEventListener('click', () => close());
    el.querySelector('.logo_confirm_flash_btn')?.addEventListener('click', async () => {
      close();
      setBusy(true, '正在刷写 logo 分区...');
      const res = await runRoot(`
PART=${shellQuote(state.logoPartition.realPath || state.logoPartition.linkPath)}
IMG=${shellQuote(state.uploadPath)}
SIZE_EXPECT=${shellQuote(String(state.outputSize))}
if [ ! -f "$IMG" ]; then
  echo "__FILE_MISSING__"
  exit 2
fi
SIZE_ACTUAL="$(wc -c < "$IMG" | tr -d '\\r\\n')"
[ "$SIZE_ACTUAL" = "$SIZE_EXPECT" ] || { echo "__SIZE_MISMATCH__"; exit 3; }
dd if="$IMG" of="$PART" bs=4M conv=fsync 2>&1
sync
echo "__FLASH_OK__"
`, 600000);
      setBusy(false, '空闲');
      if (!res.ok || !res.text.includes('__FLASH_OK__') || res.text.includes('__SIZE_MISMATCH__') || res.text.includes('__FILE_MISSING__')) {
        createToast('logo 刷写失败', 'red', 5000);
        return;
      }
      createToast('logo 刷写完成，重启后生效', 'green', 5000);
      promptDeleteUpload(state.uploadName);
    });
  };

  const bindWindowResize = () => {
    const handler = debounce(() => {
      updatePreviewShell();
      if (state.imageBitmap) {
        state.minScale = computeMinScale();
        state.previewScale = Math.max(state.previewScale, state.minScale);
        constrainOffsets();
        updateScaleInput();
        drawPreview();
        queueRebuild();
      }
    }, 80);
    window.addEventListener('resize', handler, { passive: true });
  };

  const openModal = async () => {
    document.querySelector(`#${MODAL_NAME}`)?.remove();
    ensureStyle();
    const { id, el } = createModal({
      name: MODAL_NAME,
      title: '开机第一屏 LOGO 自定义',
      maxWidth: '920px',
      showConfirm: false,
      contentStyle: 'max-height: 70vh;',
      isMask: true,
      onClose: () => true,
      content: `
        <div class="logo-wrap">
          <div class="logo-grid">
            <div class="logo-stat">
              <div class="logo-stat-label">设备支持</div>
              <div class="logo-stat-value"><span class="logo-badge" id="logo_support_state" data-kind="warn">检测中</span></div>
            </div>
            <div class="logo-stat">
              <div class="logo-stat-label">屏幕分辨率</div>
              <div class="logo-stat-value" id="logo_resolution">-</div>
            </div>
            <div class="logo-stat">
              <div class="logo-stat-label">logo 分区大小</div>
              <div class="logo-stat-value" id="logo_partition_size">-</div>
            </div>
            <div class="logo-stat">
              <div class="logo-stat-label">状态</div>
              <div class="logo-stat-value" id="logo_job_status">空闲</div>
            </div>
          </div>
          <div class="logo-panel">
            <div class="logo-panel-title">
              <span>设备信息</span>
              <span class="logo-badge" id="logo_output_state" data-kind="warn">等待生成</span>
            </div>
            <div class="logo-kv">
              <div class="logo-kv-key">logo 分区路径</div>
              <div class="logo-kv-value" id="logo_partition_path">-</div>
              <div class="logo-kv-key">当前图片</div>
              <div class="logo-kv-value" id="logo_current_file">未选择</div>
              <div class="logo-kv-key">生成文件大小</div>
              <div class="logo-kv-value" id="logo_output_size">-</div>
            </div>
          </div>
          <div class="logo-panel">
            <div class="logo-panel-title">
              <span>图片裁切与缩放</span>
              <span class="logo-note">拖动画面调整裁切区域，滚轮或滑块缩放</span>
            </div>
            <div class="logo-toolbar" style="display:flex;flex-direction:column;margin-bottom:10px;">
              <div style="width: 100%;">
                <button id="logo_pick_btn">选择图片</button>
                <button id="logo_reset_view_btn">重置视图</button>
              </div>
              <div style="width: 100%;flex-shrink: 0;box-sizing: border-box;display: flex;align-items: center;">
                <label style="font-size:.68rem;flex-shrink: 0;">缩放</label>
                <input id="logo_zoom_range" type="range" min="1" max="1" value="1" step="0.01" />
                <span id="logo_zoom_text" style="font-size:.68rem;min-width:42px;">1.00x</span>
              </div>
            </div>
            <div class="logo-preview-shell" id="logo_preview_shell">
              <div class="logo-preview-stage" id="logo_preview_stage" data-dragging="0">
                <canvas id="logo_preview_canvas"></canvas>
              </div>
              <div class="logo-preview-meta" id="logo_preview_meta"></div>
            </div>
          </div>
          <div class="logo-panel">
            <div class="logo-panel-title">
              <span>刷写</span>
              <span class="logo-note">先校验大小，再上传，再刷写</span>
            </div>
            <div class="logo-actions">
              <button id="logo_refresh_btn">刷新设备信息</button>
              <button id="logo_upload_btn">上传编辑好的LOGO</button>
              <button id="logo_flash_btn">刷写 logo 分区</button>
              <button id="logo_download_btn">下载当前机内的LOGO.bin</button>
            </div>
            <div style="margin-top:10px;" id="logo_upload_info"></div>
          </div>
        </div>
      `,
    });

    el.querySelector('#logo_pick_btn').onclick = async () => pickImage();
    el.querySelector('#logo_refresh_btn').onclick = async () => {
      setBusy(true, '正在刷新设备信息...');
      await refreshDeviceState();
      setBusy(false, '刷新完成');
      createToast('设备信息刷新成功', 'pink');
    };
    el.querySelector('#logo_download_btn').onclick = () => downloadOutput();
    el.querySelector('#logo_upload_btn').onclick = async () => uploadOutput();
    el.querySelector('#logo_flash_btn').onclick = async () => flashLogo();

    showModal(id);
    bindPreviewEvents();
    updatePreviewShell();
    drawPreview();
    refreshUi();
    setBusy(true, '正在检测设备...');
    await refreshDeviceState();
    setBusy(false, state.logoPartition ? '设备支持' : '未检测到 logo 分区');
    if (!state.logoPartition) {
      createToast('当前设备未检测到 logo 分区，不支持开机第一屏自定义', 'red', 6000);
    }
  };

  bindWindowResize();

  const mainBtn = document.createElement('button');
  mainBtn.textContent = '开机第一屏 LOGO';
  mainBtn.onclick = async () => {
    const whoami = await runRoot('whoami');
    if (!whoami.ok || !String(whoami.text || '').includes('root')) {
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
