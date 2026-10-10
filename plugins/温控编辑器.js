//<script>
(async () => {
  const TITLE = '温控编辑器';
  const MODAL_NAME = 'kano_thermal_editor_modal';
  const STYLE_ID = 'kano_thermal_editor_style';
  const FORM_TOAST_ID = 'kano_thermal_editor_confirm';
  const STORAGE_DIR = '/data/kano_sprd_thermal_tools';
  const DECRYPTED_XML_PATH = `${STORAGE_DIR}/thermal.xml`;
  const ENCRYPTED_CONF_PATH = `${STORAGE_DIR}/thermal.conf`;
  const ACTIVE_SOURCE_FILE = `${STORAGE_DIR}/active_source_path.txt`;
  const BOOT_SCRIPT_PATH = `${STORAGE_DIR}/boot.sh`;
  const BOOT_HOOK_FILE = '/sdcard/ufi_tools_boot.sh';
  const BOOT_LINE = `sh ${BOOT_SCRIPT_PATH} >/dev/null 2>&1 &`;
  const UPLOADS_DIR = '/data/data/com.minikano.f50_sms/files/uploads';
  const AES_BLOCK_SIZE = 16;
  const PLAINTEXT_CHUNK_SIZE = 0x100;
  const CIPHERTEXT_CHUNK_SIZE = PLAINTEXT_CHUNK_SIZE + AES_BLOCK_SIZE;
  const THERMAL_KEY_ASCII = 'F547918D129FFFAB';
  const PRIORITY_PATHS = [
    '/data/thermal_tuner/thermal.conf',
    '/odm/etc/thermal.conf',
    '/vendor/etc/thermal.conf',
  ];

  const state = {
    installed: false,
    bootEnabled: false,
    busy: false,
    activeSourcePath: '',
    rawXml: '',
    doc: null,
    sensors: [],
    sourcePreview: '',
    dirty: false,
    summary: {
      sensorCount: 0,
      actionCount: 0,
      zoneCount: 0,
      tripCount: 0,
    },
  };

  const wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));
  const shellQuote = (value = '') => `'${String(value).replace(/'/g, `'\\''`)}'`;
  const makeTimestamp = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  };
  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const normalize = (value = '') => String(value || '').replace(/\r/g, '').trim();
  const encodePayload = (value = '') => {
    try {
      return btoa(unescape(encodeURIComponent(String(value))));
    } catch {
      return '';
    }
  };
  const decodePayload = (value = '') => {
    try {
      return decodeURIComponent(escape(atob(String(value || ''))));
    } catch {
      return '';
    }
  };
  const hasCryptoJS = () => typeof CryptoJS !== 'undefined' && CryptoJS?.AES && CryptoJS?.mode?.ECB && CryptoJS?.pad?.NoPadding;
  const keyWordArray = () => CryptoJS.enc.Latin1.parse(THERMAL_KEY_ASCII);
  const bytesToWordArray = (bytes) => {
    const words = [];
    for (let i = 0; i < bytes.length; i += 1) {
      words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, bytes.length);
  };
  const wordArrayToBytes = (wordArray) => {
    const { words, sigBytes } = wordArray;
    const bytes = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i += 1) {
      bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return bytes;
  };
  const concatBytes = (chunks) => {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    chunks.forEach((chunk) => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  };
  const xorBlock = (left, right) => {
    const out = new Uint8Array(AES_BLOCK_SIZE);
    for (let i = 0; i < AES_BLOCK_SIZE; i += 1) out[i] = left[i] ^ right[i];
    return out;
  };
  const aesEncryptBlock = (blockBytes) => {
    const encrypted = CryptoJS.AES.encrypt(bytesToWordArray(blockBytes), keyWordArray(), {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.NoPadding,
    }).ciphertext;
    return wordArrayToBytes(encrypted);
  };
  const aesDecryptBlock = (blockBytes) => {
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: bytesToWordArray(blockBytes) },
      keyWordArray(),
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding },
    );
    return wordArrayToBytes(decrypted);
  };
  const randomBytes = (length) => {
    const out = new Uint8Array(length);
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(out);
      return out;
    }
    for (let i = 0; i < length; i += 1) out[i] = Math.floor(Math.random() * 256);
    return out;
  };
  const base64ToBytes = (base64) => Uint8Array.from(atob(String(base64 || '')), (char) => char.charCodeAt(0));
  const bytesToBase64 = (bytes) => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };
  const decryptThermalBytes = (inputBytes) => {
    const chunks = [];
    let offset = 0;
    while (offset < inputBytes.length) {
      const remaining = inputBytes.length - offset;
      const chunkLength = remaining >= CIPHERTEXT_CHUNK_SIZE ? CIPHERTEXT_CHUNK_SIZE : remaining;
      const chunk = inputBytes.subarray(offset, offset + chunkLength);
      if (chunk.length <= AES_BLOCK_SIZE || (chunk.length % AES_BLOCK_SIZE) !== 0) {
        throw new Error(`无效加密块长度: ${chunk.length}`);
      }
      const blockCount = chunk.length / AES_BLOCK_SIZE;
      let prev = new Uint8Array(AES_BLOCK_SIZE);
      const plainParts = [];
      for (let i = 0; i < blockCount; i += 1) {
        const cipherBlock = chunk.subarray(i * AES_BLOCK_SIZE, (i + 1) * AES_BLOCK_SIZE);
        const temp = aesDecryptBlock(cipherBlock);
        const plainBlock = xorBlock(temp, prev);
        if (i > 0) plainParts.push(plainBlock);
        prev = cipherBlock.slice();
      }
      chunks.push(concatBytes(plainParts));
      offset += chunkLength;
    }
    return concatBytes(chunks);
  };
  const encryptThermalBytes = (plainBytes) => {
    if ((plainBytes.length % AES_BLOCK_SIZE) !== 0) {
      throw new Error(`明文长度必须按 ${AES_BLOCK_SIZE} 字节对齐`);
    }
    if ((plainBytes.length % PLAINTEXT_CHUNK_SIZE) !== 0) {
      throw new Error('明文长度必须按 0x100 字节对齐');
    }
    const chunks = [];
    for (let offset = 0; offset < plainBytes.length; offset += PLAINTEXT_CHUNK_SIZE) {
      const chunk = plainBytes.subarray(offset, offset + PLAINTEXT_CHUNK_SIZE);
      let prev = randomBytes(AES_BLOCK_SIZE);
      const cipherParts = [prev];
      for (let i = 0; i < chunk.length; i += AES_BLOCK_SIZE) {
        const plainBlock = chunk.subarray(i, i + AES_BLOCK_SIZE);
        const xored = xorBlock(plainBlock, prev);
        const cipherBlock = aesEncryptBlock(xored);
        cipherParts.push(cipherBlock);
        prev = cipherBlock;
      }
      chunks.push(concatBytes(cipherParts));
    }
    return concatBytes(chunks);
  };

  const run = async (command, timeout = 30000) => {
    const res = await runShellWithRoot(command, timeout);
    return {
      ok: Boolean(res?.success),
      text: String(res?.content || ''),
      raw: res,
    };
  };

  const ensureRoot = async () => {
    const res = await run('whoami', 10000);
    if (res.ok && res.text.includes('root')) return true;
    createToast('请先启用高级功能', 'red');
    return false;
  };

  const ask = (id, title, content, okText = '确认', cancelText = '取消') => new Promise((resolve) => {
    const old = document.getElementById(id);
    if (old) old.remove();
    const { el, close } = createFixedToast(id, `
      <div style="pointer-events:all;width:min(92vw,520px);">
        <div class="title" style="margin:0;">${title}</div>
        <div style="margin-top:10px;font-size:.68rem;line-height:1.75;">${content}</div>
        <div style="margin-top:14px;text-align:right;display:flex;justify-content:flex-end;gap:10px;">
          <button class="ok">${okText}</button>
          <button class="cancel">${cancelText}</button>
        </div>
      </div>
    `);
    const done = (value) => {
      close();
      resolve(value);
    };
    el.querySelector('.ok')?.addEventListener('click', () => done(true));
    el.querySelector('.cancel')?.addEventListener('click', () => done(false));
  });

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .kte-wrap { display:flex; flex-direction:column; gap:12px; }
      #${MODAL_NAME} .kte-grid { display:grid; gap:12px; }
      #${MODAL_NAME} .kte-stats { grid-template-columns:repeat(4, minmax(0, 1fr)); }
      #${MODAL_NAME} .kte-card, #${MODAL_NAME} .kte-stat, #${MODAL_NAME} .kte-toolbar, #${MODAL_NAME} .kte-panel {
        border:1px solid rgba(255,255,255,.08);
        background:rgba(255,255,255,.035);
        border-radius:16px;
        backdrop-filter:blur(8px);
      }
      #${MODAL_NAME} .kte-stat, #${MODAL_NAME} .kte-toolbar, #${MODAL_NAME} .kte-panel, #${MODAL_NAME} .kte-card { padding:12px 14px; }
      #${MODAL_NAME} .kte-stat-label { font-size:.62rem; opacity:.72; margin-bottom:6px; }
      #${MODAL_NAME} .kte-stat-value { font-size:.92rem; font-weight:800; word-break:break-word; }
      #${MODAL_NAME} .kte-toolbar-top, #${MODAL_NAME} .kte-card-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
      #${MODAL_NAME} .kte-actions { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end;width:100% }
      #${MODAL_NAME} .kte-tip, #${MODAL_NAME} .kte-empty, #${MODAL_NAME} .kte-readonly { font-size:.64rem; line-height:1.7; opacity:.82; }
      #${MODAL_NAME} .kte-card-title { font-size:.78rem; font-weight:800; }
      #${MODAL_NAME} .kte-sensor-list { display:grid; gap:12px; }
      #${MODAL_NAME} .kte-sensor-card { display:grid; }
      #${MODAL_NAME} .kte-meta { display:flex; flex-wrap:wrap; gap:8px; }
      #${MODAL_NAME} .kte-chip {
        display:inline-flex; align-items:center; border-radius:999px; padding:4px 10px;
        background:rgba(255,255,255,.08); font-size:.6rem; font-weight:700;
      }
      #${MODAL_NAME} .kte-field-grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; }
      #${MODAL_NAME} .kte-zone-list, #${MODAL_NAME} .kte-trip-list, #${MODAL_NAME} .kte-action-list { display:grid; gap:10px; }
      #${MODAL_NAME} .kte-zone, #${MODAL_NAME} .kte-trip, #${MODAL_NAME} .kte-action {
        border-radius:14px; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.06); padding:10px 12px;
      }
      #${MODAL_NAME} label.kte-field { display:flex; flex-direction:column; gap:6px; }
      #${MODAL_NAME} .kte-field span { font-size:.62rem; font-weight:700; }
      #${MODAL_NAME} input.kte-input, #${MODAL_NAME} textarea.kte-input {
        width:100%; box-sizing:border-box; padding:8px 10px; border:none; border-radius:10px;
        color:#fff; background:rgba(255,255,255,.05); outline:none;
      }
      #${MODAL_NAME} textarea.kte-input { min-height:110px; resize:vertical; font-family:monospace; }
      #${MODAL_NAME} input.kte-input:focus, #${MODAL_NAME} textarea.kte-input:focus {
        box-shadow:0 0 0 2px rgba(80,160,255,.25);
      }
      #${MODAL_NAME} details { border-radius:14px; border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.03); padding:10px 12px; }
      #${MODAL_NAME} summary { cursor:pointer; font-size:.7rem; font-weight:800; }
      #${MODAL_NAME} .kte-collapse { padding:0; overflow:hidden; }
      #${MODAL_NAME} .kte-collapse > summary {
        display:flex; align-items:center; justify-content:flex-start; gap:12px;
        padding:10px 12px;
      }
      #${MODAL_NAME} .kte-collapse > summary::before {
        content:'▶'; font-size:.68rem; opacity:.78; flex:0 0 auto;
        transform:translateY(1px); transition:transform .16s ease;
      }
      #${MODAL_NAME} .kte-collapse[open] > summary::before {
        transform:rotate(90deg) translateX(1px);
      }
      #${MODAL_NAME} .kte-collapse-body { padding:0 14px 14px; display:grid; gap:12px; }
      #${MODAL_NAME} .kte-collapse-meta { font-size:.62rem; opacity:.78; font-weight:600; }
      #${MODAL_NAME} pre {
        margin:10px 0 0; white-space:pre-wrap; word-break:break-word; font-size:.62rem; line-height:1.65;
        max-height:260px; overflow:auto;
      }
      @media (max-width: 900px) {
        #${MODAL_NAME} .kte-stats, #${MODAL_NAME} .kte-field-grid { grid-template-columns:repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 640px) {
        #${MODAL_NAME} .kte-stats, #${MODAL_NAME} .kte-field-grid { grid-template-columns:1fr; }
        #${MODAL_NAME} .kte-toolbar-top, #${MODAL_NAME} .kte-card-head { flex-direction:column; }
        #${MODAL_NAME} .kte-actions button { width:100%; }
      }
    `;
    document.head.appendChild(style);
  };

  const setBusy = (busy) => {
    state.busy = busy;
    const modal = document.querySelector(`#${MODAL_NAME}`);
    if (!modal) return;
    modal.querySelectorAll('button, input, textarea').forEach((el) => {
      if (el.dataset.lockIgnore === '1') return;
      el.disabled = busy;
    });
  };

  const updateDirty = (next) => {
    state.dirty = next;
    const badge = document.querySelector('#kte_dirty_state');
    if (badge) {
      badge.textContent = next ? '有未保存改动' : '已同步';
      badge.style.color = next ? '#ffd08a' : '#9dffbf';
    }
  };

  const writeRemoteText = async (path, content, mode = '644') => {
    const encoded = encodePayload(content);
    if (!encoded) return false;
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) || '/' : '/';
    const res = await run(`
mkdir -p ${shellQuote(dir)}
if command -v base64 >/dev/null 2>&1; then
  printf '%s' ${shellQuote(encoded)} | base64 -d > ${shellQuote(path)}
elif command -v busybox >/dev/null 2>&1; then
  printf '%s' ${shellQuote(encoded)} | busybox base64 -d > ${shellQuote(path)}
elif command -v toybox >/dev/null 2>&1; then
  printf '%s' ${shellQuote(encoded)} | toybox base64 -d > ${shellQuote(path)}
else
  echo '设备缺少 base64 解码命令'
  exit 1
fi
chmod ${mode} ${shellQuote(path)} 2>/dev/null || true
`, 20000);
    return res.ok;
  };

  const ensureInstalled = async () => {
    const res = await run(`[ -f ${shellQuote(BOOT_SCRIPT_PATH)} ] && [ -d ${shellQuote(STORAGE_DIR)} ] && echo OK || echo MISS`, 10000);
    state.installed = normalize(res.text) === 'OK';
    return state.installed;
  };

  const deleteUploadCache = async (filename) => {
    if (!filename) return;
    try {
      await fetchWithTimeout(`${KANO_baseURL}/delete_img`, {
        method: 'POST',
        headers: common_headers,
        body: JSON.stringify({ file_name: filename }),
      });
    } catch (error) {
      console.error('deleteUploadCache error:', error);
    }
  };

  const writeRemoteBase64 = async (path, base64Text, mode = '644') => {
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) || '/' : '/';
    const res = await run(`
mkdir -p ${shellQuote(dir)}
if command -v base64 >/dev/null 2>&1; then
  printf '%s' ${shellQuote(base64Text)} | base64 -d > ${shellQuote(path)}
elif command -v busybox >/dev/null 2>&1; then
  printf '%s' ${shellQuote(base64Text)} | busybox base64 -d > ${shellQuote(path)}
elif command -v toybox >/dev/null 2>&1; then
  printf '%s' ${shellQuote(base64Text)} | toybox base64 -d > ${shellQuote(path)}
else
  echo '设备缺少 base64 解码命令'
  exit 1
fi
chmod ${mode} ${shellQuote(path)} 2>/dev/null || true
`, 20000);
    return res.ok;
  };

  const readRemoteBinaryBytes = async (path) => {
    const tempName = `thermal_read_${makeTimestamp()}_${Math.random().toString(16).slice(2, 8)}.bin`;
    const tempPath = `${UPLOADS_DIR}/${tempName}`;
    const prepRes = await run(`
if [ ! -f ${shellQuote(path)} ]; then
  echo '__NO_FILE__'
  exit 1
fi
mkdir -p ${shellQuote(UPLOADS_DIR)}
cp ${shellQuote(path)} ${shellQuote(tempPath)}
wc -c < ${shellQuote(tempPath)}
`, 30000);
    if (!prepRes.ok) {
      return {
        ok: false,
        text: `准备下载缓存失败: ${prepRes.text || ''}`.trim(),
      };
    }
    try {
      const response = await fetchWithTimeout(`/api/uploads/${tempName}`);
      if (!response.ok) {
        return {
          ok: false,
          text: `下载缓存文件失败: HTTP ${response.status}`,
        };
      }
      const buffer = await response.arrayBuffer();
      return {
        ok: true,
        bytes: new Uint8Array(buffer),
      };
    } catch (error) {
      return {
        ok: false,
        text: `下载缓存文件失败: ${error}`,
      };
    } finally {
      await deleteUploadCache(tempName);
    }
  };

  const checkBootEnabled = async () => {
    const res = await run(`
touch ${shellQuote(BOOT_HOOK_FILE)}
grep -qxF ${shellQuote(BOOT_LINE)} ${shellQuote(BOOT_HOOK_FILE)} && echo ON || echo OFF
`, 10000);
    state.bootEnabled = normalize(res.text) === 'ON';
    return state.bootEnabled;
  };

  const getFirstSourcePath = async () => {
    const res = await run(`
for path in ${PRIORITY_PATHS.map((item) => shellQuote(item)).join(' ')}; do
  if [ -f "$path" ]; then
    echo "$path"
    exit 0
  fi
done
exit 1
`, 12000);
    return normalize(res.text);
  };

  const readActiveSourceMemo = async () => {
    const res = await run(`timeout 2s awk '{print}' ${shellQuote(ACTIVE_SOURCE_FILE)} 2>/dev/null || true`, 5000);
    return normalize(res.text);
  };

  const writeActiveSourceMemo = async (path) => {
    return writeRemoteText(ACTIVE_SOURCE_FILE, `${String(path || '').trim()}\n`, '644');
  };

  const buildBootScript = () => `#!/system/bin/sh
PATH=/system/bin:/system/xbin:/vendor/bin:$PATH
BASE=${STORAGE_DIR}
WORK=${ENCRYPTED_CONF_PATH}
ACTIVE_FILE=${ACTIVE_SOURCE_FILE}

resolve_target() {
  if [ -f "$ACTIVE_FILE" ]; then
    target="$(timeout 2s awk 'NR==1{print}' "$ACTIVE_FILE" 2>/dev/null)"
    if [ -n "$target" ] && [ -f "$target" ]; then
      echo "$target"
      return 0
    fi
  fi
  for target in ${PRIORITY_PATHS.join(' ')}; do
    if [ -f "$target" ]; then
      echo "$target"
      return 0
    fi
  done
  return 1
}

kill_thermal_procs() {
  ps -A 2>/dev/null | awk '
    /thermald/ {print $2}
    /vendor\\.sprd\\.hardware\\.thermal/ {print $2}
  ' | while read -r pid; do
    [ -n "$pid" ] && kill -9 "$pid" 2>/dev/null || true
  done
}

target="$(resolve_target)"
[ -n "$target" ] || exit 1
[ -f "$WORK" ] || exit 1

umount "$target" 2>/dev/null || true
mount --bind "$WORK" "$target" || exit 1
kill_thermal_procs
exit 0
`;

  const installResources = async () => {
    const bootScript = buildBootScript();
    const res = await run(`mkdir -p ${shellQuote(STORAGE_DIR)}`, 12000);
    if (!res.ok) throw new Error(res.text || '初始化目录失败');
    const bootOk = await writeRemoteText(BOOT_SCRIPT_PATH, bootScript, '755');
    if (!bootOk) throw new Error('写入 boot.sh 失败');
    state.installed = true;
  };

  const removeBootHook = async () => {
    const res = await run(`
touch ${shellQuote(BOOT_HOOK_FILE)}
sed -i '\\#^${BOOT_LINE.replace(/[\/&]/g, '\\$&')}$#d' ${shellQuote(BOOT_HOOK_FILE)}
`, 12000);
    state.bootEnabled = false;
    return res.ok;
  };

  const ensureBootHook = async () => {
    const res = await run(`
touch ${shellQuote(BOOT_HOOK_FILE)}
grep -qxF ${shellQuote(BOOT_LINE)} ${shellQuote(BOOT_HOOK_FILE)} || echo ${shellQuote(BOOT_LINE)} >> ${shellQuote(BOOT_HOOK_FILE)}
`, 12000);
    state.bootEnabled = res.ok;
    return res.ok;
  };

  const refreshPreview = async () => {
    const pre = document.querySelector('#kte_source_preview');
    const pathEl = document.querySelector('#kte_active_source');
    if (pathEl) pathEl.textContent = state.activeSourcePath || '未检测到';
    if (pre) pre.textContent = state.sourcePreview || '(尚未读取设备温控文件)';
  };

  const setSummary = () => {
    const summary = {
      sensorCount: state.sensors.length,
      zoneCount: 0,
      tripCount: 0,
      actionCount: 0,
    };
    state.sensors.forEach((sensor) => {
      summary.zoneCount += sensor.zones.length;
      sensor.zones.forEach((zone) => {
        summary.tripCount += zone.trips.length;
        zone.trips.forEach((trip) => {
          summary.actionCount += trip.actions.length;
        });
      });
      summary.actionCount += sensor.perfTrip.length;
    });
    state.summary = summary;
  };

  const updateStats = () => {
    setSummary();
    const mapping = {
      kte_stat_sensors: state.summary.sensorCount,
      kte_stat_zones: state.summary.zoneCount,
      kte_stat_trips: state.summary.tripCount,
      kte_stat_actions: state.summary.actionCount,
      kte_stat_boot: state.bootEnabled ? '已开启' : '未开启',
      kte_stat_install: state.installed ? '已安装' : '未安装',
    };
    Object.entries(mapping).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    });
  };

  const toTempC = (value) => {
    const raw = Number(String(value || '').trim());
    if (!Number.isFinite(raw)) return String(value || '');
    return String(raw / 1000);
  };

  const toMilliTemp = (value) => {
    const raw = Number(String(value || '').trim());
    if (!Number.isFinite(raw)) return String(value || '').trim();
    return String(Math.round(raw * 1000));
  };

  const parseXmlToModel = (xmlText) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) throw new Error(parserError.textContent || 'XML 解析失败');

    const sensors = [...doc.querySelectorAll('ThermalConfig > sensor')].map((sensorEl, sensorIndex) => {
      const perfTrip = [...sensorEl.querySelectorAll(':scope > perf_trip > action, :scope > perf_trip > aciton')].map((actionEl, idx) => ({
        id: `perf_${sensorIndex}_${idx}`,
        tagName: actionEl.tagName,
        name: actionEl.getAttribute('name') || '',
        arg: actionEl.getAttribute('arg') || '',
        file: actionEl.getAttribute('file') || '',
        element: actionEl,
      }));
      const zones = [...sensorEl.querySelectorAll(':scope > zone_level')].map((zoneEl, zoneIndex) => ({
        id: `zone_${sensorIndex}_${zoneIndex}`,
        zoneId: zoneEl.getAttribute('id') || '',
        type: zoneEl.getAttribute('type') || '',
        temp: zoneEl.querySelector(':scope > temp')?.textContent?.trim() || '',
        hystTemp: zoneEl.querySelector(':scope > hyst_temp')?.textContent?.trim() || '',
        tempElement: zoneEl.querySelector(':scope > temp'),
        hystTempElement: zoneEl.querySelector(':scope > hyst_temp'),
        trips: [...zoneEl.querySelectorAll(':scope > trip')].map((tripEl, tripIndex) => ({
          id: `trip_${sensorIndex}_${zoneIndex}_${tripIndex}`,
          tripId: tripEl.getAttribute('id') || '',
          actions: [...tripEl.querySelectorAll(':scope > action, :scope > aciton')].map((actionEl, actionIndex) => ({
            id: `action_${sensorIndex}_${zoneIndex}_${tripIndex}_${actionIndex}`,
            tagName: actionEl.tagName,
            name: actionEl.getAttribute('name') || '',
            arg: actionEl.getAttribute('arg') || '',
            file: actionEl.getAttribute('file') || '',
            element: actionEl,
          })),
        })),
      }));
      return {
        id: `sensor_${sensorIndex}`,
        sensorType: sensorEl.querySelector(':scope > sensor_type')?.textContent?.trim() || '',
        backupSensor: sensorEl.querySelector(':scope > backup_sensor')?.textContent?.trim() || '',
        scenario: sensorEl.querySelector(':scope > scenario')?.textContent?.trim() || '',
        pollingDelay: sensorEl.querySelector(':scope > polling_delay')?.textContent?.trim() || '',
        avgPeriod: sensorEl.querySelector(':scope > AvgPeriod')?.textContent?.trim() || '',
        pollingDelayElement: sensorEl.querySelector(':scope > polling_delay'),
        avgPeriodElement: sensorEl.querySelector(':scope > AvgPeriod'),
        perfTrip,
        zones,
      };
    });
    return { doc, sensors };
  };

  const normalizeXmlText = (rawText = '') => {
    const text = String(rawText || '').replace(/\r/g, '');
    const xmlStart = text.indexOf('<?xml');
    const rootStart = text.indexOf('<ThermalConfig');
    const start = xmlStart >= 0 ? xmlStart : rootStart;
    if (start >= 0) {
      return text.slice(start).trim();
    }
    return text.trim();
  };

  const serializeXml = () => {
    if (!state.doc) throw new Error('当前没有已解析的 XML');
    const serializer = new XMLSerializer();
    const body = serializer.serializeToString(state.doc.documentElement);
    return `<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n${body}\n`;
  };

  const loadXmlIntoState = async (xmlText, sourceLabel = '导入文件') => {
    const normalizedXml = normalizeXmlText(xmlText);
    if (!normalizedXml) throw new Error('导入内容为空');
    if (!normalizedXml.includes('<ThermalConfig')) {
      throw new Error('导入内容不是有效温控 XML');
    }
    const { doc, sensors } = parseXmlToModel(normalizedXml);
    state.doc = doc;
    state.sensors = sensors;
    state.rawXml = normalizedXml;
    state.sourcePreview = normalizedXml;
    state.activeSourcePath = sourceLabel;
    await refreshPreview();
    renderSensors();
    updateDirty(false);
  };

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const exportXmlFile = async () => {
    if (!state.doc) {
      createToast('请先读取或导入温控文件', 'red');
      return;
    }
    try {
      const xml = applyFormToDoc();
      state.sourcePreview = xml;
      await refreshPreview();
      updateDirty(false);
      triggerDownload(
        new Blob([xml], { type: 'application/xml;charset=utf-8' }),
        `thermal_${makeTimestamp()}.xml`,
      );
      createToast('XML 已导出', 'green');
    } catch (error) {
      console.error(error);
      createToast(error?.message || '导出 XML 失败', 'red', 6000);
    }
  };

  const exportEncryptedFile = async () => {
    if (!hasCryptoJS()) {
      createToast('当前页面没有可用的 CryptoJS，无法导出加密文件', 'red');
      return;
    }
    if (!state.doc) {
      createToast('请先读取或导入温控文件', 'red');
      return;
    }
    try {
      const xml = padXmlToChunk(applyFormToDoc());
      const plainBytes = new TextEncoder().encode(xml);
      const encryptedBytes = encryptThermalBytes(plainBytes);
      state.sourcePreview = xml;
      await refreshPreview();
      updateDirty(false);
      triggerDownload(
        new Blob([encryptedBytes], { type: 'application/octet-stream' }),
        `thermal_${makeTimestamp()}.conf`,
      );
      createToast('加密 thermal.conf 已导出', 'green');
    } catch (error) {
      console.error(error);
      createToast(error?.message || '导出加密文件失败', 'red', 6000);
    }
  };

  const importThermalFile = async (file) => {
    if (!file) return;
    if (!hasCryptoJS()) {
      createToast('当前页面没有可用的 CryptoJS，无法导入文件', 'red');
      return;
    }
    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (ext === 'xml' || file.type.includes('xml') || file.type.startsWith('text/')) {
        const xmlText = await file.text();
        await loadXmlIntoState(xmlText, `导入: ${file.name}`);
        createToast(`已导入 XML: ${file.name}`, 'green', 5000);
        return;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const decryptedBytes = decryptThermalBytes(bytes);
      const xmlText = normalizeXmlText(new TextDecoder('utf-8').decode(decryptedBytes));
      await loadXmlIntoState(xmlText, `导入: ${file.name}`);
      createToast(`已导入加密文件: ${file.name}`, 'green', 5000);
    } catch (error) {
      console.error(error);
      createToast(error?.message || '导入文件失败', 'red', 6000);
    }
  };

  const openImportPicker = () => {
    const input = document.querySelector('#kte_import_input');
    if (!input) return;
    input.value = '';
    input.click();
  };

  const padXmlToChunk = (xmlText) => {
    const encoder = new TextEncoder();
    let text = xmlText;
    if (!text.endsWith('\n')) text += '\n';
    while ((encoder.encode(text).length % 256) !== 0) {
      text += ' ';
    }
    return text;
  };

  const applyFormToDoc = () => {
    if (!state.doc) throw new Error('没有可写回的 XML 文档');
    state.sensors.forEach((sensor) => {
      const pollingInput = document.querySelector(`[data-field="polling_delay"][data-sensor-id="${sensor.id}"]`);
      const avgInput = document.querySelector(`[data-field="avg_period"][data-sensor-id="${sensor.id}"]`);
      if (sensor.pollingDelayElement && pollingInput) sensor.pollingDelayElement.textContent = String(pollingInput.value || '').trim();
      if (sensor.avgPeriodElement && avgInput) sensor.avgPeriodElement.textContent = String(avgInput.value || '').trim();
      sensor.perfTrip.forEach((action) => {
        const input = document.querySelector(`[data-field="action_arg"][data-action-id="${action.id}"]`);
        if (input) action.element.setAttribute('arg', String(input.value || '').trim());
      });
      sensor.zones.forEach((zone) => {
        const tempInput = document.querySelector(`[data-field="zone_temp"][data-zone-id="${zone.id}"]`);
        if (zone.tempElement && tempInput) zone.tempElement.textContent = toMilliTemp(tempInput.value);
        if (zone.hystTempElement) {
          const hystInput = document.querySelector(`[data-field="zone_hyst"][data-zone-id="${zone.id}"]`);
          zone.hystTempElement.textContent = toMilliTemp(hystInput?.value || '');
        }
        zone.trips.forEach((trip) => {
          trip.actions.forEach((action) => {
            const input = document.querySelector(`[data-field="action_arg"][data-action-id="${action.id}"]`);
            if (input) action.element.setAttribute('arg', String(input.value || '').trim());
          });
        });
      });
    });
    const next = serializeXml();
    state.rawXml = next;
    return next;
  };

  const bindChangeEvents = () => {
    const modal = document.querySelector(`#${MODAL_NAME}`);
    if (!modal) return;
    modal.querySelectorAll('.kte-input').forEach((input) => {
      input.oninput = () => updateDirty(true);
    });
  };

  const renderSensors = () => {
    const list = document.querySelector('#kte_sensor_list');
    if (!list) return;
    if (!state.sensors.length) {
      list.innerHTML = '<div class="kte-empty">尚未读取温控文件，请先点击“读取”。</div>';
      return;
    }
    list.innerHTML = state.sensors.map((sensor) => `
      <details class="kte-card kte-sensor-card kte-collapse">
        <summary>
          <span>${escapeHtml(sensor.sensorType || '未知传感器')}</span>
          <span class="kte-collapse-meta">${escapeHtml(sensor.scenario || '默认场景')} · ${sensor.zones.length} 个温区</span>
        </summary>
        <div class="kte-collapse-body">
          <div class="kte-card-head">
            <div>
              <div class="kte-meta">
                <span class="kte-chip">场景: ${escapeHtml(sensor.scenario || '默认')}</span>
                ${sensor.backupSensor ? `<span class="kte-chip">备用: ${escapeHtml(sensor.backupSensor)}</span>` : ''}
                <span class="kte-chip">${sensor.zones.length} 个温区</span>
              </div>
            </div>
            <div class="kte-tip">
              ` + `传感器类型、场景和动作文件保持原结构，仅开放阈值和参数编辑` + `
            </div>
          </div>
          <div class="kte-field-grid">
            <label class="kte-field">
              <span>轮询间隔 (ms)</span>
              <input class="kte-input" data-field="polling_delay" data-sensor-id="${sensor.id}" value="${escapeHtml(sensor.pollingDelay)}">
            </label>
            <label class="kte-field">
              <span>平均周期 (ms)</span>
              <input class="kte-input" data-field="avg_period" data-sensor-id="${sensor.id}" value="${escapeHtml(sensor.avgPeriod)}">
            </label>
            <label class="kte-field">
              <span>结构信息</span>
              <input class="kte-input" value="${escapeHtml(`传感器=${sensor.sensorType}${sensor.scenario ? `，场景=${sensor.scenario}` : ''}`)}" readonly>
            </label>
          </div>
          ${sensor.perfTrip.length ? `
            <div class="kte-panel">
              <div class="kte-card-title">性能触发动作</div>
              <div class="kte-action-list" style="margin-top:10px;">
                ${sensor.perfTrip.map((action) => `
                  <div class="kte-action">
                    <div class="kte-tip">${escapeHtml(action.tagName)} · ${escapeHtml(action.name)} · ${escapeHtml(action.file || '（无文件路径）')}</div>
                    <label class="kte-field" style="margin-top:8px;">
                      <span>参数</span>
                      <input class="kte-input" data-field="action_arg" data-action-id="${action.id}" value="${escapeHtml(action.arg)}">
                    </label>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          <div class="kte-zone-list">
            ${sensor.zones.map((zone) => `
              <details class="kte-zone kte-collapse">
                <summary>
                  <span>温区级别 #${escapeHtml(zone.zoneId)} · ${escapeHtml(zone.type)}</span>
                  <span class="kte-collapse-meta">${zone.trips.length} 个触发点</span>
                </summary>
                <div class="kte-collapse-body">
                  <div class="kte-field-grid">
                    <label class="kte-field">
                      <span>触发温度 (°C)</span>
                      <input class="kte-input" data-field="zone_temp" data-zone-id="${zone.id}" value="${escapeHtml(toTempC(zone.temp))}">
                    </label>
                    <label class="kte-field">
                      <span>回滞温度 (°C)</span>
                      <input class="kte-input" data-field="zone_hyst" data-zone-id="${zone.id}" value="${escapeHtml(toTempC(zone.hystTemp))}" ${zone.hystTempElement ? '' : 'readonly'}>
                    </label>
                    <label class="kte-field">
                      <span>类型</span>
                      <input class="kte-input" value="${escapeHtml(zone.type)}" readonly>
                    </label>
                  </div>
                  <div class="kte-trip-list">
                    ${zone.trips.map((trip) => `
                      <div class="kte-trip">
                        <div class="kte-card-title">触发点 #${escapeHtml(trip.tripId)}</div>
                        ${trip.actions.length ? `
                          <div class="kte-action-list" style="margin-top:10px;">
                            ${trip.actions.map((action) => `
                              <div class="kte-action">
                                <div class="kte-tip">${escapeHtml(action.tagName)} · ${escapeHtml(action.name)} · ${escapeHtml(action.file || '（无文件路径）')}</div>
                                <label class="kte-field" style="margin-top:8px;">
                                  <span>参数</span>
                                  <input class="kte-input" data-field="action_arg" data-action-id="${action.id}" value="${escapeHtml(action.arg)}">
                                </label>
                              </div>
                            `).join('')}
                          </div>
                        ` : '<div class="kte-empty" style="margin-top:8px;">该触发点下没有动作，原样保留。</div>'}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </details>
            `).join('')}
          </div>
        </div>
      </details>
    `).join('');
    bindChangeEvents();
    updateStats();
  };

  const loadAndDecrypt = async () => {
    if (!(await ensureRoot())) return false;
    if (!hasCryptoJS()) {
      createToast('当前页面没有可用的 CryptoJS，无法解密', 'red');
      return false;
    }
    if (!(await ensureInstalled())) {
      createToast('请先安装插件资源', 'red');
      return false;
    }
    setBusy(true);
    createToast('正在按优先级查找并解密温控文件...', 'pink');
    try {
      const sourcePath = await getFirstSourcePath();
      if (!sourcePath) {
        createToast('未找到 thermal.conf，检查 /data /odm /vendor 路径', 'red', 5000);
        return false;
      }
      const encryptedRes = await readRemoteBinaryBytes(sourcePath);
      if (!encryptedRes.ok) {
        createToast(encryptedRes.text || '读取加密温控文件失败', 'red', 6000);
        return false;
      }
      const encryptedBytes = encryptedRes.bytes;
      const decryptedBytes = decryptThermalBytes(encryptedBytes);
      const xmlText = normalizeXmlText(new TextDecoder('utf-8').decode(decryptedBytes));
      if (!xmlText) {
        createToast('解密结果为空', 'red', 6000);
        return false;
      }
      if (!xmlText.includes('<ThermalConfig')) {
        createToast('解密结果不是有效温控 XML，请检查源文件格式是否匹配', 'red', 7000);
        return false;
      }
      const dumpOk = await writeRemoteText(DECRYPTED_XML_PATH, `${xmlText}\n`, '644');
      if (!dumpOk) createToast('已在浏览器解密，但写入 thermal.xml 预览文件失败', 'orange', 5000);
      const { doc, sensors } = parseXmlToModel(xmlText);
      state.doc = doc;
      state.sensors = sensors;
      state.rawXml = xmlText;
      state.activeSourcePath = sourcePath;
      state.sourcePreview = xmlText;
      await writeActiveSourceMemo(sourcePath);
      await refreshPreview();
      renderSensors();
      updateDirty(false);
      createToast(`已读取: ${sourcePath}`, 'green', 5000);
      return true;
    } catch (error) {
      console.error(error);
      createToast(error?.message || '解密或解析失败', 'red', 6000);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveEncrypted = async () => {
    if (!(await ensureRoot())) return false;
    if (!hasCryptoJS()) {
      createToast('当前页面没有可用的 CryptoJS，无法加密', 'red');
      return false;
    }
    if (!state.doc) {
      createToast('请先读取设备温控文件', 'red');
      return false;
    }
    if (!(await ensureInstalled())) {
      createToast('请先安装插件资源', 'red');
      return false;
    }
    setBusy(true);
    createToast('正在用浏览器重新加密温控文件...', 'pink');
    try {
      const xml = padXmlToChunk(applyFormToDoc());
      const writeOk = await writeRemoteText(DECRYPTED_XML_PATH, xml, '644');
      if (!writeOk) throw new Error('写入 thermal.xml 失败');
      const plainBytes = new TextEncoder().encode(xml);
      const encryptedBytes = encryptThermalBytes(plainBytes);
      const encryptedOk = await writeRemoteBase64(ENCRYPTED_CONF_PATH, bytesToBase64(encryptedBytes), '644');
      if (!encryptedOk) throw new Error('写入加密 thermal.conf 失败');
      state.sourcePreview = xml;
      await refreshPreview();
      updateDirty(false);
      createToast(`已生成 ${ENCRYPTED_CONF_PATH}`, 'green', 5000);
      return true;
    } catch (error) {
      console.error(error);
      createToast(error?.message || '保存失败', 'red', 6000);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const applyThermal = async () => {
    if (!(await ensureRoot())) return;
    if (!(await ensureInstalled())) {
      createToast('请先安装插件资源', 'red');
      return;
    }
    if (!state.activeSourcePath) {
      const memo = await readActiveSourceMemo();
      state.activeSourcePath = memo || await getFirstSourcePath();
    }
    if (!state.activeSourcePath) {
      createToast('没有可应用的目标路径，请先读取设备文件', 'red');
      return;
    }
    if (state.dirty || !state.rawXml) {
      const ok = await saveEncrypted();
      if (!ok) return;
    }
    setBusy(true);
    createToast('正在启用自启、bind mount 并重载 thermald...', 'pink');
    try {
      const hookOk = await ensureBootHook();
      if (!hookOk) throw new Error('写入开机自启失败');
      const bindRes = await run(`sh ${shellQuote(BOOT_SCRIPT_PATH)}`, 25000);
      if (!bindRes.ok) throw new Error(bindRes.text || '应用失败');
      state.bootEnabled = true;
      updateStats();
      createToast(`已应用到 ${state.activeSourcePath}`, 'green', 5000);
    } catch (error) {
      console.error(error);
      createToast(error?.message || '应用失败', 'red', 6000);
    } finally {
      setBusy(false);
    }
  };

  const toggleBoot = async () => {
    if (!(await ensureRoot())) return;
    if (!(await ensureInstalled())) {
      createToast('请先安装插件资源', 'red');
      return;
    }
    setBusy(true);
    try {
      const current = await checkBootEnabled();
      const ok = current ? await removeBootHook() : await ensureBootHook();
      if (!ok) {
        createToast(current ? '关闭开机自启失败' : '开启开机自启失败', 'red');
        return;
      }
      await checkBootEnabled();
      updateStats();
      createToast(state.bootEnabled ? '已开启开机自启' : '已关闭开机自启', 'green');
    } finally {
      setBusy(false);
    }
  };

  const installPlugin = async () => {
    if (!(await ensureRoot())) return;
    if (!hasCryptoJS()) {
      createToast('当前页面没有可用的 CryptoJS，无法启用此插件', 'red');
      return;
    }
    setBusy(true);
    createToast('正在初始化插件目录和 boot.sh...', 'pink');
    try {
      await installResources();
      await ensureInstalled();
      await checkBootEnabled();
      updateStats();
      createToast('安装完成', 'green');
    } catch (error) {
      console.error(error);
      createToast(error?.message || '安装失败', 'red', 6000);
    } finally {
      setBusy(false);
    }
  };

  const uninstallPlugin = async () => {
    if (!(await ensureRoot())) return;
    const yes = await ask(
      FORM_TOAST_ID,
      '确认卸载',
      `这会删除 <code>${escapeHtml(STORAGE_DIR)}</code>，移除开机自启接入，并尝试卸载当前 bind mount。`
    );
    if (!yes) return;
    setBusy(true);
    createToast('正在卸载插件资源...', 'pink');
    try {
      const target = state.activeSourcePath || await readActiveSourceMemo() || await getFirstSourcePath();
      const res = await run(`
touch ${shellQuote(BOOT_HOOK_FILE)}
sed -i '/kano_sprd_thermal_tools\\/boot\\.sh/d' ${shellQuote(BOOT_HOOK_FILE)}
${target ? `umount ${shellQuote(target)} 2>/dev/null || true` : 'true'}
rm -rf ${shellQuote(STORAGE_DIR)}
echo OK
`, 25000);
      if (!res.ok || !res.text.includes('OK')) throw new Error(res.text || '卸载失败');
      state.installed = false;
      state.bootEnabled = false;
      state.activeSourcePath = '';
      state.rawXml = '';
      state.sourcePreview = '';
      state.doc = null;
      state.sensors = [];
      renderSensors();
      await refreshPreview();
      updateDirty(false);
      updateStats();
      createToast('卸载完成', 'green');
    } catch (error) {
      console.error(error);
      createToast(error?.message || '卸载失败', 'red', 6000);
    } finally {
      setBusy(false);
    }
  };

  const refreshDeviceState = async () => {
    await ensureInstalled();
    await checkBootEnabled();
    if (!state.activeSourcePath) {
      state.activeSourcePath = await readActiveSourceMemo() || await getFirstSourcePath();
    }
    if (!state.sourcePreview && state.rawXml) {
      state.sourcePreview = state.rawXml;
    }
    await refreshPreview();
    updateStats();
  };

  const openModal = async () => {
    ensureStyle();
    document.querySelector(`#${MODAL_NAME}`)?.remove();
    await refreshDeviceState();

    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '1180px',
      showConfirm: false,
      contentStyle: 'max-height:76vh;',
      onClose: () => true,
      content: `
        <div class="kte-wrap">
          <div class="kte-grid kte-stats">
            <div class="kte-stat">
              <div class="kte-stat-label">传感器数量</div>
              <div class="kte-stat-value" id="kte_stat_sensors">0</div>
            </div>
            <div class="kte-stat">
              <div class="kte-stat-label">温区 / 触发点 / 动作</div>
              <div class="kte-stat-value"><span id="kte_stat_zones">0</span> / <span id="kte_stat_trips">0</span> / <span id="kte_stat_actions">0</span></div>
            </div>
            <div class="kte-stat">
              <div class="kte-stat-label">资源安装状态</div>
              <div class="kte-stat-value" id="kte_stat_install">未安装</div>
            </div>
            <div class="kte-stat">
              <div class="kte-stat-label">开机自启状态</div>
              <div class="kte-stat-value" id="kte_stat_boot">未开启</div>
            </div>
          </div>

          <div class="kte-toolbar">
            <div class="kte-toolbar-top">
              <div>
                <div class="kte-card-title">操作区</div>
                <div class="kte-tip" style="margin-top:6px;">
                  当前目标: <code id="kte_active_source">${escapeHtml(state.activeSourcePath || '未检测到')}</code> ·
                  状态: <span id="kte_dirty_state" style="color:${state.dirty ? '#ffd08a' : '#9dffbf'};">${state.dirty ? '有未保存改动' : '已同步'}</span>
                </div>
              </div>
              <div class="kte-actions">
                <button id="kte_install_btn">安装</button>
                <button id="kte_uninstall_btn">卸载</button>
                <button id="kte_load_btn">读取</button>
                <button id="kte_import_btn">导入</button>
                <button id="kte_export_xml_btn">导出 XML</button>
                <button id="kte_export_conf_btn">导出加密文件</button>
                <button id="kte_save_btn">保存</button>
                <button id="kte_apply_btn">应用</button>
                <button id="kte_boot_btn">切换开机自启</button>
              </div>
            </div>
          </div>

          <details>
            <summary>查看已解密 XML 预览内容</summary>
            <pre style="background: black;color: green;" id="kte_source_preview">${escapeHtml(state.sourcePreview || '(尚未读取设备温控文件)')}</pre>
          </details>

          <div class="kte-panel">
            <div class="kte-card-title">可视化编辑</div>
            <div class="kte-tip" style="margin-top:6px;">
              可编辑项包括：<code>polling_delay</code>、<code>AvgPeriod</code>、各级 <code>temp/hyst_temp</code>，以及每个 <code>action arg</code>。
              <code>sensor_type / scenario / file / name</code> 仅展示不修改，避免破坏 thermald 配置结构。
            </div>
            <input id="kte_import_input" type="file" accept=".xml,.conf,.bin,.txt,application/xml,text/xml,application/octet-stream" style="display:none;">
            <div class="kte-sensor-list" id="kte_sensor_list" style="margin-top:12px;"></div>
          </div>
        </div>
      `,
    });

    el.style.width = '96%';
    el.querySelector('#kte_install_btn')?.addEventListener('click', installPlugin);
    el.querySelector('#kte_uninstall_btn')?.addEventListener('click', uninstallPlugin);
    el.querySelector('#kte_load_btn')?.addEventListener('click', loadAndDecrypt);
    el.querySelector('#kte_import_btn')?.addEventListener('click', openImportPicker);
    el.querySelector('#kte_export_xml_btn')?.addEventListener('click', exportXmlFile);
    el.querySelector('#kte_export_conf_btn')?.addEventListener('click', exportEncryptedFile);
    el.querySelector('#kte_save_btn')?.addEventListener('click', saveEncrypted);
    el.querySelector('#kte_apply_btn')?.addEventListener('click', applyThermal);
    el.querySelector('#kte_boot_btn')?.addEventListener('click', toggleBoot);
    el.querySelector('#kte_import_input')?.addEventListener('change', async (event) => {
      const file = event.target?.files?.[0];
      await importThermalFile(file);
    });

    showModal(id);
    renderSensors();
    updateStats();
    await refreshPreview();
  };

  while (!document.querySelector('.actions-buttons')) {
    await wait(120);
  }

  const btn = document.createElement('button');
  btn.textContent = TITLE;
  btn.onclick = async () => {
    if (!(await ensureRoot())) return;
    await openModal();
  };
  document.querySelector('.actions-buttons')?.appendChild(btn);
})();
//</script>
