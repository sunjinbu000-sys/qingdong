const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createGrowthFullDomain,
} = require("../miniprogram-1/miniprogram/services/growth-full");
function fixture() {
  let state = {
    session: { userId: "me" },
    profile: { city: "杭州", height: 170 },
    full: { profileExtra: { age: 30, restrictions: ["鸡蛋"] } },
    grants: [],
    recognitions: [],
    records: [
      { id: "w", userId: "me", type: "weight", kg: 75, date: "2026-10-21" },
    ],
    messages: [],
    audit: [],
  };
  let seq = 0;
  const ctx = {
    read: () => structuredClone(state),
    change(fn) {
      const s = structuredClone(state);
      const r = fn(s);
      state = s;
      return r;
    },
    today: () => "2026-10-21",
    now: () => 1792540800000,
    id: (p) => p + ++seq,
    requireLogin(s) {
      if (!s.session) throw Error("登录");
      return s.session.userId;
    },
    requireCity(s) {
      return this.requireLogin(s);
    },
    requireRole(s, roles) {
      if (!roles.includes(s.full.role)) throw Error("权限");
    },
    text(v, l, max = 100) {
      if (!String(v || "").trim() || String(v).length > max) throw Error(l);
      return String(v).trim();
    },
    positive(v, l, max) {
      if (!(Number(v) > 0 && Number(v) <= max)) throw Error(l);
      return Number(v);
    },
    grant(s, g) {
      const x = {
        ...g,
        id: g.id || "g" + ++seq,
        userId: "me",
        start: "2026-10-21",
        end: "2026-11-21",
      };
      s.grants.push(x);
      return x;
    },
    revokeGrant(s, id) {
      const g = s.grants.find((x) => x.id === id);
      if (!g) throw Error("权益");
      g.revoked = true;
    },
  };
  return {
    api: createGrowthFullDomain(ctx),
    state: () => state,
    role(v) {
      state.full.role = v;
    },
  };
}
test("repeated generation rotates actual meals and each meal style reaches the report", () => {
  const f = fixture(), a = f.api;
  const input = { days: 7, lossJin: 0, start: "18:00", end: "19:00" };
  const first = a.generateAIPlan({ ...input, mealStyle: "home" });
  const repeat = a.generateAIPlan({ ...input, mealStyle: "home" });
  assert.notDeepEqual(repeat.days[0].meals.map(m => m.title), first.days[0].meals.map(m => m.title));
  const third = a.generateAIPlan({ ...input, mealStyle: "fatloss" });
  assert.ok(third.days.every(d => d.meals.every(m => m.style === "fatloss")));
  assert.notDeepEqual(third.days[0].meals, repeat.days[0].meals);
  assert.deepEqual(a.getAIPlans().find(p => p.id === first.id).days, first.days);
});

test("weight styles affect default daily activity and actual menu without changing goal limits", () => {
  const results = ["gentle", "efficient", "shape"].map(weightStyle => {
    const a = fixture().api;
    return a.generateAIPlan({ days: 7, lossJin: 0, start: "18:00", end: "19:00", weightStyle });
  });
  assert.deepEqual(results.map(p => p.days[0].exercise.minutes), [15, 30, 20]);
  assert.deepEqual(results.map(p => p.request.weightStyle), ["gentle", "efficient", "shape"]);
  assert.equal(new Set(results.map(p => p.days[0].meals[0].title)).size, 3);
  for (const p of results) assert.equal(p.goalAssessment.weeklyLimitKg, 0.5);
});

test("chosen and custom exercise flow through every day history text and Excel", () => {
  for (const exercise of [{ activityId: "gentle-yoga", name: "伪造名称", minutes: 25 }, { activityId: "", name: "  公园漫步  ", minutes: 40 }]) {
    const a = fixture().api;
    const p = a.generateAIPlan({ days: 3, lossJin: 0, start: "20:00", end: "21:00", weightStyle: "shape", exercise });
    const expected = exercise.activityId ? "瑜伽（一般）" : "公园漫步";
    assert.equal(p.request.exercise.name, expected);
    assert.ok(p.days.every(d => d.exercise.name === expected && d.exercise.minutes === exercise.minutes && d.exercise.time === "20:00" && d.exercise.end === "21:00"));
    assert.equal(a.getAIPlans()[0].request.weightStyle, "shape");
    assert.match(a.exportAIPlan(p.id), new RegExp(expected.replace(/[（）]/g, "[（）]")));
    const rows = a.getAIPlanExportRows(p.id);
    assert.ok(rows.slice(1).every(r => r[6] === expected && r[7] === exercise.minutes));
    assert.match(a.exportAIPlan(p.id), /20:00.*21:00/);
  }
});

