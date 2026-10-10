//<script>
(async () => {
  const PLUGIN_KEY = "#collapse_sqlite_toolkit";
  const TOOL_DIR = "/data/kano_sqlite_toolkit";
  const SQLITE_BIN = `${TOOL_DIR}/sqlite3`;
  const RESOURCE_ZIP = "/data/kano_sqlite_toolkit.zip";
  const REQUIRED_RESOURCE_FILES = ["sqlite3", "install.sh"];
  const RESOURCE_ZIP_URL = "https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/sqlite_toolkit_resource.zip";
  const INSTALL_TIMEOUT = 120000;
  const history = [];
  let dbCandidates = [];
  let uninstallConfirmCount = 0;
  let uninstallConfirmTimer = null;

  const checkAdvanceFunc = async () => {
    const res = await runShellWithRoot("whoami");
    return !!(res && res.content && res.content.includes("root"));
  };

  const shSingleQuote = (text) => {
    const t = String(text || "");
    return `'${t.replace(/'/g, `'\"'\"'`)}'`;
  };

  const sqlDoubleQuote = (text) => {
    const t = String(text || "").replace(/\r?\n/g, " ").trim();
    return t
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`");
  };

  const formatTime = () => new Date().toLocaleString();

  const makeLine = (text) =>
    String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const pushHistory = (type, cmd, res) => {
    const ok = !!(res && res.success);
    history.unshift({
      time: formatTime(),
      type,
      cmd,
      ok,
      output: (res && (res.content || res.error || "")) || "",
    });
    if (history.length > 80) history.length = 80;
    renderHistory();
  };

  const renderHistory = () => {
    const out = document.querySelector("#sqlite_toolkit_history");
    if (!out) return;
    if (!history.length) {
      out.innerHTML = `<div style="opacity:.7;">暂无执行记录</div>`;
      return;
    }
    out.innerHTML = history
      .map((item) => {
        const color = item.ok ? "#87ff5f" : "#ff5f5f";
        const cardBg = item.ok ? "rgba(95, 135, 0, 0.16)" : "rgba(175, 0, 0, 0.16)";
        return `
        <div style="margin-bottom:10px;padding:8px;border-radius:8px;background:${cardBg};border:1px solid rgba(255,255,255,0.10);color:#d0d0d0;">
          <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:700;color:${color};">${item.ok ? "SUCCESS" : "FAILED"} · ${makeLine(item.type)}</span>
            <span style="color:#b2b2b2;">${makeLine(item.time)}</span>
          </div>
          <pre style="white-space:pre-wrap;word-break:break-word;margin:6px 0 0 0;font-size:12px;color:#d7d7d7;font-family:Consolas,Monaco,monospace;">$ ${makeLine(item.cmd)}</pre>
          <pre style="white-space:pre-wrap;word-break:break-word;margin:6px 0 0 0;font-size:12px;color:#e4e4e4;max-height:180px;overflow:auto;font-family:Consolas,Monaco,monospace;">${makeLine(item.output || "(no output)")}</pre>
        </div>
      `;
      })
      .join("");
  };

  const renderDbCandidates = () => {
    const listEl = document.querySelector("#sqlite_toolkit_db_list");
    const emptyEl = document.querySelector("#sqlite_toolkit_db_empty");
    if (!listEl || !emptyEl) return;
    listEl.innerHTML = "";
    if (!dbCandidates.length) {
      emptyEl.style.display = "";
      return;
    }
    emptyEl.style.display = "none";
    dbCandidates.forEach((path) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = path;
      btn.style.width = "100%";
      btn.style.textAlign = "left";
      btn.style.padding = "6px 8px";
      btn.style.marginBottom = "6px";
      btn.style.fontSize = "12px";
      btn.style.overflow = "hidden";
      btn.style.textOverflow = "ellipsis";
      btn.style.whiteSpace = "nowrap";
      btn.onclick = () => {
        const dbEl = document.querySelector("#sqlite_toolkit_db_path");
        if (!dbEl) return;
        dbEl.value = path;
        createToast("已填充数据库路径", "green");
      };
      listEl.appendChild(btn);
    });
  };

  const buildIntegrityCheckCmd = () => {
    const checks = REQUIRED_RESOURCE_FILES.map((f) => `[ -s "${TOOL_DIR}/${f}" ]`).join(" && ");
    return `${checks} && [ -x "${SQLITE_BIN}" ] && echo "__OK__"`;
  };

  const ensureInstalled = async () => {
    const verify = await runShellWithRoot(buildIntegrityCheckCmd());
    return !!(verify && verify.success && String(verify.content || "").includes("__OK__"));
  };

  const installResource = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast("请先启用高级功能并确保 root 可用", "red");
      return;
    }
    if (await ensureInstalled()) {
      createToast("sqlite 资源包已安装，无需重复安装", "green");
      return;
    }
    createToast("开始下载并安装 sqlite 资源包...");
    const cmd = [
      "set -e",
      `mkdir -p ${TOOL_DIR}`,
      `rm -f ${RESOURCE_ZIP}`,
      `/data/data/com.minikano.f50_sms/files/curl -L ${shSingleQuote(RESOURCE_ZIP_URL)} -o ${RESOURCE_ZIP}`,
      `rm -rf ${TOOL_DIR}/*`,
      `unzip -o ${RESOURCE_ZIP} -d ${TOOL_DIR}/`,
      `chmod 755 ${SQLITE_BIN} ${TOOL_DIR}/install.sh 2>/dev/null || true`,
      `sh ${TOOL_DIR}/install.sh 2>/dev/null || true`,
      buildIntegrityCheckCmd(),
    ].join(" && ");
    const res = await runShellWithRoot(cmd, INSTALL_TIMEOUT);
    pushHistory("资源安装", cmd, res);
    const installed = await ensureInstalled();
    if (res.success && installed) {
      createToast("sqlite 资源安装完成", "green");
    } else {
      createToast("资源安装失败或资源文件不完整", "red", 5000);
    }
  };

  const uninstallResource = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast("请先启用高级功能并确保 root 可用", "red");
      return;
    }
    createToast("正在卸载 sqlite 资源...");
    const cmd = [
      "set -e",
      `rm -rf ${TOOL_DIR}`,
      `rm -f ${RESOURCE_ZIP}`,
      `[ ! -e "${TOOL_DIR}" ] && [ ! -e "${RESOURCE_ZIP}" ] && echo "__UNINSTALLED__"`,
    ].join(" && ");
    const res = await runShellWithRoot(cmd, 30000);
    pushHistory("资源卸载", cmd, res);
    const ok = res.success && String(res.content || "").includes("__UNINSTALLED__");
    createToast(ok ? "sqlite 资源已卸载" : "资源卸载失败", ok ? "green" : "red");
  };

  const uninstallResourceWithConfirm = async () => {
    uninstallConfirmCount += 1;
    if (uninstallConfirmTimer) clearTimeout(uninstallConfirmTimer);
    uninstallConfirmTimer = setTimeout(() => {
      uninstallConfirmCount = 0;
    }, 5000);

    if (uninstallConfirmCount < 2) {
      createToast("危险操作：请在 5 秒内再次点击“卸载资源包”确认", "pink", 3000);
      return;
    }

    uninstallConfirmCount = 0;
    if (uninstallConfirmTimer) {
      clearTimeout(uninstallConfirmTimer);
      uninstallConfirmTimer = null;
    }
    await uninstallResource();
  };

  const runSql = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast("请先启用高级功能并确保 root 可用", "red");
      return;
    }
    const dbEl = document.querySelector("#sqlite_toolkit_db_path");
    const sqlEl = document.querySelector("#sqlite_toolkit_sql");
    const dbPath = (dbEl?.value || "").trim();
    const sqlText = (sqlEl?.value || "").trim();

    if (!dbPath) return createToast("请先填写数据库文件路径", "red");
    if (!sqlText) return createToast("请先输入 SQL 语句", "red");
    if (!(await ensureInstalled())) {
      return createToast("未检测到完整 sqlite3 资源，请先安装资源包", "red", 4500);
    }

    const command = `${SQLITE_BIN} ${shSingleQuote(dbPath)} "${sqlDoubleQuote(sqlText)}"`;
    const res = await runShellWithRoot(command, 30000);
    pushHistory("SQLite", command, res);
    createToast(res.success ? "SQL 执行完成" : "SQL 执行失败", res.success ? "green" : "red");
  };

  const pickDbFromList = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast("请先启用高级功能并确保 root 可用", "red");
      return;
    }
    createToast("正在扫描常见数据库文件...");
    const cmd = `
{
  for p in /data/data /data/user/0 /data/user_de/0 /data/system /data/system_ce/0 /data/system_de/0 /data/misc; do
    [ -d "$p" ] || continue
    find "$p" -type f 2>/dev/null
  done
} | grep -E '(\\.(db|sqlite|sqlite3)$)|/(mmssms|telephony|contacts2|calllog)\\.db$' | sort -u | head -n 300
`;
    const res = await runShellWithRoot(cmd, 25000);
    pushHistory("扫描DB", cmd, res);

    if (!res.success || !res.content.trim()) {
      dbCandidates = [];
      renderDbCandidates();
      createToast("未扫描到数据库文件", "pink");
      return;
    }
    dbCandidates = res.content
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    renderDbCandidates();
    createToast("扫描完成，点击列表项可自动填充路径", "green");
  };

  const applySelectedDb = () => {
    const dbEl = document.querySelector("#sqlite_toolkit_db_path");
    if (!dbEl) return;
    const line = dbCandidates[0];
    if (!line) return;
    dbEl.value = line;
  };

  const killProcessByName = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast("请先启用高级功能并确保 root 可用", "red");
      return;
    }
    const nameEl = document.querySelector("#sqlite_toolkit_proc_name");
    const processName = (nameEl?.value || "").trim();
    if (!processName) return createToast("请先输入进程名", "red");

    const quoted = sqlDoubleQuote(processName);
    const cmd = `PIDS=$(pgrep -f "${quoted}"); if [ -z "$PIDS" ]; then echo "no process matched: ${quoted}"; else echo "$PIDS" | xargs kill -9; echo "killed pids: $PIDS"; fi`;
    const res = await runShellWithRoot(cmd, 20000);
    pushHistory("进程Killer", cmd, res);
    createToast(res.success ? "进程处理完成" : "进程处理失败", res.success ? "green" : "red");
  };

  const clearHistory = () => {
    history.length = 0;
    renderHistory();
    createToast("历史已清空", "green");
  };

  const appendCommonSql = (text) => {
    const el = document.querySelector("#sqlite_toolkit_sql");
    if (!el) return;
    el.value = text;
    el.focus();
  };

  const mmContainer = document.querySelector(".functions-container");
  if (!mmContainer) return;

  mmContainer.insertAdjacentHTML(
    "afterend",
    `
    <div id="IFRAME_KANO_SQLITE_TOOLKIT" style="width:100%;margin-top:10px;">
      <style>
        #IFRAME_KANO_SQLITE_TOOLKIT .sqlite_toolkit_grid {
          display: grid;
          grid-template-columns: minmax(280px,1fr) minmax(300px,1.2fr);
          gap: 10px;
        }
        #IFRAME_KANO_SQLITE_TOOLKIT .sqlite_toolkit_candidates {
          width: 100%;
          max-height: 120px;
          overflow: auto;
          padding: 8px;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
        }
        #IFRAME_KANO_SQLITE_TOOLKIT .sqlite_toolkit_history_box {
          max-height: 520px;
          min-height: 280px;
          overflow-y: auto;
          overflow-x: hidden;
        }
        #IFRAME_KANO_SQLITE_TOOLKIT .sqlite_toolkit_actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        @media (max-width: 900px) {
          #IFRAME_KANO_SQLITE_TOOLKIT .sqlite_toolkit_grid {
            grid-template-columns: 1fr;
          }
          #IFRAME_KANO_SQLITE_TOOLKIT .sqlite_toolkit_actions > button {
            flex: 1 1 calc(50% - 8px);
            min-width: 120px;
          }
          #IFRAME_KANO_SQLITE_TOOLKIT .sqlite_toolkit_history_box {
            max-height: 420px;
            min-height: 240px;
          }
        }
      </style>
      <div class="title" style="margin:6px 0;">
        <strong>SQLite 管理 + 进程 Killer</strong>
        <div style="display:inline-block;" id="collapse_sqlite_toolkit_btn"></div>
      </div>
      <div class="collapse" id="collapse_sqlite_toolkit" data-name="close" style="height:0;overflow:hidden;">
        <div class="collapse_box">
          <ul class="deviceList">
            <li style="padding:10px;">
              <div class="sqlite_toolkit_grid">
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <div class="title">SQLite 指令区</div>
                  <div class="sqlite_toolkit_actions">
                    <button id="sqlite_toolkit_install">安装资源包</button>
                    <button id="sqlite_toolkit_uninstall">卸载资源包</button>
                    <button id="sqlite_toolkit_scan_db">扫描常见 DB</button>
                  </div>
                  <input id="sqlite_toolkit_db_path" type="text" placeholder="/data/data/com.zte.web/databases/web_settings.db" style="width:100%;padding:8px;border-radius:8px;border:none;background:rgba(255,255,255,0.05);" />
                  <div class="sqlite_toolkit_candidates">
                    <div id="sqlite_toolkit_db_empty" style="opacity:.7;">扫描后这里会生成可点击列表</div>
                    <div id="sqlite_toolkit_db_list"></div>
                  </div>
                  <div class="sqlite_toolkit_actions">
                    <button id="sqlite_toolkit_pick_db">用第一行填充 DB 路径</button>
                    <button id="sqlite_toolkit_clear_sql">清空 SQL</button>
                  </div>
                  <textarea id="sqlite_toolkit_sql" placeholder="例如：UPDATE setting SET value='0' WHERE key='monthly_time';" style="width:100%;height:130px;padding:8px;border-radius:8px;border:none;background:rgba(255,255,255,0.05);"></textarea>
                  <div class="sqlite_toolkit_actions">
                    <button id="sqlite_toolkit_exec">执行 SQL</button>
                    <button id="sqlite_toolkit_sql_1">示例: monthly_time</button>
                    <button id="sqlite_toolkit_sql_2">示例: realtime_time</button>
                    <button id="sqlite_toolkit_sql_3">示例: select setting</button>
                  </div>
                  <div class="title" style="margin-top:6px;">进程 Killer</div>
                  <input id="sqlite_toolkit_proc_name" type="text" placeholder="输入进程名关键字，例如 zte.web" style="width:100%;padding:8px;border-radius:8px;border:none;background:rgba(255,255,255,0.05);" />
                  <div class="sqlite_toolkit_actions">
                    <button id="sqlite_toolkit_kill">执行 Killer</button>
                    <button id="sqlite_toolkit_proc_example" type="button">示例 com.zte.web</button>
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;min-height:460px;">
                  <div class="title" style="display:flex;justify-content:space-between;align-items:center;">
                    <span>输出结果与历史</span>
                    <button id="sqlite_toolkit_clear_history" style="padding:2px 8px;">清空历史</button>
                  </div>
                  <div id="sqlite_toolkit_history" class="sqlite_toolkit_history_box" style="flex:1;padding:8px;border-radius:8px;background:rgba(28,28,28,0.72);border:1px solid rgba(255,255,255,0.10);font-size:12px;color:#d0d0d0;"></div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
    `
  );

  document.querySelector("#sqlite_toolkit_install")?.addEventListener("click", installResource);
  document.querySelector("#sqlite_toolkit_uninstall")?.addEventListener("click", uninstallResourceWithConfirm);
  document.querySelector("#sqlite_toolkit_scan_db")?.addEventListener("click", pickDbFromList);
  document.querySelector("#sqlite_toolkit_pick_db")?.addEventListener("click", applySelectedDb);
  document.querySelector("#sqlite_toolkit_clear_sql")?.addEventListener("click", () => {
    const el = document.querySelector("#sqlite_toolkit_sql");
    if (el) el.value = "";
  });
  document.querySelector("#sqlite_toolkit_exec")?.addEventListener("click", runSql);
  document.querySelector("#sqlite_toolkit_kill")?.addEventListener("click", killProcessByName);
  document.querySelector("#sqlite_toolkit_proc_example")?.addEventListener("click", () => {
    const el = document.querySelector("#sqlite_toolkit_proc_name");
    if (!el) return;
    el.value = "com.zte.web";
    el.focus();
  });
  document.querySelector("#sqlite_toolkit_clear_history")?.addEventListener("click", clearHistory);

  document.querySelector("#sqlite_toolkit_sql_1")?.addEventListener("click", () => {
    appendCommonSql("UPDATE setting SET value='0' WHERE key='monthly_time';");
  });
  document.querySelector("#sqlite_toolkit_sql_2")?.addEventListener("click", () => {
    appendCommonSql("UPDATE setting SET value='0' WHERE key='realtime_time';");
  });
  document.querySelector("#sqlite_toolkit_sql_3")?.addEventListener("click", () => {
    appendCommonSql("select * from setting;");
  });

  collapseGen("#collapse_sqlite_toolkit_btn", "#collapse_sqlite_toolkit", PLUGIN_KEY);
  renderHistory();
  renderDbCandidates();

  if (localStorage.getItem(PLUGIN_KEY) === "open") {
    const dbEl = document.querySelector("#sqlite_toolkit_db_path");
    if (dbEl && !dbEl.value) {
      dbEl.value = "/data/data/com.zte.web/databases/web_settings.db";
    }
  }
})();
//</script>
