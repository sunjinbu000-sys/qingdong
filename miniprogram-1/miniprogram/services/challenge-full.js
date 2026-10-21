const { validDate, shiftDate } = require("../utils/date");
const clone = (x) => JSON.parse(JSON.stringify(x));
function createChallengeFullDomain(c) {
  const {
    read,
    change,
    today,
    now,
    id,
    requireLogin,
    requireCity,
    text,
    positive,
    grant,
  } = c;
  const fail = (m) => {
    throw Error(m);
  };
  function full(s) {
    s.full = s.full || {};
    const f = s.full;
    for (const k of [
      "teams",
      "weightReviews",
      "events",
      "prizes",
      "archives",
      "audit",
      "messages",
      "products",
    ])
      f[k] = f[k] || [];
    f.role = f.role || "consumer";
    f.users = f.users || {};
    if (s.session && s.session.userId)
      f.users[s.session.userId] = {
        nickname: s.profile.nickname,
        city: s.profile.city,
        publicRank: !!(s.privacy && s.privacy.publicRank),
        lossRank: !!(s.privacy && s.privacy.lossRank),
      };
    if (!f.challengeSeeded) {
      f.challengeSeeded = true;
      f.users = f.users || {};
      for (const [i, region] of ["温州", "杭州", "宁波"].entries()) {
        const uid = "challenge-friend-" + i;
        f.users[uid] = {
          nickname: ["林小满", "陈晨", "周轻轻"][i],
          city: region,
          publicRank: true,
        };
        f.teams.push({
          id: "demo-team-" + i,
          name: ["瓯江健康同行", "西湖晨光小队", "甬江轻步小队"][i],
          city: region,
          owner: uid,
          max: 10,
          method: "open",
          start: shiftDate(today(), 1),
          end: shiftDate(today(), 7),
          tasks: ["signin", "weight"],
          members: [uid, "challenge-partner-" + i],
          requests: [],
          checks: [],
          invite: "LIGHT" + i,
          launched: false,
        });
        for (let j = 0; j < 3; j++)
          if (
            !s.checkins.some(
              (x) => x.userId === uid && x.date === shiftDate(today(), -j),
            )
          )
            s.checkins.push({
              userId: uid,
              date: shiftDate(today(), -j),
              checkedAt: now(),
            });
        f.events.push({
          id: "demo-event-" + i,
          title: ["瓯江秋日轻徒步", "西湖晨光伙伴见面会", "甬江秋日城市轻徒步"][
            i
          ],
          scope: "city",
          city: region,
          location: region + " · 滨江步道（演示）",
          detail:
            "按自己的节奏散步，交流健康记录习惯。演示活动，请等待运营补充实际安排。",
          capacity: 60,
          virtualCount: 18,
          regStart: shiftDate(today(), -1) + "T08:00",
          regEnd: shiftDate(today(), 2) + "T18:00",
          start: shiftDate(today(), 3) + "T09:00",
          end: shiftDate(today(), 3) + "T11:00",
          fields: [
            { key: "name", label: "姓名", type: "text", required: true },
          ],
          conditions: ["完成现场签到", "完成轻步活动"],
          rewards: [
            { type: "member", name: "活动纪念会员", days: 3, dailyLimit: 5 },
            { type: "physical", name: "轻动纪念徽章", quantity: 1 },
          ],
          status: "published",
          registrations: [],
          claimed: [],
        });
      }
      f.events.push({
        ...clone(f.events[f.events.length - 1]),
        id: "demo-event-hq",
        title: "全国轻动健康生活日",
        scope: "all",
        city: "",
        capacity: 200,
        virtualCount: 46,
      });
    }
    for (const t of f.teams) {
      if (!t.memberships)
        t.memberships = (t.roster || t.members).map((userId) => ({
          userId,
          joined: t.start,
          left: null,
        }));
      t.tasksSnapshot = t.tasksSnapshot || t.tasks.slice();
    }
    return f;
  }
  function op(s) {
    requireLogin(s);
    if (c.requireRole) c.requireRole(s, ["operator", "admin", "hq"]);
    else if (!["operator", "admin", "hq"].includes(full(s).role))
      fail("需要运营权限");
  }
  function log(s, action, target) {
    if (c.audit) c.audit(s, action, target);
    full(s).audit.push({
      id: id("audit"),
      action,
      target,
      date: today(),
      actor: s.session ? s.session.userId : "system",
    });
  }
  const find = (a, k) => a.find((x) => x.id === k) || fail("记录不存在");
  const owner = (s, t) => {
    if (t.owner !== requireLogin(s)) fail("仅队长可操作");
  };
  const city = (s) => s.profile.city;
  function inTeam(t, u, date) {
    return (t.memberships || []).some(
      (m) =>
        (m.userId || m.user) === u &&
        m.joined <= date &&
        (!m.left || date < m.left),
    );
  }
  function progress(t) {
    let needed = 0,
      done = 0;
    for (const u of t.members)
      for (let d = t.start; d <= t.end; d = shiftDate(d, 1))
        if (inTeam(t, u, d))
          for (const task of t.tasksSnapshot || t.tasks) {
            needed++;
            if (
              t.checks.some(
                (x) => x.userId === u && x.task === task && x.date === d,
              )
            )
              done++;
          }
    return {
      needed,
      done,
      complete:
        !!t.launched &&
        t.members.length >= 3 &&
        t.tasks.length >= 2 &&
        needed > 0 &&
        done === needed,
    };
  }
  // Final V0.30 Views open-team permits simultaneous teams; it supersedes GrowthModel overlap exclusion.
  function available(s, t, u) {
    if (t.cancelled || t.closed || today() > t.end || t.members.length >= t.max)
      fail("小队已结束或人数已满");
    const region = (full(s).users[u] || {}).city || city(s);
    if (t.city !== region) fail("仅限同城加入");
    const blocks = [
      ...((s.full.community || {}).blocks || []),
      ...(s.full.blocks || []),
    ];
    if (
      t.members.some((member) =>
        blocks.some(
          (x) =>
            (x.from === member && x.to === u) ||
            (x.to === member && x.from === u),
        ),
      )
    )
      fail("与队内成员存在拉黑关系");
  }
  function addMember(t, u) {
    t.members.push(u);
    t.memberships.push({
      userId: u,
      joined: today() < t.start ? t.start : today(),
      left: null,
    });
    if (t.launched) t.roster = t.members.slice();
  }
  function teamView(s, t) {
    const u = s.session && s.session.userId;
    return {
      ...clone(t),
      invite: t.owner === u ? t.invite : "",
      isCaptain: t.owner === u,
      isMember: t.members.includes(u),
      progress: progress(t),
      contributions: (t.memberships || []).map((m) => ({
        ...m,
        done: t.checks.filter(
          (x) =>
            x.userId === (m.userId || m.user) &&
            x.date >= m.joined &&
            (!m.left || x.date < m.left),
        ).length,
      })),
    };
  }
  function eventOp(s, e) {
    op(s);
    if (
      full(s).role === "operator" &&
      (e.scope === "all" || e.city !== city(s))
    )
      fail("仅可管理本城活动");
  }
  function weights(s, u) {
    return s.records
      .filter(
        (r) => r.type === "weight" && r.userId === u && r.status !== "rejected",
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.createdAt || 0) - (b.createdAt || 0),
      );
  }
  function rank(s, q = {}) {
    const month =
        q.month ||
        (s.full && s.full.browse && s.full.browse.month) ||
        today().slice(0, 7),
      scope = q.scope || "city",
      metric = q.metric || "checkin",
      region =
        q.city ||
        (s.full && s.full.browse && s.full.browse.city) ||
        city(s) ||
        "温州";
    if (!validDate(month + "-01")) fail("月份无效");
    const f = full(s),
      users = new Set(
        s.checkins
          .map((x) => x.userId)
          .concat(s.records.map((x) => x.userId))
          .filter(Boolean),
      );
    const me = s.session && s.session.userId;
    const names = f.users || {};
    let rows = [];
    for (const u of users) {
      const p = u === me ? s.profile : names[u];
      if (
        !p ||
        (metric === "loss"
          ? u === me
            ? !s.privacy.lossRank
            : !p.lossRank
          : p.publicRank === false || (u === me && !s.privacy.publicRank)) ||
        (scope === "city" && p.city !== region) ||
        (f.rankBlacklist || []).includes(u)
      )
        continue;
      const checks = new Set(
        s.checkins
          .filter((x) => x.userId === u && x.date.startsWith(month))
          .map((x) => x.date),
      ).size;
      const w = weights(s, u).filter(
        (x) => x.status === "approved" && x.date.startsWith(month),
      );
      if (metric === "loss" && w.length < 2) continue;
      const loss =
        w.length > 1
          ? Math.max(0, +(w[0].kg - w[w.length - 1].kg).toFixed(1))
          : 0;
      rows.push({
        id: u,
        nickname:
          f.settings && f.settings.nicknameMask
            ? (p.nickname || "轻友").slice(0, 1) + "**"
            : p.nickname || "轻友",
        city: p.city,
        score: metric === "loss" ? loss : checks,
        isMe: u === me,
      });
    }
    if (metric === "teamTotal" || metric === "teamAverage") {
      rows = f.teams
        .filter((t) => !t.cancelled && (scope !== "city" || t.city === region))
        .map((t) => {
          const n = new Set(
            t.checks
              .filter(
                (x) =>
                  x.task === "signin" &&
                  x.date.startsWith(month) &&
                  inTeam(t, x.userId, x.date),
              )
              .map((x) => x.userId + "|" + x.date),
          ).size;
          return {
            id: t.id,
            nickname: t.name,
            city: t.city,
            score:
              metric === "teamAverage" ? +(n / t.members.length).toFixed(2) : n,
          };
        });
    }
    rows.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    let last = null,
      pos = 0;
    rows = rows.map((x, i) => {
      if (x.score !== last) {
        pos = i + 1;
        last = x.score;
      }
      return { ...x, rank: pos };
    });
    return { month, scope, metric, city: region, rows };
  }
  function visibleArchived(s, a) {
    const f = full(s),
      me = s.session && s.session.userId;
    return {
      ...clone(a),
      rows: clone(a.rows)
        .filter((row) => {
          if ((f.rankBlacklist || []).includes(row.id)) return false;
          if (a.metric.startsWith("team")) return true;
          const privacy = row.id === me ? s.privacy : f.users[row.id];
          return (
            !privacy ||
            (a.metric === "loss"
              ? privacy.lossRank === true
              : privacy.publicRank !== false)
          );
        })
        .map(({ eligibleUsers, ...row }) => ({
          ...row,
          nickname:
            f.settings &&
            f.settings.nicknameMask &&
            !a.metric.startsWith("team")
              ? (row.nickname || "轻友").slice(0, 1) + "**"
              : row.nickname,
        })),
      claims: clone(a.claims).filter((x) => x.userId === me),
    };
  }
  function historyStart() {
    const d = today();
    return new Date(
      Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 7, 1),
    )
      .toISOString()
      .slice(0, 7);
  }
  const monthEnd = (m) =>
    shiftDate(
      m.slice(5) === "12"
        ? Number(m.slice(0, 4)) + 1 + "-01-01"
        : m.slice(0, 4) +
            "-" +
            String(Number(m.slice(5)) + 1).padStart(2, "0") +
            "-01",
      -1,
    );
  function freezeMonth(s, month) {
    if (!validDate(month + "-01") || month >= today().slice(0, 7)) return;
    const f = full(s),
      configs = f.prizes.filter((p) => p.month === month),
      regions = [
        ...new Set(
          [
            "温州",
            "杭州",
            "宁波",
            city(s),
            ...Object.values(f.users || {}).map((x) => x.city),
            ...f.teams.map((t) => t.city),
          ].filter(Boolean),
        ),
      ];
    const specs = [
      ...configs,
      ...["national", ...regions].flatMap((region) =>
        ["checkin", "loss", "teamTotal", "teamAverage"].map((metric) => ({
          scope: region === "national" ? "national" : "city",
          city: region === "national" ? "" : region,
          metric,
        })),
      ),
    ];
    for (const spec of specs) {
      const q = {
          month,
          scope: spec.scope,
          city: spec.scope === "national" ? "" : spec.city,
          metric: spec.metric,
        },
        key = [month, q.scope, q.city || "", q.metric].join("|");
      if (f.archives.some((a) => a.key === key)) continue;
      const rows = clone(rank(s, q).rows).map((row) => ({
        ...row,
        eligibleUsers: q.metric.startsWith("team")
          ? clone(
              (f.teams.find((t) => t.id === row.id) || {}).roster ||
                (f.teams.find((t) => t.id === row.id) || {}).members ||
                [],
            )
          : [row.id],
      }));
      const grace = Number.isInteger(f.settings && f.settings.claimGrace)
        ? f.settings.claimGrace
        : 7;
      f.archives.push({
        ...q,
        id: id("archive"),
        key,
        rows,
        prizes: clone(
          configs.filter(
            (x) =>
              x.scope === q.scope &&
              (q.scope === "national" || x.city === q.city) &&
              x.metric === q.metric,
          ),
        ),
        claims: [],
        frozenAt: today(),
        deadline: shiftDate(monthEnd(month), Math.max(0, Math.min(365, grace))),
      });
      log(s, "月榜自动冻结", key);
    }
  }
  function issueRank(s, a, u, automatic) {
    const f = full(s);
    if ((f.rankBlacklist || []).includes(u)) fail("榜单黑名单用户不可领奖");
    const row =
      a.rows.find((x) => x.id === u || (x.eligibleUsers || []).includes(u)) ||
      fail("无个人获奖成绩");
    if (a.claims.some((x) => x.userId === u)) fail("已领取");
    const p =
      a.prizes.find((x) => x.from <= row.rank && row.rank <= x.to) ||
      fail("无对应奖励");
    if (a.claims.filter((x) => x.prizeId === p.id).length >= p.quantity)
      fail("库存已耗尽");
    const receipt = "rank:" + a.id + ":" + u,
      before = f.messages.length;
    if (p.type === "member")
      grant(s, {
        id: receipt,
        userId: u,
        source: "rank",
        title: p.name,
        days: Number(p.days),
        dailyLimit: Number(p.dailyLimit),
      });
    else if (!f.products.some((x) => x.id === receipt))
      f.products.push({
        id: receipt,
        userId: u,
        title: p.name,
        status: "待履约",
        automatic: !!automatic,
      });
    for (const m of f.messages.slice(before)) m.userId = u;
    a.claims.push({
      userId: u,
      prizeId: p.id,
      date: today(),
      automatic: !!automatic,
      receipt,
    });
    if (c.evidence) c.evidence(s, "rank", a.id, u);
    log(s, automatic ? "榜单超时自动发奖" : "领取榜单奖励", a.key + " / " + u);
    if (p.type !== "member")
      f.messages.push({
        id: id("message"),
        userId: u,
        type: "reward",
        title: automatic ? "榜单奖励自动到账" : "榜单奖励到账",
        text: p.name,
        key: receipt,
        date: today(),
        read: false,
      });
    return { receipt, automatic: !!automatic };
  }
  function runJobs(s) {
    const f = full(s),
      previous = shiftDate(today().slice(0, 7) + "-01", -1).slice(0, 7),
      months = new Set([
        previous,
        ...f.prizes
          .map((p) => p.month)
          .filter((m) => validDate(m + "-01") && m < today().slice(0, 7)),
      ]);
    for (const month of months) freezeMonth(s, month);
    let issued = 0;
    for (const a of f.archives)
      if (a.month < today().slice(0, 7) && today() > a.deadline)
        for (const row of a.rows)
          for (const u of row.eligibleUsers || [row.id]) {
            if (
              a.claims.some((x) => x.userId === u) ||
              (f.rankBlacklist || []).includes(u)
            )
              continue;
            const p = a.prizes.find(
              (x) => x.from <= row.rank && row.rank <= x.to,
            );
            if (
              !p ||
              a.claims.filter((x) => x.prizeId === p.id).length >= p.quantity
            )
              continue;
            issueRank(s, a, u, true);
            issued++;
          }
    for (const t of f.teams)
      if (t.launched && !t.closed && today() > t.end) {
        t.closed = "expired";
        t.closedAt = today();
      }
    return { ok: true, issued, archives: f.archives.length };
  }
  const api = {
    listTeams(q = {}) {
      const s = read();
      return full(s)
        .teams.filter(
          (t) =>
            !t.cancelled &&
            t.city ===
              (q.city ||
                (s.full.browse && s.full.browse.city) ||
                city(s) ||
                "温州"),
        )
        .map((t) => teamView(s, t));
    },
    getTeam(k) {
      const s = read();
      return teamView(s, find(full(s).teams, k));
    },
    createTeam(v) {
      return change((s) => {
        const u = requireCity(s),
          days = (Date.parse(v.end) - Date.parse(v.start)) / 86400000 + 1;
        const t = {
          id: id("team"),
          name: text(v.name, "队名", 20),
          max: Number(v.max),
          method: v.method || "open",
          start: v.start,
          end: v.end,
          tasks: [...new Set(v.tasks || [])],
          city: city(s),
          owner: u,
          members: [u],
          memberships: [{ userId: u, joined: v.start, left: null }],
          requests: [],
          checks: [],
          invite: id("code"),
          launched: false,
        };
        if (
          !Number.isInteger(t.max) ||
          t.max < 3 ||
          t.max > 100 ||
          !validDate(t.start) ||
          !validDate(t.end) ||
          t.start < today() ||
          days < 7 ||
          days > 365 ||
          !["open", "approval", "invite"].includes(t.method) ||
          t.tasks.length < 2 ||
          t.tasks.some((x) => !["early", "signin", "weight"].includes(x))
        )
          fail("人数3–100，周期7–365天，至少选择2项任务");
        full(s).teams.push(t);
        return teamView(s, t);
      });
    },
    joinTeam(k, code) {
      return change((s) => {
        const u = requireCity(s),
          t = find(full(s).teams, k);
        available(s, t, u);
        if (t.members.includes(u) || t.requests.includes(u))
          fail("已加入或已申请");
        if (t.method === "invite" && code !== t.invite) fail("邀请码不正确");
        if (t.method === "approval") t.requests.push(u);
        else addMember(t, u);
        return { pending: t.method === "approval" };
      });
    },
    approveTeamMember(k, u, pass = true) {
      return change((s) => {
        const t = find(full(s).teams, k);
        owner(s, t);
        if (!t.requests.includes(u)) fail("申请不存在");
        if (pass) {
          available(s, t, u);
          addMember(t, u);
        }
        t.requests = t.requests.filter((x) => x !== u);
      });
    },
    launchTeam(k) {
      return change((s) => {
        const t = find(full(s).teams, k);
        owner(s, t);
        if (
          t.launched ||
          t.cancelled ||
          t.members.length < 3 ||
          t.closed ||
          today() > t.end
        )
          fail("满3人且须在周期结束前发起");
        t.launched = true;
        t.roster = t.members.slice();
        t.requests = [];
      });
    },
    leaveTeam(k) {
      return change((s) => {
        const u = requireLogin(s),
          t = find(full(s).teams, k);
        if (t.closed || t.cancelled || !t.members.includes(u))
          fail("不在有效小队");
        if (t.owner === u) fail("队长须先转让管理权，不能解散小队");
        t.members = t.members.filter((x) => x !== u);
        t.roster = t.members.slice();
        const m = t.memberships
          .slice()
          .reverse()
          .find((x) => (x.userId || x.user) === u && !x.left);
        if (m) m.left = today();
        t.requests = t.requests.filter((x) => x !== u);
      });
    },
    transferTeam(k, u) {
      return change((s) => {
        const t = find(full(s).teams, k);
        owner(s, t);
        if (t.closed || t.cancelled || u === t.owner || !t.members.includes(u))
          fail("请选择队员");
        t.owner = u;
      });
    },
    forceCloseTeam(k) {
      return change((s) => {
        op(s);
        const t = find(full(s).teams, k);
        t.closed = "forced";
        t.closedAt = today();
        t.roster = t.members.slice();
        log(s, "强制终止小队", k);
      });
    },
    checkTeamTask(k, task) {
      return change((s) => {
        const u = requireLogin(s),
          t = find(full(s).teams, k),
          d = today();
        if (
          !t.launched ||
          t.cancelled ||
          t.closed ||
          !t.members.includes(u) ||
          !inTeam(t, u, d) ||
          d < t.start ||
          d > t.end ||
          !t.tasks.includes(task)
        )
          fail("不在有效任务周期");
        if (
          task === "early" &&
          Number(
            new Intl.DateTimeFormat("en-GB", {
              timeZone: "Asia/Shanghai",
              hour: "2-digit",
              hourCycle: "h23",
            }).format(new Date(now())),
          ) >= 8
        )
          fail("请在北京时间08:00前完成");
        if (task === "weight" && !weights(s, u).some((r) => r.date === d))
          fail("请先记录今日体重");
        if (
          t.checks.some(
            (x) => x.userId === u && x.task === task && x.date === d,
          )
        )
          fail("今日已完成");
        t.checks.push({ userId: u, task, date: d });
        if (c.evidence && progress(t).complete) c.evidence(s, "team", k, u);
        if (
          task === "signin" &&
          !s.checkins.some((x) => x.userId === u && x.date === d)
        )
          s.checkins.push({ userId: u, date: d, checkedAt: now() });
      });
    },
    syncChallengeCheckin(s) {
      const u = s.session && s.session.userId;
      for (const t of full(s).teams)
        if (
          t.launched &&
          !t.cancelled &&
          !t.closed &&
          t.members.includes(u) &&
          inTeam(t, u, today()) &&
          t.tasks.includes("signin") &&
          t.start <= today() &&
          t.end >= today() &&
          !t.checks.some(
            (x) => x.userId === u && x.task === "signin" && x.date === today(),
          )
        )
          t.checks.push({ userId: u, task: "signin", date: today() });
    },
    claimTeamReward(k) {
      return change((s) => {
        const u = requireLogin(s),
          t = find(full(s).teams, k);
        if (
          t.cancelled ||
          !t.members.includes(u) ||
          today() <= t.end ||
          !progress(t).complete
        )
          fail("须周期结束且期末在队成员按实际在队日期完成全部任务");
        t.rewardClaims = t.rewardClaims || [];
        if (t.rewardClaims.includes(u)) fail("已领取小队奖励");
        grant(s, {
          id: "team:" + k + ":" + u,
          source: "team",
          title: "全队达标奖励",
          days: 7,
          dailyLimit: 5,
        });
        t.rewardClaims.push(u);
        if (c.evidence) c.evidence(s, "team", k, u);
      });
    },
    getWeightDashboard(month) {
      const s = read(),
        u = s.session && s.session.userId,
        m = month || today().slice(0, 7),
        rows = weights(s, u).filter((x) => x.date.startsWith(m));
      return {
        month: m,
        rows,
        baseline: rows.filter((r) => r.status === "approved")[0] || null,
        current:
          rows.filter((r) => r.status === "approved").slice(-1)[0] || null,
        reviews: full(s).weightReviews.filter((x) => x.userId === u),
      };
    },
    submitWeightEvidence(v) {
      return change((s) => {
        const u = requireCity(s),
          kg = positive(v.kg, "体重", 300);
        if (kg < 25) fail("体重范围25–300kg");
        if (weights(s, u).filter((x) => x.date === today()).length >= 7)
          fail("每日最多7次");
        const previous = weights(s, u).slice(-1)[0],
          evidence = text(v.evidence, "核验说明或照片路径", 1000),
          r = {
            id: id("weight"),
            type: "weight",
            source: ["manual", "photo", "scale"].includes(v.source)
              ? v.source
              : "manual",
            userId: u,
            date: today(),
            kg,
            status: "pending",
            createdAt: now(),
          };
        s.records.push(r);
        full(s).weightReviews.push({
          id: r.id,
          userId: u,
          kg,
          evidence,
          source: r.source,
          city: city(s),
          date: today(),
          status: "pending",
          abnormal: !!previous && previous.kg - kg >= 5,
        });
        return r;
      });
    },
    listWeightReviews() {
      const s = read();
      requireLogin(s);
      if (c.requireRole)
        c.requireRole(s, ["reviewer", "supervisor", "operator", "admin", "hq"]);
      else op(s);
      return clone(
        full(s).weightReviews.filter(
          (r) => full(s).role !== "operator" || !r.city || r.city === city(s),
        ),
      ).map((r) => ({
        ...r,
        evidenceImage: /^(wxfile:|https?:|\/)/.test(r.evidence)
          ? r.evidence
          : "",
      }));
    },
    reviewWeight(k, pass, note) {
      return change((s) => {
        requireLogin(s);
        if (c.requireRole)
          c.requireRole(s, [
            "reviewer",
            "supervisor",
            "operator",
            "admin",
            "hq",
          ]);
        else op(s);
        const r = find(full(s).weightReviews, k);
        if (
          r.status === "appealed" &&
          !["supervisor", "admin", "hq"].includes(full(s).role)
        )
          fail("申诉须主管裁定");
        if (full(s).role === "operator" && r.city && r.city !== city(s))
          fail("仅可复核本城");
        if (!["pending", "appealed"].includes(r.status)) fail("已处理");
        r.status = pass ? "approved" : "rejected";
        r.note = text(note, "审核理由", 300);
        find(s.records, k).status = r.status;
        log(s, "体重复核", k);
      });
    },
    appealWeight(k, note) {
      return change((s) => {
        const u = requireLogin(s),
          r = find(full(s).weightReviews, k);
        if (r.userId !== u || r.status !== "rejected")
          fail("仅可申诉本人被驳回记录");
        r.appeal = text(note, "申诉说明", 500);
        r.status = "appealed";
      });
    },
    getFullRank(q = {}) {
      const s = read(),
        live = rank(s, q),
        a = full(s).archives.find(
          (x) =>
            x.month === live.month &&
            x.scope === live.scope &&
            (x.scope === "national" || x.city === live.city) &&
            x.metric === live.metric,
        );
      if (a && a.month < today().slice(0, 7))
        return { ...live, rows: visibleArchived(s, a).rows };
      return live;
    },
    setRankBlacklist(u, on) {
      return change((s) => {
        op(s);
        const f = full(s);
        f.rankBlacklist = (f.rankBlacklist || []).filter((x) => x !== u);
        if (on) f.rankBlacklist.push(u);
        log(s, "榜单黑名单", u);
      });
    },
    listManagedEvents() {
      const s = read();
      op(s);
      return full(s)
        .events.filter(
          (e) =>
            full(s).role !== "operator" ||
            (e.scope !== "all" && e.city === city(s)),
        )
        .map((e) => ({
          ...clone(e),
          displayCount:
            e.registrations.filter((r) => r.status === "registered").length +
            e.virtualCount,
        }));
    },
    listEvents(q = {}) {
      const s = read();
      return full(s)
        .events.filter(
          (e) =>
            e.status === "published" &&
            (e.scope === "all" ||
              e.city ===
                (q.city ||
                  (s.full.browse && s.full.browse.city) ||
                  city(s) ||
                  "温州")),
        )
        .map((e) => ({
          ...clone(e),
          registrations: undefined,
          displayCount:
            e.registrations.filter((r) => r.status === "registered").length +
            e.virtualCount,
        }));
    },
    getEvent(k) {
      const s = read(),
        e = find(full(s).events, k),
        u = s.session && s.session.userId;
      const role = full(s).role,
        admin =
          ["admin", "hq"].includes(role) ||
          (role === "operator" && e.scope !== "all" && e.city === city(s));
      return {
        ...clone(e),
        registrations: admin
          ? clone(e.registrations)
          : e.registrations.filter((r) => r.userId === u),
      };
    },
    saveEvent(v) {
      return change((s) => {
        op(s);
        const f = full(s),
          old = v.id ? find(f.events, v.id) : null;
        if (old) eventOp(s, old);
        if (v.scope === "all" && !["hq", "admin"].includes(f.role))
          fail("总部活动需总部权限");
        if (
          old &&
          old.scope !== "all" &&
          old.city !== city(s) &&
          f.role === "operator"
        )
          fail("只能管理本城");
        const e = {
          ...clone(v),
          id: old ? old.id : id("event"),
          title: text(v.title, "活动标题", 60),
          location: text(v.location, "地点", 100),
          detail: text(v.detail, "详情", 2000),
          city: old ? old.city : city(s),
          capacity: Number(v.capacity),
          virtualCount: Number(v.virtualCount || 0),
          status: "published",
          registrations: old ? old.registrations : [],
          claimed: old ? old.claimed : [],
        };
        if (
          !["city", "all"].includes(e.scope) ||
          !Array.isArray(e.fields || []) ||
          (e.fields || []).length > 15 ||
          (e.fields || []).some(
            (f) =>
              !f.key ||
              !f.label ||
              !["text", "tel", "number", "textarea"].includes(f.type || "text"),
          ) ||
          !Number.isInteger(e.capacity) ||
          e.capacity < 1 ||
          e.capacity > 10000 ||
          !Number.isInteger(e.virtualCount) ||
          e.virtualCount < 0 ||
          !e.conditions ||
          !e.conditions.length ||
          !e.rewards ||
          !e.rewards.length ||
          ![e.regStart, e.regEnd, e.start, e.end].every(
            (x) =>
              /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(x) &&
              validDate(x.slice(0, 10)),
          ) ||
          !(e.regStart < e.regEnd && e.regEnd <= e.start && e.start < e.end) ||
          e.capacity <
            e.registrations.filter((r) => r.status === "registered").length
        )
          fail("检查时间顺序、人数、条件及奖励");
        for (const r of e.rewards)
          if (
            !["member", "physical", "other"].includes(r.type) ||
            !r.name ||
            !Number.isInteger(Number(r.quantity || 1)) ||
            Number(r.quantity || 1) < 1 ||
            (r.type === "member" &&
              (!Number.isInteger(Number(r.days)) ||
                Number(r.days) < 1 ||
                Number(r.days) > 365 ||
                !Number.isInteger(Number(r.dailyLimit)) ||
                Number(r.dailyLimit) < 1))
          )
            fail("奖励配置无效");
        if (old) {
          if (JSON.stringify(old.conditions) !== JSON.stringify(e.conditions))
            e.registrations.forEach((r) => (r.verified = []));
          Object.assign(old, e);
        } else f.events.push(e);
        log(s, "保存活动", e.id);
        return e;
      });
    },
    withdrawEvent(k) {
      return change((s) => {
        const e = find(full(s).events, k);
        eventOp(s, e);
        e.status = "withdrawn";
        e.registrations.forEach((r) => (r.status = "terminated"));
        log(s, "终止活动", k);
      });
    },
    enrollEvent(k, values = {}) {
      return change((s) => {
        const u = requireCity(s),
          e = find(full(s).events, k),
          at = new Date(now() + 8 * 3600000).toISOString().slice(0, 16);
        if (
          e.status !== "published" ||
          (e.scope !== "all" && e.city !== city(s)) ||
          at < e.regStart ||
          at > e.regEnd ||
          e.registrations.filter((r) => r.status === "registered").length >=
            e.capacity ||
          e.registrations.some(
            (r) => r.userId === u && r.status === "registered",
          )
        )
          fail("当前不可报名");
        for (const field of e.fields || []) {
          const val = String(values[field.key] || "").trim();
          if (field.required && !val) fail("请填写" + field.label);
          if (
            val.length > 300 ||
            (val && field.type === "number" && !Number.isFinite(Number(val))) ||
            (val && field.type === "tel" && !/^\+?[0-9 -]{6,20}$/.test(val))
          )
            fail(field.label + "格式无效");
        }
        e.registrations.push({
          id: id("registration"),
          userId: u,
          values: clone(values),
          schema: clone(e.fields || []),
          status: "registered",
          date: today(),
          verified: [],
        });
      });
    },
    cancelEventEnrollment(k) {
      return change((s) => {
        const u = requireLogin(s),
          e = find(full(s).events, k),
          at = new Date(now() + 8 * 3600000).toISOString().slice(0, 16);
        if (at < e.regStart || at > e.regEnd) fail("仅报名期可取消");
        const r =
          e.registrations.find(
            (x) => x.userId === u && x.status === "registered",
          ) || fail("未报名");
        r.status = "cancelled";
      });
    },
    verifyEvent(k, u, checks) {
      return change((s) => {
        const e = find(full(s).events, k);
        eventOp(s, e);
        const r =
          e.registrations.find(
            (x) => x.userId === u && x.status === "registered",
          ) || fail("有效报名不存在");
        if (
          e.status !== "published" ||
          today() < e.start.slice(0, 10) ||
          !Array.isArray(checks) ||
          checks.length !== e.conditions.length ||
          checks.some((x) => x !== true)
        )
          fail("逐项核验全部条件且活动开始后才可通过");
        r.verified = checks;
        if (c.evidence) c.evidence(s, "event", k, u);
        log(s, "活动全部条件核验", k + u);
      });
    },
    claimEventReward(k) {
      return change((s) => {
        const u = requireLogin(s),
          e = find(full(s).events, k),
          r = e.registrations.find(
            (x) => x.userId === u && x.status === "registered",
          );
        if (
          e.status !== "published" ||
          !r ||
          r.verified.length !== e.conditions.length ||
          r.verified.some((x) => !x) ||
          e.claimed.includes(u)
        )
          fail("未全部核验、已领取或活动终止");
        for (let i = 0; i < e.rewards.length; i++) {
          const p = e.rewards[i],
            receipt = "event:" + k + ":" + u + ":" + i;
          if (p.type === "member")
            grant(s, {
              id: receipt,
              source: "event",
              title: p.name,
              days: Number(p.days),
              dailyLimit: Number(p.dailyLimit),
            });
          else
            full(s).products.push({
              id: receipt,
              userId: u,
              title: p.name,
              quantity: Number(p.quantity || 1),
              status: "待履约",
            });
        }
        e.claimed.push(u);
      });
    },
    getPrizeOps() {
      const s = read();
      op(s);
      return {
        prizes: clone(full(s).prizes),
        archives: clone(full(s).archives),
        products: clone(full(s).products),
      };
    },
    saveRankPrize(v) {
      return change((s) => {
        op(s);
        const p = {
          ...clone(v),
          id: v.id || id("prize"),
          from: Number(v.from),
          to: Number(v.to),
          quantity: Number(v.quantity),
        };
        p.name = text(p.name, "奖品名称", 60);
        if (
          !validDate(p.month + "-01") ||
          !["city", "national"].includes(p.scope) ||
          !["checkin", "loss", "teamTotal", "teamAverage"].includes(p.metric) ||
          !Number.isInteger(p.from) ||
          !Number.isInteger(p.to) ||
          p.from < 1 ||
          p.to < p.from ||
          !Number.isInteger(p.quantity) ||
          p.quantity < 1 ||
          !["member", "physical"].includes(p.type) ||
          (p.type === "member" &&
            (!Number.isInteger(Number(p.days)) ||
              p.days < 1 ||
              p.days > 365 ||
              !Number.isInteger(Number(p.dailyLimit)) ||
              p.dailyLimit < 1))
        )
          fail("奖品名次范围、库存或权益无效");
        const f = full(s);
        if (
          f.archives.some(
            (a) =>
              a.month === p.month &&
              a.scope === p.scope &&
              a.metric === p.metric &&
              a.city === p.city,
          )
        )
          fail("该榜已冻结");
        if (
          f.prizes.some(
            (x) =>
              x.id !== p.id &&
              x.month === p.month &&
              x.scope === p.scope &&
              x.city === p.city &&
              x.metric === p.metric &&
              x.from <= p.to &&
              p.from <= x.to,
          )
        )
          fail("奖品档位重叠");
        f.prizes = f.prizes.filter((x) => x.id !== p.id);
        f.prizes.push(p);
        return p;
      });
    },
    getArchives() {
      const s = read();
      return full(s)
        .archives.filter(
          (a) => a.month >= historyStart() && a.month < today().slice(0, 7),
        )
        .map((a) => visibleArchived(s, a));
    },
    runMonthSettlement(month) {
      return change((s) => {
        op(s);
        if (!validDate(month + "-01") || month >= today().slice(0, 7))
          fail("仅可结算已结束月份");
        freezeMonth(s, month);
        return clone(full(s).archives.filter((a) => a.month === month));
      });
    },
    claimRankReward(k) {
      return change((s) =>
        issueRank(s, find(full(s).archives, k), requireLogin(s), false),
      );
    },
    runChallengeJobs() {
      return change((s) => runJobs(s));
    },
    _hooks: { runJobs },
    fulfillPrize(k, status) {
      return change((s) => {
        op(s);
        if (!["待履约", "已发货", "已完成"].includes(status)) fail("状态无效");
        find(full(s).products, k).status = status;
        log(s, "奖品履约", k);
      });
    },
  };
  return api;
}
module.exports = { createChallengeFullDomain };
