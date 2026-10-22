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
