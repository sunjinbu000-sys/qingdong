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
};
global.getCurrentPages = () => [{}];
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
      const parts = key.split(".");
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
  for (const loggedIn of [false, true]) {
    if (loggedIn) {
      await service.loginDemo();
      await service.saveProfile({ nickname: "测试伙伴", city: "温州" });
    }
    for (const route of app.pages) {
      const name = route.split("/")[1],
        p = loadPage(name);
      if (p.onLoad) p.onLoad({ id: "first-step", type: "meal" });
      await p.refresh();
      assert.equal(
        p.data.error,
        "",
        name + " must load in " + loggedIn + " state",
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
