//<script>
(async () => {
  const MODAL_NAME = 'kano_magisk_manager_modal';
  const STYLE_ID = 'kano_magisk_manager_style';
  const WORK_DIR = '/data/local/tmp/kano_magisk_manager';
  const MODULES_DIR = '/data/adb/modules';
  const MODULES_UPDATE_DIR = '/data/adb/modules_update';
  const MAGISK_ASSET_DIR = '/data/adb/magisk';
  // Repair assets are kept apart from the rest of Magisk's data.
  // Nothing in this directory is touched by a normal status refresh.
  const MAGISK_REPAIR_DIR = '/data/adb/minikano/magisk_repair';
  const MAGISK_REPAIR_APK = `${MAGISK_REPAIR_DIR}/uploaded.apk`;
  const MAGISK_REPAIR_LOG = `${MAGISK_REPAIR_DIR}/repair.log`;

  const state = {
    busy: false,
    showMoreStatus: false,
    magisk: {
      installed: false,
      managerInstalled: false,
      managerStub: false,
      managerPackage: '',
      managerVersionName: '-',
      managerVersionCode: '-',
      envActive: false,
      bin: '',
      version: '-',
      versionCode: '-',
      path: '-',
      zygisk: false,
      fixEnvMode: '-',
      envOk: true,
      envCheckCode: '-1',
      assetMagisk: false,
      assetBusybox: false,
      assetMagiskboot: false,
      assetMagiskinit: false,
      assetMagiskpolicy: false,
      assetMagiskVersion: '-',
    },
    modules: [],
  };

  const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
  const sq = (value) => `'${String(value || '').replace(/'/g, `'\\''`)}'`;
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
  const run = async (command, timeout = 30000) => {
    const res = await runShellWithRoot(command, timeout);
    return {
      ok: Boolean(res?.success),
      text: String(res?.content || '').trim(),
      raw: res,
    };
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .mm-wrap {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      #${MODAL_NAME} .mm-card,
      #${MODAL_NAME} .mm-hero,
      #${MODAL_NAME} .mm-module {
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.04);
      }
      #${MODAL_NAME} .mm-hero,
      #${MODAL_NAME} .mm-card,
      #${MODAL_NAME} .mm-module {
        padding: 14px;
      }
      #${MODAL_NAME} .mm-hero {
        position: relative;
        overflow: hidden;
      }
      #${MODAL_NAME} .mm-hero::after {
        content: '';
        position: absolute;
        right: -20px;
        bottom: -38px;
        width: 130px;
        height: 130px;
        border-radius: 999px;
        background: radial-gradient(circle, rgba(255,165,90,.22), transparent 68%);
      }
      #${MODAL_NAME} .mm-title {
        margin: 0 0 8px;
        font-size: .98rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .mm-sub {
        font-size: .68rem;
        line-height: 1.75;
        opacity: .86;
      }
      #${MODAL_NAME} .mm-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      #${MODAL_NAME} .mm-stat-label {
        font-size: .62rem;
        opacity: .66;
        margin-bottom: 5px;
      }
      #${MODAL_NAME} .mm-stat-value {
        font-size: .84rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .mm-row {
        display: flex;
        flex-wrap: wrap;
        flex-shrink: 0;
        gap: 10px;
        align-items: center;
      }
      #${MODAL_NAME} .mm-row button {
        min-width: 110px;
      }
      #${MODAL_NAME} .mm-file-name {
        font-size: .64rem;
        opacity: .8;
        word-break: break-all;
      }
      #${MODAL_NAME} .mm-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: .62rem;
        font-weight: 700;
        background: rgba(255,255,255,.08);
      }
      #${MODAL_NAME} .mm-ok {
        color: #95ffb2;
        background: rgba(89,212,130,.16);
      }
      #${MODAL_NAME} .mm-warn {
        color: #ffc299;
        background: rgba(255,144,84,.16);
      }
      #${MODAL_NAME} .mm-bad {
        color: #ffb0b0;
        background: rgba(255,80,80,.16);
      }
      #${MODAL_NAME} .mm-section-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        font-size: .78rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .mm-kv {
        display: grid;
        grid-template-columns: 110px minmax(0, 1fr);
        gap: 6px 10px;
        font-size: .67rem;
        line-height: 1.65;
      }
      #${MODAL_NAME} .mm-kv .k {
        opacity: .68;
      }
      #${MODAL_NAME} .mm-kv .v {
        word-break: break-all;
      }
      #${MODAL_NAME} .mm-modules {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #${MODAL_NAME} .mm-module-head {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: flex-start;
        margin-bottom: 8px;
      }
      #${MODAL_NAME} .mm-module-title {
        font-size: .8rem;
        font-weight: 800;
        word-break: break-word;
      }
      #${MODAL_NAME} .mm-module-desc {
        font-size: .66rem;
        line-height: 1.7;
        opacity: .82;
        margin-top: 6px;
        word-break: break-word;
      }
      #${MODAL_NAME} .mm-module-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      #${MODAL_NAME} .mm-empty {
        font-size: .68rem;
        line-height: 1.7;
        opacity: .78;
      }
      @media (max-width: 760px) {
        #${MODAL_NAME} .mm-grid {
          grid-template-columns: 1fr 1fr;
        }
        #${MODAL_NAME} .mm-kv {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  };

  const ensureProgressUI = () => {
    let panel = document.querySelector('#mm_progress_panel');
    if (panel) return panel;
    const html = `
<div id="mm_progress_panel" style="
  position:fixed;
  left:50%;
  top:20px;
  transform:translateX(-50%);
  z-index:999999;
  min-width:300px;
  max-width:92vw;
  background:rgba(30,30,30,0.97);
  color:#ff9f1a;
  border:1px solid rgba(255,159,26,0.35);
  border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,0.28);
  padding:12px 14px;
  display:none;
">
  <div id="mm_progress_text" style="
    font-size:13px;
    line-height:1.4;
    margin-bottom:8px;
    word-break:break-all;
  ">正在准备下载...</div>
  <div style="
    width:100%;
    height:8px;
    background:rgba(255,255,255,0.12);
    border-radius:999px;
    overflow:hidden;
  ">
    <div id="mm_progress_bar" style="
      width:0%;
      height:100%;
      background:#ff9f1a;
      border-radius:999px;
      transition:width .2s ease;
    "></div>
  </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    return document.querySelector('#mm_progress_panel');
  };

  const showProgress = (text, percent) => {
    ensureProgressUI();
    const panel = document.querySelector('#mm_progress_panel');
    const textEl = document.querySelector('#mm_progress_text');
    const bar = document.querySelector('#mm_progress_bar');
    if (panel) panel.style.display = 'block';
    if (textEl) textEl.textContent = text || '处理中...';
    if (bar) {
      const p = Math.max(0, Math.min(100, Number(percent) || 0));
      bar.style.width = `${p}%`;
    }
  };

  const hideProgress = () => {
    const panel = document.querySelector('#mm_progress_panel');
    if (panel) panel.style.display = 'none';
  };

  const parseKeyValue = (text) => {
    const out = {};
    String(text || '')
      .split('\n')
      .forEach((line) => {
        const idx = line.indexOf('=');
        if (idx < 0) return;
        out[line.slice(0, idx).trim()] = clean(line.slice(idx + 1));
      });
    return out;
  };

  const parseModules = (text) =>
    String(text || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split('\t'))
      // Shell bridge errors are plain text. A valid record always has the
      // complete tab-separated shape emitted by fetchModules below.
      .filter((parts) => (
        parts.length === 12
        && (clean(parts[6]) === 'modules' || clean(parts[6]) === 'modules_update')
        && /^\/data\/adb\/modules(?:_update)?\//.test(clean(parts[5]))
        && Boolean(clean(parts[0]))
      ))
      .map((parts) => {
        const [
          id,
          name,
          version,
          author,
          description,
          dir,
          source,
          enabled,
          remove,
          zygisk,
          unloaded,
          updated,
        ] = parts;
        return {
          id: clean(id),
          name: clean(name) || clean(id),
          version: clean(version) || '-',
          author: clean(author) || '-',
          description: clean(description) || '-',
          dir: clean(dir),
          source: clean(source) || 'modules',
          enabled: enabled === '1',
          remove: remove === '1',
          zygisk: zygisk === '1',
          unloaded: unloaded === '1',
          updated: updated === '1',
          pendingReboot: clean(source) === 'modules_update' || updated === '1',
        };
      });

  const dedupeModules = (modules) => {
    const byId = new Map();
    const rank = (module) => {
      if (module.source === 'modules_update') return 3;
      if (module.pendingReboot) return 2;
      return 1;
    };
    for (const module of modules) {
      const key = module.id || module.dir;
      const prev = byId.get(key);
      if (!prev || rank(module) > rank(prev)) {
        byId.set(key, module);
      }
    }
    return Array.from(byId.values());
  };

  const fetchMagiskState = async () => {
    const app = await getInstalledMagiskApp();
    const infoRes = await run(`
MAGISK_BIN="$(command -v magisk 2>/dev/null)"
ASSET_MAGISK="/data/adb/magisk/magisk"
echo "assetMagisk=$([ -x "$ASSET_MAGISK" ] && echo 1 || echo 0)"
echo "assetBusybox=$([ -x /data/adb/magisk/busybox ] && echo 1 || echo 0)"
echo "assetMagiskboot=$([ -x /data/adb/magisk/magiskboot ] && echo 1 || echo 0)"
echo "assetMagiskinit=$([ -x /data/adb/magisk/magiskinit ] && echo 1 || echo 0)"
echo "assetMagiskpolicy=$([ -x /data/adb/magisk/magiskpolicy ] && echo 1 || echo 0)"
if [ -x "$ASSET_MAGISK" ]; then
  echo "assetMagiskVersion=$("$ASSET_MAGISK" -V 2>/dev/null | tr -d '\\r')"
else
  echo "assetMagiskVersion=-"
fi
echo "installed=$([ -n "$MAGISK_BIN" ] && echo 1 || echo 0)"
echo "bin=$MAGISK_BIN"
if [ -n "$MAGISK_BIN" ]; then
  version="$(magisk -v 2>/dev/null | tr -d '\\r')"
  versionCode="$(magisk -V 2>/dev/null | tr -d '\\r')"
  echo "version=$version"
  echo "versionCode=$versionCode"
  echo "path=$(magisk --path 2>/dev/null | tr -d '\\r')"
  zygisk_raw="$(magisk --sqlite "SELECT value AS value FROM settings WHERE key='zygisk';" 2>/dev/null | awk -F'[=|]' 'NR==1{for(i=1;i<=NF;i++) if($i=="value"){print $(i+1); exit}}')"
  [ -z "$zygisk_raw" ] && zygisk_raw=0
  echo "zygisk=$zygisk_raw"
  # Status refresh is read-only and deliberately does not treat Magisk's
  # private /data/adb/magisk layout as a health/version verdict. Layouts can
  # differ between official and debug builds. The repair flow validates the
  # selected APK against magisk -V immediately before it writes anything.
  echo "envOk=1"
  echo "envCheckCode=not_checked"
else
  echo "version=-"
  echo "versionCode=-"
  echo "path=-"
  echo "zygisk=0"
  echo "envOk=1"
  echo "envCheckCode=-1"
fi
echo "fixEnvMode=$([ -f /data/adb/magisk/app_functions.sh ] && [ -f /data/adb/magisk/util_functions.sh ] && [ -f /data/adb/magisk/boot_patch.sh ] && echo bundled || echo fallback)"
`, 20000);
    const data = parseKeyValue(infoRes.text);
    const envActive = data.installed === '1';
    const assetMagisk = data.assetMagisk === '1';
    const assetBusybox = data.assetBusybox === '1';
    const assetMagiskboot = data.assetMagiskboot === '1';
    const assetMagiskinit = data.assetMagiskinit === '1';
    const assetMagiskpolicy = data.assetMagiskpolicy === '1';
    state.magisk = {
      installed: app.installed || envActive,
      managerInstalled: app.installed,
      managerStub: app.isStub,
      managerPackage: app.packageName || '',
      managerVersionName: app.versionName || '-',
      managerVersionCode: app.versionCode > 0 ? String(app.versionCode) : '-',
      envActive,
      bin: data.bin || '',
      version: data.version || '-',
      versionCode: data.versionCode || '-',
      path: data.path || '-',
      zygisk: data.zygisk === '1',
      fixEnvMode: data.fixEnvMode || '-',
      envOk: data.envOk !== '0',
      envCheckCode: data.envCheckCode || '-1',
      assetMagisk,
      assetBusybox,
      assetMagiskboot,
      assetMagiskinit,
      assetMagiskpolicy,
      assetMagiskVersion: data.assetMagiskVersion || '-',
    };
  };

  const fetchModules = async () => {
    const res = await run(`
prop() {
  key="$1"
  file="$2"
  timeout 2s awk -F= -v K="$key" '$1==K { sub(/\\r$/, "", $0); print substr($0, index($0, "=") + 1); exit }' "$file" 2>/dev/null | tr '\\t\\r\\n' '   '
}
for base in ${sq(MODULES_DIR)} ${sq(MODULES_UPDATE_DIR)}; do
  [ -d "$base" ] || continue
  src="modules"
  [ "$base" = ${sq(MODULES_UPDATE_DIR)} ] && src="modules_update"
  for dir in "$base"/*; do
    [ -d "$dir" ] || continue
    [ -f "$dir/module.prop" ] || continue
    id="$(prop id "$dir/module.prop")"
    name="$(prop name "$dir/module.prop")"
    version="$(prop version "$dir/module.prop")"
    author="$(prop author "$dir/module.prop")"
    description="$(prop description "$dir/module.prop")"
    [ -z "$id" ] && id="$(basename "$dir")"
    [ -z "$name" ] && name="$id"
    printf '%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\t%s\\n' \
      "$id" "$name" "$version" "$author" "$description" "$dir" "$src" \
      "$([ -f "$dir/disable" ] && echo 0 || echo 1)" \
      "$([ -f "$dir/remove" ] && echo 1 || echo 0)" \
      "$([ -d "$dir/zygisk" ] && echo 1 || echo 0)" \
      "$([ -f "$dir/zygisk/unloaded" ] && echo 1 || echo 0)" \
      "$([ -f "$dir/update" ] && echo 1 || echo 0)"
  done
done
`, 30000);
    if (!res.ok) {
      // During reboot the socat/root bridge may vanish briefly. Never render
      // its error string as a fake module; the next refresh will retry.
      state.modules = [];
      return;
    }
    state.modules = dedupeModules(parseModules(res.text)).sort((a, b) => {
      if (a.pendingReboot !== b.pendingReboot) return a.pendingReboot ? -1 : 1;
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  };

  const refreshAll = async (toast = false) => {
    state.busy = true;
    render();
    await fetchMagiskState();
    await fetchModules();
    state.busy = false;
    render();
    if (toast) createToast('Magisk 状态已刷新', 'pink');
    if (!state.magisk.managerInstalled) {
      createToast('未检测到已安装的 Magisk 管理器；请先自行安装与 Boot 对应的 Magisk APK。', 'pink', 5000);
    }
    if (state.magisk.managerInstalled && state.magisk.managerStub) {
      createToast('当前检测到的是 Magisk Stub 占位包', 'pink', 4000);
    }
    if (state.magisk.managerInstalled && !state.magisk.envActive) {
      createToast(`${state.magisk.managerStub ? '当前是 Stub 占位包' : 'Magisk.apk 已安装'}，但当前 Magisk 环境未激活；如需修复，请上传与 Boot Magisk 同版本的 APK。`, 'pink', 5000);
    }
    if (state.magisk.envActive && !state.magisk.envOk && state.magisk.envCheckCode !== '-1') {
      createToast('核心文件不完整或与 Boot 版本不匹配；如需修复，请上传与 Boot Magisk 同版本的 APK。', 'pink', 5000);
    }
  };

  const uploadFileToDevice = async (file, destPath, chmod = '644') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await (await fetch(`${KANO_baseURL}/upload_img`, {
        method: 'POST',
        headers: common_headers,
        body: formData,
      })).json();
      if (!uploadRes?.url) {
        return { ok: false, message: uploadRes?.error || '上传失败' };
      }
      const tempPath = `/data/data/com.minikano.f50_sms/files${uploadRes.url}`;
      const moveRes = await run(`
mkdir -p ${sq(WORK_DIR)}
mkdir -p ${sq(destPath.replace(/\/[^/]+$/, ''))}
mv ${sq(tempPath)} ${sq(destPath)}
chmod ${chmod} ${sq(destPath)}
`, 20000);
      return moveRes.ok
        ? { ok: true, path: destPath }
        : { ok: false, message: moveRes.text || '移动文件失败' };
    } catch (error) {
      console.error(error);
      return { ok: false, message: String(error || '上传异常') };
    }
  };

  const getRunningMagiskVersionCode = async () => {
    const res = await run(`magisk -V 2>/dev/null | tr -d '\\r\\n'`, 8000);
    const versionCode = parseInt(clean(res.text || ''), 10);
    return Number.isFinite(versionCode) && versionCode > 0 ? versionCode : -1;
  };

  const getRunningMagiskInfo = async () => {
    const res = await run(`
code="$(magisk -V 2>/dev/null | tr -d '\\r\\n')"
version="$(magisk -v 2>/dev/null | tr -d '\\r\\n')"
case "$code" in ''|*[!0-9]*) code=- ;; esac
echo "code=$code"
echo "version=$version"
`, 8000);
    const data = parseKeyValue(res.text);
    const code = parseInt(data.code || '-1', 10);
    return {
      code: Number.isFinite(code) && code > 0 ? code : -1,
      version: data.version || '-',
    };
  };

  const selectRepairApk = () => new Promise((resolve) => {
    const input = document.createElement('input');
    let settled = false;
    let pickerLostFocus = false;
    const done = (file) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file || null);
    };
    input.type = 'file';
    input.accept = '.apk,application/vnd.android.package-archive,application/octet-stream';
    input.onchange = () => {
      done(input.files?.[0] || null);
    };
    input.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:.001';
    document.body.appendChild(input);
    // Some WebViews do not emit change when the picker is cancelled.
    window.addEventListener('blur', () => { pickerLostFocus = true; }, { once: true });
    window.addEventListener('focus', () => {
      if (pickerLostFocus) setTimeout(() => done(input.files?.[0] || null), 250);
    }, { once: true });
    input.click();
  });

  const inspectRepairApk = async (apkPath, stageDir) => {
    const res = await run(`
APK=${sq(apkPath)}
STAGE=${sq(stageDir)}
mkdir -p ${sq(MAGISK_REPAIR_DIR)} "$STAGE" || exit 20
[ -s "$APK" ] || exit 21
if command -v unzip >/dev/null 2>&1; then
  UNZIP="unzip"
elif command -v busybox >/dev/null 2>&1; then
  UNZIP="busybox unzip"
else
  exit 22
fi
extract() {
  $UNZIP -p "$APK" "$1" > "$2" 2>/dev/null
  [ $? -eq 0 ] && [ -s "$2" ]
}
for script in app_functions.sh util_functions.sh boot_patch.sh; do
  extract "assets/$script" "$STAGE/$script" || { echo "error=APK 缺少或无法读取 assets/$script"; exit 23; }
done
code="$(awk -F= '/^MAGISK_VER_CODE=/{gsub(/[[:space:]]/, "", $2); print $2; exit}' "$STAGE/util_functions.sh")"
version="$(awk -F= '/^MAGISK_VER=/{print $2; exit}' "$STAGE/util_functions.sh")"
case "$code" in ''|*[!0-9]*) echo "error=APK 中 MAGISK_VER_CODE 无效"; exit 24 ;; esac
[ "$code" -gt 0 ] 2>/dev/null || { echo "error=APK 中 MAGISK_VER_CODE 无效"; exit 24; }
abi_raw="$(getprop ro.product.cpu.abi 2>/dev/null) $(getprop ro.product.cpu.abilist 2>/dev/null | tr ',' ' ')"
abi=""
for candidate in $abi_raw; do
  case "$candidate" in arm64-v8a|armeabi-v7a|x86_64|x86) abi="$candidate"; break ;; esac
done
[ -n "$abi" ] || { echo "error=无法识别设备 ABI：$abi_raw"; exit 25; }
for pair in busybox:libbusybox.so magisk:libmagisk.so magiskboot:libmagiskboot.so magiskinit:libmagiskinit.so magiskpolicy:libmagiskpolicy.so; do
  name="\${pair%%:*}"; lib="\${pair#*:}"
  extract "lib/$abi/$lib" "$STAGE/$name" || { echo "error=APK 的 $abi 缺少 $lib"; exit 26; }
done
extract "lib/$abi/libinit-ld.so" "$STAGE/init-ld" || rm -f "$STAGE/init-ld"
chmod 755 "$STAGE"/busybox "$STAGE"/magisk "$STAGE"/magiskboot "$STAGE"/magiskinit "$STAGE"/magiskpolicy "$STAGE"/*.sh
[ ! -e "$STAGE/init-ld" ] || chmod 755 "$STAGE/init-ld"
echo "version=$version"
echo "versionCode=$code"
echo "abi=$abi"
echo "stage=$STAGE"
`, 45000);
    const data = parseKeyValue(res.text);
    const versionCode = parseInt(data.versionCode || '-1', 10);
    if (!res.ok || !Number.isFinite(versionCode) || versionCode <= 0 || !data.abi) {
      return { ok: false, message: data.error || res.text || '无法校验上传的 Magisk APK' };
    }
    return {
      ok: true,
      version: String(data.version || '-').replace(/^['"]|['"]$/g, ''),
      versionCode,
      abi: data.abi,
      stageDir,
    };
  };

  const getInstalledMagiskApp = async () => {
    const res = await run(`
pkg="$(pm list packages 2>/dev/null | awk -F: '/com\\.topjohnwu\\.magisk$/{print $2; exit}')"
if [ -z "$pkg" ]; then
  echo "installed=0"
  exit 0
fi
dump="$(dumpsys package "$pkg" 2>/dev/null)"
vc="$(printf '%s\\n' "$dump" | awk -F= '/versionCode=/{print $2; exit}' | awk '{print $1}')"
vn="$(printf '%s\\n' "$dump" | awk -F= '/versionName=/{print $2; exit}')"
echo "installed=1"
echo "package=$pkg"
echo "versionCode=$vc"
echo "versionName=$(printf '%s' "$vn" | tr -d '\\r')"
`, 20000);
    const data = parseKeyValue(res.text);
    return {
      installed: data.installed === '1',
      isStub: data.installed === '1' && (parseInt(data.versionCode || '-1', 10) || -1) === 1,
      packageName: data.package || '',
      versionCode: parseInt(data.versionCode || '-1', 10) || -1,
      versionName: data.versionName || '-',
    };
  };

  const setZygisk = async (enabled) => {
    const value = enabled ? 1 : 0;
    const res = await run(`
magisk --sqlite "DELETE FROM settings WHERE key='zygisk';"
magisk --sqlite "INSERT INTO settings (key,value) VALUES ('zygisk',${value});"
`, 20000);
    return {
      ok: res.ok,
      message: res.ok ? `Zygisk 已${enabled ? '启用' : '关闭'}，需要重启设备后生效` : (res.text || '切换失败'),
    };
  };

  const toggleModuleEnabled = async (module) => {
    const res = await run(`
DIR=${sq(module.dir)}
if [ -f "$DIR/disable" ]; then
  rm -f "$DIR/disable"
  copy_preinit_files >/dev/null 2>&1 || true
  echo "__DONE__=1"
else
  touch "$DIR/disable"
  copy_preinit_files >/dev/null 2>&1 || true
  echo "__DONE__=1"
fi
`, 20000);
    return { ok: res.ok && res.text.includes('__DONE__=1'), message: res.ok ? '模块状态已更新，需要重启设备后生效' : (res.text || '操作失败') };
  };

  const toggleModuleRemove = async (module) => {
    const res = await run(`
DIR=${sq(module.dir)}
if [ -f "$DIR/remove" ]; then
  rm -f "$DIR/remove"
  copy_preinit_files >/dev/null 2>&1 || true
  echo "__DONE__=1"
else
  touch "$DIR/remove"
  copy_preinit_files >/dev/null 2>&1 || true
  echo "__DONE__=1"
fi
`, 20000);
    return { ok: res.ok && res.text.includes('__DONE__=1'), message: res.ok ? '卸载标记已更新，需要重启设备后执行' : (res.text || '操作失败') };
  };

  const installModuleZip = async (file) => {
    const safeName = String(file?.name || 'module.zip').replace(/[^\w.\-]+/g, '_') || 'module.zip';
    const target = `${WORK_DIR}/${safeName}`;
    const uploaded = await uploadFileToDevice(file, target);
    if (!uploaded.ok) return uploaded;
    const installRes = await run(`magisk --install-module ${sq(target)}`, 300000);
    await run(`rm -f ${sq(target)}`, 10000);
    return {
      ok: installRes.ok,
      message: installRes.ok ? '模块安装成功，当前会显示为待重启生效，需要重启设备后完成挂载' : (installRes.text || '模块安装失败'),
      log: installRes.text || '',
    };
  };

  const applyStagedRepair = async (apk, stage, expectedCode) => {
    const backupDir = `${MAGISK_REPAIR_DIR}/backup-${Date.now()}`;
    const started = await run(`
ASSET=${sq(MAGISK_ASSET_DIR)}
STAGE=${sq(stage)}
BACKUP=${sq(backupDir)}
LOG=${sq(MAGISK_REPAIR_LOG)}
EXPECTED=${sq(String(expectedCode))}
mkdir -p ${sq(MAGISK_REPAIR_DIR)} || exit 30
: > "$LOG" || exit 31
(
  echo "repair_start=$(date '+%Y-%m-%d %H:%M:%S')"
  echo "apk=${sq(apk)}"
  echo "stage=$STAGE"
  echo "expected_version_code=$EXPECTED"
  backup_ready=0
  fail() { echo "repair_failed=$1"; [ "$backup_ready" = 1 ] && rollback; exit "$1"; }
  rollback() {
    echo "rollback=begin"
    [ -d "$BACKUP" ] || return
    for file in busybox magisk magiskboot magiskinit magiskpolicy init-ld app_functions.sh util_functions.sh boot_patch.sh; do
      if [ -f "$BACKUP/present/$file" ]; then
        cp -af "$BACKUP/$file" "$ASSET/$file" || echo "rollback_copy_failed=$file"
      else
        rm -f "$ASSET/$file"
      fi
    done
    echo "rollback=end"
  }
  for file in busybox magisk magiskboot magiskinit magiskpolicy app_functions.sh util_functions.sh boot_patch.sh; do
    [ -s "$STAGE/$file" ] || { echo "missing_stage=$file"; exit 32; }
  done
  stage_code="$(awk -F= '/^MAGISK_VER_CODE=/{gsub(/[[:space:]]/, "", $2); print $2; exit}' "$STAGE/util_functions.sh")"
  case "$stage_code" in ''|*[!0-9]*) echo "invalid_stage_version=1"; exit 33 ;; esac
  [ "$stage_code" = "$EXPECTED" ] || { echo "stage_version_mismatch=$stage_code"; exit 34; }
  mkdir -p "$ASSET" "$BACKUP/present" || exit 35
  chmod 700 /data/adb 2>/dev/null || true
  for file in busybox magisk magiskboot magiskinit magiskpolicy init-ld app_functions.sh util_functions.sh boot_patch.sh; do
    if [ -e "$ASSET/$file" ]; then
      cp -af "$ASSET/$file" "$BACKUP/$file" || fail 36
      : > "$BACKUP/present/$file" || fail 37
    fi
  done
  backup_ready=1
  for file in busybox magisk magiskboot magiskinit magiskpolicy app_functions.sh util_functions.sh boot_patch.sh; do
    cp -f "$STAGE/$file" "$ASSET/.$file.new" || fail 38
    chmod 755 "$ASSET/.$file.new" || fail 39
    chown 0:0 "$ASSET/.$file.new" 2>/dev/null || true
  done
  if [ -s "$STAGE/init-ld" ]; then
    cp -f "$STAGE/init-ld" "$ASSET/.init-ld.new" || fail 40
    chmod 755 "$ASSET/.init-ld.new" || fail 41
    chown 0:0 "$ASSET/.init-ld.new" 2>/dev/null || true
  fi
  for file in busybox magisk magiskboot magiskinit magiskpolicy app_functions.sh util_functions.sh boot_patch.sh; do
    mv -f "$ASSET/.$file.new" "$ASSET/$file" || fail 42
  done
  if [ -s "$STAGE/init-ld" ]; then
    mv -f "$ASSET/.init-ld.new" "$ASSET/init-ld" || fail 43
  else
    rm -f "$ASSET/init-ld"
  fi
  for file in busybox magisk magiskboot magiskinit magiskpolicy app_functions.sh util_functions.sh boot_patch.sh; do
    [ -s "$ASSET/$file" ] || fail 44
  done
  written_code="$(awk -F= '/^MAGISK_VER_CODE=/{gsub(/[[:space:]]/, "", $2); print $2; exit}' "$ASSET/util_functions.sh")"
  [ "$written_code" = "$EXPECTED" ] || fail 45
  echo "repair_success=1"
) > "$LOG" 2>&1
exit $?
`, 90000);
    const logRes = await run(`timeout 3s awk '{print}' ${sq(MAGISK_REPAIR_LOG)} 2>/dev/null`, 8000);
    const log = logRes.text || '';
    return {
      ok: started.ok && log.includes('repair_success=1'),
      backupDir,
      log,
      message: started.ok && log.includes('repair_success=1')
        ? `修复完成，核心文件已由 APK ${expectedCode} 写入。请重启设备。`
        : `修复失败，已尝试自动回滚。日志：${MAGISK_REPAIR_LOG}`,
    };
  };

  const installUploadedMagiskApk = async (apk, uploadedVersionCode) => {
    const first = await run(`pm install -r ${sq(apk)}`, 120000);
    if (first.ok && /Success/i.test(first.text)) {
      return { ok: true, message: '上传的 Magisk APK 已安装。' };
    }

    const output = first.text || 'Magisk APK 安装失败';
    const signatureConflict = /INSTALL_FAILED_(UPDATE_INCOMPATIBLE|SHARED_USER_INCOMPATIBLE|INCONSISTENT_CERTIFICATES)/i.test(output);
    const downgrade = /INSTALL_FAILED_VERSION_DOWNGRADE/i.test(output);
    if (!signatureConflict && !downgrade) {
      return { ok: false, message: output };
    }

    const installed = await getInstalledMagiskApp();
    if (!installed.installed || !installed.packageName) {
      return {
        ok: false,
        message: `${signatureConflict ? '检测到签名冲突' : '检测到版本降级'}，但无法确定已安装的 Magisk 包，未自动卸载：${output}`,
      };
    }
    if (installed.isStub) {
      // The 1.0 Stub is only a placeholder package, not a real Manager
      // installation. Remove it silently so a debug-signed Manager can take
      // its place without showing the "uninstall old version" warning.
      const removeStub = await run(`pm uninstall ${sq(installed.packageName)}`, 120000);
      if (!removeStub.ok || !/Success/i.test(removeStub.text)) {
        return { ok: false, message: removeStub.text || '自动移除 Magisk Stub 占位包失败。' };
      }
      const installAfterStub = await run(`pm install ${sq(apk)}`, 120000);
      if (installAfterStub.ok && /Success/i.test(installAfterStub.text)) {
        return { ok: true, replaced: true, message: '已自动移除 Magisk Stub 占位包并安装上传的 APK。' };
      }
      return { ok: false, message: `已移除 Magisk Stub 占位包，但安装上传 APK 失败：${installAfterStub.text || '未知错误'}` };
    }
    const reason = signatureConflict
      ? '签名不一致（通常是不同签名的 debug/官方 APK）'
      : '已安装版本高于上传 APK';
    // The caller shows an install progress panel. It must not sit above the
    // destructive-action confirmation dialog.
    hideProgress();
    const confirmed = await askConfirm(
      'mm_install_uploaded_conflict',
      'Magisk APK 安装冲突',
      `检测到${reason}。<br/>已安装：${esc(installed.versionName)} (${installed.versionCode})<br/>上传 APK 的 Magisk 版本码：${uploadedVersionCode}<br/><br/>是否自动卸载已安装的 Magisk 管理器后继续安装？这不会修改 Boot 或 /data/adb/magisk。`,
      '卸载旧版并继续',
    );
    if (!confirmed) return { cancelled: true };

    const uninstall = await run(`pm uninstall ${sq(installed.packageName)}`, 120000);
    if (!uninstall.ok || !/Success/i.test(uninstall.text)) {
      return { ok: false, message: uninstall.text || '自动卸载旧版 Magisk 管理器失败。' };
    }
    const retry = await run(`pm install ${sq(apk)}`, 120000);
    if (retry.ok && /Success/i.test(retry.text)) {
      return { ok: true, replaced: true, message: '已卸载冲突版本并安装上传的 Magisk APK。' };
    }
    return { ok: false, message: `旧版已卸载，但安装上传 APK 失败：${retry.text || '未知错误'}` };
  };

  const repairEnv = async () => {
    const file = await selectRepairApk();
    if (!file) return { ok: false, message: '未选择 Magisk APK，未修改 Magisk 环境。' };
    if (!/\.apk$/i.test(String(file.name || ''))) {
      return { ok: false, message: '只接受 .apk 文件；文件名仅用于类型筛选，实际内容仍会解包校验。' };
    }
    if (!file.size) return { ok: false, message: '上传文件为空，未修改 Magisk 环境。' };

    showProgress('正在上传 Magisk APK…', 5);
    const uploaded = await uploadFileToDevice(file, MAGISK_REPAIR_APK);
    if (!uploaded.ok) {
      hideProgress();
      return { ok: false, message: uploaded.message || '上传失败，未修改 Magisk 环境。' };
    }
    const stage = `${MAGISK_REPAIR_DIR}/stage-${Date.now()}`;
    showProgress('正在解包并校验 APK 资源…', 35);
    const inspected = await inspectRepairApk(MAGISK_REPAIR_APK, stage);
    hideProgress();
    if (!inspected.ok) return inspected;

    const boot = await getRunningMagiskInfo();
    const details = `上传 APK：${esc(inspected.version)} (${inspected.versionCode})<br/>将使用的 ABI：${esc(inspected.abi)}<br/>当前 Boot Magisk：${boot.code > 0 ? `${esc(boot.version)} (${boot.code})` : '无法读取 magisk -V'}<br/><br/>确认后会先安装此 APK，再替换 /data/adb/magisk 的核心二进制和脚本；模块、DenyList 与其他 /data/adb 内容不会被删除。`;
    if (boot.code > 0 && boot.code !== inspected.versionCode) {
      return {
        ok: false,
        blocked: true,
        message: `安全拒绝：上传 APK 为 ${inspected.versionCode}，当前 Boot Magisk 为 ${boot.code}。不同版本资源可能破坏 /data/adb/magisk，请上传与 Boot 相同版本的 Magisk APK。`,
      };
    }
    const confirmed = await askConfirm(
      'mm_dynamic_repair_confirm',
      '确认使用上传的 Magisk APK 修复',
      details,
      '开始修复',
    );
    if (!confirmed) return { cancelled: true };
    if (boot.code <= 0) {
      const force = await askConfirm(
        'mm_dynamic_repair_force_confirm',
        '无法验证 Boot 版本：强制修复确认',
        `无法读取当前 Boot Magisk 的 magisk -V。继续会使用 APK ${inspected.versionCode} 写入核心资产，若版本不一致可能损坏 /data/adb/magisk。确认强制修复吗？`,
        '我了解风险，强制修复',
      );
      if (!force) return { cancelled: true };
    }

    showProgress('正在安装上传的 Magisk APK…', 60);
    const installedApk = await installUploadedMagiskApk(MAGISK_REPAIR_APK, inspected.versionCode);
    hideProgress();
    if (!installedApk.ok) return installedApk;

    // Re-read immediately before writing in case the boot environment changed
    // while the confirmation dialog was open.
    const beforeWrite = await getRunningMagiskInfo();
    if (beforeWrite.code > 0 && beforeWrite.code !== inspected.versionCode) {
      return { ok: false, blocked: true, message: `安全拒绝：确认后检测到 Boot Magisk 为 ${beforeWrite.code}，上传 APK 为 ${inspected.versionCode}。未写入任何 Magisk 核心文件。` };
    }
    if (beforeWrite.code <= 0 && boot.code > 0) {
      const forceAgain = await askConfirm(
        'mm_dynamic_repair_recheck_force_confirm',
        'Boot 版本复核失败',
        '确认后无法再次读取 magisk -V，无法保证 Boot 环境未变化。是否在风险已知的情况下继续？',
        '继续强制修复',
      );
      if (!forceAgain) return { cancelled: true };
    }
    showProgress('正在备份并原子替换 Magisk 核心文件…', 75);
    const result = await applyStagedRepair(MAGISK_REPAIR_APK, inspected.stageDir, inspected.versionCode);
    hideProgress();
    return result;
  };

  const askConfirm = (id, title, body, ok = '确认', cancel = '取消') => new Promise((resolve) => {
    const { el, close } = createFixedToast(
      id,
      `<div style="pointer-events:all;width:90vw;max-width:520px;">
        <div class="title" style="margin:0">${title}</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.75">${body}</div>
        <div style="margin-top:14px;text-align:right;display:flex;justify-content:flex-end;gap:10px;">
          <button class="ok">${ok}</button>
          <button class="cancel">${cancel}</button>
        </div>
      </div>`,
    );
    const done = (value) => {
      close();
      resolve(value);
    };
    el.querySelector('.ok')?.addEventListener('click', () => done(true));
    el.querySelector('.cancel')?.addEventListener('click', () => done(false));
  });

  const rebootDevice = async () => {
    const first = await askConfirm(
      'mm_reboot_confirm_1',
      '确认重启设备',
      '设备将立即执行重启。请先确认当前没有正在进行中的操作。',
      '继续',
    );
    if (!first) return { cancelled: true };
    const second = await askConfirm(
      'mm_reboot_confirm_2',
      '再次确认重启',
      '重启后当前页面会中断，未保存的内容可能丢失。确认现在重启吗？',
      '立即重启',
    );
    if (!second) return { cancelled: true };
    const res = await run('reboot', 15000);
    return {
      ok: res.ok,
      message: res.ok ? '重启命令已发送' : (res.text || '重启失败'),
    };
  };

  const clearMagiskEnv = async () => {
    const first = await askConfirm(
      'mm_clear_env_confirm_1',
      '确认清除 Magisk 环境',
      '清除Magisk环境可以排查模块和环境故障，此操作将清除 Magisk 环境和所有已安装的模块，但不会还原boot为未修补状态。请先确认当前没有正在进行中的操作。',
      '继续',
    );
    if (!first) return { cancelled: true };
    const second = await askConfirm(
      'mm_clear_env_confirm_2',
      '再次确认清除',
      '您的 Magisk 环境和模块将被完全清除（rm -rf /data/adb），重启后会恢复回已安装但需要修复环境的状态。确认现在清除吗？',
      '立即清除',
    );
    if (!second) return { cancelled: true };
    const res = await run(`rm -rf /cache/*magisk* /cache/unblock /data/*magisk* /data/cache/*magisk* /data/property/*magisk* /data/Magisk.apk /data/custom_ramdisk_patch.sh /data/adb/*magisk* /data/adb/post-fs-data.d /data/adb/service.d /data/adb/modules* /data/unencrypted/magisk /metadata/magisk /metadata/watchdog/magisk /persist/magisk /mnt/vendor/persist/magisk`, 15000);
    return {
      ok: res.ok,
      message: res.ok ? 'Magisk 环境已清除，重启生效' : (res.text || '清除失败'),
    };
  };

  const chip = (text, kind) => `<span class="mm-chip ${kind}">${esc(text)}</span>`;

  const renderOverview = () => {
    const status = !state.magisk.managerInstalled
      ? chip('未检测到', 'mm-bad')
      : (state.magisk.managerStub ? chip('Stub 占位包', 'mm-warn') : chip('已安装', 'mm-ok'));
    const zygisk = state.magisk.envActive
      ? (state.magisk.zygisk ? chip('已启用', 'mm-ok') : chip('已关闭', 'mm-warn'))
      : chip('环境未激活', 'mm-warn');
    return `
      <div class="mm-hero">
        <div class="mm-sub">
          可以在这里管理模块和 Zygisk。新安装或刚更新的模块会显示“待重启生效”，重启后正式生效；环境异常时也会提示修复。<br/>
          如果你还没Root，请去Root，如果你已经Root了但环境异常，请先点击修复环境，修复完成后重启设备。<br/>
        </div>
      </div>
      <div class="mm-grid">
        <div class="mm-card"><div class="mm-stat-label">Magisk.apk</div><div class="mm-stat-value">${status}</div></div>
        <div class="mm-card"><div class="mm-stat-label">APK 版本</div><div class="mm-stat-value">${esc(state.magisk.managerVersionName)} ${state.magisk.managerVersionCode !== '-' ? `(${esc(state.magisk.managerVersionCode)})` : ''}</div></div>
        <div class="mm-card"><div class="mm-stat-label">环境版本</div><div class="mm-stat-value">${esc(state.magisk.envActive ? state.magisk.version : '-')} ${state.magisk.envActive && state.magisk.versionCode !== '-' ? `(${esc(state.magisk.versionCode)})` : ''}</div></div>
        <div class="mm-card"><div class="mm-stat-label">模块数</div><div class="mm-stat-value">${state.modules.length}</div></div>
      </div>
    `;
  };

  const renderMagiskInfo = () => `
    <div class="mm-card">
      <div class="mm-section-title">
        <span>环境状态</span>
        <span>${state.magisk.envActive ? (state.magisk.zygisk ? chip('Zygisk 已启用', 'mm-ok') : chip('Zygisk 已禁用', 'mm-warn')) : chip('环境未激活', 'mm-warn')}</span>
      </div>
      <div class="mm-kv">
        <div class="k">APK 安装</div><div class="v">${!state.magisk.managerInstalled ? '未安装' : (state.magisk.managerStub ? 'Stub 占位包' : '已安装')}</div>
        <div class="k">环境激活</div><div class="v">${state.magisk.envActive ? '已激活' : '未激活'}</div>
        <div class="k">说明</div><div class="v">切换 Zygisk、安装模块或调整模块状态后，需要主动重启一次设备。</div>
      </div>
      <div style="margin-top:10px">
        <button id="mm_more_status_btn"${state.busy ? ' disabled' : ''} style="padding:0;background:none;border:none;color:inherit;font-size:.68rem;opacity:.8;cursor:pointer">
          ${state.showMoreStatus ? '收起更多状态信息' : '展开更多状态信息'}
        </button>
        ${state.showMoreStatus ? `<div class="mm-kv" style="margin-top:10px">
          <div class="k">命令路径</div><div class="v">${esc(state.magisk.bin || '-')}</div>
          <div class="k">tmpfs 路径</div><div class="v">${esc(state.magisk.path || '-')}</div>
          <div class="k">环境状态</div><div class="v">${!state.magisk.envActive ? '未激活；如需修复，请上传与 Boot 同版本的 APK' : '已激活；状态刷新不会按内部文件布局误判版本'}</div>
          <div class="k">fixEnv 模式</div><div class="v">${esc(state.magisk.fixEnvMode || '-')}</div>
          <div class="k">/data/adb/magisk/magisk</div><div class="v">${state.magisk.assetMagisk ? `存在，可执行（${esc(state.magisk.assetMagiskVersion || '-')})` : '不存在或不可执行'}</div>
          <div class="k">核心资产目录概览</div><div class="v">busybox:${state.magisk.assetBusybox ? '存在' : '未发现'} / magiskboot:${state.magisk.assetMagiskboot ? '存在' : '未发现'} / magiskinit:${state.magisk.assetMagiskinit ? '存在' : '未发现'} / magiskpolicy:${state.magisk.assetMagiskpolicy ? '存在' : '未发现'}（仅供排查，不作为版本判断）</div>
        </div>` : ''}
      </div>
      <div class="mm-row" style="margin-top:12px">
        <button id="mm_refresh_btn"${state.busy ? ' disabled' : ''}>刷新</button>
        ${state.magisk.installed ? `<button id="mm_fixenv_btn"${state.busy ? ' disabled' : ''}>选择 Magisk APK、安装并修复</button>` : ''}
        <button id="mm_zygisk_btn"${state.busy || !state.magisk.envActive ? ' disabled' : ''}>${state.magisk.zygisk ? '关闭 Zygisk' : '启用 Zygisk'}</button>
        <button id="mm_install_btn"${state.busy || !state.magisk.envActive ? ' disabled' : ''}>选择并安装模块 ZIP</button>
        <button id="mm_reboot_btn"${state.busy ? ' disabled' : ''}>重启设备</button>
        <button id="mm_clear_env_btn"${state.busy ? ' disabled' : ''}>清除Magisk环境与模块</button>
      </div>
    </div>
  `;

  const renderModules = () => {
    if (!state.modules.length) {
      return `
        <div class="mm-card">
          <div class="mm-section-title"><span>模块列表</span><span>${chip('0 个', 'mm-warn')}</span></div>
          <div class="mm-empty">当前没有检测到已安装模块，或者设备上的 <code>${esc(MODULES_DIR)}</code> 还未建立有效模块目录。</div>
        </div>
      `;
    }
    return `
      <div class="mm-card">
        <div class="mm-section-title"><span>模块列表</span><span>${chip(`${state.modules.length} 个`, 'mm-ok')}</span></div>
        <div class="mm-modules">
          ${state.modules.map((module) => `
            <div class="mm-module" data-module-id="${esc(module.id)}">
              <div class="mm-module-head">
                <div>
                  <div class="mm-module-title">${esc(module.name)}</div>
                  <div class="mm-module-desc">${esc(module.description || '-')}</div>
                </div>
                <div class="mm-row">
                  ${module.pendingReboot ? chip('待重启生效', 'mm-warn') : ''}
                  ${module.enabled ? chip('已启用', 'mm-ok') : chip('已禁用', 'mm-warn')}
                  ${module.remove ? chip('待卸载', 'mm-bad') : ''}
                  ${module.zygisk ? chip(module.unloaded ? 'Zygisk 未加载' : 'Zygisk 模块', module.unloaded ? 'mm-warn' : 'mm-ok') : ''}
                </div>
              </div>
              <div class="mm-kv">
                <div class="k">ID</div><div class="v">${esc(module.id)}</div>
                <div class="k">版本</div><div class="v">${esc(module.version)}</div>
                <div class="k">作者</div><div class="v">${esc(module.author)}</div>
                <div class="k">目录</div><div class="v">${esc(module.dir)}</div>
                <div class="k">来源</div><div class="v">${module.source === 'modules_update' ? 'modules_update（待重启）' : 'modules（当前）'}</div>
              </div>
              <div class="mm-module-actions">
                <button class="mm-toggle-enable" data-id="${esc(module.id)}"${state.busy ? ' disabled' : ''}>${module.enabled ? '禁用' : '启用'}</button>
                <button class="mm-toggle-remove" data-id="${esc(module.id)}"${state.busy ? ' disabled' : ''}>${module.remove ? '取消卸载' : '标记卸载'}</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  function render() {
    const body = document.querySelector(`#${MODAL_NAME} .mm-root`);
    if (!body) return;
    body.innerHTML = `
      <div class="mm-wrap">
        ${renderOverview()}
        ${renderMagiskInfo()}
        ${renderModules()}
      </div>
    `;

    const refreshBtn = body.querySelector('#mm_refresh_btn');
    const fixEnvBtn = body.querySelector('#mm_fixenv_btn');
    const moreStatusBtn = body.querySelector('#mm_more_status_btn');
    const zygiskBtn = body.querySelector('#mm_zygisk_btn');
    const installBtn = body.querySelector('#mm_install_btn');
    const rebootBtn = body.querySelector('#mm_reboot_btn');
    const clearEnvBtn = body.querySelector('#mm_clear_env_btn');
    refreshBtn && (refreshBtn.onclick = async () => {
      await refreshAll(true);
    });

    moreStatusBtn && (moreStatusBtn.onclick = () => {
      state.showMoreStatus = !state.showMoreStatus;
      render();
    });

    fixEnvBtn && (fixEnvBtn.onclick = async () => {
      state.busy = true;
      render();
      const result = await repairEnv();
      if (!result?.cancelled) {
        createToast(result.message, result.ok ? 'pink' : 'red', 5000);
      }
      state.busy = false;
      render();
      if (result?.ok) {
        const rebootNow = await askConfirm(
          'mm_fixenv_reboot_confirm',
          '修复完成',
          'Magisk 环境修复已完成，需要立即重启设备后再生效。现在重启吗？',
          '立即重启',
        );
        if (rebootNow) {
          state.busy = true;
          render();
          const rebootRes = await rebootDevice();
          if (!rebootRes?.cancelled) {
            createToast(rebootRes.message, rebootRes.ok ? 'pink' : 'red', 5000);
          }
          state.busy = false;
        }
      }
      await refreshAll();
    });

    zygiskBtn && (zygiskBtn.onclick = async () => {
      state.busy = true;
      render();
      const result = await setZygisk(!state.magisk.zygisk);
      createToast(result.message, result.ok ? 'pink' : 'red', 5000);
      state.busy = false;
      await refreshAll();
    });

    rebootBtn && (rebootBtn.onclick = async () => {
      state.busy = true;
      render();
      const result = await rebootDevice();
      if (!result?.cancelled) {
        createToast(result.message, result.ok ? 'pink' : 'red', 5000);
      }
      state.busy = false;
      render();
    });

    clearEnvBtn && (clearEnvBtn.onclick = async () => {
      state.busy = true;
      render();
      const result = await clearMagiskEnv();
      if (!result?.cancelled) {
        createToast(result.message, result.ok ? 'pink' : 'red', 6000);
      }
      state.busy = false;
      await refreshAll();
    });

    installBtn && (installBtn.onclick = async () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip,application/zip,application/x-zip-compressed';
      input.onchange = async (event) => {
        const target = event.target;
        if (!target) return;
        const file = target.files ? target.files[0] : null;
        if (!file) {
          createToast('没有选择文件，操作取消！', 'pink');
          input.files = null;
          input.value = null
          input.remove();
          return
        };
        try {
          state.busy = true;
          render();
          const { close: cls } = createFixedToast('magisk_upload_zip_loading', '正在上传模块...');
          const result = await installModuleZip(file);
          cls();
          createToast(result.message, result.ok ? 'pink' : 'red', 6000);
          state.busy = false;
          await refreshAll();
        } finally {
          input.remove();
        }
      };
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      input.style.top = '0';
      input.style.width = '1px';
      input.style.height = '1px';
      input.style.opacity = '0.001';
      document.body.appendChild(input);
      input.click();
    });

    body.querySelectorAll('.mm-toggle-enable').forEach((button) => {
      button.onclick = async () => {
        const module = state.modules.find((item) => item.id === button.dataset.id);
        if (!module) return;
        state.busy = true;
        render();
        const result = await toggleModuleEnabled(module);
        createToast(result.message, result.ok ? 'pink' : 'red', 5000);
        state.busy = false;
        await refreshAll();
      };
    });

    body.querySelectorAll('.mm-toggle-remove').forEach((button) => {
      button.onclick = async () => {
        const module = state.modules.find((item) => item.id === button.dataset.id);
        if (!module) return;
        state.busy = true;
        render();
        const result = await toggleModuleRemove(module);
        createToast(result.message, result.ok ? 'pink' : 'red', 5000);
        state.busy = false;
        await refreshAll();
      };
    });
  }

  const openModal = async () => {
    document.querySelector(`#${MODAL_NAME}`)?.remove();
    ensureStyle();
    const { id } = createModal({
      name: MODAL_NAME,
      title: 'Magisk管理器(通用版)',
      maxWidth: '1040px',
      isMask: true,
      showConfirm: false,
      contentStyle: 'max-height:76vh;',
      onClose: () => true,
      content: '<div class="mm-root"></div>',
    });
    showModal(id);
    await refreshAll();
  };

  const checkRoot = async () => {
    const who = await run('whoami', 10000);
    return who.ok && who.text.includes('root');
  };

  const btn = document.createElement('button');
  btn.textContent = 'Magisk管理器(通用版)';
  btn.onclick = async () => {
    if (!(await checkRoot())) {
      createToast('请先启用高级功能', 'red');
      return;
    }
    await openModal();
  };

  while (!document.querySelector('.actions-buttons')) {
    await wait(150);
  }
  document.querySelector('.actions-buttons')?.appendChild(btn);
})();
//</script>
