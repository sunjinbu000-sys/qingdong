const { validDate, shiftDate } = require("../utils/date");
const sections = require("../config/prototype-map");
const issues = require("../config/discussion-issues");
const Health = require("./reference/health-model");
const { membershipView } = require("./membership");
const ROLES = ["consumer", "operator", "admin", "hq", "reviewer", "supervisor"];
const TYPES = {
  checkin: "累计签到",
  forum: "连续发帖",
  invite: "邀请注册",
  video: "激励视频",
  event: "线下活动核验",
  team: "小队全员达标",
  rank: "榜单结算",
  manual: "线下人工确认",
};
function ensureFull(s, date) {
  const f = (s.full = s.full || {});
  if (!f.role) f.role = "consumer";
  if (!f.settings)
    f.settings = {
      nicknameMask: false,
      claimGrace: 7,
      expiryDays: 3,
      serviceUrl: "",
      announcement: "",
    };
  if (!f.backfill) f.backfill = {};
  if (!f.catalog)
    f.catalog = [
      {
        id: "trial-card",
        name: "轻盈体验卡",
        days: 7,
        dailyLimit: 5,
        price: 0,
        features: ["photo", "adFree"],
        enabled: true,
        revision: 1,
      },
      {
        id: "month-card",
        name: "月度运动会员卡",
        days: 30,
        dailyLimit: 20,
        price: 29.9,
        features: ["photo", "adFree", "plan"],
        enabled: true,
        revision: 1,
      },
      {
        id: "quarter-card",
        name: "季度健康会员卡",
        days: 90,
        dailyLimit: 30,
        price: 79,
        features: ["photo", "adFree", "plan"],
        enabled: true,
        revision: 1,
      },
      {
        id: "year-card",
        name: "年度活力会员卡",
        days: 365,
        dailyLimit: 50,
        price: 259,
        features: ["photo", "adFree", "plan"],
        enabled: true,
        revision: 1,
      },
    ];
  for (const plan of f.catalog) {
    if (plan.perUserLimit == null) plan.perUserLimit = 10;
    if (plan.backfillMonthly == null)
      plan.backfillMonthly = plan.price > 0 ? 3 : 0;
  }
  if (!f.rewardActivities)
    f.rewardActivities = Object.keys(TYPES).map((type, i) => ({
      id: "reward-" + type,
      title: TYPES[type] + " · 轻盈奖励",
      type,
      city: "all",
      start: shiftDate(date, -7),
      end: shiftDate(date, 30),
      claimUntil: shiftDate(date, 37),
      published: true,
      enabled: true,
      claimMode: "all",
      tiers: [
        {
          id: "tier-" + type,
          target: type === "checkin" || type === "forum" ? 3 : 1,
          quota: 100,
          name: "坚持奖励",
          rewardType: "member",
          planId: "trial-card",
          snapshot: JSON.parse(JSON.stringify(f.catalog[0])),
        },
      ],
    }));
  if (!f.rewardLedger) f.rewardLedger = [];
  if (!f.reservations) f.reservations = [];
  if (!f.evidence) f.evidence = [];
  if (!f.banners)
    f.banners = [
      {
        id: "welcome-banner",
        title: "让健康，成为一种日常。",
        subtitle: "发现同城活动，遇见轻动伙伴",
        kind: "page",
        target: "/pages/events/index",
        enabled: true,
        sort: 1,
        color: "#e5eddd",
        imagePath: "",
      },
    ];
  if (!f.healthSettings)
    f.healthSettings = {
      trialDays: 3,
      trialDaily: 3,
      lowAdvice: "规律三餐，保证食物多样。",
      normalAdvice: "保持均衡饮食与日常活动。",
      highAdvice: "适量增加蔬菜和全谷物，循序渐进地活动。",
      budgetWarning: 90,
    };
  if (!f.discussions) f.discussions = {};
  if (!f.messages) f.messages = [];
  if (!f.audit) f.audit = [];
  if (!f.blocks) f.blocks = [];
  if (!f.browse)
    f.browse = { city: s.profile.city || "温州", month: date.slice(0, 7) };
  if (!f.profileExtra)
    f.profileExtra = {
      sex: "未设置",
      age: "",
      initialWeight: "",
      goalDays: 30,
      restrictions: [],
    };
  return f;
}
function createOperationsDomain(c) {
  const { read, change, today, id, requireLogin, requireRole, text, positive } =
    c;
  const full = (s) => ensureFull(s, today());
  const hq = (s) => requireRole(s, ["hq"]);
  const admin = (s) => requireRole(s, ["hq", "admin"]);
  const audit = (s, action, detail) => c.audit(s, action, detail);
  const find = (list, key) => {
    const value = list.find((x) => x.id === key);
    if (!value) throw Error("没有找到这条配置");
    return value;
  };
  function count(s, a, userId) {
    if (a.type === "checkin")
      return new Set(
        s.checkins
          .filter(
            (x) => x.userId === userId && x.date >= a.start && x.date <= a.end,
          )
          .map((x) => x.date),
      ).size;
    const ev = full(s).evidence.filter(
      (x) =>
        x.type === a.type &&
        x.userId === userId &&
        x.date >= a.start &&
        x.date <= a.end,
    );
    if (a.type === "forum") {
      const days = [...new Set(ev.map((x) => x.date))].sort();
      let best = 0,
        streak = 0,
        previous = "";
      for (const d of days) {
        streak = previous && shiftDate(previous, 1) === d ? streak + 1 : 1;
        best = Math.max(best, streak);
        previous = d;
      }
      return best;
    }
    return new Set(ev.map((x) => x.reference)).size;
  }
  function taskView(s, a) {
    const f = full(s),
      userId = s.session && s.session.userId,
      progress = userId ? count(s, a, userId) : 0;
    return {
      ...a,
      typeLabel: TYPES[a.type],
      progress,
      tiers: a.tiers.map((t) => {
        const receipts = f.rewardLedger.filter(
          (r) =>
            r.activityId === a.id && r.tierId === t.id && r.userId === userId,
        );
        const claimed = receipts.length >= (t.perUserLimit || 1);
        const catalogUsed = f.rewardLedger.filter(
          (r) => r.planId === t.planId && r.userId === userId,
        ).length;
        const catalogAllowed =
          t.rewardType !== "member" ||
          catalogUsed < (t.snapshot.perUserLimit || 10);
        const reserved = f.reservations.find(
          (r) =>
            r.activityId === a.id &&
            r.tierId === t.id &&
            r.userId === userId &&
            !r.used &&
            !r.released,
        );
        const occupied = f.reservations.filter(
          (r) => r.activityId === a.id && r.tierId === t.id && !r.released,
        );
        const issued = f.rewardLedger.filter(
          (r) => r.activityId === a.id && r.tierId === t.id,
        ).length;
        const remaining = Math.max(
          0,
          t.quota -
            Math.max(issued, occupied.filter((r) => r.used).length) -
            occupied.filter((r) => !r.used).length,
        );
        const qualified = progress >= t.target;
        const highest = a.tiers
          .filter((x) => progress >= x.target)
          .sort((x, y) => y.target - x.target)[0];
        const canClaim =
          !!userId &&
          qualified &&
          !claimed &&
          catalogAllowed &&
          a.published &&
          a.enabled &&
          today() >= a.start &&
          today() <= a.claimUntil &&
          (!!reserved || remaining > 0) &&
          (a.claimMode !== "highest" || highest.id === t.id);
        return {
          ...t,
          used: receipts.length,
          claimed: !!claimed,
          qualified,
          remaining,
          canClaim,
          progressPercent: Math.min(
            100,
            Math.round((progress / t.target) * 100),
          ),
          rewardName:
            t.rewardType === "member" ? t.snapshot.name : t.productName,
          status: claimed
            ? "已领取"
            : !catalogAllowed
              ? "套餐限领已满"
              : today() > a.claimUntil
                ? "已截止"
                : !qualified
                  ? "未达标"
                  : !reserved && !remaining
                    ? "名额已满"
                    : canClaim
                      ? "可领取"
                      : "暂不可领",
        };
      }),
    };
  }
  function reserve(s) {
    const userId = s.session && s.session.userId;
    if (!userId) return;
    const f = full(s);
    for (const r of f.reservations) {
      const a = f.rewardActivities.find((a) => a.id === r.activityId);
      if (
        a &&
        today() > a.claimUntil &&
        !f.rewardLedger.some((l) => l.reservationId === r.id)
      )
        r.released = true;
    }
    for (const a of f.rewardActivities.filter(
      (a) => a.enabled && a.published && today() >= a.start && today() <= a.end,
    ))
      for (const t of taskView(s, a).tiers)
        if (
          t.qualified &&
          t.remaining > 0 &&
          !t.claimed &&
          !f.reservations.some(
            (r) =>
              r.activityId === a.id &&
              r.tierId === t.id &&
              r.userId === userId &&
              !r.used &&
              !r.released,
          )
        )
          f.reservations.push({
            id: id("slot"),
            activityId: a.id,
            tierId: t.id,
            userId,
            date: today(),
            released: false,
          });
  }
  function nutrition(s, date) {
    const userId = requireLogin(s);
    if (!validDate(date) || date > today() || date < "2000-01-01")
      throw Error("日记日期无效");
    const f = full(s),
      own = s.records.filter((r) => r.userId === userId),
      records = own.filter((r) => r.date === date),
      goal = Number(f.profileExtra.calorieGoal) || 1800;
    const calories = records
        .filter((r) => r.type === "meal")
        .reduce((n, r) => n + r.kcal, 0),
      exerciseCalories = records
        .filter((r) => r.type === "exercise")
        .reduce((n, r) => n + (r.exerciseKcal || 0), 0);
    const nutrient = (key) =>
      Math.round(
        records
          .filter((r) => r.type === "meal")
          .reduce((n, r) => n + (r[key] || 0), 0) * 10,
      ) / 10;
    const start = date.slice(0, 7) + "-01",
      monthEnd = shiftDate(
        date.slice(0, 7) === "9999-12"
          ? "9999-12-31"
          : new Date(
              Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0),
            )
              .toISOString()
              .slice(0, 10),
        0,
      );
    const calendar = [];
    for (let d = start; d <= monthEnd; d = shiftDate(d, 1))
      calendar.push({
        date: d,
        day: Number(d.slice(8)),
        hasRecords: own.some((r) => r.date === d),
        checkedIn: s.checkins.some((r) => r.userId === userId && r.date === d),
        future: d > today(),
        selected: d === date,
      });
    const weightRecords = own
      .filter((r) => r.type === "weight")
      .sort((a, b) => a.date.localeCompare(b.date));
    const lastWeight = weightRecords.filter((r) => r.date <= date).slice(-1)[0];
    const base =
      Number(f.profileExtra.initialWeight) ||
      (weightRecords[0] || {}).kg ||
      null;
    let deficit = 0;
    const curve = [];
    for (const d of [...new Set(own.map((r) => r.date))].sort().slice(-30)) {
      const day = own.filter((r) => r.date === d),
        food = day
          .filter((r) => r.type === "meal")
          .reduce((n, r) => n + r.kcal, 0),
        exercise = day
          .filter((r) => r.type === "exercise")
          .reduce((n, r) => n + (r.exerciseKcal || 0), 0);
      if (food > 0) deficit += goal + exercise - food;
      const actual = day.filter((r) => r.type === "weight").slice(-1)[0];
      curve.push({
        date: d,
        actual: actual ? actual.kg : null,
        scenario: base ? Math.round((base - deficit / 7700) * 10) / 10 : null,
      });
    }
    const bodyWeight = lastWeight
      ? lastWeight.kg
      : Number(f.profileExtra.initialWeight);
    const height = Number(s.profile.height);
    const bmi =
      bodyWeight > 0 && height > 0
        ? Math.round((bodyWeight / (height / 100) ** 2) * 10) / 10
        : null;
    const adviceKey =
      bmi === null
        ? "normalAdvice"
        : bmi < 18.5
          ? "lowAdvice"
          : bmi < 24
            ? "normalAdvice"
            : "highAdvice";
    return {
      date,
      goal,
      bmi,
      exerciseCalories: Math.round(exerciseCalories),
      budget: goal + Math.round(exerciseCalories),
      remaining: Math.round(goal + exerciseCalories - calories),
      nutrition: {
        calories: Math.round(calories),
        protein: nutrient("protein"),
        carb: nutrient("carb"),
        fat: nutrient("fat"),
      },
      warning:
        calories >=
        ((goal + exerciseCalories) * f.healthSettings.budgetWarning) / 100,
      calendar,
      curve,
      weight: lastWeight ? lastWeight.kg : "—",
      restrictions: f.profileExtra.restrictions,
      advice: f.healthSettings[adviceKey],
    };
  }
  return {
    _hooks: {
      reserve,
      maintain(s) {
        if (!s.session || s.full.accountDeleted) return;
        const f = full(s),
          prefs = f.community && f.community.reminders;
        if (!prefs) return;
        const member = membershipView(s, today()).activeGrant;
        if (
          prefs.member &&
          member &&
          member.end <= shiftDate(today(), f.settings.expiryDays)
        )
          c.notify(
            s,
            "reminder",
            "会员即将到期",
            "当前会员将于" + member.end + "到期。",
            "expiry:" + s.session.userId + ":" + member.end,
          );
        const beijingTime = new Date(new Date(c.now()).getTime() + 8 * 3600000)
          .toISOString()
          .slice(11, 16);
        if (
          prefs.weight &&
          beijingTime >= (prefs.weightTime || "08:00") &&
          !s.records.some(
            (r) =>
              r.userId === s.session.userId &&
              r.type === "weight" &&
              r.date === today(),
          )
        )
          c.notify(
            s,
            "reminder",
            "今日体重记录提醒",
            "按自己的节奏记录体重，保持连续观察。",
            "weight:" + s.session.userId + ":" + today(),
          );
      },
    },
    getPlatformSettings() {
      return full(read()).settings;
    },
    savePlatformSettings(input) {
      return change((s) => {
        admin(s);
        const f = full(s),
          v = { ...f.settings, ...input };
        for (const k of ["claimGrace", "expiryDays"]) {
          v[k] = Number(v[k]);
          if (!Number.isInteger(v[k]) || v[k] < 0 || v[k] > 365)
            throw Error("期限必须为0–365天整数");
        }
        if (v.serviceUrl && !/^https:\/\//.test(v.serviceUrl))
          throw Error("客服链接须为https地址");
        v.nicknameMask = !!v.nicknameMask;
        v.announcement = String(v.announcement || "").slice(0, 300);
        f.settings = v;
        audit(s, "保存平台设置", "昵称脱敏、期限、客服与公告");
        return v;
      });
    },
    getMemberBackfill() {
      const s = read();
      requireLogin(s);
      const f = full(s),
        m = membershipView(s, today()),
        monthly = m.activeGrant
          ? Number(m.activeGrant.backfillMonthly) || 0
          : 0,
        used = f.backfill[today().slice(0, 7)] || 0;
      return {
        monthly,
        used,
        remaining: Math.max(0, monthly - used),
        today: today(),
        min: today().slice(0, 7) + "-01",
        max: shiftDate(today(), -1),
      };
    },
    backfillCheckIn(date) {
      return change((s) => {
        const u = c.requireCity(s),
          f = full(s),
          m = membershipView(s, today()),
          monthly = m.activeGrant
            ? Number(m.activeGrant.backfillMonthly) || 0
            : 0,
          key = today().slice(0, 7),
          used = f.backfill[key] || 0;
        if (
          !validDate(date) ||
          date >= today() ||
          date.slice(0, 7) !== key ||
          used >= monthly ||
          s.checkins.some((x) => x.userId === u && x.date === date)
        )
          throw Error("需有效会员和剩余补卡次数，只能补当月未签到的过去日期");
        s.checkins.push({
          userId: u,
          date,
          checkedAt: c.now(),
          backfilled: true,
        });
        f.backfill[key] = used + 1;
        for (const t of f.teams || []) {
          const inTeam = (t.memberships || []).some(
            (m) =>
              (m.userId || m.user) === u &&
              m.joined <= date &&
              (!m.left || date < m.left),
          );
          if (
            t.launched &&
            !t.cancelled &&
            t.start <= date &&
            t.end >= date &&
            t.tasks.includes("signin") &&
            inTeam &&
            !t.checks.some(
              (x) => x.userId === u && x.task === "signin" && x.date === date,
            )
          )
            t.checks.push({
              userId: u,
              task: "signin",
              date,
              backfilled: true,
            });
        }
        reserve(s);
        audit(s, "会员补卡", date);
        return { date, remaining: monthly - used - 1 };
      });
    },
    getPhotoHistory() {
      const s = read(),
        u = requireLogin(s);
      return s.records
        .filter((r) => r.userId === u && r.type === "meal" && r.imagePath)
        .slice()
        .reverse();
    },
    getWeightTrend() {
      const s = read(), u = requireLogin(s), f = full(s);
      return {
        records: s.records.filter(r => r.userId === u && r.type === "weight").sort((a, b) => a.date.localeCompare(b.date)),
        initialWeight: Number(f.profileExtra.initialWeight) || null,
        targetWeight: Number(s.profile.targetWeight) || null,
        height: Number(s.profile.height) || null,
      };
    },
    getProfileSummary() {
      const s = read(),
        u = requireLogin(s),
        records = s.records.filter((r) => r.userId === u),
        dates = new Set(
          records
            .map((r) => r.date)
            .concat(
              s.checkins.filter((x) => x.userId === u).map((x) => x.date),
            ),
        );
      let date = dates.has(today()) ? today() : shiftDate(today(), -1),
        streak = 0;
      while (dates.has(date)) {
        streak++;
        date = shiftDate(date, -1);
      }
      return {
        streak,
        meals: new Set(
          records
            .filter((r) => r.type === "meal")
            .map((r) => r.date + ":" + r.slot),
        ).size,
        recordDays: dates.size,
        photos: records.filter((r) => r.imagePath).length,
        badges: this.getBadges().filter((x) => x.unlocked).length,
      };
    },
    getFoodLibrary() {
      const s = read(),
        f = full(s);
      return {
        foods: Health.foods.map((x) => ({
          ...x,
          conflicts: Health.conflicts(x, f.profileExtra.restrictions),
        })),
        recipes: Health.recipes
          .map(Health.recipeFood)
          .map((x) => ({
            ...x,
            conflicts: Health.conflicts(x, f.profileExtra.restrictions),
            ingredients: x.items.map(
              ([id, q]) =>
                Health.foods.find((f) => f.id === id).name + " " + q + "g",
            ),
          })),
        activities: Health.activities,
        restrictions: f.profileExtra.restrictions,
      };
    },
    recordFoodPortion(input) {
      return change((s) => {
        const userId = c.requireCity(s);
        if (
          !validDate(input.date) ||
          input.date > today() ||
          input.date < "2000-01-01"
        )
          throw Error("日期无效");
        if (!["breakfast", "lunch", "dinner", "snack"].includes(input.slot))
          throw Error("餐次无效");
        const food = Health.foods.find((x) => x.id === input.foodId);
        if (!food) throw Error("食物不存在");
        const grams = positive(input.grams, "份量", 10000),
          n = Health.nutrients(food, grams);
        const r = {
          id: id("record"),
          userId,
          type: "meal",
          date: input.date,
          slot: input.slot,
          name: food.name + " " + grams + food.unit,
          foodId: food.id,
          grams,
          ...n,
          source: "food-library",
          createdAt: c.now(),
        };
        s.records.push(r);
        return r;
      });
    },
    recordRecipePortion(input) {
      return change((s) => {
        const userId = c.requireCity(s);
        if (
          !validDate(input.date) ||
          input.date > today() ||
          input.date < "2000-01-01"
        )
          throw Error("日期无效");
        if (!["breakfast", "lunch", "dinner", "snack"].includes(input.slot))
          throw Error("餐次无效");
        const recipe = Health.recipes.find((x) => x.id === input.recipeId);
        if (!recipe) throw Error("食谱不存在");
        const portions = positive(input.portions, "份数", 20),
          food = Health.recipeFood(recipe),
          n = Health.nutrients(food, portions * 100);
        const r = {
          id: id("record"),
          userId,
          type: "meal",
          date: input.date,
          slot: input.slot,
          name: food.name + " " + portions + "份",
          ...n,
          source: "recipe",
          createdAt: c.now(),
        };
        s.records.push(r);
        return r;
      });
    },
    recordExerciseSession(input) {
      return change((s) => {
        const userId = c.requireCity(s);
        if (
          !validDate(input.date) ||
          input.date > today() ||
          input.date < "2000-01-01"
        )
          throw Error("日期无效");
        const activity = Health.activities.find(
          (a) => a.id === input.activityId,
        );
        if (!activity) throw Error("运动类型无效");
        const minutes = positive(input.minutes, "分钟", 1440),
          weight = positive(input.weight, "体重", 350);
        const r = {
          id: id("record"),
          userId,
          type: "exercise",
          date: input.date,
          name: activity.name,
          minutes,
          met: activity.met,
          exerciseKcal: Health.exerciseCalories(activity.met, weight, minutes),
          createdAt: c.now(),
        };
        s.records.push(r);
        return r;
      });
    },
    getNutritionOverview(date) {
      return nutrition(read(), date || today());
    },
    getPlatformRecords() {
      const s = read();
      admin(s);
      const f = full(s),
        community = f.community || { posts: [] };
      return {
        orders: f.orders || [],
        reports: (community.posts || []).flatMap((p) =>
          (p.reports || []).map((r) => ({
            ...r,
            postId: p.id,
            postTitle: p.title,
          })),
        ),
        audit: f.audit.slice().reverse(),
        blocks: f.blocks,
        products: f.products || [],
        rewards: f.rewardLedger,
      };
    },
    getFeatureHub() {
      const s = read(),
        f = full(s);
      return {
        sections,
        role: f.role,
        roles: ROLES,
        profile: s.session ? s.profile : { nickname: "轻动新朋友" },
        browse: f.browse,
        signedIn: !!s.session,
      };
    },
    setDemoRole(role) {
      return change((s) => {
        requireLogin(s);
        if (!ROLES.includes(role)) throw Error("体验身份无效");
        full(s).role = role;
        audit(s, "切换演示身份", role);
        return { role };
      });
    },
    setBrowseContext(input) {
      return change((s) => {
        const f = full(s);
        if (input.city) f.browse.city = text(input.city, "浏览城市", 20);
        if (input.month) {
          if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month))
            throw Error("月份无效");
          f.browse.month = input.month;
        }
        return f.browse;
      });
    },
    getCatalog() {
      return full(read()).catalog;
    },
    saveCatalogPlan(input) {
      return change((s) => {
        hq(s);
        const f = full(s);
        const days = positive(input.days, "天数", 365),
          dailyLimit = positive(input.dailyLimit, "每日次数", 1000);
        if (!Number.isInteger(days) || !Number.isInteger(dailyLimit))
          throw Error("天数与次数必须为整数");
        const price = Number(input.price || 0);
        if (!Number.isFinite(price) || price < 0 || price > 99999)
          throw Error("价格无效");
        const old = input.id ? find(f.catalog, input.id) : null;
        const plan = {
          id: old ? old.id : id("plan"),
          name: text(input.name, "套餐名称"),
          days,
          dailyLimit,
          price,
          features: input.features || ["photo", "adFree"],
          enabled: input.enabled !== false,
          perUserLimit:
            input.perUserLimit == null ? 10 : Number(input.perUserLimit),
          backfillMonthly: Number(input.backfillMonthly) || 0,
          revision: (old ? old.revision : 0) + 1,
        };
        if (
          !Number.isInteger(plan.backfillMonthly) ||
          plan.backfillMonthly < 0 ||
          plan.backfillMonthly > 31
        )
          throw Error("每月补卡须为0–31整数");
        if (
          !Number.isInteger(plan.perUserLimit) ||
          plan.perUserLimit < 1 ||
          plan.perUserLimit > 1000
        )
          throw Error("单人限领应为1–1000整数");
        if (old) Object.assign(old, plan);
        else f.catalog.push(plan);
        audit(s, "保存会员套餐", plan.name);
        return plan;
      });
    },
    toggleCatalogPlan(key) {
      return change((s) => {
        hq(s);
        const p = find(full(s).catalog, key);
        p.enabled = !p.enabled;
        audit(s, "切换套餐上架", p.name);
        return p;
      });
    },
    getRewardActivities() {
      const s = read();
      requireRole(s, ["hq", "admin", "operator"]);
      const f = full(s);
      return f.rewardActivities
        .filter((a) => f.role === "hq" || a.city === (s.profile.city || "温州"))
        .map((a) => taskView(s, a));
    },
    saveRewardActivity(input) {
      return change((s) => {
        requireRole(s, ["hq", "admin", "operator"]);
        const f = full(s);
        const previous = input.id ? find(f.rewardActivities, input.id) : null;
        if (previous && f.role !== "hq" && previous.city !== s.profile.city)
          throw Error("只能维护本城活动");
        const city = f.role === "hq" ? input.city || "all" : s.profile.city;
        if (!TYPES[input.type]) throw Error("请选择活动类型");
        if (
          !validDate(input.start) ||
          !validDate(input.end) ||
          !validDate(input.claimUntil) ||
          input.end < input.start ||
          input.claimUntil < input.end
        )
          throw Error("活动和领取日期顺序无效");
        if (!input.tiers || !input.tiers.length || input.tiers.length > 10)
          throw Error("至少配置一个奖励档位");
        const tiers = input.tiers.map((t, i) => {
          const target = positive(t.target, "目标", 10000),
            quota = positive(t.quota, "名额", 100000);
          if (!Number.isInteger(target) || !Number.isInteger(quota))
            throw Error("目标与名额需为整数");
          const rewardType = t.rewardType || "member",
            plan = rewardType === "member" ? find(f.catalog, t.planId) : null;
          if (plan && !plan.enabled) throw Error("不能选择下架套餐");
          if (!["member", "physical", "product"].includes(rewardType))
            throw Error("奖励类型无效");
          const perUserLimit =
            t.perUserLimit == null ? 1 : Number(t.perUserLimit);
          if (
            !Number.isInteger(perUserLimit) ||
            perUserLimit < 1 ||
            perUserLimit > 1000
          )
            throw Error("单人限领应为1–1000整数");
          return {
            id: t.id || id("tier"),
            name: text(t.name || "第" + (i + 1) + "档", "档位名称"),
            target,
            quota,
            perUserLimit,
            rewardType,
            planId: plan && plan.id,
            snapshot: plan ? JSON.parse(JSON.stringify(plan)) : null,
            productName: plan ? "" : text(t.productName, "奖品名称"),
          };
        });
        if (new Set(tiers.map((t) => t.target)).size !== tiers.length)
          throw Error("档位目标不能重复");
        const a = {
          id: previous ? previous.id : id("reward"),
          title: text(input.title, "活动标题", 60),
          type: input.type,
          city,
          start: input.start,
          end: input.end,
          claimUntil: input.claimUntil,
          published: f.role === "hq" && input.published === true,
          enabled: true,
          status:
            f.role === "hq" ? (input.published ? "已上线" : "草稿") : "待审批",
          claimMode: input.claimMode === "highest" ? "highest" : "all",
          tiers,
        };
        if (previous && f.rewardLedger.some((r) => r.activityId === a.id))
          throw Error("已产生领取记录的活动不能改档位，可下线后新建");
        if (previous) Object.assign(previous, a);
        else f.rewardActivities.push(a);
        audit(s, "保存活动奖励", a.title);
        return a;
      });
    },
    publishRewardActivity(key, approved = true) {
      return change((s) => {
        hq(s);
        const a = find(full(s).rewardActivities, key);
        a.published = !!approved;
        a.status = approved ? "已上线" : "已驳回";
        audit(s, "审批活动", a.title + " " + a.status);
        return a;
      });
    },
    toggleRewardActivity(key) {
      return change((s) => {
        requireRole(s, ["hq", "admin", "operator"]);
        const f = full(s),
          a = find(f.rewardActivities, key);
        if (f.role !== "hq" && a.city !== s.profile.city)
          throw Error("无本城权限");
        a.enabled = !a.enabled;
        audit(s, "活动上下线", a.title);
        return a;
      });
    },
    getRewardTasks() {
      return change((s) => {
        reserve(s);
        const f = full(s);
        return f.rewardActivities
          .filter(
            (a) =>
              a.published &&
              a.enabled &&
              (a.city === "all" ||
                a.city === (f.browse.city || s.profile.city)),
          )
          .map((a) => taskView(s, a));
      });
    },
    claimTaskReward(input) {
      return change((s) => {
        const userId = requireLogin(s),
          f = full(s);
        reserve(s);
        const a = find(f.rewardActivities, input.activityId),
          t = find(a.tiers, input.tierId);
        if (a.city !== "all" && a.city !== s.profile.city)
          throw Error("仅限本城用户领取");
        const requestId = input.requestId || "single:" + a.id + ":" + t.id;
        const prior = f.rewardLedger.find(
          (r) =>
            r.activityId === a.id &&
            r.tierId === t.id &&
            r.userId === userId &&
            r.requestId === requestId,
        );
        if (prior) return prior;
        const view = taskView(s, a).tiers.find((x) => x.id === t.id);
        if (!view.canClaim) throw Error(view.status);
        let slot = f.reservations.find(
          (r) =>
            r.activityId === a.id &&
            r.tierId === t.id &&
            r.userId === userId &&
            !r.released &&
            !r.used,
        );
        if (!slot) {
          if (view.remaining < 1) throw Error("奖励名额已满");
          slot = {
            id: id("slot"),
            activityId: a.id,
            tierId: t.id,
            userId,
            date: today(),
            released: false,
          };
          f.reservations.push(slot);
        }
        slot.used = true;
        const grant =
          t.rewardType === "member"
            ? c.grant(s, {
                id: "full-reward:" + userId + ":" + requestId,
                source: "full-reward",
                title: a.title + " · " + t.name,
                days: t.snapshot.days,
                dailyLimit: t.snapshot.dailyLimit,
                backfillMonthly: t.snapshot.backfillMonthly,
                features: t.snapshot.features,
              })
            : null;
        const r = {
          id: id("ledger"),
          activityId: a.id,
          tierId: t.id,
          userId,
          requestId,
          planId: t.planId,
          title: a.title,
          tierName: t.name,
          rewardType: t.rewardType,
          name: view.rewardName,
          days: t.snapshot ? t.snapshot.days : 0,
          date: today(),
          grantId: grant && grant.id,
          start: grant && grant.start,
          end: grant && grant.end,
          reservationId: slot && slot.id,
          status: grant ? "已发放" : "待履约",
        };
        f.rewardLedger.push(r);
        c.notify(s, "reward", "奖励已到账", r.name, r.id);
        audit(s, "领取活动奖励", r.name);
        return r;
      });
    },
    getRewardLedger() {
      const s = read();
      admin(s);
      return full(s).rewardLedger.slice().reverse();
    },
    getMyFullRewards() {
      const s = read(),
        u = requireLogin(s);
      return full(s)
        .rewardLedger.filter((r) => r.userId === u)
        .slice()
        .reverse();
    },
    fulfillReward(key) {
      return change((s) => {
        admin(s);
        const r = find(full(s).rewardLedger, key);
        if (r.rewardType === "member" || r.status === "已撤回")
          throw Error("此奖励无需履约");
        r.status = "已履约";
        audit(s, "确认奖励履约", key);
      });
    },
    revokeFullReward(key, reason) {
      return change((s) => {
        admin(s);
        const r = find(full(s).rewardLedger, key);
        if (r.status === "已撤回") throw Error("奖励已经撤回");
        text(reason, "撤回原因", 300);
        if (r.grantId) c.revokeGrant(s, r.grantId, reason);
        r.status = "已撤回";
        r.reason = reason;
        audit(s, "撤回奖励", key + " " + reason);
      });
    },
    confirmManualReward(activityId, userId) {
      return change((s) => {
        admin(s);
        const a = find(full(s).rewardActivities, activityId);
        if (!["manual", "event", "rank"].includes(a.type))
          throw Error("此类型由业务行为自动计算");
        c.evidence(
          s,
          a.type,
          "manual:" + activityId + ":" + (userId || requireLogin(s)),
          userId || requireLogin(s),
        );
        audit(s, "人工核验活动完成", a.title);
      });
    },
    getHomeBanners() {
      return full(read())
        .banners.filter((b) => b.enabled)
        .sort((a, b) => a.sort - b.sort);
    },
    getBannerSettings() {
      const s = read();
      hq(s);
      return full(s)
        .banners.slice()
        .sort((a, b) => a.sort - b.sort);
    },
    saveBanner(input) {
      return change((s) => {
        hq(s);
        const f = full(s);
        if (!["page", "web", "mini", "qrcode"].includes(input.kind))
          throw Error("展示位类型无效");
        if (input.kind === "web" && !/^https:\/\//.test(input.target || ""))
          throw Error("网页地址必须使用 https");
        if (
          input.kind === "page" &&
          !/^\/pages\/[a-z-]+\/index/.test(input.target || "")
        )
          throw Error("站内路径无效");
        const b = {
          id: input.id || id("banner"),
          title: text(input.title, "标题", 60),
          subtitle: String(input.subtitle || "").slice(0, 120),
          kind: input.kind,
          target: String(input.target || ""),
          imagePath: String(input.imagePath || ""),
          enabled: input.enabled !== false,
          sort: Number(input.sort) || 0,
        };
        if (input.id) Object.assign(find(f.banners, input.id), b);
        else f.banners.push(b);
        audit(s, "保存首页展示位", b.title);
        return b;
      });
    },
    deleteBanner(key) {
      return change((s) => {
        hq(s);
        full(s).banners = full(s).banners.filter((b) => b.id !== key);
        audit(s, "删除首页展示位", key);
      });
    },
    getHealthSettings() {
      return full(read()).healthSettings;
    },
    saveHealthSettings(input) {
      return change((s) => {
        hq(s);
        const f = full(s),
          v = { ...f.healthSettings, ...input };
        for (const k of ["trialDays", "trialDaily"]) {
          v[k] = positive(
            v[k],
            k === "trialDays" ? "新人天数" : "新人额度",
            365,
          );
          if (!Number.isInteger(v[k])) throw Error("额度与天数需为整数");
        }
        for (const k of ["lowAdvice", "normalAdvice", "highAdvice"])
          v[k] = text(v[k], "饮食提示", 300);
        v.budgetWarning = Number(v.budgetWarning) || 90;
        if (v.budgetWarning < 1 || v.budgetWarning > 100)
          throw Error("预警百分比应为1–100");
        f.healthSettings = v;
        audit(s, "保存健康与权益配置", "新人卡、饮食建议与预警阈值");
        return v;
      });
    },
    getExtendedProfile() {
      const s = read();
      requireLogin(s);
      return {
        ...full(s).profileExtra,
        height: s.profile.height,
        targetWeight: s.profile.targetWeight,
      };
    },
    saveExtendedProfile(input) {
      return change((s) => {
        requireLogin(s);
        const p = full(s).profileExtra;
        if (input.calorieGoal !== undefined)
          p.calorieGoal = positive(input.calorieGoal, "每日自设预算", 10000);
        if (input.height !== undefined)
          s.profile.height = positive(input.height, "身高", 250);
        if (input.targetWeight !== undefined)
          s.profile.targetWeight = positive(
            input.targetWeight,
            "目标体重",
            350,
          );
        if (input.age !== "" && input.age != null)
          p.age = positive(input.age, "年龄", 120);
        if (input.initialWeight !== "" && input.initialWeight != null)
          p.initialWeight = positive(input.initialWeight, "起始体重", 350);
        if (input.goalDays !== undefined)
          p.goalDays = positive(input.goalDays, "计划天数", 365);
        if (input.sex !== undefined) {
          if (!["未设置", "男", "女"].includes(input.sex))
            throw Error("性别无效");
          p.sex = input.sex;
        }
        if (input.restrictions !== undefined)
          p.restrictions = (
            Array.isArray(input.restrictions)
              ? input.restrictions
              : String(input.restrictions).split(/[、,，\s]+/)
          )
            .filter(Boolean)
            .map((v) => text(v, "忌口", 30))
            .slice(0, 20);
        return p;
      });
    },
    getDiscussions() {
      const f = full(read());
      return issues.map((i) => ({
        ...i,
        ...(f.discussions[i.id] || {}),
        choice: (f.discussions[i.id] || {}).choice || i.options[0],
        note: (f.discussions[i.id] || {}).note || "",
      }));
    },
    saveDiscussion(input) {
      return change((s) => {
        requireRole(s, ["hq", "admin", "operator"]);
        const normalized = input.id;
        const issue = issues.find((i) => i.id === normalized);
        if (!issue) throw Error("讨论项不存在");
        const choice = input.choice;
        if (!issue.options.includes(choice)) throw Error("请选择讨论方案");
        full(s).discussions[normalized] = {
          choice,
          note: String(input.note || "").slice(0, 1000),
        };
        return full(s).discussions[normalized];
      });
    },
    exportDiscussion() {
      return this.getDiscussions()
        .map((i) => i.title + "\n方案：" + i.choice + "\n备注：" + i.note)
        .join("\n\n");
    },
    getOperationsDashboard() {
      const s = read();
      requireRole(s, ["hq", "admin", "operator", "reviewer", "supervisor"]);
      const f = full(s);
      return {
        role: f.role,
        catalog: f.catalog,
        rewardActivities: f.rewardActivities,
        banners: f.banners,
        messages: f.messages,
        audit: f.audit.slice().reverse(),
        blocks: f.blocks,
        sections: sections.filter((x) => x.group === "operations"),
        pendingRefunds: (f.orders || []).filter(
          (o) => o.status === "refund_pending",
        ),
      };
    },
    saveRiskBlock(input) {
      return change((s) => {
        admin(s);
        const f = full(s),
          userId = text(input.userId, "用户编号");
        const reason = text(input.reason, "处理原因", 300);
        if (!f.blocks.some((b) => b.userId === userId))
          f.blocks.push({ id: id("block"), userId, reason, date: today() });
        f.rankBlacklist = [...new Set([...(f.rankBlacklist || []), userId])];
        audit(s, "加入风控名单", userId + " " + reason);
      });
    },
    removeRiskBlock(userId) {
      return change((s) => {
        admin(s);
        full(s).blocks = full(s).blocks.filter((b) => b.userId !== userId);
        full(s).rankBlacklist = (full(s).rankBlacklist || []).filter(
          (u) => u !== userId,
        );
        audit(s, "解除风控", userId);
      });
    },
    getBadges() {
      const s = read(),
        u = requireLogin(s),
        f = full(s);
      const days = s.checkins.filter((x) => x.userId === u).length;
      const meals = s.records.filter(
        (x) => x.userId === u && x.type === "meal",
      ).length;
      return [
        {
          id: "first",
          title: "轻动第一步",
          description: "完成首次签到",
          unlocked: days >= 1,
          value: days,
          target: 1,
        },
        {
          id: "seven",
          title: "七日的坚持",
          description: "累计签到7天",
          unlocked: days >= 7,
          value: days,
          target: 7,
        },
        {
          id: "meal",
          title: "认真吃饭的人",
          description: "记录三餐饮食3次",
          unlocked: meals >= 3,
          value: meals,
          target: 3,
        },
        {
          id: "reward",
          title: "努力有回应",
          description: "领取一次活动奖励",
          unlocked: f.rewardLedger.length + s.claims.length > 0,
          value: f.rewardLedger.length + s.claims.length,
          target: 1,
        },
      ];
    },
  };
}
module.exports = { ensureFull, createOperationsDomain };
