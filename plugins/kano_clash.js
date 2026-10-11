// ==UserScript==
// @name         Kano Clash
// @version      1.0.0
// @description  Kano Clash Mihomo-TProxy 内核安装
// ==/UserScript==

(() => {

  const downloadUrl =
    "https://github.com/luxinxin0378-create/ufi-my-store/releases/download/v1.0.0/kano_clash.zip";


  const install = async () => {

    if (typeof runShellWithRoot !== "function") {
      alert("当前环境不支持高级功能");
      return;
    }


    const cmd = `
set -e

rm -rf /tmp/kano_clash
mkdir -p /tmp/kano_clash

cd /tmp/kano_clash

wget -O kano_clash.zip "${downloadUrl}"

unzip -o kano_clash.zip

chmod 755 mihomo-tproxy

# 复制到常用内核目录
mkdir -p /data/adb/mihomo

cp -f mihomo-tproxy /data/adb/mihomo/mihomo-tproxy

chmod 755 /data/adb/mihomo/mihomo-tproxy

rm -rf /tmp/kano_clash

echo "KANO_CLASH_INSTALL_OK"
`;


    try {

      const res = await runShellWithRoot(cmd);

      if (res && res.content && res.content.includes("KANO_CLASH_INSTALL_OK")) {
        alert("Kano Clash 内核安装完成");
      } else {
        alert("安装失败\\n" + (res.content || ""));
      }

    } catch (e) {
      alert("执行错误:\\n" + e);
    }

  };


  if (confirm(
    "Kano Clash\n\nMihomo-TProxy 内核\n\n是否下载安装？"
  )) {
    install();
  }

})();
