const config = require("../config/index");
const { createStore } = require("./store");
const { createDomain } = require("./domain");
const KEY = "qingdong.phase1.v1";
const store = createStore({
  get: () => wx.getStorageSync(KEY) || undefined,
  set: (value) =>
    value === undefined
      ? wx.removeStorageSync(KEY)
      : wx.setStorageSync(KEY, value),
});
const domain = createDomain({ store });
const service = {};
Object.keys(domain).forEach((name) => {
  service[name] = (...args) =>
    Promise.resolve().then(() => {
      if (config.mode !== "mock")
        throw new Error("真实接口尚未配置，请先使用模拟模式");
      return domain[name](...args);
    });
});
module.exports = service;
