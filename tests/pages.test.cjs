const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../miniprogram-1/miniprogram");
let saved;
global.wx = {
  getStorageSync: () => saved,
  setStorageSync: (_, value) => {
    saved = JSON.parse(JSON.stringify(value));
  },
  removeStorageSync: () => {
    saved = undefined;
  },
  showToast: () => {},
  navigateBack: () => {},
  switchTab: () => {},
  navigateTo: () => {},
  setNavigationBarTitle: () => {},
  getSystemInfoSync: () => ({ platform: "android", windowWidth: 390 }),
};
global.getCurrentPages = () => [{}];
test("camera circle captures once before login, keeps selected slot and later saves the same photo", async () => {
  const previous = saved,
    oldWx = { ...wx };
  saved = undefined;
  try {
    const service = require("../miniprogram-1/miniprogram/services/index");
    const p = loadPage("photo");
    p.onLoad({ slot: "dinner" });
    p.setData({ mockScenario: "meal" });
    await p.refresh();
    p.onCameraReady();
    let shots = 0;
    wx.chooseMedia = o => {
      assert.deepEqual(o.sourceType, ["camera"]);
      shots++;
      setTimeout(() => o.success({ tempFiles: [{ tempFilePath: "wxfile://camera-tmp.jpg", size: 1024 }] }), 5);
    };
    await Promise.all([p.capture(), p.capture()]);
    assert.equal(shots, 1);
    assert.equal(p.data.preview, "wxfile://camera-tmp.jpg");
    assert.equal(p.data.needsAccount, true);
    assert.equal(p.data.result, null);
    assert.equal(p.pending.slot, "dinner");
    await p.refresh();
    assert.equal(p.data.preview, "wxfile://camera-tmp.jpg");
    await service.loginDemo();
    await service.saveProfile({
      nickname: "拍照轻友",
      city: "温州",
      height: 165,
      targetWeight: 55,
    });
    wx.env = { USER_DATA_PATH: "/owned" };
    wx.getFileSystemManager = () => ({ copyFile: (o) => o.success() });
    await p.refresh();
    await p.retryRecognition();
    assert.equal(p.data.result.slot, "dinner");
    assert.equal((await service.getDiary(p.data.result.date)).meals.length, 0);
    await p.saveAnalysis();
    assert.equal((await service.getDiary(p.data.result.date)).meals.length, 1);
    assert.equal(p.pending, null);
    let sourceTypes;
    wx.chooseMedia = (o) => {
      sourceTypes = o.sourceType;
      o.fail({ errMsg: "chooseMedia:fail cancel" });
    };
    await p.choose();
    assert.deepEqual(sourceTypes, ["album"]);
    p.onCameraError();
    assert.equal(p.data.cameraReady, false);
    assert.equal(p.data.cameraActive, false);
    const manual = loadPage("records");
    manual.onLoad({ type: "meal", slot: "dinner" });
    assert.equal(manual.data.slotIndex, 2);
  } finally {
    saved = previous;
    global.wx = oldWx;
  }
});
test("forum tabs, map city and mine interaction lists use separate state", async () => {
  const previous = saved,
    oldWx = { ...wx };
  saved = undefined;
  try {
    const service = require("../miniprogram-1/miniprogram/services/index");
    await service.loginDemo();
    await service.saveProfile({
      nickname: "测试轻友",
      city: "杭州",
      height: 165,
      targetWeight: 55,
    });
    const forum = loadPage("forum");
    await forum.refresh();
    assert.deepEqual(
      forum.data.tabs.map((t) => t.label),
      ["推荐", "本地", "全国", "最新", "我的"],
    );
    await forum.changeTab({ currentTarget: { dataset: { id: "local" } } });
    assert.equal(forum.data.region, null);
    assert.equal(forum.data.posts.length, 0);
    wx.chooseLocation = (o) =>
      o.success({
        address: "浙江省温州市鹿城区",
        latitude: 28,
        longitude: 120,
      });
    await forum.locate();
    assert.equal(forum.data.region.city, "温州");
    assert.equal((await service.getSnapshot()).profile.city, "杭州");
    assert.equal(forum.data.posts.length, 0);
    await service.likeForumPost("forum-demo-1");
    await service.commentForumPost("forum-demo-1", "留下健康生活的一条评论");
    await forum.changeTab({ currentTarget: { dataset: { id: "mine" } } });
    for (const id of ["liked", "commented"]) {
      await forum.changeMine({ currentTarget: { dataset: { id } } });
      assert.equal(forum.data.posts[0].id, "forum-demo-1");
    }
  } finally {
    saved = previous;
    global.wx = oldWx;
  }
});
test("native composer requires category and never publishes before human approval", async () => {
  const previous = saved,
    oldWx = { ...wx };
  saved = undefined;
  try {
    const service = require("../miniprogram-1/miniprogram/services/index");
    await service.loginDemo();
    await service.saveProfile({
      nickname: "测试轻友",
      city: "杭州",
      height: 165,
      targetWeight: 55,
    });
    const editor = loadPage("forum-editor");
    editor.setData({ text: "今天认真记录自己的生活" });
    let toast = "";
    wx.showToast = (o) => {
      toast = o.title;
    };
    await editor.save({ currentTarget: { dataset: {} } });
    assert.match(toast, /分类/);
    assert.equal((await service.listForumPosts({ mode: "mine" })).length, 0);
    let destination = "";
    wx.switchTab = o => { destination = o.url; o.success(); };
    editor.setData({ kind: "运动打卡" });
    await editor.save({ currentTarget: { dataset: {} } });
    assert.equal(toast, "发布成功");
    assert.equal(destination, "/pages/forum/index");
    const post = (await service.listForumPosts({ mode: "mine" }))[0];
    assert.equal(post.status, "pending");
    assert.equal(post.kind, "运动打卡");
    assert.ok(
      !(await service.listForumPosts({ feed: "latest" })).some(
        (p) => p.id === post.id,
      ),
    );
    await service.setDemoRole("hq");
    await service.moderateForumPost(
      post.id,
      "approved",
      "文字及图片全部审核通过",
    );
    assert.ok(
      (await service.listForumPosts({ feed: "latest" })).some(
        (p) => p.id === post.id,
      ),
    );
  } finally {
    saved = previous;
    global.wx = oldWx;
  }
});
test("weight evidence photos use owned files, cancel safely and preserve previous evidence on save failure", async () => {
  const page = loadPage("weight");
  const old = { ...global.wx };
  try {
    wx.env = { USER_DATA_PATH: "/owned" };
    wx.chooseMedia = (o) => o.fail({ errMsg: "chooseMedia:fail cancel" });
    await page.photo();
    assert.equal(page.data.evidence, undefined);
    wx.chooseMedia = (o) =>
      o.success({
        tempFiles: [{ tempFilePath: "/temp/photo.jpg", size: 100 }],
      });
    wx.getFileSystemManager = () => ({ copyFile: (o) => o.success() });
    await page.photo();
    assert.match(
      page.data.evidence,
      /^\/owned\/qingdong-food-weight-\d+\.jpg$/,
    );
    const evidence = page.data.evidence;
    wx.getFileSystemManager = () => ({ copyFile: (o) => o.fail() });
    await page.photo();
    assert.equal(page.data.evidence, evidence);
  } finally {
    global.wx = old;
  }
});
function loadPage(name) {
  let definition;
  global.Page = (value) => {
    definition = value;
  };
  const file = path.join(root, "pages", name, "index.js");
  delete require.cache[require.resolve(file)];
  require(file);
  const page = Object.assign({}, definition, {
    data: JSON.parse(JSON.stringify(definition.data)),
  });
  page.setData = (updates) => {
    for (const [key, value] of Object.entries(updates)) {
      const parts = key.replace(/\[(\d+)\]/g, ".$1").split(".");
      let target = page.data;
      while (parts.length > 1) {
        const part = parts.shift();
        target[part] = target[part] || {};
        target = target[part];
      }
      target[parts[0]] = value;
    }
  };
  return page;
}
test("every registered page loads both signed out and signed in, with event handlers present", async () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
  const service = require("../miniprogram-1/miniprogram/services/index");
  for (const mode of ["guest", "consumer", "hq", "reviewer"]) {
    const loggedIn = mode !== "guest";
    if (loggedIn) {
      await service.loginDemo();
      await service.saveProfile({ nickname: "测试伙伴", city: "温州" });
      await service.setDemoRole(mode);
    }
    for (const route of app.pages) {
      const name = route.split("/")[1],
        p = loadPage(name);
      if (p.onLoad)
        await p.onLoad(
          name === "activity"
            ? { id: "first-step" }
            : name === "records"
              ? { type: "meal" }
              : {},
        );
      await p.refresh();
      if (p.data.error)
        assert.match(
          p.data.error,
          /登录|权限|身份|城市/,
          name + " unexpected error in " + mode + ": " + p.data.error,
        );
      assert.equal(p.data.loading, false, name + " must settle loading");
      const wxml = fs.readFileSync(path.join(root, route + ".wxml"), "utf8");
      for (const [, handler] of wxml.matchAll(
        /(?:bind|catch)(?:tap|change|input)="([a-zA-Z]+)"/g,
      ))
        assert.equal(typeof p[handler], "function", name + ":" + handler);
    }
  }
});
test("page action gate prevents duplicate simultaneous writes and reports storage errors", async () => {
  const p = loadPage("index");
  let calls = 0,
    release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const first = p.action(async () => {
    calls++;
    await pending;
  });
  await p.action(async () => {
    calls++;
  });
  release();
  await first;
  assert.equal(calls, 1);
  assert.equal(p.data.busy, false);
  await p.loadData(async () => {
    throw new Error("本机存储读取失败");
  });
  assert.match(p.data.error, /存储/);
  assert.equal(p.data.loading, false);
});
test("diary follows today's rollover while preserving deliberately selected history", async () => {
  const service = require("../miniprogram-1/miniprogram/services/index");
  const originalSnapshot = service.getSnapshot,
    originalDiary = service.getDiary;
  service.getSnapshot = async () => ({ date: "2026-10-22", signedIn: true });
  service.getDiary = async (date) => ({
    date,
    summary: {},
    meals: [],
    exercises: [],
    weights: [],
  });
  try {
    const p = loadPage("health");
    p.setData({ date: "2026-10-21", today: "2026-10-21" });
    await p.refresh();
    assert.equal(p.data.date, "2026-10-22");
    p.setData({ date: "2026-10-20", today: "2026-10-21" });
    await p.refresh();
    assert.equal(p.data.date, "2026-10-20");
  } finally {
    service.getSnapshot = originalSnapshot;
    service.getDiary = originalDiary;
  }
});
test("photo result navigation opens its diary date even after browsing old records", async () => {
  const service = require("../miniprogram-1/miniprogram/services/index");
  const originalSnapshot = service.getSnapshot,
    originalDiary = service.getDiary,
    originalSwitch = wx.switchTab;
  let destination;
  wx.switchTab = (options) => {
    destination = options.url;
  };
  service.getSnapshot = async () => ({ date: "2026-10-22", signedIn: true });
  service.getDiary = async (date) => ({
    date,
    summary: {},
    meals: [],
    exercises: [],
    weights: [],
  });
  try {
    const { navigate } = require("../miniprogram-1/miniprogram/utils/page");
    navigate("/pages/health/index?date=2026-10-22");
    assert.equal(destination, "/pages/health/index");
    const p = loadPage("health");
    p.setData({ date: "2026-10-20", today: "2026-10-22" });
    await p.refresh();
    assert.equal(p.data.date, "2026-10-22");
  } finally {
    service.getSnapshot = originalSnapshot;
    service.getDiary = originalDiary;
    wx.switchTab = originalSwitch;
  }
});

