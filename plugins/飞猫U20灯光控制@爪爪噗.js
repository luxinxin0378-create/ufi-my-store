//<script>
(async () => {
  const TITLE = '飞猫U20灯光控制';
  const MODAL = 'fm_u20_light_modal';

  // ===== 灯光模型: 两个物理灯 =====
  // rgb : 彩灯(sc27xx blue/red/white, 每通道 0-255)
  // aux : 辅灯(keyboard-backlight, 0-127)
  const CH = {
    blue:  { id: 'blue',  light: 'rgb', label: '蓝', max: 255, path: '/sys/class/leds/sc27xx:blue' },
    red:   { id: 'red',   light: 'rgb', label: '红', max: 255, path: '/sys/class/leds/sc27xx:red' },
    white: { id: 'white', light: 'rgb', label: '白', max: 255, path: '/sys/class/leds/sc27xx:white' },
    aux:   { id: 'aux',   light: 'aux', label: '辅灯', max: 127, path: '/sys/class/leds/keyboard-backlight' },
  };
  const CH_IDS = ['blue', 'red', 'white', 'aux'];
  const RGB_IDS = ['blue', 'red', 'white'];

  const state = { captured: false, saved: {}, status: {}, bootOn: false, autoOn: false, dragging: null, knownMacs: null };

  // ---------- shell ----------
  const runRoot = async (cmd) => {
    try { return (await runShellWithRoot(cmd)) || { success: false, content: '' }; }
    catch (e) { return { success: false, content: '' }; }
  };
  const readFile = (path) => runRoot(`timeout 2s awk '{print}' ${path}`);
  const checkAdvanceFunc = async () => {
    const res = await runRoot('timeout 2s whoami');
    return res.success && /root/.test(res.content || '');
  };
  const escapeHtml = (v = '') => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const clamp = (v, max) => Math.max(0, Math.min(max, v | 0));

  // ---------- 读 ----------
  const readChannel = async (id) => {
    const c = CH[id];
    const bRes = await readFile(`${c.path}/brightness`);
    const tRes = await readFile(`${c.path}/trigger`);
    const out = {
      brightness: parseInt(String(bRes.content || '').trim(), 10) || 0,
      trigger: String(tRes.content || '').match(/\[([^\]]+)\]/)?.[1] || 'none',
    };
    if (out.trigger === 'timer') {
      const on = await readFile(`${c.path}/delay_on`);
      const off = await readFile(`${c.path}/delay_off`);
      out.delay_on = parseInt(String(on.content || '').trim(), 10) || 0;
      out.delay_off = parseInt(String(off.content || '').trim(), 10) || 0;
    } else if (out.trigger === 'pattern') {
      const p = await readFile(`${c.path}/pattern`);
      out.pattern = String(p.content || '').trim();
    }
    return out;
  };
  const readStatus = async () => {
    const map = {};
    for (const id of CH_IDS) map[id] = await readChannel(id);
    return map;
  };

  // ---------- 写 ----------
  const setTrigger = (id, t) => runRoot(`echo ${t} > ${CH[id].path}/trigger`);
  const setBrightness = async (id, v) => {
    await setTrigger(id, 'none');
    await runRoot(`echo ${clamp(v, CH[id].max)} > ${CH[id].path}/brightness`);
  };
  const setBlink = async (id, on, off) => {
    await setTrigger(id, 'none');
    await setTrigger(id, 'timer');
    await runRoot(`echo ${Math.max(10, on | 0)} > ${CH[id].path}/delay_on`);
    await runRoot(`echo ${Math.max(10, off | 0)} > ${CH[id].path}/delay_off`);
  };
  const setBreathe = async (id, half) => {
    const h = Math.max(100, half | 0);
    await setTrigger(id, 'none');
    await setTrigger(id, 'pattern');
    await runRoot(`echo 0 ${h} ${CH[id].max} ${h} > ${CH[id].path}/pattern`);
  };

  // ---------- 方案(全通道快照) ----------
  const applyScene = async (scene) => {
    if (!scene) return;
    for (const id of CH_IDS) {
      const s = scene[id]; if (!s) continue;
      const c = CH[id];
      const trig = s.trigger || 'none';
      await setTrigger(id, 'none');
      if (trig === 'timer') {
        await setTrigger(id, 'timer');
        if (s.delay_on) await runRoot(`echo ${s.delay_on} > ${c.path}/delay_on`);
        if (s.delay_off) await runRoot(`echo ${s.delay_off} > ${c.path}/delay_off`);
      } else if (trig === 'pattern') {
        await setTrigger(id, 'pattern');
        if (s.pattern) await runRoot(`echo ${s.pattern} > ${c.path}/pattern`);
      } else if (trig !== 'none') {
        await setTrigger(id, trig);
      }
      await runRoot(`echo ${clamp(s.brightness || 0, c.max)} > ${c.path}/brightness`);
    }
  };

  const restoreSystem = async () => {
    if (!state.captured) { createToast('尚未记录系统默认', 'red'); return; }
    await applyScene(state.saved);
    clearSceneLS(); state.autoOn = false; updateUI();
    createToast('已恢复系统控制', 'green');
    await refresh(true);
  };

  // ---------- 持久化 ----------
  const LS_SCENE = 'fm_u20_light_scene';
  const LS_DEF = 'fm_u20_light_defaults';
  const loadSceneLS = () => { try { return JSON.parse(localStorage.getItem(LS_SCENE) || 'null'); } catch { return null; } };
  const saveSceneLS = (scene, auto) => localStorage.setItem(LS_SCENE, JSON.stringify({ auto: !!auto, scene }));
  const clearSceneLS = () => localStorage.removeItem(LS_SCENE);
  const loadDefaults = () => { try { return JSON.parse(localStorage.getItem(LS_DEF) || 'null'); } catch { return null; } };
  const saveDefaults = (d) => localStorage.setItem(LS_DEF, JSON.stringify(d));

  // 仅首次记录"真正的系统默认"并持久化(避免把上次自动套用误当默认)
  const captureDefaults = async () => {
    if (state.captured) return;
    const d = loadDefaults();
    if (d && Object.keys(d).length) { state.saved = d; state.captured = true; return; }
    const map = await readStatus();
    if (Object.keys(map).length) { state.saved = map; state.captured = true; saveDefaults(map); }
  };
  const saveCurrentScene = () => {
    if (!Object.keys(state.status).length) return;
    const ls = loadSceneLS() || {};
    saveSceneLS(state.status, ls.auto || false);
  };

  // ---------- 开机默认 ----------
  const checkBoot = async () => {
    const res = await runRoot(`timeout 2s grep -c '#fm_u20_light_begin' /sdcard/ufi_tools_boot.sh 2>/dev/null`);
    return (parseInt(res.content, 10) || 0) > 0;
  };
  const toggleBoot = async () => {
    if (state.bootOn) {
      await runRoot(`sed -i '/#fm_u20_light_begin/,/#fm_u20_light_end/d' /sdcard/ufi_tools_boot.sh 2>/dev/null`);
      state.bootOn = false; updateUI(); createToast('已取消开机默认', 'pink');
      return;
    }
    await runRoot(`sed -i '/#fm_u20_light_begin/,/#fm_u20_light_end/d' /sdcard/ufi_tools_boot.sh 2>/dev/null`);
    await runRoot(`echo '#fm_u20_light_begin' >> /sdcard/ufi_tools_boot.sh`);
    for (const id of CH_IDS) {
      const v = clamp((state.status[id] && state.status[id].brightness) || 0, CH[id].max);
      await runRoot(`echo 'echo none > ${CH[id].path}/trigger' >> /sdcard/ufi_tools_boot.sh`);
      await runRoot(`echo 'echo ${v} > ${CH[id].path}/brightness' >> /sdcard/ufi_tools_boot.sh`);
    }
    await runRoot(`echo '#fm_u20_light_end' >> /sdcard/ufi_tools_boot.sh`);
    state.bootOn = true; updateUI(); createToast('已保存为开机默认', 'green');
  };

  // ==================== 动作 ====================
  const ACTIONS = {
    off: '全部熄灭',
    rgb_white: '彩灯·纯白', rgb_blue: '彩灯·纯蓝', rgb_red: '彩灯·纯红',
    rgb_breath_blue: '彩灯·蓝呼吸', rgb_blink_red: '彩灯·红快闪',
    aux_on: '辅灯·常亮', aux_off: '辅灯·关闭', aux_breath: '辅灯·呼吸', aux_blink: '辅灯·闪烁',
    system: '恢复系统控制',
  };
  const ACTION_OPTIONS = Object.keys(ACTIONS).map(k => `<option value="${k}">${ACTIONS[k]}</option>`).join('');

  const applyAction = async (key) => {
    switch (key) {
      case 'off': for (const id of CH_IDS) await setBrightness(id, 0); break;
      case 'rgb_white': await setBrightness('blue', 0); await setBrightness('red', 0); await setBrightness('white', 255); break;
      case 'rgb_blue': await setBrightness('blue', 255); await setBrightness('red', 0); await setBrightness('white', 0); break;
      case 'rgb_red': await setBrightness('blue', 0); await setBrightness('red', 255); await setBrightness('white', 0); break;
      case 'rgb_breath_blue': await setBrightness('red', 0); await setBrightness('white', 0); await setBreathe('blue', 600); break;
      case 'rgb_blink_red': await setBrightness('blue', 0); await setBrightness('white', 0); await setBlink('red', 200, 200); break;
      case 'aux_on': await setBrightness('aux', CH.aux.max); break;
      case 'aux_off': await setBrightness('aux', 0); break;
      case 'aux_breath': await setBreathe('aux', 700); break;
      case 'aux_blink': await setBlink('aux', 400, 400); break;
      case 'system': await restoreSystem(); break;
    }
  };

  // ==================== 智能规则引擎 ====================
  const RULES_KEY = 'fm_u20_light_rules';
  const TYPE_LABELS = { schedule: '定时', network: '网络', temp: '温度', device: '新设备', speed: '网速' };

  const defaultEngine = () => ({ enabled: false, pollSec: 5, fallback: 'hold', rules: [] });
  const loadEngine = () => {
    try {
      const s = JSON.parse(localStorage.getItem(RULES_KEY) || 'null');
      return (s && typeof s === 'object') ? Object.assign(defaultEngine(), s) : defaultEngine();
    } catch { return defaultEngine(); }
  };
  const saveEngine = (cfg) => localStorage.setItem(RULES_KEY, JSON.stringify(cfg));

  const engine = {
    config: loadEngine(), timer: null, active: null,
    devHitUntil: 0, speed: null, speedTick: 0, speedLast: null,
    netCache: { t: 0, op: '', nt: '', wan: false }, tempZones: [], lastInfo: {}, lastMatched: null, _tickTs: 0,
  };

  const firstNum = (s) => { const m = String(s || '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };

  const listTempZones = async () => {
    const res = await runRoot(`timeout 2s grep -H '' /sys/class/thermal/thermal_zone*/type`);
    const zones = [];
    String(res.content || '').split(/\r?\n/).forEach((line) => {
      const m = line.match(/(thermal_zone\d+)\/type:(.+)$/);
      if (m) zones.push({ zone: m[1], name: m[2].trim() });
    });
    return zones;
  };

  const readTempC = async (rule) => {
    if (rule.tempSource === 'shell') {
      const r = await runRoot(rule.tempCmd || '');
      const v = firstNum(r.content); if (v == null) return null;
      return v >= 1000 ? v / 1000 : v;
    }
    if (rule.tempSource === 'at') {
      if (!rule.tempAt) return null;
      try {
        const res = await (await fetchWithTimeout(`${KANO_baseURL}/AT?command=${encodeURIComponent(rule.tempAt)}&slot=0`)).json();
        const v = firstNum(res?.result); if (v == null) return null;
        return v >= 1000 ? v / 1000 : v;
      } catch { return null; }
    }
    const r = await readFile(`/sys/class/thermal/${rule.tempZone || 'thermal_zone0'}/temp`);
    const v = firstNum(r.content);
    return v == null ? null : v / 1000;
  };

  const readNetwork = async () => {
    const now = Date.now();
    if (now - engine.netCache.t < 8000) return engine.netCache;
    const opRes = await runRoot('getprop gsm.operator.alpha');
    const ntRes = await runRoot('getprop gsm.network.type');
    const wanRes = await runRoot('timeout 2s ip route get 223.5.5.5');
    engine.netCache = {
      t: now,
      op: String(opRes.content || '').split(',')[0].trim(),
      nt: String(ntRes.content || '').split(',')[0].trim(),
      wan: wanRes.success && / dev /.test(String(wanRes.content || '')),
    };
    return engine.netCache;
  };

  const readMacs = async () => {
    const res = await runRoot(`timeout 2s grep -i wlan0 /proc/net/arp`);
    const set = new Set();
    String(res.content || '').split(/\r?\n/).forEach((l) => {
      const m = l.match(/([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}/);
      if (m) set.add(m[0].toLowerCase());
    });
    return set;
  };

  const readIfaceBytes = async (iface) => {
    const rx = await readFile(`/sys/class/net/${iface}/statistics/rx_bytes`);
    const tx = await readFile(`/sys/class/net/${iface}/statistics/tx_bytes`);
    return { rx: parseInt(String(rx.content || '').trim(), 10) || 0, tx: parseInt(String(tx.content || '').trim(), 10) || 0 };
  };
  const computeSpeed = async (rule) => {
    if (engine.speedTick === engine._tickTs && engine.speedLast != null) return engine.speedLast;
    const iface = rule.speedIface || 'wlan0';
    const cur = await readIfaceBytes(iface);
    const now = Date.now();
    const prev = engine.speed;
    engine.speed = { ...cur, iface, t: now };
    let rate = null;
    if (prev && prev.iface === iface) {
      const dt = (now - prev.t) / 1000;
      if (dt > 0) {
        let delta;
        if (rule.speedDir === 'up') delta = cur.tx - prev.tx;
        else if (rule.speedDir === 'down') delta = cur.rx - prev.rx;
        else delta = (cur.rx - prev.rx) + (cur.tx - prev.tx);
        rate = Math.max(0, delta) / dt / 1024;
      }
    }
    engine.speedTick = engine._tickTs; engine.speedLast = rate;
    return rate;
  };

  const hhmm = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  const parseHM = (s) => { const m = String(s || '').match(/^(\d{1,2}):(\d{2})$/); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const matchSchedule = (rule) => {
    const from = parseHM(rule.from); const to = parseHM(rule.to);
    if (from == null || to == null || from === to) return false;
    const now = hhmm();
    return from < to ? (now >= from && now < to) : (now >= from || now < to);
  };

  const matchRule = async (rule) => {
    if (!rule.enabled) return false;
    switch (rule.type) {
      case 'schedule': return matchSchedule(rule);
      case 'network': {
        const net = await readNetwork();
        if (rule.netField === 'wan') {
          const want = String(rule.netValue || 'online').toLowerCase();
          return want === 'offline' ? !net.wan : net.wan;
        }
        const val = rule.netField === 'ntype' ? net.nt : net.op;
        const want = String(rule.netValue || '');
        return rule.netOp === 'eq' ? val === want : val.includes(want);
      }
      case 'temp': {
        const t = await readTempC(rule); if (t == null) return false;
        return rule.tempOp === '<' ? t < Number(rule.tempValue) : t > Number(rule.tempValue);
      }
      case 'device': return Date.now() < engine.devHitUntil;
      case 'speed': {
        const s = await computeSpeed(rule); if (s == null) return false;
        return rule.speedOp === '<' ? s < Number(rule.speedValue) : s > Number(rule.speedValue);
      }
    }
    return false;
  };

  const detectNewDevice = async () => {
    const macs = await readMacs();
    if (state.knownMacs == null) { state.knownMacs = macs; return; }
    let isNew = false;
    for (const m of macs) if (!state.knownMacs.has(m)) isNew = true;
    state.knownMacs = macs;
    if (isNew) {
      const devRule = engine.config.rules.find(r => r.enabled && r.type === 'device');
      if (devRule) engine.devHitUntil = Date.now() + (Number(devRule.holdSec) || 30) * 1000;
    }
  };

  const renderLive = (matched) => {
    engine.lastMatched = matched || null;
    const live = document.querySelector(`#${MODAL}`)?.querySelector('#fm_rule_live');
    if (!live) return;
    const s = engine.lastInfo || {};
    live.textContent = `命中:${matched ? (matched.name || TYPE_LABELS[matched.type]) : '无'} | `
      + `${s.op || '-'}/${s.nt || '-'} | ${s.wan ? '联网' : '断网'} | 设备${s.devCount ?? '-'} | `
      + `${s.speed != null ? Math.round(s.speed) + 'KB/s' : '-'}`;
  };

  const engineTick = async () => {
    const cfg = engine.config;
    if (!cfg.enabled) return;
    engine._tickTs = Date.now(); engine.speedTick = 0; engine.speedLast = null;
    await detectNewDevice();
    const net = await readNetwork();
    const spdRule = cfg.rules.find(r => r.enabled && r.type === 'speed');
    const speedVal = spdRule ? await computeSpeed(spdRule) : null;
    engine.lastInfo = { op: net.op, nt: net.nt, wan: net.wan, devCount: state.knownMacs ? state.knownMacs.size : 0, speed: speedVal };

    let matched = null;
    for (const r of cfg.rules) { if (await matchRule(r)) { matched = r; break; } }
    renderLive(matched);
    const key = matched ? matched.id : '__fallback__';
    if (key === engine.active) return;
    engine.active = key;
    if (matched) await applyAction(matched.action);
    else if (cfg.fallback === 'system') await restoreSystem();
    else if (cfg.fallback !== 'hold' && ACTIONS[cfg.fallback]) await applyAction(cfg.fallback);
    if (document.querySelector(`#${MODAL}`)) await refresh(true);
  };

  const stopEngine = () => { if (engine.timer) { clearInterval(engine.timer); engine.timer = null; } engine.active = null; };
  const startEngine = () => {
    stopEngine();
    engine.config = loadEngine();
    if (!engine.config.enabled) return;
    const sec = Math.max(2, Number(engine.config.pollSec) || 5);
    engine.timer = setInterval(() => { engineTick().catch(() => {}); }, sec * 1000);
    engineTick().catch(() => {});
  };

  // ==================== 样式(仅布局, 复用宿主原生控件外观) ====================
  const ensureStyle = () => {
    if (document.getElementById('fm_u20_style')) return;
    const style = document.createElement('style');
    style.id = 'fm_u20_style';
    style.textContent = `
      #${MODAL} .fm-srow{ display:flex; align-items:center; gap:8px; margin:8px 0; }
      #${MODAL} .fm-srow > label{ width:34px; font-size:.72rem; }
      #${MODAL} .fm-srow > input[type=range]{ flex:1; }
      #${MODAL} .fm-srow > .v{ width:34px; text-align:right; font-size:.68rem; opacity:.8; }
      #${MODAL} .fm-rule{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:4px 0;
        border-bottom:1px solid var(--dark-border-color,#3a3a3a); }
      #${MODAL} .fm-editor{ display:flex; flex-direction:column; gap:8px; margin-top:8px; }
      #${MODAL} .fm-editor .line{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      #${MODAL} .fm-editor .line > span:first-child{ width:34px; font-size:.72rem; }

      /* 统一控件尺寸: 按钮/下拉/输入框同高同字号, 消除大小不一 */
      #${MODAL} button.btn,
      #${MODAL} select.select,
      #${MODAL} input[type=text],
      #${MODAL} input[type=number],
      #${MODAL} input[type=time]{
        height:30px; min-height:30px; box-sizing:border-box; margin:0; padding:0 8px;
        font-size:.68rem; line-height:1; vertical-align:middle; border-radius:6px;
      }
      #${MODAL} select.select,
      #${MODAL} input[type=text],
      #${MODAL} input[type=number],
      #${MODAL} input[type=time]{ line-height:28px; }
      #${MODAL} button.btn{ display:inline-flex; align-items:center; justify-content:center; padding:0 10px; }
      #${MODAL} .fm-rule button.btn{ padding:0 7px; }
    `;
    document.head.appendChild(style);
  };

  // ==================== 渲染 ====================
  const sliderRow = (id) => `
    <div class="fm-srow">
      <label>${CH[id].label}</label>
      <input type="range" id="fm_range_${id}" min="0" max="${CH[id].max}" value="0">
      <span class="v" id="fm_val_${id}">0</span>
    </div>`;

  const buildContent = () => `
    <div style="display:flex;flex-direction:column;gap:14px;font-size:.75rem">

      <div>
        <div class="title" style="font-size:.7rem;margin-bottom:6px">彩灯 RGB</div>
        ${RGB_IDS.map(sliderRow).join('')}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <button class="btn" data-quick="rgb_white">纯白</button>
          <button class="btn" data-quick="rgb_blue">纯蓝</button>
          <button class="btn" data-quick="rgb_red">纯红</button>
          <button class="btn" data-quick="rgb_breath_blue">蓝呼吸</button>
          <button class="btn" data-quick="rgb_blink_red">红快闪</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">
          <select class="select" id="fm_fx_color"><option value="blue">蓝</option><option value="red">红</option><option value="white">白</option></select>
          <select class="select" id="fm_fx_mode"><option value="static">常亮</option><option value="blink">闪烁</option><option value="breathe">呼吸</option></select>
          <input type="range" id="fm_fx_speed" min="100" max="2000" value="500" step="50" style="width:110px">
          <span id="fm_fx_speed_val" style="width:34px;text-align:right;opacity:.8">500</span>
          <button class="btn" id="fm_fx_apply">应用</button>
        </div>
      </div>

      <div>
        <div class="title" style="font-size:.7rem;margin-bottom:6px">辅灯</div>
        ${sliderRow('aux')}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          <button class="btn" data-quick="aux_on">常亮</button>
          <button class="btn" data-quick="aux_off">关闭</button>
          <button class="btn" data-quick="aux_breath">呼吸</button>
          <button class="btn" data-quick="aux_blink">闪烁</button>
        </div>
      </div>

      <div>
        <div class="title" style="font-size:.7rem;margin-bottom:6px">智能规则</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button class="btn" id="fm_eng_toggle">规则引擎:关</button>
          <span style="opacity:.8">轮询</span>
          <input type="number" id="fm_eng_poll" min="2" max="120" value="5" style="width:60px">
          <span style="opacity:.8">秒</span>
          <select class="select" id="fm_eng_fallback">
            <option value="hold">兜底:保持当前</option>
            <option value="system">兜底:恢复系统控制</option>
            <option value="off">兜底:全部熄灭</option>
            <option value="aux_on">兜底:辅灯常亮</option>
          </select>
          <button class="btn" id="fm_eng_add">添加规则</button>
        </div>
        <div id="fm_rule_live" style="opacity:.75;margin:6px 0;line-height:1.5">—</div>
        <div id="fm_rules_list" style="display:flex;flex-direction:column"></div>

        <div id="fm_rule_editor" style="display:none;margin-top:8px">
          <div class="fm-editor">
            <div class="line"><span>名称</span><input type="text" id="fm_r_name" placeholder="规则名称" style="flex:1;min-width:120px"></div>
            <div class="line">
              <span>类型</span>
              <select class="select" id="fm_r_type">
                <option value="schedule">定时</option><option value="network">网络</option>
                <option value="temp">温度</option><option value="device">新设备接入</option><option value="speed">网速</option>
              </select>
              <select class="select" id="fm_r_action">${ACTION_OPTIONS}</select>
            </div>
            <div class="line fm-t-schedule"><span>时段</span>
              <input type="time" id="fm_r_from" value="22:00"><span style="opacity:.8">至</span><input type="time" id="fm_r_to" value="07:00">
            </div>
            <div class="line fm-t-network"><span>条件</span>
              <select class="select" id="fm_r_netfield"><option value="operator">运营商</option><option value="ntype">网络类型</option><option value="wan">联网状态</option></select>
              <select class="select" id="fm_r_netop"><option value="contains">包含</option><option value="eq">等于</option></select>
              <input type="text" id="fm_r_netvalue" placeholder="中国移动 / NR_SA / online" style="flex:1;min-width:110px">
            </div>
            <div class="line fm-t-temp"><span>接口</span>
              <select class="select" id="fm_r_tempsource"><option value="zone">系统温度节点</option><option value="shell">自定义命令</option><option value="at">AT指令</option></select>
              <select class="select" id="fm_r_tempzone" style="flex:1;min-width:120px"></select>
            </div>
            <div class="line fm-t-temp"><span>取值</span>
              <input type="text" id="fm_r_tempcmd" placeholder="自定义shell命令" style="flex:1;min-width:110px">
              <input type="text" id="fm_r_tempat" placeholder="AT指令" style="flex:1;min-width:110px">
            </div>
            <div class="line fm-t-temp"><span>阈值</span>
              <select class="select" id="fm_r_tempop"><option value=">">大于</option><option value="<">小于</option></select>
              <input type="number" id="fm_r_tempvalue" value="70" style="width:76px"><span style="opacity:.8">℃</span>
            </div>
            <div class="line fm-t-device"><span>保持</span>
              <input type="number" id="fm_r_holdsec" value="30" style="width:76px"><span style="opacity:.8">秒</span>
            </div>
            <div class="line fm-t-speed"><span>网速</span>
              <select class="select" id="fm_r_speediface"><option value="wlan0">wlan0(局域网)</option><option value="sipa_eth0">sipa_eth0(蜂窝)</option></select>
              <select class="select" id="fm_r_speeddir"><option value="down">下行</option><option value="up">上行</option><option value="total">合计</option></select>
              <select class="select" id="fm_r_speedop"><option value=">">大于</option><option value="<">小于</option></select>
              <input type="number" id="fm_r_speedvalue" value="1024" style="width:84px"><span style="opacity:.8">KB/s</span>
            </div>
            <div style="text-align:right">
              <button class="btn" id="fm_r_save">保存规则</button>
              <button class="btn" id="fm_r_cancel">取消</button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="title" style="font-size:.7rem;margin-bottom:6px">设置</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" id="fm_auto_btn">自动应用:关</button>
          <button class="btn" id="fm_boot_btn">开机默认:关</button>
          <button class="btn" id="fm_restore_btn">恢复系统控制</button>
          <button class="btn" id="fm_refresh_btn">刷新状态</button>
        </div>
        <div style="opacity:.55;line-height:1.6;margin-top:8px">
          “自动应用”: 每次打开工具箱自动套用上次灯光方案。“开机默认”: 设备重启后自动应用当前亮度。
          接管灯光会覆盖系统指示(充电/网络等), 点“恢复系统控制”或重启设备即可交还。
        </div>
      </div>
    </div>`;

  const renderStatus = () => {
    const root = document.querySelector(`#${MODAL}`); if (!root) return;
    CH_IDS.forEach((id) => {
      const s = state.status[id]; if (!s) return;
      const range = root.querySelector(`#fm_range_${id}`);
      if (range && state.dragging !== id) range.value = s.brightness;
      const val = root.querySelector(`#fm_val_${id}`);
      if (val) val.textContent = s.brightness;
    });
  };

  const updateUI = () => {
    const root = document.querySelector(`#${MODAL}`); if (!root) return;
    const auto = root.querySelector('#fm_auto_btn');
    if (auto) { auto.textContent = '自动应用:' + (state.autoOn ? '开' : '关'); auto.style.background = state.autoOn ? 'var(--dark-btn-color-active)' : ''; }
    const boot = root.querySelector('#fm_boot_btn');
    if (boot) { boot.textContent = '开机默认:' + (state.bootOn ? '开' : '关'); boot.style.background = state.bootOn ? 'var(--dark-btn-color-active)' : ''; }
    const eng = root.querySelector('#fm_eng_toggle');
    if (eng) { eng.textContent = '规则引擎:' + (engine.config.enabled ? '开' : '关'); eng.style.background = engine.config.enabled ? 'var(--dark-btn-color-active)' : ''; }
  };

  const refresh = async (silent) => {
    const map = await readStatus();
    if (Object.keys(map).length) { state.status = map; renderStatus(); if (!silent) createToast('状态已刷新', 'green'); }
    else if (!silent) createToast('读取状态失败', 'red');
  };

  // ==================== 规则列表/编辑器 ====================
  const ruleSummary = (r) => {
    switch (r.type) {
      case 'schedule': return `${r.from}~${r.to}`;
      case 'network': return `${({ operator: '运营商', ntype: '网络类型', wan: '联网' })[r.netField]} ${r.netOp === 'eq' ? '=' : '含'} ${r.netValue}`;
      case 'temp': return `${r.tempSource === 'zone' ? r.tempZone : (r.tempSource === 'at' ? ('AT ' + (r.tempAt || '')) : (r.tempCmd || ''))} ${r.tempOp}${r.tempValue}℃`;
      case 'device': return `新设备接入(保持${r.holdSec || 30}s)`;
      case 'speed': return `${r.speedIface} ${({ down: '下行', up: '上行', total: '合计' })[r.speedDir]} ${r.speedOp}${r.speedValue}KB/s`;
    }
    return '';
  };
  let editingId = null;
  const ensureTempZones = async () => {
    const sel = document.querySelector(`#${MODAL}`)?.querySelector('#fm_r_tempzone'); if (!sel) return;
    if (!engine.tempZones.length) engine.tempZones = await listTempZones();
    if (!sel.options.length) {
      sel.innerHTML = engine.tempZones.map(z => `<option value="${z.zone}">${escapeHtml(z.name)} (${z.zone})</option>`).join('')
        || '<option value="thermal_zone0">soc-thmzone (thermal_zone0)</option>';
    }
  };
  const updateEditorVisibility = (type) => {
    const root = document.querySelector(`#${MODAL}`); if (!root) return;
    root.querySelectorAll('.fm-t-schedule,.fm-t-network,.fm-t-temp,.fm-t-device,.fm-t-speed').forEach(el => { el.style.display = 'none'; });
    root.querySelectorAll('.fm-t-' + type).forEach(el => { el.style.display = 'flex'; });
  };
  const openEditor = async (id) => {
    const root = document.querySelector(`#${MODAL}`); if (!root) return;
    await ensureTempZones();
    const r = id ? engine.config.rules.find(x => x.id === id) : null;
    editingId = id || null;
    const q = (s) => root.querySelector(s);
    q('#fm_rule_editor').style.display = 'block';
    q('#fm_r_name').value = r ? (r.name || '') : '';
    q('#fm_r_type').value = r ? r.type : 'schedule';
    q('#fm_r_action').value = r ? r.action : 'rgb_blue';
    q('#fm_r_from').value = r?.from || '22:00'; q('#fm_r_to').value = r?.to || '07:00';
    q('#fm_r_netfield').value = r?.netField || 'operator'; q('#fm_r_netop').value = r?.netOp || 'contains';
    q('#fm_r_netvalue').value = r?.netValue || '中国移动';
    q('#fm_r_tempsource').value = r?.tempSource || 'zone';
    if (r?.tempZone) q('#fm_r_tempzone').value = r.tempZone;
    q('#fm_r_tempcmd').value = r?.tempCmd || ''; q('#fm_r_tempat').value = r?.tempAt || '';
    q('#fm_r_tempop').value = r?.tempOp || '>'; q('#fm_r_tempvalue').value = r?.tempValue ?? 70;
    q('#fm_r_holdsec').value = r?.holdSec ?? 30;
    q('#fm_r_speediface').value = r?.speedIface || 'wlan0'; q('#fm_r_speeddir').value = r?.speedDir || 'down';
    q('#fm_r_speedop').value = r?.speedOp || '>'; q('#fm_r_speedvalue').value = r?.speedValue ?? 1024;
    updateEditorVisibility(q('#fm_r_type').value);
  };
  const saveRuleFromEditor = () => {
    const root = document.querySelector(`#${MODAL}`); if (!root) return;
    const q = (s) => root.querySelector(s);
    const type = q('#fm_r_type').value;
    const rule = {
      id: editingId || ('r' + Date.now()), enabled: true, type,
      name: q('#fm_r_name').value.trim() || (TYPE_LABELS[type] + '规则'),
      action: q('#fm_r_action').value,
      from: q('#fm_r_from').value, to: q('#fm_r_to').value,
      netField: q('#fm_r_netfield').value, netOp: q('#fm_r_netop').value, netValue: q('#fm_r_netvalue').value.trim(),
      tempSource: q('#fm_r_tempsource').value, tempZone: q('#fm_r_tempzone').value || 'thermal_zone0',
      tempCmd: q('#fm_r_tempcmd').value.trim(), tempAt: q('#fm_r_tempat').value.trim(),
      tempOp: q('#fm_r_tempop').value, tempValue: Number(q('#fm_r_tempvalue').value) || 0,
      holdSec: Number(q('#fm_r_holdsec').value) || 30,
      speedIface: q('#fm_r_speediface').value, speedDir: q('#fm_r_speeddir').value,
      speedOp: q('#fm_r_speedop').value, speedValue: Number(q('#fm_r_speedvalue').value) || 0,
    };
    const cfg = engine.config;
    if (editingId) { const i = cfg.rules.findIndex(x => x.id === editingId); if (i >= 0) cfg.rules[i] = rule; else cfg.rules.push(rule); }
    else cfg.rules.push(rule);
    saveEngine(cfg);
    q('#fm_rule_editor').style.display = 'none'; editingId = null;
    renderRuleList(); createToast('规则已保存', 'green');
    if (cfg.enabled) startEngine();
  };
  const renderRuleList = () => {
    const box = document.querySelector(`#${MODAL}`)?.querySelector('#fm_rules_list'); if (!box) return;
    const cfg = engine.config;
    if (!cfg.rules.length) { box.innerHTML = `<div style="opacity:.6">暂无规则, 点“添加规则”。</div>`; return; }
    box.innerHTML = cfg.rules.map((r, i) => `
      <div class="fm-rule">
        <span style="font-size:.6rem;font-weight:700;padding:2px 8px;border-radius:10px;background:rgba(128,128,128,.25)">${TYPE_LABELS[r.type] || r.type}</span>
        <span style="font-size:.7rem;font-weight:600">${escapeHtml(r.name || ('规则' + (i + 1)))}</span>
        <span style="opacity:.7">${escapeHtml(ruleSummary(r))} → ${escapeHtml(ACTIONS[r.action] || r.action)}</span>
        <span style="margin-left:auto;display:flex;gap:6px">
          <button class="btn" data-rule-toggle="${r.id}">${r.enabled ? '停用' : '启用'}</button>
          <button class="btn" data-rule-up="${r.id}">↑</button><button class="btn" data-rule-down="${r.id}">↓</button>
          <button class="btn" data-rule-edit="${r.id}">改</button><button class="btn" data-rule-del="${r.id}">删</button>
        </span>
      </div>`).join('');
    box.querySelectorAll('[data-rule-toggle]').forEach(b => b.onclick = () => { const r = cfg.rules.find(x => x.id === b.dataset.ruleToggle); if (r) { r.enabled = !r.enabled; saveEngine(cfg); renderRuleList(); } });
    box.querySelectorAll('[data-rule-del]').forEach(b => b.onclick = () => { cfg.rules = cfg.rules.filter(x => x.id !== b.dataset.ruleDel); saveEngine(cfg); renderRuleList(); });
    box.querySelectorAll('[data-rule-edit]').forEach(b => b.onclick = () => openEditor(b.dataset.ruleEdit));
    box.querySelectorAll('[data-rule-up]').forEach(b => b.onclick = () => { const i = cfg.rules.findIndex(x => x.id === b.dataset.ruleUp); if (i > 0) { [cfg.rules[i - 1], cfg.rules[i]] = [cfg.rules[i], cfg.rules[i - 1]]; saveEngine(cfg); renderRuleList(); } });
    box.querySelectorAll('[data-rule-down]').forEach(b => b.onclick = () => { const i = cfg.rules.findIndex(x => x.id === b.dataset.ruleDown); if (i >= 0 && i < cfg.rules.length - 1) { [cfg.rules[i + 1], cfg.rules[i]] = [cfg.rules[i], cfg.rules[i + 1]]; saveEngine(cfg); renderRuleList(); } });
  };

  // ==================== 事件 ====================
  const bindEvents = () => {
    const root = document.querySelector(`#${MODAL}`); if (!root) return;
    const q = (s) => root.querySelector(s);

    CH_IDS.forEach((id) => {
      const range = q(`#fm_range_${id}`); if (!range) return;
      range.addEventListener('input', () => { state.dragging = id; q(`#fm_val_${id}`).textContent = range.value; });
      range.addEventListener('change', async () => {
        state.dragging = null;
        await setBrightness(id, parseInt(range.value, 10));
        await refresh(true); saveCurrentScene();
      });
    });

    root.querySelectorAll('[data-quick]').forEach(b => b.onclick = async () => {
      await applyAction(b.dataset.quick);
      createToast('已应用', 'green');
      await refresh(true); saveCurrentScene();
    });

    const sp = q('#fm_fx_speed');
    sp.addEventListener('input', () => { q('#fm_fx_speed_val').textContent = sp.value; });
    q('#fm_fx_apply').onclick = async () => {
      const c = q('#fm_fx_color').value, mode = q('#fm_fx_mode').value, v = parseInt(sp.value, 10);
      if (mode === 'static') await setBrightness(c, CH[c].max);
      else if (mode === 'blink') await setBlink(c, v, v);
      else if (mode === 'breathe') await setBreathe(c, v);
      createToast('特效已应用', 'green');
      await refresh(true); saveCurrentScene();
    };

    q('#fm_auto_btn').onclick = () => {
      const ls = loadSceneLS() || { auto: false, scene: null };
      if (!ls.scene) { createToast('请先设置一种灯光方案', 'red'); return; }
      ls.auto = !ls.auto; saveSceneLS(ls.scene, ls.auto);
      state.autoOn = ls.auto; updateUI();
      createToast(ls.auto ? '已开启自动应用' : '已关闭自动应用', ls.auto ? 'green' : 'pink');
    };
    q('#fm_boot_btn').onclick = toggleBoot;
    q('#fm_restore_btn').onclick = restoreSystem;
    q('#fm_refresh_btn').onclick = () => refresh(false);

    // 规则引擎
    engine.config = loadEngine();
    q('#fm_eng_poll').value = engine.config.pollSec;
    q('#fm_eng_fallback').value = engine.config.fallback;
    q('#fm_r_type').onchange = () => updateEditorVisibility(q('#fm_r_type').value);
    q('#fm_r_netfield').onchange = () => {
      const v = q('#fm_r_netfield').value;
      q('#fm_r_netvalue').placeholder = v === 'wan' ? 'online 或 offline' : (v === 'ntype' ? 'NR_SA / LTE' : '中国移动');
      if (v === 'wan') q('#fm_r_netvalue').value = 'online';
    };
    q('#fm_eng_toggle').onclick = () => {
      engine.config.enabled = !engine.config.enabled;
      engine.config.pollSec = Math.max(2, Number(q('#fm_eng_poll').value) || 5);
      saveEngine(engine.config);
      if (engine.config.enabled) { startEngine(); createToast('规则引擎已启用', 'green'); }
      else { stopEngine(); createToast('规则引擎已停用', 'pink'); }
      updateUI(); renderRuleList();
    };
    q('#fm_eng_poll').onchange = () => {
      engine.config.pollSec = Math.max(2, Number(q('#fm_eng_poll').value) || 5);
      saveEngine(engine.config); if (engine.config.enabled) startEngine();
    };
    q('#fm_eng_fallback').onchange = () => { engine.config.fallback = q('#fm_eng_fallback').value; saveEngine(engine.config); };
    q('#fm_eng_add').onclick = () => openEditor(null);
    q('#fm_r_cancel').onclick = () => { q('#fm_rule_editor').style.display = 'none'; editingId = null; };
    q('#fm_r_save').onclick = () => saveRuleFromEditor();

    ensureTempZones();
    renderRuleList();
    renderLive(engine.lastMatched);
    updateUI();
  };

  // ==================== 主按钮 ====================
  const mainBtn = document.createElement('button');
  mainBtn.classList.add('btn');
  mainBtn.textContent = TITLE;
  mainBtn.onclick = async () => {
    if (typeof checkAdvancedFunc === 'function' && !(await checkAdvancedFunc())) {
      createToast('请先启用高级功能(ROOT)', 'pink');
      return;
    }
    ensureStyle();
    document.querySelector(`#${MODAL}`)?.remove();
    const { id, el } = createModal({
      name: MODAL, title: TITLE, maxWidth: '640px', showConfirm: false,
      onClose: () => true, contentStyle: 'max-height:80vh;', content: buildContent(),
    });
    showModal(id);
    await captureDefaults();
    state.bootOn = await checkBoot();
    const ls0 = loadSceneLS();
    state.autoOn = !!(ls0 && ls0.auto && ls0.scene);
    await refresh(true);
    bindEvents();
  };

  // ==================== 挂载 ====================
  const mountBtn = async () => {
    for (let i = 0; i < 300; i++) {
      const box = document.querySelector('.actions-buttons');
      if (box) { if (!box.contains(mainBtn)) box.appendChild(mainBtn); return; }
      await new Promise(r => setTimeout(r, 120));
    }
  };
  mountBtn();

  // 加载即抓取系统默认(仅首次) + 自动应用 + 启动规则引擎
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  (async () => {
    let n = 0;
    while ((typeof UFI_DATA === 'undefined' || UFI_DATA?.loginfo !== 'ok') && n < 40) { await sleep(300); n++; }
    await captureDefaults();
    try {
      const ls = loadSceneLS();
      if (ls && ls.auto && ls.scene) { await applyScene(ls.scene); createToast('已自动应用上次灯光方案', 'green'); }
    } catch (e) { /* ignore */ }
    try { startEngine(); } catch (e) { /* ignore */ }
  })();
})();
//</script>