test("exercise and weight-style validation is atomic and respects available time", () => {
  const a = fixture().api, input = { days: 7, lossJin: 0, start: "18:00", end: "18:30" };
  const before = a.getRecognitionAccess().remaining;
  for (const extra of [{weightStyle:"other"}, {exercise:{activityId:"missing",minutes:20}}, {exercise:{name:"",minutes:20}}, {exercise:{name:"自填",minutes:31}}, {exercise:{name:"自填",minutes:0}}, {exercise:{name:"字".repeat(41),minutes:20}}, {exercise:"瑜伽"}]) {
    assert.throws(() => a.generateAIPlan({...input,...extra}));
    assert.equal(a.getRecognitionAccess().remaining,before);
    assert.equal(a.getAIPlans().length,0);
  }
  const p = a.generateAIPlan({...input,start:"23:45",end:"00:15",exercise:{name:"睡前漫步",minutes:25}});
  assert.equal(p.days[0].exercise.minutes,25);
});

test("health review retains preferred exercise but never assigns its requested quantity", () => {
  const a = fixture().api;
  const p = a.generateAIPlan({days:7,lossJin:0,start:"18:00",end:"19:00",exercise:{name:"瑜伽",minutes:35},healthNote:"膝关节不适"});
  assert.equal(p.request.exercise.name,"瑜伽");
  assert.equal(p.days[0].exercise.requestedName,"瑜伽");
  assert.equal(p.days[0].exercise.requestedMinutes,35);
  assert.equal(p.days[0].exercise.minutes,0);
  assert.match(a.exportAIPlan(p.id), /偏好.*瑜伽.*35/);
});

test("temporary plan restrictions do not become permanent profile allergies", () => {
  const a = fixture().api;
  const input={days:7,lossJin:0,start:"18:00",end:"19:00"};
  const first=a.generateAIPlan({...input,restrictions:"牛奶"});
  assert.deepEqual(first.restrictions,["鸡蛋","牛奶"]);
  assert.deepEqual(a.getPlanProfile().restrictions,["鸡蛋"]);
  const next=a.generateAIPlan({...input,restrictions:""});
  assert.deepEqual(next.restrictions,["鸡蛋"]);
  assert.deepEqual(a.getAIPlans().find(p=>p.id===first.id).restrictions,["鸡蛋","牛奶"]);
});

test("space separated restrictions are applied as separate food exclusions", () => {
  const a=fixture().api;
  const p=a.generateAIPlan({days:7,lossJin:0,start:"18:00",end:"19:00",restrictions:"牛奶 小麦；海鲜"});
  assert.deepEqual(p.restrictions,["鸡蛋","牛奶","小麦","海鲜"]);
  const names=p.days.flatMap(d=>d.meals.flatMap(m=>m.ingredients.map(i=>i.name))).join(" ");
  assert.ok(!/奶|酸奶|麦|面条|面包|馒头|鱼|虾|蟹/.test(names));
});

