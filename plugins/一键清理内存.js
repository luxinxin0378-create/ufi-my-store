//<script>
(() => {
  const TITLE = '清理内存';
  const STYLE_ID = 'kano_memory_cleaner_style';
  const PROGRESS_PANEL_ID = 'kano_memory_clean_progress_panel';
  const PROGRESS_TEXT_ID = 'kano_memory_clean_progress_text';
  const PROGRESS_BAR_ID = 'kano_memory_clean_progress_bar';
  const PROGRESS_PERCENT_ID = 'kano_memory_clean_progress_percent';
  const DEVICE_TMP_DIR = '/data/local/tmp/kano_memory_clean';
  const DEVICE_PKG_FILE = `${DEVICE_TMP_DIR}/packages.txt`;

  const state = {
    busy: false,
    progressVisible: false,
  };

  const WHITELIST_KEYWORDS = [
    'android.ext.services',
    'android.process.media',
    'com.minikano.f50_sms',
    'easytier',
    'mihomo',
    'clash',
    'kano_at_daemon',
    'magisk',
    'apatch',
    'ksu',
    'sukisu',
    'networkstack',
    'tethering',
    'connectivity',
    '/data/',
  ];

  const PROTECTED_PACKAGES = [
    'android',
    'android.ext.services',
    'android.process.media',
    'com.android.systemui',
    'com.android.launcher',
    'com.google.android.apps.nexuslauncher',
    'com.google.android.inputmethod',
    'com.android.inputmethod.latin',
    'com.android.phone',
    'com.android.shell',
    'com.android.bluetooth',
    'com.android.nfc',
    'com.android.providers.telephony',
    'com.android.networkstack',
    'com.google.android.networkstack',
    'com.android.tethering',
    'com.google.android.tethering',
    'com.android.connectivity.resources',
    'com.google.android.connectivity.resources',
    'com.qualcomm.qti.tetherservice',
    'com.android.server.telecom',
    'com.android.telephony',
    'com.android.permissioncontroller',
    'com.android.externalstorage',
    'com.android.gallery3d',
    'com.android.providers.media.module',
    'com.android.se',
    'com.android.smspush',
    'com.android.stk',
    'com.sprd.fileexplorer',
    'com.sprd.providers.photos',
    'com.sprd.simple.launcher',
  ];

  const KILLABLE_SYSTEM_PACKAGES = [
    'com.android.settings',
  ];

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .kano-memory-clean-btn[disabled] {
        opacity: .65;
        cursor: not-allowed;
      }
      #${PROGRESS_PANEL_ID} {
        opacity: 0;
        transform: translateX(-50%) translateY(-10px) scale(.98);
        transition: opacity .22s ease, transform .22s ease;
        pointer-events: none;
      }
      #${PROGRESS_PANEL_ID}.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0) scale(1);
      }
    `;
    document.head.appendChild(style);
  };

  const ensureProgressUI = () => {
    let panel = document.querySelector(`#${PROGRESS_PANEL_ID}`);
    if (panel) return panel;
    const html = `
<div id="${PROGRESS_PANEL_ID}" style="
  position:fixed;
  left:50%;
  top:20px;
  transform:translateX(-50%);
  z-index:999999;
  min-width:300px;
  max-width:92vw;
  background:rgba(30,30,30,0.97);
  color:#ff8fc7;
  border:1px solid rgba(255,143,199,0.35);
  border-radius:12px;
  box-shadow:0 8px 24px rgba(0,0,0,0.28);
  padding:12px 14px;
  display:block;
">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
    <div id="${PROGRESS_TEXT_ID}" style="
      font-size:13px;
      line-height:1.4;
      word-break:break-all;
      flex:1;
    ">正在准备...</div>
    <div id="${PROGRESS_PERCENT_ID}" style="
      font-size:13px;
      font-weight:800;
      color:#ffd36f;
      white-space:nowrap;
    ">0%</div>
  </div>
  <div style="
    width:100%;
    height:8px;
    background:rgba(255,255,255,0.12);
    border-radius:999px;
    overflow:hidden;
  ">
    <div id="${PROGRESS_BAR_ID}" style="
      width:0%;
      height:100%;
      background:linear-gradient(90deg,#ff8fc7,#ffd36f);
      border-radius:999px;
      transition:width .2s ease;
    "></div>
  </div>
</div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    return document.querySelector(`#${PROGRESS_PANEL_ID}`);
  };

  const showProgress = (text, percent) => {
    ensureProgressUI();
    const panel = document.querySelector(`#${PROGRESS_PANEL_ID}`);
    const textEl = document.querySelector(`#${PROGRESS_TEXT_ID}`);
    const bar = document.querySelector(`#${PROGRESS_BAR_ID}`);
    const percentEl = document.querySelector(`#${PROGRESS_PERCENT_ID}`);
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    if (panel) {
      panel.classList.add('show');
      state.progressVisible = true;
    }
    if (textEl) textEl.textContent = text || '处理中...';
    if (percentEl) percentEl.textContent = `${p}%`;
    if (bar) bar.style.width = `${p}%`;
  };

  const hideProgress = () => {
    const panel = document.querySelector(`#${PROGRESS_PANEL_ID}`);
    if (!panel || !state.progressVisible) return;
    panel.classList.remove('show');
    state.progressVisible = false;
  };

  const setBusy = (button, busy) => {
    state.busy = busy;
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? '清理中...' : TITLE;
  };

  const formatMemory = (kb) => {
    const size = Math.max(0, Number(kb) || 0) * 1024;
    if (typeof formatBytes === 'function') {
      return String(formatBytes(size)).replace(/&nbsp;/g, '').trim();
    }
    if (size >= 1024 ** 3) return `${(size / 1024 ** 3).toFixed(2)} GB`;
    if (size >= 1024 ** 2) return `${(size / 1024 ** 2).toFixed(2)} MB`;
    return `${(size / 1024).toFixed(2)} KB`;
  };

  const escapeSingleQuotes = (value = '') => String(value).replace(/'/g, `'\\''`);

  const runRoot = async (cmd, timeout = 15000) => {
    const res = await runShellWithRoot(cmd, timeout);
    return {
      ok: !!res?.success,
      text: String(res?.content || '').trim(),
    };
  };

  const buildCollectScript = () => {
    const whitelistCases = WHITELIST_KEYWORDS
      .map((item) => `    *${escapeSingleQuotes(item)}*) return 0 ;;`)
      .join('\n');
    const protectedCases = PROTECTED_PACKAGES
      .map((item) => `    ${escapeSingleQuotes(item)}) return 0 ;;`)
      .join('\n');
    const killableSystemCases = KILLABLE_SYSTEM_PACKAGES
      .map((item) => `    ${escapeSingleQuotes(item)}) return 0 ;;`)
      .join('\n');

    return `
