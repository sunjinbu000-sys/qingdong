# 轻动小程序一期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 按 V0.30 原型完成可独立体验、后续接真实后端的一期用户端小程序。
**Architecture:** 微信原生 JavaScript。页面通过异步业务服务访问集中 mock 数据和本地存储；日期、签到、活动、奖励、额度规则在可测试的独立模块中实现。普通用户功能适配手机布局，运营后台不进入小程序。
**Tech Stack:** WXML、WXSS、JavaScript CommonJS、微信本地存储、Node 内置 node:test；不增加产品运行依赖。
**Spec:** E:/qingdong/docs/superpowers/specs/2026-10-21-qingdong-miniprogram-design.md（用户已于 2026-10-21 确认）。

## Global Constraints
- 底部四个入口：首页、健康日记、挑战、我的。
- 沿用原型深绿 #143f35、主绿 #1d6651、浅绿 #d4ed9c、背景 #f6f7f2、圆角卡片和温暖的鼓励文案。
- 后端开发期间可以通过模拟数据完整体验，后续替换为真实接口。
- 签到按账号和北京时间日期防重；活动报名防重；进度按不同日期的有效签到计算。
- 模拟识餐明确说明不分析图片；相册取消不扣额度，失败不扣额度，成功结果与日记关联。
- 隐私公开开关默认关闭，榜单不显示原始体重与饮食照片。
- 工具无法执行的平台验证须如实列为待验，不能用静态检查代替编译通过结论。

## Review Focus
1. 北京时间午夜切日与历史日期：日期不随电脑时区漂移，不能给未来日期记录或补签到。
2. 连点、重入页面和重启：报名、签到、奖励不重复，持久化状态保持一致。
3. 活动未报名、已结束、奖励名额耗尽：按钮与实际 mock 规则一致。
4. 选图取消、识餐失败和额度耗尽：不错误扣次，不产生重复日记。
5. 无记录、存储异常、模拟退出及重置：页面可恢复，不泄露上一账号私有记录。

## 文件职责与接口约定
产品路径基于 miniprogram-1/miniprogram/。现有 app.js、app.json、app.wxss 和 pages/index/index.* 改为业务入口。新增 pages/health、pages/challenges、pages/profile 四栏对应页面，以及 pages/activity、pages/rank、pages/records、pages/account、pages/photo、pages/rewards、pages/membership、pages/privacy 各页面目录（每页 index.js/json/wxml/wxss）。
config/index.js：mode='mock'、baseUrl 空值；真实模式未配置时明确报错。
utils/date.js：bizDate(timestamp=Date.now()): string、shiftDate(date,days): string，北京时间 YYYY-MM-DD。
services/store.js：createStore(storage): {read(),write(state),reset()}；storage 提供 get/set，微信实现包裹同步存储，测试用内存实现；写失败保留旧状态并向页面报错。
services/seed.js：createSeed(date): State；活动周期相对当前日期生成，模拟账号 demo-user，初始未登录、未确认城市、公开开关全关。
services/domain.js：createDomain({store,now}): Domain；now 返回时间戳，所有业务日期使用 bizDate(now())。
services/index.js：导出 service，包装 domain 方法为 Promise；页面不直接访问存储。统一错误对象含 code/message。
State：version、session、profile、privacy、records、checkins、activities、enrollments、claims、grants、recognitions。健康记录归属账号，重置清空全部演示状态。
Domain 方法：getSnapshot()、loginDemo()、logout()、saveProfile(input)、getDiary(date)、saveRecord(input)、deleteRecord(id)、listActivities()、getActivity(id)、enroll(id)、checkIn()、claimReward(activityId)、getRank()、getMembership()、recognizeMeal({imagePath,requestId})、savePrivacy(input)、resetDemo()。写操作成功后由页面重新拉取快照，跨栏 onShow 刷新。
首次模拟登录赠送一份 3 天、每日 3 次的演示权益，仅发一次；演示活动设置累计签到 1 天、3 天、7 天三种目标，保证新用户可验证当天领奖。规则为 mock 合约示例，后续由真实接口替换；已报名活动仅累计报名当日及之后、活动周期内的有效签到。领奖授予 3 天、每日 3 次演示权益，接在既有时间线后。无有效权益时不能模拟识餐。

