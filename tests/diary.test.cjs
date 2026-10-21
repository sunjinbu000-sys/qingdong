const test = require("node:test");
const assert = require("node:assert/strict");
const { setup } = require("./helpers.cjs");
test("login gates writes, and beginner grant is issued once across sessions", () => {
  const f = setup(),
    d = f.domain;
  assert.throws(() => d.saveRecord({}), /登录/);
  f.login();
  assert.equal(f.store.read().grants.length, 1);
  d.logout();
  d.loginDemo();
  assert.equal(f.store.read().grants.length, 1);
});
test("diary supports three record types, persistence, summary and deletion", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  const meal = d.saveRecord({
    type: "meal",
    date: "2026-10-21",
    name: "午餐",
    kcal: 520,
    slot: "lunch",
  });
  d.saveRecord({
    type: "exercise",
    date: "2026-10-21",
    name: "散步",
    minutes: 30,
  });
  d.saveRecord({ type: "weight", date: "2026-10-21", kg: 61.5 });
  const diary = f.make().getDiary("2026-10-21");
  assert.equal(diary.meals.length, 1);
  assert.equal(diary.exercises.length, 1);
  assert.equal(diary.weights.length, 1);
  assert.deepEqual(diary.summary, { calories: 520, minutes: 30, weight: 61.5 });
  assert.equal(d.getSnapshot().calories, 520);
  d.deleteRecord(meal.id);
  assert.equal(d.getDiary("2026-10-21").summary.calories, 0);
});
test("invalid and future diary records do not mutate persisted data", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  for (const fields of [
    { date: "2026-10-22", kcal: 200 },
    { date: "2026-02-30", kcal: 200 },
    { date: "2026-10-21", kcal: NaN },
    { date: "2026-10-21", kcal: -1 },
    { date: "2026-10-21", kcal: "" },
  ]) {
    assert.throws(() =>
      d.saveRecord({ type: "meal", name: "test", slot: "lunch", ...fields }),
    );
  }
  assert.equal(f.store.read().records.length, 0);
  assert.throws(() => d.saveProfile({ nickname: " ", city: "温州" }));
});
test("private records stay hidden on logout and return on same-account login", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.saveRecord({ type: "weight", date: "2026-10-21", kg: 62 });
  d.logout();
  assert.equal(d.getSnapshot().weight, "—");
  assert.throws(() => d.getDiary("2026-10-21"), /登录/);
  d.loginDemo();
  assert.equal(d.getDiary("2026-10-21").weights.length, 1);
});