test("regenerating a meal uses the saved style budget restrictions and preference snapshot", () => {
  const f=fixture(),a=f.api;
  f.state().full.profileExtra.calorieGoal=2100;
  const first=a.generateAIPlan({days:3,lossJin:0,start:"18:00",end:"19:00",mealStyle:"home",weightStyle:"efficient",exercise:{name:"普拉提",minutes:45},restrictions:"牛奶"});
  f.state().full.profileExtra.calorieGoal=1800;
  const next=a.regeneratePlanMeal({planId:first.id,date:first.start,slot:"breakfast"});
  assert.notEqual(next.days[0].meals[0].title,first.days[0].meals[0].title);
  assert.equal(next.days[0].meals[0].style,"home");
  assert.equal(next.days[0].totalKcal,2100);
  assert.deepEqual(next.request,first.request);
  assert.deepEqual(next.days[0].exercise,first.days[0].exercise);
  assert.ok(!JSON.stringify(next.days[0].meals).includes("牛奶"));
});
test("full cycle, diet restrictions, quota and editing", () => {
  const f = fixture(),
    a = f.api;
  const p = a.generateAIPlan({
    days: 7,
    lossJin: 1,
    start: "18:00",
    end: "18:30",
    restrictions: "鸡蛋",
  });
  assert.equal(p.days.length, 7);
  assert(!JSON.stringify(p.days).includes("鸡蛋"));
  assert.equal(a.getRecognitionAccess().freeCredits, 2);
  a.editPlanMeal({
    planId: p.id,
    date: p.days[0].date,
    slot: "breakfast",
    title: "燕麦粥",
    kcal: 500,
  });
  assert.match(a.exportAIPlan(p.id), /燕麦粥/);
  a.completePlanTask({ planId: p.id, type: "signin" });
  assert.throws(() => a.completePlanTask({ planId: p.id, type: "signin" }));
  assert.throws(() => a.completePlanTask({ planId: p.id, type: "photo" }));
});
test("admin configs enforce permissions, safe mock and quota", () => {
  const f = fixture();
  assert.throws(() => f.api.saveAIConfig({ textEnabled: false }));
  f.role("hq");
  assert.throws(() => f.api.saveAIConfig({ apiKey: "secret" }));
  f.api.saveAIConfig({ textEnabled: false });
  assert.throws(() =>
    f.api.generateAIPlan({ days: 7, start: "18:00", end: "18:30" }),
  );
});
test("video requires completion and rejects replay", () => {
  const f = fixture(),
    a = f.api;
  f.role("hq");
  a.saveAdsConfig({
    enabled: true,
    rewardedVideo: "demo-video",
    dailyLimit: 1,
    grant: 2,
  });
  const r = a.beginRewardedVideo();
  assert.equal(
    a.completeRewardedVideo({ id: r.id, complete: false }).granted,
    0,
  );
  const v = a.beginRewardedVideo();
  assert.equal(
    a.completeRewardedVideo({ id: v.id, complete: true }).granted,
    2,
  );
  assert.throws(() => a.completeRewardedVideo({ id: v.id, complete: true }));
  assert.throws(() => a.beginRewardedVideo());
  assert.equal(a.getRecognitionAccess().adCredits, 2);
});
test("payment config gates iOS, snapshots order and revokes only refunded grant", () => {
  const f = fixture(),
    a = f.api;
  assert.throws(() =>
    a.purchaseMembership({
      planId: "monthly",
      device: "android",
      requestId: "one",
    }),
  );
  f.role("hq");
  a.savePaymentConfig({
    enabled: true,
    demoCredentials: true,
    iosAllowed: false,
  });
  assert.throws(() =>
    a.purchaseMembership({
      planId: "monthly",
      device: "ios",
      requestId: "one",
    }),
  );
  const o = a.purchaseMembership({
    planId: "monthly",
    device: "android",
    requestId: "one",
  });
  assert.equal(
    a.purchaseMembership({
      planId: "monthly",
      device: "android",
      requestId: "one",
    }).id,
    o.id,
  );
  a.requestOrderRefund(o.id);
  a.approveOrderRefund(o.id);
  assert.equal(f.state().grants[0].revoked, true);
  assert.equal(a.listOrders()[0].status, "refunded");
});
test("invitation binding is once only, tier rewards use root grant", () => {
  const f = fixture(),
    a = f.api;
  const home = a.getInvites();
  a.registerInvitedVisitor({
    code: home.code,
    visitorId: "new-1",
    nickname: "好友",
  });
  assert.throws(() =>
    a.registerInvitedVisitor({
      code: home.code,
      visitorId: "new-1",
      nickname: "重复",
    }),
  );
  assert.throws(() =>
    a.registerInvitedVisitor({
      code: home.code,
      visitorId: "me",
      nickname: "自己",
    }),
  );
  a.claimInviteTier("one");
  assert.equal(f.state().grants.length, 1);
  assert.throws(() => a.claimInviteTier("one"));
});
test("provider administration accepts demo-only credentials and active provider cannot be deleted", () => {
  const f = fixture();
  f.role("hq");
  assert.throws(() =>
    f.api.saveAIProvider({
      name: "错误",
      textUrl: "https://example.com/v1",
      imageUrl: "https://example.com/v1",
      textModel: "demo",
      imageModel: "demo",
      apiKey: "real-secret",
    }),
  );
  const p = f.api.saveAIProvider({
    name: "演示服务商二",
    textUrl: "https://example.com/v1",
    imageUrl: "https://example.com/v1",
    textModel: "demo-text",
    imageModel: "demo-photo",
    apiKey: "DEMO_ONLY",
  });
  f.api.saveAIConfig({ active: p.id });
  assert.throws(() => f.api.removeAIProvider(p.id));
  f.api.saveAIConfig({ active: "demo" });
  f.api.removeAIProvider(p.id);
  assert(f.api.getAIConfig().providers.find((x) => x.id === p.id).deleted);
});
test("root integration consumes membership, then free/ads and respects AI global gates", () => {
  const { setup } = require("./helpers.cjs");
  const h = setup();
  h.login();
  const a = h.domain;
  a.saveExtendedProfile({ age: 30, initialWeight: 70, restrictions: ["鸡蛋"] });
  const p = a.generateAIPlan({
    days: 7,
    lossJin: 0,
    start: "18:00",
    end: "18:30",
  });
  assert.equal(p.days.length, 7);
  assert(!JSON.stringify(p.days).includes("鸡蛋"));
  const m = a.getMembership();
  assert.equal(m.used, 1);
  const photo = a.recognizeMeal({
    requestId: "photo-full",
    imagePath: "wxfile://food.jpg",
  });
  const after = a.getMembership().used;
  assert.equal(
    a.recognizeMeal({ requestId: "photo-full", imagePath: "wxfile://food.jpg" })
      .id,
    photo.id,
  );
  assert.equal(a.getMembership().used, after);
  a.completePlanTask({ planId: p.id, type: "photo", recordId: photo.recordId });
  a.editRecognizedMeal({
    recordId: photo.recordId,
    name: "修正餐食",
    kcal: 400,
  });
  assert.equal(a.getMembership().used, after);
  a.setDemoRole("hq");
  a.saveAIConfig({ photoEnabled: false });
  assert.throws(() =>
    a.recognizeMeal({ requestId: "photo-off", imagePath: "wxfile://food.jpg" }),
  );
  a.savePaymentConfig({ enabled: true, demoCredentials: true });
  const o = a.purchaseMembership({
    planId: "month-card",
    device: "devtools",
    requestId: "buy-full",
  });
  a.requestOrderRefund(o.id);
  a.approveOrderRefund(o.id);
  assert.equal(
    a.getMembership().timeline.find((x) => x.id === o.grantId).status,
    "已撤回",
  );
});
test("three-year plans persist compactly and selected meal edits do not affect repeated days", () => {
  const f = fixture(),
    a = f.api;
  const p = a.generateAIPlan({
    days: 1096,
    lossJin: 0,
    start: "18:00",
    end: "18:30",
  });
  assert.equal(p.days.length, 1096);
  assert(f.state().full.ai.plans[0].compactDays);
  assert(JSON.stringify(f.state()).length < 250000);
  const before = p.days[5].meals[0].title;
  a.editPlanMeal({
    planId: p.id,
    date: p.days[0].date,
    slot: "breakfast",
    title: "独立修改米饭",
    kcal: 500,
  });
  const loaded = a.getAIPlans()[0];
  assert.equal(loaded.days[0].meals[0].title, "独立修改米饭");
  assert.equal(loaded.days[5].meals[0].title, before);
});
test("AI exports structured full cycle and audit logs", () => {
  const f = fixture(),
    a = f.api,
    p = a.generateAIPlan({ days: 2, start: "18:00", end: "18:30" });
  const rows = a.getAIPlanExportRows(p.id);
  assert.equal(rows.length, 7);
  assert.equal(rows[1][0], "2026-10-21");
  assert.equal(rows[4][0], "2026-10-22");
  f.role("hq");
  assert.equal(a.getAILogExportRows().length, 2);
});
test("root recognition falls back to free then completed-video credits without minting membership quota", () => {
  const { setup } = require("./helpers.cjs");
  const h = setup();
  h.login();
  const a = h.domain;
  const m = a.getMembership();
  for (let i = 0; i < m.remaining; i++)
    a.recognizeMeal({
      requestId: "member-" + i,
      imagePath: "wxfile://food.jpg",
    });
  assert.equal(a.getMembership().remaining, 0);
  for (let i = 0; i < 3; i++)
    a.recognizeMeal({ requestId: "free-" + i, imagePath: "wxfile://food.jpg" });
  assert.equal(a.getRecognitionAccess().freeCredits, 0);
  assert.throws(() =>
    a.recognizeMeal({ requestId: "exhausted", imagePath: "wxfile://food.jpg" }),
  );
  a.setDemoRole("hq");
  a.saveAdsConfig({ enabled: true, rewardedVideo: "demo-video", grant: 2 });
  const v = a.beginRewardedVideo();
  a.completeRewardedVideo({ id: v.id, complete: true });
  a.recognizeMeal({ requestId: "ad-1", imagePath: "wxfile://food.jpg" });
  assert.equal(a.getRecognitionAccess().adCredits, 1);
  assert.equal(a.getMembership().used, m.dailyLimit);
});
test("invitation poster QR matrix encodes distinct simulated invite paths", () => {
  const qrcode = require("../miniprogram-1/miniprogram/services/reference/qrcode");
  const matrix = (code) => {
    const q = qrcode(0, "M");
    q.addData("/pages/invite-register/index?code=" + code, "Byte");
    q.make();
    const n = q.getModuleCount();
    assert(n >= 21);
    return Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => q.isDark(r, c)),
    );
  };
  const first = matrix("QD-FIRST");
  assert(first.flat().some(Boolean));
  assert(first.flat().some((x) => !x));
  assert.notDeepEqual(first, matrix("QD-SECOND"));
});
test("invite page shows and claims published canonical invite tiers after visitor binding", async () => {
  const { setup } = require("./helpers.cjs"),
    f = setup(),
    d = f.domain;
  f.login();
  d.setDemoRole("hq");
  const plan = d.getCatalog()[0],
    activity = d.saveRewardActivity({
      title: "总部统一邀请奖励",
      type: "invite",
      city: "温州",
      start: "2026-10-01",
      end: "2026-11-01",
      claimUntil: "2026-11-08",
      published: true,
      tiers: [
        {
          name: "邀请首位好友",
          target: 1,
          quota: 10,
          planId: plan.id,
          rewardType: "member",
        },
      ],
    });
  d.setDemoRole("consumer");
  const utilPath = require.resolve("../miniprogram-1/miniprogram/utils/page"),
    pagePath = require.resolve(
      "../miniprogram-1/miniprogram/pages/invite/index",
    ),
    previous = require.cache[utilPath];
  let definition;
  require.cache[utilPath] = {
    id: utilPath,
    filename: utilPath,
    loaded: true,
    exports: {
      page: (p) => {
        definition = p;
      },
      service: d,
      navigate: () => {},
    },
  };
  delete require.cache[pagePath];
  try {
    require(pagePath);
  } finally {
    if (previous) require.cache[utilPath] = previous;
    else delete require.cache[utilPath];
    delete require.cache[pagePath];
  }
  const p = Object.assign({}, definition, {
    data: structuredClone(definition.data),
    setData(v) {
      Object.assign(this.data, v);
    },
    loadData: (work) => work(),
    action: (work) => work(),
    requireAccount: async () => true,
  });
  await p.refresh();
  assert(p.data.activities.some((a) => a.id === activity.id));
  d.registerInvitedVisitor({
    code: p.data.invite.code,
    visitorId: "canonical-visitor",
    nickname: "统一奖励好友",
  });
  await p.refresh();
  const visible = p.data.activities.find((a) => a.id === activity.id);
  assert.equal(visible.tiers[0].canClaim, true);
  const oldWx = global.wx;
  global.wx = { showToast: () => {} };
  try {
    await p.claim({
      currentTarget: {
        dataset: { activity: activity.id, tier: visible.tiers[0].id },
      },
    });
  } finally {
    global.wx = oldWx;
  }
  const ledger = d.getMyFullRewards().find((r) => r.activityId === activity.id);
  assert(ledger);
  assert(f.store.read().grants.some((g) => g.id === ledger.grantId));
  assert(p.data.rewards.some((r) => r.id === ledger.id));
});
test("membership without adFree requires a permanent credit for AI calls", () => {
  const f = fixture(),
    a = f.api;
  f.state().grants.push({
    id: "with-ads",
    userId: "me",
    start: "2026-10-21",
    end: "2026-11-21",
    dailyLimit: 10,
    features: ["photo"],
  });
  assert.equal(a.getRecognitionAccess().remaining, 3);
  for (let i = 0; i < 3; i++)
    a.generateAIPlan({ days: 1, start: "18:00", end: "18:30" });
  assert.equal(a.getRecognitionAccess().membershipRemaining, 7);
  assert.equal(a.getRecognitionAccess().remaining, 0);
  assert.throws(
    () => a.generateAIPlan({ days: 1, start: "18:00", end: "18:30" }),
    /次数/,
  );
  assert.equal(f.state().recognitions.length, 3);
});

