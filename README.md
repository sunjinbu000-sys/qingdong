# 轻动 · 微信小程序

依据《轻动演示-V0.30.html》实现的微信原生小程序，覆盖 33 个原型模块、58 个页面。后端开发期间使用持久化本地模拟数据。

## 运行

1. 微信开发者工具打开 **E:/qingdong/miniprogram-1**，保留已有 AppID，点击“编译”。无需构建 npm 或部署云函数。
2. 登录模拟账号，填写昵称并确认城市。首页可直接进入社区、小队、体重、AI、活动、邀请和徽章。
3. 点击首页“全部功能”查看完整目录；其中“切换身份”可体验运营、总部、审核员和监督员流程。
4. 若要重新体验首次登录，在隐私页重置演示数据。此操作清除本机演示记录。

## 对照与验证

- [33 个原型模块对照](docs/prototype-coverage.md)
- [验收流程和验证边界](docs/miniprogram-acceptance.md)
- [服务接口与后端接入](docs/miniprogram-api.md)
- [部分页面预览](docs/previews/full-prototype.png)（编译后的页面结构在浏览器中排版检查）

运行自动检查：

```powershell
node --test tests/*.test.cjs
node scripts/check-miniprogram.cjs
```

当前 AI、识餐、支付、广告、奖励和审核全部为本地模拟，不发生真实扣款或发奖。微信登录、服务端 API、真实 AI、支付、广告和订阅消息需要后续联调。原 cloudfunctions 和未注册的 example 页面保留。