TMP_DIR="${DEVICE_TMP_DIR}"
PKG_FILE="${DEVICE_PKG_FILE}"
mkdir -p "$TMP_DIR"
: > "$PKG_FILE"

read_mem_available() {
  awk '/MemAvailable:/ {print $2; exit}' /proc/meminfo 2>/dev/null
}

get_first_line() {
  sh -c "$1" 2>/dev/null | head -n 1 | tr -d '\\r'
}

normalize_pkg() {
  raw="$1"
  raw="\${raw#package:}"
  raw="\${raw%%:*}"
  printf '%s' "$raw"
}

is_whitelisted() {
  combined="$1"
  case "$combined" in
${whitelistCases}
    *) return 1 ;;
  esac
}

is_protected_pkg() {
  pkg="$1"
  [ -n "$pkg" ] || return 0
  case "$pkg" in
${protectedCases}
    *) return 1 ;;
  esac
}

is_killable_system_pkg() {
  pkg="$1"
  [ -n "$pkg" ] || return 1
  case "$pkg" in
${killableSystemCases}
    *) return 1 ;;
  esac
}

is_package_name() {
  value="$1"
  case "$value" in
    *.*) return 0 ;;
    *) return 1 ;;
  esac
}

append_unique_line() {
  value="$1"
  file="$2"
  [ -n "$value" ] || return 0
  grep -Fxq "$value" "$file" 2>/dev/null && return 0
  printf '%s\n' "$value" >> "$file"
}

is_running_pkg() {
  pkg="$1"
  [ -n "$pkg" ] || return 1
  pidof "$pkg" >/dev/null 2>&1 && return 0
  ps 2>/dev/null | awk -v pkg="$pkg" '
    NR == 1 && $0 ~ /PID/ { next }
    $NF == pkg || index($NF, pkg ":") == 1 { found = 1; exit }
    END { exit(found ? 0 : 1) }
  '
}

