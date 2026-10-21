const { createStore } = require("../miniprogram-1/miniprogram/services/store");
const {
  createDomain,
} = require("../miniprogram-1/miniprogram/services/domain");
function setup() {
  let saved;
  let time = Date.parse("2026-10-21T04:00:00Z");
  const storage = {
    get: () => saved,
    set: (value) => {
      saved = value;
    },
  };
  const store = createStore(storage);
  const make = () => createDomain({ store, now: () => time });
  const domain = make();
  return {
    domain,
    store,
    storage,
    make,
    setTime: (value) => {
      time = Date.parse(value);
    },
    login() {
      domain.loginDemo();
      domain.saveProfile({
        nickname: "林小满",
        city: "温州",
        height: 165,
        targetWeight: 55,
      });
    },
  };
}
module.exports = { setup };