test("signed-out diary shows a selectable calendar and clears previous personal data", async () => {
  const service = require("../miniprogram-1/miniprogram/services/index");
  const original = service.getSnapshot;
  service.getSnapshot = async () => ({ date: "2026-10-22", signedIn: false });
  try {
    const p = loadPage("health");
    p.setData({ overview: { nutrition: { protein: 99 }, calendar: [{ date: "2026-10-01", hasRecords: true }] }, dayCheckedIn: true });
    await p.refresh();
    assert.equal(p.data.error, "");
    assert.equal(p.data.overview.calendar.length, 31);
    assert.equal(p.data.overview.calendar.filter(d => d.selected)[0].date, "2026-10-22");
    assert.equal(p.data.overview.calendar.some(d => d.hasRecords || d.checkedIn), false);
    assert.equal(p.data.dayCheckedIn, false);
    await p.selectCalendarDate({ currentTarget: { dataset: { date: "2026-10-20" } } });
    assert.equal(p.data.date, "2026-10-20");
    assert.equal(p.data.weekDates.length, 7);
    assert.equal(p.data.weekDates.find(d => d.selected).date, "2026-10-20");
    assert.equal(p.data.dateTitle, "10 月 20 日");
    assert.equal(p.data.weekdayTitle, "周二");
    assert.equal(p.data.overview.calendar.filter(d => d.selected)[0].date, "2026-10-20");
  } finally { service.getSnapshot = original; }
});

