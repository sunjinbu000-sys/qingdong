# V0.30 原型全量对照

以《轻动演示-V0.30.html》的最终覆盖逻辑为准，本清单取代一期范围限制。33 个主模块映射到 58 个原生页面，页面拆分用于详情、编辑和审核流程。布局使用小程序导航和表单控件，交互与数据当前在本机模拟。

首页八个快捷入口展示主要板块；“全部功能”列出所有模块；“全部功能 → 切换身份”进入模拟运营工作台。查看总部配置请先登录，再切换总部身份。身份切换仅用于本机演示。

| 原型模块 ID | 模块 | 原生入口 | 类型 |
| --- | --- | --- | --- |
| accountCenter | 我的个人服务 | `/pages/personal-services/index` | 用户端 |
| platformOps | 平台运营管理 | `/pages/platform-ops/index` | 运营端 |
| publicProfile | 轻友公开主页 | `/pages/public-profile/index` | 用户端 |
| teamInvite | 加入小队邀请 | `/pages/team-invite/index` | 用户端 |
| aiPlan | 我的减肥计划 | `/pages/ai-plan/index` | 用户端 |
| aiOps | AI 接口配置 | `/pages/ai-config/index` | 运营端 |
| paymentOps | 支付配置 | `/pages/payment-config/index` | 运营端 |
| adsOps | 腾讯广告配置 | `/pages/ads-config/index` | 运营端 |
| plaza | 发现活动，和伙伴一起参与 | `/pages/events/index` | 用户端 |
| bannerOps | 让首页图片，连接更多内容 | `/pages/banner-ops/index` | 运营端 |
| templateOps | 所有会员权益，共用一份套餐池 | `/pages/catalog/index` | 运营端 |
| rewardLedger | 每一笔奖励，都有清楚的去向 | `/pages/reward-ledger/index` | 运营端 |
| myRewards | 我的奖励，每一份都有记录 | `/pages/rewards/index` | 用户端 |
| invite | 好习惯，值得邀请好友一起 | `/pages/invite/index` | 用户端 |
| inviteOps | 让每一次成功邀请，都有清楚的奖励 | `/pages/reward-ops/index?type=invite` | 运营端 |
| inviteRegister | 欢迎加入，一起认真记录生活 | `/pages/invite-register/index` | 用户端 |
| rewardOps | 让活动奖励，汇入同一份会员权益 | `/pages/reward-ops/index` | 运营端 |
| rewardTasks | 每一次达标，都有轻盈奖励 | `/pages/reward-tasks/index` | 用户端 |
| wordOps | 让每一条评论，都安心交流 | `/pages/word-ops/index` | 运营端 |
| forum | 轻友论坛，一起记录生活 | `/pages/forum/index` | 用户端 |
| membership | 轻盈会员，让坚持不断累积 | `/pages/membership/index` | 用户端 |
| communityOps | 让分享安心，让权益清楚 | `/pages/forum-ops/index` | 运营端 |
| settings | 把识餐权益与健康服务配置好 | `/pages/settings/index` | 运营端 |
| profile | 我的每一份坚持，都在这里 | `/pages/profile/index` | 用户端 |
| photo | 把这一餐，装进日记 | `/pages/photo/index` | 用户端 |
| activities | 和同城伙伴，一起出发 | `/pages/events/index` | 用户端 |
| privacy | 安心记录，自在分享 | `/pages/privacy/index` | 用户端 |
| health | 我的饮食与健康日记 | `/pages/health/index` | 用户端 |
| home | 每一份坚持，都算数 | `/pages/index/index` | 用户端 |
| rank | 每一份努力，都有回响 | `/pages/rank/index` | 用户端 |
| weight | 记录变化，也守护真实 | `/pages/weight/index` | 用户端 |
| admin | 为坚持，准备一份奖励 | `/pages/prize-ops/index` | 运营端 |
| discuss | 把问题聊透，再一起出发 | `/pages/discussion/index` | 运营端 |

## 已连接的流程

- 社区：发布、草稿、图片、审核、匿名评论/回复、收藏、点赞、举报、拉黑与个人主页。禁用词归一化、分类维护和 CSV 导入。
- 健康：日记、拍照样例、照片历史、营养汇总、日历、原型食物/食谱/MET 运动模型、档案、目标和饮食限制。
- 小队：创建、申请/邀请、审核、转让、退出、有效成员时段任务与同时参加多个小队。
- 体重/榜单：来源记录、初审、申诉复核、独立减重公开开关、城市/全国/月度榜、历史归档、奖品及逾期自动结算。
- 活动：城市/总部活动、自定义报名字段、容量、核验条件、退出取消与多种奖励。
- 奖励：八类活动、1–10 档、限领、库存占位、过期、统一流水、权益顺延、撤销和实物履约。邀请和视频进度连接统一活动奖励。
- AI：1–1096 天本地样例计划、餐次调整、任务设置与完成、历史、文本/XLSX 导出、提供商/额度/日志配置。
- 增长：邀请绑定与海报二维码、模拟视频完整播放计次、模拟订单/退款、支付和广告配置。
- 个人服务：订单、消息、收藏、提醒、隐私、补卡、徽章、分享海报和注销。
- 运营：套餐、奖励活动、Banner、社区、禁用词、风险、审核、客服公告、讨论清单与导出。

## 外部能力边界

当前未接后端。AI/识餐为固定或规则生成的本地样例；支付、退款、广告播放、体脂秤和访客注册均是模拟；二维码承载演示路径，并非正式微信小程序码。提醒生成本地消息，未发送微信订阅消息。运营权限是本地演示权限，正式权限、库存并发、数据一致性和定时任务由后端实现。

首页、档案等页面直接体现数据变化；原有本地数据键保留。正式接口适配点见 miniprogram-api.md。
