const test = require("node:test");
const assert = require("node:assert/strict");
const { setup } = require("./helpers.cjs");
test("daily check-in and enrollment are idempotent across domain recreation", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.enroll("first-step");
  d.enroll("first-step");
  d.checkIn();
  f.make().checkIn();
  assert.equal(f.store.read().enrollments.length, 1);
  assert.equal(
    f.store.read().checkins.filter((c) => c.userId === "demo-user").length,
    1,
  );
  assert.equal(d.getActivity("first-step").progress, 1);
});
test("progress counts enrollment day onwards and distinct days only", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.checkIn();
  f.setTime("2026-10-22T04:00:00Z");
  d.enroll("three-days");
  d.checkIn();
  assert.equal(d.getActivity("three-days").progress, 1);
  f.setTime("2026-10-23T04:00:00Z");
  d.checkIn();
  assert.equal(d.getActivity("three-days").progress, 2);
  assert.throws(() => d.claimReward("three-days"), /达标/);
  const s = f.store.read();
  s.activities.find((a) => a.id === "three-days").end = "2026-10-23";
  f.store.write(s);
  f.setTime("2026-10-24T04:00:00Z");
  d.checkIn();
  assert.equal(d.getActivity("three-days").progress, 2);
  assert.throws(() => d.enroll("three-days"), /结束/);
});
test("qualified rewards reserve a slot and claim at most once", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.enroll("first-step");
  d.checkIn();
  assert.equal(d.getActivity("first-step").remainingSlots, 99);
  d.claimReward("first-step");
  f.make().claimReward("first-step");
  assert.equal(f.store.read().claims.length, 1);
  assert.equal(f.store.read().grants.length, 2);
  assert.equal(d.getActivity("first-step").claimed, true);
  assert.equal(d.getRewards().claims.length, 1);
});
test("full and expired rewards cannot be claimed", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  const s = f.store.read();
  s.activities[0].slots = 0;
  f.store.write(s);
  d.enroll("first-step");
  d.checkIn();
  assert.throws(() => d.claimReward("first-step"), /名额/);
  const g = setup();
  g.login();
  g.domain.enroll("first-step");
  g.domain.checkIn();
  g.setTime("2027-01-01T04:00:00Z");
  assert.throws(() => g.domain.claimReward("first-step"), /过期/);
});
test("public rank omits unconsenting account and raw health fields", () => {
  const f = setup();
  f.login();
  f.domain.checkIn();
  assert.equal(
    f.domain.getRank().rows.some((r) => r.isMe),
    false,
  );
  const s = f.store.read();
  s.privacy.publicRank = true;
  f.store.write(s);
  assert.equal(
    f.domain.getRank().rows.some((r) => r.isMe),
    true,
  );
  for (const row of f.domain.getRank().rows) {
    assert.equal(row.kg, undefined);
    assert.equal(row.weight, undefined);
    assert.equal(row.records, undefined);
  }
});
