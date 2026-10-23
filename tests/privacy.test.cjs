const test = require("node:test");
const assert = require("node:assert/strict");
const { setup } = require("./helpers.cjs");
test("privacy is opt-in, type checked and affects public ranking immediately", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.checkIn();
  assert.deepEqual(d.getPrivacy(), {
    publicRank: false,
    showPosterWeight: false,
  });
  d.savePrivacy({ publicRank: true });
  assert.equal(
    d.getRank().rows.some((r) => r.isMe),
    true,
  );
  d.savePrivacy({ publicRank: false });
  assert.equal(
    d.getRank().rows.some((r) => r.isMe),
    false,
  );
  assert.throws(() => d.savePrivacy({ publicRank: "false" }));
  assert.equal(d.getPrivacy().publicRank, false);
});
test("reset returns to clean signed-out state with no records, grants or awards", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.enroll("first-step");
  d.checkIn();
  d.claimReward("first-step");
  d.recognizeMeal({ imagePath: "wxfile://saved/a.jpg", requestId: "test" });
  d.savePrivacy({ publicRank: true });
  d.resetDemo();
  const s = f.store.read();
  for (const key of [
    "records",
    "checkins",
    "enrollments",
    "claims",
    "grants",
    "recognitions",
  ])
    assert.equal(s[key].length, 0);
  assert.equal(d.getSnapshot().signedIn, false);
  assert.equal(s.privacy.publicRank, false);
});
test("write errors preserve prior privacy and reset state", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  f.storage.set = () => {
    throw new Error("disk full");
  };
  assert.throws(() => d.savePrivacy({ publicRank: true }), /存储/);
  assert.equal(d.getPrivacy().publicRank, false);
  assert.throws(() => d.resetDemo(), /存储/);
  assert.equal(d.getSnapshot().signedIn, true);
});

test("health export and confirmed deletion affect only the signed-in user's diary", () => {
  const f = setup(), d = f.domain;
  f.login();
  d.saveRecord({ type: "weight", date: "2026-10-21", kg: 60 });
  const state = f.store.read();
  state.records.push({ id: "other-weight", userId: "other-user", type: "weight", date: "2026-10-21", kg: 80 });
  f.store.write(state);
  assert.equal(d.exportHealthRecords().length, 1);
  assert.throws(() => d.deleteHealthRecords(""), /确认删除/);
  assert.equal(d.exportHealthRecords().length, 1);
  d.deleteHealthRecords("确认删除");
  assert.equal(d.exportHealthRecords().length, 0);
  assert(f.store.read().records.some(r => r.id === "other-weight"));
  d.logout();
  assert.throws(() => d.exportHealthRecords(), /登录/);
});

test("personal health form saves consent and current weight atomically and restricts loss ranking", () => {
  const f = setup(), d = f.domain; f.login();
  const form = { nickname: "小满", city: "温州", height: 165, targetWeight: 55, age: 17, sex: "女", direction: "仅记录日常", healthStatus: "无 / 不适用", currentWeight: 60, initialWeight: 62, calorieGoal: "", goalDays: 30, restrictions: "牛奶、鸡蛋", healthConsent: false };
  assert.throws(() => d.saveProfile(form), /同意/);
  assert.equal(d.exportHealthRecords().length, 0);
  d.savePrivacy({ lossRank: true });
  d.saveProfile({ ...form, healthConsent: true });
  assert.equal(d.getExtendedProfile().healthConsent, true);
  assert.equal(d.getExtendedProfile().age, 17);
  assert.deepEqual(d.getExtendedProfile().restrictions, ["牛奶", "鸡蛋"]);
  assert.equal(d.getWeightTrend().records.at(-1).kg, 60);
  assert.equal(d.getPrivacy().lossRank, false);
  assert.throws(() => d.savePrivacy({ lossRank: true }), /不能参加/);
  const before = structuredClone(f.store.read());
  assert.throws(() => d.saveProfile({ ...form, age: 22, healthConsent: true, calorieGoal: -1 }), /热量/);
  assert.deepEqual(f.store.read(), before);
});
