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
