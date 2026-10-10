//<script>
(async () => {
  const TITLE = '远程语音音频播放';
  const MODAL_NAME = 'kano_beep_custom_audio_modal';
  const STYLE_ID = 'kano_beep_custom_audio_style';
  const REMOTE_FILE_NAME = 'kano_voice_recording.wav';
  const REMOTE_UPLOAD_DIR = '/data/data/com.minikano.f50_sms/files/uploads';
  const REMOTE_URL = `/uploads/${REMOTE_FILE_NAME}`;
  const REMOTE_PLAY_PATH = `/${REMOTE_FILE_NAME}`;
  const MAX_RECORDING_MS = 5 * 60 * 1000;

  const state = {
    busy: false,
    isPlaying: false,
    playingPath: '',
    lastPlayedPath: REMOTE_PLAY_PATH,
    lastPlayedLabel: '上次录音',
    hasPlayedOnce: false,
    isRecording: false,
    status: '请选择音频文件或开始录音',
    statusKind: 'idle',
    startedAt: 0,
    timer: null,
    maxTimer: null,
    capture: null,
  };

  const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
  const shellQuote = (value) => `'${String(value).replace(/'/g, `'\\''`)}'`;

  const hasDirectMicrophoneApi = () => Boolean(
    navigator.mediaDevices?.getUserMedia
    || navigator.getUserMedia
    || navigator.webkitGetUserMedia
    || navigator.mozGetUserMedia
  );

  const requestMicrophone = (constraints) => {
    if (navigator.mediaDevices?.getUserMedia) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }
    const legacyGetUserMedia = navigator.getUserMedia
      || navigator.webkitGetUserMedia
      || navigator.mozGetUserMedia;
    if (!legacyGetUserMedia) return Promise.reject(new Error('MIC_API_UNAVAILABLE'));
    return new Promise((resolve, reject) => {
      legacyGetUserMedia.call(navigator, constraints, resolve, reject);
    });
  };

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_NAME} .voice-wrap {
        width:100%; box-sizing:border-box;
        display:flex; flex-direction:column; gap:12px;
      }
      #${MODAL_NAME} .voice-tip {
        padding:12px 14px; border-radius:14px; font-size:clamp(12px,.68rem,14px); line-height:1.7;
        background:linear-gradient(135deg,rgba(77,168,255,.12),rgba(125,103,255,.07));
        border:1px solid rgba(102,195,255,.2);
      }
      #${MODAL_NAME} .voice-status-card {
        display:flex; align-items:center; gap:13px; min-height:58px; padding:12px 14px;
        border-radius:14px; background:rgba(255,255,255,.055); border:1px solid rgba(255,255,255,.08);
      }
      #${MODAL_NAME} .voice-dot {
        width:10px; height:10px; flex:0 0 auto; border-radius:50%; background:#ffd08a;
        box-shadow:0 0 0 5px rgba(255,208,138,.1);
      }
      #${MODAL_NAME} .voice-dot.recording {
        background:#ff6f7d; box-shadow:0 0 0 5px rgba(255,111,125,.13);
        animation:kano-voice-pulse 1s ease-in-out infinite;
      }
      #${MODAL_NAME} .voice-dot.playing {
        background:#75e99b; box-shadow:0 0 0 5px rgba(117,233,155,.12);
      }
      #${MODAL_NAME} .voice-status-copy { min-width:0; }
      #${MODAL_NAME} .voice-status { font-size:clamp(13px,.72rem,15px); font-weight:700; line-height:1.5; }
      #${MODAL_NAME} .voice-file { margin-top:2px; font-size:11px; opacity:.6; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #${MODAL_NAME} .voice-panel {
        padding:14px; border-radius:14px; background:rgba(255,255,255,.035);
        border:1px solid rgba(255,255,255,.075); display:flex; flex-direction:column; gap:11px;
      }
      #${MODAL_NAME} .voice-panel-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
      #${MODAL_NAME} .voice-panel-title { font-size:13px; font-weight:800; }
      #${MODAL_NAME} .voice-panel-note { font-size:11px; opacity:.58; text-align:right; }
      #${MODAL_NAME} button {
        min-height:29px; padding:4px 10px !important; box-sizing:border-box;
        border-radius:8px; font-size:11px !important; touch-action:manipulation;
        white-space:nowrap; transition:transform .15s ease,filter .15s ease,opacity .15s ease;
      }
      #${MODAL_NAME} button:active:not(:disabled) { transform:scale(.98); }
      #${MODAL_NAME} .voice-volume-actions { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:10px; }
      #${MODAL_NAME} .voice-play-toggle { width:100%; }
      #${MODAL_NAME} .voice-play-toggle.playing { background:#9b3541 !important; }
      #${MODAL_NAME} .voice-actions { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:10px; }
      #${MODAL_NAME} .voice-record.recording { background:#a52e3d !important; }
      @keyframes kano-voice-pulse { 50% { transform:scale(1.3); opacity:.65; } }
      @media (hover:hover) {
        #${MODAL_NAME} button:hover:not(:disabled) { filter:brightness(1.1); }
      }
      @media (max-width:560px) {
        #${MODAL_NAME} .voice-wrap { gap:10px; }
        #${MODAL_NAME} .voice-tip, #${MODAL_NAME} .voice-panel, #${MODAL_NAME} .voice-status-card { border-radius:12px; }
        #${MODAL_NAME} .voice-actions { grid-template-columns:1fr; }
        #${MODAL_NAME} .voice-panel-head { align-items:flex-start; }
        #${MODAL_NAME} button { min-height:33px; padding:5px 9px !important; width:100%; }
      }
      @media (max-height:620px) {
        #${MODAL_NAME} .voice-wrap { min-height:0; }
        #${MODAL_NAME} .voice-tip { padding:9px 11px; line-height:1.55; }
        #${MODAL_NAME} .voice-panel { padding:10px; gap:8px; }
      }
      @media (max-width:360px) {
        #${MODAL_NAME} .voice-panel-note { display:none; }
        #${MODAL_NAME} .voice-panel { padding:11px; }
        #${MODAL_NAME} .voice-volume-actions { gap:8px; }
      }
    `;
    document.head.appendChild(style);
  };

  const formatDuration = (milliseconds) => {
    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const setStatus = (text, kind = 'idle') => {
    state.status = text;
    state.statusKind = kind;
    syncForm();
  };

  const setBusy = (busy) => {
    state.busy = busy;
    syncForm();
  };

  const normalizePlaybackPath = (path) => {
    let value = String(path || '').trim();
    try {
      if (/^https?:\/\//i.test(value)) value = new URL(value).pathname;
    } catch { /* keep the original path */ }
    value = value.replace(/^\/api\/uploads\//, '/').replace(/^\/uploads\//, '/');
    if (value && !value.startsWith('/')) value = `/${value}`;
    return value;
  };

  const syncForm = () => {
    const root = document.getElementById(MODAL_NAME);
    if (!root) return;
    const recordBtn = root.querySelector('#kano_voice_record_btn');
    const uploadBtn = root.querySelector('#kano_voice_upload_btn');
    const fileInput = root.querySelector('#kano_voice_file_input');
    const playToggleBtn = root.querySelector('#kano_voice_stop_btn');
    const volumeDownBtn = root.querySelector('#kano_voice_volume_down_btn');
    const volumeUpBtn = root.querySelector('#kano_voice_volume_up_btn');
    const status = root.querySelector('#kano_voice_status');
    const dot = root.querySelector('.voice-dot');

    if (recordBtn) {
      recordBtn.textContent = state.isRecording ? '停止录音并发送' : '开始录音';
      recordBtn.classList.toggle('recording', state.isRecording);
      recordBtn.disabled = state.busy;
    }
    if (uploadBtn) uploadBtn.disabled = state.busy || state.isRecording;
    if (fileInput) fileInput.disabled = state.busy || state.isRecording;
    if (playToggleBtn) {
      playToggleBtn.textContent = state.isPlaying
        ? '停止播放'
        : (state.hasPlayedOnce ? '继续播放' : '播放上次录音');
      playToggleBtn.classList.toggle('playing', state.isPlaying);
      playToggleBtn.disabled = state.busy || state.isRecording || (!state.isPlaying && !state.lastPlayedPath);
    }
    if (volumeDownBtn) volumeDownBtn.disabled = state.busy;
    if (volumeUpBtn) volumeUpBtn.disabled = state.busy;
    if (status) status.textContent = state.status;
    if (dot) {
      dot.classList.toggle('recording', state.statusKind === 'recording');
      dot.classList.toggle('playing', state.statusKind === 'playing');
    }
  };

  const postBeep = async (beep, path = REMOTE_PLAY_PATH) => {
    const res = await fetch(`${KANO_baseURL}/beep_my_device`, {
      method: 'POST',
      headers: {
        ...(common_headers || {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        beep: beep ? '1' : '0',
        path: normalizePlaybackPath(path),
      }),
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      throw new Error(typeof data === 'string' ? data : data?.error || `HTTP ${res.status}`);
    }
    return data;
  };

  const stopPlayback = async (silent = false) => {
    if (!state.isPlaying) return;
    await postBeep(false, state.playingPath || REMOTE_PLAY_PATH);
    state.isPlaying = false;
    state.playingPath = '';
    setStatus('播放已停止', 'idle');
    if (!silent) createToast('已停止播放', 'green');
  };

  const rememberPlayback = (path, label) => {
    state.isPlaying = true;
    state.playingPath = path;
    state.lastPlayedPath = path;
    state.lastPlayedLabel = label || '最近的音频';
    state.hasPlayedOnce = true;
  };

  const ensureLastPlaybackExists = async () => {
    if (state.lastPlayedPath !== REMOTE_PLAY_PATH) return;
    const target = `${REMOTE_UPLOAD_DIR}/${REMOTE_FILE_NAME}`;
    const result = await runShellWithRoot(`[ -s ${shellQuote(target)} ] && ls -l ${shellQuote(target)}`);
    if (!result?.success) {
      throw new Error('还没有可播放的历史录音，请先录音或上传音频');
    }
  };

  const togglePlayback = async () => {
    if (state.busy || state.isRecording) return;
    setBusy(true);
    try {
      if (state.isPlaying) {
        await stopPlayback();
        return;
      }
      if (!state.lastPlayedPath) {
        createToast('请先录音或上传一个音频', 'pink');
        return;
      }
      setStatus('正在恢复播放…', 'idle');
      await ensureLastPlaybackExists();
      await postBeep(true, state.lastPlayedPath);
      state.isPlaying = true;
      state.playingPath = state.lastPlayedPath;
      state.hasPlayedOnce = true;
      setStatus(`正在播放：${state.lastPlayedLabel}`, 'playing');
      createToast('已继续播放', 'green');
    } catch (error) {
      state.isPlaying = false;
      state.playingPath = '';
      setStatus('播放操作失败', 'idle');
      createToast(`播放操作失败：${error?.message || error}`, 'red', 5000);
    } finally {
      setBusy(false);
    }
  };

  const adjustAlarmVolume = async (direction) => {
    if (state.busy) return;
    const adjustment = direction === 'up' ? 'raise' : 'lower';
    setBusy(true);
    try {
      const result = await runShellWithRoot(`cmd media_session volume --stream 4 --adj ${adjustment} >/dev/null 2>&1 || media volume --stream 4 --adj ${adjustment} >/dev/null 2>&1`);
      if (!result?.success) {
        throw new Error(String(result?.content || '设备不支持音量调节').trim());
      }
      createToast(direction === 'up' ? '闹钟音量已调高' : '闹钟音量已调低', 'green');
    } catch (error) {
      createToast(`音量调节失败：${error?.message || error}`, 'red', 5000);
    } finally {
      setBusy(false);
    }
  };

  const encodeWav = (chunks, sampleRate, sampleCount) => {
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);
    const writeText = (offset, text) => {
      for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
    };
    writeText(0, 'RIFF');
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeText(8, 'WAVE');
    writeText(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(36, 'data');
    view.setUint32(40, sampleCount * 2, true);

    let offset = 44;
    chunks.forEach((chunk) => {
      for (let i = 0; i < chunk.length; i += 1) {
        const sample = Math.max(-1, Math.min(1, chunk[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    });
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const releaseCapture = async () => {
    const capture = state.capture;
    state.capture = null;
    if (!capture) return;
    capture.processor.onaudioprocess = null;
    try { capture.source.disconnect(); } catch { /* already disconnected */ }
    try { capture.processor.disconnect(); } catch { /* already disconnected */ }
    capture.stream.getTracks().forEach((track) => track.stop());
    try { await capture.context.close(); } catch { /* already closed */ }
  };

  const uploadRecording = async (blob) => {
    const file = new File([blob], REMOTE_FILE_NAME, {
      type: blob.type || 'application/octet-stream',
    });
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${KANO_baseURL}/upload_img`, {
      method: 'POST',
      headers: common_headers,
      body: formData,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.url) {
      throw new Error(data?.error || `上传失败（HTTP ${res.status}）`);
    }

    const matched = String(data.url).match(/\/uploads\/([A-Za-z0-9_.-]+)(?:[?#].*)?$/);
    if (!matched) throw new Error('上传成功，但无法识别临时文件名');
    const source = `${REMOTE_UPLOAD_DIR}/${matched[1]}`;
    const target = `${REMOTE_UPLOAD_DIR}/${REMOTE_FILE_NAME}`;
    const result = await runShellWithRoot(`mkdir -p ${shellQuote(REMOTE_UPLOAD_DIR)} && if [ ${shellQuote(source)} != ${shellQuote(target)} ]; then mv -f ${shellQuote(source)} ${shellQuote(target)}; fi && [ -s ${shellQuote(target)} ] && ls -l ${shellQuote(target)}`);
    if (!result?.success) {
      throw new Error(String(result?.content || '覆盖远端录音文件失败').trim());
    }
    return REMOTE_PLAY_PATH;
  };

  const uploadAndPlayFile = async (file) => {
    if (!file || state.busy || state.isRecording) return;
    const looksLikeAudio = String(file.type || '').startsWith('audio/')
      || /\.(aac|amr|flac|m4a|mp3|mp4|oga|ogg|opus|wav|webm|3gp)$/i.test(String(file.name || ''));
    if (!looksLikeAudio) {
      createToast('请选择音频文件', 'red');
      return;
    }
    if (typeof uploadFileKano !== 'function') {
      createToast('未找到 uploadFileKano()', 'red');
      return;
    }

    setBusy(true);
    setStatus(`正在上传：${file.name}`, 'idle');
    try {
      if (state.isPlaying) await stopPlayback(true);
      const uploadedName = await uploadFileKano(file);
      if (!uploadedName) throw new Error('文件上传失败');
      const remotePath = normalizePlaybackPath(uploadedName);
      setStatus('上传完成，正在推送播放…', 'idle');
      await postBeep(true, remotePath);
      rememberPlayback(remotePath, file.name);
      setStatus(`正在播放：${file.name}`, 'playing');
      createToast('音频已上传并开始播放', 'green', 4000);
    } catch (error) {
      state.isPlaying = false;
      state.playingPath = '';
      setStatus('上传或播放失败', 'idle');
      createToast(`操作失败：${error?.message || error}`, 'red', 6000);
    } finally {
      setBusy(false);
    }
  };

  const readFileBuffer = (file) => {
    if (typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('读取录音文件失败'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleSystemRecording = async (file) => {
    if (!file || state.busy) {
      if (!file) setStatus('已取消录音', 'idle');
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      createToast('当前浏览器无法处理系统录音', 'red', 5000);
      return;
    }

    setBusy(true);
    setStatus('正在处理系统录音…', 'idle');
    let context = null;
    try {
      if (state.isPlaying) await stopPlayback(true);
      context = new AudioContextClass();
      const fileBuffer = await readFileBuffer(file);
      let recordingBlob = file;
      let durationText = '';
      try {
        const audioBuffer = await new Promise((resolve, reject) => {
          context.decodeAudioData(fileBuffer.slice(0), resolve, reject);
        });
        const mono = new Float32Array(audioBuffer.length);
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
          const samples = audioBuffer.getChannelData(channel);
          for (let i = 0; i < samples.length; i += 1) mono[i] += samples[i] / audioBuffer.numberOfChannels;
        }
        recordingBlob = encodeWav([mono], audioBuffer.sampleRate, mono.length);
        durationText = `（${formatDuration(audioBuffer.duration * 1000)}）`;
      } catch (decodeError) {
        console.warn('当前 WebView 无法解码系统录音，将保留原格式上传：', decodeError);
        setStatus('当前格式无法转码，正在以原格式上传…', 'idle');
      }
      setStatus('正在上传并覆盖上次录音…', 'idle');
      const remotePath = await uploadRecording(recordingBlob);
      setStatus('上传完成，正在推送播放…', 'idle');
      await postBeep(true, remotePath);
      rememberPlayback(remotePath, `系统录音${durationText}`);
      setStatus(`正在播放刚才的录音${durationText}`, 'playing');
      createToast('录音已上传并开始播放', 'green', 4000);
    } catch (error) {
      state.isPlaying = false;
      state.playingPath = '';
      setStatus('系统录音处理失败', 'idle');
      createToast(`录音处理失败：${error?.message || error}`, 'red', 6000);
    } finally {
      try { await context?.close(); } catch { /* already closed */ }
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (state.busy || state.isRecording) return;
    if (!hasDirectMicrophoneApi()) {
      const captureInput = document.getElementById('kano_voice_capture_input');
      if (!captureInput) {
        createToast('无法调用系统录音器', 'red', 5000);
        return;
      }
      captureInput.value = '';
      setStatus('请在系统录音器中完成录音…', 'recording');
      captureInput.click();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      createToast('当前浏览器不支持音频采集', 'red', 5000);
      return;
    }

    setBusy(true);
    setStatus('正在申请麦克风权限…', 'idle');
    try {
      if (state.isPlaying) await stopPlayback(true);
      const stream = await requestMicrophone({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      const context = new AudioContextClass();
      await context.resume();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const chunks = [];
      let sampleCount = 0;
      processor.onaudioprocess = (event) => {
        if (!state.isRecording) return;
        const chunk = new Float32Array(event.inputBuffer.getChannelData(0));
        chunks.push(chunk);
        sampleCount += chunk.length;
      };
      source.connect(processor);
      processor.connect(context.destination);
      state.capture = {
        stream, context, source, processor, chunks,
        getSampleCount: () => sampleCount,
      };
      state.isRecording = true;
      state.startedAt = Date.now();
      state.timer = setInterval(() => {
        setStatus(`正在录音 ${formatDuration(Date.now() - state.startedAt)}`, 'recording');
      }, 500);
      state.maxTimer = setTimeout(() => {
        if (state.isRecording) {
          createToast('已达到 5 分钟上限，正在自动发送', 'pink', 4000);
          stopRecordingAndSend();
        }
      }, MAX_RECORDING_MS);
      setStatus('正在录音 00:00', 'recording');
    } catch (error) {
      await releaseCapture();
      const denied = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError';
      setStatus(denied ? '未获得麦克风权限' : '录音启动失败', 'idle');
      createToast(denied ? '请允许网页使用麦克风后重试' : `录音失败：${error?.message || error}`, 'red', 5000);
    } finally {
      setBusy(false);
    }
  };

  const stopRecordingAndSend = async () => {
    if (state.busy || !state.isRecording || !state.capture) return;
    const capture = state.capture;
    state.isRecording = false;
    clearInterval(state.timer);
    clearTimeout(state.maxTimer);
    state.timer = null;
    state.maxTimer = null;
    setBusy(true);
    setStatus('正在生成 WAV 音频…', 'idle');
    try {
      await wait(80);
      await releaseCapture();
      const sampleCount = capture.getSampleCount();
      if (!sampleCount) throw new Error('没有录到有效音频');
      const recordingDuration = sampleCount / capture.context.sampleRate * 1000;
      const blob = encodeWav(capture.chunks, capture.context.sampleRate, sampleCount);
      setStatus('正在上传并覆盖上次录音…', 'idle');
      const remotePath = await uploadRecording(blob);
      setStatus('上传完成，正在推送播放…', 'idle');
      await postBeep(true, remotePath);
      rememberPlayback(remotePath, `录音 ${formatDuration(recordingDuration)}`);
      setStatus(`正在播放刚才的录音（${formatDuration(recordingDuration)}）`, 'playing');
      createToast('录音已上传并开始播放', 'green', 4000);
    } catch (error) {
      state.isPlaying = false;
      state.playingPath = '';
      setStatus('发送失败，请重新录音', 'idle');
      createToast(`发送失败：${error?.message || error}`, 'red', 6000);
    } finally {
      capture.chunks.length = 0;
      setBusy(false);
    }
  };

  const openModal = () => {
    ensureStyle();
    document.getElementById(MODAL_NAME)?.remove();
    const { id } = createModal({
      name: MODAL_NAME,
      title: TITLE,
      maxWidth: '680px',
      contentStyle: 'max-height:78vh;overflow-y:auto;',
      showConfirm: false,
      onClose: () => {
        if (!state.isRecording && !state.busy) return true;
        createToast(state.isRecording ? '请先停止录音' : '操作完成后即可关闭', 'pink');
        return false;
      },
      content: `
        <div class="voice-wrap">
          <div class="voice-tip">
            可以直接选择本地音频上传播放；也可以点击“开始录音”并允许麦克风权限，再次点击后自动上传播放。
          </div>
          <div class="voice-status-card">
            <span class="voice-dot"></span>
            <div class="voice-status-copy">
              <div class="voice-status" id="kano_voice_status"></div>
              <div class="voice-file">远端文件：${REMOTE_URL}</div>
            </div>
          </div>
          <div class="voice-panel">
            <div class="voice-panel-head">
              <span class="voice-panel-title">播放控制</span>
              <span class="voice-panel-note">调节设备闹钟音量</span>
            </div>
            <div class="voice-volume-actions">
              <button id="kano_voice_volume_down_btn">音量－</button>
              <button id="kano_voice_volume_up_btn">音量＋</button>
            </div>
            <button class="voice-play-toggle" id="kano_voice_stop_btn">继续播放</button>
          </div>
          <div class="voice-panel">
            <div class="voice-panel-head">
              <span class="voice-panel-title">发送音频</span>
              <span class="voice-panel-note">上传文件或现场录音</span>
            </div>
            <input id="kano_voice_file_input" type="file" accept="audio/*" hidden>
            <input id="kano_voice_capture_input" type="file" accept="audio/*" capture="microphone" hidden>
            <div class="voice-actions">
              <button id="kano_voice_upload_btn">选择音频播放</button>
              <button class="voice-record" id="kano_voice_record_btn">开始录音</button>
            </div>
          </div>
        </div>
      `,
    });

    showModal(id);
    syncForm();
    const root = document.getElementById(MODAL_NAME);
    root?.querySelector('#kano_voice_record_btn')?.addEventListener('click', () => {
      if (state.isRecording) stopRecordingAndSend();
      else startRecording();
    });
    const fileInput = root?.querySelector('#kano_voice_file_input');
    root?.querySelector('#kano_voice_upload_btn')?.addEventListener('click', () => {
      if (!state.busy && !state.isRecording) fileInput?.click();
    });
    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      await uploadAndPlayFile(file);
    });
    const captureInput = root?.querySelector('#kano_voice_capture_input');
    captureInput?.addEventListener('change', async () => {
      const file = captureInput.files?.[0];
      captureInput.value = '';
      await handleSystemRecording(file);
    });
    root?.querySelector('#kano_voice_volume_down_btn')?.addEventListener('click', async () => {
      await adjustAlarmVolume('down');
    });
    root?.querySelector('#kano_voice_volume_up_btn')?.addEventListener('click', async () => {
      await adjustAlarmVolume('up');
    });
    root?.querySelector('#kano_voice_stop_btn')?.addEventListener('click', async () => {
      await togglePlayback();
    });
  };

  const main = async () => {
    while (!document.querySelector('.actions-buttons')) await wait();
    if (document.getElementById('kano_beep_custom_audio_entry_btn')) return;
    const btn = document.createElement('button');
    btn.id = 'kano_beep_custom_audio_entry_btn';
    btn.textContent = TITLE;
    btn.onclick = openModal;
    document.querySelector('.actions-buttons')?.appendChild(btn);
  };

  await main();
})();
//</script>
