//<script>
(() => {
const run = async (cmd) => runShellWithRoot(cmd);
  const checkAdvanceFunc = async () => {
    const res = await runShellWithRoot('whoami');
    if (res.content) {
      if (res.content.includes('root')) {
        return true;
      }
    }
    return false;
  };

  const createRandomString = (length = 8) => {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  };

  const isMMRunning = async () => {
    const status = await runShellWithRoot(`pgrep -f "/data/clash/Proxy/Clash.Core"`);
    const running_mm = document.querySelector('#running_mm');
    const isR =
      status.content != null &&
      status.content != undefined &&
      status.content != '';
    if (running_mm) {
      running_mm.innerHTML = isR ? 'Open Clash - 🟢运行中' : 'Open Clash - 🔴已停止';
    }
    return isR;
  };

  async function isELF(file) {
    const blob = file.slice(0, 4);
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return (
      bytes[0] === 0x7f &&
      bytes[1] === 0x45 &&
      bytes[2] === 0x4c &&
      bytes[3] === 0x46
    );
  }

  const askConfirm = (id, title, body, ok = '确认', cancel = '取消') => new Promise((resolve) => {
    const { el, close } = createFixedToast(
      id,
      `<div style="pointer-events:all;width:90vw;max-width:520px;">
        <div class="title" style="margin:0">${title}</div>
        <div style="margin-top:10px;font-size:.7rem;line-height:1.75">${body}</div>
        <div style="margin-top:14px;text-align:right;display:flex;justify-content:flex-end;gap:10px;">
          <button class="ok">${ok}</button>
          <button class="cancel">${cancel}</button>
        </div>
      </div>`,
    );
    const done = (value) => {
      close();
      resolve(value);
    };
    el.querySelector('.ok')?.addEventListener('click', () => done(true));
    el.querySelector('.cancel')?.addEventListener('click', () => done(false));
  });

  const checkIsBootUp = async () => {
    const res = await runShellWithRoot(`
        grep -qxF '/data/clash/Scripts/Clash.Service start' /sdcard/ufi_tools_boot.sh
        echo $?
        `);
    return res.content.trim() == '0';
  };

  const checkIsInstalled = async () => {
    const res = await runShellWithRoot(`
        ls /data/clash/Scripts/Clash.Service
        `);
    return res.success && res.content && res.content.includes('Clash.Service');
  };

  const saveConfig = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await (
        await fetch(`${KANO_baseURL}/upload_img`, {
          method: 'POST',
          headers: common_headers,
          body: formData,
        })
      ).json();

      if (res.url) {
        let foundFile = await runShellWithRoot(`
                        ls /data/data/com.minikano.f50_sms/files/${res.url}
                    `);
        if (!foundFile.content) {
          throw '上传失败';
        }
        let resShell = await runShellWithRoot(`
                        mv  /data/data/com.minikano.f50_sms/files/${res.url} /data/clash/Proxy/config.yaml
                    `);
        if (resShell.success) {
await runShellWithRoot(`
  /data/clash/Scripts/Clash.Service stop
  sleep 1
  /data/clash/Scripts/Clash.Service start
`);
await isMMRunning();
if (typeof refreshUI === 'function') await refreshUI();
          return true;
        }
      } else throw res.error || '';
    } catch (e) {
      console.error(e);
      createToast(`上传失败!`, 'red');
      return false;
    }
  };

  const showDialog = (message, title = '提示') => {
    let timer = null;
    const containerId = 'toast_' + createRandomString(4);
    const id = 'close_message_btn_' + createRandomString(4);
    const id_download = 'download_btn_' + createRandomString(4);
    const id_clear = 'clear_btn_' + createRandomString(4);
    const id_refresh = 'clear_btn_' + createRandomString(4);
    const id_pause = 'pause_btn_' + createRandomString(4);
    const message1 = message.replaceAll('\n', '<br>');
    const { el, close } = createFixedToast(
      containerId,
      `
        <div style="pointer-events:all;width:80vw;max-width:800px">
            <div class="title" style="margin:0" data-i18n="system_notice">${title}</div>
           <div class="content_message" style="height:120px;overflow-y:auto;padding:8px 10px;font-size:.56rem;line-height:1.7;font-family:'SF Mono',Menlo,Consolas,monospace;color:#86efac;white-space:pre-wrap;word-break:break-all;background:rgba(0,0,0,.45);border-radius:6px;margin:10px 0;box-sizing:border-box;">${message1}</div>
            <div style="text-align:right">
                <button style="font-size:.64rem" id="${id}" data-i18n="close_btn">${t('close_btn')}</button>
                <button style="font-size:.64rem" id="${id_download}" data-i18n="only_download">${t('only_download')}</button>
                <button style="font-size:.64rem;background:var(--dark-btn-color-active)" id="${id_pause}">自动滚动</button>
                <button style="font-size:.64rem" id="${id_refresh}">刷新</button>
                <button style="font-size:.64rem" id="${id_clear}">清空日志</button>
            </div>
        </div>
        `,
    );
    const btn = el.querySelector(`#${id}`);
    const download = el.querySelector(`#${id_download}`);
    const clearBtn = el.querySelector(`#${id_clear}`);
    const rBtn = el.querySelector(`#${id_refresh}`);
    const msg_el = el.querySelector(`.content_message`);

    if (!btn) {
      close();
      if (timer) timer();
      return;
    }

    let shouldPause = false;
    let fnfn = requestInterval(() => {
      if (msg_el && !shouldPause) {
        msg_el.scrollTo({
          top: msg_el.scrollHeight + 199,
          left: 0,
          behavior: 'smooth',
        });
      }
    }, 500);

    if (download) {
      download.onclick = async () => {
        const t = Math.floor(Date.now() + Math.random());
        const file = new File([message1.replaceAll('<br>', '\n')], {
          type: 'text/plain',
        });
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.download = `kano_mm_log_${t}.txt`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
      };
    }

    if (clearBtn) {
      clearBtn.onclick = async () => {
        const res = await runShellWithRoot(
          `echo "" > /sdcard/Clash内核日志.txt`,
        );
        if (res.success) {
          createToast('日志已清空', 'green');
          close();
          if (timer) timer();
          fnfn && fnfn();
        } else {
          createToast(`清空日志失败`, 'red');
        }
      };
    }

    const refresh = async (flag = false) => {
  const msg_el = el.querySelector(`.content_message`);
  const res = await runShellWithRoot(`
    [ -f /sdcard/Clash内核日志.txt ] && timeout 2s awk '{print}' /sdcard/Clash内核日志.txt || echo "暂无日志"
  `);
  if (res.success) {
    msg_el.innerHTML = res.content.replaceAll('\n', '<br>');
    flag && createToast('日志已刷新');
  } else {
    flag && createToast('获取日志失败', 'red');
  }
};

    if (rBtn) {
      rBtn.onclick = async () => {
        await refresh(true);
      };
    }

    if (timer) timer();
    timer = requestInterval(async () => {
      await refresh();
    }, 1000);

    btn.onclick = async () => {
      if (timer) timer();
      close();
      fnfn && fnfn();
    };

    const pause_btn = el.querySelector(`#${id_pause}`);
    if (pause_btn) {
      pause_btn.dataset.paused = '1';
      pause_btn.onclick = () => {
        if (pause_btn.dataset.paused != '1') {
          pause_btn.dataset.paused = '1';
          pause_btn.style.background = 'var(--dark-btn-color-active)';
          shouldPause = false;
        } else {
          pause_btn.dataset.paused = '0';
          pause_btn.style.background = '';
          shouldPause = true;
        }
      };
    }
  };

