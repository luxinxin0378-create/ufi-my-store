// ==UserScript==
// @name         Kano Clash
// @version      1.0.0
// @description  Kano Clash 离线安装包
// ==/UserScript==

(() => {

  const downloadUrl =
    "https://github.com/luxinxin0378-create/ufi-my-store/releases/download/v1.0.0/kano_clash.zip";

  const install = async () => {

    if (typeof runShellWithRoot !== "function") {
      alert("当前环境不支持安装");
      return;
    }

    const cmd = `
mkdir -p /tmp/kano_clash &&
cd /tmp/kano_clash &&
wget -O kano_clash.zip "${downloadUrl}" &&
unzip -o kano_clash.zip -d / &&
rm -rf /tmp/kano_clash
`;

    const res = await runShellWithRoot(cmd);

    if (res && res.content) {
      alert("安装完成");
    } else {
      alert("安装失败");
    }
  };


  if (confirm(
    "Kano Clash\n\n版本: 1.0.0\n\n是否下载安装？"
  )) {
    install();
  }

})();
