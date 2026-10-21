# 全量服务接口

本次新增接口通过 services/index.js 统一返回 Promise，页面不直接读写存储。config/index.js 的 mock 模式当前开启；关闭后未实现的网络适配明确报错。保留本地键 qingdong.phase1.v1，扩展数据置于 full。

| 领域 | 服务文件 | 主要能力 |
| --- | --- | --- |
| 核心 | domain.js / membership.js | 登录档案、签到、日记、识餐、规范权益和幂等扣减 |
| 社区 | community-full.js | 帖子/互动/审核、禁用词、个人服务、注销 |
| 挑战 | challenge-full.js | 小队、体重审核、活动报名核验、榜单归档与结算 |
| 增长 | growth-full.js | AI、广告、支付、订单退款、邀请与导出 |
| 运营 | operations-full.js | 套餐、多档奖励、库存、Banner、营养、档案、补卡及平台设置 |

所有公开函数由上述文件导出的领域对象确定；内部 _hooks 不暴露给页面。写入以单次存储提交，失败不消费额度；requestId 用于识餐和领奖幂等。真实后端必须重新校验登录、角色/城市、同意、奖励资格、限领和库存，提供事务与跨设备幂等保障。

后端任务应替换本地 runChallengeJobs，独立运行月榜冻结和过期自动发奖；本机任务仅在应用打开/写入时运行。敏感提供商凭证应保存在服务端，当前配置页只管理模拟开关。

---

以下保留一期基础接口约定；其中阶段范围限制已被全量对照清单取代。

# 一期接口边界与后端对接建议

本文为前端建议合约，不代表后端已有这些路径。地址、认证、城市 ID、枚举和错误码需要与后端确认。

## 当前架构

页面 → services/index.js（Promise）→ domain.js（模拟命令）→ store.js（本机存储）。challenges.js、membership.js 分别计算活动和权益读模型。

默认 mode: mock，存储键为 qingdong.phase1.v1。其他模式明确报错，真实 wx.request 适配待合约确定。AppSecret、AI 密钥和支付密钥不能放在小程序中。

## 方法与建议路由

| 服务方法 | 建议后端接口 | 返回／行为 |
|---|---|---|
| loginDemo() | POST /auth/wechat/login | 替换为 wx.login code 换会话；手机号按已有平台实现 |
| logout() | POST /auth/logout | 清会话，服务端失效待确认 |
| getSnapshot() | GET /qingdong/home | 日期、个人展示字段、签到、累计天数、今日摘要和活动 |
| saveProfile(input) | PUT /qingdong/profile | nickname、city（生产用 cityId）、height、targetWeight |
| getDiary(date) | GET /qingdong/diary?date= | meals、exercises、weights、summary |
| saveRecord(input) | POST /qingdong/records | type、date 和类型专属字段，返回记录 |
| deleteRecord(id) | DELETE /qingdong/records/:id | 仅能删本人记录 |
| listActivities() | GET /qingdong/activities | 合并总部和本城活动 |
| getActivity(id) | GET /qingdong/activities/:id | 目标、日期、报名、进度、名额、领奖状态 |
| enroll(id) | POST /qingdong/activities/:id/enrollments | 幂等报名和城市快照 |
| checkIn() | POST /qingdong/checkins | 服务端北京时间，一账号一天一次 |
| claimReward(activityId) | POST /qingdong/activities/:id/claims | 幂等发奖，返回流水和授予 ID |
| getRewards() | GET /qingdong/rewards | 本人活动状态与领取流水 |
| getRank() | GET /qingdong/ranks/checkins | 昵称、头像、签到天数和名次，不含原始健康字段 |
| getMembership() | GET /qingdong/membership | 当前授予、时间线和当日已用／剩余 |
| recognizeMeal(input) | POST /qingdong/meals/recognitions | 先上传图片再传文件 ID、requestId，返回结果和日记 ID |
| getPrivacy()/savePrivacy(input) | GET/PUT /qingdong/privacy | publicRank；showPosterWeight 是保留字段，本期无海报 |
| resetDemo() | 无生产路由 | 仅本机重置，不映射生产注销或删号 |

## 字段和规则

日期为北京时间 UTC+8 的 YYYY-MM-DD。权益 start 包含、end 不包含；例如21日领取3天卡，有效至24日00:00。

记录公共字段：id、userId、type、date、createdAt。

- meal：name、kcal、slot（breakfast/lunch/dinner/snack）；识餐额外 source: recognition、imagePath。
- exercise：name、minutes。
- weight：kg。

活动模型：id、title、subtitle、days、start、end、tag、rewardDays、enrolled、progress、progressPercent、remainingSlots、canEnroll、canClaim、claimed、claimDeadline、statusLabel。

模拟规则：报名当日及之后、活动期间的有效签到计进度；活动结束后7天是示例领奖截止。真实策略由后端返回。达标时占位，正式库存、预算和授予由后端原子处理。

会员模型：activeGrant、timeline、used、dailyLimit、remaining、date。授予保存来源、起止日、每日额度，领取先后顺延，一天仅一份生效。

## 错误与幂等

模拟服务返回 Error.message。网络适配需统一映射 code/message/data，区分未登录、未选城、输入无效、重复请求、活动结束、未达标、已领奖、名额不足、奖励过期、额度不足、识餐失败和网络失败。

服务端已执行、客户端超时的操作必须可用同一幂等 ID 重试。真实识餐使用额度预占／确认／释放，前端不裁决额度或先增加权益。

## 模拟边界

本机固定 demo-user；城市为演示清单；榜单伙伴虚构；会员奖励仅本机生效；识餐固定520 kcal，不分析照片。新人3天、每日3次均为演示配置。

生产前需确定授权、合法域名、图片上传保留、退出注销、跨端一致性及错误码。
