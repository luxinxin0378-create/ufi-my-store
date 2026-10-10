<script>
(() => {
    // 检测ROOT高级权限通用函数
    const checkAdvanceFunc = async () => {
        const res = await runShellWithRoot('whoami');
        return res.content?.includes('root') ?? false;
    };
    (async () => {
        const wait = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));
        // 等待页面主功能容器加载完成
        let mainContainer = document.querySelector('.functions-container');
        while (!mainContainer) await wait();
        // 插入独立【ADB小工具】折叠板块（单独目录）
        mainContainer.insertAdjacentHTML('afterend', `
<div id="test_block_wrap" style="width:100%;margin-top:12px;">
    <!-- 标题 + 折叠开关 -->
    <div class="title" style="margin:8px 0;">
        <strong>ADB小工具</strong>
        <div style="display:inline-block;" id="test_collapse_btn"></div>
    </div>
    <!-- 折叠容器，默认收起 -->
    <div class="collapse" id="test_collapse_box" data-name="close" style="height:0;overflow:hidden;">
        <div class="collapse_box">
            <!-- 所有功能按钮存放区域 -->
            <div id="test_btn_group" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px;"></div>
        </div>
    </div>
</div>
        `);
        // 获取按钮容器
        const btnBox = document.querySelector('#test_btn_group');
        // 按钮1：无线ADB开启
        const btnAdb = document.createElement('button');
        btnAdb.textContent = "开启无线ADB";
        btnAdb.onclick = async () => {
            if (!(await checkAdvanceFunc())) {
                return createToast("没有开启高级功能，无法使用！", "red");
            }
            try {
                createToast("正在开启ADB...");
                await runShellWithRoot("setprop service.adb.tcp.port 5555");
                let usbMode = (await runShellWithRoot("getprop sys.usb.config")).content.trim();
                if (!usbMode.includes("adb")) {
                    await runShellWithRoot(`setprop sys.usb.config ${usbMode},adb`);
                }
                await runShellWithRoot("stop adbd && start adbd");
                createToast("有线+无线ADB已开启，端口5555", "green");
            } catch (err) {
                createToast("ADB开启失败", "red");
            }
        };
        btnBox.appendChild(btnAdb);
        // 新增：测试adb权限
        const btnTestAdb = document.createElement('button');
        btnTestAdb.textContent = "测试ADB权限";
        btnTestAdb.onclick = async () => {
            if (!(await checkAdvanceFunc())) {
                return createToast("没有开启高级功能，无法使用！", "red");
            }
            try {
                // 读取ADB端口和USB状态判断是否可用
                const port = (await runShellWithRoot("getprop service.adb.tcp.port")).content.trim();
                const usbCfg = (await runShellWithRoot("getprop sys.usb.config")).content.trim();
                const adbdPid = (await runShellWithRoot("pgrep adbd")).content.trim();
                let msg = "";
                if (port === "5555") msg += "✅无线ADB端口5555已开启\n";
                else if (port === "0") msg += "❌无线ADB已关闭\n";
                else msg += `⚠️无线端口：${port}\n`;
                if (usbCfg.includes("adb")) msg += "✅有线USB ADB已启用\n";
                else msg += "❌有线USB ADB未启用\n";
                if (adbdPid) msg += "✅adbd服务正在运行";
                else msg += "❌adbd服务未启动";
                createToast(msg, "green");
            } catch (err) {
                createToast("检测ADB状态失败", "red");
            }
        };
        btnBox.appendChild(btnTestAdb);
        // 按钮2：修改分辨率（原投屏适配）
        const btnScreen = document.createElement('button');
        btnScreen.textContent = "修改分辨率";
        btnScreen.onclick = async () => {
            if (!(await checkAdvanceFunc())) {
                return createToast("没有开启高级功能，无法使用！", "red");
            }
            try {
                await runShellWithRoot("wm size 1080x1920");
                createToast("已设置分辨率1080x1920", "green");
            } catch (err) {
                createToast("分辨率修改失败", "red");
            }
        };
        btnBox.appendChild(btnScreen);
        // 按钮3：恢复原生分辨率
        const btnResetScreen = document.createElement('button');
        btnResetScreen.textContent = "恢复屏幕默认";
        btnResetScreen.onclick = async () => {
            if (!(await checkAdvanceFunc())) {
                return createToast("没有开启高级功能，无法使用！", "red");
            }
            try {
                await runShellWithRoot("wm size reset");
                createToast("已恢复设备原生分辨率", "green");
            } catch (err) {
                createToast("重置分辨率失败", "red");
            }
        };
        btnBox.appendChild(btnResetScreen);
        // 按钮4：关闭ADB调试
        const btnCloseAdb = document.createElement('button');
        btnCloseAdb.textContent = "关闭ADB";
        btnCloseAdb.onclick = async () => {
            if (!(await checkAdvanceFunc())) {
                return createToast("没有开启高级功能，无法使用！", "red");
            }
            try {
                await runShellWithRoot("setprop service.adb.tcp.port 0");
                let usbMode = (await runShellWithRoot("getprop sys.usb.config")).content.trim();
                let newMode = usbMode.replace(/,?adb/g, '');
                await runShellWithRoot(`setprop sys.usb.config ${newMode}`);
                await runShellWithRoot("stop adbd");
                createToast("ADB调试已全部关闭", "green");
            } catch (err) {
                createToast("关闭ADB失败", "red");
            }
        };
        btnBox.appendChild(btnCloseAdb);
        // 绑定页面自带折叠开关（小三角开关）
        collapseGen('#test_collapse_btn', '#test_collapse_box', '#test_collapse_box', (status) => {
            if (status === "open") {
                // 展开时可执行操作，这里留空
            } else {
                // 收起时可清理内容，这里留空
            }
        });
    })();
})();
</script>