## Task 1: 基础数据服务与首页导航
**Files:** 新增 config/index.js、utils/date.js、services/store.js、services/seed.js、services/domain.js、services/index.js；修改 app.*、project.config.json、pages/index/index.*；新增 health/challenges/profile 页面；新增 tests/core.test.cjs。
**Interfaces:** 产出 bizDate、shiftDate、createStore、createSeed、createDomain 和 getSnapshot；其余任务扩展同一 Domain。getSnapshot 返回当前用户、城市、今日签到、日记汇总和模拟标识。
- [x] 编写日期与存储测试：UTC 2026-10-21T15:59:59Z 为 2026-10-21，16:00Z 为 2026-10-22；shiftDate('2026-12-31',1) 为 2027-01-01；新 store 读到已写状态，写失败旧状态不变。
- [x] 运行 node --test tests/core.test.cjs，确认缺少模块导致失败。
- [x] 实现上述模块与四栏导航；app 启动不调用 wx.cloud.init；首页按原型实现品牌、签到卡、健康摘要、识餐与推荐活动入口。四栏首屏均有可用内容。
- [x] 运行核心测试及 node --check 检查新增 JS；检查 app.json 四栏均注册。
- [x] 提交 feat: add qingdong app shell and mock services。

## Task 2: 账号、城市、健康日记
**Files:** 扩展 services/domain.js；实现 health/profile/account/records 页面；新增 tests/diary.test.cjs。
**Interfaces:** loginDemo()、logout()、saveProfile({nickname,city,height,targetWeight})；getDiary(date) 返回 meals/exercises/weights/summary；saveRecord({type,date,...fields})、deleteRecord(id)。饮食 kcal>0，运动 minutes>0，体重 kg>0，数值必须有限；记录日期不得晚于当日。按账号隔离记录。
- [x] 编写测试：未登录不能写记录；合法三类记录可保存和删除；未来日期、空值、NaN、负值被拒绝；退出保留但不暴露私有记录；同账号再次登录恢复记录；模拟新人权益仅一次。
- [x] 运行 node --test tests/diary.test.cjs，确认新业务测试失败。
- [x] 完成模拟登录说明、首次城市确认、档案表单、日期选择与记录表单；饮食按早餐/午餐/晚餐/加餐分组。记录成功刷新首页和日记，删除需确认。
- [x] 运行核心与日记测试，检查 JSON 和 JS 语法；在可用的开发者工具中检查表单、空态和重启恢复。
- [x] 提交 feat: add account and health diary flows。

## Task 3: 活动、签到、奖励与榜单
**Files:** 实现 challenges/activity/rank/rewards 页面；扩展首页签到和 domain；新增 tests/challenge.test.cjs。
**Interfaces:** listActivities/getActivity 返回报名、进度、奖励剩余和可执行状态；enroll(id)、checkIn()、claimReward(activityId)；getRank() 返回模拟公开昵称、头像、打卡天数及本人授权状态，不含健康明细。
- [x] 编写测试：同日签到两次只记一天；重复报名不重复创建；报名之前和周期以外的签到不计进度；跨日签到正确累计；未达标、活动结束不能报名、奖励已过期及名额耗尽不能领取；重复领奖仅一次授予；未授权账号不进入公开榜。
- [x] 运行 node --test tests/challenge.test.cjs，确认未实现规则导致失败。
- [x] 完成活动卡片、详情、报名、进度条和领奖；签到后所有关联页面 onShow 刷新；规则和错误说明与 domain 一致。榜单为展示用途，明确模拟数据。
- [x] 运行所有已有测试，按 1 天目标活动走通登录、选城、报名、签到、领奖和重启恢复流程。
- [x] 提交 feat: add challenge check-in and reward flows。

