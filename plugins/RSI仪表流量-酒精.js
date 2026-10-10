<script>
(() => {
    const CONFIG_KEY = 'flow_monitor_rsi_dashboard_ref_v3';
    const LEGACY_CONFIG_KEY = 'flow_monitor_rsi_dashboard_ref_v2';
    const CONTAINER_ID = 'FLOW_MONITOR_RSI_REFINED';

    let config = {
        totalGB: 0,
        usedGB: 0,
        resetDay: 1,
        uiScale: 0.68,
        panelOpacity: 0.86,
        warnPct: 70,
        dangerPct: 90,
        cycleDays: 30,
        historyDayKey: '',
        dayHistory: []
    };

    try {
        const saved = localStorage.getItem(CONFIG_KEY) || localStorage.getItem(LEGACY_CONFIG_KEY);
        if (saved) Object.assign(config, JSON.parse(saved));
        if (config.uiScale == null && config.heightScale != null) config.uiScale = config.heightScale;
    } catch (e) {}

    function clamp(v, min, max) {
        return Math.min(Math.max(v, min), max);
    }

    function getScale() {
        return clamp(parseFloat(config.uiScale) || 0.68, 0.4, 0.9);
    }

    function getPanelOpacity() {
        return clamp(parseFloat(config.panelOpacity) || 0.86, 0.45, 1);
    }

    const DAY_MINUTES = 24 * 60;
    let autoTrackTimer = null;

    function saveConfig() {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }

    const Icons = {
        Radar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7a5 5 0 1 0 5 5"/><path d="M12 11a1 1 0 1 0 1 1"/><path d="M21 3l-8.5 8.5"/></svg>`,
        Panel: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M8 9h8"></path><path d="M8 13h5"></path><path d="M16.5 14.5l1.4 1.4 2.6-2.9"></path></svg>`,
        Tune: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7"></path><path d="M4 10V3"></path><path d="M12 21v-11"></path><path d="M12 6V3"></path><path d="M20 21v-4"></path><path d="M20 13V3"></path><path d="M2 14h4"></path><path d="M10 10h4"></path><path d="M18 17h4"></path></svg>`,
        Refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-15.36 6.36L3 16"></path><path d="M3 16h5v5"></path><path d="M3 12A9 9 0 0 1 18.36 5.64L21 8"></path><path d="M16 8h5V3"></path></svg>`
    };

    const styleOld = document.getElementById('fm_rsi_refined_style');
    if (styleOld) styleOld.remove();

    const style = document.createElement('style');
    style.id = 'fm_rsi_refined_style';
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=JetBrains+Mono:wght@600;700;800&display=swap');

        @keyframes fm-sweep {
            0% { transform: translateX(-100%) skewX(-20deg); }
            100% { transform: translateX(200%) skewX(-20deg); }
        }

        @keyframes fm-pulse-glow {
            0%,100% { box-shadow: 0 0 8px var(--fm-accent),0 0 16px var(--fm-glow); }
            50% { box-shadow: 0 0 16px var(--fm-accent),0 0 32px var(--fm-glow); }
        }

        #${CONTAINER_ID}, #${CONTAINER_ID} * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            -webkit-font-smoothing: subpixel-antialiased;
        }

        #${CONTAINER_ID} {
            --fm-scale: 0.68;
            --fm-panel-alpha: 0.86;
            --fm-accent: #34d399;
            --fm-accent-2: #86efac;
            --fm-glow: rgba(52, 211, 153, 0.45);
            --fm-soft: rgba(209, 250, 229, 0.92);

            width: calc(100% - 2px);
            margin: 12px auto 14px;
            position: relative;
            z-index: 10;
            overflow: hidden;

            border-radius: 8px;
            border: 1px solid rgba(120, 235, 255, 0.35);

            background:
                radial-gradient(circle at 10% 14%, rgba(64, 227, 255, calc(var(--fm-panel-alpha) * 0.32)), transparent 22%),
                radial-gradient(circle at 84% 24%, var(--fm-glow), transparent 32%),
                radial-gradient(circle at 58% 100%, rgba(116, 62, 255, calc(var(--fm-panel-alpha) * 0.26)), transparent 40%),
                radial-gradient(circle at 30% 80%, rgba(255, 62, 180, calc(var(--fm-panel-alpha) * 0.12)), transparent 36%),
                linear-gradient(135deg, rgba(4,10,22,var(--fm-panel-alpha)), rgba(4,14,34,calc(var(--fm-panel-alpha) * 0.96)) 48%, rgba(2,8,20,calc(var(--fm-panel-alpha) * 0.98)));

            backdrop-filter: blur(28px) saturate(180%);
            -webkit-backdrop-filter: blur(28px) saturate(180%);

            box-shadow:
                0 18px 44px rgba(0,0,0,0.36),
                0 0 0 1px rgba(79, 219, 255, 0.12),
                0 0 32px rgba(0, 183, 255, 0.22),
                0 0 60px rgba(52, 211, 153, 0.15),
                inset 0 1px 0 rgba(255,255,255,0.12),
                inset 0 -1px 0 rgba(255,255,255,0.04);
        }

        #${CONTAINER_ID}::before {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            background: linear-gradient(180deg, rgba(255,255,255,0.08), transparent 22%, transparent 78%, rgba(118,241,255,0.06));
        }

        #${CONTAINER_ID}::after {
            content: "";
            position: absolute;
            inset: 0;
            width: 120%;
            height: 100%;
            pointer-events: none;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
            animation: fm-sweep 4s linear infinite;
            mix-blend-mode: screen;
            opacity: 0.35;
        }

        .fm-header {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: calc(14px * var(--fm-scale)) calc(16px * var(--fm-scale)) calc(4px * var(--fm-scale));
        }

        .fm-brand {
            display: flex;
            align-items: center;
            gap: calc(14px * var(--fm-scale));
            min-width: 0;
        }

        .fm-logo {
            width: calc(46px * var(--fm-scale));
            height: calc(46px * var(--fm-scale));
            border-radius: calc(16px * var(--fm-scale));
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;

            background: linear-gradient(135deg, #22d3ee, #34d399, #a855f7);
            box-shadow:
                0 12px 28px var(--fm-glow),
                0 0 20px rgba(56, 189, 248, 0.4),
                inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .fm-logo svg {
            width: calc(20px * var(--fm-scale));
            height: calc(20px * var(--fm-scale));
        }

        .fm-title {
            color: #fff;
            font-size: calc(26px * var(--fm-scale));
            font-weight: 800;
            letter-spacing: 0.4px;
            line-height: 1.06;
            text-shadow: 0 0 16px rgba(255,255,255,0.18), 0 0 30px rgba(0,247,255,0.18);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .fm-actions {
            display: flex;
            align-items: center;
            gap: calc(10px * var(--fm-scale));
            flex-shrink: 0;
        }

        .fm-btn {
            width: calc(32px * var(--fm-scale));
            height: calc(32px * var(--fm-scale));
            border-radius: calc(10px * var(--fm-scale));
            border: 1px solid rgba(94, 221, 255, 0.28);
            background: rgba(9, 22, 42, 0.4);
            color: rgba(255,255,255,0.96);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            backdrop-filter: blur(12px);
            transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        }

        .fm-btn:hover {
            background: rgba(34, 211, 153, 0.16);
            box-shadow: 0 0 14px rgba(52, 211, 153, 0.4);
            border-color: rgba(52, 211, 153, 0.5);
        }

        .fm-btn:active {
            transform: scale(0.93);
        }

        .fm-btn svg {
            width: calc(19px * var(--fm-scale));
            height: calc(19px * var(--fm-scale));
        }

        .fm-spin {
            animation: fm-spin 0.9s linear infinite;
        }

        @keyframes fm-spin {
            to { transform: rotate(360deg); }
        }

        .fm-body {
            position: relative;
            z-index: 1;
            padding: 0 calc(14px * var(--fm-scale)) calc(12px * var(--fm-scale));
        }

        .fm-main {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: calc(16px * var(--fm-scale));
            align-items: flex-start;
            min-height: calc(160px * var(--fm-scale));
        }

        .semi-gauge-box {
            position: relative;
            width: 200px;
            height: calc(140px * var(--fm-scale));
            overflow: hidden;
        }

        .semi-svg {
            width: 100%;
            height: 100%;
            display: block;
        }

        .gauge-core {
            position: absolute;
            left: 50%;
            top: 58%;
            transform: translate(-50%, -50%);
            width: 100%;
            text-align: center;
            pointer-events: none;
        }

        .gauge-percent {
            font-family: "JetBrains Mono", Consolas, monospace !important;
            font-size: calc(42px * var(--fm-scale));
            font-weight: 800;
            line-height: 1;
            color: #fff;
            letter-spacing: -0.8px;
            text-shadow: 0 0 24px rgba(255,255,255,0.12),0 0 40px var(--fm-glow);
        }

        .gauge-used-bottom {
            position: absolute;
            left: 50%;
            bottom: calc(4px * var(--fm-scale));
            transform: translateX(-50%);
            text-align: center;
            color: rgba(255,255,255,0.94);
            font-size: calc(16px * var(--fm-scale));
            font-weight: 700;
            white-space: nowrap;
        }

        .gauge-used-bottom b {
            font-family: "JetBrains Mono", Consolas, monospace !important;
            color: #fff;
            font-weight: 800;
            margin-left: 6px;
        }

        .chart-box {
            position: relative;
            min-width: 0;
            height: calc(170px * var(--fm-scale));
            padding: calc(6px * var(--fm-scale)) 0 calc(46px * var(--fm-scale)) calc(60px * var(--fm-scale));
        }

        .chart-tag {
            position: absolute;
            left: calc(-26px * var(--fm-scale));
            top: 46%;
            transform: translateY(-54%);
            writing-mode: vertical-rl;
            text-orientation: upright;
            color: rgba(255,255,255,0.98);
            font-size: calc(16px * var(--fm-scale));
            font-weight: 800;
            letter-spacing: 1px;
            text-shadow: 0 0 14px var(--fm-glow), 0 0 24px rgba(92,235,255,0.28);
        }

        .chart-svg {
            width: 100%;
            height: calc(140px * var(--fm-scale));
            display: block;
            overflow: visible;
        }

        .chart-grid-line {
            stroke: rgba(116, 234, 255, 0.22);
            stroke-width: 1.2;
            stroke-dasharray: 4 6;
        }

        .chart-axis-tick {
            stroke: rgba(139, 234, 255, 0.4);
            stroke-width: 2;
        }

        .chart-axis-label {
            font-family: "JetBrains Mono", Consolas, monospace !important;
            fill: rgba(212,245,255,0.88);
            font-size: calc(24px * var(--fm-scale));
            font-weight: 700;
        }

        .chart-now-label {
            fill: #fff;
            font-weight: 800;
        }

        .chart-line-back {
            stroke: rgba(202,245,255,0.24);
            stroke-width: calc(7px * var(--fm-scale));
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: blur(2px);
        }

        .chart-line {
            stroke: url(#fmLineStroke);
            stroke-width: calc(6px * var(--fm-scale));
            fill: none;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: drop-shadow(0 0 16px var(--fm-glow));
        }

        .chart-dot {
            fill: #fff;
            r: 5;
            filter: drop-shadow(0 0 8px rgba(255,255,255,1));
        }

        .chart-end-text {
            font-family: "JetBrains Mono", Consolas, monospace !important;
            fill: rgba(255,255,255,0.98);
            font-size: calc(18px * var(--fm-scale));
            font-weight: 700;
        }

        .chart-metrics {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: calc(38px * var(--fm-scale));
            pointer-events: none;

            display: flex;
            align-items: center;
            justify-content: center;
            gap: calc(24px * var(--fm-scale));
        }

        .chart-metric {
            display: flex;
            align-items: baseline;
            gap: calc(6px * var(--fm-scale));
            white-space: nowrap;
            color: rgba(255,255,255,0.96);
        }

        .chart-metric-label {
            font-size: calc(14px * var(--fm-scale));
            font-weight: 700;
            color: rgba(255,255,255,0.88);
        }

        .chart-metric-value {
            font-family: "JetBrains Mono", Consolas, monospace !important;
            font-size: calc(16px * var(--fm-scale));
            font-weight: 800;
            color: #fff;
        }

        .fm-status-line {
            margin-top: calc(6px * var(--fm-scale));
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: calc(4px * var(--fm-scale));
        }

        .fm-status-pill {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: calc(6px * var(--fm-scale)) calc(14px * var(--fm-scale));
            border-radius: 999px;
            border: 1px solid rgba(90, 228, 255, 0.3);
            background: rgba(7, 22, 40, 0.36);
            color: #fff;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
            animation: fm-pulse-glow 2.5s ease-in-out infinite;
        }

        .fm-status-dot {
            width: calc(10px * var(--fm-scale));
            height: calc(10px * var(--fm-scale));
            border-radius: 50%;
            background: var(--fm-accent);
            box-shadow: 0 0 14px var(--fm-glow);
            flex-shrink: 0;
        }

        .fm-status-text {
            font-size: calc(14px * var(--fm-scale));
            font-weight: 700;
            color: rgba(255,255,255,0.98);
        }

        .fm-status-range {
            font-family: "JetBrains Mono", Consolas, monospace !important;
            font-size: calc(14px * var(--fm-scale));
            font-weight: 700;
            color: rgba(200,244,255,0.9);
        }

        .fm-toast {
            position: fixed;
            top: 12%;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 22px;
            border-radius: 999px;
            background: rgba(9, 15, 28, 0.96);
            color: #fff;
            font-size: 14px;
            font-weight: 700;
            border: 1px solid rgba(52, 211, 153, 0.35);
            z-index: 99999;
            opacity: 0;
            transition: opacity 0.18s ease;
            box-shadow: 0 12px 30px rgba(0,0,0,0.36),0 0 20px rgba(52, 211, 153, 0.25);
        }

        .fm-toast.show {
            opacity: 1;
        }

        .fm-modal {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.68);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            opacity: 0;
            animation: fm-fade 0.2s forwards;
        }

        @keyframes fm-fade {
            to {
                opacity: 1;
            }
        }

        .fm-modal-box {
            width: 90%;
            max-width: 360px;
            padding: 24px;
            border-radius: 12px;
            border: 1px solid rgba(120, 235, 255, 0.3);
            background:
                radial-gradient(circle at top right, rgba(134, 239, 172, 0.15), transparent 36%),
                radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.12), transparent 36%),
                linear-gradient(145deg, rgba(16,24,40,0.98), rgba(11,18,32,0.98));
            box-shadow: 0 22px 60px rgba(0,0,0,0.5),0 0 40px rgba(56, 189, 248, 0.18);
        }

        .fm-modal-title {
            margin-bottom: 20px;
            text-align: center;
            color: #fff;
            font-size: 19px;
            font-weight: 800;
            text-shadow: 0 0 12px rgba(56, 189, 248,0.2);
        }

        .fm-form-item {
            margin-bottom: 16px;
        }

        .fm-form-label {
            display: block;
            margin-bottom: 8px;
            color: rgba(255,255,255,0.7);
            font-size: 13px;
            font-weight: 700;
        }

        .fm-input {
            width: 100%;
            height: 42px;
            padding: 0 14px;
            border-radius: 10px;
            border: 1px solid rgba(120, 235, 255, 0.22);
            background: rgba(255,255,255,0.045);
            color: #fff;
            font-size: 15px;
            outline: none;
            transition: border 0.2s, box-shadow 0.2s;
        }

        .fm-input:focus {
            border-color: rgba(52, 211, 153,0.5);
            box-shadow: 0 0 12px rgba(52, 211, 153,0.25);
        }

        .fm-range-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .fm-range {
            flex: 1;
            accent-color: #34d399;
        }

        .fm-range-val {
            min-width: 42px;
            text-align: right;
            color: #86efac;
            font-size: 14px;
            font-weight: 800;
        }

        .fm-modal-btns {
            display: flex;
            gap: 10px;
            margin-top: 22px;
        }

        .fm-modal-btn {
            flex: 1;
            height: 42px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
        }

        .fm-btn-cancel {
            background: rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.76);
        }

        .fm-btn-cancel:hover {
            background: rgba(255,255,255,0.14);
        }

        .fm-btn-save {
            background: linear-gradient(135deg, #22d3ee, #34d399, #a855f7);
            color: #fff;
            box-shadow: 0 0 16px rgba(52, 211, 153,0.3);
        }

        .fm-month-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 14px;
        }

        .fm-month-item {
            padding: 14px;
            border-radius: 10px;
            background: rgba(9, 22, 40, 0.32);
            border: 1px solid rgba(120, 235, 255, 0.2);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }

        .fm-month-k {
            margin-bottom: 8px;
            color: rgba(255,255,255,0.66);
            font-size: 12px;
            font-weight: 700;
        }

        .fm-month-v {
            color: #fff;
            font-size: 20px;
            font-weight: 800;
            font-family: "JetBrains Mono", Consolas, monospace !important;
            text-shadow: 0 0 10px rgba(56, 189, 248,0.15);
        }

        @media (max-width: 560px) {
            .fm-main {
                grid-template-columns: 180px 1fr;
                gap: 8px;
            }

            .semi-gauge-box {
                width: 180px;
            }

            .chart-metrics {
                gap: calc(16px * var(--fm-scale));
            }
        }
    `;

    document.head.appendChild(style);

    function $(sel, root) {
        return (root || document).querySelector(sel);
    }

    function createEl(tag, attrs, html) {
        const el = document.createElement(tag);
        if (attrs) {
            Object.keys(attrs).forEach((key) => {
                if (key === 'class') el.className = attrs[key];
                else if (key === 'style') el.style.cssText = attrs[key];
                else el.setAttribute(key, attrs[key]);
            });
        }
        if (html != null) el.innerHTML = html;
        return el;
    }

    function calcRemainDays() {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const d = now.getDate();
        const rd = clamp(parseInt(config.resetDay) || 1, 1, 31);

        const currentMonthDays = new Date(y, m + 1, 0).getDate();
        const nextMonthDays = new Date(y, m + 2, 0).getDate();

        const currentTargetDay = Math.min(rd, currentMonthDays);
        const nextTargetDay = Math.min(rd, nextMonthDays);

        const target = d < currentTargetDay
            ? new Date(y, m, currentTargetDay, 23, 59, 59)
            : new Date(y, m + 1, nextTargetDay, 23, 59, 59);

        return Math.max(0, Math.ceil((target - now) / 86400000));
    }

    function getConfiguredTotal() {
        return Math.max(0, parseFloat(config.totalGB) || 0);
    }

    function getDayKey(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function getDayStartMs(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    }

    function ensureHistoryState() {
        if (!Array.isArray(config.dayHistory)) config.dayHistory = [];
        if (typeof config.historyDayKey !== 'string') config.historyDayKey = '';
    }

    function normalizeHistory(now) {
        ensureHistoryState();
        const dayKey = getDayKey(now);
        const start = getDayStartMs(now);
        const end = start + 86400000;

        if (config.historyDayKey !== dayKey) {
            config.historyDayKey = dayKey;
            config.dayHistory = [];
        }

        config.dayHistory = config.dayHistory
            .filter((item) => item && Number.isFinite(item.t) && Number.isFinite(item.u) && item.t >= start && item.t < end)
            .sort((a, b) => a.t - b.t)
            .slice(-DAY_MINUTES - 2);
    }

    function getMinuteStamp(date) {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours(),
            date.getMinutes(),
            0,
            0
        ).getTime();
    }

    function recordUsageSample(force) {
        const now = new Date();
        normalizeHistory(now);

        const used = clamp(parseFloat(config.usedGB) || 0, 0, getConfiguredTotal());
        const minuteStamp = getMinuteStamp(now);
        const history = config.dayHistory;
        const last = history[history.length - 1];

        let changed = false;

        if (!last) {
            history.push({ t: minuteStamp, u: used });
            changed = true;
        } else if (last.t === minuteStamp) {
            if (force || Math.abs(last.u - used) > 0.0001) {
                last.u = used;
                changed = true;
            }
        } else {
            history.push({ t: minuteStamp, u: used });
            changed = true;
        }

        if (changed) saveConfig();

        return { now, used, minuteStamp };
    }

    function formatMinuteLabel(minuteIndex) {
        const total = clamp(Math.round(minuteIndex), 0, DAY_MINUTES - 1);
        const hour = String(Math.floor(total / 60)).padStart(2, '0');
        const minute = String(total % 60).padStart(2, '0');
        return `${hour}:${minute}`;
    }

    function formatChartUsage(value) {
        if (value >= 10) return `${value.toFixed(1)}G`;
        if (value >= 1) return `${value.toFixed(2)}G`;
        if (value >= 0.01) return `${value.toFixed(3)}G`;
        return `${value.toFixed(4)}G`;
    }

    function buildDailyUsageChart(theme, now, used) {
        normalizeHistory(now);

        const history = config.dayHistory.slice().sort((a, b) => a.t - b.t);
        const start = getDayStartMs(now);
        const currentMinute = clamp(Math.floor((now.getTime() - start) / 60000), 0, DAY_MINUTES - 1);

        if (!history.length) {
            history.push({ t: getMinuteStamp(now), u: used });
        }

        const minuteSeries = new Array(currentMinute + 1).fill(0);

        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];

            const prevMinute = clamp(Math.floor((prev.t - start) / 60000), 0, currentMinute);
            const currMinute = clamp(Math.floor((curr.t - start) / 60000), 0, currentMinute);

            if (currMinute <= prevMinute) continue;

            const deltaUsed = Math.max(0, curr.u - prev.u);
            const span = Math.max(1, currMinute - prevMinute);
            const share = deltaUsed / span;

            for (let minute = prevMinute + 1; minute <= currMinute; minute++) {
                minuteSeries[minute] += share;
            }
        }

        const smoothSeries = minuteSeries.map((_, index) => {
            let sum = 0;
            let count = 0;

            for (let offset = -2; offset <= 2; offset++) {
                const pos = index + offset;
                if (pos >= 0 && pos < minuteSeries.length) {
                    sum += minuteSeries[pos];
                    count++;
                }
            }

            return count ? sum / count : 0;
        });

        const left = 22;
        const right = 640;
        const top = 8;
        const bottom = 70;
        const width = right - left;
        const chartHeight = bottom - top;

        const maxValue = Math.max(...smoothSeries, 0);

        let pathD = '';
        let areaD = '';
        let dotsHtml = '';
        let lastX = left;
        let lastY = bottom - 1;

        for (let minute = 0; minute <= currentMinute; minute++) {
            const x = left + (minute / (DAY_MINUTES - 1)) * width;
            const ratio = maxValue > 0 ? smoothSeries[minute] / maxValue : 0;
            const y = bottom - ratio * (chartHeight - 8) - 1;

            if (minute === 0) {
                pathD = `M ${x.toFixed(2)} ${y.toFixed(2)}`;
                areaD = `M ${x.toFixed(2)} ${bottom} L ${x.toFixed(2)} ${y.toFixed(2)}`;
            } else {
                pathD += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
                areaD += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
            }

            lastX = x;
            lastY = y;
        }

        areaD += ` L ${lastX.toFixed(2)} ${bottom} Z`;

        const majorTicks = [0, 360, 720, 1080];
        const majorLabels = [];

        majorTicks.forEach((minute) => {
            if (!majorLabels.includes(minute)) majorLabels.push(minute);
        });

        if (!majorLabels.includes(currentMinute) && Math.abs(currentMinute - majorLabels[majorLabels.length - 1]) > 50) {
            majorLabels.push(currentMinute);
        }

        majorLabels.sort((a, b) => a - b);

        let gridHtml = '';
        for (let hour = 0; hour <= 24; hour += 6) {
            const minute = Math.min(hour * 60, DAY_MINUTES - 1);
            const x = left + (minute / (DAY_MINUTES - 1)) * width;
            gridHtml += `<line x1="${x.toFixed(2)}" y1="${top}" x2="${x.toFixed(2)}" y2="${bottom}" class="chart-grid-line"></line>`;
        }

        let axisHtml = '';
        majorLabels.forEach((minute) => {
            const x = left + (minute / (DAY_MINUTES - 1)) * width;
            const labelClass = minute === currentMinute ? 'chart-axis-label chart-now-label' : 'chart-axis-label';

            axisHtml += `<line x1="${x.toFixed(2)}" y1="${bottom + 3}" x2="${x.toFixed(2)}" y2="${bottom + 10}" class="chart-axis-tick"></line>`;
            axisHtml += `<text x="${x.toFixed(2)}" y="${bottom + 32}" text-anchor="middle" class="${labelClass}">${formatMinuteLabel(minute)}</text>`;

            if (minute <= currentMinute) {
                const ratio = maxValue > 0 ? smoothSeries[minute] / maxValue : 0;
                const y = bottom - ratio * (chartHeight - 8) - 1;
                dotsHtml += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="5" class="chart-dot"></circle>`;
            }
        });

        const liveValue = smoothSeries[currentMinute] || 0;
        const liveLabelX = Math.min(lastX + 12, 580);
        const liveLabelY = Math.max(lastY - 14, 12);

        return {
            pathD,
            areaD,
            gridHtml,
            dotsHtml,
            axisHtml,
            liveValueText: formatChartUsage(liveValue),
            liveLabelX,
            liveLabelY
        };
    }

    function getUsageTheme(percent) {
        if (percent >= config.dangerPct) {
            return {
                name: '告急',
                accent: '#ef4444',
                accent2: '#fb7185',
                glow: 'rgba(239, 68, 68, 0.45)',
                trackText: '90-100%',
                lineStart: '#ffffff',
                lineEnd: '#fb7185',
                status: '流量告急'
            };
        }

        if (percent >= config.warnPct) {
            return {
                name: '预警',
                accent: '#f59e0b',
                accent2: '#fde68a',
                glow: 'rgba(245, 158, 11, 0.45)',
                trackText: '70-90%',
                lineStart: '#ffffff',
                lineEnd: '#fcd34d',
                status: '流量偏高'
            };
        }

        return {
            name: '正常',
            accent: '#22c55e',
            accent2: '#86efac',
            glow: 'rgba(34, 197, 94, 0.42)',
            trackText: '1-70%',
            lineStart: '#ffffff',
            lineEnd: '#4ade80',
            status: '流量充足'
        };
    }

    function showToast(msg) {
        const old = document.querySelector('.fm-toast');
        if (old) old.remove();

        const t = createEl('div', { class: 'fm-toast' }, msg);
        document.body.appendChild(t);

        setTimeout(() => t.classList.add('show'), 10);
        setTimeout(() => {
            t.classList.remove('show');
            setTimeout(() => t.remove(), 180);
        }, 1500);
    }

    function openMonthSummary() {
        const total = getConfiguredTotal();
        const used = clamp(parseFloat(config.usedGB) || 0, 0, total);
        const remain = Math.max(0, total - used);
        const pct = total > 0 ? clamp((used / total) * 100, 0, 100) : 0;
        const rDays = calcRemainDays();
        const avg = rDays > 0 ? (remain / rDays).toFixed(1) : '0.0';

        const modal = createEl('div', { class: 'fm-modal' });
        modal.innerHTML =
            '<div class="fm-modal-box">' +
                '<div class="fm-modal-title">本月流量概览</div>' +
                '<div class="fm-month-grid">' +
                    '<div class="fm-month-item"><div class="fm-month-k">总量</div><div class="fm-month-v">' + total.toFixed(0) + 'G</div></div>' +
                    '<div class="fm-month-item"><div class="fm-month-k">已用</div><div class="fm-month-v">' + used.toFixed(1) + 'G</div></div>' +
                    '<div class="fm-month-item"><div class="fm-month-k">剩余</div><div class="fm-month-v">' + remain.toFixed(1) + 'G</div></div>' +
                    '<div class="fm-month-item"><div class="fm-month-k">使用率</div><div class="fm-month-v">' + pct.toFixed(0) + '%</div></div>' +
                    '<div class="fm-month-item"><div class="fm-month-k">剩余天数</div><div class="fm-month-v">' + rDays + '天</div></div>' +
                    '<div class="fm-month-item"><div class="fm-month-k">日均可用</div><div class="fm-month-v">' + avg + 'G</div></div>' +
                '</div>' +
                '<div class="fm-modal-btns"><button class="fm-modal-btn fm-btn-save" id="fm_month_ok">知道了</button></div>' +
            '</div>';

        document.body.appendChild(modal);

        $('#fm_month_ok', modal).onclick = () => modal.remove();
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    function buildSemiGaugeSVG(percent, theme) {
        const cx = 103;
        const cy = 103;
        const radius = 76;
        const fullArc = Math.PI * radius;
        const dashOffset = fullArc * (1 - percent / 100);

        return `
            <svg class="semi-svg" viewBox="0 0 206 118">
                <defs>
                    <linearGradient id="fmGaugeTrack" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stop-color="rgba(255,255,255,0.9)"/>
                        <stop offset="100%" stop-color="rgba(255,255,255,0.38)"/>
                    </linearGradient>
                    <linearGradient id="fmGaugeStroke" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stop-color="${theme.accent2}"/>
                        <stop offset="100%" stop-color="${theme.accent}"/>
                    </linearGradient>
                    <filter id="fmGaugeGlow" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="4" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"></feMergeNode>
                            <feMergeNode in="blur"></feMergeNode>
                            <feMergeNode in="SourceGraphic"></feMergeNode>
                        </feMerge>
                    </filter>
                </defs>
                <circle
                    cx="${cx}"
                    cy="${cy}"
                    r="${radius}"
                    fill="none"
                    stroke="url(#fmGaugeTrack)"
                    stroke-width="14"
                    stroke-linecap="round"
                    stroke-dasharray="${fullArc} ${fullArc}"
                    transform="rotate(-180 ${cx} ${cy})"
                    opacity="0.88"
                />
                ${percent > 0 ? `
                    <circle
                        cx="${cx}"
                        cy="${cy}"
                        r="${radius}"
                        fill="none"
                        stroke="url(#fmGaugeStroke)"
                        stroke-width="11"
                        stroke-linecap="round"
                        stroke-dasharray="${fullArc} ${fullArc}"
                        stroke-dashoffset="${dashOffset}"
                        transform="rotate(-180 ${cx} ${cy})"
                        filter="url(#fmGaugeGlow)"
                    />
                ` : ''}
            </svg>
        `;
    }

    function render() {
        const btn = document.getElementById('fm_refresh');
        const icon = btn && btn.querySelector('svg');
        if (icon) icon.classList.add('fm-spin');

        const sampleInfo = recordUsageSample(false);
        const total = getConfiguredTotal();
        const used = clamp(sampleInfo.used, 0, total);
        const remain = Math.max(0, total - used);
        const pct = total > 0 ? clamp((used / total) * 100, 0, 100) : 0;
        const rDays = calcRemainDays();
        const theme = getUsageTheme(pct);
        const chartData = buildDailyUsageChart(theme, sampleInfo.now, used);

        const container = document.getElementById(CONTAINER_ID);
        const body = document.getElementById('fm_body');

        if (!container || !body) return;

        container.style.setProperty('--fm-scale', getScale());
        container.style.setProperty('--fm-panel-alpha', getPanelOpacity());
        container.style.setProperty('--fm-accent', theme.accent);
        container.style.setProperty('--fm-accent-2', theme.accent2);
        container.style.setProperty('--fm-glow', theme.glow);
        container.style.setProperty('--fm-soft', theme.lineStart);

        body.innerHTML = `
            <div class="fm-main">
                <div class="semi-gauge-box">
                    ${buildSemiGaugeSVG(pct, theme)}
                    <div class="gauge-core">
                        <div class="gauge-percent">${pct.toFixed(0)}%</div>
                    </div>
                    <div class="gauge-used-bottom">已用<b>${used.toFixed(1)}G</b></div>
                </div>

                <div class="chart-box">
                    <div class="chart-tag">当日流量</div>

                    <svg class="chart-svg" viewBox="0 0 700 116" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="fmLineStroke" x1="0%" y1="50%" x2="100%" y2="50%">
                                <stop offset="0%" stop-color="${theme.lineStart}"></stop>
                                <stop offset="34%" stop-color="rgba(255,255,255,0.98)"></stop>
                                <stop offset="100%" stop-color="${theme.lineEnd}"></stop>
                            </linearGradient>
                            <linearGradient id="fmAreaFill" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="${theme.glow}"></stop>
                                <stop offset="100%" stop-color="rgba(255,255,255,0)"></stop>
                            </linearGradient>
                        </defs>

                        ${chartData.gridHtml}
                        <path d="${chartData.areaD}" fill="url(#fmAreaFill)" opacity="0.42"></path>
                        <path d="${chartData.pathD}" class="chart-line-back"></path>
                        <path d="${chartData.pathD}" class="chart-line"></path>
                        ${chartData.dotsHtml}

                        <text x="${chartData.liveLabelX}" y="${chartData.liveLabelY}" class="chart-end-text">${chartData.liveValueText}</text>
                        ${chartData.axisHtml}
                    </svg>

                    <div class="chart-metrics">
                        <div class="chart-metric">
                            <span class="chart-metric-label">总量</span>
                            <span class="chart-metric-value">${total.toFixed(0)}G</span>
                        </div>
                        <div class="chart-metric">
                            <span class="chart-metric-label">剩余</span>
                            <span class="chart-metric-value">${remain.toFixed(1)}G</span>
                        </div>
                        <div class="chart-metric">
                            <span class="chart-metric-label">剩余</span>
                            <span class="chart-metric-value">${rDays}天</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="fm-status-line">
                <div class="fm-status-pill">
                    <span class="fm-status-dot"></span>
                    <span class="fm-status-text">${theme.status}</span>
                </div>
                <div class="fm-status-range">${theme.trackText}</div>
            </div>
        `;

        setTimeout(() => {
            if (icon) icon.classList.remove('fm-spin');
        }, 320);
    }

    function openSetting() {
        const modal = createEl('div', { class: 'fm-modal' });
        modal.innerHTML =
            '<div class="fm-modal-box">' +
                '<div class="fm-modal-title">RSI流量仪表盘设置</div>' +
                '<div class="fm-form-item"><label class="fm-form-label">月度总流量 (GB)</label><input class="fm-input" id="fs_total" type="number" step="0.1" value="' + config.totalGB + '"></div>' +
                '<div class="fm-form-item"><label class="fm-form-label">已用流量 (GB)</label><input class="fm-input" id="fs_used" type="number" step="0.1" value="' + config.usedGB + '"></div>' +
                '<div class="fm-form-item"><label class="fm-form-label">月结日 (1-31)</label><input class="fm-input" id="fs_day" type="number" min="1" max="31" value="' + config.resetDay + '"></div>' +
                '<div class="fm-form-item"><label class="fm-form-label">周期文案天数</label><input class="fm-input" id="fs_cycle" type="number" min="1" max="99" value="' + config.cycleDays + '"></div>' +
                '<div class="fm-form-item"><label class="fm-form-label">卡片缩放</label><div class="fm-range-wrap"><input class="fm-range" id="fs_scale" type="range" min="0.4" max="0.9" step="0.05" value="' + getScale() + '"><span class="fm-range-val" id="fs_sval">' + Math.round(getScale() * 100) + '%</span></div></div>' +
                '<div class="fm-form-item"><label class="fm-form-label">卡片透明</label><div class="fm-range-wrap"><input class="fm-range" id="fs_alpha" type="range" min="0.45" max="1" step="0.05" value="' + getPanelOpacity() + '"><span class="fm-range-val" id="fs_aval">' + Math.round(getPanelOpacity() * 100) + '%</span></div></div>' +
                '<div class="fm-modal-btns"><button class="fm-modal-btn fm-btn-cancel" id="fs_cancel">取消</button><button class="fm-modal-btn fm-btn-save" id="fs_save">保存</button></div>' +
            '</div>';

        document.body.appendChild(modal);

        $('#fs_scale', modal).oninput = function () {
            $('#fs_sval', modal).textContent = Math.round(parseFloat(this.value) * 100) + '%';
        };

        $('#fs_alpha', modal).oninput = function () {
            $('#fs_aval', modal).textContent = Math.round(parseFloat(this.value) * 100) + '%';
        };

        $('#fs_cancel', modal).onclick = () => modal.remove();
        $('#fs_save', modal).onclick = () => {
            config.totalGB = Math.max(0, parseFloat($('#fs_total', modal).value) || 0);
            config.usedGB = Math.max(0, parseFloat($('#fs_used', modal).value) || 0);
            config.resetDay = clamp(parseInt($('#fs_day', modal).value) || 1, 1, 31);
            config.cycleDays = clamp(parseInt($('#fs_cycle', modal).value) || 30, 1, 99);
            config.uiScale = clamp(parseFloat($('#fs_scale', modal).value) || 0.68, 0.4, 0.9);
            config.panelOpacity = clamp(parseFloat($('#fs_alpha', modal).value) || 0.86, 0.45, 1);

            if (config.usedGB > config.totalGB) config.usedGB = config.totalGB;

            recordUsageSample(true);
            saveConfig();
            modal.remove();
            render();
            showToast('配置已保存');
        };

        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    }

    const old = document.getElementById(CONTAINER_ID);
    if (old) old.remove();

    const container = createEl('div', { id: CONTAINER_ID });
    container.innerHTML =
        '<div class="fm-header">' +
            '<div class="fm-brand">' +
                '<div class="fm-logo">' + Icons.Radar + '</div>' +
                '<div class="fm-title">RSI流量仪表盘</div>' +
            '</div>' +
            '<div class="fm-actions">' +
                '<button class="fm-btn" id="fm_expand" title="查看本月流量">' + Icons.Panel + '</button>' +
                '<button class="fm-btn" id="fm_setting" title="设置">' + Icons.Tune + '</button>' +
                '<button class="fm-btn" id="fm_refresh" title="刷新">' + Icons.Refresh + '</button>' +
            '</div>' +
        '</div>' +
        '<div class="fm-body" id="fm_body"></div>';

    const netCard = document.querySelector('.net-card');
    const fc = document.querySelector('.functions-container');

    if (fc) {
        fc.insertAdjacentElement('afterend', container);
    } else if (netCard) {
        netCard.parentNode.insertBefore(container, netCard.nextSibling);
    } else {
        document.body.appendChild(container);
    }

    document.getElementById('fm_refresh').onclick = render;
    document.getElementById('fm_setting').onclick = openSetting;
    document.getElementById('fm_expand').onclick = openMonthSummary;

    function startAutoTracking() {
        if (autoTrackTimer) clearInterval(autoTrackTimer);
        if (window.__fmAutoTrackTimer) clearInterval(window.__fmAutoTrackTimer);

        autoTrackTimer = setInterval(() => {
            recordUsageSample(false);
            render();
        }, 60000);

        window.__fmAutoTrackTimer = autoTrackTimer;
    }

    if (window.__fmVisibilityHandler) {
        document.removeEventListener('visibilitychange', window.__fmVisibilityHandler);
    }

    window.__fmVisibilityHandler = () => {
        if (!document.hidden) {
            recordUsageSample(false);
            render();
        }
    };

    document.addEventListener('visibilitychange', window.__fmVisibilityHandler);
    startAutoTracking();
    setTimeout(render, 300);
})();
</script>