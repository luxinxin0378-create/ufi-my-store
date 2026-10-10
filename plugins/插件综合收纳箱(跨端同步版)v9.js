[KANO_PLUGIN_START] UTools-Beautifier-V1.1.0.js -->
<script>
(function(){
    // ==========================================
    // 0. 核心版本定义与热重载卫士
    //   本文件 = 插件三态收纳箱 + 插件改写管理（原独立插件「折叠改按钮打开」已合并进来）
    //   ⇒ 只需安装这一个插件。卸载它就是「高级后台对插件零侵入」的原样。
    // ==========================================
    const CURRENT_VERSION = "V1.2.0-merged"; // 收纳箱：插件三态管理 + 插件改写管理（已合并「折叠改按钮打开」，单插件即可）+ 设备端配置同步

    // 防重复挂载：清理旧的 DOM，方便直接修改代码后生效
    const oldToolbox = document.getElementById('collapse_toolbox');
    if (oldToolbox && oldToolbox.parentElement && oldToolbox.parentElement.className === 'collapse_box') {
        oldToolbox.parentElement.remove();
    }
    document.querySelectorAll('#KanoDrawerModal, #KanoBeautyModal').forEach(m => m.remove());

    if (window.__KANO_BEAUTY_V1__) return;
    window.__KANO_BEAUTY_V1__ = true;

    // ==========================================
    // 1. 配置与持久化
    //    单一数据源 = 设备端共享文件，localStorage 仅作本地缓存（首屏秒开 + 离线兜底）
    //    这样同一台设备的任意浏览器/手机打开高级后台，读到的都是同一份收纳状态
    // ==========================================
    const CONFIG_KEY = 'kano_beautifier_v1_config';
    const DEVICE_DIR = '/data/kano_beautifier';
    const DEVICE_FILE = `${DEVICE_DIR}/kano_beautifier_config.json`;
    const SYNC_DOC_VERSION = 1;
    const ABSENT_MARKER = '__KANO_ABSENT__';

    const defaultConfig = {
        enableRadius: true, enableShadow: true, enableCapsule: true,
        enableGlass: false, enableCompact: false, enableGradient: true,
        enableHover: true, enableScrollbar: true, pluginStates: {},
        pluginOrder: [],
        gradColor1: '#87ceeb', gradColor2: '#3b82f6'
    };

    // 三种状态的唯一数据源：0=常驻(主页显示) 1=收纳(放入收纳箱) 2=隐藏(完全不可见)
    // 3 = 未改写（内部态，只由「插件改写管理」写入：该插件的折叠面板没改成按钮，
    //     因此不出现在状态管理页，也无法设置三态。它复用同一条记录 =>
    //     「改写 / 未改写」跟三态共用时间戳，两个 tab 不会互相覆盖，且照旧跨端同步）
    const PLUGIN_STATES = [
        { value: 0, label: '常驻', title: '主页显示' },
        { value: 1, label: '收纳', title: '放入收纳箱' },
        { value: 2, label: '隐藏', title: '完全不可见' }
    ];
    const UNREWRITTEN = 3;
    const isStateValue = (s) => s === 0 || s === 1 || s === 2 || s === UNREWRITTEN;
    const RESERVED_NAMES = ["🛠️ 收纳设置", "📦 收纳箱"];

    // ---------- 1.1 同步文档 ----------
    // states: { [插件名]: { s: 0|1|2, t: 生效时间戳 } }
    // 逐键时间戳 => 两个客户端各改不同插件时互不覆盖（整份覆盖会丢改动）
    let syncDoc = {
        v: SYNC_DOC_VERSION,
        savedAt: 0,
        states: {},
        order: { list: [], t: 0 },
        ui: { t: 0, values: {} }
    };
    let config = { ...defaultConfig };

    // 运行时状态（不落盘）
    let clockOffset = 0;          // 设备时间 - 本机时间，抵消多台手机之间的时钟偏差
    let deviceStatus = 'unknown'; // unknown | syncing | ok | absent | unavailable
    let lastPullAt = 0;
    let pushInFlight = false;
    let pushPending = false;

    const now = () => Date.now() + clockOffset;

    // ---------- 1.2 运行环境 / 编解码 ----------
    // runShellWithRoot 由高级功能注入；未开启高级功能时整体降级为「仅本地」
    const runShell = async (cmd, timeout) => {
        let fn = null;
        try { fn = (typeof runShellWithRoot === 'function') ? runShellWithRoot : null; } catch (e) { fn = null; }
        if (typeof fn !== 'function') fn = window.runShellWithRoot;
        if (typeof fn !== 'function') return null;
        try {
            return await fn(cmd, timeout);
        } catch (e) {
            console.error('[KanoSync] shell 执行失败：', e);
            return null;
        }
    };

    // 配置里有中文插件名/emoji，不能用裸 btoa，必须走 UTF-8 字节
    const b64encode = (str) => {
        const bytes = new TextEncoder().encode(str);
        let bin = '';
        bytes.forEach(b => { bin += String.fromCharCode(b); });
        return btoa(bin);
    };
    const b64decode = (b64) => {
        const bin = atob(String(b64).replace(/\s+/g, ''));
        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    };

    const localDebounce = (fn, delay) => {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };

    // ---------- 1.3 文档规范化 / 合并 ----------
    const emptyDoc = () => ({
        v: SYNC_DOC_VERSION, savedAt: 0, states: {},
        order: { list: [], t: 0 }, ui: { t: 0, values: {} }
    });

    const isStateValueDefinedAtTop = true;   // isStateValue 定义见第 1 节（含未改写态 3）


    const normalizeDoc = (raw) => {
        const out = emptyDoc();
        if (!raw || typeof raw !== 'object') return out;
        out.savedAt = Number(raw.savedAt) || 0;

        if (raw.states && typeof raw.states === 'object') {
            Object.keys(raw.states).forEach(n => {
                const e = raw.states[n];
                if (e && typeof e === 'object') {
                    const s = Number(e.s);
                    if (isStateValue(s)) out.states[n] = { s, t: Number(e.t) || 0 };
                } else if (isStateValue(Number(e))) {
                    out.states[n] = { s: Number(e), t: 0 }; // 兼容早期「纯数字」写法
                }
            });
        }
        if (raw.order && Array.isArray(raw.order.list)) {
            out.order = {
                list: raw.order.list.filter(n => typeof n === 'string'),
                t: Number(raw.order.t) || 0
            };
        }
        if (raw.ui && raw.ui.values && typeof raw.ui.values === 'object') {
            out.ui = { t: Number(raw.ui.t) || 0, values: raw.ui.values };
        }
        return out;
    };

    // 旧版（只有 localStorage、无时间戳）配置迁移成同步文档
    const docFromLegacyConfig = (old) => {
        const doc = emptyDoc();
        if (!old || typeof old !== 'object') return doc;
        const t = 0; // 迁移数据没有可信时间戳，让设备端已存在的记录优先
        if (old.pluginStates && typeof old.pluginStates === 'object') {
            Object.keys(old.pluginStates).forEach(n => {
                const s = Number(old.pluginStates[n]);
                if (isStateValue(s)) doc.states[n] = { s, t };
            });
        }
        if (Array.isArray(old.pluginOrder)) doc.order = { list: old.pluginOrder.slice(), t };
        const uiValues = {};
        Object.keys(defaultConfig).forEach(k => {
            if (k === 'pluginStates' || k === 'pluginOrder') return;
            if (old[k] !== undefined) uiValues[k] = old[k];
        });
        doc.ui = { t, values: uiValues };
        return doc;
    };

    // 逐键取较新者；合并可交换，因此「合并结果 != 远端」就说明本地有新内容需要回推
    const mergeDocs = (a, b) => {
        const out = emptyDoc();
        out.savedAt = Math.max(Number(a.savedAt) || 0, Number(b.savedAt) || 0);

        const names = {};
        Object.keys(a.states || {}).forEach(n => { names[n] = 1; });
        Object.keys(b.states || {}).forEach(n => { names[n] = 1; });
        Object.keys(names).forEach(n => {
            const x = a.states[n], y = b.states[n];
            if (!x) out.states[n] = y;
            else if (!y) out.states[n] = x;
            else out.states[n] = (Number(y.t) || 0) > (Number(x.t) || 0) ? { s: y.s, t: y.t } : { s: x.s, t: x.t };
        });

        out.order = (Number(b.order.t) || 0) > (Number(a.order.t) || 0)
            ? { list: b.order.list.slice(), t: b.order.t }
            : { list: a.order.list.slice(), t: a.order.t };

        out.ui = (Number(b.ui.t) || 0) > (Number(a.ui.t) || 0)
            ? { t: b.ui.t, values: { ...b.ui.values } }
            : { t: a.ui.t, values: { ...a.ui.values } };

        return out;
    };

    // 语义比较：不能直接用 JSON.stringify，两个客户端的 states 键插入顺序可能不同，
    // 那样会被误判成「有本地新内容」从而反复回推（A/B 互相覆盖的 ping-pong）
    // savedAt 只作诊断用途，不参与比较：合并取 max 会让它天然不同
    const docEquals = (a, b) => {
        const ka = Object.keys(a.states), kb = Object.keys(b.states);
        if (ka.length !== kb.length) return false;
        for (const n of ka) {
            const x = a.states[n], y = b.states[n];
            if (!y) return false;
            if ((Number(x.s) || 0) !== (Number(y.s) || 0)) return false;
            if ((Number(x.t) || 0) !== (Number(y.t) || 0)) return false;
        }

        if ((Number(a.order.t) || 0) !== (Number(b.order.t) || 0)) return false;
        if (a.order.list.join('\u0000') !== b.order.list.join('\u0000')) return false;

        if ((Number(a.ui.t) || 0) !== (Number(b.ui.t) || 0)) return false;
        const ua = a.ui.values || {}, ub = b.ui.values || {};
        const uka = Object.keys(ua), ukb = Object.keys(ub);
        if (uka.length !== ukb.length) return false;
        for (const k of uka) {
            if (!(k in ub)) return false;
            if (JSON.stringify(ua[k]) !== JSON.stringify(ub[k])) return false;
        }
        return true;
    };

    // 同步文档 -> 运行时 config（其余代码只认 config，不用感知同步层）
    const rebuildConfig = () => {
        const pluginStates = {};
        Object.keys(syncDoc.states).forEach(n => { pluginStates[n] = syncDoc.states[n].s; });
        config = {
            ...defaultConfig,
            ...(syncDoc.ui.values || {}),
            pluginStates,
            pluginOrder: syncDoc.order.list.slice()
        };
    };

    // ---------- 1.4 读写 ----------
    const persistLocal = () => {
        try {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(syncDoc));
        } catch (e) {
            console.error('[KanoSync] 本地缓存写入失败：', e);
        }
    };

    const setDeviceStatus = (st) => {
        deviceStatus = st;
        updateSyncBar();
    };

    // 落盘：改动 -> 重建 config -> 本地缓存 -> 设备端（防抖合并多次点击）
    const commit = () => {
        syncDoc.savedAt = now();
        rebuildConfig();
        persistLocal();
        schedulePush();
    };

    const pushDevice = async () => {
        if (pushInFlight) { pushPending = true; return; }
        pushInFlight = true;
        try {
            const b64 = b64encode(JSON.stringify(syncDoc));
            const res = await runShell(
                `mkdir -p ${DEVICE_DIR} && printf '%s' '${b64}' | base64 -d > ${DEVICE_DIR}/.cfg.tmp && ` +
                `mv ${DEVICE_DIR}/.cfg.tmp ${DEVICE_FILE} && chmod 666 ${DEVICE_FILE}`,
                15000
            );
            if (res && res.success) setDeviceStatus('ok');
            else if (res) setDeviceStatus('unavailable');
            else setDeviceStatus('unavailable');
        } finally {
            pushInFlight = false;
            if (pushPending) {
                pushPending = false;
                schedulePush();
            }
        }
    };

    const schedulePush = localDebounce(() => { pushDevice(); }, 400);

    // 拉取：设备端文档 -> 与本地按时间戳合并 -> 有本地新内容则回推
    let pullInFlight = false;
    const pullDevice = async (opts = {}) => {
        if (pullInFlight) return false;
        pullInFlight = true;
        const t0 = Date.now();
        try {
            // 顺带取设备时间，作为时间戳基准，避免多台手机时钟不一致导致「谁改都失效」
            const res = await runShell(
                `echo "KANO_NOW=$(date +%s)"; ` +
                `test -f ${DEVICE_FILE} && base64 ${DEVICE_FILE} | tr -d '\\n' || echo ${ABSENT_MARKER}`,
                10000
            );
            const t1 = Date.now();
            if (!res) { setDeviceStatus('unavailable'); return false; }

            const raw = String(res.content || '');
            const m = raw.match(/KANO_NOW=(\d+)/);
            if (m) clockOffset = Number(m[1]) * 1000 - Math.round((t0 + t1) / 2);

            const body = raw.replace(/KANO_NOW=\d+\s*/, '').trim();
            if (!body || body.indexOf(ABSENT_MARKER) !== -1) {
                // 设备端还没有这份配置（首次安装/被清理）：把本地作为初始值推上去
                setDeviceStatus('absent');
                if (!opts.skipPush) pushDevice();
                return false;
            }

            let remote;
            try {
                remote = normalizeDoc(JSON.parse(b64decode(body)));
            } catch (e) {
                console.error('[KanoSync] 设备端配置解析失败，本次跳过同步：', e);
                setDeviceStatus('unavailable');
                return false;
            }

            const before = normalizeDoc(syncDoc);
            syncDoc = mergeDocs(syncDoc, remote);
            rebuildConfig();
            if (!docEquals(before, syncDoc)) persistLocal();

            applyBartenderLogic();
            notifyRewriteHost();
            const modal = document.getElementById('KanoBeautyModal');
            if (modal && modal.style.display !== 'none') renderPluginList();

            setDeviceStatus('ok');
            // 合并结果与远端不一致 => 本地有更新的内容，需要回推；再合并一次必然收敛，不会 ping-pong
            if (!docEquals(syncDoc, remote)) pushDevice();
            return true;
        } finally {
            pullInFlight = false;
            lastPullAt = Date.now();
        }
    };

    // 打开设置面板 / 切回前台时顺手拉一次（限流，避免频繁 shell）
    const pullThrottled = () => {
        if (Date.now() - lastPullAt < 3000) return;
        pullDevice({ skipPush: false });
    };

    // 启动：先用本地缓存同步渲染（不阻塞首屏），再异步对齐设备端
    (() => {
        let local = null;
        try { local = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); } catch (e) { local = null; }
        if (local && local.states && local.order) syncDoc = normalizeDoc(local);
        else if (local && local.pluginStates) syncDoc = docFromLegacyConfig(local);
        else syncDoc = emptyDoc();
        rebuildConfig();
        persistLocal();
    })();

    // ---------- 1.5 写入入口（原 knSetPluginState / pluginOrder 回写统一走这里） ----------
    // 状态机：0=常驻 1=收纳 2=隐藏 3=未改写（内部态，见 PLUGIN_STATES 说明）
    const setPluginState = (name, state) => {
        if (!name) return;
        // 「改写 / 未改写」和三态共用同一条记录与同一个时间戳
        //   （改写 = 0/1/2，未改写 = 3），因此两个 tab 不会互相覆盖，
        //   也天然接入了原有的跨端同步合并逻辑。
        syncDoc.states[name] = { s: Number(state) || 0, t: now() };
        commit();
    };

    const setPluginOrder = (list) => {
        syncDoc.order = { list: list.slice(), t: now() };
        commit();
    };

    // ==========================================
    // 2. 宽屏拟态 CSS (Glassmorphism)
    // ==========================================
    const injectCSS = () => {
        if (document.getElementById('kano-beauty-v1-style')) return;
        const style = document.createElement('style');
        style.id = 'kano-beauty-v1-style';
        style.textContent = `
            #KanoBeautyModal, #KanoDrawerModal {
                position: fixed !important; top: 0 !important; left: 0 !important;
                width: 100vw !important; height: 100vh !important;
                background: rgba(0,0,0,0.5) !important; z-index: 999999 !important;
                justify-content: center !important; align-items: center !important;
            }

            #toolbox_buttons button, #secondary_menu_buttons button {
                margin: 4px !important;
                white-space: nowrap;
                font-size: 13px !important;
            }

            .kn-glass-modal {
                background: rgba(30, 30, 30, 0.7) !important;
                backdrop-filter: blur(25px) saturate(200%);
                -webkit-backdrop-filter: blur(25px) saturate(200%);
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-radius: 24px !important;
                box-shadow: 0 30px 60px rgba(0,0,0,0.6) !important;
                max-height: 90vh !important;
                overflow-y: auto !important;
            }

            #KanoBeautyModal .modal {
                width: 55% !important;
                min-width: 520px;
                max-width: 800px;
                padding: 30px 40px !important;
            }

            #KanoDrawerModal .modal {
                width: 85% !important;
                max-width: 480px;
                padding: 25px !important;
            }

            /* 一屏正好显示 5 行：用 --kn-row-h 推出列表高度，
               最后一行完整可见 ⇒ 下面正好露出第 6 行的顶边，
               给用户「下面还有内容」的提示。
               行高不写死像素，而是由运行时按当前 rem/字体实测后写回 --kn-row-h，
               这样手机（换行布局更高）和电脑（单行布局更矮）都能保证是 5 行。 */
            .kn-plugin-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: calc(5 * var(--kn-row-h) + 4 * 8px + 20px);
                overflow-y: auto;
                padding: 2px 6px 2px 2px;
                animation: knFadeIn 0.3s ease;
            }

            @keyframes knFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .kn-plugin-row {
                display: flex;
                align-items: center;
                gap: 12px;
                background: rgba(0,0,0,0.25);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 14px;
                padding: 8px 12px;
                transition: background 0.2s, border-color 0.2s;
            }

            .kn-plugin-row:hover {
                background: rgba(255,255,255,0.06);
                border-color: rgba(255,255,255,0.18);
            }

            .kn-plugin-name {
                flex: 1 1 auto;
                min-width: 0;
                text-align: left;
                font-size: 13px;
                color: #eee;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .kn-state-group {
                flex: 0 0 auto;
                display: flex;
                gap: 6px;
            }

            .kn-state-btn {
                padding: 4px 12px;
                font-size: 12px;
                border-radius: 10px;
                cursor: pointer;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.15);
                color: #999;
                transition: all 0.2s;
            }

            .kn-state-btn:hover {
                color: #fff;
                background: rgba(255,255,255,0.15);
            }

            .kn-state-btn.active {
                font-weight: bold;
            }

            .kn-state-btn.active.s0 {
                color: #86efac;
                border-color: rgba(52,199,89,0.6);
                background: rgba(52,199,89,0.2);
            }

            .kn-state-btn.active.s1 {
                color: #87ceeb;
                border-color: rgba(135,206,235,0.6);
                background: rgba(135,206,235,0.2);
            }

            .kn-state-btn.active.s2 {
                color: #ff9a9a;
                border-color: rgba(255,107,107,0.6);
                background: rgba(255,107,107,0.2);
            }

            /* 三态说明：字号再小一号，并且居中 */
            .kn-state-legend {
                font-size: 10px;
                color: #aaa;
                opacity: 0.6;
                text-align: center;
                margin-bottom: 12px;
                background: rgba(0, 0, 0, 0.3);
                padding: 4px 10px;
                border-radius: 10px;
                line-height: 1.5;
            }

            .kn-sync-bar {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
                padding: 8px 12px;
                border-radius: 12px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.08);
                font-size: 12px;
                color: #aaa;
            }

            .kn-sync-dot {
                width: 8px; height: 8px; border-radius: 50%;
                background: #888; flex: 0 0 auto;
            }

            .kn-sync-dot.ok { background: #34c759; box-shadow: 0 0 8px rgba(52,199,89,0.8); }
            .kn-sync-dot.busy { background: #87ceeb; }
            .kn-sync-dot.bad { background: #ff6b6b; }

            .kn-sync-text { flex: 1 1 auto; min-width: 0; }

            .kn-empty-tip {
                width: 100%;
                padding: 30px 10px;
                text-align: center;
                color: #666;
                font-size: 12px;
            }

            /* tab 栏 */
            .kn-tabs {
                display: flex;
                gap: 8px;
                margin-bottom: 14px;
                flex-wrap: wrap;
                justify-content: center;   /* tab 切换按钮居中 */
            }

            .kn-tabs button {
                -webkit-tap-highlight-color: transparent;
                transition: all 0.2s;
            }

            .kn-sync-tip {
                font-size: 11px;
                line-height: 1.6;
                color: #ffb4b4;
                background: rgba(255, 107, 107, 0.08);
                border: 1px solid rgba(255, 107, 107, 0.25);
                border-radius: 10px;
                padding: 7px 10px;
                margin: -4px 0 12px;
            }

            /* 状态管理页底部的「去改写管理勾选」引导 */
            /* 底部提示：已去掉外框，字号也调小 */
            .kn-rewrite-jump {
                margin-top: 12px;
                font-size: 11px;
                line-height: 1.6;
                color: #888;
                background: none;
                border: none;
                padding: 0;
            }

            .kn-link {
                background: none;
                border: none;
                padding: 0 1px;
                color: #87ceeb;
                font-size: 11px;
                cursor: pointer;
                text-decoration: underline;
                -webkit-tap-highlight-color: transparent;
            }

            @media (max-width: 768px) {
                #KanoBeautyModal .modal {
                    width: 92% !important;
                    min-width: unset;
                    padding: 20px !important;
                }

                .kn-plugin-row {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 8px;
                }

                .kn-plugin-name {
                    text-align: center;
                }

                .kn-state-group {
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    };

    // ==========================================
    // 3. 全局 API
    // ==========================================
    window.knShowBeautyModal = () => {
        const m = document.getElementById('KanoBeautyModal');
        if (!m) return;
        renderPluginList();
        switchTab(activeTab);          // 保持上次停留的 tab，并同步两份界面
        m.style.display = 'flex';
        pullThrottled();
        // 插件面板是异步注入的：切到改写页时补渲染几次
        if (activeTab === 'rewrite') pushRewriteTabRefresh();
    };
    window.knCloseBeautyModal = () => { const m = document.getElementById('KanoBeautyModal'); if (m) m.style.display = 'none'; };
    window.knShowDrawerModal = () => { const m = document.getElementById('KanoDrawerModal'); if (m) m.style.display = 'flex'; };
    window.knCloseDrawerModal = () => { const m = document.getElementById('KanoDrawerModal'); if (m) m.style.display = 'none'; };

    // 单一写入入口：改状态 -> 落盘(本地+设备端) -> 应用分发 -> 刷新列表
    window.knSetPluginState = (name, state) => {
        setPluginState(name, state);
        applyBartenderLogic();
        renderPluginList();
        notifyRewriteHost();
    };

    // 手动同步：读设备 -> 合并 -> 需要时回推
    window.knSyncNow = async () => {
        setDeviceStatus('syncing');
        const ok = await pullDevice();
        renderPluginList();
        createToastSafe(ok ? '已与设备端配置同步' : '设备端同步失败，请确认已开启高级功能', ok ? 'green' : 'red');
    };

    // 把当前配置强制覆盖到设备端（本地为准）
    window.knPushToDevice = async () => {
        setDeviceStatus('syncing');
        await pushDevice();
        const ok = deviceStatus === 'ok';
        renderPluginList();
        createToastSafe(ok ? '已覆盖写入设备端' : '写入失败，请确认已开启高级功能', ok ? 'green' : 'red');
    };

    const createToastSafe = (text, color) => {
        if (typeof createToast === 'function') createToast(text, color);
        else console.log('[KanoSync]', text);
    };

    // ==========================================
    // 3.5 收纳设置的两个 tab
    //   ① 插件状态管理（原有）：只列「已改写」的插件，设置 常驻/收纳/隐藏
    //   ② 插件改写管理：由第 4.5 节的模块渲染进 #kn-pm4-panel
    //   两份数据都在同一份同步文档里（states），因此天然接入原有跨端同步
    // ==========================================
    const PM4_PANEL_ID = 'kn-pm4-panel';
    const PM4_TITLE = '插件改写管理';
    const TAB_BTN_BASE = 'padding:6px 16px;font-size:13px;border-radius:10px;cursor:pointer;'
        + 'border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.05);color:#999;';
    const TAB_BTN_ON = 'padding:6px 16px;font-size:13px;border-radius:10px;cursor:pointer;'
        + 'border:1px solid rgba(135,206,235,0.45);background:rgba(135,206,235,0.16);'
        + 'color:#87ceeb;font-weight:bold;';

    let activeTab = 'state';

    const switchTab = (tab) => {
        activeTab = tab === 'rewrite' ? 'rewrite' : 'state';
        const isRewrite = activeTab === 'rewrite';
        const tState = document.getElementById('kn-tab-state');
        const tRewrite = document.getElementById('kn-tab-rewrite');
        const pState = document.getElementById('kn-panel-state');
        const pRewrite = document.getElementById('kn-panel-rewrite');
        if (tState) tState.setAttribute('style', isRewrite ? TAB_BTN_BASE : TAB_BTN_ON);
        if (tRewrite) tRewrite.setAttribute('style', isRewrite ? TAB_BTN_ON : TAB_BTN_BASE);
        if (pState) pState.style.display = isRewrite ? 'none' : '';
        if (pRewrite) pRewrite.style.display = isRewrite ? '' : 'none';
        if (isRewrite) renderRewriteTab();
    };
    window.knSwitchSettingsTab = switchTab;

    // 同步文档有任何变化（其它标签页 / 其它手机合并进来）后，
    // 通知第 4.5 节模块重新读取状态并应用到页面。
    //   只读不写 => 不会和拉取/回推形成循环。
    const notifyRewriteHost = () => {
        try { pm4Refresh(); }
        catch (e) { console.error('[KanoSync] 刷新改写界面失败：', e); }
    };

    // 渲染「插件改写管理」页
    const renderRewriteTab = () => {
        const panel = document.getElementById(PM4_PANEL_ID);
        if (!panel) return;
        if (!panel.firstChild) {
            panel.innerHTML = '<div class="kn-empty-tip">暂未识别到可改写的插件面板</div>';
        }
        try { pm4EnsureStyle(); pm4Refresh(); }
        catch (e) { console.error('[KanoSync] 渲染改写管理失败：', e); }
    };

    // 切到「改写管理」页时，若该插件脚本比本插件晚加载，稍后自动补渲染一次
    const pushRewriteTabRefresh = () => {
        [300, 1200, 3000].forEach(ms => setTimeout(() => {
            if (activeTab === 'rewrite') renderRewriteTab();
        }, ms));
    };

    // 「未改写」的插件，其入口按钮若残留了「已改写」时的隐藏标记，就把它清掉。
    //   场景：在 A 端把插件改写成按钮（按钮被隐藏），在 B 端又改回未改写；
    //   B 端把按钮恢复成常驻，但 A 端那份按钮还是隐藏的（B 端的 DOM 操作在 A 端看不到）。
    //   「已改写」是常驻/收纳/隐藏三种状态的公共前置，状态为 0/1 时这个隐藏标记一定不该存在，
    //   所以在这里清掉是安全的。
    const healShadowedPanels = () => {
        const toolbox = document.getElementById('toolbox_buttons');
        const secondary = document.getElementById('secondary_menu_buttons');
        [toolbox, secondary].forEach(box => {
            if (!box) return;
            box.querySelectorAll('button').forEach(btn => {
                const name = btn.textContent.trim();
                if (!name || RESERVED_NAMES.indexOf(name) !== -1) return;
                const st = Number(config.pluginStates[name] || 0);
                if (st === 0 || st === 1) {
                    if (btn.style.display === 'none') btn.style.display = 'inline-block';
                } else if (st === UNREWRITTEN) {
                    if (btn.style.display !== 'none') btn.style.display = 'none';
                }
            });
        });
    };


    // ==========================================
    // 4.5 插件改写管理（原「折叠改按钮打开」插件，已合并进来）
    //   把用户安装的插件折叠面板改造成「按钮 + 模态框」，
    //   与「CPU高级性能调节器」「分区管理插件」做法一致，
    //   从而能被上面的三态管理（常驻/收纳/隐藏）收纳。
    //   状态：未改写 = 3（内部态，不进状态管理页）；改写 = 0/1/2 三态。
    // ==========================================



      const PM4_CFG = {
        PANEL_SEL: '.collapse',
        BOX_SEL: '.collapse_box',

        // 页面自带的**内置面板**：一律不改（取自 assets/index.html）
        BUILTIN_IDS: [
          'collapse_menu',            // 功能列表（按钮要挂进去的那个）
          'collapse_device_mon',      // 设备监控
          'collapse_status',          // 状态信息
          'collapse_ttyd',            // TTYD
          'collapse_lkband',          // 锁定频段
          'collapse_lkcell',          // 锁定基站
          'collapse_dhcp',            // DHCP（在 LAN 弹窗内）
          'collapse_smsforward',      // 短信转发（在弹窗内）
          // 收纳箱自己的面板，绝不能接管：
          // #toolbox_buttons（被收纳按钮的落脚点）就在它内部，一旦收起，收纳箱即失效。
          'collapse_toolbox',
        ],

        ACTIONS_SEL: '.actions-buttons',
        TOOLBOX_ID: 'toolbox_buttons',

        STYLE_ID: 'kano_pm4_style',
        BTN_CLS: 'kano-pm4-btn',
        ROW_CLS: 'kano-pm4-row',
        MASK_CLS: 'kano-pm4-mask',
        HEAD_CLS: 'kano-pm4-head',
        MANAGED_CLS: 'kano-pm4-managed',
        PROMO_CLS: 'kano-pm4-promo',
        LOCK_CLS: 'kano-pm4-lock',
        DONE_ATTR: 'data-kano-pm4',
        PANEL_ATTR: 'data-kano-pm4-panel',

        // [v4.2] 设置界面整个搬进「📦 插件收纳箱 → 🛠️ 收纳设置」里做一个 tab 页。
        //    tab 与内容容器都由收纳箱提供，本插件只负责把内容填进去，
        //    因此这里只保留容器 id 与 tab 名。
        PANEL_ID: 'kn-pm4-panel',
        PANEL_TITLE: '插件改写管理',
        LS_KEY_HINT: 'kano_pm4_disabled',   // 仅用于「未装收纳箱」时的降级存储
        STATE_UNREWRITTEN: 3,               // 收纳箱文档里代表「未改写」的状态码

        BTN_TITLE: '点击打开该插件面板',
        CLOSE_TEXT: '关闭',
      };

      // ---------- 小工具 ----------
      const pm4Toast = (msg, color, delay) => {
        try { if (typeof createToast === 'function') return createToast(msg, color, delay); } catch (e) { }
        console.log('[收纳箱·改写]', msg);
      };

      const pm4Esc = (v = '') => String(v).replace(/[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

      // 配置读写：合并后直接落在本插件的同步文档上
      //   「未改写」= state 3，与三态共用同一条记录与同一个时间戳，
      //   所以两个 tab 不会互相覆盖，也天然接入原有的跨端同步。
      const loadDisabled = () => {
        const states = syncDoc.states || {};
        return new Set(Object.keys(states).filter((n) => Number(states[n] && states[n].s) === PM4_CFG.STATE_UNREWRITTEN));
      };
      let pm4DisabledSet = loadDisabled();

      // [修复5b] 面板标题：取标题行里第一个 strong/span 的文字。
      //   取不到就返回空串 —— 调用方会**跳过该面板**，绝不再回退成「插件」，
      //   否则会冒出一条点开空白的幽灵条目（如电池插件的 #collapse_charge_plugin，
      //   它的前一个兄弟节点是「直供电关」按钮，不是 .title）。
      const pm4PanelTitle = (panel) => {
        const row = panel.previousElementSibling;
        if (!row || !row.querySelector) return '';
        const node = row.querySelector('strong, span');
        let text = String(node?.textContent || '');
        // 兜底：标题行本身就是纯文本（<div class="title">插件名</div>）；
        // 但功能按钮（BUTTON/INPUT）的文字不能当插件名。
        if (!text.trim() && row.tagName !== 'BUTTON' && row.tagName !== 'INPUT') {
          text = String(row.textContent || '');
        }
        return text.replace(/\s+/g, ' ').trim();
      };

      // 插件名作为稳定标识（收纳箱也用按钮文字当 key，保持一致）
      const pm4KeyOf = (panel) => pm4PanelTitle(panel);

      // [修复5a] 祖先链上只要有 display:none / visibility:hidden（含 .mask/.modal），
      //   该面板就不该被提升成页面级弹层 —— 提上去祖先仍是隐藏的，只会弹出空白。
      //   典型：电池检测插件的 #collapse_charge_plugin 在
      //   <div id="charge_plugin" class="modal" style="display:none"> 里。
      const pm4IsHiddenPanel = (panel) => {
        if (panel.closest && panel.closest('.mask, .modal')) return true;
        if (panel.offsetParent !== null) return false;      // 快速路径：确实可见
        for (let n = panel; n && n.nodeType === 1; n = n.parentElement) {
          let cs = null;
          try { cs = getComputedStyle(n); } catch (e) { cs = null; }
          if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) return true;
          if (n === document.body) break;
        }
        return false;
      };

      // [修复1] 有效内容：.collapse 内有元素子节点即可（不再强制要求 .collapse_box）
      const pm4HasContent = (panel) => {
        if (panel.querySelector(PM4_CFG.BOX_SEL)) return true;
        return Array.from(panel.children).some((c) => {
          if (c.classList.contains(PM4_CFG.HEAD_CLS)) return false;         // 我们自己插入的标题条
          const tag = c.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE') return false;
          return true;                                                  // 如 TurboACC 的 .acc-card
        });
      };

      const pm4IsBuiltin = (panel) => {
        if (PM4_CFG.BUILTIN_IDS.includes(panel.id || '')) return true;
        if (panel.classList.contains('collapse_menu')) return true;
        return false;
      };

      const pm4ShouldSkip = (panel) => {
        if (panel.getAttribute(PM4_CFG.DONE_ATTR) === '1') return true;
        if (pm4IsBuiltin(panel)) return true;
        if (panel.closest && panel.closest('.mask')) return true;    // 弹窗内部本来就是弹层
        if (pm4IsHiddenPanel(panel)) return true;                       // [修复5a] 祖先隐藏 → 提上来也是空白
        if (!pm4HasContent(panel)) return true;
        if (!panel.previousElementSibling || !panel.previousElementSibling.classList) return true;
        if (!pm4PanelTitle(panel)) return true;                         // [修复5b] 没有真实插件名 → 跳过
        return false;
      };

      // ---------- 样式 ----------
      const pm4EnsureStyle = () => {
        if (document.getElementById(PM4_CFG.STYLE_ID)) return;
        const st = document.createElement('style');
        st.id = PM4_CFG.STYLE_ID;
        st.textContent = `
          /* 打开期间中和会破坏 position:fixed 的祖先属性。
             .container 的 filter 使其成为包含块（弹层随滚动偏移），
             transition 让"取消 filter"持续 .5s（过渡期间同样偏移），两者都置 none。
             另附 :has() 兜底：部分固件把 filter 写在 #BG_OVERLAY 上。 */
          body.${PM4_CFG.LOCK_CLS}{ transform:none !important; -webkit-transform:none !important; }
          body.${PM4_CFG.LOCK_CLS} > #BG_OVERLAY{ transform:none !important; -webkit-transform:none !important; }
          body.${PM4_CFG.LOCK_CLS} > #BG_OVERLAY > .container,
          body.${PM4_CFG.LOCK_CLS} > #BG_OVERLAY > div:has(> .container){
            filter:none !important; -webkit-filter:none !important;
            transition:none !important; -webkit-transition:none !important;
            opacity:1 !important;
          }

          /* 被接管的面板：强制收起（collapseGen 默认 open，不强制会展开在页面上）。
             transition 禁掉：否则关闭时高度从 auto 动画到 0，会在原位闪一下内容。 */
          .${PM4_CFG.MANAGED_CLS}{
            height:0 !important; overflow:hidden !important;
            margin:0 !important; padding:0 !important;
            transition:none !important; -webkit-transition:none !important;
          }

          /* [修复2] 原折叠栏整行隐藏 —— 不留任何占位。
             display:none 已经让该行及内部一切（开关/宿主/文字/margin/padding/border）
             完全不参与布局，无需再单独归零，这里保留 margin 归零作为兜底。 */
          .${PM4_CFG.ROW_CLS}{
            display:none !important;
            margin:0 !important; padding:0 !important;
            border:0 !important; min-height:0 !important;
          }

          /* 外层包裹层可能带 margin，一并归零，避免残留空档 */
          .${PM4_CFG.ROW_CLS}-host{ margin-top:0 !important; margin-bottom:0 !important; }

          /* 遮罩：挂 documentElement，脱离 .container 的滚动/裁剪 */
          .${PM4_CFG.MASK_CLS}{
            position:fixed !important; top:0; left:0; right:0; bottom:0;
            z-index:999998 !important; background:rgba(0,0,0,.45);
            display:none;
          }

          /* ===== 模态框：把原面板「提升」成居中弹层 =====
             [新增4] 多端自适应：
               · 尺寸用 rem / vw / vh 组合，随页面 rem 基准一起缩放；
               · width 用 min() 同时受 vw 与最大宽度约束，窄屏自动收窄；
               · max-height 用 vh 与 dvh 双写（dvh 处理手机地址栏伸缩）；
               · 底部留 safe-area，避免被 iPhone 手势条压住。
             transition 必须 none：.collapse 自带 transition:all .3s，
             否则定位会从旧值动画过来（实测中途 transform 仍是单位矩阵）。 */
          .${PM4_CFG.MANAGED_CLS}.${PM4_CFG.PROMO_CLS}{
            position:fixed !important;
            top:50% !important; left:50% !important;
            transform:translate(-50%,-50%) !important;
            width:min(92vw, 40rem) !important;
            max-width:40rem !important;
            height:auto !important;
            max-height:min(86vh, 40rem) !important;
            overflow:auto !important; overflow-x:hidden !important;
            box-sizing:border-box !important;
            margin:0 !important;
            padding:1rem !important;
            padding-bottom:calc(1rem + env(safe-area-inset-bottom)) !important;
            z-index:999999 !important;
            border-radius:.7rem !important;
            background-color:var(--dark-bgi-color,#1f2937) !important;
            box-shadow:0 0 1rem 0 #000000a0 !important;
            backdrop-filter:blur(.7rem) !important; -webkit-backdrop-filter:blur(.7rem) !important;
            transition:none !important; -webkit-transition:none !important;
            animation:kano_pm4_fade .16s ease-out;
            -webkit-overflow-scrolling:touch;
          }
          /* 支持 dvh 时优先用 dvh（手机地址栏收起/展开不会跳） */
          @supports (max-height: 100dvh){
            .${PM4_CFG.MANAGED_CLS}.${PM4_CFG.PROMO_CLS}{
              max-height:min(86dvh, 40rem) !important;
            }
          }
          @keyframes kano_pm4_fade{ from{ opacity:.35; } to{ opacity:1; } }

          /* 弹层内标题条（自适应：窄屏缩小字号，长标题省略） */
          .${PM4_CFG.HEAD_CLS}{
            display:flex; align-items:center; gap:.5rem;
            margin:0 0 .7rem; padding-left:.65rem;
            border-left:.4rem solid var(--dark-title-color,#87ceeb);
          }
          .${PM4_CFG.HEAD_CLS} .kano-pm4-htext{
            font-weight:bold; font-size:.8rem; line-height:1.5;
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
            min-width:0;
          }
          .${PM4_CFG.HEAD_CLS} .kano-pm4-x{
            margin-left:auto; flex-shrink:0;
            padding:.25rem .8rem; font-size:.66rem; cursor:pointer;
            border-radius:.4rem; border:1px solid rgba(255,255,255,.18);
            background:rgba(255,255,255,.08); color:inherit;
            -webkit-tap-highlight-color:transparent;
          }

          /* ===== 插件改写管理（渲染在收纳箱「收纳设置」的 tab 容器里） ===== */
          #${PM4_CFG.PANEL_ID} .kano-pm4-tip{
            font-size:.68rem; opacity:.85; line-height:1.6; margin-bottom:.6rem;
          }
          #${PM4_CFG.PANEL_ID} .kano-pm4-tip b{ color:#87ceeb; }
          #${PM4_CFG.PANEL_ID} .kano-pm4-list{ display:flex; flex-direction:column; gap:.4rem; }
          #${PM4_CFG.PANEL_ID} .kano-pm4-item{
            display:flex; align-items:center; gap:.6rem;
            padding:.5rem .65rem; border-radius:.45rem;
            background:rgba(255,255,255,.04);
            border:1px solid rgba(255,255,255,.08);
          }
          #${PM4_CFG.PANEL_ID} .kano-pm4-item-name{
            font-size:.72rem; line-height:1.5; min-width:0;
            flex:1 1 auto; word-break:break-word; text-align:left;
          }
          #${PM4_CFG.PANEL_ID} .kano-pm4-item-state{
            font-size:.6rem; flex-shrink:0; opacity:.7;
          }
          #${PM4_CFG.PANEL_ID} .kano-pm4-hint{
            font-size:.6rem; opacity:.6; line-height:1.6; margin:.6rem 0 0; text-align:left;
          }
          #${PM4_CFG.PANEL_ID} .kano-pm4-empty{
            font-size:.68rem; opacity:.6; padding:.8rem; text-align:center;
          }
          /* 窄屏：勾选框与名字同一行，状态文字换到下一行，避免挤压 */
          @media (max-width:32rem){
            #${PM4_CFG.PANEL_ID} .kano-pm4-item{ flex-wrap:wrap; }
            #${PM4_CFG.PANEL_ID} .kano-pm4-item-state{ margin-left:1.4rem; }
          }

          /* ===== 多端自适应：窄屏 / 矮屏 / 横屏 / 超小屏 ===== */
          @media (max-width:32rem){
            .${PM4_CFG.MANAGED_CLS}.${PM4_CFG.PROMO_CLS}{
              width:94vw !important;
              max-height:88vh !important;
              padding:.85rem !important;
              padding-bottom:calc(.85rem + env(safe-area-inset-bottom)) !important;
            }
            .${PM4_CFG.HEAD_CLS} .kano-pm4-htext{ font-size:.74rem; }
            .${PM4_CFG.HEAD_CLS} .kano-pm4-x{ padding:.3rem .9rem; font-size:.64rem; }
          }
          @supports (max-height: 100dvh){
            @media (max-width:32rem){
              .${PM4_CFG.MANAGED_CLS}.${PM4_CFG.PROMO_CLS}{ max-height:88dvh !important; }
            }
          }
          /* 矮屏（横屏手机/小窗口）：进一步压低高度，让内容尽量可见 */
          @media (max-height:26rem){
            .${PM4_CFG.MANAGED_CLS}.${PM4_CFG.PROMO_CLS}{
              max-height:92vh !important;
              top:50% !important;
            }
          }
          @supports (max-height: 100dvh){
            @media (max-height:26rem){
              .${PM4_CFG.MANAGED_CLS}.${PM4_CFG.PROMO_CLS}{ max-height:92dvh !important; }
            }
          }
          /* 超小屏：全屏铺满，最大化可用空间 */
          @media (max-width:22rem){
            .${PM4_CFG.MANAGED_CLS}.${PM4_CFG.PROMO_CLS}{
              width:100vw !important;
              max-width:none !important;
              height:100vh !important;
              max-height:100vh !important;
              top:0 !important; left:0 !important;
              transform:none !important;
              border-radius:0 !important;
            }
          }
          @supports (height: 100dvh){
            @media (max-width:22rem){
              .${PM4_CFG.MANAGED_CLS}.${PM4_CFG.PROMO_CLS}{ height:100dvh !important; max-height:100dvh !important; }
            }
          }

          /* 功能列表区里的入口按钮（让长插件名在窄屏能换行，而不是被截断） */
          .${PM4_CFG.BTN_CLS}{
            max-width:100%;
            white-space:normal; overflow-wrap:anywhere;
            line-height:1.4; text-align:left;
          }
          /* 电脑端屏幕宽裕，长名字一行显示更整齐 */
          @media (min-width:48rem){
            .${PM4_CFG.BTN_CLS}{ white-space:nowrap; text-align:center; }
          }
        `;
        document.head.appendChild(st);
      };

      // ---------- 模态框 ----------
      let pm4OpenPanelEl = null, pm4MaskEl = null, pm4HeadEl = null, pm4KeyHandler = null;

      const pm4EnsureMask = () => {
        if (pm4MaskEl) return pm4MaskEl;
        pm4MaskEl = document.createElement('div');
        pm4MaskEl.className = PM4_CFG.MASK_CLS;
        pm4MaskEl.addEventListener('click', () => pm4ClosePanel());
        document.documentElement.appendChild(pm4MaskEl);
        return pm4MaskEl;
      };

      const pm4OpenPanel = (panel) => {
        if (pm4OpenPanelEl === panel) return;
        if (pm4OpenPanelEl) pm4ClosePanel(true);

        pm4EnsureStyle();
        pm4EnsureMask();

        pm4HeadEl = document.createElement('div');
        pm4HeadEl.className = PM4_CFG.HEAD_CLS;
        pm4HeadEl.innerHTML = '<span class="kano-pm4-htext"></span>'
          + '<button type="button" class="kano-pm4-x"></button>';
        pm4HeadEl.querySelector('.kano-pm4-htext').textContent = pm4Registry.get(panel)?.title || pm4PanelTitle(panel) || PM4_CFG.PANEL_TITLE;
        pm4HeadEl.querySelector('.kano-pm4-x').textContent = PM4_CFG.CLOSE_TEXT;
        pm4HeadEl.querySelector('.kano-pm4-x').addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation(); pm4ClosePanel();
        });
        pm4HeadEl.addEventListener('click', (e) => e.stopPropagation());
        panel.insertBefore(pm4HeadEl, panel.firstChild);

        // 中和包含块 → 提升 → 强制样式重算 → 再显示
        document.body.classList.add(PM4_CFG.LOCK_CLS);
        panel.classList.add(PM4_CFG.PROMO_CLS);
        void panel.offsetHeight;
        pm4MaskEl.style.display = 'block';
        pm4OpenPanelEl = panel;

        setTimeout(() => { try { window.dispatchEvent(new Event('resize')); } catch (e) { } }, 60);

        pm4KeyHandler = (e) => { if (e.key === 'Escape') pm4ClosePanel(); };
        document.addEventListener('keydown', pm4KeyHandler);
      };

      const pm4ClosePanel = (silent) => {
        const panel = pm4OpenPanelEl;
        if (!panel) return;
        pm4OpenPanelEl = null;

        panel.classList.remove(PM4_CFG.PROMO_CLS);
        if (pm4HeadEl && pm4HeadEl.parentNode) pm4HeadEl.remove();
        pm4HeadEl = null;
        if (pm4MaskEl) pm4MaskEl.style.display = 'none';

        if (!silent) document.body.classList.remove(PM4_CFG.LOCK_CLS);

        if (pm4KeyHandler) { document.removeEventListener('keydown', pm4KeyHandler); pm4KeyHandler = null; }
        setTimeout(() => { try { window.dispatchEvent(new Event('resize')); } catch (e) { } }, 60);
      };

      // ---------- 按钮（放进功能列表区，供收纳箱收纳） ----------
      const pm4Registry = new Map();      // panel -> { btn, title }
      const pm4AllPanels = new Set();     // 所有被识别过的插件面板（含被禁用改写的）

      const pm4FindActionsBox = () => document.querySelector(PM4_CFG.ACTIONS_SEL);

      const pm4EnsureInActions = (btn) => {
        const box = pm4FindActionsBox();
        if (!box || !btn) return;
        const toolbox = document.getElementById(PM4_CFG.TOOLBOX_ID);
        if (toolbox && btn.parentElement === toolbox) return;   // 已被收纳箱接走
        try { box.appendChild(btn); } catch (e) { }
      };

      // ---------- 设置界面（搬进收纳箱的「🛠️ 收纳设置 → 插件改写管理」tab） ----------
      //   v4.2 起本插件不再自建「🛠️ 改写设置」按钮与弹窗，界面完全由收纳箱承载。

      const pm4ListEntries = () => {
        const out = [];
        pm4AllPanels.forEach((panel) => {
          const title = pm4Registry.get(panel)?.title || pm4PanelTitle(panel);
          if (!title) return;                                  // [修复5b] 没名字的不列
          if (out.some((e) => e.title === title)) return;       // 同名只列一次
          out.push({ title, rewritten: !pm4DisabledSet.has(title) });
        });
        return out;
      };

      const pm4BuildCfgContent = () => {
        const entries = pm4ListEntries();
        const rows = entries.map(({ title, rewritten }) => `<div class="kano-pm4-item">
            <input type="checkbox" class="kano-pm4-item-chk" data-name="${pm4Esc(title)}" ${rewritten ? 'checked' : ''}>
            <span class="kano-pm4-item-name">${pm4Esc(title)}</span>
            <span class="kano-pm4-item-state">${rewritten ? '已改写' : '未改写'}</span>
          </div>`).join('');

        return `<div class="kano-pm4-wrap">
          <div class="kano-pm4-tip">
            勾选 = 把该插件的折叠面板改成「按钮 + 模态框」；取消 = 保持原样。
            <b>只有勾选（已改写）的插件，才会出现在「插件状态管理」页里</b>可供设置常驻/收纳/隐藏。
          </div>
          <div class="kano-pm4-list">${rows || '<div class="kano-pm4-empty">暂未识别到可改写的插件</div>'}</div>
          <div class="kano-pm4-hint">
            提示：被改写的插件，其原折叠栏（含标题行）会隐藏，入口按钮出现在「功能列表」里，
            因此可被「📦 收纳箱」收纳。<br>
            列表里只显示能独立成页的插件面板；<b>藏在插件自己弹窗里的折叠面板不会被列入</b>
            （例如「电池检测·充电控制器」的自动模式设置，请照旧点该插件自己的弹窗查看）。<br>
            改动会保存到本机，并随「📦 收纳箱」的跨端同步一起同步。
          </div>
        </div>`;
      };

      // 只在「已改写」的插件里挑：返回被注册进状态管理的插件名数组
      const pm4ManagedNames = () => pm4ListEntries().filter((e) => e.rewritten).map((e) => e.title);

      // 勾选变化 → 写同步文档（自动落盘 + 跨端同步）→ 应用到页面 → 刷新两份 UI
      const pm4OnToggle = (name, rewritten) => {
        if (rewritten) pm4DisabledSet.delete(name); else pm4DisabledSet.add(name);
        // 改写 = 常驻(0)；未改写 = 3（不进状态管理页）。走统一写入入口
        setPluginState(name, rewritten ? 0 : PM4_CFG.STATE_UNREWRITTEN);
        pm4ApplyState();
        pm4SyncUi();
      };

      const pm4BindCfgEvents = (root) => {
        root.querySelectorAll('.kano-pm4-item-chk').forEach((chk) => {
          chk.addEventListener('change', () => pm4OnToggle(chk.getAttribute('data-name') || '', !!chk.checked));
        });
      };

      // 把界面渲染进收纳箱给的容器（容器由收纳箱在切到该 tab 时调用）
      const pm4RenderCfgInto = () => {
        const root = document.getElementById(PM4_CFG.PANEL_ID);
        if (!root) return;
        const snapshot = JSON.stringify(pm4ListEntries());
        if (root.getAttribute('data-sig') === snapshot && root.firstChild) return;   // 没变化就不动 DOM
        root.setAttribute('data-sig', snapshot);
        root.innerHTML = pm4BuildCfgContent();
        pm4BindCfgEvents(root);
      };

      // 把「已改写的插件」同步给收纳箱的状态管理页：
      //   未改写 → 强制回到「常驻」，并从状态管理列表里移除（它已不在功能列表里了）
      const pm4SyncUi = () => {
        pm4ApplyState();                     // 未改写的面板要还原回页面
        pm4RenderCfgInto();
        renderPluginList();                  // 改写状态变了 ⇒ 状态管理页的插件集合也变
      };

      // ---------- 改写 ----------
      const pm4RewritePanel = (panel) => {
        const row = panel.previousElementSibling;
        const title = pm4KeyOf(panel);
        if (!row || !row.classList || !title) return false;   // [修复5b] 没名字就不改，避免幽灵条目

        // [修复2] 折叠栏整行隐藏，不占空间
        row.classList.add(PM4_CFG.ROW_CLS);
        // 外层包裹层若带 margin，一并归零（避免残留空档）
        const host = panel.parentElement;
        if (host && host !== document.body) host.classList.add(PM4_CFG.ROW_CLS + '-host');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = PM4_CFG.BTN_CLS + ' btn';
        btn.textContent = title;          // 收纳箱用按钮文字当插件名 key，不能随意改
        btn.title = PM4_CFG.BTN_TITLE;
        btn.setAttribute(PM4_CFG.PANEL_ATTR, title);
        btn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          try { if (typeof window.knCloseDrawerModal === 'function') setTimeout(window.knCloseDrawerModal, 150); } catch (e2) { }
          pm4OpenPanel(panel);
        });
        pm4Registry.set(panel, { btn, title, off: false });

        panel.classList.add(PM4_CFG.MANAGED_CLS);
        panel.setAttribute(PM4_CFG.DONE_ATTR, '1');
        pm4EnsureInActions(btn);
        return true;
      };

      // 还原一个面板（只隐藏入口按钮，不删除 —— 勾回来时要复用同一个按钮，
      // 因为收纳箱是按按钮文字记录状态的，重建按钮会丢引用）
      const pm4RestorePanel = (panel) => {
        const rec = pm4Registry.get(panel);
        if (rec?.btn) rec.btn.style.display = 'none';
        panel.classList.remove(PM4_CFG.MANAGED_CLS);
        const row = panel.previousElementSibling;
        if (row) row.classList.remove(PM4_CFG.ROW_CLS);
        const host = panel.parentElement;
        if (host) host.classList.remove(PM4_CFG.ROW_CLS + '-host');
      };

      // 按配置应用状态：改写的显示按钮，未改写的隐藏按钮并还原
      // 「未改写」时必须把折叠面板还原回页面。
      //   注意不能只看 pm4DisabledSet：收纳箱同步/状态改动后 DISABLED 集合会变，
      //   而且同一插件名可能对应页面上的多个面板，全部都要照顾到。
      // 注意：按钮的 display 只在「改写 <-> 未改写」翻转的那一刻动一次。
      //   装了收纳箱之后，按钮的显示/隐藏由收纳箱按三态（常驻/收纳/隐藏）决定，
      //   这里若无条件 display='' 会把用户设的「隐藏」在下一轮扫描时又翻出来。
      const pm4ApplyState = () => {
        pm4Registry.forEach((rec, panel) => {
          const off = pm4DisabledSet.has(rec.title);
          if (off) {
            if (!rec.off) { rec.off = true; pm4RestorePanel(panel); }
          } else {
            if (rec.off) { rec.off = false; rec.btn.style.display = ''; }
            pm4EnsureInActions(rec.btn);
            if (!panel.classList.contains(PM4_CFG.MANAGED_CLS)) {
              panel.classList.add(PM4_CFG.MANAGED_CLS);
              const row = panel.previousElementSibling;
              if (row) row.classList.add(PM4_CFG.ROW_CLS);
              const host = panel.parentElement;
              if (host && host !== document.body) host.classList.add(PM4_CFG.ROW_CLS + '-host');
            }
          }
        });
      };

      const pm4Scan = () => {
        let n = 0;
        document.querySelectorAll(PM4_CFG.PANEL_SEL).forEach((panel) => {
          if (pm4IsBuiltin(panel)) return;
          if (panel.closest && panel.closest('.mask')) return;
          if (pm4IsHiddenPanel(panel)) return;                       // [修复5a]
          if (!pm4HasContent(panel)) return;
          if (!panel.previousElementSibling || !panel.previousElementSibling.classList) return;
          if (!pm4PanelTitle(panel) && panel.getAttribute(PM4_CFG.DONE_ATTR) !== '1') return;  // [修复5b]

          pm4AllPanels.add(panel);
          if (panel.getAttribute(PM4_CFG.DONE_ATTR) === '1') return;   // 已接管，稍后统一 pm4ApplyState
          try {
            if (pm4RewritePanel(panel)) n++;
          } catch (e) { console.warn('[收纳箱·改写] 改写失败', panel.id, e); }
        });
        // 统一在一次里做：按配置同步显示状态，并重试把按钮送进收纳箱
        // （覆盖"收纳箱晚于本插件加载"的时序）
        pm4ApplyState();
        pm4SyncUi();
        return n;
      };

      // 内部接口（收纳箱直接调用）：
      //   pm4Refresh() —— 重新读取「未改写」名单 → 应用回页面 → 刷新界面；
      //                    切 tab 时与同步文档变化后都会调它（只读不写，不会回环）
      const pm4Refresh = () => {
        const next = loadDisabled();
        const changed = next.size !== pm4DisabledSet.size
          || [...next].some((n) => !pm4DisabledSet.has(n));
        pm4DisabledSet = next;
        if (changed) pm4ApplyState();
        pm4RenderCfgInto();
      };

    // 启动：首轮扫描 + 定时补扫（插件面板是异步注入的）
    const pm4Start = () => {
        pm4EnsureStyle();
        const n0 = pm4Scan();
        [800, 2000, 4000, 7000].forEach((ms) => setTimeout(pm4Scan, ms));
        [900, 2500, 6000].forEach((ms) => setTimeout(pm4SyncUi, ms));
        let moTimer = null;
        try {
            const mo = new MutationObserver(() => {
                if (moTimer) return;
                moTimer = setTimeout(() => { moTimer = null; pm4Scan(); }, 300);
            });
            mo.observe(document.documentElement, { childList: true, subtree: true });
        } catch (e) { }
        console.log(`[收纳箱] 插件改写管理：首轮接管 ${n0} 个插件面板`);
    };

    // ==========================================
    // 4. Bartender 核心分发
    // ==========================================
    const applyBartenderLogic = () => {
        const toolbox = document.getElementById('toolbox_buttons');
        const secondary = document.getElementById('secondary_menu_buttons');
        if (!toolbox || !secondary) return;

        healShadowedPanels();

        const allBtns = [...toolbox.querySelectorAll('button'), ...secondary.querySelectorAll('button')];
        allBtns.forEach(btn => {
            const name = btn.textContent.trim();
            if (RESERVED_NAMES.indexOf(name) !== -1) return;

            const state = config.pluginStates[name] || 0;
            if (state === UNREWRITTEN) {
                // 未改写：折叠面板还在原位，功能列表里不该有这个按钮
                btn.style.display = 'none';
                if (btn.parentElement !== toolbox) toolbox.appendChild(btn);
            } else if (state === 0) {
                btn.style.display = 'inline-block';
                if (btn.parentElement !== toolbox) toolbox.appendChild(btn);
            } else if (state === 1) {
                btn.style.display = 'inline-block';
                if (btn.parentElement !== secondary) secondary.appendChild(btn);
            } else {
                btn.style.display = 'none';
                if (btn.parentElement !== toolbox) toolbox.appendChild(btn);
            }
        });
    };

    // 收集当前页面上全部第三方插件名
    // 关键：插件处于「收纳」态时按钮已移到收纳箱容器，DOM 顺序会变，
    // 因此列表顺序以持久化的 pluginOrder 为准，保证切换状态时行位置不跳动。
    // 注意：持久化用「并集、只增不删」——临时缺席的插件（被禁用 / 脚本尚未加载）不该被抹掉，
    // 否则多客户端之间会互相裁剪对方的 order（一方看到的插件少，就把对方的顺序改坏）。
    const collectPluginNames = () => {
        const toolbox = document.getElementById('toolbox_buttons');
        const secondary = document.getElementById('secondary_menu_buttons');
        const found = [];
        [toolbox, secondary].forEach(p => {
            if (!p) return;
            p.querySelectorAll('button').forEach(b => {
                const n = b.textContent.trim();
                if (n && RESERVED_NAMES.indexOf(n) === -1 && found.indexOf(n) === -1) found.push(n);
            });
        });

        const stored = Array.isArray(config.pluginOrder) ? config.pluginOrder : [];
        // 渲染：只渲染当前确实存在于页面上、且**已改写成按钮打开**的插件
        //   （未改写 = state 3：它的折叠面板还在原位，没有可管理的入口按钮）
        const rendered = stored.filter(n => found.indexOf(n) !== -1)
            .concat(found.filter(n => stored.indexOf(n) === -1))
            .filter(n => Number(config.pluginStates[n] || 0) !== UNREWRITTEN);
        // 持久化：并入新出现的插件，但从不删除历史记录
        const persisted = stored.concat(found.filter(n => stored.indexOf(n) === -1));

        if (persisted.length !== stored.length) {
            syncDoc.order = { list: persisted.slice(), t: now() };
            syncDoc.savedAt = now();
            rebuildConfig();
            persistLocal();
            schedulePush();
        }
        return rendered;
    };

    // 竖直列表渲染：插件名 + 常驻/收纳/隐藏 三态按钮
    const renderPluginList = () => {
        const list = document.getElementById('kn-plugin-list');
        if (!list) return;

        list.innerHTML = '';
        const pluginNames = collectPluginNames();

        if (pluginNames.length === 0) {
            const tip = document.createElement('div');
            tip.className = 'kn-empty-tip';
            tip.textContent = '暂无插件';
            list.appendChild(tip);
            updateSyncBar();
            return;
        }

        const frag = document.createDocumentFragment();
        pluginNames.forEach(name => {
            const state = config.pluginStates[name] || 0;

            const row = document.createElement('div');
            row.className = 'kn-plugin-row';

            const label = document.createElement('div');
            label.className = 'kn-plugin-name';
            label.textContent = name;
            label.title = name;
            row.appendChild(label);

            const group = document.createElement('div');
            group.className = 'kn-state-group';
            PLUGIN_STATES.forEach(st => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'kn-state-btn' + (st.value === state ? ' active s' + st.value : '');
                btn.textContent = st.label;
                btn.title = st.title;
                btn.addEventListener('click', () => window.knSetPluginState(name, st.value));
                group.appendChild(btn);
            });
            row.appendChild(group);
            frag.appendChild(row);
        });
        list.appendChild(frag);
        syncListRowHeight();
        updateSyncBar();
    };

    // 一屏正好 5 行：行高与屏幕宽度/字体有关（窄屏一行会变成上下两段，明显更高），
    // 写死像素在另一种屏幕上就不是 5 行了，所以这里**实测第一行的真实高度**并写回
    // CSS 变量 --kn-row-h，列表高度再按它算出来。
    const syncListRowHeight = () => {
        const list = document.getElementById('kn-plugin-list');
        if (!list) return;
        const first = list.querySelector('.kn-plugin-row');
        if (!first) return;
        const h = first.getBoundingClientRect().height;
        if (h > 0) list.style.setProperty('--kn-row-h', h + 'px');
    };

    // 屏幕旋转 / 窗口缩放后行高会变，重新量一次
    let rowHResizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(rowHResizeTimer);
        rowHResizeTimer = setTimeout(syncListRowHeight, 200);
    });

    // 同步状态条
    const updateSyncBar = () => {
        const text = document.getElementById('kn-sync-text');
        if (!text) return;

        const dot = document.getElementById('kn-sync-dot');
        if (dot) {
            dot.className = 'kn-sync-dot';
            if (deviceStatus === 'ok') dot.classList.add('ok');
            else if (deviceStatus === 'syncing' || deviceStatus === 'absent') dot.classList.add('busy');
            else if (deviceStatus === 'unavailable') dot.classList.add('bad');
        }

        const tip = document.getElementById('kn-sync-tip');
        if (tip) tip.style.display = (deviceStatus === 'unavailable' || deviceStatus === 'absent') ? '' : 'none';

        if (deviceStatus === 'ok') {
            text.textContent = '已与设备端同步';
        } else if (deviceStatus === 'syncing') {
            text.textContent = '正在同步…';
        } else if (deviceStatus === 'absent') {
            text.textContent = '设备端尚无配置，已用当前浏览器配置初始化';
        } else if (deviceStatus === 'unavailable') {
            text.textContent = '设备端不可用（需开启高级功能）· 当前仅保存在本浏览器';
        } else {
            text.textContent = '尚未同步 · 点击「立即同步」';
        }
    };



    // ==========================================
    // 5. 注入现代 UI 结构
    // ==========================================
    const toolBox = document.createElement('div');
    toolBox.innerHTML = `
        <div class="title" style="margin:8px 0; display:flex; align-items:center;">
            <strong style="font-size:14px;">🧰 扩展工具</strong>
            <div style="display:inline-block; margin-left:8px;" id="collapse_toolbox_btn"></div>
            <div style="margin-left:auto; display:flex; gap:10px; position:relative; z-index:999;">
                <button onclick="window.knShowDrawerModal()" class="btn" style="padding: 4px 16px; font-size: 13px; background: linear-gradient(135deg, rgba(52,199,89,0.25), rgba(52,199,89,0.1)); border: 1px solid rgba(52,199,89,0.4); color: #86efac; box-shadow: 0 2px 10px rgba(0,0,0,0.2); cursor:pointer;">📦 收纳箱</button>
                <button onclick="window.knShowBeautyModal()" class="btn" style="padding: 4px 16px; font-size: 13px; background: linear-gradient(135deg, rgba(135,206,235,0.25), rgba(1,138,216,0.15)); border: 1px solid rgba(135,206,235,0.4); color: #87ceeb; box-shadow: 0 2px 10px rgba(0,0,0,0.2); cursor:pointer;">🛠️ 收纳设置</button>
            </div>
        </div>
        <div class="collapse" id="collapse_toolbox" data-name="close" style="transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); height:0; overflow:hidden;">
            <div class="collapse_box" id="toolbox_buttons" style="display:flex; flex-wrap:wrap; gap:8px; padding: 10px 0; min-height:30px;"></div>
        </div>
    `;
    const menuSection = document.querySelector('.collapse_box') || document.body;
    menuSection.appendChild(toolBox);
    if (typeof collapseGen === 'function') collapseGen("#collapse_toolbox_btn", "#collapse_toolbox",'collapse_toolbox');

    // 收纳箱弹窗
    const drawerModal = document.createElement('div');
    drawerModal.className = 'mask';
    drawerModal.id = "KanoDrawerModal";
    drawerModal.style.display = 'none';
    drawerModal.innerHTML = `
        <div class="modal kn-glass-modal" style="display: flex; flex-direction: column;">
            <div style="font-size:18px; font-weight:800; color:#fff; margin-bottom: 20px; text-align:center; letter-spacing:1px;">📦 我的收纳箱</div>
            <div id="secondary_menu_buttons" style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center; min-height: 80px; margin-bottom: 20px;"></div>
            <div style="text-align: center;">
                <button onclick="window.knCloseDrawerModal()" class="" style="background: rgba(255,255,255,0.1); color:#fff; border: 1px solid rgba(255,255,255,0.2); padding:8px 35px; font-size:14px; cursor:pointer;">关 闭</button>
            </div>
        </div>
    `;
    drawerModal.onclick = (e) => { if (e.target === drawerModal) window.knCloseDrawerModal(); };
    document.body.appendChild(drawerModal);

    // 收纳设置弹窗（插件状态列表 + 同步状态条）
    const beautyModal = document.createElement('div');
    beautyModal.className = 'mask';
    beautyModal.id = "KanoBeautyModal";
    beautyModal.style.display = 'none';
    beautyModal.innerHTML = `
        <div class="modal kn-glass-modal" style="display: flex; flex-direction: column;">
            <div style="font-size:20px; font-weight:800; color:#fff; margin-bottom: 16px; text-align:center; letter-spacing:2px; text-shadow: 0 2px 10px rgba(0,0,0,0.5);">🛠️ 收纳设置</div>

            <!-- 同步条：常驻在 tab 切换按钮**上方**，两个 tab 共用 -->
            <div class="kn-sync-bar">
                <span class="kn-sync-dot" id="kn-sync-dot"></span>
                <span class="kn-sync-text" id="kn-sync-text">尚未同步</span>
                <button type="button" onclick="window.knSyncNow()" style="flex:0 0 auto; padding:4px 12px; font-size:12px; border-radius:10px; cursor:pointer; background: rgba(135,206,235,0.15); border: 1px solid rgba(135,206,235,0.4); color:#87ceeb;">立即同步</button>
                <button type="button" onclick="window.knPushToDevice()" title="把当前浏览器的配置覆盖写入设备端" style="flex:0 0 auto; padding:4px 12px; font-size:12px; border-radius:10px; cursor:pointer; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color:#bbb;">覆盖设备端</button>
            </div>
            <div id="kn-sync-tip" class="kn-sync-tip" style="display:none">
                同步失败只影响跨端读取，本机设置照常生效。请到高级后台开启「高级功能」后点「立即同步」。
            </div>

            <!-- tab 切换按钮：居中 -->
            <div class="kn-tabs">
                <button type="button" id="kn-tab-state" style="${TAB_BTN_ON}">插件状态管理</button>
                <button type="button" id="kn-tab-rewrite" style="${TAB_BTN_BASE}">${PM4_TITLE}</button>
            </div>

            <!-- ① 插件状态管理 -->
            <div id="kn-panel-state">
                <!-- 标题「插件状态管理」已删（tab 上已经写了，不必重复） -->
                <div class="kn-state-legend">
                    <span>常驻 = 主页显示 ｜ 收纳 = 放入收纳箱 ｜ 隐藏 = 完全不可见</span>
                </div>

                <div id="kn-plugin-list" class="kn-plugin-list"></div>

                <div class="kn-rewrite-jump">
                    只显示已改写成按钮打开的插件。想增加或取消改写，请到
                    <button type="button" class="kn-link" onclick="window.knSwitchSettingsTab('rewrite')">「${PM4_TITLE}」</button>
                    页勾选；未改写的插件不在这里出现。
                </div>
            </div>

            <!-- ② 插件改写管理（由第 4.5 节模块渲染进 #kn-pm4-panel） -->
            <div id="kn-panel-rewrite" style="display:none">
                <div id="${PM4_PANEL_ID}"></div>
            </div>

            <div style="text-align: right; margin-top: 18px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px;">
                <button onclick="window.knCloseBeautyModal()" class="" style="background: #018ad8; color:#fff; border: none; padding:10px 45px; font-size:15px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 15px rgba(1, 138, 216, 0.4);">完 成</button>
            </div>
        </div>
    `;
    beautyModal.onclick = (e) => { if (e.target === beautyModal) window.knCloseBeautyModal(); };
    document.body.appendChild(beautyModal);

    document.getElementById('kn-tab-state').addEventListener('click', () => switchTab('state'));
    document.getElementById('kn-tab-rewrite').addEventListener('click', () => switchTab('rewrite'));

    // ==========================================
    // 6. 核心拦截（插件按钮一律先落到扩展工具栏）
    // ==========================================
    const originalAppendChild = HTMLElement.prototype.appendChild;
    HTMLElement.prototype.appendChild = function(element) {
        if (this === window.collapseBtn_menu?.nextElementSibling?.querySelector('.collapse_box') &&
            element.tagName === 'BUTTON') {
            const toolbox = document.getElementById('toolbox_buttons');
            // 增加安全校验：若 toolbox 还未注入，则放行
            if (toolbox) {
                const res = originalAppendChild.call(toolbox, element);
                applyBartenderLogic();
                // 设置面板开着时同步刷新列表
                const m = document.getElementById('KanoBeautyModal');
                if (m && m.style.display !== 'none') renderPluginList();
                return res;
            }
        }
        return originalAppendChild.call(this, element);
    };


    // ==========================================
    // 7. 智能防遮挡
    // ==========================================
    const initAutoClose = () => {
        const hookShowModal = () => {
            if (typeof window.showModal === 'function') {
                if (window.showModal.__kn_hooked__) return;
                const originalShowModal = window.showModal;
                window.showModal = function (...args) {
                    const target = args[0];
                    if (target !== '#KanoDrawerModal' && target !== '#KanoBeautyModal') {
                        window.knCloseDrawerModal();
                    }
                    return originalShowModal.apply(this, args);
                };
                window.showModal.__kn_hooked__ = true;
            } else {
                setTimeout(hookShowModal, 200);
            }
        };
        hookShowModal();

        const secMenu = document.getElementById('secondary_menu_buttons');
        if (secMenu) {
            secMenu.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (btn) { setTimeout(() => window.knCloseDrawerModal(), 150); }
            });
        }
    };

    // ==========================================
    // 8. 跨标签页 / 跨客户端同步
    // ==========================================
    const initSyncBridge = () => {
        // 同一浏览器多标签页：storage 事件即时对齐
        window.addEventListener('storage', (e) => {
            if (e.key !== CONFIG_KEY || !e.newValue) return;
            try {
                const incoming = normalizeDoc(JSON.parse(e.newValue));
                const before = normalizeDoc(syncDoc);
                syncDoc = mergeDocs(syncDoc, incoming);
                rebuildConfig();
                if (docEquals(before, syncDoc)) return;
                persistLocal();
                applyBartenderLogic();
                notifyRewriteHost();
                const m = document.getElementById('KanoBeautyModal');
                if (m && m.style.display !== 'none') renderPluginList();
            } catch (err) {
                console.error('[KanoSync] 标签页同步失败：', err);
            }
        });

        // 切回前台 / 页面重新可见时拉取一次（限流）
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') pullThrottled();
        });
        window.addEventListener('focus', pullThrottled);
    };

    // 启动引擎（同步部分不阻塞首屏：先本地渲染，再异步对齐设备端）
    injectCSS();
    renderPluginList();
    applyBartenderLogic();
    pm4Start();
    initAutoClose();
    initSyncBridge();
    setDeviceStatus('syncing');
    pullDevice();
})();
</script>
<!-- [KANO_PLUGIN_END]
