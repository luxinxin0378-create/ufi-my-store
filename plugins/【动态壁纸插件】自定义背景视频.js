//<script>
(() => {
  let VIDEO_URL = "" // 视频地址（永久）
  let CLICK_TO_UNMUTE = false // 点击屏幕解除静音
  let MAX_SIZE = 100 // 最大上传文件大小，单位MB
  let localMode = false

  const checkAdvanceFunc = async () => {
    const res = await runShellWithRoot('whoami')
    if (res.content) {
      if (res.content.includes('root')) {
        return true
      }
    }
    return false
  }

  //保存自定义视频地址
  const saveUrlToDevice = async (url) => {
    try {
      const res = await runShellWithUser(`echo "${url}" > /data/data/com.minikano.f50_sms/background_video_store`)
      if (!res.success) return false
      if (!res.content || !res.content.done) return false
      if (res.content.content == "") return true
      return true
    }
    catch (e) {
      console.error(e)
      return false
    }
  }
  //读取自定义视频地址
  const loadUrlFromDevice = async () => {
    try {
      const res = await runShellWithUser(`timeout 2s  awk '{print}' /data/data/com.minikano.f50_sms/background_video_store`)
      if (!res.success) return null
      if (!res.content || !res.content.done) return null
      if (res.content.content == "") return null
      return res.content.content
    }
    catch (e) {
      console.error(e)
      return null
    }
  }

  //文件上传
  const handleVideoFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // 检查文件大小
      if (file.size > MAX_SIZE * 1024 * 1024) {
        // MAX_SIZE MB
        createToast(`${t('file_size_over_limit')}${MAX_SIZE}MB！`, 'red')
      } else {
        let closeFn = null
        //上传图片
        try {
          const { el, close } = createFixedToast("uploading_video", "上传中...")
          closeFn = close
          const formData = new FormData();
          formData.append("file", file);
          const res = await (await fetch(`${KANO_baseURL}/upload_img`, {
            method: "POST",
            headers: common_headers,
            body: formData,
          })).json()

          if (res.url) {
            const { el, close } = createFixedToast("uploading_video_success", `
            <div style="pointer-events: all;">
              ${t('toast_upload_success')}，<br>
              链接：（点击复制）<br>
              <b onclick="copyText(event)" style="color:pink">${KANO_baseURL}${res.url}</b>
              <div style="text-align:right;margin-top:6px;">
                  <button style="font-size:.64rem" id="close_upload_vd_btn" data-i18n="close_btn">关闭</button>
              </div>
            </div>
          `)
            document.getElementById("close_upload_vd_btn").onclick = () => {
              close()
            }
          }
          else throw res.error || ''
        }
        catch (e) {
          console.log(e);
          createToast(t('toast_upload_failed') + "，请自行上传视频！", 'red')
        } finally {
          closeFn && closeFn()
        }
      }
    }
  }

  const btn = document.createElement("button")
  btn.innerHTML = "上传背景视频"
  btn.onclick = () => {
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = "video/*"
    fileInput.id = "fileUploader"
    fileInput.style.display = "none"
    fileInput.onchange = handleVideoFileUpload
    document.body.appendChild(fileInput)
    fileInput.click()
  }

  const btn0 = document.createElement("button")
  btn0.innerHTML = "提取机内背景视频链接"
  btn0.onclick = async () => {
    let fileName = prompt("请将视频放到/sdcard/DCIM文件夹内（文件共享功能默认打开就是这个目录，直接放），之后输入文件完整名称即可提取机内背景视频链接\n请输入视频文件名", VIDEO_URL.replace("/api/uploads/", "").replace("minikano_background_video_", ""))
    if (fileName) {
      let newFileName = "minikano_background_video_" + fileName.trim()
      if (!(await checkAdvanceFunc())) {
        createToast("未开启高级功能！", "red", 4000)
        return
      }
      const res = await runShellWithRoot(`ls /sdcard/DCIM/${fileName} >/dev/null 2>&1 && echo "yes" || echo "no"`)
      if (!res.content || !res.content.includes("yes")) {
        createToast("文件不存在，请确认已放入/sdcard/DCIM/目录内且文件名正确", "red", 4000)
        return
      }
      //检测uploads目录是否存在，不存在直接创建
      await runShellWithRoot(`mkdir -p /data/data/com.minikano.f50_sms/files/uploads`)
      const res1 = await runShellWithRoot(`cp /sdcard/DCIM/${fileName} /data/data/com.minikano.f50_sms/files/uploads/${newFileName} && echo "success" || echo "fail"`)
      if (!res1.content || !res1.content.includes("success")) {
        createToast("文件复制失败，请确认已开启高级功能且有足够权限", "red", 4000)
        return
      }

      const res2 = await runShellWithRoot(`chmod 777 /data/data/com.minikano.f50_sms/files/uploads/${newFileName} && echo "success" || echo "fail"`)
      if (!res2.content || !res2.content.includes("success")) {
        await runShellWithRoot(`rm -f /data/data/com.minikano.f50_sms/files/uploads/${newFileName}`)
        createToast("文件权限设置失败，请确认已开启高级功能且有足够权限", "red", 4000)
        return
      }

      const { el, close } = createFixedToast("uploading_video_success", `
            <div style="pointer-events: all;">
              链接：（点击复制）<br>
              <b onclick="copyText(event)" style="color:pink">${KANO_baseURL}/uploads/${newFileName}</b>
              <div style="text-align:right;margin-top:6px;">
                  <button style="font-size:.64rem" id="close_upload_vd_btn" data-i18n="close_btn">关闭</button>
              </div>
            </div>
          `)
      document.getElementById("close_upload_vd_btn").onclick = () => {
        close()
      }
    }
  }

  window.openLink = (link) => {
    if (!link) return
    const a = document.createElement('a')
    a.href = link
    a.target = "_blank"
    a.click()
  }

  const btn1 = document.createElement("button")
  btn1.innerHTML = "设置视频地址(非全局)"
  btn1.onclick = async () => {
    const url = prompt("请输入视频地址（非全局）", VIDEO_URL)
    if (url) {
      VIDEO_URL = url
      localStorage.setItem("custom_background_video_url", VIDEO_URL)
      vdse.src = VIDEO_URL
      createToast("视频地址设置成功！刷新页面即可生效", "green", 3000)
    }
  }

  const btn2 = document.createElement("button")
  btn2.innerHTML = "设置视频地址(全局)"

  btn2.onclick = async () => {
    const url = prompt("请输入视频地址（全局）", VIDEO_URL)
    if (url) {
      const res = await saveUrlToDevice(url)
      if (!res) {
        createToast("持久化保存失败", "pink", 3000)
      }
      else {
        VIDEO_URL = url
        localStorage.removeItem("custom_background_video_url")
        vdse.src = VIDEO_URL
        createToast("视频地址设置成功！刷新页面即可生效", "green", 3000)
      }
    }
  }

  const btn3 = document.createElement("button")
  btn3.innerHTML = "取消设置视频(非全局)"
  btn3.onclick = () => {
    let confirmClear = confirm("取消设置视频(非全局)，确定继续？")
    if (!confirmClear) return
    localStorage.removeItem("custom_background_video_url")
    createToast("已取消设置视频(非全局)，刷新页面即可生效", "green", 3000)
  }

  const btn4 = document.createElement("button")
  btn4.innerHTML = "清理高级后台视频缓存"
  btn4.onclick = async () => {
    if (!(await checkAdvanceFunc())) {
      createToast("未开启高级功能！", "red", 4000)
      return
    }
    //警告
    const confirmClear = confirm("清理高级后台视频缓存会删除高级后台缓存的所有视频文件，确定继续？")
    if (!confirmClear) return
    await runShellWithRoot(`rm -f /data/data/com.minikano.f50_sms/files/uploads/minikano_background_video*`)
    await runShellWithRoot(`rm -f /data/data/com.minikano.f50_sms/files/uploads/*.{mp4,mkv,avi,mov,flv,wmv,webm,m4v,3gp,ts}`)
    await saveUrlToDevice("")
    localStorage.removeItem("custom_background_video_url")
    createToast("已清理高级后台视频缓存，刷新页面即可生效", "green", 3000)
  }

  const btn5 = document.createElement("button")
  btn5.innerHTML = "机内文件列表"
  btn5.onclick = async () => {
    const res = await runShellWithUser(`ls /data/data/com.minikano.f50_sms/files/uploads/`)
    if (!res.success) return createToast(t('read_file_fail'), 'red')
    //<button style="margin-right:6px;padding: 0;display: flex;" onclick="downloadUrl('/api/uploads/${item}','${item}')"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" t="1770319174878" viewBox="0 0 1024 1024" version="1.1" p-id="1583" width="20" height="20"><path d="M896 672c-17.066667 0-32 14.933333-32 32v128c0 6.4-4.266667 10.666667-10.666667 10.666667H170.666667c-6.4 0-10.666667-4.266667-10.666667-10.666667v-128c0-17.066667-14.933333-32-32-32s-32 14.933333-32 32v128c0 40.533333 34.133333 74.666667 74.666667 74.666667h682.666666c40.533333 0 74.666667-34.133333 74.666667-74.666667v-128c0-17.066667-14.933333-32-32-32z" fill="var(--dark-text-color)" p-id="1584"/><path d="M488.533333 727.466667c6.4 6.4 14.933333 8.533333 23.466667 8.533333s17.066667-2.133333 23.466667-8.533333l213.333333-213.333334c12.8-12.8 12.8-32 0-44.8-12.8-12.8-32-12.8-44.8 0l-157.866667 157.866667V170.666667c0-17.066667-14.933333-32-32-32s-34.133333 14.933333-34.133333 32v456.533333L322.133333 469.333333c-12.8-12.8-32-12.8-44.8 0-12.8 12.8-12.8 32 0 44.8l211.2 213.333334z" fill="var(--dark-text-color)" p-id="1585"/></svg></button>
    if (res.content && res.content.content && res.content.content.split("\n") && res.content.content.split("\n").length) {
      const { el, close } = createFixedToast('kano_edit_ufi_media_file_list_message', `
                <div style="pointer-events:all;width:90vw;max-width:800px;">
                    <div class="title" style="margin:0">文件列表</div>
                    <div style="margin:10px 0;display: flex;flex-direction: column;gap: 6px;max-height: 50vh;overflow: auto;font-size: .7rem;" class="inner">
                      ${res.content.content.split('\n').map(item => (item.trim() ? `<div class="kano_uploads_file_item" data-item="${item}" style="padding: 10px 10px;background: var(--dark-tag-color);border-radius: 6px;display:flex;align-items: center;">
                      <span onclick="copyText({target:{innerText:'/api/uploads/${item}'}})" style="flex:1;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;">${item}</span>
                      <button style="margin-right:6px;padding: 0;display: flex;" onclick="openLink('/api/uploads/${item}')"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" t="1770319810359" viewBox="0 0 1024 1024" version="1.1" p-id="3490" width="20" height="20"><path d="M942.2 486.2C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3-7.7 16.2-7.7 35.2 0 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM512 766c-161.3 0-279.4-81.8-362.7-254C232.6 339.8 350.7 258 512 258c161.3 0 279.4 81.8 362.7 254C791.5 684.2 673.4 766 512 766z" p-id="3491" fill="var(--dark-text-color)"/><path d="M508 336c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176z m0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z" p-id="3492" fill="var(--dark-text-color)"/></svg></button>
                      <button class="delete_file" style="padding: 0;display: flex;"><svg width="20px" height="20px" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path fill="var(--dark-text-color)" d="M736 352.032L736.096 800h-0.128L288 799.968 288.032 352 736 352.032zM384 224h256v64h-256V224z m448 64h-128V202.624C704 182.048 687.232 160 640.16 160h-256.32C336.768 160 320 182.048 320 202.624V288H192a32 32 0 1 0 0 64h32V799.968C224 835.296 252.704 864 288.032 864h447.936A64.064 64.064 0 0 0 800 799.968V352h32a32 32 0 1 0 0-64z"></path><path fill="var(--dark-text-color)" d="M608 690.56a32 32 0 0 0 32-32V448a32 32 0 1 0-64 0v210.56a32 32 0 0 0 32 32M416 690.56a32 32 0 0 0 32-32V448a32 32 0 1 0-64 0v210.56a32 32 0 0 0 32 32"></path></svg></button></div>` : "")).join('')}
                    </div>
                    <div style="text-align:right">
                        <button style="font-size:.64rem" id="close_edit_media_file_list_message_btn" data-i18n="close_btn">${t('close_btn')}</button>
                    </div>
                </div>
                `)

      //文件列表
      const filesEl = document.querySelectorAll('#kano_edit_ufi_media_file_list_message .kano_uploads_file_item')
      filesEl.forEach(el => {
        let data = el.dataset.item
        if (data && data.trim()) {
          const elBtn = el.querySelector('.delete_file')
          if (!elBtn) return
          let delCountDown = 3
          let delTimer = null
          elBtn.onclick = async () => {
            const delFile = data.trim()
            delCountDown--
            delTimer && clearTimeout(delTimer)
            delTimer = setTimeout(() => {
              delCountDown = 3
            }, 3000);
            if (delCountDown > 0) {
              createToast(`再点 ${delCountDown} 次删除`)
              return
            }
            delCountDown = 3
            try {
              const { result, error } = await (await fetchWithTimeout(`${KANO_baseURL}/delete_img`, {
                method: "POST",
                headers: common_headers,
                body: JSON.stringify({
                  file_name: delFile
                })
              })).json()
              if (result == "success") {
                createToast("删除成功", "pink")
                el.remove()
              } else {
                createToast("删除失败:" + error, "red")
              }
            } catch (e) {
              createToast("删除失败，原因:" + e, "red")
            }
          }
        }
      })
      const btn = el.querySelector('#close_edit_media_file_list_message_btn')
      if (!btn) {
        close()
        return
      }
      btn.onclick = async () => {
        close()
      }
    } else {
      createToast("没有文件", 'pink')
    }
  }

  const btn6 = document.createElement("button")
  btn6.innerHTML = "取消设置视频(全局)"
  btn6.onclick = async () => {
    let confirmClear = confirm("取消设置视频(全局)会删除所有设备设置的全局视频，确定继续？")
    if (!confirmClear) return
    await saveUrlToDevice("")
    createToast("已取消设置视频(全局)，刷新页面即可生效", "green", 3000)
  }

  VIDEO_URL = localStorage.getItem("custom_background_video_url") || VIDEO_URL
  if (VIDEO_URL) localMode = true
  const vdse = document.createElement("video")
  vdse.src = VIDEO_URL
  vdse.muted = true
  vdse.loop = true
  vdse.autoplay = true
  vdse.style.cssText = `position: fixed;
top: 0;
width: 100vw;
height: 100vh;
z-index: -13;
object-fit: cover;`
  document.querySelector("body").appendChild(vdse)
  document.querySelector("body").onclick = () => {
    try {
      vdse.play()
      vdse.muted = !CLICK_TO_UNMUTE
    } catch { }
  }

  const sumBtn = document.createElement("button")
  sumBtn.innerHTML = "背景视频设置"
  sumBtn.onclick = () => {
    let inter = null
    const md = createModal({
      name: "kano_bgvd_menu",
      noBlur: false,
      isMask: false,
      title: "背景视频设置",
      contentStyle: "font-size:.7rem",
      onClose: () => {
        inter && inter()
        return true
      },
      onConfirm: () => {
        inter && inter()
        return true
      },
      content: `
      <style>
        .bgspsz {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }

        @media (min-width:620px) {
            .bgspsz {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        @media (max-width:620px) and (min-width:420px) {
            .bgspsz {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width:420px) and (min-width:10px) {
            .bgspsz {
                grid-template-columns: repeat(1, 1fr);
            }
        }
      </style>
      <div class="bgspsz"></div>
      `
    })

    //appendChild
    document.querySelector(md.id + ' .bgspsz').appendChild(btn)
    document.querySelector(md.id + ' .bgspsz').appendChild(btn0)
    document.querySelector(md.id + ' .bgspsz').appendChild(btn1)
    document.querySelector(md.id + ' .bgspsz').appendChild(btn2)
    document.querySelector(md.id + ' .bgspsz').appendChild(btn3)
    document.querySelector(md.id + ' .bgspsz').appendChild(btn6)
    document.querySelector(md.id + ' .bgspsz').appendChild(btn4)
    document.querySelector(md.id + ' .bgspsz').appendChild(btn5)
    showModal(md.id)
    inter = requestInterval(() => {
      if (md.el) {
        md.el.querySelector(".title > span").textContent = `背景视频设置${localMode ? " (当前:非全局)" : " (当前:全局)"}`
      }
    }, 100)
  }
  document.querySelector(".functions-container .actions-buttons").appendChild(sumBtn)

  //循环等待，直到用户登录成功
  let waitCount = 0
  let waitTimerFn = requestInterval(async () => {
    if (!window.UFI_DATA.loginfo || window.UFI_DATA.loginfo == 'no') return
    if ((VIDEO_URL && VIDEO_URL != "") || localMode) {
      waitTimerFn && waitTimerFn()
      return
    }
    //获取机内配置
    const res = await loadUrlFromDevice()
    console.log("获取到的res:" + res);
    if (res) {
      VIDEO_URL = res
      vdse.src = VIDEO_URL
      vdse.muted = true
      vdse.loop = true
      vdse.autoplay = true
      localMode = false
      waitTimerFn && waitTimerFn()
    } else {
      waitCount++
      if (waitCount >= 4) {
        // 终止timer
        waitTimerFn && waitTimerFn()
        waitCount = 0
      }
    }
  }, 200)
})()
//</script>