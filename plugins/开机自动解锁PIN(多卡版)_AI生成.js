<script>
(async () => {

  /* ================== 基本配置 ================== */

  const BASE_DIR = "/data/Tm_pin_manager"
  const CONF_FILE = `${BASE_DIR}/pin_map.conf`
  const LOG_FILE  = `${BASE_DIR}/Tm_pin_manager.log`
  const SH_FILE   = `${BASE_DIR}/Tm_pin_manager.sh`
  const BOOT_FILE = "/sdcard/ufi_tools_boot.sh"
  const BOOT_LINE = `sh ${SH_FILE} &`

  const ZIP_URL = "https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/Tm_pin_manager.zip"

  let logTimer = null
  const pinShowState = new Map()
  /* ================== 工具函数 ================== */

  const sh = async (cmd, timeout = 20000) => {
    try {
      return await runShellWithRoot(cmd, timeout)
    } catch {
      return { success: false, content: "" }
    }
  }

  const checkRoot = async () => {
    const r = await sh("whoami")
    return r.success && r.content.includes("root")
  }

  const readFile = async (path) => {
    const r = await sh(`cat '${path}' 2>/dev/null || true`, 2500)
    return r.success ? (r.content || "") : (r.content || "")
  }


  const writeFile = async (path, content) => {
    return (await sh(`cat > ${path} << 'EOF'\n${content}\nEOF`)).success
  }

  /* ================== 安装状态 ================== */

  const getInstallStatus = async () => {
    const dir = await sh(`[ -d ${BASE_DIR} ] && echo 1 || echo 0`)
    const shf = await sh(`[ -f ${SH_FILE} ] && echo 1 || echo 0`)
    const boot = await readFile(BOOT_FILE)
    return {
      dir: dir.content.trim() === "1",
      script: shf.content.trim() === "1",
      boot: boot.includes("Tm_pin_manager.sh")
    }
  }

  /* ================== 配置 ================== */

  const parseConfig = (txt) => {
    return (txt || "")
      .replace(/\r/g, "")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .map(l => {
        const parts = l.split("|")
        if (parts.length < 2) return null
        const iccid = (parts[0] || "").trim()
        const pin = parts.slice(1).join("|").trim()
        if (!iccid || !pin) return null
        return { iccid, pin }
      })
      .filter(Boolean)
  }


  const loadConfig = async () =>
    parseConfig(await readFile(CONF_FILE))

  const saveConfig = async (rows) =>
    writeFile(CONF_FILE, ["# ICCID|PIN", ...rows.map(r => `${r.iccid}|${r.pin}`)].join("\n"))

  /* ================== 日志 ================== */

  const refreshLog = async () => {
    const el = document.querySelector("#tmPinModal .log_area")
    if (!el) return
    el.value = await readFile(LOG_FILE)
    el.scrollTop = el.scrollHeight
  }

  const startLog = () => {
    stopLog()
    refreshLog()
    logTimer = setInterval(refreshLog, 2000)
  }

  const stopLog = () => {
    if (logTimer) {
      clearInterval(logTimer)
      logTimer = null
    }
  }

  const downloadLog = async () => {
    const blob = new Blob([await readFile(LOG_FILE)], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "Tm_pin_manager.log"
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ================== 安装 / 卸载 ================== */

const install = async () => {
  if (!await checkRoot()) return createToast("请先启用高级功能", "red")

  createToast("安装中..")

  await sh(`mkdir -p ${BASE_DIR}`, 3000)

  const dl = await sh(`/data/data/com.minikano.f50_sms/files/curl -L ${ZIP_URL} -o ${BASE_DIR}/pkg.zip`, 120000)
  if (!dl.success) return createToast("下载失败", "red")

  const uz = await sh(`unzip -o -qq ${BASE_DIR}/pkg.zip -d ${BASE_DIR}`, 120000)
  if (!uz.success) return createToast("解压失败", "red")

  await sh("chmod 755 ${BASE_DIR}/*", 3000)

  await sh(`sh -c "[ -f ${CONF_FILE} ] || echo '# ICCID|PIN' > ${CONF_FILE}"`, 3000)

  const bootCmd = `sh -c "
    sed -i '/Tm_pin_manager\\.sh/d' ${BOOT_FILE} 2>/dev/null || true
    grep -qxF '${BOOT_LINE}' ${BOOT_FILE} 2>/dev/null || sed -i '1i ${BOOT_LINE}' ${BOOT_FILE}
  "`
  const bootRes = await sh(bootCmd, 4000)
  if (!bootRes.success) return createToast("设置开机自启失败", "red")

  createToast("安装完成", "pink")
  await renderAll()
}

  const uninstall = async () => {
    if (!await checkRoot()) return createToast("请先启用高级功能", "red")
    await sh(`rm -rf ${BASE_DIR}`)
    await sh(`sed -i '/Tm_pin_manager.sh/d' ${BOOT_FILE}`)
    createToast("已卸载", "red")
    renderAll()
  }

  /* ================== UI ================== */

  const html = `
<div class="title">PIN 管理器 By: Tianmoy</div>

<style>
#tmPinModal .cfg_row{display:flex;gap:8px;align-items:center}
#tmPinModal .cfg_row input{flex:1;min-width:0;padding:6px}
#tmPinModal .pin_wrap{display:flex;gap:6px;flex:1}
#tmPinModal .cfg_btns{margin-top:8px;display:flex;gap:8px;justify-content:flex-end}
@media (max-width:420px){
  #tmPinModal .cfg_btns button{flex:1}
}
</style>

<div class="content" style="max-height:80vh;overflow:auto;width: 86vw;max-width: 500px;">

  <div class="status" style="margin: 8px 0;font-size:13px"></div>

  <div style="display:flex;gap:8px;font-size:12px;color:#666;margin:4px 0">
    <div style="flex:1">ICCID</div>
    <div style="flex:1">PIN</div>
  </div>


  <div class="cfg_row">
    <input class="iccid" style="width: 100%;" placeholder="ICCID">
    <div class="pin_wrap">
      <input class="pin" type="password" placeholder="PIN">
      <button class="toggle_pin">显示</button>
    </div>
  </div>

  <div class="cfg_btns">
    <button class="fill_iccid">读取当前ICCID</button>
    <button class="add">添加/保存</button>
    <button class="refresh_cfg">刷新配置</button>
  </div>

  <table class="tbl" style="width:100%;margin-top:10px;font-size:13px"></table>

  <div style="display:flex;gap:10px;margin:12px 0">
    <button class="install" style="flex:1">安装</button>
    <button class="uninstall" style="flex:1">卸载</button>
  </div>

  <div>
    <div style="margin-bottom:6px">日志</div>
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <button class="log_refresh">刷新</button>
      <button class="log_download">下载</button>
    </div>
    <textarea class="log_area" disabled style="width:100%;min-height:160px"></textarea>
  </div>
</div>

<div class="btn" style="text-align: right;"><button class="close_btn">关闭</button></div>
`

  const modal = document.createElement("div")
  modal.id = "tmPinModal"
  modal.className = "modal"
  modal.style.display = "none"
  modal.innerHTML = html
  document.querySelector(".container").appendChild(modal)

  /* ================== 渲染 ================== */

  const renderStatus = async () => {
    const s = await getInstallStatus()
    modal.querySelector(".status").innerHTML =
      `安装状态：目录${s.dir?"✅":"❌"} 脚本${s.script?"✅":"❌"} 开机脚本${s.boot?"✅":"❌"}`
  }

  const renderTable = async () => {
    const rows = await loadConfig()
    const tbl = modal.querySelector(".tbl")
  
    if (!rows.length) {
      tbl.innerHTML = `<tr><td style="color:#999">暂无配置</td></tr>`
      return
    }
  
    tbl.innerHTML = `
  <tr>
    <th style="text-align:left;padding:6px;border-bottom:1px solid #eee">ICCID</th>
    <th style="text-align:left;padding:6px;border-bottom:1px solid #eee">PIN</th>
    <th style="text-align:right;padding:6px;border-bottom:1px solid #eee">操作</th>
  </tr>
  ${rows.map((r, i) => {
    const show = pinShowState.get(r.iccid) === true
    const pinText = show ? r.pin : "•".repeat(Math.min(8, r.pin.length || 6))
    return `
  <tr>
    <td style="padding:6px;border-bottom:1px solid #f3f3f3">${r.iccid}</td>
    <td style="padding:6px;border-bottom:1px solid #f3f3f3">${pinText}</td>
    <td style="padding:6px;border-bottom:1px solid #f3f3f3;text-align:right">
      <button class="toggle_row" data-iccid="${r.iccid}">${show ? "隐藏" : "显示"}</button>
      <button class="edit" data-iccid="${r.iccid}" data-pin="${r.pin}">编辑</button>
      <button class="del" data-i="${i}">删除</button>
    </td>
  </tr>`
  }).join("")}
  `
  
    // 显示/隐藏
    tbl.querySelectorAll("button.toggle_row").forEach(btn => {
      btn.onclick = async () => {
        const iccid = btn.dataset.iccid
        pinShowState.set(iccid, !(pinShowState.get(iccid) === true))
        await renderTable()
      }
    })
  
    // 删除
    tbl.querySelectorAll("button.del").forEach(btn => {
      btn.onclick = async () => {
        const i = Number(btn.dataset.i)
        const cur = await loadConfig()
        cur.splice(i, 1)
        const ok = await saveConfig(cur)
        ok ? createToast("已删除", "pink") : createToast("删除失败", "red")
        await renderTable()
      }
    })
    
    // 编辑
    tbl.querySelectorAll("button.edit").forEach(btn => {
      btn.onclick = () => {
        modal.querySelector(".iccid").value = btn.dataset.iccid
        modal.querySelector(".pin").value = btn.dataset.pin
        createToast("已填入，修改后点【添加/保存】", "pink")
      }
    })
  }


  const renderAll = async () => {
    await renderStatus()
    await renderTable()
    await refreshLog()
  }

  /* ================== 事件 ================== */
  
  modal.querySelector(".fill_iccid").onclick = async () => {
    if (!await checkRoot()) return createToast("请先启用高级功能", "red")

    const r = await sh(`${BASE_DIR}/zreq --pwd "Wa@9w+YWRtaW4=" --method GET --params "isTest=false&cmd=sim_iccid" --json`, 3000)
    const m = (r.content || "").match(/"sim_iccid"\s*:\s*"([^"]+)"/)
    const iccid = m ? m[1] : ""
    if (!iccid) return createToast("读取ICCID失败", "red")

    modal.querySelector(".iccid").value = iccid
    createToast("已填入当前ICCID", "pink")
  }


  modal.querySelector(".add").onclick = async () => {
    const iccid = modal.querySelector(".iccid").value.trim()
    const pin = modal.querySelector(".pin").value.trim()
  
    if (!iccid || !pin) return createToast("请输入 ICCID 和 PIN", "red")
  
    const rows = await loadConfig()
  
    const idx = rows.findIndex(r => r.iccid === iccid)
    if (idx >= 0) {
      rows[idx].pin = pin
    } else {
      rows.push({ iccid, pin })
    }

    const ok = await saveConfig(rows)
    if (!ok) return createToast("写入失败", "red")
    createToast("保存成功", "pink")

    modal.querySelector(".iccid").value = ""
    modal.querySelector(".pin").value = ""
    await renderTable()
  }
  
  modal.querySelector(".refresh_cfg").onclick = async () => {
    const btn = modal.querySelector(".refresh_cfg")
    btn.disabled = true
    btn.textContent = "刷新中..."
    try {
      await renderTable()
      createToast("配置已刷新", "pink")
    } catch (e) {
      createToast("刷新失败", "red")
    } finally {
      btn.disabled = false
      btn.textContent = "刷新配置"
    }
  }

  modal.querySelector(".toggle_pin").onclick = () => {
    const p = modal.querySelector(".pin")
    p.type = p.type === "password" ? "text" : "password"
  }

  modal.querySelector(".install").onclick = install
  modal.querySelector(".uninstall").onclick = uninstall
  modal.querySelector(".log_refresh").onclick = refreshLog
  modal.querySelector(".log_download").onclick = downloadLog
  modal.querySelector(".close_btn").onclick = () => {
    stopLog()
    closeModal("#tmPinModal")
  }

  /* ================== 打开按钮 ================== */

  const btn = document.createElement("button")
  btn.textContent = "PIN 管理器"
  btn.onclick = async () => {
    showModal("#tmPinModal")
    await renderAll()
    startLog()
  }
  document.querySelector(".actions-buttons").appendChild(btn)

})();
</script>
