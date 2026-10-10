//<script>
/**
MIT License

Copyright (c) [2020] [pkjy]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
        typeof define === 'function' && define.amd ? define(factory) :
            (global = global || self, global.PCMPlayer = factory());
}(this, (function () {
    'use strict';

    class PCMPlayer {
        constructor(option) {
            this.init(option);
        }

        init(option) {
            const defaultOption = {
                inputCodec: 'Int16', // 传入的数据是采用多少位编码，默认16位
                channels: 1, // 声道数
                sampleRate: 8000, // 采样率 单位Hz
                flushTime: 10, // 调度周期，单位 ms
                minBufferDuration: 0.02, // 至少积累20ms再提交给WebAudio
                scheduleAheadTime: 0.04, // 预调度40ms，抵抗短暂的主线程/网络抖动
                fftSize: 2048 // analyserNode fftSize 
            };

            this.option = Object.assign({}, defaultOption, option); // 实例最终配置参数
            this.samples = new Float32Array(); // 样本存放区域
            this.interval = setInterval(this.flush.bind(this), this.option.flushTime);
            this.convertValue = this.getConvertValue();
            this.typedArray = this.getTypedArray();
            this.initAudioContext();
            this.bindAudioContextEvent();
        }

        getConvertValue() {
            // 根据传入的目标编码位数
            // 选定转换数据所需要的基本值
            const inputCodecs = {
                'Int8': 128,
                'Int16': 32768,
                'Int32': 2147483648,
                'Float32': 1
            };
            if (!inputCodecs[this.option.inputCodec]) throw new Error('wrong codec.please input one of these codecs:Int8,Int16,Int32,Float32')
            return inputCodecs[this.option.inputCodec]
        }

        getTypedArray() {
            // 根据传入的目标编码位数
            // 选定前端的所需要的保存的二进制数据格式
            // 完整TypedArray请看文档
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray
            const typedArrays = {
                'Int8': Int8Array,
                'Int16': Int16Array,
                'Int32': Int32Array,
                'Float32': Float32Array
            };
            if (!typedArrays[this.option.inputCodec]) throw new Error('wrong codec.please input one of these codecs:Int8,Int16,Int32,Float32')
            return typedArrays[this.option.inputCodec]
        }

        initAudioContext() {
            // 初始化音频上下文的东西
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            try {
                this.audioCtx = new AudioContextClass({
                    latencyHint: 'interactive',
                    sampleRate: this.option.sampleRate
                });
            } catch (e) {
                // 兼容不支持 AudioContextOptions 的旧版 WebView。
                this.audioCtx = new AudioContextClass();
            }
            // 控制音量的 GainNode
            // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createGain
            this.gainNode = this.audioCtx.createGain();
            this.gainNode.gain.value = 0.1;
            this.currentVolume = 0.1;
            this.gainNode.connect(this.audioCtx.destination);
            this.startTime = 0;
            this.analyserNode = this.audioCtx.createAnalyser();
            this.analyserNode.fftSize = this.option.fftSize;
        }

        static isTypedArray(data) {
            // 检测输入的数据是否为 TypedArray 类型或 ArrayBuffer 类型
            return (data.byteLength && data.buffer && data.buffer.constructor == ArrayBuffer) || data.constructor == ArrayBuffer;
        }

        isSupported(data) {
            // 数据类型是否支持
            // 目前支持 ArrayBuffer 或者 TypedArray
            if (!PCMPlayer.isTypedArray(data)) throw new Error('请传入ArrayBuffer或者任意TypedArray')
            return true
        }

        feed(data) {
            this.isSupported(data);

            // 获取格式化后的buffer
            data = this.getFormattedValue(data);
            // 开始拷贝buffer数据
            // 新建一个Float32Array的空间
            const tmp = new Float32Array(this.samples.length + data.length);
            // console.log(data, this.samples, this.samples.length)
            // 复制当前的实例的buffer值（历史buff)
            // 从头（0）开始复制
            tmp.set(this.samples, 0);
            // 复制传入的新数据
            // 从历史buff位置开始
            tmp.set(data, this.samples.length);
            // 将新的完整buff数据赋值给samples
            // interval定时器也会从samples里面播放数据
            this.samples = tmp;
            // console.log('this.samples', this.samples)
        }

        getFormattedValue(data) {
            if (data.constructor == ArrayBuffer) {
                data = new this.typedArray(data);
            } else {
                data = new this.typedArray(data.buffer);
            }

            let float32 = new Float32Array(data.length);

            for (let i = 0; i < data.length; i++) {
                // buffer 缓冲区的数据，需要是IEEE754 里32位的线性PCM，范围从-1到+1
                // 所以对数据进行除法
                // 除以对应的位数范围，得到-1到+1的数据
                // float32[i] = data[i] / 0x8000;
                float32[i] = data[i] / this.convertValue;
            }
            return float32
        }

        volume(volume) {
            // 平滑调节增益，避免音量变化瞬间产生点击声。
            this.currentVolume = volume;
            this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
            this.gainNode.gain.setTargetAtTime(volume, this.audioCtx.currentTime, 0.01);
        }

        destroy() {
            if (this.interval) {
                clearInterval(this.interval);
            }
            this.samples = null;
            this.audioCtx.close();
            this.audioCtx = null;
        }

        flush() {
            if (!this.samples.length) return
            const self = this;
            const channels = this.option.channels;
            const minSamples = Math.floor(this.option.sampleRate * this.option.minBufferDuration) * channels;
            if (this.samples.length < minSamples) return

            // 只提交完整的多声道帧，零散尾部留给下一轮，防止左右声道错位。
            const usableSamples = this.samples.length - (this.samples.length % channels);
            const samples = this.samples.slice(0, usableSamples);
            this.samples = this.samples.slice(usableSamples);

            var bufferSource = this.audioCtx.createBufferSource();
            if (typeof this.option.onended === 'function') {
                bufferSource.onended = function (event) {
                    self.option.onended(this, event);
                };
            }
            const length = samples.length / channels;
            const audioBuffer = this.audioCtx.createBuffer(channels, length, this.option.sampleRate);

            for (let channel = 0; channel < channels; channel++) {
                const audioData = audioBuffer.getChannelData(channel);
                let offset = channel;
                for (let i = 0; i < length; i++) {
                    // 连续PCM不能逐包淡入淡出，否则会形成周期性调幅和沙沙/颤音失真。
                    audioData[i] = samples[offset];
                    offset += channels;
                }
            }

            if (this.startTime < this.audioCtx.currentTime) {
                // 首包或发生欠载时只补一个很短的安全窗口，兼顾低延迟与连续性。
                this.startTime = this.audioCtx.currentTime + this.option.scheduleAheadTime;
            }
            // console.log('start vs current ' + this.startTime + ' vs ' + this.audioCtx.currentTime + ' duration: ' + audioBuffer.duration);
            bufferSource.buffer = audioBuffer;
            bufferSource.connect(this.gainNode);
            bufferSource.connect(this.analyserNode); // bufferSource连接到analyser
            bufferSource.start(this.startTime);
            this.startTime += audioBuffer.duration;
        }

        async pause() {
            await this.audioCtx.suspend();
        }

        async continue() {
            await this.audioCtx.resume();
        }

        bindAudioContextEvent() {
            const self = this;
            if (typeof self.option.onstatechange === 'function') {
                this.audioCtx.onstatechange = function (event) {
                    self.audioCtx && self.option.onstatechange(this, event, self.audioCtx.state);
                };
            }
        }

    }

    return PCMPlayer;

})));

(async () => {
    const pluginName = "kano_ws_audio"
    const pluginName_CN = "ADB音频透传"
    const pluginPath = "/data/kano_ws_audio"
    const bootSH = '/sdcard/ufi_tools_boot.sh'
    const logFile = '/data/kano_ws_audio/ws_audio_LOG.txt'
    const DEFAULT_PORT = 8963
    const runtimeLogFile = '/data/kano_ws_audio/ws_audio_runtime_log.txt'
    const download_url = "https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/kano_ws_audio.tar.gz"
    const SNDCPY_PACKAGE = 'com.rom1v.sndcpy'
    const SNDCPY_APK = `${pluginPath}/sndcpy.apk`
    const startCommand = `(cd ${pluginPath} && sh service.sh start)`
    const stopCommand = `(cd ${pluginPath} && sh service.sh stop)`

    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami')
        if (res.content) {
            if (res.content.includes('root')) {
                return true
            }
        }
        return false
    }

    const listAdbDevices = async () => {
        try {
            const res = (await runShellWithRoot("/data/data/com.minikano.f50_sms/files/adb devices")).content.replace("List of devices attached", '').split('\n');
            const devices = []
            res.forEach(line => {
                if (line.trim()) {
                    const parts = line.trim().split('\t');
                    if (parts.length === 2 && parts[1] === 'device') {
                        devices.push(parts[0])
                    }
                }
            })
            return devices
        } catch (e) {
            console.error('Error listing ADB devices:', e);
        }
        return null
    }

    const isNetworkADBAlive = async () => {
        try {
            return await (await fetchWithTimeout(`${KANO_baseURL}/adb_alive`, {
                headers: common_headers
            })).json()
        } catch (e) {
            return null
        }
    }

    const wait = (sec = 100) => new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, sec);
    })

    // 给 sndcpy 预授予 Android 权限和永久 root 权限，避免启动时再弹确认框。
    // APatch 的授权需要包变更事件将配置同步进内核，因此写入配置后重装一次同版本 APK。
    const authorizeSndcpy = async (showToast = true) => {
        const result = await runShellWithRoot(`
        pkg='${SNDCPY_PACKAGE}'
        apk='${SNDCPY_APK}'
        uid=$(cmd package list packages -U "$pkg" 2>/dev/null | sed -n 's/.*uid:\\([0-9][0-9]*\\).*/\\1/p' | head -n 1)
        if [ -z "$uid" ]; then
            uid=$(dumpsys package "$pkg" 2>/dev/null | sed -n 's/.*userId=\\([0-9][0-9]*\\).*/\\1/p' | head -n 1)
        fi
        if [ -z "$uid" ]; then
            echo 'SNDCPY_AUTH_ERROR=PACKAGE_NOT_INSTALLED'
            exit 20
        fi

        # 兼容原版 sndcpy 和 root 版 sndcpy；未声明的权限会被 Android 忽略。
        pm grant "$pkg" android.permission.RECORD_AUDIO >/dev/null 2>&1 || true
        appops set "$pkg" PROJECT_MEDIA allow >/dev/null 2>&1 || true
        appops set "$pkg" RECORD_AUDIO allow >/dev/null 2>&1 || true
        appops set "$pkg" RUN_IN_BACKGROUND allow >/dev/null 2>&1 || true
        appops set "$pkg" RUN_ANY_IN_BACKGROUND allow >/dev/null 2>&1 || true
        appops set "$pkg" START_FOREGROUND allow >/dev/null 2>&1 || true

        manager=''
        if [ -x /data/adb/apd ] || [ -d /data/adb/ap ]; then
            manager='APatch'
            cfg='/data/adb/ap/package_config'
            tmp='/data/adb/ap/package_config.sndcpy.tmp'
            tmp2='/data/adb/ap/package_config.sndcpy.tmp2'
            mkdir -p /data/adb/ap || exit 21

            if [ -s "$cfg" ]; then
                awk -F, -v target="$pkg" '$1 != target { print $0 }' "$cfg" > "$tmp" || exit 22
            else
                echo 'pkg,exclude,allow,uid,to_uid,sctx' > "$tmp" || exit 22
            fi
            if ! grep -q '^pkg,exclude,allow,uid,to_uid,sctx' "$tmp"; then
                echo 'pkg,exclude,allow,uid,to_uid,sctx' > "$tmp2" || exit 22
                cat "$tmp" >> "$tmp2" || exit 22
                mv -f "$tmp2" "$tmp" || exit 22
            fi
            echo "$pkg,0,1,$uid,0,u:r:magisk:s0" >> "$tmp" || exit 22
            chown 0:0 "$tmp" >/dev/null 2>&1 || true
            chmod 600 "$tmp" || exit 22
            mv -f "$tmp" "$cfg" || exit 22

            # APatch 官方的 UID 监听器会在包变更后重新加载 package_config。
            if [ -f "$apk" ]; then
                pm install -r "$apk" >/dev/null 2>&1 || true
                sleep 2
            fi
        else
            magisk_cmd=''
            if command -v magisk >/dev/null 2>&1; then
                magisk_cmd=$(command -v magisk)
            elif [ -x /data/adb/magisk/magisk ]; then
                magisk_cmd='/data/adb/magisk/magisk'
            fi
            if [ -n "$magisk_cmd" ]; then
                manager='Magisk'
                "$magisk_cmd" --sqlite "REPLACE INTO policies (uid,policy,until,logging,notification) VALUES($uid,2,0,1,0);" >/dev/null 2>&1 || exit 23
            fi
        fi

        if [ -z "$manager" ]; then
            echo 'SNDCPY_AUTH_ERROR=UNSUPPORTED_ROOT_MANAGER'
            exit 24
        fi
        echo "SNDCPY_AUTH_OK=$manager"
        echo "SNDCPY_UID=$uid"
        `, 30 * 1000)

        const content = result.content || ''
        const manager = (content.match(/SNDCPY_AUTH_OK=([^\r\n]+)/) || [])[1]
        if (!result.success || !manager) {
            console.error('sndcpy 自动授权失败:', content)
            if (showToast) createToast('sndcpy 自动授权失败，请手动给 sndcpy 授权Root权限', 'red')
            return true
        }
        if (showToast) createToast(`sndcpy 权限及 ${manager} root 权限已自动授权`, 'pink')
        return true
    }

    const killProcess = async () => {
        const psResult = await runShellWithRoot(stopCommand);
        return {
            success: true,
            content: psResult.content && psResult.content.replaceAll('\n', "<br>")
        };
    };

    const checkIsRunning = async () => {
        // `${ pluginName } _status`
        const psResult = await runShellWithRoot(`ps -ef | grep -v grep | grep ${pluginName}`);
        return psResult.content.includes(pluginName)
    }

    const setRunningElementText = (isRunning) => {
        const titleEl = document.querySelector(`#${pluginName}_status`)
        if (titleEl) {
            if (isRunning) {
                titleEl.textContent = `${pluginName_CN} - 🟢运行中`
            } else {
                titleEl.textContent = `${pluginName_CN} - 🔴已停止`
            }
        }
    }

    // 检测是否开机自启
    const checkIsBootUp = async () => {
        const res = await runShellWithRoot(`
        grep -q '${startCommand}' ${bootSH}
        echo $?
        `)
        return res.content.trim().includes('0');
    }

    const checkIsInstalled = async () => {
        const res = await runShellWithRoot(`
        ls ${pluginPath}
        `)
        if (!res.success || !res.content.includes('service.sh')) return false
        return true
    }

    async function loadPCM(url = `ws://localhost:${DEFAULT_PORT}/`, deviceId = 'emulator-5554', connectCallback = () => { }) {
        const ids = await listAdbDevices()
        if (!ids || !ids.includes(deviceId)) {
            deviceId = ids && ids.length > 0 ? ids[0] : deviceId
        }
        var socketURL = `${url}${btoa(deviceId)}`;
        player = new PCMPlayer({
            inputCodec: 'Int16',
            channels: 2,
            sampleRate: 48000,
            flushTime: 10,
            minBufferDuration: 0.02,
            scheduleAheadTime: 0.04,
            onstatechange: (node, event, type) => {
                console.log('type', node, event, type)
                if (type == 'running') {
                    connectCallback && connectCallback()
                }
            },
            onended: (node, event) => {
                // console.log('end fire', node, event)
            }
        });

        var ws = new WebSocket(socketURL);
        ws.binaryType = 'arraybuffer';
        ws.addEventListener('message', function (event) {
            player.feed(event.data);

        });
        return {
            player,
            ws
        };
    }

    //启动并输出日志
    const start = async (cb = () => { }, needAuthorize = true) => {
        createToast(`启动${pluginName}中...`)
        if (needAuthorize && !(await authorizeSndcpy())) {
            return false
        }
        const res7 = await runShellWithRoot(`
        ${startCommand}
        `)
        if (!res7.success) {
            createToast(`启动${pluginName}失败!`, 'red')
            return false
        }

        const { el, close } = createFixedToast(`${pluginName}_toast`, `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">等待日志中...</pre>`)

        let timer = null
        const timeout = 60 * 1000
        const t_now = performance.now()
        timer && clearTimeout(timer)
        let oldContent = ''
        timer = setInterval(async () => {
            const res = await runShellWithRoot(`timeout 2s  awk '{print}' ${logFile}`)
            el.style.maxHeight = '400px'
            el.style.overflow = 'auto'
            el.innerHTML = `<pre style="pointer-events: all;white-space: pre-wrap;min-width:300px;text-align: center;">${res.content}<br>等待启动完成(${Math.floor((timeout - (performance.now() - t_now)) / 1000)}s)...</pre>`
            if (oldContent != res.content) {
                el.scrollTo({
                    top: 99999
                })
            }
            oldContent = res.content
            if (res.content.includes('listening on')) {
                cb && cb()
                setTimeout(() => {
                    close()
                }, 2000);
                clearTimeout(timer)
            }
            if ((performance.now() - t_now) >= timeout) {
                if (!(res.content.includes('listening on'))) {
                    createToast(`启动${pluginName}失败!`, 'red')
                }
                close()
                clearTimeout(timer)
            }
        }, 1000);
        return true
    }


    const btn_enabled = document.createElement('button')
    btn_enabled.textContent = `安装`
    let disabled_btn_enabled = false
    btn_enabled.onclick = async (e) => {
        if (disabled_btn_enabled) return
        disabled_btn_enabled = true
        const abortInstall = (message, color = 'red') => {
            disabled_btn_enabled = false
            createToast(message, color)
        }
        if (!(await checkAdvanceFunc())) {
            return abortInstall("没有开启高级功能，无法使用！")
        }
        if (await checkIsInstalled()) {
            return abortInstall("你已经安装过了！", 'pink')
        }

        createToast("下载所需组件中...")
        const res0 = await runShellWithRoot(`/data/data/com.minikano.f50_sms/files/curl -L "${download_url}" -o /data/${pluginName}.tar.gz --output /data/${pluginName}.tar.gz --write-out "DOWNLOAD_DONE\nTotal: %{size_download} bytes\nSpeed: %{speed_download} B/s\nTime: %{time_total} sec\n" > /data/kano_${pluginName}_latest.dlog 2>&1 &`, 100 * 1000)
        if (!res0.success) {
            return abortInstall("下载依赖失败!")
        }

        let log = ''
        const max_times = 600 // 最多等待10分钟
        let count_times = 0
        const { el, close } = createFixedToast(`kano_${pluginName}_toast`, `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">等待日志中...</pre>`, '')

        const interval = setInterval(async () => {
            const dlog = await runShellWithRoot(`timeout 2s  awk '{print}' /data/kano_${pluginName}_latest.dlog`)
            const lines = dlog.content.split('\n'); // 按换行符拆分成数组
            log = lines.slice(-6).join('\n');
            el.innerHTML = `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">${log.replaceAll('\n', "<br>")}</pre>`
            if (log.includes('DOWNLOAD_DONE')) {
                setTimeout(() => {
                    close()
                }, 2000);
            }
        }, 1000)

        while (true) {
            if (max_times <= count_times) {
                clearInterval(interval)
                close()
                return abortInstall("下载超时，请检查网络连接或稍后重试！")
            }
            if (log.includes('DOWNLOAD_DONE')) {
                clearInterval(interval)
                break
            }
            count_times++
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

        await runShellWithRoot(`rm -f /data/kano_${pluginName}_latest.dlog`)

        const { close: closeDecompressToast } = createFixedToast('decompressing', `解压依赖文件...`)
        const res2 = await runShellWithRoot(`
        cd /data
        mkdir -p ${pluginPath}
        tar -zxf ${pluginName}.tar.gz -C ${pluginPath}
        rm -f ${pluginName}.tar.gz
        `, 100 * 1000)
        closeDecompressToast()
        if (!res2.success) return abortInstall(`解压依赖文件出错!`)

        createToast("检查依赖文件，可能需要一点时间...")
        const res3 = await runShellWithRoot(`
        ls ${pluginPath}
        `)
        if (!res3.success || !res3.content.includes("service.sh")) return abortInstall("检查依赖文件失败!")

        createToast(`正在安装${pluginName},设置权限...`)
        const res5 = await runShellWithRoot(`chmod 777 -R ${pluginPath}`)
        if (!res5.success) return abortInstall(`设置${pluginName}权限失败!`)


        const res_origin = await runShellWithRoot(`getenforce`)

        createToast(`临时关闭SELinux权限中...`)
        const res_off = await runShellWithRoot(`setenforce 0 && getenforce`)
        if (!res_off.success || !res_off.content.includes("Permissive")) createToast(`关闭SELinux权限失败!`, 'red')

        const restoreSELinux = async () => {
            if (res_origin.success && !res_origin.content.includes("Permissive")) {
                createToast(`开启SELinux权限中...`)
                const res_on = await runShellWithRoot(`setenforce 1 && getenforce`)
                if (!res_on.success || !res_on.content.includes("Enforcing")) {
                    createToast(`开启SELinux权限失败!`, 'red')
                }
            }
        }

        createToast(`正在安装 sndcpy APK...`, "pink", 20000)
        // 不调用 service.sh install：它会在 root 规则写入前启动 sndcpy，首次必然可能弹授权框。
        const res6 = await runShellWithRoot(`
        apk='${SNDCPY_APK}'
        tmp_apk='/data/local/tmp/sndcpy.apk'
        [ -f "$apk" ] || { echo 'sndcpy.apk 不存在'; exit 30; }
        cp -f "$apk" "$tmp_apk" || exit 31
        output=$(pm install -r "$tmp_apk" 2>&1)
        case "$output" in
            *INSTALL_FAILED_UPDATE_INCOMPATIBLE*)
                pm uninstall '${SNDCPY_PACKAGE}' >/dev/null 2>&1 || true
                output=$(pm install "$tmp_apk" 2>&1)
                ;;
        esac
        rm -f "$tmp_apk"
        echo "$output"
        case "$output" in
            *Success*) exit 0 ;;
            *) exit 32 ;;
        esac
        `, 100 * 1000)
        if (!res6.success) {
            await restoreSELinux()
            disabled_btn_enabled = false
            return createToast(`安装${pluginName}失败：${(res6.content || '').replaceAll('\n', '<br>')}`, 'red')
        }
        createToast(res6.content.replaceAll('\n', "<br>"), "pink")

        createToast(`正在自动授权 sndcpy 权限...`, 'pink', 20000)
        if (!(await authorizeSndcpy())) {
            await restoreSELinux()
            disabled_btn_enabled = false
            return
        }

        await restoreSELinux()

        await start(() => {
            createToast(`<div style="width:300px;text-align:center;pointer-events: all;">
            启动${pluginName}成功！<br />
            端口默认是${DEFAULT_PORT}<br />
            依赖文件路径:${pluginPath}<br/>
            日志:${logFile}<br/>
    </div>
    `, '', 20000)
        }, false)

        disabled_btn_enabled = false

        checkIsBootUp().then(isBootUp => {
            const boot_on = document.querySelector(`#${pluginName}_boot_on`)
            if (!boot_on) return
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })
        await wait(1 * 1000)
        const isRunning = await checkIsRunning()
        setRunningElementText(isRunning)
    }

    const btn_disabled = document.createElement('button')
    btn_disabled.textContent = `卸载`
    let ct = 0
    btn_disabled.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        ct++
        if (ct < 2) { createToast(`再点一次卸载${pluginName}`) }
        tmer = setTimeout(() => {
            ct = 0
        }, 3000);
        if (ct < 2) return
        const res_origin = await runShellWithRoot(`getenforce`)

        createToast(`临时关闭SELinux权限中...`)
        const res_off = await runShellWithRoot(`setenforce 0 && getenforce`)
        if (!res_off.success || !res_off.content.includes("Permissive")) createToast(`关闭SELinux权限失败!`, 'red')
        const { close: closeUninstallToast } = createFixedToast('uninstalling', "卸载中...", 'red')
        const killResult = await killProcess()
        createToast(killResult.content)
        const res = await runShellWithRoot(`
        sed -i '/${pluginName}/d' ${bootSH}
        rm -rf ${pluginPath}
        `, 100 * 1000)
        const res1 = await runShellWithRoot(`pm uninstall ${SNDCPY_PACKAGE}`)
        closeUninstallToast()
        if (res_origin.success && !res_origin.content.includes("Permissive")) {
            createToast(`开启SELinux权限中...`)
            const res_on = await runShellWithRoot(`setenforce 1 && getenforce`)
            if (!res_on.success || !res_on.content.includes("Enforcing")) createToast(`开启SELinux权限失败!`, 'red')
        }
        createToast(`卸载成功!`, 'pink')
        await wait(1 * 1000)
        const isRunning = await checkIsRunning()
        setRunningElementText(isRunning)
    }

    const btn_restart = document.createElement('button')
    btn_restart.textContent = `重启`
    btn_restart.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (! await checkIsInstalled()) {
            return createToast(`你还没有安装${pluginName}！`)
        }
        createToast(`重启${pluginName}中...`, 'pink')
        const killResult = await killProcess()
        createToast(killResult.content)
        await start(() => {
            createToast(`重启成功`, 'pink')
        })
        await wait(1 * 1000)
        const isRunning = await checkIsRunning()
        setRunningElementText(isRunning)
    }

    const stopBtn = document.createElement('button')
    stopBtn.classList.add('btn')
    stopBtn.textContent = `停止`
    stopBtn.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (! await checkIsInstalled()) {
            return createToast(`你还没有安装${pluginName}！`)
        }
        createToast(`干掉${pluginName}中...`, 'pink')
        const killResult = await killProcess()
        createToast(killResult.content)
        createToast(`停止成功！`, 'pink')
        await wait(1 * 1000)
        const isRunning = await checkIsRunning()
        setRunningElementText(isRunning)
    }

    const container = document.querySelector('.functions-container')
    while (!UFI_DATA.lan_ipaddr) {
        await wait()
    }
    container.insertAdjacentHTML("afterend", `
<div id="${pluginName}_IFRAME_KANO" style="width: 100%; margin-top: 10px;">
        <div class="title" style="margin: 6px 0 ;">
            <strong id="${pluginName}_status">${pluginName_CN}</strong>
            <div style="display: inline-block;" id="collapse_${pluginName}_btn"></div>
        </div>
        <div class="collapse" id="collapse_${pluginName}" data-name="close" style="height: 0px; overflow: hidden;">
            <div class="collapse_box">
            <div id="${pluginName}_action_box" style="margin-bottom:8px;display:flex;gap:10px;flex-wrap:wrap"></div>
        </div>
    </div>
</div>
`)

    const adbbtn = document.createElement('button')
    adbbtn.classList.add('btn')
    adbbtn.textContent = "强开ADB"
    adbbtn.onclick = async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        const res = await runShellWithRoot(`
        setprop persist.adb.secure 0
        setprop persist.service.adb.enable 1
        setprop service.adb.tcp.port 5555
        `, 100 * 1000)
        if (!res.success) return createToast("开启失败！", 'red')
        const mode = (await runShellWithRoot("getprop sys.usb.config")).content.trim().replace('\n', '')
        if (mode.includes("adb")) {
            createToast("有线 ADB 已开启，无需重复开启")
        } else {
            await runShellWithRoot(`setprop sys.usb.config ${mode},adb`)
        }
        const resp = await runShellWithRoot(`
                stop adbd
                start adbd
            `)
        if (!resp.success) return createToast("开启失败！", 'red')
        createToast("开启成功！", 'pink')
    }

    const boot_on = document.createElement('button')
    boot_on.id = `${pluginName}_boot_on`
    boot_on.classList.add('btn')
    boot_on.textContent = "开机自启"
    boot_on.style.background = ""
    boot_on.addEventListener('click', async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        if (! await checkIsInstalled()) {
            return createToast(`你还没有安装${pluginName}！`)
        }
        const isBootUp = await checkIsBootUp();
        if (isBootUp) {
            //关闭
            await runShellWithRoot(`
                sed -i '/${pluginName}/d' ${bootSH}
            `)
            boot_on.style.background = ""
            createToast("已取消开机自启", 'pink')
        } else {
            //开启
            await runShellWithRoot(`
                grep -qxF '${startCommand}' ${bootSH} || echo '${startCommand}' >> ${bootSH}
            `)
            boot_on.style.background = "var(--dark-btn-color-active)"
            createToast("已设置开机自启", 'pink')
        }
    })

    let player = null
    let ws = null
    const startAudioBtn = document.createElement('button')
    startAudioBtn.classList.add('btn')
    startAudioBtn.textContent = "连接音频"
    startAudioBtn.onclick = async () => {
        if (! await checkIsInstalled()) {
            return createToast(`你还没有安装${pluginName}！`)
        }
        if (! await checkIsRunning()) {
            return createToast(`请先启动${pluginName_CN}服务！`)
        }
        const adbAlive = await isNetworkADBAlive()
        if (!adbAlive || !adbAlive.result || adbAlive.result !== "true") {
            return createToast(`网路ADB连接不可用，请确保设备开启并连接了网路ADB！`, 'red')
        }
        if (player) {
            player.destroy()
            player = null
        }
        if (ws) {
            ws.close()
            ws = null
        }
        const { player: _player, ws: _ws } = await loadPCM(`ws://${UFI_DATA.lan_ipaddr}:${DEFAULT_PORT}/`, 'emulator-5554', () => {
            createToast("音频连接成功！", 'pink')
            player.volume(0.6)
            createToast("当前音量：" + Math.round(_player.currentVolume * 100) / 100, 'pink')
        })
        player = _player
        ws = _ws
        createToast("已打开音频，正在连接中...", 'pink')
    }

    const stopAudioBtn = document.createElement('button')
    stopAudioBtn.textContent = "断开音频"
    stopAudioBtn.onclick = () => {
        if (player) {
            player.destroy()
            player = null
        }
        if (ws) {
            ws.close()
            ws = null
        }
        createToast("已断开音频连接！", 'pink')
    }

    const volumUpBtn = document.createElement('button')
    volumUpBtn.textContent = "音量+"
    volumUpBtn.onclick = () => {
        if (player && player.currentVolume + 0.1 >= 2) {
            createToast("音量已调至最大！", 'pink')
        } else if (player) {
            player.volume(player.currentVolume + 0.1)
            createToast("当前音量：" + Math.round(player.currentVolume * 100) / 100, 'pink')
        } else {
            createToast("请先连接音频！", 'pink')
        }
    }

    const volumDownBtn = document.createElement('button')
    volumDownBtn.textContent = "音量-"
    volumDownBtn.onclick = () => {
        if (player && player.currentVolume - 0.1 <= 0) {
            player.volume(0)
            createToast("音量已调至最小！", 'pink')
        } else if (player) {
            player.volume(player.currentVolume - 0.1)
            createToast("当前音量：" + Math.round(player.currentVolume * 100) / 100, 'pink')
        } else {
            createToast("请先连接音频！", 'pink')
        }
    }
    const mmBox = document.querySelector(`#${pluginName}_action_box`)
    mmBox.appendChild(startAudioBtn)
    mmBox.appendChild(stopAudioBtn)
    mmBox.appendChild(volumUpBtn)
    mmBox.appendChild(volumDownBtn)
    mmBox.appendChild(btn_enabled)
    mmBox.appendChild(stopBtn)
    mmBox.appendChild(btn_restart)
    mmBox.appendChild(btn_disabled)
    mmBox.appendChild(adbbtn)
    mmBox.appendChild(boot_on)

    let colTimer = null
    let colTimer1 = null
    collapseGen(`#collapse_${pluginName}_btn`, `#collapse_${pluginName}`, `#collapse_${pluginName}`, (e) => {
        checkIsBootUp().then(isBootUp => {
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })
        colTimer && clearTimeout(colTimer)
        colTimer1 && clearTimeout(colTimer1)
    })

    checkIsRunning().then(isRunning => {
        setRunningElementText(isRunning)
    })

    let intval = setInterval(() => {
        if (UFI_DATA.loginfo == "ok") {
            checkIsBootUp().then(isBootUp => {
                if (isBootUp) {
                    boot_on.style.background = "var(--dark-btn-color-active)"
                } else {
                    boot_on.style.background = ""
                }
            })
            clearInterval(intval)
        }
    }, 500);

    if (localStorage.getItem(`#collapse_${pluginName}`) == 'open') {
        checkIsRunning().then(isRunning => {
            setRunningElementText(isRunning)
        })
    }
})()
//</script>
