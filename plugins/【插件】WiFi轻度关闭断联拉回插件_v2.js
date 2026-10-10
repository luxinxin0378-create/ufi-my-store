//<script>
/*
 * 【插件】WiFi 轻度关闭 + 断联拉回  v2.7
 *
 * 设备端逻辑不变（官方接口轻度关闭射频，不用 rfkill/拆热点）：
 *   关闭  = goformId=switchWiFiModule SwitchOption=0
 *   拉回  = goformId=switchWiFiChip   ChipEnum=chipN
 *
 * v2.0 UI 重做：
 *   - 主页面只留一个入口按钮，功能全部收进弹窗（密码框不再常驻页面）
 *   - 后台密码保存到设备 .pwd，已保存则显示掩码，可随时更换/清除
 *   - 主开关 = 启动/停止守护；状态、日志、开机自启、卸载全部进弹窗
 *
 * v2.1 修复无电池设备断电重启后 WiFi 不自启：
 *   - 新增上电自检 boot_heal：等后台就绪后，射频处于关闭且 USB 未接入时自动拉回
 *   - restore_wifi 失败不再丢弃标记，主循环会持续重试直到拉回成功
 *
 * v2.2 修复开机守护进程根本不启动的问题：
 *   - 启动行写入 boot 文件时置顶：Clash.Service 以 exec 结尾会截断其后的所有行，
 *     追加在文件末尾的启动行永远轮不到执行
 *   - is_running 校验 /proc/PID/cmdline，防止 PID 复用造成"假运行"误判
 *
 * v2.3 诊断加固：
 *   - service.sh start 写 boot_trace.log，可区分"boot 文件没执行"和"守护没起来"
 *   - guard.sh 一被拉起立刻写日志（此前第一条日志在 boot_heal 之后，自检卡死会零日志）
 *   - zreq 调用统一加 timeout 20，防止后台接口挂死时守护进程永久卡死
 *
 * v2.4 修复充电器供电开机守护不启动（boot_trace 实锤：ufi_tools_boot.sh 由 ufi-tools
 *   应用触发，只在插电脑开机时执行）：
 *   - 新增 Magisk service.d 兜底自启（/data/adb/service.d/kano_wifi_guard.sh），
 *     每次开机 late-start 阶段都会执行，与供电方式无关
 *   - 安装/开机自启开关同时写 boot 文件和 service.d，卸载/取消自启两处都清
 *
 * v2.5 修复充电器开机自检卡死（实测：充电器开机时中兴后台就绪要远慢于 USB 开机，
 *   旧流程先等后台导致 2 分钟以上无任何动作）：
 *   - boot_heal 改为先查 USB（纯 sysfs 秒出结果），确认无外部设备才等后台
 *   - 查询超时 8s / 指令超时 15s，wait_backend 加密到 60 次×2s
 *   - 等后台超时仍无标记时主动补标记，保证主循环在后台恢复后持续重试拉回
 *
 * v2.6 修复充电器开机后台永远不可达（10 分钟实测实锤）：
 *   - 根因：zreq 直连 192.168.0.1:8080，该地址绑在 br0 上；充电器开机时
 *     WiFi 关 + 无 USB，br0 无此 IP，形成"开热点要后台、后台要热点"死锁
 *   - 把 192.168.0.1/32 临时挂到 lo 打通 zreq，热点恢复后自动移除
 *   - 等待期间每 20 次用 monkey 拉起 com.zte.web（防止后台应用本身没自启）
 *
 * v2.7 打磨（充电器开机已全链路跑通：8s 拉起守护 → 30s 判定 → 68s 热点恢复）：
 *   - 恢复后改为 3s 轮询（最多 15s），好了就走，拉回耗时缩短约 10 秒
 *   - 日志行加 uptime 字段，开机早期时钟漂移也能对齐时间线
 *   - soft_off 补 ensure_backend_ip 防御（网卡场景同类问题）
 */
