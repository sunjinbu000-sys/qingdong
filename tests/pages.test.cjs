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
    await p.refresh();
    p.onCameraReady();
    let shots = 0;
    wx.createCameraContext = () => ({
      takePhoto: (o) => {
        shots++;
        setTimeout(
          () => o.success({ tempImagePath: "wxfile://camera-tmp.jpg" }),
          5,
        );
      },
    });
    await Promise.all([p.capture(), p.capture()]);
    assert.equal(shots, 1);
    assert.equal(p.data.preview, "wxfile://camera-tmp.jpg");
    assert.equal(p.data.needsAccount, true);
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
    editor.setData({ kind: "运动打卡" });
    await editor.save({ currentTarget: { dataset: {} } });
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
