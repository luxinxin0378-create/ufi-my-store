//<script>
(() => {
    const checkWeakToken = () => {
        if (SHA256) {
            let weakTokenList = [
                "admin",
                "password",
                "666",
                "6666",
                "12345",
                "123456",
                "1234567",
                "12345678",
                "123456789",
                "1234567890",
                "root",
            ]
            for (let token of weakTokenList) {
                if (SHA256(token) == KANO_TOKEN.toUpperCase()) {
                    return true
                }
            }
            return false
        }
    }

    /**
     * Toast消息管理器
     */
    const ToastManager = {
        currentToast: null,

        // 清除当前toast（避免重复提示）
        clear: () => {
            if (ToastManager.currentToast) {
                ToastManager.currentToast.remove();
                ToastManager.currentToast = null;
            }
        },

        success: (message, duration = 3000) => {
            ToastManager.clear();
            ToastManager.currentToast = createToast(message, 'green', duration);
        },
        error: (message, duration = 5000) => {
            ToastManager.clear();
            ToastManager.currentToast = createToast(message, 'red', duration);
        },
        warning: (message, duration = 4000) => {
            ToastManager.clear();
            ToastManager.currentToast = createToast(message, 'orange', duration);
        },
        info: (message, duration = 3000) => {
            ToastManager.clear();
            ToastManager.currentToast = createToast(message, 'blue', duration);
        },
        loading: (message) => {
            ToastManager.clear();
            ToastManager.currentToast = createToast(`⏳ ${message}`, 'blue', 2000);
        }
    }

    /**
     * 检查高级功能是否开启
     * @returns {Promise<boolean>} 是否有root权限
     */
    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami')
        if (res.content && res.content.includes('root')) {
            return true
        }
        return false
    }

    /**
     * 验证高级功能权限
     * @returns {Promise<boolean>} 权限验证结果
     */
    const validateAdvancedPermission = async () => {
        if (!(await checkAdvanceFunc())) {
            ToastManager.error("没有开启高级功能，无法使用！")
            return false
        }
        return true
    }

    // CloudFlare Tunnel配置
    const CLOUDFLARE_CONFIG = {
        // 主安装目录
        INSTALL_DIR: "/data/cloudflared",

        // 核心文件路径
        get BINARY_PATH() { return `${this.INSTALL_DIR}/cloudflared`; },
        get PID_FILE() { return `${this.INSTALL_DIR}/cloudflared.pid`; },
        get LOG_FILE() { return `${this.INSTALL_DIR}/cloudflared.log`; },
        get TOKEN_FILE() { return `${this.INSTALL_DIR}/token.txt`; },

        // 系统配置路径
        BOOT_SCRIPT_PATH: "/sdcard/ufi_tools_boot.sh",

        // 下载配置
        DOWNLOAD_URL: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64",
        TEMP_DOWNLOAD_PATH: "/data/cloudflared_download"
    };

    let cloudflaredProcessId = null;
    let currentToken = null;
    let statusCache = { data: null, timestamp: 0, ttl: 5000 }; // 5秒缓存

    /**
     * 检查CloudFlare Tunnel服务是否正在运行
     * @param {boolean} useCache
     * @returns {Promise<{running: boolean, pid: string|null}>}
     */
    const isServiceRunning = async (useCache = true) => {
        const now = Date.now();

        if (useCache && statusCache.data && (now - statusCache.timestamp) < statusCache.ttl) {
            return statusCache.data;
        }

        try {
            const checkRes = await runShellWithRoot(`
                if [ -f ${CLOUDFLARE_CONFIG.PID_FILE} ]; then
                    PID=$(cat ${CLOUDFLARE_CONFIG.PID_FILE} 2>/dev/null)
                    if [ -n "$PID" ] && ps -p $PID -o comm= 2>/dev/null | grep -q cloudflared; then
                        echo "RUNNING:$PID"
                    else
                        echo "NOT_RUNNING"
                    fi
                else
                    echo "NO_PID_FILE"
                fi
            `);

            const result = checkRes.success && checkRes.content.startsWith("RUNNING:")
                ? { running: true, pid: checkRes.content.split(":")[1].trim() }
                : { running: false, pid: null };

            statusCache = { data: result, timestamp: now, ttl: statusCache.ttl };

            return result;
        } catch (error) {
            const result = { running: false, pid: null };
            statusCache = { data: result, timestamp: now, ttl: statusCache.ttl };
            return result;
        }
    };

    /**
     * 从用户输入中提取token
     * @param {string} input - 用户输入的完整命令
     * @returns {string|null} 提取的token或null
     */
    const extractToken = (() => {
        // 缓存正则表达式，避免重复编译
        const TOKEN_REGEX = /^[A-Za-z0-9+/=]+$/;
        const INSTALL_REGEX = /install\s+([A-Za-z0-9+/=]+)/;
        const TOKEN_PARAM_REGEX = /--token\s+([A-Za-z0-9+/=]+)/;

        return (input) => {
            if (!input?.trim()) return null;

            const trimmedInput = input.trim();

            // 匹配 "install" 后面的token
            const installMatch = trimmedInput.match(INSTALL_REGEX);
            if (installMatch) {
                return installMatch[1];
            }

            // 匹配 "--token" 参数
            const tokenMatch = trimmedInput.match(TOKEN_PARAM_REGEX);
            if (tokenMatch) {
                return tokenMatch[1];
            }

            // 如果输入本身就是token（base64格式）
            if (TOKEN_REGEX.test(trimmedInput) && trimmedInput.length > 50) {
                return trimmedInput;
            }

            return null;
        };
    })();

    // ========== 新增辅助函数（用于优化安装） ==========
    /**
     * 获取可用的下载工具（优先使用系统curl/wget，若不存在则尝试UFI内置curl）
     */
    const getDownloader = async () => {
        // 检测系统工具
        const check = async (cmd) => {
            const r = await runShellWithRoot(`which ${cmd} 2>/dev/null`);
            return r.success && r.content.trim().length > 0;
        };
        if (await check('curl')) return 'curl -L -o';
        if (await check('wget')) return 'wget -O';

        // 若系统没有，尝试UFI内置curl路径
        const builtinCurl = '/data/data/com.minikano.f50_sms/files/curl';
        const test = await runShellWithRoot(`test -x ${builtinCurl} && echo yes`);
        if (test.success && test.content.trim() === 'yes') {
            return `${builtinCurl} -L -o`;
        }
        return null;
    };

    /**
     * 检查文件大小是否大于指定阈值（默认1MB）
     */
    const checkFileSize = async (path, minSize = 1024 * 1024) => {
        const r = await runShellWithRoot(`stat -c%s "${path}" 2>/dev/null || echo 0`);
        if (!r.success) return false;
        const size = parseInt(r.content.trim());
        return size > minSize;
    };

    /**
     * 带重试的下载函数
     * @param {string} downloader - 下载命令（含参数）
     * @param {string} url - 下载地址
     * @param {string} output - 输出路径
     * @param {number} retries - 重试次数
     * @param {number} timeout - 超时秒数
     * @returns {Promise<boolean>} 是否成功
     */
    const downloadWithRetry = async (downloader, url, output, retries = 2, timeout = 300) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            const cmd = `${downloader} ${output} "${url}" --connect-timeout 30 --max-time ${timeout}`;
            ToastManager.loading(`尝试 ${attempt}/${retries}...`);
            const res = await runShellWithRoot(cmd, (timeout + 10) * 1000);
            if (res.success) {
                const valid = await checkFileSize(output);
                if (valid) return true;
                // 文件无效，删除后重试
                await runShellWithRoot(`rm -f ${output}`);
            }
            // 如果失败，等待一下再重试
            if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 2000));
        }
        return false;
    };
    // ================================================

    /**
     * 安装CloudFlare Tunnel的核心逻辑（最终优化版）
     * 多镜像 + 重试 + 长超时 + 清晰指引
     */
    const installCloudflared = async () => {
        if (checkWeakToken()) {
            ToastManager.error("🚨 检测到弱口令，请更改为复杂口令后再操作！", 8000);
            return;
        }
        if (!(await validateAdvancedPermission())) return;

        try {
            // 1. 检查是否已安装
            ToastManager.loading("检查安装状态...");
            const checkRes = await runShellWithRoot(`ls -la ${CLOUDFLARE_CONFIG.BINARY_PATH} 2>/dev/null`);
            if (checkRes.success && checkRes.content.includes("cloudflared")) {
                ToastManager.warning("⚠️ CloudFlare Tunnel 已安装，无需重复安装");
                return;
            }

            // 2. 创建安装目录
            ToastManager.loading("创建安装目录...");
            const mkdirRes = await runShellWithRoot(`
                mkdir -p ${CLOUDFLARE_CONFIG.INSTALL_DIR}
                chmod 755 ${CLOUDFLARE_CONFIG.INSTALL_DIR}
            `);
            if (!mkdirRes.success) throw new Error("创建安装目录失败");

            // 3. 检测下载工具
            const downloader = await getDownloader();
            if (!downloader) throw new Error("未找到 curl 或 wget，请确保系统已安装");

            // 4. 定义多个镜像源（国内优先）
            const urls = [
                "https://ghproxy.com/https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64",
                "https://mirror.ghproxy.com/https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64",
                "https://ghproxy.net/https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64",
                "https://gitproxy.click/https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64",
                CLOUDFLARE_CONFIG.DOWNLOAD_URL  // 官方源放最后
            ];

            let downloaded = false;
            for (const url of urls) {
                ToastManager.loading(`正在从 ${url.split('/')[2]} 下载...`);
                const success = await downloadWithRetry(downloader, url, CLOUDFLARE_CONFIG.TEMP_DOWNLOAD_PATH, 2, 300);
                if (success) {
                    downloaded = true;
                    break;
                }
                // 失败则继续下一个源
            }

            if (!downloaded) {
                // 下载失败，提供手动安装指引
                const manualMsg =
                    "所有下载源均失败，可能是网络问题。\n\n" +
                    "请手动下载 cloudflared-linux-arm64 文件：\n" +
                    "1. 在电脑上访问 https://github.com/cloudflare/cloudflared/releases/latest\n" +
                    "2. 下载 cloudflared-linux-arm64 文件\n" +
                    "3. 将文件上传到设备的 /data/cloudflared/ 目录\n" +
                    "4. 在设备上执行：chmod 755 /data/cloudflared/cloudflared\n" +
                    "5. 然后重新点击本页的「安装」按钮，将自动跳过下载。";
                ToastManager.error(`❌ 下载失败\n\n${manualMsg}`, 15000);
                return;
            }

            // 5. 移动并设置权限
            ToastManager.loading("配置文件权限...");
            const setupRes = await runShellWithRoot(`
                mv "${CLOUDFLARE_CONFIG.TEMP_DOWNLOAD_PATH}" "${CLOUDFLARE_CONFIG.BINARY_PATH}"
                chmod 755 "${CLOUDFLARE_CONFIG.BINARY_PATH}"
                ls -la "${CLOUDFLARE_CONFIG.BINARY_PATH}"
            `);
            if (!setupRes.success || !setupRes.content.includes("cloudflared")) {
                throw new Error("安装文件移动失败，请检查目录权限");
            }

            // 6. 验证安装
            ToastManager.loading("验证安装...");
            const verifyRes = await runShellWithRoot(`"${CLOUDFLARE_CONFIG.BINARY_PATH}" --version`);
            if (!verifyRes.success) {
                throw new Error("安装验证失败，可能文件损坏，请重新尝试");
            }

            ToastManager.success(
                `🎉 CloudFlare Tunnel 安装成功！\n` +
                `版本信息: ${verifyRes.content.trim()}\n` +
                `安装路径: ${CLOUDFLARE_CONFIG.BINARY_PATH}`
            );
        } catch (error) {
            ToastManager.error(`❌ 安装失败: ${error.message}`);
        }
    };

    /**
     * 启动CloudFlare Tunnel的核心逻辑（原始代码保持不变）
     */
    const startCloudflared = async () => {
        if (checkWeakToken()) {return createToast(`检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！`, "red", 8000)}

        // 权限验证
        if (!(await validateAdvancedPermission())) {
            return;
        }

        // 检查token输入
        const tokenInput = document.getElementById('cloudflare_token_input').value.trim();
        if (!tokenInput) {
            ToastManager.error("❌ 请输入登录token!");
            return;
        }

        // 提取token
        const token = extractToken(tokenInput);
        if (!token) {
            ToastManager.error("❌ 无法从输入中提取有效的token!\n请确保输入格式正确\n\n支持格式:\n1. cloudflared.exe service install [token]\n2. 直接输入token字符串");
            return;
        }

        try {
            // 步骤1: 检查是否已安装
            ToastManager.loading("检查安装状态...");
            const checkRes = await runShellWithRoot(`ls -la ${CLOUDFLARE_CONFIG.BINARY_PATH} 2>/dev/null`);
            if (!checkRes.success || !checkRes.content.includes("cloudflared")) {
                ToastManager.error("❌ CloudFlare Tunnel 未安装，请先点击安装");
                return;
            }

            // 步骤2: 检查服务状态（不使用缓存，确保实时性）
            const { running, pid } = await isServiceRunning(false);
            if (running) {
                ToastManager.warning(`⚠️ 服务已在运行 (PID: ${pid})`);
                return;
            }

            // 步骤3: 验证token有效性（基础检查）
            ToastManager.loading("验证token格式...");
            if (token.length < 50 || !/^[A-Za-z0-9+/=]+$/.test(token)) {
                ToastManager.error("❌ Token格式可能不正确\n请确保token是完整的base64编码字符串");
                return;
            }

            // 步骤4: 保存token
            ToastManager.loading("保存配置...");
            const saveTokenRes = await runShellWithRoot(`echo "${token}" > ${CLOUDFLARE_CONFIG.TOKEN_FILE}`);
            if (!saveTokenRes.success) {
                throw new Error("保存token失败!");
            }
            currentToken = token;

            // 步骤5: 清理旧日志
            await runShellWithRoot(`rm -f ${CLOUDFLARE_CONFIG.LOG_FILE}`);

            // 步骤6: 启动服务
            ToastManager.loading("启动 CloudFlare Tunnel 服务...");
            const startCmd = `cd ${CLOUDFLARE_CONFIG.INSTALL_DIR} && nohup ./cloudflared tunnel run --protocol http2 --token ${token} > ${CLOUDFLARE_CONFIG.LOG_FILE} 2>&1 &`;
            const startRes = await runShellWithRoot(`
                cd ${CLOUDFLARE_CONFIG.INSTALL_DIR}
                # 确保目录权限正确
                chmod 755 ${CLOUDFLARE_CONFIG.INSTALL_DIR}
                chmod +x ${CLOUDFLARE_CONFIG.BINARY_PATH}
                
                # 启动服务
                nohup ./cloudflared tunnel run --protocol http2 --token ${token} > ${CLOUDFLARE_CONFIG.LOG_FILE} 2>&1 &
                echo $! > ${CLOUDFLARE_CONFIG.PID_FILE}
                
                # 等待一下确保进程启动
                sleep 1
                echo "START_COMMAND_EXECUTED"
            `);

            if (!startRes.success) {
                throw new Error(`服务启动命令执行失败: ${startRes.content}`);
            }

            // 步骤7: 设置自启动
            ToastManager.loading("配置自启动...");
            const bootRes = await runShellWithRoot(`
                touch ${CLOUDFLARE_CONFIG.BOOT_SCRIPT_PATH}
                chmod 777 ${CLOUDFLARE_CONFIG.BOOT_SCRIPT_PATH}
                sed -i "/cloudflared tunnel/d" ${CLOUDFLARE_CONFIG.BOOT_SCRIPT_PATH}
                echo "${startCmd}" >> ${CLOUDFLARE_CONFIG.BOOT_SCRIPT_PATH}
            `);

            // 获取进程ID
            const pidRes = await runShellWithRoot(`cat ${CLOUDFLARE_CONFIG.PID_FILE}`);
            if (pidRes.success && pidRes.content) {
                cloudflaredProcessId = pidRes.content.trim();
            }

            // 步骤8: 验证启动状态（增强版）
            ToastManager.loading("验证服务状态...");

            // 使用Promise.race实现超时机制，避免无限等待
            const verifyService = async () => {
                for (let i = 0; i < 10; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const { running: isRunning, pid: servicePid } = await isServiceRunning(false);
                    if (isRunning) {
                        return { success: true, pid: servicePid };
                    }
                }
                return { success: false, pid: null };
            };

            const { success: isRunning, pid: servicePid } = await verifyService();

            if (isRunning) {
                ToastManager.success(`🎉 CloudFlare Tunnel 启动成功!\n进程ID: ${servicePid}\n已配置开机自启动\n请查看CloudFlare控制台确认隧道状态`);
            } else {
                // 启动失败时提供详细诊断信息
                const diagnosisInfo = await diagnosisStartupFailure();
                ToastManager.error(`❌ 服务启动失败\n\n${diagnosisInfo}\n\n建议:\n1. 检查token是否正确\n2. 点击'查看日志'按钮查看详细错误\n3. 确保网络连接正常`);
            }
        } catch (error) {
            ToastManager.error(`启动失败: ${error.message}`);
        }
    };

    /**
     * 重启CloudFlare Tunnel的核心逻辑（原始代码保持不变）
     */
    const restartCloudflared = async () => {
        if (checkWeakToken()) {return createToast(`检测到你的UFI-TOOLS使用了弱口令，为了你的安全，必须更改为复杂口令后再进行操作！！！`, "red", 8000)}
        // 权限验证
        if (!(await validateAdvancedPermission())) {
            return;
        }

        try {
            // 步骤1: 停止服务
            ToastManager.loading("停止 CloudFlare Tunnel 服务...");
            const stopRes = await runShellWithRoot(`
                pkill cloudflared
                sleep 2
                rm -f ${CLOUDFLARE_CONFIG.PID_FILE}
            `);

            // 步骤2: 检查token
            const tokenRes = await runShellWithRoot(`cat ${CLOUDFLARE_CONFIG.TOKEN_FILE} 2>/dev/null`);
            if (!tokenRes.success || !tokenRes.content.trim()) {
                ToastManager.error("❌ 未找到保存的token，请重新输入token并启动");
                return;
            }
            const token = tokenRes.content.trim();

            // 步骤3: 重新启动服务
            ToastManager.loading("重新启动 CloudFlare Tunnel 服务...");
            const startRes = await runShellWithRoot(`
                cd ${CLOUDFLARE_CONFIG.INSTALL_DIR}
                nohup ./cloudflared tunnel run --protocol http2 --token ${token} > ${CLOUDFLARE_CONFIG.LOG_FILE} 2>&1 &
                echo $! > ${CLOUDFLARE_CONFIG.PID_FILE}
            `);

            if (!startRes.success) {
                throw new Error(`重启失败: ${startRes.content}`);
            }

            // 步骤4: 验证重启状态
            ToastManager.loading("验证服务状态...");
            await new Promise(resolve => setTimeout(resolve, 3000));

            const { running, pid } = await isServiceRunning(false);
            if (running) {
                ToastManager.success(`🔄 CloudFlare Tunnel 重启成功!\n进程ID: ${pid}`);
            } else {
                ToastManager.warning("⚠️ 重启可能失败，请检查服务状态");
            }
        } catch (error) {
            ToastManager.error(`重启失败: ${error.message}`);
        }
    };

    /**
     * 卸载CloudFlare Tunnel的核心逻辑（原始代码保持不变）
     */
    const uninstallCloudflared = async () => {
        // 权限验证
        if (!(await validateAdvancedPermission())) {
            return;
        }

        try {
            ToastManager.loading("正在卸载 CloudFlare Tunnel...");
            const uninstallRes = await runShellWithRoot(`
                # 停止服务
                pkill cloudflared
                sleep 1
                
                # 删除文件
                rm -rf ${CLOUDFLARE_CONFIG.INSTALL_DIR}
                
                # 清除自启动配置
                sed -i '/cloudflared tunnel/d' ${CLOUDFLARE_CONFIG.BOOT_SCRIPT_PATH}
                
                echo "UNINSTALL_COMPLETE"
            `);

            if (!uninstallRes.success) {
                throw new Error("卸载失败！");
            }

            // 清除状态
            cloudflaredProcessId = null;
            currentToken = null;
            document.getElementById('cloudflare_token_input').value = '';

            ToastManager.success("✅ CloudFlare Tunnel 卸载完成\n所有相关文件和配置已清除");
        } catch (error) {
            ToastManager.error(error.message);
        }
    };

    /**
     * 诊断启动失败原因（原始代码保持不变）
     */
    const diagnosisStartupFailure = async () => {
        try {
            // 一次性执行所有诊断检查，减少shell调用开销
            const diagnosisRes = await runShellWithRoot(`
                echo "=== 诊断开始 ==="
                
                # 检查二进制文件
                if [ -f ${CLOUDFLARE_CONFIG.BINARY_PATH} ]; then
                    echo "✅ 二进制文件存在"
                    if [ -x ${CLOUDFLARE_CONFIG.BINARY_PATH} ]; then
                        echo "✅ 文件权限正常"
                    else
                        echo "❌ 文件无执行权限"
                    fi
                else
                    echo "❌ 二进制文件不存在"
                fi
                
                # 检查token文件
                if [ -f ${CLOUDFLARE_CONFIG.TOKEN_FILE} ] && [ -s ${CLOUDFLARE_CONFIG.TOKEN_FILE} ]; then
                    echo "✅ Token文件存在"
                else
                    echo "❌ Token文件不存在或为空"
                fi
                
                # 检查日志文件
                if [ -f ${CLOUDFLARE_CONFIG.LOG_FILE} ]; then
                    echo "📋 最近日志:"
                    tail -10 ${CLOUDFLARE_CONFIG.LOG_FILE} 2>/dev/null || echo "日志读取失败"
                else
                    echo "❌ 无日志文件"
                fi
                
                echo "=== 诊断结束 ==="
            `);

            return diagnosisRes.success ? diagnosisRes.content : "诊断过程出错";
        } catch (error) {
            return `诊断过程出错: ${error.message}`;
        }
    };

    /**
     * 日志错误分析映射表（提高性能）
     */
    const ERROR_PATTERNS = [
        { pattern: /(authentication failed|invalid token)/i, message: "🔍 错误分析: Token认证失败，请检查token是否正确" },
        { pattern: /(connection refused|network)/i, message: "🔍 错误分析: 网络连接问题，请检查网络设置" },
        { pattern: /permission denied/i, message: "🔍 错误分析: 权限不足，请检查文件权限" },
        { pattern: /tunnel not found/i, message: "🔍 错误分析: 隧道未找到，请检查CloudFlare控制台配置" }
    ];

    /**
     * 查看日志的核心逻辑（原始代码保持不变）
     */
    const viewLogs = async () => {
        if (!(await validateAdvancedPermission())) return;

        try {
            const logRes = await runShellWithRoot(`tail -100 ${CLOUDFLARE_CONFIG.LOG_FILE} 2>/dev/null || echo "日志文件不存在"`);
            if (!logRes.success) {
                ToastManager.error("❌ 无法读取日志文件");
                return;
            }

            const logContent = logRes.content || "暂无日志内容";

            // 使用预定义模式进行错误分析，提高性能
            const errorAnalysis = ERROR_PATTERNS.find(({ pattern }) => pattern.test(logContent))?.message || "";

            ToastManager.info(
                `📋 CloudFlare Tunnel 日志 (最近100行):\n\n${logContent}${errorAnalysis ? '\n' + errorAnalysis : ''}`,
                20000
            );
        } catch (error) {
            ToastManager.error(`读取日志失败: ${error.message}`);
        }
    };

    /**
     * 检查服务状态的核心逻辑（原始代码保持不变）
     */
    const checkStatus = async () => {
        if (!(await validateAdvancedPermission())) return;

        try {
            const { running, pid } = await isServiceRunning(false); // 强制刷新状态

            if (running) {
                // 一次性获取进程详细信息
                const processInfoRes = await runShellWithRoot(`
                    ps -o etime=,pcpu=,pmem= -p ${pid} 2>/dev/null | tail -1 || echo "未知 未知 未知"
                `);

                const [uptime = "未知", cpu = "未知", mem = "未知"] = processInfoRes.success
                    ? processInfoRes.content.trim().split(/\s+/)
                    : ["未知", "未知", "未知"];

                ToastManager.success(
                    `✅ CloudFlare Tunnel 服务正在运行\n` +
                    `进程ID: ${pid}\n` +
                    `运行时间: ${uptime}\n` +
                    `CPU使用率: ${cpu}%\n` +
                    `内存使用率: ${mem}%`
                );
            } else {
                const diagnosisInfo = await diagnosisStartupFailure();
                ToastManager.warning(`⚠️ CloudFlare Tunnel 服务未运行\n\n诊断信息:\n${diagnosisInfo}`);
            }
        } catch (error) {
            ToastManager.error(`检查状态失败: ${error.message}`);
        }
    };

    /**
     * 创建按钮元素的工厂函数
     * @param {string} text - 按钮文本
     * @param {Function} handler - 点击处理函数
     * @param {boolean} needConfirm - 是否需要二次确认
     * @returns {HTMLButtonElement} 按钮元素
     */
    const createButton = (text, handler, needConfirm = false) => {
        const btn = Object.assign(document.createElement('button'), {
            className: 'btn',
            textContent: text
        });

        if (needConfirm) {
            let clickCount = 0;
            let timer = null;

            const clickHandler = () => {
                clickCount++;
                if (clickCount < 2) {
                    ToastManager.warning(`⚠️ 再点一次确认${text}`);
                    if (timer) clearTimeout(timer);
                    timer = setTimeout(() => {
                        clickCount = 0;
                        timer = null;
                    }, 3000);
                    return;
                }

                // 清理定时器
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                clickCount = 0;

                // 防抖处理
                btn.disabled = true;
                handler().finally(() => {
                    btn.disabled = false;
                });
            };

            btn.addEventListener('click', clickHandler);

            // 添加清理函数到按钮对象
            btn._cleanup = () => {
                if (timer) {
                    clearTimeout(timer);
                    timer = null;
                }
                btn.removeEventListener('click', clickHandler);
            };
        } else {
            const clickHandler = () => {
                btn.disabled = true;
                handler().finally(() => {
                    btn.disabled = false;
                });
            };

            btn.addEventListener('click', clickHandler);

            // 添加清理函数到按钮对象
            btn._cleanup = () => {
                btn.removeEventListener('click', clickHandler);
            };
        }

        return btn;
    };

    // 批量创建按钮（使用异步包装器确保错误处理）
    const createAsyncWrapper = (fn) => async () => {
        try {
            await fn();
        } catch (error) {
            ToastManager.error(`操作失败: ${error.message}`);
            console.error('CloudFlare Tunnel 操作错误:', error);
        }
    };

    const buttons = [
        createButton('安装 CloudFlare Tunnel', createAsyncWrapper(installCloudflared)),
        createButton('启动服务', createAsyncWrapper(startCloudflared)),
        createButton('重启服务', createAsyncWrapper(restartCloudflared)),
        createButton('检查状态', createAsyncWrapper(checkStatus)),
        createButton('查看日志', createAsyncWrapper(viewLogs)),
        createButton('卸载', createAsyncWrapper(uninstallCloudflared), true)
    ];

    /**
     * 清理资源函数
     */
    const cleanup = () => {
        // 清理按钮事件监听器
        buttons.forEach(btn => {
            if (btn._cleanup) {
                btn._cleanup();
            }
        });

        // 清理缓存
        statusCache = { data: null, timestamp: 0, ttl: 5000 };

        // 清理全局变量
        currentToken = null;
        cloudflaredProcessId = null;
    };

    /**
     * 初始化CloudFlare Tunnel插件面板
     */
    (() => {
        const container = document.querySelector('.functions-container');

        // 检查是否已存在，避免重复初始化
        if (document.getElementById('CLOUDFLARE_TUNNEL')) {
            cleanup();
            document.getElementById('CLOUDFLARE_TUNNEL').remove();
        }

        // 使用模板字符串和更简洁的HTML结构
        container.insertAdjacentHTML("afterend", `
<div id="CLOUDFLARE_TUNNEL" style="width: 100%; margin-top: 10px;">
    <div class="title" style="margin: 6px 0; color: #fff; display: flex; align-items: center; gap: 15px;">
        <strong style="color:#fff;">☁️ CloudFlare Tunnel 内网穿透</strong>
        <div style="display: inline-block;" id="collapse_cloudflare_btn"></div>
    </div>
    <div class="collapse" id="collapse_cloudflare" data-name="close" style="height: 0px; overflow: hidden;">
        <div class="collapse_box">
            <ul class="deviceList" style="margin:0;padding:0;list-style:none;">
                <li style="padding:15px;">
                    <div style="font-weight:bold;margin-bottom:12px;color:#fff;font-size:14px;">☁️ CloudFlare Tunnel 配置与控制</div>
                    
                    <!-- Token配置区域 -->
                    <div style="margin-bottom:16px;padding:12px;background:rgba(255,255,255,0.05);border-radius:6px;border-left:3px solid #0ea5e9;">
                        <div style="font-size:12px;color:#ccc;margin-bottom:6px;font-weight:500;">🔑 Token 配置</div>
                        <textarea id="cloudflare_token_input" placeholder="例如: cloudflared.exe service install eyJhIjoiNzlmZGI4aaaaaak111111jA3Z2222222ZTgzMjdlYjgiLCJ0IjoiYjU2MTA2YzYtMjcaaaaaabbbbbbccccccDZkYWNkMWM5MjA2IiwicyI6Ik9UVTVNemsxWm1ZdFphhhhhhggggggffffffeeeeeeeddddddccccccbbbbbbaaaaaa" style="width:calc(100% - 2px);max-width:100%;padding:8px;border:1px solid #555;border-radius:4px;background:#333;color:#fff;font-size:12px;min-height:60px;resize:vertical;box-sizing:border-box;" rows="3"></textarea>
                        <div style="font-size:11px;color:#888;margin-top:4px;">💡 支持格式: 1) 完整命令 2) 直接输入token | 如启动失败请点击'查看日志'或'检查状态'诊断</div>
                    </div>
                    
                    <!-- 服务控制区域 -->
                    <div style="padding:12px;background:rgba(255,255,255,0.05);border-radius:6px;border-left:3px solid #10b981;">
                        <div style="font-size:12px;color:#ccc;margin-bottom:8px;font-weight:500;">🎛️ 服务控制</div>
                        <div id="cloudflare_action_box" style="display:flex;gap:8px;flex-wrap:wrap;"></div>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</div>
`);

        // 使用文档片段批量添加按钮，减少DOM操作
        const fragment = document.createDocumentFragment();
        buttons.forEach(btn => fragment.appendChild(btn));
        document.querySelector('#cloudflare_action_box').appendChild(fragment);

        // 初始化折叠功能
        collapseGen("#collapse_cloudflare_btn", "#collapse_cloudflare", "#collapse_cloudflare", () => { });

        // 页面卸载时清理资源
        window.addEventListener('beforeunload', cleanup);
    })();
})();
//</script>