test("new plans read current health profile and cannot omit its allergy restrictions", () => {
  const f = fixture(), a = f.api;
  Object.assign(f.state().full.profileExtra, { sex: "男", direction: "培养习惯，温和减重", goalDays: 14, calorieGoal: 1800, healthStatus: "无 / 不适用", restrictions: ["鸡蛋"] });
  f.state().profile.targetWeight = 74;
  const first = a.generateAIPlan({ lossJin: 0, start: "18:00", end: "18:30", restrictions: "" });
  assert.equal(first.days.length, 14);
  assert.equal(first.profileBasis.calorieGoal, 1800);
  assert.equal(first.days[0].totalKcal, 1800);
  assert.deepEqual(first.restrictions, ["鸡蛋"]);
  assert(!JSON.stringify(first.days).includes("鸡蛋"));
  f.state().full.profileExtra.calorieGoal = 2100;
  f.state().records.push({ id: "new-weight", userId: "me", type: "weight", date: "2026-10-21", kg: 76, createdAt: 1 });
  const second = a.generateAIPlan({ days: 7, lossJin: 0, start: "18:00", end: "18:30", restrictions: "牛奶" });
  assert.equal(second.profileBasis.weight, 76);
  assert.equal(second.days[0].totalKcal, 2100);
  assert.deepEqual(second.restrictions, ["鸡蛋", "牛奶"]);
  assert.equal(a.getAIPlans().find(p => p.id === first.id).profileBasis.calorieGoal, 1800);
});
test("record-only profile ignores quantitative loss and does not apply calorie target", () => {
  const f = fixture(), a = f.api;
  Object.assign(f.state().full.profileExtra, { direction: "仅记录日常", calorieGoal: 2100 });
  const p = a.generateAIPlan({ days: 7, lossJin: 10, start: "18:00", end: "18:30", allowRecordOnly: true });
  assert.equal(p.mode, "review");
  assert.equal(p.request.lossJin, 0);
  assert.equal(p.profileBasis.calorieApplied, false);
  assert.equal(p.days[0].exercise.minutes, 0);
});

