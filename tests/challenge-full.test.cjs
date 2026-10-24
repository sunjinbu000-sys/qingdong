const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  createChallengeFullDomain,
} = require("../miniprogram-1/miniprogram/services/challenge-full");
function fixture() {
  let clock = Date.parse("2026-10-21T01:00:00Z"),
    serial = 0,
    state = {
      session: { userId: "a" },
      profile: { city: "温州", nickname: "本人" },
      privacy: { publicRank: true },
      records: [],
      checkins: [],
      grants: [],
      full: {
        role: "consumer",
        challengeSeeded: true,
        users: { b: { city: "温州", nickname: "乙" } },
      },
    };
  const login = (s) => {
    if (!s.session) throw Error("登录");
    return s.session.userId;
  };
  const api = createChallengeFullDomain({
    read: () => state,
    change: (fn) => {
      const draft = structuredClone(state);
      const result = fn(draft);
      state = draft;
      return result;
    },
    today: () => new Date(clock + 28800000).toISOString().slice(0, 10),
    now: () => clock,
    id: (p) => p + ++serial,
    requireLogin: login,
    requireCity: login,
    requireRole: (s, roles) => {
      if (!roles.includes(s.full.role)) throw Error("权限");
    },
    text: (v, l, max) => {
      if (!v || v.length > max) throw Error(l);
      return v;
    },
    positive: (v) => {
      if (!(Number(v) > 0)) throw Error("数值");
      return Number(v);
    },
    grant: (s, v) => s.grants.push(v),
  });
  return {
    api,
    get s() {
      return state;
    },
    user: (u) => {
      state.session.userId = u;
    },
    role: (r) => {
      state.full.role = r;
    },
    clock: (d) => {
      clock = Date.parse(d);
    },
  };
}
test("final V0.30 supports simultaneous teams with per-team review and member deduplication", () => {
  const x = fixture(),
    a = x.api;
  assert.throws(() =>
    a.createTeam({
      name: "短",
      max: 3,
      start: "2026-10-21",
      end: "2026-10-22",
      tasks: ["signin", "weight"],
    }),
  );
  const t = a.createTeam({
    name: "同行",
    max: 3,
    method: "approval",
    start: "2026-10-21",
    end: "2026-10-27",
    tasks: ["signin", "weight"],
  });
  x.user("b");
  assert.equal(a.joinTeam(t.id).pending, true);
  x.user("a");
  a.approveTeamMember(t.id, "b");
  x.user("c");
  a.joinTeam(t.id);
  x.user("a");
  a.approveTeamMember(t.id, "c");
  const second = a.createTeam({
    name: "同期伙伴",
    max: 3,
    start: "2026-10-21",
    end: "2026-10-27",
    tasks: ["signin", "weight"],
  });
  assert.notEqual(second.id, t.id);
  x.user("b");
  a.joinTeam(second.id);
  assert.ok(a.getTeam(second.id).members.includes("b"));
  assert.throws(() => a.joinTeam(second.id));
  x.user("a");
  a.launchTeam(t.id);
  x.user("b");
  a.leaveTeam(t.id);
  x.user("d");
  a.joinTeam(t.id);
  x.user("a");
  a.approveTeamMember(t.id, "d");
  assert.ok(a.getTeam(t.id).members.includes("d"));
});
test("weight evidence review appeal permissions and rank privacy", () => {
  const x = fixture(),
    a = x.api;
  const r = a.submitWeightEvidence({ kg: 72, evidence: "photo" });
  assert.throws(() => a.reviewWeight(r.id, true, "通过"));
  x.role("operator");
  a.reviewWeight(r.id, false, "补充清晰材料");
  x.role("consumer");
  a.appealWeight(r.id, "补充证据");
  x.role("admin");
  a.reviewWeight(r.id, true, "核验通过");
  assert.equal(a.getWeightDashboard().baseline.kg, 72);
  x.s.checkins.push({ userId: "a", date: "2026-10-21" });
  const rank = a.getFullRank();
  assert.equal(rank.rows.length, 1);
  assert.equal(rank.rows[0].kg, undefined);
  assert.equal(rank.rows[0].evidence, undefined);
  x.s.privacy.publicRank = false;
  assert.equal(a.getFullRank().rows.length, 0);
});
test("event actual capacity, custom fields, operator checkoff and once-only rewards", () => {
  const x = fixture(),
    a = x.api;
  x.role("admin");
  const e = a.saveEvent({
    title: "活动",
    location: "江边",
    detail: "轻步",
    scope: "city",
    capacity: 1,
    virtualCount: 999,
    regStart: "2026-10-20T08:00",
    regEnd: "2026-10-21T18:00",
    start: "2026-10-22T09:00",
    end: "2026-10-22T11:00",
    fields: [{ key: "name", label: "姓名", required: true }],
    conditions: ["签到", "完成"],
    rewards: [{ type: "member", name: "赠卡", days: 3, dailyLimit: 5 }],
  });
  assert.throws(() => a.enrollEvent(e.id, {}));
  a.enrollEvent(e.id, { name: "甲" });
  x.user("b");
  assert.throws(() => a.enrollEvent(e.id, { name: "乙" }));
  x.user("a");
  assert.throws(() => a.claimEventReward(e.id));
  x.clock("2026-10-22T01:00:00Z");
  assert.throws(() => a.verifyEvent(e.id, "a", [true, false]));
  a.verifyEvent(e.id, "a", [true, true]);
  a.claimEventReward(e.id);
  assert.equal(x.s.grants.length, 1);
  assert.throws(() => a.claimEventReward(e.id));
});
test("month archive is immutable, rank prize stock and grant idempotency", () => {
  const x = fixture(),
    a = x.api;
  x.role("admin");
  x.s.checkins.push({ userId: "a", date: "2026-09-02" });
  a.saveRankPrize({
    month: "2026-09",
    scope: "city",
    city: "温州",
    metric: "checkin",
    name: "九月奖",
    from: 1,
    to: 3,
    quantity: 3,
    type: "member",
    days: 7,
    dailyLimit: 5,
  });
  const archives = a.runMonthSettlement("2026-09");
  assert.ok(archives.length >= 1);
  assert.throws(() =>
    a.saveRankPrize({
      month: "2026-09",
      scope: "city",
      city: "温州",
      metric: "checkin",
      name: "改奖",
      from: 1,
      to: 3,
      quantity: 3,
      type: "physical",
    }),
  );
  x.s.checkins.push({ userId: "a", date: "2026-09-03" });
  assert.equal(a.getArchives()[0].rows[0].score, 1);
  a.claimRankReward(archives[0].id);
  assert.equal(x.s.grants[0].days, 7);
  assert.throws(() => a.claimRankReward(archives[0].id));
  a.runMonthSettlement("2026-09");
  assert.equal(a.getArchives().filter((x) => x.prizes.length).length, 1);
});

