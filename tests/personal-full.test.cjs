const test = require("node:test"),
  assert = require("node:assert/strict");
const { setup } = require("./helpers.cjs");
test("platform reminder settings create deduplicated local messages and mask public names", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.setDemoRole("hq");
  d.savePlatformSettings({ nicknameMask: true, expiryDays: 10 });
  d.saveReminders({ member: true, weight: true, weightTime: "08:00" });
  d.checkIn();
  d.checkIn();
  const messages = d.getPersonalServices().messages;
  assert.equal(
    messages.filter((x) => x.key && x.key.startsWith("expiry:")).length,
    1,
  );
  assert.equal(
    messages.filter((x) => x.key && x.key.startsWith("weight:")).length,
    1,
  );
  const rows = d.getFullRank({ scope: "national", metric: "checkin" }).rows;
  assert.ok(rows.length);
  assert.ok(rows.every((r) => r.nickname.endsWith("**")));
});
test("member backfill uses current entitlement monthly allowance and cannot repeat or cross month", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  const s = f.store.read();
  s.grants[0].backfillMonthly = 1;
  f.store.write(s);
  assert.equal(d.getMemberBackfill().remaining, 1);
  d.backfillCheckIn("2026-10-20");
  assert.equal(d.getMemberBackfill().remaining, 0);
  assert.throws(() => d.backfillCheckIn("2026-10-20"));
  assert.throws(() => d.backfillCheckIn("2026-09-30"));
  assert.equal(
    f.store
      .read()
      .checkins.filter(
        (c) => c.userId === "demo-user" && c.date === "2026-10-20",
      ).length,
    1,
  );
});
test("profile unique meals, streak and private photo history share canonical records", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.saveRecord({
    type: "meal",
    date: "2026-10-21",
    name: "饭",
    kcal: 200,
    slot: "lunch",
  });
  d.saveRecord({
    type: "meal",
    date: "2026-10-21",
    name: "菜",
    kcal: 100,
    slot: "lunch",
  });
  d.recognizeMeal({ imagePath: "wxfile://saved/a.jpg", requestId: "photo" });
  assert.equal(d.getProfileSummary().meals, 1);
  assert.equal(d.getPhotoHistory().length, 1);
  d.logout();
  assert.throws(() => d.getPhotoHistory(), /登录/);
});