test("rank switches national and own city while retaining the selected metric", async () => {
  const service = require("../miniprogram-1/miniprogram/services/index");
  const oldSnapshot = service.getSnapshot, oldRank = service.getFullRank;
  const queries = [];
  service.getSnapshot = async () => ({ date: "2026-10-23", profile: { city: "杭州" } });
  service.getFullRank = async q => { queries.push({ ...q }); return { ...q, rows: [] }; };
  try {
    const p = loadPage("rank");
    await p.refresh();
    assert.equal(queries.at(-1).scope, "national");
    await p.chooseScope({ currentTarget: { dataset: { scope: "city" } } });
    assert.equal(queries.at(-1).city, "杭州");
    assert.equal(queries.at(-1).scope, "city");
    await p.chooseMetric({ currentTarget: { dataset: { metric: "loss" } } });
    assert.equal(queries.at(-1).metric, "loss");
    assert.equal(queries.at(-1).scope, "city");
    await p.chooseScope({ currentTarget: { dataset: { scope: "national" } } });
    assert.equal(queries.at(-1).metric, "loss");
    assert.equal(queries.at(-1).scope, "national");
  } finally { service.getSnapshot = oldSnapshot; service.getFullRank = oldRank; }
});

test("weight trend limits actual points to the chosen range and keeps latest weight and goal", () => {
  const p = loadPage("weight-trend");
  p.today = "2026-10-23";
  p.source = { height: 170, initialWeight: 70, targetWeight: 65, records: [
    { id: "old", date: "2026-10-01", kg: 70 },
    { id: "new", date: "2026-10-23", kg: 68 },
  ] };
  p.renderTrend();
  assert.equal(p.data.points.length, 1);
  assert.equal(p.data.lines.length, 0);
  assert.equal(p.data.current, 68);
  assert.equal(p.data.goalGap, "3.0");
  assert.equal(p.data.difference, "-2.0 kg");
  p.chooseRange({ currentTarget: { dataset: { days: 30 } } });
  assert.equal(p.data.points.length, 2);
  assert.equal(p.data.lines.length, 1);
});

