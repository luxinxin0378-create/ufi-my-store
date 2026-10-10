//<script>
(async () => {
  const MODAL_NAME = 'android_partition_manager_modal';
  const STYLE_ID = 'android_partition_manager_style';
  const UPLOADS_DIR = '/data/data/com.minikano.f50_sms/files/uploads';
  const BLOCKED_FLASH_PARTITIONS = new Set([
    'mmcblk0',
    'calinv',
    'nr_fixnv1_a',
    'nr_fixnv1_b',
    'nr_fixnv2_a',
    'nr_fixnv2_b',
  ]);
  const state = {
    busy: false,
    deviceInfo: null,
    partitions: [],
    selectedPartition: '',
    flashCandidate: null,
    partitionSizes: {},
  };

  const shellQuote = (value) => `'${String(value || '').replace(/'/g, `'\\''`)}'`;
  const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
  const escapeHtml = (text) =>
    String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  const formatBytes = (bytes) => {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
    return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };
  const formatDuration = (seconds) => {
    const value = Number(seconds) || 0;
    if (value < 1) return `${Math.round(value * 1000)} ms`;
    if (value < 60) return `${value.toFixed(value < 10 ? 2 : 1)} s`;
    const minutes = Math.floor(value / 60);
    const remain = (value % 60).toFixed(1);
    return `${minutes} min ${remain} s`;
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
  const isBlockedPartition = (name) => BLOCKED_FLASH_PARTITIONS.has(String(name || '').trim());
  const isDangerousTarget = (selected) => {
    if (!selected) return false;
    const normalizedName = String(selected.name || '').trim();
    const normalizedReal = String(selected.realPath || '').trim();
    return isBlockedPartition(normalizedName) || /\/mmcblk0$/.test(normalizedReal);
  };
  const getSelectedPartitionData = () =>
    state.partitions.find((item) => item.name === state.selectedPartition) || null;

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .pm-wrap {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      #${MODAL_NAME} .pm-hero,
      #${MODAL_NAME} .pm-panel,
      #${MODAL_NAME} .pm-stat,
      #${MODAL_NAME} .pm-file-card {
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.04);
        backdrop-filter: blur(10px);
      }
      #${MODAL_NAME} .pm-hero {
        padding: 14px;
        position: relative;
        overflow: hidden;
      }
      #${MODAL_NAME} .pm-hero::after {
        content: '';
        position: absolute;
        inset: auto -30px -50px auto;
        width: 120px;
        height: 120px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(108,190,255,.24), transparent 68%);
      }
      #${MODAL_NAME} .pm-title {
        margin: 0 0 6px;
        font-size: .98rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .pm-subtitle {
        font-size: .68rem;
        line-height: 1.7;
        opacity: .85;
      }
      #${MODAL_NAME} .pm-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      #${MODAL_NAME} .pm-stat {
        padding: 10px 12px;
      }
      #${MODAL_NAME} .pm-stat-label {
        font-size: .62rem;
        opacity: .66;
        margin-bottom: 4px;
      }
      #${MODAL_NAME} .pm-stat-value {
        font-size: .82rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .pm-panel {
        padding: 14px;
      }
      #${MODAL_NAME} .pm-panel-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        font-size: .78rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .pm-panel-tip {
        font-size: .64rem;
        opacity: .72;
      }
      #${MODAL_NAME} .pm-actions,
      #${MODAL_NAME} .pm-select-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }
      #${MODAL_NAME} .pm-actions button {
        min-width: 110px;
      }
      #${MODAL_NAME} .pm-select-row .select {
        flex: 1;
      }
      #${MODAL_NAME} .pm-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: .62rem;
        font-weight: 700;
        background: rgba(255,255,255,.08);
      }
      #${MODAL_NAME} .pm-badge[data-kind="safe"] {
        background: rgba(89, 212, 130, .16);
        color: #95ffb2;
      }
      #${MODAL_NAME} .pm-badge[data-kind="warn"] {
        background: rgba(255, 144, 84, .16);
        color: #ffc299;
      }
      #${MODAL_NAME} .pm-kv {
        display: grid;
        grid-template-columns: 120px minmax(0, 1fr);
        gap: 8px 10px;
        font-size: .68rem;
        line-height: 1.65;
      }
      #${MODAL_NAME} .pm-kv-label {
        opacity: .68;
      }
      #${MODAL_NAME} .pm-kv-value {
        word-break: break-all;
      }
      #${MODAL_NAME} .pm-file-card {
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #${MODAL_NAME} .pm-file-meta {
        display: grid;
        grid-template-columns: 120px minmax(0, 1fr);
        gap: 6px 10px;
        font-size: .68rem;
      }
      #${MODAL_NAME} .pm-file-meta .value {
        word-break: break-all;
      }
      #${MODAL_NAME} .pm-note {
        font-size: .64rem;
        line-height: 1.7;
        opacity: .76;
      }
      #${MODAL_NAME} .pm-danger {
        color: #ff9a9a;
      }
      #${MODAL_NAME} .pm-good {
        color: #8ff0a7;
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} .pm-grid {
          grid-template-columns: 1fr 1fr 1fr;
        }
        #${MODAL_NAME} .pm-kv,
        #${MODAL_NAME} .pm-file-meta {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const computeLocalSha256 = async (file) => {
    const buffer = await file.arrayBuffer();
    if (globalThis.crypto?.subtle?.digest) {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest))
        .map((item) => item.toString(16).padStart(2, '0'))
        .join('');
    }
    if (globalThis.CryptoJS?.lib?.WordArray && globalThis.CryptoJS?.SHA256) {
      const wordArray = globalThis.CryptoJS.lib.WordArray.create(buffer);
      return globalThis.CryptoJS.SHA256(wordArray).toString(globalThis.CryptoJS.enc.Hex);
    }
    throw new Error('当前环境不可用：缺少 crypto.subtle 和 CryptoJS.SHA256');
  };

  const buildChecksumCommand = (filePath) => `
FILE=${shellQuote(filePath)}
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$FILE" | awk '{print $1}'
elif command -v busybox >/dev/null 2>&1; then
  busybox sha256sum "$FILE" | awk '{print $1}'
elif command -v toybox >/dev/null 2>&1; then
  toybox sha256sum "$FILE" | awk '{print $1}'
elif command -v openssl >/dev/null 2>&1; then
  openssl dgst -sha256 "$FILE" | awk '{print $NF}'
else
  echo "__NO_CHECKSUM__"
fi
`;

  const buildSizeCommand = (filePath) => `
FILE=${shellQuote(filePath)}
if stat -c%s "$FILE" >/dev/null 2>&1; then
  stat -c%s "$FILE"
elif busybox stat -c%s "$FILE" >/dev/null 2>&1; then
  busybox stat -c%s "$FILE"
else
  wc -c < "$FILE"
fi
`;

  const fetchDeviceInfo = async () => {
    const res = await runRoot(`
brand="$(getprop ro.product.brand 2>/dev/null | tr -d '\\r')"
model="$(getprop ro.product.model 2>/dev/null | tr -d '\\r')"
device="$(getprop ro.product.device 2>/dev/null | tr -d '\\r')"
slot_suffix="$(getprop ro.boot.slot_suffix 2>/dev/null | tr -d '\\r')"
slot_name="$(getprop ro.boot.slot 2>/dev/null | tr -d '\\r')"
[ -z "$slot_name" ] && [ -n "$slot_suffix" ] && slot_name="\${slot_suffix#_}"
[ -z "$slot_name" ] && slot_num="$(bootctl get-current-slot 2>/dev/null | tr -d '\\r')" && [ "$slot_num" = "0" ] && slot_name="a"
[ -z "$slot_name" ] && [ "$slot_num" = "1" ] && slot_name="b"
printf 'brand=%s\nmodel=%s\ndevice=%s\nslot=%s\n' "$brand" "$model" "$device" "$slot_name"
`);
    const info = {
      brand: '-',
      model: '-',
      device: '-',
      slot: '-',
    };
    String(res.text || '')
      .split('\n')
      .forEach((line) => {
        const [key, ...rest] = line.split('=');
        if (!key) return;
        info[key.trim()] = rest.join('=').trim() || '-';
      });
    state.deviceInfo = info;
    return info;
  };

  const fetchPartitions = async () => {
    const res = await runRoot(`
for base in /dev/block/bootdevice/by-name /dev/block/by-name /dev/block/platform/*/by-name /dev/block/platform/*/*/by-name; do
  [ -d "$base" ] || continue
  for path in "$base"/*; do
    [ -e "$path" ] || continue
    name="$(basename "$path")"
    real="$(readlink -f "$path" 2>/dev/null)"
    printf '%s\t%s\t%s\n' "$name" "$path" "$real"
  done
done | awk -F '\t' '!seen[$1]++ { print $0 }' | sort
`);
    const items = String(res.text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, linkPath, realPath] = line.split('\t');
        return {
          name: String(name || '').trim(),
          linkPath: String(linkPath || '').trim(),
          realPath: String(realPath || '').trim(),
        };
      })
      .filter((item) => item.name);
    state.partitions = items;
    if (!items.find((item) => item.name === state.selectedPartition)) {
      state.selectedPartition = items[0]?.name || '';
    }
    return items;
  };

  const fetchPartitionSize = async (selected) => {
    if (!selected?.realPath && !selected?.linkPath) return 0;
    const cacheKey = selected.realPath || selected.linkPath;
    if (state.partitionSizes[cacheKey] !== undefined) {
      return state.partitionSizes[cacheKey];
    }
    const targetPath = selected.realPath || selected.linkPath;
    const res = await runRoot(
      `
PART=${shellQuote(targetPath)}
if blockdev --getsize64 "$PART" >/dev/null 2>&1; then
  blockdev --getsize64 "$PART"
elif busybox blockdev --getsize64 "$PART" >/dev/null 2>&1; then
  busybox blockdev --getsize64 "$PART"
elif cat /sys/class/block/"$(basename "$PART")"/size >/dev/null 2>&1; then
  sectors="$(cat /sys/class/block/"$(basename "$PART")"/size)"
  expr "$sectors" \\* 512
else
  echo 0
fi
`,
      20000,
    );
    const size = Number.parseInt(String(res.text || '0').trim(), 10) || 0;
    state.partitionSizes[cacheKey] = size;
    return size;
  };

  const refreshSummary = async () => {
    const info = state.deviceInfo || {};
    const selected = getSelectedPartitionData();
    const infoEl = document.querySelector('#pm_device_info');
    const slotEl = document.querySelector('#pm_active_slot');
    const countEl = document.querySelector('#pm_partition_count');
    const selectedEl = document.querySelector('#pm_selected_partition');
    const detailEl = document.querySelector('#pm_partition_detail');
    const flashBtn = document.querySelector('#pm_flash_btn');
    const exportBtn = document.querySelector('#pm_export_btn');
    const statusEl = document.querySelector('#pm_partition_status');
    const selectedSize = selected ? await fetchPartitionSize(selected) : 0;
    if (infoEl) infoEl.textContent = `${info.brand || '-'} ${info.model || '-'}`.trim();
    if (slotEl) slotEl.textContent = info.slot.toUpperCase() || '-';
    if (countEl) countEl.textContent = String(state.partitions.length || 0);
    if (selectedEl) selectedEl.textContent = selected?.name || '-';
    if (detailEl) {
      detailEl.innerHTML = selected
        ? `
          <div class="pm-kv">
            <div class="pm-kv-label">by-name 路径</div>
            <div class="pm-kv-value">${escapeHtml(selected.linkPath || '-')}</div>
            <div class="pm-kv-label">实际块设备</div>
            <div class="pm-kv-value">${escapeHtml(selected.realPath || '-')}</div>
            <div class="pm-kv-label">分区大小</div>
            <div class="pm-kv-value">${selectedSize > 0 ? escapeHtml(formatBytes(selectedSize)) : '-'}</div>
            <div class="pm-kv-label">刷入状态</div>
            <div class="pm-kv-value ${isDangerousTarget(selected) ? 'pm-danger' : 'pm-good'}">${isDangerousTarget(selected) ? '高风险目标，禁止刷入' : '允许直接刷入'}</div>
          </div>
        `
        : '<div class="pm-note">未检测到可用分区。</div>';
    }
    if (statusEl) {
      statusEl.dataset.kind = selected && isDangerousTarget(selected) ? 'warn' : 'safe';
      statusEl.textContent = selected
        ? isDangerousTarget(selected)
          ? '当前分区为高风险目标，禁止刷入'
          : '当前分区可刷入'
        : '未选择分区';
    }
    if (flashBtn) flashBtn.disabled = !selected || state.busy;
    if (exportBtn) exportBtn.disabled = !selected || state.busy;
  };

  const refreshPartitionOptions = () => {
    const select = document.querySelector('#pm_partition_select');
    if (!select) return;
    const current = state.selectedPartition;
    select.innerHTML = state.partitions.length
      ? state.partitions
        .map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`)
        .join('')
      : '<option value="">未检测到分区</option>';
    select.value = state.partitions.find((item) => item.name === current)?.name || state.partitions[0]?.name || '';
    state.selectedPartition = select.value || '';
    refreshSummary();
  };

  const setBusy = (busy, text = '') => {
    state.busy = busy;
    const status = document.querySelector('#pm_job_status');
    const buttons = document.querySelectorAll(`#${MODAL_NAME} button, #${MODAL_NAME} select`);
    buttons.forEach((item) => {
      if (item.id === 'android_partition_manager_modal_close') return;
      if (busy) {
        if (!item.dataset.pmDisabled) item.dataset.pmDisabled = item.disabled ? '1' : '0';
        item.disabled = true;
      } else {
        item.disabled = item.dataset.pmDisabled === '1';
        delete item.dataset.pmDisabled;
      }
    });
    if (status) status.textContent = text || (busy ? '处理中...' : '空闲');
    refreshSummary();
  };

  const refreshAll = async (showToast = false) => {
    const status = document.querySelector('#pm_job_status');
    if (status) status.textContent = '持续读取设备信息...';
    const [info, partitions] = await Promise.all([fetchDeviceInfo(), fetchPartitions()]);
    refreshPartitionOptions();
    await refreshSummary();
    renderFlashCandidate();
    if (showToast) {
      createToast(`读取完成：${info.brand || '-'} ${info.model || '-'}，分区 ${partitions.length} 个`, 'pink');
    }
  };

  const getRemoteFileDigest = async (filePath) => {
    const [digestRes, sizeRes] = await Promise.all([
      runRoot(buildChecksumCommand(filePath), 20000),
      runRoot(buildSizeCommand(filePath), 20000),
    ]);
    return {
      checksum: String(digestRes.text || '').trim(),
      size: Number.parseInt(String(sizeRes.text || '0').trim(), 10) || 0,
    };
  };

  const renderFlashCandidate = () => {
    const box = document.querySelector('#pm_flash_candidate');
    if (!box) return;
    const candidate = state.flashCandidate;
    if (!candidate) {
      box.innerHTML = '<div class="pm-note">尚未选择待刷入镜像。会在本地先计算 SHA-256，上传后再对比远端 SHA-256 和文件大小，全部一致才允许刷入。</div>';
      return;
    }
    const ok = candidate.localChecksum && candidate.remoteChecksum && candidate.localChecksum === candidate.remoteChecksum && Number(candidate.localSize) === Number(candidate.remoteSize);
    box.innerHTML = `
      <div class="pm-file-card">
        <div style="font-size:.74rem;font-weight:800;">待刷入文件已就绪</div>
        <div class="pm-file-meta">
          <div>本地文件名</div>
          <div class="value">${escapeHtml(candidate.localName)}</div>
          <div>上传后文件名</div>
          <div class="value">${escapeHtml(candidate.remoteName)}</div>
          <div>本地大小</div>
          <div class="value">${formatBytes(candidate.localSize)}</div>
          <div>远端大小</div>
          <div class="value">${formatBytes(candidate.remoteSize)}</div>
          <div>本地 SHA-256</div>
          <div class="value">${escapeHtml(candidate.localChecksum)}</div>
          <div>远端 SHA-256</div>
          <div class="value">${escapeHtml(candidate.remoteChecksum || '-')}</div>
          <div>校验结果</div>
          <div class="value ${ok ? 'pm-good' : 'pm-danger'}">${ok ? '一致，可以执行刷入' : '不一致，禁止刷入'}</div>
        </div>
      </div>
    `;
  };

  const resetOperationState = async () => {
    state.flashCandidate = null;
    renderFlashCandidate();
    await refreshSummary();
  };

  const parseFlashResult = (text) => {
    const raw = String(text || '').trim();
    const recordsIn = raw.match(/(\d+)\+\d+\s+records in/i);
    const recordsOut = raw.match(/(\d+)\+\d+\s+records out/i);
    const copied = raw.match(/(\d+)\s+bytes.*copied,\s*([0-9.]+)\s*s,\s*([0-9.]+\s*[A-Za-z/]+)\s*$/im);
    return {
      raw,
      recordsIn: recordsIn ? Number(recordsIn[1]) : null,
      recordsOut: recordsOut ? Number(recordsOut[1]) : null,
      bytes: copied ? Number(copied[1]) : null,
      seconds: copied ? Number(copied[2]) : null,
      speed: copied ? copied[3] : '',
    };
  };

  const showFlashResult = (partitionName, resultText, fn = () => { }) => {
    const info = parseFlashResult(resultText);
    const { el, close } = createFixedToast(
      'pm_flash_result_toast',
      `
      <div style="pointer-events:all;width:90vw;max-width:520px;">
        <div class="title" style="margin:0">刷入完成</div>
        <div style="margin-top:10px;" class="pm-kv">
          <div class="pm-kv-label">目标分区：${escapeHtml(partitionName)}</div>
          <div class="pm-kv-label">写入大小：${info.bytes ? escapeHtml(formatBytes(info.bytes)) : '-'}</div>
          <div class="pm-kv-label">耗时：${info.seconds ? escapeHtml(formatDuration(info.seconds)) : '-'}</div>
          <div class="pm-kv-label">平均速度：${escapeHtml(info.speed || '-')}</div>
          <div class="pm-kv-label">records in/out：${info.recordsIn ?? '-'} / ${info.recordsOut ?? '-'}</div>
        </div>
        <div style="margin-top:12px;font-size:.66rem;line-height:1.6;">
          <div style="opacity:.72;margin-bottom:6px;">原始输出</div>
          <pre style="margin:0;max-height:200px;overflow:auto;white-space:pre-wrap;word-break:break-all;background:rgba(0,0,0,.22);padding:10px;border-radius:10px;">${escapeHtml(info.raw || '-')}</pre>
        </div>
        <div style="margin-top:12px;text-align:right;">
          <button class="pm_flash_result_close">关闭</button>
        </div>
      </div>
      `,
    );
    el.querySelector('.pm_flash_result_close')?.addEventListener('click', () => {
      if (fn) {
        fn()
      }
      close()
    });
  };

  const pickAndUploadImage = async () => {
    const selected = getSelectedPartitionData();
    if (!selected) {
      createToast('请先选择分区', 'red');
      return;
    }
    if (isDangerousTarget(selected)) {
      createToast('高风险目标禁止上传刷机镜像', 'red', 5000);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.img,.bin,.mbn,.elf,.raw,*/*';
    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        setBusy(true, '正在计算本地摘要...');
        const localChecksum = await computeLocalSha256(file);
        const localSize = Number(file.size) || 0;
        setBusy(true, '正在上传镜像...');
        const uploadedName = await uploadFileKano(file, true);
        if (!uploadedName) {
          setBusy(false, '上传失败');
          return;
        }
        const remotePath = `${UPLOADS_DIR}/${uploadedName}`;
        setBusy(true, '正在校验上传完整性...');
        const remote = await getRemoteFileDigest(remotePath);
        if (!remote.checksum || remote.checksum === '__NO_CHECKSUM__') {
          setBusy(false, '缺少远端摘要命令');
          createToast('设备侧未找到可用的 SHA-256 命令，当前禁止刷入。你可以后续告诉我设备可用命令，我再继续适配。', 'red', 7000);
          return;
        }
        state.flashCandidate = {
          localName: file.name,
          remoteName: uploadedName,
          remotePath,
          localSize,
          remoteSize: remote.size,
          localChecksum,
          remoteChecksum: remote.checksum,
        };
        renderFlashCandidate();
        setBusy(false, '上传与校验完成');
        const ok = localChecksum === remote.checksum && localSize === remote.size;
        createToast(ok ? '上传完成，摘要和大小校验一致' : '上传完成，但校验不一致，禁止刷入', ok ? 'green' : 'red', 5000);
      } catch (error) {
        console.error(error);
        setBusy(false, '上传失败');
        createToast(`处理失败：${error}`, 'red', 5000);
      }
    };
    input.click();
  };

  const deleteUploadCache = async (filename, close) => {
    try {
      const { result, error } = await (
        await fetchWithTimeout(`${KANO_baseURL}/delete_img`, {
          method: 'POST',
          headers: common_headers,
          body: JSON.stringify({ file_name: filename }),
        })
      ).json();
      if (result === 'success') {
        createToast('缓存文件已删除', 'green');
        close?.();
      } else {
        createToast(`删除缓存失败：${error || ''}`, 'red', 5000);
      }
    } catch (error) {
      createToast(`删除缓存失败：${error}`, 'red', 5000);
    }
  };

  const promptDeleteExportCache = (filename) => {
    const { el, close } = createFixedToast(
      'pm_delete_export_cache_toast',
      `
      <div style="pointer-events:all;width:88vw;max-width:420px;">
        <div class="title" style="margin:0">导出已开始下载</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.7;">
          文件缓存位于 uploads 目录。下载完成后，请点击确认删除缓存，避免占用空间。<br />
          文件名：<code>${escapeHtml(filename)}</code>
        </div>
        <div style="margin-top:12px;text-align:right;">
          <button class="pm_confirm_delete_export">确认删除缓存</button>
          <button class="pm_close_delete_export">稍后</button>
        </div>
      </div>
      `,
    );
    const confirm = el.querySelector('.pm_confirm_delete_export');
    const later = el.querySelector('.pm_close_delete_export');
    if (confirm) confirm.onclick = async () => deleteUploadCache(filename, close);
    if (later) later.onclick = () => close();
  };

  const promptDeleteFlashCache = (filename, dangerous = false) => {
    if (!filename) return;
    const { el, close } = createFixedToast(
      'pm_delete_flash_cache_toast',
      `
      <div style="pointer-events:all;width:88vw;max-width:440px;">
        <div class="title" style="margin:0">${dangerous ? '刷入结束，建议立即清理缓存' : '刷入完成，建议清理缓存'}</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.7;">
          上传镜像仍保留在 uploads 目录。${dangerous ? '即使刷入失败，也建议清理缓存以避免误刷。' : '如果后续不再重复刷入，建议删除缓存释放空间。'}<br />
          文件名：<code>${escapeHtml(filename)}</code>
        </div>
        <div style="margin-top:12px;text-align:right;">
          <button class="pm_confirm_delete_flash_cache">确认删除缓存</button>
          <button class="pm_close_delete_flash_cache">稍后</button>
        </div>
      </div>
      `,
    );
    const confirm = el.querySelector('.pm_confirm_delete_flash_cache');
    const later = el.querySelector('.pm_close_delete_flash_cache');
    if (confirm) confirm.onclick = async () => deleteUploadCache(filename, close);
    if (later) later.onclick = () => close();
  };

  const promptFlashRiskWarning = () =>
    new Promise((resolve) => {
      let countDown = 3;
      const { el, close } = createFixedToast(
        'pm_flash_risk_warning_toast',
        `
        <div style="pointer-events:all;width:90vw;max-width:480px;">
          <div class="title" style="margin:0;color:#ffb3b3;">高风险操作提示</div>
          <div style="margin-top:12px;padding:12px;border-radius:12px;background:rgba(255,70,70,.12);border:1px solid rgba(255,90,90,.28);font-size:.72rem;line-height:1.8;">
            刷写分区属于高风险操作。错误镜像、错误分区或写入中断都可能导致：
            <br />1. 设备无法启动
            <br />2. 基带/校准数据损坏
            <br />3. 整机功能异常或数据永久丢失
            <br /><br />请再次确认当前选择的分区和镜像完全正确。
          </div>
          <div style="margin-top:12px;text-align:right;">
            <button class="pm_flash_risk_continue" disabled>请等待 ${countDown}s</button>
            <button class="pm_flash_risk_cancel">取消</button>
          </div>
        </div>
        `,
      );
      const continueBtn = el.querySelector('.pm_flash_risk_continue');
      const cancelBtn = el.querySelector('.pm_flash_risk_cancel');
      const timer = setInterval(() => {
        countDown -= 1;
        if (!continueBtn) return;
        if (countDown > 0) {
          continueBtn.textContent = `请等待 ${countDown}s`;
          return;
        }
        clearInterval(timer);
        continueBtn.disabled = false;
        continueBtn.textContent = '我已知晓风险，继续';
      }, 1000);
      const done = (value) => {
        clearInterval(timer);
        close();
        resolve(value);
      };
      continueBtn?.addEventListener('click', () => done(true));
      cancelBtn?.addEventListener('click', () => done(false));
    });

  const exportPartition = async () => {
    const selected = getSelectedPartitionData();
    if (!selected) {
      createToast('请先选择分区', 'red');
      return;
    }
    const info = state.deviceInfo || {};
    const filename = `partition_${info.device || 'android'}_${selected.name}_${getTimestamp()}.img`;
    const outPath = `${UPLOADS_DIR}/${filename}`;
    setBusy(true, '正在导出分区...');
    const res = await runRoot(
      `
PART=${shellQuote(selected.realPath || selected.linkPath)}
OUT=${shellQuote(outPath)}
rm -f "$OUT"
dd if="$PART" of="$OUT" bs=4M 2>&1
sync
if [ -f "$OUT" ]; then
  echo "__OK__"
  ${buildSizeCommand(outPath)}
fi
`,
      600000,
    );
    setBusy(false, '空闲');
    if (!res.ok || !res.text.includes('__OK__')) {
      createToast('导出失败，请检查 root 权限与块设备可读性', 'red', 5000);
      return;
    }
    downloadUrl(`/api/uploads/${filename}`, filename);
    createToast('已开始下载导出的分区镜像', 'pink', 4000);
    promptDeleteExportCache(filename);
  };

  const promptFlashConfirm = async () => {
    const selected = getSelectedPartitionData();
    const candidate = state.flashCandidate;
    if (!selected || !candidate) {
      createToast('请先完成镜像上传和校验', 'red');
      return;
    }
    if (candidate.localChecksum !== candidate.remoteChecksum || candidate.localSize !== candidate.remoteSize) {
      createToast('上传文件校验未通过，禁止刷入', 'red');
      return;
    }
    if (isDangerousTarget(selected)) {
      createToast('高风险目标禁止刷入', 'red', 5000);
      return;
    }
    const acceptedRisk = await promptFlashRiskWarning();
    if (!acceptedRisk) return;
    const { el, close } = createFixedToast(
      'pm_flash_confirm_toast',
      `
      <div style="pointer-events:all;width:88vw;max-width:460px;">
        <div class="title" style="margin:0">确认刷入分区</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.7;">
          目标分区：<code>${escapeHtml(selected.name)}</code><br />
          目标设备：<code>${escapeHtml(selected.realPath || selected.linkPath)}</code><br />
          镜像文件：<code>${escapeHtml(candidate.remoteName)}</code><br />
          SHA-256：<code>${escapeHtml(candidate.remoteChecksum)}</code><br />
          此操作会直接覆盖分区内容，请确认当前选择无误。
        </div>
        <div style="margin-top:12px;text-align:right;">
          <button class="pm_do_flash">确认刷入</button>
          <button class="pm_cancel_flash">取消</button>
        </div>
      </div>
      `,
    );
    const confirm = el.querySelector('.pm_do_flash');
    const cancel = el.querySelector('.pm_cancel_flash');
    if (cancel) cancel.onclick = () => close();
    if (confirm) {
      confirm.onclick = async () => {
        close();
        await performFlash();
      };
    }
  };

  const performFlash = async () => {
    const selected = getSelectedPartitionData();
    const candidate = state.flashCandidate;
    if (!selected || !candidate) return;
    const cacheFileName = candidate.remoteName;
    setBusy(true, '正在刷入分区...');
    const res = await runRoot(
      `
PART=${shellQuote(selected.realPath || selected.linkPath)}
IMG=${shellQuote(candidate.remotePath)}
REMOTE_SUM="$(${buildChecksumCommand(candidate.remotePath)})"
REMOTE_SIZE="$(${buildSizeCommand(candidate.remotePath)})"
[ "$REMOTE_SUM" = ${shellQuote(candidate.remoteChecksum)} ] || { echo "__SUM_MISMATCH__"; exit 3; }
[ "$REMOTE_SIZE" = ${shellQuote(String(candidate.remoteSize))} ] || { echo "__SIZE_MISMATCH__"; exit 4; }
dd if="$IMG" of="$PART" bs=4M conv=fsync 2>&1
sync
echo "__FLASH_OK__"
`,
      600000,
    );
    setBusy(false, '空闲');
    if (!res.ok || res.text.includes('__SUM_MISMATCH__') || res.text.includes('__SIZE_MISMATCH__') || !res.text.includes('__FLASH_OK__')) {
      createToast('刷入失败，已在写入前后执行校验拦截', 'red', 6000);
      promptDeleteFlashCache(cacheFileName, true);
      await resetOperationState();
      return;
    }
    await resetOperationState();
    showFlashResult(
      selected.name,
      String(res.text || '')
        .replaceAll('__FLASH_OK__', '')
        .trim(),
      () => promptDeleteFlashCache(cacheFileName, false)
    );
  };

  const openModal = async () => {
    document.querySelector(`#${MODAL_NAME}`)?.remove();
    ensureStyle();
    const { id, el } = createModal({
      name: MODAL_NAME,
      title: '分区管理',
      maxWidth: '860px',
      showConfirm: false,
      contentStyle: "max-height: 76vh;",
      isMask: true,
      onClose: () => true,
      content: `
        <div class="pm-wrap">
          <div class="pm-hero">
            <div class="pm-title">分区管理</div>
            <div class="pm-subtitle">
              支持读取分区、导出分区，以及在上传后完成大小和 SHA-256 一致性校验后刷入分区。
            </div>
          </div>
          <div class="pm-grid">
            <div class="pm-stat">
              <div class="pm-stat-label">设备</div>
              <div class="pm-stat-value" id="pm_device_info">-</div>
            </div>
            <div class="pm-stat">
              <div class="pm-stat-label">当前激活槽位</div>
              <div class="pm-stat-value" id="pm_active_slot">-</div>
            </div>
            <div class="pm-stat">
              <div class="pm-stat-label">分区数量</div>
              <div class="pm-stat-value" id="pm_partition_count">0</div>
            </div>
          </div>
          <div class="pm-panel">
            <div class="pm-panel-title">
              <span>分区选择</span>
              <span class="pm-badge" id="pm_partition_status" data-kind="safe">未选择分区</span>
            </div>
            <div class="pm-select-row">
              <select id="pm_partition_select" class="select"></select>
              <button id="pm_refresh_btn">刷新</button>
            </div>
            <div style="margin-top:10px;" id="pm_partition_detail"></div>
          </div>
          <div class="pm-panel">
            <div class="pm-panel-title">
              <span>状态</span>
              <span class="pm-panel-tip" id="pm_job_status">空闲</span>
            </div>
            <div class="pm-note">
              1. 导出文件会暂存到 uploads 目录，通过 <code>/api/uploads/...</code> 下载。<br />
              2. 刷入使用 <code>dd</code>，执行前会再次校验远端镜像，避免上传过程损坏。<br />
              3. 如果设备侧没有可用的 <code>SHA-256</code> 工具，插件会直接拒绝刷入。
            </div>
          </div>
          <div class="pm-panel">
            <div class="pm-panel-title">
              <span>操作</span>
              <span class="pm-panel-tip">当前选择：<b id="pm_selected_partition">-</b></span>
            </div>
            <div class="pm-actions">
              <button id="pm_export_btn">导出分区</button>
              <button id="pm_pick_file_btn">选择镜像并上传</button>
              <button id="pm_flash_btn">刷入分区</button>
            </div>
            <div style="margin-top:10px;" id="pm_flash_candidate"></div>
            <div class="pm-note" style="margin-top:10px;">
              高风险目标：<span class="pm-danger">mmcblk0、nr_fixnv1_a、nr_fixnv1_b、nr_fixnv2_a、nr_fixnv2_b</span>。这些目标禁止刷入。<br />
              选中高风险目标时，也禁止上传刷机镜像。<br />
              上传后会再次在后台计算 SHA-256 和大小；任何一项不一致都会阻止刷入。
            </div>
          </div>
        </div>
      `,
    });
    const select = el.querySelector('#pm_partition_select');
    const refreshBtn = el.querySelector('#pm_refresh_btn');
    const exportBtn = el.querySelector('#pm_export_btn');
    const pickFileBtn = el.querySelector('#pm_pick_file_btn');
    const flashBtn = el.querySelector('#pm_flash_btn');
    select.onchange = () => {
      state.selectedPartition = select.value || '';
      refreshSummary();
    };
    refreshBtn.onclick = async () => {
      await refreshAll(true);
    };
    exportBtn.onclick = async () => {
      await exportPartition();
    };
    pickFileBtn.onclick = async () => {
      await pickAndUploadImage();
    };
    flashBtn.onclick = async () => {
      await promptFlashConfirm();
    };
    showModal(id);
    await refreshAll();
  };

  const mainBtn = document.createElement('button');
  mainBtn.textContent = '分区管理';
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
