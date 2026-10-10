//<script>
(() => {
	// 如果已存在则先清理
	const EXISTING_ID = 'ufi-dashboard-iframe';
	const old = document.getElementById(EXISTING_ID);
	if (old) old.remove();
	// 获取本地存储的看板常驻状态
	let ufi_dashboard_state = localStorage.getItem('ufi_dashboard_state') || '0';

	// 注入 iframe
	const iframe = document.createElement('iframe');
	iframe.id = EXISTING_ID;
	iframe.style.position = 'fixed';
	iframe.style.inset = '0';
	iframe.style.width = '100%';
	iframe.style.height = '100%';
	iframe.style.border = '0';
	iframe.style.transition = 'all .3s';
	iframe.style.opacity = '0';
	iframe.style.display = 'none';
	iframe.style.background = 'transparent';
	document.body.appendChild(iframe);
	const container = document.querySelector('.container')

	const btn = document.createElement('button')
	btn.textContent = "打开数据看板"
	let timer_ani = null
	let timer_ani1 = null
	btn.onclick = () => {
		iframe.style.display = ''
		timer_ani && clearTimeout(timer_ani)
		timer_ani = setTimeout(() => {
			iframe.style.opacity = '1';
			container.style.display = 'none'
			ufi_dashboard_state = "1"
			localStorage.setItem('ufi_dashboard_state', '1')
		}, 350);
	}

	document.querySelector('.actions-buttons').appendChild(btn)

	if (ufi_dashboard_state === '1') btn.click()

	//接收子页面的数据
	window.addEventListener('message', (event) => {
		if (event.data && event.data.type == "BACK_TO_UFITOOLS") {
			iframe.style.opacity = '0';
			container.style.display = ''
			timer_ani1 && clearTimeout(timer_ani1)
			timer_ani1 = setTimeout(() => {
				iframe.style.display = 'none'
				ufi_dashboard_state = "0"
				localStorage.setItem('ufi_dashboard_state', '0')
			}, 310);
		}
	});

	// 从父页面桥接数据
	const parentData = (window.UFI_DATA && typeof window.UFI_DATA === 'object') ? { ...window.UFI_DATA, QORS_MESSAGE: QORS_MESSAGE || "-" } : null;
	// 内联 HTML + CSS + JS
	const html = `<kano_!DOCTYPE html>
<kano_html lang="zh-CN">
<kano_head>
	<kano_meta charset="UTF-8">
	<kano_meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
	<title>UFI-TOOLS-AI看板</title>
	<kano_script src="/script/lib/chart.js"></kano_script>
	<kano_style>
/* 基础变量 */
:root {
	--bg: #00000059;
	--card-bg: rgba(255, 255, 255, 0.06);
	--card-border: rgba(255, 255, 255, 0.12);
	--text: #e7ebf5;
	--muted: #a8b0c3;
	--accent: #4aa8ff;
	--good: #22c55e;
	--warn: #f59e0b;
	--bad: #ef4444;
	--glass-blur: 16px;
	--radius: 14px;
}
* { box-sizing: border-box; }

html, body {
	margin: 0;
	font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
	color: var(--text);
	background: var(--bg);
}

.dashboard-container { min-height: 100vh; padding: 20px 16px 40px; }
.header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 8px auto 16px; max-width: 1400px; }
.header-left { display: flex; align-items: center; gap: 10px; }
.net-badge { padding: 4px 8px; border-radius: 8px; background: rgba(42,120,255,0.18); border: 1px solid var(--card-border); font-weight: 700; font-size: 12px; color: #dbe7ff; }
.title { font-weight: 700; letter-spacing: 0.3px; font-size: 20px; }
.header-right { display: flex; align-items: center; gap: 14px; }
.signal { display: inline-flex; gap: 2px; align-items: flex-end; height: 16px; }
.signal .bar { width: 3px; background: rgba(255,255,255,0.3); border-radius: 2px; display: inline-block; }
.signal .b1 { height: 4px; } .signal .b2 { height: 7px; } .signal .b3 { height: 10px; } .signal .b4 { height: 13px; }
.signal .on { background: #6ee7ff; box-shadow: 0 0 6px rgba(110,231,255,0.7); }
.battery { display: inline-flex; align-items: center; gap: 6px; }
.battery-body { position:relative;width: 28px; height: 14px; border: 1px solid var(--card-border); border-radius: 3px; position: relative; background: rgba(255,255,255,0.06);}
.battery-fill { height: 100%; width: 0%; background: linear-gradient(90deg,#22c55e,#4ade80); border-radius: 3px;}
.battery-cap { width: 3px; height: 8px; background: var(--card-border); border-radius: 1px; margin-left: -6px; }
.battery-text { font-weight: 700; font-size: 12px; color: var(--muted); }

.grid { max-width: 1400px; margin: 0 auto; display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
.card { backdrop-filter: blur(var(--glass-blur)); -webkit-backdrop-filter: blur(var(--glass-blur)); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04); }

.kpis { grid-column: span 12; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
#card-network > .card-header { grid-column: 1 / -1; }
.kpis.compact { grid-template-columns: repeat(6, 1fr); }
.kpi.wide { grid-column: span 2; }
.duplex { font-weight: 700; font-size: 18px; }
.duplex .rx { color: #93c5fd; } .duplex .tx { color: #86efac; } .duplex .sep { color: var(--muted); margin: 0 6px; }

.kpi { background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03)); border: 1px solid var(--card-border); border-radius: 12px; padding: 12px; }
.kpi-label { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
.kpi-value { font-size: 18px; font-weight: 700; }
.kpi-value.small { font-size: 14px; word-break: break-all; }

.chart-card { grid-column: span 6; }
.progress-card { grid-column: span 6; }

#card-temp-mem .progress-grid { display: grid; grid-template-columns: repeat(1, 1fr); gap: 30px; }
#card-temp-mem .progress-block { grid-template-columns: 120px 1fr 70px; }

#card-signal .progress-fill { background: linear-gradient(90deg,#60a5fa,#34d399); }
.level-strong { background: linear-gradient(90deg,#22c55e,#86efac) !important; }
.level-medium { background: linear-gradient(90deg,#f59e0b,#fbbf24) !important; }
.level-weak { background: linear-gradient(90deg,#ef4444,#f97316) !important; }

.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.card-title { font-weight: 700; }
.card-extra { color: var(--muted); font-size: 12px; }
.btn-mask { border: 1px solid var(--card-border); background: rgba(255,255,255,0.06); color: var(--text); font-weight: 600; font-size: 12px; padding: 6px 10px; border-radius: 8px; cursor: pointer; transition: background 160ms ease, box-shadow 160ms ease; }
.btn-mask[aria-pressed="true"] { box-shadow: 0 0 0 2px rgba(102,227,255,0.25) inset; }
.btn-mask:hover { background: rgba(255,255,255,0.09); }

canvas { width: 100% !important; height: 288px !important; display: block; }
.chart-card canvas { image-rendering: -moz-crisp-edges; image-rendering: pixelated; }

.progress-block { display: grid; grid-template-columns: 120px 1fr 70px; gap: 10px; align-items: center; }
.progress-label { color: var(--muted); font-size: 13px; }
.progress-bar { width: 100%; height: 12px; border-radius: 999px; background: rgba(255,255,255,0.06); border: 1px solid var(--card-border); overflow: hidden; position: relative; }
.progress-fill { height: 100%; width: 0%; border-radius: 999px; background: linear-gradient(90deg, rgba(74,168,255,0.9), rgba(42,120,255,0.9)); box-shadow: 0 0 10px rgba(74,168,255,0.6); transition: width 300ms ease; }
.progress-value { font-weight: 700; font-size: 14px; text-align: right; }
.divider { height: 10px; }

@media (max-width: 1200px) {
	.chart-card { grid-column: span 12; }
	.progress-card { grid-column: span 12; }
	.kpis { grid-template-columns: repeat(3, 1fr); }
	#card-temp-mem .progress-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
	.title { font-size: 16px; }
	.subtitle { font-size: 12px; }
	.kpis { grid-template-columns: repeat(2, 1fr); }
	canvas { height: 220px !important; }
	.progress-block { grid-template-columns: 88px 1fr 58px; }
}
#kpi-nr,#kpi-lte { font-size: 12px; }
.span-col-12 { grid-column: span 12; }
#val-rsrp,#val-sinr{font-size:12px}
#kpi-qci{font-size:12px}
#val-storage-int{font-size:12px}
.battery-body.charging::after {
	content: "⚡";
    position: absolute;
    top: 9px;
    left: 9px;
    font-size: 18px;
    transform: rotate(20deg) translate(-50%, -50%);
    pointer-events: none;
}
</kano_style>
</kano_head>
<kano_body>
	<div class="dashboard-container">
		<header class="header">
			<div class="header-left">
				<div class="btn-mask" id="back_to_ufitools" style="user-select:none">返回</div>
				<div class="title">UFI-数据看板</div>
			</div>
			<div class="header-right">
				<div class="signal" id="icon-signal" aria-label="信号强度">
					<span class="bar b1"></span><span class="bar b2"></span><span class="bar b3"></span><span class="bar b4"></span>
				</div>
				<div class="battery" id="icon-battery" aria-label="电池">
					<div class="battery-body"><div class="battery-fill" id="battery-fill"></div></div>
					<div class="battery-cap"></div>
					<div class="battery-text" id="battery-text">-</div>
				</div>
			</div>
		</header>

		<main class="grid">
			<section class="card kpis compact" id="card-throughput">
				<section class="wide progress-card span-col-12" id="card-signal">
					<div class="card-header">
						<div class="card-title">无线信号质量</div>
						<div class="card-extra" id="signal-label">-</div>
					</div>
                    <div class="progress-block">
						<div class="progress-label">RSRP</div>
						<div class="progress-bar" aria-label="RSRP"><div class="progress-fill" id="bar-rsrp"></div></div>
						<div class="progress-value" id="val-rsrp">-</div>
					</div>
					<div class="divider"></div>
					<div class="progress-block">
						<div class="progress-label">SINR</div>
						<div class="progress-bar" aria-label="SINR"><div class="progress-fill" id="bar-sinr"></div></div>
						<div class="progress-value" id="val-sinr">-</div>
					</div>
				</section>
				<section class="kpis">
					<div class="kpi wide">
						<div class="kpi-label">实时下上行</div>
						<div class="duplex"><span class="rx" id="kpi-rx">-</span><span class="sep">/</span><span class="tx" id="kpi-tx">-</span></div>
					</div>
					<div class="kpi"><div class="kpi-label">QCI</div><div class="kpi-value" id="kpi-qci">-</div></div>
					<div class="kpi"><div class="kpi-label">当日流量</div><div class="kpi-value" id="kpi-daily">-</div></div>
					<div class="kpi"><div class="kpi-label">月流量</div><div class="kpi-value small" id="kpi-month">-</div></div>
					<div class="kpi"><div class="kpi-label">连接设备</div><div class="kpi-value" id="kpi-sta">-</div></div>
				</section>
			</section>

			<section class="card kpis" id="card-network">
				<div class="card-header">
					<div class="card-title">网络信息</div>
					<button class="btn-mask" id="btn-mask" type="button" aria-pressed="true">脱敏：开</button>
				</div>
				<div class="kpi"><div class="kpi-label">网络类型</div><div class="kpi-value" id="kpi-network-type">-</div></div>
				<div class="kpi"><div class="kpi-label">运营商</div><div class="kpi-value" id="kpi-provider">-</div></div>
				<div class="kpi"><div class="kpi-label">IPv6 地址</div><div class="kpi-value small" id="kpi-ipv6">-</div></div>
				<div class="kpi"><div class="kpi-label">LAN 网关</div><div class="kpi-value" id="kpi-lan">-</div></div>
				<div class="kpi"><div class="kpi-label">5G SINR</div><div class="kpi-value" id="kpi-sinr">-</div></div>
				<div class="kpi"><div class="kpi-label">5G RSRP</div><div class="kpi-value" id="kpi-rsrp">-</div></div>
				<div class="kpi"><div class="kpi-label">ICCID</div><div class="kpi-value small" id="kpi-iccid">-</div></div>
				<div class="kpi"><div class="kpi-label">IMEI</div><div class="kpi-value small" id="kpi-imei">-</div></div>
				<div class="kpi"><div class="kpi-label">NR 基站</div><div class="kpi-value small" id="kpi-nr">-</div></div>
				<div class="kpi"><div class="kpi-label">LTE 基站</div><div class="kpi-value small" id="kpi-lte">-</div></div>
				<div class="kpi"><div class="kpi-label">UFI-TOOLS版本</div><div class="kpi-value small" id="kpi-version">-</div></div>
				<div class="kpi"><div class="kpi-label">设备型号</div><div class="kpi-value" id="kpi-model">-</div></div>
			</section>

			<section class="card progress-card" id="card-temp-mem">
				<div class="card-header"><div class="card-title">温度 / 内存</div><div class="card-extra" id="temp-mem-label">-</div></div>
				<div class="progress-grid">
					<div class="progress-block"><div class="progress-label">CPU 温度</div><div class="progress-bar" aria-label="CPU 温度"><div class="progress-fill" id="bar-temp-cpu"></div></div><div class="progress-value" id="val-temp-cpu">-</div></div>
					<div class="progress-block"><div class="progress-label">PA 温度</div><div class="progress-bar" aria-label="SoC 温度"><div class="progress-fill" id="bar-temp-soc"></div></div><div class="progress-value" id="val-temp-soc">-</div></div>
					<div class="progress-block"><div class="progress-label">内存使用</div><div class="progress-bar" aria-label="内存使用率"><div class="progress-fill" id="bar-mem"></div></div><div class="progress-value" id="val-mem">-</div></div>
					<div class="progress-block"><div class="progress-label">SWAP 使用</div><div class="progress-bar" aria-label="SWAP 使用率"><div class="progress-fill" id="bar-swap"></div></div><div class="progress-value" id="val-swap">-</div></div>
					<div class="progress-block" id="row-storage-int"><div class="progress-label">内部存储</div><div class="progress-bar" aria-label="内部存储"><div class="progress-fill" id="bar-storage-int"></div></div><div class="progress-value" id="val-storage-int">-</div></div>
					<div class="progress-block" id="row-storage-ext"><div class="progress-label">SD 卡</div><div class="progress-bar" aria-label="SD 卡"><div class="progress-fill" id="bar-storage-ext"></div></div><div class="progress-value" id="val-storage-ext">-</div></div>
				</div>
			</section>

			<section class="card chart-card"><div class="card-header"><div class="card-title">核心总占用</div><div class="card-extra" id="cpu-total-label">-</div></div><canvas id="chartCpuTotal"></canvas></section>
			<section class="card chart-card"><div class="card-header"><div class="card-title">核心使用率</div><div class="card-extra" style="font-size:.6rem" id="cpu-cores-label">-</div></div><canvas id="chartCpuCores"></canvas></section>
			<section class="card chart-card"><div class="card-header"><div class="card-title">核心频率 (MHz)</div><div class="card-extra" id="cpu-freq-label">-</div></div><canvas id="chartCpuFreq"></canvas></section>
		</main>
	</div>

	<kano_script>
(() => {
	'use strict';
	console.log('[dashboard] injected bundle loaded');

	// Bridge UFI_DATA
	window.UFI_DATA = ${JSON.stringify(parentData || null)} || (window.parent && window.parent.UFI_DATA && ({...window.parent.UFI_DATA,QORS_MESSAGE})) || '{}';
	// 等待 Chart.js + 监听父窗口数据 postMessage
	function onChartReady(cb) {
		if (window.Chart) return cb();
		const timer = setInterval(() => { if (window.Chart) { clearInterval(timer); cb(); } }, 50);
	}

 	window.addEventListener('message', (ev) => {
 		if (ev && ev.data && ev.data.type === 'QORS_MESSAGE') {
 			try { 
                window.UFI_DATA.QORS_MESSAGE = ev.data.payload
            } catch (e) {}
 		}
 	});

	onChartReady(() => {
		Chart.defaults.responsive = true;
		Chart.defaults.maintainAspectRatio = false;
		Chart.defaults.devicePixelRatio = () => window.devicePixelRatio || 1;

		const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
		const toPercentText = (v) => \`\${v.toFixed(1)}%\`;
		const toMbps = (bytesPerSec) => \`\${(bytesPerSec * 8 / 1_000_000).toFixed(2)} Mbps\`;
		const toGB = (bytes) => (bytes / (1024 ** 3)).toFixed(2) + ' GB';
		const toHumanBytes = (bytes) => { if (!bytes) return '0 B'; const u=['B','KB','MB','GB','TB']; let v=bytes,i=0; while(v>=1024&&i<u.length-1){v/=1024;i++;} return \`\${v.toFixed(v<10?2:1)} \${u[i]}\`; };
		const celsiusFromMilli = (m) => m / 1000;
		const el = (id) => document.getElementById(id);

        const backBtn = el('back_to_ufitools')

        if(backBtn) {
            backBtn.onclick = ()=>{
                try {
                    window.parent.postMessage({ type: 'BACK_TO_UFITOOLS', value: 1 },'*' );
                    console.log("Send Message:BACK_TO_UFITOOLS to parent window")
                } catch (e) { console.warn('postMessage bridge failed', e); }
            }
        }

		// 数据桥接：每次刷新前优先从父/顶层同步 UFI_DATA，避免初次为空或后续更新丢失
		function refreshDataFromParent() {
			let d = null;
			try { if (window.parent && window.parent.UFI_DATA) d = window.parent.UFI_DATA; } catch (e) {}
			if (!d) { try { if (window.top && window.top.UFI_DATA) d = window.top.UFI_DATA; } catch (e) {} }
			if (!d && typeof window.UFI_DATA === 'object') d = window.UFI_DATA;
			if (d) window.UFI_DATA = d;
		}

		// 图表
		const cpuTotalChart = new Chart(document.getElementById('chartCpuTotal'), {
			type: 'line',
			data: { labels: [], datasets: [{ label: 'CPU 使用率', data: [], borderColor: 'rgba(74,168,255,1)', backgroundColor: 'rgba(74,168,255,0.15)', borderWidth: 2, tension: 0.25, fill: true, pointRadius: 0 }]},
			options: { animation: { duration: 400, easing: 'easeOutQuart' }, responsive: true, maintainAspectRatio: false,
				layout: { padding: { top: 8, right: 12, bottom: 16, left: 12 } },
				scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#a8b0c3', autoSkip: true, maxTicksLimit: 5,padding: 6, callback: v => v + '%' } },
				         x: { grid: { display: false }, ticks: { color: '#a8b0c3', autoSkip: true, maxTicksLimit: 6 } } },
				plugins: { legend: { display: false } }
			}
		});
		const cpuCoresChart = new Chart(document.getElementById('chartCpuCores'), {
			type: 'bar',
			data: { labels: [], datasets: [{ label: '核心使用率', data: [], backgroundColor: 'rgba(42,120,255,0.8)' }]},
			options: { animation: { duration: 400, easing: 'easeOutQuart' }, responsive: true, maintainAspectRatio: false,
				layout: { padding: { top: 8, right: 12, bottom: 16, left: 12 } },
				scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#a8b0c3', autoSkip: true, maxTicksLimit: 5,padding: 6, callback: v => v + '%' } },
				         x: { grid: { display: false }, ticks: { color: '#a8b0c3', autoSkip: true, maxTicksLimit: 8 } } },
				plugins: { legend: { display: false } }
			}
		});
		const cpuFreqChart = new Chart(document.getElementById('chartCpuFreq'), {
			type: 'bar',
			data: { labels: [], datasets: [{ label: '当前频率', data: [], backgroundColor: 'rgba(74,168,255,0.85)' }, { label: '最大频率', data: [], backgroundColor: 'rgba(168, 181, 255, 0.55)' }]},
			options: { animation: { duration: 400, easing: 'easeOutQuart' }, responsive: true, maintainAspectRatio: false,
				layout: { padding: { top: 8, right: 12, bottom: 16, left: 12 } },
				scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#a8b0c3', autoSkip: true, maxTicksLimit: 6 } },
				         x: { stacked: false, grid: { display: false }, ticks: { color: '#a8b0c3', autoSkip: true, maxTicksLimit: 8 } } },
				plugins: { legend: { labels: { color: '#a8b0c3' } } }
			}
		});

		function fixCanvasResolution(chart) {
			const dpr = window.devicePixelRatio || 1;
			const canvas = chart.canvas, parent = canvas.parentNode, rect = parent.getBoundingClientRect();
			const w = Math.floor(rect.width), h = Math.floor(rect.height);
			canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
			canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
			chart.resize();
		}
		function updateFonts(chart) {
			const w = chart.canvas.clientWidth || 300;
			const base = Math.max(10, Math.min(14, Math.round(w / 40)));
			const small = Math.max(9, base - 1);
			chart.options.scales.x.ticks.font = { size: small };
			chart.options.scales.y.ticks.font = { size: small };
			if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.font = { size: base };
		}
		const ro = new ResizeObserver(() => [cpuTotalChart, cpuCoresChart, cpuFreqChart].forEach(c => { fixCanvasResolution(c); updateFonts(c); c.update('none'); }));
		ro.observe(document.querySelector('.grid'));

		// 脱敏
		const maskState = { on: true };
		const maskICCID = v => v ? v.replace(/(\\d{4})\\d+(\\d{4})/, '$1****$2') : '-';
		const maskIMEI  = v => v ? v.replace(/(\\d{3})\\d+(\\d{2})/, '$1****$2') : '-';
		const maskIPv6  = v => v ? v.replace(/(^.{4}).*(.{4}$)/, '$1:****:$2') : '-';
		const btnMask = document.getElementById('btn-mask');
		if (btnMask) {
			btnMask.setAttribute('aria-pressed', 'true');
			btnMask.addEventListener('click', () => {
				maskState.on = !maskState.on;
				btnMask.setAttribute('aria-pressed', maskState.on ? 'true' : 'false');
				btnMask.textContent = maskState.on ? '脱敏：开' : '脱敏：关';
				try { updateKpis(window.UFI_DATA || {}); } catch(e){}
			});
		}

		function el_dashboard(id){ return document.getElementById(id); }
		function updateKpis(data) {
			el_dashboard('kpi-network-type').textContent = data.network_type == "20" ? "5G" : data.network_type == "12" ? "4G" : (data.network_type || "3G");
			el_dashboard('kpi-provider').textContent = data.network_provider ?? '-';
			el_dashboard('kpi-ipv6').textContent = maskState.on ? maskIPv6(data.ipv6_wan_ipaddr ?? '') : (data.ipv6_wan_ipaddr ?? '-');
			el_dashboard('kpi-lan').textContent = data.lan_ipaddr ?? '-';
			el_dashboard('kpi-sinr').textContent = (data.Nr_snr || data.Lte_snr || '-') + '';
			el_dashboard('kpi-rsrp').textContent = (data.nr_rsrp || data.Z5g_rsrp || data.lte_rsrp || data.Lte_signal_strength || '-') + '';
            el_dashboard('kpi-qci').innerHTML = window.UFI_DATA.QORS_MESSAGE.replace('⬇️',"<br/>⬇️") || "-";
			el_dashboard('kpi-rx').textContent = toMbps(data.realtime_rx_thrpt ?? 0);
			el_dashboard('kpi-tx').textContent = toMbps(data.realtime_tx_thrpt ?? 0);
			el_dashboard('kpi-daily').textContent = toGB(data.daily_data ?? 0);
			el_dashboard('kpi-sta').textContent = data.wifi_access_sta_num ?? '-';
			el_dashboard('kpi-model').textContent = data.model ?? '-';
			el_dashboard('kpi-version').textContent = \`\${data.app_ver ?? '-'} (\${data.app_ver_code ?? '-'})\`;

			const nrInfo = [
				data.Nr_bands ? \`频段:N\${data.Nr_bands}<br>\` : null,
				data.Nr_fcn ? \`频点:\${data.Nr_fcn}<br>\` : null,
				data.Nr_pci ? \`PCI:\${data.Nr_pci}\` : null,
			].filter(Boolean).join('  ');
			const lteInfo = [
				data.Lte_bands ? \`频段:B\${data.Lte_bands}<br>\` : null,
				data.Lte_fcn ? \`  频点:\${data.Lte_fcn}<br>\` : null,
				data.Lte_pci ? \`  PCI:\${data.Lte_pci}\` : null,
			].filter(Boolean).join('');
			const iccid = data.iccid ?? '';
			const imei  = data.imei ?? '';

			const elNR  = el_dashboard('kpi-nr');  if (elNR)  elNR.innerHTML  = nrInfo || '-';
			const elLTE = el_dashboard('kpi-lte'); if (elLTE) elLTE.innerHTML = lteInfo || '-';
			const elICCID = el_dashboard('kpi-iccid'); if (elICCID) elICCID.textContent = maskState.on ? maskICCID(iccid) : (iccid || '-');
			const elIMEI  = el_dashboard('kpi-imei');  if (elIMEI)  elIMEI.textContent  = maskState.on ? maskIMEI(imei)   : (imei  || '-');

			// 顶部
			const battPercent = Number(data.battery || data.battery_vol_percent || 0);
			const battFill = el_dashboard('battery-fill'), battText = el_dashboard('battery-text');
			const battBody = document.querySelector('.battery-body');
			if(battBody) {
				const icon = el_dashboard('icon-battery')
				const signal = el_dashboard('icon-signal')
				
				if(data.battery_charging == '')  {
					icon && (icon.style.display = 'none');
					signal && (signal.style.marginRight = '10px');
				} else {
					icon && (icon.style.display = '');
					signal && (signal.style.marginRight = '');
				}
				data.battery_charging == '1' ? battBody.classList.add('charging') : battBody.classList.remove('charging');
			}
			if (battFill) {
				battFill.style.width = \`\${Math.max(0, Math.min(100, battPercent))}%\`
			};
			if (battText) battText.textContent = battPercent ? \`\${battPercent}%\` : '-';
			const bars = document.querySelectorAll('#icon-signal .bar');
			const rssiBars = Number(data.rssi || data.nr_rssi || data.network_signalbar || data.network_rssi || 0);
			bars.forEach((b, i) => { if (i < rssiBars) b.classList.add('on'); else b.classList.remove('on'); });
		}

		function barFill(id, p, mode){ const f = el_dashboard(id); if (!f) return; f.style.width = \`\${clamp(p,0,100)}%\`; if(mode==='temp'){ let c=p; let g='linear-gradient(90deg,#4aa8ff,#2a78ff)'; if(c>=80) g='linear-gradient(90deg,#ef4444,#f97316)'; else if(c>=65) g='linear-gradient(90deg,#f59e0b,#fbbf24)'; f.style.background=g; } }
		function updateTemps(data){
			const cpuC = celsiusFromMilli(data.cpu_temp || 0);
			let paMilli = 0; if (Array.isArray(data.cpu_temp_list)) { const pa = data.cpu_temp_list.find(z => z.type && z.type.indexOf('pa-thmzone') !== -1); paMilli = pa ? Number(pa.temp) : 0; }
			const socC = celsiusFromMilli(paMilli);
			barFill('bar-temp-cpu', clamp(cpuC,0,100), 'temp'); barFill('bar-temp-soc', clamp(socC,0,100), 'temp');
			el_dashboard('val-temp-cpu').textContent = \`\${cpuC.toFixed(1)} °C\`; el_dashboard('val-temp-soc').textContent = paMilli ? \`\${socC.toFixed(1)} °C\` : '-';
			const usedB = Number((data.memInfo||{}).mem_used_kb||0)*1024; const totalB = Number((data.memInfo||{}).mem_total_kb||0)*1024;
			el_dashboard('temp-mem-label').textContent = \`最高 \${Math.max(cpuC,socC).toFixed(1)} °C · 内存 \${toGB(usedB)} / \${toGB(totalB)}\`;
		}
		function updateMemory(data){
			const m = data.memInfo || {};
			const memPct = Number(m.mem_usage_percent || 0), swapPct = Number(m.swap_usage_percent || 0);
			barFill('bar-mem', memPct); barFill('bar-swap', swapPct);
			el_dashboard('val-mem').textContent = toPercentText(memPct); el_dashboard('val-swap').textContent = toPercentText(swapPct);
		}
		function updateStorage(data){
			const intUsed = Number(data.internal_used_storage||0), intTotal = Number(data.internal_total_storage||0);
			const intPct  = intTotal ? clamp((intUsed/intTotal)*100,0,100) : 0;
			const intRow  = document.getElementById('row-storage-int'); if (intRow) intRow.style.display = intTotal ? '' : 'none';
			barFill('bar-storage-int', intPct); const iv = el_dashboard('val-storage-int'); if (iv) iv.textContent = intTotal ? \`\${toGB(intUsed)} / \${toGB(intTotal)}\` : '-';

			const extUsed = Number(data.external_used_storage||0), extTotal = Number(data.external_total_storage||0);
			const extPct  = extTotal ? clamp((extUsed/extTotal)*100,0,100) : 0;
			const extRow  = document.getElementById('row-storage-ext'); if (extRow) extRow.style.display = extTotal ? '' : 'none';
			barFill('bar-storage-ext', extPct); const ev = el_dashboard('val-storage-ext'); if (ev) ev.textContent = extTotal ? \`\${toGB(extUsed)} / \${toGB(extTotal)}\` : '-';
		}
		function updateCpuTotal(data){
			const now = new Date(), label = now.toLocaleTimeString();
			const usage = Number(data.cpu_usage ?? (data.cpuUsageInfo?.cpu ?? 0));
			el_dashboard('cpu-total-label').textContent = toPercentText(usage);
			const L = cpuTotalChart.data.labels, S = cpuTotalChart.data.datasets[0].data;
			L.push(label); S.push(clamp(usage,0,100)); if(L.length>60){L.shift(); S.shift();}
			cpuTotalChart.update();
		}
		function updateCpuCores(data){
			const info = data.cpuUsageInfo || {}; const labels = [], values = [];
			for(let i=0;i<8;i++){ const k = \`cpu\${i}\`; if(info[k]!==undefined){ labels.push(k.toUpperCase()); values.push(clamp(Number(info[k]),0,100)); } }
			cpuCoresChart.data.labels = labels; cpuCoresChart.data.datasets[0].data = values;
			el_dashboard('cpu-cores-label').textContent = values.map(v=>v.toFixed(0)).join('% ')+(values.length?'%':'');
			cpuCoresChart.update();
		}
		function updateCpuFreq(data){
			const f = data.cpuFreqInfo || {}; const labels=[], cur=[], max=[];
			Object.keys(f).sort((a,b)=>Number(a.replace('cpu',''))-Number(b.replace('cpu',''))).forEach(k=>{ labels.push(k.toUpperCase()); cur.push(Number(f[k].cur||0)); max.push(Number(f[k].max||0)); });
			cpuFreqChart.data.labels = labels; cpuFreqChart.data.datasets[0].data = cur; cpuFreqChart.data.datasets[1].data = max;
			el_dashboard('cpu-freq-label').textContent = cur.length ? \`Max: \${Math.max(...max)} MHz\` : '-';
			cpuFreqChart.update();
		}
		function updateSignalBars(data){
			const sinr = Number(data.Nr_snr || data.Lte_snr || 0); const sinrPct = clamp(((sinr - (-10)) / (13 - (-10))) * 100, 0, 100);
			const sf = el_dashboard('bar-sinr'); if (sf){ sf.classList.remove('level-strong','level-medium','level-weak'); sf.style.width = sinrPct + '%'; if (sinr >= 13) sf.classList.add('level-strong'); else if (sinr > 0) sf.classList.add('level-medium'); else sf.classList.add('level-weak'); }
			el_dashboard('val-sinr').textContent = isFinite(sinr) ? \`\${sinr.toFixed(0)} dB\` : '-';

			const rsrp = Number(data.nr_rsrp ?? data.Z5g_rsrp ?? data.lte_rsrp ?? 0);
			const rsrpPct = clamp(((rsrp - (-125)) / ((-81) - (-125))) * 100, 0, 100);
			const rf = el_dashboard('bar-rsrp'); if (rf){ rf.classList.remove('level-strong','level-medium','level-weak'); rf.style.width = rsrpPct + '%'; if (rsrp >= -90) rf.classList.add('level-strong'); else if (rsrp >= -100) rf.classList.add('level-medium'); else rf.classList.add('level-weak'); }
			el_dashboard('val-rsrp').textContent = isFinite(rsrp) ? \`\${rsrp.toFixed(0)} dBm\` : '-';
			el_dashboard('signal-label').textContent = 'SINR/RSRP';
		}

		function tick(){
			refreshDataFromParent();
			const d = window.UFI_DATA || {};
			updateKpis(d); updateCpuTotal(d); updateCpuCores(d); updateCpuFreq(d);
			updateTemps(d); updateMemory(d); updateStorage(d); updateThroughput(d); updateSignalBars(d);
		}
		function updateThroughput(d){
			const usedMonth = Number((d.monthly_tx_bytes||0)) + Number((d.monthly_rx_bytes||0));
			let text = toHumanBytes(usedMonth);
			if (Number(d.data_volume_limit_switch) === 1 && typeof d.data_volume_limit_size === 'string') {
				const [numStr, unitStr] = d.data_volume_limit_size.split('_'); const num = Number(numStr); const unitMB = Number(unitStr);
				const totalBytes = num * unitMB * 1024 * 1024; text = \`\${toHumanBytes(usedMonth)} / \${toHumanBytes(totalBytes)}\`;
			}
			const elMonth = el_dashboard('kpi-month'); if (elMonth) elMonth.textContent = text;
		}

		try { tick(); } catch(e){ console.error(e); }
		setInterval(() => { try { 
            tick();
        } catch(e){ console.error(e); } }, 1000);
	});
})();
	</kano_script>
</kano_body>
</kano_html>`;

	// 写入 iframe
	iframe.srcdoc = html
		.replaceAll('kano_html', 'html')
		.replaceAll('kano_head', 'head')
		.replaceAll('kano_style', 'style')
		.replaceAll('kano_body', 'body')
		.replaceAll('kano_script', 'script')
		.replaceAll('kano_meta', 'meta')
		.replaceAll('<kano_!DOCTYPE html>', '<!DOCTYPE html>');

	// 向 iframe 主动同步父页面数据（跨域安全：仅发送，不读取）
	iframe.addEventListener('load', () => {
		try {
			setInterval(() => {
				iframe.contentWindow.postMessage({ type: 'QORS_MESSAGE', payload: QORS_MESSAGE }, '*')
			}, 1000);
		} catch (e) { console.warn('postMessage bridge failed', e); }
	});

})();
//</script>