test("calendar reminder requests a daily system event with seconds timestamp", async () => {
  const original = wx.addPhoneRepeatCalendar;
  let options;
  wx.addPhoneRepeatCalendar = o => { options = o; o.success({}); };
  try {
    const p = loadPage("privacy");
    p.setData({ reminderTime: "10:00" });
    await p.addCalendar();
    assert.equal(options.repeatInterval, "day");
    assert.equal(options.alarm, true);
    assert(options.startTime > Date.now() / 1000);
    assert(options.startTime < Date.now() / 1000 + 86401);
    assert.equal(new Date(options.startTime * 1000).getHours(), 10);
    assert.equal(options.endTime - options.startTime, 300);
  } finally { wx.addPhoneRepeatCalendar = original; }
});

test("both personal and complete health entries expose the same form while signed out", async () => {
  const service = require("../miniprogram-1/miniprogram/services/index");
  const original = service.getSnapshot;
  service.getSnapshot = async () => ({ signedIn: false, profile: { nickname: "新朋友", city: "", height: "", targetWeight: "" } });
  try {
    for (const name of ["account", "health-profile"]) {
      const p = loadPage(name);
      await p.refresh();
      assert.equal(p.data.error, "");
      assert.equal(p.data.signedIn, false);
      assert.equal(p.data.form.healthStatus, "无 / 不适用");
      assert.equal(p.data.form.direction, "培养习惯，温和减重");
      assert.equal(typeof p.pick, "function");
      assert.equal(typeof p.consent, "function");
    }
  } finally { service.getSnapshot = original; }
});

test("every configured bottom tab uses native switchTab navigation", () => {
  const { navigate } = require("../miniprogram-1/miniprogram/utils/page");
  const app = require("../miniprogram-1/miniprogram/app.json");
  const oldSwitch = wx.switchTab, oldNavigate = wx.navigateTo;
  const calls = [];
  wx.switchTab = o => calls.push(o.url);
  wx.navigateTo = () => assert.fail("tab route must not use navigateTo");
  try {
    for (const tab of app.tabBar.list) navigate("/" + tab.pagePath);
    assert.deepEqual(calls, app.tabBar.list.map(t => "/" + t.pagePath));
    assert.equal(app.tabBar.list.length, 5);
  } finally { wx.switchTab = oldSwitch; wx.navigateTo = oldNavigate; }
});

test("health form selectors show every option, confirm correctly, and cancel without changing values", () => {
  for (const name of ["account", "health-profile"]) {
    const p = loadPage(name);
    for (const [field, optionsKey] of [["direction", "directions"], ["sex", "sexes"], ["healthStatus", "healthStates"], ["city", "cities"]]) {
      const options = p.data[optionsKey];
      for (let i = 0; i < options.length; i++) {
        p.openSelector({ currentTarget: { dataset: { field } } });
        assert.deepEqual(p.data.selector.options, options);
        p.selectOption({ currentTarget: { dataset: { index: i } } });
        p.confirmSelector();
        assert.equal(p.data.form[field], options[i]);
        assert.equal(p.data.selector, null);
      }
      const before = p.data.form[field];
      p.openSelector({ currentTarget: { dataset: { field } } });
      p.selectOption({ currentTarget: { dataset: { index: 0 } } });
      p.closeSelector();
      assert.equal(p.data.form[field], before);
    }
  }
});

