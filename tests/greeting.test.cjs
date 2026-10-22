const test = require("node:test");
const assert = require("node:assert/strict");
const { timeGreeting } = require("../miniprogram-1/miniprogram/utils/date");
test("home greeting includes noon and follows the entering device local hour at each boundary", () => {
  for (const [hour, minute, expected] of [
    [0, 0, "晚上好"],
    [4, 59, "晚上好"],
    [5, 0, "早上好"],
    [10, 59, "早上好"],
    [11, 0, "中午好"],
    [13, 59, "中午好"],
    [14, 0, "下午好"],
    [17, 59, "下午好"],
    [18, 0, "晚上好"],
    [23, 59, "晚上好"],
  ]) {
    assert.equal(timeGreeting(new Date(2026, 9, 22, hour, minute)), expected);
  }
});
