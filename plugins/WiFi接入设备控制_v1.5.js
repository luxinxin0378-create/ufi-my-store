<!-- WiFi接入设备控制 v1.5.0 | FM_U20(展锐T158) | 完整变更历史见未压缩版 -->
<style>#IFRAME_UFI_DEVCTRL .udc-card{width: 100%}#IFRAME_UFI_DEVCTRL .udc-box{background: rgba(255,255,255,0.02);border: 1px solid rgba(255,255,255,0.06);border-radius: 12px;padding: 10px;margin-bottom: 10px}#IFRAME_UFI_DEVCTRL .udc-grid4{display: grid;grid-template-columns: repeat(4,1fr);gap: 8px;text-align: center}#IFRAME_UFI_DEVCTRL .udc-cell{padding: 10px 4px;background: rgba(255,255,255,0.03);border-radius: 10px}#IFRAME_UFI_DEVCTRL .udc-cell .k{font-size: 10px;opacity: .55}#IFRAME_UFI_DEVCTRL .udc-cell .v{font-size: 18px;font-weight: 900;color: var(--dark-btn-color-active,#4ea1ff)}#IFRAME_UFI_DEVCTRL .udc-cell .v.sm{font-size: 13px;font-weight: 800;color: inherit}#IFRAME_UFI_DEVCTRL .udc-btn{font-size: 12px;padding: 5px 11px;border-radius: 8px;border: 1px solid rgba(255,255,255,0.14);background: rgba(255,255,255,0.05);color: inherit;cursor: pointer;white-space: nowrap}#IFRAME_UFI_DEVCTRL .udc-btn:active{transform: scale(.96)}#IFRAME_UFI_DEVCTRL .udc-btn:disabled{opacity: .45;cursor: default}#IFRAME_UFI_DEVCTRL .udc-btn.danger{background: rgba(255,107,107,0.12);color: #ff6b6b;border-color: rgba(255,107,107,0.32)}#IFRAME_UFI_DEVCTRL .udc-btn.on{background: var(--dark-btn-color-active,#4ea1ff);color: #fff;border-color: transparent}#IFRAME_UFI_DEVCTRL .udc-btn.primary{border-color: rgba(78,161,255,0.45);color: var(--dark-btn-color-active,#4ea1ff);font-weight: 700}#IFRAME_UFI_DEVCTRL .udc-mini{display: inline-flex;align-items: center;justify-content: center;width: 26px;height: 26px;line-height: 1;font-size: 12px;padding: 0;margin: 1px;border-radius: 7px;border: 1px solid rgba(255,255,255,0.14);background: rgba(255,255,255,0.05);color: inherit;cursor: pointer}#IFRAME_UFI_DEVCTRL .udc-mini:active{transform: scale(.9)}#IFRAME_UFI_DEVCTRL .udc-mini.warn{background: rgba(255,107,107,0.16);border-color: rgba(255,107,107,0.4)}#IFRAME_UFI_DEVCTRL .udc-mini.ok{background: rgba(74,222,128,0.16);border-color: rgba(74,222,128,0.4)}#IFRAME_UFI_DEVCTRL table.udc-tbl{width: 100%;border-collapse: collapse;font-size: 12px}#IFRAME_UFI_DEVCTRL table.udc-tbl th{padding: 8px 6px;font-size: 10px;opacity: .6;font-weight: 600;border-bottom: 2px solid rgba(255,255,255,0.08);text-align: left;white-space: nowrap}#IFRAME_UFI_DEVCTRL table.udc-tbl td{padding: 9px 6px;border-bottom: 1px solid rgba(255,255,255,0.04);vertical-align: middle}#IFRAME_UFI_DEVCTRL tr.udc-blocked{background: rgba(255,107,107,0.07)}#IFRAME_UFI_DEVCTRL .udc-mono{font-family: monospace}#IFRAME_UFI_DEVCTRL .udc-sub{font-size: 10px;opacity: .5}#IFRAME_UFI_DEVCTRL .udc-tag{display: inline-block;font-size: 9px;padding: 1px 5px;border-radius: 4px;background: rgba(255,107,107,0.18);color: #ff8787;margin-left: 4px;vertical-align: middle}#IFRAME_UFI_DEVCTRL .udc-tag.lim{background: rgba(250,204,21,0.16);color: #facc15}#IFRAME_UFI_DEVCTRL .udc-fld{margin-bottom: 10px}#IFRAME_UFI_DEVCTRL .udc-fld label{display: block;font-size: 11px;opacity: .65;margin-bottom: 4px}#IFRAME_UFI_DEVCTRL .udc-inp{width: 100%;box-sizing: border-box;padding: 8px 10px;border-radius: 7px;border: 1px solid rgba(255,255,255,0.12);background: rgba(255,255,255,0.05);color: inherit;font-size: 13px}#IFRAME_UFI_DEVCTRL .udc-hint{font-size: 10px;opacity: .5;margin-top: 6px;line-height: 1.5}#IFRAME_UFI_DEVCTRL .udc-row{display: flex;gap: 6px;align-items: center;flex-wrap: wrap}#IFRAME_UFI_DEVCTRL .udc-sep{height: 1px;background: rgba(255,255,255,0.07);margin: 12px 0}#IFRAME_UFI_DEVCTRL .udc-pre{background: rgba(255,255,255,0.04);padding: 8px;border-radius: 6px;margin: 0;white-space: pre-wrap;word-break: break-all;font-size: 10px;line-height: 1.45;max-height: 130px;overflow: auto}</style>
<script>
(function () {
'use strict';
var VERSION = '1.5.0';
var STAMP   = 'UDC-STAMP-v1.5.0';
var BASE      = '/data/ufi_devctrl';
var DIR       = BASE + '/data';
var SVC       = BASE + '/service.sh';
var QOS       = BASE + '/qos.sh';
var SEENSH    = BASE + '/seen.sh';
var NAMESH    = BASE + '/names.sh';
var CONF      = BASE + '/device.conf';
var GCONF     = BASE + '/global.conf';
var LOG       = BASE + '/daemon.log';
var PIDF      = BASE + '/daemon.pid';
var BLACK     = BASE + '/blacklist.txt';
var BOOT_HOOK = '/sdcard/ufi_tools_boot.sh';
var BOOT_LINE = SVC + ' boot >/dev/null 2>&1 &';
var SEENF  = DIR + '/seen.txt';
var NAMESF = DIR + '/names.txt';
var UNITFL = DIR + '/unit_v2';
var CHAIN      = 'UFI_DC';
var MARK_CHAIN = 'UFI_DC_MARK';
var CLS_CHAIN  = 'UFI_DC_CLS';
var LS_CFG    = 'ufi_devctrl_cfg_v1';
var LS_LEASES = 'ufi_devctrl_leases_v1';
var LS_AUTO   = 'ufi_devctrl_auto_v1';
var LS_COLLAPSE = '#collapse_devctrl';
var REFRESH_MS = 3000;
var CLOCK_MS  = 1000;
var SEEN_GAP  = 600;
var SEEN_KEEP = 2592000;
var ONLINE_MS = 180000;
var NAME_KEEP = 2592000;
var SNIFF_SEC = 6;
var SNIFF_GAP = 600000;
var MAX_KBS   = 125000;
var devList   = [];
var ruleIps   = {};
var prevCtr   = {};
var cfg       = {};
var blacklist = [];
var usageMap  = {};
var dhcpNames = {};
var leasesPath = '';
var localIp = '';
var lanIface = '';
var probeRaw = {};
var seenMap = {};
var clockTimer = null;
var seenShReady = false;
var seenWarned  = false;
var confLoaded  = false;
var confDirty   = false;
var confMigrated= false;
var cfgLocalTs  = {};
var timer = null;
var busy = false;
var pendingManual = false;
var daemonOn = null;
var chainReady = false;
var modalSeq = 0;
var nameMap = {};
var nameSniffTs = 0;
var nameProbing = false;
var namesLoaded = false;
var namesDirty = false;
var namesSaveTs = 0;
var unitMigrated = false;
var qosStampOk = null;
var scriptsReady = false;
var lastQosResult = null;
function out(r) {
if (r === null || r === undefined) return '';
var s = r.content || r.result || r.stdout || r.output || r.data || '';
return String(s);
}
function sh(cmd) {
if (typeof runShellWithRoot !== 'function') {
return Promise.reject(new Error('runShellWithRoot 不可用，请确认已开启高级功能'));
}
return runShellWithRoot(cmd).then(function (r) { return out(r); });
}
function toast(msg, color) {
try {
if (typeof createToast === 'function') { createToast(msg, color || 'green', 2600); return; }
} catch (e) {}
console.log('[设备控制] ' + msg);
}
var uidSeq = 0;
function uniq(p) { uidSeq++; return p + '_u' + uidSeq; }
function esc(t) {
if (t === null || t === undefined) return '';
var d = document.createElement('div');
d.textContent = String(t);
return d.innerHTML;
}
function fmtBytes(n) {
try {
if (typeof formatBytes === 'function') return formatBytes(n);
} catch (e) {}
n = Number(n) || 0;
var u = ['B', 'KB', 'MB', 'GB', 'TB'];
var i = 0;
while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
return (i === 0 ? String(n) : n.toFixed(1)) + ' ' + u[i];
}
function fmtSpeed(bps) {
bps = Number(bps) || 0;
if (bps < 1) return '<span style="opacity:.3">0</span>';
if (bps < 1024) return bps.toFixed(0) + ' B/s';
var u = ['KB/s', 'MB/s', 'GB/s'];
var v = bps / 1024, i = 0;
while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
return v.toFixed(v < 10 ? 1 : 0) + ' ' + u[i];
}
var OUI = {
'Apple': ['001cb3','042665','0c74c2','1094bb','189efc','1c9148','286ab8','2cf0ee','3412f9',
'403cfc','48d705','542696','5c95ae','60334b','6c709f','787b8a','848e0c','908d6c',
'985aeb','a8968a','acbc32','b03495','b8098a','c09f42','cc08e0','d0817a','d89e3f',
'dc2b2a','e0b52d','ec3586','f02475','f41ba1','f81edf','3c15c2','a483e7','f01898',
'8c8590','705681','147dda'],
'Samsung': ['001247','08ea40','10d38a','183b25','2013e0','285fdb','342387','388af0','400e85',
'489ebd','5001d9','5c0a5b','682737','781fdb','8425db','8c7712','a0821f','ac5f3e',
'b48b19','c0bdd1','cc07ab','d022be','e423e5','f409d8'],
'Xiaomi': ['7811dc','8cbebe','640980','3480b3','98fae3','a09f10','102ab3','2082c0','4c49e3',
'508f4c','7802f8','9c99a0','c40bcb','f8a45f','0c1daf','185936','3c3300','44237c',
'64b473','74acb9','7c1dd9'],
'Huawei': ['009acd','049fca','0c37dc','104780','200bc0','283152','342912','404d8e','4846fb',
'5475d5','5cea1d','708a09','78db2f','84a423','8c71f8','94049c','a08cf2','ace2d3',
'b0359f','c43abe','cc96a0','d07ab5','e0247f'],
'OPPO': ['086ad1','188796','30ae7b','409e2f','549835','60ab67','683e34','8cf5a3','98bb1e',
'acc1ee','c0eefb','d46a6a','e076d0','f48c50','2c4d54'],
'Intel': ['0013ce','00166f','001cbf','001de5','00216a','0024d7','3ca9f4','685d43','7c5cf8',
'8c1645','a0369f','aced5c','b46bfc','c809a8','d0c637','e4a471','f835dd'],
'TP-Link': ['001478','001d0f','0023cd','002719','10feed','14cc20','18a6f7','1c3bf3','30b5c2',
'50c7bf','60e327','74da38','98dac4','a0f3c1','ac84c6','b04e26','c025e9','d80d17',
'e4d332','f4ec38'],
'Google': ['f4f5d8','3c5ab4','546009','a47733','20dfb9','94eb2c','30fdca','48d6d5'],
'Realtek': ['00e04c','081079','1cbfce','2c0e3d','406186','52eacb','9cefd5','b025aa','c83a35','e0d55e'],
'Broadcom': ['001018','001a11','0026bb','0014a5','000b6b','0017f2']
};
var OUI_MAP = {};
(function () {
for (var v in OUI) {
if (!OUI.hasOwnProperty(v)) continue;
for (var i = 0; i < OUI[v].length; i++) OUI_MAP[OUI[v][i]] = v;
}
})();
function isRandomMac(mac) {
var p = String(mac || '').toLowerCase().replace(/[^0-9a-f]/g, '');
if (p.length < 2) return false;
return /[26ae]/.test(p.charAt(1));
}
function guessVendor(mac) {
if (isRandomMac(mac)) return '';
var p = String(mac || '').toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 6);
return OUI_MAP[p] || '';
}
function min2hm(m) {
m = Number(m) || 0;
var h = Math.floor(m / 60), mm = m % 60;
return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
}
function hm2min(s) {
if (!s) return 0;
var p = String(s).split(':');
return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
}
function keyOf(mac) { return String(mac || '').replace(/:/g, '_'); }
function validMac(m) { return /^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/i.test(String(m || '')); }
function loadCfg() {
try {
var s = localStorage.getItem(LS_CFG);
cfg = s ? (JSON.parse(s) || {}) : {};
} catch (e) { cfg = {}; }
try {
leasesPath = localStorage.getItem(LS_LEASES) || '';
} catch (e) { leasesPath = ''; }
}
function saveCfg() {
try { localStorage.setItem(LS_CFG, JSON.stringify(cfg)); } catch (e) {}
}
function getCfg(mac) {
if (!cfg[mac]) cfg[mac] = { name: '', up: 0, down: 0, dmin: 0, st: 0, ed: 0 };
var c = cfg[mac];
c.up = Number(c.up) || 0;
c.down = Number(c.down) || 0;
c.dmin = Number(c.dmin) || 0;
c.st = Number(c.st) || 0;
c.ed = Number(c.ed) || 0;
return c;
}
function kbs2kbit(kbs) {
var v = Math.max(0, parseInt(kbs, 10) || 0);
if (v > MAX_KBS) v = MAX_KBS;
return v * 8;
}
function fmtRate(kbs) {
var v = Number(kbs) || 0;
if (v <= 0) return '0';
if (v >= 1024) return (v / 1024).toFixed(v % 1024 === 0 ? 0 : 1) + 'MB/s';
return v + 'KB/s';
}
function resolveName(mac, ip) {
var c = cfg[mac];
if (c && c.name) return { text: c.name, kind: 'custom' };
var h = dhcpNames[mac] || (nameMap[mac] ? nameMap[mac].name : '') || '';
if (h) return { text: h, kind: 'host' };
var tail = String(ip || '').split('.').pop() || '?';
var vendor = guessVendor(mac);
if (vendor) return { text: vendor + '-' + tail, kind: 'vendor' };
if (isRandomMac(mac)) return { text: '未知设备-' + tail, kind: 'random' };
return { text: '未知设备-' + tail, kind: 'unknown' };
}
function nameOf(mac, ip) { return resolveName(mac, ip).text; }
function needIdentify(mac) {
var c = cfg[mac];
if (c && c.name) return false;
if (dhcpNames[mac]) return false;
if (nameMap[mac] && nameMap[mac].name) return false;
return true;
}
function setName(mac, name) {
if (!validMac(mac)) return false;
var v = sanitizeName(name);
if (!v || v === '*') return false;
var now = Math.floor(Date.now() / 1000);
var old = nameMap[mac];
if (old && old.name === v) { old.ts = now; return false; }
nameMap[mac] = { name: v, ts: now };
return true;
}
function parseNames(lines) {
var now = Math.floor(Date.now() / 1000);
var merged = {};
var has = function (m) { return merged[m] ? true : false; };
for (var i = 0; i < (lines || []).length; i++) {
var t = String(lines[i] || '').trim();
if (!t || t.charAt(0) === '#') continue;
var p = t.split('|');
if (p.length < 3) continue;
var mac = String(p[0] || '').trim().toLowerCase();
if (!validMac(mac)) continue;
var ts = parseInt(p[2], 10) || 0;
if (ts && now - ts > NAME_KEEP) continue;
merged[mac] = { name: sanitizeName(p[1]), ts: ts || now };
}
for (var m in nameMap) {
if (!nameMap.hasOwnProperty(m)) continue;
if (!has(m) || (nameMap[m].ts || 0) >= merged[m].ts) merged[m] = nameMap[m];
}
nameMap = merged;
namesLoaded = true;
}
function saveNames() {
var rows = [];
for (var mac in nameMap) {
if (!nameMap.hasOwnProperty(mac)) continue;
if (!nameMap[mac].name) continue;
rows.push(mac + '|' + nameMap[mac].name + '|' + nameMap[mac].ts);
}
var txt = '# mac|hostname|ts\n' + rows.join('\n') + '\n';
return writeFile(NAMESF, txt, 'UDCNAME-' + hash32(txt));
}
function buildSeenShell() {
return [
'#!/system/bin/sh',
'# UFI Device Control - seen recorder v' + VERSION,
'# ' + STAMP,
'SEEN=' + SEENF,
'GAP=' + SEEN_GAP,
'KEEP=' + SEEN_KEEP,
'',
'NOW=$(date +%s)',
'[ -z "$NOW" ] && exit 0',
'mkdir -p ' + DIR + ' 2>/dev/null',
'STMP="$SEEN.tmp.$$"',
': > "$STMP" 2>/dev/null || exit 0',
'',
'# --- online devices: refresh last; bump count only on a NEW connection ---',
'awk \'NR>1 && NF>=6 && $3!="0x0" && $4!="00:00:00:00:00:00" { print tolower($4)" "$1 }\' /proc/net/arp 2>/dev/null | while read -r m ip; do',
'  [ -z "$m" ] && continue',
'  OLD=""',
'  [ -f "$SEEN" ] && OLD=$(grep -i "^$m|" "$SEEN" 2>/dev/null | head -1)',
'  if [ -n "$OLD" ]; then',
'    F=$(echo "$OLD" | awk -F\'|\' \'{print $2}\')',
'    L=$(echo "$OLD" | awk -F\'|\' \'{print $3}\')',
'    C=$(echo "$OLD" | awk -F\'|\' \'{print $5}\')',
'    [ -z "$F" ] && F=$NOW',
'    [ -z "$L" ] && L=$NOW',
'    [ -z "$C" ] && C=1',
'    if [ $((NOW - L)) -gt $GAP ]; then',
'      # reappearing after GAP = new connection: reset clock and bump count',
'      F=$NOW; C=$((C + 1))',
'    fi',
'    echo "$m|$F|$NOW|$ip|$C"',
'  else',
'    # first sighting = connection #1',
'    echo "$m|$NOW|$NOW|$ip|1"',
'  fi',
'done >> "$STMP" 2>/dev/null',
'',
'# --- keep offline records, drop entries older than KEEP ---',
'CUT=$((NOW - KEEP))',
'if [ -f "$SEEN" ]; then',
'  while IFS= read -r line; do',
'    [ -z "$line" ] && continue',
'    m=$(echo "$line" | awk -F\'|\' \'{print $1}\')',
'    [ -z "$m" ] && continue',
'    grep -q -i "^$m|" "$STMP" 2>/dev/null && continue',
'    L=$(echo "$line" | awk -F\'|\' \'{print $3}\')',
'    [ -z "$L" ] && L=$NOW',
'    [ "$L" -lt "$CUT" ] && continue',
'    echo "$line"',
'  done < "$SEEN" >> "$STMP" 2>/dev/null',
'fi',
'',
'mv "$STMP" "$SEEN" 2>/dev/null',
'rm -f "$STMP" 2>/dev/null',
'exit 0'
].join('\n');
}
function hasStamp(path, stamp) {
return sh('grep -q "' + stamp + '" ' + path + ' 2>/dev/null && echo YES || echo NO')
.then(function (r) { return String(r || '').indexOf('YES') >= 0; })
.catch(function () { return false; });
}
function resetSeenCounts() {
var AWK = "awk -F'|' 'NF>=5 && length($1)>0 { print $1\"|\"$2\"|\"$3\"|\"$4\"|1\" }'";
var cmd = 'if [ -f ' + SEENF + ' ]; then ' + AWK + ' ' + SEENF +
' > ' + SEENF + '.fix 2>/dev/null; ' +
'S=$(wc -c < ' + SEENF + '.fix 2>/dev/null | tr -d " "); ' +
'if [ -n "$S" ] && [ "$S" -gt 0 ]; then mv ' + SEENF + '.fix ' + SEENF + '; else rm -f ' + SEENF + '.fix; fi; ' +
'fi; echo ok';
return sh(cmd).catch(function () {});
}
function ensureSeenSh() {
if (seenShReady) return Promise.resolve(true);
return hasStamp(SEENSH, STAMP).then(function (fresh) {
if (fresh) { seenShReady = true; return true; }
return writeFile(SEENSH, buildSeenShell(), STAMP).then(function (ok) {
return hasStamp(SEENSH, STAMP).then(function (really) {
if (!ok || !really) return false;
sh('chmod 755 ' + SEENSH + ' 2>/dev/null');
seenShReady = true;
return resetSeenCounts().then(function () { return true; });
});
});
}).catch(function () { return false; });
}
function ensureScripts() {
if (scriptsReady) return Promise.resolve(true);
var jobs = [
{ p: QOS, gen: buildQosShell },
{ p: SEENSH, gen: buildSeenShell },
{ p: NAMESH, gen: buildNamesShell }
];
var chain = Promise.resolve(true);
jobs.forEach(function (j) {
chain = chain.then(function (prev) {
return writeFile(j.p, j.gen(), STAMP).then(function (ok) {
return hasStamp(j.p, STAMP).then(function (really) { return prev && ok && really; });
});
});
});
return chain.then(function (ok) {
if (!ok) return false;
return sh('chmod 755 ' + QOS + ' ' + SEENSH + ' ' + NAMESH + ' 2>/dev/null; echo ok')
.then(function () {
scriptsReady = true;
seenShReady = true;
qosStampOk = null;
return true;
});
}).catch(function () { return false; });
}
function openModal(opt) {
if (typeof createModal === 'function' && typeof showModal === 'function') {
try {
var r = createModal({
name: 'udc_modal_' + (++modalSeq),
title: opt.title || '',
maxWidth: opt.maxWidth || '420px',
showConfirm: !!opt.onConfirm,
confirmBtnText: opt.confirmText || '保存',
closeBtnText: opt.closeText || '关闭',
onClose: function () { return true; },
onConfirm: function () {
try { if (opt.onConfirm) opt.onConfirm(r.el); } catch (e) { console.error(e); }
return true;
},
content: opt.content || ''
});
showModal(r.id);
return r.el;
} catch (e) {
console.warn('[设备控制] createModal 失败，降级自建弹窗', e);
}
}
return fallbackModal(opt);
}
function fallbackModal(opt) {
var wrap = document.createElement('div');
wrap.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:99998;' +
'background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:16px;';
var box = document.createElement('div');
box.style.cssText = 'width:100%;max-width:' + (opt.maxWidth || '420px') + ';max-height:84vh;overflow:auto;' +
'background:#1b1e25;color:#e8eaed;border-radius:12px;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,.55);';
box.innerHTML =
'<div style="font-size:15px;font-weight:800;margin-bottom:10px;">' + esc(opt.title || '') + '</div>' +
'<div class="udc-mbody">' + (opt.content || '') + '</div>' +
'<div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end;">' +
'<button data-a="c" style="padding:7px 14px;border-radius:7px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:inherit;cursor:pointer;">' +
esc(opt.closeText || '关闭') + '</button>' +
(opt.onConfirm ? '<button data-a="o" style="padding:7px 14px;border-radius:7px;border:none;background:#4ea1ff;color:#fff;cursor:pointer;">' +
esc(opt.confirmText || '保存') + '</button>' : '') +
'</div>';
wrap.appendChild(box);
document.body.appendChild(wrap);
box.addEventListener('click', function (e) {
var a = e.target.getAttribute && e.target.getAttribute('data-a');
if (a === 'c') { document.body.removeChild(wrap); }
else if (a === 'o') {
try { if (opt.onConfirm) opt.onConfirm(box); } catch (err) { console.error(err); }
document.body.removeChild(wrap);
}
});
wrap.addEventListener('click', function (e) {
if (e.target === wrap) document.body.removeChild(wrap);
});
return box;
}
function confirmBox(title, msg, onYes, yesText) {
var el = openModal({
title: title,
maxWidth: '360px',
confirmText: yesText || '确定',
closeText: '取消',
content: '<div style="font-size:13px;line-height:1.6;opacity:.85;">' + msg + '</div>',
onConfirm: function () { onYes(); }
});
return el;
}
function fileSize(p) {
return sh('wc -c < ' + p + ' 2>/dev/null | tr -d " "')
.then(function (s) { return parseInt(String(s).trim(), 10) || 0; })
.catch(function () { return 0; });
}
function verifyFile(p, stamp, content) {
if (stamp) return hasStamp(p, stamp);
var want = String(content).length;
if (!want) return Promise.resolve(false);
return fileSize(p).then(function (sz) { return sz >= Math.floor(want * 0.9); });
}
function writeFile(p, content, stamp, always) {
var txt = String(content);
var verify = function () { return verifyFile(p, stamp, txt); };
if (always) return forceWrite(p, txt, verify);
return verify().then(function (fresh) {
if (fresh) return true;
return forceWrite(p, txt, verify);
});
}
function utf8ToB64(str) {
var s = String(str), bytes = [], i, c, c2, cp;
for (i = 0; i < s.length; i++) {
c = s.charCodeAt(i);
if (c < 0x80) {
bytes.push(c);
} else if (c < 0x800) {
bytes.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F));
} else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) {
c2 = s.charCodeAt(i + 1);
if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
cp = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
bytes.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3F),
0x80 | ((cp >> 6) & 0x3F), 0x80 | (cp & 0x3F));
i++;
} else {
bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
}
} else {
bytes.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F));
}
}
var bin = '';
for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
try { return btoa(bin); } catch (e) { return ''; }
}
function hash32(str) {
var h = 5381, s = String(str);
for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
return h.toString(36);
}
function forceWrite(p, content, verify) {
var wipe = function () {
return sh('rm -f ' + p + ' ' + p + '.b64 ' + p + '.fix 2>/dev/null; echo ok')
.catch(function () { return ''; });
};
var step1 = (typeof saveConfig === 'function')
? wipe()
.then(function () { return saveConfig(p, content); })
.then(verify)
.catch(function () { return false; })
: Promise.resolve(false);
return step1.then(function (ok) {
if (ok) return true;
var b64;
try { b64 = utf8ToB64(content); }
catch (e) { b64 = ''; }
if (!b64) return Promise.resolve(false);
return wipe().then(function () {
var N = 1800, chain = Promise.resolve();
for (var i = 0; i < b64.length; i += N) {
(function (chunk) {
chain = chain.then(function () {
return sh('printf "%s" ' + "'" + chunk + "'" + ' >> ' + p + '.b64');
});
})(b64.slice(i, i + N));
}
return chain;
})
.then(function () {
return sh('base64 -d ' + p + '.b64 > ' + p + ' 2>/dev/null; rm -f ' + p + '.b64; echo ok');
})
.then(verify)
.catch(function () { return false; });
}).then(function (ok) {
if (ok) return true;
var DELIM = 'UFIDC_EOF_9x';
var body = String(content).replace(new RegExp(DELIM, 'g'), 'UFIDC_EOF_X');
var cmd = 'rm -f ' + p + "; cat > " + p + " << '" + DELIM + "'\n" + body + '\n' + DELIM;
return sh(cmd).then(verify).catch(function () { return false; });
});
}
var LEASES_LIST = '/data/misc/apexdata/com.android.tethering/dnsmasq.leases ' +
'/data/misc/dhcp/dnsmasq.leases /var/lib/misc/dnsmasq.leases ' +
'/tmp/dnsmasq.leases /data/dnsmasq.leases /etc/dnsmasq.leases ' +
'/data/misc/dhcp/dhcp.leases /data/local/tmp/dnsmasq.leases';
function buildQosShell() {
return [
'#!/system/bin/sh',
'# UFI Device Control - QoS applier v' + VERSION,
'# ' + STAMP,
'CONF=' + CONF,
'',
'PATH=/system/bin:/system/xbin:/vendor/bin:/sbin:/su/bin:$PATH',
'export PATH',
'',
'log() { echo "$(date \'+%m-%d %H:%M:%S\') [qos] $1" >> ' + LOG + '; }',
'',
'# MAC -> IPv4。',
'# 必须跳过 flags=0x0 的失效条目：STA 断开后 ARP 记录还会赖着几分钟，',
'# 不跳过就会把限速挂到上一次的旧 IP 上，看起来就是"限速设了没反应"。',
'# ARP 里没有再退到 dnsmasq.leases：设备休眠 / 刚重连时 ARP 会短暂为空，',
'# 只查 ARP 会让整条规则被跳过，重连后要好几分钟才恢复。',
'mac2ip() {',
'  IP=$(awk -v m="$1" \'NR>1 && NF>=6 && $3!="0x0" && $4==m { print $1; exit }\' /proc/net/arp 2>/dev/null | head -1)',
'  if [ -n "$IP" ]; then echo "$IP"; return 0; fi',
'  for f in ' + LEASES_LIST + '; do',
'    [ -s "$f" ] || continue',
'    IP=$(awk -v m="$1" \'$2==m { print $3; exit }\' "$f" 2>/dev/null | head -1)',
'    if [ -n "$IP" ]; then echo "$IP"; return 0; fi',
'  done',
'  echo ""',
'}',
'',
'# MAC -> 全局 IPv6（可能有多个：稳定地址 + 临时地址）。',
'# 链路本地地址（fe80）不参与转发，排除掉。',
'mac2ip6() {',
'  ip -6 neigh show 2>/dev/null | grep -i "$1" | awk \'{print $1}\' | grep -v -i "^fe80" | head -3',
'}',
'',
'detect_lan() {',
'  D=$(awk \'NR>1 && NF>=6 && $3!="0x0" {print $6}\' /proc/net/arp 2>/dev/null | sort | uniq -c | sort -rn | head -1 | sed \'s/.* //\')',
'  if [ -n "$D" ] && [ -d "/sys/class/net/$D" ]; then echo "$D"; return 0; fi',
'  for i in wlan0 wlan1 ap0 br0; do',
'    if [ -d "/sys/class/net/$i" ]; then echo "$i"; return 0; fi',
'  done',
'  echo ""',
'}',
'',
'detect_wan() {',
'  ip route show default 2>/dev/null | awk \'{ for (i=1; i<=NF; i++) if ($i=="dev") { print $(i+1); exit } }\' | head -1',
'}',
'',
'TC_BIN=""',
'for c in /system/bin/tc /system/xbin/tc /vendor/bin/tc /sbin/tc /usr/bin/tc; do',
'  [ -x "$c" ] && TC_BIN="$c" && break',
'done',
'if [ -z "$TC_BIN" ]; then TC_BIN=$(which tc 2>/dev/null | head -1); fi',
'if [ -z "$TC_BIN" ]; then log "tc not available"; echo "NO_TC"; exit 1; fi',
'',
'# ip6tables 不一定编进内核，没有就只限 IPv4，不报错',
'IP6T=""',
'for c in /system/bin/ip6tables /system/xbin/ip6tables /vendor/bin/ip6tables /sbin/ip6tables; do',
'  [ -x "$c" ] && IP6T="$c" && break',
'done',
'if [ -z "$IP6T" ]; then IP6T=$(which ip6tables 2>/dev/null | head -1); fi',
'',
'LAN=$(detect_lan)',
'WAN=$(detect_wan)',
'if [ -z "$LAN" ]; then log "no lan iface"; echo "NO_LAN"; exit 1; fi',
'',
'# clear old qdisc',
'$TC_BIN qdisc del dev $LAN root >/dev/null 2>&1',
'if [ -n "$WAN" ]; then $TC_BIN qdisc del dev $WAN root >/dev/null 2>&1; fi',
'$TC_BIN qdisc add dev $LAN root handle 1: htb default 999',
'if [ -n "$WAN" ]; then $TC_BIN qdisc add dev $WAN root handle 1: htb default 999; fi',
'',
'# 默认类（不限速）。rate 不写死 1000000kbit：',
'# 部分内核的 HTB 会拒绝过大的 rate，一旦被拒，默认类根本建不起来，',
'# 未匹配流量就没有归属 —— 表现就是限速时好时坏、甚至整机不通。',
'# 这里从大到小逐级试，加完立刻回读确认，成功才停。',
'pick_def_rate() {',
'  D="$1"',
'  for R in 1000000 500000 200000 100000 50000 20000; do',
'    $TC_BIN class add dev "$D" parent 1: classid 1:999 htb rate "$R"kbit ceil "$R"kbit >/dev/null 2>&1',
'    if $TC_BIN class show dev "$D" 2>/dev/null | grep -q "1:999 "; then echo "$R"; return 0; fi',
'  done',
'  echo 100000',
'}',
'DEF_RATE=$(pick_def_rate $LAN)',
'if [ -n "$WAN" ]; then',
'  $TC_BIN class add dev $WAN parent 1: classid 1:999 htb rate "$DEF_RATE"kbit ceil "$DEF_RATE"kbit >/dev/null 2>&1',
'  if ! $TC_BIN class show dev $WAN 2>/dev/null | grep -q "1:999 "; then',
'    for R in 500000 200000 100000 50000 20000; do',
'      $TC_BIN class add dev $WAN parent 1: classid 1:999 htb rate "$R"kbit ceil "$R"kbit >/dev/null 2>&1',
'      if $TC_BIN class show dev $WAN 2>/dev/null | grep -q "1:999 "; then DEF_RATE=$R; break; fi',
'    done',
'  fi',
'fi',
'',
'# ---------- 机制探测：三条路，能走哪条走哪条 ----------',
'# 之前只走 fwmark 一条路，一旦它不通，上传就彻底失效（下载因为还有 u32',
'# 兜底才"看起来正常"，反而把问题掩盖了半年）。现在三条路并存：',
'#   A. CLASSIFY  —— mangle 表直接给 skb 指定 tc classid，不碰 fwmark',
'#   B. fwmark   —— 用 bit24-31，避开 Android netd 占用的低 16 位 netId',
'#   C. LAN 入口 police —— 完全不过 netfilter，在源 IP 被 SNAT 改掉之前丢包',
'',
'# --- A. CLASSIFY 可用性 ---',
'# xt_CLASSIFY 直接设 skb->priority，而 htb 分类的第一步就是',
'# htb_classify() 里的 htb_find(skb->priority, sch) —— 命中即直接归类，',
'# 连 tc filter 都不用走，彻底绕开 mark 的进制和掩码问题。',
'CLS_OK=0',
'iptables -t mangle -F ' + CLS_CHAIN + ' >/dev/null 2>&1',
'iptables -t mangle -N ' + CLS_CHAIN + ' >/dev/null 2>&1',
'iptables -t mangle -D POSTROUTING -j ' + CLS_CHAIN + ' >/dev/null 2>&1',
'if iptables -t mangle -A ' + CLS_CHAIN + ' -s 127.0.0.1 -j CLASSIFY --set-class 1:999 >/dev/null 2>&1; then',
'  CLS_OK=1',
'fi',
'iptables -t mangle -F ' + CLS_CHAIN + ' >/dev/null 2>&1',
'if [ "$CLS_OK" -eq 1 ]; then',
'  iptables -t mangle -I POSTROUTING 1 -j ' + CLS_CHAIN + ' >/dev/null 2>&1',
'fi',
'if [ -n "$IP6T" ]; then',
'  $IP6T -t mangle -F ' + CLS_CHAIN + ' >/dev/null 2>&1',
'  $IP6T -t mangle -N ' + CLS_CHAIN + ' >/dev/null 2>&1',
'  if [ "$CLS_OK" -eq 1 ]; then',
'    $IP6T -t mangle -D POSTROUTING -j ' + CLS_CHAIN + ' >/dev/null 2>&1',
'    $IP6T -t mangle -I POSTROUTING 1 -j ' + CLS_CHAIN + ' >/dev/null 2>&1',
'  fi',
'fi',
'',
'# --- B. fwmark 可用性（必须是 --or-mark）---',
'# 绝不能退回 --set-mark：Android 靠 fwmark 低 16 位的 netId 选路，',
'# 一刀切清零等于把整台设备的网络打断。不支持 or-mark 就干脆不用这条路。',
'MARKOPT=""',
'iptables -t mangle -F ' + MARK_CHAIN + ' >/dev/null 2>&1',
'iptables -t mangle -N ' + MARK_CHAIN + ' >/dev/null 2>&1',
'if iptables -t mangle -A ' + MARK_CHAIN + ' -s 127.0.0.1 -j MARK --or-mark 16777216 >/dev/null 2>&1; then',
'  MARKOPT="--or-mark"',
'  iptables -t mangle -D FORWARD -j ' + MARK_CHAIN + ' >/dev/null 2>&1',
'  iptables -t mangle -I FORWARD 1 -j ' + MARK_CHAIN + ' >/dev/null 2>&1',
'fi',
'iptables -t mangle -F ' + MARK_CHAIN + ' >/dev/null 2>&1',
'if [ -n "$IP6T" ] && [ -n "$MARKOPT" ]; then',
'  $IP6T -t mangle -F ' + MARK_CHAIN + ' >/dev/null 2>&1',
'  $IP6T -t mangle -N ' + MARK_CHAIN + ' >/dev/null 2>&1',
'  $IP6T -t mangle -D FORWARD -j ' + MARK_CHAIN + ' >/dev/null 2>&1',
'  $IP6T -t mangle -I FORWARD 1 -j ' + MARK_CHAIN + ' >/dev/null 2>&1',
'fi',
'',
'# --- C. LAN 入口 qdisc（上传兜底）---',
'# 上传流量在热点口是"进方向"，这时源 IP 还是内网 IP、尚未被 SNAT 改写，',
'# 所以 u32 match ip src 一定能匹配上，且完全不经过 netfilter —— ',
'# 即便 A、B 都被内核/硬件 offload 绕过，这条路依然成立。',
'# 只在 CLASSIFY 不可用时才启用，避免和 A 双重限速。',
'ING_OK=0',
'if [ "$CLS_OK" -eq 0 ]; then',
'  $TC_BIN qdisc add dev $LAN handle ffff: ingress >/dev/null 2>&1',
'  $TC_BIN qdisc show dev $LAN 2>/dev/null | grep -q ingress && ING_OK=1',
'fi',
'',
'ID=10',
'WANT=0',
'HIT=0',
'NOWAN=0',
'if [ -f "$CONF" ]; then',
'  while IFS= read -r line; do',
'    case "$line" in \\#*) continue;; esac',
'    [ -z "$line" ] && continue',
'    MAC=$(echo "$line" | awk -F\'|\' \'{print $1}\')',
'    UP=$(echo "$line" | awk -F\'|\' \'{print $2}\')',
'    DN=$(echo "$line" | awk -F\'|\' \'{print $3}\')',
'    [ -z "$MAC" ] && continue',
'    [ -z "$UP" ] && UP=0',
'    [ -z "$DN" ] && DN=0',
'    case "$UP" in *[!0-9]*) UP=0 ;; esac',
'    case "$DN" in *[!0-9]*) DN=0 ;; esac',
'    [ "$UP" -eq 0 ] && [ "$DN" -eq 0 ] && continue',
'    IP=$(mac2ip "$MAC")',
'    [ -z "$IP" ] && continue',
'    # 机制 B 的取值：ID 放 bit24-31，与 Android netd 的低 16 位 netId 互不干扰',
'    MK24=$((ID * 16777216))',
'    M24=$(printf "0x%02x000000" $ID)',
'',
'    # ---------- 下载：出 LAN 方向的流量，dst = 设备 IP ----------',
'    if [ "$DN" -gt 0 ]; then',
'      WANT=$((WANT + 1))',
'      RATE=$((DN * 8))',
'      if [ "$RATE" -gt "$DEF_RATE" ]; then RATE=$DEF_RATE; fi',
'      $TC_BIN class add dev $LAN parent 1: classid 1:$ID htb rate "$RATE"kbit ceil "$RATE"kbit >/dev/null 2>&1',
'      $TC_BIN qdisc add dev $LAN parent 1:$ID handle $ID: sfq perturb 10 >/dev/null 2>&1',
'      if [ "$CLS_OK" -eq 1 ]; then',
'        iptables -t mangle -A ' + CLS_CHAIN + ' -d $IP -j CLASSIFY --set-class 1:$ID >/dev/null 2>&1',
'        if [ -n "$IP6T" ]; then',
'          for v6 in $(mac2ip6 "$MAC"); do',
'            $IP6T -t mangle -A ' + CLS_CHAIN + ' -d $v6 -j CLASSIFY --set-class 1:$ID >/dev/null 2>&1',
'          done',
'        fi',
'      fi',
'      if [ -n "$MARKOPT" ]; then',
'        iptables -t mangle -A ' + MARK_CHAIN + ' -d $IP -j MARK $MARKOPT $MK24 >/dev/null 2>&1',
'        if [ -n "$IP6T" ]; then',
'          for v6 in $(mac2ip6 "$MAC"); do',
'            $IP6T -t mangle -A ' + MARK_CHAIN + ' -d $v6 -j MARK $MARKOPT $MK24 >/dev/null 2>&1',
'          done',
'        fi',
'      fi',
'      $TC_BIN filter add dev $LAN parent 1: protocol ip prio 1 handle $M24/0xff000000 fw flowid 1:$ID >/dev/null 2>&1',
'      if [ -n "$IP6T" ]; then',
'        $TC_BIN filter add dev $LAN parent 1: protocol ipv6 prio 1 handle $M24/0xff000000 fw flowid 1:$ID >/dev/null 2>&1',
'      fi',
'      # u32 兜底：LAN 出口的目的 IP 不会被改写，永远匹配得上',
'      $TC_BIN filter add dev $LAN parent 1: protocol ip prio 5 u32 match ip dst $IP/32 flowid 1:$ID >/dev/null 2>&1',
'      $TC_BIN class show dev $LAN 2>/dev/null | grep -q "1:$ID " && HIT=$((HIT + 1))',
'    fi',
'',
'    # ---------- 上传：出 WAN 方向的流量，src = 设备 IP ----------',
'    # 这里是本次修复的重点。旧版只挂了一条 fw filter，没有任何兜底：',
'    #   1) handle 用十进制 $ID，被 tc 按 16 进制解析（get_u32_handle 用 base 16），',
'    #      ID=10 变成匹配 mark 0x10=16，跟 iptables 设的 10 对不上；',
'    #   2) mark 打在低 16 位，和 Android netd 的 netId（同样占低 16 位）挤在一起，',
'    #      --or-mark 之后变成 netId|ID，用 /0xffff 掩码也永远对不上。',
'    # 两处叠加，上传流量的 fw filter 命中率为零，全部落进默认类 → 上传限速形同虚设。',
'    # 而下载之所以"没事"，是因为它还有 u32 兜底，把问题掩盖了。',
'    # 现在：mark 挪到 bit24-31 并配 /0xff000000 掩码，同时挂 CLASSIFY，',
'    # 再用 LAN 入口 police 兜底 —— 三条路任一通，上传限速就能生效。',
'    if [ "$UP" -gt 0 ]; then',
'      RATE2=$((UP * 8))',
'      if [ "$RATE2" -gt "$DEF_RATE" ]; then RATE2=$DEF_RATE; fi',
'      if [ -z "$WAN" ]; then',
'        NOWAN=$((NOWAN + 1))',
'      else',
'        WANT=$((WANT + 1))',
'        $TC_BIN class add dev $WAN parent 1: classid 1:$ID htb rate "$RATE2"kbit ceil "$RATE2"kbit >/dev/null 2>&1',
'        $TC_BIN qdisc add dev $WAN parent 1:$ID handle $ID: sfq perturb 10 >/dev/null 2>&1',
'        if [ "$CLS_OK" -eq 1 ]; then',
'          iptables -t mangle -A ' + CLS_CHAIN + ' -s $IP -j CLASSIFY --set-class 1:$ID >/dev/null 2>&1',
'          if [ -n "$IP6T" ]; then',
'            for v6 in $(mac2ip6 "$MAC"); do',
'              $IP6T -t mangle -A ' + CLS_CHAIN + ' -s $v6 -j CLASSIFY --set-class 1:$ID >/dev/null 2>&1',
'            done',
'          fi',
'        fi',
'        if [ -n "$MARKOPT" ]; then',
'          iptables -t mangle -A ' + MARK_CHAIN + ' -s $IP -j MARK $MARKOPT $MK24 >/dev/null 2>&1',
'          if [ -n "$IP6T" ]; then',
'            for v6 in $(mac2ip6 "$MAC"); do',
'              $IP6T -t mangle -A ' + MARK_CHAIN + ' -s $v6 -j MARK $MARKOPT $MK24 >/dev/null 2>&1',
'            done',
'          fi',
'        fi',
'        $TC_BIN filter add dev $WAN parent 1: protocol ip prio 1 handle $M24/0xff000000 fw flowid 1:$ID >/dev/null 2>&1',
'        if [ -n "$IP6T" ]; then',
'          $TC_BIN filter add dev $WAN parent 1: protocol ipv6 prio 1 handle $M24/0xff000000 fw flowid 1:$ID >/dev/null 2>&1',
'        fi',
'        $TC_BIN class show dev $WAN 2>/dev/null | grep -q "1:$ID " && HIT=$((HIT + 1))',
'      fi',
'      # 兜底：热点口入方向按源 IP 限速。此时源 IP 还是内网地址、没被 SNAT 改写，',
'      # 既不依赖 fwmark 也不依赖 CLASSIFY，是最后一道保险。',
'      if [ "$ING_OK" -eq 1 ]; then',
'        $TC_BIN filter add dev $LAN parent ffff: protocol ip prio 1 u32 match ip src $IP/32 ' +
'police rate "$RATE2"kbit burst 64k mtu 64k drop flowid :1 >/dev/null 2>&1',
'      fi',
'    fi',
'    ID=$((ID + 1))',
'  done < "$CONF"',
'fi',
'',
'# 每条规则下发完都回读一次：之前只要 tc 没报 NO_TC / NO_LAN 就一律"成功"，',
'# 实际 class 建没建起来全靠猜，于是用户看到"限速已生效"却完全没限速。',
'if [ "$HIT" -lt "$WANT" ]; then',
'  log "qos PARTIAL LAN=$LAN WAN=$WAN want=$WANT ok=$HIT nowan=$NOWAN def=$DEF_RATE cls=$CLS_OK mark=$MARKOPT ing=$ING_OK"',
'  echo "PARTIAL LAN=$LAN WAN=$WAN want=$WANT ok=$HIT nowan=$NOWAN def=$DEF_RATE cls=$CLS_OK mark=$MARKOPT ing=$ING_OK"',
'  exit 1',
'fi',
'log "qos OK LAN=$LAN WAN=$WAN want=$WANT ok=$HIT nowan=$NOWAN def=$DEF_RATE cls=$CLS_OK mark=$MARKOPT ing=$ING_OK"',
'echo "OK LAN=$LAN WAN=$WAN want=$WANT ok=$HIT nowan=$NOWAN def=$DEF_RATE cls=$CLS_OK mark=$MARKOPT ing=$ING_OK"',
'exit 0'
].join('\n');
}
function buildNamesShell() {
return [
'#!/system/bin/sh',
'# UFI Device Control - name resolver v' + VERSION,
'# ' + STAMP,
'PATH=/system/bin:/system/xbin:/vendor/bin:/sbin:/su/bin:$PATH',
'export PATH',
'LAN="$1"',
'SECS="$2"',
'[ -z "$SECS" ] && SECS=6',
'',
'echo "##LEASES##"',
'for f in ' + LEASES_LIST + '; do',
'  [ -s "$f" ] || continue',
'  echo "FILE=$f"',
'  cat "$f" 2>/dev/null',
'done',
'',
'echo "##SNIFF##"',
'TCPD=""',
'for c in /system/xbin/tcpdump /system/bin/tcpdump /vendor/bin/tcpdump /sbin/tcpdump /data/local/tmp/tcpdump; do',
'  [ -x "$c" ] && TCPD="$c" && break',
'done',
'if [ -z "$TCPD" ]; then TCPD=$(which tcpdump 2>/dev/null | head -1); fi',
'if [ -z "$TCPD" ]; then echo "NO_TCPDUMP"; exit 0; fi',
'if [ -z "$LAN" ]; then echo "NO_LAN"; exit 0; fi',
'mkdir -p ' + DIR + ' 2>/dev/null',
'TMP=' + DIR + '/ncap.$$',
': > "$TMP" 2>/dev/null || { echo "NO_TMP"; exit 0; }',
'',
'TMO=$(which timeout 2>/dev/null | head -1)',
'if [ -n "$TMO" ]; then',
'  "$TMO" "$SECS" "$TCPD" -i "$LAN" -n -s 0 -A -l -c 900 "udp port 5353 or udp port 5355 or udp port 67" > "$TMP" 2>/dev/null',
'else',
'  "$TCPD" -i "$LAN" -n -s 0 -A -l -c 900 "udp port 5353 or udp port 5355 or udp port 67" > "$TMP" 2>/dev/null &',
'  CP=$!',
'  sleep "$SECS"',
'  kill "$CP" 2>/dev/null',
'fi',
'',
'# 只对"当前在线设备"的 IP 做名字关联，避免把邻居广播的名字安错设备',
'IPS=$(awk \'NR>1 && NF>=6 && $3!="0x0" { print $1 }\' /proc/net/arp 2>/dev/null | sort -u)',
'for ip in $IPS; do',
'  # tcpdump -A 会把不可打印字节（含 mDNS 标签长度字节）渲染成点，',
'  # 且每行只打印几十个字符，长名字会被截成两行 —— 先把这段拼成一整行再匹配。',
'  # 含下划线的都是服务记录（_airplay._tcp.local 之类），不是设备名，过滤掉。',
'  nm=$(grep -a -A6 " $ip[.:]" "$TMP" 2>/dev/null | sed "s/^[[:space:]]*//" | tr -d "\\n" | grep -a -o -E "[A-Za-z0-9_][A-Za-z0-9_-]{1,40}\\.local" | grep -v "_" | head -1 | sed "s/\\.local.*//")',
'  [ -z "$nm" ] && continue',
'  case "$nm" in local) continue ;; esac',
'  echo "$ip $nm"',
'done',
'rm -f "$TMP" 2>/dev/null',
'exit 0'
].join('\n');
}
function buildServiceShell() {
return [
'#!/system/bin/sh',
'# UFI Device Control - service v' + VERSION,
'# ' + STAMP,
'',
'# 开机早期 PATH 极简，不显式设置会连 date / awk / iptables 都找不到',
'PATH=/system/bin:/system/xbin:/vendor/bin:/sbin:/su/bin:$PATH',
'export PATH',
'',
'BASE=' + BASE,
'SCRIPT=' + SVC,
'QOS=' + QOS,
'SEENSH=' + SEENSH,
'DATADIR=' + DIR,
'PIDF=' + PIDF,
'LOG=' + LOG,
'CONF=' + CONF,
'GCONF=' + GCONF,
'BLACK=' + BLACK,
'LOCK_DIR=' + BASE + '/start.lock',
'BOOT_WAIT=15',
'BOOT_RETRY=3',
'CHECK_INTERVAL=30',
'',
'log_line() {',
'  mkdir -p "$BASE" 2>/dev/null',
'  printf "%s %s\\n" "$(date \'+%m-%d %H:%M:%S\' 2>/dev/null)" "$*" >> "$LOG" 2>/dev/null',
'}',
'',
'read_pid() {',
'  awk \'NR==1{print;exit}\' "$PIDF" 2>/dev/null',
'}',
'',
'# 单实例判定 = PID 存活 + cmdline 确实是我们的守护进程。',
'# 只靠 kill -0 会被"断电前残留的 PID 文件"骗过：重启后同一个 PID 号',
'# 往往已经属于别的进程，新守护会以为自己还在运行而直接 exit 0 ——',
'# 这正是旧版断电重启后守护起不来的第二个原因。',
'# 匹配串用 $SCRIPT 变量而不是硬编码路径，换目录也不会失效。',
'is_running() {',
'  pid="$(read_pid)"',
'  case "$pid" in ""|*[!0-9]*) return 1 ;; esac',
'  [ -d "/proc/$pid" ] || return 1',
'  kill -0 "$pid" >/dev/null 2>&1 || return 1',
'  tr "\\000" " " 2>/dev/null < "/proc/$pid/cmdline" | grep -Fq "$SCRIPT daemon"',
'}',
'',
'kill_tree() {',
'  target="$1"',
'  case "$target" in ""|*[!0-9]*) return 0 ;; esac',
'  for c in $(cat "/proc/$target/task/$target/children" 2>/dev/null); do',
'    kill_tree "$c"',
'  done',
'  kill -9 "$target" >/dev/null 2>&1',
'  return 0',
'}',
'',
'# 扫 /proc 兜底杀一遍，抓 PID 文件丢失/写错时漏网的守护。',
'# 匹配 "$SCRIPT daemon" 而不是硬编码路径字符串 —— 用脚本自己的路径变量，',
'# 换目录也不会失效。',
'# 必须先跳过自己和父进程：执行 stop 的 shell 命令行里同样含有这个串，',
'# 不跳过会把自己杀掉，stop 永远返回不了。',
'# cmdline 是 NUL 分隔的，所以先 tr 成空格再 grep。',
'scan_kill() {',
'  for p in $(ls /proc 2>/dev/null); do',
'    case "$p" in ""|*[!0-9]*) continue ;; esac',
'    if [ "$p" = "$$" ] || [ "$p" = "$PPID" ]; then continue; fi',
'    if tr "\\000" " " 2>/dev/null < "/proc/$p/cmdline" | grep -Fq "$SCRIPT daemon"; then',
'      kill -9 "$p" >/dev/null 2>&1',
'    fi',
'  done',
'  return 0',
'}',
'',
'stop_guard() {',
'  if is_running; then',
'    pid="$(read_pid)"',
'    kill_tree "$pid"',
'    n=0',
'    while kill -0 "$pid" >/dev/null 2>&1 && [ "$n" -lt 30 ]; do',
'      sleep 0.1',
'      n=$((n + 1))',
'    done',
'    kill -9 "$pid" >/dev/null 2>&1',
'    log_line "[service] stopped pid=$pid"',
'  fi',
'  scan_kill',
'  rm -f "$PIDF"',
'  rm -rf "$LOCK_DIR"',
'  return 0',
'}',
'',
'start_guard() {',
'  mkdir -p "$BASE" "$DATADIR" 2>/dev/null',
'  chmod 755 "$SCRIPT" 2>/dev/null',
'  if ! mkdir "$LOCK_DIR" >/dev/null 2>&1; then',
'    sleep 1',
'    if is_running; then return 0; fi',
'    rm -rf "$LOCK_DIR"',
'    mkdir "$LOCK_DIR" >/dev/null 2>&1 || return 1',
'  fi',
'  if is_running; then',
'    rm -rf "$LOCK_DIR"',
'    return 0',
'  fi',
'  rm -f "$PIDF"',
'  sh "$SCRIPT" daemon >/dev/null 2>&1 &',
'  daemon_pid=$!',
'  echo "$daemon_pid" > "$PIDF"',
'  rm -rf "$LOCK_DIR"',
'  n=0',
'  while [ "$n" -lt 20 ]; do',
'    if is_running; then',
'      log_line "[service] started pid=$(read_pid)"',
'      return 0',
'    fi',
'    sleep 0.5',
'    n=$((n + 1))',
'  done',
'  log_line "[service] start failed"',
'  return 1',
'}',
'',
'now_min() { date \'+%H:%M\' | awk -F: \'{ h=$1+0; m=$2+0; print h*60+m }\' | head -1; }',
'today_str() { date \'+%Y-%m-%d\'; }',
'',
'in_window() {',
'  n=$1; s=$2; e=$3',
'  if [ "$s" -eq "$e" ]; then echo 0; return 0; fi',
'  if [ "$s" -lt "$e" ]; then',
'    if [ "$n" -ge "$s" ] && [ "$n" -lt "$e" ]; then echo 1; else echo 0; fi',
'  else',
'    if [ "$n" -ge "$s" ] || [ "$n" -lt "$e" ]; then echo 1; else echo 0; fi',
'  fi',
'}',
'',
'is_online() {',
'  awk -v m="$1" \'NR>1 && $4==m && $3!="0x0" { print 1; exit }\' /proc/net/arp 2>/dev/null | head -1',
'}',
'',
'# 规则补挂：断电重启后 iptables 规则全部丢失，而 blocked_* 状态文件还在',
'# （它们存在 /data 上是持久化的）。只认状态文件就会出现',
'# "文件写着已拉黑、实际规则没了" —— 拉黑静默失效。每轮补一次规则即可。',
'ensure_drop() {',
'  if iptables -C FORWARD -m mac --mac-source $1 -j DROP >/dev/null 2>&1; then return 0; fi',
'  # 走到这里有两种可能：规则真丢了，或这版 iptables 压根不支持 -C。',
'  # 后者必须防：不支持 -C 时它恒返回非 0，若只做 -I，每轮都会插一条，',
'  # 规则会无限堆积。先 -D 再 -I，无论哪种情况都保证"存在且唯一"。',
'  iptables -D FORWARD -m mac --mac-source $1 -j DROP >/dev/null 2>&1',
'  iptables -I FORWARD 1 -m mac --mac-source $1 -j DROP >/dev/null 2>&1',
'  log_line "[rule] re-add drop $1"',
'  return 0',
'}',
'',
'kick_dev() {',
'  hostapd_cli deauthenticate $1 >/dev/null 2>&1',
'  hostapd_cli disassociate $1 >/dev/null 2>&1',
'}',
'',
'block_dev() {',
'  iptables -D FORWARD -m mac --mac-source $1 -j DROP >/dev/null 2>&1',
'  iptables -I FORWARD 1 -m mac --mac-source $1 -j DROP >/dev/null 2>&1',
'  kick_dev $1',
'}',
'',
'unblock_dev() {',
'  iptables -D FORWARD -m mac --mac-source $1 -j DROP >/dev/null 2>&1',
'}',
'',
'detect_lan() {',
"  D=$(awk 'NR>1 && NF>=6 {print $6}' /proc/net/arp 2>/dev/null | sort | uniq -c | sort -rn | head -1 | sed 's/.* //')",
'  if [ -n "$D" ] && [ -d "/sys/class/net/$D" ]; then echo "$D"; return 0; fi',
'  for i in wlan0 wlan1 ap0 br0; do',
'    if [ -d "/sys/class/net/$i" ]; then echo "$i"; return 0; fi',
'  done',
'  echo ""',
'}',
'',
'# 限速（tc）规则重启后同样会丢，且开机第一次尝试时 wlan0 常常还没起来。',
'# QOS_OK 记录是否已挂上：没挂上就每隔几轮重试，挂上后定期校验还在不在。',
'apply_qos() {',
'  if [ ! -f "$QOS" ]; then return 1; fi',
'  out="$(sh "$QOS" 2>&1 | tail -1)"',
'  case "$out" in',
'    OK*) QOS_OK=1; log_line "[qos] applied $out"; return 0 ;;',
'    *) log_line "[qos] not ready: $out"; return 1 ;;',
'  esac',
'}',
'',
'qos_watchdog() {',
'  if [ "$QOS_OK" -eq 1 ]; then',
'    if [ "$((TICK % 60))" -eq 0 ] && [ "$TICK" -gt 0 ]; then',
'      LAN="$(detect_lan)"',
'      if [ -n "$LAN" ]; then',
'        tc qdisc show dev "$LAN" 2>/dev/null | grep -q htb || QOS_OK=0',
'      fi',
'    fi',
'  fi',
'  if [ "$QOS_OK" -eq 0 ]; then',
'    if [ "$((TICK % 2))" -eq 0 ]; then apply_qos; fi',
'  fi',
'  return 0',
'}',
'',
'run_daemon() {',
'  mkdir -p "$BASE" "$DATADIR" 2>/dev/null',
'  if is_running; then',
'    pid="$(read_pid)"',
'    if [ "$pid" != "$$" ]; then',
'      log_line "[daemon] already running pid=$pid, exit"',
'      exit 0',
'    fi',
'  fi',
'  trap "" HUP',
'  trap \'rm -f "$PIDF"; exit 0\' INT TERM',
'  trap \'rm -f "$PIDF"\' EXIT',
'  echo $$ > "$PIDF"',
'  log_line "[daemon] start pid=$$"',
'  TICK=0',
'  ROT=0',
'  QOS_OK=0',
'  if [ -f "$GCONF" ]; then . "$GCONF"; fi',
'  [ -z "$CHECK_INTERVAL" ] && CHECK_INTERVAL=30',
'  [ "$CHECK_INTERVAL" -lt 5 ] && CHECK_INTERVAL=5',
'  if [ -f "$SEENSH" ]; then sh "$SEENSH" >/dev/null 2>&1; fi',
'',
'  while true; do',
'    mkdir -p "$BASE" "$DATADIR" 2>/dev/null',
'    if [ -f "$GCONF" ]; then . "$GCONF"; fi',
'    [ -z "$CHECK_INTERVAL" ] && CHECK_INTERVAL=30',
'    [ "$CHECK_INTERVAL" -lt 5 ] && CHECK_INTERVAL=5',
'    TODAY=$(today_str)',
'    NMIN=$(now_min)',
'',
'    # --- 黑名单（永久阻断，重启后自动补规则）---',
'    if [ -f "$BLACK" ]; then',
'      while IFS= read -r m; do',
'        [ -z "$m" ] && continue',
'        case "$m" in "#"*) continue ;; esac',
'        KEY=$(echo "$m" | tr \':\' \'_\')',
'        STF="$DATADIR/blocked_$KEY"',
'        CUR=""',
'        [ -f "$STF" ] && CUR=$(cat "$STF" 2>/dev/null)',
'        if [ "$CUR" != "blacklist" ]; then',
'          block_dev "$m"',
'          echo "blacklist" > "$STF"',
'          log_line "[block] $m reason=blacklist"',
'        else',
'          ensure_drop "$m"',
'        fi',
'      done < "$BLACK"',
'    fi',
'',
'    # --- 每日配额 + 允许上网时段 ---',
'    if [ -f "$CONF" ]; then',
'      while IFS= read -r line; do',
'        case "$line" in "#"*) continue ;; esac',
'        [ -z "$line" ] && continue',
'        MAC=$(echo "$line" | awk -F\'|\' \'{print $1}\')',
'        DMIN=$(echo "$line" | awk -F\'|\' \'{print $4}\')',
'        ST=$(echo "$line" | awk -F\'|\' \'{print $5}\')',
'        ED=$(echo "$line" | awk -F\'|\' \'{print $6}\')',
'        [ -z "$MAC" ] && continue',
'        [ -z "$DMIN" ] && DMIN=0',
'        [ -z "$ST" ] && ST=0',
'        [ -z "$ED" ] && ED=0',
'',
'        ISBLACK=0',
'        if [ -f "$BLACK" ]; then',
'          grep -i -q "$MAC" "$BLACK" 2>/dev/null && ISBLACK=1',
'        fi',
'        [ "$ISBLACK" -eq 1 ] && continue',
'',
'        KEY=$(echo "$MAC" | tr \':\' \'_\')',
'        STF="$DATADIR/blocked_$KEY"',
'        USF="$DATADIR/usage_$KEY"',
'',
'        UDAY=$(awk \'{print $1}\' "$USF" 2>/dev/null | head -1)',
'        USED=$(awk \'{print $2}\' "$USF" 2>/dev/null | head -1)',
'        [ -z "$UDAY" ] && UDAY="$TODAY"',
'        [ -z "$USED" ] && USED=0',
'        if [ "$UDAY" != "$TODAY" ]; then UDAY="$TODAY"; USED=0; fi',
'',
'        ON=$(is_online "$MAC")',
'        if [ "$ON" = "1" ]; then USED=$((USED + CHECK_INTERVAL)); fi',
'        echo "$UDAY $USED" > "$USF"',
'',
'        REASON=""',
'        if [ "$DMIN" -gt 0 ]; then',
'          LIM=$((DMIN * 60))',
'          if [ "$USED" -ge "$LIM" ]; then REASON="quota"; fi',
'        fi',
'        if [ -z "$REASON" ] && [ "$ST" != "$ED" ]; then',
'          WIN=$(in_window "$NMIN" "$ST" "$ED")',
'          if [ "$WIN" = "0" ]; then REASON="time"; fi',
'        fi',
'',
'        CUR=""',
'        [ -f "$STF" ] && CUR=$(cat "$STF" 2>/dev/null)',
'        if [ -n "$REASON" ]; then',
'          if [ "$CUR" != "$REASON" ]; then',
'            block_dev "$MAC"',
'            echo "$REASON" > "$STF"',
'            log_line "[block] $MAC reason=$REASON used=$USED"',
'          else',
'            ensure_drop "$MAC"',
'          fi',
'        else',
'          if [ -n "$CUR" ]; then',
'            unblock_dev "$MAC"',
'            rm -f "$STF"',
'            log_line "[unblock] $MAC (was $CUR)"',
'          fi',
'        fi',
'      done < "$CONF"',
'    fi',
'',
'    # --- 接入记录：浏览器关着时也要持续记录 ---',
'    if [ -f "$SEENSH" ]; then sh "$SEENSH" >/dev/null 2>&1; fi',
'',
'    qos_watchdog',
'',
'    TICK=$((TICK + 1))',
'    ROT=$((ROT + 1))',
'    if [ "$TICK" -gt 100000 ]; then TICK=1; fi',
'    if [ "$ROT" -ge 40 ]; then',
'      ROT=0',
'      SZ=$(wc -c < "$LOG" 2>/dev/null | tr -d " ")',
'      if [ -n "$SZ" ] && [ "$SZ" -gt 150000 ]; then',
'        tail -n 200 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG" 2>/dev/null',
'      fi',
'    fi',
'',
'    sleep $CHECK_INTERVAL',
'  done',
'}',
'',
'case "$1" in',
'  start) start_guard ;;',
'  stop) stop_guard ;;',
'  restart) stop_guard; start_guard ;;',
'  status)',
'    if is_running; then',
'      echo "running pid=$(read_pid)"',
'      exit 0',
'    fi',
'    echo "stopped"',
'    exit 1',
'    ;;',
'  daemon) run_daemon ;;',
'  boot)',
'    # 开机早期 wlan / hostapd / 数据分区都还没就绪，直接跑 iptables / tc 必然失败，',
'    # 先等 BOOT_WAIT 秒再拉起；失败再重试几次，避免一次失败就永久不起。',
'    sleep "$BOOT_WAIT"',
'    n=0',
'    while [ "$n" -lt "$BOOT_RETRY" ]; do',
'      if start_guard; then',
'        log_line "[boot] guard started"',
'        exit 0',
'      fi',
'      n=$((n + 1))',
'      sleep 15',
'    done',
'    log_line "[boot] guard failed after retries"',
'    exit 1',
'    ;;',
'  *) echo "usage: $0 {start|stop|restart|status|boot|daemon}"; exit 2 ;;',
'esac'
].join('\n');
}
function sanitizeName(v) {
return String(v == null ? '' : v)
.replace(/[\r\n\t]+/g, ' ')
.replace(/\|/g, ' ')
.replace(/\s+/g, ' ')
.trim()
.slice(0, 32);
}
var CONF_HEAD = '# mac|up_kbs|down_kbs|daily_minutes|start_min|end_min|name';
function confText() {
var rows = [];
for (var mac in cfg) {
if (!cfg.hasOwnProperty(mac)) continue;
var c = getCfg(mac);
if (!c.name && !c.up && !c.down && !c.dmin && c.st === c.ed) continue;
rows.push([mac, c.up, c.down, c.dmin, c.st, c.ed, sanitizeName(c.name)].join('|'));
}
var body = CONF_HEAD + '\n' + rows.join('\n');
var stampLine = '# ' + STAMP + '-' + hash32(body);
return CONF_HEAD + '\n' + stampLine + '\n' + rows.join('\n') + '\n';
}
function syncConf() {
if (!confLoaded) { confDirty = true; return Promise.resolve(false); }
var txt = confText();
var m = txt.match(/^# (UDC-STAMP-v[0-9.]+-[0-9a-z]+)$/m);
return writeFile(CONF, txt, m ? m[1] : STAMP, true);
}
function parseConf(lines) {
var out = {};
for (var i = 0; i < (lines || []).length; i++) {
var t = String(lines[i] || '').trim();
if (!t || t.charAt(0) === '#') continue;
var p = t.split('|');
if (p.length < 6) continue;
var mac = String(p[0] || '').trim().toLowerCase();
if (!validMac(mac)) continue;
out[mac] = {
name: sanitizeName(p[6]),
up: parseInt(p[1], 10) || 0,
down: parseInt(p[2], 10) || 0,
dmin: parseInt(p[3], 10) || 0,
st: parseInt(p[4], 10) || 0,
ed: parseInt(p[5], 10) || 0
};
}
return out;
}
function mergeConf(devConf) {
var now = Date.now(), changed = false;
var r = mergeConfSync(devConf);
if (r.changed) saveCfg();
if (r.changed) return syncConf();
if (r.dirty) return syncConf();
return Promise.resolve(true);
}
function mergeConfSync(devConf) {
var now = Date.now(), changed = false;
var LOCAL_HOLD = 5000;
for (var m in devConf) {
if (!devConf.hasOwnProperty(m)) continue;
var d = devConf[m];
var c = getCfg(m);
if (now - (cfgLocalTs[m] || 0) < LOCAL_HOLD) continue;
if (c.name !== d.name || c.up !== d.up || c.down !== d.down ||
c.dmin !== d.dmin || c.st !== d.st || c.ed !== d.ed) {
c.name = d.name; c.up = d.up; c.down = d.down;
c.dmin = d.dmin; c.st = d.st; c.ed = d.ed;
changed = true;
}
}
if (!confMigrated) {
confMigrated = true;
for (var m2 in cfg) {
if (!cfg.hasOwnProperty(m2)) continue;
var lc = cfg[m2];
if (lc && lc.name && !(devConf[m2] && devConf[m2].name)) changed = true;
}
}
confLoaded = true;
var dirty = false;
if (confDirty) { confDirty = false; dirty = true; }
return { changed: changed, dirty: dirty };
}
function applyNames() {
for (var i = 0; i < devList.length; i++) {
var d = devList[i];
d.hostname = nameOf(d.mac, d.ip);
d.nameKind = resolveName(d.mac, d.ip).kind;
}
}
function migrateQosUnit() {
if (unitMigrated) return Promise.resolve(false);
if (qosStampOk !== true) return Promise.resolve(false);
if (!confLoaded) return Promise.resolve(false);
return hasStamp2(UNITFL).then(function (done) {
if (done) { unitMigrated = true; return false; }
unitMigrated = true;
var changed = false;
for (var mac in cfg) {
if (!cfg.hasOwnProperty(mac)) continue;
var c = getCfg(mac);
if (c.up > 0) { c.up = Math.max(1, Math.round(c.up / 8)); changed = true; }
if (c.down > 0) { c.down = Math.max(1, Math.round(c.down / 8)); changed = true; }
}
var finish = function () {
return sh('mkdir -p ' + DIR + ' 2>/dev/null; printf "v2\\n" > ' + UNITFL + '; echo ok')
.catch(function () { return ''; });
};
if (!changed) return finish().then(function () { return false; });
console.log('[设备控制] 限速单位迁移：老配置 KB/s 数值 ÷8，保持实际限速效果不变');
saveCfg();
return syncConf()
.then(function () { return applyQos(true); })
.then(function () {
toast('已修正限速单位换算（老设置 ÷8，实际限速效果保持不变）', 'green');
return true;
})
.then(function (v) { return finish().then(function () { return v; }); });
}).catch(function () { return false; });
}
function hasStamp2(path, stamp) {
var s = stamp || 'v2';
return sh('grep -q "' + s + '" ' + path + ' 2>/dev/null && echo YES || echo NO')
.then(function (r) { return String(r || '').indexOf('YES') >= 0; })
.catch(function () { return false; });
}
function ensureQosVersion() {
if (qosStampOk === true) return Promise.resolve(true);
return hasStamp(QOS, STAMP).then(function (ok) {
qosStampOk = ok;
return ok;
}).catch(function () { return false; });
}
function maybeMigrateUnit() {
if (unitMigrated) return Promise.resolve(false);
if (qosStampOk === null) {
return ensureQosVersion().then(function () { return migrateQosUnit(); });
}
return migrateQosUnit();
}
function flushNames() {
if (!namesDirty) return Promise.resolve(false);
var now = Date.now();
if (now - namesSaveTs < 30000) return Promise.resolve(false);
namesSaveTs = now;
namesDirty = false;
return saveNames();
}
function parseDhcpLine(line) {
var p = String(line || '').trim().split(/\s+/);
if (p.length < 4) return false;
var mac = String(p[1] || '').toLowerCase();
var host = p[3] || '';
if (!validMac(mac)) return false;
if (!host || host === '*') return false;
if (host.indexOf(':') >= 0) return false;
if (host.charAt(0) === '[') return false;
return setName(mac, host);
}
function probeNames(force) {
if (nameProbing) return Promise.resolve(false);
var now = Date.now();
if (!force) {
var need = false;
for (var i = 0; i < devList.length; i++) {
if (needIdentify(devList[i].mac)) { need = true; break; }
}
if (!need || (now - nameSniffTs) < SNIFF_GAP) return Promise.resolve(false);
}
nameProbing = true;
nameSniffTs = now;
return sh(NAMESH + ' "' + (lanIface || 'wlan0') + '" ' + SNIFF_SEC + ' 2>/dev/null')
.then(function (raw) {
var got = parseNameProbe(raw);
if (got) return saveNames().then(function () { return true; });
return false;
})
.catch(function () { return false; })
.then(function (v) { nameProbing = false; return v; });
}
function parseNameProbe(raw) {
var seg = {}, cur = null;
String(raw || '').split('\n').forEach(function (l) {
var m = l.match(/^##([A-Z0-9_]+)##\s*$/);
if (m) { cur = m[1]; seg[cur] = []; return; }
if (cur) seg[cur].push(l);
});
var got = false;
var firstPath = '';
(seg.LEASES || []).forEach(function (l) {
var fm = String(l).match(/^FILE=(\S+)/);
if (fm) { if (!firstPath) firstPath = fm[1]; return; }
if (parseDhcpLine(l)) got = true;
});
if (firstPath) setLeasesPath(firstPath);
(seg.SNIFF || []).forEach(function (l) {
var p = String(l).trim().split(/\s+/);
if (p.length < 2) return;
var ip = p[0], nm = p[1];
if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip) || !nm) return;
var mac = '';
for (var i = 0; i < devList.length; i++) {
if (devList[i].ip === ip) { mac = devList[i].mac; break; }
}
if (!mac) return;
if (setName(mac, nm)) got = true;
});
return got;
}
function markLocal(mac) {
cfgLocalTs[mac] = Date.now();
saveCfg();
}
function syncBlacklist() {
var txt = blacklist.join('\n') + (blacklist.length ? '\n' : '');
return writeFile(BLACK, txt);
}
function initChain() {
var cmds = [
'iptables -t mangle -N ' + CHAIN + ' 2>/dev/null || true'
];
var hooks = ['FORWARD', 'POSTROUTING', 'INPUT', 'OUTPUT'];
hooks.forEach(function (h) {
cmds.push('iptables -t mangle -C ' + h + ' -j ' + CHAIN + ' 2>/dev/null && iptables -t mangle -D ' + h + ' -j ' + CHAIN + ' 2>/dev/null || true');
cmds.push('iptables -t mangle -C ' + h + ' -j ' + CHAIN + ' 2>/dev/null || iptables -t mangle -I ' + h + ' 1 -j ' + CHAIN);
});
return sh(cmds.join('; ')).then(function () { chainReady = true; });
}
function addRule(ip) {
if (!ip || ruleIps[ip]) return Promise.resolve();
var cmd = 'iptables -t mangle -C ' + CHAIN + ' -s ' + ip + ' -j RETURN 2>/dev/null || (iptables -t mangle -A ' + CHAIN + ' -s ' + ip + ' -j RETURN; iptables -t mangle -A ' + CHAIN + ' -d ' + ip + ' -j RETURN)';
return sh(cmd).then(function () { ruleIps[ip] = 1; });
}
function parseCounters(text) {
var c = {};
if (!text) return c;
var lines = String(text).split('\n');
for (var i = 0; i < lines.length; i++) {
var l = lines[i].trim();
if (!l) continue;
if (l.indexOf('Chain') === 0) continue;
if (l.indexOf('pkts') === 0) continue;
if (l.indexOf('RETURN') < 0) continue;
var p = l.split(/\s+/);
if (p.length < 9) continue;
var bytes = parseInt(p[1], 10) || 0;
var src = p[7], dst = p[8];
if (src && src !== '0.0.0.0/0' && dst === '0.0.0.0/0') {
if (!c[src]) c[src] = { up: 0, down: 0 };
c[src].up += bytes;
} else if (dst && dst !== '0.0.0.0/0' && src === '0.0.0.0/0') {
if (!c[dst]) c[dst] = { up: 0, down: 0 };
c[dst].down += bytes;
}
}
return c;
}
function pickPath(s) {
var arr = String(s || '').split('\n');
for (var i = 0; i < arr.length; i++) {
var p = arr[i].trim();
if (p && p.indexOf('/') === 0 && p.indexOf(' ') < 0) return p;
}
return '';
}
function setLeasesPath(p) {
if (!p) return p;
leasesPath = p;
try { localStorage.setItem(LS_LEASES, p); } catch (e) {}
return p;
}
function detectLeasesPath() {
if (leasesPath) return Promise.resolve(leasesPath);
var cmd = [
'for f in /data/misc/apexdata/com.android.tethering/dnsmasq.leases /data/misc/dhcp/dnsmasq.leases /var/lib/misc/dnsmasq.leases /tmp/dnsmasq.leases /data/dnsmasq.leases /etc/dnsmasq.leases; do',
'  if [ -s "$f" ]; then echo "$f"; break; fi;',
'done;',
"P=$(cat /proc/$(pidof dnsmasq)/cmdline 2>/dev/null | xargs -0 -n1 echo 2>/dev/null | grep -i lease | head -1);",
'if [ -n "$P" ]; then echo "$P" | grep -o "/[^ ]*leases" | head -1; fi'
].join(' ');
return sh(cmd).then(function (s) {
var p = pickPath(s);
if (p) return setLeasesPath(p);
return sh('find /data /tmp /var /etc -name "*.leases" 2>/dev/null | head -3')
.then(function (s2) { return setLeasesPath(pickPath(s2)); });
}).catch(function () {
return sh('find /data /tmp /var /etc -name "*.leases" 2>/dev/null | head -3')
.then(function (s2) { return setLeasesPath(pickPath(s2)); })
.catch(function () { return ''; });
});
}
function detectLan() {
var cmd = [
"DEV=$(awk 'NR>1 && NF>=6 {print $6}' /proc/net/arp 2>/dev/null | sort | uniq -c | sort -rn | head -1 | sed 's/.* //');",
'if [ -z "$DEV" ] || [ ! -d "/sys/class/net/$DEV" ]; then',
'  for i in wlan0 wlan1 ap0 br0; do if [ -d "/sys/class/net/$i" ]; then DEV=$i; break; fi; done;',
'fi;',
'echo "DEV=$DEV";',
"ip -4 addr show $DEV 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1"
].join(' ');
return sh(cmd).then(function (s) {
var lines = String(s || '').split('\n');
var dev = '', ip = '';
for (var i = 0; i < lines.length; i++) {
var t = lines[i].trim();
var dm = t.match(/^DEV=(\S+)/);
if (dm) dev = dm[1];
if (/^\d+\.\d+\.\d+\.\d+$/.test(t)) { ip = t; break; }
}
if (dev) lanIface = dev;
if (ip) localIp = ip;
console.log('[设备控制] 热点口=' + (lanIface || '未识别') + '　本机IP=' + (localIp || '未获取'));
}).catch(function () {});
}
function fetchAll() {
var extra = leasesPath ? ('echo "##DHCP##"; cat ' + leasesPath + ' 2>/dev/null;') : '';
var parts = ['echo "##ARP##"; cat /proc/net/arp 2>/dev/null;'];
parts.push('echo "##CNT##"; iptables -t mangle -nvxL ' + CHAIN + ' 2>/dev/null;');
parts.push('echo "##BLK##"; cat ' + BLACK + ' 2>/dev/null;');
parts.push('echo "##USE##"; for f in ' + DIR + '/usage_*; do [ -f "$f" ] && echo "$(basename $f) $(cat $f 2>/dev/null)"; done 2>/dev/null;');
parts.push('echo "##DMN##"; ' + SVC + ' status 2>/dev/null;');
parts.push('if ' + SVC + ' status >/dev/null 2>&1; then R=1; else R=0; fi; ' +
'if [ "$R" -eq 0 ] && [ -f ' + SEENSH + ' ]; then sh ' + SEENSH + ' >/dev/null 2>&1; fi; ' +
'echo "##SEEN##"; cat ' + SEENF + ' 2>/dev/null;');
parts.push('echo "##CONF##"; cat ' + CONF + ' 2>/dev/null;');
parts.push('echo "##NAMES##"; cat ' + NAMESF + ' 2>/dev/null;');
if (extra) parts.push(extra);
parts.push('echo "##END##"');
var cmd = parts.join(' ');
return sh(cmd).then(function (raw) {
var text = String(raw || '');
var seg = {};
var cur = null;
var lines = text.split('\n');
for (var i = 0; i < lines.length; i++) {
var l = lines[i];
var m = l.match(/^##([A-Z0-9_]+)##\s*$/);
if (m) { cur = m[1]; seg[cur] = []; continue; }
if (cur) seg[cur].push(l);
}
probeRaw = seg;
daemonOn = /running/.test((seg.DMN || []).join('\n'));
parseSeen(seg.SEEN || []);
parseArp(seg.ARP || []);
applyCounters(parseCounters((seg.CNT || []).join('\n')));
parseBlack(seg.BLK || []);
parseUsage(seg.USE || []);
parseDhcp(seg.DHCP || []);
parseNames(seg.NAMES || []);
var mc = mergeConfSync(parseConf(seg.CONF || []));
applyNames();
var mig = maybeMigrateUnit();
if (mc.changed) { saveCfg(); return syncConf().then(function () { return mig; }); }
if (mc.dirty) { return syncConf().then(function () { return mig; }); }
return mig.then(function () { return true; });
});
}
function parseSeen(lines) {
var map = {};
if (!lines || !lines.length) { seenMap = map; return; }
for (var i = 0; i < lines.length; i++) {
var p = String(lines[i]).trim().split('|');
if (p.length < 5) continue;
var mac = String(p[0] || '').toLowerCase();
if (!validMac(mac)) continue;
var f = parseInt(p[1], 10), l = parseInt(p[2], 10), c = parseInt(p[4], 10);
if (!f || !l) continue;
map[mac] = { first: f * 1000, last: l * 1000, ip: p[3] || '', count: c > 0 ? c : 1 };
}
seenMap = map;
}
function isOnlineNow(mac, now) {
var r = seenMap[mac];
return !!r && (now - r.last) < ONLINE_MS;
}
function parseArp(lines) {
var now = Date.now();
var map = {};
for (var i = 0; i < lines.length; i++) {
var p = lines[i].trim().split(/\s+/);
if (p.length < 6) continue;
var ip = p[0], flags = p[2], mac = String(p[3] || '').toLowerCase();
if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) continue;
if (!validMac(mac)) continue;
if (mac === '00:00:00:00:00:00') continue;
if (flags === '0x0') continue;
if (ip === localIp) continue;
map[mac] = { ip: ip, mac: mac };
}
var old = {};
devList.forEach(function (d) { old[d.mac] = d; });
devList = [];
for (var mac2 in map) {
if (!map.hasOwnProperty(mac2)) continue;
var o = old[mac2] || {};
var c = cfg[mac2] || null;
var name = nameOf(mac2, map[mac2].ip);
var sr = seenMap[mac2];
var joinAt = sr ? sr.first : now;
devList.push({
mac: mac2,
ip: map[mac2].ip,
hostname: name,
joinAt: joinAt,
upSec: Math.max(0, Math.floor((now - joinAt) / 1000)),
joinFresh: (now - joinAt) < 20000,
up: o.up || 0,
down: o.down || 0,
spUp: o.spUp || 0,
spDown: o.spDown || 0
});
}
devList.sort(function (a, b) { return a.ip < b.ip ? -1 : 1; });
}
function parseDhcp(lines) {
for (var i = 0; i < lines.length; i++) {
var p = String(lines[i]).trim().split(/\s+/);
if (p.length < 4) continue;
var mac = String(p[1] || '').toLowerCase();
if (!validMac(mac)) continue;
var host = p[3] || '';
if (!host || host === '*' || host.indexOf(':') >= 0) continue;
dhcpNames[mac] = host;
if (setName(mac, host)) namesDirty = true;
}
}
function parseBlack(lines) {
blacklist = [];
for (var i = 0; i < lines.length; i++) {
var m = String(lines[i]).trim().toLowerCase();
if (!m) continue;
if (m.charAt(0) === '#') continue;
if (validMac(m) && blacklist.indexOf(m) < 0) blacklist.push(m);
}
}
function parseUsage(lines) {
usageMap = {};
for (var i = 0; i < lines.length; i++) {
var p = String(lines[i]).trim().split(/\s+/);
if (p.length < 3) continue;
var k = p[0].replace(/^usage_/, '');
usageMap[k] = { day: p[1], sec: parseInt(p[2], 10) || 0 };
}
}
function applyCounters(ctr) {
var now = Date.now();
for (var i = 0; i < devList.length; i++) {
var d = devList[i];
var c = ctr[d.ip];
if (!c) continue;
var p = prevCtr[d.mac];
var newUp = false, newDown = false;
if (c.up < d.up || c.down < d.down) {
p = null;
}
if (p && now > p.ts) {
var dt = (now - p.ts) / 1000;
var su = Math.max(0, c.up - d.up) / dt;
var sd = Math.max(0, c.down - d.down) / dt;
var MAXV = 80 * 1024 * 1024;
if (su < MAXV) { d.spUp = p.su ? p.su * 0.4 + su * 0.6 : su; newUp = true; }
if (sd < MAXV) { d.spDown = p.sd ? p.sd * 0.4 + sd * 0.6 : sd; newDown = true; }
}
if (!newUp) d.spUp = d.spUp * 0.7;
if (!newDown) d.spDown = d.spDown * 0.7;
d.up = c.up;
d.down = c.down;
prevCtr[d.mac] = { ts: now, su: d.spUp, sd: d.spDown };
}
}
function findDev(mac) {
for (var i = 0; i < devList.length; i++) if (devList[i].mac === mac) return devList[i];
return null;
}
function doBlock(mac) {
if (!validMac(mac)) return Promise.resolve();
if (blacklist.indexOf(mac) < 0) blacklist.push(mac);
var k = keyOf(mac);
return sh('iptables -D FORWARD -m mac --mac-source ' + mac + ' -j DROP 2>/dev/null; ' +
'iptables -I FORWARD 1 -m mac --mac-source ' + mac + ' -j DROP 2>/dev/null; ' +
'hostapd_cli deauthenticate ' + mac + ' >/dev/null 2>&1; ' +
'hostapd_cli disassociate ' + mac + ' >/dev/null 2>&1; echo done')
.then(function () { return sh('mkdir -p ' + DIR + '; echo blacklist > ' + DIR + '/blocked_' + k); })
.then(function () { return syncBlacklist(); })
.then(function () { toast('已拉黑并踢下线'); render(); });
}
function doUnblock(mac) {
if (!validMac(mac)) return Promise.resolve();
var idx = blacklist.indexOf(mac);
if (idx >= 0) blacklist.splice(idx, 1);
var k = keyOf(mac);
return sh('iptables -D FORWARD -m mac --mac-source ' + mac + ' -j DROP 2>/dev/null; rm -f ' + DIR + '/blocked_' + k + '; echo done')
.then(function () { return syncBlacklist(); })
.then(function () { toast('已解除拉黑'); render(); });
}
function applyQos(quiet) {
return sh('sh ' + QOS + ' 2>&1 | tail -3').then(function (s) {
var t = String(s || '');
var r = { ok: false, tc: true, lan: true, want: 0, hit: 0, nowan: 0, def: 0, msg: '', cls: false, mark: false, ing: false };
var m1 = t.match(/want=(\d+) ok=(\d+)/);
if (m1) { r.want = parseInt(m1[1], 10); r.hit = parseInt(m1[2], 10); }
var m2 = t.match(/nowan=(\d+)/);
if (m2) r.nowan = parseInt(m2[1], 10);
var m3 = t.match(/def=(\d+)/);
if (m3) r.def = parseInt(m3[1], 10);
var mc = t.match(/cls=(\d+)/);
r.cls = mc ? (parseInt(mc[1], 10) === 1) : false;
var mm = t.match(/mark=(\S+)/);
r.mark = mm && mm[1] !== '' && mm[1] !== '0';
var mi = t.match(/ing=(\d+)/);
r.ing = mi ? (parseInt(mi[1], 10) === 1) : false;
if (t.indexOf('NO_TC') >= 0) {
r.tc = false;
r.msg = '本机没有 tc 命令，限速功能不可用（拉黑 / 限时不受影响）';
} else if (t.indexOf('NO_LAN') >= 0) {
r.lan = false;
r.msg = '未识别到热点接口，限速未下发（等有设备接入后再点一次）';
} else if (t.indexOf('PARTIAL') >= 0) {
r.msg = '部分规则下发失败（' + r.hit + '/' + r.want + ' 条生效），请点「诊断 → 限速自检」看是哪一条';
} else if (t.indexOf('OK') >= 0) {
r.ok = true;
r.msg = r.want > 0 ? ('已下发 ' + r.hit + '/' + r.want + ' 条限速规则') : '没有需要限速的设备';
} else if (!t) {
r.msg = '限速脚本无输出，请到「后台守护」重新部署';
} else {
r.msg = '限速脚本返回异常：' + t.replace(/\s+/g, ' ').slice(0, 120);
}
if (r.ok && r.nowan > 0) {
r.msg = '下载限速已生效；上传限速未生效（没识别到上网口 WAN）';
}
if (!quiet) toast(r.msg, r.ok ? 'green' : 'red');
lastQosResult = r;
return r;
}).catch(function (e) {
var r = { ok: false, tc: true, lan: true, want: 0, hit: 0, nowan: 0, def: 0, msg: '执行限速脚本失败：' + (e.message || e), cls: false, mark: false, ing: false };
if (!quiet) toast(r.msg, 'red');
lastQosResult = r;
return r;
});
}
function showQosCheck() {
var ID_BOX = uniq('udc_qc_box');
var el = openModal({
title: '限速自检',
maxWidth: '540px',
closeText: '关闭',
content: '<div id="' + ID_BOX + '" style="font-size:11px;opacity:.6;">检测中，请稍候（约 4 秒）...</div>'
});
var box = el.querySelector('#' + ID_BOX);
var L = lanIface || 'wlan0';
var WAN = '';
function segOf(raw) {
var seg = {}, cur = null;
String(raw || '').split('\n').forEach(function (l) {
var m = l.match(/^##([A-Z0-9_]+)##\s*$/);
if (m) { cur = m[1]; seg[cur] = []; return; }
if (cur) seg[cur].push(l);
});
return seg;
}
function rateKbit(s) {
var m = String(s).match(/rate\s+(\d+)(K|M|G)?bit/i);
if (!m) return 0;
var v = parseInt(m[1], 10);
var u = (m[2] || '').toUpperCase();
if (u === 'M') v = v * 1000;
else if (u === 'G') v = v * 1000000;
return v;
}
function parseClass(lines) {
var map = {}, cur = '';
(lines || []).forEach(function (l) {
var cm = l.match(/class htb (1:\d+)/);
if (cm) {
cur = cm[1];
map[cur] = { rate: rateKbit(l), sent: 0 };
return;
}
if (cur && /Sent\s+(\d+)/.test(l)) {
var sm = l.match(/Sent\s+(\d+)/);
if (sm) map[cur].sent = parseInt(sm[1], 10) || 0;
}
});
return map;
}
var cmd =
'W=$(ip route show default 2>/dev/null | awk \'{ for (i=1;i<=NF;i++) if ($i=="dev") { print $(i+1); exit } }\');' +
'echo "##WAN##"; echo "$W";' +
'echo "##CONF##"; cat ' + CONF + ' 2>/dev/null;' +
'echo "##CLS##"; tc -s class show dev ' + L + ' 2>&1;' +
'echo "##WCLS##"; if [ -n "$W" ]; then tc -s class show dev $W 2>&1; fi;' +
'echo "##FLT##"; tc filter show dev ' + L + ' 2>&1;' +
'echo "##ARP##"; cat /proc/net/arp 2>/dev/null;';
sh(cmd).then(function (raw1) {
var s1 = segOf(raw1);
WAN = (s1.WAN || []).join('').trim();
var cls1 = parseClass(s1.CLS);
var wcls1 = parseClass(s1.WCLS);
var arp = {};
(s1.ARP || []).forEach(function (l) {
var p = l.trim().split(/\s+/);
if (p.length >= 4 && /^\d+\.\d+\.\d+\.\d+$/.test(p[0]) && p[2] !== '0x0') arp[p[3].toLowerCase()] = p[0];
});
var plan = [];
var ID = 10;
(s1.CONF || []).forEach(function (l) {
var t = l.trim();
if (!t || t.charAt(0) === '#') return;
var p = t.split('|');
if (p.length < 3) return;
var mac = String(p[0] || '').toLowerCase();
var up = parseInt(p[1], 10) || 0;
var dn = parseInt(p[2], 10) || 0;
if (!up && !dn) return;
if (!arp[mac]) return;
if (dn > 0) plan.push({ mac: mac, ip: arp[mac], dir: '下载', kbs: dn, want: kbs2kbit(dn), id: ID });
if (up > 0) plan.push({ mac: mac, ip: arp[mac], dir: '上传', kbs: up, want: kbs2kbit(up), id: ID });
ID++;
});
return sh('W=$(ip route show default 2>/dev/null | awk \'{ for (i=1;i<=NF;i++) if ($i=="dev") { print $(i+1); exit } }\'); ' +
'echo "##CLS##"; tc -s class show dev ' + L + ' 2>&1; ' +
'echo "##WCLS##"; if [ -n "$W" ]; then tc -s class show dev $W 2>&1; fi;').then(function (raw2) {
var s2 = segOf(raw2);
var cls2 = parseClass(s2.CLS);
var wcls2 = parseClass(s2.WCLS);
var html = '<div style="font-size:11px;opacity:.65;margin-bottom:8px;line-height:1.7;">' +
'热点口 <span class="udc-mono">' + esc(L) + '</span>　上网口 <span class="udc-mono">' +
esc(WAN || '未识别') + '</span><br>' +
'限速值一律按 <b>KB/s</b> 显示，下发到 tc 时换算成 kbit（×8）</div>';
if (!plan.length) {
html += '<div style="padding:14px;text-align:center;opacity:.6;">当前没有配置任何限速，' +
'或这些设备当前不在线（拿不到 IP 时规则不会下发）</div>';
box.innerHTML = html;
return;
}
var pick = function (p, a, b) { return p.dir === '上传' ? b : a; };
var matchRate = function (real, want) {
return real > 0 && Math.abs(real - want) <= Math.max(8, Math.round(want * 0.02));
};
var defGrew = 0;
[cls1, wcls1].forEach(function (a, i) {
var b = i === 0 ? cls2 : wcls2;
if (a['1:999'] && b['1:999']) defGrew += Math.max(0, b['1:999'].sent - a['1:999'].sent);
});
html += '<table class="udc-tbl"><thead><tr><th>设备</th><th>方向</th><th>设定值</th><th>tc 实际</th><th>流量</th></tr></thead><tbody>';
var noFlow = [];
plan.forEach(function (p) {
var cid = '1:' + p.id;
var real = pick(p, cls1, wcls1)[cid] ? pick(p, cls1, wcls1)[cid].rate : 0;
var d1 = pick(p, cls1, wcls1)[cid] ? pick(p, cls1, wcls1)[cid].sent : 0;
var d2 = pick(p, cls2, wcls2)[cid] ? pick(p, cls2, wcls2)[cid].sent : 0;
var okRate = matchRate(real, p.want);
var grew = d2 > d1;
if (real && !grew) noFlow.push(p);
var flowCls = grew ? 'color:#4ade80;' : 'color:#f87171;';
html += '<tr>' +
'<td><div style="font-weight:700;">' + esc(nameOf(p.mac, p.ip)) + '</div>' +
'<div class="udc-sub udc-mono" style="font-size:10px;">' + esc(p.ip) + '</div></td>' +
'<td>' + p.dir + '<div class="udc-sub" style="font-size:10px;">class ' + cid + '</div></td>' +
'<td style="white-space:nowrap;">' + esc(fmtRate(p.kbs)) +
'<div class="udc-sub" style="font-size:10px;">期望 ' + p.want + ' kbit</div></td>' +
'<td style="white-space:nowrap;' + (okRate ? 'color:#4ade80;' : 'color:#f87171;') + '">' +
(real ? real + ' kbit' : '未找到') + '</td>' +
'<td style="white-space:nowrap;' + flowCls + '">' +
(grew ? '+' + fmtBytes(d2 - d1) + '/3s'
: (real ? '未进入队列' : '-')) + '</td>' +
'</tr>';
});
html += '</tbody></table>';
var bad = plan.filter(function (p) {
var cid = '1:' + p.id;
var m = pick(p, cls1, wcls1);
return !matchRate(m[cid] ? m[cid].rate : 0, p.want);
}).length;
bad += noFlow.length;
var mech = [];
if (lastQosResult) {
mech.push('CLASSIFY ' + (lastQosResult.cls ? '可用' : '不可用'));
mech.push('fwmark ' + (lastQosResult.mark ? '可用' : '不可用'));
mech.push('入口限速 ' + (lastQosResult.ing ? '已启用' : '未启用'));
}
html += '<div style="margin-top:8px;padding:7px 10px;border-radius:8px;font-size:11px;line-height:1.7;' +
'background:rgba(255,255,255,.04);opacity:.75;">分类通道：' +
(mech.length ? esc(mech.join('　|　')) : '尚未下发，点「后台守护 → 部署 / 重建」') + '</div>';
var ver = '';
if (noFlow.length) {
ver = '有 ' + noFlow.length + ' 条规则的流量<b>没有进入限速队列</b>' +
(defGrew > 0 ? '（默认类 1:999 这 3 秒却在转发 ' + fmtBytes(defGrew) + '，说明流量被当成了不限速流量）' : '') +
'。<br>规则本身建好了、速率也对，但流量没被分进来 —— 这正是"自检全绿却不限速"的原因。' +
'<br>常见根因：fwmark 与系统 netd 的标记位冲突、或系统启用了硬件/内核转发加速绕过了这三条通道。' +
'<br>建议：点「后台守护 → 部署 / 重建」重新下发；若仍无效，把该设备改设下载限速（下载有额外兜底）。';
}
html += '<div style="margin-top:10px;padding:8px 10px;border-radius:8px;font-size:11px;line-height:1.7;' +
(bad ? 'background:rgba(255,107,107,.1);color:#ff8787;' : 'background:rgba(74,222,128,.1);color:#4ade80;') + '">' +
(bad
? (ver || ('有 ' + bad + ' 条规则的 tc 实际速率与设定值对不上。常见原因：设备刚断线导致那一次下发被跳过、' +
'设定的速率超过了内核允许的上限、或 tc 被内核拒绝。点「后台守护 → 部署 / 重建」后重试。'))
: '全部 ' + plan.length + ' 条限速规则的 tc 速率都与设定值一致，' +
'且这 3 秒内都检测到流量进入限速队列 —— 限速是真的在起作用。') +
'</div>';
if (!WAN) {
html += '<div style="margin-top:8px;padding:8px 10px;border-radius:8px;font-size:11px;line-height:1.7;' +
'background:rgba(251,191,36,.12);color:#fbbf24;">未识别到上网口（WAN），' +
'上传限速无法下发，下载限速不受影响。</div>';
}
box.innerHTML = html;
});
}).catch(function (e) {
if (box) box.innerHTML = '<div style="color:#f87171;">自检失败：' + esc(e.message || e) + '</div>';
});
}
function daemonStatus() {
return sh(SVC + ' status 2>/dev/null').then(function (s) {
var m = String(s || '').match(/running\s+pid=(\d+)/);
if (m) return { on: true, pid: m[1] };
return { on: false, pid: '' };
}).catch(function () { return { on: false, pid: '' }; });
}
function bootHookOn() {
return sh('grep -qxF "' + BOOT_LINE + '" ' + BOOT_HOOK + ' 2>/dev/null && echo YES || echo NO')
.then(function (r) { return String(r || '').indexOf('YES') >= 0; })
.catch(function () { return false; });
}
function installBootHook(on) {
var cmd;
if (on) {
cmd = 'mkdir -p ' + BASE + ' 2>/dev/null; touch ' + BOOT_HOOK + '; chmod 755 ' + BOOT_HOOK + ' 2>/dev/null; ' +
'sed -i "/ufi_devctrl/d" ' + BOOT_HOOK + ' 2>/dev/null; ' +
'grep -qxF "' + BOOT_LINE + '" ' + BOOT_HOOK + ' 2>/dev/null || printf "%s\\n" "' + BOOT_LINE + '" >> ' + BOOT_HOOK + '; ' +
'echo ok';
} else {
cmd = 'touch ' + BOOT_HOOK + ' 2>/dev/null; ' +
'sed -i "/ufi_devctrl/d" ' + BOOT_HOOK + ' 2>/dev/null; echo ok';
}
return sh(cmd)
.then(function () { return bootHookOn(); })
.catch(function () { return false; });
}
var migratedLegacy = false;
function migrateLegacy() {
if (migratedLegacy) return Promise.resolve(true);
migratedLegacy = true;
var pairs = [
['/sdcard/ufi_devctrl.conf', CONF],
['/sdcard/ufi_devctrl_global.conf', GCONF],
['/sdcard/ufi_devctrl_blacklist.txt', BLACK],
['/sdcard/ufi_devctrl_data/seen.txt', SEENF]
];
var c = 'mkdir -p ' + BASE + ' ' + DIR + ' 2>/dev/null; ';
for (var i = 0; i < pairs.length; i++) {
c += '[ -f "' + pairs[i][1] + '" ] || cp -f "' + pairs[i][0] + '" "' + pairs[i][1] + '" 2>/dev/null; ';
}
c += 'for f in /sdcard/ufi_devctrl_data/usage_* /sdcard/ufi_devctrl_data/blocked_*; do ' +
'[ -f "$f" ] || continue; ' +
'b=$(basename "$f"); ' +
'[ -e "' + DIR + '/$b" ] || cp -f "$f" "' + DIR + '/$b" 2>/dev/null; ' +
'done; ' +
'rm -f /sdcard/ufi_devctrl.sh /sdcard/ufi_devctrl_qos.sh /sdcard/ufi_devctrl_seen.sh 2>/dev/null; ' +
'echo ok';
return sh(c).catch(function () { return ''; });
}
function deployDaemon(silent) {
toast('正在部署守护进程...');
scriptsReady = false;
return migrateLegacy()
.then(function () { return killDaemonProc(); })
.then(function () { return ensureScripts(); })
.then(function (ok1) {
if (!ok1) throw new Error('限速 / 记录脚本写入失败（文件内容未更新）');
return writeFile(SVC, buildServiceShell(), STAMP);
})
.then(function (ok2) {
if (!ok2) throw new Error('服务脚本写入失败（文件内容未更新）');
return sh('chmod 755 ' + QOS + ' ' + SEENSH + ' ' + NAMESH + ' ' + SVC + ' 2>/dev/null; echo ok');
})
.then(function () { return sh('mkdir -p ' + BASE + ' ' + DIR + ' 2>/dev/null; echo ok'); })
.then(function () { return sh('[ -s ' + GCONF + ' ] || printf "CHECK_INTERVAL=30\\n" > ' + GCONF + '; echo ok'); })
.then(function () { return syncConf(); })
.then(function () { return syncBlacklist(); })
.then(function () { return installBootHook(true); })
.then(function (bootOk) {
if (!bootOk) throw new Error('开机自启写入失败，请检查 ' + BOOT_HOOK + ' 是否可写');
return applyQos();
})
.then(function () { return sh(SVC + ' restart 2>&1; echo "rc=$?"'); })
.then(function (s) {
if (String(s || '').indexOf('rc=0') < 0) {
throw new Error('守护启动失败：' + String(s || '').replace(/rc=\d+/, '').trim());
}
return daemonStatus();
})
.then(function (st) {
if (!st.on) throw new Error('守护进程未在运行，请再点一次「部署 / 重建」');
daemonOn = true;
if (!silent) toast('守护已启动 PID=' + st.pid + '，开机自启已写入', 'green');
refreshDaemonBtn();
})
.catch(function (e) {
console.error(e);
toast('部署失败：' + (e.message || e), 'red');
refreshDaemonBtn();
});
}
function startDaemon() {
return sh(SVC + ' start 2>&1; echo "rc=$?"')
.then(function (s) {
if (String(s || '').indexOf('rc=0') < 0) throw new Error('启动命令返回失败');
return daemonStatus();
})
.then(function (st) {
daemonOn = st.on;
toast(st.on ? '守护已启动 PID=' + st.pid : '启动后仍未检测到进程', st.on ? 'green' : 'red');
refreshDaemonBtn();
return st;
})
.catch(function (e) {
toast('启动失败：' + (e.message || e), 'red');
return { on: false, pid: '' };
});
}
function killDaemonProc() {
var cmd =
'if [ -x ' + SVC + ' ]; then ' + SVC + ' stop >/dev/null 2>&1; fi; ' +
'rm -f ' + PIDF + ' 2>/dev/null; ' +
'for p in $(ls /proc 2>/dev/null); do ' +
'case "$p" in ""|*[!0-9]*) continue ;; esac; ' +
'if [ "$p" = "$$" ] || [ "$p" = "$PPID" ]; then continue; fi; ' +
'tr "\\000" " " 2>/dev/null < "/proc/$p/cmdline" | grep -Fq "' + SVC + ' daemon" && kill -9 "$p" 2>/dev/null; ' +
'done; echo killed';
return sh(cmd).catch(function () { return ''; });
}
function stopDaemon() {
return killDaemonProc().then(function () {
daemonOn = false;
toast('守护进程已停止（开机自启仍保留，重启后会自动拉起）');
refreshDaemonBtn();
});
}
function upgradeScriptsIfDeployed() {
return sh('[ -f ' + SVC + ' ] && echo YES || echo NO')
.then(function (s) {
if (String(s || '').indexOf('YES') < 0) return false;
return hasStamp(SVC, STAMP).then(function (fresh) {
if (fresh) return false;
console.log('[设备控制] 设备端脚本是旧版本，自动升级');
scriptsReady = false;
return ensureScripts()
.then(function (ok) {
if (!ok) throw new Error('脚本写入失败');
return writeFile(SVC, buildServiceShell(), STAMP);
})
.then(function (ok) {
if (!ok) throw new Error('服务脚本写入失败');
return sh('chmod 755 ' + SVC + ' 2>/dev/null; echo ok');
})
.then(function () { return sh(SVC + ' restart >/dev/null 2>&1; echo ok'); })
.then(function () {
toast('设备端脚本已自动升级到 v' + VERSION, 'green');
return true;
})
.catch(function (e) {
console.warn('[设备控制] 脚本自动升级失败', e);
return false;
});
});
})
.catch(function () { return false; });
}
function selfHealOnce() {
return migrateLegacy()
.then(function () { return upgradeScriptsIfDeployed(); })
.then(function () { return hasStamp(SVC, STAMP); })
.then(function (fresh) {
if (!fresh) return false;
return bootHookOn().then(function (on) {
if (on) return true;
return installBootHook(true).then(function (okNow) {
console.log('[设备控制] 开机自启行缺失，已' + (okNow ? '补写' : '补写失败'));
return okNow;
});
});
})
.then(function () { return daemonStatus(); })
.then(function (st) {
if (st.on) return st;
return sh(SVC + ' start >/dev/null 2>&1; echo ok')
.then(function () { return daemonStatus(); });
})
.then(function (st) {
daemonOn = st.on;
refreshDaemonBtn();
return st;
})
.catch(function () { return { on: false, pid: '' }; });
}
function showLog() {
var ID_BOX = uniq('udc_log_box'), ID_RF = uniq('udc_log_refresh'), ID_CL = uniq('udc_log_clear');
var el = openModal({
title: '守护进程日志',
maxWidth: '560px',
showConfirm: false,
closeText: '关闭',
content: '<div id="' + ID_BOX + '" style="font-size:11px;opacity:.6;">读取中...</div>' +
'<div style="margin-top:10px;display:flex;gap:6px;">' +
'<button class="udc-btn" id="' + ID_RF + '">刷新</button>' +
'<button class="udc-btn danger" id="' + ID_CL + '">清空日志</button></div>'
});
var box = el.querySelector('#' + ID_BOX);
function load() {
sh('tail -n 120 ' + LOG + ' 2>/dev/null || echo "(无日志)"').then(function (s) {
var t = String(s || '').trim();
box.innerHTML = '<pre class="udc-pre">' + esc(t || '(无日志)') + '</pre>';
});
}
load();
var r = el.querySelector('#' + ID_RF);
if (r) r.addEventListener('click', load);
var c = el.querySelector('#' + ID_CL);
if (c) c.addEventListener('click', function () {
sh('rm -f ' + LOG + '; echo ok').then(function () { load(); toast('日志已清空'); });
});
}
function showRename(mac, onSaved) {
var d = findDev(mac);
var c = getCfg(mac);
var cur = c.name || (d ? d.hostname : '');
var ID_NAME = uniq('udc_name');
openModal({
title: '修改备注名称',
maxWidth: '360px',
confirmText: '保存',
content:
'<div style="font-size:11px;opacity:.6;margin-bottom:8px;">' +
'MAC <span class="udc-mono">' + esc(mac) + '</span><br>IP ' + esc(d ? d.ip : '-') +
'</div>' +
'<input class="udc-inp" id="' + ID_NAME + '" type="text" value="' + esc(cur) + '" placeholder="例如：小明的手机">' +
'<div class="udc-hint">留空即可恢复默认名称（DHCP 主机名）</div>',
onConfirm: function (el) {
var ni = el.querySelector('#' + ID_NAME);
var v = (ni && ni.value ? ni.value : '').trim();
c.name = sanitizeName(v);
markLocal(mac);
if (d) d.hostname = v || nameOf(mac, d.ip);
render();
syncConf().then(function () {
toast('备注已保存' + (confLoaded ? '' : '（设备端未就绪，将稍后重试）'));
render();
if (typeof onSaved === 'function') onSaved();
});
}
});
}
function showLimit(mac) {
var d = findDev(mac);
var c = getCfg(mac);
var opts = [0, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
var ID_DN = uniq('udc_dn'), ID_UP = uniq('udc_up');
var ID_DNH = uniq('udc_dnh'), ID_UPH = uniq('udc_uph');
function mbsText(kbs) {
var v = Number(kbs) || 0;
if (v <= 0) return '不限速';
return '≈ ' + (v * 8 / 1000).toFixed(v * 8 >= 10000 ? 0 : 1) + ' Mbps（' +
(v >= 1024 ? (v / 1024).toFixed(v % 1024 === 0 ? 0 : 1) + ' MB/s' : v + ' KB/s') + '）';
}
function sel(id, hid, val, tip) {
var h = '<div class="udc-fld"><label>' + tip + '</label><div class="udc-row">' +
'<input class="udc-inp" id="' + id + '" type="number" inputmode="numeric" min="0" style="width:110px;" value="' + val + '"> ' +
'<span style="font-size:11px;opacity:.6;">KB/s（0 = 不限）</span></div>' +
'<div class="udc-hint" id="' + hid + '" style="margin-top:4px;">' + esc(mbsText(val)) + '</div>' +
'<div class="udc-row" style="margin-top:6px;">';
opts.forEach(function (o) {
h += '<button class="udc-btn" data-t="' + id + '" data-h="' + hid + '" data-v="' + o + '" style="font-size:11px;padding:3px 8px;">' +
(o === 0 ? '不限' : (o >= 1024 ? (o / 1024) + 'MB/s' : o + 'KB/s')) + '</button>';
});
h += '</div></div>';
return h;
}
var el = openModal({
title: '速度限制',
maxWidth: '420px',
confirmText: '保存并生效',
content:
'<div style="font-size:11px;opacity:.6;margin-bottom:10px;">' +
esc((d ? d.hostname : mac)) + ' · <span class="udc-mono">' + esc(mac) + '</span></div>' +
sel(ID_DN, ID_DNH, c.down, '下载限速（设备接收）') +
sel(ID_UP, ID_UPH, c.up, '上传限速（设备发送）') +
'<div class="udc-hint">单位是 KB/s（千字节/秒）。测速软件显示的是 Mbps，' +
'两者相差 8 倍，看上面的实时换算即可。<br>' +
'下载限速在热点口生效，上传限速需要能识别到上网口（WAN）。' +
'保存后会回读 tc 规则确认是否真的下发成功。</div>',
onConfirm: function (box) {
var dn = box.querySelector('#' + ID_DN), up = box.querySelector('#' + ID_UP);
var nd = Math.max(0, parseInt(dn && dn.value, 10) || 0);
var nu = Math.max(0, parseInt(up && up.value, 10) || 0);
var clipped = false;
if (nd > MAX_KBS) { nd = MAX_KBS; clipped = true; }
if (nu > MAX_KBS) { nu = MAX_KBS; clipped = true; }
c.down = nd;
c.up = nu;
markLocal(mac);
syncConf().then(function () { return applyQos(true); }).then(function (r) {
if (clipped) toast('限速值超过上限，已按 ' + (MAX_KBS / 1024) + 'MB/s 上限保存', 'pink');
else toast(r.msg, r.ok ? 'green' : 'red');
render();
});
}
});
if (!el) return;
function syncHint(inpId, hintId) {
var inp = el.querySelector('#' + inpId), hp = el.querySelector('#' + hintId);
if (inp && hp) hp.textContent = mbsText(parseInt(inp.value, 10) || 0);
}
el.addEventListener('input', function (e) {
var id = e.target.getAttribute && e.target.getAttribute('id');
if (id === ID_DN) syncHint(ID_DN, ID_DNH);
else if (id === ID_UP) syncHint(ID_UP, ID_UPH);
});
el.addEventListener('click', function (e) {
var t = e.target.getAttribute && e.target.getAttribute('data-t');
if (!t) return;
var v = e.target.getAttribute('data-v');
var hid = e.target.getAttribute('data-h') || '';
var inp = el.querySelector('#' + t);
if (inp) inp.value = v;
if (hid) syncHint(t, hid);
var sibs = el.querySelectorAll('[data-t="' + t + '"]');
for (var i = 0; i < sibs.length; i++) {
sibs[i].className = 'udc-btn' + (sibs[i].getAttribute('data-v') === String(v) ? ' on' : '');
}
});
var groups = {};
var btns = el.querySelectorAll('[data-t]');
for (var i = 0; i < btns.length; i++) {
var tt = btns[i].getAttribute('data-t');
if (!groups[tt]) groups[tt] = { inp: el.querySelector('#' + tt), list: [] };
groups[tt].list.push(btns[i]);
}
for (var k in groups) {
if (!groups.hasOwnProperty(k)) continue;
var g = groups[k];
var cur = g.inp ? String(g.inp.value) : '';
for (var j = 0; j < g.list.length; j++) {
g.list[j].className = 'udc-btn' + (g.list[j].getAttribute('data-v') === cur ? ' on' : '');
}
}
}
function showTimeLimit(mac) {
var d = findDev(mac);
var c = getCfg(mac);
var u = usageMap[keyOf(mac)];
var usedMin = u ? Math.floor(u.sec / 60) : 0;
var over = c.dmin > 0 && usedMin >= c.dmin;
var usedColor = over ? '#f87171' : '#fbbf24';
var ID_MIN = uniq('udc_dmin'), ID_ST = uniq('udc_st'), ID_ED = uniq('udc_ed');
var el = openModal({
title: '上网时间限制',
maxWidth: '400px',
confirmText: '保存并生效',
content:
'<div style="font-size:11px;opacity:.6;margin-bottom:10px;">' +
esc(d ? d.hostname : mac) + ' · 今日已用 ' +
'<b style="color:' + usedColor + ';font-size:14px;">' + usedMin + '</b>' +
' 分钟' +
(c.dmin > 0 ? ' / 上限 ' + c.dmin + ' 分钟' : '') +
(over ? '<span style="color:#f87171;">（已超限）</span>' : '') +
(u ? '（' + esc(u.day) + '）' : '') +
'</div>' +
'<div class="udc-fld">' +
'<label>每日上网时长上限（分钟，0 = 不限）</label>' +
'<input class="udc-inp" id="' + ID_MIN + '" type="number" inputmode="numeric" value="' + c.dmin + '">' +
'<div class="udc-row" style="margin-top:6px;">' +
[0, 30, 60, 120, 180, 300].map(function (o) {
return '<button class="udc-btn" data-t="' + ID_MIN + '" data-v="' + o + '" style="font-size:11px;padding:3px 8px;">' +
(o === 0 ? '不限' : o + '分钟') + '</button>';
}).join('') +
'</div>' +
'</div>' +
'<div class="udc-fld">' +
'<label>允许上网时段（开始 - 结束，起止相同 = 全天）</label>' +
'<div class="udc-row">' +
'<input class="udc-inp" id="' + ID_ST + '" type="time" style="width:120px;" value="' + min2hm(c.st) + '">' +
'<span style="opacity:.5;">—</span>' +
'<input class="udc-inp" id="' + ID_ED + '" type="time" style="width:120px;" value="' + min2hm(c.ed) + '">' +
'</div>' +
'<div class="udc-hint">例：想禁止 23:00–07:00 上网，就把允许时段设为 07:00 – 23:00。支持跨午夜。</div>' +
'</div>' +
'<div class="udc-hint">时间限制由设备端守护进程执行；未部署守护进程时不会生效。</div>',
onConfirm: function (box) {
var mn = box.querySelector('#' + ID_MIN), sti = box.querySelector('#' + ID_ST), edi = box.querySelector('#' + ID_ED);
c.dmin = Math.max(0, parseInt(mn && mn.value, 10) || 0);
c.st = hm2min(sti ? sti.value : '');
c.ed = hm2min(edi ? edi.value : '');
markLocal(mac);
syncConf().then(function () {
toast('时间限制已保存');
render();
});
}
});
if (el) {
el.addEventListener('click', function (e) {
var t = e.target.getAttribute && e.target.getAttribute('data-t');
if (!t) return;
var v = e.target.getAttribute('data-v');
var inp = el.querySelector('#' + t);
if (inp) inp.value = v;
var sibs = el.querySelectorAll('[data-t="' + t + '"]');
for (var i = 0; i < sibs.length; i++) {
sibs[i].className = 'udc-btn' + (sibs[i].getAttribute('data-v') === v ? ' on' : '');
}
});
markPicked();
}
function markPicked() {
var groups = {};
var btns = el.querySelectorAll('[data-t]');
for (var i = 0; i < btns.length; i++) {
var t = btns[i].getAttribute('data-t');
if (!groups[t]) groups[t] = { inp: el.querySelector('#' + t), list: [] };
groups[t].list.push(btns[i]);
}
for (var k in groups) {
if (!groups.hasOwnProperty(k)) continue;
var g = groups[k];
var cur = g.inp ? String(g.inp.value) : '';
for (var j = 0; j < g.list.length; j++) {
g.list[j].className = 'udc-btn' + (g.list[j].getAttribute('data-v') === cur ? ' on' : '');
}
}
}
}
function showHistory() {
var now = Date.now();
var daemonOn = false;
var pre = confLoaded ? Promise.resolve() : refresh(false).catch(function () {});
pre.then(function () {
return daemonStatus();
}).then(function (st) {
daemonOn = !!st && !!st.on;
renderHistory(now, daemonOn);
}).catch(function () { renderHistory(now, false); });
function renderHistory(now, daemonOn) {
var keys = Object.keys(seenMap);
if (!keys.length) {
openModal({
title: '接入历史',
maxWidth: '400px',
closeText: '关闭',
content: '<div style="font-size:12px;opacity:.6;padding:16px 0;text-align:center;line-height:1.8;">' +
'还没有任何接入记录<br><span style="font-size:11px;opacity:.75;">点「刷新」后开始记录</span></div>'
});
return;
}
var rows = keys.map(function (mac) {
var r = seenMap[mac];
var c = cfg[mac] || null;
var rs = resolveName(mac, r.ip || '');
var named = (rs.kind === 'custom' || rs.kind === 'host');
var disp = rs.text;
var online = isOnlineNow(mac, now);
var isBlack = blacklist.indexOf(mac) >= 0;
return {
mac: mac, disp: disp, named: named,
first: r.first, last: r.last, ip: r.ip, count: r.count,
online: online, isBlack: isBlack,
sec: Math.max(0, Math.floor((now - r.first) / 1000))
};
});
rows.sort(function (a, b) {
if (a.named !== b.named) return a.named ? 1 : -1;
if (a.online !== b.online) return a.online ? 1 : -1;
return b.last - a.last;
});
var html = '';
var unknown = rows.filter(function (r) { return !r.named; }).length;
html += '<div style="padding:8px 10px;background:rgba(255,255,255,.04);border-radius:8px;margin-bottom:10px;font-size:11px;line-height:1.7;">' +
'共记录 ' + rows.length + ' 台设备，其中 <b style="color:' + (unknown ? '#fbbf24' : '#4ade80') + ';">' + unknown + ' 台未识别名称</b>（陌生设备）<br>' +
'<span style="opacity:.6;">记录保存 30 天　● 在线　○ 离线</span></div>';
if (!daemonOn) {
html += '<div style="padding:8px 10px;background:rgba(251,191,36,.12);border:1px solid rgba(251,191,36,.3);' +
'border-radius:8px;margin-bottom:10px;font-size:11px;line-height:1.7;color:#fbbf24;">' +
'⚠ 后台守护进程未运行<br>' +
'<span style="opacity:.8;color:inherit;">浏览器关掉期间不会有新的记录。' +
'请到「后台守护」部署，守护进程会每 30 秒记录一次。</span></div>';
}
rows.forEach(function (r) {
var col = r.online ? '#4ade80' : '#8b93a1';
var dot = r.online ? '●' : '○';
var tags = '';
if (!r.named) tags += '<span class="udc-tag" style="background:rgba(251,191,36,.16);color:#fbbf24;">陌生</span>';
if (r.isBlack) tags += '<span class="udc-tag">已拉黑</span>';
var when = r.online
? '在线 ' + fmtDur(r.sec)
: '最后出现 ' + fmtAgo(r.last, now);
html += '<div style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);">' +
'<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
'<span style="color:' + col + ';font-size:12px;">' + dot + '</span>' +
'<span style="font-weight:700;font-size:13px;">' + esc(r.disp) + '</span>' +
tags +
'</div>' +
'<div class="udc-mono udc-sub" style="font-size:10px;opacity:.55;">' + esc(r.mac) + '　' + esc(r.ip || '-') + '</div>' +
'<div style="font-size:11px;opacity:.75;margin-top:2px;">' +
'接入 ' + esc(fmtStamp(r.first)) + '　' + esc(when) +
'　' + (r.count > 1 ? '重连 ' + r.count + ' 次' : '首次连接') +
'</div>' +
'<div style="margin-top:5px;display:flex;gap:6px;">' +
'<button class="udc-btn" data-hname="' + esc(r.mac) + '" style="font-size:11px;padding:3px 9px;">✏️ 备注</button>' +
'<button class="udc-btn ' + (r.isBlack ? 'ok' : 'danger') + '" data-hblk="' + esc(r.mac) + '" style="font-size:11px;padding:3px 9px;">' +
(r.isBlack ? '↺ 解除' : '⛔ 拉黑') + '</button>' +
'<button class="udc-btn" data-hdel="' + esc(r.mac) + '" style="font-size:11px;padding:3px 9px;">删除记录</button>' +
'</div>' +
'</div>';
});
var el = openModal({
title: '接入历史（' + rows.length + '）',
maxWidth: '440px',
closeText: '关闭',
content: html
});
el.addEventListener('click', function (e) {
var g = function (n) { return e.target.getAttribute && e.target.getAttribute(n); };
var m = g('data-hname');
if (m) { showRename(m, function () { showHistory(); }); return; }
m = g('data-hblk');
if (m) {
if (blacklist.indexOf(m) >= 0) doUnblock(m).then(function () { showHistory(); });
else doBlock(m).then(function () { showHistory(); });
return;
}
m = g('data-hdel');
if (m) {
confirmBox('删除接入记录', '确定删除 ' + m + ' 的接入记录？<br>不影响拉黑与限速设置。', function () {
sh('grep -v -i "^' + m + '|" ' + SEENF + ' > ' + SEENF + '.tmp 2>/dev/null; mv ' + SEENF + '.tmp ' + SEENF + ' 2>/dev/null; echo ok')
.then(function () { delete seenMap[m]; toast('已删除'); showHistory(); });
}, '删除');
}
});
}
}
function fmtAgo(ts, now) {
var d = Math.max(0, Math.floor((now - ts) / 1000));
if (d < 60) return d + ' 秒前';
if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
return fmtStamp(ts);
}
function fmtStamp(ts) {
var d = new Date(ts), n = new Date();
var hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
var day = Math.floor((new Date(n.getFullYear(), n.getMonth(), n.getDate()) -
new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
if (day === 0) return '今天 ' + hm;
if (day === 1) return '昨天 ' + hm;
if (day === 2) return '前天 ' + hm;
return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + hm;
}
function showBlacklist() {
if (!blacklist.length) {
openModal({
title: '黑名单',
maxWidth: '360px',
closeText: '关闭',
content: '<div style="font-size:12px;opacity:.6;padding:14px 0;text-align:center;">黑名单为空</div>'
});
return;
}
var rows = blacklist.map(function (m) {
var nm = nameOf(m, (seenMap[m] ? seenMap[m].ip : ''));
return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);">' +
'<div style="flex:1;min-width:0;">' +
'<div style="font-size:13px;font-weight:700;">' + esc(nm) + '</div>' +
'<div class="udc-mono udc-sub">' + esc(m) + '</div>' +
'</div>' +
'<button class="udc-btn" data-unblack="' + m + '">解除</button>' +
'</div>';
}).join('');
var el = openModal({
title: '黑名单（' + blacklist.length + '）',
maxWidth: '400px',
closeText: '关闭',
content: rows
});
el.addEventListener('click', function (e) {
var m = e.target.getAttribute && e.target.getAttribute('data-unblack');
if (m) doUnblock(m).then(function () { showBlacklist(); });
});
}
function showDaemon() {
var ID_BODY = uniq('udc_dm_body'), ID_DEP = uniq('udc_dm_deploy'),
ID_STOP = uniq('udc_dm_stop'), ID_LOG = uniq('udc_dm_log'),
ID_BOOT = uniq('udc_dm_boot'), ID_START = uniq('udc_dm_start');
var el = openModal({
title: '后台守护进程',
maxWidth: '460px',
closeText: '关闭',
content: '<div id="' + ID_BODY + '" style="font-size:12px;opacity:.6;">查询中...</div>' +
'<div class="udc-row" style="margin-top:12px;">' +
'<button class="udc-btn" id="' + ID_DEP + '">部署 / 重建</button>' +
'<button class="udc-btn" id="' + ID_START + '">启动</button>' +
'<button class="udc-btn" id="' + ID_STOP + '">停止</button>' +
'<button class="udc-btn" id="' + ID_BOOT + '">开机自启</button>' +
'<button class="udc-btn" id="' + ID_LOG + '">查看日志</button>' +
'</div>' +
'<div class="udc-hint">守护进程在设备本机运行，负责执行「每日时长配额」「允许上网时段」' +
'以及重启后补回拉黑 / 限速规则，关闭浏览器后依然生效。<br>' +
'脚本与数据都在 <span class="udc-mono">' + BASE + '</span>（原生 /data 分区，开机即可用），' +
'开机自启写在 <span class="udc-mono">' + BOOT_HOOK + '</span>，开机 15 秒后自动拉起，失败会重试 3 次。<br>' +
'未部署时，拉黑与限速仍可立即生效，但设备断电重启后会丢失。</div>'
});
var body = el.querySelector('#' + ID_BODY);
var bootOn = false;
function refreshStatus() {
Promise.all([daemonStatus(), bootHookOn(), hasStamp(SVC, STAMP), hasStamp(SEENSH, STAMP)])
.then(function (r) {
var st = r[0];
bootOn = r[1];
var line = function (name, fresh) {
return '<div style="font-size:11px;margin-top:3px;' + (fresh ? 'opacity:.6;' : 'color:#fbbf24;') + '">' +
(fresh ? '✓ ' : '⚠ ') + name + (fresh ? ' v' + VERSION + '（最新）' : ' 是旧版本，请点「部署 / 重建」') + '</div>';
};
body.innerHTML = (st.on
? '<div style="color:#4ade80;font-weight:700;">● 运行中' + (st.pid ? '　PID ' + esc(st.pid) : '') + '</div>'
: '<div style="color:#f87171;font-weight:700;">○ 未运行</div>') +
'<div style="font-size:11px;margin-top:3px;' + (bootOn ? 'color:#4ade80;' : 'color:#fbbf24;') + '">' +
(bootOn ? '✓ ' : '⚠ ') + '开机自启' + (bootOn ? '已启用' : '未启用') +
'　<span style="opacity:.6;">' + esc(BOOT_HOOK) + '</span></div>' +
'<div style="margin-top:6px;">' +
line('服务脚本', r[2]) +
line('接入记录脚本', r[3]) +
'</div>';
var bb = el.querySelector('#' + ID_BOOT);
if (bb) {
bb.textContent = bootOn ? '关闭自启' : '开启自启';
bb.className = 'udc-btn' + (bootOn ? ' on' : '');
}
var sb = el.querySelector('#' + ID_START);
if (sb) {
sb.style.display = st.on ? 'none' : '';
sb.className = 'udc-btn primary';
}
}).catch(function () {
body.innerHTML = '<div style="color:#f87171;font-weight:700;">○ 状态查询失败</div>';
});
}
refreshStatus();
var b1 = el.querySelector('#' + ID_DEP);
if (b1) b1.addEventListener('click', function () {
deployDaemon().then(function () {
seenShReady = false;
return ensureSeenSh();
}).then(refreshStatus);
});
var b5 = el.querySelector('#' + ID_START);
if (b5) b5.addEventListener('click', function () { startDaemon().then(refreshStatus); });
var b2 = el.querySelector('#' + ID_STOP);
if (b2) b2.addEventListener('click', function () { stopDaemon().then(refreshStatus); });
var b4 = el.querySelector('#' + ID_BOOT);
if (b4) b4.addEventListener('click', function () {
var want = !bootOn;
installBootHook(want).then(function (okNow) {
bootOn = okNow;
toast(want ? (okNow ? '开机自启已开启' : '开机自启开启失败') : '开机自启已关闭',
okNow === want ? 'green' : 'red');
refreshStatus();
});
});
var b3 = el.querySelector('#' + ID_LOG);
if (b3) b3.addEventListener('click', showLog);
}
function showDiag() {
var ID_DIAG = uniq('udc_diag'), ID_QCHK = uniq('udc_qchk'), ID_RID = uniq('udc_rid');
var el = openModal({
title: '诊断信息（本插件由元宝AI生成）',
maxWidth: '560px',
closeText: '关闭',
content: '<div id="' + ID_DIAG + '" style="font-size:11px;opacity:.6;">采集中，请稍候（约 2~4 秒）...</div>' +
'<div class="udc-row" style="margin-top:10px;">' +
'<button class="udc-btn primary" id="' + ID_QCHK + '">限速自检</button>' +
'<button class="udc-btn" id="' + ID_RID + '">重新识别设备名</button>' +
'</div>'
});
var box = el.querySelector('#' + ID_DIAG);
var qb = el.querySelector('#' + ID_QCHK);
if (qb) qb.addEventListener('click', showQosCheck);
var rb = el.querySelector('#' + ID_RID);
if (rb) rb.addEventListener('click', function () {
rb.disabled = true;
rb.textContent = '识别中...';
probeNames(true).then(function (got) {
applyNames();
render();
rb.disabled = false;
rb.textContent = '重新识别设备名';
toast(got ? '已更新设备名称' : '本次没有识别到新的设备名（可先用 ✏️ 手动备注）',
got ? 'green' : 'pink');
});
});
var L = lanIface || 'wlan0';
var probe = [
'echo "##IFACE##"; ls /sys/class/net/ 2>/dev/null;',
'echo "##ARP##"; cat /proc/net/arp 2>/dev/null;',
'echo "##ROUTE##"; ip route show default 2>/dev/null;',
'echo "##LANIF##"; echo "iface=' + L + ' ip=' + (localIp || '未获取') + '"; ip -4 addr show ' + L + ' 2>/dev/null | grep "inet ";',
'echo "##PS##"; C=$(ps -ef 2>/dev/null | grep -iE "hostapd|dnsmasq|dhcp" | grep -v grep | head -8); if [ -z "$C" ]; then echo NO_PROC; else echo "$C"; fi;',
'echo "##LEASES##"; for f in /data/misc/apexdata/com.android.tethering/dnsmasq.leases /data/misc/dhcp/dnsmasq.leases /var/lib/misc/dnsmasq.leases /tmp/dnsmasq.leases /data/dnsmasq.leases; do if [ -s "$f" ]; then echo "FILE=$f"; head -5 "$f"; fi; done;',
'echo "##TC##"; (which tc 2>/dev/null || echo NO_TC_PATH); tc qdisc show dev ' + L + ' 2>&1 | head -6;',
'echo "##QOS##"; tc class show dev ' + L + ' 2>&1 | head -20;',
'echo "##TCPD##"; (which tcpdump 2>/dev/null || echo NO_TCPDUMP);',
'echo "##NAMES##"; cat ' + NAMESF + ' 2>/dev/null || echo NO_NAMECACHE;',
'echo "##MACMOD##"; iptables -A FORWARD -m mac --mac-source 00:00:00:00:00:01 -j DROP 2>&1; R=$?; iptables -D FORWARD -m mac --mac-source 00:00:00:00:00:01 -j DROP 2>/dev/null; echo "rc=$R";',
'echo "##CHAIN##"; iptables -t mangle -nvxL ' + CHAIN + ' 2>&1 | head -20;',
'echo "##DAEMON##"; C=$(ps -ef 2>/dev/null | grep ufi_devctrl | grep -v grep | head -3); if [ -z "$C" ]; then echo NOT_RUNNING; else echo "$C"; fi;',
'echo "--pidfile--"; if [ -f ' + PIDF + ' ]; then P=$(cat ' + PIDF + ' 2>/dev/null); if [ -n "$P" ]; then kill -0 "$P" 2>/dev/null && echo "ALIVE $P" || echo "STALE $P"; else echo NOPID; fi; else echo NOPID; fi;',
'echo "--svcstatus--"; ' + SVC + ' status 2>&1 | head -2;',
'echo "##BOOT##"; echo "service=' + SVC + '"; ls -l ' + SVC + ' 2>/dev/null || echo SERVICE_MISSING; ' +
'echo "--hook--"; if [ -f ' + BOOT_HOOK + ' ]; then cat ' + BOOT_HOOK + ' 2>/dev/null; else echo NO_BOOT_HOOK; fi; ' +
'echo "--hookline--"; grep -n "ufi_devctrl" ' + BOOT_HOOK + ' 2>/dev/null || echo NO_LINE;',
'echo "##SEEN##"; echo "在线设备 ' + devList.length + ' 台";',
'echo "##CONF##"; cat ' + CONF + ' 2>/dev/null || echo NO_CONF;',
'echo "##BLACK##"; cat ' + BLACK + ' 2>/dev/null || echo EMPTY;',
'echo "##END##"'
].join(' ');
sh(probe).then(function (raw) {
var seg = {}, cur = null;
String(raw || '').split('\n').forEach(function (l) {
var m = l.match(/^##([A-Z0-9]+)##\s*$/);
if (m) { cur = m[1]; seg[cur] = []; return; }
if (cur) seg[cur].push(l);
});
var g = function (k) { return (seg[k] || []).join('\n').trim(); };
var leaseOk = /FILE=/.test(g('LEASES'));
var tcOk = !/NO_TC_PATH/.test(g('TC')) && !/not found|cannot/i.test(g('TC'));
var macOk = /rc=0/.test(g('MACMOD'));
var chainOk = /RETURN/.test(g('CHAIN'));
var tcpdOk = !/NO_TCPDUMP/.test(g('TCPD'));
var nameTxt = g('NAMES');
var nameCount = 0;
if (!/NO_NAMECACHE/.test(nameTxt)) {
nameTxt.split('\n').forEach(function (l) {
if (l && l.charAt(0) !== '#' && l.indexOf('|') > 0) nameCount++;
});
}
var qosTxt = g('QOS');
var qosCls = (qosTxt.match(/class htb 1:\d+/g) || []).length;
var dTxt = g('DAEMON');
var daemonOn = /ALIVE/.test(dTxt) || (/ufi_devctrl/.test(dTxt) && !/NOT_RUNNING/.test(dTxt));
var bTxt = g('BOOT');
var svcMissing = /SERVICE_MISSING/.test(bTxt);
var hookMissing = /NO_BOOT_HOOK/.test(bTxt);
var bootOk = !svcMissing && !hookMissing && bTxt.indexOf(BOOT_LINE) >= 0;
var line = function (okk, label, tip) {
return '<div style="padding:3px 0;"><span style="color:' + (okk ? '#4ade80' : '#f87171') + ';font-weight:700;">' +
(okk ? '✓' : '✗') + '</span> ' + label +
(tip ? ' <span style="opacity:.55;font-size:10px;">' + esc(tip) + '</span>' : '') + '</div>';
};
var html =
'<div style="padding:10px;background:rgba(255,255,255,.04);border-radius:8px;margin-bottom:10px;">' +
'<div style="font-weight:800;margin-bottom:6px;color:var(--dark-btn-color-active,#4ea1ff);">结论</div>' +
'<div style="font-size:10px;opacity:.6;margin-bottom:6px;">热点口 ' + esc(L) + '　本机IP ' + esc(localIp || '未获取') +
'　设备 ' + devList.length + '　黑名单 ' + blacklist.length + '</div>' +
line(devList.length > 0, '接入设备发现', devList.length + ' 台') +
line(true, '接入时刻 / 在线时长', '由插件首次发现算起，离线超 10 分钟重连则重新计时') +
line(chainOk, '实时速度（iptables 计数链）', chainOk ? '正在计数' : '未计数，点刷新重试') +
line(leaseOk, '设备默认名（DHCP leases）',
leaseOk ? '可用' : '不可用，会退到抓包嗅探与 MAC 厂商猜测，可用 ✏️ 改备注') +
line(tcpdOk, '设备名抓包识别（tcpdump）',
tcpdOk ? '可用，未知设备会自动嗅探 mDNS 主机名'
: '不可用（无 tcpdump），只能靠 DHCP leases 与备注') +
line(nameCount > 0, '已识别设备名缓存',
nameCount > 0 ? ('已记住 ' + nameCount + ' 台（存于 ' + NAMESF + '）')
: '暂无，识别出名字后会写入设备端缓存') +
line(tcOk, '限速（tc）', tcOk ? '可用' : '不可用，限速功能将失效') +
line(qosCls > 0, '限速规则已下发',
qosCls > 0 ? ('tc 上共 ' + qosCls + ' 个限速类，点「限速自检」核对速率是否一致')
: 'tc 上没有限速类（可能没设限速，或还没下发）') +
line(!lastQosResult || lastQosResult.ok !== false, '最近一次限速下发',
lastQosResult ? lastQosResult.msg : '本轮还没下发过') +
line(macOk, '拉黑（iptables mac 模块）', macOk ? '可用' : '不可用') +
line(daemonOn, '后台守护进程',
/ALIVE/.test(dTxt) ? '运行中（PID 存活）'
: /STALE/.test(dTxt) ? 'PID 文件残留但进程已死，需重新部署'
: daemonOn ? '运行中'
: '未运行，时间限制需先部署') +
line(bootOk, '断电重启后自动运行',
svcMissing ? '服务脚本缺失，请点「后台守护 → 部署 / 重建」'
: hookMissing ? '找不到 ' + BOOT_HOOK
: bootOk ? '已写入开机钩子（/data 分区，开机 15 秒后拉起）'
: '开机钩子里没有启动行，请点「后台守护 → 部署 / 重建」') +
'<div style="padding:3px 0;"><span style="color:#888;font-weight:700;">⊘</span> 连接速率 / 信号' +
' <span style="opacity:.55;font-size:10px;">本机型不支持，已按需求移除</span></div>' +
'</div>' +
'<div style="font-size:10px;opacity:.5;margin:10px 0 8px;">↓ 原始输出（点击展开）</div>';
var items = [
['IFACE', '网络接口'], ['ARP', 'ARP 表'], ['ROUTE', '默认路由'], ['LANIF', '热点口 / 本机 IP'],
['PS', '相关进程（hostapd / dnsmasq）'], ['LEASES', 'DHCP leases 探测'],
['TC', 'tc 可用性'], ['QOS', 'tc 限速类（实际下发的速率）'], ['MACMOD', 'iptables mac 模块'],
['TCPD', 'tcpdump（设备名嗅探）'], ['NAMES', '设备名缓存'],
['CHAIN', '计数链 ' + CHAIN], ['DAEMON', '守护进程'], ['BOOT', '开机自启'], ['CONF', '设备配置'], ['BLACK', '黑名单']
];
items.forEach(function (it) {
var t = g(it[0]);
if (!t) t = '(空)';
var bad = /FAIL|NO_TC_PATH|NOT_RUNNING|NO_CONF|EMPTY|NONE|NO_PROC|NO_DNSMASQ|NO_LINE|SERVICE_MISSING|NO_BOOT_HOOK|No such|not found|rc=[^0]/i.test(t);
var openIt = (/LEASES|TC|MACMOD|CHAIN|PS/.test(it[0])) ? ' open' : '';
html += '<details' + openIt + ' style="margin:6px 0;border:1px solid rgba(255,255,255,.07);border-radius:6px;padding:4px 8px;">' +
'<summary style="cursor:pointer;font-weight:700;font-size:11px;color:' + (bad ? '#f87171' : '#4ea1ff') + ';">' +
esc(it[1]) + (bad ? ' ❌' : ' ✓') + '</summary>' +
'<pre class="udc-pre" style="margin-top:6px;">' + esc(t) + '</pre></details>';
});
box.innerHTML = html;
}).catch(function (e) {
console.error('[设备控制] 诊断失败', e);
if (box) box.innerHTML = '<div style="color:#f87171;">诊断采集失败：' + esc(e.message || e) + '</div>';
toast('诊断采集失败', 'red');
});
}
function fmtDur(sec) {
sec = Math.max(0, Math.floor(sec || 0));
var h = Math.floor(sec / 3600);
var m = Math.floor((sec % 3600) / 60);
var s2 = sec % 60;
if (h > 0) return h + '小时' + pad2(m) + '分' + pad2(s2) + '秒';
if (m > 0) return m + '分' + pad2(s2) + '秒';
return s2 + '秒';
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmtClock(ts) {
if (!ts) return '--';
var d = new Date(ts);
return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}
function renderOverview() {
var el = document.querySelector('#udc_overview');
if (!el) return;
var tu = 0, td = 0;
devList.forEach(function (d) { tu += d.spUp; td += d.spDown; });
el.innerHTML =
'<div class="udc-box"><div class="udc-grid4">' +
'<div class="udc-cell"><div class="k">接入设备</div><div class="v">' + devList.length + '</div></div>' +
'<div class="udc-cell"><div class="k">黑名单</div><div class="v">' + blacklist.length + '</div></div>' +
'<div class="udc-cell"><div class="k">实时总上行</div><div class="v sm">' + fmtSpeed(tu) + '</div></div>' +
'<div class="udc-cell"><div class="k">实时总下行</div><div class="v sm">' + fmtSpeed(td) + '</div></div>' +
'</div></div>';
}
function renderList() {
var el = document.querySelector('#udc_tbody');
if (!el) return;
if (!devList.length) {
el.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:26px;opacity:.5;">暂无接入设备（点击刷新试试）</td></tr>';
return;
}
var html = '';
devList.forEach(function (d) {
var c = cfg[d.mac] || null;
var isBlack = blacklist.indexOf(d.mac) >= 0;
var u = usageMap[keyOf(d.mac)];
var tags = '';
if (isBlack) tags += '<span class="udc-tag">已拉黑</span>';
if (d.joinFresh) tags += '<span class="udc-tag lim">新接入</span>';
if (c && (c.up > 0 || c.down > 0)) {
var parts = [];
if (c.down > 0) parts.push('↓' + fmtRate(c.down));
if (c.up > 0) parts.push('↑' + fmtRate(c.up));
tags += '<span class="udc-tag lim">' + esc(parts.join(' ')) + '</span>';
}
if (d.nameKind === 'random') {
tags += '<span class="udc-tag" style="background:rgba(148,163,184,.18);color:#cbd5e1;">随机MAC</span>';
}
if (c && c.dmin > 0) tags += '<span class="udc-tag lim">' + c.dmin + '分/天</span>';
if (c && c.st !== c.ed) tags += '<span class="udc-tag lim">' + min2hm(c.st) + '-' + min2hm(c.ed) + '</span>';
if (c && c.dmin > 0 && u) {
var usedMin = Math.floor(u.sec / 60);
var over = usedMin >= c.dmin;
tags += '<span class="udc-tag lim" style="' +
(over ? 'background:rgba(248,113,113,.2);color:#f87171;'
: 'background:rgba(251,191,36,.16);color:#fbbf24;') + '">' +
'今日 <b>' + usedMin + '</b>/' + c.dmin + '分' + (over ? '（已超限）' : '') + '</span>';
}
html += '<tr class="' + (isBlack ? 'udc-blocked' : '') + '" data-mac="' + d.mac + '">' +
'<td>' +
'<div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:5px;flex-wrap:wrap;">' +
'<span>' + esc(d.hostname) + '</span>' +
'<button class="udc-mini" data-act="rename" data-mac="' + d.mac + '" title="修改备注">✏️</button>' +
tags +
'</div>' +
'<div class="udc-sub udc-mono">' + esc(d.ip) + '</div>' +
'</td>' +
'<td><div class="udc-mono" style="font-size:10px;opacity:.6;">' + esc(d.mac) + '</div></td>' +
'<td style="white-space:nowrap;" title="接入时刻 ' + esc(fmtClock(d.joinAt)) + '">' +
'<div style="font-size:11px;">' + esc(fmtClock(d.joinAt)) + '</div>' +
'<div class="udc-sub" style="font-size:10px;" data-dur="' + esc(d.mac) + '">' +
esc(fmtDur(d.upSec)) + '</div>' +
'</td>' +
'<td style="white-space:nowrap;">' +
(timer
? '<div style="font-size:11px;color:#4ade80;">↑ ' + fmtSpeed(d.spUp) + '</div>' +
'<div style="font-size:11px;color:#60a5fa;">↓ ' + fmtSpeed(d.spDown) + '</div>'
: '<div style="font-size:11px;opacity:.32;">↑ --</div>' +
'<div style="font-size:11px;opacity:.32;">↓ --</div>') +
'<div class="udc-sub">共 ' + fmtBytes(d.up + d.down) + '</div>' +
'</td>' +
'<td style="white-space:nowrap;">' +
'<button class="udc-mini" data-act="time" data-mac="' + d.mac + '" title="时间限制">⏱</button>' +
'<button class="udc-mini" data-act="limit" data-mac="' + d.mac + '" title="速度限制">🐢</button>' +
'<button class="udc-mini ' + (isBlack ? 'ok' : 'warn') + '" data-act="' + (isBlack ? 'unblock' : 'block') + '" data-mac="' + d.mac + '" title="' + (isBlack ? '解除拉黑' : '拉黑') + '">' + (isBlack ? '↺' : '⛔') + '</button>' +
'</td>' +
'</tr>';
});
el.innerHTML = html;
}
function tickClock() {
var any = false;
for (var i = 0; i < devList.length; i++) {
var d = devList[i];
if (!d.joinAt) continue;
d.upSec = Math.max(0, Math.floor((Date.now() - d.joinAt) / 1000));
var cell = document.querySelector('#udc_tbody [data-dur="' + d.mac + '"]');
if (cell) {
var t = fmtDur(d.upSec);
if (cell.textContent !== t) cell.textContent = t;
any = true;
}
}
return any;
}
function renderSpeedNote() {
var el = document.querySelector('#udc_speed_note');
if (!el) return;
el.innerHTML = timer
? '实时速度每 ' + (REFRESH_MS / 1000) + ' 秒采样一次（自动监控已开启，速度正常刷新）'
: '<span style="color:#f87171;">实时速度需开启「自动监控」才会显示（当前未开启，速度显示为 0）</span>';
}
function render() {
renderOverview();
renderList();
renderSpeedNote();
}
function onTableClick(e) {
var t = e.target;
while (t && t !== e.currentTarget && !(t.getAttribute && t.getAttribute('data-act'))) {
t = t.parentNode;
}
if (!t || !t.getAttribute) return;
var act = t.getAttribute('data-act');
var mac = t.getAttribute('data-mac');
if (!act || !mac) return;
if (act === 'rename') showRename(mac);
else if (act === 'limit') showLimit(mac);
else if (act === 'time') showTimeLimit(mac);
else if (act === 'block') {
confirmBox('拉黑设备', '确定要把 <b>' + esc((findDev(mac) || {}).hostname || mac) + '</b> 拉黑吗？<br>该设备会被立即踢下线并禁止上网，直到手动解除。',
function () { doBlock(mac); }, '拉黑');
} else if (act === 'unblock') doUnblock(mac);
}
function refreshDaemonBtn() {
var b = document.querySelector('#udc_d_btn');
if (!b) return;
daemonStatus().then(function (st) {
b.textContent = st.on ? '守护 ●' : '后台守护';
b.className = 'udc-btn' + (st.on ? ' on' : '');
});
}
function refresh(manual) {
if (busy) {
if (manual) pendingManual = true;
return Promise.resolve();
}
busy = true;
var btn = document.querySelector('#udc_refresh_btn');
if (btn && manual) { btn.disabled = true; btn.textContent = '刷新中'; }
var p = Promise.resolve();
if (!localIp || !lanIface) p = p.then(detectLan);
if (!chainReady) p = p.then(initChain);
if (!leasesPath) p = p.then(detectLeasesPath);
p = p.then(ensureScripts).then(function (ok) {
if (!ok && !seenWarned) {
seenWarned = true;
toast('设备端脚本无法更新，限速与接入记录可能不准', 'red');
}
});
return p
.then(fetchAll)
.then(function () {
var jobs = devList.map(function (d) { return addRule(d.ip); });
return Promise.all(jobs);
})
.then(render)
.then(function () {
probeNames(false).then(function (got) {
if (got) { applyNames(); render(); }
});
flushNames();
})
.catch(function (e) {
console.error('[设备控制] 刷新失败', e);
toast('刷新失败：' + (e.message || e), 'red');
})
.then(function () {
busy = false;
if (btn && manual) { btn.disabled = false; btn.textContent = '刷新'; }
if (pendingManual) { pendingManual = false; return refresh(true); }
});
}
function startClock() {
if (clockTimer) return;
if (typeof requestInterval === 'function') {
clockTimer = requestInterval(tickClock, CLOCK_MS);
} else {
var id = setInterval(tickClock, CLOCK_MS);
clockTimer = function () { clearInterval(id); };
}
}
function toggleAuto(on) {
var b = document.querySelector('#udc_auto_btn');
if (on) {
if (typeof requestInterval === 'function') {
timer = requestInterval(function () { refresh(); }, REFRESH_MS);
} else {
var id = setInterval(function () { refresh(); }, REFRESH_MS);
timer = function () { clearInterval(id); };
}
if (b) { b.textContent = '停止监控'; b.className = 'udc-btn on'; }
try { localStorage.setItem(LS_AUTO, '1'); } catch (e) {}
renderSpeedNote();
} else {
try { if (timer) timer(); } catch (e) {}
timer = null;
devList.forEach(function (d) { d.spUp = 0; d.spDown = 0; });
prevCtr = {};
render();
if (b) { b.textContent = '自动监控'; b.className = 'udc-btn'; }
try { localStorage.setItem(LS_AUTO, '0'); } catch (e) {}
renderSpeedNote();
}
startClock();
}
function mount() {
var host = document.querySelector('.functions-container');
var html =
'<div id="IFRAME_UFI_DEVCTRL" style="width:100%;margin-top:10px;">' +
'<div class="title" style="margin:6px 0;">' +
'<strong>WiFi接入设备控制</strong>' +
'<div style="display:inline-block;" id="collapse_devctrl_btn"></div>' +
'</div>' +
'<div class="collapse" id="collapse_devctrl" data-name="close" style="height:0px;overflow:hidden;">' +
'<div class="collapse_box">' +
'<div id="udc_overview"></div>' +
'<div class="udc-row" style="margin-bottom:10px;">' +
'<button class="udc-btn" id="udc_auto_btn">自动监控</button>' +
'<button class="udc-btn" id="udc_black_btn">黑名单</button>' +
'<button class="udc-btn" id="udc_hist_btn">接入历史</button>' +
'<button class="udc-btn" id="udc_d_btn">后台守护</button>' +
'<button class="udc-btn" id="udc_diag_btn">诊断</button>' +
'<button class="udc-btn primary" id="udc_refresh_btn">刷新</button>' +
'</div>' +
'<div style="overflow-x:auto;border-radius:10px;background:rgba(255,255,255,0.015);">' +
'<table class="udc-tbl">' +
'<thead><tr>' +
'<th>设备</th><th>MAC 地址</th><th>接入时刻 / 时长</th><th>实时速度</th><th style="text-align:center;">操作</th>' +
'</tr></thead>' +
'<tbody id="udc_tbody">' +
'<tr><td colspan="5" style="text-align:center;padding:26px;opacity:.5;">展开后点击「刷新」</td></tr>' +
'</tbody>' +
'</table>' +
'</div>' +
'<div style="margin-top:10px;font-size:10px;opacity:.45;text-align:center;line-height:1.6;">' +
'✏️ 备注　⏱ 时间限制　🐢 速度限制　⛔ 拉黑　↺ 解除<br>' +
'<span id="udc_speed_note"></span>' +
'限速依赖 tc，时间限制与"断电重启后自动恢复"需部署后台守护进程<br>' +
'接入记录存在设备端 ' + BASE + '，浏览器关掉期间由后台守护进程持续记录；点「接入历史」查看陌生设备' +
'</div>' +
'</div>' +
'</div>' +
'</div>';
if (host) host.insertAdjacentHTML('afterend', html);
else document.body.insertAdjacentHTML('beforeend', html);
var tb = document.querySelector('#udc_tbody');
if (tb) tb.addEventListener('click', onTableClick);
var r = document.querySelector('#udc_refresh_btn');
if (r) r.addEventListener('click', function () { refresh(true); });
var a = document.querySelector('#udc_auto_btn');
if (a) a.addEventListener('click', function () { toggleAuto(!timer); });
var bl = document.querySelector('#udc_black_btn');
if (bl) bl.addEventListener('click', showBlacklist);
var hs = document.querySelector('#udc_hist_btn');
if (hs) hs.addEventListener('click', showHistory);
var dm = document.querySelector('#udc_d_btn');
if (dm) dm.addEventListener('click', showDaemon);
var dg = document.querySelector('#udc_diag_btn');
if (dg) dg.addEventListener('click', showDiag);
if (typeof collapseGen === 'function') {
try {
collapseGen('#collapse_devctrl_btn', '#collapse_devctrl', '#collapse_devctrl', function (v) {
if (v === 'open') refresh();
});
} catch (e) { bindFallbackCollapse(); }
} else {
bindFallbackCollapse();
}
refreshDaemonBtn();
startClock();
try {
if (localStorage.getItem(LS_AUTO) !== '0') setTimeout(function () { toggleAuto(true); }, 1200);
} catch (e) { setTimeout(function () { toggleAuto(true); }, 1200); }
try {
if (localStorage.getItem(LS_COLLAPSE) === 'open') setTimeout(function () { refresh(); }, 900);
} catch (e) {}
}
function bindFallbackCollapse() {
var btn = document.querySelector('#collapse_devctrl_btn');
var box = document.querySelector('#collapse_devctrl');
if (!btn || !box) return;
btn.innerHTML = '<span class="udc-btn" style="font-size:11px;padding:3px 9px;">展开/收起</span>';
btn.addEventListener('click', function () {
var open = box.getAttribute('data-name') === 'open';
if (open) {
box.setAttribute('data-name', 'close');
box.style.height = '0px';
} else {
box.setAttribute('data-name', 'open');
box.style.height = 'auto';
refresh();
}
});
}
function boot() {
loadCfg();
mount();
setTimeout(function () { selfHealOnce(); }, 3000);
console.log('[WiFi接入设备控制] v' + VERSION + ' 已加载');
}
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', boot);
} else {
boot();
}
})();
</script>