//<script>
(() => {
  const checkAdvanceFunc = async () => {
    const res = await runShellWithRoot('whoami');
    if (res.content) {
      if (res.content.includes('root')) {
        return true;
      }
    }
    return false;
  };

  //创建随机数
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
    const status = await runShellWithRoot('pgrep Clash');
    const running_mm = document.querySelector('#running_mm');
    const isR =
      status.content != null &&
      status.content != undefined &&
      status.content != '';
    if (running_mm) {
      running_mm.innerHTML = isR ? '猫猫 - 🟢运行中' : '猫猫 - 🔴已停止';
    }
    return isR;
  };

  async function isELF(file) {
    const blob = file.slice(0, 4); // 前4字节
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

  // 检测是否开机自启
  const checkIsBootUp = async () => {
    const res = await runShellWithRoot(`
        grep -q '/data/clash/Scripts/Clash.Service start' /sdcard/ufi_tools_boot.sh
        echo $?
        `);
    return res.content.trim() == '0';
  };

  //监测是否已经安装过了
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
          createToast(`上传成功！正在重启核心...`, 'green');
          btn_restart.click();
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
            <div class="content_message" style="background: rgba(0, 0, 0, 0.8);color: rgb(0, 255, 0);box-sizing: border-box;font-family: sans-serif;line-height:1.4;margin:10px 0;max-height: 400px;overflow: auto;font-size: .64rem;">${message1}</div>
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
      const res = await runShellWithRoot(
        `timeout 2s awk \'{print}\' /sdcard/Clash内核日志.txt | tail -n 100`,
      );
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
        createToast('已经安装过猫猫了！', 'red');
        return;
      }

      createToast('下载所需组件中...');
      const res0 = await runShellWithRoot(
        `/data/data/com.minikano.f50_sms/files/curl -L "https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/mihomo-tproxy.zip" -o /data/kano_clash.zip --output /data/kano_clash.zip --write-out "DOWNLOAD_DONE\nTotal: %{size_download} bytes\nSpeed: %{speed_download} B/s\nTime: %{time_total} sec\n" > /data/kano_mihomo_latest.dlog 2>&1 &`,
        100 * 1000,
      );
      if (!res0.success) {
        btn_enabled.disabled = false;
        return createToast('下载依赖失败!', 'red');
      }

      let log = '';
      const max_times = 600; // 最多等待10分钟
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
        const lines = dlog.content.split('\n'); // 按换行符拆分成数组
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
          return ('下载超时，请检查网络连接或稍后重试！', 'red');
        }
        if (log.includes('DOWNLOAD_DONE')) {
          clearInterval(interval);
          break;
        }
        count_times++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await runShellWithRoot('rm -f /data/kano_mihomo_latest.dlog');

      createToast('解压猫猫文件...');
      const res2 = await runShellWithRoot(`
        cd /data/
        mkdir -p clash
        unzip kano_clash.zip -d /data/clash/
        `);
      if (!res2.success) return createToast('解压猫猫文件出错!', 'red');

      createToast('检查依赖文件，可能需要一点时间...');
      const res3 = await runShellWithRoot(`
        ls /data/clash/Scripts
        `);
      if (!res3.success || !res3.content.includes('Clash.Service'))
        return createToast('检查猫猫依赖文件失败!', 'red');

      createToast('正在安装猫猫，设置Clash自启动...');
      const res5 = await runShellWithRoot(`
chmod 777 -Rf /data/clash
grep -qxF '/data/clash/Scripts/Clash.Service start' /sdcard/ufi_tools_boot.sh || echo '/data/clash/Scripts/Clash.Service start' >> /sdcard/ufi_tools_boot.sh
grep -qxF 'inotifyd /data/clash/Scripts/Clash.Inotify "/data/clash/Clash" >> /dev/null &' /sdcard/ufi_tools_boot.sh || echo 'inotifyd /data/clash/Scripts/Clash.Inotify "/data/clash/Clash" >> /dev/null &' >> /sdcard/ufi_tools_boot.sh
        `);
      if (!res5.success) return createToast('设置猫猫自启动失败!', 'red');

      createToast('启动Clash...');
      const res6 = await runShellWithRoot(`
        /data/clash/Scripts/Clash.Service start
        `);
      if (!res6.success) return createToast('启动猫猫失败!', 'red');

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
        '启动Clash成功',
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
  const btn_disabled = document.createElement('button');
  btn_disabled.textContent = '卸载';
  let ct = 0;
  let tmer = null;
  btn_disabled.onclick = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    ct++;
    tmer && clearTimeout(tmer);
    tmer = setTimeout(() => {
      ct = 0;
    }, 3000);
    if (ct < 3) {
      return createToast('再点一次卸载猫猫');
    }
    createToast('卸载中...', 'red');
    const res = await runShellWithRoot(`
        /data/clash/Scripts/Clash.Service stop
        sleep 1
        rm -rf /data/clash
        sed -i '/Clash.Service/d' /sdcard/ufi_tools_boot.sh
        sed -i '/Clash.Inotify/d' /sdcard/ufi_tools_boot.sh
        `);
    if (!res.success) return createToast('卸载失败！', 'red');
    createToast(`<div style="width:300px;text-align:center">
        卸载结果：${res.content}<br/>
        如果没有错误即视为卸载成功
        </div>`);
    await isMMRunning();
  };

  const btn_restart = document.createElement('button');
  btn_restart.textContent = '重启';
  btn_restart.onclick = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    if (!(await checkIsInstalled())) {
      createToast('没有安装猫猫，请先安装！', 'red');
      return;
    }
    createToast(
      '重启猫猫中...<br/>如果等待时间比较久，请持续观察日志。',
      'green',
    );
    const res = await runShellWithRoot(
      `
        /data/clash/Scripts/Clash.Service stop
        sleep 1
        /data/clash/Scripts/Clash.Service start
        `,
      100 * 1000,
    );
    if (!res.success) return createToast('重启失败！', 'red');
    createToast(
      `<div style="width:300px;text-align:center">
            ${res.content.replaceAll('\n', '<br/>')}
        </div>`,
      'green',
    );
    await isMMRunning();
  };

  //一键上传
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
        createToast('没有安装猫猫，请先安装！', 'red');
        return;
      }
      await runShellWithRoot(`
                        rm /data/data/com.minikano.f50_sms/files/uploads/clash_config.yml
                    `);
      // 检查文件大小
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
      createToast('没有安装猫猫，请先安装！', 'red');
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
      createToast('没有安装猫猫，请先安装！', 'red');
      return;
    }
    uploadEl.click();
  };

  const stopBtn = document.createElement('button');
  stopBtn.classList.add('btn');
  stopBtn.textContent = '停止';
  stopBtn.onclick = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast('没有开启高级功能，无法使用！', 'red');
      return;
    }
    createToast('干掉猫猫中...', 'green');
    const res = await runShellWithRoot(`
        /data/clash/Scripts/Clash.Service stop
        sleep 1
        `);
    if (!res.success) return createToast('停止失败！', 'red');
    createToast(
      `<div style="width:300px;text-align:center">
            ${res.content.replaceAll('\n', '<br/>')}
        </div>`,
      'green',
    );
    await isMMRunning();
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
      createToast('没有安装猫猫，请先安装！', 'red');
      return;
    }
    createToast('备份猫猫中...', 'green');
    const t = Math.floor(Date.now() + Math.random());
    const res = await runShellWithRoot(`
        rm -f /data/data/com.minikano.f50_sms/files/uploads/mm_config_backup*
        sleep 1
        cp /data/clash/Proxy/config.yaml /data/data/com.minikano.f50_sms/files/uploads/mm_config_backup_${t}.yaml
        chmod 777 /data/data/com.minikano.f50_sms/files/uploads/mm_config_backup_${t}.yaml
        `);
    if (!res.success) return createToast('备份失败！', 'red');
    const a = document.createElement('a');
    a.download = `猫猫配置备份_config_${t}.yaml`;
    a.href = `/api/uploads/mm_config_backup_${t}.yaml`;
    a.target = '_blank';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

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

    mmContainer.insertAdjacentHTML(
      'afterend',
      `
<div id="IFRAME_KANO" style="width: 100%; margin-top: 10px;">
    <div class="title" style="margin: 6px 0 ;">
        <strong id="running_mm">猫猫</strong>
        <div style="display: inline-block;" id="collapse_mm_btn"></div>
    </div>
    <div class="collapse" id="collapse_mm" data-name="close" style="height: 0px; overflow: hidden;">
        <div class="collapse_box">
        <div id="mm_action_box" style="margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap"></div>
            <ul class="deviceList">
<li style="padding:10px">
        <iframe id="mm_iframe" src="javascript:;" style="border:none;padding:0;margin:0;width:100%;height:500px;border-radius: 10px;overflow: hidden;opacity: .6;"></iframe>
</li> </ul>
        </div>
    </div>
</div>
`,
    );
    const refresh = document.createElement('button');
    refresh.classList.add('btn');
    refresh.textContent = '刷新网页';
    refresh.onclick = () => {
      document.getElementById('mm_iframe').src =
        `http://${UFI_DATA.lan_ipaddr}:7788/ui/?t=` + Date.now();
    };

    const open = document.createElement('button');
    open.classList.add('btn');
    open.textContent = '打开面板';
    open.onclick = () => {
      const a = document.createElement('a');
      a.href = `http://${UFI_DATA.lan_ipaddr}:7788/ui/?t=` + Date.now();
      a.target = '_blank';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    const wiki = document.createElement('button');
    wiki.classList.add('btn');
    wiki.textContent = '文档教程';
    wiki.onclick = () => {
      const a = document.createElement('a');
      a.href = `https://wiki.metacubex.one/config/`;
      a.target = '_blank';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    const boot_on = document.createElement('button');
    boot_on.id = 'clash_boot_on';
    boot_on.classList.add('btn');
    boot_on.textContent = '开机自启';
    boot_on.style.background = '';
    boot_on.addEventListener('click', async () => {
      if (!(await checkAdvanceFunc())) {
        createToast('没有开启高级功能，无法使用！', 'red');
        return;
      }
      if (!(await checkIsInstalled())) {
        createToast('没有安装猫猫，请先安装！', 'red');
        return;
      }
      const isBootUp = await checkIsBootUp();
      if (isBootUp) {
        //关闭
        await runShellWithRoot(`
                sed -i '/Clash.Service/d' /sdcard/ufi_tools_boot.sh
                sed -i '/Clash.Inotify/d' /sdcard/ufi_tools_boot.sh
            `);
        boot_on.style.background = '';
        createToast('已取消开机自启', 'green');
      } else {
        //开启
        await runShellWithRoot(`
                grep -qxF '/data/clash/Scripts/Clash.Service start' /sdcard/ufi_tools_boot.sh || echo '/data/clash/Scripts/Clash.Service start' >> /sdcard/ufi_tools_boot.sh
                grep -qxF 'inotifyd /data/clash/Scripts/Clash.Inotify "/data/clash/Clash" >> /dev/null &' /sdcard/ufi_tools_boot.sh || echo 'inotifyd /data/clash/Scripts/Clash.Inotify "/data/clash/Clash" >> /dev/null &' >> /sdcard/ufi_tools_boot.sh
            `);
        boot_on.style.background = 'var(--dark-btn-color-active)';
        createToast('已设置开机自启', 'green');
      }
    });

    checkIsBootUp().then((isBootUp) => {
      if (isBootUp) {
        boot_on.style.background = 'var(--dark-btn-color-active)';
      } else {
        boot_on.style.background = '';
      }
    });

    if (localStorage.getItem('#collapse_mm') == 'open') {
      refresh.click();
      await isMMRunning();
    }

    const uploadCore = document.createElement('button');
    uploadCore.textContent = '更新内核';
    const uploadCoreInput = document.createElement('input');
    uploadCoreInput.type = 'file';
    uploadCoreInput.accept = '*/*';
    uploadCoreInput.style.display = 'none';

    uploadCoreInput.onchange = async (e) => {
      e.stopPropagation();
      if (!e.target || !e.target.files) return;
      if (e.target.files.length == 0) return;
      const file = e.target.files[0];
      if (!file) return;
      if (!(await checkAdvanceFunc())) {
        createToast('没有开启高级功能，无法使用！', 'red');
        return;
      }
      // 检查文件格式
      if (!(await isELF(file))) {
        createToast('只能上传内核二进制文件!', 'red');
        uploadCoreInput.value = '';
        return;
      }
      // 检查文件大小
      if (file.size > 50 * 1024 * 1024) {
        createToast(`文件大小不能超过${50}MB！`, 'red');
        uploadCoreInput.value = '';
        return;
      }

      const { close } = createFixedToast('upload_core_toast', '上传内核中...');

      // 上传文件
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
          close();
          let foundFile = await runShellWithRoot(`
                        ls /data/data/com.minikano.f50_sms/files/${res.url}
                    `);
          if (!foundFile.content) {
            throw '上传失败';
          }
          createToast('上传成功，正在停止内核...', '');
          stopBtn.click();
          let resShell = await runShellWithRoot(
            `
                        rm -f /data/clash/Proxy/Clash.Core
                        mv /data/data/com.minikano.f50_sms/files/${res.url} /data/clash/Proxy/Clash.Core
                        chmod 755 /data/clash/Proxy/Clash.Core
                    `,
            120 * 1000,
          );
          createToast('解压内核...', '');
          if (resShell.success) {
            createToast('上传内核完成,正在启动内核...', 'pink');
            uploadCoreInput.value = '';
            btn_restart.click();
            return;
          }
        }
        throw res.error || '上传失败';
      } catch (e) {
        console.error(e);
        createToast(`上传失败!`, 'red');
        uploadCoreInput.value = '';
        return;
      } finally {
        close();
      }
    };

    uploadCore.onclick = async () => {
      if (!(await checkIsInstalled())) {
        createToast('没有安装猫猫，请先安装！', 'red');
        return;
      }
      uploadCoreInput.click();
    };

    const showLogBtn = document.createElement('button');
    showLogBtn.textContent = '查看日志';
    showLogBtn.onclick = async () => {
      if (!checkAdvanceFunc()) {
        return createToast('没有开启高级功能，无法使用！');
      }

      const res = await runShellWithRoot(`
        timeout 2s awk \'{print}\' /sdcard/Clash内核日志.txt | tail -n 100
        `);
      if (!res.success) return createToast('获取日志失败！', 'red');
      if (!res.content) return createToast('日志内容为空！', 'red');
      showDialog(res.content, '猫猫日志 (tail 100)');
    };

    // 订阅链接功能
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

        createToast('正在处理订阅...', 'yellow');

        try {
          let res = `${url1}\nprovider1`;
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
            close();
          }
        } catch (e) {
          createToast('处理订阅失败: ' + e, 'red');
        }
      };
    };

    // 创建订阅链接按钮
    const subBtn = document.createElement('button');
    subBtn.classList.add('btn');
    subBtn.textContent = '订阅链接';
    subBtn.onclick = async () => {
      if (!(await checkAdvanceFunc())) {
        createToast('没有开启高级功能，无法使用！', 'red');
        return;
      }
      if (!(await checkIsInstalled())) {
        createToast('没有安装猫猫，请先安装！', 'red');
        return;
      }
      importSub();
    };

    const mmBox = document.querySelector('#mm_action_box');
    mmBox.appendChild(uploadCoreInput);
    mmBox.appendChild(editBtn);
    mmBox.appendChild(subBtn); // 订阅链接
    mmBox.appendChild(uploadBtn);
    mmBox.appendChild(backupBtn);
    mmBox.appendChild(btn_enabled);
    mmBox.appendChild(stopBtn);
    mmBox.appendChild(btn_restart);
    mmBox.appendChild(btn_disabled);
    mmBox.appendChild(boot_on);
    mmBox.appendChild(open);
    mmBox.appendChild(uploadCore);
    mmBox.appendChild(wiki);
    mmBox.appendChild(showLogBtn);
    mmBox.appendChild(refresh);

    let colTimer = null;
    let colTimer1 = null;
    collapseGen('#collapse_mm_btn', '#collapse_mm', '#collapse_mm', (e) => {
      checkIsBootUp().then((isBootUp) => {
        if (isBootUp) {
          boot_on.style.background = 'var(--dark-btn-color-active)';
        } else {
          boot_on.style.background = '';
        }
      });
      colTimer && clearTimeout(colTimer);
      colTimer1 && clearTimeout(colTimer1);
      if (e == 'open') {
        colTimer1 = setTimeout(() => {
          refresh.click();
        }, 300);
      } else {
        colTimer = setTimeout(() => {
          document.getElementById('mm_iframe').src = `javascript:;`;
        }, 300);
      }
    });
    await isMMRunning();
  })();
})();
//</script >