test("7 days 3 jin is explained correctly, can extend to 21 days or confirm record-only", () => {
  const f = fixture(), a = f.api;
  const input = { days: 7, lossJin: 3, start: "18:00", end: "18:30" };
  const quota = a.getRecognitionAccess().freeCredits;
  const assessment = a.assessPlanGoal(input);
  assert.equal(assessment.lossKg, 1.5);
  assert.equal(assessment.weeklyKg, 1.5);
  assert.equal(assessment.weeklyLimitKg, 0.5);
  assert.equal(assessment.suggestedDays, 21);
  assert.equal(a.getRecognitionAccess().freeCredits, quota);
  assert.throws(() => a.generateAIPlan(input), /每周1.5公斤/);
  assert.equal(a.getRecognitionAccess().freeCredits, quota);
  const accepted = a.generateAIPlan({ ...input, allowRecordOnly: true });
  assert.equal(accepted.mode, "review");
  assert.equal(accepted.request.lossJin, 0);
  assert.equal(accepted.request.requestedLossJin, 3);
  assert.equal(a.assessPlanGoal({ ...input, days: 21 }).tooFast, false);
});
test("large real-life goals never become automatic rapid-loss prescriptions, invalid goals are blocked", () => {
  const f = fixture(), a = f.api;
  const fast = a.assessPlanGoal({ days: 30, lossJin: 30 });
  assert.equal(fast.lossKg, 15);
  assert.equal(fast.tooFast, true);
  assert.equal(fast.effectiveLossJin, 0);
  for (const invalid of [{ days: 0, lossJin: 3 }, { days: 7, lossJin: -1 }, { days: 7, lossJin: 200 }, { days: 7.5, lossJin: 1 }]) assert.throws(() => a.assessPlanGoal(invalid));
  assert.throws(() => a.generateAIPlan({ days: 90, lossJin: 100, start: "18:00", end: "18:30", allowRecordOnly: true }), /调整目标体重/);
});