test("opening historical plan does not overwrite current profile restrictions", () => {
  const p = loadPage("ai-plan");
  p.setData({ restrictions: "牛奶", selected: 0 });
  p.showPlan({ id: "old", days: [{ date: "2026-10-20", meals: [] }], restrictions: ["鸡蛋"] });
  assert.equal(p.data.restrictions, "牛奶");
  assert.equal(p.data.plan.id, "old");
});

test("meal style dropdown defaults to fat-loss and records the customer's choice", () => {
  const p = loadPage("ai-plan");
  assert.equal(p.data.mealStyle, "fatloss");
  p.toggleMealStyles(); assert.equal(p.data.mealStyleOpen, true);
  p.selectMealStyle({ currentTarget: { dataset: { style: "home" } } });
  assert.equal(p.data.mealStyle, "home");
  assert.equal(p.data.mealStyleLabel, "家庭日常");
  assert.equal(p.data.mealStyleOpen, false);
});

test("photo selection never charges or recognizes before explicit confirmation", async () => {
  const previous = saved, oldWx = { ...wx }; saved = undefined;
  try {
    const service = require("../miniprogram-1/miniprogram/services/index");
    await service.loginDemo(); await service.saveProfile({ nickname: "轻友", city: "温州", height: 165, targetWeight: 55 });
    const p = loadPage("photo"); p.onLoad({ slot: "lunch" }); p.setData({ mockScenario: "meal" }); await p.refresh();
    const before = (await service.getRecognitionAccess()).remaining;
    await p.acceptImage("wxfile://pending-food.jpg");
    assert.equal(p.data.result, null);
    assert.equal((await service.getRecognitionAccess()).remaining, before);
    const requestId = p.pending.requestId;
    wx.chooseMedia = o => o.fail({ errMsg: "chooseMedia:fail cancel" });
    await p.capture(); assert.equal(p.pending.requestId, requestId);
    wx.env = { USER_DATA_PATH: "/owned" }; wx.getFileSystemManager = () => ({ copyFile: o => o.success() });
    await p.confirmPhoto();
    assert.equal(p.data.result.slot, "lunch");
    assert.equal((await service.getRecognitionAccess()).remaining, before - 1);
    await p.confirmPhoto();
    assert.equal((await service.getRecognitionAccess()).remaining, before - 1);
  } finally { saved = previous; global.wx = oldWx; }
});
test("no-quota recognition retains the photo and only completed rewarded video continues recognition", async () => {
  const previous = saved, oldWx = { ...wx }; saved = undefined;
  const service = require("../miniprogram-1/miniprogram/services/index");
  const originals = { getRecognitionAccess: service.getRecognitionAccess, beginRewardedVideo: service.beginRewardedVideo, completeRewardedVideo: service.completeRewardedVideo };
  try {
    await service.loginDemo(); await service.saveProfile({ nickname: "轻友", city: "温州", height: 165, targetWeight: 55 });
    let credits = 0, ended = false, recognized = 0;
    service.getRecognitionAccess = async () => ({ remaining: credits, photoEnabled: true, globalRemaining: 10, adsAvailable: true, rewardedVideoAdUnitId: "adunit-test" });
    service.beginRewardedVideo = async () => ({ id: "video" });
    service.completeRewardedVideo = async input => { if (input.complete) credits++; return { granted: input.complete ? 1 : 0 }; };
    wx.createRewardedVideoAd = () => { let close; return { onClose: cb => close = cb, onError: () => {}, offClose: () => {}, offError: () => {}, destroy: () => {}, show: () => { setTimeout(() => close({ isEnded: ended }), 0); return Promise.resolve(); } }; };
    const p = loadPage("photo"); p.onLoad({ slot: "dinner" });
    await p.acceptImage("wxfile://food.jpg"); const id = p.pending.requestId;
    p.processPending = async () => { recognized++; assert.equal(p.pending.requestId, id); };
    await p.confirmPhoto(); assert.equal(p.data.screen, "access"); assert.equal(recognized, 0);
    await p.watchAndRecognize(); assert.equal(recognized, 0); assert.equal(credits, 0); assert.equal(p.pending.requestId, id);
    ended = true; await p.watchAndRecognize(); assert.equal(recognized, 1); assert.equal(p.data.screen, "capture");
  } finally { Object.assign(service, originals); saved = previous; global.wx = oldWx; }
});

