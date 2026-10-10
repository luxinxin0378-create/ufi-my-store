//<script>
(async () => {
    const PLUGIN_NAME = '网络检测助手'
    const PREFIX = 'kano_network_guard'
    const MODAL_NAME = `${PREFIX}_modal`
    const BASE_DIR = '/data/kano_network_guard'
    const SERVICE_FILE = `${BASE_DIR}/network_guard.sh`
    const CONFIG_FILE = `${BASE_DIR}/config.conf`
    const STATUS_FILE = `${BASE_DIR}/status.conf`
    const LOG_FILE = `${BASE_DIR}/network_guard.log`
    const BOOT_FILE = '/sdcard/ufi_tools_boot.sh'
    const BOOT_COMMAND = 'sh /data/kano_network_guard/network_guard.sh start >/dev/null 2>&1 &'

    const DEFAULT_CONFIG = {
        enabled: false,
        intervalMinutes: 5,
        timeoutSeconds: 8,
        retryCount: 2,
        retryDelaySeconds: 10,
        targets: [
            'https://www.baidu.com/',
            'https://www.taobao.com/',
            'https://www.jd.com/',
            'https://www.bilibili.com/',
            'https://cn.bing.com/',
            'https://connectivitycheck.gstatic.com/generate_204',
        ],
    }

    // Shell 服务独立于网页运行，关闭 UFI-TOOLS 页面后仍会继续检测。
    const SERVICE_SCRIPT = String.raw`#!/system/bin/sh
BASE_DIR=/data/kano_network_guard
SERVICE_FILE=$BASE_DIR/network_guard.sh
CONFIG_FILE=$BASE_DIR/config.conf
STATUS_FILE=$BASE_DIR/status.conf
LOG_FILE=$BASE_DIR/network_guard.log
PID_FILE=$BASE_DIR/network_guard.pid
GRACE_SECONDS=600

mkdir -p "$BASE_DIR"

ACTIVE_PIDS=''

cleanup_children() {
    for CHILD_PID in $ACTIVE_PIDS; do
        kill "$CHILD_PID" 2>/dev/null
    done
    ACTIVE_PIDS=''
}

shutdown_service() {
    trap - INT TERM EXIT
    cleanup_children
    rm -rf "$BASE_DIR/.round.$$"
    rm -f "$PID_FILE"
    exit 0
}

service_sleep() {
    sleep "$1" &
    ACTIVE_PIDS=$!
    wait "$ACTIVE_PIDS" 2>/dev/null
    SLEEP_RESULT=$?
    ACTIVE_PIDS=''
    return "$SLEEP_RESULT"
}

log_message() {
    NOW=$(date '+%Y-%m-%d %H:%M:%S')
    printf '%s %s\n' "$NOW" "$1" >> "$LOG_FILE"
    if [ -f "$LOG_FILE" ]; then
        tail -n 200 "$LOG_FILE" > "$LOG_FILE.tmp.$$" 2>/dev/null && mv "$LOG_FILE.tmp.$$" "$LOG_FILE"
    fi
}

write_status() {
    NOW_EPOCH=$(date '+%s')
    {
        printf 'UPDATED_AT=%s\n' "$NOW_EPOCH"
        printf 'STATE=%s\n' "$1"
        printf 'MESSAGE=%s\n' "$2"
        printf 'SUCCESS_COUNT=%s\n' "$3"
        printf 'TOTAL_COUNT=%s\n' "$4"
        printf 'ATTEMPT=%s\n' "$5"
    } > "$STATUS_FILE.tmp.$$"
    mv "$STATUS_FILE.tmp.$$" "$STATUS_FILE"
}

load_config() {
    ENABLED=0
    INTERVAL_SECONDS=300
    TIMEOUT_SECONDS=8
    RETRY_COUNT=2
    RETRY_DELAY_SECONDS=10
    TARGET_COUNT=6
    TARGET_1='https://www.baidu.com/'
    TARGET_2='https://www.taobao.com/'
    TARGET_3='https://www.jd.com/'
    TARGET_4='https://www.bilibili.com/'
    TARGET_5='https://cn.bing.com/'
    TARGET_6='https://connectivitycheck.gstatic.com/generate_204'
    [ -f "$CONFIG_FILE" ] && . "$CONFIG_FILE"

    case "$ENABLED" in 0|1) ;; *) ENABLED=0 ;; esac
    case "$INTERVAL_SECONDS" in ''|*[!0-9]*) INTERVAL_SECONDS=300 ;; esac
    case "$TIMEOUT_SECONDS" in ''|*[!0-9]*) TIMEOUT_SECONDS=8 ;; esac
    case "$RETRY_COUNT" in ''|*[!0-9]*) RETRY_COUNT=2 ;; esac
    case "$RETRY_DELAY_SECONDS" in ''|*[!0-9]*) RETRY_DELAY_SECONDS=10 ;; esac
    case "$TARGET_COUNT" in ''|*[!0-9]*) TARGET_COUNT=6 ;; esac
}

find_curl() {
    if [ -x /data/data/com.minikano.f50_sms/files/curl ]; then
        CURL_BIN=/data/data/com.minikano.f50_sms/files/curl
    else
        CURL_BIN=$(command -v curl 2>/dev/null)
    fi
}

check_round() {
    find_curl
    if [ -z "$CURL_BIN" ]; then
        ROUND_SUCCESS=0
        ROUND_TOTAL=$TARGET_COUNT
        log_message '未找到 curl，检测失败'
        return 1
    fi

    RESULT_DIR=$BASE_DIR/.round.$$
    rm -rf "$RESULT_DIR"
    mkdir -p "$RESULT_DIR"
    INDEX=1
    ACTIVE_PIDS=''
    while [ "$INDEX" -le "$TARGET_COUNT" ]; do
        eval "TARGET_URL=\$TARGET_$INDEX"
        "$CURL_BIN" -L -sS \
            --connect-timeout "$TIMEOUT_SECONDS" \
            --max-time "$TIMEOUT_SECONDS" \
            -o /dev/null -w '%{http_code}' \
            "$TARGET_URL" > "$RESULT_DIR/$INDEX.http" 2>/dev/null &
        ACTIVE_PIDS="$ACTIVE_PIDS $!"
        INDEX=$((INDEX + 1))
    done

    for CURL_PID in $ACTIVE_PIDS; do
        wait "$CURL_PID" 2>/dev/null
    done
    ACTIVE_PIDS=''

    INDEX=1
    while [ "$INDEX" -le "$TARGET_COUNT" ]; do
        HTTP_CODE=$(awk 'NR == 1 { print; exit }' "$RESULT_DIR/$INDEX.http" 2>/dev/null)
        case "$HTTP_CODE" in
            2??|3??|4??) printf '1\n' > "$RESULT_DIR/$INDEX" ;;
            *) printf '0\n' > "$RESULT_DIR/$INDEX" ;;
        esac
        rm -f "$RESULT_DIR/$INDEX.http"
        INDEX=$((INDEX + 1))
    done

    ROUND_SUCCESS=$(awk '{ total += $1 } END { print total + 0 }' "$RESULT_DIR"/* 2>/dev/null)
    ROUND_TOTAL=$TARGET_COUNT
    rm -rf "$RESULT_DIR"
    REQUIRED=$((TARGET_COUNT / 2 + 1))
    [ "$ROUND_SUCCESS" -ge "$REQUIRED" ]
}

run_check_cycle() {
    ATTEMPT=1
    MAX_ATTEMPTS=$((RETRY_COUNT + 1))
    while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
        write_status checking 正在检测 0 "$TARGET_COUNT" "$ATTEMPT"
        if check_round; then
            write_status online 网络正常 "$ROUND_SUCCESS" "$ROUND_TOTAL" "$ATTEMPT"
            log_message "检测通过：$ROUND_SUCCESS/$ROUND_TOTAL（第 $ATTEMPT 次尝试）"
            return 0
        fi

        log_message "检测未通过：$ROUND_SUCCESS/$ROUND_TOTAL（第 $ATTEMPT/$MAX_ATTEMPTS 次尝试）"
        if [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; then
            write_status retrying 等待重试 "$ROUND_SUCCESS" "$ROUND_TOTAL" "$ATTEMPT"
            service_sleep "$RETRY_DELAY_SECONDS"
        fi
        ATTEMPT=$((ATTEMPT + 1))
    done

    write_status offline 确认无法联网 "$ROUND_SUCCESS" "$ROUND_TOTAL" "$MAX_ATTEMPTS"
    return 1
}

is_service_process() {
    CANDIDATE_PID=$1
    case "$CANDIDATE_PID" in ''|*[!0-9]*) return 1 ;; esac
    [ -r "/proc/$CANDIDATE_PID/cmdline" ] || return 1
    CMDLINE=$(tr '\000' ' ' < "/proc/$CANDIDATE_PID/cmdline" 2>/dev/null)
    case "$CMDLINE" in
        *"$SERVICE_FILE run"*) return 0 ;;
        *) return 1 ;;
    esac
}

is_running() {
    [ -f "$PID_FILE" ] || return 1
    PID=$(timeout 2s awk 'NR == 1 { print $1; exit }' "$PID_FILE" 2>/dev/null)
    if ! is_service_process "$PID" || ! kill -0 "$PID" 2>/dev/null; then
        rm -f "$PID_FILE"
        return 1
    fi
    return 0
}

stop_service() {
    if is_running; then
        kill "$PID" 2>/dev/null
        WAIT_COUNT=0
        while is_service_process "$PID" && kill -0 "$PID" 2>/dev/null && [ "$WAIT_COUNT" -lt 3 ]; do
            sleep 1
            WAIT_COUNT=$((WAIT_COUNT + 1))
        done
        if is_service_process "$PID" && kill -0 "$PID" 2>/dev/null; then
            kill -9 "$PID" 2>/dev/null
        fi
    fi
    rm -f "$PID_FILE"
    write_status stopped 服务已停止 0 0 0
}

run_service() {
    trap shutdown_service INT TERM
    trap 'cleanup_children; rm -f "$PID_FILE"' EXIT
    printf '%s\n' $$ > "$PID_FILE"
    log_message '网络检测服务已启动'

    while true; do
        load_config
        if [ "$ENABLED" != '1' ]; then
            write_status disabled 功能未启用 0 "$TARGET_COUNT" 0
            service_sleep 30
            continue
        fi

        UPTIME_SECONDS=$(awk '{ print int($1) }' /proc/uptime 2>/dev/null)
        case "$UPTIME_SECONDS" in ''|*[!0-9]*) UPTIME_SECONDS=0 ;; esac
        if [ "$UPTIME_SECONDS" -lt "$GRACE_SECONDS" ]; then
            WAIT_SECONDS=$((GRACE_SECONDS - UPTIME_SECONDS))
            write_status waiting 启动保护期 0 "$TARGET_COUNT" 0
            log_message "设备启动未满 10 分钟，等待 $WAIT_SECONDS 秒"
            service_sleep "$WAIT_SECONDS"
            continue
        fi

        if run_check_cycle; then
            service_sleep "$INTERVAL_SECONDS"
            continue
        fi

        write_status rebooting 连续检测失败，正在重启 "$ROUND_SUCCESS" "$ROUND_TOTAL" "$MAX_ATTEMPTS"
        log_message '所有重试均未通过严格多数判定，准备重启设备'
        sync
        service_sleep 3
        if reboot; then
            exit 0
        fi
        write_status error 重启命令执行失败 "$ROUND_SUCCESS" "$ROUND_TOTAL" "$MAX_ATTEMPTS"
        log_message '重启命令执行失败，将在下个周期重试检测'
        service_sleep "$INTERVAL_SECONDS"
    done
}

case "$1" in
    start)
        if is_running; then
            printf 'already_running\n'
            exit 0
        fi
        nohup sh "$0" run >/dev/null 2>&1 &
        sleep 1
        if is_running; then
            printf 'started\n'
            exit 0
        fi
        printf 'start_failed\n'
        exit 1
        ;;
    stop)
        stop_service
        printf 'stopped\n'
        ;;
    restart)
        stop_service
        nohup sh "$0" run >/dev/null 2>&1 &
        sleep 1
        if is_running; then
            printf 'restarted\n'
            exit 0
        fi
        printf 'restart_failed\n'
        exit 1
        ;;
    status)
        if is_running; then printf 'running\n'; else printf 'stopped\n'; fi
        ;;
    check)
        load_config
        if run_check_cycle; then
            printf 'online %s/%s\n' "$ROUND_SUCCESS" "$ROUND_TOTAL"
            exit 0
        fi
        printf 'offline %s/%s\n' "$ROUND_SUCCESS" "$ROUND_TOTAL"
        exit 1
        ;;
    run)
        run_service
        ;;
    *)
        printf 'usage: %s {start|stop|restart|status|check}\n' "$0"
        exit 1
        ;;
esac
`

    let modalRefreshTimer = null
    let modalRefreshInFlight = false
    let serviceOperationInProgress = false
    let enabledSwitch = null

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;')

    const parseKeyValue = (raw) => {
        const result = {}
        String(raw || '').split(/\r?\n/).forEach((line) => {
            const index = line.indexOf('=')
            if (index <= 0) return
            const key = line.slice(0, index).trim()
            let value = line.slice(index + 1).trim()
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
            result[key] = value
        })
        return result
    }

    const toInteger = (value, min, max, label) => {
        const number = Number(value)
        if (!Number.isInteger(number) || number < min || number > max) {
            throw new Error(`${label}需为 ${min}～${max} 的整数`)
        }
        return number
    }

    const validateTargets = (value) => {
        const targets = [...new Set(String(value || '')
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean))]

        if (targets.length < 3 || targets.length > 10) {
            throw new Error('检测目标需填写 3～10 个，每行一个')
        }
        targets.forEach((target) => {
            let url
            try { url = new URL(target) } catch { throw new Error(`网址格式无效：${target}`) }
            if (!/^https?:\/\//i.test(target) || !['http:', 'https:'].includes(url.protocol) || !url.hostname || /[\u0000-\u001f\u007f\s'"`<>]/.test(target)) {
                throw new Error(`仅支持不含空格的 HTTP/HTTPS 网址：${target}`)
            }
        })
        return targets
    }

    const formatError = (error) => escapeHtml(error?.message ?? error ?? '未知错误')

    const configToShell = (config) => {
        const lines = [
            '# 此文件由网络检测助手生成',
            `ENABLED=${config.enabled ? 1 : 0}`,
            `INTERVAL_SECONDS=${config.intervalMinutes * 60}`,
            `TIMEOUT_SECONDS=${config.timeoutSeconds}`,
            `RETRY_COUNT=${config.retryCount}`,
            `RETRY_DELAY_SECONDS=${config.retryDelaySeconds}`,
            `TARGET_COUNT=${config.targets.length}`,
        ]
        config.targets.forEach((target, index) => lines.push(`TARGET_${index + 1}='${target}'`))
        return `${lines.join('\n')}\n`
    }

    const defaultConfigText = () => configToShell(DEFAULT_CONFIG)

    const readFormConfig = () => ({
        enabled: Boolean(document.querySelector(`#${PREFIX}_enabled`)?.checked),
        intervalMinutes: toInteger(document.querySelector(`#${PREFIX}_interval`)?.value, 1, 1440, '检测间隔（分钟）'),
        timeoutSeconds: toInteger(document.querySelector(`#${PREFIX}_timeout`)?.value, 2, 60, '单目标超时（秒）'),
        retryCount: toInteger(document.querySelector(`#${PREFIX}_retries`)?.value, 0, 10, '重试次数'),
        retryDelaySeconds: toInteger(document.querySelector(`#${PREFIX}_retry_delay`)?.value, 1, 300, '重试等待（秒）'),
        targets: validateTargets(document.querySelector(`#${PREFIX}_targets`)?.value),
    })

    const uploadTextFile = async (text, fileName, destination) => {
        const file = new File([text], fileName, { type: 'text/plain' })
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch(`${KANO_baseURL}/upload_img`, {
            method: 'POST',
            headers: common_headers,
            body: formData,
        })
        const data = await response.json()
        if (!response.ok || !data?.url || !/^\/uploads\/[a-zA-Z0-9._-]+$/.test(data.url)) {
            throw new Error(data?.error || '上传文件失败')
        }
        const source = `/data/data/com.minikano.f50_sms/files${data.url}`
        const result = await runShellWithRoot(`mkdir -p ${BASE_DIR} && mv ${source} ${destination}`)
        if (!result?.success) throw new Error(result?.content || '移动文件失败')
    }

    const inspectInstallation = async () => {
        const result = await runShellWithRoot(`
            [ -d ${BASE_DIR} ] && printf 'DIR:${BASE_DIR}\n'
            [ -e ${SERVICE_FILE} ] && printf 'FILE:${SERVICE_FILE}\n'
            [ -e ${CONFIG_FILE} ] && printf 'FILE:${CONFIG_FILE}\n'
            [ -e ${STATUS_FILE} ] && printf 'FILE:${STATUS_FILE}\n'
            [ -e ${LOG_FILE} ] && printf 'FILE:${LOG_FILE}\n'
            [ -e ${BASE_DIR}/network_guard.pid ] && printf 'FILE:${BASE_DIR}/network_guard.pid\n'
            if [ -f ${SERVICE_FILE} ] \
                && grep -qxF 'BASE_DIR=/data/kano_network_guard' ${SERVICE_FILE} \
                && grep -qxF 'PID_FILE=$BASE_DIR/network_guard.pid' ${SERVICE_FILE} \
                && grep -qxF 'GRACE_SECONDS=600' ${SERVICE_FILE}; then
                printf 'RECOGNIZED\n'
            fi
            [ -f ${BOOT_FILE} ] && grep -qxF '${BOOT_COMMAND}' ${BOOT_FILE} && printf 'BOOT_ENTRY\n'
            true
        `)
        if (!result?.success) throw new Error(result?.content || '检查安装目录失败')
        const lines = String(result.content || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
        return {
            existing: lines.filter((line) => line.startsWith('DIR:') || line.startsWith('FILE:')).map((line) => line.slice(line.indexOf(':') + 1)),
            recognized: lines.includes('RECOGNIZED'),
            bootEntry: lines.includes('BOOT_ENTRY'),
        }
    }

    const ensureBootEntry = async () => {
        const result = await runShellWithRoot(`
            mkdir -p ${BASE_DIR}
            chmod 700 ${SERVICE_FILE}
            touch ${BOOT_FILE}
            grep -qxF '${BOOT_COMMAND}' ${BOOT_FILE} || echo '${BOOT_COMMAND}' >> ${BOOT_FILE}
        `)
        if (!result?.success) throw new Error(result?.content || '写入启动项失败')
    }

    const installServiceFiles = async ({ allowExisting = false, config = null } = {}) => {
        const inspection = await inspectInstallation()
        if (inspection.existing.length && !allowExisting) {
            throw new Error(`发现已有目录或文件，为防止冲突，请使用“安装/修复服务”确认处理：${inspection.existing.slice(0, 3).join('、')}`)
        }
        if (inspection.recognized) {
            const stopResult = await runShellWithRoot(`sh ${SERVICE_FILE} stop 2>/dev/null`)
            if (!stopResult?.success) throw new Error(stopResult?.content || '停止旧服务失败')
        }
        await uploadTextFile(SERVICE_SCRIPT, 'network_guard.sh', SERVICE_FILE)
        if (config) {
            await uploadTextFile(configToShell(config), 'config.conf', CONFIG_FILE)
        } else if (!inspection.existing.includes(CONFIG_FILE)) {
            await uploadTextFile(defaultConfigText(), 'config.conf', CONFIG_FILE)
        }
        await ensureBootEntry()
        return inspection
    }

    const ensureServiceReady = async (config) => {
        const inspection = await inspectInstallation()
        if (inspection.recognized) {
            await ensureBootEntry()
            return inspection
        }
        if (inspection.existing.length) {
            throw new Error(`检测到同名目录或文件，但无法确认是本插件创建的。请先使用“安装/修复服务”确认：${inspection.existing.slice(0, 3).join('、')}`)
        }
        return installServiceFiles({ config })
    }

    const readPluginState = async () => {
        const result = await runShellWithRoot(`
            printf '%s\n' '__KNG_CONFIG__'
            timeout 2s awk '{print}' ${CONFIG_FILE} 2>/dev/null
            printf '%s\n' '__KNG_STATUS__'
            timeout 2s awk '{print}' ${STATUS_FILE} 2>/dev/null
            printf '%s\n' '__KNG_LOG__'
            timeout 2s awk '{print}' ${LOG_FILE} 2>/dev/null | tail -n 80
            printf '%s\n' '__KNG_SERVICE__'
            [ -x ${SERVICE_FILE} ] && sh ${SERVICE_FILE} status || echo not_installed
        `)
        if (!result?.success) throw new Error(result?.content || '读取插件状态失败')

        const sections = { config: [], status: [], log: [], service: [] }
        const sectionMarkers = {
            __KNG_CONFIG__: 'config',
            __KNG_STATUS__: 'status',
            __KNG_LOG__: 'log',
            __KNG_SERVICE__: 'service',
        }
        let currentSection = null
        String(result.content || '').split(/\r?\n/).forEach((line) => {
            if (sectionMarkers[line]) {
                currentSection = sectionMarkers[line]
            } else if (currentSection) {
                sections[currentSection].push(line)
            }
        })
        return {
            config: parseKeyValue(sections.config.join('\n')),
            status: parseKeyValue(sections.status.join('\n')),
            log: sections.log.join('\n').trim(),
            service: sections.service.join('\n').trim(),
        }
    }

    const stateLabel = (state) => ({
        online: ['网络正常', '#63d68b'],
        checking: ['正在检测', '#6db7ff'],
        retrying: ['等待重试', '#ffca5c'],
        offline: ['确认离线', '#ff6b6b'],
        rebooting: ['正在重启', '#ff6b6b'],
        waiting: ['启动保护期', '#ffca5c'],
        disabled: ['未启用', '#aaa'],
        stopped: ['服务已停止', '#aaa'],
        error: ['运行异常', '#ff6b6b'],
    }[state] || ['暂无状态', '#aaa'])

    const renderState = (data, fillForm = false) => {
        const statusEl = document.querySelector(`#${PREFIX}_status`)
        const serviceEl = document.querySelector(`#${PREFIX}_service`)
        const logEl = document.querySelector(`#${PREFIX}_log`)
        if (!statusEl || !serviceEl || !logEl) return

        const [label, color] = stateLabel(data.status.STATE)
        const success = Number(data.status.SUCCESS_COUNT || 0)
        const total = Number(data.status.TOTAL_COUNT || 0)
        const majority = total > 0 ? Math.floor(total / 2) + 1 : 0
        const updateTime = Number(data.status.UPDATED_AT || 0)
        statusEl.innerHTML = `
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                <strong style="color:${color};">${escapeHtml(label)}</strong>
                <span style="opacity:.72;">${updateTime ? escapeHtml(new Date(updateTime * 1000).toLocaleString()) : '--'}</span>
            </div>
            <div style="margin-top:6px;opacity:.86;">${escapeHtml(data.status.MESSAGE || '尚未执行检测')}</div>
            <div style="margin-top:4px;opacity:.72;">最近结果：${success}/${total || '--'}${majority ? `，通过门槛 ${majority}` : ''}；尝试序号：${escapeHtml(data.status.ATTEMPT || '--')}</div>
        `
        serviceEl.textContent = data.service.includes('running') ? '后台服务：运行中' : data.service.includes('not_installed') ? '后台服务：未安装' : '后台服务：已停止'
        logEl.textContent = data.log || '暂无日志'
        logEl.scrollTop = logEl.scrollHeight

        if (!fillForm || !Object.keys(data.config).length) return
        const targetCount = Number(data.config.TARGET_COUNT || 0)
        const targets = []
        for (let index = 1; index <= targetCount; index++) {
            if (data.config[`TARGET_${index}`]) targets.push(data.config[`TARGET_${index}`])
        }
        const enabled = data.config.ENABLED === '1'
        const enabledInput = document.querySelector(`#${PREFIX}_enabled`)
        if (enabledInput) enabledInput.checked = enabled
        enabledSwitch?.update(enabled)
        document.querySelector(`#${PREFIX}_interval`).value = Math.max(1, Math.round(Number(data.config.INTERVAL_SECONDS || 300) / 60))
        document.querySelector(`#${PREFIX}_timeout`).value = Number(data.config.TIMEOUT_SECONDS || 8)
        document.querySelector(`#${PREFIX}_retries`).value = Number(data.config.RETRY_COUNT || 2)
        document.querySelector(`#${PREFIX}_retry_delay`).value = Number(data.config.RETRY_DELAY_SECONDS || 10)
        document.querySelector(`#${PREFIX}_targets`).value = (targets.length ? targets : DEFAULT_CONFIG.targets).join('\n')
    }

    const refreshState = async (fillForm = false) => {
        if (modalRefreshInFlight) return true
        modalRefreshInFlight = true
        try {
            renderState(await readPluginState(), fillForm)
            return true
        } catch (error) {
            const serviceEl = document.querySelector(`#${PREFIX}_service`)
            if (serviceEl) serviceEl.textContent = `读取状态失败：${error?.message || error}`
            return false
        } finally {
            modalRefreshInFlight = false
        }
    }

    const beginServiceOperation = async () => {
        if (serviceOperationInProgress) {
            createToast('已有服务操作正在执行，请稍候', 'pink')
            return false
        }
        serviceOperationInProgress = true
        while (modalRefreshInFlight) {
            await new Promise((resolve) => setTimeout(resolve, 50))
        }
        return true
    }

    const endServiceOperation = () => {
        serviceOperationInProgress = false
    }

    const saveAndApply = async () => {
        const saveButton = document.querySelector(`#${PREFIX}_save`)
        if (saveButton?.disabled) return
        if (!await beginServiceOperation()) return
        try {
            if (saveButton) saveButton.disabled = true
            const config = readFormConfig()
            createToast('正在保存网络检测配置...')
            await ensureServiceReady(config)
            await uploadTextFile(configToShell(config), 'config.conf', CONFIG_FILE)
            const action = config.enabled ? 'restart' : 'stop'
            const result = await runShellWithRoot(`sh ${SERVICE_FILE} ${action}`)
            if (!result?.success) throw new Error(result?.content || '服务操作失败')
            createToast(config.enabled ? '配置已保存，检测服务已启动' : '配置已保存，检测服务已停用', 'green')
            await refreshState(true)
        } catch (error) {
            createToast(`保存失败：${formatError(error)}`, 'pink', 6000)
        } finally {
            if (saveButton) saveButton.disabled = false
            endServiceOperation()
        }
    }

    const testNow = async () => {
        const testButton = document.querySelector(`#${PREFIX}_test`)
        if (testButton?.disabled) return
        if (!await beginServiceOperation()) return
        try {
            if (testButton) testButton.disabled = true
            const config = readFormConfig()
            createToast('正在并发检测，失败时会按当前配置重试...')
            await ensureServiceReady(config)
            await uploadTextFile(configToShell(config), 'config.conf', CONFIG_FILE)
            const result = await runShellWithRoot(`sh ${SERVICE_FILE} check`, (config.timeoutSeconds + config.retryDelaySeconds) * (config.retryCount + 1) * 1000 + 15000)
            const output = String(result?.content || '').trim()
            if (result?.success && output.includes('online')) {
                createToast(`检测通过：${escapeHtml(output)}`, 'green', 5000)
            } else {
                createToast(`检测未通过：${escapeHtml(output || '目标多数不可达')}`, 'pink', 6000)
            }
            await refreshState(false)
        } catch (error) {
            createToast(`立即检测失败：${formatError(error)}`, 'pink', 6000)
        } finally {
            if (testButton) testButton.disabled = false
            endServiceOperation()
        }
    }

    let repairConfirmUntil = 0
    let uninstallConfirmUntil = 0

    const repairService = async () => {
        const repairButton = document.querySelector(`#${PREFIX}_repair`)
        if (repairButton?.disabled) return
        if (!await beginServiceOperation()) return
        try {
            const config = readFormConfig()
            const inspection = await inspectInstallation()
            if (inspection.existing.length && Date.now() > repairConfirmUntil) {
                repairConfirmUntil = Date.now() + 6000
                createToast(`检测到已有目录或文件：${escapeHtml(inspection.existing.slice(0, 3).join('、'))}<br>为防止冲突，请在 6 秒内再次点击“安装/修复服务”确认覆盖插件文件。`, 'pink', 6000)
                return
            }

            repairConfirmUntil = 0
            if (repairButton) repairButton.disabled = true
            createToast(inspection.existing.length ? '正在修复后台服务...' : '正在安装后台服务...')
            await installServiceFiles({ allowExisting: inspection.existing.length > 0, config })
            const result = await runShellWithRoot(`sh ${SERVICE_FILE} ${config.enabled ? 'restart' : 'stop'}`)
            if (!result?.success) throw new Error(result?.content || '启动服务失败')
            createToast(inspection.existing.length ? '后台服务及开机启动项已修复' : '后台服务安装成功', 'green')
            await refreshState(true)
        } catch (error) {
            createToast(`安装/修复失败：${formatError(error)}`, 'pink', 6000)
        } finally {
            if (repairButton) repairButton.disabled = false
            endServiceOperation()
        }
    }

    const uninstallService = async () => {
        const uninstallButton = document.querySelector(`#${PREFIX}_uninstall`)
        if (uninstallButton?.disabled) return
        if (!await beginServiceOperation()) return
        try {
            const inspection = await inspectInstallation()
            if (!inspection.existing.length && !inspection.bootEntry) {
                createToast('未发现网络检测助手服务，无需卸载', 'pink')
                return
            }
            if (Date.now() > uninstallConfirmUntil) {
                uninstallConfirmUntil = Date.now() + 6000
                createToast('卸载会停止服务、删除开机启动项及全部配置和日志。请在 6 秒内再次点击“卸载服务”确认。', 'pink', 6000)
                return
            }

            uninstallConfirmUntil = 0
            if (uninstallButton) uninstallButton.disabled = true
            createToast('正在卸载网络检测助手服务...')
            const stopCommand = inspection.recognized ? `sh ${SERVICE_FILE} stop 2>/dev/null` : ':'
            const result = await runShellWithRoot(`
                ${stopCommand}
                if [ -f ${BOOT_FILE} ]; then
                    sed -i '\\|/data/kano_network_guard/network_guard.sh|d' ${BOOT_FILE} || exit 1
                fi
                rm -rf ${BASE_DIR} || exit 1
            `)
            if (!result?.success) throw new Error(result?.content || '删除服务文件失败')
            const enabledInput = document.querySelector(`#${PREFIX}_enabled`)
            if (enabledInput) enabledInput.checked = false
            enabledSwitch?.update(false)
            createToast('后台服务、配置、日志及开机启动项已删除', 'green')
            await refreshState(false)
        } catch (error) {
            createToast(`卸载失败：${formatError(error)}`, 'pink', 6000)
        } finally {
            if (uninstallButton) uninstallButton.disabled = false
            endServiceOperation()
        }
    }

    const manualRefresh = async () => {
        const refreshButton = document.querySelector(`#${PREFIX}_refresh`)
        if (refreshButton?.disabled) return
        if (serviceOperationInProgress) return createToast('服务操作完成后会自动刷新', 'pink')
        try {
            if (refreshButton) refreshButton.disabled = true
            createToast('正在刷新服务状态和日志...')
            const success = await refreshState(false)
            createToast(success ? '状态和日志已刷新' : '刷新状态失败，请查看状态区域', success ? 'green' : 'pink')
        } finally {
            if (refreshButton) refreshButton.disabled = false
        }
    }

    const openModal = async () => {
        document.querySelector(`#${MODAL_NAME}`)?.remove()
        if (modalRefreshTimer) clearInterval(modalRefreshTimer)
        repairConfirmUntil = 0
        uninstallConfirmUntil = 0

        const { id, el } = createModal({
            name: MODAL_NAME,
            title: PLUGIN_NAME,
            maxWidth: '620px',
            showConfirm: false,
            onClose: () => {
                if (modalRefreshTimer) clearInterval(modalRefreshTimer)
                modalRefreshTimer = null
                return true
            },
            content: `
                <style>
                    .${PREFIX}_card { padding:10px;border-radius:10px;background:rgba(255,255,255,.04); }
                    .${PREFIX}_grid { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
                    .${PREFIX}_field { display:flex;flex-direction:column;gap:5px;font-size:.7rem; }
                    .${PREFIX}_field input, .${PREFIX}_field textarea { box-sizing:border-box;width:100%;border:none;border-radius:8px;padding:8px;background:rgba(255,255,255,.06);color:inherit; }
                    @media (max-width:480px) { .${PREFIX}_grid { grid-template-columns:1fr; } }
                </style>
                <div style="display:flex;flex-direction:column;gap:12px;font-size:.72rem;max-height:70vh;overflow:auto;padding-right:2px;">
                    <div class="${PREFIX}_card">
                        <div id="${PREFIX}_status">正在读取状态...</div>
                        <div id="${PREFIX}_service" style="margin-top:7px;opacity:.72;">后台服务：检测中</div>
                    </div>
                    <div class="${PREFIX}_card">
                        <div class="title" style="font-size:.78rem;margin-bottom:8px;">检测设置</div>
                        <div id="${PREFIX}_switch_box" style="margin-bottom:10px;"></div>
                        <div class="${PREFIX}_grid">
                            <label class="${PREFIX}_field">检测间隔（分钟）<input id="${PREFIX}_interval" type="number" min="1" max="1440" value="5"></label>
                            <label class="${PREFIX}_field">单目标超时（秒）<input id="${PREFIX}_timeout" type="number" min="2" max="60" value="8"></label>
                            <label class="${PREFIX}_field">超时/失败后重试次数<input id="${PREFIX}_retries" type="number" min="0" max="10" value="2"></label>
                            <label class="${PREFIX}_field">每次重试等待（秒）<input id="${PREFIX}_retry_delay" type="number" min="1" max="300" value="10"></label>
                        </div>
                        <label class="${PREFIX}_field" style="margin-top:10px;">检测目标（每行一个，3～10 个）
                            <textarea id="${PREFIX}_targets" rows="6" spellcheck="false">${escapeHtml(DEFAULT_CONFIG.targets.join('\n'))}</textarea>
                        </label>
                        <div style="margin-top:8px;opacity:.68;line-height:1.6;">所有目标会同时检测，成功数必须严格超过一半。设备启动后 10 分钟内始终处于保护期，不检测也不重启。</div>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button id="${PREFIX}_save">保存并应用</button>
                        <button id="${PREFIX}_test">立即检测</button>
                        <button id="${PREFIX}_repair">安装/修复服务</button>
                        <button id="${PREFIX}_uninstall">卸载服务</button>
                        <button id="${PREFIX}_refresh">刷新状态</button>
                    </div>
                    <div class="${PREFIX}_card">
                        <div class="title" style="font-size:.78rem;margin-bottom:7px;">最近日志</div>
                        <pre id="${PREFIX}_log" style="white-space:pre-wrap;word-break:break-all;max-height:180px;overflow:auto;margin:0;font-size:.64rem;line-height:1.55;">暂无日志</pre>
                    </div>
                </div>
            `,
        })

        enabledSwitch = createSwitch({
            text: '启用自动检测与离线重启',
            value: false,
            className: `${PREFIX}_switch`,
            fontSize: 13,
            onChange: (checked) => {
                const input = el.querySelector(`#${PREFIX}_enabled`)
                if (input) input.checked = checked
            },
        })
        const switchInput = enabledSwitch.querySelector('input')
        switchInput.id = `${PREFIX}_enabled`
        el.querySelector(`#${PREFIX}_switch_box`)?.appendChild(enabledSwitch)

        el.querySelector(`#${PREFIX}_save`).onclick = saveAndApply
        el.querySelector(`#${PREFIX}_test`).onclick = testNow
        el.querySelector(`#${PREFIX}_repair`).onclick = repairService
        el.querySelector(`#${PREFIX}_uninstall`).onclick = uninstallService
        el.querySelector(`#${PREFIX}_refresh`).onclick = manualRefresh

        showModal(id)
        await refreshState(true)
        modalRefreshTimer = setInterval(() => {
            if (!serviceOperationInProgress && !modalRefreshInFlight) refreshState(false)
        }, 5000)
    }

    const mainButton = document.createElement('button')
    mainButton.textContent = PLUGIN_NAME
    mainButton.onclick = async () => {
        if (!(await checkAdvancedFunc())) {
            createToast('请先启用高级功能', 'pink')
            return
        }
        await openModal()
    }

    document.querySelector('.actions-buttons')?.appendChild(mainButton)
})()
//</script>