TOP_PKG="$(normalize_pkg "$(get_first_line "dumpsys activity top | grep -m 1 ' ACTIVITY ' | awk '{print \\$2}'")")"
[ -n "$TOP_PKG" ] || TOP_PKG="$(normalize_pkg "$(get_first_line "dumpsys window windows | grep -m 1 'mCurrentFocus' | sed 's/.* \\([^ ]*\\)\\/[^ ]*.*/\\1/'")")"
HOME_PKG="$(normalize_pkg "$(get_first_line "cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME | tail -n 1")")"
IME_PKG="$(normalize_pkg "$(get_first_line "settings get secure default_input_method")")"
before_kb="$(read_mem_available)"
[ -n "$before_kb" ] || before_kb=0

pm list packages -3 2>/dev/null | while IFS= read -r raw_pkg; do
  pkg="$(normalize_pkg "$raw_pkg")"
  is_package_name "$pkg" || continue
  [ "$pkg" = "$TOP_PKG" ] && continue
  [ "$pkg" = "$HOME_PKG" ] && continue
  [ "$pkg" = "$IME_PKG" ] && continue
  is_protected_pkg "$pkg" && continue
  is_whitelisted "$pkg" && continue
  is_running_pkg "$pkg" || continue
  append_unique_line "$pkg" "$PKG_FILE"
done

pm list packages 2>/dev/null | while IFS= read -r raw_pkg; do
  pkg="$(normalize_pkg "$raw_pkg")"
  is_killable_system_pkg "$pkg" || continue
  [ "$pkg" = "$TOP_PKG" ] && continue
  is_running_pkg "$pkg" || continue
  append_unique_line "$pkg" "$PKG_FILE"
done

sort -u "$PKG_FILE" -o "$PKG_FILE" 2>/dev/null
pkg_count="$(awk 'NF{c++} END{print c+0}' "$PKG_FILE" 2>/dev/null)"
printf 'COLLECT|%s|%s\n' "$before_kb" "$pkg_count"
`;
  };

  const buildStopScript = () => `
PKG_FILE="${DEVICE_PKG_FILE}"
stopped=0
if [ -s "$PKG_FILE" ]; then
  while IFS= read -r pkg; do
    [ -n "$pkg" ] || continue
    am force-stop "$pkg" >/dev/null 2>&1
    stopped=$((stopped + 1))
  done < "$PKG_FILE"
fi
printf 'STOP|%s\n' "$stopped"
`;

  const buildTrimScript = () => `
trim_ok=0
if cmd activity idle-maintenance >/dev/null 2>&1; then
  trim_ok=1
fi
if am kill-all >/dev/null 2>&1; then
  trim_ok=1
fi
printf 'TRIM|%s\n' "$trim_ok"
`;

  const buildReclaimScript = () => `
read_mem_available() {
  awk '/MemAvailable:/ {print $2; exit}' /proc/meminfo 2>/dev/null
}

sync
[ -w /proc/sys/vm/stat_interval ] && echo 1 > /proc/sys/vm/stat_interval 2>/dev/null
[ -w /proc/sys/vm/swappiness ] && echo 100 > /proc/sys/vm/swappiness 2>/dev/null
[ -w /proc/sys/vm/drop_caches ] && echo 3 > /proc/sys/vm/drop_caches
[ -w /proc/sys/vm/compact_memory ] && echo 1 > /proc/sys/vm/compact_memory
for cg in /sys/fs/cgroup/memory /dev/memcg /sys/fs/cgroup; do
  [ -w "$cg/memory.reclaim" ] && echo 64M > "$cg/memory.reclaim" 2>/dev/null
done
for zdev in /sys/block/zram*; do
  [ -e "$zdev" ] || continue
  [ -w "$zdev/idle" ] && echo all > "$zdev/idle" 2>/dev/null
  [ -w "$zdev/compact" ] && echo 1 > "$zdev/compact" 2>/dev/null
  [ -w "$zdev/writeback" ] && echo huge > "$zdev/writeback" 2>/dev/null
done
sleep 0.2
after_kb="$(read_mem_available)"
[ -n "$after_kb" ] || after_kb=0
printf 'RECLAIM|%s\n' "$after_kb"
`;

  const buildCleanupScript = () => `
