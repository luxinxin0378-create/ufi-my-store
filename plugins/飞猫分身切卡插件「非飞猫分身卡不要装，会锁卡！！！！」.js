<script>
    (() => {
        const btns = document.createElement('button')
        btns.textContent = '飞猫分身卡'
        btns.onclick = () => {
            const { el, close } = createFixedToast('kano_help_message', `
                    <div style="pointer-events:all;width:80vw;max-width:300px">
                        <div class="title" style="margin:0" data-i18n="system_notice">飞猫分身卡</div>
                        <div style="margin:6px 0;font-size:.65rem"><i>不是飞猫分身卡不要点，PIN码错误会锁卡！！！</i></div>
                        <div style="margin:10px 0;display: flex;justify-content: space-around;" class="fmsim_content"></div>
                        <div style="text-align:right">
                            <button style="font-size:.64rem" id="close_fmsim_btn" data-i18n="close_btn">${t('close_btn')}</button>
                        </div>
                    </div>
                    `)
            const btn = el.querySelector('#close_fmsim_btn')
            
            const switch_CMCC = document.createElement('button')
            const switch_UN = document.createElement('button')
            const switch_CT = document.createElement('button')

            const switchSimCard = debounce(async (code) => {
                if (!code) return
                try {
                    const { result } = await (await postData(await login(), {
                        "goformId": "ENABLE_PIN",
                        "OldPinNumber": code
                    })).json()
                    if (result == "success") {
                        createToast('切换成功', 'green')
                    } else {
                        createToast('切换失败', 'red')
                    }
                } catch {
                    createToast('切换失败', 'red')
                } finally {
                    switch_CMCC.disabled = false
                    switch_CT.disabled = false
                    switch_UN.disabled = false
                    switch_CMCC.style.background = ''
                    switch_CT.style.background = ''
                    switch_UN.style.background = ''
                }
            }, 1000)

            switch_CMCC.textContent = '切换移动'
            switch_CMCC.onclick = async () => {
                createToast('切换中...')
                switch_UN.disabled = true
                switch_CT.disabled = true
                switch_UN.style.background = 'var(--dark-btn-disabled-color)'
                switch_CT.style.background = 'var(--dark-btn-disabled-color)'
                switchSimCard('0200')
            }

            switch_UN.textContent = '切换联通'
            switch_UN.onclick = async () => {
                createToast('切换中...')
                switch_CMCC.disabled = true
                switch_CT.disabled = true
                switch_CMCC.style.background = 'var(--dark-btn-disabled-color)'
                switch_CT.style.background = 'var(--dark-btn-disabled-color)'
                switchSimCard('0100')
            }

            switch_CT.textContent = '切换电信'
            switch_CT.onclick = async () => {
                createToast('切换中...')
                switch_CMCC.disabled = true
                switch_UN.disabled = true
                switch_CMCC.style.background = 'var(--dark-btn-disabled-color)'
                switch_UN.style.background = 'var(--dark-btn-disabled-color)'
                switchSimCard('0300')
            }

            const fmsim_content = el.querySelector('.fmsim_content')

            fmsim_content.appendChild(switch_CMCC)
            fmsim_content.appendChild(switch_UN)
            fmsim_content.appendChild(switch_CT)

            if (!btn) {
                close()
                return
            }
            btn.onclick = async () => {
                close()
            }
        }
        const collapseBtn_menu = document.querySelector('#collapseBtn_menu')
        collapseBtn_menu.nextElementSibling.querySelector('.collapse_box').appendChild(btns)
    })()
</script>