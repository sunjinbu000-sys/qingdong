const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve("miniprogram-1/miniprogram");
test("all 33 prototype modules resolve to registered native pages", () => {
  const sections = require("../miniprogram-1/miniprogram/config/prototype-map");
  const app = require("../miniprogram-1/miniprogram/app.json");
  assert.equal(sections.length, 33);
  assert.equal(new Set(sections.map((s) => s.id)).size, 33);
  for (const section of sections)
    assert.ok(
      app.pages.includes(section.route.split("?")[0].slice(1)),
      section.id,
    );
  for (const route of app.pages) {
    const source = fs.readFileSync(path.join(root, route + ".wxml"), "utf8");
    assert.ok(
      !/wx:(?:if|elif)="(?!\{\{)[^"]+"/.test(source),
      route + " has literal condition",
    );
  }
  const home = fs.readFileSync(
    path.join(root, "pages/index/index.wxml"),
    "utf8",
  );
  assert.match(home, /shortcuts/);
});
