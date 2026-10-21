const test = require("node:test");
const assert = require("node:assert/strict");
const { setup } = require("./helpers.cjs");
test("full operation configuration is role guarded and catalog changes persist", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  assert.throws(
    () => d.saveCatalogPlan({ name: "体验", days: 3, dailyLimit: 3, price: 0 }),
    /权限/,
  );
  d.setDemoRole("hq");
  const plan = d.saveCatalogPlan({
    name: "城市体验卡",
    days: 5,
    dailyLimit: 4,
    price: 0,
    features: ["photo", "adFree"],
    enabled: true,
  });
  assert.equal(d.getCatalog().find((p) => p.id === plan.id).dailyLimit, 4);
  assert.throws(() => d.saveCatalogPlan({ name: "", days: 0, dailyLimit: 3 }));
  d.setDemoRole("consumer");
  assert.throws(() => d.getOperationsDashboard(), /权限/);
});
test("multi-tier reward activity publication, eligibility and issuance are idempotent", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.setDemoRole("hq");
  const plan = d.getCatalog()[0];
  const a = d.saveRewardActivity({
    title: "累计签到赠卡",
    type: "checkin",
    city: "温州",
    start: "2026-10-01",
    end: "2026-11-01",
    claimUntil: "2026-11-08",
    published: true,
    tiers: [
      {
        name: "第一档",
        target: 1,
        quota: 10,
        planId: plan.id,
        rewardType: "member",
      },
    ],
  });
  d.setDemoRole("consumer");
  d.checkIn();
  const tasks = d.getRewardTasks();
  const own = tasks.find((x) => x.id === a.id);
  assert.equal(own.tiers[0].canClaim, true);
  const r = d.claimTaskReward({ activityId: a.id, tierId: own.tiers[0].id });
  const again = d.claimTaskReward({
    activityId: a.id,
    tierId: own.tiers[0].id,
  });
  assert.equal(r.id, again.id);
  d.setDemoRole("hq");
  assert.equal(
    d.getRewardLedger().filter((r) => r.activityId === a.id).length,
    1,
  );
});
test("banner publication, discussion and health settings have persistent round trips", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.setDemoRole("hq");
  const b = d.saveBanner({
    title: "欢迎轻动",
    kind: "page",
    target: "/pages/forum/index",
    enabled: true,
    sort: 2,
  });
  assert.ok(d.getHomeBanners().some((x) => x.id === b.id));
  d.saveHealthSettings({
    trialDays: 5,
    trialDaily: 4,
    lowAdvice: "规律三餐",
    normalAdvice: "保持多样",
    highAdvice: "均衡饮食",
  });
  assert.equal(d.getHealthSettings().trialDaily, 4);
  d.saveDiscussion({
    id: "tie",
    choice: "并列扩奖，提前准备额外库存",
    note: "已讨论",
  });
  assert.equal(d.getDiscussions().find((x) => x.id === "tie").note, "已讨论");
  d.deleteBanner(b.id);
  assert.ok(!d.getHomeBanners().some((x) => x.id === b.id));
});
test("post-event claims still reserve stock and cannot oversell a one-slot tier", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.setDemoRole("hq");
  const plan = d.getCatalog()[0];
  const a = d.saveRewardActivity({
    title: "已结束可领取",
    type: "checkin",
    city: "温州",
    start: "2026-10-01",
    end: "2026-10-20",
    claimUntil: "2026-10-30",
    published: true,
    tiers: [
      {
        name: "一份库存",
        target: 1,
        quota: 1,
        perUserLimit: 3,
        planId: plan.id,
        rewardType: "member",
      },
    ],
  });
  const state = f.store.read();
  state.checkins.push({ userId: "demo-user", date: "2026-10-19" });
  f.store.write(state);
  d.setDemoRole("consumer");
  const request = {
    activityId: a.id,
    tierId: a.tiers[0].id,
    requestId: "first",
  };
  const first = d.claimTaskReward(request);
  assert.equal(d.claimTaskReward(request).id, first.id);
  assert.throws(
    () => d.claimTaskReward({ ...request, requestId: "second" }),
    /名额/,
  );
  d.setDemoRole("hq");
  assert.equal(
    d.getRewardLedger().filter((r) => r.activityId === a.id).length,
    1,
  );
});