test("membership selection retains catalog prices and requires service agreement before purchase", async () => {
  const p = loadPage("membership");
  await p.refresh();
  assert.equal(p.data.selectedPlanId, p.data.plans[0].id);
  assert.equal(p.data.agreed, false);
  const last = p.data.plans[p.data.plans.length - 1];
  p.selectPlan({currentTarget:{dataset:{id:last.id}}});
  await p.refresh();
  assert.equal(p.data.selectedPlanId, last.id);
  p.agreementChanged({detail:{value:["agree"]}});
  assert.equal(p.data.agreed, true);
  p.agreementChanged({detail:{value:[]}});
  assert.equal(p.data.agreed, false);
});

test("photo report opens from history without a new recognition or charge", async () => {
  const previous = saved;
  try {
    saved = undefined;
    const service = require("../miniprogram-1/miniprogram/services/index");
    await service.loginDemo();
    await service.saveProfile({nickname:"历史用户", city:"温州"});
    const report = await service.analyzeFoodPhoto({imagePath:"/owned/history.jpg",requestId:"history-open",mockScenario:"meal"});
    const before = await service.getRecognitionAccess();
    const p = loadPage("photo");
    p.onLoad({analysisId:report.id});
    await p.refresh();
    assert.equal(p.data.screen,"result");
    assert.equal(p.data.result.id,report.id);
    assert.equal(p.data.preview,report.imagePath);
    assert.equal((await service.getRecognitionAccess()).remaining,before.remaining);
    assert.equal((await service.getDiary(report.date)).meals.length,0);
  } finally { saved = previous; }
});

test("forum composer maps topics to categories and cancels video without losing content", async () => {
  const p=loadPage("forum-editor"),oldWx={...wx};
  try {
    p.setData({text:"保留这一段生活分享",title:"今天的日常"});
    p.chooseTopic({currentTarget:{dataset:{kind:"饮食打卡"}}});
    assert.equal(p.data.kind,"饮食打卡");
    assert.equal(p.data.kindIndex,2);
    wx.chooseMedia=o=>{assert.deepEqual(o.mediaType,["video"]);o.fail({errMsg:"chooseMedia:fail cancel"});};
    await p.addVideo();
    assert.equal(p.data.video,"");
    assert.equal(p.data.text,"保留这一段生活分享");
    wx.chooseMedia=o=>o.success({tempFiles:[{tempFilePath:"/tmp/clip.mp4",size:1024,duration:15}]});
    wx.env={USER_DATA_PATH:"/owned"};
    wx.getFileSystemManager=()=>({copyFile:o=>o.success()});
    await p.addVideo();
    assert.match(p.data.video,/^\/owned\/qingdong-forum-.*\.mp4$/);
    p.removeVideo();
    assert.equal(p.data.video,"");
  } finally { Object.keys(wx).forEach(k=>delete wx[k]);Object.assign(wx,oldWx); }
});

test("forum batch picker preserves selected order and remaining capacity", async () => {
  const p=loadPage("forum-editor"),oldWx={...wx}, copied=[];
  try {
    wx.env={USER_DATA_PATH:"/owned"};
    wx.getFileSystemManager=()=>({copyFile:o=>{copied.push(o.srcPath);o.success();}});
    wx.chooseMedia=o=>{assert.equal(o.count,9);o.success({tempFiles:Array.from({length:9},(_,i)=>({tempFilePath:"/tmp/selected-"+i+".jpg",size:1024}))});};
    await p.addImage();
    assert.equal(p.data.images.length,9);
    assert.deepEqual(copied,Array.from({length:9},(_,i)=>"/tmp/selected-"+i+".jpg"));
    assert.match(p.data.images[8],/-8\.jpg$/);
    p.remove({currentTarget:{dataset:{index:3}}});
    const retained=p.data.images.slice();
    wx.chooseMedia=o=>{assert.equal(o.count,1);o.success({tempFiles:[{tempFilePath:"/tmp/replacement.jpg",size:1024}]});};
    await p.addImage();
    assert.deepEqual(p.data.images.slice(0,8),retained);
    assert.equal(p.data.images.length,9);
  } finally {Object.keys(wx).forEach(k=>delete wx[k]);Object.assign(wx,oldWx);}
});

