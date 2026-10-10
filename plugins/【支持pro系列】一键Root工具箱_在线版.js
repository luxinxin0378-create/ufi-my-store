//<script>
(async () => {
  const MODAL = 'kano_root_remote_modal';
  const STYLE = 'kano_root_remote_style';
  const ROOT_DIR = '/data/local/tmp/kano_root_tools';
  const TAR = `${ROOT_DIR}/root_package.tar.gz`;
  const DLOG = `${ROOT_DIR}/download.log`;
  const MAGISK_APK = `${ROOT_DIR}/magisk.apk`;
  const MAGISK_URL = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/Magisk_28103.apk';
  const MAGISK_SHA256 = 'fa7e64af14e57194e2463d959e809812e9bdd48f4cc996565706f658e78694de';
  const CURL = '/data/data/com.minikano.f50_sms/files/curl';
  const SSL = 'SSL_CERT_DIR=/system/etc/security/cacerts';
  const LIST_API = '/api/proxy/--https://pan.kanokano.cn/api/fs/list';
  const BASE_URL = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/one_key_root_plugin_resources';
  const ITEM_META = {
    trustos: { label: 'trustos', partition: 'trustos', bin: 'trustos.bin' },
    boot: { label: 'boot', partition: 'boot', bin: 'boot.bin' },
    init_boot: { label: 'init_boot', partition: 'init_boot', bin: 'init_boot.bin' },
    nr_modem: { label: 'nr_modem', partition: 'nr_modem', bin: 'nr_modem.bin' },
  };
  const FLASH_ITEMS = ['trustos', 'boot_like', 'nr_modem'];
  const state = { busy: false, info: {}, partitions: [], pkg: null, prog: { show: false, text: '空闲', pct: 0 }, useNrModem: false };
  const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));
  const sq = (v) => `'${String(v || '').replace(/'/g, `'\\''`)}'`;
  const clean = (v) => String(v || '').replace(/[\u2000-\u200F\u202A-\u202E\u2060\uFEFF\r]/g, '').trim();
  const esc = (v) => String(v || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const hex64 = (v) => (clean(v).match(/[a-fA-F0-9]{64}/) || [''])[0].toLowerCase();
  const fmt = (n) => { n = Number(n) || 0; if (n < 1024) return `${n} B`; if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`; return `${(n / 1048576).toFixed(1)} MB`; };
  const run = async (cmd, t = 3e4) => { const r = await runShellWithRoot(cmd, t); return { ok: !!r?.success, text: String(r?.content || '').trim() }; };
  const csumCmd = (p) => `FILE=${sq(p)}\nif command -v sha256sum>/dev/null 2>&1;then sha256sum "$FILE"|awk '{print $1}';elif command -v busybox>/dev/null 2>&1;then busybox sha256sum "$FILE"|awk '{print $1}';elif command -v toybox>/dev/null 2>&1;then toybox sha256sum "$FILE"|awk '{print $1}';elif command -v openssl>/dev/null 2>&1;then openssl dgst -sha256 "$FILE"|awk '{print $NF}';else echo "__NO_CHECKSUM__";fi`;
  const sizeCmd = (p) => `FILE=${sq(p)}\nif stat -c%s "$FILE">/dev/null 2>&1;then stat -c%s "$FILE";elif busybox stat -c%s "$FILE">/dev/null 2>&1;then busybox stat -c%s "$FILE";else wc -c < "$FILE";fi`;
  const stats = async (p) => { const [a, b] = await Promise.all([run(csumCmd(p), 2e4), run(sizeCmd(p), 2e4)]); return { checksum: hex64(a.text), size: parseInt(clean(b.text || '0'), 10) || 0 }; };
  const setBusy = (busy, text = '') => { state.busy = busy; const s = document.querySelector('#kr_status'); if (s) s.textContent = text || (busy ? '处理中...' : '空闲'); render(); };
  const setProg = (text = '', pct = 0, show = false) => { state.prog = { show, text: text || '处理中...', pct: Math.max(0, Math.min(100, Number(pct) || 0)) }; render(); };
  const resolveBootKey = () => state.pkg?.bootKind === 'init_boot' ? 'init_boot' : 'boot';
  const resolveFlashKey = (key) => key === 'boot_like' ? resolveBootKey() : key;
  const metaOf = (key) => ITEM_META[resolveFlashKey(key)];
  const fileOf = (key) => state.pkg?.files?.[resolveFlashKey(key)] || null;
  const needFlash = (key) => key === 'trustos' || key === 'boot_like' || (key === 'nr_modem' && state.useNrModem);
  const ready = () => FLASH_ITEMS.every((key) => !needFlash(key) || !!fileOf(key)?.verified);
  const flashLabel = (key) => metaOf(key)?.label || key;
  const flashPartsText = () => state.useNrModem ? `<code>trustos</code>、<code>${flashLabel('boot_like')}</code>、<code>nr_modem</code>` : `<code>trustos</code>、<code>${flashLabel('boot_like')}</code>`;
  const ensureStyle = () => {
    if (document.getElementById(STYLE)) return;
    const el = document.createElement('style');
    el.id = STYLE;
    el.textContent = `#${MODAL} .k{display:flex;flex-direction:column;gap:12px}#${MODAL} .b{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);border-radius:14px;padding:12px}#${MODAL} .g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}#${MODAL} .s{font-size:.62rem;opacity:.7}#${MODAL} .v{font-size:.82rem;font-weight:800;word-break:break-word}#${MODAL} .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}#${MODAL} .kv{display:grid;grid-template-columns:96px 1fr;gap:6px 10px;font-size:.66rem;line-height:1.6}#${MODAL} .chip{display:inline-flex;padding:4px 10px;border-radius:999px;font-size:.62rem;font-weight:700;background:rgba(255,255,255,.08)}#${MODAL} .ok{color:#95ffb2;background:rgba(89,212,130,.16)}#${MODAL} .warn{color:#ffc299;background:rgba(255,144,84,.16)}#${MODAL} .bad{color:#ffb0b0;background:rgba(255,80,80,.16)}#${MODAL} .bar{height:8px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden}#${MODAL} .fill{height:100%;background:linear-gradient(90deg,#ff9656,#ffd76a);width:0%;transition:width .2s ease}@media (max-width:720px){#${MODAL} .g,#${MODAL} .cards{grid-template-columns:1fr}#${MODAL} .kv{grid-template-columns:1fr}}`;
    document.head.appendChild(el);
  };
  const fetchInfo = async () => {
    const r = await run(`brand="$(getprop ro.product.brand|tr -d '\\r')"\nmodel="$(getprop ro.product.model|tr -d '\\r')"\ndevice="$(getprop ro.product.device|tr -d '\\r')"\ndisplay_id="$(getprop ro.build.display.id|tr -d '\\r')"\nslot_suffix="$(getprop ro.boot.slot_suffix|tr -d '\\r')"\nslot_name="$(getprop ro.boot.slot|tr -d '\\r')"\n[ -z "$slot_name" ]&&[ -n "$slot_suffix" ]&&slot_name="\${slot_suffix#_}"\n[ -z "$slot_name" ]&&slot_num="$(bootctl get-current-slot 2>/dev/null|tr -d '\\r')"&&[ "$slot_num" = "0" ]&&slot_name="a"\n[ -z "$slot_name" ]&&[ "$slot_num" = "1" ]&&slot_name="b"\nprintf 'brand=%s\\nmodel=%s\\ndevice=%s\\ndisplay_id=%s\\nslot=%s\\n' "$brand" "$model" "$device" "$display_id" "$slot_name"`);
    const info = { brand: '-', model: '-', device: '-', display_id: '-', slot: '-' };
    String(r.text || '').split('\n').forEach((line) => { const [k, ...rest] = line.split('='); if (k) info[k.trim()] = rest.join('=').trim() || '-'; });
    info.display_id = clean(info.display_id); state.info = info;
  };
  const fetchParts = async () => {
    const r = await run(`for base in /dev/block/bootdevice/by-name /dev/block/by-name /dev/block/platform/*/by-name /dev/block/platform/*/*/by-name;do [ -d "$base" ]||continue;for path in "$base"/*;do [ -e "$path" ]||continue;name="$(basename "$path")";real="$(readlink -f "$path" 2>/dev/null)";printf '%s\\t%s\\t%s\\n' "$name" "$path" "$real";done;done|awk -F '\\t' '!seen[$1]++ {print $0}'|sort`);
    state.partitions = String(r.text || '').split('\n').map((x) => x.trim()).filter(Boolean).map((x) => { const [name, linkPath, realPath] = x.split('\t'); return { name, linkPath, realPath }; });
  };
  const targetOf = (base) => { const slot = String(state.info?.slot || '').trim().toLowerCase(); const exact = slot && slot !== '-' ? `${base}_${slot}` : base; return state.partitions.find((x) => x.name === exact) || state.partitions.find((x) => x.name === base) || null; };
  const targetForKey = (key) => targetOf(metaOf(key)?.partition || key);
  const fetchRemote = async () => {
    const id = clean(state.info?.display_id); if (!id || id === '-') { state.pkg = { matched: false, reason: '未读取到设备内部版本号' }; return; }
    const r = await (await fetch(LIST_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: '/UFI-TOOLS-UPDATE/one_key_root_plugin_resources', password: '', page: 1, per_page: 0, refresh: false }) })).json();
    const list = Array.isArray(r?.data?.content) ? r.data.content : []; const name = `${id}.tar.gz`; const hit = list.find((x) => x?.name === name && !x?.is_dir);
    state.pkg = hit ? { matched: true, displayId: id, remoteName: hit.name, remoteSize: Number(hit.size) || 0, remoteUrl: `${BASE_URL}/${encodeURIComponent(hit.name)}`, files: null } : { matched: false, displayId: id, targetName: name, reason: '当前版本未作 Root 适配，请使用电脑手动 Root', total: Number(r?.data?.total) || list.length };
  };
  const renderCards = () => FLASH_ITEMS.map((key) => {
    const m = metaOf(key);
    const f = fileOf(key); const t = targetForKey(key);
    const optional = key === 'nr_modem';
    const filesLoaded = !!state.pkg?.files;
    const exists = !!f?.exists;
    const showDetails = filesLoaded && (exists || optional);
    const cls = f ? (f.verified ? 'chip ok' : 'chip bad') : 'chip warn';
    const txt = optional && filesLoaded && !exists ? '包内未提供' : f ? (f.verified ? (optional ? '可选补丁' : '已校验') : '校验失败') : '待下载';
    const summary = !filesLoaded ? '下载 Root 包后显示分区和校验详情' : (optional && !exists ? '当前包未提供这个可选镜像' : '已读取镜像与分区信息');
    const details = showDetails ? `<div class="kv"><div>目标分区</div><div>${esc(t?.name || '未找到')}</div><div>块设备</div><div>${esc(t?.realPath || t?.linkPath || '-')}</div><div>镜像文件</div><div>${esc(f?.path || `${ROOT_DIR}/${m?.bin || `${key}.bin`}`)}</div><div>期望摘要</div><div>${esc(f?.expectedChecksum || '-')}</div><div>实际摘要</div><div>${esc(f?.actualChecksum || '-')}</div></div>` : `<div style="font-size:.66rem;line-height:1.6;opacity:.78">${esc(summary)}</div>`;
    return `<div class="b"><div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:8px;font-size:.76rem;font-weight:800"><span>${esc(m?.label || key)}</span><span class="${cls}">${txt}</span></div>${details}</div>`;
  }).join('');
  const render = () => {
    const chip = document.querySelector('#kr_chip'); const btn = document.querySelector('#kr_root_btn'); const dlBtn = document.querySelector('#kr_download_btn'); const rfBtn = document.querySelector('#kr_refresh_btn'); const magiskBtn = document.querySelector('#kr_magisk_btn');
    const allTargets = FLASH_ITEMS.every((key) => !needFlash(key) || !!targetForKey(key));
    const status = state.busy ? ['chip warn', '正在检测'] : ready() && allTargets ? ['chip ok', '可开始 Root'] : state.pkg?.matched ? ['chip warn', '需先下载并校验'] : state.pkg ? ['chip bad', '未匹配到适配包'] : ['chip warn', '正在检测'];
    const pkg = state.pkg;
    const pkgHtml = pkg?.matched ? `<div class="kv"><div>匹配结果</div><div style="color:#8ff0a7">已匹配远端 Root 包</div><div>文件名</div><div>${esc(pkg.remoteName)}</div><div>下载地址</div><div>${esc(pkg.remoteUrl)}</div><div>文件大小</div><div>${esc(fmt(pkg.remoteSize))}</div></div>` : `<div class="kv"><div>匹配结果</div><div style="color:#ff9a9a">${esc(pkg?.reason || '尚未检查')}</div><div>目标文件名</div><div>${esc(pkg?.targetName || '-')}</div><div>远端包总数</div><div>${esc(String(pkg?.total || '-'))}</div></div>`;
    const set = (sel, val) => { const el = document.querySelector(sel); if (el != null) el.innerHTML = val; };
    set('#kr_device', esc(`${state.info?.brand || '-'} ${state.info?.model || '-'}`.trim()));
    set('#kr_slot', esc(String(state.info?.slot || '-').toUpperCase()));
    set('#kr_build', esc(state.info?.display_id || '-'));
    set('#kr_ready', `${FLASH_ITEMS.filter((key) => fileOf(key)?.verified && needFlash(key)).length} / ${FLASH_ITEMS.filter((key) => needFlash(key)).length}`);
    set('#kr_pkg', pkgHtml); set('#kr_cards', renderCards());
    if (chip) { chip.className = status[0]; chip.textContent = status[1]; }
    if (btn) btn.disabled = state.busy || !allTargets || !ready();
    if (dlBtn) dlBtn.disabled = state.busy || !state.pkg?.matched;
    if (rfBtn) rfBtn.disabled = state.busy;
    if (magiskBtn) magiskBtn.disabled = state.busy;
    const pbox = document.querySelector('#kr_prog'); const ptxt = document.querySelector('#kr_prog_text'); const fill = document.querySelector('#kr_prog_fill');
    if (pbox) pbox.style.display = state.prog.show ? 'block' : 'none'; if (ptxt) ptxt.textContent = state.prog.text; if (fill) fill.style.width = `${state.prog.pct}%`;
  };
  const prepDir = async () => (await run(`mkdir -p ${sq(ROOT_DIR)}\nfind ${sq(ROOT_DIR)} -mindepth 1 -maxdepth 1 -exec rm -rf {} + 2>/dev/null\nmkdir -p ${sq(ROOT_DIR)}`)).ok;
  const waitDownload = async (total) => {
    let ok = false, last = 0;
    for (let i = 0; i < 600; i++) {
      const [a, b] = await Promise.all([run(`timeout 2s awk '{print}' ${sq(DLOG)} 2>/dev/null`), run(sizeCmd(TAR), 5e3)]);
      const size = parseInt(clean(b.text || '0'), 10) || 0;
      if (total > 0) { const pct = Math.max(0, Math.min(100, Math.floor((size * 100) / total))); if (pct >= last) { last = pct; setProg(`正在下载 Root 包... ${pct}% (${fmt(size)} / ${fmt(total)})`, pct, true); } }
      else setProg(`正在下载 Root 包... 已下载 ${fmt(size)}`, 0, true);
      if (String(a.text || '').includes('DOWNLOAD_DONE')) { ok = true; break; }
      await wait(1000);
    }
    await run(`rm -f ${sq(DLOG)}`); return ok;
  };
  const loadFiles = async () => {
    const files = {};
    for (const [k, meta] of Object.entries(ITEM_META)) {
      const path = `${ROOT_DIR}/${meta.bin}`; const cpath = `${path}.chksum`; const [a, b] = await Promise.all([run(`timeout 2s awk '{print}' ${sq(cpath)} 2>/dev/null`, 5e3), stats(path)]);
      const expectedChecksum = hex64(a.text), actualChecksum = hex64(b.checksum);
      const exists = b.size > 0 || !!expectedChecksum || !!actualChecksum;
      files[k] = { path, expectedChecksum, actualChecksum, size: b.size, exists, verified: k === 'nr_modem' ? (!exists || (!!expectedChecksum && !!actualChecksum && expectedChecksum === actualChecksum && b.size > 0)) : (!!expectedChecksum && !!actualChecksum && expectedChecksum === actualChecksum && b.size > 0) };
    }
    const bootKind = files.init_boot?.exists ? 'init_boot' : 'boot';
    state.pkg = { ...state.pkg, files, bootKind };
    state.useNrModem = !!files.nr_modem?.exists && !!files.nr_modem?.verified;
  };
  const downloadPkg = async () => {
    if (!state.pkg?.matched || !state.pkg?.remoteUrl) return createToast(state.pkg?.reason || '当前版本未匹配到 Root 包', 'red', 5000);
    setBusy(true, '正在准备下载目录...'); setProg('正在准备下载目录...', 0, true);
    if (!(await prepDir())) { setBusy(false, '准备目录失败'); setProg('', 0, false); return createToast('无法准备下载目录', 'red', 5000); }
    const start = await run(`env ${SSL} ${CURL} -L ${sq(state.pkg.remoteUrl)} -o ${sq(TAR)} --write-out "DOWNLOAD_DONE\\n">${sq(DLOG)} 2>&1&`, 1e4);
    if (!start.ok) { setBusy(false, '启动下载失败'); setProg('', 0, false); return createToast('启动下载失败，请确认设备内 curl 可用', 'red', 6000); }
    if (!(await waitDownload(state.pkg.remoteSize))) { setBusy(false, '下载超时'); setProg('', 0, false); return createToast('下载超时', 'red', 5000); }
    setProg('下载完成，正在解压...', 100, true);
    const ex = await run(`mkdir -p ${sq(ROOT_DIR)} && tar -zxf ${sq(TAR)} -C ${sq(ROOT_DIR)}`, 12e4);
    if (!ex.ok) { setBusy(false, '解压失败'); setProg('', 0, false); return createToast('Root 包解压失败', 'red', 5000); }
    setProg('正在校验镜像摘要...', 100, true); await loadFiles(); setBusy(false, ready() ? '下载与校验完成' : '校验失败'); setProg('', 0, false); render();
    createToast(ready() ? 'Root 包已下载并完成摘要校验' : 'Root 包校验失败，禁止继续刷入', ready() ? 'green' : 'red', 5000);
  };
  const installMagisk = async () => {
    setBusy(true, '正在准备安装 Magisk.apk...');
    setProg('正在准备安装 Magisk.apk...', 0, true);
    const prep = await run(`mkdir -p ${sq(ROOT_DIR)} && rm -f ${sq(MAGISK_APK)} ${sq(DLOG)}`, 1e4);
    if (!prep.ok) {
      setBusy(false, '空闲');
      setProg('', 0, false);
      return createToast('无法准备 Magisk.apk 下载目录', 'red', 5000);
    }
    const start = await run(`env ${SSL} ${CURL} -L ${sq(MAGISK_URL)} -o ${sq(MAGISK_APK)} --write-out "DOWNLOAD_DONE\\n">${sq(DLOG)} 2>&1&`, 1e4);
    if (!start.ok) {
      setBusy(false, '空闲');
      setProg('', 0, false);
      return createToast('启动 Magisk.apk 下载失败', 'red', 5000);
    }
    for (let i = 0; i < 300; i++) {
      const [a, b] = await Promise.all([run(`timeout 2s awk '{print}' ${sq(DLOG)} 2>/dev/null`, 5e3), run(sizeCmd(MAGISK_APK), 5e3)]);
      const size = parseInt(clean(b.text || '0'), 10) || 0;
      setProg(`正在下载 Magisk.apk... 已下载 ${fmt(size)}`, 0, true);
      if (String(a.text || '').includes('DOWNLOAD_DONE')) break;
      if (i === 299) {
        await run(`rm -f ${sq(DLOG)}`);
        setBusy(false, '空闲');
        setProg('', 0, false);
        return createToast('Magisk.apk 下载超时', 'red', 5000);
      }
      await wait(1000);
    }
    await run(`rm -f ${sq(DLOG)}`);
    setBusy(true, '正在校验 Magisk.apk...');
    setProg('正在校验 Magisk.apk...', 100, true);
    const apkStats = await stats(MAGISK_APK);
    if (!apkStats.checksum || apkStats.checksum !== MAGISK_SHA256) {
      setBusy(false, '空闲');
      setProg('', 0, false);
      return createToast(`Magisk.apk 校验失败：${apkStats.checksum || '无摘要'}`, 'red', 7000);
    }
    setBusy(true, '正在安装 Magisk.apk...');
    setProg('正在安装 Magisk.apk...', 100, true);
    const installRes = await run(`pm install ${sq(MAGISK_APK)}`, 120000);
    setBusy(false, '空闲');
    setProg('', 0, false);
    if (installRes.ok && /Success/i.test(installRes.text)) {
      return createToast('Magisk.apk 安装成功', 'green', 5000);
    }
    createToast(`Magisk.apk 安装失败：${installRes.text || '未知错误'}`, 'red', 7000);
  };
  const rebootDevice = async ()=> {
     if(await ask('kr_reboot_dev', '确认重启？', '所有操作步骤执行完毕后，重启即可生效！', '是', '否')) {
      await run(`sync && reboot`, 120000);
      createToast('重启成功', 'green', 5000);
     }
  }
  const ask = (id, title, body, ok = '确认', cancel = '取消') => new Promise((resolve) => {
    const { el, close } = createFixedToast(id, `<div style="pointer-events:all;width:90vw;max-width:520px;"><div class="title" style="margin:0">${title}</div><div style="margin-top:10px;font-size:.7rem;line-height:1.7">${body}</div><div style="margin-top:12px;text-align:right;display: flex;justify-content: end;gap: 10px;"><button class="ok">${ok}</button><button class="cancel">${cancel}</button></div></div>`);
    const done = (v) => { close(); resolve(v); }; el.querySelector('.ok')?.addEventListener('click', () => done(true)); el.querySelector('.cancel')?.addEventListener('click', () => done(false));
  });
  const risk = () => new Promise((resolve) => {
    let n = 3; const parts = flashPartsText();
    const { el, close } = createFixedToast('kr_risk', `<div style="pointer-events:all;width:90vw;max-width:520px;"><div class="title" style="margin:0;color:#ffb3b3;">Root 刷入高风险警告</div><div style="margin-top:10px;padding:12px;border-radius:12px;background:rgba(255,70,70,.12);border:1px solid rgba(255,90,90,.28);font-size:.72rem;line-height:1.8;">写入 ${parts} 属于高风险操作，错误镜像、错误槽位或写入中断都可能导致无法启动或永久数据损坏。<br>请确保你设备供电充足，请不要中途拔掉电源！！！！，也不要用拔掉电源代替重启！！！重启请在后台内点击！！！</div><div style="margin-top:12px;text-align:right;"><button class="go" disabled>请等待 ${n}s</button></div></div>`);
    const go = el.querySelector('.go'); const timer = setInterval(() => { n -= 1; if (n > 0) { if (go) go.textContent = `请等待 ${n}s`; return; } clearInterval(timer); if (go) { go.disabled = false; go.textContent = '我已知晓风险，继续'; } }, 1000);
    go?.addEventListener('click', () => { clearInterval(timer); close(); resolve(true); });
  });
  const ddInfo = (t) => { const m = String(t || '').trim().match(/(\d+)\s+bytes.*copied,\s*([0-9.]+)\s*s,\s*([0-9.]+\s*[A-Za-z/]+)\s*$/im); return { bytes: m ? Number(m[1]) : null, secs: m ? Number(m[2]) : null, speed: m ? m[3] : '' }; };
  const showRes = (steps) => {
    const ok = steps.every((x) => x.ok);
    const { el } = createFixedToast('kr_res', `<div style="pointer-events:all;width:92vw;max-width:620px;"><div class="title" style="margin:0">${ok ? 'Root 刷入完成' : 'Root 刷入结束，但存在失败项'}</div><div style="margin-top:10px;font-size:.68rem;line-height:1.5;max-height:65vh;overflow:auto;">${steps.map((x) => { const p = ddInfo(x.output); return `<div style="margin-bottom:10px;padding:10px;border-radius:12px;background:rgba(255,255,255,.04);"><div><b>${esc(x.label)}</b> <span style="color:${x.ok ? '#8ff0a7' : '#ff9a9a'}">${x.ok ? '成功' : '失败'}</span></div><div>目标分区：<code>${esc(x.partition)}</code></div><div>镜像文件：<code>${esc(x.fileName)}</code></div><div>写入大小：${p.bytes ? esc(fmt(p.bytes)) : '-'}</div><div>耗时：${p.secs ? esc(`${p.secs}s`) : '-'}</div><div>速度：${esc(p.speed || '-')}</div><pre style="margin-top:8px;max-height:120px;overflow:auto;white-space:pre-wrap;word-break:break-all;background:rgba(0,0,0,.22);padding:8px;border-radius:10px;">${esc(x.output || '-')}</pre></div>`; }).join('')}</div><div style="margin-top:12px;text-align:right;"><button class="close">关闭</button></div></div>`);
    el.querySelector('.close')?.addEventListener('click', async () => { el.remove(); await run(`rm -rf ${sq(ROOT_DIR)} && mkdir -p ${sq(ROOT_DIR)}`); });
  };
  const flash = async () => {
    const steps = [];
    for (const key of FLASH_ITEMS) {
      if (!needFlash(key)) continue;
      const m = metaOf(key);
      const f = fileOf(key); const t = targetForKey(key);
      if (!f || !t) { steps.push({ ok: false, label: m?.label || key, partition: t?.name || '-', fileName: f?.path || '-', output: '缺少目标分区或镜像文件' }); break; }
      setBusy(true, `正在刷入 ${m?.label || key}...`);
      const r = await run(`PART=${sq(t.realPath || t.linkPath)}\nIMG=${sq(f.path)}\nREMOTE_SUM="$(${csumCmd(f.path)})"\nREMOTE_SIZE="$(${sizeCmd(f.path)})"\n[ "$REMOTE_SUM" = ${sq(f.actualChecksum)} ] || { echo "__SUM_MISMATCH__"; exit 3; }\n[ "$REMOTE_SIZE" = ${sq(String(f.size))} ] || { echo "__SIZE_MISMATCH__"; exit 4; }\ndd if="$IMG" of="$PART" bs=4M conv=fsync 2>&1\nsync\necho "__FLASH_OK__"`, 6e5);
      const ok = r.ok && !r.text.includes('__SUM_MISMATCH__') && !r.text.includes('__SIZE_MISMATCH__') && r.text.includes('__FLASH_OK__');
      steps.push({ ok, label: m?.label || key, partition: t.name, fileName: f.path, output: String(r.text || '').replaceAll('__FLASH_OK__', '').trim() });
      if (!ok) break;
    }
    setBusy(false, '空闲'); showRes(steps);
  };
  const start = async () => {
    const nrModemAvailable = !!state.pkg?.files?.nr_modem?.exists && !!state.pkg?.files?.nr_modem?.verified;
    state.useNrModem = false;
    if (nrModemAvailable) {
      state.useNrModem = await ask('kr_nr_modem', '是否加载基带补丁？', '该Root包自带基带补丁，是否加载基带补丁？基带补丁可以用来修复串号显示<br>插件会加载当前系统版本对应的基带包，请确保系统版本与机身型号完全一致，刷入不匹配的基带会导致无信号甚至损坏设备（如普通版U30 Air刷亚太版补丁会直接无信号）！！！<br>千万要注意！！！！！！！！<br>如果你不想刷基带，请点“否”跳过基带', '是', '否');
      render();
    }
    if (FLASH_ITEMS.some((key) => needFlash(key) && !targetForKey(key))) return createToast('当前活动槽位缺少目标分区，无法执行一键 Root', 'red', 6000);
    if (!ready()) return createToast('请先下载并校验 Root 包', 'red', 5000);
    if (!await ask('kr_c1', '确认开始 Root 刷入流程', `插件将按当前活动槽位自动刷入 ${flashPartsText()}。请确认下载包已完成校验，刷入成功后重启生效。`)) return;
    await risk();
    const body = FLASH_ITEMS.filter((key) => needFlash(key)).map((key) => { const m = metaOf(key); const f = fileOf(key), t = targetForKey(key); return `<div style="margin-bottom:10px;padding:10px;border-radius:12px;background:rgba(255,255,255,.04);"><div><b>${esc(m?.label || key)}</b></div><div>镜像文件：<code>${esc(f?.path || '-')}</code></div><div>目标分区：<code>${esc(t?.name || '-')}</code></div><div>目标设备：<code>${esc(t?.realPath || t?.linkPath || '-')}</code></div></div>`; }).join('');
    if (!await ask('kr_c2', '最终确认刷入信息', `<div style="max-height:60vh;overflow:auto;">${body}</div>`, '确认刷入')) return;
    await flash();
  };
  const refresh = async (toast = false) => {
    try {
      setBusy(true, '正在加载设备信息...');
      setProg('正在加载设备信息...', 20, true);
      await fetchInfo();
      setBusy(true, '正在扫描分区列表...');
      setProg('正在扫描分区列表，首次可能稍慢...', 55, true);
      await fetchParts();
      setBusy(true, '正在匹配远端 Root 包...');
      setProg('正在匹配远端 Root 包...', 85, true);
      await fetchRemote();
      setBusy(false, '空闲');
      setProg('', 0, false);
      render();
      if (toast) createToast(state.pkg?.matched ? `已匹配 Root 包：${state.pkg.remoteName}` : (state.pkg?.reason || '未匹配到 Root 包'), state.pkg?.matched ? 'green' : 'red', 5000);
    }
    catch (e) {
      setBusy(false, '空闲');
      setProg('', 0, false);
      console.error(e);
      createToast(`刷新失败：${e}`, 'red', 5000);
    }
  };
  const open = async () => {
    document.querySelector(`#${MODAL}`)?.remove(); ensureStyle();
    const { id, el } = createModal({ name: MODAL, title: '一键 Root 工具箱 · 在线版', maxWidth: '1020px', showConfirm: false, contentStyle: 'max-height:76vh;', isMask: true, onClose: () => true, content: `<div class="k"><div class="b"><div style="font-size:.68rem;line-height:1.6;opacity:.86">插件会自动匹配远端 Root 包，请滚动到最下方，按照按钮顺序一步一步执行，某些机型可选刷入显串基带，刷入时会弹窗提示是否刷入基带<br>Root刷入成功后，可以点击安装面具APK，如果你想自己安装面具，请使用28103版本，切勿使用其他版本，以免覆盖掉OTA屏蔽补丁<br>全部刷入完成后，重启机器，在插件商店安装“<span style="color:pink;font-weight:bold" onclick="copyText(event)">【UFI插件】查询机器是否已经Root和禁用更新</span>”可以查询Root结果。</div></div><div class="g"><div class="b"><div class="s">设备</div><div class="v" id="kr_device">-</div></div><div class="b"><div class="s">当前活动槽位</div><div class="v" id="kr_slot">-</div></div><div class="b"><div class="s">内部版本号</div><div class="v" id="kr_build">-</div></div><div class="b"><div class="s">校验状态</div><div class="v" id="kr_ready">0 / 2</div></div></div><div class="b"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px;font-size:.78rem;font-weight:800"><span>远端 Root 包</span><span id="kr_chip" class="chip warn">检查中</span></div><div id="kr_pkg"></div><div id="kr_prog" style="display:none;margin-top:8px"><div id="kr_prog_text" style="font-size:.68rem;line-height:1.6;opacity:.86">处理中...</div><div class="bar"><div id="kr_prog_fill" class="fill"></div></div></div></div><div class="b"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px;font-size:.78rem;font-weight:800"><span>镜像校验</span><span style="font-size:.66rem;opacity:.8">下载后自动执行 sha256 校验</span></div><div id="kr_cards" class="cards"></div></div><div class="b"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:.78rem;font-weight:800"><span>状态</span><span id="kr_status" style="font-size:.68rem;opacity:.86">空闲</span></div></div><div class="b"><div style="display:flex;flex-wrap:wrap;gap:10px"><button id="kr_refresh_btn">刷新</button><button id="kr_download_btn">1.下载并校验 Root 包</button><button id="kr_root_btn">2.开始一键 Root 刷入</button><button id="kr_magisk_btn">3.安装面具APK</button><button id="reboot_rooted_btn">4.全部完成后点我重启生效</button></div></div></div>` });
    el.querySelector('#kr_refresh_btn').onclick = async () => await refresh(true);
    el.querySelector('#kr_download_btn').onclick = async () => await downloadPkg();
    el.querySelector('#kr_root_btn').onclick = async () => await start();
    el.querySelector('#kr_magisk_btn').onclick = async () => await installMagisk();
    el.querySelector('#reboot_rooted_btn').onclick = async () => await rebootDevice();
    showModal(id); await refresh();
  };
  const btn = document.createElement('button'); btn.textContent = '一键 Root 工具箱·在线版';
  btn.onclick = async () => { const who = await run('whoami'); if (!who.ok || !String(who.text || '').includes('root')) return createToast('请先启用高级功能', 'red'); await open(); };
  while (!document.querySelector('.actions-buttons')) await wait(150);
  document.querySelector('.actions-buttons')?.appendChild(btn);
})();
//</script>