test("meal styles default to fat-loss, support family and mixed menus, and rotate common ingredients", () => {
  for (const style of [undefined, "home", "mixed"]) {
    const f = fixture(), a = f.api;
    const p = a.generateAIPlan({ days: 7, lossJin: 0, start: "18:00", end: "18:30", mealStyle: style });
    const meals = p.days.flatMap(d => d.meals);
    assert.equal(p.request.mealStyle, style || "fatloss");
    assert.equal(meals.length, 21);
    assert(new Set(meals.map(m => m.title)).size >= 15);
    assert(meals.every(m => m.ingredients.length === 3));
    assert(!JSON.stringify(p.days).includes("鸡蛋"));
    if (style === "mixed") assert.deepEqual([...new Set(meals.map(m => m.style))].sort(), ["fatloss", "home"]);
    else assert(meals.every(m => m.style === (style || "fatloss")));
    const next = a.regeneratePlanMeal({ planId: p.id, date: p.days[0].date, slot: "lunch" });
    const replacement = next.days[0].meals.find(m => m.slot === "lunch");
    if (style !== "mixed") assert.equal(replacement.style, style || "fatloss");
    assert.notEqual(replacement.title, p.days[0].meals[1].title);
  }
});
test("unknown meal styles are rejected before charging and wheat restrictions cover staple variants", () => {
  const f = fixture(), a = f.api;
  const quota = a.getRecognitionAccess().freeCredits;
  assert.throws(() => a.generateAIPlan({ days: 7, lossJin: 0, start: "18:00", end: "18:30", mealStyle: "unknown" }), /风格/);
  assert.equal(a.getRecognitionAccess().freeCredits, quota);
  const p = a.generateAIPlan({ days: 7, lossJin: 0, start: "18:00", end: "18:30", mealStyle: "home", restrictions: "小麦" });
  const names = p.days.flatMap(d => d.meals.flatMap(m => m.ingredients.map(x => x.name))).join(" ");
  assert(!/麦|面条|面包|馒头/.test(names));
});


test("plan body supplement is validated saved exported and switches activity to review mode",()=>{
 const f=fixture(),a=f.api;const input={days:7,lossJin:0,start:"18:00",end:"18:30",healthNote:"膝盖不适，活动需要留意"};
 const before=a.getRecognitionAccess().remaining;assert.throws(()=>a.generateAIPlan({...input,healthNote:"字".repeat(301)}),/300/);assert.equal(a.getRecognitionAccess().remaining,before);
 assert.equal(a.assessPlanGoal(input).needsReview,true);const p=a.generateAIPlan(input);assert.equal(p.request.healthNote,input.healthNote);assert.equal(p.mode,"review");assert.equal(p.request.lossJin,0);assert.equal(p.days[0].exercise.minutes,0);assert.match(a.exportAIPlan(p.id),/膝盖不适/);assert.ok(a.getAIPlanExportRows(p.id).slice(1).every(row=>row[8].includes(input.healthNote)));
});
