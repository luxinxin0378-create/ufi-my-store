<!-- 插件标题：设备监测报警消息推送 -->
<style>
  #uma_modal_root{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(2px);}
  #uma_modal_root .uma-panel{width:95%;max-width:430px;max-height:86vh;display:flex;flex-direction:column;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:#1b1f27;color:#e6e9ef;box-shadow:0 18px 50px rgba(0,0,0,.5);overflow:hidden;}
  #uma_modal_root .uma-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);}
  #uma_modal_root .uma-title{font-size:.85rem;font-weight:600;}
  #uma_modal_root .uma-body{padding:12px;overflow:auto;}
  #uma_modal_root .uma-x{border:none;background:transparent;color:#9aa4b2;font-size:1.1rem;cursor:pointer;line-height:1;padding:0 4px;}
  #uma_modal_root .uma-wrap{display:flex;flex-direction:column;gap:10px;font-size:.74rem;}
  #uma_modal_root .uma-card{border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));border-radius:14px;padding:10px 12px;}
  #uma_modal_root .uma-card-t{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
  #uma_modal_root .uma-row{display:flex;align-items:center;gap:6px;min-height:30px;}
  #uma_modal_root .uma-label{font-size:.66rem;opacity:.62;min-width:4.6em;flex-shrink:0;}
  #uma_modal_root .uma-input{padding:5px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.22);color:inherit;font-size:.72rem;outline:none;box-sizing:border-box;width:64px;text-align:center;}
  #uma_modal_root .uma-input:focus{border-color:rgba(77,219,138,.55);}
  #uma_modal_root .uma-txt{padding:5px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.22);color:inherit;font-size:.72rem;outline:none;box-sizing:border-box;flex:1;min-width:0;text-align:left;}
  #uma_modal_root .uma-unit{font-size:.6rem;opacity:.45;flex-shrink:0;}
  #uma_modal_root .uma-div{height:1px;background:rgba(255,255,255,.07);margin:8px 0;}
  #uma_modal_root .uma-btn{border-radius:8px;padding:6px 12px;font-size:.68rem;cursor:pointer;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:inherit;transition:background .15s,opacity .15s;}
  #uma_modal_root .uma-btn:hover{background:rgba(255,255,255,.15);}
  #uma_modal_root .uma-btn:disabled{opacity:.35;cursor:not-allowed;}
  #uma_modal_root .uma-on{background:rgba(34,197,94,.22);border-color:rgba(34,197,94,.38);color:#86efac;}
  #uma_modal_root .uma-on:hover{background:rgba(34,197,94,.34);}
  #uma_modal_root .uma-stop{background:rgba(249,115,22,.22);border-color:rgba(249,115,22,.38);color:#fdba74;}
  #uma_modal_root .uma-stop:hover{background:rgba(249,115,22,.34);}
  #uma_modal_root .uma-red{background:rgba(239,68,68,.24);border-color:rgba(239,68,68,.42);color:#fca5a5;}
  #uma_modal_root .uma-red:hover{background:rgba(239,68,68,.38);}
  #uma_modal_root .uma-ghost{background:transparent;border-color:rgba(255,255,255,.14);opacity:.82;}
  #uma_modal_root .uma-ghost:hover{opacity:1;background:rgba(255,255,255,.07);}
  #uma_modal_root .uma-blue{background:rgba(59,130,246,.22);border-color:rgba(59,130,246,.38);color:#93c5fd;}
  #uma_modal_root .uma-blue:hover{background:rgba(59,130,246,.34);}
  #uma_modal_root .uma-dot{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:5px;vertical-align:middle;}
  #uma_modal_root .uma-help{font-size:.6rem;line-height:1.55;opacity:.45;padding:2px 0;}
  #uma_modal_root .uma-log{border:none;box-sizing:border-box;width:100%;min-height:130px;font-size:.62rem;background:rgba(0,0,0,.32);color:#c8ccd4;border-radius:8px;padding:6px;resize:vertical;font-family:monospace;}
  #uma_modal_root .uma-tip{font-size:.62rem;color:#fca5a5;opacity:.9;}
  #uma_modal_root .uma-ok{font-size:.62rem;color:#86efac;opacity:.9;}
  #uma_float{position:fixed;right:14px;bottom:78px;z-index:99998;border-radius:20px;padding:9px 15px;font-size:.72rem;cursor:pointer;border:1px solid rgba(59,130,246,.45);background:rgba(37,99,235,.85);color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.35);}

                                  
  #uma_modal_root .uma-live{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
  #uma_modal_root .uma-lc{background:rgba(0,0,0,.26);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:7px 4px;text-align:center;}
  #uma_modal_root .uma-lc-k{font-size:.56rem;opacity:.55;margin-bottom:3px;letter-spacing:.02em;}
  #uma_modal_root .uma-lc-v{font-size:.9rem;font-weight:700;color:#fbbf24;line-height:1.15;}
  #uma_modal_root .uma-lc-v.over{color:#f87171;}
  #uma_modal_root .uma-lc-s{font-size:.52rem;opacity:.5;margin-top:3px;line-height:1.3;}
  #uma_modal_root .uma-lc-s.over{color:#f87171;opacity:.95;}
  #uma_modal_root .uma-lc.empty .uma-lc-v{color:#94a3b8;font-weight:600;}
  #uma_modal_root .uma-jump{color:#fca5a5;background:rgba(239,68,68,.08);}

               
  #uma_chart_root{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);backdrop-filter:blur(2px);}
  #uma_chart_root .uma-panel{width:96%;max-width:600px;max-height:88vh;display:flex;flex-direction:column;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:#1b1f27;color:#e6e9ef;box-shadow:0 18px 50px rgba(0,0,0,.5);overflow:hidden;}
  #uma_chart_root .uma-head{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);}
  #uma_chart_root .uma-body{padding:12px;overflow:auto;}
  #uma_chart_root .uma-box{background:#0f172a;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:6px;overflow-x:auto;}
  #uma_chart_root .uma-stat{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:9px;}
  #uma_chart_root .uma-sc{background:rgba(0,0,0,.26);border-radius:9px;padding:6px 4px;text-align:center;}
  #uma_chart_root .uma-sc-k{font-size:.55rem;opacity:.55;}
  #uma_chart_root .uma-sc-v{font-size:.8rem;font-weight:700;color:#fbbf24;margin-top:2px;}
  #uma_chart_root .uma-sc-v.hot{color:#f87171;}
  #uma_chart_root .uma-rng{display:flex;gap:5px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;}
  #uma_chart_root .uma-rb{border-radius:7px;padding:4px 10px;font-size:.62rem;cursor:pointer;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;opacity:.7;}
  #uma_chart_root .uma-rb.sel{background:rgba(59,130,246,.22);border-color:rgba(59,130,246,.4);color:#93c5fd;opacity:1;}

                   
                                                                
                                                                
                                                 
                                                      
  #uma_modal_root .uma-chs{display:flex;flex-wrap:wrap;gap:6px;width:100%;}
  #uma_modal_root .uma-ch{display:inline-block;width:auto;max-width:100%;flex:0 0 auto;white-space:nowrap;line-height:1.4;border-radius:7px;padding:4px 9px;font-size:.62rem;cursor:pointer;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;opacity:.62;transition:background .15s,opacity .15s;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;}
  #uma_modal_root .uma-ch:hover{opacity:.9;background:rgba(255,255,255,.07);}
  #uma_modal_root .uma-ch.sel{background:rgba(59,130,246,.22);border-color:rgba(59,130,246,.4);color:#93c5fd;opacity:1;}
                                                
  #uma_modal_root .uma-chblk{display:block;}
  #uma_modal_root .uma-cht{display:flex;align-items:center;gap:6px;margin-bottom:6px;}
  #uma_modal_root .uma-cht b{font-size:.68rem;font-weight:600;}
  #uma_modal_root .uma-chtip{font-size:.58rem;line-height:1.45;opacity:.5;margin-top:5px;}