## Task 4: 模拟识餐与会员额度
**Files:** 实现 photo/membership 页面；扩展 domain；新增 tests/membership.test.cjs。
**Interfaces:** getMembership() 返回 activeGrant、timeline、dailyLimit、used、remaining；recognizeMeal({imagePath,requestId}) 返回标注模拟的识别记录及饮食记录 ID。重复 requestId 返回同一结果不重复扣次；临时图片必须复制到持久位置后才提交数据，保存图片失败不扣次。
- [x] 编写测试：额度随北京时间切日重置；权益过期不能识餐；失败不扣额度；成功仅扣一次并新增一笔日记；同 requestId 重试无额外扣次；奖励权益排在现有权益之后。
- [x] 运行 node --test tests/membership.test.cjs，确认新规则测试失败。
- [x] 用微信选图接口实现相机/相册选择、处理中、成功与失败；取消直接返回；显著说明结果为固定模拟样例。按当前北京时间归入早餐 05:00–10:59、午餐 11:00–15:59、晚餐 16:00–22:59，其余为加餐。实现权益卡、时间线和额度耗尽反馈。
- [x] 运行全部业务测试；用开发者工具或真机检查选图取消和图片持久化，无法执行的项目写入验收待办。
- [x] 提交 feat: add mock meal recognition and membership。

## Task 5: 隐私、异常恢复和交付验证
**Files:** 实现 privacy 页面；完善各页交互；新增 scripts/check-miniprogram.cjs、tests/privacy.test.cjs、docs/miniprogram-api.md；更新根 README.md、miniprogram-1/README.md。
**Interfaces:** savePrivacy({publicRank,showPosterWeight}) 只保存允许字段；resetDemo() 清空并返回初始未登录状态。请求适配边界在 services/index.js，真实接口文档使用建议路由并明确待后端确认。
- [x] 编写测试：公开开关默认全关；关闭公开榜后本人从榜单移除；重置后所有健康记录、报名、奖励和额度消耗被清空；存储错误传播可恢复反馈。
- [x] 运行对应测试确认失败，再实现隐私页、清理演示数据和统一错误/重试/空态；删除示例页面注册和业务 UI 内的云开发入口，保留无引用示例文件以免无关删除。
- [x] 实现静态检查：所有 JSON 可解析、注册页面四文件存在、tabBar 页面已注册、所有 JS 可通过 node --check。运行 node scripts/check-miniprogram.cjs 和 node --test tests/*.test.cjs，预期均通过。
- [x] 文档说明开发者工具打开 E:/qingdong/miniprogram-1、mock 使用与重置方法、接口方法/建议字段/状态码、平台手工验收清单。检查无新增密钥或依赖目录。
- [x] 可用时执行微信开发者工具编译及真机操作；记录实际已验和待验项。交付前核对 git diff，提交 feat: complete qingdong phase-one prototype。沿用现有仓库的提交管理；推送前确认既有用户授权范围及远程状态，不覆盖远程变更。

## 计划自审
范围覆盖：首页四栏对应任务1；账号与日记对应任务2；活动签到奖励榜单对应任务3；会员识餐对应任务4；隐私、错误恢复和联调文档对应任务5。接口在同一 Domain 上逐步扩展，没有两个互相竞争的状态源。所有五项 Review Focus 均有对应任务的测试或微信平台手工验收。未把真实身份认证、识餐服务、支付和活动发奖承诺为已接入功能。

## 执行方式与确认
建议由当前会话直接逐项实施（Native），任务共享同一数据服务，连续实现更容易保持接口一致。执行前请用户审阅本计划并确认；这是实施计划确认，不重新讨论已确认的设计范围。
