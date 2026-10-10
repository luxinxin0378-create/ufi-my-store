//<script>
(async () => {
  const TITLE = '网页对讲机';
  const MODAL_NAME = 'ufi_intercom_modal';
  const STYLE_ID = 'ufi_intercom_style';
  const INSTALL_DIR = '/data/ufi_intercom';
  const SERVICE = `${INSTALL_DIR}/service.sh`;
  const TOKEN_FILE = `${INSTALL_DIR}/auth.token`;
  const BOOT_LINE = `${SERVICE} start`;
  const UPLOAD_DIR = '/data/data/com.minikano.f50_sms/files/uploads';
  const ONLINE_BINARY_URL = 'http://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/ufi_intercomd';
  const DEFAULT_PORT = 19191;
  const SERVICE_BASE64 = 'IyEvc3lzdGVtL2Jpbi9zaAoKRElSPS9kYXRhL3VmaV9pbnRlcmNvbQpCSU49JERJUi91ZmlfaW50ZXJjb21kClBJRD0kRElSL3VmaV9pbnRlcmNvbWQucGlkCkxPRz0kRElSL3VmaV9pbnRlcmNvbWQubG9nClBPUlQ9MTkxOTEKCmlzX3J1bm5pbmcoKSB7CiAgICBbIC1zICIkUElEIiBdIHx8IHJldHVybiAxCiAgICBraWxsIC0wICIkKHRpbWVvdXQgMnMgYXdrICdOUj09MSB7cHJpbnQ7IGV4aXR9JyAiJFBJRCIpIiAyPi9kZXYvbnVsbAp9CgpjYXNlICIkMSIgaW4KICAgIHN0YXJ0KQogICAgICAgIGlmIGlzX3J1bm5pbmc7IHRoZW4KICAgICAgICAgICAgZWNobyAidWZpX2ludGVyY29tZCBhbHJlYWR5IHJ1bm5pbmciCiAgICAgICAgICAgIGV4aXQgMAogICAgICAgIGZpCiAgICAgICAgbWtkaXIgLXAgIiRESVIiCiAgICAgICAgIyBzY3JjcHktc2VydmVyIOeUsSBzaGVsbCBVSUQoMjAwMCkg55qEIGFwcF9wcm9jZXNzIOivu+WPluOAggogICAgICAgIGNobW9kIDc1NSAiJERJUiIKICAgICAgICBjaG1vZCA3NTUgIiRCSU4iCiAgICAgICAgbm9odXAgIiRCSU4iIC1saXN0ZW4gIjAuMC4wLjA6JFBPUlQiIC10b2tlbi1maWxlICIkRElSL2F1dGgudG9rZW4iID4+IiRMT0ciIDI+JjEgJgogICAgICAgIGVjaG8gJCEgPiIkUElEIgogICAgICAgIHNsZWVwIDEKICAgICAgICBpZiBpc19ydW5uaW5nOyB0aGVuCiAgICAgICAgICAgIGVjaG8gInVmaV9pbnRlcmNvbWQgc3RhcnRlZCIKICAgICAgICBlbHNlCiAgICAgICAgICAgIGVjaG8gInVmaV9pbnRlcmNvbWQgZmFpbGVkIHRvIHN0YXJ0IgogICAgICAgICAgICB0aW1lb3V0IDJzIGF3ayAnTlIgPiA0MCB7bmV4dH0ge3ByaW50fScgIiRMT0ciCiAgICAgICAgICAgIGV4aXQgMQogICAgICAgIGZpCiAgICAgICAgOzsKICAgIHN0b3ApCiAgICAgICAgaWYgaXNfcnVubmluZzsgdGhlbgogICAgICAgICAgICBraWxsICIkKHRpbWVvdXQgMnMgYXdrICdOUj09MSB7cHJpbnQ7IGV4aXR9JyAiJFBJRCIpIiAyPi9kZXYvbnVsbAogICAgICAgICAgICBpPTAKICAgICAgICAgICAgd2hpbGUgaXNfcnVubmluZyAmJiBbICIkaSIgLWx0IDIwIF07IGRvCiAgICAgICAgICAgICAgICBzbGVlcCAwLjEKICAgICAgICAgICAgICAgIGk9JCgoaSArIDEpKQogICAgICAgICAgICBkb25lCiAgICAgICAgZmkKICAgICAgICBybSAtZiAiJFBJRCIKICAgICAgICBlY2hvICJ1ZmlfaW50ZXJjb21kIHN0b3BwZWQiCiAgICAgICAgOzsKICAgIHJlc3RhcnQpCiAgICAgICAgIiQwIiBzdG9wCiAgICAgICAgIiQwIiBzdGFydAogICAgICAgIDs7CiAgICBzdGF0dXMpCiAgICAgICAgaWYgaXNfcnVubmluZzsgdGhlbgogICAgICAgICAgICBlY2hvICJydW5uaW5nIHBpZD0kKHRpbWVvdXQgMnMgYXdrICdOUj09MSB7cHJpbnQ7IGV4aXR9JyAiJFBJRCIpIHBvcnQ9JFBPUlQiCiAgICAgICAgZWxzZQogICAgICAgICAgICBlY2hvICJzdG9wcGVkIgogICAgICAgICAgICBleGl0IDEKICAgICAgICBmaQogICAgICAgIDs7CiAgICAqKQogICAgICAgIGVjaG8gInVzYWdlOiAkMCB7c3RhcnR8c3RvcHxyZXN0YXJ0fHN0YXR1c30iCiAgICAgICAgZXhpdCAyCiAgICAgICAgOzsKZXNhYwo=';

  const state = {
    socket: null,
    connected: false,
    mode: 'LISTEN',
    serverMode: 'LISTEN',
    pressed: false,
    audioContext: null,
    nextPlayTime: 0,
    micStream: null,
    worklet: null,
    micSource: null,
    micSilentGain: null,
    playbackGain: null,
    rxBytes: 0,
    rxPeak: 0,
    rxLastUpdate: 0,
    installed: false,
    running: false,
    busy: false,
    token: '',
    connecting: false,
    systemRecordingPending: false,
  };

  const q = (selector) => document.querySelector(`#${MODAL_NAME} ${selector}`);
  const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;
  const rootCommand = async (command, timeout = 30000) => {
    const result = await runShellWithRoot(command, timeout);
    return {
      ok: Boolean(result?.success),
      text: String(result?.content || '').trim(),
    };
  };
  const hasDirectMicrophoneApi = () => Boolean(
    navigator.mediaDevices?.getUserMedia
    || navigator.getUserMedia
    || navigator.webkitGetUserMedia
    || navigator.mozGetUserMedia
    || navigator.msGetUserMedia
  );
  const shouldUseSystemRecorder = () => !window.isSecureContext || !hasDirectMicrophoneApi();
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const openFixedModal = (id, html, style = {}) => {
    if (typeof globalThis.createFixedModal === 'function') {
      return globalThis.createFixedModal(id, html, style);
    }
    return createFixedToast(id, html, {
      pointerEvents: 'all',
      zIndex: '100000',
      ...style,
    });
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
    const result = await rootCommand(`grep ufi_intercom /sdcard/ufi_tools_boot.sh`);
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
    const done = (value) => {
      close();
      resolve(value);
    };
    el.querySelector('.ufi-fixed-ok')?.addEventListener('click', () => done(true));
    el.querySelector('.ufi-fixed-cancel')?.addEventListener('click', () => done(false));
  });

  const setStatus = (message, tone = '') => {
    const el = q('#ufi_intercom_connection');
    if (!el) return;
    el.textContent = message;
    el.dataset.tone = tone;
  };

  const render = async () => {
    const root = document.getElementById(MODAL_NAME);
    if (!root) return;
    const service = q('#ufi_intercom_service_status');
    if (service) {
      service.textContent = state.installed ? (state.running ? '运行中' : '已停止') : '未安装';
      service.dataset.tone = state.running ? 'good' : (state.installed ? 'warn' : 'bad');
    }
    const talk = q('#ufi_intercom_talk');
    if (talk) {
      talk.disabled = !state.connected || state.busy;
      talk.classList.toggle('talking', state.mode === 'TALK');
      const direct = !shouldUseSystemRecorder();
      talk.querySelector('strong').textContent = state.mode === 'TALK'
        ? '正在讲话'
        : (direct ? '按住讲话' : '点击录音');
      talk.querySelector('span').textContent = state.mode === 'TALK'
        ? (direct ? '松开恢复收听' : '录音正在发送')
        : (direct ? '当前正在收听设备' : 'HTTP 模式 · 调用系统录音器');
    }
    ['install', 'service_toggle', 'restart', 'uninstall'].forEach((id) => {
      const button = q(`#ufi_intercom_${id}`);
      if (button) button.disabled = state.busy;
    });
    const serviceToggle = q('#ufi_intercom_service_toggle');
    if (serviceToggle) {
      serviceToggle.textContent = state.running ? '停止' : '启动';
    }
    const connect = q('#ufi_intercom_connect');
    if (connect) {
      connect.disabled = state.busy || !state.running;
      connect.textContent = state.connected ? '断开' : '连接';
    }
    const bootEnabled = await isBootEnabled();
    document.querySelector('#ufi_intercom_boot').dataset.enabled = bootEnabled ? '1' : '';
    document.querySelector('#ufi_intercom_boot').style.background = bootEnabled ? 'var(--dark-btn-color-active)' : '';
  };

  const refreshService = async () => {
    const result = await rootCommand(
      `[ -x ${SERVICE} ] && printf '__INSTALLED__\\n'; if [ -x ${SERVICE} ] && ${SERVICE} status >/dev/null 2>&1; then printf '__RUNNING__\\n'; fi; if [ -s ${TOKEN_FILE} ]; then printf '__TOKEN__='; timeout 2s awk 'NR==1 {print; exit}' ${TOKEN_FILE}; fi`
    );
    state.installed = result.text.includes('__INSTALLED__');
    state.running = result.text.includes('__RUNNING__');
    const token = result.text.match(/__TOKEN__=([a-fA-F0-9]{64})/);
    state.token = token ? token[1].toLowerCase() : '';
    render();
  };

  const buildInstallCommand = (sourcePath, prelude = '') => `
set -e
${prelude}
[ -s ${shellQuote(sourcePath)} ]
${SERVICE} stop >/dev/null 2>&1 || true
mkdir -p ${INSTALL_DIR}
mv -f ${shellQuote(sourcePath)} ${INSTALL_DIR}/ufi_intercomd
printf '%s' ${shellQuote(SERVICE_BASE64)} | base64 -d > ${SERVICE}
TOKEN="$(timeout 2s awk '{gsub(/-/,"");printf "%s",$0}' /proc/sys/kernel/random/uuid)$(timeout 2s awk '{gsub(/-/,"");printf "%s",$0}' /proc/sys/kernel/random/uuid)"
[ "$(printf '%s' "$TOKEN" | wc -c)" -eq 64 ]
printf '%s\\n' "$TOKEN" > ${TOKEN_FILE}
rm -f ${INSTALL_DIR}/password.sha256
chmod 755 ${INSTALL_DIR}
chmod 755 ${INSTALL_DIR}/ufi_intercomd ${SERVICE}
chmod 600 ${TOKEN_FILE}
touch /sdcard/ufi_tools_boot.sh
grep -qxF ${shellQuote(BOOT_LINE)} /sdcard/ufi_tools_boot.sh || printf '%s\\n' ${shellQuote(BOOT_LINE)} >> /sdcard/ufi_tools_boot.sh
${SERVICE} start
`;

  const runInstall = async (sourcePath, prelude = '') => {
    state.busy = true;
    render();
    try {
      const result = await rootCommand(buildInstallCommand(sourcePath, prelude), 180000);
      const res1 = await rootCommand(`ls ${INSTALL_DIR}/ufi_intercomd ${SERVICE}`);
      if (!res1.ok || !res1.text.includes(`${INSTALL_DIR}/ufi_intercomd`) || !res1.text.includes(SERVICE)) throw new Error('安装文件不存在,安装失败');
      if (!result.ok) throw new Error(result.text || '安装命令执行失败');
      createToast('网页对讲机安装并启动成功', 'green', 5000);
      await refreshService();
    } catch (error) {
      createToast(`安装失败：${error?.message || error}`, 'red', 7000);
    } finally {
      state.busy = false;
      render();
    }
  };

  const chooseLocalBinary = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.onchange = async () => {
      const file = input.files?.[0];
      try {
        if (!file) return;
        if (file.size < 1024 * 1024 || file.size > 30 * 1024 * 1024) {
          createToast('所选文件大小异常，请选择构建生成的 ufi_intercomd', 'red');
          return;
        }
        if (typeof uploadFileKano !== 'function') {
          createToast('当前 UFI-TOOLS 缺少 uploadFileKano()', 'red');
          return;
        }
        createToast('正在上传 arm64 服务端…');
        const uploaded = await uploadFileKano(file);
        if (!uploaded || !/^[A-Za-z0-9_.-]+$/.test(uploaded)) throw new Error('二进制上传失败');
        await runInstall(`${UPLOAD_DIR}/${uploaded}`);
      } catch (error) {
        createToast(`本地安装失败：${error?.message || error}`, 'red', 7000);
      } finally {
        input.remove();
      }
    };
    document.body.appendChild(input);
    input.click();
  };

  const installOnline = async () => {
    const downloadPath = '/data/ufi_intercomd.online';
    const prelude = `
rm -f ${downloadPath}
CURL=/data/data/com.minikano.f50_sms/files/curl
[ -x "$CURL" ] || CURL=curl
"$CURL" -L --fail --connect-timeout 15 --max-time 150 ${shellQuote(ONLINE_BINARY_URL)} -o ${downloadPath}
`;
    createToast('正在在线下载服务端…');
    await runInstall(downloadPath, prelude);
  };

  const chooseInstallMethod = () => {
    const { el, close } = openFixedModal(
      'ufi_intercom_install_method',
      `<div style="pointer-events:all;width:90vw;max-width:500px;">
        <div class="title" style="margin:0">选择安装方式</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.75">
          本地安装：选择设备中保存的 <code>ufi_intercomd</code>。<br>
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

  const serviceAction = async (action) => {
    if (!state.installed) {
      createToast('请先安装服务端', 'red');
      return;
    }
    state.busy = true;
    render();
    try {
      disconnect();
      const result = await rootCommand(`${SERVICE} ${action}`, 30000);
      if (!result.ok) throw new Error(result.text || `${action} 失败`);
      createToast(result.text || '操作成功', 'green');
      await refreshService();
    } catch (error) {
      createToast(`操作失败：${error?.message || error}`, 'red');
    } finally {
      state.busy = false;
      render();
    }
  };

  const toggleService = () => serviceAction(state.running ? 'stop' : 'start');

  const uninstall = async () => {
    if (!state.installed) return;
    const confirmed = await askFixed(
      'ufi_intercom_uninstall_confirm',
      '确认卸载',
      '确认卸载网页对讲机服务端及连接 token？',
      '确认卸载',
    );
    if (!confirmed) return;
    state.busy = true;
    render();
    disconnect();
    const result = await rootCommand(
      `${SERVICE} stop >/dev/null 2>&1 || true; sed -i '\\|${BOOT_LINE}|d' /sdcard/ufi_tools_boot.sh 2>/dev/null || true; rm -rf ${INSTALL_DIR}`
    );
    state.busy = false;
    createToast(result.ok ? '卸载成功' : `卸载失败：${result.text}`, result.ok ? 'green' : 'red');
    await refreshService();
  };

  const ensureAudio = async () => {
    if (!state.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('当前浏览器不支持 Web Audio');
      try {
        state.audioContext = new AudioContext({ latencyHint: 'interactive' });
      } catch {
        state.audioContext = new AudioContext();
      }
      state.playbackGain = state.audioContext.createGain();
      state.playbackGain.gain.value = 1.8;
      state.playbackGain.connect(state.audioContext.destination);
    }
    if (state.audioContext.state === 'suspended') await state.audioContext.resume();
    return state.audioContext;
  };

  const toArrayBuffer = async (payload) => {
    if (payload instanceof ArrayBuffer) return payload;
    if (ArrayBuffer.isView(payload)) {
      return payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength);
    }
    if (payload instanceof Blob) {
      if (typeof payload.arrayBuffer === 'function') return payload.arrayBuffer();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('读取音频帧失败'));
        reader.readAsArrayBuffer(payload);
      });
    }
    throw new Error('无法识别服务端音频帧');
  };

  const updateReceiveStats = (sourceData) => {
    let peak = 0;
    for (let i = 0; i < sourceData.length; i += 1) {
      const value = Math.abs(sourceData[i]);
      if (value > peak) peak = value;
    }
    state.rxBytes += sourceData.byteLength;
    state.rxPeak = Math.max(state.rxPeak * 0.82, peak / 32768);
    const now = Date.now();
    if (now - state.rxLastUpdate < 250) return;
    state.rxLastUpdate = now;
    const el = q('#ufi_intercom_audio_status');
    if (!el) return;
    const level = Math.round(state.rxPeak * 100);
    el.textContent = `已接收 ${(state.rxBytes / 1024).toFixed(1)} KB · 输入音量 ${level}%`;
    el.dataset.tone = level > 0 ? 'good' : 'warn';
  };

  const playPCM = async (payload) => {
    if (state.mode !== 'LISTEN' || !state.connected) return;
    const arrayBuffer = await toArrayBuffer(payload);
    if (arrayBuffer.byteLength < 2) return;
    const context = await ensureAudio();
    const sourceData = new Int16Array(arrayBuffer);
    updateReceiveStats(sourceData);
    const buffer = context.createBuffer(1, sourceData.length, 16000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < sourceData.length; i += 1) channel[i] = sourceData[i] / 32768;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(state.playbackGain || context.destination);
    const now = context.currentTime;
    if (state.nextPlayTime < now || state.nextPlayTime > now + 0.6) state.nextPlayTime = now + 0.08;
    source.start(state.nextPlayTime);
    state.nextPlayTime += buffer.duration;
  };

  const requestMicrophone = (constraints) => {
    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }
    const legacy = navigator.getUserMedia
      || navigator.webkitGetUserMedia
      || navigator.mozGetUserMedia
      || navigator.msGetUserMedia;
    if (legacy) {
      return new Promise((resolve, reject) => legacy.call(navigator, constraints, resolve, reject));
    }
    const reason = window.isSecureContext
      ? '当前浏览器/WebView 未提供麦克风接口'
      : '当前页面不是安全环境，浏览器已禁用麦克风；请使用 HTTPS 或允许录音的 WebView';
    const error = new Error(reason);
    error.name = 'MediaDevicesUnavailable';
    return Promise.reject(error);
  };

  const sendSystemRecording = async (file) => {
    if (!file) {
      state.systemRecordingPending = false;
      setStatus('已取消系统录音');
      return;
    }
    state.busy = true;
    render();
    try {
      await ensureRecordingConnection();
      setStatus('正在解析系统录音…', 'warn');
      const context = await ensureAudio();
      const fileBuffer = await toArrayBuffer(file);
      const audioBuffer = await new Promise((resolve, reject) => {
        context.decodeAudioData(fileBuffer.slice(0), resolve, reject);
      });
      const maxSamples = 5 * 60 * 16000;
      const totalSamples = Math.min(Math.floor(audioBuffer.duration * 16000), maxSamples);
      if (!totalSamples) throw new Error('系统录音中没有有效音频');
      if (Math.floor(audioBuffer.duration * 16000) > maxSamples) {
        createToast('录音超过 5 分钟，只发送前 5 分钟', 'pink', 5000);
      }

      const channels = [];
      let sourcePeak = 0;
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
        const samples = audioBuffer.getChannelData(channel);
        channels.push(samples);
        for (let i = 0; i < samples.length; i += 32) {
          sourcePeak = Math.max(sourcePeak, Math.abs(samples[i]));
        }
      }
      if (sourcePeak < 0.0005) throw new Error('系统录音内容为静音，请检查录音器麦克风权限');
      const sendGain = Math.min(3, 0.85 / sourcePeak);
      setMode('TALK');
      await waitForServerMode('TALK', 4000);
      const startedAt = performance.now();
      for (let offset = 0; offset < totalSamples; offset += 320) {
        if (!state.connected || state.socket?.readyState !== WebSocket.OPEN) {
          throw new Error('发送过程中连接已断开');
        }
        const count = Math.min(320, totalSamples - offset);
        const pcm = new Int16Array(count);
        for (let i = 0; i < count; i += 1) {
          const sourcePosition = (offset + i) * audioBuffer.sampleRate / 16000;
          const index = Math.floor(sourcePosition);
          const next = Math.min(index + 1, audioBuffer.length - 1);
          const fraction = sourcePosition - index;
          let sample = 0;
          for (const channel of channels) {
            sample += channel[index] + (channel[next] - channel[index]) * fraction;
          }
          sample = sample / channels.length * sendGain;
          pcm[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
        }
        while (state.socket.bufferedAmount > 256 * 1024) await wait(10);
        state.socket.send(pcm.buffer);
        const targetTime = startedAt + (offset + count) / 16;
        const remaining = targetTime - performance.now();
        if (remaining > 1) await wait(remaining);
        if (offset % 16000 < 320) {
          setStatus(`正在发送系统录音 ${Math.floor(offset / 16000) + 1}/${Math.ceil(totalSamples / 16000)} 秒`, 'good');
        }
      }
      await wait(120);
      setMode('LISTEN');
      createToast('系统录音发送完成', 'green');
    } catch (error) {
      if (state.connected) setMode('LISTEN');
      createToast(`系统录音处理失败：${error?.message || error}`, 'red', 7000);
    } finally {
      state.systemRecordingPending = false;
      state.busy = false;
      if (state.connected) setStatus('已连接 · 正在收听', 'good');
      render();
    }
  };

  const sendMicrophonePCM = (samples, inputRate) => {
    if (!state.micResample) state.micResample = { pending: [], phase: 0 };
    const resample = state.micResample;
    const ratio = inputRate / 16000;
    while (resample.phase < samples.length) {
      const index = Math.floor(resample.phase);
      const next = Math.min(index + 1, samples.length - 1);
      const fraction = resample.phase - index;
      const value = samples[index] + (samples[next] - samples[index]) * fraction;
      resample.pending.push(Math.max(-32768, Math.min(32767, Math.round(value * 32767))));
      resample.phase += ratio;
    }
    resample.phase -= samples.length;
    while (resample.pending.length >= 320) {
      const pcm = new Int16Array(resample.pending.splice(0, 320));
      if (state.mode === 'TALK' && state.socket?.readyState === WebSocket.OPEN) {
        state.socket.send(pcm.buffer);
      }
    }
  };

  const ensureMicrophone = async () => {
    if (state.worklet && state.micStream) return;
    const context = await ensureAudio();
    const stream = await requestMicrophone({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    state.micStream = stream;
    state.micSource = context.createMediaStreamSource(stream);
    state.micResample = { pending: [], phase: 0 };
    const silent = context.createGain();
    silent.gain.value = 0;
    state.micSilentGain = silent;

    if (!context.audioWorklet || typeof window.AudioWorkletNode !== 'function') {
      const processor = context.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (event) => {
        sendMicrophonePCM(event.inputBuffer.getChannelData(0), context.sampleRate);
      };
      state.worklet = processor;
      state.micSource.connect(processor);
      processor.connect(silent).connect(context.destination);
      return;
    }
    const processorSource = `
class IntercomPCM extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = [];
    this.phase = 0;
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    const ratio = sampleRate / 16000;
    while (this.phase < input.length) {
      const index = Math.floor(this.phase);
      const next = Math.min(index + 1, input.length - 1);
      const fraction = this.phase - index;
      const value = input[index] + (input[next] - input[index]) * fraction;
      this.pending.push(Math.max(-32768, Math.min(32767, Math.round(value * 32767))));
      this.phase += ratio;
    }
    this.phase -= input.length;
    while (this.pending.length >= 320) {
      const pcm = new Int16Array(this.pending.splice(0, 320));
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor('intercom-pcm', IntercomPCM);`;
    const url = URL.createObjectURL(new Blob([processorSource], { type: 'text/javascript' }));
    try {
      await context.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    state.worklet = new AudioWorkletNode(context, 'intercom-pcm');
    state.micSource.connect(state.worklet);
    state.worklet.connect(silent).connect(context.destination);
    state.worklet.port.onmessage = (event) => {
      if (state.mode === 'TALK' && state.socket?.readyState === WebSocket.OPEN) {
        state.socket.send(event.data);
      }
    };
  };

  const releaseAudio = async () => {
    state.worklet?.disconnect();
    state.micSource?.disconnect();
    state.micSilentGain?.disconnect();
    if (state.worklet && 'onaudioprocess' in state.worklet) state.worklet.onaudioprocess = null;
    state.micStream?.getTracks().forEach((track) => track.stop());
    state.worklet = null;
    state.micSource = null;
    state.micSilentGain = null;
    state.micStream = null;
    state.micResample = null;
    if (state.audioContext) {
      await state.audioContext.close().catch(() => { });
      state.audioContext = null;
    }
    state.playbackGain = null;
    state.nextPlayTime = 0;
  };

  const setMode = (mode) => {
    if (state.socket?.readyState !== WebSocket.OPEN || state.mode === mode) return;
    state.mode = mode;
    state.nextPlayTime = 0;
    state.socket.send(JSON.stringify({ type: 'mode', mode }));
    render();
  };

  const waitForServerMode = async (mode, timeout = 3000) => {
    const deadline = Date.now() + timeout;
    while (state.connected && Date.now() < deadline) {
      if (state.serverMode === mode) return;
      await wait(20);
    }
    throw new Error(`服务端切换到 ${mode} 模式超时`);
  };

  const openSystemRecorder = (event) => {
    event?.preventDefault?.();
    if (!state.connected || state.busy) return;
    const captureInput = q('#ufi_intercom_capture_input');
    if (!captureInput) {
      createToast('当前环境无法调用系统录音器', 'red');
      return;
    }
    captureInput.value = '';
    state.systemRecordingPending = true;
    setStatus('请在系统录音器中完成录音…', 'warn');
    captureInput.click();
  };

  const beginTalk = async (event) => {
    event.preventDefault();
    if (!state.connected || state.pressed) return;
    state.pressed = true;
    try {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      await ensureMicrophone();
      if (state.pressed && state.connected) setMode('TALK');
    } catch (error) {
      state.pressed = false;
      createToast(
        error?.name === 'NotAllowedError' ? '请允许网页使用麦克风' : `麦克风启动失败：${error?.message || error}`,
        'red',
        6000
      );
    }
  };

  const endTalk = (event) => {
    event?.preventDefault?.();
    state.pressed = false;
    if (state.connected) setMode('LISTEN');
  };

  const disconnect = () => {
    state.pressed = false;
    state.mode = 'LISTEN';
    state.serverMode = 'LISTEN';
    state.rxBytes = 0;
    state.rxPeak = 0;
    state.rxLastUpdate = 0;
    const socket = state.socket;
    state.socket = null;
    state.connected = false;
    state.connecting = false;
    if (socket && socket.readyState < WebSocket.CLOSING) socket.close();
    releaseAudio();
    setStatus('未连接');
    render();
  };

  const connect = async (automatic = false) => {
    if (state.connected && state.socket?.readyState === WebSocket.OPEN) {
      if (automatic) return;
      disconnect();
      return;
    }
    if (state.connecting) return;
    if (!state.token) await refreshService();
    if (!state.token) {
      createToast('未读取到自动连接 token，请重新安装服务端', 'red');
      return;
    }
    try {
      state.connecting = true;
      await ensureAudio();
      setStatus(automatic ? '录音完成，正在恢复连接…' : '正在连接…', 'warn');
      const host = location.hostname || '127.0.0.1';
      const socket = new WebSocket(`ws://${host}:${DEFAULT_PORT}/ws`);
      socket.binaryType = 'arraybuffer';
      state.socket = socket;
      socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', token: state.token }));
      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') {
          playPCM(event.data).catch((error) => {
            setStatus(`播放失败：${error?.message || error}`, 'bad');
          });
          return;
        }
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.type === 'ready') {
          state.connecting = false;
          state.connected = true;
          state.mode = 'LISTEN';
          state.serverMode = 'LISTEN';
          setStatus('已连接 · 正在收听', 'good');
          render();
        } else if (message.type === 'mode') {
          state.mode = message.mode;
          state.serverMode = message.mode;
          setStatus(message.mode === 'TALK' ? '已连接 · 正在讲话' : '已连接 · 正在收听', 'good');
          render();
        } else if (message.type === 'error') {
          createToast(message.message || '服务端错误', 'red', 6000);
          setStatus(message.message || '连接失败', 'bad');
        } else if (message.type === 'warning') {
          createToast(message.message || '音频采集警告', 'pink', 6000);
          const audioStatus = q('#ufi_intercom_audio_status');
          if (audioStatus) {
            audioStatus.textContent = message.message;
            audioStatus.dataset.tone = 'warn';
          }
        }
      };
      socket.onerror = () => setStatus('连接失败，请检查服务状态和端口', 'bad');
      socket.onclose = () => {
        if (state.socket === socket) {
          state.socket = null;
          state.connecting = false;
          state.connected = false;
          state.mode = 'LISTEN';
          state.serverMode = 'LISTEN';
          setStatus(
            state.systemRecordingPending
              ? '录音器占用前台，返回后将自动重连并发送'
              : '连接已断开',
            state.systemRecordingPending ? 'warn' : 'bad'
          );
          render();
        }
      };
    } catch (error) {
      state.connecting = false;
      setStatus('音频初始化失败', 'bad');
      createToast(`连接失败：${error?.message || error}`, 'red');
    }
  };

  const ensureRecordingConnection = async () => {
    if (state.connected && state.socket?.readyState === WebSocket.OPEN) return;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const stale = state.socket;
      if (stale && stale.readyState !== WebSocket.CLOSED) {
        stale.close();
        await wait(150);
      }
      state.socket = null;
      state.connected = false;
      state.connecting = false;
      await connect(true);
      const deadline = Date.now() + 6000;
      while (Date.now() < deadline) {
        if (state.connected && state.socket?.readyState === WebSocket.OPEN) return;
        await wait(100);
      }
      setStatus(`恢复连接失败，正在重试 ${attempt}/3…`, 'warn');
    }
    throw new Error('录音完成后无法恢复 WebSocket 连接，请检查服务是否仍在运行');
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
#${MODAL_NAME} .ufi-intercom { font-size:.74rem; line-height:1.55; }
#${MODAL_NAME} .ufi-card { padding:14px; border:1px solid rgba(255,255,255,.12); border-radius:14px; background:rgba(255,255,255,.045); margin-bottom:12px; }
#${MODAL_NAME} .ufi-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
#${MODAL_NAME} .ufi-title { font-weight:700; font-size:.82rem; }
#${MODAL_NAME} [data-tone="good"] { color:#64e6a4; }
#${MODAL_NAME} [data-tone="warn"] { color:#ffd166; }
#${MODAL_NAME} [data-tone="bad"] { color:#ff7777; }
#${MODAL_NAME} input { box-sizing:border-box; width:100%; min-width:0; }
#${MODAL_NAME} .ufi-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
#${MODAL_NAME} .ufi-talk { width:190px; height:190px; margin:18px auto 8px; border:0; border-radius:50%; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:5px; color:white; background:radial-gradient(circle at 35% 28%,#42b8ff,#1765c7 62%,#0b397e); box-shadow:0 12px 35px rgba(18,114,218,.38),inset 0 0 0 7px rgba(255,255,255,.1); touch-action:none; user-select:none; transition:transform .12s,filter .12s; }
#${MODAL_NAME} .ufi-talk strong { font-size:1.08rem; }
#${MODAL_NAME} .ufi-talk span { font-size:.65rem; opacity:.82; }
#${MODAL_NAME} .ufi-talk.talking { transform:scale(.94); background:radial-gradient(circle at 35% 28%,#ff8178,#d63131 62%,#831515); box-shadow:0 8px 28px rgba(220,45,45,.48),inset 0 0 0 7px rgba(255,255,255,.12); }
#${MODAL_NAME} .ufi-talk:disabled { filter:grayscale(.8); opacity:.52; }
#${MODAL_NAME} .ufi-tip { opacity:.7; font-size:.66rem; margin-top:8px; }
@media(max-width:520px) { #${MODAL_NAME} .ufi-talk { width:164px;height:164px; } }
`;
    document.head.appendChild(style);
  };

  const openModal = async () => {
    ensureStyle();
    disconnect();
    document.getElementById(MODAL_NAME)?.remove();
    const { id, el } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      contentStyle: "max-height:80vh;",
      maxWidth: '620px',
      showConfirm: false,
      onClose: () => {
        disconnect();
        return true;
      },
      content: `
        <div class="ufi-intercom">
          <div class="ufi-card">
            <div class="ufi-head">
              <span class="ufi-title">服务端</span>
              <span id="ufi_intercom_service_status">检测中…</span>
            </div>
            <div class="ufi-actions">
              <button id="ufi_intercom_install">安装/升级</button>
              <button id="ufi_intercom_service_toggle">启动</button>
              <button id="ufi_intercom_restart">重启</button>
              <button id="ufi_intercom_boot">开机自启</button>
              <button id="ufi_intercom_uninstall">卸载</button>
            </div>
            <div class="ufi-tip">连接 token 会在每次安装或升级时自动生成，并通过已鉴权的 root Shell API 读取。</div>
          </div>
          <div class="ufi-card" style="text-align:center;">
            <div class="ufi-head">
              <span class="ufi-title">半双工对讲</span>
              <span id="ufi_intercom_connection">未连接</span>
            </div>
            <button id="ufi_intercom_talk" class="ufi-talk" disabled>
              <strong>按住讲话</strong>
              <span>当前正在收听设备</span>
            </button>
            <input id="ufi_intercom_capture_input" type="file" accept="audio/*" capture="microphone" hidden>
            <button id="ufi_intercom_connect">连接</button>
            <div id="ufi_intercom_audio_status" class="ufi-tip">连接后这里会显示接收数据量和输入音量</div>
            <div class="ufi-tip">HTTPS/WebView：按住实时讲话；普通 HTTP：点击按钮调用系统录音器，完成后自动处理并发送。仅允许一个浏览器连接。</div>
          </div>
        </div>`,
    });
    el.querySelector('#ufi_intercom_install').onclick = chooseInstallMethod;
    el.querySelector('#ufi_intercom_service_toggle').onclick = toggleService;
    el.querySelector('#ufi_intercom_restart').onclick = () => serviceAction('restart');
    el.querySelector('#ufi_intercom_uninstall').onclick = uninstall;
    el.querySelector('#ufi_intercom_connect').onclick = () => connect(false);
    el.querySelector('#ufi_intercom_boot').onclick = async () => {
      if (!state.installed) {
        createToast('请先安装服务端二进制', 'red');
        return;
      }
      const enable = !el.querySelector('#ufi_intercom_boot').dataset.enabled;
      const success = await toggleBootUp(enable);
      if (success) {
        el.querySelector('#ufi_intercom_boot').dataset.enabled = enable ? '1' : '';
        el.querySelector('#ufi_intercom_boot').style.background = enable ? 'var(--dark-btn-color-active)' : '';
        createToast(`开机自启已${enable ? '启用' : '禁用'}`, 'green');
      } else {
        createToast('设置开机自启失败', 'red');
      }
    }
    const captureInput = el.querySelector('#ufi_intercom_capture_input');
    captureInput.onchange = async () => {
      const file = captureInput.files?.[0];
      captureInput.value = '';
      await sendSystemRecording(file);
    };
    const talk = el.querySelector('#ufi_intercom_talk');
    if (shouldUseSystemRecorder()) {
      // HTTP 下必须像参考插件一样从 click 直接唤起系统录音器。
      // 不绑定 pointerup，避免录音返回后误把 TALK 立即切回 LISTEN。
      talk.addEventListener('click', openSystemRecorder);
    } else {
      talk.addEventListener('pointerdown', beginTalk);
      talk.addEventListener('pointerup', endTalk);
      talk.addEventListener('pointercancel', endTalk);
      talk.addEventListener('lostpointercapture', endTalk);
    }
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