(async () => {
  const DIR = '/data/kano_wifi_soft_guard';
  const BOOT_FILE = '/sdcard/ufi_tools_boot.sh';
  const SERVICE_D = '/data/adb/service.d/kano_wifi_guard.sh';
  const MODAL_ID = 'wsg2_modal';

  /* ================== 设备端脚本（与线上版本一致，逻辑不变） ================== */

  const GUARD_SH = `#!/system/bin/sh
DIR=/data/kano_wifi_soft_guard
LOG=$DIR/guard_LOG.txt
STATE_FILE=$DIR/.wifi_off_by_guard
PWD_FILE=$DIR/.pwd
ZREQ=/data/data/com.minikano.f50_sms/files/zreq
INTERVAL=3

log() {
  echo "[$(date '+%m-%d %H:%M:%S') up=$(cut -d' ' -f1 /proc/uptime)s] $1" >> $LOG
  lines=$(wc -l < $LOG 2>/dev/null)
  if [ -n "$lines" ] && [ "$lines" -gt 200 ] 2>/dev/null; then
    tail -n 100 $LOG > $LOG.tmp && mv $LOG.tmp $LOG
  fi
}

zp() {
  timeout 15 $ZREQ -pwd "$(cat $PWD_FILE 2>/dev/null)" "$@" 2>&1
}

# 输出：PC / USB2.0 / USB3.0 / NONE
detect_usb() {
  s=$(cat /sys/class/android_usb/android0/state 2>/dev/null)
  if [ "$s" = "CONFIGURED" ]; then
    echo PC
    return
  fi
  for f in /sys/bus/usb/devices/*-*/speed; do
    [ -f "$f" ] || continue
    v=$(cat $f 2>/dev/null)
    case $v in
      480) echo USB2.0; return ;;
      5000|10000|20000) echo USB3.0; return ;;
    esac
  done
  echo NONE
}

# 确保后台地址 192.168.0.1 本地可达：
# 充电器开机时 WiFi 关 + 无 USB，br0 上没有 LAN IP，zreq 连不上 192.168.0.1:8080
# （实测后台就死在这），临时把该地址挂到 lo 上打通，恢复后移除
LAN_ON_LO=0
ensure_backend_ip() {
  ip addr show 2>/dev/null | grep -q 'inet 192\.168\.0\.1' && return 0
  ip addr add 192.168.0.1/32 dev lo 2>/dev/null && LAN_ON_LO=1
}
cleanup_backend_ip() {
  if [ "$LAN_ON_LO" = "1" ]; then
    # 已有其他网卡持有该地址（热点/USB 已起来）才移除 lo 上的临时地址
    cnt=$(ip addr show 2>/dev/null | grep -c 'inet 192\.168\.0\.1')
    if [ "$cnt" -gt 1 ] 2>/dev/null; then
      ip addr del 192.168.0.1/32 dev lo 2>/dev/null
      LAN_ON_LO=0
    fi
  fi
}

module_state() {
  timeout 8 $ZREQ -pwd "$(cat $PWD_FILE 2>/dev/null)" -params 'cmd=queryWiFiModuleSwitch' -json 2>&1 | tr -d ' \\n' | grep -o '"WiFiModuleSwitch":"[01]"' | cut -d'"' -f4
}

# 记录当前开启的芯片（chip1=ChipIndex0, chip2=ChipIndex1），供拉回时只恢复原来开着的
save_active_chips() {
  info=$(zp -params 'cmd=queryWiFiModuleSwitch,queryAccessPointInfo' -json | tr -d '\\n')
  chips=$(echo "$info" | grep -o '{[^{}]*}' | while read -r obj; do
    sw=$(echo "$obj" | grep -o '"AccessPointSwitchStatus": *"[01]"' | grep -o '[01]"' | tr -d '"')
    ci=$(echo "$obj" | grep -o '"ChipIndex": *"[01]"' | grep -o '[01]"' | tr -d '"')
    if [ "$sw" = "1" ]; then
      case "$ci" in
        0) echo chip1 ;;
        1) echo chip2 ;;
      esac
    fi
  done | tr '\\n' ' ')
  chips=$(echo "$chips" | sed 's/ *$//')
  [ -z "$chips" ] && chips="chip1 chip2"
  echo "$chips" > $STATE_FILE
}

soft_off() {
  ensure_backend_ip
  save_active_chips
  res=$(zp -method POST -body 'goformId=switchWiFiModule&SwitchOption=0' -json)
  if echo "$res" | grep -q '"result": *"success"'; then
    log "检测到外部连接，已轻度关闭热点射频（USB 共享不受影响）"
    return 0
  fi
  rm -f $STATE_FILE
  log "轻度关闭指令失败：$res"
  return 1
}

restore_wifi() {
  ensure_backend_ip
  chips=$(cat $STATE_FILE 2>/dev/null)
  [ -z "$chips" ] && chips="chip1 chip2"
  for round in 1 2 3; do
    for c in $chips; do
      zp -method POST -body "goformId=switchWiFiChip&ChipEnum=$c&GuestEnable=0" -json >/dev/null 2>&1
      sleep 6
    done
    # 轮询等待模块开启（最多约 15 秒），好了就走，不再死等 12 秒
    w=0
    while [ $w -lt 5 ]; do
      sleep 3
      [ "$(module_state)" = "1" ] && break
      w=$((w+1))
    done
    if [ "$(module_state)" = "1" ]; then
      rm -f $STATE_FILE
      cleanup_backend_ip
      if [ $round -eq 1 ]; then
        log "外部设备已断开，热点已自动拉回"
      else
        log "外部设备已断开，热点经第 $round 轮重试后拉回"
      fi
      return 0
    fi
  done
  # 失败保留标记：主循环会持续重试（修复开机早期后台未就绪导致放弃的问题）
  log "警告：本轮拉回失败（后台可能未就绪），保留标记稍后自动重试"
  return 1
}

# 等中兴后台接口就绪（开机早期 zreq 会失败），重试约 60 次
# 注意：充电器供电开机时 br0 无 LAN IP，需先临时挂 lo；
# 且 com.zte.web 可能未自启，每 20 次用 monkey 拉一把
wait_backend() {
  ensure_backend_ip
  i=0
  while [ $i -lt 60 ]; do
    st=$(module_state)
    case "$st" in
      0|1) return 0 ;;
    esac
    i=$((i+1))
    if [ $((i % 20)) -eq 0 ]; then
      monkey -p com.zte.web -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
    fi
    sleep 2
  done
  return 1
}

# 上电自检：无电池设备拔电即重启，官方 WiFi 开关状态持久化，
# 若断电前射频处于关闭状态，开机后热点不会自己回来 —— 在这里拉回。
# 先查 USB（纯 sysfs，秒出结果），确认无外部设备需要拉回时才等后台，
# 避免充电器开机后台慢导致自检整体卡死
boot_heal() {
  usb=$(detect_usb)
  if [ "$usb" != "NONE" ]; then
    if [ -f $STATE_FILE ]; then
      log "上电自检：外部设备在线（$usb），保持射频关闭"
    else
      log "上电自检：外部设备在线（$usb），交由主循环处理"
    fi
    return
  fi
  if ! wait_backend; then
    # 后台迟迟不就绪：确保标记存在，主循环会在后台恢复后持续重试拉回，
    # 否则无标记时主循环不会动作，热点将永远卡死
    [ -f $STATE_FILE ] || echo "chip1 chip2" > $STATE_FILE
    log "上电自检：后台接口一直未就绪；已确保标记存在，主循环将持续重试拉回"
    return
  fi
  sleep 5
  if [ -f $STATE_FILE ]; then
    log "上电自检：上次断电前射频由本插件关闭，自动拉回"
    restore_wifi
    return
  fi
  if [ "$(module_state)" = "0" ]; then
    log "上电自检：WiFi 未自启（设备断电重启的已知问题），自动拉回热点"
    echo "chip1 chip2" > $STATE_FILE
    restore_wifi
  else
    log "上电自检：WiFi 状态正常，无需干预"
  fi
}

log "guard.sh 进程已拉起，开始上电自检"
boot_heal

log "守护进程启动（轻度关闭+断联拉回），轮询间隔 $INTERVAL 秒"

# 防抖：连续 2 次（约6秒）读到相同状态才动作，避免 USB 重新枚举造成射频反复开关
HIT=0
MISS=0
LAST_ST=?
TICK=0

while true; do
  cleanup_backend_ip
  cur=$(detect_usb)
  if [ -z "$cur" ]; then
    sleep $INTERVAL
    continue
  fi
  if [ "$cur" != "$LAST_ST" ]; then
    log "USB 状态变化：$LAST_ST -> $cur"
    LAST_ST=$cur
  fi

  if [ "$cur" != "NONE" ]; then
    HIT=$((HIT+1))
    MISS=0
    if [ ! -f $STATE_FILE ]; then
      if [ $HIT -ge 2 ]; then
        soft_off
      fi
    else
      # 已处于关闭状态：每 30 秒抽查一次，射频被意外打开且 USB 仍在时才补关
      TICK=$((TICK+1))
      if [ $TICK -ge 10 ]; then
        TICK=0
        if [ "$(module_state)" = "1" ]; then
          log "检测到射频被重新打开且外部设备在线，补一次轻度关闭"
          zp -method POST -body 'goformId=switchWiFiModule&SwitchOption=0' -json >/dev/null 2>&1
        fi
      fi
    fi
  else
    MISS=$((MISS+1))
    HIT=0
    # 外部设备已断开：仅当射频是本插件关闭的才拉回
    if [ -f $STATE_FILE ] && [ $MISS -ge 2 ]; then
      MISS=0
      restore_wifi
    fi
  fi
  sleep $INTERVAL
done
`;

  const SERVICE_SH = `#!/system/bin/sh
DIR=/data/kano_wifi_soft_guard
PID_FILE=$DIR/guard.pid
STATE_FILE=$DIR/.wifi_off_by_guard
PWD_FILE=$DIR/.pwd
ZREQ=/data/data/com.minikano.f50_sms/files/zreq

zp() {
  $ZREQ -pwd "$(cat $PWD_FILE 2>/dev/null)" "$@" 2>&1
}

is_running() {
  [ -f $PID_FILE ] || return 1
  p=$(cat $PID_FILE 2>/dev/null)
  [ -n "$p" ] && [ -r /proc/$p/cmdline ] && tr "\0" " " < /proc/$p/cmdline | grep -qF guard.sh
}

# 停止服务时若射频是本插件关闭的，立即拉回，避免热点卡在关闭状态
restore_wifi() {
  [ -f $STATE_FILE ] || return
  chips=$(cat $STATE_FILE 2>/dev/null)
  [ -z "$chips" ] && chips="chip1 chip2"
  rm -f $STATE_FILE
  for c in $chips; do
    zp -method POST -body "goformId=switchWiFiChip&ChipEnum=$c&GuestEnable=0" -json >/dev/null 2>&1
    sleep 6
  done
  sleep 10
  st=$(zp -params 'cmd=queryWiFiModuleSwitch' -json | tr -d ' \\n' | grep -o '"WiFiModuleSwitch":"[01]"' | cut -d'"' -f4)
  if [ "$st" = "1" ]; then
    echo "已拉回热点"
  else
    echo "拉回指令已发送，热点恢复中"
  fi
}

case "$1" in
  start)
    mkdir -p $DIR
    echo "[$(date '+%m-%d %H:%M:%S')] service.sh start 被调用 uptime=$(cut -d' ' -f1 /proc/uptime)s" >> $DIR/boot_trace.log
    if is_running; then
      echo "守护进程已在运行"
    else
      rm -f $PID_FILE
      nohup sh $DIR/guard.sh >/dev/null 2>&1 &
      echo $! > $PID_FILE
      echo "守护进程已启动 PID=$(cat $PID_FILE)"
    fi
    ;;
  stop)
    if is_running; then
      kill $(cat $PID_FILE) 2>/dev/null
      echo "守护进程已停止"
    else
      echo "守护进程未在运行"
    fi
    rm -f $PID_FILE
    restore_wifi
    ;;
  status)
    if is_running; then echo running; else echo stopped; fi
    ;;
  detect)
    s=$(cat /sys/class/android_usb/android0/state 2>/dev/null)
    if [ "$s" = "CONFIGURED" ]; then
      echo PC
    else
      found=NONE
      for f in /sys/bus/usb/devices/*-*/speed; do
        [ -f "$f" ] || continue
        v=$(cat $f 2>/dev/null)
        case $v in
          480) found=USB2.0; break ;;
          5000|10000|20000) found=USB3.0; break ;;
        esac
      done
      echo $found
    fi
    ;;
  wifistate)
    st=$(zp -params 'cmd=queryWiFiModuleSwitch' -json | tr -d ' \\n' | grep -o '"WiFiModuleSwitch":"[01]"' | cut -d'"' -f4)
    if [ "$st" = "1" ]; then echo on; else echo off; fi
    ;;
esac
`;

  /* ================== 基础操作 ================== */

  const isInstall = async () => {
    const res = await runShellWithRoot(`ls ${DIR}/service.sh`);
    return Boolean(res?.success && (res?.content || '').includes('service.sh'));
  };

  const install = async (pwd) => {
    const guardB64 = encodeBase64(GUARD_SH);
    const serviceB64 = encodeBase64(SERVICE_SH);
    const pwdB64 = encodeBase64(pwd);
    const res = await runShellWithRoot(`
mkdir -p ${DIR}
echo '${guardB64}' | base64 -d > ${DIR}/guard.sh
echo '${serviceB64}' | base64 -d > ${DIR}/service.sh
echo '${pwdB64}' | base64 -d > ${DIR}/.pwd
chmod 777 ${DIR}/guard.sh ${DIR}/service.sh
chmod 600 ${DIR}/.pwd
ls ${DIR}/guard.sh ${DIR}/service.sh
`);
    if (!res?.success || !(res?.content || '').includes('service.sh')) {
      throw new Error('安装失败：脚本写入失败');
    }
    // 验证密码可用（查询一次模块状态）
    const check = await runShellWithRoot(`${DIR}/service.sh wifistate`);
    const st = (check?.content || '').trim();
    if (st !== 'on' && st !== 'off') {
      await runShellWithRoot(`rm -rf ${DIR}`);
      throw new Error('后台密码不正确，安装已回滚，请检查后重试');
    }
    // 启动行必须置顶：boot 文件中间的 Clash.Service 以 exec 结尾，会截断其后的所有行
    await runShellWithRoot(`sed -i '/kano_wifi_soft_guard/d' ${BOOT_FILE}; sed -i '1i ${DIR}/service.sh start' ${BOOT_FILE}`);
    // Magisk service.d 兜底：ufi_tools_boot.sh 由 ufi-tools 应用触发，充电器开机可能不执行；Magisk 每次开机都跑
    await runShellWithRoot(`[ -d /data/adb/service.d ] && printf '#!/system/bin/sh\n${DIR}/service.sh start\n' > ${SERVICE_D} && chmod 755 ${SERVICE_D}`);
    await runShellWithRoot(`${DIR}/service.sh start`);
  };

  const uninstall = async () => {
    const res = await runShellWithRoot(`
${DIR}/service.sh stop
rm -rf ${DIR}
sed -i '/kano_wifi_soft_guard/d' ${BOOT_FILE}
rm -f ${SERVICE_D}
`);
    if (!res?.success) throw new Error('卸载失败');
  };

  // 保存/更换密码：写入 .pwd 并立即用官方接口校验，失败则回滚
  const savePwd = async (pwd) => {
    const pwdB64 = encodeBase64(pwd);
    const res = await runShellWithRoot(`
mkdir -p ${DIR}
echo '${pwdB64}' | base64 -d > ${DIR}/.pwd.new
chmod 600 ${DIR}/.pwd.new
mv -f ${DIR}/.pwd.new ${DIR}/.pwd
${DIR}/service.sh wifistate
`);
    const st = (res?.content || '').trim().split('\n').pop().trim();
    if (st !== 'on' && st !== 'off') {
      await runShellWithRoot(`rm -f ${DIR}/.pwd`);
      throw new Error('密码校验失败（官方后台未应答），未保存');
    }
  };

  const clearPwd = async () => {
    await runShellWithRoot(`rm -f ${DIR}/.pwd`);
  };

  /* ================== 状态查询（单次往返） ================== */

  const queryStatus = async () => {
    const r = await runShellWithRoot(`
[ -f ${DIR}/service.sh ] && echo INSTALLED=yes || echo INSTALLED=no
echo RUNNING=$(${DIR}/service.sh status 2>/dev/null)
echo USB=$(${DIR}/service.sh detect 2>/dev/null)
echo WIFI=$(${DIR}/service.sh wifistate 2>/dev/null)
[ -f ${DIR}/.wifi_off_by_guard ] && echo GUARDED=yes || echo GUARDED=no
[ -s ${DIR}/.pwd ] && echo PWDSET=yes || echo PWDSET=no
(grep -qF '${DIR}/service.sh start' ${BOOT_FILE} 2>/dev/null || [ -f ${SERVICE_D} ]) && echo BOOT=yes || echo BOOT=no
echo ---LOG---
tail -n 12 ${DIR}/guard_LOG.txt 2>/dev/null || echo "(暂无日志)"
`);
    if (!r?.success) throw new Error('状态查询失败');
    const content = String(r.content || '');
    const map = { INSTALLED: 'no', RUNNING: 'stopped', USB: 'NONE', WIFI: 'off', GUARDED: 'no', PWDSET: 'no', BOOT: 'no', log: '' };
    const li = content.indexOf('---LOG---');
    const head = li >= 0 ? content.slice(0, li) : content;
    map.log = li >= 0 ? content.slice(li + 9).trim() : '';
    head.split('\n').forEach(l => {
      const i = l.indexOf('=');
      if (i <= 0) return;
      const k = l.slice(0, i).trim(), v = l.slice(i + 1).trim();
      if (k in map && v) map[k] = v;
    });
    return map;
  };

  /* ================== UI（弹窗式，主页面只加入口按钮） ================== */

  const html = `
<div class="mask" id="${MODAL_ID}" style="display:none;top:0;left:0;right:0;bottom:0;">
  <div class="modal" style="width:96%;max-width:420px;display:flex;flex-direction:column;max-height:94vh;padding:14px">
    <div class="title" style="margin:0 0 8px"><strong>WiFi 轻度关闭 · 断联拉回</strong></div>
    <style>
      #${MODAL_ID} .w_hero{
        margin:10px 0;padding:14px 16px;border-radius:14px;
        border:1px solid var(--dark-border-color,rgba(255,255,255,.08));
        background:var(--dark-card-bg,rgba(255,255,255,.04));
        display:flex;justify-content:space-between;align-items:center;
        gap:12px;position:relative;overflow:hidden;transition:border-color .25s,background .25s;
      }
      #${MODAL_ID} .w_hero::after{
        content:'';position:absolute;inset:auto -30px -50px auto;width:140px;height:140px;
        border-radius:999px;background:radial-gradient(circle, rgba(108,190,255,.20), transparent 68%);
        pointer-events:none;transition:background .25s;
      }
      #${MODAL_ID} .w_hero.active{border-color:rgba(108,190,255,.45);background:rgba(108,190,255,.08)}
      #${MODAL_ID} .w_hero.active::after{background:radial-gradient(circle, rgba(108,190,255,.42), transparent 68%)}
      #${MODAL_ID} .w_hero_main{position:relative;z-index:1;flex:1;min-width:0}
      #${MODAL_ID} .w_hero_title{font-size:15px;font-weight:700;margin-bottom:4px;display:flex;align-items:center;gap:6px}
      #${MODAL_ID} .w_hero_desc{font-size:11px;opacity:.72;line-height:1.55}
      #${MODAL_ID} .w_sw{
        position:relative;display:inline-block;flex-shrink:0;z-index:1;width:46px;height:26px;
        background:rgba(255,255,255,.15);border-radius:13px;cursor:pointer;transition:background .25s;
      }
      #${MODAL_ID} .w_sw::after{
        content:'';position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:50%;
        background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:left .25s,transform .12s;
      }
      #${MODAL_ID} .w_sw.on{background:var(--dark-btn-color-active,#1a7a3a)}
      #${MODAL_ID} .w_sw.on::after{left:22px}
      #${MODAL_ID} .w_sw:active::after{transform:scale(.92)}
      #${MODAL_ID} .w_sw.busy{opacity:.5;pointer-events:none}
      #${MODAL_ID} .w_label{font-size:11px;opacity:.6;margin:14px 4px 4px;letter-spacing:.5px;text-transform:uppercase}
      #${MODAL_ID} ul.deviceList{
        list-style:none;margin:0;padding:0;background:var(--dark-card-bg,rgba(0,0,0,.22));
        border:1px solid var(--dark-border-color,rgba(255,255,255,.06));border-radius:10px;overflow:hidden;
      }
      #${MODAL_ID} ul.deviceList li{
        display:flex;align-items:center;gap:12px;padding:12px 16px;
        border-bottom:1px solid var(--dark-border-color,rgba(255,255,255,.06));
      }
      #${MODAL_ID} ul.deviceList li:last-child{border-bottom:none}
      #${MODAL_ID} ul.deviceList li .li_main{flex:1;min-width:0}
      #${MODAL_ID} ul.deviceList li .li_title{font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px}
      #${MODAL_ID} ul.deviceList li .li_sub{font-size:11px;opacity:.6;margin-top:3px}
      #${MODAL_ID} .pill{
        display:inline-block;padding:1px 8px;border-radius:10px;font-size:10px;
        font-weight:600;background:rgba(255,255,255,.08);
      }
      #${MODAL_ID} .pill.ok{background:var(--dark-btn-color-active,#1a7a3a);color:#fff}
      #${MODAL_ID} .pill.bad{background:#7a1a1a;color:#fff}
      #${MODAL_ID} .pill.warn{background:#8a6d1a;color:#fff}
      #${MODAL_ID} .w_log{
        font-size:10px;font-family:monospace;line-height:1.6;background:rgba(0,0,0,.3);
        border-radius:8px;padding:8px 10px;max-height:140px;overflow-y:auto;
        white-space:pre-wrap;word-break:break-all;opacity:.85;
      }
      #${MODAL_ID} .w_input{
        width:100%;box-sizing:border-box;border:none;padding:8px 10px;border-radius:10px;
        background:rgba(255,255,255,.06);color:inherit;font-size:.72rem;
      }
      #${MODAL_ID} .w_btnrow{display:flex;gap:8px;margin-top:8px}
      #${MODAL_ID} .w_btnrow button{flex:1;padding:7px 0;font-size:11px}
      #${MODAL_ID} .w_footer{display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:8px}
      #${MODAL_ID} .w_footer button{padding:6px 14px;font-size:11px}
      #${MODAL_ID} .w_link{
        font-size:11px;color:#6cbeff;cursor:pointer;flex-shrink:0;
        padding:4px 8px;border-radius:8px;background:rgba(108,190,255,.1);
      }
    </style>

    <!-- 主开关 -->
    <div class="w_hero" id="w_hero">
      <div class="w_hero_main">
        <div class="w_hero_title">🔌 联动守护</div>
        <div class="w_hero_desc">USB 接入时轻度关闭热点射频（USB 共享不受影响），拔出自动拉回</div>
      </div>
      <div class="w_sw" id="w_master_sw"></div>
    </div>

    <!-- 安装引导（未安装时显示） -->
    <div id="w_install_box" style="display:none">
      <div class="w_label">首次安装</div>
      <ul class="deviceList"><li style="display:block">
        <input class="w_input" id="w_install_pwd" type="password" placeholder="官方后台密码（仅安装时校验一次）">
        <div class="w_btnrow"><button class="btn" id="w_install_btn">安装并启动守护</button></div>
      </li></ul>
    </div>

    <!-- 实时状态 -->
    <div id="w_status_sec" style="display:none">
      <div class="w_label">实时状态</div>
      <ul class="deviceList" id="w_state"></ul>
    </div>

    <!-- 设置 -->
    <div id="w_settings_sec" style="display:none">
      <div class="w_label">设置</div>
      <ul class="deviceList">
        <li>
          <div class="li_main">
            <div class="li_title">🔑 官方后台密码</div>
            <div class="li_sub" id="w_pwd_sub">--</div>
          </div>
          <span class="w_link" id="w_pwd_change">更换</span>
        </li>
        <li id="w_pwd_edit_row" style="display:none">
          <div class="li_main">
            <input class="w_input" id="w_pwd_input" type="password" placeholder="输入新密码">
            <div class="w_btnrow">
              <button class="btn" id="w_pwd_save">保存并校验</button>
              <button class="btn" id="w_pwd_clear">清除已存密码</button>
            </div>
          </div>
        </li>
        <li>
          <div class="li_main">
            <div class="li_title">🚀 开机自启</div>
            <div class="li_sub">重启后自动拉起联动守护</div>
          </div>
          <div class="w_sw" id="w_boot_sw"></div>
        </li>
        <li>
          <div class="li_main">
            <div class="li_title">🗑️ 卸载插件</div>
            <div class="li_sub">停止守护并清理全部残留（需连点确认）</div>
          </div>
          <span class="w_link" id="w_uninstall" style="color:#ff8a8a;background:rgba(255,60,60,.1)">卸载</span>
        </li>
      </ul>
    </div>

    <!-- 日志 -->
    <div id="w_log_sec" style="display:none">
      <div class="w_label">联动日志</div>
      <div class="w_log" id="w_log">(暂无日志)</div>
    </div>

    <div class="w_footer">
      <button class="btn" id="w_refresh">↻ 刷新</button>
      <button type="button" class="btn" onclick="closeModal('#${MODAL_ID}')">关闭</button>
    </div>
  </div>
</div>`;
  // 升级清理：移除旧版常驻 UI 块（如果存在）
  document.querySelector('#IFRAME_KANO_wifi_soft_guard')?.remove();
  document.querySelector(`#${MODAL_ID}`)?.remove();
  const tmpEl = document.createElement('div');
  tmpEl.innerHTML = html.trim();
  document.body.appendChild(tmpEl.firstElementChild);

  const $ = sel => document.querySelector(sel);
  const toast = (m, c, t) => { try { createToast(m, c || '', t || 2500) } catch (e) {} };
  const pill = (cls, txt) => `<span class="pill ${cls}">${txt}</span>`;
  const usbText = u => ({ PC: '已连接电脑', 'USB2.0': '外接 USB2.0 设备', 'USB3.0': '外接 USB3.0 设备', NONE: '无外部连接' }[u] || u || '未知');

  // 密码编辑行默认收起
  $('#w_pwd_edit_row').style.display = 'none';

  const renderState = s => {
    const installed = s.INSTALLED === 'yes';
    $('#w_install_box').style.display = installed ? 'none' : '';
    $('#w_status_sec').style.display = installed ? '' : 'none';
    $('#w_settings_sec').style.display = installed ? '' : 'none';
    $('#w_log_sec').style.display = installed ? '' : 'none';

    const running = s.RUNNING === 'running';
    $('#w_hero').classList.toggle('active', running);
    const $msw = $('#w_master_sw');
    $msw.classList.toggle('on', running);
    $msw.classList.remove('busy');

    const $bsw = $('#w_boot_sw');
    $bsw.classList.toggle('on', s.BOOT === 'yes');
    $bsw.classList.remove('busy');

    $('#w_pwd_sub').textContent = s.PWDSET === 'yes' ? '已保存（••••••），守护每次请求自动使用' : '未保存，联动将无法调用官方接口';
    $('#w_pwd_change').textContent = s.PWDSET === 'yes' ? '更换' : '设置';

    if (installed) {
      const usbOk = s.USB !== 'NONE';
      const rows = [
        `<li><div class="li_main"><div class="li_title">🔌 USB 状态</div></div>${pill(usbOk ? 'warn' : '', usbText(s.USB))}</li>`,
        `<li><div class="li_main"><div class="li_title">📶 热点射频</div></div>${s.WIFI === 'on' ? pill('ok', '广播中') : pill('bad', '已关闭')}</li>`,
        `<li><div class="li_main"><div class="li_title">🛡️ 守护进程</div></div>${running ? pill('ok', '运行中') : pill('', '已停止')}</li>`,
        `<li><div class="li_main"><div class="li_title">🤖 联动标记</div></div>${s.GUARDED === 'yes' ? pill('warn', '射频由插件关闭，拔出将自动拉回') : pill('', '无')}</li>`,
      ];
      $('#w_state').innerHTML = rows.join('');
      $('#w_log').textContent = s.log || '(暂无日志)';
    }
  };

  let refreshSeq = 0;
  const refresh = async () => {
    const seq = ++refreshSeq;
    const s = await queryStatus();
    if (seq === refreshSeq) renderState(s);
    return s;
  };

  let busy = false;
  const lock = fn => async () => {
    if (busy) return;
    busy = true;
    const all = document.querySelectorAll(`#${MODAL_ID} button`);
    all.forEach(b => { b.disabled = true; });
    try { await fn(); }
    catch (e) { toast(String(e && e.message || e), 'red', 5000); console.log('[WiFiSoftGuard]', e); }
    finally { busy = false; all.forEach(b => { b.disabled = false; }); }
  };

  // 主开关 = 启动/停止守护
  $('#w_master_sw').onclick = lock(async () => {
    if (!(await checkAdvancedFunc())) throw new Error('请先启用高级功能');
    if (!(await isInstall())) throw new Error('尚未安装，请先在下方完成安装');
    const sw = $('#w_master_sw');
    const turnOn = !sw.classList.contains('on');
    sw.classList.add('busy');
    const res = await runShellWithRoot(`${DIR}/service.sh ${turnOn ? 'start' : 'stop'}`);
    if (!res?.success) throw new Error(turnOn ? '启动失败' : '停止失败');
    toast((res.content || '').trim().replaceAll('\n', '，') || (turnOn ? '已启动' : '已停止'), turnOn ? 'green' : 'pink', 3000);
    await refresh();
  });

  // 安装
  $('#w_install_btn').onclick = lock(async () => {
    if (!(await checkAdvancedFunc())) throw new Error('请先启用高级功能');
    const pwd = ($('#w_install_pwd').value || '').trim();
    if (!pwd) throw new Error('请先填写官方后台密码');
    toast('正在安装并校验密码 ...', '', 2000);
    await install(pwd);
    $('#w_install_pwd').value = '';
    toast('安装成功，守护已启动（密码已保存到设备）', 'green', 4000);
    await refresh();
  });

  // 密码：展开/收起更换行
  $('#w_pwd_change').onclick = () => {
    const row = $('#w_pwd_edit_row');
    row.style.display = row.style.display === 'none' ? 'block' : 'none';
  };
  // 密码：保存并校验
  $('#w_pwd_save').onclick = lock(async () => {
    if (!(await checkAdvancedFunc())) throw new Error('请先启用高级功能');
    const pwd = ($('#w_pwd_input').value || '').trim();
    if (!pwd) throw new Error('请输入密码');
    toast('正在校验密码 ...', '', 2000);
    await savePwd(pwd);
    $('#w_pwd_input').value = '';
    $('#w_pwd_edit_row').style.display = 'none';
    toast('密码校验通过，已保存到设备', 'green', 3000);
    await refresh();
  });
  // 密码：清除
  $('#w_pwd_clear').onclick = lock(async () => {
    await clearPwd();
    toast('已清除保存的密码', 'pink');
    await refresh();
  });

  // 开机自启
  $('#w_boot_sw').onclick = lock(async () => {
    if (!(await checkAdvancedFunc())) throw new Error('请先启用高级功能');
    const sw = $('#w_boot_sw');
    const turnOn = !sw.classList.contains('on');
    sw.classList.add('busy');
    if (turnOn) {
      await runShellWithRoot(`sed -i '/kano_wifi_soft_guard/d' ${BOOT_FILE}; sed -i '1i ${DIR}/service.sh start' ${BOOT_FILE}`);
      await runShellWithRoot(`[ -d /data/adb/service.d ] && printf '#!/system/bin/sh\n${DIR}/service.sh start\n' > ${SERVICE_D} && chmod 755 ${SERVICE_D}`);
      toast('已设置开机自启', 'green');
    } else {
      await runShellWithRoot(`sed -i '/kano_wifi_soft_guard/d' ${BOOT_FILE}; rm -f ${SERVICE_D}`);
      toast('已取消开机自启', 'green');
    }
    await refresh();
  });

  // 卸载（连点 3 次确认）
  let uninstallCount = 0, uninstallTimer = null;
  $('#w_uninstall').onclick = lock(async () => {
    if (!(await checkAdvancedFunc())) throw new Error('请先启用高级功能');
    if (uninstallTimer) clearTimeout(uninstallTimer);
    uninstallTimer = setTimeout(() => (uninstallCount = 0), 2500);
    if (uninstallCount++ < 2) { toast(`再点 ${3 - uninstallCount} 次确认卸载`, 'pink'); return; }
    uninstallCount = 0;
    await uninstall();
    toast('已卸载，全部残留已清理', 'green', 4000);
    await refresh();
  });

  $('#w_refresh').onclick = lock(async () => {
    await refresh();
    toast('状态已刷新', 'green', 1500);
  });

  /* ================== 入口按钮 + 自动补启动 ================== */

  const openBtn = document.createElement('button');
  openBtn.textContent = 'WiFi 轻度关闭·断联拉回';
  openBtn.onclick = () => {
    showModal(`#${MODAL_ID}`);
    if (!busy) refresh().catch(e => console.log('[WiFiSoftGuard] refresh err:', e));
  };
  const slot = (typeof collapseBtn_menu !== 'undefined' && collapseBtn_menu)
    ? collapseBtn_menu.nextElementSibling?.querySelector('.collapse_box')
    : null;
  if (slot) slot.appendChild(openBtn);
  else document.querySelector('.functions-container .actions-buttons')?.appendChild(openBtn);

  // 页面加载时自动补启动：已安装但未运行则静默拉起守护
  (async () => {
    try {
      if (!(await checkAdvancedFunc())) return;
      if (!(await isInstall())) return;
      const res = await runShellWithRoot(`${DIR}/service.sh status`);
      if ((res?.content || '').trim() === 'running') return;
      await runShellWithRoot(`${DIR}/service.sh start`);
      toast('WiFi 轻度关闭守护已自动启动', 'green');
    } catch { }
  })();
})();
//</script>
