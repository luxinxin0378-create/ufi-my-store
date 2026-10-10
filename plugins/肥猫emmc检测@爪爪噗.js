//<script>
(async () => {
  const TITLE = 'emmc检测';
  const MODAL_NAME = 'emmc_detect_modal';
  const STYLE_ID = 'emmc_detect_style';
  const DANGER_MANFID_KEY = '0x2c';

  // eMMC 厂商 ID 对照表（manfid 取自 CID 第 1 字节，按 JEDEC JEP106 注册号与常见实测 CID 整理）
  const MANUFACTURERS = {
    '0x00': { name: 'SanDisk（闪迪）' },
    '0x02': { name: 'Toshiba（东芝）' },
    '0x03': { name: 'SanDisk（闪迪）' },
    '0x05': { name: 'SanDisk（闪迪）' },
    '0x11': { name: 'Toshiba / KIOXIA（东芝 / 铠侠）' },
    '0x13': { name: 'Micron（美光）' },
    '0x15': { name: 'Samsung（三星）' },
    '0x21': { name: 'SK hynix（SK 海力士）' },
    '0x2c': { name: 'Kingston（金士顿）', danger: true },
    '0x45': { name: 'SanDisk（闪迪）' },
    '0x90': { name: 'SK hynix（SK 海力士）' },
    '0x98': { name: 'Toshiba / KIOXIA（东芝 / 铠侠）' },
  };

  // 寿命估算区间（eMMC 5.0+ EXT_CSD LIFE_TIME_EST_TYP_A/B：0x01=0%~10% 已使用，以此类推）
  const LIFE_BANDS = {
    1: '0%~10%', 2: '10%~20%', 3: '20%~30%', 4: '30%~40%', 5: '40%~50%',
    6: '50%~60%', 7: '60%~70%', 8: '70%~80%', 9: '80%~90%', 10: '90%~100%',
    11: '已超过最大估算寿命',
  };

  // EOL（End Of Life）状态：预留块剩余量评估
  const PRE_EOL = {
    1: { text: '正常 Normal', level: 'good' },
    2: { text: '警告 Warning（预留块已消耗 80%）', level: 'warn' },
    3: { text: '紧急 Urgent（接近寿命极限）', level: 'bad' },
  };

  const state = {
    busy: false,
    devices: [],
    raw: '',
    refreshedAt: '',
    error: '',
  };

  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const copyTextValue = async (text) => {
    const value = String(text || '').trim();
    if (!value) {
      createToast('没有可复制的内容', 'red');
      return;
    }
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = value;
        textArea.style.position = 'absolute';
        textArea.style.opacity = '0';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      createToast('复制成功', 'green');
    } catch (e) {
      createToast('复制失败', 'red');
    }
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .emd-wrap {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #${MODAL_NAME} .emd-panel,
      #${MODAL_NAME} .emd-card {
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.035);
        padding: 10px 12px;
      }
      #${MODAL_NAME} .emd-panel-head,
      #${MODAL_NAME} .emd-card-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
      }
      #${MODAL_NAME} .emd-panel-title,
      #${MODAL_NAME} .emd-card-title {
        font-size: .76rem;
        font-weight: 800;
      }
      #${MODAL_NAME} .emd-tip {
        font-size: .64rem;
        line-height: 1.5;
        opacity: .78;
      }
      #${MODAL_NAME} .emd-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      #${MODAL_NAME} .emd-actions button {
        padding: 7px 10px;
        font-size: .68rem;
      }
      #${MODAL_NAME} .emd-meta {
        margin-top: 6px;
        font-size: .62rem;
        opacity: .7;
      }
      #${MODAL_NAME} .emd-list {
        display: grid;
        gap: 8px;
        margin-top: 8px;
      }
      #${MODAL_NAME} .emd-card-danger {
        border-color: rgba(255,77,79,.45);
        background: rgba(255,77,79,.08);
      }
      #${MODAL_NAME} .emd-banner {
        margin-top: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,77,79,.45);
        background: rgba(255,77,79,.12);
        color: #ff7a7a;
        font-size: .66rem;
        line-height: 1.5;
        font-weight: 700;
      }
      #${MODAL_NAME} .emd-rows {
        display: grid;
        gap: 2px;
        margin-top: 6px;
      }
      #${MODAL_NAME} .emd-row {
        display: flex;
        gap: 10px;
        padding: 6px 0;
        border-bottom: 1px dashed rgba(255,255,255,.06);
      }
      #${MODAL_NAME} .emd-row:last-child {
        border-bottom: none;
      }
      #${MODAL_NAME} .emd-label {
        flex: 0 0 128px;
        font-size: .66rem;
        opacity: .75;
        line-height: 1.6;
      }
      #${MODAL_NAME} .emd-value {
        flex: 1 1 auto;
        min-width: 0;
      }
      #${MODAL_NAME} .emd-value-main {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        font-size: .7rem;
        line-height: 1.5;
        word-break: break-all;
      }
      #${MODAL_NAME} .emd-value-sub {
        margin-top: 2px;
        font-size: .6rem;
        opacity: .68;
        word-break: break-all;
      }
      #${MODAL_NAME} .emd-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      #${MODAL_NAME} .emd-chip {
        display: inline-flex;
        align-items: center;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: .6rem;
        font-weight: 700;
        background: rgba(255,255,255,.08);
        word-break: break-all;
      }
      #${MODAL_NAME} .emd-chip[data-kind="good"] {
        color: #9dffbf;
        background: rgba(60,201,120,.16);
      }
      #${MODAL_NAME} .emd-chip[data-kind="warn"] {
        color: #ffd08a;
        background: rgba(255,173,51,.16);
      }
      #${MODAL_NAME} .emd-chip[data-kind="bad"] {
        color: #ff8585;
        background: rgba(255,77,79,.18);
      }
      #${MODAL_NAME} .emd-danger {
        color: #ff5c5c;
        font-weight: 800;
      }
      #${MODAL_NAME} .emd-danger-badge {
        color: #fff;
        background: rgba(255,45,45,.55);
        border: 1px solid rgba(255,120,120,.6);
      }
      #${MODAL_NAME} .emd-dim {
        opacity: .65;
        font-size: .66rem;
      }
      #${MODAL_NAME} .emd-empty {
        font-size: .66rem;
        line-height: 1.6;
        opacity: .8;
        padding: 10px 0;
      }
      #${MODAL_NAME} code,
      #${MODAL_NAME} pre {
        word-break: break-all;
        white-space: pre-wrap;
        font-size: .64rem;
      }
      @media (max-width: 720px) {
        #${MODAL_NAME} {
          width: 96% !important;
        }
        #${MODAL_NAME} .content {
          margin: 6px 0 !important;
        }
        #${MODAL_NAME} .emd-panel-head,
        #${MODAL_NAME} .emd-card-head {
          flex-direction: column;
        }
        #${MODAL_NAME} .emd-row {
          flex-direction: column;
          gap: 2px;
        }
        #${MODAL_NAME} .emd-label {
          flex: none;
        }
        #${MODAL_NAME} .emd-actions button {
          flex: 1 1 calc(50% - 3px);
          min-width: 0;
        }
      }
    `;
    document.head.appendChild(style);
  };

  // 遍历 /sys/bus/mmc/devices/mmc*:0001，输出各字段（root 下读取）
  const SHELL_CMD = "timeout 8s sh -c 'for EMMC in /sys/bus/mmc/devices/mmc*:0001; do [ -e \"$EMMC\" ] || continue; echo \"================================\"; echo \"PATH=$EMMC\"; for f in type name cid csd manfid oemid serial prv date fwrev hwrev life_time pre_eol_info; do if [ -r \"$EMMC/$f\" ]; then echo \"$f=$(cat \"$EMMC/$f\")\"; fi; done; done'";

  const parseOutput = (raw = '') => {
    const devices = [];
    let current = null;
    String(raw || '').split(/\r?\n/).forEach((line) => {
      const clean = line.trim();
      if (!clean || /^=+$/.test(clean)) return;
      if (clean.startsWith('PATH=')) {
        const path = clean.slice(5).trim();
        current = { path, name: path.split('/').pop() || path, fields: {} };
        devices.push(current);
        return;
      }
      const idx = clean.indexOf('=');
      if (idx > 0 && current) {
        const key = clean.slice(0, idx).trim();
        if (key) current.fields[key] = clean.slice(idx + 1).trim();
      }
    });
    return devices.filter((dev) => dev.path);
  };

  const normalizeManfid = (raw = '') => {
    const value = parseInt(String(raw || ''), 16);
    if (isNaN(value) || value <= 0) return '';
    return `0x${value.toString(16)}`;   // 0x00002c -> 0x2c
  };

  const decodeCid = (cid = '') => {
    const hex = String(cid).toLowerCase().replace(/[^0-9a-f]/g, '');
    if (hex.length < 32) return '';
    const pnmHex = hex.slice(6, 18);
    let pnmText = '';
    for (let i = 0; i < pnmHex.length; i += 2) {
      pnmText += String.fromCharCode(parseInt(pnmHex.slice(i, i + 2), 16));
    }
    if (!/^[\x20-\x7e]+$/.test(pnmText)) pnmText = '';
    return 'MID=' + hex.slice(0, 2)
      + ' OID=' + hex.slice(2, 6)
      + ' PNM=' + (pnmText ? `${pnmText}(${pnmHex})` : pnmHex)
      + ' PRV=' + hex.slice(18, 20)
      + ' PSN=' + hex.slice(20, 28)
      + ' MDT=' + hex.slice(28, 32);
  };

  const decodePrv = (prv = '') => {
    const hex = String(prv).toLowerCase().replace(/^0x/, '').replace(/[^0-9a-f]/g, '');
    if (hex.length < 2) return '';
    const major = parseInt(hex[0], 16);
    const minor = parseInt(hex[1], 16);
    if (isNaN(major) || isNaN(minor)) return '';
    return `版本 ${major}.${minor}（高 4 位为主版本，低 4 位为次版本）`;
  };

  const decodeDate = (raw = '') => {
    const matched = String(raw || '').trim().match(/^(\d{2})\/(\d{4})$/);
    if (!matched) return '';
    return `${matched[2]}年${matched[1]}月`;
  };

  const decodeFwrev = (fwrev = '', hwrev = '') => {
    const hex = String(fwrev).toLowerCase().replace(/^0x/, '').replace(/[^0-9a-f]/g, '').replace(/^0+/, '');
    const minor = parseInt(String(hwrev).toLowerCase().replace(/^0x/, ''), 16);
    const bits = [];
    if (hex) bits.push(`主版本 ${parseInt(hex[0], 16)}`);
    if (!isNaN(minor)) bits.push(`次版本 ${minor}`);
    return bits.join(' / ');
  };

  const lifeValues = (raw = '') => String(raw || '').trim().split(/\s+/)
    .map((token) => parseInt(token, 16))
    .filter((value) => !isNaN(value) && value > 0);

  const lifeLevel = (value) => {
    if (!value) return 'unknown';
    if (value >= 8) return 'bad';
    if (value >= 4) return 'warn';
    return 'good';
  };

  // 综合健康度：厂商已知问题 + EOL 状态 + 寿命估算取最差
  const evalDevice = (dev) => {
    const items = [];
    const manInfo = MANUFACTURERS[normalizeManfid(dev.fields.manfid)];
    if (manInfo && manInfo.danger) items.push({ level: 'bad', text: '已知问题颗粒' });

    const eolValue = parseInt(String(dev.fields.pre_eol_info || ''), 16);
    if (eolValue === 3) items.push({ level: 'bad', text: 'EOL 紧急' });
    else if (eolValue === 2) items.push({ level: 'warn', text: 'EOL 警告' });

    const lifeWorst = Math.max(-1, ...lifeValues(dev.fields.life_time));
    if (lifeWorst >= 8) items.push({ level: 'bad', text: '寿命消耗高' });
    else if (lifeWorst >= 4) items.push({ level: 'warn', text: '寿命中等' });

    if (!items.length) return { level: 'good', text: '健康' };
    const level = items.some((item) => item.level === 'bad') ? 'bad' : 'warn';
    return { level, text: items.map((item) => item.text).join(' · ') };
  };

  const renderDevice = (dev) => {
    const f = dev.fields;
    const manKey = normalizeManfid(f.manfid);
    const manInfo = manKey ? MANUFACTURERS[manKey] : null;
    const isDanger = !!(manInfo && manInfo.danger);
    const health = evalDevice(dev);
    const cidSub = decodeCid(f.cid);

    const row = (label, mainHtml, subHtml = '') => `
      <div class="emd-row">
        <div class="emd-label">${escapeHtml(label)}</div>
        <div class="emd-value">
          <div class="emd-value-main">${mainHtml}</div>
          ${subHtml ? `<div class="emd-value-sub">${subHtml}</div>` : ''}
        </div>
      </div>`;

    const manfidHtml = isDanger
      ? `<span class="emd-danger">${escapeHtml(f.manfid || '—')}${manInfo ? ` · ${escapeHtml(manInfo.name)}` : ''}</span><span class="emd-chip emd-danger-badge">⚠️ 已知问题EMMC</span>`
      : `<span>${escapeHtml(f.manfid || '—')}${manInfo ? ` · ${escapeHtml(manInfo.name)}` : '（厂商表未收录）'}</span>`;

    const lifeTokens = String(f.life_time || '').trim().split(/\s+/).filter(Boolean);
    const lifeHtml = lifeTokens.length
      ? lifeTokens.map((token, index) => {
          const value = parseInt(token, 16);
          const band = LIFE_BANDS[value] || '未知';
          const typeName = ['类型 A', '类型 B'][index] || `组 ${index + 1}`;
          return `<span class="emd-chip" data-kind="${lifeLevel(value)}">${typeName}：${escapeHtml(token)}（${escapeHtml(band)}）</span>`;
        }).join('')
      : '<span class="emd-dim">未提供（需 eMMC 5.0+）</span>';

    const eolValue = parseInt(String(f.pre_eol_info || ''), 16);
    const eolInfo = PRE_EOL[eolValue];
    const eolHtml = eolInfo
      ? `<span class="emd-chip" data-kind="${eolInfo.level}">${escapeHtml(f.pre_eol_info)} · ${escapeHtml(eolInfo.text)}</span>`
      : `<span class="emd-dim">${escapeHtml(f.pre_eol_info || '未提供（需 eMMC 5.0+）')}</span>`;

    const dateSub = decodeDate(f.date) ? `≈ ${escapeHtml(decodeDate(f.date))}（来自 CID MDT 字段）` : '';

    return `
      <div class="emd-card${isDanger ? ' emd-card-danger' : ''}">
        <div class="emd-card-head">
          <div>
            <div class="emd-card-title">${escapeHtml(dev.name)}</div>
            <div class="emd-value-sub">${escapeHtml(dev.path)}</div>
          </div>
          <div class="emd-chips">
            ${f.type ? `<span class="emd-chip">${escapeHtml(f.type)}</span>` : ''}
            <span class="emd-chip" data-kind="${health.level}">${escapeHtml(health.text)}</span>
          </div>
        </div>
        ${isDanger ? `<div class="emd-banner">⚠️ 已知问题 EMMC：manfid=${escapeHtml(f.manfid || '')}（${escapeHtml(manInfo ? manInfo.name : '')}）为已知问题批次，建议关注寿命状态并做好数据备份。</div>` : ''}
        <div class="emd-rows">
          ${row('厂商 ID（manfid）', manfidHtml)}
          ${f.oemid ? row('OEM ID（oemid）', escapeHtml(f.oemid), '与 CID 第 2~3 字节对应，用于区分同厂不同封装/来源') : ''}
          ${f.name ? row('颗粒型号（name）', `<b>${escapeHtml(f.name)}</b>`, '取自 CID PNM 字段的产品型号') : ''}
          ${f.date ? row('生产日期（date）', escapeHtml(f.date), dateSub) : ''}
          ${f.prv ? row('产品版本（prv）', escapeHtml(f.prv), escapeHtml(decodePrv(f.prv) || '')) : ''}
          ${f.fwrev ? row('固件版本（fwrev）', escapeHtml(f.fwrev), escapeHtml(decodeFwrev(f.fwrev, f.hwrev))) : ''}
          ${f.hwrev ? row('硬件版本（hwrev）', escapeHtml(f.hwrev)) : ''}
          ${f.serial ? row('序列号（serial）', escapeHtml(f.serial), '取自 CID PSN 字段') : ''}
          ${row('寿命估算（life_time）', lifeHtml, 'A/B 对应芯片内部不同存储区域，百分比为已消耗寿命区间')}
          ${row('EOL 状态（pre_eol_info）', eolHtml, '预留块（Reserve Block）剩余量评估，0x01 正常 / 0x02 警告 / 0x03 紧急')}
          ${f.cid ? row('CID', `<code>${escapeHtml(f.cid)}</code>`, cidSub ? `<code>${escapeHtml(cidSub)}</code>` : '') : ''}
          ${f.csd ? row('CSD', `<code>${escapeHtml(f.csd)}</code>`, '寄存器原始值（含容量、读写时序等配置信息）') : ''}
        </div>
      </div>`;
  };

  const render = () => {
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    const listEl = root.querySelector('#emd_list');
    const metaEl = root.querySelector('#emd_meta');
    if (metaEl) {
      metaEl.textContent = state.refreshedAt
        ? `检测时间：${state.refreshedAt} · 设备数：${state.devices.length}`
        : '尚未检测';
    }
    if (listEl) {
      listEl.innerHTML = state.devices.length
        ? state.devices.map((dev) => renderDevice(dev)).join('')
        : `<div class="emd-empty">${escapeHtml(state.error || '未检测到 eMMC 设备（/sys/bus/mmc/devices/mmc*:0001 无匹配）。请确认设备带有 eMMC 存储，且已开启高级功能。')}</div>`;
    }
  };

  const setBusy = (busy) => {
    state.busy = busy;
    const root = document.querySelector(`#${MODAL_NAME}`);
    if (!root) return;
    root.querySelectorAll('button').forEach((button) => {
      button.disabled = busy;
    });
    const listEl = root.querySelector('#emd_list');
    if (busy && listEl && !state.devices.length) {
      listEl.innerHTML = '<div class="emd-empty">正在读取 eMMC 信息，请稍候...</div>';
    }
  };

  const refresh = async (silent = false) => {
    if (state.busy) return;
    setBusy(true);
    state.error = '';
    try {
      const res = await runShellWithRoot(SHELL_CMD, 12000);
      let out = res && res.content;
      if (out && typeof out === 'object') out = out.content;
      const raw = String(out || '').trim();

      if (!res || res.success === false || !raw) {
        state.raw = raw;
        state.devices = [];
        render();
        if (!silent) createToast(raw ? '命令执行失败' : '未检测到 eMMC 设备', 'red');
        return;
      }

      state.raw = raw;
      state.devices = parseOutput(raw);
      state.refreshedAt = new Date().toLocaleString('zh-CN', { hour12: false });
      render();

      if (state.devices.some((dev) => normalizeManfid(dev.fields.manfid) === DANGER_MANFID_KEY)) {
        createToast('检测到已知问题 EMMC 颗粒（0x2C）', 'red');
      } else if (!silent) {
        createToast(`检测完成：共 ${state.devices.length} 个 eMMC 设备`, 'green');
      }
    } catch (e) {
      state.devices = [];
      state.error = `执行命令异常：${e && e.message ? e.message : e}`;
      render();
      createToast('eMMC 检测异常', 'red');
    } finally {
      setBusy(false);
    }
  };

  const openModal = async () => {
    ensureStyle();
    document.querySelector(`#${MODAL_NAME}`)?.remove();

    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '920px',
      showConfirm: false,
      onClose: () => true,
      contentStyle: 'max-height:72vh;',
      content: `
        <div class="emd-wrap">
          <div class="emd-panel">
            <div class="emd-panel-head">
              <div>
                <div class="emd-panel-title">eMMC 颗粒信息</div>
                <div class="emd-tip">扫描 /sys/bus/mmc/devices/mmc*:0001，解析厂商、版本与寿命健康状态；打开页面时已自动检测一次。</div>
              </div>
              <div class="emd-actions">
                <button id="emd_refresh_btn">重新检测</button>
                <button id="emd_copy_btn">复制原始输出</button>
              </div>
            </div>
            <div class="emd-meta" id="emd_meta">尚未检测</div>
            <div class="emd-list" id="emd_list"><div class="emd-empty">正在检测...</div></div>
            <div class="emd-tip" style="margin-top:8px;">
              说明：厂商表按 JEDEC JEP106 注册号整理（个别资料将 0x2C 归为 Micron 美光，本插件按 JEP106 标注为 Kingston 金士顿，并列为已知问题批次）；
              life_time / pre_eol_info 为 eMMC 5.0+ 健康指标，旧颗粒缺失属正常现象。
            </div>
          </div>
        </div>
      `,
    });

    el.style.width = '96%';

    el.querySelector('#emd_refresh_btn').onclick = async () => {
      await refresh(false);
    };
    el.querySelector('#emd_copy_btn').onclick = async () => {
      await copyTextValue(state.raw || '暂无原始输出，请先检测');
    };

    showModal(id);
    render();
    await refresh(true);   // 打开页面后自动检测一次
  };

  const ensureAdvanced = async () => {
    try {
      if (typeof checkAdvancedFunc === 'function') {
        return !!(await checkAdvancedFunc());
      }
    } catch (e) {}
    try {
      const res = await runShellWithRoot('whoami', 5000);
      return String((res && res.content) || '').includes('root');
    } catch (e) {
      return false;
    }
  };

  const mainBtn = document.createElement('button');
  mainBtn.classList.add('btn');
  mainBtn.textContent = TITLE;
  mainBtn.onclick = async () => {
    if (!(await ensureAdvanced())) {
      createToast('请先启用高级功能', 'pink');
      return;
    }
    await openModal();
  };

  // 等待宿主 DOM 就绪后挂载按钮
  let waited = 0;
  while (!document.querySelector('.actions-buttons') && waited < 250) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    waited += 1;
  }
  const mountPoint = document.querySelector('.actions-buttons');
  if (mountPoint) {
    mountPoint.appendChild(mainBtn);
  } else {
    const collapseBox = document.querySelector('#collapseBtn_menu')
      ?.nextElementSibling?.querySelector('.collapse_box');
    (collapseBox || document.body).appendChild(mainBtn);
  }
})();
//</script>
