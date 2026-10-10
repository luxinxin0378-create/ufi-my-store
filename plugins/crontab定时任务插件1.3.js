//<script>
setTimeout(async () => {

    let Log_INTERVAL = null
    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami')
        if (res.content) {
            if (res.content.includes('root')) {
                return true
            }
        }
        return false
    }

    // 检测是否开机自启
    const checkIsBootUp = async () => {
        const res = await runShellWithRoot(`
        grep -q 'kano_cron' /sdcard/ufi_tools_boot.sh
        echo $?
        `)
        return res.content.trim() == '0';
    }

    //创建随机数
    const createRandomString = (length = 8) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    const showDialog = (message, title = "提示") => {
        let timer = null
        const containerId = "toast_" + createRandomString(4)
        const id = 'close_message_btn_' + createRandomString(4)
        const id_download = 'download_btn_' + createRandomString(4)
        const id_clear = 'clear_btn_' + createRandomString(4)
        const id_refresh = 'clear_btn_' + createRandomString(4)
        const message1 = message.replaceAll('\n', "<br>")
        const { el, close } = createFixedToast(containerId, `
        <div style="pointer-events:all;width:80vw;max-width:800px">
            <div class="title" style="margin:0" data-i18n="system_notice">${title}</div>
            <div class="content_message" style="margin:10px 0;max-height: 400px;overflow: auto;font-size: .64rem;">${message1}</div>
            <div style="text-align:right">
                <button style="font-size:.64rem" id="${id}" data-i18n="close_btn">${t('close_btn')}</button>
                <button style="font-size:.64rem" id="${id_download}" data-i18n="only_download">${t('only_download')}</button>
                <button style="font-size:.64rem" id="${id_refresh}">刷新</button>
                <button style="font-size:.64rem" id="${id_clear}">清空日志</button>
            </div>
        </div>
        `)
        const btn = el.querySelector(`#${id}`)
        const download = el.querySelector(`#${id_download}`)
        const clearBtn = el.querySelector(`#${id_clear}`)
        const rBtn = el.querySelector(`#${id_refresh}`)
        if (!btn) {
            close()
            return
        }
        if (download) {
            download.onclick = async () => {
                const file = new File([message1.replaceAll("<br>", "\n")], { type: 'text/plain' });
                const url = URL.createObjectURL(file);
                const a = document.createElement('a');
                a.download = "kano_crond_log.txt";
                a.href = url;
                document.body.appendChild(a)
                a.click();
                URL.revokeObjectURL(url);
                a.remove()
            }
        }

        if (clearBtn) {
            clearBtn.onclick = async () => {
                const res = await runShellWithRoot(`echo "" > /sdcard/crond.log`)
                if (res.success) {
                    createToast("日志已清空", 'green')
                    close()
                } else {
                    createToast(`清空日志失败`, 'red')
                }
            }
        }

        const refresh = async (flag = false) => {
            const msg_el = el.querySelector(`.content_message`)
            const res = await runShellWithRoot(`timeout 2s awk '{print}' /sdcard/crond.log`)
            if (res.success) {
                msg_el.innerHTML = res.content.replaceAll('\n', "<br>")
                flag && createToast("日志已刷新")
            } else {
                flag && createToast("获取日志失败", 'red')
            }
        }

        if (rBtn) {
            rBtn.onclick = async () => {
                await refresh(true)
            }
        }

        if (timer) clearInterval(timer)
        timer = setInterval(async () => { await refresh() }, 1000)

        btn.onclick = async () => {
            if (timer) clearInterval(timer)
            close()
        }
    }

    //展示crontab配置
    const showCronTabConf = async (flag = false) => {
        try {
            const CRON_config = document.querySelector('#CRON_config')
            if (CRON_config) {
                const res = await runShellWithRoot(`timeout 2s awk \'{print}\' /data/kano_cron/crontab/kano_tab/root`)
                CRON_config.value = res.content
                if (flag) createToast('配置读取成功')
            }
        } catch { }
    }

    const saveCronConfig = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }

        if (!await checkIsInstalled()) {
            return createToast("CRON 未安装，请先安装！", 'red')
        }

        const CRON_config = document.querySelector('#CRON_config')
        if (!CRON_config) return createToast("配置文本框未找到", 'red')

        const configContent = CRON_config.value.trim()
        if (!configContent) return createToast("配置内容不能为空", 'red')

        // 写入配置文件
        const safeContent = configContent.replace(/'/g, "'\\''")
        const res = await runShellWithRoot(`
            echo '${safeContent}' > /data/kano_cron/crontab/kano_tab/root
            chown root:root /data/kano_cron/crontab/kano_tab/root
            chmod 644 /data/kano_cron/crontab/kano_tab/root
        `)
        if (res.success) {
            createToast("配置已保存，正在重启CRON服务...", 'green')
            restartBtn.click() // 重启CRON服务
        } else {
            createToast(`保存配置失败: ${res.content}`, 'red')
        }
    }

    const checkIsInstalled = async () => {
        const res = await runShellWithRoot(`ls /data/kano_cron/`)
        if (res.success && res.content.includes('kano_crond')) {
            return true
        }
        return false
    }

    const installBtn = document.createElement('button')
    installBtn.textContent = "安装CRON"
    installBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }

        if (await checkIsInstalled()) {
            return createToast("CRON 已安装，请先卸载后再安装！", 'red')
        }

        createToast("开始下载安装包...")

        // 下载压缩包
        const res1 = await runShellWithRoot(`
    cd /data && /data/data/com.minikano.f50_sms/files/curl -L https://pan.kanokano.cn/d/UFI-TOOLS-UPDATE/plugins/kano_cron.tar.gz -o kano_cron.tar.gz
    `, 100 * 1000)
        if (!res1.success) return createToast("下载CRON客户端压缩包失败", 'red')

        // 解压
        createToast("解压安装包...")
        const res2 = await runShellWithRoot(`
    cd /data && rm -rf kano_cron && mkdir -p kano_cron && tar -zxf kano_cron.tar.gz -C /data/kano_cron/
    `)
        if (!res2.success) return createToast("解压失败", 'red')

        // 设置权限
        createToast("设置执行权限...")
        const res3 = await runShellWithRoot(`
    chown root:root root /data/kano_cron/crontab/kano_tab/root
    chmod 644 /data/kano_cron/crontab/kano_tab/root
    chmod +x /data/kano_cron/kano_crond /data/kano_cron/kano_crontab
    `)
        if (!res3.success) return createToast("设置权限失败", 'red')

        // 设置自启动
        createToast("设置CRON客户端自启动...")
        const res4 = await runShellWithRoot(`
grep -qxF 'sh /data/kano_cron/service.sh start' /sdcard/ufi_tools_boot.sh || echo 'sh /data/kano_cron/service.sh start' >> /sdcard/ufi_tools_boot.sh
    `)
        if (!res4.success) return createToast("写入自启动失败", 'red')

        // 启动
        createToast("启动CRON客户端...")
        const res5 = await runShellWithRoot(`sh /data/kano_cron/service.sh start`)
        if (!res5.success) return createToast("启动失败", 'red')

        createToast(res5.content, '')
        createToast(`CRON客户端 安装成功！`, '', 6000)

        //配置文件显示
        await showCronTabConf()
        checkIsBootUp().then(isBootUp => {
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })
        setTimeout(() => {
            initFileList(true)
        }, 1000);
    }

    const uninstallBtn = document.createElement('button')
    uninstallBtn.textContent = "卸载CRON"
    let clickCount = 0;
    let clickTimer = null;

    uninstallBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        clickCount++;

        if (clickCount < 3) {
            createToast("再点一次卸载cron");

            // 重置定时器
            if (clickTimer) clearTimeout(clickTimer);
            clickTimer = setTimeout(() => {
                clickCount = 0; // 3秒后重置计数器
            }, 3000);

            return;
        }
        createToast("正在停止CRON客户端...")
        const res = await runShellWithRoot('sh /data/kano_cron/service.sh stop')
        createToast(res.content)

        createToast("清理目录和自启动...")
        const res1 = await runShellWithRoot(`
    rm -rf /data/kano_cron
    sed -i '/kano_cron/d' /sdcard/ufi_tools_boot.sh
    `)
        if (!res1.success) return createToast("卸载失败", 'red')

        createToast("卸载成功", 'green')

        await showCronTabConf()
        await initFileList()
        checkIsBootUp().then(isBootUp => {
            if (isBootUp) {
                boot_on.style.background = "var(--dark-btn-color-active)"
            } else {
                boot_on.style.background = ""
            }
        })
    }

    const stopBtn = document.createElement('button')
    stopBtn.textContent = "停止CRON"
    stopBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        const res = await runShellWithRoot('sh /data/kano_cron/service.sh stop')
        createToast(res.content.replaceAll('\n', "<br>"), '')
    }

    const restartBtn = document.createElement('button')
    restartBtn.textContent = "重启CRON"
    restartBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        const res1 = await runShellWithRoot('sh /data/kano_cron/service.sh stop')
        createToast(res1.content.replaceAll('\n', "<br>"), '')
        const res = await runShellWithRoot(`
             sh /data/kano_cron/service.sh start
        `)
        if (!res.success) return createToast("重启失败", 'red')
        createToast(res.content, '')
        createToast("重启成功！", '')
        await showCronTabConf()
        await initFileList()
    }


    const helpBtn = document.createElement('button')
    helpBtn.textContent = "帮助"
    helpBtn.onclick = () => {
        const message = `功能：
安装和卸载CRON服务
启动、停止和重启CRON
查看、清空和导出日志
上传、删除和管理定时任务脚本
编辑和保存CRON配置

操作步骤：

安装CRON：点击“安装CRON”，自动下载并启动服务
卸载CRON：点击“卸载CRON”，删除服务和脚本
启动/停止/重启：点击对应按钮操作服务
查看日志：点击“查看日志”，可实时刷新或导出
脚本管理：上传新的脚本，删除不用的脚本，刷新列表
脚本上传后路径在哪？
答：默认在/data/kano_cron/scripts/ 下，你也可以点击右侧脚本列表一键复制脚本完整路径
保存CRON配置：编辑文本框内容，点击“保存”即可生效

crontab格式说明（详细版，纯文本）
每行表示一个定时任务，格式如下：
分钟 小时 日 月 星期 要执行的命令

各字段说明：
1. 分钟：0-59
   示例：0 表示整点
   */5 表示每5分钟
2. 小时：0-23
   示例：14 表示下午2点
   0-6 表示0点到6点
3. 日（日期）：1-31
   示例：1 表示每月1号
   1,15 表示每月1号和15号
4. 月：1-12
   示例：6 表示6月
   1,6,12 表示1月、6月和12月
5. 星期：0-7（0和7都表示星期天）
   示例：1 表示星期一
   1-5 表示周一到周五
   0,6 表示周日和周六
6. 要执行的命令
   必须写脚本或命令的绝对路径
   建议在命令后面加日志重定向，例如：>> /data/kano_cron/log.txt 2>&1

特殊符号说明：
* 任意值，例如 * * * * * 表示每分钟执行
, 枚举值，例如 1,15,30 表示第1、15、30分钟
- 范围，例如 1-5 表示1到5分钟
/ 步长或间隔，例如 */10 表示每10分钟执行一次

示例任务：
1. 每天早上8点执行脚本
   0 8 * * * sh /data/kano_cron/scripts/morning.sh
2. 每小时的第5分钟执行脚本
   5 * * * * sh /data/kano_cron/scripts/hourly.sh
3. 每周一、三、五的下午3点执行脚本
   0 15 * * 1,3,5 sh /data/kano_cron/scripts/weekly.sh
4. 每5分钟执行一次脚本，并把输出保存到日志
   */5 * * * * sh /data/kano_cron/scripts/check.sh >> /data/kano_cron/check.log 2>&1

注意事项：
修改crontab后保存配置并重启CRON服务
日志便于调试和查看

小提示：
配置保存后会自动生效
上传或修改脚本后建议刷新列表`.replaceAll('\n', "<br>")
        const { el, close } = createFixedToast('kano_help_message', `
                    <div style="pointer-events:all;width:80vw;max-width:800px">
                        <div class="title" style="margin:0" data-i18n="system_notice">使用说明</div>
                        <div style="margin:10px 0;max-height:400px;overflow:auto;font-size:.64rem">${message}</div>
                        <div style="text-align:right">
                            <button style="font-size:.64rem" id="close_message_btn" data-i18n="pay_btn_dismiss">${t('pay_btn_dismiss')}</button>
                        </div>
                    </div>
                    `)
        const btn = el.querySelector('#close_message_btn')
        if (!btn) {
            close()
            return
        }
        btn.onclick = async () => {
            close()
        }
    }

    const showLogBtn = document.createElement('button')
    showLogBtn.textContent = "查看日志"
    showLogBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        const res = await runShellWithRoot(`
        timeout 2s awk \'{print}\' /sdcard/crond.log
        `)
        if (!res.success) return createToast("获取日志失败！", 'red')
        if (!res.content) return createToast("日志内容为空！", 'red')
        showDialog(res.content, "CROND日志")
    }

    const boot_on = document.createElement('button')
    boot_on.id = "cron_boot_on"
    boot_on.classList.add('btn')
    boot_on.textContent = "开机自启"
    boot_on.style.background = ""
    boot_on.addEventListener('click', async () => {
        if (!(await checkAdvanceFunc())) {
            createToast("没有开启高级功能，无法使用！", 'red')
            return
        }
        const isBootUp = await checkIsBootUp();
        if (isBootUp) {
            //关闭
            await runShellWithRoot(`
                sed -i  '/kano_cron/d' /sdcard/ufi_tools_boot.sh
            `)
            boot_on.style.background = ""
            createToast("已取消开机自启", 'green')
        } else {
            //开启
            await runShellWithRoot(`
                grep -qxF 'sh /data/kano_cron/service.sh start' /sdcard/ufi_tools_boot.sh || echo 'sh /data/kano_cron/service.sh start' >> /sdcard/ufi_tools_boot.sh
            `)
            boot_on.style.background = "var(--dark-btn-color-active)"
            createToast("已设置开机自启", 'green')
        }
    })

    const backupBtn = document.createElement('button')
    backupBtn.textContent = "备份文件到sd卡"
    backupBtn.onclick = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        const files = await getCronFiles()
        if (files.length === 0) {
            return createToast("没有可备份的脚本文件", 'red')
        }
        const backupDir = '/sdcard/kano_cron_backup/'
        const res = await runShellWithRoot(`
            mkdir -p ${backupDir}
            for file in /data/kano_cron/scripts/*; do
                if [ -f "\$file" ]; then
                    cp "\$file" "${backupDir}"
                fi
            done
            cp /data/kano_cron/crontab/kano_tab/root "${backupDir}kano_cron_config.txt"
            `)
        if (res.success) {
            createToast(`脚本与文件已备份到 ${backupDir}`, 'green')
        }
        else {
            createToast(`备份失败: ${res.content}`, 'red')
        }
    }

    const getCronFiles = async (flag = false) => {
        const res = await runShellWithRoot(`
            ls /data/kano_cron/scripts/
            `)
        if (res.success) {
            return res.content.split('\n').filter(file => file.trim() !== '')
        } else {
            flag && createToast(`获取文件列表失败: ${res.content}`, 'red')
            return []
        }
    }

    const deleteCronFile = async (fileName) => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        if (!fileName) return createToast("文件名不能为空", 'red')
        if (!confirm(`确认删除 ${fileName} ?`)) return
        const safeContent = fileName.replace(/'/g, "'\\''")
        const res = await runShellWithRoot(`
            rm -f '/data/kano_cron/scripts/${safeContent}'
            `)
        if (res.success) {
            createToast(`删除成功`, 'green')
            const files = await getCronFiles()
            renderFileList(files)
        } else {
            createToast(`删除失败: ${res.content}`, 'red')
        }
    }

    const downloadCronFile = async (fileName) => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        if (!fileName) return createToast("文件名不能为空", 'red')
        const safeContent = fileName.replace(/'/g, "'\\''")
        const res = await runShellWithRoot(`
            timeout 2s awk '{print}' '/data/kano_cron/scripts/${safeContent}'
            `)
        if (res.success) {
            const file = new File([res.content], { type: 'text/plain' });
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.download = fileName;
            a.href = url;
            document.body.appendChild(a)
            a.click();
            URL.revokeObjectURL(url);
            a.remove()
        } else {
            createToast(`下载失败: ${res.content}`, 'red')
        }
    }

    const renderFileList = (files) => {
        const fileList = document.querySelector('#collapse_CRON .file_list')
        if (!fileList) return
        fileList.innerHTML = ''
        files.forEach(file => {
            const li = document.createElement('li')
            li.innerHTML = `<span class="file_name" onclick="copyText({target:{innerText:'/data/kano_cron/scripts/${file}'}})">${file}</span><div style="display: flex;gap: 4px;"><button style="font-size: .6rem;" onclick="downloadCronFile('${file}')">下</button><button style="font-size: .6rem;" onclick="deleteCronFile('${file}')">删</button></div>`
            fileList.appendChild(li)
        })
    }

    const uploadCronScriptFile = async () => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        const fileInput = document.createElement('input')
        fileInput.type = 'file'
        fileInput.accept = '.sh,.py,.js' // 支持的脚本类型
        fileInput.onchange = async (e) => {
            const file = e.target.files[0]
            if (!file) return createToast("未选择文件", 'red')
            if (file.size > 1024 * 1024 * 10) return createToast("文件大小不能超过10MB", 'red')

            try {
                const formData = new FormData();
                formData.append("file", file);
                const res = await (await fetch(`${KANO_baseURL}/upload_img`, {
                    method: "POST",
                    headers: common_headers,
                    body: formData,
                })).json()

                if (res.url) {
                    let foundFile = await runShellWithRoot(`
                ls /data/data/com.minikano.f50_sms/files${res.url}
                `)
                    if (!foundFile.content) {
                        throw "上传失败"
                    }
                    const safeContent = file.name.replace(/'/g, "'\\''")
                    let resShell = await runShellWithRoot(`
                mkdir -p /data/kano_cron/scripts
                mv /data/data/com.minikano.f50_sms/files${res.url} '/data/kano_cron/scripts/${safeContent}'
                chmod +x '/data/kano_cron/scripts/${safeContent}'
                `)
                    if (resShell.success) {
                        createToast(`上传成功！正在重启cron服务...`, 'green')
                        restartBtn.click()
                        await initFileList()
                    }
                }
                else throw res.error || ''
            }
            catch (e) {
                console.error(e);
                createToast(`上传失败!`, 'red')
            }
        }
        fileInput.click()
    }

    const initFileList = async (flag = false) => {
        if (!checkAdvanceFunc()) {
            return createToast("没有开启高级功能，无法使用！")
        }
        const files = await getCronFiles()
        renderFileList(files)
        if (flag) createToast('脚本列表已刷新')
    }
    initFileList()


    const mmContainer = document.querySelector('.functions-container')
    mmContainer.insertAdjacentHTML("afterend", `
<div id="IFRAME_KANO_CRON" style="width: 100%; margin-top: 10px;">
<style>
    .file_list {
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
        max-height: 300px;
    }
    .file_list li {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
</style>
    <div class="title" style="margin: 6px 0 ;">
        <strong>cron定时任务</strong>
        <div style="display: inline-block;" id="collapse_CRON_btn"></div>
    </div>
    <div class="collapse" id="collapse_CRON" data-name="close" style="height: 0px; overflow: hidden;">
        <div class="collapse_box">
            <div id="CRON_action_box" style="margin-bottom:10px;display:flex;gap:10px;flex-wrap:wrap"></div>
            <ul class="deviceList">
                <li style="padding:10px;display: grid;grid-template-columns: 50% 50%;gap: 8px;">
                    <div>
                        <div class="title">
                            <span>任务管理</span>
                            <button style="margin: 0 !important;padding: 2px 6px;" onclick="saveCronConfig()">保存</button>
                            <button style="margin: 0 !important;padding: 2px 6px;" onclick="showCronTabConf()">读取</button>
                        </div>
                        <textarea spellcheck="false" id="CRON_config" style="margin-top: 4px;font-size:12px !important;border:none;padding:4px;margin:0;width:100%;height:300px;border-radius: 10px;overflow-x: hidden;background:transparent;"></textarea>
                    </div>
                    <div>
                        <div class="title">
                            <span>脚本列表</span>
                            <button style="margin: 0 !important;padding: 2px 6px;" onclick="initFileList(true)">刷新</button>
                            <button style="margin: 0 !important;padding: 2px 6px;" onclick="uploadCronScriptFile()">上传</button>
                        </div>
                        <ul class="file_list">
                        </ul>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</div>
            `)
    const mmBox = document.querySelector('#CRON_action_box')
    mmBox.appendChild(installBtn)
    mmBox.appendChild(uninstallBtn)
    mmBox.appendChild(stopBtn)
    mmBox.appendChild(restartBtn)
    mmBox.appendChild(showLogBtn)
    mmBox.appendChild(helpBtn)
    mmBox.appendChild(backupBtn)
    mmBox.appendChild(boot_on)
    collapseGen("#collapse_CRON_btn", "#collapse_CRON", "#collapse_CRON", (newVal) => {
        if (newVal == 'open') {
            Log_INTERVAL && Log_INTERVAL()
        } else {
            Log_INTERVAL && Log_INTERVAL()
        }
    })

    if (localStorage.getItem("#collapse_CRON") == 'open') {
    }

    //配置文件显示
    let counter = 0
    let inter = setInterval(async () => {
        counter++;
        if (counter >= 10) clearInterval(inter)
        const CRON_config = document.querySelector('#CRON_config')
        if (CRON_config) {
            showCronTabConf()
            clearInterval(inter)
        }
    }, 1000);


    //导出方法
    const export_methods = {
        getCronFiles,
        deleteCronFile,
        renderFileList,
        initFileList,
        uploadCronScriptFile,
        showCronTabConf,
        saveCronConfig,
        downloadCronFile
    }

    Object.keys(export_methods).forEach(key => {
        window[key] = export_methods[key]
    })

    checkIsBootUp().then(isBootUp => {
        if (isBootUp) {
            boot_on.style.background = "var(--dark-btn-color-active)"
        } else {
            boot_on.style.background = ""
        }
    })

}, 10)
//</script>