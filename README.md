# 轻动 · 区域健康挑战

按 V0.30 原型开发的微信原生小程序一期用户端。当前使用本机模拟数据，不依赖云开发环境或后端接口。

## 运行

1. 开发者工具打开 **E:/qingdong/miniprogram-1**，不要打开其内部 miniprogram 子目录。
2. 保留已有 AppID，点击「编译」。无需部署云函数或构建 npm。
3. 首页选择城市或进入「我的」，使用模拟账号，填写昵称并确认城市。
4. 「挑战」报名一天目标活动 → 回首页签到 → 返回详情领奖 → 查看会员权益。
5. 日记中记录饮食、运动、体重；拍照记餐选择照片体验固定模拟样例。

首次登录赠送一次 3 天体验卡，每日 3 次模拟识餐；活动奖励接在已有权益后生效。识餐不分析图片、不上传照片。所有权益和榜单均为演示数据。

## 页面与源码

- 首页：签到、今日摘要、拍照记餐、活动推荐。
- 健康日记：按日期查看、新增和删除饮食／运动／体重记录。
- 挑战：活动详情、报名、累计进度、奖励领取、打卡榜。
- 我的：档案、会员权益、奖励流水、隐私与数据重置。

源码位于 miniprogram-1/miniprogram/。原 cloudfunctions、pages/example 和云开发素材保留，但不在业务入口注册，不会启动云开发。

## 验证

需要 Node.js 20 或更新版本，本机使用 24.19.0。

```powershell
node --test tests/*.test.cjs
node scripts/check-miniprogram.cjs
```

本机 PowerShell 若没有 Node PATH，可使用 Codex 自带 Node：

```powershell
& "C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe" --test tests/*.test.cjs
```

可选的微信独立编译器检查：

```powershell
node scripts/check-miniprogram.cjs --wechat-compiler "E:/Program Files (x86)/Tencent/微信web开发者工具/resources/app.asar.unpacked/node_modules/wcc-exec"
```

见 [验收记录](docs/miniprogram-acceptance.md) 和 [接口说明](docs/miniprogram-api.md)。

## 后续对接

页面仅通过 services/index.js 调用业务服务。配置默认为 mock；真实网络适配尚未实现，其他模式明确报错，不能只改 URL 就接生产。

一期不包含真实微信登录、手机号、支付、广告、小队、体重榜结算、论坛或运营后台。接口就绪后逐批替换模拟服务，签到、奖励、会员和额度以服务端结果为准。