test("daily meals shows only the chosen day's breakfast lunch dinner and snacks", async () => {
  const previous=saved;
  try {
    saved=undefined;
    const service=require("../miniprogram-1/miniprogram/services/index");
    await service.loginDemo();await service.saveProfile({nickname:"三餐用户",city:"温州"});
    const today=(await service.getSnapshot()).date;
    await service.saveRecord({type:"meal",date:today,slot:"breakfast",name:"早餐燕麦",kcal:200});
    await service.saveRecord({type:"meal",date:"2026-01-01",slot:"dinner",name:"另一日餐食",kcal:300});
    const p=loadPage("daily-meals");p.onLoad({date:today});await p.refresh();
    assert.equal(p.data.mealGroups.length,4);
    assert.equal(p.data.mealGroups[0].records[0].name,"早餐燕麦");
    assert.equal(p.data.mealGroups[0].total,200);
    assert.equal(p.data.mealGroups[2].records.length,0);
    p.onLoad({date:"2025-13-99"});await p.refresh();assert.equal(p.data.date,today);
  } finally {saved=previous;}
});

test("exercise picker searches activities and writes chosen date into the diary", async () => {
 const previous=saved;try {
  saved=undefined;const service=require("../miniprogram-1/miniprogram/services/index");await service.loginDemo();await service.saveProfile({nickname:"运动用户",city:"温州"});
  const p=loadPage("exercise");p.onLoad({date:"2026-01-01"});await p.refresh();
  assert.equal(p.data.shown.length,10);p.search({detail:{value:"羽毛球"}});assert.equal(p.data.shown.length,1);
  p.choose({currentTarget:{dataset:{id:p.data.shown[0].id}}});p.duration({detail:{value:"30"}});await p.add();
  assert.equal(p.data.sessions.length,1);assert.equal(p.data.totalMinutes,30);assert.equal(p.data.sessions[0].date,"2026-01-01");
  assert(Number(p.data.totalKcal)>0);assert.equal((await service.getNutritionOverview("2026-01-01")).exerciseCalories,Math.round(Number(p.data.totalKcal)));
 }finally{saved=previous;}
});

test("manual exercise fields save duration on the selected date without inventing calories", async () => {
 const previous=saved;try {
  saved=undefined;const service=require("../miniprogram-1/miniprogram/services/index");await service.loginDemo();await service.saveProfile({nickname:"手填运动",city:"温州"});
  const p=loadPage("exercise");p.onLoad({date:"2026-01-02"});await p.refresh();
  p.manualInput({currentTarget:{dataset:{key:"manualName"}},detail:{value:"饭后拉伸"}});
  p.manualInput({currentTarget:{dataset:{key:"manualMinutes"}},detail:{value:"15"}});
  await p.saveManual();assert.equal(p.data.sessions[0].name,"饭后拉伸");assert.equal(p.data.sessions[0].minutes,15);assert.equal(p.data.sessions[0].date,"2026-01-02");assert.equal(p.data.sessions[0].exerciseKcal,undefined);assert.equal(p.data.totalMinutes,15);assert.equal(p.data.manualName,"");
 }finally{saved=previous;}
});

test("profile retains its scroll position after returning and refreshing data", async () => {
 const oldWx={...wx};try {
  const p=loadPage("profile");await p.refresh();assert.equal(p.data.profileReady,true);
  p.onPageScroll({scrollTop:865});p.onHide();
  let scrolling;
  wx.nextTick=f=>f();wx.pageScrollTo=o=>{scrolling=o;p.onPageScroll({scrollTop:0});o.complete();};
  await p.refresh();
  assert.equal(scrolling.scrollTop,865);assert.equal(scrolling.duration,0);assert.equal(p._scrollTop,865);
  p.onPageScroll({scrollTop:430});p.onHide();await p.refresh();assert.equal(scrolling.scrollTop,430);
 }finally{Object.keys(wx).forEach(k=>delete wx[k]);Object.assign(wx,oldWx);}
});

test("team creation defaults to five invite-only members over seven days and retains advanced controls", async () => {
 const p=loadPage("team-editor");await p.refresh();assert.equal(p.data.form.max,5);assert.equal(p.data.form.method,"invite");assert.equal(p.data.duration,7);assert.equal((Date.parse(p.data.form.end)-Date.parse(p.data.form.start))/86400000,6);
 p.capacity({detail:{value:"2"}});assert.equal(p.data.form.max,10);
 p.method({detail:{value:"1"}});assert.equal(p.data.form.method,"approval");
 p.tasks({detail:{value:["signin","weight"]}});assert.deepEqual(p.data.form.tasks,["signin","weight"]);
 p.toggleAdvanced();assert.equal(p.data.advanced,true);
});

test("reward dropdown filters the matching category and closes on selection", async () => {
 const p=loadPage("reward-tasks");await p.refresh();
 p.toggleDropdown();assert.equal(p.data.dropdownOpen,true);
 for(const type of p.data.types){p.filter({currentTarget:{dataset:{key:type.key}}});assert.equal(p.data.dropdownOpen,false);assert(p.data.shown.every(t=>type.key==="all"||t.type===type.key));assert.equal(p.data.filterLabel,type.key==="all"?"全部奖励":type.label+"奖励");}
});