test("native forms create a team, process applications and pass complete event checklists", async () => {
  const vm = require("node:vm"),
    fs = require("node:fs"),
    path = require("node:path");
  let definition,
    navigated = "",
    calls = [];
  function load(name, service) {
    const filename = path.resolve(
      __dirname,
      "../miniprogram-1/miniprogram/pages/" + name + "/index.js",
    );
    vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
      require: () => ({
        validDate: require("../miniprogram-1/miniprogram/utils/date").validDate,
        service,
        navigate: (url) => {
          navigated = url;
        },
        page: (o) => {
          definition = o;
        },
      }),
    });
    const p = {
      ...definition,
      data: structuredClone(definition.data),
      setData(v) {
        Object.assign(this.data, v);
      },
      requireAccount: async () => true,
      action: (fn) => fn(),
      loadData: (fn) => fn(),
    };
    return p;
  }
  const team = load("team-editor", {
    createTeam: async (v) => {
      calls.push(v);
      return { id: "new-team" };
    },
  });
  await team.submit({
    detail: {
      value: {
        name: "同行",
        max: "3",
        start: "2026-10-22",
        end: "2026-10-28",
        tasks: ["signin", "weight"],
        method: "approval",
      },
    },
  });
  assert.equal(calls.length, 0);
  assert.equal(team.data.rulesOpen, true);
  await team.confirmCreate();
  assert.equal(calls[0].name, "同行");
  assert.equal(navigated, "/pages/team-detail/index?id=new-team");
  const event = load("event-detail", {
    getSnapshot: async () => ({signedIn:true,profile:{city:"温州"}}),
    getEvent: async () => ({ conditions: ["签到", "步行"],start:"2026-10-21T09:00",end:"2026-10-21T11:00",regStart:"2026-10-20T09:00",regEnd:"2026-10-21T08:00" }),
    verifyEvent: async (...args) => calls.push(args),
  });
  event.key = "event-1";
  event.data.event = { conditions: ["签到", "步行"] };
  await event.verify({
    currentTarget: { dataset: { user: "friend" } },
    detail: { value: { checks: ["0", "1"] } },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[1])), [
    "event-1",
    "friend",
    [true, true],
  ]);
});