rm -rf "${DEVICE_TMP_DIR}"
`;

  const parseTaggedLine = (text, tag) =>
    String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .reverse()
      .find((line) => line.startsWith(`${tag}|`));

  const collectTargets = async () => {
    const res = await runRoot(buildCollectScript(), 30000);
    if (!res.ok) return { ok: false, message: '扫描清理目标失败' };
    const line = parseTaggedLine(res.text, 'COLLECT');
    if (!line) return { ok: false, message: '扫描清理目标失败' };
    const [, beforeRaw, countRaw] = line.split('|');
    return {
      ok: true,
      beforeKb: Number(beforeRaw) || 0,
      pkgCount: Number(countRaw) || 0,
    };
  };

  const stopTargets = async () => {
    const res = await runRoot(buildStopScript(), 10000);
    if (!res.ok) return { ok: false, message: '停止应用失败' };
    const line = parseTaggedLine(res.text, 'STOP');
    if (!line) return { ok: false, message: '停止应用失败' };
    const [, stoppedRaw] = line.split('|');
    return {
      ok: true,
      stoppedCount: Number(stoppedRaw) || 0,
    };
  };

  const trimProcesses = async () => {
    const res = await runRoot(buildTrimScript(), 8000);
    if (!res.ok) return { ok: false, message: '系统级内存整理失败' };
    const line = parseTaggedLine(res.text, 'TRIM');
    if (!line) return { ok: false, message: '系统级内存整理失败' };
    const [, trimRaw] = line.split('|');
    return {
      ok: true,
      trimApplied: Number(trimRaw) || 0,
    };
  };

  const reclaimMemory = async () => {
    const res = await runRoot(buildReclaimScript(), 8000);
    if (!res.ok) return { ok: false, message: '内存回收失败' };
    const line = parseTaggedLine(res.text, 'RECLAIM');
    if (!line) return { ok: false, message: '内存回收失败' };
    const [, afterRaw] = line.split('|');
    return {
      ok: true,
      afterKb: Number(afterRaw) || 0,
    };
  };

  const cleanupTemp = async () => {
    await runRoot(buildCleanupScript(), 5000);
  };

  const executeCleanup = async () => {
    showProgress('正在初始化清理环境...', 6);
    await cleanupTemp();

    showProgress('正在分析前台应用与桌面保护...', 14);
    await runRoot('echo prepare', 2000);

    showProgress('正在扫描可清理应用...', 26);
    const collect = await collectTargets();
    if (!collect.ok) return collect;

    showProgress(`已找到 ${collect.pkgCount} 个目标，正在准备停止应用...`, 38);
    await runRoot('test -f "' + DEVICE_PKG_FILE + '" && echo ready', 2000);

    showProgress(`已找到 ${collect.pkgCount} 个目标，正在停止应用...`, 54);
    const stop = await stopTargets();
    if (!stop.ok) return stop;

    showProgress('正在执行系统级内存整理...', 66);
    const trim = await trimProcesses();
    if (!trim.ok) return trim;

    showProgress('正在执行缓存回收...', 78);
    await runRoot('sync', 4000);

    showProgress('正在执行内存压缩与回收...', 90);
    const reclaim = await reclaimMemory();
    if (!reclaim.ok) return reclaim;

    showProgress('正在完成收尾...', 97);
    await cleanupTemp();

    return {
      ok: true,
      beforeKb: collect.beforeKb,
      afterKb: reclaim.afterKb,
      releasedKb: Math.max(0, reclaim.afterKb - collect.beforeKb),
      pkgCount: stop.stoppedCount || collect.pkgCount,
      trimApplied: trim.trimApplied,
    };
  };

  const handleClick = async (button) => {
    if (state.busy) return;
    if (!(await checkAdvancedFunc())) {
      createToast('请先启用高级功能', 'pink');
      return;
    }

    setBusy(button, true);
    showProgress('正在准备清理内存...', 5);
    try {
      const result = await executeCleanup();
      showProgress('清理完成，正在刷新显示...', 100);
      hideProgress();
      if (!result.ok) {
        await cleanupTemp();
        createToast(result.message || '清理失败', 'red');
        return;
      }

      const releasedText = formatMemory(result.releasedKb);
      createToast(
        `清理完成，已释放 ${releasedText} 内存，处理 ${result.pkgCount} 个应用`,
        'pink',
        5000
      );
    } catch (error) {
      hideProgress();
      await cleanupTemp();
      createToast(`清理失败：${error?.message || error || '未知错误'}`, 'red', 5000);
    } finally {
      hideProgress();
      setBusy(button, false);
    }
  };

  const button = document.createElement('button');
  button.className = 'kano-memory-clean-btn';
  button.textContent = TITLE;
  button.onclick = async () => {
    await handleClick(button);
  };

  ensureStyle();
  document.querySelector('.actions-buttons')?.appendChild(button);
})();
//</script>
