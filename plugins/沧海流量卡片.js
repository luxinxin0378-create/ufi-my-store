<script>
(()=>{
  let cardNumber = '' // 沧海卡号/设备号
  const cacheDuration = 60; // 缓存设置 默认60秒
  const cacheKey = `ch_traffic_cache_${cardNumber}`;
  const cacheTimeKey = `ch_cache_time_${cardNumber}`;

  // 沧海查询接口（免登录，POST 表单，无需签名，浏览器端会被 CORS 拦截，需走 KANO 代理）
  const API_HOST = 'https://appapi.menglongiot.com';
  // 可选中转地址（如 Cloudflare Worker，GET 返回 JSON）。KANO 代理不支持 POST/https 时启用：
  // 填入形如 'https://xxx.workers.dev/card' 的地址即可，留空则走 KANO 代理
  const RELAY_URL = '';

  const now = Math.floor(Date.now() / 1000);
  const lastFetch = parseInt(localStorage.getItem(cacheTimeKey) || '0');
  const cachedData = localStorage.getItem(cacheKey);

  const fetchData = async () => {
    try {
      let url, opts;
      if (RELAY_URL) {
        url = `${RELAY_URL}?cardno=${cardNumber}`;
        opts = {};
      } else {
        url = `${KANO_baseURL}/proxy/--https://appapi.menglongiot.com/Transfer/LotmlCardInfo`;
        opts = {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `cardno=${cardNumber}`
        };
      }
      const res = await fetch(url, opts);
      return await res.json();
    } catch (err) {
      console.error('网络请求失败:', err);
      return null;
    }
  };

  const showError = (msg) => {
    const netCard = document.querySelector('.net-card');
    const el = document.createElement('div')
    el.innerHTML = msg
    el.style.color = 'red'
    el.style.padding = '8px'
    netCard?.parentElement?.appendChild(el)
  }

  const parseFlow = (str) => { // "1000.00G" / "15.84G" / "512M" -> 统一换算为 GB
    const m = String(str ?? '').trim().match(/^([\d.]+)\s*([GM])?$/i);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    const u = (m[2] || '').toUpperCase();
    return u === 'M' ? n / 1024 : n;
  };

  const showData = (data) => {
    if (data && data.status !== '0' && data.err) {
      showError(data.err === '成功' ? '查询失败' : data.err);
      return;
    }
    const cardData = data?.data;
    if (!cardData) {
      showError('卡号不存在或查询失败');
      return;
    }
    const usedData = parseFlow(cardData.mlUsedSize);
    const totalData = parseFlow(cardData.mlAllSize);
    const statusMsg = cardData.mlStatus || '未知';
    const operator = cardData.mlISP || '未知';
    const balance = cardData.mlBalance;
    const netCard = document.querySelector('.net-card');
    const el = document.createElement('div')
    const el_title = document.createElement('div')
    el.style.marginBottom = '0'
    el.style.gridColumn = '1/-1'
    el.style.marginLeft = '0px'
    el.style.marginRight = '0px'
    el_title.innerHTML = statusMsg
    el_title.style.position = 'absolute'
    el_title.style.right = '6px'
    el_title.style.top = '6px'
    el.style.width = '200px'
    el.classList.add('wlk')
    el.classList.add('statusCard')
    el.classList.add('net-card')
    el.style.position = 'relative'
    el.style.padding = "6px 8px 8px 8px"
    el.style.fontSize = '12px'
    el.style.boxSizing = 'border-box'
    el.style.height = '60px'
    const progress = Math.min(usedData / totalData * 100, 100).toFixed(2);
    const formatFlow = (flow) => flow % 1 === 0 ? flow.toFixed(0) : flow.toFixed(2);
    const usedFlowText = formatFlow(usedData);
    const totalFlowText = formatFlow(totalData);
    const getProgressColor = (percent) => {
      if(percent <= 80) {
        const ratio = percent / 80;
        const r = Math.floor(255 * ratio);
        const g = 255;
        const b = 0;
        return `rgb(${r},${g},${b})`;
      } else {
        const ratio = (percent - 80) / 20;
        const r = 255;
        const g = Math.floor(255 * (1 - ratio));
        const b = 0;
        return `rgb(${r},${g},${b})`;
      }
    };
    const animateProgress = (element, targetProgress) => {
      let startTime = null;
      const duration = 1000;
      const progressBar = element.querySelector('.progress-bar');
      const progressText = element.querySelector('.progress-text');

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentProgress = progress * targetProgress;

        progressBar.style.width = `${currentProgress}%`;
        progressBar.style.background = getProgressColor(currentProgress);
        progressText.textContent = `${currentProgress.toFixed(2)}%`;

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    };
    el.innerHTML = `
    运营商: ${operator}
    <div style="width:100%; background:transparent; border:1px solid #eee; border-radius:5px; margin:5px 0; height:20px; position:relative;">
        <div class="progress-bar" style="width:0%; background:${getProgressColor(0)}; height:100%; border-radius:5px;"></div>
        <div style="position:absolute; top:0; left:5px; line-height:20px;">${usedFlowText}GB</div>
        <div class="progress-text" style="position:absolute; top:0; width:100%; text-align:center; line-height:20px;">0%</div>
        <div style="position:absolute; top:0; right:5px; line-height:20px;">${totalFlowText}GB</div>
    </div>
    余额：${balance ?? 0} 元`;
    el.appendChild(el_title);
    netCard?.parentElement?.appendChild(el);
    setTimeout(() => animateProgress(el, progress), 100);
  }
  // 缓存检查逻辑：优先使用有效缓存
  if (cachedData && now - lastFetch < cacheDuration) {
    showData(JSON.parse(cachedData));
  } else {
    fetchData().then(data => {
      if (data && data.status === '0') {
        // 成功获取数据后更新缓存
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheTimeKey, now.toString());
      }
      showData(data);
    });
  }
})()
</script>
<style>
.statusCard{box-sizing:border-box}
@media (max-width: 650px) {
    .wlk {
        margin-left:3px !important;
        margin-right:3px !important;
        height: 80px !important;
    }
}

.wlk.statusCard {
    height: 80px !important;
}

.cpu-card {
    height: 60px;
}

.chart.statusCard {
    max-width: 200px !important;
    height: 80px !important;
}
</style>