test("automatic jobs freeze past snapshots and award overdue prizes once to each eligible user", () => {
  const x = fixture(),
    a = x.api;
  x.role("admin");
  x.s.checkins.push(
    { userId: "a", date: "2026-09-02" },
    { userId: "b", date: "2026-09-02" },
  );
  x.s.records.push(
    {
      id: "pending-weight",
      type: "weight",
      userId: "a",
      date: "2026-09-01",
      kg: 80,
      status: "pending",
    },
    {
      id: "approved-weight",
      type: "weight",
      userId: "a",
      date: "2026-09-20",
      kg: 75,
      status: "approved",
    },
  );
  a.saveRankPrize({
    month: "2026-09",
    scope: "city",
    city: "温州",
    metric: "checkin",
    name: "月度奖",
    from: 1,
    to: 3,
    quantity: 3,
    type: "member",
    days: 7,
    dailyLimit: 5,
  });
  a.saveRankPrize({
    month: "2026-10",
    scope: "city",
    city: "温州",
    metric: "checkin",
    name: "尚未到期",
    from: 1,
    to: 3,
    quantity: 3,
    type: "member",
    days: 7,
    dailyLimit: 5,
  });
  x.s.session = null;
  const result = a._hooks.runJobs(x.s);
  assert.equal(result.issued, 2);
  assert.equal(x.s.grants.length, 2);
  assert.deepEqual(x.s.grants.map((g) => g.userId).sort(), ["a", "b"]);
  const archived = x.s.full.archives.find(
    (v) =>
      v.month === "2026-09" &&
      v.scope === "city" &&
      v.city === "温州" &&
      v.metric === "checkin",
  );
  assert.equal(archived.deadline, "2026-10-07");
  assert.ok(archived.claims.every((v) => v.automatic));
  assert.ok(!x.s.full.archives.some((v) => v.month === "2026-10"));
  const loss = x.s.full.archives.find(
    (v) => v.city === "温州" && v.metric === "loss",
  );
  assert.deepEqual(loss.rows, []);
  x.s.records[0].status = "approved";
  x.s.checkins.push({ userId: "a", date: "2026-09-03" });
  a._hooks.runJobs(x.s);
  assert.equal(x.s.grants.length, 2);
  assert.equal(archived.rows.find((v) => v.id === "a").score, 1);
  assert.deepEqual(loss.rows, []);
  assert.equal(a._hooks.runJobs(x.s).issued, 0);
});

test("active team membership dates preserve departed contributions and block future tasks", () => {
  const x = fixture(),
    a = x.api,
    t = a.createTeam({
      name: "动态小队",
      max: 5,
      method: "open",
      start: "2026-10-21",
      end: "2026-10-27",
      tasks: ["signin", "weight"],
    });
  x.user("b");
  a.joinTeam(t.id);
  x.user("c");
  a.joinTeam(t.id);
  x.user("a");
  a.launchTeam(t.id);
  a.checkTeamTask(t.id, "signin");
  x.clock("2026-10-22T01:00:00Z");
  x.user("d");
  a.joinTeam(t.id);
  assert.equal(
    a.getTeam(t.id).memberships.find((m) => m.userId === "d").joined,
    "2026-10-22",
  );
  assert.equal(a.getTeam(t.id).progress.needed, 54);
  a.checkTeamTask(t.id, "signin");
  x.clock("2026-10-23T01:00:00Z");
  a.leaveTeam(t.id);
  assert.throws(() => a.checkTeamTask(t.id, "signin"));
  const view = a.getTeam(t.id);
  assert.equal(view.contributions.find((m) => m.userId === "d").done, 1);
  assert.equal(
    view.memberships.find((m) => m.userId === "d").left,
    "2026-10-23",
  );
  assert.equal(view.progress.needed, 42);
  x.user("a");
  assert.throws(() => a.leaveTeam(t.id));
  a.transferTeam(t.id, "b");
  a.leaveTeam(t.id);
  assert.ok(!a.getTeam(t.id).members.includes("a"));
});
test("team admission rejects blocked relationships and cross-city applicants", () => {
  const x = fixture(),
    a = x.api,
    t = a.createTeam({
      name: "同城小队",
      max: 5,
      method: "open",
      start: "2026-10-21",
      end: "2026-10-27",
      tasks: ["signin", "weight"],
    });
  x.s.full.community = { blocks: [{ from: "a", to: "b" }] };
  x.user("b");
  assert.throws(() => a.joinTeam(t.id), /拉黑/);
  x.user("c");
  x.s.profile.city = "杭州";
  assert.throws(() => a.joinTeam(t.id), /同城/);
});
test("loss rank privacy is independent from public checkin consent and cached for signed-out jobs", () => {
  const x = fixture(),
    a = x.api;
  x.s.records.push(
    {
      id: "w1",
      type: "weight",
      userId: "a",
      date: "2026-10-01",
      kg: 80,
      status: "approved",
    },
    {
      id: "w2",
      type: "weight",
      userId: "a",
      date: "2026-10-20",
      kg: 78,
      status: "approved",
    },
  );
  x.s.checkins.push({ userId: "a", date: "2026-10-21" });
  x.s.privacy.publicRank = true;
  x.s.privacy.lossRank = false;
  assert.equal(a.getFullRank({ metric: "loss" }).rows.length, 0);
  assert.equal(a.getFullRank({ metric: "checkin" }).rows.length, 1);
  x.s.privacy.publicRank = false;
  x.s.privacy.lossRank = true;
  assert.equal(a.getFullRank({ metric: "loss" }).rows[0].score, 2);
  assert.equal(a.getFullRank({ metric: "checkin" }).rows.length, 0);
  x.s.session = null;
  assert.equal(a.getFullRank({ metric: "loss" }).rows[0].score, 2);
  x.s.full.rankBlacklist = ["a"];
  assert.equal(a.getFullRank({ metric: "loss" }).rows.length, 0);
});

