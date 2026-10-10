//<script>
// ============================================================
// UFI-TOOLS 插件：企业微信应用通道短信转发 v1.0
// ------------------------------------------------------------
// 功能：通过企业微信自建应用（企业ID + Secret + AgentId）转发设备收到的短信
//   - 总开关：一键启动/停止后台转发服务
//   - 消息类型：文本消息 / 卡片消息 一键切换
//   - 后台常驻：独立 shell 服务轮询收件箱，无需保持网页打开
//   - 开机自启 / 发送测试 / 实时日志
// UI 形态：弹窗型（主按钮触发 createModal，非常驻面板）
// 原理：企业微信应用通道需要"取token+发消息"两次请求，
//       系统自带 CURL 转发不经过 shell 无法串联两步，
//       本插件部署独立服务脚本，用设备内置 curl 完成。
// 依赖：utils.js 全局函数（runShellWithRoot / saveConfig /
//       createSwitch / createModal / requestInterval 等）
// ============================================================
(async () => {
    // ================== 常量 ==================
    const DIR = '/data/kano_wecom_forward'
    const SERVICE = `${DIR}/service.sh`
    const CONF_FILE = `${DIR}/config.conf`
    const LOG_FILE = `${DIR}/forward.log`
    const BOOT_CMD = `${DIR}/service.sh start`

    // 默认配置模板（首次使用时载入，只需填写前四项）
    const DEFAULT_CONF = `# ==========================================
# 企业微信应用通道 短信转发配置
# 请填写以下四项后再开启转发总开关
# ==========================================
# 企业ID（企业微信管理后台 → 我的企业 → 企业信息）
CORP_ID=
# 应用AgentId（自建应用详情页）
AGENT_ID=
# 应用Secret（自建应用详情页）
SECRET=
# 发送范围：成员账号，多个用 | 分隔，@all 表示全员
TO_USER=
# ------------------------------------------
# 以下一般无需修改
# 消息类型：text=文本消息 / textcard=卡片消息（由面板开关自动维护）
MSG_TYPE=text
# 卡片消息点击时跳转的链接
CARD_URL=http://192.168.88.1:2333/

# ==========================================
# 文本消息模板（支持上面所有占位符，可自由排版）
WECOM_TPL_TEXT_START
收到新短信
来自：{{sms-from}}
时间：{{sms-time}}
SIM卡：{{sim-slot}}
内容：{{sms-body}}
设备：{{model}} 电量{{battery-level}}% 温度{{cpu-temp}}℃ 内存{{mem-usage}}
WECOM_TPL_TEXT_END

# 卡片消息模板（title=标题，desc=描述，支持HTML）
WECOM_TPL_CARD_TITLE_START
收到新短信：{{sim-slot}} {{sms-from}}
WECOM_TPL_CARD_TITLE_END
WECOM_TPL_CARD_DESC_START
{{sms-body}}

<div class="normal">-----------------------</div>{{sms-time}}
<div class="normal">电量{{battery-level}}% 温度{{cpu-temp}}℃</div>
WECOM_TPL_CARD_DESC_END
`.replace(/\r\n/g, '\n')

    // 服务脚本源码（部署到 /data/kano_wecom_forward/service.sh）
    const SERVICE_SCRIPT = `#!/system/bin/sh
# =====================================================
# UFI-TOOLS 插件：企业微信应用通道短信转发服务
# 部署目录: /data/kano_wecom_forward
# 用法: service.sh start|stop|restart|status|test
# =====================================================

DIR=/data/kano_wecom_forward
CONF=$DIR/config.conf
STATE=$DIR/sms.state
TOKEN_CACHE=$DIR/token.cache
PAYLOAD=$DIR/payload.json
LOG=$DIR/forward.log
PID_FILE=$DIR/service.pid
STOP_FLAG=$DIR/stop.flag

CURL=/data/data/com.minikano.f50_sms/files/curl
[ -x "$CURL" ] || CURL=/data/data/com.minikano.f50_sms/files/shell/curl
[ -x "$CURL" ] || CURL=curl

API="https://qyapi.weixin.qq.com/cgi-bin"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> $LOG
    SIZE=$(wc -c < $LOG 2>/dev/null)
    if [ -n "$SIZE" ] && [ "$SIZE" -gt 102400 ]; then
        tail -n 200 $LOG > $LOG.tmp 2>/dev/null && mv $LOG.tmp $LOG
    fi
}

# JSON字符串转义（转义反斜杠、双引号，换行转为\\n）
json_escape() {
    printf '%s' "$1" | sed -e 's/\\\\/\\\\\\\\/g' -e 's/"/\\\\"/g' | awk '{printf "%s\\\\n", $0}' | sed '$ s/\\\\n$//'
}
# sed 替换值转义（转义 \\ | &）
sed_escape() {
    printf '%s' "$1" | sed -e 's/[\\|&]/\\\\&/g'
}
# 安全读取配置（只取 key=value，忽略模板块）
load_conf() {
    [ -f "$CONF" ] || return
    CORP_ID=$(awk '/^CORP_ID=/{sub(/^CORP_ID=/,"");print;exit}' "$CONF")
    AGENT_ID=$(awk '/^AGENT_ID=/{sub(/^AGENT_ID=/,"");print;exit}' "$CONF")
    SECRET=$(awk '/^SECRET=/{sub(/^SECRET=/,"");print;exit}' "$CONF")
    TO_USER=$(awk '/^TO_USER=/{sub(/^TO_USER=/,"");print;exit}' "$CONF")
    MSG_TYPE=$(awk '/^MSG_TYPE=/{sub(/^MSG_TYPE=/,"");print;exit}' "$CONF")
    CARD_URL=$(awk '/^CARD_URL=/{sub(/^CARD_URL=/,"");print;exit}' "$CONF")
}
# 读取模板块（start/end 标记之间）
get_tpl() {
    awk -v s="$1" -v e="$2" '$0==s{f=1;next} $0==e{f=0} f' "$CONF"
}
# 采集设备指标，设置全局变量
gather_device() {
    MODEL=$(getprop ro.product.model 2>/dev/null)
    [ -z "$MODEL" ] && MODEL="未知"
    APP_VER=$(dumpsys package com.minikano.f50_sms 2>/dev/null | grep -m1 versionName | tr -d '\\r' | awk '{print $2}')
    [ -z "$APP_VER" ] && APP_VER="未知"
    BAT=$(dumpsys battery 2>/dev/null)
    BAT_LEVEL=$(printf '%s' "$BAT" | grep -i 'level' | grep -o 'level: [0-9]*' | awk '{print $2}')
    BAT_CURRENT=$(printf '%s' "$BAT" | grep -i 'current now' | grep -o '[-0-9]*' | head -1)
    BAT_VOLT=$(printf '%s' "$BAT" | grep -i 'voltage' | grep -o '[0-9]*' | head -1)
    [ -n "$BAT_VOLT" ] && BAT_VOLTAGE=$(awk "BEGIN{printf \\\"%.2f\\\", $BAT_VOLT/1000}") || BAT_VOLTAGE="?"
    [ -z "$BAT_LEVEL" ] && BAT_LEVEL="?"
    [ -z "$BAT_CURRENT" ] && BAT_CURRENT="?"
    CPU_TEMP=$(cat /sys/class/thermal/thermal_zone*/temp 2>/dev/null | sort -n | tail -1)
    [ -n "$CPU_TEMP" ] && CPU_TEMP=$(awk "BEGIN{printf \\\"%.1f\\\", $CPU_TEMP/1000}") || CPU_TEMP="?"
    MEM_TOTAL=$(awk '/MemTotal/{print $2}' /proc/meminfo 2>/dev/null)
    MEM_AVAIL=$(awk '/MemAvailable/{print $2}' /proc/meminfo 2>/dev/null)
    if [ -n "$MEM_TOTAL" ] && [ -n "$MEM_AVAIL" ]; then
        MEM_USAGE=$(awk "BEGIN{printf \\\"%.0f%%\\\", ($MEM_TOTAL-$MEM_AVAIL)/$MEM_TOTAL*100}")
    else
        MEM_USAGE="?"
    fi
    CPU_USAGE=$(cpu_usage)
    BOOT_S=$(awk '{print int($1)}' /proc/uptime 2>/dev/null)
    if [ -n "$BOOT_S" ]; then
        BOOT_EPOCH=$(( $(date +%s) - BOOT_S ))
        BOOT_TIME=$(date -d @$BOOT_EPOCH '+%Y-%m-%d %H:%M:%S' 2>/dev/null)
    fi
    [ -z "$BOOT_TIME" ] && BOOT_TIME="?"
    DAILY_FLOW=$(daily_flow)
    MONTHLY_FLOW="未统计"
    LOCATION="未获取"
}
cpu_usage() {
    set -- $(awk '/^cpu /{print $2+$3+$4+$5+$6+$7+$8, $5}' /proc/stat)
    T1=$1; I1=$2
    sleep 0.5
    set -- $(awk '/^cpu /{print $2+$3+$4+$5+$6+$7+$8, $5}' /proc/stat)
    T2=$1; I2=$2
    DT=$((T2 - T1)); DI=$((I2 - I1))
    if [ -z "$DT" ] || [ "$DT" -le 0 ]; then echo "?"; return; fi
    awk "BEGIN{printf \\\"%.0f%%\\\", (1-$DI/$DT)*100}"
}
daily_flow() {
    SUM=0
    while read -r line; do
        case "$line" in
            *rmnet*)
                RX=$(printf '%s' "$line" | awk '{print $2}')
                TX=$(printf '%s' "$line" | awk '{print $10}')
                [ -z "$RX" ] && RX=0
                [ -z "$TX" ] && TX=0
                SUM=$((SUM + RX + TX))
                ;;
        esac
    done < /proc/net/dev
    if [ "$SUM" -gt 0 ]; then
        awk "BEGIN{printf \\\"%.1f MB\\\", $SUM/1024/1024}"
    else
        echo "未知"
    fi
}
# 占位符替换到模板文件
subst_tpl() {
    TPL=$1
    SB=$(printf '%s' "$SMS_BODY" | tr '\\n\\r' '  ')
    sed -i "s|{{sms-body}}|$(sed_escape "$SB")|g" "$TPL"
    sed -i "s|{{sms-time}}|$(sed_escape "$SMS_TIME")|g" "$TPL"
    sed -i "s|{{sms-from}}|$(sed_escape "$SMS_FROM")|g" "$TPL"
    sed -i "s|{{sim-slot}}|$(sed_escape "$SIM_SLOT")|g" "$TPL"
    sed -i "s|{{daily-flow}}|$(sed_escape "$DAILY_FLOW")|g" "$TPL"
    sed -i "s|{{monthly-flow-count}}|$(sed_escape "$MONTHLY_FLOW")|g" "$TPL"
    sed -i "s|{{cpu-temp}}|$(sed_escape "$CPU_TEMP")|g" "$TPL"
    sed -i "s|{{cpu-usage}}|$(sed_escape "$CPU_USAGE")|g" "$TPL"
    sed -i "s|{{mem-usage}}|$(sed_escape "$MEM_USAGE")|g" "$TPL"
    sed -i "s|{{app-ver}}|$(sed_escape "$APP_VER")|g" "$TPL"
    sed -i "s|{{battery-level}}|$(sed_escape "$BAT_LEVEL")|g" "$TPL"
    sed -i "s|{{battery-current}}|$(sed_escape "$BAT_CURRENT")|g" "$TPL"
    sed -i "s|{{battery-voltage}}|$(sed_escape "$BAT_VOLTAGE")|g" "$TPL"
    sed -i "s|{{model}}|$(sed_escape "$MODEL")|g" "$TPL"
    sed -i "s|{{boot-time}}|$(sed_escape "$BOOT_TIME")|g" "$TPL"
    sed -i "s|{{location}}|$(sed_escape "$LOCATION")|g" "$TPL"
}

# 获取access_token（缓存复用，超过7000秒自动刷新）
get_token() {
    NOW=$(date +%s)
    if [ -f $TOKEN_CACHE ]; then
        TS=$(awk 'NR==1{print $1}' $TOKEN_CACHE)
        TOK=$(awk 'NR==1{print $2}' $TOKEN_CACHE)
        AGE=$((NOW - TS))
        if [ -n "$TOK" ] && [ "$AGE" -gt 0 ] && [ "$AGE" -lt 7000 ]; then
            printf '%s' "$TOK"
            return 0
        fi
    fi
    RESP=$($CURL -s -m 15 "$API/gettoken?corpid=$CORP_ID&corpsecret=$SECRET")
    TOK=$(printf '%s' "$RESP" | sed -n 's/.*"access_token":"\\([^"]*\\)".*/\\1/p')
    if [ -z "$TOK" ]; then
        log "获取access_token失败: $RESP"
        return 1
    fi
    echo "$NOW $TOK" > $TOKEN_CACHE
    printf '%s' "$TOK"
    return 0
}

# 转发一条消息
forward_one() {
    [ -n "$1" ] && SMS_FROM="$1"
    [ -n "$2" ] && SMS_BODY="$2"
    [ -n "$3" ] && SMS_TIME="$3"
    [ -n "$4" ] && SIM_SLOT="$4"

    gather_device

    if [ "$MSG_TYPE" = "textcard" ]; then
        TT=$(get_tpl "WECOM_TPL_CARD_TITLE_START" "WECOM_TPL_CARD_TITLE_END")
        TD=$(get_tpl "WECOM_TPL_CARD_DESC_START" "WECOM_TPL_CARD_DESC_END")
        [ -z "$TT" ] && TT="收到新短信：{{sms-from}}"
        [ -z "$TD" ] && TD="<div class='gray'>{{sms-time}} 来自 {{sms-from}}</div><div class='normal'>{{sms-body}}</div>"
        echo "$TT" > $DIR/.tpl_title
        echo "$TD" > $DIR/.tpl_desc
        subst_tpl $DIR/.tpl_title
        subst_tpl $DIR/.tpl_desc
        TT_ESC=$(json_escape "$(cat $DIR/.tpl_title)")
        TD_ESC=$(json_escape "$(cat $DIR/.tpl_desc)")
        printf '{"touser":"%s","msgtype":"textcard","agentid":%s,"textcard":{"title":"%s","description":"%s","url":"%s","btntxt":"查看详情"}}\\n' "$TO_USER" "$AGENT_ID" "$TT_ESC" "$TD_ESC" "$CARD_URL" > $PAYLOAD
    else
        TPL_TEXT=$(get_tpl "WECOM_TPL_TEXT_START" "WECOM_TPL_TEXT_END")
        [ -z "$TPL_TEXT" ] && TPL_TEXT=$(printf '收到新短信\\n来自：{{sms-from}}\\n时间：{{sms-time}}\\nSIM卡：{{sim-slot}}\\n内容：{{sms-body}}')
        echo "$TPL_TEXT" > $DIR/.tpl_text
        subst_tpl $DIR/.tpl_text
        CONTENT=$(json_escape "$(cat $DIR/.tpl_text)")
        printf '{"touser":"%s","msgtype":"text","agentid":%s,"text":{"content":"%s"}}\\n' "$TO_USER" "$AGENT_ID" "$CONTENT" > $PAYLOAD
    fi

    TOK=$(get_token)
    if [ -z "$TOK" ]; then
        log "放弃转发（无可用token）: $SMS_FROM"
        return 1
    fi
    RESP=$($CURL -s -m 15 -X POST "$API/message/send?access_token=$TOK" -H "Content-Type: application/json" -d @$PAYLOAD)
    if printf '%s' "$RESP" | grep -q '"errcode":0'; then
        log "转发成功 -> $SMS_FROM"
        return 0
    fi
    log "发送失败($RESP)，刷新token后重试..."
    rm -f $TOKEN_CACHE
    TOK=$(get_token)
    if [ -z "$TOK" ]; then
        return 1
    fi
    RESP=$($CURL -s -m 15 -X POST "$API/message/send?access_token=$TOK" -H "Content-Type: application/json" -d @$PAYLOAD)
    if printf '%s' "$RESP" | grep -q '"errcode":0'; then
        log "转发成功(重试) -> $SMS_FROM"
        return 0
    fi
    log "转发失败: $RESP"
    return 1
}

# 检查收件箱是否有新短信（修复：移除会误吞短信的"3分钟时间窗"，
# 改为基于 _id 去重；支持一次处理多条；自动识别秒/毫秒时间戳）
check_sms() {
    [ -z "$CORP_ID" ] && return
    [ -z "$SECRET" ] && return
    [ -z "$AGENT_ID" ] && return
    [ -z "$TO_USER" ] && return

    RAW=$(content query --uri content://sms/inbox --projection _id:address:body:date:sub_id 2>/dev/null | tr -d '\\r')

    # 首次运行且收件箱为空：先记下基准 0，避免第一条新短信被误当基线而漏发
    LAST=""
    [ -f $STATE ] && LAST=$(awk 'NR==1{print}' $STATE)
    if [ -z "$LAST" ] && [ -z "$RAW" ]; then
        echo "0" > $STATE
        log "首次运行：收件箱为空，已就绪，之后新短信将直接转发"
        return
    fi

    if [ -z "$RAW" ]; then
        log "check_sms: content query 无输出（请确认已授权读取短信、content 命令可用）"
        return
    fi

    IDS=$(printf '%s\\n' "$RAW" | sed -n 's/.*_id=\\([0-9][0-9]*\\),.*/\\1/p' | sort -n)
    MAXID=$(printf '%s\\n' "$IDS" | tail -1)

    LAST=""
    [ -f $STATE ] && LAST=$(awk 'NR==1{print}' $STATE)

    # 首次运行（STATE 不存在）：把当前收件箱最大 _id 记为基准气；若收件箱为空则记为 0，
    # 保证之后第一条新短信也会转发，不会因被误当基线而漏发。
    if [ -z "$LAST" ]; then
        if [ -n "$MAXID" ]; then
            echo "$MAXID" > $STATE
            log "首次运行：基准 _id=$MAXID，之后收到的新短信才会转发"
        else
            echo "0" > $STATE
            log "首次运行：收件箱为空，已就绪，之后新短信将直接转发"
        fi
        return
    fi

    [ -z "$MAXID" ] && return

    printf '%s\\n' "$IDS" | while read ID; do
        [ -z "$ID" ] && continue
        if [ "$ID" -le "$LAST" ] 2>/dev/null; then continue; fi
        LINE=$(printf '%s\\n' "$RAW" | awk -v id="$ID" '$0 ~ ("_id=" id "([^0-9]|$)") {print; exit}')
        [ -z "$LINE" ] && continue
        ADDRESS=$(printf '%s' "$LINE" | sed 's/.*address=//; s/, body=.*//')
        SMS_DATE=$(printf '%s' "$LINE" | sed -n 's/.*[ ,]date=["]\?\\([0-9][0-9]*\\).*/\\1/p')
        BODY=$(printf '%s' "$LINE" | sed 's/.*body=//; s/, date=.*//')
        SUB=$(printf '%s' "$LINE" | sed -n 's/.*sub_id=\\([0-9]*\\).*/\\1/p')

        if [ -z "$SMS_DATE" ]; then SMS_S=0
        elif [ "$SMS_DATE" -gt 1000000000000 ] 2>/dev/null; then
            SMS_S=$((SMS_DATE / 1000))
        else
            SMS_S=$SMS_DATE
        fi
        TIME=$(date -d @$SMS_S '+%Y-%m-%d %H:%M:%S' 2>/dev/null)
        # 合理性护栏：年份必须在 2000~2035，否则视为解析异常，回退设备当前时间并记日志便于排查
        if [ -z "$TIME" ]; then
            TIME=$(date '+%Y-%m-%d %H:%M:%S')
            log "警告：短信时间解析失败(raw=$SMS_DATE)，已用设备当前时间兜底；原始行: $LINE"
        else
            YR=$(printf '%s' "$TIME" | sed -n 's/^\\([0-9][0-9]*\\).*/\\1/p')
            if [ "\${YR:-0}" -lt 2000 ] 2>/dev/null || [ "\${YR:-9999}" -gt 2035 ] 2>/dev/null; then
                TIME=$(date '+%Y-%m-%d %H:%M:%S')
                log "警告：短信时间异常(year=$YR, raw=$SMS_DATE)，已用设备当前时间兜底；原始行: $LINE"
            fi
        fi

        if [ "$SUB" = "1" ]; then SIM_SLOT="卡1"
        elif [ "$SUB" = "2" ]; then SIM_SLOT="卡2"
        elif [ -n "$SUB" ]; then SIM_SLOT="卡$SUB"
        else SIM_SLOT="?"
        fi

        SMS_FROM="$ADDRESS"
        SMS_BODY="$BODY"
        SMS_TIME="$TIME"

        log "检测到新短信: 来自 $ADDRESS"
        forward_one
    done

    echo "$MAXID" > $STATE
}

# 主循环
run_loop() {
    echo $$ > $PID_FILE
    log "转发服务已启动 (pid=$$)"
    while true; do
        if [ -f $STOP_FLAG ]; then
            rm -f $STOP_FLAG
            break
        fi
        if [ -f $CONF ]; then
            load_conf
            check_sms
        fi
        sleep 8
    done
    rm -f $PID_FILE
    log "转发服务已停止"
    exit 0
}

case "$1" in
    run)
        run_loop
        ;;
    start)
        if [ -f $PID_FILE ]; then
            OLD_PID=$(awk 'NR==1{print}' $PID_FILE)
            if [ -n "$OLD_PID" ] && kill -0 $OLD_PID 2>/dev/null; then
                echo "running"
                exit 0
            fi
        fi
        rm -f $STOP_FLAG
        nohup sh $DIR/service.sh run >/dev/null 2>&1 &
        sleep 1
        if [ -f $PID_FILE ]; then
            echo "started"
        else
            echo "start_failed"
        fi
        ;;
    stop)
        touch $STOP_FLAG
        if [ -f $PID_FILE ]; then
            OLD_PID=$(awk 'NR==1{print}' $PID_FILE)
            [ -n "$OLD_PID" ] && kill $OLD_PID 2>/dev/null
            sleep 1
            [ -n "$OLD_PID" ] && kill -9 $OLD_PID 2>/dev/null
        fi
        rm -f $PID_FILE $STOP_FLAG
        echo "stopped"
        ;;
    restart)
        sh $DIR/service.sh stop
        sleep 1
        sh $DIR/service.sh start
        ;;
    status)
        if [ -f $PID_FILE ]; then
            OLD_PID=$(awk 'NR==1{print}' $PID_FILE)
            if [ -n "$OLD_PID" ] && kill -0 $OLD_PID 2>/dev/null; then
                echo "running"
                exit 0
            fi
        fi
        echo "stopped"
        ;;
    test)
        load_conf
        if [ -z "$CORP_ID" ] || [ -z "$SECRET" ] || [ -z "$AGENT_ID" ] || [ -z "$TO_USER" ]; then
            echo "config_empty"
            exit 1
        fi
        NOW_S=$(date +%s)
        TIME=$(date -d @$NOW_S '+%Y-%m-%d %H:%M:%S' 2>/dev/null)
        [ -z "$TIME" ] && TIME="$NOW_S"
        if forward_one "测试消息" "这是一条来自UFI-TOOLS企业微信转发插件的测试消息，收到即代表通道配置正确。" "$TIME"; then
            echo "send_ok"
        else
            echo "send_failed"
        fi
        ;;
    *)
        echo "usage: service.sh start|stop|restart|status|test"
        ;;
esac
`.replace(/\r\n/g, '\n')

    // ================== 状态检测 ==================
    const isInstalled = async () => {
        const res = await runShellWithRoot(`ls ${SERVICE}`)
        return res.success && res.content && res.content.includes('service.sh')
    }

    const isRunning = async () => {
        if (!await isInstalled()) return false
        const res = await runShellWithRoot(`${SERVICE} status`)
        return (res.content || '').includes('running')
    }

    const checkIsBootUp = async () => {
        const res = await runShellWithRoot(`grep -q '${BOOT_CMD}' /sdcard/ufi_tools_boot.sh
echo $?`)
        return (res.content || '').trim().endsWith('0')
    }

    // ================== 配置读写 ==================
    const parseConf = (text) => {
        const conf = {}
        String(text || '').split('\n').forEach(line => {
            const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/)
            if (m) conf[m[1]] = m[2].trim().replace(/^["'](.*)["']$/, '$1')
        })
        return conf
    }

    const saveConf = async (quiet = false) => {
        const ta = document.querySelector('#wecom_sms_config')
        if (!ta) return false
        let text = ta.value.replace(/\r\n/g, '\n')
        if (!text.endsWith('\n')) text += '\n'
        try {
            await runShellWithRoot(`mkdir -p ${DIR}`)
            const file = new File([text], 'config.conf', { type: 'text/plain' })
            const ok = await saveConfig(file, CONF_FILE)
            if (!ok && !quiet) createToast('配置保存失败！', 'red')
            return ok
        } catch (e) {
            console.error(e)
            if (!quiet) createToast('配置保存失败！', 'red')
            return false
        }
    }

    const readConf = async (quiet = false) => {
        const ta = document.querySelector('#wecom_sms_config')
        if (!ta) return
        const res = await runShellWithRoot(`timeout 2s awk '{print}' ${CONF_FILE}`)
        if (res.success && res.content && res.content.trim()) {
            ta.value = res.content
            if (!quiet) createToast('配置读取成功', 'green')
        } else {
            ta.value = DEFAULT_CONF
            if (!quiet) createToast('暂无配置文件，已载入默认模板', 'pink')
        }
        syncCardSwitch()
    }

    // ================== 服务部署 ==================
    const installService = async () => {
        if (!(await checkAdvancedFunc())) {
            createToast('没有开启高级功能，无法使用！', 'red')
            return false
        }
        await runShellWithRoot(`mkdir -p ${DIR}`)
        const file = new File([SERVICE_SCRIPT], 'service.sh', { type: 'text/plain' })
        if (!await saveConfig(file, SERVICE)) {
            createToast('service.sh 部署失败！', 'red')
            return false
        }
        const res = await runShellWithRoot(`chmod 777 ${SERVICE} && ls ${SERVICE}`)
        if (!(res.success && res.content.includes('service.sh'))) {
            createToast('service.sh 权限设置失败！', 'red')
            return false
        }
        return true
    }

    // ================== 启停控制 ==================
    const startForward = async () => {
        if (!(await checkAdvancedFunc())) {
            createToast('没有开启高级功能，无法使用！', 'red')
            syncStatus()
            return
        }
        const conf = parseConf(document.querySelector('#wecom_sms_config')?.value || '')
        const missing = []
        if (!conf.CORP_ID) missing.push('企业ID')
        if (!conf.AGENT_ID) missing.push('AgentId')
        if (!conf.SECRET) missing.push('Secret')
        if (!conf.TO_USER) missing.push('发送范围')
        if (missing.length) {
            createToast(`配置不完整，缺少：${missing.join('、')}`, 'pink', 6000)
            syncStatus()
            return
        }
        if (!await isInstalled()) {
            createToast('首次使用，正在部署转发服务...')
            if (!(await installService())) { syncStatus(); return }
        }
        if (!(await saveConf(true))) {
            createToast('配置保存失败！', 'red')
            syncStatus()
            return
        }
        const res = await runShellWithRoot(`${SERVICE} start`, 15 * 1000)
        if ((res.content || '').includes('started') || (res.content || '').includes('running')) {
            createToast('短信转发已启动 ✅', 'green')
            checkDoubleForward()
        } else {
            createToast('启动失败，请查看日志', 'red')
        }
        syncStatus()
        genLog()
    }

    const stopForward = async () => {
        if (!await isInstalled()) { syncStatus(); return }
        const res = await runShellWithRoot(`${SERVICE} stop`)
        if ((res.content || '').includes('stopped')) {
            createToast('短信转发已停止', '')
        }
        syncStatus()
        genLog()
    }

    // 检测系统自带转发是否开启（避免重复通知）
    const checkDoubleForward = async () => {
        try {
            const res = await (await fetchWithTimeout(`${KANO_baseURL}/api/sms_forward_enabled`)).json()
            const text = JSON.stringify(res || {})
            if (/(enabled|result|status)["']?\s*:\s*["']?(1|true|on)/i.test(text)) {
                createToast('检测到 UFI-TOOLS 自带短信转发已开启，建议关闭以免重复通知！', 'pink', 8000)
            }
        } catch (e) { }
    }

    // ================== 弹窗型 UI ==================
    const MODAL_NAME = 'kano_wecom_sms_modal'
    let logInterval = null
    let masterSwitch = null
    let cardSwitch = null
    let msgTypeSaving = false

    const openModal = async () => {
        if (!(await checkAdvancedFunc())) {
            createToast('没有开启高级功能，无法使用！', 'red')
            return
        }
        // 避免重复弹出
        document.querySelector(`#${MODAL_NAME}`)?.remove()

        const { id, el } = createModal({
            name: MODAL_NAME,
            title: '企业微信 短信转发',
            maxWidth: '460px',
            showConfirm: false,
            onClose: () => {
                if (logInterval) { logInterval(); logInterval = null }
                return true
            },
            content: `
            <div style="display:flex;flex-direction:column;gap:14px;">
                <div style="font-size:.74rem;line-height:1.6;">
                    转发状态：<span id="wecom_sms_status" style="font-weight:600;">检测中...</span>
                </div>
                <div id="wecom_sms_switch_box" style="display:flex;gap:16px;flex-wrap:wrap;align-items:center"></div>
                <div>
                    <div class="title" style="font-size:.78rem;margin-bottom:6px;">配置（填写：企业ID / AgentId / Secret / 发送范围；下方可自定义消息模板）配置写完后记得保存配置</div>
                    <textarea id="wecom_sms_config" spellcheck="false" style="margin-top:4px;font-size:12px !important;border:none;padding:8px;margin:0;width:100%;height:340px;border-radius:10px;overflow-x:hidden;background:transparent;"></textarea>
                    <div style="display:flex;gap:8px;margin-top:6px;">
                        <button id="wecom_sms_save" style="margin:0 !important;padding:4px 10px;">保存配置</button>
                        <button id="wecom_sms_read" style="margin:0 !important;padding:4px 10px;">读取配置</button>
                    </div>
                </div>
                <div id="wecom_sms_action_box" style="display:flex;gap:10px;flex-wrap:wrap"></div>
                <div>
                    <div class="title" style="font-size:.78rem;margin-bottom:6px;">日志 <button id="wecom_sms_refresh_log" style="margin:0 !important;padding:2px 8px;">刷新</button></div>
                    <textarea id="wecom_sms_log" disabled style="margin-top:4px;font-size:12px !important;border:none;padding:8px;margin:0;width:100%;height:200px;border-radius:10px;overflow-x:hidden;background:transparent;"></textarea>
                </div>
            </div>
            `
        })

        // ---- 开关 ----
        masterSwitch = createSwitch({
            text: '转发总开关',
            value: false,
            onChange: async (v) => {
                if (v) await startForward()
                else await stopForward()
            }
        })
        cardSwitch = createSwitch({
            text: '卡片消息',
            value: false,
            onChange: (v) => setMsgType(v ? 'textcard' : 'text')
        })
        el.querySelector('#wecom_sms_switch_box').appendChild(masterSwitch)
        el.querySelector('#wecom_sms_switch_box').appendChild(cardSwitch)

        // ---- 操作按钮 ----
        const installBtn = document.createElement('button')
        installBtn.textContent = '安装/更新服务'
        installBtn.onclick = async () => {
            if (!(await checkAdvancedFunc())) return createToast('没有开启高级功能，无法使用！', 'red')
            createToast('正在部署/更新转发服务...')
            if (await installService()) {
                createToast('服务已部署/更新！重启转发总开关后生效（配置已保留）', 'green', 6000)
            }
            syncStatus()
            bootUpAction()
        }

        const uninstallBtn = document.createElement('button')
        let unCount = 0
        let unTimer = null
        uninstallBtn.textContent = '卸载服务'
        uninstallBtn.onclick = async () => {
            if (!(await checkAdvancedFunc())) return createToast('没有开启高级功能，无法使用！', 'red')
            if (unTimer) clearTimeout(unTimer)
            unTimer = setTimeout(() => { unCount = 0 }, 2000)
            if (unCount++ < 2) {
                return createToast(`危险操作！还需再点击 ${3 - unCount} 次确认卸载`, 'pink')
            }
            unCount = 0
            createToast('正在停止服务并清理...')
            await runShellWithRoot(`${SERVICE} stop`)
            const res = await runShellWithRoot(`
    rm -rf ${DIR}
    sed -i '/kano_wecom_forward/d' /sdcard/ufi_tools_boot.sh
    `)
            if (!res.success) return createToast('卸载失败', 'red')
            createToast('卸载成功', 'green')
            syncStatus()
            bootUpAction()
            genLog()
        }

        const testBtn = document.createElement('button')
        testBtn.textContent = '发送测试'
        testBtn.onclick = async () => {
            if (!(await checkAdvancedFunc())) return createToast('没有开启高级功能，无法使用！', 'red')
            if (!await isInstalled()) return createToast('请先安装服务！', 'red')
            if (!(await saveConf(true))) return createToast('配置保存失败！', 'red')
            createToast('测试消息发送中...')
            const res = await runShellWithRoot(`${SERVICE} test`, 40 * 1000)
            const out = (res.content || '').trim()
            if (out.includes('send_ok')) {
                createToast('测试消息已发送，请在企业微信查看！', 'green', 6000)
            } else if (out.includes('config_empty')) {
                createToast('配置不完整，请先填写配置！', 'pink')
            } else if (out.includes('send_failed')) {
                createToast('发送失败，请检查配置与日志（注意企业微信应用的可信IP白名单）', 'red', 8000)
            } else {
                createToast(`测试失败：${out}`, 'red')
            }
            genLog()
        }

        const bootBtn = document.createElement('button')
        bootBtn.id = 'wecom_sms_boot_on'
        bootBtn.classList.add('btn')
        bootBtn.textContent = '开机自启'
        bootBtn.style.background = ''
        bootBtn.onclick = async () => {
            if (!(await checkAdvancedFunc())) return createToast('没有开启高级功能，无法使用！', 'red')
            if (!await isInstalled()) return createToast('没有安装，请先安装！', 'red')
            const isBootUp = await checkIsBootUp()
            if (isBootUp) {
                await runShellWithRoot(`sed -i '/kano_wecom_forward/d' /sdcard/ufi_tools_boot.sh`)
                bootBtn.style.background = ''
                createToast('已取消开机自启', 'green')
            } else {
                await runShellWithRoot(`grep -qxF '${BOOT_CMD}' /sdcard/ufi_tools_boot.sh || echo '${BOOT_CMD}' >> /sdcard/ufi_tools_boot.sh`)
                bootBtn.style.background = 'var(--dark-btn-color-active)'
                createToast('已设置开机自启', 'green')
            }
        }

        el.querySelector('#wecom_sms_action_box').appendChild(installBtn)
        el.querySelector('#wecom_sms_action_box').appendChild(uninstallBtn)
        el.querySelector('#wecom_sms_action_box').appendChild(testBtn)
        el.querySelector('#wecom_sms_action_box').appendChild(bootBtn)

        // ---- 配置 保存/读取/刷新 ----
        el.querySelector('#wecom_sms_save').onclick = async () => {
            if (await saveConf(false)) {
                createToast('配置已保存（服务运行中即时生效）', 'green')
                syncCardSwitch()
                genLog()
            }
        }
        el.querySelector('#wecom_sms_read').onclick = async () => {
            await readConf(false)
            await syncStatus()
            await bootUpAction()
        }
        el.querySelector('#wecom_sms_refresh_log').onclick = () => {
            genLog()
            createToast('日志已刷新')
        }

        showModal(id)

        // ---- 初始化弹窗数据 ----
        await readConf(true)
        await syncStatus()
        await bootUpAction()
        await genLog()

        // 弹窗打开期间轮询日志
        if (logInterval) logInterval()
        logInterval = requestInterval(() => genLog(), 3000)
    }

    // 消息类型切换（IIFE 级，供卡片开关使用）
    const setMsgType = async (type) => {
        const ta = document.querySelector('#wecom_sms_config')
        if (!ta) return
        let text = ta.value
        if (/^MSG_TYPE=.*$/m.test(text)) {
            text = text.replace(/^MSG_TYPE=.*$/m, `MSG_TYPE=${type}`)
        } else {
            text = `${text.trimEnd()}\nMSG_TYPE=${type}\n`
        }
        ta.value = text
        // 服务已部署时静默保存，使消息类型即时生效
        if (!msgTypeSaving && await isInstalled()) {
            msgTypeSaving = true
            await saveConf(true)
            msgTypeSaving = false
        }
        createToast(`已切换为${type === 'textcard' ? '卡片' : '文本'}消息`, 'green')
    }

    const syncCardSwitch = () => {
        const conf = parseConf(document.querySelector('#wecom_sms_config')?.value || '')
        cardSwitch.update?.(conf.MSG_TYPE === 'textcard')
    }

    // ---- 主入口按钮 ----
    const mainBtn = document.createElement('button')
    mainBtn.textContent = '企业微信应用短信转发'
    mainBtn.onclick = () => openModal()
    document.querySelector('.actions-buttons')?.appendChild(mainBtn)

    // ---- 状态同步 ----
    const syncStatus = async () => {
        const running = await isRunning()
        masterSwitch && masterSwitch.update?.(running)
        const st = document.querySelector('#wecom_sms_status')
        if (st) {
            st.textContent = running ? '● 运行中' : '○ 已停止'
            st.style.color = running ? 'green' : ''
        }
    }

    const bootUpAction = async () => {
        const bootBtn = document.querySelector('#wecom_sms_boot_on')
        if (!bootBtn) return
        const isBootUp = await checkIsBootUp()
        bootBtn.style.background = isBootUp ? 'var(--dark-btn-color-active)' : ''
    }

    // ---- 日志 ----
    const genLog = async () => {
        const logEl = document.querySelector('#wecom_sms_log')
        if (!logEl) return
        const res = await runShellWithRoot(`timeout 2s awk '{print}' ${LOG_FILE} 2>/dev/null | tail -n 40`)
        const text = `${res.content || ''}\n`
        if (logEl.value == text) return
        logEl.value = text
        logEl.scrollTo({
            top: logEl.scrollHeight,
            behavior: 'smooth',
        })
    }

})()
//</script>