const createButtonWithConfirm = (text, icon, color, action, id = null) => {
  const btn = document.createElement('button');
  btn.innerHTML = `${icon} ${text}`;
  btn.classList.add('btn');
  btn.style.cssText =
    `background:${color.bg}; border-color:${color.border}; color:${color.text}; padding:4px 12px; font-size:.7rem; border-radius:6px;`;
  let clickCount = 0;
  let timer = null;
  btn.onclick = async () => {
    clickCount++;
    if (clickCount === 1) {
      timer = setTimeout(() => { clickCount = 0; timer = null; }, 3000);
      createToast(`⚠️ 请再点击 ${2} 次确认${text}`, 'yellow', 2000);
    } else if (clickCount === 2) {
      createToast(`⚠️ 请再点击 ${1} 次确认${text}`, 'yellow', 2000);
    } else if (clickCount >= 3) {
      clearTimeout(timer);
      clickCount = 0;
      timer = null;
      try {
        await action();
      } catch (e) {
        console.error(e);
        createToast('操作失败: ' + e.message, 'red');
      }
    }
  };
  if (id) btn.id = id;
  return btn;
};

  const btn_enabled = document.createElement('button');
  btn_enabled.textContent = '安装';
  let disabled_btn_enabled = false;
  btn_enabled.onclick = async (e) => {
    if (disabled_btn_enabled) return;
    disabled_btn_enabled = true;
    try {
      if (!(await checkAdvanceFunc())) {
        disabled_btn_enabled = false;
        createToast('没有开启高级功能，无法使用！', 'red');
        return;
      }
      if (await checkIsInstalled()) {
        disabled_btn_enabled = false;
        createToast('已经安装过Open Clash了！', 'red');
        return;
      }

      createToast('下载所需组件中...');
     const archRes = await runShellWithRoot('uname -m');
let arch = archRes.content.trim();
const bitRes = await runShellWithRoot('getconf LONG_BIT 2>/dev/null || echo 32');
const bits = bitRes.content.trim();
let downloadUrl = '';

if (bits === '64') {
    if (arch === 'aarch64' || arch === 'arm64' || arch === 'armv8l' || arch === 'arm64-v8a') {
        downloadUrl = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/mihomo-tproxy.zip';
    } else if (arch === 'x86_64' || arch === 'amd64') {
        downloadUrl = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/mihomo-tproxy.zip';
    } else {
        createToast('⚠️ 未知64位架构: ' + arch + '，尝试下载64位包', 'yellow', 3000);
        downloadUrl = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/mihomo-tproxy.zip';
    }
} else {
    if (arch === 'armv7l' || arch === 'armhf' || arch === 'armv8l' || arch === 'arm') {
        downloadUrl = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/mihomo-tproxy_32.zip';
    } else if (arch === 'i386' || arch === 'i686' || arch === 'x86') {
        downloadUrl = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/mihomo-tproxy_32.zip';
    } else {
        createToast('⚠️ 未知32位架构: ' + arch + '，尝试下载32位包', 'yellow', 3000);
        downloadUrl = 'https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/mihomo-tproxy_32.zip';
    }
}

createToast('检测到架构: ' + arch + '，系统位数: ' + bits + 'bit，下载对应安装包', 'green', 2000);

const res0 = await runShellWithRoot(
    `/data/data/com.minikano.f50_sms/files/curl -L "${downloadUrl}" -o /data/kano_clash.zip --output /data/kano_clash.zip --write-out "DOWNLOAD_DONE\nTotal: %{size_download} bytes\nSpeed: %{speed_download} B/s\nTime: %{time_total} sec\n" > /data/kano_mihomo_latest.dlog 2>&1 &`,
    100 * 1000,
);
      if (!res0.success) {
        btn_enabled.disabled = false;
        return createToast('下载依赖失败!', 'red');
      }

      let log = '';
      const max_times = 600;
      let count_times = 0;
      const { el, close } = createFixedToast(
        'kano_mihomo_toast',
        `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">等待日志中...</pre>`,
        '',
      );

      const interval = setInterval(async () => {
        const dlog = await runShellWithRoot(
          "timeout 2s  awk '{print}' /data/kano_mihomo_latest.dlog",
        );
        const lines = dlog.content.split('\n');
        log = lines.slice(-6).join('\n');
        el.innerHTML = `<pre style="white-space: pre-wrap;min-width:300px;text-align: center;">${log.replaceAll('\n', '<br>')}</pre>`;
        if (log.includes('DOWNLOAD_DONE')) {
          setTimeout(() => {
            close();
          }, 2000);
        }
      }, 1000);

      while (true) {
        if (max_times <= count_times) {
          clearInterval(interval);
          btn_enabled.disabled = false;
          createToast('下载超时，请检查网络连接或稍后重试！', 'red');

return;
        }
        if (log.includes('DOWNLOAD_DONE')) {
          clearInterval(interval);
          break;
        }
        count_times++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await runShellWithRoot('rm -f /data/kano_mihomo_latest.dlog');

      createToast('解压Open Clash文件...');
      const res2 = await runShellWithRoot(`
        cd /data/
        mkdir -p clash
        unzip kano_clash.zip -d /data/clash/
        `);
      if (!res2.success) return createToast('解压Open Clash文件出错!', 'red');

await runShellWithRoot(`sed -i 's/猫猫/Open Clash/g' /data/clash/Scripts/Clash.Service 2>/dev/null || true`);
await runShellWithRoot(`sed -i 's/猫猫/Open Clash/g' /data/clash/Scripts/Clash.Inotify 2>/dev/null || true`);

      createToast('检查依赖文件，可能需要一点时间...');
      const res3 = await runShellWithRoot(`
        ls /data/clash/Scripts
        `);
      if (!res3.success || !res3.content.includes('Clash.Service'))
        return createToast('检查Open Clash依赖文件失败!', 'red');

      createToast('正在安装Open Clash，设置开机自启动...');
      const res5 = await runShellWithRoot(`
chmod 777 -Rf /data/clash
grep -qxF '/data/clash/Scripts/Clash.Service start' /sdcard/ufi_tools_boot.sh || echo '/data/clash/Scripts/Clash.Service start' >> /sdcard/ufi_tools_boot.sh
grep -qxF 'inotifyd /data/clash/Scripts/Clash.Inotify "/data/clash/Clash" >> /dev/null &' /sdcard/ufi_tools_boot.sh || echo 'inotifyd /data/clash/Scripts/Clash.Inotify "/data/clash/Clash" >> /dev/null &' >> /sdcard/ufi_tools_boot.sh
        `);
      if (!res5.success) return createToast('设置Open Clash自启动失败!', 'red');

      createToast('启动Open Clash...');
      const res6 = await runShellWithRoot(`
        /data/clash/Scripts/Clash.Service start
        `);
      if (!res6.success) return createToast('启动Open Clash失败!', 'red');

      disabled_btn_enabled = false;

      checkIsBootUp().then((isBootUp) => {
        const boot_on = document.querySelector('#clash_boot_on');
        if (!boot_on) return;
        if (isBootUp) {
          boot_on.style.background = 'var(--dark-btn-color-active)';
        } else {
          boot_on.style.background = '';
        }
      });
      setTimeout(() => {
        isMMRunning();
      }, 3000);

      await askConfirm(
        'mm_installed_confirm_1',
        '启动Open Clash成功',
        `web地址(端口默认是7788)<br />
        <a href="http://${UFI_DATA.lan_ipaddr}:7788/ui/" target="_blank">http://${UFI_DATA.lan_ipaddr}:7788/ui/</a><br />
        主机地址填:${UFI_DATA.lan_ipaddr}<br />
        密码默认为123456<br />
        端口填7788<br />
        第一次使用请点击编辑配置，按照说明操作，不然核心无法启动！<br />
        依赖文件路径:/data/clash/<br/>
        内核日志:sdcard/Clash内核日志.txt<br/>
        输出:${res6.content}`,
        'OK',
      );
    } finally {
      disabled_btn_enabled = false;
      await runShellWithRoot(`rm -f /data/kano_clash.zip`);
    }
  };

const uninstallAction = async () => {
  if (!(await checkAdvanceFunc())) {
    createToast('没有开启高级功能，无法使用！', 'red');
    return;
  }
  createToast('卸载中...', 'red');

  await runShellWithRoot(`
    /data/clash/Scripts/Clash.Service stop
    sleep 1
    pkill -f "Clash" 2>/dev/null || true
    rm -rf /data/clash
    sed -i '/Clash.Service/d' /sdcard/ufi_tools_boot.sh
    sed -i '/Clash.Inotify/d' /sdcard/ufi_tools_boot.sh
    rm -f /sdcard/Clash内核日志.txt
  `);

  createToast('✅ 卸载完成，已全部清理', 'green');
  await isMMRunning();
  if (typeof refreshUI === 'function') await refreshUI();
};

  const btn_disabled = createButtonWithConfirm(
    '卸载',
    '🗑️',
    { bg: 'rgba(220,53,69,.12)', border: 'rgba(220,53,69,.2)', text: '#dc3545' },
    uninstallAction,
    'mm_uninstall_btn'
  );

const btn_restart = document.createElement('button');
btn_restart.textContent = '重启';
btn_restart.onclick = async () => {
  if (!(await checkAdvanceFunc())) {
    createToast('没有开启高级功能，无法使用！', 'red');
    return;
  }
  if (!(await checkIsInstalled())) {
    createToast('没有安装Open Clash，请先安装！', 'red');
    return;
  }

  const confirmed = await askConfirm(
    'restart_confirm',
    '⚠️ 确认重启',
    '确定要重启 Open Clash 核心吗？服务将短暂中断。',
    '确认重启',
    '取消'
  );
  if (!confirmed) return;

  createToast('⏳ Open Clash 内核重启中...', 'yellow');

  try {
    const res = await runShellWithRoot(
      `
        /data/clash/Scripts/Clash.Service stop
        sleep 1
        /data/clash/Scripts/Clash.Service start
      `,
      100 * 1000
    );
const running = await isMMRunning();
if (!running) {
  createToast('❌ Open Clash 重启失败！请查看日志。', 'red');
  return;
}

    let mode = 'tproxy';
    if (res.content) {
      const modeMatch = res.content.match(/(tproxy|redir|mixed|tun|rule|global)/i);
      if (modeMatch) {
        mode = modeMatch[0].toLowerCase();
      }
    }

    const msg = `
      Open Clash 重启成功<br/>
      Clash运行模式：${mode}
    `;
    createToast(msg, 'green', 3000);
    await isMMRunning();
    if (typeof refreshUI === 'function') await refreshUI();
  } catch (e) {
    createToast('❌ Open Clash 重启异常: ' + e.message, 'red');
  }
};

const stopAction = async () => {
  if (!(await checkAdvanceFunc())) {
    createToast('没有开启高级功能，无法使用！', 'red');
    return;
  }
  createToast('⏳ Open Clash 内核停止中...', 'yellow');
  await runShellWithRoot(`
    /data/clash/Scripts/Clash.Service stop
    sleep 1
  `);
  await new Promise(r => setTimeout(r, 2000));
  const running = await isMMRunning();
  if (running) {
    createToast('❌ Open Clash 停止失败！', 'red');
    return;
  }
  createToast('✅ Open Clash 已停止', 'green');
  await isMMRunning();
  if (typeof refreshUI === 'function') await refreshUI();
};

const stopBtn = createButtonWithConfirm(
  '停止',
  '⏹️',
  { bg: 'rgba(220,53,69,.12)', border: 'rgba(220,53,69,.2)', text: '#dc3545' },
  stopAction,
  'mm_stop_btn'
);

  const uploadEl = document.createElement('input');
  uploadEl.type = 'file';
  uploadEl.onchange = async (e) => {
    if (!e?.target?.files) return;
    const file = e.target.files[0];
    if (file) {
      if (!(await checkAdvanceFunc())) {
        createToast('没有开启高级功能，无法使用！', 'red');
        return;
      }
      if (!(await checkIsInstalled())) {
        createToast('没有安装Open Clash，请先安装！', 'red');
        return;
      }
      await runShellWithRoot(`
                        rm /data/data/com.minikano.f50_sms/files/uploads/clash_config.yml
                    `);
      if (file.size > 1 * 1024 * 1024) {
        createToast(`文件大小不能超过${1}MB！`, 'red');
      } else {
        try {
          await saveConfig(file);
        } finally {
          uploadEl.value = '';
        }
      }
    }
  };

  const editBtn = document.createElement('button');
  editBtn.classList.add('btn');
  editBtn.textContent = '编辑配置';
  editBtn.onclick = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    if (!(await checkIsInstalled())) {
      createToast('没有安装Open Clash，请先安装！', 'red');
      return;
    }
    const res = await runShellWithRoot(`
        timeout 5s  awk '{print}' /data/clash/Proxy/config.yaml
        `);
    if (!res.success) return createToast('备份失败！', 'red');

    const { el, close } = createFixedToast(
      'kano_eidt_mm_message',
      `
                <div style="pointer-events:all;width:80vw;max-width:800px;">
                    <div class="title" style="margin:0" data-i18n="system_notice">编辑 YAML</div>
                    <div style="margin:10px 0" class="inner"></div>
                    <div style="text-align:right">
                        <button style="font-size:.64rem" id="save_eidt_mm_message_btn" data-i18n="plugin_modal_submit_btn">${t('plugin_modal_submit_btn')}</button>
                        <button style="font-size:.64rem" id="close_eidt_mm_message_btn" data-i18n="close_btn">${t('close_btn')}</button>
                    </div>
                </div>
                `,
    );

    const textarea = document.createElement('textarea');
    textarea.style.width = '100%';
    textarea.style.height = '500px';
    textarea.style.maxHeight = '60vh';
    textarea.style.border = 'none';
    textarea.style.background = '#000000cc';
    textarea.style.color = '#0f0';
    textarea.style.boxSizing = 'border-box';
    textarea.style.fontFamily = '"PingFang SC", "Microsoft YaHei", sans-serif';
    textarea.style.lineHeight = '1.4';
    textarea.value = res.content;
    el.querySelector('.inner').appendChild(textarea);
    const btn = el.querySelector('#close_eidt_mm_message_btn');
    const sbtn = el.querySelector('#save_eidt_mm_message_btn');
    if (!btn) {
      close();
      return;
    }
    btn.onclick = async () => {
      close();
    };
    sbtn.onclick = async () => {
      const v = textarea.value;
      if (!v || v.trim().length == 0) {
        return createToast('配置不能为空！', 'red');
      }
      createToast('正在保存...', '');
      const file = new File([v], 'config.yaml', { type: 'text/plain' });
      if (!(await saveConfig(file))) {
        return;
      }
      close();
    };
  };

  const uploadBtn = document.createElement('button');
  uploadBtn.classList.add('btn');
  uploadBtn.textContent = '上传配置';
  uploadBtn.onclick = async () => {
    if (!(await checkIsInstalled())) {
      createToast('没有安装Open Clash，请先安装！', 'red');
      return;
    }
    uploadEl.click();
  };

  const backupBtn = document.createElement('button');
  backupBtn.classList.add('btn');
  backupBtn.textContent = '备份配置';
  backupBtn.onclick = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    if (!(await checkIsInstalled())) {
      createToast('没有安装Open Clash，请先安装！', 'red');
      return;
    }
    createToast('备份Open Clash配置中...', 'green');
    const t = Math.floor(Date.now() + Math.random());
    const res = await runShellWithRoot(`
        rm -f /data/data/com.minikano.f50_sms/files/uploads/mm_config_backup*
        sleep 1
        cp /data/clash/Proxy/config.yaml /data/data/com.minikano.f50_sms/files/uploads/mm_config_backup_${t}.yaml
        chmod 777 /data/data/com.minikano.f50_sms/files/uploads/mm_config_backup_${t}.yaml
        `);
    if (!res.success) return createToast('备份失败！', 'red');
    const a = document.createElement('a');
    a.download = `Open Clash配置备份_config_${t}.yaml`;
    a.href = `/api/uploads/mm_config_backup_${t}.yaml`;
    a.target = '_blank';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const importSub = async () => {
    const { el, close } = createFixedToast(
      'mm_sub_input_toast',
      `
            <div style="pointer-events:all;width:80vw;max-width:800px;">
                <div class="title" style="margin:0">订阅链接</div>
                <div style="margin:20px 0;display: flex;flex-direction: column;gap: 10px;">
                    <input id="mm_sub_url1_input" type="text" placeholder="请输入你的订阅链接1" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:4px;outline:none;">
                    <input id="mm_sub_url2_input" type="text" placeholder="请输入你的订阅链接2(可选)" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:4px;outline:none;">
                    <input id="mm_sub_url3_input" type="text" placeholder="请输入你的订阅链接3(可选)" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:4px;outline:none;">
                </div>
                <div style="text-align:right">
                    <button style="font-size:.64rem" id="mm_sub_submit_btn">提交</button>
                    <button style="font-size:.64rem" id="mm_sub_close_btn">关闭</button>
                </div>
            </div>
        `,
    );

    const url1Input = el.querySelector('#mm_sub_url1_input');
    const url2Input = el.querySelector('#mm_sub_url2_input');
    const url3Input = el.querySelector('#mm_sub_url3_input');

    el.querySelector('#mm_sub_close_btn').onclick = close;
    el.querySelector('#mm_sub_submit_btn').onclick = async () => {
      const url1 = url1Input.value.trim();
      const url2 = url2Input.value.trim();
      const url3 = url3Input.value.trim();

      if (!url1) {
        createToast('请至少输入订阅链接1！！', 'red');
        return;
      }

      // 立即关闭弹窗
      close();

      createToast('正在处理订阅...', 'yellow');

      try {
        let res = `${url1}`;
        if (url2) {
          res = `${url1} ${url2}\nprovider1 provider2`;
        }
        if (url3) {
          res = `${url1} ${url2} ${url3}\nprovider1 provider2 provider3`;
        }
        const file = new File([res], 'config.yaml', { type: 'text/plain' });
        const success = await saveConfig(file);

        if (success) {
          createToast('订阅保存成功，正在重启...', 'green');
        }
      } catch (e) {
        createToast('处理订阅失败: ' + e, 'red');
      }
    };
  };

  const subBtn = document.createElement('button');
  subBtn.classList.add('btn');
  subBtn.textContent = '订阅链接';
  subBtn.onclick = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    if (!(await checkIsInstalled())) {
      createToast('没有安装Open Clash，请先安装！', 'red');
      return;
    }
    importSub();
  };

  const showLogBtn = document.createElement('button');
  showLogBtn.textContent = '▶ 查看日志';
  showLogBtn.onclick = async () => {
    if (!checkAdvanceFunc()) {
      return createToast('没有开启高级功能，无法使用！');
    }
    const container = document.getElementById('mm_log_container');
    const contentEl = document.getElementById('mm_log_content');
    if (!container || !contentEl) return;
    if (container.style.display === 'none') {
      const r = await runShellWithRoot(`[ -f /sdcard/Clash内核日志.txt ] && timeout 2s awk '{print}' /sdcard/Clash内核日志.txt | tail -n 200 || echo "暂无日志"`);
      contentEl.textContent = r.success ? r.content : '暂无日志';
      container.style.display = 'block';
      showLogBtn.textContent = '▼ 查看日志';
    } else {
      container.style.display = 'none';
      showLogBtn.textContent = '▶ 查看日志';
    }
  };

  const manualUpdateKernel = () => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '*/*';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = async (e) => {
        if (!e.target || !e.target.files || e.target.files.length === 0) {
          document.body.removeChild(input);
          reject('未选择文件');
          return;
        }
        const file = e.target.files[0];
        if (!(await isELF(file))) {
          createToast('只能上传内核二进制文件!', 'red');
          document.body.removeChild(input);
          reject('文件格式错误');
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          createToast(`文件大小不能超过50MB！`, 'red');
          document.body.removeChild(input);
          reject('文件过大');
          return;
        }

        const { close } = createFixedToast('manual_update_toast', '⏳ 上传内核中...');

        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await (
            await fetch(`${KANO_baseURL}/upload_img`, {
              method: 'POST',
              headers: common_headers,
              body: formData,
            })
          ).json();

          if (!res.url) throw new Error(res.error || '上传失败');

          const found = await runShellWithRoot(`ls /data/data/com.minikano.f50_sms/files/${res.url}`);
          if (!found.content) throw new Error('上传文件未找到');

          createToast('上传成功，正在停止内核...', '');
          await runShellWithRoot('/data/clash/Scripts/Clash.Service stop');
          const moveRes = await runShellWithRoot(`
            rm -f /data/clash/Proxy/Clash.Core
            mv /data/data/com.minikano.f50_sms/files/${res.url} /data/clash/Proxy/Clash.Core
            chmod 755 /data/clash/Proxy/Clash.Core
          `);
          if (!moveRes.success) throw new Error('替换内核文件失败');

          createToast('内核替换完成，正在重启...', 'green');
          await runShellWithRoot('/data/clash/Scripts/Clash.Service start');
          createToast('✅ 手动更新成功！', 'green');
          close();
          resolve();
        } catch (err) {
          createToast('手动更新失败: ' + err.message, 'red');
          close();
          reject(err);
        } finally {
        document.body.removeChild(input);
        if (typeof refreshUI === 'function') await refreshUI();
      }
      };

      input.click();
    });
  };

  const compareVersions = (v1, v2) => {
    const parts1 = v1.replace(/^v/, '').split('.').map(Number);
    const parts2 = v2.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const a = parts1[i] || 0;
      const b = parts2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  };

  const getVersion = async () => {
    const res = await runShellWithRoot('/data/clash/Proxy/Clash.Core -v 2>/dev/null | head -1');
    if (res.success && res.content) {
        const line = res.content.trim();
        const match = line.match(/v\d+\.\d+\.\d+/);
        return match ? match[0] : line;
    }
    return '-';
};

  const checkForUpdate = async () => {
  if (!(await checkAdvanceFunc())) return createToast('需要开启高级功能', 'red');
  if (!(await checkIsInstalled())) return createToast('请先安装 Open Clash', 'red');

  const currentVer = await getVersion();

const archRes = await runShellWithRoot('uname -m');
let arch = archRes.content.trim();

const bitRes = await runShellWithRoot('getconf LONG_BIT 2>/dev/null || echo 32');
const bits = bitRes.content.trim();
if (bits === '64') {
    if (arch === 'aarch64' || arch === 'arm64' || arch === 'armv8l' || arch === 'arm64-v8a') {
        arch = 'arm64';
    } else if (arch === 'x86_64' || arch === 'amd64') {
        arch = 'amd64';
    } else {
        arch = 'arm64';
    }
} else {
    if (arch === 'armv7l' || arch === 'armhf' || arch === 'armv8l' || arch === 'arm') {
        arch = 'armv7';
    } else if (arch === 'i386' || arch === 'i686' || arch === 'x86') {
        arch = '386';
    } else {
        arch = 'armv7';
    }
}

const osRes = await runShellWithRoot('uname -s');
const os = osRes.content.trim() || 'Linux';
const fullCurrentVer = `${os}-${arch}-${currentVer}`;

  if (currentVer === '-') return createToast('无法获取当前内核版本，请检查是否已安装', 'red');

  createToast('正在检查更新...', 'yellow');

  try {
    const apiUrl = 'https://api.github.com/repos/MetaCubeX/mihomo/releases/latest';
    const apiRes = await runShellWithRoot(`curl -s --connect-timeout 10 --max-time 15 "${apiUrl}"`, 25 * 1000);
    if (!apiRes.success || !apiRes.content) {
      createToast('获取最新版本失败，请检查网络', 'red');
      return;
    }

    let latestVer = '';
    try {
      const json = JSON.parse(apiRes.content);
      latestVer = json.tag_name || '';
    } catch (e) {
      const grepRes = await runShellWithRoot(`echo '${apiRes.content}' | grep -o '"tag_name":"[^"]*"' | cut -d '"' -f 4`, 10 * 1000);
      if (grepRes.success && grepRes.content) {
        latestVer = grepRes.content.trim();
      }
    }

    if (!latestVer || !latestVer.startsWith('v')) {
      createToast('无法解析版本号，请检查网络', 'red');
      return;
    }

    const hasUpdate = compareVersions(latestVer, currentVer) > 0;

    let fileName = '';
if (arch === 'arm64') {
    fileName = `mihomo-linux-arm64-${latestVer}.gz`;
} else if (arch === 'armv7') {
    fileName = `mihomo-linux-armv7-${latestVer}.gz`;
} else if (arch === 'amd64') {
    fileName = `mihomo-linux-amd64-${latestVer}.gz`;
} else {
    fileName = `mihomo-${arch}-${latestVer}.gz`;
}

    let updateButtonsHtml = '';
    if (hasUpdate) {
      updateButtonsHtml = `
<button id="mm_update_do" style="padding:4px 12px;background:var(--dark-btn-color-active);border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:.7rem;">📥 下载并更新</button>
<button id="mm_update_manual_btn" style="padding:4px 12px;background:rgba(255,193,7,0.2);border:1px solid rgba(255,193,7,0.3);border-radius:6px;color:#ffc107;cursor:pointer;font-size:.7rem;">📁 手动更新</button>
`;
    }

    const { el, close } = createFixedToast(
      'mm_update_dialog',
      `
      <div style="pointer-events:all;width:80vw;max-width:700px;border-radius:8px;padding:16px;">
        <div class="title" style="margin:0;text-align:center;color:rgba(255,255,255,.9);">🔄 内核更新检查</div>
        <div style="margin:12px 0 8px 0;padding:10px 14px;border-radius:6px;font-size:.75rem;line-height:2.2;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:nowrap;">
            <span style="color:rgba(255,255,255,.7);white-space:nowrap;">📌 当前版本</span>
            <strong style="color:#4a9eff;white-space:nowrap;">${fullCurrentVer}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:nowrap;">
            <span style="color:rgba(255,255,255,.7);white-space:nowrap;">📌 最新版本</span>
            <span style="white-space:nowrap;font-size:.7rem;">
              <span style="color:rgba(255,255,255,.5);font-family:monospace;font-size:.6rem;">${fileName}</span>
              <strong style="color:#22c55e;margin-left:6px;font-size:.75rem;">${latestVer}</strong>
            </span>
          </div>
          <div style="border-top:1px solid rgba(255,255,255,.08);margin:6px 0 4px 0;text-align:center;font-size:.7rem;color:${hasUpdate ? '#22c55e' : 'rgba(255,255,255,.5)'};">
            ${hasUpdate ? '✅ 发现新版本！' : '✅ 已是最新版本'}
          </div>
        </div>
        <div style="text-align:center;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          ${updateButtonsHtml}
          <button id="mm_update_close" style="padding:6px 16px;background:#555;border:none;border-radius:4px;color:#fff;cursor:pointer;">关闭</button>
        </div>
        <div id="mm_update_status" style="margin-top:10px;font-size:.7rem;color:#ffaa00;text-align:center;"></div>
      </div>
      `
    );

    if (hasUpdate) {
      const manualBtn = el.querySelector('#mm_update_manual_btn');
      if (manualBtn) {
        manualBtn.onclick = async () => {
          close();
          await manualUpdateKernel();
        };
      }

      const doBtn = el.querySelector('#mm_update_do');
      if (doBtn) {
        doBtn.onclick = async () => {
          const statusEl = el.querySelector('#mm_update_status');
          const tempFile = `/data/kano_mihomo_update.gz`;
          const targetFile = `/data/clash/Proxy/Clash.Core`;
          const progressFile = `/data/kano_mihomo_progress.txt`;
          const pidFile = `/data/kano_mihomo_download.pid`;
          let shouldCancel = false;
          let cancelBtn = null;
          let downloadFinished = false;
          let waitCount = 0;
          const maxWait = 130;
          let cleanedUp = false;

          function formatSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
          }

          const cleanup = async () => {
            if (cleanedUp) return true;
            cleanedUp = true;
            try {
              const pidRes = await runShellWithRoot(`cat ${pidFile} 2>/dev/null`);
              const pid = pidRes.content.trim();
              if (pid) {
                await runShellWithRoot(`kill -9 ${pid} 2>/dev/null`);
              }
              await runShellWithRoot(`rm -f ${tempFile} ${progressFile} ${pidFile}`);
              const checkRes = await runShellWithRoot(`ls ${tempFile} 2>/dev/null || echo "NOT_EXIST"`);
              return checkRes.content && checkRes.content.includes('NOT_EXIST');
            } catch (e) {
              return false;
            }
          };

          try {
            const downloadUrl = `https://ghproxy.net/https://github.com/MetaCubeX/mihomo/releases/download/${latestVer}/${fileName}`;

            const infoEl = document.createElement('div');
            infoEl.style.cssText = 'font-size:.7rem; color:rgba(255,255,255,.8); margin-bottom:6px; text-align:center;';
            infoEl.textContent = `📦 内核版本：${latestVer} | 文件：${fileName}`;
            statusEl.parentNode.insertBefore(infoEl, statusEl);

            statusEl.textContent = '⏳ 正在获取文件大小...';
            const headRes = await runShellWithRoot(
              `curl -I -s "${downloadUrl}" | grep -i Content-Length | awk '{print $2}' | tr -d '\r'`
            );
            let totalSize = parseInt(headRes.content.trim(), 10);
            let usePercent = false;
            if (!isNaN(totalSize) && totalSize > 0) {
              usePercent = true;
              statusEl.textContent = `⏳ 准备下载 (${formatSize(totalSize)})`;
            } else {
              statusEl.textContent = '⏳ 正在下载最新内核...';
              usePercent = false;
            }

            await runShellWithRoot(`rm -f ${tempFile} ${progressFile} ${pidFile}`);

            const btnContainer = document.createElement('div');
            btnContainer.style.textAlign = 'center';
            btnContainer.style.marginTop = '8px';
            cancelBtn = document.createElement('button');
            cancelBtn.textContent = '⛔ 终止下载';
            cancelBtn.style.cssText = `
              padding:4px 16px;
              background:rgba(220,53,69,0.2);
              border:1px solid #dc3545;
              border-radius:6px;
              color:#dc3545;
              cursor:pointer;
              font-size:.7rem;
            `;
            cancelBtn.onclick = async () => {
              const confirm = await askConfirm(
                'cancel_download_confirm',
                '⚠️ 确认取消下载',
                '确定要取消当前下载吗？已下载的部分将被删除。',
                '确认取消',
                '继续下载'
              );
              if (!confirm) return;

              shouldCancel = true;
              cancelBtn.disabled = true;
              cancelBtn.textContent = '⏳ 正在终止...';
              createToast('正在终止下载...', 'yellow');

              const success = await cleanup();
              if (success) {
                statusEl.textContent = '⛔ 下载已取消，临时文件已清理';
                createToast('已取消下载，临时文件已删除', 'green');
              } else {
                statusEl.textContent = '⛔ 下载已取消，但清理临时文件失败';
                createToast('下载已取消，但清理临时文件失败，请手动删除', 'red');
              }
              if (btnContainer && btnContainer.parentNode) btnContainer.parentNode.removeChild(btnContainer);
              downloadFinished = true;
            };
            btnContainer.appendChild(cancelBtn);
            const parent = statusEl.parentNode;
            parent.insertBefore(btnContainer, statusEl.nextSibling);

            let curlCmd = `curl -o ${tempFile} "${downloadUrl}" && echo "DOWNLOAD_OK" >> ${progressFile} &`;
            runShellWithRoot(
              `{ ${curlCmd} } & echo $! > ${pidFile}`,
              130 * 1000
            );
            await new Promise(r => setTimeout(r, 500));

            while (!downloadFinished && waitCount < maxWait && !shouldCancel) {
              await new Promise(r => setTimeout(r, 500));
              waitCount++;

              const checkRes = await runShellWithRoot(`grep -q 'DOWNLOAD_OK' ${progressFile} && echo "FOUND"`);
              if (checkRes.content && checkRes.content.includes('FOUND')) {
                downloadFinished = true;
                break;
              }

              if (usePercent) {
                const sizeRes = await runShellWithRoot(`stat -c %s ${tempFile} 2>/dev/null || echo 0`);
                const currentSize = parseInt(sizeRes.content.trim(), 10) || 0;
                const sizeStr = `<span style="color:#22c55e;">${formatSize(currentSize)}</span> / <span style="color:rgba(255,255,255,.6);">${formatSize(totalSize)}</span>`;
                statusEl.innerHTML = `⏳ 正在下载最新内核... ${sizeStr}`;
              } else {
                const dots = '.'.repeat((waitCount % 4) + 1);
                statusEl.textContent = `⏳ 正在下载最新内核${dots}`;
              }
            }

            if (shouldCancel) {
              if (!cleanedUp) await cleanup();
              statusEl.textContent = '⛔ 下载已取消';
              if (btnContainer && btnContainer.parentNode) btnContainer.parentNode.removeChild(btnContainer);
              return;
            }

            if (!downloadFinished) {
              await runShellWithRoot(`pkill -f "curl.*${tempFile}" 2>/dev/null`);
              await runShellWithRoot(`rm -f ${tempFile} ${progressFile} ${pidFile}`);
              statusEl.textContent = '❌ 下载超时，请检查网络后重试';
              throw new Error('下载超时');
            }

            if (btnContainer && btnContainer.parentNode) btnContainer.parentNode.removeChild(btnContainer);

            statusEl.textContent = '📦 下载完成，正在解压...';
            await runShellWithRoot('/data/clash/Scripts/Clash.Service stop');
            const unzipRes = await runShellWithRoot(
              `gunzip -c ${tempFile} > ${targetFile} && chmod 755 ${targetFile} && rm -f ${tempFile} ${progressFile} ${pidFile} && echo "UPDATE_OK"`
            );
            if (!unzipRes.success || !unzipRes.content.includes('UPDATE_OK')) {
              throw new Error('解压或替换内核失败');
            }

            statusEl.textContent = '✅ 更新成功！正在重启...';
            await runShellWithRoot('/data/clash/Scripts/Clash.Service start');
            createToast('内核更新完成，已重启服务', 'green');
            if (typeof refreshUI === 'function') await refreshUI();
            close();
          } catch (e) {
            await runShellWithRoot(`rm -f ${tempFile} ${progressFile} ${pidFile}`);
            statusEl.textContent = '❌ 更新失败: ' + e.message;
            createToast('更新失败: ' + e.message, 'red');
            if (cancelBtn && cancelBtn.parentNode && cancelBtn.parentNode.parentNode) {
              const container = cancelBtn.parentNode;
              if (container.parentNode) container.parentNode.removeChild(container);
            }
          }
        };
      }
    }

    el.querySelector('#mm_update_close').onclick = close;
  } catch (e) {
    createToast('检查更新失败: ' + e.message, 'red');
  }
};

  let refreshUI = null;

  (async () => {
    const wait = (sec = 100) =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve();
        }, sec);
      });
    const mmContainer = document.querySelector('.functions-container');
    while (!UFI_DATA.lan_ipaddr) {
      await wait();
    }

    const colors = {
      install: { bg: 'rgba(52,152,219,.12)', border: 'rgba(52,152,219,.2)', text: '#5dade2' },
      uninstall: { bg: 'rgba(220,53,69,.12)', border: 'rgba(220,53,69,.2)', text: '#dc3545' },
      start: { bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.2)', text: '#22c55e' },
      stop: { bg: 'rgba(220,53,69,.12)', border: 'rgba(220,53,69,.2)', text: '#dc3545' },
      restart: { bg: 'rgba(255,193,7,.12)', border: 'rgba(255,193,7,.2)', text: '#ffc107' },
      boot: { bg: 'rgba(168,85,247,.12)', border: 'rgba(168,85,247,.2)', text: '#a855f7' },
      normal: { bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.1)', text: 'rgba(255,255,255,.7)' },
    };

    const createStyledButton = (text, icon, color, onClick, id = null) => {
      const btn = document.createElement('button');
      btn.innerHTML = `${icon} ${text}`;
      btn.classList.add('btn');
      btn.style.cssText =
        `background:${color.bg}; border-color:${color.border}; color:${color.text}; padding:4px 12px; font-size:.7rem; border-radius:6px;`;
      btn.onclick = onClick;
      if (id) btn.id = id;
      return btn;
    };

    mmContainer.insertAdjacentHTML(
      'afterend',
      `
<div id="IFRAME_KANO" style="width:100%; margin-top:10px;">
    <div class="title" style="margin: 6px 0 ; display:flex; align-items:center; gap:8px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="85.386 -46.166 1135.58 1078.379" width="24" height="24" style="flex-shrink:0;">
          <path d="M1182.669 996.74c-89.557-1013.476-160.11-1042.906-160.11-1042.906-66.363 16.177-138.476 190.71-138.476 190.71-51.843-24.46-145.103-19.1-145.103-19.1s-93.259-5.36-145.102 19.1c0 0-72.113-174.533-138.476-190.71 0 0-68.02 28.456-155.335 989.796l-15.105-.292h-29.332c-2.436-.097-7.016-.585-10.72-1.267-3.897-.78-7.893-1.462-11.693-2.631-31.574-8.088-57.203-28.65-69.384-58.372-2.047-3.411-2.827-7.601-4.288-11.402-1.365-3.898-3.021-7.601-3.703-11.596l-3.021-11.792c-.585-3.898-.78-7.796-1.267-11.694-1.267-15.69.195-31.768 5.944-45.801 5.652-14.033 15.008-26.994 27.968-37.616 6.432-5.262 13.351-10.33 20.855-14.617 3.8-2.047 7.6-4.19 11.596-5.945 3.8-1.851 8.38-3.605 11.207-4.677l2.63-1.072c9.161-3.606 14.813-13.35 12.864-23.388a20.776 20.776 0 0 0 -24.46-16.372c-6.821 1.365-11.888 2.534-17.54 4.288-5.555 1.657-10.817 3.703-16.08 5.847-10.524 4.385-20.854 9.745-30.599 16.372-19.49 13.058-37.128 31.379-48.432 53.89-22.121 45.508-19.49 98.229.78 141.107 9.94 21.926 25.823 42 44.729 57.787 18.905 15.982 41.22 26.994 64.316 33.328 5.75 1.754 11.694 2.826 17.639 3.898 6.237.974 12.668 2.923 20.172 3.41 9.94.683 39.467 3.899 39.467 3.899 18.808 1.266 35.764 5.36 54.182 7.016 55.546 7.893 167.126 15.007 390.286 13.935 481.888 2.34 443.59-33.133 443.59-33.133zm-641.901-549.03c-27.481 0-49.797-22.317-49.797-49.798s22.316-49.796 49.797-49.796c27.48 0 49.797 22.316 49.797 49.796s-22.316 49.797-49.797 49.797zm267.304 116.646h-48.335a4.58 4.58 0 0 1 -3.41-1.461l-17.347-17.346-17.346 17.346a4.97 4.97 0 0 1 -3.41 1.461h-48.335v-9.745h46.288l18.418-18.418c.877-1.656 2.631-2.338 4.483-2.338 1.559 0 3.118.584 4.093 1.949l18.807 18.807h46.289v9.745zm129.12-116.647c-27.48 0-49.796-22.316-49.796-49.797s22.316-49.796 49.797-49.796 49.797 22.316 49.797 49.796-22.316 49.797-49.797 49.797z" fill="#193762"/>
          <path d="M490.971 397.912a49.797 49.797 0 1 0 99.594 0 49.797 49.797 0 1 0 -99.594 0zm396.425 0a49.797 49.797 0 1 0 99.594 0 49.797 49.797 0 1 0 -99.594 0zm-152.898 138.379-18.418 18.418h-46.29v9.745h48.335c1.267 0 2.534-.487 3.41-1.462l17.347-17.346v-11.694c-1.754-.097-3.606.682-4.385 2.339zm21.828 26.701c.877.877 2.144 1.462 3.411 1.462h48.335v-9.745h-46.288l-18.808-18.809c-.877-1.364-2.534-1.949-4.093-1.949v11.694z" fill="#fff"/>
        </svg>
        <strong>OpenClash</strong>
        <div style="display:inline-block;" id="collapse_mm_btn"></div>
    </div>
    <div class="collapse" id="collapse_mm" data-name="close" style="height:0; overflow:hidden;">
        <div class="collapse_box">
            <div style="display:flex; align-items:center; gap:12px; padding:4px 0 10px 0; flex-wrap:wrap; font-size:.6rem; color:rgba(255,255,255,.4);">
                <span>状态: <span id="mm_status_text" style="color:rgba(255,255,255,.7);">检查中...</span> <span id="mm_status_dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#888; box-shadow:0 0 8px rgba(136,136,136,.3);"></span></span>
                <span>PID: <strong id="mm_pid" style="color:rgba(255,255,255,.6);">-</strong></span>
                <span>端口: <strong id="mm_port" style="color:rgba(255,255,255,.6);">7788</strong></span>
                <span>内核: <strong id="mm_version" style="color:rgba(255,255,255,.6);">-</strong></span>
            </div>

            <div id="mm_main_buttons" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;"></div>

            <div id="mm_config_group">
                <span style="font-size:.55rem; color:rgba(255,255,255,.2); width:100%; margin-top:4px; display:block;">⚙️ 配置</span>
                <div id="mm_config_buttons" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;"></div>
            </div>

            <div id="mm_panel_group">
                <span style="font-size:.55rem; color:rgba(255,255,255,.2); width:100%; margin-top:4px; display:block;">🖥️ 面板</span>
                <div id="mm_panel_buttons" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;"></div>
            </div>

          <div id="mm_log_container" style="display:none;margin-top:8px;border:1px solid rgba(255,255,255,.06);border-radius:10px;background:rgba(0,0,0,.45);overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 10px;border-bottom:1px solid rgba(255,255,255,.06);">
                <span style="font-size:.55rem;color:rgba(255,255,255,.4);">📋 Open Clash 日志</span>
                <div style="display:flex;gap:8px;">
                  <button id="mm_log_clear_btn" style="background:transparent;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:.5rem;padding:2px 6px;border-radius:4px;transition:all .15s;" onmouseover="this.style.color='#fca5a5'" onmouseout="this.style.color='rgba(255,255,255,.3)'">清空</button>
                  <button id="mm_log_copy_btn" style="background:transparent;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:.5rem;padding:2px 6px;border-radius:4px;transition:all .15s;" onmouseover="this.style.color='#86efac'" onmouseout="this.style.color='rgba(255,255,255,.3)'">复制</button>
                </div>
              </div>
              <div id="mm_log_content" style="height:120px;overflow-y:auto;padding:8px 10px;font-size:.56rem;line-height:1.7;font-family:'SF Mono',Menlo,Consolas,monospace;color:#86efac;white-space:pre-wrap;word-break:break-all;"></div>
            </div>

            <ul id="mm_iframe_container" class="deviceList" style="margin:0; display:none;">
                <li style="padding:0; border-radius:8px; overflow:hidden;">
                    <iframe id="mm_iframe" src="javascript:;" style="border:none; padding:0; margin:0; width:100%; height:420px; border-radius:8px; background:rgba(0,0,0,.2); opacity:.7; transition:opacity .3s;" onload="this.style.opacity='1'"></iframe>
                </li>
            </ul>
        </div>
    </div>
</div>
`
    );

    const mainBtns = document.querySelector('#mm_main_buttons');
    const configBtns = document.querySelector('#mm_config_buttons');
    const panelBtns = document.querySelector('#mm_panel_buttons');
    const iframe = document.querySelector('#mm_iframe');

    const installBtn = createStyledButton('安装', '📥', colors.install, () => btn_enabled.click(), 'mm_install_btn');
    mainBtns.appendChild(installBtn);

    const uninstallBtn = createStyledButton('卸载', '🗑️', colors.uninstall, () => btn_disabled.click(), 'mm_uninstall_btn');
    uninstallBtn.style.display = 'none';
    mainBtns.appendChild(uninstallBtn);

 const startBtn = createStyledButton('启动', '▶️', colors.start, () => {
  (async () => {
    if (!(await checkAdvanceFunc())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    if (!(await checkIsInstalled())) {
      createToast('没有安装Open Clash，请先安装！', 'red');
      return;
    }
    if (await isMMRunning()) {
      createToast('⚠️ 已运行', 'yellow');
      return;
    }
    createToast('⏳ Open Clash 内核启动中...', 'yellow');
    const res = await runShellWithRoot('/data/clash/Scripts/Clash.Service start');
if (await isMMRunning()) {
      createToast('✅ Open Clash 已启动', 'green');
      await refreshUI();
    } else {
      createToast('❌ Open Clash 启动失败', 'red');
    }
  })();
}, 'mm_start_btn');
    startBtn.style.display = 'none';
    mainBtns.appendChild(startBtn);

    const stopBtnUI = createStyledButton('停止', '⏹️', colors.stop, () => stopBtn.click(), 'mm_stop_btn');
    stopBtnUI.style.display = 'none';
    mainBtns.appendChild(stopBtnUI);

    const restartBtnUI = createStyledButton('重启', '🔄', colors.restart, () => btn_restart.click(), 'mm_restart_btn');
    restartBtnUI.style.display = 'none';
    mainBtns.appendChild(restartBtnUI);

    const bootBtn = createStyledButton('自启', '⏳', colors.boot, async () => {
      if (!(await checkAdvanceFunc())) {
        createToast('没有开启高级功能，无法使用！', 'red');
        return;
      }
      if (!(await checkIsInstalled())) {
        createToast('没有安装Open Clash，请先安装！', 'red');
        return;
      }
      const isBootUp = await checkIsBootUp();
      if (isBootUp) {
        await runShellWithRoot(`
                sed -i '/Clash.Service/d' /sdcard/ufi_tools_boot.sh
                sed -i '/Clash.Inotify/d' /sdcard/ufi_tools_boot.sh
            `);
        bootBtn.style.background = '';
        createToast('已取消开机自启', 'green');
      } else {
        await runShellWithRoot(`
                grep -qxF '/data/clash/Scripts/Clash.Service start' /sdcard/ufi_tools_boot.sh || echo '/data/clash/Scripts/Clash.Service start' >> /sdcard/ufi_tools_boot.sh
                grep -qxF 'inotifyd /data/clash/Scripts/Clash.Inotify "/data/clash/Clash" >> /dev/null &' /sdcard/ufi_tools_boot.sh || echo 'inotifyd /data/clash/Scripts/Clash.Inotify "/data/clash/Clash" >> /dev/null &' >> /sdcard/ufi_tools_boot.sh
            `);
        bootBtn.style.background = 'var(--dark-btn-color-active)';
        createToast('已设置开机自启', 'green');
      }
      await refreshUI();
    }, 'clash_boot_on');
    bootBtn.style.display = 'none';
    mainBtns.appendChild(bootBtn);

    const editBtnUI = createStyledButton('编辑配置', '✏️', colors.normal, () => editBtn.click());
    configBtns.appendChild(editBtnUI);

    const subBtnUI = createStyledButton('订阅链接', '📡', colors.normal, () => subBtn.click());
    configBtns.appendChild(subBtnUI);

    const convertBtn = createStyledButton('链接转换', '🔄', colors.normal, () => {
      window.open('https://sub-converter.geniucker.top', '_blank');
    });
    configBtns.appendChild(convertBtn);

    const uploadBtnUI = createStyledButton('上传配置', '📤', colors.normal, () => uploadBtn.click());
    configBtns.appendChild(uploadBtnUI);

    const backupBtnUI = createStyledButton('备份配置', '💾', colors.normal, () => backupBtn.click());
    configBtns.appendChild(backupBtnUI);

    const openBtn = createStyledButton('打开面板', '🔗', colors.normal, () => {
      const a = document.createElement('a');
      a.href = `http://${UFI_DATA.lan_ipaddr}:7788/ui/?t=` + Date.now();
      a.target = '_blank';
      a.click();
    });
    panelBtns.appendChild(openBtn);

    const refreshBtn = createStyledButton('刷新网页', '🔄', colors.normal, () => {
      if (iframe) {
        iframe.src = `http://${UFI_DATA.lan_ipaddr}:7788/ui/?secret=123456&t=${Date.now()}`;
        createToast('✅ 已刷新', 'green');
      }
    });
    panelBtns.appendChild(refreshBtn);

    const nodeListBtn = document.createElement('button');
    nodeListBtn.classList.add('btn');
    nodeListBtn.id = 'node_list_btn';
    nodeListBtn.textContent = '▶ 节点列表';
    nodeListBtn.style.cssText = `background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.7);padding:4px 12px;font-size:.7rem;border-radius:6px;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;min-width:60px;line-height:1.5;`;
    nodeListBtn.onclick = () => {
      const container = document.getElementById('mm_iframe_container');
      if (!container) return;
      if (container.style.display === 'none') {
        container.style.display = '';
        nodeListBtn.textContent = '▼ 节点列表';
        const iframe = document.getElementById('mm_iframe');
        if (iframe && (!iframe.src || iframe.src === 'javascript:;' || iframe.src.startsWith('javascript:'))) {
          iframe.src = `http://${UFI_DATA.lan_ipaddr}:7788/ui/?secret=123456&t=${Date.now()}`;
        } else if (iframe && iframe.src && iframe.src.startsWith('http')) {
          iframe.src = iframe.src.split('?')[0] + '?t=' + Date.now();
        }
      } else {
        container.style.display = 'none';
        nodeListBtn.textContent = '▶ 节点列表';
      }
    };
    panelBtns.appendChild(nodeListBtn);

    showLogBtn.classList.add('btn');
    showLogBtn.style.cssText = `background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.7);padding:4px 12px;font-size:.7rem;border-radius:6px;cursor:pointer;transition:all .15s;display:inline-flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;min-width:60px;line-height:1.5;`;
    panelBtns.appendChild(showLogBtn);

    document.getElementById('mm_log_clear_btn')?.addEventListener('click', async () => {
      await runShellWithRoot(`echo "" > /sdcard/Clash内核日志.txt`);
      const el = document.getElementById('mm_log_content');
      if (el) el.textContent = '日志已清空';
      createToast('日志已清空', 'green');
    });
    document.getElementById('mm_log_copy_btn')?.addEventListener('click', async () => {
      const el = document.getElementById('mm_log_content');
      if (!el) return;
      const text = el.textContent;
      if (!text || text === '暂无日志' || text === '日志已清空') {
        createToast('无内容可复制', 'yellow');
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        createToast('✅ 已复制', 'green');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        createToast('✅ 已复制', 'green');
      }
    });

    const updateBtn = createStyledButton('检查更新', '🔄', colors.normal, checkForUpdate);
    panelBtns.appendChild(updateBtn);

    const wikiBtn = createStyledButton('文档教程', '📖', colors.normal, () => {
      window.open('https://wiki.metacubex.one/config/', '_blank');
    });
    panelBtns.appendChild(wikiBtn);

    uploadEl.style.display = 'none';
    document.body.appendChild(uploadEl);

    const updateStatusUI = async () => {
      const running = await isMMRunning();
      const installed = await checkIsInstalled();
      const el = document.querySelector('#mm_status_text');
      const dot = document.querySelector('#mm_status_dot');

      if (!installed) {
        if (el) el.textContent = '未安装';
        if (dot) {
          dot.style.background = '#888';
          dot.style.boxShadow = '0 0 8px rgba(136,136,136,.3)';
        }
      } else if (running) {
        if (el) el.textContent = '运行中';
        if (dot) {
          dot.style.background = '#22c55e';
          dot.style.boxShadow = '0 0 12px rgba(34,197,94,.5)';
        }
      } else {
        if (el) el.textContent = '已停止';
        if (dot) {
          dot.style.background = '#ef4444';
          dot.style.boxShadow = '0 0 12px rgba(239,68,68,.4)';
        }
      }
      return running;
    };

    refreshUI = async () => {
      const installed = await checkIsInstalled();
      const running = await isMMRunning();

      const installBtn = document.getElementById('mm_install_btn');
      const uninstallBtn = document.getElementById('mm_uninstall_btn');
      const startBtn = document.getElementById('mm_start_btn');
      const stopBtn = document.getElementById('mm_stop_btn');
      const restartBtn = document.getElementById('mm_restart_btn');
      const bootBtn = document.getElementById('clash_boot_on');
     const nodeListBtn = document.getElementById('node_list_btn');
    if (nodeListBtn) {
      if (installed && running) {
        nodeListBtn.style.display = 'inline-flex';
      } else {
        nodeListBtn.style.display = 'none';
        const container = document.getElementById('mm_iframe_container');
        if (container) container.style.display = 'none';
      }
    }

      const configGroup = document.getElementById('mm_config_group');
      const panelGroup = document.getElementById('mm_panel_group');
      const iframeContainer = document.getElementById('mm_iframe_container');

      if (installBtn && uninstallBtn) {
        if (!installed) {
          installBtn.style.display = 'inline-flex';
          uninstallBtn.style.display = 'none';
        } else {
          installBtn.style.display = 'none';
          uninstallBtn.style.display = 'inline-flex';
        }
      }

      if (startBtn && stopBtn && restartBtn) {
        if (!installed) {
          startBtn.style.display = 'none';
          stopBtn.style.display = 'none';
          restartBtn.style.display = 'none';
        } else if (running) {
          startBtn.style.display = 'none';
          stopBtn.style.display = 'inline-flex';
          restartBtn.style.display = 'inline-flex';
        } else {
          startBtn.style.display = 'inline-flex';
          stopBtn.style.display = 'none';
          restartBtn.style.display = 'none';
        }
      }

      if (bootBtn) {
        if (!installed) {
          bootBtn.style.display = 'none';
        } else {
          bootBtn.style.display = 'inline-flex';
          const isBoot = await checkIsBootUp();
          bootBtn.innerHTML = isBoot ? '✅ 自启' : '⏳ 自启';
          bootBtn.style.backgroundColor = isBoot ? 'var(--dark-btn-color-active)' : '';
        }
      }

      if (configGroup) configGroup.style.display = installed ? '' : 'none';
      if (panelGroup) panelGroup.style.display = installed ? '' : 'none';

      if (iframeContainer && installed && running) {
        const iframe = document.getElementById('mm_iframe');
        if (iframe && iframeContainer.style.display !== 'none' && !iframe.src.startsWith('http')) {
          iframe.src = `http://${UFI_DATA.lan_ipaddr}:7788/ui/?secret=123456&t=${Date.now()}`;
        }
      } else if (iframeContainer && !running) {
        iframeContainer.style.display = 'none';
        const nodeListBtn = document.getElementById('node_list_btn');
        if (nodeListBtn) nodeListBtn.textContent = '▶ 节点列表';
      }

      await updateStatusUI();

      const pidEl = document.querySelector('#mm_pid');
      const versionEl = document.querySelector('#mm_version');

      if (installed) {
        const ver = await getVersion();
        if (versionEl) versionEl.textContent = ver;

let badgeEl = document.querySelector('#mm_version_badge');
    if (!badgeEl) {
        badgeEl = document.createElement('span');
        badgeEl.id = 'mm_version_badge';
        badgeEl.style.cssText = 'margin-left:8px;font-size:.65rem;cursor:pointer;display:none;';
        badgeEl.onclick = async () => {
    const updateBtn = document.querySelector('#mm_update_btn');
    if (updateBtn) {
        updateBtn.click();
    } else {
        if (typeof checkForUpdate === 'function') {
            try {
                await checkForUpdate();
            } catch (e) {
                console.error(e);
                createToast('检查更新失败，请手动操作', 'red');
            }
        } else {
            createToast('⚠️ 无法找到更新功能', 'yellow');
        }
    }
};
        versionEl.parentNode.insertBefore(badgeEl, versionEl.nextSibling);
    }
    const lastCheck = localStorage.getItem('mm_badge_check');
    const now = Date.now();
    let remoteVer = localStorage.getItem('mm_badge_remote_ver');
    const currentVer = ver;
    if (!lastCheck || (now - parseInt(lastCheck, 10)) > 12 * 60 * 60 * 1000) {
        try {
            const apiRes = await runShellWithRoot(
                `curl -s --connect-timeout 10 --max-time 15 "https://api.github.com/repos/MetaCubeX/mihomo/releases/latest"`,
                25 * 1000
            );
            if (apiRes.success && apiRes.content) {
                let latestVer = '';
                try {
                    const json = JSON.parse(apiRes.content);
                    latestVer = json.tag_name || '';
                } catch (e) {
                    const grepRes = await runShellWithRoot(
                        `echo '${apiRes.content}' | grep -o '"tag_name":"[^"]*"' | cut -d '"' -f 4`
                    );
                    if (grepRes.success && grepRes.content) latestVer = grepRes.content.trim();
                }
                if (latestVer && latestVer.startsWith('v')) {
                    remoteVer = latestVer;
                    localStorage.setItem('mm_badge_remote_ver', remoteVer);
                }
            }
        } catch (e) {}
        localStorage.setItem('mm_badge_check', String(now));
    }
    if (remoteVer && currentVer && remoteVer !== currentVer) {
        const clean = (v) => v.replace(/^v/, '').split('.').map(Number);
        const cv = clean(currentVer);
        const rv = clean(remoteVer);
        let hasUpdate = false;
        for (let i = 0; i < Math.max(cv.length, rv.length); i++) {
            const a = cv[i] || 0;
            const b = rv[i] || 0;
            if (b > a) { hasUpdate = true; break; }
            if (a > b) break;
        }
        if (hasUpdate) {
            badgeEl.style.display = 'inline';
            badgeEl.innerHTML = `<span class="status-dot green" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.5);margin-right:4px;vertical-align:middle;"></span> 更新${remoteVer}`;
badgeEl.style.color = '#22c55e';
        } else {
            badgeEl.style.display = 'none';
        }
    } else {
        badgeEl.style.display = 'none';
    }

        if (running) {
          const pidRes = await runShellWithRoot('pgrep Clash | head -1');
          if (pidRes.success && pidRes.content) {
            pidEl.textContent = pidRes.content.trim();
          } else {
            pidEl.textContent = '-';
          }
        } else {
          pidEl.textContent = '-';
        }
        const portEl = document.getElementById('mm_port');
        if (portEl) {
          const portRes = await runShellWithRoot(`grep -m1 'external-controller:' /data/clash/Proxy/config.yaml | awk '{print $2}' | cut -d':' -f2`);
          portEl.textContent = portRes.success && portRes.content ? portRes.content.trim() : '7788';
        }
      } else {
        if (versionEl) versionEl.textContent = '-';
        if (pidEl) pidEl.textContent = '-';
      }
    };

    await refreshUI();
    setInterval(refreshUI, 5000);
    setTimeout(refreshUI, 1000);

    if (typeof collapseGen === 'function') {
      collapseGen('#collapse_mm_btn', '#collapse_mm', '#collapse_mm', (e) => {
        if (e === 'open' && iframe) {
          iframe.src = `http://${UFI_DATA.lan_ipaddr}:7788/ui/?secret=123456&t=${Date.now()}`;
        } else if (e === 'close') {
          iframe.src = 'javascript:;';
        }
        refreshUI();
      });
    }

    await isMMRunning();
  })();
})();
 //</script>