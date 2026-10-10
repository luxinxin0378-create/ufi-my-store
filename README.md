# UFI-TOOLS 自建插件商店

这是一个兼容 UFI-TOOLS 自定义插件源 JSON 规范的静态插件仓库。

## 插件源地址

客户端自定义插件仓库填写：

`https://raw.githubusercontent.com/luxinxin0378-create/ufi-my-store/main/index.json`

## 添加插件

1. 将插件 `.js` 文件上传到 `plugins/` 目录。
2. 编辑根目录 `index.json`，在 `res.data.content` 数组中添加插件条目，`name` 必须与文件名完全一致。
3. 保存后，客户端重新加载插件商店。

示例条目：

```json
{
  "name": "hello.js",
  "modified": "2026-10-10T00:00:00+08:00",
  "hash_info": { "md5": "" },
  "size": 0,
  "is_dir": false
}
```

下载地址由 `download_url + "/" + name` 拼接。当前列表为空，上传插件后再添加对应条目。