test("public archived projections honor current privacy blacklist and six-month history without altering snapshots", () => {
  const x = fixture(),
    a = x.api;
  x.role("admin");
  x.s.privacy.lossRank = true;
  x.s.records.push(
    {
      id: "w1",
      type: "weight",
      userId: "a",
      date: "2026-09-01",
      kg: 80,
      status: "approved",
    },
    {
      id: "w2",
      type: "weight",
      userId: "a",
      date: "2026-09-20",
      kg: 78,
      status: "approved",
    },
  );
  x.s.checkins.push({ userId: "a", date: "2026-09-02" });
  a.runMonthSettlement("2026-09");
  a.runMonthSettlement("2026-03");
  const frozen = x.s.full.archives.find(
    (v) => v.month === "2026-09" && v.city === "温州" && v.metric === "loss",
  );
  assert.equal(frozen.rows.length, 1);
  x.s.privacy.lossRank = false;
  x.role("consumer");
  assert.equal(a.getArchives().find((v) => v.id === frozen.id).rows.length, 0);
  assert.equal(
    a.getFullRank({ month: "2026-09", metric: "loss" }).rows.length,
    0,
  );
  assert.ok(!a.getArchives().some((v) => v.month === "2026-03"));
  assert.equal(frozen.rows.length, 1);
  x.s.privacy.lossRank = true;
  x.s.full.rankBlacklist = ["a"];
  assert.equal(a.getArchives().find((v) => v.id === frozen.id).rows.length, 0);
  assert.equal(frozen.rows[0].score, 2);
  x.s.full.rankBlacklist = [];
  x.s.privacy.publicRank = false;
  assert.equal(
    a
      .getArchives()
      .find(
        (v) =>
          v.month === "2026-09" && v.city === "温州" && v.metric === "checkin",
      ).rows.length,
    0,
  );
});
test("operator sees form values only for own-city events, public cards never include registrations", () => {
  const x = fixture(),
    a = x.api;
  x.role("admin");
  const input = {
    title: "私密报名",
    location: "江边",
    detail: "活动",
    scope: "city",
    capacity: 3,
    virtualCount: 0,
    regStart: "2026-10-20T08:00",
    regEnd: "2026-10-21T18:00",
    start: "2026-10-22T09:00",
    end: "2026-10-22T11:00",
    fields: [{ key: "phone", label: "电话", type: "tel", required: true }],
    conditions: ["签到"],
    rewards: [{ type: "physical", name: "纪念品", quantity: 1 }],
  };
  const own = a.saveEvent(input);
  a.enrollEvent(own.id, { phone: "13800000000" });
  x.s.profile.city = "杭州";
  const foreign = a.saveEvent(input);
  a.enrollEvent(foreign.id, { phone: "13900000000" });
  x.s.profile.city = "温州";
  x.user("operator");
  x.role("operator");
  assert.equal(a.getEvent(own.id).registrations[0].values.phone, "13800000000");
  assert.equal(a.getEvent(foreign.id).registrations.length, 0);
  assert.ok(a.listEvents().every((e) => e.registrations === undefined));
  x.role("hq");
  assert.equal(
    a.getEvent(foreign.id).registrations[0].values.phone,
    "13900000000",
  );
  assert.equal(a.getEvent(foreign.id).canManage, true);
  x.s.session = null;
  assert.equal(a.getEvent(foreign.id).registrations.length, 0);
  assert.equal(a.getEvent(foreign.id).canManage, false);
});

test("invite code resolves a team and retains existing admission guards", () => {
  const x = fixture(), a = x.api;
  const team = a.createTeam({ name: "好友同行", max: 3, method: "invite", start: "2026-10-21", end: "2026-10-27", tasks: ["signin", "weight"] });
  x.user("b");
  assert.throws(() => a.joinTeamByInvite("missing"), /邀请码/);
  const joined = a.joinTeamByInvite("  " + team.invite + "  ");
  assert.equal(joined.id, team.id);
  assert.equal(joined.pending, false);
  assert(a.getTeam(team.id).isMember);
  assert.throws(() => a.joinTeamByInvite(team.invite), /已加入/);
});
