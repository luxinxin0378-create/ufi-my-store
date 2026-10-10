//<script>
(async () => {
  const TITLE = 'HTTPS反向代理';
  const MODAL_NAME = 'ufi_https_proxy_modal';
  const STYLE_ID = 'ufi_https_proxy_style';
  const INSTALL_DIR = '/data/ufi_https_proxy';
  const BINARY = `${INSTALL_DIR}/ufi_https_proxyd`;
  const SERVICE = `${INSTALL_DIR}/service.sh`;
  const CONFIG = `${INSTALL_DIR}/config.json`;
  const P12_FILE = `${INSTALL_DIR}/server.p12`;
  const BOOT_LINE = `${SERVICE} start`;
  const ONLINE_BINARY_URL = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/ufi_https_proxyd';
  const UPLOAD_DIR = '/data/data/com.minikano.f50_sms/files/uploads';
  const SERVICE_BASE64 = 'IyEvc3lzdGVtL2Jpbi9zaAoKRElSPS9kYXRhL3VmaV9odHRwc19wcm94eQpCSU49JERJUi91ZmlfaHR0cHNfcHJveHlkCkNPTkZJRz0kRElSL2NvbmZpZy5qc29uClBJRD0kRElSL3VmaV9odHRwc19wcm94eWQucGlkCkxPRz0kRElSL3VmaV9odHRwc19wcm94eWQubG9nCgppc19ydW5uaW5nKCkgewogICAgWyAtcyAiJFBJRCIgXSB8fCByZXR1cm4gMQogICAga2lsbCAtMCAiJCh0aW1lb3V0IDJzIGF3ayAnTlI9PTEge3ByaW50OyBleGl0fScgIiRQSUQiKSIgMj4vZGV2L251bGwKfQoKY2FzZSAiJDEiIGluCiAgICBzdGFydCkKICAgICAgICBpZiBpc19ydW5uaW5nOyB0aGVuCiAgICAgICAgICAgIGVjaG8gInVmaV9odHRwc19wcm94eWQgYWxyZWFkeSBydW5uaW5nIgogICAgICAgICAgICBleGl0IDAKICAgICAgICBmaQogICAgICAgIFsgLXggIiRCSU4iIF0gfHwgeyBlY2hvICJiaW5hcnkgbm90IGluc3RhbGxlZCI7IGV4aXQgMTsgfQogICAgICAgIFsgLXMgIiRDT05GSUciIF0gfHwgeyBlY2hvICJjb25maWcgbm90IGZvdW5kIjsgZXhpdCAxOyB9CiAgICAgICAgOiA+IiRMT0ciCiAgICAgICAgIiRCSU4iIC1jb25maWcgIiRDT05GSUciIC1jaGVjayA+PiIkTE9HIiAyPiYxIHx8IHsKICAgICAgICAgICAgZWNobyAiY29uZmlnIG9yIFAxMiBjZXJ0aWZpY2F0ZSBpcyBpbnZhbGlkIgogICAgICAgICAgICB0aW1lb3V0IDJzIGF3ayAnTlIgPiA4MCB7bmV4dH0ge3ByaW50fScgIiRMT0ciCiAgICAgICAgICAgIGV4aXQgMQogICAgICAgIH0KICAgICAgICBub2h1cCAiJEJJTiIgLWNvbmZpZyAiJENPTkZJRyIgPj4iJExPRyIgMj4mMSAmCiAgICAgICAgZWNobyAkISA+IiRQSUQiCiAgICAgICAgc2xlZXAgMQogICAgICAgIGlmIGlzX3J1bm5pbmc7IHRoZW4KICAgICAgICAgICAgZWNobyAidWZpX2h0dHBzX3Byb3h5ZCBzdGFydGVkIgogICAgICAgIGVsc2UKICAgICAgICAgICAgZWNobyAidWZpX2h0dHBzX3Byb3h5ZCBmYWlsZWQgdG8gc3RhcnQiCiAgICAgICAgICAgIHRpbWVvdXQgMnMgYXdrICdOUiA+IDgwIHtuZXh0fSB7cHJpbnR9JyAiJExPRyIKICAgICAgICAgICAgZXhpdCAxCiAgICAgICAgZmkKICAgICAgICA7OwogICAgc3RvcCkKICAgICAgICBpZiBpc19ydW5uaW5nOyB0aGVuCiAgICAgICAgICAgIGtpbGwgIiQodGltZW91dCAycyBhd2sgJ05SPT0xIHtwcmludDsgZXhpdH0nICIkUElEIikiIDI+L2Rldi9udWxsCiAgICAgICAgICAgIGk9MAogICAgICAgICAgICB3aGlsZSBpc19ydW5uaW5nICYmIFsgIiRpIiAtbHQgMzAgXTsgZG8KICAgICAgICAgICAgICAgIHNsZWVwIDAuMQogICAgICAgICAgICAgICAgaT0kKChpICsgMSkpCiAgICAgICAgICAgIGRvbmUKICAgICAgICBmaQogICAgICAgIHJtIC1mICIkUElEIgogICAgICAgIGVjaG8gInVmaV9odHRwc19wcm94eWQgc3RvcHBlZCIKICAgICAgICA7OwogICAgcmVzdGFydCkKICAgICAgICAiJDAiIHN0b3AKICAgICAgICAiJDAiIHN0YXJ0CiAgICAgICAgOzsKICAgIHN0YXR1cykKICAgICAgICBpZiBpc19ydW5uaW5nOyB0aGVuCiAgICAgICAgICAgIGVjaG8gInJ1bm5pbmcgcGlkPSQodGltZW91dCAycyBhd2sgJ05SPT0xIHtwcmludDsgZXhpdH0nICIkUElEIikiCiAgICAgICAgZWxzZQogICAgICAgICAgICBlY2hvICJzdG9wcGVkIgogICAgICAgICAgICBleGl0IDEKICAgICAgICBmaQogICAgICAgIDs7CiAgICBsb2cpCiAgICAgICAgdGltZW91dCAycyBhd2sgJ05SID4gMTAwIHtuZXh0fSB7cHJpbnR9JyAiJExPRyIKICAgICAgICA7OwogICAgKikKICAgICAgICBlY2hvICJ1c2FnZTogJDAge3N0YXJ0fHN0b3B8cmVzdGFydHxzdGF0dXN8bG9nfSIKICAgICAgICBleGl0IDIKICAgICAgICA7Owplc2FjCg==';

  const state = {
    installed: false,
    running: false,
    hasCertificate: false,
    busy: false,
    targetPort: 2333,
    listenPort: 8443,
    p12Password: '',
  };

  const q = (selector) => document.querySelector(`#${MODAL_NAME} ${selector}`);
  const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
  const rootCommand = async (command, timeout = 30000) => {
    const result = await runShellWithRoot(command, timeout);
    return { ok: Boolean(result?.success), text: String(result?.content || '').trim() };
  };
  const openFixedModal = (id, html, style = {}) => {
    if (typeof globalThis.createFixedModal === 'function') {
      return globalThis.createFixedModal(id, html, style);
    }
    return createFixedToast(id, html, { pointerEvents: 'all', zIndex: '100000', ...style });
  };
  const toggleBootUp = async (enable) => {
    let result = { ok: false };
    if (enable === '1' || enable === true) {
      result = await rootCommand(`grep -qxF ${shellQuote(BOOT_LINE)} /sdcard/ufi_tools_boot.sh || printf '%s\\n' ${shellQuote(BOOT_LINE)} >> /sdcard/ufi_tools_boot.sh`);
    } else {
      result = await rootCommand(`sed -i '\\|${BOOT_LINE}|d' /sdcard/ufi_tools_boot.sh 2>/dev/null || true`);
    }
    return result.ok;
  }
  const isBootEnabled = async () => {
    const result = await rootCommand(`grep ufi_https_proxy /sdcard/ufi_tools_boot.sh`);
    return Boolean(result.ok && result.text.includes(BOOT_LINE));
  }
  const askFixed = (id, title, body, ok = '确认', cancel = '取消') => new Promise((resolve) => {
    const { el, close } = openFixedModal(
      id,
      `<div style="pointer-events:all;width:90vw;max-width:500px;">
        <div class="title" style="margin:0">${title}</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.75">${body}</div>
        <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:10px;">
          <button class="ufi-fixed-ok">${ok}</button>
          <button class="ufi-fixed-cancel">${cancel}</button>
        </div>
      </div>`,
    );
    const done = (value) => { close(); resolve(value); };
    el.querySelector('.ufi-fixed-ok')?.addEventListener('click', () => done(true));
    el.querySelector('.ufi-fixed-cancel')?.addEventListener('click', () => done(false));
  });
  const encodeBase64 = (text) => {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  };
  const readInputs = () => {
    const targetPort = Number(q('#ufi_https_target_port')?.value);
    const listenPort = Number(q('#ufi_https_listen_port')?.value);
    const p12Password = q('#ufi_https_p12_password')?.value || '';
    if (!Number.isInteger(targetPort) || targetPort < 1 || targetPort > 65535) {
      throw new Error('HTTP 代理端口必须是 1–65535 的整数');
    }
    if (!Number.isInteger(listenPort) || listenPort < 1 || listenPort > 65535) {
      throw new Error('HTTPS 监听端口必须是 1–65535 的整数');
    }
    if (targetPort === listenPort) throw new Error('代理端口和监听端口不能相同');
    return { targetPort, listenPort, p12Password };
  };

  const render = async () => {
    const status = q('#ufi_https_service_status');
    if (status) {
      status.textContent = state.installed ? (state.running ? '运行中' : '已停止') : '未安装';
      status.dataset.tone = state.running ? 'good' : (state.installed ? 'warn' : 'bad');
    }
    const cert = q('#ufi_https_cert_status');
    if (cert) {
      cert.textContent = state.hasCertificate ? '已导入 P12 证书' : '尚未导入证书';
      cert.dataset.tone = state.hasCertificate ? 'good' : 'warn';
    }
    const toggle = q('#ufi_https_toggle');
    if (toggle) toggle.textContent = state.running ? '停止' : '启动';
    q('#ufi_https_open')?.toggleAttribute('disabled', !state.running || state.busy);
    ['install', 'certificate', 'toggle', 'restart', 'uninstall'].forEach((id) => {
      q(`#ufi_https_${id}`)?.toggleAttribute('disabled', state.busy);
    });
    const bootEnabled = await isBootEnabled();
    document.querySelector('#ufi_https_boot').dataset.enabled = bootEnabled ? '1' : '';
    document.querySelector('#ufi_https_boot').style.background = bootEnabled ? 'var(--dark-btn-color-active)' : '';
  };

  const refreshService = async () => {
    const result = await rootCommand(`
if [ -x ${BINARY} ] && [ -x ${SERVICE} ]; then printf '__INSTALLED__\\n'; fi
if [ -x ${SERVICE} ] && ${SERVICE} status >/dev/null 2>&1; then printf '__RUNNING__\\n'; fi
if [ -s ${P12_FILE} ]; then printf '__CERT__\\n'; fi
if [ -s ${CONFIG} ]; then printf '__CONFIG__\\n'; timeout 2s awk '{print}' ${CONFIG}; printf '\\n__CONFIG_END__\\n'; fi
`);
    state.installed = result.text.includes('__INSTALLED__');
    state.running = result.text.includes('__RUNNING__');
    state.hasCertificate = result.text.includes('__CERT__');
    const configMatch = result.text.match(/__CONFIG__\s*\n([\s\S]*?)\n__CONFIG_END__/);
    if (configMatch) {
      try {
        const config = JSON.parse(configMatch[1]);
        state.targetPort = Number(config.targetPort) || state.targetPort;
        state.listenPort = Number(config.listenPort) || state.listenPort;
        state.p12Password = String(config.p12Password || '');
      } catch { }
    }
    const target = q('#ufi_https_target_port');
    const listen = q('#ufi_https_listen_port');
    const password = q('#ufi_https_p12_password');
    if (target) target.value = state.targetPort;
    if (listen) listen.value = state.listenPort;
    if (password) password.value = state.p12Password;
    render();
  };

  const saveConfig = async () => {
    const values = readInputs();
    const config = JSON.stringify({
      listenPort: values.listenPort,
      targetPort: values.targetPort,
      p12Path: P12_FILE,
      p12Password: values.p12Password,
    });
    const encoded = encodeBase64(config);
    const result = await rootCommand(`
set -e
mkdir -p ${INSTALL_DIR}
[ -s ${P12_FILE} ]
printf '%s' ${shellQuote(encoded)} | base64 -d > ${CONFIG}.tmp
chmod 600 ${CONFIG}.tmp
mv -f ${CONFIG}.tmp ${CONFIG}
`, 30000);
    if (!result.ok) throw new Error(result.text || '保存配置失败，请先导入 P12 证书');
    Object.assign(state, values);
  };

  const installOnline = async () => {
    const downloadPath = '/data/ufi_httpsd.online';
    createToast('正在在线下载服务端…');
    const serviceEncoded = shellQuote(SERVICE_BASE64);
    try {
      const result = await rootCommand(`
set -e
rm -f ${downloadPath}
/data/data/com.minikano.f50_sms/files/curl -L --fail --connect-timeout 15 --max-time 150 ${shellQuote(ONLINE_BINARY_URL)} -o ${downloadPath}
${SERVICE} stop >/dev/null 2>&1 || true
mkdir -p ${INSTALL_DIR}
mv -f ${shellQuote(downloadPath)} ${BINARY}
printf '%s' ${serviceEncoded} | base64 -d > ${SERVICE}
chmod 700 ${INSTALL_DIR}
chmod 755 ${BINARY} ${SERVICE}
touch /sdcard/ufi_tools_boot.sh
grep -qxF ${shellQuote(BOOT_LINE)} /sdcard/ufi_tools_boot.sh || printf '%s\\n' ${shellQuote(BOOT_LINE)} >> /sdcard/ufi_tools_boot.sh
`, 120000);
      const res1 = await rootCommand(`ls ${BINARY} ${SERVICE}`);
      if (!res1.ok || !res1.text.includes(BINARY) || !res1.text.includes(SERVICE)) throw new Error('安装文件不存在,安装失败');
      if (!result.ok) throw new Error(result.text || '安装命令失败');
      createToast('HTTPS 反向代理安装/升级成功', 'green', 5000);
      await refreshService();
    }
    catch (error) {
      createToast(`安装失败：${error?.message || error}`, 'red', 7000);
    } finally {
      state.busy = false;
      input.remove();
      render();
    }
  }

  const chooseLocalBinary = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.onchange = async () => {
      const file = input.files?.[0];
      state.busy = true;
      render();
      try {
        if (!file) return;
        if (file.size < 1024 * 1024 || file.size > 30 * 1024 * 1024) {
          throw new Error('文件大小异常，请选择 ufi_https_proxyd');
        }
        if (typeof uploadFileKano !== 'function') throw new Error('当前 UFI-TOOLS 缺少 uploadFileKano()');
        createToast('正在上传 arm64 服务端…');
        const uploaded = await uploadFileKano(file);
        if (!uploaded || !/^[A-Za-z0-9_.-]+$/.test(uploaded)) throw new Error('二进制上传失败');
        const serviceEncoded = shellQuote(SERVICE_BASE64);
        const source = `${UPLOAD_DIR}/${uploaded}`;
        const result = await rootCommand(`
set -e
${SERVICE} stop >/dev/null 2>&1 || true
mkdir -p ${INSTALL_DIR}
mv -f ${shellQuote(source)} ${BINARY}
printf '%s' ${serviceEncoded} | base64 -d > ${SERVICE}
chmod 700 ${INSTALL_DIR}
chmod 755 ${BINARY} ${SERVICE}
touch /sdcard/ufi_tools_boot.sh
grep -qxF ${shellQuote(BOOT_LINE)} /sdcard/ufi_tools_boot.sh || printf '%s\\n' ${shellQuote(BOOT_LINE)} >> /sdcard/ufi_tools_boot.sh
`, 120000);
        if (!result.ok) throw new Error(result.text || '安装命令失败');
        createToast('HTTPS 反向代理安装/升级成功', 'green', 5000);
        await refreshService();
      } catch (error) {
        createToast(`安装失败：${error?.message || error}`, 'red', 7000);
      } finally {
        state.busy = false;
        input.remove();
        render();
      }
    };
    document.body.appendChild(input);
    input.click();
  };

  const chooseInstallMethod = () => {
    const { el, close } = openFixedModal(
      'ufi_https_install_method',
      `<div style="pointer-events:all;width:90vw;max-width:500px;">
        <div class="title" style="margin:0">选择安装方式</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.75">
          本地安装：选择设备中保存的 <code>ufi_httpsd</code>。<br>
          在线安装：从预设更新地址下载最新二进制。
        </div>
        <div style="margin-top:14px;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px;">
          <button class="ufi-install-local">本地安装</button>
          <button class="ufi-install-online">在线安装</button>
          <button class="ufi-install-cancel">取消</button>
        </div>
      </div>`,
    );
    el.querySelector('.ufi-install-local')?.addEventListener('click', () => {
      close();
      chooseLocalBinary();
    });
    el.querySelector('.ufi-install-online')?.addEventListener('click', async () => {
      close();
      await installOnline();
    });
    el.querySelector('.ufi-install-cancel')?.addEventListener('click', close);
  };

  const chooseP12 = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.p12,.pfx,application/x-pkcs12';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.onchange = async () => {
      const file = input.files?.[0];
      state.busy = true;
      render();
      try {
        if (!file) return;
        if (file.size < 100 || file.size > 10 * 1024 * 1024) throw new Error('P12 文件大小异常');
        if (typeof uploadFileKano !== 'function') throw new Error('当前 UFI-TOOLS 缺少 uploadFileKano()');
        createToast('正在导入 P12 证书…');
        const uploaded = await uploadFileKano(file);
        if (!uploaded || !/^[A-Za-z0-9_.-]+$/.test(uploaded)) throw new Error('P12 上传失败');
        const result = await rootCommand(`
set -e
mkdir -p ${INSTALL_DIR}
mv -f ${shellQuote(`${UPLOAD_DIR}/${uploaded}`)} ${P12_FILE}
chmod 700 ${INSTALL_DIR}
chmod 600 ${P12_FILE}
`);
        if (!result.ok) throw new Error(result.text || '保存 P12 失败');
        state.hasCertificate = true;
        createToast('P12 证书导入成功', 'green');
      } catch (error) {
        createToast(`证书导入失败：${error?.message || error}`, 'red', 7000);
      } finally {
        state.busy = false;
        input.remove();
        render();
      }
    };
    document.body.appendChild(input);
    input.click();
  };

  const serviceAction = async (action) => {
    if (!state.installed) {
      createToast('请先安装服务端二进制', 'red');
      return;
    }
    state.busy = true;
    render();
    try {
      if (action !== 'stop') await saveConfig();
      const result = await rootCommand(`${SERVICE} ${action}`, 40000);
      if (!result.ok) throw new Error(result.text || `${action} 失败`);
      createToast(result.text || '操作成功', 'green');
      await refreshService();
    } catch (error) {
      createToast(`操作失败：${error?.message || error}`, 'red', 8000);
      const log = await rootCommand(`${SERVICE} log`);
      if (log.text) console.error('UFI HTTPS proxy:', log.text);
    } finally {
      state.busy = false;
      render();
    }
  };

  const uninstall = async () => {
    if (!state.installed) return;
    const confirmed = await askFixed(
      'ufi_https_proxy_uninstall_confirm',
      '确认卸载',
      '将删除服务端、配置和已导入的 P12 证书，且无法恢复。',
      '确认卸载',
    );
    if (!confirmed) return;
    state.busy = true;
    render();
    const result = await rootCommand(
      `${SERVICE} stop >/dev/null 2>&1 || true; sed -i '\\|${BOOT_LINE}|d' /sdcard/ufi_tools_boot.sh 2>/dev/null || true; rm -rf ${INSTALL_DIR}`
    );
    state.busy = false;
    createToast(result.ok ? '卸载成功' : `卸载失败：${result.text}`, result.ok ? 'green' : 'red');
    await refreshService();
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#${MODAL_NAME} .ufi-https { font-size:.74rem;line-height:1.55; }
#${MODAL_NAME} .ufi-card { padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.045);margin-bottom:12px; }
#${MODAL_NAME} .ufi-head { display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px; }
#${MODAL_NAME} .ufi-title { font-weight:700;font-size:.82rem; }
#${MODAL_NAME} [data-tone="good"] { color:#64e6a4; }
#${MODAL_NAME} [data-tone="warn"] { color:#ffd166; }
#${MODAL_NAME} [data-tone="bad"] { color:#ff7777; }
#${MODAL_NAME} .ufi-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
#${MODAL_NAME} label { display:block;font-size:.68rem;opacity:.9; }
#${MODAL_NAME} input { box-sizing:border-box;width:100%;min-width:0;margin-top:5px; }
#${MODAL_NAME} .ufi-actions { display:flex;flex-wrap:wrap;gap:8px;margin-top:12px; }
#${MODAL_NAME} .ufi-tip { margin-top:9px;font-size:.65rem;opacity:.72;line-height:1.65;word-break:break-word; }
`;
    document.head.appendChild(style);
  };

  const openModal = async () => {
    ensureStyle();
    document.getElementById(MODAL_NAME)?.remove();
    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      contentStyle: "max-height:80vh;",
      maxWidth: '620px',
      showConfirm: false,
      onClose: () => {
        return true;
      },
      content: `<div class="ufi-https">
        <div class="ufi-card">
          <div class="ufi-head">
            <span class="ufi-title">UFI HTTPS 反向代理</span>
            <span id="ufi_https_service_status">检查中…</span>
          </div>
          <div class="ufi-grid">
            <label>HTTP 代理端口
              <input style="padding:4px;" id="ufi_https_target_port" type="number" min="1" max="65535" value="2333">
            </label>
            <label>HTTPS 监听端口
              <input style="padding:4px;" id="ufi_https_listen_port" type="number" min="1" max="65535" value="8443">
            </label>
          </div>
          <label style="margin-top:10px;">P12 证书密码
            <input style="padding:4px;" id="ufi_https_p12_password" type="password" autocomplete="off" placeholder="无密码则留空">
          </label>
          <div id="ufi_https_cert_status" class="ufi-tip">尚未导入证书</div>
          <div class="ufi-actions">
            <button id="ufi_https_install">安装/升级</button>
            <button id="ufi_https_certificate">导入 P12</button>
            <button id="ufi_https_toggle">启动</button>
            <button id="ufi_https_restart">保存并重启</button>
            <button id="ufi_https_open">打开 HTTPS</button>
            <button id="ufi_https_boot">开机自启</button>
            <button id="ufi_https_uninstall">卸载</button>
          </div>
          <div class="ufi-tip">
            转发方向：https://UFI地址:监听端口 → http://0.0.0.0:代理端口。支持 WebSocket。<br>
            P12 必须包含私钥，证书 SAN 必须覆盖访问 UFI 时使用的 IP 或域名。
          </div>
        </div>
      </div>`
    });
    el.querySelector('#ufi_https_install').onclick = chooseInstallMethod;
    el.querySelector('#ufi_https_certificate').onclick = chooseP12;
    el.querySelector('#ufi_https_toggle').onclick = () => serviceAction(state.running ? 'stop' : 'start');
    el.querySelector('#ufi_https_restart').onclick = () => serviceAction('restart');
    el.querySelector('#ufi_https_boot').onclick = async () => {
      if (!state.installed) {
        createToast('请先安装服务端二进制', 'red');
        return;
      }
      const enable = !el.querySelector('#ufi_https_boot').dataset.enabled;
      const success = await toggleBootUp(enable);
      if (success) {
        el.querySelector('#ufi_https_boot').dataset.enabled = enable ? '1' : '';
        el.querySelector('#ufi_https_boot').style.background = enable ? 'var(--dark-btn-color-active)' : '';
        createToast(`开机自启已${enable ? '启用' : '禁用'}`, 'green');
      } else {
        createToast('设置开机自启失败', 'red');
      }
    }
    el.querySelector('#ufi_https_open').onclick = () => {
      try {
        const { listenPort } = readInputs();
        window.open(`https://${location.hostname}:${listenPort}/`, '_blank', 'noopener');
      } catch (error) {
        createToast(error?.message || String(error), 'red');
      }
    };
    el.querySelector('#ufi_https_uninstall').onclick = uninstall;
    showModal(id);
    await refreshService();
  };

  const mainBtn = document.createElement('button');
  mainBtn.textContent = TITLE;
  mainBtn.onclick = async () => {
    const root = await rootCommand('whoami');
    if (!root.ok || !root.text.includes('root')) {
      createToast('请先开启 UFI-TOOLS 高级功能', 'red');
      return;
    }
    await openModal();
  };
  document.querySelector('.actions-buttons')?.appendChild(mainBtn);
})();
//</script>