test("meal basket calculates grams and saves all chosen foods once in the selected slot", async () => {
 const previous=saved;try{
  saved=undefined;const service=require("../miniprogram-1/miniprogram/services/index");await service.loginDemo();await service.saveProfile({nickname:"选食用户",city:"温州"});
  const p=loadPage("records");p.onLoad({type:"meal",date:"2026-01-02",slot:"breakfast"});await p.refresh();
  p.selectFood({currentTarget:{dataset:{key:"food:rice"}}});p.grams({detail:{value:"200"}});p.addFood();assert.equal(p.data.totalKcal,"232.00");
  p.selectFood({currentTarget:{dataset:{key:"food:egg"}}});p.grams({detail:{value:"50"}});p.addFood();assert.equal(p.data.basket.length,2);assert.equal(p.data.totalKcal,"303.50");
  await p.completeMeal();const diary=await service.getDiary("2026-01-02");assert.equal(diary.meals.length,2);assert(diary.meals.every(r=>r.slot==="breakfast"));assert.equal(p.data.basket.length,0);
  const input={requestId:"atomic-meal",date:"2026-01-02",slot:"lunch",items:[{foodId:"rice",grams:100},{foodId:"not-a-food",grams:100}]};await assert.rejects(service.recordMealBasket(input),/不存在/);assert.equal((await service.getDiary(input.date)).meals.length,2);
  input.items.pop();await service.recordMealBasket(input);await service.recordMealBasket(input);assert.equal((await service.getDiary(input.date)).meals.length,3);
 }finally{saved=previous;}
});

test("weight entry saves optional status and synchronizes initial weight and trend delta", async () => {
 const previous=saved;try{
  saved=undefined;const service=require("../miniprogram-1/miniprogram/services/index");await service.loginDemo();await service.saveProfile({nickname:"体重用户",city:"温州",targetWeight:60});
  const p=loadPage("records");p.onLoad({type:"weight",date:"2026-01-02"});await p.refresh();assert.equal(p.data.weightInitial,"—");assert.equal(p.data.weightTarget,60);
  p.input({currentTarget:{dataset:{field:"kg"}},detail:{value:"70"}});p.input({currentTarget:{dataset:{field:"note"}},detail:{value:"晨起空腹，睡得很好"}});await p.save();
  const trend=await service.getWeightTrend();assert.equal(trend.initialWeight,70);assert.equal(trend.records[0].note,"晨起空腹，睡得很好");
  const next=loadPage("records");next.onLoad({type:"weight"});await next.refresh();next.input({currentTarget:{dataset:{field:"kg"}},detail:{value:"69.5"}});assert.equal(next.data.weightDelta,"-0.5");
  await assert.rejects(service.saveRecord({type:"weight",date:trend.records[0].date,kg:68,note:"a".repeat(121)}),/120/);assert.equal((await service.getWeightTrend()).records.length,1);
 }finally{saved=previous;}
});

test("daily weight saves first silently and confirms each later replacement", async () => {
 const previous=saved,oldWx={...wx};try{
  saved=undefined;const service=require("../miniprogram-1/miniprogram/services/index");await service.loginDemo();await service.saveProfile({nickname:"每日体重",city:"温州"});
  const p=loadPage("records");p.onLoad({type:"weight",date:"2026-01-03"});await p.refresh();p.setData({"form.kg":"70","form.note":"晨起"});
  let prompts=0,confirm=false;wx.showModal=o=>{prompts++;assert.match(o.content,/2026-01-03 已记录/);o.success({confirm});};
  await p.save();assert.equal(prompts,0);const first=(await service.getDiary("2026-01-03")).weights[0];
  p.setData({"form.kg":"69","form.note":"晚上"});await p.save();assert.equal(prompts,1);assert.equal((await service.getDiary("2026-01-03")).weights[0].kg,70);
  confirm=true;await p.save();assert.equal(prompts,2);let weights=(await service.getDiary("2026-01-03")).weights;assert.equal(weights.length,1);assert.equal(weights[0].id,first.id);assert.equal(weights[0].kg,69);assert.equal(weights[0].note,"晚上");
  p.setData({"form.kg":"68.5"});await p.save();assert.equal(prompts,3);assert.equal((await service.getDiary("2026-01-03")).weights.length,1);
  await assert.rejects(service.saveRecord({type:"weight",date:"2026-01-03",kg:68,dailyWeight:true,replaceConfirmed:true,expectedWeightSignature:"[]"}),/已更新/);
 }finally{saved=previous;Object.keys(wx).forEach(k=>delete wx[k]);Object.assign(wx,oldWx);}
});
