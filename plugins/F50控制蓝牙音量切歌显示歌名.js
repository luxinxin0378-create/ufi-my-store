//<script>
(() => {
    const CONTAINER_ID = 'MC_CONTAINER';
    const COLLAPSE_KEY = 'mc_collapse_state';

    const state = {
        track: { title: '未知歌曲', artist: '' },
        isPlaying: false,
        bluetoothOn: false,
        busy: false,
    };

    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const esc = (str) => String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const clean = (str) => String(str ?? '').replace(/[\r\u2000-\u200F\u202A-\u202E\u2060\uFEFF]/g, '').replace(/^null$|^$/, '').trim();

    const run = async (cmd, timeout = 15000) => {
        try {
            const res = await runShellWithRoot(`${cmd} 2>&1`, timeout);
            return { ok: Boolean(res?.success), text: String(res?.content ?? '').trim() };
        } catch (e) {
            return { ok: false, text: `异常: ${e.message}` };
        }
    };

    // ---------- 解析器（更健壮的状态提取） ----------
    function parseMediaInfo(text) {
        const result = { title: '', artist: '', isPlaying: false };
        if (!text) return result;

        // 1. 提取 metadata 中的 description
        const metaMatch = text.match(/metadata:\s*[^,]*,\s*description=([^,]+),\s*([^,]+),\s*null/i);
        if (metaMatch) {
            result.title = clean(metaMatch[1]);
            result.artist = clean(metaMatch[2]);
        }

        // 2. 备选通用提取
        if (!result.title) {
            let m = text.match(/[Tt]itle\s*[=:]\s*"([^"]+)"/);
            if (!m) m = text.match(/[Tt]itle\s*[=:]\s*([^,{}\n]+)/);
            if (m) result.title = clean(m[1]);
        }
        if (!result.artist) {
            let m = text.match(/[Aa]rtist\s*[=:]\s*"([^"]+)"/);
            if (!m) m = text.match(/[Aa]rtist\s*[=:]\s*([^,{}\n]+)/);
            if (m) result.artist = clean(m[1]);
        }

        // 3. 提取播放状态 —— 使用更宽泛的正则
        // 查找 state 后面的数字，可能出现在 PlaybackState {state=3, ...}
        const stateMatch = text.match(/state\s*=\s*(\d+)/i);
        if (stateMatch) {
            const s = parseInt(stateMatch[1]);
            // 根据 Android MediaSession 定义：2=暂停，3=播放，4=快进等
            result.isPlaying = (s === 3);  // 只把 3 视为播放中
        } else {
            // 备选：检查是否包含 playstate=2 或 isPlaying=true
            if (text.includes('playstate=2') || text.includes('isPlaying=true')) {
                result.isPlaying = true;
            }
        }

        return result;
    }

    // ---------- 获取媒体信息 ----------
    const fetchMediaInfo = async () => {
        try {
            let title = '', artist = '', isPlaying = false;

            // 优先使用 --current
            let res = await run('dumpsys media_session --current');
            if (res.ok && res.text) {
                const info = parseMediaInfo(res.text);
                if (info.title) { title = info.title; artist = info.artist || ''; isPlaying = info.isPlaying; }
            }

            // 如果没取到，从完整输出中找
            if (!title) {
                res = await run('dumpsys media_session');
                if (res.ok && res.text) {
                    // 分割多个会话，找第一个有效标题
                    const parts = res.text.split(/Sessions\s*\([^)]*\)/);
                    for (const part of parts) {
                        const info = parseMediaInfo(part);
                        if (info.title && !info.title.includes('null') && info.title !== '未知歌曲') {
                            title = info.title;
                            artist = info.artist || '';
                            isPlaying = info.isPlaying;
                            break;
                        }
                    }
                }
            }

            // 如果还是没有，尝试从通知提取
            if (!title) {
                res = await run(`dumpsys notification | grep -E 'title=|text=' | head -10`);
                if (res.ok && res.text) {
                    const info = parseMediaInfo(res.text);
                    if (info.title) { title = info.title; artist = info.artist || ''; isPlaying = info.isPlaying; }
                }
            }

            state.track = { title: title || '未知歌曲', artist: artist || '' };
            state.isPlaying = isPlaying;
        } catch (e) {
            state.track = { title: '获取失败', artist: '' };
            state.isPlaying = false;
        }
    };

    // ---------- 蓝牙 ----------
    const fetchBluetoothInfo = async () => {
        try {
            const btRes = await run('settings get global bluetooth_on');
            state.bluetoothOn = btRes.ok && clean(btRes.text) === '1';
        } catch { state.bluetoothOn = false; }
    };

    const updateAll = async () => {
        await fetchMediaInfo();
        await fetchBluetoothInfo();
    };

    // ---------- 控制 ----------
    const mediaKey = async (action) => {
        const map = { play: 85, next: 87, prev: 88 };
        await run(`input keyevent ${map[action]}`);
        // 等待系统处理按键并更新状态
        await wait(500);
        await updateAll();
        render();
    };
    const volumeKey = async (direction) => {
        const keycode = direction === 'up' ? 24 : 25;
        await run(`input keyevent ${keycode}`);
        showToast(direction === 'up' ? '音量+' : '音量-', 'blue');
    };
    const toggleBluetooth = async () => {
        const enable = !state.bluetoothOn;
        await run(enable ? 'svc bluetooth enable' : 'svc bluetooth disable');
        await run(`settings put global bluetooth_on ${enable ? 1 : 0}`);
        state.bluetoothOn = enable;
        showToast(enable ? '蓝牙已开启' : '蓝牙已关闭', 'blue');
        await updateAll();
        render();
    };

    // ---------- Toast ----------
    const showToast = (msg) => {
        const old = document.querySelector('.mc-toast');
        if (old) old.remove();
        const t = document.createElement('div');
        t.className = 'mc-toast';
        t.style.cssText = `
            position: fixed; top: 12%; left: 50%; transform: translateX(-50%);
            background: rgba(20,20,30,0.85); color: #fff; padding: 12px 24px;
            border-radius: 40px; font-size: 14px; font-weight: 700; z-index: 99999;
            opacity: 0; transition: 0.3s; border: 1px solid rgba(255,255,255,0.15);
            backdrop-filter: blur(20px); display: flex; align-items: center; gap: 10px;
        `;
        t.innerHTML = `<span>${msg}</span>`;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.style.opacity = '1');
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
    };

    // ---------- 渲染 ----------
    function render() {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;

        const { title, artist } = state.track;
        const status = state.isPlaying ? '播放中' : '已暂停';
        const btIcon = state.bluetoothOn ? '🔵' : '⚪';
        const btClass = state.bluetoothOn ? 'bt-on' : 'bt-off';

        // 完全透明，无任何背景色
        const content = `
            <div class="mc-card">
                <div class="mc-track">
                    <div class="mc-title">${esc(title)}</div>
                    <div class="mc-artist">${esc(artist) || ' '}</div>
                    <div class="mc-status">${status}</div>
                </div>
                <div class="mc-controls">
                    <button id="mc_prev" class="mc-ctrl-btn">⏮</button>
                    <button id="mc_play" class="mc-ctrl-btn primary">${state.isPlaying ? '⏸' : '▶'}</button>
                    <button id="mc_next" class="mc-ctrl-btn">⏭</button>
                </div>
                <div class="mc-extra">
                    <button id="mc_vol_down">🔉</button>
                    <button id="mc_vol_up">🔊</button>
                    <button id="mc_bt" class="${btClass}">${btIcon} 蓝牙</button>
                </div>
            </div>
        `;

        const body = container.querySelector('.mc-body-block');
        if (body) {
            body.innerHTML = content;
            bindEvents(body);
        }
    }

    function bindEvents(body) {
        body.querySelector('#mc_play').onclick = async () => {
            await mediaKey('play');
            showToast('播放/暂停');
        };
        body.querySelector('#mc_prev').onclick = async () => {
            await mediaKey('prev');
            showToast('上一曲');
        };
        body.querySelector('#mc_next').onclick = async () => {
            await mediaKey('next');
            showToast('下一曲');
        };
        body.querySelector('#mc_vol_down').onclick = async () => await volumeKey('down');
        body.querySelector('#mc_vol_up').onclick = async () => await volumeKey('up');
        body.querySelector('#mc_bt').onclick = toggleBluetooth;
    }

    // ---------- 构建UI ----------
    function buildContainer() {
        const old = document.getElementById(CONTAINER_ID);
        if (old) old.remove();

        const container = document.createElement('div');
        container.id = CONTAINER_ID;
        container.style.cssText = 'width:100%; margin:10px 0; display:flex; flex-direction:column; position:relative; gap:0; z-index:10;';

        const header = document.createElement('div');
        header.className = 'mc-header-block';
        header.innerHTML = `
            <div class="mc-logo-area">
                <div class="mc-title-group">
                    <div class="mc-main-title">🎵 媒体控制</div>
                    <div class="mc-sub-title">系统媒体信息</div>
                </div>
            </div>
            <div class="mc-header-actions">
                <label class="mc-monitor-switch">
                    <input type="checkbox" class="mc-collapse-toggle" checked>
                    <span class="mc-slider round"></span>
                </label>
            </div>
        `;
        container.appendChild(header);

        const body = document.createElement('div');
        body.className = 'mc-body-block';
        body.innerHTML = '<div class="mc-content-container"></div>';
        container.appendChild(body);

        const tmContainer = document.getElementById('TM_CONTAINER');
        if (tmContainer && tmContainer.parentNode) {
            tmContainer.parentNode.insertBefore(container, tmContainer.nextSibling);
        } else {
            document.body.appendChild(container);
        }

        const toggle = container.querySelector('.mc-collapse-toggle');
        const bodyBlock = container.querySelector('.mc-body-block');
        const headerBlock = container.querySelector('.mc-header-block');
        const saved = localStorage.getItem(COLLAPSE_KEY);
        if (saved === 'closed') {
            toggle.checked = false;
            bodyBlock.style.height = '0';
            bodyBlock.style.opacity = '0';
            bodyBlock.style.overflow = 'hidden';
            headerBlock.classList.add('is-collapsed');
        } else {
            toggle.checked = true;
            bodyBlock.style.height = 'auto';
            bodyBlock.style.opacity = '1';
            bodyBlock.style.overflow = 'visible';
            headerBlock.classList.remove('is-collapsed');
        }
        toggle.onchange = function() {
            if (this.checked) {
                bodyBlock.style.height = 'auto';
                bodyBlock.style.opacity = '1';
                bodyBlock.style.overflow = 'visible';
                headerBlock.classList.remove('is-collapsed');
                localStorage.setItem(COLLAPSE_KEY, 'open');
                updateAll().then(render);
            } else {
                bodyBlock.style.height = '0';
                bodyBlock.style.opacity = '0';
                bodyBlock.style.overflow = 'hidden';
                headerBlock.classList.add('is-collapsed');
                localStorage.setItem(COLLAPSE_KEY, 'closed');
            }
        };

        return container;
    }

    // ---------- 样式注入（纯透明毛玻璃） ----------
    function injectStyles() {
        const styleId = 'mc_style';
        if (document.getElementById(styleId)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            #MC_CONTAINER, #MC_CONTAINER * { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; box-sizing: border-box; }
            #MC_CONTAINER { width: 100%; margin: 10px 0; display: flex; flex-direction: column; position: relative; gap: 0; z-index: 10; }

            .mc-header-block {
                background: transparent !important;
                backdrop-filter: blur(40px) saturate(180%);
                -webkit-backdrop-filter: blur(40px) saturate(180%);
                border-radius: 24px 24px 0 0;
                padding: 14px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border: 1px solid rgba(255,255,255,0.12);
                border-bottom: none;
                margin-bottom: 0;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
                transition: border-radius 0.3s;
            }
            .mc-header-block.is-collapsed { border-radius: 24px !important; border-bottom: 1px solid rgba(255,255,255,0.12); }

            .mc-logo-area { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
            .mc-title-group { display: flex; flex-direction: column; justify-content: center; white-space: nowrap; }
            .mc-main-title { font-size: 17px; font-weight: 800; color: #fff; line-height: 1.1; text-shadow: 0 1px 8px rgba(0,0,0,0.3); }
            .mc-sub-title { font-size: 11px; color: rgba(255,255,255,0.5); font-weight: 600; margin-top: 2px; }

            .mc-header-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
            .mc-monitor-switch { position: relative; width: 44px; height: 24px; display: inline-block; }
            .mc-monitor-switch input { opacity: 0; width: 0; height: 0; }
            .mc-slider {
                position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                background-color: rgba(255,255,255,0.2);
                transition: .4s; border-radius: 34px;
                border: 1px solid rgba(255,255,255,0.2);
            }
            .mc-slider:before {
                position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px;
                background-color: white; transition: .4s; border-radius: 50%;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            input:checked + .mc-slider {
                background-color: rgba(100, 140, 255, 0.5);
                border-color: rgba(100, 140, 255, 0.6);
            }
            input:checked + .mc-slider:before { transform: translateX(20px); }

            .mc-body-block {
                background: transparent !important;
                backdrop-filter: blur(40px) saturate(180%);
                -webkit-backdrop-filter: blur(40px) saturate(180%);
                border-radius: 0 0 24px 24px;
                border: 1px solid rgba(255,255,255,0.1);
                border-top: none;
                overflow: hidden;
                transition: all 0.4s;
                padding: 20px;
                min-height: 160px;
                display: flex;
                flex-direction: column;
                position: relative;
            }
            .mc-body-block.collapsed { padding-bottom: 0 !important; border-bottom: none !important; min-height: 0; }

            .mc-card {
                background: transparent !important;
                backdrop-filter: blur(30px) saturate(150%);
                -webkit-backdrop-filter: blur(30px) saturate(150%);
                border-radius: 32px;
                padding: 36px 24px 24px 24px;
                border: 1px solid rgba(255,255,255,0.1);
                box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                text-align: center;
                color: #fff;
                width: 100%;
                max-width: 480px;
                margin: 0 auto;
                position: relative;
            }

            .mc-track { margin-bottom: 28px; }
            .mc-title {
                font-size: 2.2rem;
                font-weight: 700;
                letter-spacing: 0.5px;
                line-height: 1.2;
                margin-bottom: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                text-shadow: 0 2px 12px rgba(0,0,0,0.4);
            }
            .mc-artist {
                font-size: 1.2rem;
                font-weight: 500;
                opacity: 0.8;
                letter-spacing: 0.3px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                text-shadow: 0 1px 8px rgba(0,0,0,0.3);
            }
            .mc-status {
                font-size: 0.8rem;
                opacity: 0.6;
                margin-top: 12px;
                letter-spacing: 0.5px;
                font-weight: 500;
            }

            .mc-controls {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 32px;
                margin: 8px 0 12px;
            }
            .mc-ctrl-btn {
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.15);
                border-radius: 50%;
                width: 64px;
                height: 64px;
                color: #fff;
                font-size: 1.8rem;
                cursor: pointer;
                transition: all 0.15s ease;
                backdrop-filter: blur(4px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
            }
            .mc-ctrl-btn:active {
                transform: scale(0.88);
                background: rgba(255,255,255,0.2);
            }
            .mc-ctrl-btn.primary {
                width: 76px;
                height: 76px;
                background: rgba(139, 92, 246, 0.2);
                border: 2px solid rgba(139, 92, 246, 0.3);
                font-size: 2.2rem;
                box-shadow: 0 0 30px rgba(139,92,246,0.1);
            }
            .mc-ctrl-btn.primary:active {
                background: rgba(139, 92, 246, 0.4);
                transform: scale(0.88);
            }

            .mc-extra {
                display: flex;
                justify-content: center;
                gap: 16px;
                margin-top: 20px;
                padding-top: 16px;
                border-top: 1px solid rgba(255,255,255,0.08);
            }
            .mc-extra button {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 30px;
                color: #ddd;
                font-size: 0.8rem;
                padding: 6px 16px;
                cursor: pointer;
                transition: all 0.15s;
                display: flex;
                align-items: center;
                gap: 4px;
                opacity: 0.8;
                backdrop-filter: blur(4px);
            }
            .mc-extra button:active {
                opacity: 1;
                transform: scale(0.94);
                background: rgba(255,255,255,0.15);
            }
            .mc-extra .bt-on { color: #8bb8ff; opacity: 1; }
            .mc-extra .bt-off { color: #999; }

            @media (max-width: 480px) {
                .mc-title { font-size: 1.8rem; }
                .mc-artist { font-size: 1.0rem; }
                .mc-ctrl-btn { width: 54px; height: 54px; font-size: 1.5rem; }
                .mc-ctrl-btn.primary { width: 64px; height: 64px; font-size: 1.8rem; }
                .mc-card { padding: 24px 16px 16px; }
                .mc-controls { gap: 20px; }
            }
        `;
        document.head.appendChild(style);
    }

    // ---------- 初始化 ----------
    const init = async () => {
        injectStyles();
        const container = buildContainer();
        await updateAll();
        render();

        let refreshInterval;
        const startInterval = () => {
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(async () => {
                const toggle = container.querySelector('.mc-collapse-toggle');
                if (toggle && toggle.checked) {
                    await updateAll();
                    render();
                }
            }, 1500); // 缩短刷新间隔，提高响应
        };
        startInterval();

        const toggle = container.querySelector('.mc-collapse-toggle');
        const originalOnchange = toggle.onchange;
        toggle.onchange = function(e) {
            originalOnchange.call(this, e);
            if (this.checked) {
                updateAll().then(render);
                startInterval();
            } else {
                if (refreshInterval) clearInterval(refreshInterval);
            }
        };
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
//</script>