</style><script>
(function () {
  'use strict';
  var VERSION = '2.0.3';
  var STAMP = 'UMA-STAMP-v2.0.3';
  var NAME = 'ufi_monitor_alarm';
  var MODAL = 'uma_modal_root';
  var CHART = 'uma_chart_root';
  var BASE = '/data/ufi_monitor_alarm';
  var CONFIG_FILE = BASE + '/alarm.conf';
  var SH_FILE = BASE + '/monitor.sh';          
  var SVC_FILE = BASE + '/service.sh';         
  var REPORT_FILE = BASE + '/report.sh';
  var LOG_FILE = BASE + '/alarm.log';
  var DATA_DIR = BASE + '/data';
  var PID_FILE = BASE + '/daemon.pid';
  var BOOT_SH_FILE = '/sdcard/ufi_tools_boot.sh';   
  var BOOT_LINE = SVC_FILE + ' boot >/dev/null 2>&1 &';
  var LS_KEY = 'ufi_monitor_alarm_';
var TEMP_LOCK_SECONDS = 3600;
var CHECK_INTERVAL = 60;
var SAMPLE_KEEP = 1500;
var AGG_BUCKET = 300;
var AGG_KEEP = 300;
var AGG_FROM_HOURS = 12;
var SAMPLE_TRIM_AT = 10000;   
var AGG_TRIM_AT = 2000;       
  var SAMPLE_FILE = DATA_DIR + '/temp_samples.txt';
  var AGG5_FILE = DATA_DIR + '/temp_agg5.txt';
  var CLAIM_DIR = DATA_DIR + '/daemon.claim';
var PP_CHANNELS = [
    { id: 'wechat',    name: '微信公众号',     short: '公众号',   opt: 0, tip: 'PushPlus 默认渠道，需先关注其公众号' },
    { id: 'app',       name: '官方 App',      short: 'App',     opt: 0, tip: '需在官方 App 登录同一账号' },
    { id: 'extension', name: '浏览器插件',     short: '插件',     opt: 0, tip: '浏览器扩展 / 桌面应用，需登录插件' },
    { id: 'webhook',   name: '第三方 Webhook', short: 'Webhook', opt: 1, tip: '企业微信 / 钉钉 / 飞书 / bark / Gotify / Server酱 等，须填后台渠道编码' },
    { id: 'clawbot',   name: '微信 ClawBot',  short: 'ClawBot', opt: 0, tip: '需在后台完成 ClawBot 配置' },
    { id: 'qq',        name: 'QQ 机器人',     short: 'QQ',      opt: 2, tip: '留空发给自己；填群配置编码发到指定 QQ 群' },
    { id: 'cp',        name: '企业微信应用',   short: '企微应用',  opt: 1, tip: '须填后台「企业微信应用」渠道编码' },
    { id: 'mail',      name: '邮箱',         short: '邮箱',     opt: 2, tip: '收件人为后台绑定邮箱；配了自定义 SMTP 才填邮件编码' }
];
  var PP_ORDER = PP_CHANNELS.map(function (d) { return d.id; }).join(' ');
var PP_NEED_OPT = PP_CHANNELS.filter(function (d) { return d.opt === 1; })
                               .map(function (d) { return d.id; }).join(' ');
function chDef(id) {
for (var i = 0; i < PP_CHANNELS.length; i++) if (PP_CHANNELS[i].id === id) return PP_CHANNELS[i];
return null;
}
function chList() {
    var sel = String(state.config.channels || '').split('|');
var out = [];
PP_CHANNELS.forEach(function (d) { if (sel.indexOf(d.id) >= 0) out.push(d.id); });
return out;
}
function chToggle(id) {
var cur = chList();
var i = cur.indexOf(id);
if (i >= 0) cur.splice(i, 1); else cur.push(id);
    state.config.channels = cur.join('|');
saveLocal();
}
  function chOptOf(id) { return String(state.config['opt_' + id] || '').trim(); }
function chNames(ids) {
return (ids || chList()).map(function (id) {
var d = chDef(id);
return d ? d.name : id;
});
}
function chIssues() {
var bad = [];
chList().forEach(function (id) {
var d = chDef(id);
if (d && d.opt === 1 && !chOptOf(id)) bad.push(d.name);
});
return bad;
}
function chJoin() {
var sel = chList();
    return { ch: sel.join(','), opt: sel.map(chOptOf).join(','), list: sel };
}
  var LS_CH = localStorage.getItem(LS_KEY + 'channels');
  var LS_MAIL_OPT_LEGACY = localStorage.getItem(LS_KEY + 'mailOption') || '';
function normChannels(raw) {
    if (raw === null || raw === undefined) return 'mail';
    var parts = String(raw).split('|'), out = [];
PP_CHANNELS.forEach(function (d) { if (parts.indexOf(d.id) >= 0) out.push(d.id); });
    return out.join('|');
}
function sq(v) {
    return "'" + String(v === null || v === undefined ? '' : v).replace(/'/g, "'\\''") + "'";
}
function esc(v) {
    return String(v === null || v === undefined ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function run(cmd, timeout) {
    if (typeof runShellWithRoot !== 'function') return Promise.reject(new Error('runShellWithRoot 不可用'));
return runShellWithRoot(cmd, timeout || 30000);
}
function outOf(rs) {
    if (!rs) return '';
    return String(rs.content || rs.result || rs.stdout || rs.output || rs.data || '');
}
function toast(msg, color, ms) {
try {
      if (typeof createToast === 'function') { createToast(msg, color || 'green', ms || 2600); return; }
} catch (e) {}
    console.log('[设备监测报警] ' + msg);
}
function num(v, dft) {
var n = parseFloat(v);
return isNaN(n) ? (dft || 0) : n;
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function toB64(str) {
    var bytes = new TextEncoder().encode(str), bin = '', i;
for (i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
return btoa(bin);
}
function gb(bytes) {
    if (!bytes || bytes < 0) return '0.00';
return (bytes / 1073741824).toFixed(2);
}
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
function fmtDur(s) {
s = Math.max(0, Math.floor(s));
    if (s < 60) return s + ' 秒';
    if (s < 3600) return Math.floor(s / 60) + ' 分钟';
var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h + ' 小时' + (m ? ' ' + m + ' 分' : '');
}
var state = {
installed: false,
    pid: '',
startedAt: 0,      
heartbeat: 0,      
    daemonStamp: '',   
needMigrate: false,
ready: false,
bootOn: false,
autoLog: false,
autoTimer: null,
autoTick: 0,
lockDay: false,
lockMonth: false,
lockTemp: false,
tempLeftMin: 0,
    reportDay: '',    
probing: false,
    live: { day: -1, month: -1, temp: -1, at: '', err: '' },  
chartRange: 1,
samples: [],   
agg: [],       
config: {
      dailyLimit: num(localStorage.getItem(LS_KEY + 'dailyLimit'), 0),
      monthlyLimit: num(localStorage.getItem(LS_KEY + 'monthlyLimit'), 0),
      tempLimit: num(localStorage.getItem(LS_KEY + 'tempLimit'), 0),
      pushPlusToken: localStorage.getItem(LS_KEY + 'pushPlusToken') || '',
      pushPlusMail: localStorage.getItem(LS_KEY + 'pushPlusMail') || '',
      mailOption: localStorage.getItem(LS_KEY + 'mailOption') || '',
channels: normChannels(LS_CH),
      opt_webhook: localStorage.getItem(LS_KEY + 'opt_webhook') || '',
      opt_cp: localStorage.getItem(LS_KEY + 'opt_cp') || '',
      opt_qq: localStorage.getItem(LS_KEY + 'opt_qq') || '',
      opt_mail: (LS_CH === null ? LS_MAIL_OPT_LEGACY : (localStorage.getItem(LS_KEY + 'opt_mail') || '')),
      dndEnabled: localStorage.getItem(LS_KEY + 'dndEnabled') === '1',
      dndStart: localStorage.getItem(LS_KEY + 'dndStart') || '23:00',
      dndEnd: localStorage.getItem(LS_KEY + 'dndEnd') || '07:00',
      reportEnabled: localStorage.getItem(LS_KEY + 'reportEnabled') === '1',
      reportTime: localStorage.getItem(LS_KEY + 'reportTime') || '08:00'
}
};
function saveLocal() {
var c = state.config;
    localStorage.setItem(LS_KEY + 'dailyLimit', String(c.dailyLimit));
    localStorage.setItem(LS_KEY + 'monthlyLimit', String(c.monthlyLimit));
    localStorage.setItem(LS_KEY + 'tempLimit', String(c.tempLimit));
    localStorage.setItem(LS_KEY + 'pushPlusToken', String(c.pushPlusToken || ''));
    localStorage.setItem(LS_KEY + 'pushPlusMail', String(c.pushPlusMail || ''));
    localStorage.setItem(LS_KEY + 'mailOption', String(c.mailOption || ''));
    localStorage.setItem(LS_KEY + 'channels', String(c.channels || ''));
    localStorage.setItem(LS_KEY + 'opt_webhook', String(c.opt_webhook || ''));
    localStorage.setItem(LS_KEY + 'opt_cp', String(c.opt_cp || ''));
    localStorage.setItem(LS_KEY + 'opt_qq', String(c.opt_qq || ''));
    localStorage.setItem(LS_KEY + 'opt_mail', String(c.opt_mail || ''));
    localStorage.setItem(LS_KEY + 'dndEnabled', c.dndEnabled ? '1' : '0');
    localStorage.setItem(LS_KEY + 'dndStart', String(c.dndStart || '23:00'));
    localStorage.setItem(LS_KEY + 'dndEnd', String(c.dndEnd || '07:00'));
    localStorage.setItem(LS_KEY + 'reportEnabled', c.reportEnabled ? '1' : '0');
    localStorage.setItem(LS_KEY + 'reportTime', String(c.reportTime || '08:00'));
}
function toMinOfDay(hhmm) {
    var p = String(hhmm || '').split(':');
    var h = parseInt(String(p[0] || '').replace(/^0+/, ''), 10);
    var m = parseInt(String(p[1] || '').replace(/^0+/, ''), 10);
if (isNaN(h)) h = 0;
if (isNaN(m)) m = 0;
return h * 60 + m;
}
function inDndAt(hhmm) {
var c = state.config;
if (!c.dndEnabled) return false;
if (c.dndStart === c.dndEnd) return false;   
var n = toMinOfDay(hhmm), s = toMinOfDay(c.dndStart), e = toMinOfDay(c.dndEnd);
if (s <= e) return n >= s && n < e;
return n >= s || n < e;
}
function reportConflict() {
var c = state.config;
    if (!c.reportEnabled) return '';
    if (!c.dndEnabled) return '';
    if (!inDndAt(c.reportTime)) return '';
    return '推送时刻落在免打扰时段 ' + c.dndStart + ' - ' + c.dndEnd + ' 内，请改到时段外';
}
function applyConf(parsed) {
if (!parsed) return false;
if (parsed.dailyLimit !== undefined) state.config.dailyLimit = num(parsed.dailyLimit, 0);
if (parsed.monthlyLimit !== undefined) state.config.monthlyLimit = num(parsed.monthlyLimit, 0);
if (parsed.tempLimit !== undefined) state.config.tempLimit = num(parsed.tempLimit, 0);
    if (parsed.pushPlusToken !== undefined) state.config.pushPlusToken = String(parsed.pushPlusToken || '');
    if (parsed.pushPlusMail !== undefined) state.config.pushPlusMail = String(parsed.pushPlusMail || '');
    if (parsed.mailOption !== undefined) state.config.mailOption = String(parsed.mailOption || '');
if (parsed.channels !== undefined) {
state.config.channels = normChannels(parsed.channels);
} else if (parsed.mailOption !== undefined) {
      state.config.channels = 'mail';
      if (!state.config.opt_mail) state.config.opt_mail = String(parsed.mailOption || '');
}
    if (parsed.opt_webhook !== undefined) state.config.opt_webhook = String(parsed.opt_webhook || '');
    if (parsed.opt_cp !== undefined) state.config.opt_cp = String(parsed.opt_cp || '');
    if (parsed.opt_qq !== undefined) state.config.opt_qq = String(parsed.opt_qq || '');
    if (parsed.opt_mail !== undefined) state.config.opt_mail = String(parsed.opt_mail || '');
if (parsed.dndEnabled !== undefined) {
      state.config.dndEnabled = (parsed.dndEnabled === true || parsed.dndEnabled === 1 || parsed.dndEnabled === '1');
}
    if (parsed.dndStart !== undefined) state.config.dndStart = String(parsed.dndStart || '23:00');
    if (parsed.dndEnd !== undefined) state.config.dndEnd = String(parsed.dndEnd || '07:00');
if (parsed.reportEnabled !== undefined) {
      state.config.reportEnabled = (parsed.reportEnabled === true || parsed.reportEnabled === 1 || parsed.reportEnabled === '1');
}
    if (parsed.reportTime !== undefined) state.config.reportTime = String(parsed.reportTime || '08:00');
saveLocal();
return true;
}
async function readBack(path, stamp) {
if (stamp) {
      var r = await run('grep -c ' + sq(stamp) + ' ' + sq(path) + ' 2>/dev/null || echo 0');
      return parseInt(String(outOf(r)).trim().split('\n')[0], 10) > 0;
}
    var b = await run('wc -c < ' + sq(path) + ' 2>/dev/null || echo 0');
    return parseInt(String(outOf(b)).trim().split('\n')[0], 10) > 0;
}
function simpleHash(s) {
var h = 5381, i;
for (i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(16) + '-' + s.length;
}
async function writeFileIfChanged(content, path, stamp, sumFile) {
try {
      var cur = await run('cat ' + sq(sumFile) + ' 2>/dev/null', 4000);
if (String(outOf(cur)).trim() === simpleHash(content) && (await readBack(path, stamp))) {
return true; 
}
} catch (e) {}
if (!(await writeFile(content, path, stamp))) return false;
    try { await run('printf %s ' + sq(simpleHash(content)) + ' > ' + sq(sumFile), 4000); } catch (e) {}
return true;
}
async function writeFile(content, path, stamp) {
    try { await run('rm -f ' + sq(path) + ' ' + sq(path) + '.b64'); } catch (e) {}
try {
      if (typeof saveConfig === 'function') {
        var ok = await saveConfig(new File([content], path.split('/').pop(), { type: 'text/plain' }), path);
if (ok && (await readBack(path, stamp))) return true;
}
    } catch (e) { console.warn('saveConfig 失败，改用 base64', e); }
try {
var b64 = toB64(content);
      await run('rm -f ' + sq(path) + ' ' + sq(path) + '.b64');
var CHUNK = 6000;
for (var i = 0; i < b64.length; i += CHUNK) {
        await run('printf %s ' + sq(b64.slice(i, i + CHUNK)) + ' >> ' + sq(path) + '.b64');
}
      await run('base64 -d ' + sq(path) + '.b64 > ' + sq(path) + ' 2>/dev/null; rm -f ' + sq(path) + '.b64');
if (await readBack(path, stamp)) return true;
    } catch (e2) { console.warn('base64 写入失败', e2); }
try {
      var marker = 'UMAEOF' + Date.now();
      await run('cat > ' + sq(path) + " <<'" + marker + "'\n" + content + '\n' + marker);
if (await readBack(path, stamp)) return true;
    } catch (e3) { console.warn('heredoc 写入失败', e3); }
return false; 
}
  var PP_SEND_LIB = `
# ---------- PushPlus 多渠道推送 v${VERSION} ----------
PP_ORDER="${PP_ORDER}"
PP_NEED_OPT="${PP_NEED_OPT}"

pp_opt_of() {
  case "$1" in
    webhook) echo "$OPT_WEBHOOK" ;;
    qq)      echo "$OPT_QQ" ;;
    cp)      echo "$OPT_CP" ;;
    mail)    echo "$OPT_MAIL" ;;
    *)       echo "" ;;
  esac
}

pp_build_channels() {
  PP_CH=""; PP_OPT=""
  for ch in $PP_ORDER; do
    case "|$PP_CHANNELS|" in
      *"|$ch|"*) ;;
      *) continue ;;
    esac
    ov=$(pp_opt_of "$ch")
    if [ -z "$ov" ]; then
      case " $PP_NEED_OPT " in
        *" $ch "*) log "[推送] 渠道 $ch 缺渠道编码，已跳过"; continue ;;
      esac
    fi
    if [ -n "$PP_CH" ]; then PP_CH="$PP_CH,"; PP_OPT="$PP_OPT,"; fi
    PP_CH="$PP_CH$ch"
    PP_OPT="$PP_OPT$ov"
  done
  [ -n "$PP_CH" ] || return 1
  return 0
}

pp_send() {
  pp_build_channels || { log "[推送] 无可用渠道（未选渠道或渠道编码缺失），跳过"; return 1; }
  et=$(json_escape "$1")
  ec=$(json_escape "$2")
  if [ -n "$PP_OPT" ]; then
    printf '{"token":"%s","title":"%s","content":"%s","channel":"%s","option":"%s","template":"html"}' "$PUSHPLUS_TOKEN" "$et" "$ec" "$PP_CH" "$PP_OPT" > "$PP_BODY"
  else
    printf '{"token":"%s","title":"%s","content":"%s","channel":"%s","template":"html"}' "$PUSHPLUS_TOKEN" "$et" "$ec" "$PP_CH" > "$PP_BODY"
  fi
  log "[推送] 渠道 $PP_CH 编码 [$PP_OPT]"
  out=$($CURL_BIN -s --connect-timeout 10 --max-time 30 -X POST "https://www.pushplus.plus/batchSend" -H "Content-Type: application/json" -d @"$PP_BODY" 2>&1)
  ret=$?
  if [ "$ret" -eq 0 ] && echo "$out" | grep -q '"code":200'; then
    log "[推送] 成功 $PP_CH"
    return 0
  fi
  log "[推送] 失败 ret=$ret 输出 $(echo "$out" | cut -c1-160)"
  return 1
}
`;
  var PP_CONF_LIB = `
# 渠道串与渠道编码只接受白名单字符，避免污染后续拼出来的 JSON
PP_CHANNELS=$(echo "$PP_CHANNELS" | tr -cd 'a-z|')
OPT_WEBHOOK=$(echo "$OPT_WEBHOOK" | tr -cd 'a-zA-Z0-9_-')
OPT_QQ=$(echo "$OPT_QQ" | tr -cd 'a-zA-Z0-9_-')
OPT_CP=$(echo "$OPT_CP" | tr -cd 'a-zA-Z0-9_-')
OPT_MAIL=$(echo "$OPT_MAIL" | tr -cd 'a-zA-Z0-9_-')
`;
function genScript() {
var c = state.config;
    return `#!/system/bin/sh
# 设备监测报警消息推送 v${VERSION}
# ${STAMP}
LOG_FILE="${LOG_FILE}"
CONFIG_FILE="${CONFIG_FILE}"
DATA_DIR="${DATA_DIR}"
PID_FILE="${PID_FILE}"
CHECK_INTERVAL=${CHECK_INTERVAL}
TEMP_LOCK_SECONDS=${TEMP_LOCK_SECONDS}
LOG_KEEP_LINES=400
SAMPLE_KEEP=${SAMPLE_KEEP}
AGG_BUCKET=${AGG_BUCKET}
AGG_KEEP=${AGG_KEEP}
SAMPLE_TRIM_AT=${SAMPLE_TRIM_AT}
AGG_TRIM_AT=${AGG_TRIM_AT}

DAILY_LIMIT=${c.dailyLimit}
MONTHLY_LIMIT=${c.monthlyLimit}
TEMP_LIMIT=${c.tempLimit}
PUSHPLUS_TOKEN='${c.pushPlusToken}'
PP_CHANNELS='${c.channels}'
OPT_WEBHOOK='${c.opt_webhook}'
OPT_QQ='${c.opt_qq}'
OPT_CP='${c.opt_cp}'
OPT_MAIL='${c.opt_mail}'
PUSHPLUS_MAIL='${c.pushPlusMail}'
MAIL_OPTION='${c.mailOption}'
DND_ENABLED=${c.dndEnabled ? 1 : 0}
DND_START='${c.dndStart}'
DND_END='${c.dndEnd}'
REPORT_ENABLED=${c.reportEnabled ? 1 : 0}
REPORT_TIME='${c.reportTime}'
REPORT_FILE='${REPORT_FILE}'

mkdir -p "$DATA_DIR"
SNAPSHOT_FILE="$DATA_DIR/api_snapshot.txt"
TEMP_SAMPLES="$DATA_DIR/temp_samples.txt"
LAST_TEMP_NOTIFY="$DATA_DIR/last_temp_notify.txt"
TEMP_LOCK_UNTIL="$DATA_DIR/temp_lock_until.txt"
TEMP_RETRY_UNTIL="$DATA_DIR/temp_retry_until.txt"
FLOW_RETRY_UNTIL="$DATA_DIR/flow_retry_until.txt"
LAST_TS_FILE="$DATA_DIR/last_ts.txt"
TEMP_SVG_FILE="$DATA_DIR/temp_chart.svg"
TEMP_AGG5="$DATA_DIR/temp_agg5.txt"

LOG_N=0
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
  LOG_N=$((LOG_N + 1))
  if [ "$LOG_N" -ge 50 ]; then
    tail -n "$LOG_KEEP_LINES" "$LOG_FILE" > "$LOG_FILE.t" 2>/dev/null
    if [ -s "$LOG_FILE.t" ]; then
      mv "$LOG_FILE.t" "$LOG_FILE"
    else
      rm -f "$LOG_FILE.t" 2>/dev/null
    fi
    LOG_N=0
  fi
}

json_get() {
  [ -f "$CONFIG_FILE" ] || return
  awk -v k="$1" -v q='"' 'index($0, q k q) > 0 { line=$0; gsub(/["},]/, "", line); sub(/^[^:]*:[[:space:]]*/, "", line); gsub(/[[:space:]]/, "", line); print line }' "$CONFIG_FILE" 2>/dev/null | head -1
}
if [ -f "$CONFIG_FILE" ]; then
  v=$(json_get dailyLimit);    [ -n "$v" ] && DAILY_LIMIT="$v"
  v=$(json_get monthlyLimit);  [ -n "$v" ] && MONTHLY_LIMIT="$v"
  v=$(json_get tempLimit);     [ -n "$v" ] && TEMP_LIMIT="$v"
  v=$(json_get pushPlusToken); [ -n "$v" ] && PUSHPLUS_TOKEN="$v"
  v=$(json_get channels);      [ -n "$v" ] && PP_CHANNELS="$v"
  v=$(json_get opt_webhook);   [ -n "$v" ] && OPT_WEBHOOK="$v"
  v=$(json_get opt_qq);        [ -n "$v" ] && OPT_QQ="$v"
  v=$(json_get opt_cp);        [ -n "$v" ] && OPT_CP="$v"
  v=$(json_get opt_mail);      [ -n "$v" ] && OPT_MAIL="$v"
  v=$(json_get pushPlusMail);  [ -n "$v" ] && PUSHPLUS_MAIL="$v"
  v=$(json_get mailOption);    [ -n "$v" ] && MAIL_OPTION="$v"
  v=$(json_get dndEnabled);    [ -n "$v" ] && DND_ENABLED="$v"
  v=$(json_get dndStart);      [ -n "$v" ] && DND_START="$v"
  v=$(json_get dndEnd);        [ -n "$v" ] && DND_END="$v"
  v=$(json_get reportEnabled); [ -n "$v" ] && REPORT_ENABLED="$v"
  v=$(json_get reportTime);    [ -n "$v" ] && REPORT_TIME="$v"
fi

norm_bool() {
  case "$1" in
    1|true|TRUE|True|yes|YES|Yes|on|ON|On) echo 1 ;;
    *) echo 0 ;;
  esac
}
DND_ENABLED=$(norm_bool "$DND_ENABLED")
REPORT_ENABLED=$(norm_bool "$REPORT_ENABLED")

TEMP_LIMIT_MC=$(awk -v v="$TEMP_LIMIT" 'BEGIN{v=v+0; if (v<0) v=0; printf "%d", v*1000}' 2>/dev/null)
[ -n "$TEMP_LIMIT_MC" ] || TEMP_LIMIT_MC=0

${PP_CONF_LIB}

SELF='${SH_FILE}'
CLAIM_DIR="$DATA_DIR/daemon.claim"

match_self() {
  [ -n "$1" ] || return 1
  [ -d "/proc/$1" ] || return 1
  cl=$(tr '\\000' ' ' 2>/dev/null < "/proc/$1/cmdline")
  case "$cl" in *"$SELF"*) ;; *) return 1 ;; esac
  case "$-" in *f*) ng=1 ;; *) ng=0; set -f ;; esac
  set -- $cl
  [ "$ng" = "0" ] && set +f
  case "$1" in sh|*/sh|mksh|*/mksh|bash|*/bash|ash|*/ash) ;; *) return 1 ;; esac
  [ "$2" = "$SELF" ] || return 1
  return 0
}

claim_holder() {
  [ -f "$CLAIM_DIR/pid" ] || return 1
  cp=$(cat "$CLAIM_DIR/pid" 2>/dev/null)
  case "$cp" in ''|*[!0-9]*) return 1 ;; esac
  [ "$cp" != "$$" ] || return 1
  kill -0 "$cp" 2>/dev/null || return 1
  match_self "$cp" || return 1
  ct=$(cat "$CLAIM_DIR/ts" 2>/dev/null)
  case "$ct" in ''|*[!0-9]*) echo "$cp"; return 0 ;; esac
  cn=$(date +%s 2>/dev/null)
  case "$cn" in ''|*[!0-9]*) echo "$cp"; return 0 ;; esac
  [ $((cn - ct)) -le 420 ] || return 1
  echo "$cp"
  return 0
}

claim_take() {
  echo $$ > "$CLAIM_DIR/pid" 2>/dev/null
  echo "$(date +%s 2>/dev/null)" > "$CLAIM_DIR/ts" 2>/dev/null
}

CLAIMED=0
i=0
while [ "$i" -lt 3 ]; do
  HOLD=$(claim_holder)
  if [ -n "$HOLD" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') 已有实例运行中 PID=$HOLD，不重复启动" >> "$LOG_FILE"
    exit 0
  fi
  if mkdir "$CLAIM_DIR" 2>/dev/null; then
    claim_take
    CLAIMED=1
    break
  fi
  sleep 1
  HOLD=$(claim_holder)
  if [ -n "$HOLD" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') 已有实例运行中 PID=$HOLD，不重复启动" >> "$LOG_FILE"
    exit 0
  fi
  rm -rf "$CLAIM_DIR" 2>/dev/null
  i=$((i + 1))
done
if [ "$CLAIMED" != "1" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') [单实例] 三次抢占均未取得守护资格，本实例 PID=$$ 退出" >> "$LOG_FILE"
  exit 0
fi
echo $$ > "$PID_FILE"

yield_if_claimed() {
  if [ ! -d "$CLAIM_DIR" ]; then
    mkdir "$CLAIM_DIR" 2>/dev/null
    claim_take
    return 0
  fi
  cp=$(cat "$CLAIM_DIR/pid" 2>/dev/null)
  if [ -n "$cp" ] && [ "$cp" != "$$" ]; then
    if kill -0 "$cp" 2>/dev/null && match_self "$cp"; then
      log "[单实例] 守护资格已被 PID=$cp 接管，本实例 PID=$$ 让位退出"
      exit 0
    fi
  fi
  claim_take
  return 0
}

mkdir -p "$DATA_DIR" 2>/dev/null
printf %s "$(date +%s 2>/dev/null)" > "$DATA_DIR/daemon_started_at" 2>/dev/null
printf %s "$(date +%s 2>/dev/null)" > "$DATA_DIR/heartbeat" 2>/dev/null

cleanup_on_exit() {
  if [ -f "$PID_FILE" ] && [ "$(cat "$PID_FILE" 2>/dev/null)" = "$$" ]; then
    rm -f "$PID_FILE" 2>/dev/null
  fi
  if [ -f "$CLAIM_DIR/pid" ] && [ "$(cat "$CLAIM_DIR/pid" 2>/dev/null)" = "$$" ]; then
    rm -rf "$CLAIM_DIR" 2>/dev/null
  fi
  log "守护进程退出 PID=$$"
  exit 0
}
trap cleanup_on_exit INT TERM EXIT

wait_valid_time() {
  i=0
  while [ "$i" -lt 45 ]; do
    y=$(date +%Y 2>/dev/null)
    ts=$(date +%s 2>/dev/null)
    ok=0
    if echo "$y" | grep -qE '^[0-9][0-9][0-9][0-9]$' && echo "$ts" | grep -qE '^[0-9]+$'; then
      if [ "$y" -ge 2024 ] && [ "$ts" -gt 1700000000 ]; then ok=1; fi
    fi
    if [ "$ok" = "1" ]; then return 0; fi
    yield_if_claimed
    i=$((i + 1))
    sleep 10
  done
  return 1
}
if ! wait_valid_time; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') [时间] 等待系统时间同步超时，按当前时间继续记录" >> "$LOG_FILE"
fi

log "=========== 设备监测报警守护启动 PID=$$ ==========="
log "版本 v${VERSION} 时间已校验 $(date '+%Y-%m-%d %H:%M:%S')"
log "配置 当日=$DAILY_LIMIT GB 当月=$MONTHLY_LIMIT GB 温度=$TEMP_LIMIT ℃（阈值比较值 $TEMP_LIMIT_MC m℃）免打扰=$DND_ENABLED ($DND_START - $DND_END) 温度日报=$REPORT_ENABLED ($REPORT_TIME) 推送渠道=$PP_CHANNELS"

CURL_BIN="/data/data/com.minikano.f50_sms/files/curl"
[ ! -x "$CURL_BIN" ] && CURL_BIN="curl"
command -v "$CURL_BIN" >/dev/null 2>&1 || log "警告 未找到可用的 curl，推送会失败"

is_num() { echo "$1" | grep -qE '^[0-9]+$'; }

detect_wan() {
  for iface in $(ls /sys/class/net/ 2>/dev/null); do
    case "$iface" in
      lo|br0|wlan0|ap0|swlan0|dummy*|ifb*|tunl*|gre*|sit*|ip6*|erspan*|ip_vti*) continue ;;
    esac
    ip addr show dev "$iface" 2>/dev/null | grep -q "inet " || continue
    rx=$(cat "/sys/class/net/$iface/statistics/rx_bytes" 2>/dev/null)
    if [ -n "$rx" ] && [ "$rx" != "0" ]; then echo "$iface"; return; fi
  done
  for cand in sipa_eth0 rmnet_data0 rmnet0 ccmni0 eth0 usb0; do
    [ -d "/sys/class/net/$cand" ] && { echo "$cand"; return; }
  done
}
WAN_IF=$(detect_wan)
log "WAN 接口 $WAN_IF"

read_sysfs_total() {
  [ -z "$WAN_IF" ] && { echo 0; return; }
  awk 'NR==1{r=$0}NR==2{print r+$0}' "/sys/class/net/$WAN_IF/statistics/rx_bytes" "/sys/class/net/$WAN_IF/statistics/tx_bytes" 2>/dev/null || echo 0
}

get_flow() {
  ms=$(date -d "$(date +%Y-%m)-01 00:00:00" +%s 2>/dev/null)
  ds=$(date -d "$(date +%Y-%m-%d) 00:00:00" +%s 2>/dev/null)
  if is_num "$ms" && is_num "$ds"; then
    usage=$(dumpsys netstats --full 2>/dev/null | awk -v ms="$ms" -v ds="$ds" '
    /^Dev stats:/{d=1;next}
    d && /^[^ ]/{exit}
    d && /type=0/{m=1}
    d && /ident=/ && !/type=0/{m=0}
    d && m && /st=/{
      split($1,a,"="); split($2,b,"="); split($4,c,"=")
      bs=a[2]+0; v=b[2]+c[2]
      if(bs>=ms) tm+=v
      if(bs>=ds) td+=v
    }
    END{print tm+0, td+0}')
    ub=$(echo "$usage" | awk '{print $1}')
    tb=$(echo "$usage" | awk '{print $2}')
    if is_num "$ub" && [ "$ub" != "0" ]; then echo "$ub $tb"; return; fi
  fi
  if [ -f "$SNAPSHOT_FILE" ]; then
    snap=$(cat "$SNAPSHOT_FILE" 2>/dev/null)
    snap_m=$(echo "$snap" | awk '{print $1}')
    snap_d=$(echo "$snap" | awk '{print $2}')
    snap_sys=$(echo "$snap" | awk '{print $3}')
    snap_day=$(echo "$snap" | awk '{print $4}')
    snap_mon=$(echo "$snap" | awk '{print $5}')
    f_day=$(date +%Y-%m-%d)
    f_mon=$(date +%Y-%m)
    cur_sys=$(read_sysfs_total)
    if is_num "$cur_sys" && is_num "$snap_sys" && [ "$cur_sys" != "0" ]; then
      delta=$((cur_sys - snap_sys))
      [ "$delta" -lt 0 ] && delta=0
      if [ "$f_mon" = "$snap_mon" ]; then fb_m=$((snap_m + delta)); else fb_m=$delta; fi
      if [ "$f_day" = "$snap_day" ]; then fb_d=$((snap_d + delta)); else fb_d=$delta; fi
      log "[兜底] dumpsys 无效，改用 sysfs 增量推算流量"
      echo "$fb_m $fb_d"; return
    fi
  fi
  echo "0 0"
}

get_device_temp() {
  max=0
  for z in /sys/class/thermal/thermal_zone*; do
    [ -d "$z" ] || continue
    ty=""
    IFS= read -r ty < "$z/type" 2>/dev/null
    [ -n "$ty" ] || continue
    case "$ty" in
      *chg*|*front*|*frame*|*wcn*|*usb*|*bcl*|*interface*|*skin*|*back*) continue ;;
    esac
    v=""
    IFS= read -r v < "$z/temp" 2>/dev/null
    case "$v" in ''|*[!0-9]*) continue ;; esac
    [ "$v" -gt 0 ] || continue
    [ "$v" -le 124000 ] || continue
    [ "$v" -gt "$max" ] && max="$v"
  done
  echo "$max"
}

mc2c() {
  awk -v v="$1" 'BEGIN{printf "%.2f", v/1000}'
}

safe_trim() {
  f="$1"; keep="$2"; at="$3"
  [ -f "$f" ] || return 0
  n0=$(wc -l < "$f" 2>/dev/null | tr -d ' ')
  case "$n0" in ''|*[!0-9]*) return 1 ;; esac
  [ "$n0" -gt "$at" ] || return 0
  want=$keep
  [ "$n0" -lt "$want" ] && want=$n0
  tail -n "$keep" "$f" > "$f.t" 2>/dev/null
  if [ ! -s "$f.t" ]; then rm -f "$f.t" 2>/dev/null; return 1; fi
  sync 2>/dev/null
  n1=$(wc -l < "$f.t" 2>/dev/null | tr -d ' ')
  case "$n1" in ''|*[!0-9]*) rm -f "$f.t" 2>/dev/null; return 1 ;; esac
  if [ "$n1" -lt "$want" ]; then rm -f "$f.t" 2>/dev/null; return 1; fi
  cp -f "$f" "$f.bak" 2>/dev/null
  mv "$f.t" "$f" 2>/dev/null
  sync 2>/dev/null
  return 0
}

safe_filter_ts() {
  f="$1"; lim="$2"
  [ -f "$f" ] || return 0
  c0=$(wc -l < "$f" 2>/dev/null | tr -d ' ')
  case "$c0" in ''|*[!0-9]*) return 1 ;; esac
  if [ "$3" = "2" ]; then
    awk -v n="$lim" 'length($1)>0 && $1<=n { print $1, $2 }' "$f" > "$f.t" 2>/dev/null
  else
    awk -v n="$lim" 'length($1)>0 && $1<=n { print }' "$f" > "$f.t" 2>/dev/null
  fi
  c1=$(wc -l < "$f.t" 2>/dev/null | tr -d ' ')
  case "$c1" in ''|*[!0-9]*) rm -f "$f.t" 2>/dev/null; return 1 ;; esac
  sync 2>/dev/null
  if [ "$c0" -gt 0 ]; then
    allow=$(( c0 / 10 ))
    [ "$allow" -lt 20 ] && allow=20
    if [ "$c1" -lt $(( c0 - allow )) ]; then
      rm -f "$f.t" 2>/dev/null; return 1
    fi
  fi
  cp -f "$f" "$f.bak" 2>/dev/null
  mv "$f.t" "$f" 2>/dev/null
  sync 2>/dev/null
  return 0
}

record_temp() {
  tv="$2"
  case "$tv" in ''|*[!0-9]*) return 0 ;; esac
  [ "$tv" -gt 0 ] || return 0
  [ "$tv" -le 124000 ] || return 0
  echo "$1 $tv" >> "$TEMP_SAMPLES"
  safe_trim "$TEMP_SAMPLES" "$SAMPLE_KEEP" "$SAMPLE_TRIM_AT"
}

update_agg5() {
  [ -f "$TEMP_SAMPLES" ] || return 0
  a_now=$(date +%s 2>/dev/null)
  case "$a_now" in ''|*[!0-9]*) return 0 ;; esac
  a_end=$(( a_now - a_now % AGG_BUCKET - AGG_BUCKET ))
  a_last=0
  if [ -f "$TEMP_AGG5" ]; then
    a_last=$(awk 'END{print $1+0}' "$TEMP_AGG5" 2>/dev/null)
  fi
  case "$a_last" in ''|*[!0-9]*) a_last=0 ;; esac
  [ "$a_end" -gt "$a_last" ] || return 0
  a_start=$(( a_last + AGG_BUCKET ))
  a_span=$(( AGG_BUCKET * (AGG_KEEP - 1) ))
  if [ $(( a_end - a_start )) -gt "$a_span" ]; then
    a_start=$(( a_end - a_span ))
  fi
  awk -v bs="$a_start" -v be="$a_end" -v bk="$AGG_BUCKET" '
  BEGIN { nb=int((be-bs)/bk) }
  length($1)>0 {
    ts=$1+0; v=$2+0
    if (v<20000 || v>124000) next
    if (ts<bs) next
    k=int((ts-bs)/bk)
    if (k<0 || k>nb) next
    cnt[k]++; sum[k]+=v
    if (!(k in lo) || v<lo[k]) lo[k]=v
    if (!(k in hi) || v>hi[k]) hi[k]=v
  }
  END {
    for (k=0; k<=nb; k++) {
      if (cnt[k]>0) printf "%d %d %d %d %d\\n", bs+k*bk, int(sum[k]/cnt[k]+0.5), hi[k], lo[k], cnt[k]
    }
  }' "$TEMP_SAMPLES" >> "$TEMP_AGG5" 2>/dev/null
  safe_trim "$TEMP_AGG5" "$AGG_KEEP" "$AGG_TRIM_AT"
}

calc_temp_stats() {
  awk -v s="$1" -v e="$2" '
  length($1)>0 && $1>=s && $1<=e {
    v=$2+0
    if (v<20000 || v>124000) next
    n++; sum+=v
    if(n==1||v>mx) mx=v
    if(n==1||v<mn) mn=v
  }
  END{ if(n>0) printf "%d %.1f %d", mx, sum/n, mn; else printf "0 0.0 0" }' "$TEMP_SAMPLES"
}

guard_clock() {
  prev=$(cat "$LAST_TS_FILE" 2>/dev/null)
  if is_num "$prev" && [ "$now" -lt "$prev" ]; then
    back=$((prev - now))
    if [ "$back" -gt 120 ]; then
      log "[时间] 检测到系统时间回拨 $back 秒（$prev -> $now），清理受污染的采样与锁定数据"
      safe_filter_ts "$TEMP_SAMPLES" "$now" 2
      safe_filter_ts "$TEMP_AGG5" "$now"
      uplim=$((now + TEMP_LOCK_SECONDS + 600))
      lowlim=$((now - 86400))
      for f in "$TEMP_LOCK_UNTIL" "$TEMP_RETRY_UNTIL" "$LAST_TEMP_NOTIFY" "$FLOW_RETRY_UNTIL"; do
        tv=$(cat "$f" 2>/dev/null)
        if is_num "$tv"; then
          if [ "$tv" -gt "$uplim" ] || [ "$tv" -lt "$lowlim" ]; then rm -f "$f"; fi
        else
          rm -f "$f"
        fi
      done
    fi
  fi
  printf '%s' "$now" > "$LAST_TS_FILE"
}

gen_temp_svg() {
  s="$1"; e="$2"; sp="$3"
  [ -f "$TEMP_SAMPLES" ] || return 0
  awk -v s="$s" -v e="$e" -v lim="$TEMP_LIMIT_MC" -v sp="$sp" -v Q="'" '
  length($1)>0 {
    ts=$1+0; tv=$2+0
    if (tv<20000 || tv>124000) next
    if (ts < s || ts > e) next
    n++
    TS[n]=ts; TV[n]=tv
    if (n==1 || ts<t0) t0=ts
    if (n==1 || ts>t1) t1=ts
    if (n==1 || tv<vmin) vmin=tv
    if (n==1 || tv>vmax) vmax=tv
    if (n==1 || tv>pmax) pmax=tv
  }
  END {
    if (n < 2) exit
    if (lim > 0) { if (lim > vmax) vmax=lim; if (lim < vmin) vmin=lim }
    span = vmax - vmin
    if (span < 3000) { mid=(vmax+vmin)/2; vmin=mid-1500; vmax=mid+1500; span=3000 }
    vmin = vmin - span*0.12; vmax = vmax + span*0.12; span = vmax - vmin
    if (t1 <= t0) t1 = t0 + 60
    W=320; H=150; L=34; R=6; T=16; B=22
    pw=W-L-R; ph=H-T-B
    o = "<svg xmlns=" Q "http://www.w3.org/2000/svg" Q " width=" Q "100%" Q " viewBox=" Q "0 0 320 150" Q " style=" Q "max-width:640px;background:#0f172a;border-radius:6px" Q ">"
    o = o "<rect x=" Q 0 Q " y=" Q 0 Q " width=" Q W Q " height=" Q H Q " fill=" Q "#0f172a" Q " rx=" Q 6 Q "/>"
    if (lim > 0 && lim >= vmin && lim <= vmax) {
      dy = T + ph - (vmax-lim)/span*ph
      o = o "<rect x=" Q L Q " y=" Q T Q " width=" Q pw Q " height=" Q sprintf("%.0f", dy-T) Q " fill=" Q "#ef4444" Q " opacity=" Q ".09" Q "/>"
    }
    o = o "<g stroke=" Q "#1e293b" Q " stroke-width=" Q 1 Q ">"
    for (g=0; g<=2; g++) {
      yy = T + ph - ph*g/2
      o = o "<line x1=" Q L Q " y1=" Q sprintf("%.0f", yy) Q " x2=" Q (L+pw) Q " y2=" Q sprintf("%.0f", yy) Q "/>"
    }
    o = o "</g>"
    o = o "<g fill=" Q "#94a3b8" Q " font-size=" Q 8 Q " text-anchor=" Q "end" Q ">"
    for (g=0; g<=2; g++) {
      vv = vmin + span*g/2
      yy = T + ph - ph*g/2
      o = o "<text x=" Q (L-4) Q " y=" Q sprintf("%.0f", yy+3) Q ">" sprintf("%.1f", vv/1000) "</text>"
    }
    o = o "</g>"
    if (lim > 0 && lim >= vmin && lim <= vmax) {
      ly = T + ph - (lim-vmin)/span*ph
      o = o "<line x1=" Q L Q " y1=" Q sprintf("%.0f", ly) Q " x2=" Q (L+pw) Q " y2=" Q sprintf("%.0f", ly) Q " stroke=" Q "#ef4444" Q " stroke-width=" Q 1 Q " stroke-dasharray=" Q "4,3" Q "/>"
      o = o "<text x=" Q (L+pw) Q " y=" Q sprintf("%.0f", ly-3) Q " fill=" Q "#f87171" Q " font-size=" Q 8 Q " text-anchor=" Q "end" Q ">阈值 " sprintf("%.2f", lim/1000) " ℃</text>"
    }
    step=1
    if (n > 40) step = int(n/40) + 1
    d=""
    for (i=1; i<=n; i+=step) {
      x = L + (TS[i]-t0)/(t1-t0)*pw
      y = T + ph - (TV[i]-vmin)/span*ph
      d = d (d=="" ? "M" : "L") sprintf("%.0f", x) "," sprintf("%.0f", y) " "
    }
    x = L + (TS[n]-t0)/(t1-t0)*pw
    y = T + ph - (TV[n]-vmin)/span*ph
    d = d "L" sprintf("%.0f", x) "," sprintf("%.0f", y)
    o = o "<path d=" Q d Q " stroke=" Q "#fbbf24" Q " stroke-width=" Q 1.6 Q " fill=" Q "none" Q " stroke-linejoin=" Q "round" Q "/>"
    o = o "<text x=" Q L Q " y=" Q 11 Q " fill=" Q "#e2e8f0" Q " font-size=" Q 9 Q ">CPU温度趋势 最近" sp "分钟 " n "点 峰值" sprintf("%.2f", pmax/1000) "℃</text>"
    o = o "<text x=" Q L Q " y=" Q (H-6) Q " fill=" Q "#94a3b8" Q " font-size=" Q 8 Q ">-" sp "分钟</text>"
    o = o "<text x=" Q (L+pw) Q " y=" Q (H-6) Q " fill=" Q "#94a3b8" Q " font-size=" Q 8 Q " text-anchor=" Q "end" Q ">现在</text>"
    o = o "</svg>"
    print o
  }' "$TEMP_SAMPLES"
}

gen_temp_text() {
  s="$1"; e="$2"
  [ -f "$TEMP_SAMPLES" ] || return 0
  awk -v s="$s" -v e="$e" '
  length($1)>0 { ts=$1+0; v=$2+0; if (v<20000 || v>124000) next; if (ts<s || ts>e) next; n++; TS[n]=ts; TV[n]=v }
  END {
    if (n < 1) exit
    step=1
    if (n > 12) step = int(n/12) + 1
    out=""
    for (i=n; i>=1; i-=step) {
      mm = int((e - TS[i]) / 60)
      out = out "T-" mm "m:" sprintf("%.2f", TV[i]/1000) "℃  "
    }
    print out
  }' "$TEMP_SAMPLES"
}

to_min() {
  h=$(echo "$1" | cut -d: -f1)
  m=$(echo "$1" | cut -d: -f2)
  h=$(echo "$h" | sed 's/^0*//')
  m=$(echo "$m" | sed 's/^0*//')
  [ -z "$h" ] && h=0
  [ -z "$m" ] && m=0
  echo $(( h * 60 + m ))
}

in_dnd() {
  if [ "$DND_ENABLED" != "1" ] && [ "$DND_ENABLED" != "true" ]; then return 1; fi
  [ "$DND_START" = "$DND_END" ] && return 1
  n_min=$(to_min "$(date +%H:%M)")
  s_min=$(to_min "$DND_START")
  e_min=$(to_min "$DND_END")
  if [ "$s_min" -le "$e_min" ]; then
    if [ "$n_min" -ge "$s_min" ] && [ "$n_min" -lt "$e_min" ]; then return 0; fi
    return 1
  else
    if [ "$n_min" -ge "$s_min" ] || [ "$n_min" -lt "$e_min" ]; then return 0; fi
    return 1
  fi
}

json_escape() {
  printf '%s' "$1" | sed 's/"/ /g'
}

PP_BODY="$DATA_DIR/pp_body.json"
${PP_SEND_LIB}

pushplus_send() {
  if [ -z "$PUSHPLUS_TOKEN" ]; then log "[推送] 未配置 PushPlus Token，跳过"; return 1; fi
  pp_send "$1" "$2"
}

update_agg5
if [ -f "$TEMP_AGG5" ]; then
  log "[聚合] 5 分钟聚合已就绪 $(wc -l < "$TEMP_AGG5" 2>/dev/null | tr -d ' ') 条（上限 $AGG_KEEP 条 = 25 小时）"
fi

FIRST_FLOW="1"
FIRST_TEMP="1"
ROUND=0
FLOW_CACHE=""
FLOW_CACHE_AT=0

while true; do
  cur_day=$(date +%Y-%m-%d)
  cur_month=$(date +%Y-%m)
  now=$(date +%s)
  printf %s "$now" > "$DATA_DIR/heartbeat" 2>/dev/null
  guard_clock

  yield_if_claimed
  if [ ! -f "$PID_FILE" ] || [ "$(cat "$PID_FILE" 2>/dev/null)" != "$$" ]; then
    echo $$ > "$PID_FILE" 2>/dev/null
  fi

  MSG_DAY=""
  MSG_MONTH=""
  MSG_TEMP=""
  SEVERE=0
  cur_temp_show="未知"
  ROUND=$((ROUND + 1))

  retry_u=$(cat "$FLOW_RETRY_UNTIL" 2>/dev/null)
  if is_num "$retry_u" && [ "$now" -lt "$retry_u" ]; then
    log "[流量] 推送失败冷却中，本轮跳过流量检测"
    used_gb="-"
    today_gb="-"
  else
    if [ -n "$FLOW_CACHE" ] && [ $((now - FLOW_CACHE_AT)) -lt 300 ]; then
      flow="$FLOW_CACHE"
    else
      flow=$(get_flow)
      if is_num "$(echo "$flow" | awk '{print $1}')"; then
        FLOW_CACHE="$flow"
        FLOW_CACHE_AT="$now"
      fi
    fi
    used_bytes=$(echo "$flow" | awk '{print $1}')
    today_bytes=$(echo "$flow" | awk '{print $2}')
    if is_num "$used_bytes" && is_num "$today_bytes"; then
      used_gb=$(awk -v b="$used_bytes" 'BEGIN{printf "%.2f", b/1073741824}')
      today_gb=$(awk -v b="$today_bytes" 'BEGIN{printf "%.2f", b/1073741824}')
      if [ "$FIRST_FLOW" = "1" ]; then
        log "流量快照 本月 $used_gb GB 今日 $today_gb GB"
        FIRST_FLOW="0"
      fi
      if [ "$DAILY_LIMIT" != "0" ] && [ "$used_bytes" != "0" ] && awk -v a="$today_gb" -v b="$DAILY_LIMIT" 'BEGIN{exit (a >= b) ? 0 : 1}'; then
        nd=$(cat "$DATA_DIR/notified_today.txt" 2>/dev/null)
        if [ "$nd" != "$cur_day" ]; then
          MSG_DAY="[当日流量] 已使用 $today_gb GB，达到设定限额 $DAILY_LIMIT GB"
          log "[报警] 当日流量 $today_gb GB 超限 限额 $DAILY_LIMIT GB"
        fi
      fi
      if [ "$MONTHLY_LIMIT" != "0" ] && [ "$used_bytes" != "0" ] && awk -v a="$used_gb" -v b="$MONTHLY_LIMIT" 'BEGIN{exit (a >= b) ? 0 : 1}'; then
        nm=$(cat "$DATA_DIR/notified_month.txt" 2>/dev/null)
        if [ "$nm" != "$cur_month" ]; then
          MSG_MONTH="[当月流量] 已使用 $used_gb GB，达到设定限额 $MONTHLY_LIMIT GB"
          log "[报警] 当月流量 $used_gb GB 超限 限额 $MONTHLY_LIMIT GB"
        fi
      fi
    else
      log "[流量] 未取到流量数据，本轮跳过"
      used_gb="-"
      today_gb="-"
    fi
  fi

  cur_temp=$(get_device_temp)
  if is_num "$cur_temp" && [ "$cur_temp" != "0" ]; then
    cur_temp_show="$(mc2c "$cur_temp")"
    record_temp "$now" "$cur_temp"
    update_agg5
    if [ "$FIRST_TEMP" = "1" ]; then
      log "温度自检 当前温区最高 $cur_temp_show ℃($cur_temp m℃) 阈值 $TEMP_LIMIT ℃"
      FIRST_TEMP="0"
    fi
    if [ "$TEMP_LIMIT_MC" != "0" ]; then
      locked=0
      lock_state=""
      lock_ts=$(cat "$TEMP_LOCK_UNTIL" 2>/dev/null)
      retry_ts=$(cat "$TEMP_RETRY_UNTIL" 2>/dev/null)
      if is_num "$lock_ts" && [ "$now" -lt "$lock_ts" ]; then
        locked=1; lock_state="已锁定，剩余 $(( (lock_ts - now) / 60 )) 分钟"
      elif is_num "$retry_ts" && [ "$now" -lt "$retry_ts" ]; then
        locked=1; lock_state="推送失败重试冷却中，剩余 $(( (retry_ts - now) / 60 )) 分钟"
      fi
      if [ "$cur_temp" -ge "$TEMP_LIMIT_MC" ]; then
        if [ "$locked" = "1" ]; then
          log "[温度] $cur_temp_show ℃ 超限，$lock_state"
        else
          last_ts=$(cat "$LAST_TEMP_NOTIFY" 2>/dev/null)
          if is_num "$last_ts" && [ "$now" -ge "$last_ts" ]; then
            gap_min=$(( (now - last_ts) / 60 ))
            if [ "$gap_min" -le 60 ]; then
              SEVERE=1
            fi
          fi
          if [ "$SEVERE" = "1" ]; then
            stats=$(calc_temp_stats "$last_ts" "$now")
            s_max=$(echo "$stats" | awk '{print $1}')
            s_min=$(echo "$stats" | awk '{print $3}')
            if [ "$s_max" = "0" ] && [ "$s_min" = "0" ]; then
              stats=$(calc_temp_stats "$((now - 3600))" "$now")
            fi
            t_max=$(echo "$stats" | awk '{printf "%.2f", $1/1000}')
            t_avg=$(echo "$stats" | awk '{printf "%.2f", $2/1000}')
            t_min=$(echo "$stats" | awk '{printf "%.2f", $3/1000}')
            cs=$((now - 3600))
            chart=$(gen_temp_svg "$cs" "$now" "60")
            ttext=$(gen_temp_text "$cs" "$now")
            MSG_TEMP="<b style='color:#dc2626'>[严重警告] CPU 温度反复超限</b><br>当前 $cur_temp_show ℃ / 阈值 $TEMP_LIMIT ℃<br>距上次报警仅 $gap_min 分钟（不超过 60 分钟即判定为反复超限）<br>区间温度统计 最高 $t_max ℃ / 最低 $t_min ℃ / 平均 $t_avg ℃"
            if [ -n "$chart" ]; then
              clen=$(printf '%s' "$chart" | wc -c)
              printf '%s' "$chart" > "$TEMP_SVG_FILE"
              if [ "$clen" -le 6000 ]; then
                MSG_TEMP="$MSG_TEMP<br>$chart"
              else
                log "[温度] 趋势图 $clen 字符异常偏大，本轮仅发送文本明细"
              fi
            fi
            if [ -n "$ttext" ]; then
              MSG_TEMP="$MSG_TEMP<br><span style='font-size:12px;color:#64748b'>$ttext</span>"
            fi
            log "[报警][严重警告] 温度 $cur_temp_show ℃ 距上次报警 $gap_min 分钟 最高 $t_max 最低 $t_min 平均 $t_avg"
          else
            MSG_TEMP="[CPU温度] 当前 $cur_temp_show ℃，达到设定阈值 $TEMP_LIMIT ℃，请注意散热"
            log "[报警] 温度 $cur_temp_show ℃ 超限 阈值 $TEMP_LIMIT ℃"
          fi
        fi
      fi
    fi
  else
    log "[温度] 未取到有效温度，本轮跳过"
  fi

  if [ "$ROUND" = "1" ] || [ $((ROUND % 5)) -eq 0 ]; then
    log "[周期读数] 当日 $today_gb GB 当月 $used_gb GB 温度 $cur_temp_show ℃"
  fi

  if [ "$REPORT_ENABLED" = "1" ] && [ -f "$REPORT_FILE" ]; then
    rp_target=$(date -d "$cur_day $REPORT_TIME:00" +%s 2>/dev/null)
    if is_num "$rp_target"; then
      rp_gap=$((now - rp_target))
      if [ "$rp_gap" -ge 0 ] && [ "$rp_gap" -lt 3600 ]; then
        if [ "$rp_gap" -le 120 ]; then
          log "[日报] 已到设定时刻 $REPORT_TIME（偏差 $rp_gap 秒），调起日报脚本"
        fi
        sh "$REPORT_FILE" daily
      fi
    else
      if [ $((ROUND % 30)) -eq 1 ]; then
        log "[日报] 告警：无法解析推送时刻 '$REPORT_TIME'（本固件的 date -d 不支持该格式），定时日报不会触发"
      fi
    fi
  fi

  FINAL=""
  [ -n "$MSG_DAY" ] && FINAL="$MSG_DAY"
  if [ -n "$MSG_MONTH" ]; then
    [ -n "$FINAL" ] && FINAL="$FINAL<br><br>"
    FINAL="$FINAL$MSG_MONTH"
  fi
  if [ -n "$MSG_TEMP" ]; then
    [ -n "$FINAL" ] && FINAL="$FINAL<br><br>"
    FINAL="$FINAL$MSG_TEMP"
  fi

  if [ -n "$FINAL" ] && in_dnd; then
    log "[免打扰] 处于 $DND_START - $DND_END 时段，本次不推送"
    FINAL=""
  fi

  if [ -n "$FINAL" ]; then
    if [ "$SEVERE" = "1" ]; then
      PUSH_TITLE="[严重警告] CPU 温度反复超限（FM_U20）"
    else
      PUSH_TITLE="设备状态监测报警"
    fi
    HEAD="<b>设备状态监测报警</b><br>时间 $(date '+%Y-%m-%d %H:%M:%S')<br>机型 FM_U20<br><br>"
    if pushplus_send "$PUSH_TITLE" "$HEAD$FINAL"; then
      [ -n "$MSG_DAY" ] && printf '%s' "$cur_day" > "$DATA_DIR/notified_today.txt"
      [ -n "$MSG_MONTH" ] && printf '%s' "$cur_month" > "$DATA_DIR/notified_month.txt"
      if [ -n "$MSG_TEMP" ]; then
        printf '%s' "$now" > "$LAST_TEMP_NOTIFY"
        printf '%s' $((now + TEMP_LOCK_SECONDS)) > "$TEMP_LOCK_UNTIL"
        rm -f "$TEMP_RETRY_UNTIL"
        log "[温度] 推送成功，已锁定 1 小时"
      fi
      rm -f "$FLOW_RETRY_UNTIL"
    else
      printf '%s' $((now + 300)) > "$FLOW_RETRY_UNTIL"
      if [ -n "$MSG_TEMP" ]; then
        printf '%s' $((now + 300)) > "$TEMP_RETRY_UNTIL"
        log "[温度] 推送失败，5 分钟后重试（非 1 小时锁定）"
      fi
    fi
  fi

  sleep "$CHECK_INTERVAL"
done
`;
}
function genServiceScript() {
return [
      '#!/system/bin/sh',
      '# 设备监测报警消息推送 - service v' + VERSION,
      '# ' + STAMP,
      '',
      'PATH=/system/bin:/system/xbin:/vendor/bin:/sbin:/su/bin:$PATH',
      'export PATH',
      '',
      'BASE=' + BASE,
      'SCRIPT=' + SVC_FILE,
      'MONITOR=' + SH_FILE,
      'PIDF=' + PID_FILE,
      'LOG=' + LOG_FILE,
      'DATADIR=' + DATA_DIR,
      'CLAIM_DIR=' + CLAIM_DIR,
      'LOCK_DIR=' + BASE + '/start.lock',
      'BOOT_WAIT=15',
      'BOOT_RETRY=3',
      '',
      'log_line() {',
      '  mkdir -p "$BASE" "$DATADIR" 2>/dev/null',
      '  printf "%s %s\\n" "$(date \'+%Y-%m-%d %H:%M:%S\' 2>/dev/null)" "$*" >> "$LOG" 2>/dev/null',
      '}',
      '',
      'read_pid() {',
      '  awk \'NR==1{print;exit}\' "$PIDF" 2>/dev/null',
      '}',
      '',
      'match_cmd() {',
      '  cl=$(tr "\\000" " " 2>/dev/null < "/proc/$1/cmdline" 2>/dev/null)',
      '  case "$cl" in *"$MONITOR"*) ;; *) return 1 ;; esac',
      '  case "$-" in *f*) ng=1 ;; *) ng=0; set -f ;; esac',
      '  set -- $cl',
      '  [ "$ng" = "0" ] && set +f',
      '  case "$1" in',
      '    sh|*/sh|mksh|*/mksh|bash|*/bash|ash|*/ash) ;;',
      '    *) return 1 ;;',
      '  esac',
      '  [ "$2" = "$MONITOR" ] || return 1',
      '  return 0',
      '}',
      '',
      'scan_candidates() {',
      '  for f in $(grep -l -F "$MONITOR" /proc/[0-9]*/cmdline 2>/dev/null); do',
      '    p=${f#/proc/}; p=${p%/cmdline}',
      '    case "$p" in ""|*[!0-9]*) continue ;; esac',
      '    is_protected "$p" && continue',
      '    if match_cmd "$p"; then echo "$p"; return 0; fi',
      '  done',
      '  return 1',
      '}',
      '',
      'build_self_chain() {',
      '  ap=$$',
      '  n=0',
      '  while [ "$n" -lt 24 ]; do',
      '    case "$ap" in ""|*[!0-9]*) break ;; esac',
      '    [ "$ap" = "0" ] && break',
      '    printf " %s" "$ap"',
      '    [ -r "/proc/$ap/stat" ] || break',
      '    ap=$(sed "s/.*) //" "/proc/$ap/stat" 2>/dev/null | awk "{print \\$2}")',
      '    n=$((n + 1))',
      '  done',
      '  printf " "',
      '}',
      'SELF_CHAIN=$(build_self_chain)',
      'is_protected() {',
      '  case "$1" in ""|*[!0-9]*) return 0 ;; esac',
      '  [ "$1" = "1" ] && return 0',
      '  case "$SELF_CHAIN" in *" $1 "*) return 0 ;; esac',
      '  return 1',
      '}',
      '',
      'safe_kill() {',
      '  is_protected "$1" && return 0',
      '  kill -TERM "$1" >/dev/null 2>&1',
      '  i=0',
      '  while kill -0 "$1" >/dev/null 2>&1 && [ "$i" -lt 20 ]; do sleep 0.1; i=$((i + 1)); done',
      '  if kill -0 "$1" >/dev/null 2>&1; then kill -KILL "$1" >/dev/null 2>&1; fi',
      '  return 0',
      '}',
      '',
      'scan_pid() {',
      '  sp=$(scan_candidates) || return 1',
      '  [ -n "$sp" ] || return 1',
      '  echo "$sp"',
      '  return 0',
      '}',
      '',
      'is_running() {',
      '  pid="$(read_pid)"',
      '  case "$pid" in ""|*[!0-9]*) pid="" ;; esac',
      '  if [ -n "$pid" ] && [ -d "/proc/$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then',
      '    if match_cmd "$pid"; then return 0; fi',
      '  fi',
      '  cp=$(cat "$CLAIM_DIR/pid" 2>/dev/null)',
      '  case "$cp" in ""|*[!0-9]*) cp="" ;; esac',
      '  if [ -n "$cp" ] && [ -d "/proc/$cp" ] && kill -0 "$cp" >/dev/null 2>&1; then',
      '    if match_cmd "$cp"; then echo "$cp" > "$PIDF"; return 0; fi',
      '  fi',
      '  sp=$(scan_pid) || return 1',
      '  [ -n "$sp" ] || return 1',
      '  echo "$sp" > "$PIDF"',
      '  return 0',
      '}',
      '',
      'kill_tree() {',
      '  target="$1"; depth="$2"',
      '  case "$target" in ""|*[!0-9]*) return 0 ;; esac',
      '  case "$depth" in ""|*[!0-9]*) depth=0 ;; esac',
      '  [ "$depth" -gt 8 ] && return 0',
      '  if is_protected "$target"; then return 0; fi',
      '  for c in $(cat "/proc/$target/task/$target/children" 2>/dev/null); do',
      '    kill_tree "$c" $((depth + 1))',
      '  done',
      '  safe_kill "$target"',
      '  return 0',
      '}',
      '',
      'scan_kill() {',
      '  for f in $(grep -l -F "$MONITOR" /proc/[0-9]*/cmdline 2>/dev/null); do',
      '    p=${f#/proc/}; p=${p%/cmdline}',
      '    case "$p" in ""|*[!0-9]*) continue ;; esac',
      '    if is_protected "$p"; then continue; fi',
      '    if match_cmd "$p"; then',
      '      log_line "[service] 兜底清理守护进程 PID=$p"',
      '      safe_kill "$p"',
      '    fi',
      '  done',
      '  return 0',
      '}',
      '',
      'stop_guard() {',
      '  pid=""',
      '  if is_running; then',
      '    pid="$(read_pid)"',
      '    kill_tree "$pid" 0',
      '    n=0',
      '    while kill -0 "$pid" >/dev/null 2>&1 && [ "$n" -lt 30 ]; do',
      '      sleep 0.1',
      '      n=$((n + 1))',
      '    done',
      '  fi',
      '  scan_kill',
      '  if scan_pid >/dev/null 2>&1; then',
      '    log_line "[service] 守护停止失败，仍有实例存活"',
      '  elif [ -n "$pid" ]; then',
      '    log_line "[service] 守护已停止 PID=$pid"',
      '  else',
      '    log_line "[service] 未发现运行中的守护"',
      '  fi',
      '  rm -rf "$CLAIM_DIR"',
      '  rm -f "$PIDF"',
      '  rm -rf "$LOCK_DIR"',
      '  return 0',
      '}',
      '',
      'start_guard() {',
      '  mkdir -p "$BASE" "$DATADIR" 2>/dev/null',
      '  chmod 755 "$SCRIPT" "$MONITOR" 2>/dev/null',
      '  if [ ! -f "$MONITOR" ]; then',
      '    log_line "[service] 守护脚本缺失，请先部署"',
      '    return 1',
      '  fi',
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
      '  if command -v setsid >/dev/null 2>&1; then',
      '    ( setsid sh "$MONITOR" </dev/null >/dev/null 2>&1 & )',
      '  else',
      '    ( sh "$MONITOR" </dev/null >/dev/null 2>&1 & )',
      '  fi',
      '  daemon_pid=$!',
      '  if [ -n "$daemon_pid" ] && ! is_running; then echo "$daemon_pid" > "$PIDF"; fi',
      '  rm -rf "$LOCK_DIR"',
      '  n=0',
      '  while [ "$n" -lt 20 ]; do',
      '    if is_running; then',
      '      log_line "[service] 守护已启动 PID=$(read_pid)"',
      '      return 0',
      '    fi',
      '    sleep 0.5',
      '    n=$((n + 1))',
      '  done',
      '  log_line "[service] 守护启动失败"',
      '  return 1',
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
      '  daemon) exec sh "$MONITOR" ;;',
      '  boot)',
      '    sleep "$BOOT_WAIT"',
      '    n=0',
      '    while [ "$n" -lt "$BOOT_RETRY" ]; do',
      '      if start_guard; then',
      '        log_line "[boot] 守护已随开机启动"',
      '        exit 0',
      '      fi',
      '      n=$((n + 1))',
      '      sleep 15',
      '    done',
      '    log_line "[boot] 守护启动失败，已重试 $BOOT_RETRY 次"',
      '    exit 1',
      '    ;;',
      '  *) echo "usage: $0 {start|stop|restart|status|boot|daemon}"; exit 2 ;;',
      'esac'
    ].join('\n');
}
function genReportScript() {
var c = state.config;
    return `#!/system/bin/sh
# 设备监测报警消息推送 - 24 小时温度趋势日报 v${VERSION}
# ${STAMP}

PATH=/system/bin:/system/xbin:/vendor/bin:/sbin:/su/bin:$PATH
export PATH

BASE="${BASE}"
LOG_FILE="${LOG_FILE}"
CONFIG_FILE="${CONFIG_FILE}"
DATA_DIR="${DATA_DIR}"
AGG_BUCKET=${AGG_BUCKET}

MODE="$1"
[ -n "$MODE" ] || MODE="daily"

mkdir -p "$DATA_DIR" 2>/dev/null
TEMP_SAMPLES="$DATA_DIR/temp_samples.txt"
TEMP_AGG5="$DATA_DIR/temp_agg5.txt"
LAST_REPORT_DAY="$DATA_DIR/last_report_day.txt"
REPORT_RETRY_UNTIL="$DATA_DIR/report_retry_until.txt"
PP_BODY="$DATA_DIR/pp_report.json"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') [日报] $1" >> "$LOG_FILE" 2>/dev/null
}

TEMP_LIMIT=${c.tempLimit}
PUSHPLUS_TOKEN='${c.pushPlusToken}'
PP_CHANNELS='${c.channels}'
OPT_WEBHOOK='${c.opt_webhook}'
OPT_QQ='${c.opt_qq}'
OPT_CP='${c.opt_cp}'
OPT_MAIL='${c.opt_mail}'
PUSHPLUS_MAIL='${c.pushPlusMail}'
MAIL_OPTION='${c.mailOption}'
DND_ENABLED=${c.dndEnabled ? 1 : 0}
DND_START='${c.dndStart}'
DND_END='${c.dndEnd}'
REPORT_ENABLED=${c.reportEnabled ? 1 : 0}
REPORT_TIME='${c.reportTime}'

json_get() {
  [ -f "$CONFIG_FILE" ] || return
  awk -v k="$1" -v q='"' 'index($0, q k q) > 0 { line=$0; gsub(/["},]/, "", line); sub(/^[^:]*:[[:space:]]*/, "", line); gsub(/[[:space:]]/, "", line); print line }' "$CONFIG_FILE" 2>/dev/null | head -1
}
if [ -f "$CONFIG_FILE" ]; then
  v=$(json_get tempLimit);     [ -n "$v" ] && TEMP_LIMIT="$v"
  v=$(json_get pushPlusToken); [ -n "$v" ] && PUSHPLUS_TOKEN="$v"
  v=$(json_get channels);      [ -n "$v" ] && PP_CHANNELS="$v"
  v=$(json_get opt_webhook);   [ -n "$v" ] && OPT_WEBHOOK="$v"
  v=$(json_get opt_qq);        [ -n "$v" ] && OPT_QQ="$v"
  v=$(json_get opt_cp);        [ -n "$v" ] && OPT_CP="$v"
  v=$(json_get opt_mail);      [ -n "$v" ] && OPT_MAIL="$v"
  v=$(json_get pushPlusMail);  [ -n "$v" ] && PUSHPLUS_MAIL="$v"
  v=$(json_get mailOption);    [ -n "$v" ] && MAIL_OPTION="$v"
  v=$(json_get dndEnabled);    [ -n "$v" ] && DND_ENABLED="$v"
  v=$(json_get dndStart);      [ -n "$v" ] && DND_START="$v"
  v=$(json_get dndEnd);        [ -n "$v" ] && DND_END="$v"
  v=$(json_get reportEnabled); [ -n "$v" ] && REPORT_ENABLED="$v"
  v=$(json_get reportTime);    [ -n "$v" ] && REPORT_TIME="$v"
fi

norm_bool() {
  case "$1" in
    1|true|TRUE|True|yes|YES|Yes|on|ON|On) echo 1 ;;
    *) echo 0 ;;
  esac
}
DND_ENABLED=$(norm_bool "$DND_ENABLED")
REPORT_ENABLED=$(norm_bool "$REPORT_ENABLED")

${PP_CONF_LIB}

is_num() { echo "$1" | grep -qE '^[0-9]+$'; }

TEMP_LIMIT_MC=$(awk -v v="$TEMP_LIMIT" 'BEGIN{v=v+0; if (v<0) v=0; printf "%d", v*1000}' 2>/dev/null)
[ -n "$TEMP_LIMIT_MC" ] || TEMP_LIMIT_MC=0

mc2c() {
  awk -v v="$1" 'BEGIN{printf "%.2f", v/1000}' 2>/dev/null
}

to_min() {
  h=$(echo "$1" | cut -d: -f1)
  m=$(echo "$1" | cut -d: -f2)
  h=$(echo "$h" | sed 's/^0*//')
  m=$(echo "$m" | sed 's/^0*//')
  [ -z "$h" ] && h=0
  [ -z "$m" ] && m=0
  echo $(( h * 60 + m ))
}
in_dnd_at() {
  if [ "$DND_ENABLED" != "1" ] && [ "$DND_ENABLED" != "true" ]; then return 1; fi
  [ "$DND_START" = "$DND_END" ] && return 1
  n_min=$(to_min "$1")
  s_min=$(to_min "$DND_START")
  e_min=$(to_min "$DND_END")
  if [ "$s_min" -le "$e_min" ]; then
    if [ "$n_min" -ge "$s_min" ] && [ "$n_min" -lt "$e_min" ]; then return 0; fi
    return 1
  else
    if [ "$n_min" -ge "$s_min" ] || [ "$n_min" -lt "$e_min" ]; then return 0; fi
    return 1
  fi
}

now=$(date +%s)
cur_day=$(date +%Y-%m-%d)

if [ -z "$PUSHPLUS_TOKEN" ]; then
  log "未配置 PushPlus Token，无法推送"
  echo "NOTOKEN"
  exit 1
fi

if [ "$MODE" = "daily" ]; then
  if [ "$REPORT_ENABLED" != "1" ] && [ "$REPORT_ENABLED" != "true" ]; then
    exit 0
  fi
  rp_done=$(cat "$LAST_REPORT_DAY" 2>/dev/null)
  if [ "$rp_done" = "$cur_day" ]; then
    exit 0
  fi
  rp_retry=$(cat "$REPORT_RETRY_UNTIL" 2>/dev/null)
  if is_num "$rp_retry" && [ "$now" -lt "$rp_retry" ]; then
    exit 0
  fi
  if in_dnd_at "$(date +%H:%M)"; then
    log "当前处于免打扰时段 $DND_START - $DND_END，跳过本次定时推送"
    exit 0
  fi
  if in_dnd_at "$REPORT_TIME"; then
    log "设定时刻 $REPORT_TIME 落在免打扰时段 $DND_START - $DND_END 内，已跳过（请把推送时刻改到时段外）"
    exit 0
  fi
else
  if in_dnd_at "$(date +%H:%M)"; then
    log "当前处于免打扰时段 $DND_START - $DND_END，手动推送已取消"
    echo "DND"
    exit 0
  fi
fi

R_TO=$now
R_FROM=$(( now - 86400 ))
R_FROM=$(( R_FROM - R_FROM % AGG_BUCKET ))

R_SRC=""
[ -f "$TEMP_AGG5" ] && R_SRC="$TEMP_AGG5"
[ -f "$TEMP_SAMPLES" ] && R_SRC="$R_SRC $TEMP_SAMPLES"
if [ -z "$R_SRC" ]; then
  log "尚无温度采样数据，跳过本次日报"
  echo "NODATA"
  exit 0
fi

R_OUT=$(awk -v agg="$TEMP_AGG5" -v from="$R_FROM" -v to="$R_TO" -v bk="$AGG_BUCKET" -v lim="$TEMP_LIMIT_MC" -v Q="'" '
BEGIN { nb = int((to - from) / bk) }
FILENAME == agg {
  if (NF < 4) next
  ts = $1 + 0
  if (ts < from || ts > to) next
  av = $2 + 0; hi = $3 + 0; lo = $4 + 0
  nn = (NF > 4 ? $5 + 0 : 1)
  if (nn < 1) nn = 1
  if (av < 20000 || av > 124000) next
  if (hi > 124000 || lo < 0) next
  if (lo > hi) { tv = lo; lo = hi; hi = tv }
  k = int((ts - from) / bk)
  if (k < 0 || k > nb) next
  if (k in isagg) next
  isagg[k] = 1
  cnt[k] = nn; sum[k] = av * nn; hiv[k] = hi; lov[k] = lo
  next
}
{
  if (NF < 2) next
  ts = $1 + 0; v = $2 + 0
  if (v < 20000 || v > 124000) next
  if (ts < from || ts > to) next
  k = int((ts - from) / bk)
  if (k < 0 || k > nb) next
  if (k in isagg) next
  if (k in cnt) {
    cnt[k]++; sum[k] += v
    if (v > hiv[k]) hiv[k] = v
    if (v < lov[k]) lov[k] = v
  } else {
    cnt[k] = 1; sum[k] = v; hiv[k] = v; lov[k] = v
  }
}
END {
  kn = 0
  for (k = 0; k <= nb; k++) if (k in cnt) { ks[kn] = k; kn++ }
  if (kn < 1) exit

  gs = 1
  if (kn > 160) gs = int((kn + 159) / 160)
  gn = 0
  i = 0
  while (i < kn) {
    e = i + gs
    if (e > kn) e = kn
    aw = 0; an = 0; ah = -1; al = 999999999
    for (j = i; j < e; j++) {
      kk = ks[j]
      aw += sum[kk]; an += cnt[kk]
      if (hiv[kk] > ah) ah = hiv[kk]
      if (lov[kk] < al) al = lov[kk]
    }
    gts[gn] = from + ks[i] * bk
    gav[gn] = int(aw / an + 0.5)
    ghi[gn] = ah
    glo[gn] = al
    gn++
    i = e
  }

  vmax = -999999999; vmin = 999999999
  for (i = 0; i < gn; i++) {
    if (ghi[i] > vmax) vmax = ghi[i]
    if (glo[i] < vmin) vmin = glo[i]
  }
  if (lim > 0) { if (lim > vmax) vmax = lim; if (lim < vmin) vmin = lim }
  span = vmax - vmin
  if (span < 3000) { mid = (vmax + vmin) / 2; vmin = mid - 1500; vmax = mid + 1500; span = 3000 }
  vmin = vmin - span * 0.15; vmax = vmax + span * 0.15; span = vmax - vmin

  tmax = -999999999; tmin = 999999999; tsum = 0; over = 0; pk = 0
  for (i = 0; i < gn; i++) {
    if (ghi[i] > tmax) { tmax = ghi[i]; pk = i }
    if (glo[i] < tmin) tmin = glo[i]
    tsum += gav[i]
    if (lim > 0 && gav[i] >= lim) over++
  }
  tavg = int(tsum / gn + 0.5)
  tcur = gav[gn - 1]
  pk_h = (to - gts[pk]) / 3600

  W = 640; H = 300; L = 52; R = 16; T = 30; B = 46
  pw = W - L - R; ph = H - T - B
  slot = pw / gn
  bw = slot * 0.6
  if (bw < 1.2) bw = 1.2
  if (bw > 12) bw = 12
  hstr = int((to - from) / 3600)

  o = "<svg xmlns=" Q "http://www.w3.org/2000/svg" Q " width=" Q "100%" Q " viewBox=" Q "0 0 640 300" Q " style=" Q "max-width:640px;background:#0f172a;border-radius:8px" Q ">"
  o = o "<rect x=" Q 0 Q " y=" Q 0 Q " width=" Q W Q " height=" Q H Q " fill=" Q "#0f172a" Q " rx=" Q 8 Q "/>"
  o = o "<text x=" Q L Q " y=" Q 19 Q " fill=" Q "#e2e8f0" Q " font-size=" Q 13 Q ">CPU 温度趋势 · 最近 " hstr " 小时 · " gn " 点</text>"

  o = o "<g stroke=" Q "#1e293b" Q " stroke-width=" Q 1 Q ">"
  for (g = 0; g <= 4; g++) {
    yy = T + ph - ph * g / 4
    o = o "<line x1=" Q L Q " y1=" Q sprintf("%.0f", yy) Q " x2=" Q (L + pw) Q " y2=" Q sprintf("%.0f", yy) Q "/>"
  }
  o = o "</g>"
  o = o "<g fill=" Q "#94a3b8" Q " font-size=" Q 10 Q " text-anchor=" Q "end" Q ">"
  for (g = 0; g <= 4; g++) {
    vv = vmin + span * g / 4
    yy = T + ph - ph * g / 4
    o = o "<text x=" Q (L - 8) Q " y=" Q sprintf("%.0f", yy + 4) Q ">" sprintf("%.1f", vv / 1000) "</text>"
  }
  o = o "</g>"

  if (lim > 0 && lim >= vmin && lim <= vmax) {
    ly = T + ph - (lim - vmin) / span * ph
    o = o "<line x1=" Q L Q " y1=" Q sprintf("%.0f", ly) Q " x2=" Q (L + pw) Q " y2=" Q sprintf("%.0f", ly) Q " stroke=" Q "#ef4444" Q " stroke-width=" Q 1 Q " stroke-dasharray=" Q "5,4" Q "/>"
    o = o "<text x=" Q (L + pw) Q " y=" Q sprintf("%.0f", ly - 5) Q " fill=" Q "#f87171" Q " font-size=" Q 10 Q " text-anchor=" Q "end" Q ">阈值 " sprintf("%.2f", lim / 1000) " ℃</text>"
  }

  dn = ""; dh = ""
  for (i = 0; i < gn; i++) {
    xx = L + slot * (i + 0.5)
    y1 = T + ph - (ghi[i] - vmin) / span * ph
    y2 = T + ph - (glo[i] - vmin) / span * ph
    if (y2 - y1 < 1) y2 = y1 + 1
    seg = "M" sprintf("%.0f", xx) "," sprintf("%.0f", y1) "V" sprintf("%.0f", y2)
    if (lim > 0 && gav[i] >= lim) dh = dh seg
    else dn = dn seg
  }
  if (dn != "") o = o "<path d=" Q dn Q " stroke=" Q "#38bdf8" Q " stroke-width=" Q sprintf("%.1f", bw) Q " opacity=" Q ".55" Q "/>"
  if (dh != "") o = o "<path d=" Q dh Q " stroke=" Q "#ef4444" Q " stroke-width=" Q sprintf("%.1f", bw) Q " opacity=" Q ".85" Q "/>"

  pl = ""
  for (i = 0; i < gn; i++) {
    xx = L + slot * (i + 0.5)
    yy = T + ph - (gav[i] - vmin) / span * ph
    pl = pl (i == 0 ? "M" : "L") sprintf("%.0f", xx) "," sprintf("%.0f", yy)
  }
  o = o "<path d=" Q pl Q " fill=" Q "none" Q " stroke=" Q "#fbbf24" Q " stroke-width=" Q 1.8 Q " stroke-linejoin=" Q "round" Q "/>"
  o = o "<circle cx=" Q sprintf("%.0f", L + slot * (gn - 0.5)) Q " cy=" Q sprintf("%.0f", T + ph - (gav[gn - 1] - vmin) / span * ph) Q " r=" Q 3.4 Q " fill=" Q "#fbbf24" Q "/>"

  for (g = 0; g <= 4; g++) {
    hh = hstr - hstr * g / 4
    xx = L + pw * g / 4
    anc = "middle"
    if (g == 0) anc = "start"
    if (g == 4) anc = "end"
    lb = (g == 4 ? "现在" : "-" sprintf("%.0f", hh) "h")
    o = o "<text x=" Q sprintf("%.0f", xx) Q " y=" Q (H - 26) Q " fill=" Q "#94a3b8" Q " font-size=" Q 9 Q " text-anchor=" Q anc Q ">" lb "</text>"
  }
  o = o "<text x=" Q (L - 8) Q " y=" Q (H - 26) Q " fill=" Q "#64748b" Q " font-size=" Q 9 Q " text-anchor=" Q "end" Q ">℃</text>"
  o = o "<text x=" Q sprintf("%.0f", L + pw / 2) Q " y=" Q (H - 8) Q " fill=" Q "#64748b" Q " font-size=" Q 9 Q " text-anchor=" Q "middle" Q ">柱体=该区间最低~最高　折线=区间均值　红柱=均值超阈值</text>"
  o = o "</svg>"

  tx = ""
  stp = int(gn / 12) + 1
  for (i = 0; i < gn; i += stp) {
    hb = (to - gts[i]) / 3600
    tx = tx "T-" sprintf("%.1f", hb) "h:" sprintf("%.2f", gav[i] / 1000) "℃  "
  }

  printf "%s\\n", o
  printf "%d %d %d %d %d %d %.1f\\n", tmax, tavg, tmin, tcur, over, gn, pk_h
  printf "%s\\n", tx
}' $R_SRC)

# $() 会吃掉尾部换行，printf 补回后再按行取，避免三行数据粘在一起
R_SVG=$(printf '%s\\n' "$R_OUT" | awk 'NR==1')
R_STATS=$(printf '%s\\n' "$R_OUT" | awk 'NR==2')
R_TEXT=$(printf '%s\\n' "$R_OUT" | awk 'NR==3')

if [ -z "$R_SVG" ] || [ -z "$R_STATS" ]; then
  log "最近 24 小时有效采样不足，暂不推送日报"
  echo "NODATA"
  exit 0
fi

S_MAX=$(echo "$R_STATS" | awk '{print $1}')
S_AVG=$(echo "$R_STATS" | awk '{print $2}')
S_MIN=$(echo "$R_STATS" | awk '{print $3}')
S_CUR=$(echo "$R_STATS" | awk '{print $4}')
S_OVER=$(echo "$R_STATS" | awk '{print $5}')
S_CNT=$(echo "$R_STATS" | awk '{print $6}')
S_PKH=$(echo "$R_STATS" | awk '{print $7}')

v_max=$(mc2c "$S_MAX")
v_min=$(mc2c "$S_MIN")
v_avg=$(mc2c "$S_AVG")
v_cur=$(mc2c "$S_CUR")

over_txt="未设阈值"
if [ "$TEMP_LIMIT_MC" != "0" ]; then
  if [ "$S_OVER" -gt 0 ]; then
    over_txt="$(( S_OVER * AGG_BUCKET / 60 )) 分钟（$S_OVER / $S_CNT 个区间）"
  else
    over_txt="0 分钟（全天未超限）"
  fi
fi

R_END_TXT=$(date '+%Y-%m-%d %H:%M')

RTITLE="设备温度日报 · 24 小时趋势（FM_U20）"
RBODY="<b>设备温度日报</b><br>生成时间 $R_END_TXT<br>机型 FM_U20<br>统计区间 最近 24 小时（$S_CNT 个 5 分钟区间）<br><br>"
RBODY="$RBODY当前 $v_cur ℃　最高 $v_max ℃　最低 $v_min ℃　平均 $v_avg ℃<br>"
if [ "$TEMP_LIMIT_MC" != "0" ]; then
  RBODY="$RBODY阈值 $TEMP_LIMIT ℃　超阈值时长 $over_txt<br>峰值 $v_max ℃ 出现在约 $S_PKH 小时前"
else
  RBODY="$RBODY峰值 $v_max ℃ 出现在约 $S_PKH 小时前（未设温度阈值）"
fi
RBODY="$RBODY<br><br>"

if [ -n "$R_SVG" ]; then
  clen=$(printf '%s' "$R_SVG" | wc -c)
  if [ "$clen" -le 6000 ]; then
    RBODY="$RBODY$R_SVG"
  else
    log "趋势图 $clen 字符超出限额，本次仅发送文本明细"
  fi
fi
if [ -n "$R_TEXT" ]; then
  RBODY="$RBODY<br><span style='font-size:12px;color:#64748b'>$R_TEXT</span>"
fi

CURL_BIN="/data/data/com.minikano.f50_sms/files/curl"
[ ! -x "$CURL_BIN" ] && CURL_BIN="curl"
command -v "$CURL_BIN" >/dev/null 2>&1 || log "警告 未找到可用的 curl，推送会失败"

json_escape() {
  printf '%s' "$1" | sed 's/"/ /g'
}
${PP_SEND_LIB}

report_send() {
  pp_send "$1" "$2"
}

if report_send "$RTITLE" "$RBODY"; then
  log "24 小时温度趋势日报已推送（最高 $v_max 最低 $v_min 平均 $v_avg 当前 $v_cur ℃）"
  if [ "$MODE" = "daily" ]; then
    printf '%s' "$cur_day" > "$LAST_REPORT_DAY"
  else
    m_target=$(date -d "$cur_day $REPORT_TIME:00" +%s 2>/dev/null)
    if is_num "$m_target" && [ "$now" -ge "$m_target" ]; then
      printf '%s' "$cur_day" > "$LAST_REPORT_DAY"
      log "手动推送已完成，且当前已过设定时刻 $REPORT_TIME，记为今日日报"
    else
      log "手动推送已完成（设定时刻 $REPORT_TIME 未到，今天的定时日报仍会照常推送）"
    fi
  fi
  rm -f "$REPORT_RETRY_UNTIL"
  echo "OK"
  exit 0
else
  printf '%s' $((now + 600)) > "$REPORT_RETRY_UNTIL"
  echo "FAIL"
  exit 1
fi
`;
}
var KILL_SCAN_SH = [
    'ap=$$; n=0; SELF_CHAIN=""',
    'while [ "$n" -lt 24 ]; do',
    '  case "$ap" in ""|*[!0-9]*) break;; esac',
    '  [ "$ap" = "0" ] && break',
    '  SELF_CHAIN="$SELF_CHAIN $ap"',
    '  [ -r "/proc/$ap/stat" ] || break',
    '  ap=$(sed "s/.*) //" "/proc/$ap/stat" 2>/dev/null | awk "{print \\$2}")',
    '  n=$((n + 1))',
    'done',
    'is_protected() {',
    '  case "$1" in ""|*[!0-9]*) return 0;; esac',
    '  [ "$1" = "1" ] && return 0',
    '  case " $SELF_CHAIN " in *" $1 "*) return 0;; esac',
    '  return 1',
    '}',
    'for p in $(ls /proc 2>/dev/null); do',
    '  case "$p" in ""|*[!0-9]*) continue;; esac',
    '  is_protected "$p" && continue',
    '  cl=$(tr "\\000" " " 2>/dev/null < "/proc/$p/cmdline")',
    '  case "$cl" in *"' + SH_FILE + '"*) ;; *) continue;; esac',
    '  fst=$(echo "$cl" | awk "{print \\$1}")',
    '  case "$fst" in sh|*/sh|mksh|*/mksh|bash|*/bash|ash|*/ash) ;; *) continue;; esac',
    '  sec=$(echo "$cl" | awk "{print \\$2}")',
    '  [ "$sec" = "' + SH_FILE + '" ] || continue',
    '  kill -TERM "$p" 2>/dev/null',
    '  i=0; while kill -0 "$p" 2>/dev/null && [ "$i" -lt 20 ]; do sleep 0.1; i=$((i + 1)); done',
    '  kill -0 "$p" 2>/dev/null && kill -KILL "$p" 2>/dev/null',
    'done',
    'echo ok'
  ].join('\n');
async function killProc() {
try {
      await run('if [ -x ' + sq(SVC_FILE) + ' ]; then ' + sq(SVC_FILE) + ' stop >/dev/null 2>&1; fi', 20000);
} catch (e) {}
try {
await run(KILL_SCAN_SH, 20000);
} catch (e) {}
try {
      await run('rm -rf ' + sq(CLAIM_DIR) + '; rm -f ' + sq(PID_FILE) + '; sleep 1; echo ok', 8000);
} catch (e) {}
}
async function daemonStatus() {
    var r = await run(sq(SVC_FILE) + ' status 2>/dev/null', 6000);
var m = String(outOf(r)).match(/running\s+pid=(\d+)/);
if (m) return { on: true, pid: m[1] };
    return { on: false, pid: '' };
}
async function readPid() {
var st = await daemonStatus();
    state.pid = st.on ? st.pid : '';
}
async function bootHookOn() {
    var r = await run('grep -qxF ' + sq(BOOT_LINE) + ' ' + sq(BOOT_SH_FILE) + ' 2>/dev/null && echo YES || echo NO', 6000);
    return String(outOf(r)).indexOf('YES') >= 0;
}
async function installBootHook(on) {
var cmd;
if (on) {
      cmd = 'mkdir -p ' + sq(BASE) + ' 2>/dev/null; touch ' + sq(BOOT_SH_FILE) + '; chmod 755 ' + sq(BOOT_SH_FILE) + ' 2>/dev/null; ' +
            'sed -i "/' + NAME + '/d" ' + sq(BOOT_SH_FILE) + ' 2>/dev/null; ' +
            'grep -qxF ' + sq(BOOT_LINE) + ' ' + sq(BOOT_SH_FILE) + ' 2>/dev/null || echo ' + sq(BOOT_LINE) + ' >> ' + sq(BOOT_SH_FILE) + '; echo ok';
} else {
      cmd = 'touch ' + sq(BOOT_SH_FILE) + ' 2>/dev/null; ' +
            'sed -i "/' + NAME + '/d" ' + sq(BOOT_SH_FILE) + ' 2>/dev/null; echo ok';
}
await run(cmd, 6000);
return bootHookOn();
}
var migratedLegacy = false;
async function migrateLegacy() {
if (migratedLegacy) return true;
migratedLegacy = true;
var pairs = [
      ['/sdcard/ufi_monitor_alarm.conf', CONFIG_FILE],
      ['/sdcard/ufi_monitor_alarm.log', LOG_FILE]
];
var dirs = [
      ['/sdcard/ufi_monitor_alarm_data', DATA_DIR]
];
    var c = 'mkdir -p ' + sq(BASE) + ' ' + sq(DATA_DIR) + ' 2>/dev/null; ';
for (var i = 0; i < pairs.length; i++) {
      c += '[ -f ' + sq(pairs[i][1]) + ' ] || cp -f ' + sq(pairs[i][0]) + ' ' + sq(pairs[i][1]) + ' 2>/dev/null; ';
}
for (var j = 0; j < dirs.length; j++) {
      c += 'if [ -d ' + sq(dirs[j][0]) + ' ]; then ' +
             'for f in ' + sq(dirs[j][0]) + '/*; do ' +
               '[ -f "$f" ] || continue; ' +
               'b=$(basename "$f"); ' +
               '[ -e ' + sq(dirs[j][1]) + '/"$b" ] || cp -f "$f" ' + sq(dirs[j][1]) + '/"$b" 2>/dev/null; ' +
             'done; ' +
           'fi; ';
}
    c += 'rm -f /sdcard/ufi_monitor_alarm.sh /sdcard/ufi_monitor_alarm.pid 2>/dev/null; ';
    c += 'touch ' + sq(BASE + '/.migrated') + ' 2>/dev/null; echo ok';
await run(c, 15000);
return true;
}
async function readStamp() {
    var r = await run('grep -m1 ' + sq('UMA-STAMP') + ' ' + sq(SH_FILE) + ' 2>/dev/null || echo ""', 5000);
return String(outOf(r)).trim();
}
async function syncApiSnapshot() {
try {
      var data = (typeof getUFIData === 'function') ? await getUFIData() : null;
if (!data) data = window.UFI_DATA;
if (!data) return false;
var monthly = num(data.monthly_data || data.monthly_flow || data.month_used, 0);
var daily = num(data.daily_data || data.daily_flow || data.day_used, 0);
if (!monthly && !daily) return false;
var sysfsRes = await run(
        'for iface in $(ls /sys/class/net/ 2>/dev/null); do\n' +
        '  case "$iface" in lo|br0|wlan0|ap0|swlan0|dummy*|ifb*|tunl*|gre*|sit*|ip6*|erspan*|ip_vti*) continue;; esac\n' +
        '  ip addr show dev "$iface" 2>/dev/null | grep -q "inet " || continue\n' +
        '  rx=$(cat "/sys/class/net/$iface/statistics/rx_bytes" 2>/dev/null)\n' +
        '  if [ -n "$rx" ] && [ "$rx" != "0" ]; then awk \'NR==1{r=$0}NR==2{print r+$0}\' "/sys/class/net/$iface/statistics/rx_bytes" "/sys/class/net/$iface/statistics/tx_bytes" 2>/dev/null; exit; fi\n' +
        'done; echo 0', 4000);
      var sysfs = String(outOf(sysfsRes)).trim().split('\n')[0] || '0';
var d = new Date();
      var day = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
var mon = day.slice(0, 7); 
      await run('mkdir -p ' + sq(DATA_DIR) + ' && printf %s ' + sq(monthly + ' ' + daily + ' ' + sysfs + ' ' + day + ' ' + mon) + ' > ' + sq(DATA_DIR + '/api_snapshot.txt'));
return true;
} catch (e) { return false; }
}
var TEMP_PROBE_SH = [
    'tmax=0',
    'for z in /sys/class/thermal/thermal_zone*; do',
    '  [ -d "$z" ] || continue',
    '  ty=""; IFS= read -r ty < "$z/type" 2>/dev/null; [ -n "$ty" ] || continue',
    '  case "$ty" in *chg*|*front*|*frame*|*wcn*|*usb*|*bcl*|*interface*|*skin*|*back*) continue;; esac',
    '  v=""; IFS= read -r v < "$z/temp" 2>/dev/null',
    '  case "$v" in ""|*[!0-9]*) continue;; esac',
    '  [ "$v" -gt 0 ] && [ "$v" -le 124000 ] && [ "$v" -gt "$tmax" ] && tmax=$v',
    'done',
    'echo "$tmax"'
  ].join('\n');
function fmtTemp(mc) {
    if (mc === null || mc === undefined || isNaN(mc) || mc < 0) return '--';
return (mc / 1000).toFixed(2);
}
var PROBE_CMD = [
    'echo __T__',
TEMP_PROBE_SH,
    'echo __F__',
    'ms=$(date -d "$(date +%Y-%m)-01 00:00:00" +%s 2>/dev/null)',
    'ds=$(date -d "$(date +%Y-%m-%d) 00:00:00" +%s 2>/dev/null)',
    'if echo "$ms" | grep -qE "^[0-9]+$" && echo "$ds" | grep -qE "^[0-9]+$"; then dumpsys netstats --full 2>/dev/null | awk -v ms="$ms" -v ds="$ds" \'',
    '/^Dev stats:/{d=1;next}',
    'd && /^[^ ]/{exit}',
    'd && /type=0/{m=1}',
    'd && /ident=/ && !/type=0/{m=0}',
    'd && m && /st=/{',
    '  split($1,a,"="); split($2,b,"="); split($4,c,"=")',
    '  bs=a[2]+0; v=b[2]+c[2]',
    '  if(bs>=ms) tm+=v',
    '  if(bs>=ds) td+=v',
    '}',
    'END{print tm+0, td+0}\'; else echo "0 0"; fi',
    'echo __S__',
    'for iface in $(ls /sys/class/net/ 2>/dev/null); do',
    '  case "$iface" in lo|br0|wlan0|ap0|swlan0|dummy*|ifb*|tunl*|gre*|sit*|ip6*|erspan*|ip_vti*) continue;; esac',
    '  ip addr show dev "$iface" 2>/dev/null | grep -q "inet " || continue',
    '  rx=$(cat "/sys/class/net/$iface/statistics/rx_bytes" 2>/dev/null)',
    '  if [ -n "$rx" ] && [ "$rx" != "0" ]; then awk \'NR==1{r=$0}NR==2{print r+$0}\' "/sys/class/net/$iface/statistics/rx_bytes" "/sys/class/net/$iface/statistics/tx_bytes" 2>/dev/null; exit; fi',
    'done; echo 0',
    'echo __E__'
  ].join('\n');
function pick(text, a, b) {
    if (text.indexOf(a) < 0) return '';
var rest = text.split(a)[1];
if (b && rest.indexOf(b) >= 0) rest = rest.split(b)[0];
return rest.trim();
}
var flowCache = { at: 0, month: -1, day: -1 };
async function probeNow(force) {
if (state.probing) return state.live;
state.probing = true;
try {
var nowMs = Date.now();
var useCache = !force && flowCache.at && (nowMs - flowCache.at < 60000);
var temp = -1, month = -1, day = -1;
if (useCache) {
var rT = await run(TEMP_PROBE_SH, 6000);
        temp = parseInt(String(outOf(rT)).trim().split('\n')[0], 10);
month = flowCache.month;
day = flowCache.day;
} else {
var r = await run(PROBE_CMD, 12000);
var t = String(outOf(r));
        temp = parseInt(pick(t, '__T__', '__F__').split('\n')[0], 10);
        var flow = pick(t, '__F__', '__S__').split('\n')[0];
var fp = flow.split(/\s+/);
month = parseInt(fp[0], 10);
day = parseInt(fp[1], 10);
if (!month && !day) {
var fb = await localFallback();
month = fb.month; day = fb.day;
}
if (!isNaN(month) && !isNaN(day) && (month > 0 || day > 0)) {
flowCache = { at: nowMs, month: month, day: day };
}
}
state.live = {
day: isNaN(day) ? -1 : day,
month: isNaN(month) ? -1 : month,
temp: isNaN(temp) ? -1 : temp,
        at: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        err: ''
};
} catch (e) {
      state.live = { day: -1, month: -1, temp: -1, at: '', err: '采集失败：' + (e && e.message ? e.message : '未知错误') };
} finally {
state.probing = false;
}
renderLive();
return state.live;
}
async function localFallback() {
var res = { month: 0, day: 0 };
try {
      var snapRes = await run('cat ' + sq(DATA_DIR + '/api_snapshot.txt') + ' 2>/dev/null', 4000);
var snap = String(outOf(snapRes)).trim().split(/\s+/);
if (snap.length >= 5) {
var sysRes = await run(
          'for iface in $(ls /sys/class/net/ 2>/dev/null); do\n' +
          '  case "$iface" in lo|br0|wlan0|ap0|swlan0|dummy*|ifb*|tunl*|gre*|sit*|ip6*|erspan*|ip_vti*) continue;; esac\n' +
          '  ip addr show dev "$iface" 2>/dev/null | grep -q "inet " || continue\n' +
          '  rx=$(cat "/sys/class/net/$iface/statistics/rx_bytes" 2>/dev/null)\n' +
          '  if [ -n "$rx" ] && [ "$rx" != "0" ]; then awk \'NR==1{r=$0}NR==2{print r+$0}\' "/sys/class/net/$iface/statistics/rx_bytes" "/sys/class/net/$iface/statistics/tx_bytes" 2>/dev/null; exit; fi\n' +
          'done; echo 0', 4000);
        var cur = parseInt(String(outOf(sysRes)).trim().split('\n')[0], 10) || 0;
var base = parseInt(snap[2], 10) || 0;
var delta = cur - base; if (delta < 0) delta = 0;
var d = new Date();
        var today = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
var mon = today.slice(0, 7);
res.month = (snap[4] === mon ? (parseInt(snap[0], 10) || 0) : 0) + delta;
res.day = (snap[3] === today ? (parseInt(snap[1], 10) || 0) : 0) + delta;
return res;
}
} catch (e) {}
try {
var d2 = window.UFI_DATA || {};
res.month = num(d2.monthly_data || d2.monthly_flow || d2.month_used, 0);
res.day = num(d2.daily_data || d2.daily_flow || d2.day_used, 0);
} catch (e2) {}
return res;
}
async function appendLog(text) {
    await run('printf \'%s %s\\n\' "$(date \'+%Y-%m-%d %H:%M:%S\')" ' + sq(text) + ' >> ' + sq(LOG_FILE), 5000);
}
function cell(key, val, sub, over, empty) {
    return '<div class="uma-lc' + (empty ? ' empty' : '') + '">' +
      '<div class="uma-lc-k">' + key + '</div>' +
      '<div class="uma-lc-v' + (over ? ' over' : '') + '">' + val + '</div>' +
      '<div class="uma-lc-s' + (over ? ' over' : '') + '">' + (sub || '&nbsp;') + '</div>' +
      '</div>';
}
function renderLive() {
var root = document.getElementById(MODAL);
if (!root) return;
    var box = root.querySelector('#uma_live');
if (!box) return;
var L = state.live, c = state.config;
    var dv = L.day >= 0 ? gb(L.day) + ' GB' : '--';
    var mv = L.month >= 0 ? gb(L.month) + ' GB' : '--';
    var tv = fmtTemp(L.temp) === '--' ? '--' : fmtTemp(L.temp) + '<span style="font-size:.6em;opacity:.75"> ℃</span>';
var dayOver = L.day >= 0 && c.dailyLimit > 0 && (L.day / 1073741824) >= c.dailyLimit;
var monOver = L.month >= 0 && c.monthlyLimit > 0 && (L.month / 1073741824) >= c.monthlyLimit;
var tmpOver = L.temp >= 0 && c.tempLimit > 0 && L.temp >= c.tempLimit * 1000;
var daySub = c.dailyLimit > 0
      ? (dayOver ? '已超限 (限额 ' + c.dailyLimit + ' GB)' : '限额 ' + c.dailyLimit + ' GB')
      : '未设限额';
var monSub = c.monthlyLimit > 0
      ? (monOver ? '已超限 (限额 ' + c.monthlyLimit + ' GB)' : '限额 ' + c.monthlyLimit + ' GB')
      : '未设限额';
var tmpSub = c.tempLimit > 0
      ? (tmpOver ? '已超限 (阈值 ' + c.tempLimit + ' ℃)' : '阈值 ' + c.tempLimit + ' ℃')
      : '未设阈值';
box.innerHTML =
      cell('当日流量', dv, daySub, dayOver, L.day < 0) +
      cell('当月流量', mv, monSub, monOver, L.month < 0) +
      cell('CPU 温度', tv, tmpSub, tmpOver, L.temp < 0);
    var at = root.querySelector('#uma_live_at');
if (at) {
at.textContent = L.err ? L.err
        : (L.at ? '数据更新于 ' + L.at + '（守护进程每 60 秒采集一次，此处由页面即时采集）' : '正在采集…');
}
}
async function refreshAll() {
var root = document.getElementById(MODAL);
    var btn = root ? root.querySelector('[data-act="refresh"]') : null;
    if (btn) { btn.disabled = true; btn.textContent = '采集中...'; }
try {
var L = await probeNow(true);
var parts = [];
      parts.push('[手动刷新] 当日 ' + (L.day >= 0 ? gb(L.day) + ' GB' : '未知'));
      parts.push('当月 ' + (L.month >= 0 ? gb(L.month) + ' GB' : '未知'));
      parts.push('温度 ' + (L.temp >= 0 ? fmtTemp(L.temp) + ' ℃' : '未知'));
      await appendLog(parts.join(' / '));
await loadLog();
} catch (e) {
      toast('刷新失败：' + (e && e.message ? e.message : '未知错误'), 'red');
} finally {
      if (btn) { btn.disabled = false; btn.textContent = '刷新'; }
}
}
async function readStatus() {
var r = await run(
      'echo __C__\n' +
      'cat ' + sq(CONFIG_FILE) + ' 2>/dev/null\n' +
      'echo __B__\n' +
      'cat ' + sq(BOOT_SH_FILE) + ' 2>/dev/null\n' +
      'echo __P__\n' +
      sq(SVC_FILE) + ' status 2>/dev/null', 6000);
var text = outOf(r);
    var confPart = pick(text, '__C__', '__B__');
    var bootPart = pick(text, '__B__', '__P__');
    var pidPart = pick(text, '__P__', '');
if (confPart) {
try { applyConf(JSON.parse(confPart)); } catch (e) {}
}
state.installed = bootPart.indexOf(BOOT_LINE) >= 0;
var pm = pidPart.match(/running\s+pid=(\d+)/);
    state.pid = pm ? pm[1] : '';
state.bootOn = await bootHookOn();
}
async function readStatusCombined() {
var cmd =
      'echo __C__\n' +
      'cat ' + sq(CONFIG_FILE) + ' 2>/dev/null\n' +
      'echo __B__\n' +
      'grep -qxF ' + sq(BOOT_LINE) + ' ' + sq(BOOT_SH_FILE) + ' 2>/dev/null && echo YES || echo NO\n' +
      'echo __P__\n' +
      sq(SVC_FILE) + ' status 2>/dev/null\n' +
      'echo __V__\n' +
      'grep -m1 ' + sq('UMA-STAMP') + ' ' + sq(SH_FILE) + ' 2>/dev/null\n' +
      'echo __D__\n' +
      'cat ' + sq(DATA_DIR + '/daemon_started_at') + ' 2>/dev/null; echo\n' +
      'cat ' + sq(DATA_DIR + '/heartbeat') + ' 2>/dev/null; echo\n' +
      'echo __L__\n' +
      'd=$(date +%Y-%m-%d)\n' +
      'm=$(date +%Y-%m)\n' +
      'n=$(date +%s)\n' +
      'f1=$(cat ' + sq(DATA_DIR + '/notified_today.txt') + ' 2>/dev/null)\n' +
      'f2=$(cat ' + sq(DATA_DIR + '/notified_month.txt') + ' 2>/dev/null)\n' +
      'f3=$(cat ' + sq(DATA_DIR + '/temp_lock_until.txt') + ' 2>/dev/null)\n' +
      'f4=$(cat ' + sq(DATA_DIR + '/temp_retry_until.txt') + ' 2>/dev/null)\n' +
      'r1=0; r2=0; r3=0; left=0\n' +
      '[ "$d" = "$f1" ] && r1=1\n' +
      '[ "$m" = "$f2" ] && r2=1\n' +
      'if echo "$f3" | grep -qE \'^[0-9]+$\'; then\n' +
      '  if [ "$f3" -gt "$n" ]; then r3=1; left=$(( (f3 - n) / 60 )); fi\n' +
      'fi\n' +
      'if [ "$r3" = "0" ] && echo "$f4" | grep -qE \'^[0-9]+$\'; then\n' +
      '  if [ "$f4" -gt "$n" ]; then r3=1; left=$(( (f4 - n) / 60 )); fi\n' +
      'fi\n' +
      'echo "$r1 $r2 $r3 $left"\n' +
      'echo __R__\n' +
      'cat ' + sq(DATA_DIR + '/last_report_day.txt') + ' 2>/dev/null; echo\n' +
      'echo __M__\n' +
      'if [ -f ' + sq(BASE + '/.migrated') + ' ]; then echo NO; else ls /sdcard/ufi_monitor_alarm.conf /sdcard/ufi_monitor_alarm.log /sdcard/ufi_monitor_alarm_data /sdcard/ufi_monitor_alarm.sh >/dev/null 2>&1 && echo YES || echo NO; fi\n' +
      'echo __E__';
var text = String(outOf(await run(cmd, 9000)));
    var confPart = pick(text, '__C__', '__B__');
if (confPart) { try { applyConf(JSON.parse(confPart)); } catch (e) {} }
    var bootPart = pick(text, '__B__', '__P__');
    var pidPart = pick(text, '__P__', '__V__');
    var verPart = pick(text, '__V__', '__D__');
    var dPart = pick(text, '__D__', '__L__');
    var lPart = pick(text, '__L__', '__R__');
    var rPart = pick(text, '__R__', '__M__');
    var mPart = pick(text, '__M__', '__E__');
    state.bootOn = bootPart.indexOf('YES') >= 0;
state.installed = state.bootOn;
var pm = pidPart.match(/running\s+pid=(\d+)/);
    state.pid = pm ? pm[1] : '';
state.daemonStamp = verPart;
    var dl = String(dPart).split('\n');
    state.startedAt = parseInt(String(dl[0] || '').trim(), 10) || 0;
    state.heartbeat = parseInt(String(dl[1] || '').trim(), 10) || 0;
var lp = String(lPart).trim().split(/\s+/);
    state.lockDay = lp[0] === '1';
    state.lockMonth = lp[1] === '1';
    state.lockTemp = lp[2] === '1';
state.tempLeftMin = parseInt(lp[3], 10) || 0;
state.reportDay = String(rPart).trim();
    state.needMigrate = mPart.indexOf('YES') >= 0;
return state;
}
async function checkResetState() {
var r = await run(
      'd=$(date +%Y-%m-%d)\n' +
      'm=$(date +%Y-%m)\n' +
      'n=$(date +%s)\n' +
      'f1=$(cat ' + sq(DATA_DIR + '/notified_today.txt') + ' 2>/dev/null)\n' +
      'f2=$(cat ' + sq(DATA_DIR + '/notified_month.txt') + ' 2>/dev/null)\n' +
      'f3=$(cat ' + sq(DATA_DIR + '/temp_lock_until.txt') + ' 2>/dev/null)\n' +
      'f4=$(cat ' + sq(DATA_DIR + '/temp_retry_until.txt') + ' 2>/dev/null)\n' +
      'r1=0; r2=0; r3=0; left=0\n' +
      '[ "$d" = "$f1" ] && r1=1\n' +
      '[ "$m" = "$f2" ] && r2=1\n' +
      'if echo "$f3" | grep -qE \'^[0-9]+$\'; then\n' +
      '  if [ "$f3" -gt "$n" ]; then r3=1; left=$(( (f3 - n) / 60 )); fi\n' +
      'fi\n' +
      'if [ "$r3" = "0" ] && echo "$f4" | grep -qE \'^[0-9]+$\'; then\n' +
      '  if [ "$f4" -gt "$n" ]; then r3=1; left=$(( (f4 - n) / 60 )); fi\n' +
      'fi\n' +
      'echo "$r1 $r2 $r3 $left"', 4000);
var parts = String(outOf(r)).trim().split(/\s+/);
    state.lockDay = parts[0] === '1';
    state.lockMonth = parts[1] === '1';
    state.lockTemp = parts[2] === '1';
state.tempLeftMin = parseInt(parts[3], 10) || 0;
}
function syncResetBtns() {
var root = document.getElementById(MODAL);
if (!root) return;
    var map = [['reset-day', state.lockDay], ['reset-month', state.lockMonth], ['reset-temp', state.lockTemp]];
map.forEach(function (p) {
      var b = root.querySelector('[data-act="' + p[0] + '"]');
if (!b) return;
      if (p[1]) { b.classList.remove('uma-ghost'); b.classList.add('uma-red'); b.textContent = '重置状态'; }
      else { b.classList.remove('uma-red'); b.classList.add('uma-ghost'); b.textContent = '正常'; }
});
    var tl = root.querySelector('#uma_temp_left');
    if (tl) tl.textContent = state.lockTemp ? '温度报警已锁定，约 ' + state.tempLeftMin + ' 分钟后自动解锁' : '';
}
async function checkAdvanced() {
try {
      if (typeof checkAdvancedFunc === 'function') return await checkAdvancedFunc();
} catch (e) {}
    var r = await run('id -u 2>/dev/null || echo 1');
    return String(outOf(r)).trim().indexOf('0') === 0;
}
async function install(silent) {
    if (!(await checkAdvanced())) { toast('未开启高级功能，无法使用', 'red'); return false; }
saveLocal();
await migrateLegacy();
    await run('mkdir -p ' + sq(BASE) + ' ' + sq(DATA_DIR) + ' 2>/dev/null; echo ok');
    await run('printf %s ' + sq(JSON.stringify(state.config, null, 2)) + ' > ' + sq(CONFIG_FILE));
    if (!(await writeFileIfChanged(genScript(), SH_FILE, STAMP, BASE + '/.monitor.sum'))) {
      toast('写入守护脚本失败：三级写入均未通过校验，请重试', 'red', 6000);
return false;
}
    if (!(await writeFileIfChanged(genServiceScript(), SVC_FILE, STAMP, BASE + '/.service.sum'))) {
      toast('写入服务脚本失败：三级写入均未通过校验，请重试', 'red', 6000);
return false;
}
    var repOk = await writeFileIfChanged(genReportScript(), REPORT_FILE, STAMP, BASE + '/.report.sum');
    await run('chmod 755 ' + sq(SH_FILE) + ' ' + sq(SVC_FILE) + ' ' + sq(REPORT_FILE));
    if (!repOk) toast('日报脚本写入失败，定时推送 24 小时趋势图将不可用', 'red', 6000);
var bootOk = await installBootHook(true);
if (!bootOk) {
      toast('开机自启写入失败，请检查 ' + BOOT_SH_FILE + ' 是否可写', 'red', 6000);
return false;
}
await killProc();
await syncApiSnapshot();
    await run(sq(SVC_FILE) + ' start 2>&1; echo "rc=$?"', 20000);
await sleep(800);
var st = await daemonStatus();
    state.pid = st.on ? st.pid : '';
state.installed = true;
state.bootOn = await bootHookOn();
lastStartAt = Date.now();
if (!silent) {
      if (state.pid) toast('已启用，PID=' + state.pid + '，开机自启已写入');
      else toast('进程启动后立即退出，请再点一次', 'red', 5000);
}
return true;
}
async function uninstall() {
    if (!(await checkAdvanced())) { toast('未开启高级功能，无法使用', 'red'); return false; }
await installBootHook(false);
await killProc();
    await run('rm -rf ' + sq(CLAIM_DIR) + ' ' + sq(SH_FILE) + ' ' + sq(SVC_FILE) + ' ' + sq(REPORT_FILE) + ' ' + sq(DATA_DIR) + ' ' + sq(PID_FILE) + ' ' + sq(BASE) + '/start.lock');
state.installed = false;
    state.pid = '';
state.bootOn = false;
state.lockDay = state.lockMonth = state.lockTemp = false;
    toast('监测守护已停用');
return true;
}
var lastStartAt = 0;
async function ensureDaemon(force) {
if (state.pid && !force) return;
if (!state.installed) return; 
if (Date.now() - lastStartAt < 15000) return;
lastStartAt = Date.now();
    await run(sq(SVC_FILE) + ' start >/dev/null 2>&1; echo ok', 20000);
var st = await daemonStatus();
    state.pid = st.on ? st.pid : '';
if (st.on) { lastStartAt = Date.now(); }
}
async function selfHealOnce() {
try {
if (state.installed && !state.bootOn) {
await installBootHook(true);
state.bootOn = await bootHookOn();
}
await ensureDaemon(false);
    } catch (e) { console.warn('[设备监测报警] 自愈检查失败', e); }
}
var logBusy = false;
function annotateLog(text) {
    var lines = String(text).split('\n');
var out = [];
var prev = 0;
lines.forEach(function (ln) {
var m = ln.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
if (m) {
var t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) / 1000;
if (prev && prev - t > 120) {
var mins = Math.round((prev - t) / 60);
          var txt = mins >= 1440 ? Math.round(mins / 1440) + ' 天' : (mins >= 60 ? Math.round(mins / 60) + ' 小时' : mins + ' 分钟');
          out.push('──────── 系统时间回拨 ' + txt + '（NTP 校时 / 设备重启），以上为校时前记录 ────────');
}
prev = t;
}
out.push(ln);
});
    return out.join('\n');
}
async function loadLog() {
    var el = document.querySelector('#uma_log');
if (!el || logBusy) return;
logBusy = true;
try {
      var r = await run('[ -f ' + sq(LOG_FILE) + ' ] && tail -80 ' + sq(LOG_FILE) + ' || echo "(暂无日志)"', 5000);
el.value = annotateLog(String(outOf(r)).trim());
el.scrollTop = el.scrollHeight;
} finally { logBusy = false; }
}
function setAuto(on) {
if (state.autoTimer) { clearInterval(state.autoTimer); state.autoTimer = null; }
state.autoLog = !!(on && state.pid);
state.autoTick = 0;
if (state.autoLog) {
state.autoTimer = setInterval(async function () {
if (!document.getElementById(MODAL) || !state.pid) { setAuto(false); return; }
await loadLog();
state.autoTick++;
if (state.autoTick % 8 === 0) {
await probeNow();
          var a = state.lockDay + '|' + state.lockMonth + '|' + state.lockTemp;
await checkResetState();
          if (a !== state.lockDay + '|' + state.lockMonth + '|' + state.lockTemp) syncResetBtns();
}
}, 4000);
}
    var btn = document.getElementById('uma_auto');
    if (btn) btn.textContent = state.autoLog ? '停止刷新' : '自动刷新';
}
function jesc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/\\/g, ' ').replace(/"/g, ' ');
}
async function testPush() {
var c = state.config;
    if (!c.pushPlusToken) { toast('请先填写 PushPlus Token', 'red'); return; }
var sel = chList();
    if (!sel.length) { toast('请先选择至少一个推送渠道', 'red'); return; }
var bad = chIssues();
    if (bad.length) { toast('请先填写：' + bad.join('、') + ' 的渠道编码', 'red', 6000); return; }
    var btn = document.getElementById('uma_test');
    if (btn) { btn.disabled = true; btn.textContent = '发送中...'; }
try {
var tp = await run(TEMP_PROBE_SH, 5000);
      var tmc = parseInt(String(outOf(tp)).trim().split('\n')[0], 10);
      var t = isNaN(tmc) || tmc <= 0 ? '未知' : fmtTemp(tmc) + ' ℃';
var j = chJoin();
      var ct = '<b>这是一条测试消息</b><br>时间 ' + new Date().toLocaleString() +
        '<br>当前温度 ' + t + '<br>渠道 ' + esc(chNames(sel).join('、')) +
        '<br>收到这条消息说明 Token 与各渠道编码配置正确。';
      var body = '{"token":"' + c.pushPlusToken + '","title":"设备监测报警-测试","content":"' + jesc(ct) +
        '","channel":"' + j.ch + '"' + (j.opt ? ',"option":"' + j.opt + '"' : '') + ',"template":"html"}';
      await run('mkdir -p ' + sq(DATA_DIR) + ' && printf %s ' + sq(body) + ' > ' + sq(DATA_DIR + '/pp_body.json'));
var out = await run(
        'CURL="/data/data/com.minikano.f50_sms/files/curl"; [ ! -x "$CURL" ] && CURL="curl"; $CURL -s --connect-timeout 10 --max-time 30 -X POST "https://www.pushplus.plus/batchSend" -H "Content-Type: application/json" -d @' +
        sq(DATA_DIR + '/pp_body.json'), 30000);
var o = String(outOf(out));
      if (o.indexOf('"code":200') >= 0) toast('测试消息已发送，请到 ' + chNames(sel).join('、') + ' 查收', 'green', 5000);
      else toast('发送失败：' + o.slice(0, 120), 'red', 6000);
} catch (e) {
      toast('测试异常：' + e.message, 'red', 6000);
} finally {
      if (btn) { btn.disabled = false; btn.textContent = '测试推送'; }
}
}
function renderChOpts() {
var root = document.getElementById(MODAL);
if (!root) return;
    var box = root.querySelector('#uma_ch_opts');
if (!box) return;
var sel = chList();
    var html = '';
PP_CHANNELS.forEach(function (d) {
if (!d.opt || sel.indexOf(d.id) < 0) return;
var req = d.opt === 1;
      html += '<div class="uma-row" style="margin-top:5px">' +
        '<span class="uma-label">' + esc(d.short || d.name) + '编码</span>' +
        '<input class="uma-txt" data-field="opt_' + d.id + '" type="text" value="' + esc(chOptOf(d.id)) + '" ' +
        'placeholder="' + (req ? '必填，后台渠道编码' : '可选，留空用默认') + '">' +
        '</div>';
});
box.innerHTML = html;
syncChSum();
}
function chShowTip(id) {
var root = document.getElementById(MODAL);
if (!root) return;
    var el = root.querySelector('#uma_ch_tip');
if (!el) return;
var d = chDef(id);
    if (!d) { el.textContent = ''; return; }
var on = chList().indexOf(id) >= 0;
var tip = d.tip;
    if (d.opt === 1) tip += '；编码必填';
    else if (d.opt === 2) tip += '；编码可留空';
    el.textContent = (on ? '✓ ' : '') + d.name + '：' + tip;
    el.style.color = on ? '' : 'rgba(255,255,255,.35)';
}
function syncChSum() {
var root = document.getElementById(MODAL);
if (!root) return;
    var el = root.querySelector('#uma_ch_sum');
if (!el) return;
var sel = chList();
if (!sel.length) {
      el.textContent = '未选择渠道，报警与日报都不会推送';
      el.style.color = '#fca5a5';
return;
}
var bad = chIssues();
    el.textContent = '已选 ' + sel.length + ' 个：' + chNames(sel).join('、') + '（同时推送）';
if (bad.length) {
      el.textContent += '　✗ ' + bad.join('、') + ' 缺渠道编码';
      el.style.color = '#fca5a5';
} else {
      el.style.color = '';
}
}
function render() {
var c = state.config;
var on = !!state.pid;
    var upTxt = '';
    var hbTip = '';
if (on && state.startedAt) {
      upTxt = '　<span style="opacity:.55">已运行 ' + esc(fmtDur(Math.floor(Date.now() / 1000) - state.startedAt)) + '</span>';
}
if (on && state.heartbeat) {
var lag = Math.floor(Date.now() / 1000) - state.heartbeat;
      if (lag > 200) hbTip = '<div class="uma-tip" style="margin-top:3px">⚠ 最后心跳在 ' + esc(fmtDur(lag)) + '前，守护可能已卡住或被系统回收</div>';
}
    return '' +
      '<div class="uma-wrap">' +
        '<div class="uma-card">' +
          '<div class="uma-card-t">' +
            '<span style="font-size:.75rem;font-weight:600">设备监测报警</span>' +
            '<button class="uma-btn ' + (on ? 'uma-stop' : 'uma-on') + '" data-act="toggle"' + (state.ready ? '' : ' disabled') + '>' +
              (on ? '<span class="uma-dot" style="background:#4ade80"></span>运行中' : '<span class="uma-dot" style="background:rgba(255,255,255,.32)"></span>已停止') +
            '</button>' +
          '</div>' +
          '<div class="uma-help">每 60 秒检测当日/当月流量与 CPU 温度，超限后经 PushPlus 已勾选的渠道同时推送。限额填 0 即关闭该项。(本插件由元宝AI生成)</div>' +
          '<div class="uma-ok" style="margin-top:4px">' +
            (!state.ready ? '<span style="opacity:.6">状态检测中…</span>'
              : (on ? '守护进程 PID=' + esc(state.pid) + upTxt
                    : '<span style="color:#f87171;opacity:.9">守护进程未运行</span>')) +
          '</div>' +
hbTip +
          '<div class="uma-help" style="margin-top:3px;color:' + (state.bootOn ? '#86efac' : '#fbbf24') + ';opacity:.85">' +
            (state.bootOn ? '✓ 开机自启已启用' : '⚠ 开机自启未启用') +
            '　<span style="opacity:.6">' + esc(BOOT_SH_FILE) + '</span>' +
          '</div>' +
(state.installed && !on
            ? '<div class="uma-tip" style="margin-top:3px">已部署但守护未运行，点下方「重启守护」即可拉起</div>'
            : '') +
          '<div class="uma-div"></div>' +
          '<div class="uma-row" style="justify-content:space-between;margin-bottom:6px">' +
            '<b style="font-size:.68rem;font-weight:600">实时数据</b>' +
            '<span style="display:flex;gap:5px">' +
              '<button class="uma-btn uma-ghost" style="padding:4px 9px;font-size:.6rem" data-act="refresh">刷新</button>' +
              '<button class="uma-btn uma-blue" style="padding:4px 9px;font-size:.6rem" data-act="chart">CPU 温度图</button>' +
            '</span>' +
          '</div>' +
          '<div class="uma-live" id="uma_live"></div>' +
          '<div class="uma-help" id="uma_live_at" style="margin-top:5px"></div>' +
          '<div class="uma-div"></div>' +
          '<div class="uma-row">' +
            '<span class="uma-label">当日限额</span>' +
            '<input class="uma-input" data-field="dailyLimit" type="number" step="0.1" min="0" value="' + esc(c.dailyLimit) + '">' +
            '<span class="uma-unit">GB 超限报警 (0=关闭)</span>' +
            '<button class="uma-btn ' + (state.lockDay ? 'uma-red' : 'uma-ghost') + '" style="padding:4px 9px;font-size:.6rem;margin-left:auto" data-act="reset-day">' + (state.lockDay ? '重置状态' : '正常') + '</button>' +
          '</div>' +
          '<div class="uma-row">' +
            '<span class="uma-label">当月限额</span>' +
            '<input class="uma-input" data-field="monthlyLimit" type="number" step="0.1" min="0" value="' + esc(c.monthlyLimit) + '">' +
            '<span class="uma-unit">GB 超限报警 (0=关闭)</span>' +
            '<button class="uma-btn ' + (state.lockMonth ? 'uma-red' : 'uma-ghost') + '" style="padding:4px 9px;font-size:.6rem;margin-left:auto" data-act="reset-month">' + (state.lockMonth ? '重置状态' : '正常') + '</button>' +
          '</div>' +
          '<div class="uma-row">' +
            '<span class="uma-label">温度限额</span>' +
            '<input class="uma-input" data-field="tempLimit" type="number" step="0.5" min="0" value="' + esc(c.tempLimit) + '">' +
            '<span class="uma-unit">℃ 超限报警 (0=关闭)</span>' +
            '<button class="uma-btn ' + (state.lockTemp ? 'uma-red' : 'uma-ghost') + '" style="padding:4px 9px;font-size:.6rem;margin-left:auto" data-act="reset-temp">' + (state.lockTemp ? '重置状态' : '正常') + '</button>' +
          '</div>' +
          '<div class="uma-tip" id="uma_temp_left"></div>' +
          '<div class="uma-div"></div>' +
          '<div class="uma-row">' +
            '<span class="uma-label">Token</span>' +
            '<input class="uma-txt" data-field="pushPlusToken" type="text" value="' + esc(c.pushPlusToken) + '" placeholder="PushPlus Token">' +
          '</div>' +
          '<div class="uma-chblk">' +
            '<div class="uma-cht">' +
              '<b>推送渠道</b>' +
              '<span class="uma-unit" style="min-width:auto">可多选</span>' +
            '</div>' +
            '<div class="uma-chs">' +
PP_CHANNELS.map(function (d) {
var sel = chList().indexOf(d.id) >= 0;
                return '<span class="uma-ch' + (sel ? ' sel' : '') + '" data-ch="' + d.id + '">' +
                       esc(d.short || d.name) + (d.opt === 1 ? '<span style="color:#fca5a5">*</span>' : '') + '</span>';
              }).join('') +
            '</div>' +
            '<div id="uma_ch_opts"></div>' +
            '<div class="uma-help" id="uma_ch_sum" style="margin:4px 0 0"></div>' +
            '<div class="uma-chtip" id="uma_ch_tip"></div>' +
          '</div>' +
          '<div class="uma-row" style="justify-content:flex-end;margin-top:6px">' +
            '<button class="uma-btn uma-ghost" id="uma_test">测试推送</button>' +
          '</div>' +
          '<div class="uma-div"></div>' +
          '<div class="uma-row">' +
            '<span class="uma-label">免打扰</span>' +
            '<input type="checkbox" data-field="dndEnabled" ' + (c.dndEnabled ? 'checked' : '') + ' style="width:15px;height:15px">' +
            '<span class="uma-unit">时段内不推送任何报警</span>' +
          '</div>' +
          '<div class="uma-row">' +
            '<span class="uma-label">开始</span>' +
            '<input class="uma-input" data-field="dndStart" type="time" value="' + esc(c.dndStart) + '" style="width:88px">' +
            '<span class="uma-label" style="min-width:auto">结束</span>' +
            '<input class="uma-input" data-field="dndEnd" type="time" value="' + esc(c.dndEnd) + '" style="width:88px">' +
            '<span class="uma-unit">支持跨午夜，如 23:00 到 07:00</span>' +
          '</div>' +
          '<div class="uma-div"></div>' +
          '<div class="uma-row" style="justify-content:space-between">' +
            '<b style="font-size:.68rem;font-weight:600">24 小时温度日报</b>' +
            '<span style="display:flex;gap:5px">' +
              '<span class="uma-unit" id="uma_report_state" style="opacity:.6"></span>' +
              '<button class="uma-btn uma-ghost" style="padding:4px 9px;font-size:.6rem" data-act="report-now">立即推送</button>' +
            '</span>' +
          '</div>' +
          '<div class="uma-help" style="margin:1px 0 6px">每天在指定时刻推送一张最近 24 小时的 CPU 温度趋势图（5 分钟/点，含最高/最低/平均与超阈值时长）。该时刻必须落在免打扰时段之外。</div>' +
          '<div class="uma-row">' +
            '<span class="uma-label">定时推送</span>' +
            '<input type="checkbox" data-field="reportEnabled" ' + (c.reportEnabled ? 'checked' : '') + ' style="width:15px;height:15px">' +
            '<span class="uma-unit">开启后每天推送一次</span>' +
          '</div>' +
          '<div class="uma-row">' +
            '<span class="uma-label">推送时刻</span>' +
            '<input class="uma-input" data-field="reportTime" type="time" value="' + esc(c.reportTime) + '" style="width:88px">' +
            '<span class="uma-unit" id="uma_report_hint"></span>' +
          '</div>' +
          '<div class="uma-tip" id="uma_report_tip"></div>' +
          '<div class="uma-row" style="margin-top:8px;flex-wrap:wrap;gap:6px">' +
            '<button class="uma-btn uma-ghost" data-act="rebuild" style="margin-right:auto">重建守护</button>' +
            '<button class="uma-btn ' + (on ? 'uma-ghost' : 'uma-on') + '" data-act="start">重启守护</button>' +
            '<button class="uma-btn ' + (state.bootOn ? 'uma-ghost' : 'uma-ghost') + '" data-act="boot">' +
              (state.bootOn ? '关闭自启' : '开启自启') + '</button>' +
            '<button class="uma-btn uma-blue" data-act="save">保存配置</button>' +
          '</div>' +
        '</div>' +
        '<div class="uma-card">' +
          '<div class="uma-card-t">' +
            '<b style="font-size:.75rem">运行日志</b>' +
            '<span class="uma-row" style="gap:5px">' +
              '<button class="uma-btn uma-ghost" style="padding:4px 9px;font-size:.62rem" id="uma_auto"' + (on ? '' : ' disabled') + '>自动刷新</button>' +
              '<button class="uma-btn uma-ghost" style="padding:4px 9px;font-size:.62rem" data-act="logrefresh">刷新</button>' +
              '<button class="uma-btn uma-ghost" style="padding:4px 9px;font-size:.62rem" data-act="clear">清空</button>' +
            '</span>' +
          '</div>' +
          '<textarea id="uma_log" class="uma-log" readonly></textarea>' +
        '</div>' +
      '</div>';
}
function syncForm() {
var root = document.getElementById(MODAL);
if (!root) return;
    var g = function (f) { return root.querySelector('[data-field="' + f + '"]'); };
    var d = g('dailyLimit'), m = g('monthlyLimit'), t = g('tempLimit');
    var tok = g('pushPlusToken');
    var dnd = g('dndEnabled'), ds = g('dndStart'), de = g('dndEnd');
if (d) { var nv = parseFloat(d.value); if (!isNaN(nv) && nv >= 0) state.config.dailyLimit = nv; }
if (m) { var mv = parseFloat(m.value); if (!isNaN(mv) && mv >= 0) state.config.monthlyLimit = mv; }
if (t) { var tv = parseFloat(t.value); if (!isNaN(tv) && tv >= 0) state.config.tempLimit = tv; }
if (tok) state.config.pushPlusToken = tok.value.trim();
PP_CHANNELS.forEach(function (d) {
if (!d.opt) return;
      var el = g('opt_' + d.id);
      if (el) state.config['opt_' + d.id] = el.value.trim();
});
if (dnd) state.config.dndEnabled = !!dnd.checked;
    if (ds) state.config.dndStart = ds.value || '23:00';
    if (de) state.config.dndEnd = de.value || '07:00';
    var re = g('reportEnabled'), rt = g('reportTime');
if (re) state.config.reportEnabled = !!re.checked;
    if (rt) state.config.reportTime = rt.value || '08:00';
saveLocal();
syncReportHint();
}
function todayStr() {
var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
function syncReportHint() {
var root = document.getElementById(MODAL);
if (!root) return;
    var hint = root.querySelector('#uma_report_hint');
    var tip = root.querySelector('#uma_report_tip');
    var st = root.querySelector('#uma_report_state');
var c = state.config;
var conflict = reportConflict();
if (hint) {
if (!c.reportEnabled) {
        hint.textContent = '未启用定时推送';
        hint.style.color = '';
        hint.style.opacity = '.45';
} else if (conflict) {
        hint.textContent = '✗ 与免打扰冲突';
        hint.style.color = '#fca5a5';
        hint.style.opacity = '.95';
} else {
        hint.textContent = '✓ 每天 ' + esc(c.reportTime) + ' 推送';
        hint.style.color = '#86efac';
        hint.style.opacity = '.9';
}
}
    if (tip) tip.textContent = conflict || '';
if (st) {
      if (!c.reportEnabled) st.textContent = '';
      else if (state.reportDay && state.reportDay === todayStr()) st.textContent = '今日已推送';
      else st.textContent = '今日待推送';
}
}
function buildChartSVG(pts, limit, rangeLabel, t0, t1) {
    if (!pts.length) return '';
var W = 640, H = 300, L = 52, R = 16, T = 30, B = 46;
var pw = W - L - R, ph = H - T - B;
if (!(t1 > t0)) { t0 = pts[0].ts; t1 = pts[pts.length - 1].ts; }
if (t1 <= t0) t1 = t0 + 60;
var vmax = -Infinity, vmin = Infinity, i;
for (i = 0; i < pts.length; i++) {
if (pts[i].v > vmax) vmax = pts[i].v;
if (pts[i].v < vmin) vmin = pts[i].v;
}
if (limit > 0) { if (limit > vmax) vmax = limit; if (limit < vmin) vmin = limit; }
var span = vmax - vmin;
if (span < 3000) { var mid = (vmax + vmin) / 2; vmin = mid - 1500; vmax = mid + 1500; span = 3000; }
vmin -= span * 0.15; vmax += span * 0.15; span = vmax - vmin;
var fx = function (ts) { return L + (ts - t0) / (t1 - t0) * pw; };
var fy = function (v) { return T + ph - (v - vmin) / span * ph; };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="max-width:640px;background:#0f172a;border-radius:8px">';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#0f172a" rx="8"/>';
    s += '<text x="' + L + '" y="19" fill="#e2e8f0" font-size="13">CPU 温度趋势 · ' + esc(rangeLabel) + ' · ' + pts.length + ' 个采样点</text>';
var g, vv, yy;
for (g = 0; g <= 4; g++) {
vv = vmin + span * g / 4;
yy = T + ph - ph * g / 4;
      s += '<line x1="' + L + '" y1="' + yy.toFixed(1) + '" x2="' + (L + pw) + '" y2="' + yy.toFixed(1) + '" stroke="#1e293b" stroke-width="1"/>';
      s += '<text x="' + (L - 8) + '" y="' + (yy + 4).toFixed(1) + '" fill="#94a3b8" font-size="10" text-anchor="end">' + (vv / 1000).toFixed(1) + '</text>';
}
if (limit > 0 && limit >= vmin && limit <= vmax) {
var ly = fy(limit);
      s += '<line x1="' + L + '" y1="' + ly.toFixed(1) + '" x2="' + (L + pw) + '" y2="' + ly.toFixed(1) + '" stroke="#ef4444" stroke-width="1" stroke-dasharray="5,4"/>';
      s += '<text x="' + (L + pw) + '" y="' + (ly - 5).toFixed(1) + '" fill="#f87171" font-size="10" text-anchor="end">阈值 ' + (limit / 1000).toFixed(2) + ' ℃</text>';
}
var step = pts.length > 240 ? Math.ceil(pts.length / 240) : 1;
var poly = [];
    for (i = 0; i < pts.length; i += step) poly.push(fx(pts[i].ts).toFixed(1) + ',' + fy(pts[i].v).toFixed(1));
var last = pts[pts.length - 1];
    var lp = fx(last.ts).toFixed(1) + ',' + fy(last.v).toFixed(1);
if (poly[poly.length - 1] !== lp) poly.push(lp);
    s += '<polyline points="' + poly.join(' ') + '" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linejoin="round"/>';
if (limit > 0) {
for (i = 0; i < pts.length; i += step) {
if (pts[i].v >= limit) {
          s += '<circle cx="' + fx(pts[i].ts).toFixed(1) + '" cy="' + fy(pts[i].v).toFixed(1) + '" r="2.2" fill="#ef4444"/>';
}
}
}
    s += '<circle cx="' + fx(last.ts).toFixed(1) + '" cy="' + fy(last.v).toFixed(1) + '" r="3.4" fill="#fbbf24"/>';
    s += '<text x="' + L + '" y="' + (H - 15) + '" fill="#94a3b8" font-size="10">' + esc(shortTime(t0)) + '</text>';
    s += '<text x="' + (L + pw) + '" y="' + (H - 15) + '" fill="#94a3b8" font-size="10" text-anchor="end">' + esc(shortTime(t1)) + ' 现在</text>';
    s += '<text x="' + (L - 8) + '" y="' + (H - 26) + '" fill="#64748b" font-size="9" text-anchor="end">℃</text>';
    s += '</svg>';
return s;
}
function buildBarChartSVG(bks, limit, rangeLabel, t0, t1) {
    if (!bks.length) return '';
var W = 640, H = 300, L = 52, R = 16, T = 30, B = 46;
var pw = W - L - R, ph = H - T - B;
if (!(t1 > t0)) { t0 = bks[0].ts; t1 = bks[bks.length - 1].ts + AGG_BUCKET; }
if (t1 <= t0) t1 = t0 + AGG_BUCKET;
var vmax = -Infinity, vmin = Infinity, i;
for (i = 0; i < bks.length; i++) {
if (bks[i].max > vmax) vmax = bks[i].max;
if (bks[i].min < vmin) vmin = bks[i].min;
}
if (limit > 0) { if (limit > vmax) vmax = limit; if (limit < vmin) vmin = limit; }
var span = vmax - vmin;
if (span < 3000) { var mid = (vmax + vmin) / 2; vmin = mid - 1500; vmax = mid + 1500; span = 3000; }
vmin -= span * 0.15; vmax += span * 0.15; span = vmax - vmin;
var nb = bks.length;
var slot = pw * AGG_BUCKET / (t1 - t0);
var bw = Math.max(1.1, Math.min(slot * 0.62, 13));
var fx = function (ts) { return L + (ts - t0) / (t1 - t0) * pw; };
var fy = function (v) { return T + ph - (v - vmin) / span * ph; };
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="max-width:640px;background:#0f172a;border-radius:8px">';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#0f172a" rx="8"/>';
    s += '<text x="' + L + '" y="19" fill="#e2e8f0" font-size="13">CPU 温度趋势 · ' + esc(rangeLabel) + ' · 5 分钟/点 · ' + nb + ' 个点</text>';
var g, vv, yy;
for (g = 0; g <= 4; g++) {
vv = vmin + span * g / 4;
yy = T + ph - ph * g / 4;
      s += '<line x1="' + L + '" y1="' + yy.toFixed(1) + '" x2="' + (L + pw) + '" y2="' + yy.toFixed(1) + '" stroke="#1e293b" stroke-width="1"/>';
      s += '<text x="' + (L - 8) + '" y="' + (yy + 4).toFixed(1) + '" fill="#94a3b8" font-size="10" text-anchor="end">' + (vv / 1000).toFixed(1) + '</text>';
}
if (limit > 0 && limit >= vmin && limit <= vmax) {
var ly = fy(limit);
      s += '<line x1="' + L + '" y1="' + ly.toFixed(1) + '" x2="' + (L + pw) + '" y2="' + ly.toFixed(1) + '" stroke="#ef4444" stroke-width="1" stroke-dasharray="5,4"/>';
      s += '<text x="' + (L + pw) + '" y="' + (ly - 5).toFixed(1) + '" fill="#f87171" font-size="10" text-anchor="end">阈值 ' + (limit / 1000).toFixed(2) + ' ℃</text>';
}
var poly = [], x, y1, y2, h;
for (i = 0; i < nb; i++) {
x = fx(bks[i].ts + AGG_BUCKET / 2);   
y1 = fy(bks[i].max);
y2 = fy(bks[i].min);
h = Math.max(1, y2 - y1);
var hot = limit > 0 && bks[i].avg >= limit;
      s += '<rect x="' + (x - bw / 2).toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) +
           '" rx="' + (bw > 4 ? 1.5 : 0) + '" fill="' + (hot ? '#ef4444' : '#38bdf8') + '" opacity="' + (hot ? '.85' : '.5') + '"/>';
      poly.push(x.toFixed(1) + ',' + fy(bks[i].avg).toFixed(1));
}
    s += '<polyline points="' + poly.join(' ') + '" fill="none" stroke="#fbbf24" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>';
var li = nb - 1;
    s += '<circle cx="' + fx(bks[li].ts + AGG_BUCKET / 2).toFixed(1) + '" cy="' + fy(bks[li].avg).toFixed(1) + '" r="3.4" fill="#fbbf24"/>';
for (i = 0; i <= 8; i++) {
var tk = t0 + (t1 - t0) * i / 8;
var lb = shortTime(tk);
      var anchor = 'middle', tx = fx(tk);
      if (i === 0) { anchor = 'start'; tx = L; lb = mdTime(tk); }
      if (i === 8) { anchor = 'end'; tx = L + pw; }
      s += '<text x="' + tx.toFixed(1) + '" y="' + (H - 26) + '" fill="#94a3b8" font-size="9" text-anchor="' + anchor + '">' + lb + '</text>';
}
    s += '<text x="' + L + '" y="' + (H - 8) + '" fill="#94a3b8" font-size="10">-' + esc(String(state.chartRange)) + ' 小时</text>';
    s += '<text x="' + (L + pw) + '" y="' + (H - 8) + '" fill="#94a3b8" font-size="10" text-anchor="end">现在</text>';
    s += '<text x="' + (L - 8) + '" y="' + (H - 26) + '" fill="#64748b" font-size="9" text-anchor="end">℃</text>';
    s += '<text x="' + (L + pw / 2).toFixed(0) + '" y="' + (H - 8) + '" fill="#64748b" font-size="9" text-anchor="middle">柱体=该 5 分钟最低~最高　折线=区间均值</text>';
    s += '</svg>';
return s;
}
function validTemp(v) { return v >= 20000 && v <= 124000; }
function parseChartPayload(txt) {
var res = { now: 0, samples: [], agg: [] };
    var seg = 'now';
    String(txt || '').split('\n').forEach(function (ln) {
      var s = String(ln).replace(/\r/g, '').trim();
      if (s === '#S#') { seg = 's'; return; }
      if (s === '#A#') { seg = 'a'; return; }
if (!s) return;
var p = s.split(/\s+/);
      if (seg === 'now') {
var n0 = parseInt(p[0], 10);
if (!isNaN(n0) && n0 > 1000000000) res.now = n0;
return;
}
if (p.length < 2) return;
var ts = parseInt(p[0], 10);
if (isNaN(ts) || ts <= 0) return;
      if (seg === 's') {
var v = parseFloat(p[1]);
if (isNaN(v)) return;
if (!validTemp(v)) return;
res.samples.push({ ts: ts, v: v });
} else {
if (p.length < 4) return;
var avg = parseFloat(p[1]), mx = parseFloat(p[2]), mn = parseFloat(p[3]);
var n = p.length > 4 ? parseInt(p[4], 10) : 1;
if (isNaN(avg) || isNaN(mx) || isNaN(mn)) return;
if (mn > mx) { var t = mn; mn = mx; mx = t; }
if (!validTemp(avg) || mn < 0 || mx > 124000) return;
res.agg.push({ ts: ts, avg: avg, max: mx, min: mn, n: isNaN(n) || n < 1 ? 1 : n });
}
});
res.samples.sort(function (a, b) { return a.ts - b.ts; });
res.agg.sort(function (a, b) { return a.ts - b.ts; });
return res;
}
function chartLines(useAgg, span) {
var unit = useAgg ? AGG_BUCKET : 60;
var need = Math.ceil(span / unit);
need = useAgg ? need + 6 : Math.ceil(need * 1.2) + 30;
var cap = useAgg ? AGG_KEEP : SAMPLE_KEEP;
return need > cap ? cap : need;
}
async function loadChartData(mode, span) {
    var isAgg = (mode === 'agg');
    var sep = isAgg ? '#A#' : '#S#';
var file = isAgg ? AGG5_FILE : SAMPLE_FILE;
    var cmd = "date +%s 2>/dev/null; echo " + sq(sep) +
              "; tail -n " + chartLines(isAgg, span) + " " + sq(file) + " 2>/dev/null";
var d = parseChartPayload(outOf(await run(cmd, 9000)));
if (!d.now) d.now = Math.floor(Date.now() / 1000);
return d;
}
function mergeBuckets(samples, agg, from, to) {
var map = {}, fromAgg = 0, fromRaw = 0, k;
agg.forEach(function (a) {
if (a.ts < from || a.ts > to) return;
      map[a.ts] = { ts: a.ts, avg: a.avg, max: a.max, min: a.min, n: a.n, src: 'agg' };
});
samples.forEach(function (s) {
var b = Math.floor(s.ts / AGG_BUCKET) * AGG_BUCKET;
if (b < from || b > to) return;
var cur = map[b];
if (cur) {
        if (cur.src === 'agg') return;   
cur.sum += s.v; cur.n++;
if (s.v > cur.max) cur.max = s.v;
if (s.v < cur.min) cur.min = s.v;
} else {
        map[b] = { ts: b, sum: s.v, n: 1, max: s.v, min: s.v, src: 'raw' };
}
});
var out = [];
for (k in map) {
if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
var b2 = map[k];
      if (b2.src === 'agg') { fromAgg++; out.push(b2); }
      else { fromRaw++; out.push({ ts: b2.ts, avg: Math.round(b2.sum / b2.n), max: b2.max, min: b2.min, n: b2.n, src: 'raw' }); }
}
out.sort(function (a, b) { return a.ts - b.ts; });
return { list: out, fromAgg: fromAgg, fromRaw: fromRaw };
}
function shortTime(ts) {
var d = new Date(ts * 1000);
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function mdTime(ts) {
var d = new Date(ts * 1000);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + shortTime(ts);
}
function cnTime(ts) {
var d = new Date(ts * 1000);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + shortTime(ts);
}
function coverHint(coverSec, wantSec, lastTs, devNow) {
var thin = coverSec < wantSec * 0.85;
var stale = devNow - lastTs > 300;
    if (!thin && !stale) return '';
    var msg = '';
    if (thin) msg += '数据实际只覆盖 ' + fmtDur(coverSec) + '（所选 ' + fmtDur(wantSec) + '）';
    if (stale) msg += (msg ? '；' : '') + '最新数据距今 ' + fmtDur(devNow - lastTs);
    return '<br><span style="color:#fca5a5">⚠ ' + esc(msg) +
      '：守护可能刚重启、系统时钟刚校时，或采样回传被截断</span>';
}
function emptyChart(box, stat, info, msg) {
    box.innerHTML = '<div style="padding:26px 10px;text-align:center;font-size:.66rem;opacity:.6;line-height:1.7">' +
      (msg ? esc(msg) : '暂无温度采样数据') +
      '<br>采样由设备端守护进程每 60 秒写入一次' +
      (msg ? '' : '<br>请先启动守护并等待至少一个采集周期') + '</div>';
    if (stat) stat.innerHTML = '';
    if (info) info.textContent = '';
}
function statCard(k, v, hot) {
    return '<div class="uma-sc"><div class="uma-sc-k">' + k + '</div><div class="uma-sc-v' + (hot ? ' hot' : '') + '">' + v + '</div></div>';
}
async function renderChart() {
var root = document.getElementById(CHART);
if (!root) return;
    var box = root.querySelector('#uma_chart_box');
    var stat = root.querySelector('#uma_chart_stat');
    var info = root.querySelector('#uma_chart_info');
if (!box) return;
    box.innerHTML = '<div style="padding:26px 0;text-align:center;font-size:.68rem;opacity:.5">读取中...</div>';
var rangeH = state.chartRange > 0 ? state.chartRange : 24;
var span = rangeH * 3600;
var hwNow = Math.floor(Date.now() / 1000);
var useAgg = rangeH >= AGG_FROM_HOURS;
    var mode = useAgg ? 'agg' : 'raw';
var d = await loadChartData(mode, span);
var devNow = d.now > 0 ? d.now : hwNow;
var all = d.samples.filter(function (p) { return p.ts <= devNow + 120; });
var agg = d.agg.filter(function (a) { return a.ts <= devNow + 120; });
state.samples = all;
state.agg = agg;
var t1 = devNow;
var t0 = devNow - span;
var limit = state.config.tempLimit;
var limMc = limit > 0 ? limit * 1000 : 0;
    var label = '最近 ' + rangeH + ' 小时';
if (!all.length && !agg.length) { emptyChart(box, stat, info); return; }
if (useAgg) {
var bfrom = Math.floor(t0 / AGG_BUCKET) * AGG_BUCKET;
var m = mergeBuckets(all, agg, bfrom, t1);
var bks = m.list;
if (!bks.length) {
        emptyChart(box, stat, info, '最近 ' + rangeH + ' 小时内没有可用的温度数据' +
          (all.length ? '（最新采样在 ' + cnTime(all[all.length - 1].ts) + '）' : ''));
return;
}
var bmx = -Infinity, bmn = Infinity, wsum = 0, wcnt = 0, i;
for (i = 0; i < bks.length; i++) {
if (bks[i].max > bmx) bmx = bks[i].max;
if (bks[i].min < bmn) bmn = bks[i].min;
wsum += bks[i].avg * bks[i].n;
wcnt += bks[i].n;
}
var bavg = wcnt ? wsum / wcnt : bks[bks.length - 1].avg;
var bcur = bks[bks.length - 1].avg;
box.innerHTML = buildBarChartSVG(bks, limMc, label, t0, t1);
if (stat) {
stat.innerHTML =
          statCard('当前', (bcur / 1000).toFixed(2) + ' ℃', limMc > 0 && bcur >= limMc) +
          statCard('最高', (bmx / 1000).toFixed(2) + ' ℃', limMc > 0 && bmx >= limMc) +
          statCard('最低', (bmn / 1000).toFixed(2) + ' ℃', false) +
          statCard('平均', (bavg / 1000).toFixed(2) + ' ℃', limMc > 0 && bavg >= limMc);
}
if (info) {
var bLast = bks[bks.length - 1].ts + AGG_BUCKET;
        info.innerHTML = '共 ' + bks.length + ' 个 5 分钟点，' + esc(cnTime(bks[0].ts)) + ' 起至 ' + esc(cnTime(bks[bks.length - 1].ts)) +
          '<br>数据来源：守护聚合 ' + m.fromAgg + ' 点' + (m.fromRaw ? ' ＋ 原始采样降采样 ' + m.fromRaw + ' 点' : '') +
          '（守护滚动保留最近 ' + SAMPLE_KEEP + ' 条原始采样 / ' + AGG_KEEP + ' 条 5 分钟聚合，均约 25 小时）' +
coverHint(bLast - bks[0].ts, span, bLast, devNow);
}
return;
}
var pts = all.filter(function (p) { return p.ts >= t0 && p.ts <= t1 && validTemp(p.v); });
if (!pts.length) {
      emptyChart(box, stat, info, '最近 ' + rangeH + ' 小时内没有采样数据' +
        (all.length ? '（最新采样在 ' + cnTime(all[all.length - 1].ts) + '）' : ''));
return;
}
var mx = -Infinity, mn = Infinity, sum = 0, j;
for (j = 0; j < pts.length; j++) {
if (pts[j].v > mx) mx = pts[j].v;
if (pts[j].v < mn) mn = pts[j].v;
sum += pts[j].v;
}
var avg = sum / pts.length;
var cur = pts[pts.length - 1].v;
box.innerHTML = buildChartSVG(pts, limMc, label, t0, t1);
if (stat) {
stat.innerHTML =
        statCard('当前', (cur / 1000).toFixed(2) + ' ℃', limMc > 0 && cur >= limMc) +
        statCard('最高', (mx / 1000).toFixed(2) + ' ℃', limMc > 0 && mx >= limMc) +
        statCard('最低', (mn / 1000).toFixed(2) + ' ℃', false) +
        statCard('平均', (avg / 1000).toFixed(2) + ' ℃', limMc > 0 && avg >= limMc);
}
if (info) {
      info.innerHTML = '共 ' + pts.length + ' 个采样点（每 60 秒一条），' +
        esc(cnTime(pts[0].ts)) + ' 起至 ' + esc(cnTime(pts[pts.length - 1].ts)) +
        '<br>守护进程滚动保留最近 ' + SAMPLE_KEEP + ' 条，约 25 小时' +
coverHint(pts[pts.length - 1].ts - pts[0].ts, span, pts[pts.length - 1].ts, devNow);
}
}
async function openChart() {
var old = document.getElementById(CHART);
if (old) old.remove();
    var root = document.createElement('div');
root.id = CHART;
    var ranges = [[1, '1 小时'], [6, '6 小时'], [12, '12 小时'], [24, '24 小时']];
root.innerHTML =
      '<div class="uma-panel">' +
        '<div class="uma-head">' +
          '<span class="uma-title">CPU 温度趋势图</span>' +
          '<button class="uma-x" id="uma_chart_x">&times;</button>' +
        '</div>' +
        '<div class="uma-body">' +
          '<div class="uma-rng" id="uma_chart_rng">' +
ranges.map(function (r) {
              return '<button class="uma-rb' + (state.chartRange === r[0] ? ' sel' : '') + '" data-rng="' + r[0] + '">' + r[1] + '</button>';
            }).join('') +
          '</div>' +
          '<div class="uma-box" id="uma_chart_box"></div>' +
          '<div class="uma-stat" id="uma_chart_stat"></div>' +
          '<div class="uma-help" id="uma_chart_info" style="margin-top:8px;text-align:center"></div>' +
          '<div class="uma-row" style="justify-content:center;margin-top:10px;gap:8px">' +
            '<button class="uma-btn uma-ghost" id="uma_chart_reload">重新读取</button>' +
            '<button class="uma-btn uma-blue" id="uma_chart_close">关闭</button>' +
          '</div>' +
        '</div>' +
      '</div>';
document.body.appendChild(root);
    root.querySelector('#uma_chart_x').onclick = function () { root.remove(); };
    root.querySelector('#uma_chart_close').onclick = function () { root.remove(); };
    root.addEventListener('click', function (e) { if (e.target === root) root.remove(); });
    root.querySelector('#uma_chart_reload').onclick = async function () {
await renderChart();
};
    root.querySelectorAll('[data-rng]').forEach(function (b) {
b.onclick = async function () {
        state.chartRange = parseInt(b.getAttribute('data-rng'), 10);
        root.querySelectorAll('[data-rng]').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
await renderChart();
};
});
await renderChart();
}
  var HELP = '<b>实时数据</b><br>页面打开后即时采集一次当日/当月流量与 CPU 温度。点【刷新】会重新采集，并把当前读数追加一行到运行日志，无需等待守护进程的下一轮。<br><br>' +
    '<b>CPU 温度图</b><br>读取设备端已落盘的温度采样序列（每 60 秒一条，滚动保留 ' + SAMPLE_KEEP + ' 条，约 25 小时）绘制趋势图，可切换 1/6/12/24 小时。<br>· <b>1 / 6 小时</b>：直接用原始采样画折线，红色虚线为温度阈值，红点为超阈值采样。<br>· <b>12 / 24 小时</b>：每 5 分钟一个点，柱体上下沿表示该 5 分钟内的最低~最高温，折线为区间均值，均值超限的柱子整根染红。<br>· <b>横坐标</b>：一律按所选范围铺满，右端就是「现在」。数据不足时曲线只占左边一段，下方会红字标出实际覆盖范围，不会再把「只有一小时数据」画成「六小时都很平稳」。<br>· <b>按需回传</b>：只取当前范围需要的那一段（1 小时约 1KB、6 小时约 6KB、24 小时约 9KB），不做整文件回传，避免撞上 shell 通道的输出上限。<br><br>' +
    '<b>5 分钟数据从哪来</b><br>守护进程每 5 分钟（与「周期读数」同一拍）把 60 秒原始采样压成一条聚合记录，落盘到 ' + AGG5_FILE + '。聚合是按 5 分钟「桶」补齐的，守护重启或漏掉几轮也不会在图上留空档，起来后会自动把断掉的桶补回来。刚升级的头几个小时聚合还没攒满，剩下的桶会自动用原始采样临时降采样顶上，所以 24 小时图升级后立刻可用。<br><br>' +
    '<b>采样怎么落盘（v2.0.3）</b><br>60 秒采样与 5 分钟聚合都放在同一个目录、同一分区（' + DATA_DIR + '），区别只在写多写少。v2.0.3 起写入只做<b>追加</b>，不再每轮把整个文件重写一遍：只有行数超过 ' + SAMPLE_TRIM_AT + ' 行（约 7 天）时才裁一次、裁回 ' + SAMPLE_KEEP + ' 行，聚合同理（' + AGG_TRIM_AT + ' 行裁回 ' + AGG_KEEP + ' 行），大约 5.9 天才轮到一次重写。裁剪过程带 sync 落盘、行数校验与 .bak 备份三道保险，任一道不过就放弃、下次再裁。这样掉电或 eMMC 掉盘时，最坏只丢 1 条采样与 1 个聚合桶，不会出现「采样丢几小时、聚合却完好」。<br><br>' +
    '<b>温度口径</b><br>与 UFI-TOOLS 官方页面同源：只扫 /sys/class/thermal 下的各个 thermal_zone，按传感器 type 剔掉 chg / usb / wcn / bcl / skin / back 等非 SoC 温区后取最高值，单位取内核原生的毫摄氏度，展示时 /1000 保留两位小数。所以这里的读数与 UFI-TOOLS 页面红框里的数值是同一个。<br><br>' +
    '<b>严重警告升级</b><br>当本次温度报警与上次温度报警的间隔不超过 60 分钟，消息升级为【严重警告】，除最高 / 最低 / 平均温度外，还会附带用采样序列绘制的趋势图。<br><br>' +
    '<b>推送渠道（可多选）</b><br>覆盖 PushPlus 全部免费渠道，勾几个就同时推送几个（一次请求发完，走官方 /batchSend）：<br>· <b>微信公众号</b>：默认渠道，需先关注其公众号<br>· <b>官方 App</b>：安卓 / 鸿蒙 / iOS，需登录同一账号<br>· <b>浏览器插件</b>：浏览器扩展 / 桌面应用，需登录插件<br>· <b>第三方 Webhook</b>：企业微信 / 钉钉 / 飞书 / bark / Gotify / Server酱 等，<b>编码必填</b><br>· <b>微信 ClawBot</b>：需后台完成配置<br>· <b>QQ 机器人</b>：编码留空发给自己，填群配置编码发到指定 QQ 群<br>· <b>企业微信应用</b>：<b>编码必填</b><br>· <b>邮箱</b>：收件人由后台「个人中心→个人资料→邮箱」绑定并验证的地址决定，配了自定义 SMTP 才填邮件编码<br>短信（sms）与语音（voice）是按量计费渠道，故未提供。<br><br>' +
    '<b>渠道编码填什么</b><br>填 PushPlus 后台「渠道配置」里的<b>渠道编码</b>，不是完整 URL，也不是机器人地址。带 <b>*</b> 的渠道不填就发不出去：面板保存时会拦下，设备端也会跳过该渠道（其他渠道照发）。编码里不要出现逗号 —— 设备端读配置时会把逗号当分隔符吃掉。<br><br>' +
    '<b>chip 上的短名</b><br>为让 8 个渠道在窄面板里排得下，按钮上显示短名（公众号 / App / 插件 / Webhook / ClawBot / QQ / 企微应用 / 邮箱）。<b>点一下按钮</b>，下方就会显示该渠道的完整名称与用法说明。<br><br>' +
    '<b>渠道口径一致</b><br>报警消息、24 小时温度日报、测试推送共用同一份渠道配置与同一段推送代码，改一次渠道三处同步生效，不会出现「报警发微信、日报发邮件」的割裂。<br><br>' +
    '<b>功能</b><br>后台每 60 秒检测一次当日流量、当月流量与 CPU 温度，任一项超过设定限额即通过 PushPlus 已勾选的渠道推送合并报警。每 5 分钟会向日志写入一次周期读数。<br><br>' +
    '<b>限额</b><br>任意限额填 <b>0</b> 即关闭该项检测（温度仍会继续采样）。修改后点【保存配置】，若正在运行会自动热重启生效。<br><br>' +
    '<b>锁定规则</b><br>· 当日流量：次日凌晨自动重置<br>· 当月流量：次月 1 号自动重置<br>· CPU 温度：报警后锁定 1 小时<br><br>' +
    '<b>手动解锁</b><br>某项已触发时其按钮变红，点红色【重置状态】可立即解除锁定。注意：温度解锁后若在 60 分钟内再次超限，将直接升级为严重警告。<br><br>' +
    '<b>日志时间回拨</b><br>设备开机时系统时钟尚未与网络校时，日志里可能出现日期跳变（如 08-30 跳到 08-18 再跳回）。守护进程启动时会等待时间同步，运行中检测到回拨会自动清理受污染的采样与锁定数据，日志里的分隔行会标出校时位置。<br><br>' +
    '<b>断电重启后自动运行</b><br>脚本与数据存放在 ' + BASE + '（原生 /data 分区，开机即可用），开机自启写在 ' + BOOT_SH_FILE + '：设备开机约 15 秒后自动拉起守护，失败会重试 3 次。日志里出现「[boot] 守护已随开机启动」即表示本次是随开机起来的。<br><br>' +
    '<b>几个按钮的区别</b><br>· <b>重启守护</b>：只重启进程，不重写脚本，守护意外停止时用最快<br>· <b>重建守护</b>：重新写脚本 + 写自启行 + 重启，改配置或排障时用<br>· <b>开启/关闭自启</b>：单独控制开机是否自启，与当前是否运行无关<br>打开本弹窗时会自动体检：自启行丢了会补写，守护挂了会拉起。<br><br>' +
    '<b>24 小时温度日报</b><br>开启【定时推送】后，每天在【推送时刻】经 PushPlus 已勾选的渠道推送一张最近 24 小时的 CPU 温度趋势图：<br>· 每 5 分钟一个点，柱体上下沿表示该区间的最低~最高温，黄色折线为区间均值；<br>· 均值超过温度阈值的柱子整根染红（未设温度阈值时全部为蓝色）；<br>· 正文同时给出最高 / 最低 / 平均 / 当前温度、超阈值时长与峰值出现时刻。<br>数据来自守护落盘的 5 分钟聚合，聚合还没攒满时自动用原始 60 秒采样补齐，所以刚部署也能立刻出图。<br><br>' +
    '<b>日报与免打扰互斥</b><br>推送时刻必须落在免打扰时段之外，冲突时【保存配置】会被拦下并红字提示，请改到时段外的时刻。设备端还有一道运行时兜底：即便手工改了配置文件导致冲突，也只会记一条日志并跳过，不会在静音时段发出消息。<br><br>' +
    '<b>准点与补推</b><br>守护每 60 秒检查一次是否到达设定时刻，命中就调起日报脚本；若那一分钟恰好在重启，重启后 1 小时内仍会补推一次，不会整天漏掉。当天只推一次，由设备端 data/last_report_day.txt 记录；推送失败则 10 分钟后重试，成功前不会占位。<br><br>' +
    '<b>立即推送</b><br>用于验证 Token / 渠道编码 / 采样数据是否正确，不必把时刻改成下一分钟再干等一天。若当前还没到当天的设定时刻，这次推送不会顶掉当天的定时日报；已过设定时刻则会记为今日已推送。免打扰时段内点它会直接取消。<br><br>' +
    '<b>免打扰</b><br>设定时段内不推送任何报警（仍正常检测并记录日志）。';
function showHelp() {
    var box = document.getElementById('uma_help');
if (box) { box.remove(); return; }
var root = document.getElementById(MODAL);
if (!root) return;
    box = document.createElement('div');
    box.id = 'uma_help';
    box.style.cssText = 'margin:10px 12px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);font-size:.66rem;line-height:1.65;max-height:34vh;overflow:auto';
    box.innerHTML = HELP + '<div style="text-align:right;margin-top:8px"><button class="uma-btn uma-ghost" style="padding:4px 10px;font-size:.62rem" id="uma_help_x">关闭</button></div>';
    root.querySelector('.uma-panel').appendChild(box);
    box.querySelector('#uma_help_x').onclick = showHelp;
}
function bind(root) {
if (!root) return;
var q = function (s) { return root.querySelector(s); };
    q('[data-act="toggle"]').onclick = async function () {
syncForm();
if (state.installed) await uninstall();
else await install(false);
await reopen();
};
    q('[data-act="save"]').onclick = async function () {
syncForm();
var cf = reportConflict();
      if (cf) { toast('保存已取消：' + cf, 'red', 6000); syncReportHint(); return; }
var bad = chIssues();
      if (bad.length) { toast('保存已取消：' + bad.join('、') + ' 缺少渠道编码', 'red', 6000); syncChSum(); return; }
      if (!chList().length) toast('尚未选择推送渠道，报警与日报都不会发出', 'pink', 5000);
      if (!state.config.pushPlusToken) toast('建议填写 PushPlus Token，否则无法推送', 'pink', 4000);
      await run('mkdir -p ' + sq(BASE) + ' 2>/dev/null; printf %s ' + sq(JSON.stringify(state.config, null, 2)) + ' > ' + sq(CONFIG_FILE));
if (state.installed) {
var ok = await install(true);
        if (ok) toast('配置已保存并热重启生效');
} else {
        toast('配置已保存，启动后生效');
}
await reopen();
};
    q('[data-act="rebuild"]').onclick = async function () {
syncForm();
var ok = await install(true);
      if (ok) toast('守护脚本已重建并重启');
await reopen();
};
    q('[data-act="start"]').onclick = async function () {
      await run(sq(SVC_FILE) + ' restart 2>&1; echo "rc=$?"', 25000);
await sleep(800);
var st = await daemonStatus();
      state.pid = st.on ? st.pid : '';
      toast(st.on ? '守护已重启 PID=' + st.pid : '重启后仍未检测到进程，请点「重建守护」', st.on ? 'green' : 'red');
await reopen();
};
    q('[data-act="boot"]').onclick = async function () {
var want = !state.bootOn;
var now = await installBootHook(want);
state.bootOn = now;
      toast(want ? (now ? '开机自启已开启' : '开机自启开启失败') : '开机自启已关闭',
        now === want ? 'green' : 'red');
await reopen();
};
    q('[data-act="reset-day"]').onclick = async function () {
      await run('rm -f ' + sq(DATA_DIR + '/notified_today.txt') + ' ' + sq(DATA_DIR + '/flow_retry_until.txt'));
      state.lockDay = false; syncResetBtns(); toast('当日流量报警已解锁');
};
    q('[data-act="reset-month"]').onclick = async function () {
      await run('rm -f ' + sq(DATA_DIR + '/notified_month.txt') + ' ' + sq(DATA_DIR + '/flow_retry_until.txt'));
      state.lockMonth = false; syncResetBtns(); toast('当月流量报警已解锁');
};
    q('[data-act="reset-temp"]').onclick = async function () {
      await run('rm -f ' + sq(DATA_DIR + '/temp_lock_until.txt') + ' ' + sq(DATA_DIR + '/temp_retry_until.txt'));
      state.lockTemp = false; syncResetBtns(); toast('温度报警已解锁，60 分钟内再超限将升级为严重警告');
};
    q('[data-act="clear"]').onclick = async function () {
      await run('> ' + sq(LOG_FILE));
      await loadLog(); toast('日志已清空');
};
    q('[data-act="logrefresh"]').onclick = refreshAll;
    q('[data-act="refresh"]').onclick = refreshAll;
    q('[data-act="chart"]').onclick = openChart;
    var auto = q('#uma_auto'); if (auto) auto.onclick = function () { setAuto(!state.autoLog); };
    var test = q('#uma_test'); if (test) test.onclick = testPush;
    var rn = q('[data-act="report-now"]');
if (rn) rn.onclick = async function () {
syncForm();
      if (!state.config.pushPlusToken) { toast('请先填写 PushPlus Token', 'red'); return; }
      if (!chList().length) { toast('请先选择至少一个推送渠道', 'red'); return; }
var badNow = chIssues();
      if (badNow.length) { toast('请先填写：' + badNow.join('、') + ' 的渠道编码', 'red', 6000); return; }
var nd = new Date();
      if (inDndAt(pad2(nd.getHours()) + ':' + pad2(nd.getMinutes()))) {
        toast('当前处于免打扰时段，已取消推送', 'pink', 4000);
return;
}
      var ex = await run('[ -f ' + sq(REPORT_FILE) + ' ] && echo YES || echo NO', 5000);
      if (String(outOf(ex)).indexOf('YES') < 0) {
        toast('设备端还没有日报脚本，请先点「重建守护」', 'red', 6000);
return;
}
var oldText = rn.textContent;
      rn.disabled = true; rn.textContent = '推送中...';
try {
        var r = await run('sh ' + sq(REPORT_FILE) + ' manual 2>&1', 45000);
var o = String(outOf(r)).trim();
        if (o.indexOf('OK') >= 0) {
          toast('24 小时趋势日报已发送，请到 ' + chNames().join('、') + ' 查收', 'green', 5000);
state.reportDay = todayStr();
        } else if (o.indexOf('DND') >= 0) {
          toast('当前处于免打扰时段，已取消推送', 'pink', 4000);
        } else if (o.indexOf('NOTOKEN') >= 0) {
          toast('设备端未读到 Token，请保存配置后重试', 'red', 5000);
        } else if (o.indexOf('NODATA') >= 0) {
          toast('设备端最近 24 小时暂无采样，请稍后再试', 'pink', 5000);
} else {
          toast('推送失败：' + o.slice(0, 140), 'red', 6000);
}
syncReportHint();
} catch (e) {
        toast('推送异常：' + (e && e.message ? e.message : '未知错误'), 'red', 6000);
} finally {
rn.disabled = false; rn.textContent = oldText;
}
};
if (!root.__umaDelegated) {
root.__umaDelegated = true;
      root.addEventListener('click', function (e) {
        var chip = e.target && e.target.closest ? e.target.closest('.uma-ch') : null;
if (chip && root.contains(chip)) {
          var id = chip.getAttribute('data-ch');
chToggle(id);
syncChips(root);
renderChOpts();
chShowTip(id);
return;
}
});
      root.addEventListener('change', function (e) {
var el = e.target;
        if (el && el.getAttribute && el.getAttribute('data-field')) {
syncForm();
syncChSum();
}
});
      root.addEventListener('input', function (e) {
var el = e.target;
        if (el && el.getAttribute && el.getAttribute('data-field') &&
            el.type !== 'checkbox' && el.type !== 'time' && el.type !== 'text' && el.type !== 'email') {
syncForm();
}
});
}
renderChOpts();
    chShowTip(chList().length ? chList()[chList().length - 1] : '');
syncReportHint();
}
function syncChips(root) {
if (!root) return;
var sel = chList();
    root.querySelectorAll('.uma-ch').forEach(function (x) {
      var on = sel.indexOf(x.getAttribute('data-ch')) >= 0;
      if (on) x.classList.add('sel'); else x.classList.remove('sel');
});
}
var autoUpgraded = false;
async function openModal() {
var old = document.getElementById(MODAL);
if (old) old.remove();
    var root = document.createElement('div');
root.id = MODAL;
root.innerHTML =
      '<div class="uma-panel">' +
        '<div class="uma-head">' +
          '<span class="uma-title">设备监测报警消息推送</span>' +
          '<span>' +
            '<button class="uma-x" id="uma_help_btn" title="使用说明" style="font-size:.7rem;margin-right:8px">?</button>' +
            '<button class="uma-x" id="uma_close">&times;</button>' +
          '</span>' +
        '</div>' +
        '<div class="uma-body"></div>' +
      '</div>';
document.body.appendChild(root);
    root.querySelector('#uma_close').onclick = function () { setAuto(false); root.remove(); };
    root.querySelector('#uma_help_btn').onclick = showHelp;
    root.addEventListener('click', function (e) { if (e.target === root) { setAuto(false); root.remove(); } });
state.ready = false;
    root.querySelector('.uma-body').innerHTML = render();
bind(root);
syncResetBtns();
renderLive();
backgroundInit(root);
}
async function backgroundInit(root) {
var alive = function () { return document.getElementById(MODAL) === root; };
try {
try {
await readStatusCombined();
} catch (e) {
        console.warn('[设备监测报警] 合并采集失败，退回逐条读取', e);
await readStatus();
state.daemonStamp = await readStamp();
await checkResetState();
}
if (state.needMigrate) {
await migrateLegacy();
if (!alive()) return;
await readStatusCombined();
}
if (state.installed && state.daemonStamp.indexOf(STAMP) < 0 && !autoUpgraded) {
autoUpgraded = true;
        toast('检测到旧版守护，正在后台更新至 v' + VERSION, 'blue', 5000);
await install(true);
if (!alive()) return;
await readStatusCombined();
} else {
await selfHealOnce();
if (!alive()) return;
await readStatusCombined();
}
    } catch (e) { console.warn('[设备监测报警] 状态初始化失败', e); }
state.ready = true;
if (!alive()) return;
    var body = root.querySelector('.uma-body');
if (body) body.innerHTML = render();
bind(root);
syncResetBtns();
renderLive();
await loadLog();
setTimeout(function () { if (alive()) probeNow(); }, 400);
setAuto(!!state.pid);
}
async function hasAnyLegacyScript() {
    var r = await run('ls /sdcard/ufi_monitor_alarm.sh 2>/dev/null | head -1', 5000);
return String(outOf(r)).trim().length > 0;
}
async function reopen() {
    var body = document.querySelector('#' + MODAL + ' .uma-body');
if (!body) return;
await readStatusCombined();
body.innerHTML = render();
bind(document.getElementById(MODAL));
syncResetBtns();
renderLive();
    var ab = document.getElementById('uma_auto');
if (ab) ab.disabled = !state.pid;
}
function mount() {
    var btn = document.createElement('button');
    btn.textContent = '设备监测报警';
btn.onclick = openModal;
    var sels = ['.actions-buttons', '.actions', '.action-buttons', '.plugin-actions', '.btns', '#actions'];
for (var i = 0; i < sels.length; i++) {
try {
var c = document.querySelector(sels[i]);
if (c) { c.appendChild(btn); return; }
} catch (e) {}
}
    var f = document.createElement('button');
    f.id = 'uma_float';
    f.textContent = '设备监测报警';
f.onclick = openModal;
document.body.appendChild(f);
}
if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
</script>