const { normalizeMealStyle, mealPreset } = require("./meal-styles");
const { assessPlanGoal } = require("./plan-goal");
const { normalizeWeightStyle, normalizeExercise, dailyExercise } = require("./plan-preferences");
const { membershipView } = require("./membership");
const add = (d, n) =>
  new Date(Date.parse(d + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
const copy = (v) => JSON.parse(JSON.stringify(v));
function createGrowthFullDomain(ctx) {
  const { read, change, today, now, id, text, positive } = ctx;
  const login = (s) => ctx.requireLogin(s),
    admin = (s) => ctx.requireRole(s, ["hq", "admin"]),
    hq = (s) => ctx.requireRole(s, ["hq"]);
  function init(s) {
    s.full = s.full || {};
    const f = s.full;
    f.catalog = f.catalog || [
      {
        id: "monthly",
        name: "轻动月卡",
        days: 30,
        dailyLimit: 10,
        price: 29.9,
        features: ["AI计划", "模拟识餐"],
        enabled: true,
      },
      {
        id: "quarterly",
        name: "轻动季卡",
        days: 90,
        dailyLimit: 20,
        price: 79.9,
        features: ["AI计划", "模拟识餐"],
        enabled: true,
      },
    ];
    f.ai = f.ai || {
      config: {
        textEnabled: true,
        photoEnabled: true,
        dailyLimit: 200,
        initialFree: 3,
        maxDays: 1096,
        minIntake: 1500,
        maxDeficit: 500,
        maxWeekly: 0.5,
        provider: "本地模拟",
        mode: "mock",
        rules: "避开过敏与忌口；不保证减重效果",
      },
      freeCredits: 3,
      logs: [],
      plans: [],
    };
    f.ai.providers = f.ai.providers || [
      {
        id: "demo",
        name: "本地模拟",
        textUrl: "https://example.com/v1/chat/completions",
        imageUrl: "https://example.com/v1/chat/completions",
        textModel: "demo-text",
        imageModel: "demo-photo",
        hasKey: false,
        revision: 1,
      },
    ];
    f.ai.config.active = f.ai.config.active || "demo";
    f.ai.config.timeout = f.ai.config.timeout || 20;
    f.ai.config.maxTokens = f.ai.config.maxTokens || 16000;
    f.ads = f.ads || {
      config: {
        enabled: false,
        rewardedVideo: "",
        homeBanner: "",
        photoBanner: "",
        healthBanner: "",
        profileBanner: "",
        homeInterstitial: "",
        dailyLimit: 5,
        grant: 1,
      },
      credits: 0,
      sessions: [],
      receipts: [],
    };
    f.ads.startup = f.ads.startup || { enabled: false, type: "video", mediaUrl: "", unitId: "", dailyLimit: 1, duration: 8, skipAfter: 3 };
    f.ads.startupReceipts = f.ads.startupReceipts || [];
    f.payment = f.payment || {
      enabled: false,
      iosAllowed: false,
      demoCredentials: false,
      merchantId: "",
      serial: "",
      revision: 0,
    };
    f.invites = f.invites || {
      users: [],
      records: [],
      claims: [],
      tiers: [
        { id: "one", name: "邀请1位好友", count: 1, days: 3, dailyLimit: 10 },
        { id: "three", name: "邀请3位好友", count: 3, days: 7, dailyLimit: 10 },
      ],
      enabled: true,
    };
    f.orders = f.orders || [];
    return f;
  }
  function audit(s, action, detail) {
    if (ctx.audit) return ctx.audit(s, action, detail);
    (s.full.audit || (s.full.audit = [])).push({
      id: id("audit"),
      actor: login(s),
      action,
      detail,
      createdAt: now(),
      date: today(),
    });
  }
  function notify(s, title, body) {
    if (ctx.notify) return ctx.notify(s, "system", title, body);
    (s.full.messages || (s.full.messages = [])).push({
      id: id("message"),
      userId: login(s),
      title,
      body,
      text: body,
      date: today(),
      createdAt: now(),
      read: false,
    });
  }
  const integer = (v, label, min, max) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max)
      throw Error(label + "超出范围");
    return n;
  };
  function planDays(p) {
    if (p.days) return p.days;
    const c = p.compactDays;
    return c.rows.map((r) => ({
      date: r[0],
      meals: r[1].map((i) => copy(c.dict[i])),
      exercise: copy(c.dict[r[2]]),
      encouragement: c.dict[r[3]],
      totalKcal: r[4],
    }));
  }
  function compactPlan(p, days) {
    const dict = [],
      lookup = {};
    function intern(v) {
      const k = JSON.stringify(v);
      if (lookup[k] === undefined) {
        lookup[k] = dict.length;
        dict.push(v);
      }
      return lookup[k];
    }
    p.compactDays = {
      dict,
      rows: days.map((d) => [
        d.date,
        d.meals.map(intern),
        intern(d.exercise),
        intern(d.encouragement),
        d.totalKcal,
      ]),
    };
    delete p.days;
    return p;
  }
  function planView(p, s) {
    const out = copy(p);
    out.days = copy(planDays(p));
    delete out.compactDays;
    if (s) {
      out.tasks.weight = out.tasks.weight || { enabled: true, time: "08:00", remind: false };
      delete out.tasks.signin;
      out.executionConfirmed = !!p.executionConfirmed;
      out.checks = recordTaskChecks(s, p);
    }
    return out;
  }
  function recordTaskChecks(s, p) {
    if (!p.executionConfirmed) return [];
    const rows = (s.records || []).filter(r => r.userId === p.userId && r.date >= p.start && r.date <= p.end && (!p.closedOn || r.date <= p.closedOn) && r.date <= today() && r.status !== "pending" && r.status !== "rejected");
    const checks = new Map();
    for (const r of rows) {
      const type = r.type === "weight" && Number(r.kg) > 0 ? "weight" : r.type === "exercise" && Number(r.minutes) > 0 ? "exercise" : r.type === "meal" && r.imagePath ? "photo" : "";
      if (type && (type === "weight" ? !p.tasks.weight || p.tasks.weight.enabled : p.tasks[type] && p.tasks[type].enabled)) checks.set(r.date + type, {date:r.date,type,recordId:r.id,createdAt:r.createdAt || 0});
    }
    return [...checks.values()];
  }
  const mealKey = m => String(m.title).replace(/\s+/g, "").split(/[＋+]/).sort().join("＋");
  function allowedMeal(rows, date, candidate) {
    const delta = (a,b) => (Date.parse(a+"T00:00:00Z")-Date.parse(b+"T00:00:00Z"))/86400000;
    const matches = rows.filter(r => mealKey(r.meal) === mealKey(candidate)).map(r => r.date);
    if(matches.some(d=>Math.abs(delta(d,date))<7)) return false;
    const dates=matches.concat(date);
    return dates.every(anchor=>{
      const offset=delta(date,anchor);
      return offset<0 || offset>=30 || dates.filter(d=>delta(d,anchor)>=0 && delta(d,anchor)<30).length<=3;
    });
  }
  function mealRows(days) { return days.flatMap(d => d.meals.map(m => ({date:d.date,meal:m}))); }
  function pastMeals(s, userId, excludeId) {
    const dates = new Set(), rows=[];
    for(const p of init(s).ai.plans.filter(p=>p.userId===userId && p.id!==excludeId)) for(const d of planDays(p)) {
      if(d.date >= today() || dates.has(d.date) || (p.closedOn && d.date >= p.closedOn)) continue;
      dates.add(d.date); rows.push(...mealRows([d]));
    }
    return rows;
  }
  function chooseMeal(terms,index,slot,budget,style,rows,date,exclude) {
    for(let attempt=0;attempt<4096;attempt++) {
      const candidate=meal(terms,index+attempt,slot,budget,style);
      if((!exclude || mealKey(candidate)!==mealKey(exclude)) && allowedMeal(rows,date,candidate)) return candidate;
    }
    throw Error("当前忌口条件下餐谱不足以满足7天不重复、30天最多3次，请调整可用食材后重试");
  }
  function activePlan(s, pid) {
    const p = init(s).ai.plans.find(
      (p) => p.id === pid && p.userId === login(s),
    );
    if (!p) throw Error("计划不存在");
    p.tasks.weight = p.tasks.weight || {enabled:true,time:"08:00",remind:false};
    return p;
  }
  function assertRecognition(s, type = "photo") {
    login(s);
    const a = init(s).ai;
    if (!(type === "photo" ? a.config.photoEnabled : a.config.textEnabled))
      throw Error("管理员已关闭此AI功能");
    if (
      a.logs.filter((l) => l.day === today() && l.status === "success")
        .length >= a.config.dailyLimit
    )
      throw Error("今日全局AI额度已满");
  }
  function consumeRecognition(s, requestId) {
    assertRecognition(s);
    const f = init(s);
    if (f.ai.freeCredits > 0) {
      f.ai.freeCredits--;
      return "free";
    }
    if (f.ads.credits > 0) {
      f.ads.credits--;
      return "ads";
    }
    throw Error("AI与识餐共用额度已用完");
  }
  function logRecognition(s, requestId, source, type = "photo") {
    const a = init(s).ai;
    if (!a.logs.some((l) => l.id === requestId))
      a.logs.push({
        id: requestId,
        userId: login(s),
        type,
        day: today(),
        status: "success",
        cost: 1,
        source,
        provider:
          (a.providers.find((p) => p.id === a.config.active) || {}).name ||
          a.config.provider,
        model:
          type === "photo"
            ? (a.providers.find((p) => p.id === a.config.active) || {})
                .imageModel
            : (a.providers.find((p) => p.id === a.config.active) || {})
                .textModel,
        configRevision: a.config.revision || 0,
        mode: "mock",
        createdAt: now(),
      });
  }
  function consumeAI(s, rid, type) {
    assertRecognition(s, type);
    const m = membershipView(s, today());
    let source;
    if (m.remaining > 0) {
      const adFree =
        !m.activeGrant.features || m.activeGrant.features.includes("adFree");
      source = "membership";
      if (!adFree) {
        const f = init(s);
        if (f.ai.freeCredits > 0) {
          f.ai.freeCredits--;
          source = "membership+free";
        } else if (f.ads.credits > 0) {
          f.ads.credits--;
          source = "membership+ads";
        } else throw Error("AI与识餐共用次数已用完");
      }
      s.recognitions.push({
        id: id("usage"),
        userId: login(s),
        requestId: rid,
        grantId: m.activeGrant.id,
        date: today(),
        type,
      });
    } else {
      const f = init(s);
      if (f.ai.freeCredits > 0) {
        f.ai.freeCredits--;
        source = "free";
      } else if (f.ads.credits > 0) {
        f.ads.credits--;
        source = "ads";
      } else throw Error("AI与识餐共用次数已用完");
    }
    logRecognition(s, rid, source, type);
  }
  const groups = [
    ["奶", "牛奶", "乳", "milk", "cheese", "酸奶"],
    ["蛋", "鸡蛋", "egg"],
    ["豆", "大豆", "豆腐", "soy"],
    ["花生", "坚果", "核桃", "nut"],
    ["小麦", "麦", "麸质", "面条", "面包", "馒头", "wheat", "gluten"],
    ["虾", "蟹", "海鲜", "贝", "fish", "鱼"],
  ];
  function conflicts(v, terms) {
    const hay = v.toLowerCase();
    return terms.some((t) => {
      t = t.toLowerCase();
      return (
        hay.includes(t) ||
        groups.some(
          (g) => g.some((x) => x === t) && g.some((x) => hay.includes(x)),
        )
      );
    });
  }
  function restrictionList(v) {
    return (Array.isArray(v) ? v : String(v || "").split(/[、,，;；\s]+/))
      .map((x) => String(x).trim())
      .filter(Boolean);
  }
  function meal(terms, index, slot, minIntake, style) {
    index = Math.abs(index);
    let divisor = 1;
    const preset = mealPreset(style, index, slot);
    const pick = (pool, offset) => {
      const safe = pool.filter(x => !conflicts(x, terms));
      if (!safe.length) throw Error("限制较多，现有常见食材不足，请先确认可用食材");
      const choice = safe[(Math.floor(index / divisor) + offset) % safe.length];
      divisor *= safe.length;
      return choice;
    };
    const ingredients = [
      { name: pick(preset.staples, 0), grams: slot === "breakfast" ? 180 : 200 },
      { name: pick(preset.proteins, 1), grams: slot === "breakfast" ? 150 : 100 },
      { name: pick(preset.vegetables, 2), grams: slot === "breakfast" ? 150 : 200 },
    ];
    const scale = Math.max(1500, minIntake) / 1500;
    ingredients.forEach(item => { item.grams = Math.round(item.grams * scale); });
    const method = preset.methods[index % preset.methods.length];
    return {
      slot, style: preset.id, styleLabel: preset.label,
      title: ingredients.map(x => x.name).join("＋"),
      ingredients,
      steps: [
        slot === "breakfast" ? "谷薯主食按包装或日常做法熟制；其他食材按类型分别处理，即食食品按标签食用。" : "主食按日常方法做熟；蛋白质食材采用" + method + "，不以油炸为默认做法。",
        "蔬菜洗净后做熟，水果洗净后食用；保持主食、蛋白质与蔬果搭配。",
        preset.id === "home" ? "按家庭分餐准备；优先选择附近市场的时令蔬菜与普通食材，调味保持清淡。" : "采用清蒸、炖煮等清淡做法，保留主食，不以不吃饭或极低热量作为减脂方式。",
        "核对配料与过敏原；份量和营养数值为模拟估算，可按实际商品与食材调整。",
      ],
      kcal: Math.ceil(Math.max(1500, minIntake) / 3),
      protein: Math.round(28 * scale), carbohydrate: Math.round(65 * scale), fat: Math.round(15 * scale),
    };
  }
  function profile(s) {
    const extra = s.full.profileExtra || {},
      p = Object.assign({}, s.profile, extra);
    const weight = (s.records || [])
      .filter(
        (x) =>
          x.userId === login(s) &&
          x.type === "weight" &&
          x.status !== "rejected" &&
          x.status !== "pending",
      )
      .slice()
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.createdAt || 0) - (b.createdAt || 0),
      )
      .slice(-1)[0];
    p.weight = weight ? weight.kg : extra.initialWeight;
    return p;
  }
  const api = {
    assessPlanGoal(input) { const s = read(); const f = init(s); login(s); return assessPlanGoal(profile(s), input, f.ai.config); },
    getReportMealSuggestions(date) {
      const s = read(), f = init(s), userId = login(s);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error("建议日期无效");
      const p = profile(s), terms = restrictionList(p.restrictions || []);
      const plan = f.ai.plans.find(p => p.userId === userId && !p.closedOn && p.start <= date && p.end >= date);
      if (plan) { const day = planDays(plan).find(d => d.date === date); if (day && day.meals.every(m => !conflicts(m.title, terms) && m.ingredients.every(i => !conflicts(i.name, terms)))) return { date, source: "plan", planId: plan.id, meals: copy(day.meals), notice: "来自你的轻动计划；可打开计划调整。不根据单张照片扣减次日餐量。" }; }
      return { date, source: "reference", meals: ["breakfast", "lunch", "dinner"].map((slot, i) => meal(terms, i, slot, f.ai.config.minIntake, "fatloss")), notice: plan ? "已有计划与最新忌口不一致，以下改用按当前档案筛选的模拟参考搭配。" : "没有该日期的已生成计划，以下仅为遵守档案忌口的模拟参考搭配，不是新的个性化处方或剩余热量预算。" };
    },
    getPlanProfile() { const s = read(); login(s); return copy(profile(s)); },
    getRecognitionAccess() {
      const s = read(),
        f = init(s);
      login(s);
      const m = membershipView(s, today());
      return {
        todayUsed: f.ai.logs.filter(l => l.userId === login(s) && l.day === today() && l.type === "photo" && l.status === "success").length,
        adDailyLimit: f.ads.config.dailyLimit,
        adsWatchedToday: f.ads.receipts.filter(r => r.userId === login(s) && r.date === today()).length,
        rewardedVideoAdUnitId: f.ads.config.rewardedVideo,
        freeCredits: f.ai.freeCredits,
        adCredits: f.ads.credits,
        remaining:
          (m.activeGrant &&
          (!m.activeGrant.features || m.activeGrant.features.includes("adFree"))
            ? m.remaining
            : 0) +
          f.ai.freeCredits +
          f.ads.credits,
        requiresCredit:
          !!m.activeGrant &&
          !!m.activeGrant.features &&
          !m.activeGrant.features.includes("adFree"),
        membershipRemaining: m.remaining,
        photoEnabled: f.ai.config.photoEnabled,
        textEnabled: f.ai.config.textEnabled,
        globalRemaining: Math.max(
          0,
          f.ai.config.dailyLimit -
            f.ai.logs.filter((l) => l.day === today() && l.status === "success")
              .length,
        ),
        adsAvailable: !!(
          f.ads.config.enabled &&
          f.ads.config.rewardedVideo &&
          f.ads.receipts.filter((r) => r.userId === login(s) && r.date === today()).length <
            f.ads.config.dailyLimit
        ),
        mock: true,
      };
    },
    getAIPlans() {
      const s = read(),
        f = init(s);
      login(s);
      return f.ai.plans.filter((p) => p.userId === login(s)).map(p => planView(p, s));
    },
    generateAIPlan(input) {
      return change((s) => {
        const f = init(s),
          userId = ctx.requireCity(s),
          a = f.ai;
        const p = profile(s);
        const mealStyle = normalizeMealStyle(input.mealStyle);
        const weightStyle = normalizeWeightStyle(input.weightStyle);
        const days = integer(
          input.days === undefined ? (p.goalDays || 7) : input.days,
          "计划天数",
          1,
          Math.min(a.config.maxDays, 1096),
        );
        if (!p.age || !p.height || !p.weight)
          throw Error("请先完善年龄、身高和当前体重");
        const age = integer(p.age, "年龄", 1, 120),
          height = positive(p.height, "身高", 250),
          weight = positive(p.weight, "体重", 350),
          loss = p.direction === "仅记录日常" || p.direction === "保持体重，规律生活" ? 0 : Number(input.lossJin || 0);
        if (!Number.isFinite(loss) || loss < 0 || loss > 100)
          throw Error("目标斤数无效");
        const re = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
        if (!re.test(input.start) || !re.test(input.end))
          throw Error("请选择有效活动时间");
        const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3)),
          duration = (mins(input.end) - mins(input.start) + 1440) % 1440;
        if (duration < 5 || duration > 240)
          throw Error("活动时段须为5–240分钟");
        const exercise = normalizeExercise(input.exercise, weightStyle, duration);
        const goalAssessment = assessPlanGoal(p, input, a.config);
        const review = goalAssessment.needsReview;
        if (goalAssessment.tooLow) throw Error(goalAssessment.message + "请调整目标体重，不能生成此减重目标。");
        if (goalAssessment.tooFast && !input.allowRecordOnly) throw Error(goalAssessment.message + "可调整目标，或确认改为记录模式。");
        const terms = [...new Set([...restrictionList(p.restrictions || []), ...restrictionList(input.restrictions || [])])];
        const calorieBudget = !review && Number(p.calorieGoal) > 0 ? Number(p.calorieGoal) : a.config.minIntake;
        if (!review && Number(p.calorieGoal) > 0 && calorieBudget < a.config.minIntake) throw Error("档案热量目标低于当前计划配置下限，请先调整档案或使用记录模式");
        if (terms.join("").length > 300) throw Error("饮食限制最多300字");
        const previous = a.plans.find(x => x.userId === userId);
        const menuSeed = previous ? ((previous.request.menuSeed || 0) + 11) % 10000007 : 0;
        const menuOffset = menuSeed + weightStyle.menuOffset;
        const scheduled = pastMeals(s, userId);
        const result = Array.from({ length: days }, (_, i) => {
          const date=add(today(),i);
          const meals = ["breakfast", "lunch", "dinner"].map((slot, j) => {
            const m=chooseMeal(terms,menuOffset+i*3+j,slot,calorieBudget,mealStyle,scheduled,date);
            scheduled.push({date,meal:m}); return m;
          });
          return {
            date: add(today(), i),
            meals,
            totalKcal: meals.reduce((n, m) => n + m.kcal, 0),
            exercise: dailyExercise(exercise, input.start, input.end, review),
            encouragement: "把今天的三餐记好，慢慢养成习惯。",
          };
        });
        const rid = id("plan-request");
        consumeAI(s, rid, "plan");
        const plan = {
          id: id("plan"),
          userId,
          createdAt: now(),
          start: today(),
          end: add(today(), days - 1),
          request: { days, mealStyle, weightStyle: weightStyle.id, weightStyleLabel: weightStyle.label, menuSeed, menuOffset, exercise, lossJin: goalAssessment.effectiveLossJin, requestedLossJin: goalAssessment.requestedLossJin, start: input.start, end: input.end,healthNote:String(input.healthNote||"").trim() },
          goalAssessment,
          profile: copy(p),
          profileBasis: {
            age, sex: p.sex || "未设置", height, weight,
            targetWeight: p.targetWeight || null, direction: p.direction || "未设置", healthStatus: p.healthStatus || "无 / 不适用",
            calorieGoal: p.calorieGoal || null, calorieApplied: !review && Number(p.calorieGoal) > 0,
            restrictions: terms, generatedAt: now(),
          },
          restrictions: terms,
          mode: review ? "review" : "general",
          notice:
            "本地公式模拟，仅供记录参考；不是医疗或运动处方，不保证减重效果。",
          days: result,
          tasks: {
            weight: { enabled: true, time: "08:00", remind: false },
            photo: { enabled: true, time: "12:00", remind: false },
            exercise: { enabled: true, time: input.end, remind: false },
          },
          executionConfirmed: false,
          checks: [],
        };
        for (const old of a.plans.filter(
          (x) => x.userId === userId && !x.closedOn,
        ))
          old.closedOn = today();
        compactPlan(plan, result);
        a.plans.unshift(plan);
        // Keep saved history instead of silently discarding older plans.
        return planView(plan, s);
      });
    },
    editPlanMeal(input) {
      return change((s) => {
        const p = activePlan(s, input.planId),
          days = planDays(p),
          d = days.find((d) => d.date === input.date),
          m = d && d.meals.find((m) => m.slot === input.slot);
        if (!m) throw Error("餐次不存在");
        if(p.closedOn || input.date < today()) throw Error("历史餐谱只读，请调整当前或未来餐次");
        const title = text(input.title, "餐食名称", 100);
        if (conflicts(title, p.restrictions))
          throw Error("餐食命中忌口或过敏原");
        const kcal = positive(input.kcal, "热量", 10000);
        const others = pastMeals(s,p.userId,p.id).concat(mealRows(days).filter(r=>r.date!==d.date || r.meal.slot!==input.slot));
        if(!allowedMeal(others,d.date,{title})) throw Error("调整后餐谱重复：7天内不能重样，30天最多3次");
        Object.assign(m, { title, kcal, manual: true });
        d.totalKcal = d.meals.reduce((n, m) => n + m.kcal, 0);
        compactPlan(p, days);
        return planView(p, s);
      });
    },
    regeneratePlanMeal(input) {
      return change((s) => {
        const p = activePlan(s, input.planId),
          days = planDays(p),
          d = days.find((d) => d.date === input.date),
          index = d && d.meals.findIndex((m) => m.slot === input.slot);
        if (!d || index < 0) throw Error("餐次不存在");
        if(p.closedOn || input.date < today()) throw Error("历史餐谱只读，请调整当前或未来餐次");
        const next = (d.meals[index].revision || 0) + 1;
        const dayIndex = Math.round((Date.parse(input.date + "T00:00:00Z") - Date.parse(p.start + "T00:00:00Z")) / 86400000);
        const m = chooseMeal(
          p.restrictions,
          ((p.request && p.request.menuOffset) || 0) + dayIndex * 3 + index + next * 17,
          input.slot,
          p.profileBasis && p.profileBasis.calorieApplied ? p.profileBasis.calorieGoal : init(s).ai.config.minIntake,
          (p.request && p.request.mealStyle) || "fatloss",
          pastMeals(s,p.userId,p.id).concat(mealRows(days).filter(r=>r.date!==d.date || r.meal.slot!==input.slot)), d.date, d.meals[index],
        );
        consumeAI(s, id("regenerate"), "recipe");
        m.revision = next;
        d.meals[index] = m;
        d.totalKcal = d.meals.reduce((n, m) => n + m.kcal, 0);
        compactPlan(p, days);
        return planView(p, s);
      });
    },
    confirmPlanExecution(planId) {
      return change(s=>{const p=activePlan(s,planId);if(p.closedOn || today()<p.start || today()>p.end) throw Error("仅可确认当前有效计划");p.executionConfirmed=true;p.confirmedAt=p.confirmedAt||now();return planView(p,s);});
    },
    configurePlanTasks(input) {
      return change((s) => {
        const p = activePlan(s, input.planId);
        if (p.closedOn || today() < p.start || today() > p.end)
          throw Error("仅可修改当前有效周期");
        for (const type of ["weight", "photo", "exercise"]) {
          const x = input.tasks[type];
          if (!x) continue;
          if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x.time))
            throw Error("提醒时间无效");
          p.tasks[type] = {
            enabled: !!x.enabled,
            time: x.time,
            remind: !!x.remind && !!x.enabled,
          };
        }
        return planView(p, s);
      });
    },
    completePlanTask(input) {
      return change((s) => {
        const p = activePlan(s, input.planId),
          type = input.type;
        if (
          p.closedOn ||
          today() < p.start ||
          today() > p.end ||
          !p.tasks[type] ||
          !p.tasks[type].enabled
        )
          throw Error("任务未启用或不在有效周期");
        if(!p.executionConfirmed) throw Error("请先确认执行计划");
        const check=recordTaskChecks(s,p).find(c=>c.date===today()&&c.type===type);
        if(!check) throw Error("请先保存今天对应的记录，任务会自动同步");
        return planView(p, s);
      });
    },
    getAIPlanExportRows(planId) {
      const s = read(),
        p = activePlan(s, planId),
        rows = [
          [
            "日期",
            "餐次",
            "餐食",
            "热量kcal（模拟）",
            "食材与份量",
            "制作方法",
            "活动",
            "分钟",
            "提示",
            "活动时段",
            "减重风格",
            "运动偏好（待确认时不执行）",
          ],
        ];
      for (const d of planDays(p))
        for (const m of d.meals)
          rows.push([
            d.date,
            m.slot,
            m.title,
            m.kcal,
            m.ingredients.map((i) => i.name + " " + i.grams + "g").join("、"),
            m.steps.join("；"),
            d.exercise.name,
            d.exercise.minutes,
            p.notice+(p.request.healthNote?"；身体补充："+p.request.healthNote:""),
            d.exercise.time + (d.exercise.end ? "—" + d.exercise.end : ""),
            p.request.weightStyleLabel || "未设置",
            d.exercise.requestedName ? d.exercise.requestedName + " " + d.exercise.requestedMinutes + "分钟" : "",
          ]);
      return rows;
    },
    getAILogExportRows() {
      const s = read();
      hq(s);
      return [
        [
          "调用编号",
          "日期",
          "用户",
          "类型",
          "状态",
          "来源",
          "消耗次数",
          "模拟服务商",
          "模型",
        ],
        ...init(s).ai.logs.map((l) => [
          l.id,
          l.day,
          l.userId,
          l.type,
          l.status,
          l.source,
          l.cost,
          l.provider,
          l.model || "本地模拟",
        ]),
      ];
    },
    exportAIPlan(planId) {
      const s = read(),
        p = activePlan(s, planId);
      return (
        p.notice +(p.request.healthNote?"\n身体补充："+p.request.healthNote:"")+
        (p.request.weightStyleLabel ? "\n减重风格：" + p.request.weightStyleLabel : "")+
        "\n" +
        planDays(p)
          .map(
            (d) =>
              d.date +
              "\n" +
              d.meals
                .map(
                  (m) =>
                    m.slot +
                    " " +
                    m.title +
                    " " +
                    m.kcal +
                    "kcal\n" +
                    m.ingredients
                      .map((i) => i.name + " " + i.grams + "g")
                      .join("、") +
                    "\n" +
                    m.steps.join("；"),
                )
                .join("\n") +
              "\n活动：" +
              d.exercise.name +
              " " +
              d.exercise.minutes +
              "分钟 · 时段 " + d.exercise.time + (d.exercise.end ? "—" + d.exercise.end : "") +
              (d.exercise.needsReview ? "\n运动偏好：" + d.exercise.requestedName + " " + d.exercise.requestedMinutes + "分钟（待专业确认，未安排执行量）" : ""),
          )
          .join("\n\n")
      );
    },
    saveAIProvider(input) {
      return change((s) => {
        hq(s);
        const a = init(s).ai;
        if (input.apiKey && input.apiKey !== "DEMO_ONLY")
          throw Error("离线演示不接收真实API Key");
        const endpoint = (x) =>
          /^https:\/\/[a-zA-Z0-9.-]+(?::443)?(?:\/[^\s#]*)?$/.test(
            String(x || ""),
          ) && !String(x).includes("@");
        if (!endpoint(input.textUrl) || !endpoint(input.imageUrl))
          throw Error("请填写无凭据的HTTPS服务地址");
        const old = a.providers.find((p) => p.id === input.id && !p.deleted);
        const p = {
          id: old ? old.id : id("provider"),
          name: text(input.name, "服务商名称", 50),
          textUrl: String(input.textUrl),
          imageUrl: String(input.imageUrl),
          textModel: text(input.textModel, "文本模型", 100),
          imageModel: text(input.imageModel, "图片模型", 100),
          hasKey: !!input.apiKey || !!(old && old.hasKey),
          revision: (old ? old.revision : 0) + 1,
        };
        if (old) Object.assign(old, p);
        else a.providers.push(p);
        audit(s, "AI服务商配置", "保存演示接口，不保存真实密钥");
        return copy(p);
      });
    },
    removeAIProvider(providerId) {
      return change((s) => {
        hq(s);
        const a = init(s).ai,
          p = a.providers.find((p) => p.id === providerId && !p.deleted);
        if (!p || a.config.active === providerId)
          throw Error("启用中的服务商不可删除，请先切换");
        p.deleted = true;
        audit(s, "删除AI服务商", p.name);
        return { deleted: true };
      });
    },
    getAdPlacement(key) {
      const s = read(),
        c = init(s).ads.config;
      const valid = [
        "homeBanner",
        "photoBanner",
        "healthBanner",
        "profileBanner",
        "homeInterstitial",
      ];
      return {
        enabled: valid.includes(key) && c.enabled && !!c[key],
        unitId: valid.includes(key) && c.enabled ? c[key] : "",
        mock: true,
      };
    },
    getAIConfig() {
      const s = read();
      hq(s);
      return copy(init(s).ai);
    },
    saveAIConfig(input) {
      return change((s) => {
        hq(s);
        const a = init(s).ai;
        if (input.apiKey && input.apiKey !== "DEMO_ONLY")
          throw Error("本地演示不接收真实API Key");
        if (input.mode && input.mode !== "mock")
          throw Error("当前仅支持本地模拟，未接真实服务");
        const c = Object.assign({}, a.config, input, { mode: "mock" });
        delete c.apiKey;
        if (!a.providers.some((p) => p.id === c.active && !p.deleted))
          throw Error("主服务商不存在");
        c.timeout = integer(c.timeout, "超时秒数", 1, 120);
        c.maxTokens = integer(c.maxTokens, "最大token", 512, 32768);
        for (const k of ["textEnabled", "photoEnabled"])
          if (typeof c[k] !== "boolean") throw Error("功能开关无效");
        c.dailyLimit = integer(c.dailyLimit, "全局日限额", 1, 1000000);
        c.initialFree = integer(c.initialFree, "新人免费次数", 0, 100);
        c.maxDays = integer(c.maxDays, "周期上限", 1, 1096);
        c.minIntake = integer(c.minIntake, "最低参考热量", 1500, 2500);
        c.maxDeficit = integer(c.maxDeficit, "情景缺口上限", 0, 500);
        if (!(Number(c.maxWeekly) > 0 && Number(c.maxWeekly) <= 0.9))
          throw Error("每周情景上限无效");
        c.rules = text(c.rules, "规则", 2000);
        c.provider = text(c.provider, "服务商", 50);
        a.config = c;
        a.config.revision = (a.config.revision || 0) + 1;
        audit(s, "AI配置", "模拟配置更新，不含密钥");
        return copy(c);
      });
    },
    getStartupConfig() { const s=read();admin(s);return copy(init(s).ads.startup); },
    saveStartupConfig(input) {
      return change(s=>{
        admin(s);const c={...init(s).ads.startup,...input};
        if(typeof c.enabled!=="boolean" || !["image","video","tencent"].includes(c.type))throw Error("开屏类型或开关无效");
        c.dailyLimit=integer(c.dailyLimit,"每人每日展示次数",0,100);
        c.duration=integer(c.duration,"展示时长",3,60);c.skipAfter=integer(c.skipAfter,"跳过等待秒数",0,c.duration);
        c.mediaUrl=String(c.mediaUrl||"").trim();c.unitId=String(c.unitId||"").trim();
        if(c.mediaUrl && (!/^https:\/\/[^\s]+$/.test(c.mediaUrl)||c.mediaUrl.length>1500))throw Error("素材请填写有效HTTPS链接");
        if(c.unitId && !/^adunit-[a-zA-Z0-9_-]{1,120}$/.test(c.unitId))throw Error("请填写微信流量主广告位ID（adunit-开头），不是网页链接");
        if(c.enabled && (c.type==="tencent"?!c.unitId:!c.mediaUrl))throw Error("请先配置对应素材或广告位ID");
        init(s).ads.startup=c;audit(s,"开屏配置","更新类型、素材与每日频次");return copy(c);
      });
    },
    beginStartupDisplay() {
      return change(s=>{
        const a=init(s).ads,c=a.startup,userId=(s.session&&s.session.userId)||"guest";
        const grant=membershipView(s,today()).activeGrant;
        if(!c.enabled || !c.dailyLimit || (grant && (grant.features||[]).includes("adFree")))return null;
        a.startupReceipts=a.startupReceipts.filter(r=>r.date===today());
        const used=a.startupReceipts.filter(r=>r.userId===userId && (r.status==="shown" || (r.status==="reserved" && now()-r.createdAt<90000))).length;
        if(used>=c.dailyLimit)return null;
        const receipt={id:id("startup"),userId,date:today(),createdAt:now(),status:"reserved"};a.startupReceipts.push(receipt);
        return {...copy(c),receiptId:receipt.id};
      });
    },
    finishStartupDisplay(receiptId,shown) {
      return change(s=>{
        const userId=(s.session&&s.session.userId)||"guest",r=init(s).ads.startupReceipts.find(r=>r.id===receiptId&&r.userId===userId&&r.date===today());
        if(!r)return false;
        if(r.status==="reserved")r.status=shown===true && now()-r.createdAt<90000?"shown":"failed";
        return r.status==="shown";
      });
    },
    getAdsConfig() {
      const s = read();
      admin(s);
      return copy(init(s).ads);
    },
    saveAdsConfig(input) {
      return change((s) => {
        admin(s);
        const ads = init(s).ads,
          c = Object.assign({}, ads.config, input);
        if (typeof c.enabled !== "boolean") throw Error("开关无效");
        c.dailyLimit = integer(c.dailyLimit, "每日可领次数", 0, 10000);
        c.grant = integer(c.grant, "单次奖励次数", 1, 1000);
        for (const k of [
          "rewardedVideo",
          "homeBanner",
          "photoBanner",
          "healthBanner",
          "profileBanner",
          "homeInterstitial",
        ]) {
          c[k] = String(c[k] || "").trim();
          if (!/^[a-zA-Z0-9_-]{0,128}$/.test(c[k]))
            throw Error("广告位ID仅支持字母数字横线与下划线");
        }
        ads.config = c;
        audit(s, "广告配置", "模拟广告位与奖励更新");
        return copy(c);
      });
    },
    beginRewardedVideo() {
      return change((s) => {
        login(s);
        const a = init(s).ads,
          c = a.config;
        if (
          !c.enabled ||
          !c.rewardedVideo ||
          a.receipts.filter((r) => r.userId === login(s) && r.date === today())
            .length >= c.dailyLimit
        )
          throw Error("激励视频未开放或今日领取次数已用完");
        const x = {
          id: id("video"),
          userId: login(s),
          date: today(),
          status: "playing",
          grant: c.grant,
          revision: JSON.stringify(c),
        };
        a.sessions.push(x);
        return copy(x);
      });
    },
    completeRewardedVideo(input) {
      return change((s) => {
        const a = init(s).ads,
          x = a.sessions.find(
            (x) => x.id === input.id && x.userId === login(s),
          );
        if (!x || x.status !== "playing" || x.date !== today())
          throw Error("视频会话不存在或已结束");
        if (!input.complete) {
          x.status = "interrupted";
          return { granted: 0 };
        }
        const c = a.config;
        if (
          !c.enabled ||
          !c.rewardedVideo ||
          x.revision !== JSON.stringify(c) ||
          a.receipts.filter((r) => r.userId === login(s) && r.date === today())
            .length >= c.dailyLimit
        )
          throw Error("广告配置已改变或次数已用完");
        x.status = "completed";
        a.credits += x.grant;
        if (ctx.evidence) ctx.evidence(s, "video", x.id, login(s));
        a.receipts.push({
          id: x.id,
          userId: login(s),
          date: today(),
          grant: x.grant,
        });
        return { granted: x.grant };
      });
    },
    getPaymentConfig() {
      const s = read();
      admin(s);
      return copy(init(s).payment);
    },
    savePaymentConfig(input) {
      return change((s) => {
        admin(s);
        const old = init(s).payment;
        if (input.apiKey || input.privateKey)
          throw Error("本地演示不接收真实支付密钥");
        const c = Object.assign({}, old, input);
        if (typeof c.enabled !== "boolean" || typeof c.iosAllowed !== "boolean")
          throw Error("支付开关无效");
        if (c.demoCredentials) {
          c.merchantId = "1900000001";
          c.serial = "DEAD00000001";
        }
        if (c.enabled && !c.demoCredentials) throw Error("请先填入演示凭据");
        c.revision = old.revision + 1;
        s.full.payment = c;
        audit(s, "支付配置", "仅演示商户，无真实收款");
        return copy(c);
      });
    },
    getPurchaseEntry(device) {
      const s = read(),
        c = init(s).payment;
      return {
        available:
          c.enabled && c.demoCredentials && (device !== "ios" || c.iosAllowed),
        revision: c.revision,
        mock: true,
        message:
          !c.enabled || !c.demoCredentials
            ? "模拟支付入口尚未配置"
            : device === "ios" && !c.iosAllowed
              ? "iOS模拟购买入口暂未开放"
              : "仅本地模拟，不会真实扣款",
      };
    },
    listMembershipPlans() {
      const s = read();
      return copy(init(s).catalog.filter((p) => p.enabled));
    },
    purchaseMembership(input) {
      return change((s) => {
        const f = init(s),
          userId = ctx.requireCity(s),
          requestId = text(input.requestId, "请求编号", 100),
          old = f.orders.find(
            (o) => o.userId === userId && o.requestId === requestId,
          );
        if (old) return copy(old);
        const c = f.payment;
        if (
          !c.enabled ||
          !c.demoCredentials ||
          (input.device === "ios" && !c.iosAllowed)
        )
          throw Error("当前支付入口关闭或设备暂不支持");
        if (!["ios", "android", "devtools"].includes(input.device))
          throw Error("设备类型无效");
        if (
          input.revision !== undefined &&
          Number(input.revision) !== c.revision
        )
          throw Error("支付配置已更新，请刷新");
        const p = f.catalog.find((p) => p.id === input.planId && p.enabled);
        if (!p) throw Error("套餐已下架");
        const orderId = id("order");
        const g = ctx.grant(s, {
          id: "order:" + orderId,
          source: "purchase",
          title: p.name,
          days: p.days,
          dailyLimit: p.dailyLimit,
          backfillMonthly: p.backfillMonthly || 0,
          features: p.features,
        });
        const o = {
          id: orderId,
          userId,
          requestId,
          status: "paid",
          plan: copy(p),
          amount: p.price,
          device: input.device,
          revision: c.revision,
          grantId: g.id,
          createdAt: now(),
          date: today(),
          mock: true,
        };
        f.orders.unshift(o);
        notify(s, "模拟会员购买成功", "权益已加入队列；没有发生真实支付。");
        audit(s, "模拟购买", orderId);
        return copy(o);
      });
    },
    listOrders() {
      const s = read();
      return copy(
        init(s).orders.filter(
          (o) => ["admin", "hq"].includes(s.full.role) || o.userId === login(s),
        ),
      );
    },
    requestOrderRefund(orderId) {
      return change((s) => {
        const o = init(s).orders.find(
          (o) => o.id === orderId && o.userId === login(s),
        );
        if (!o || o.status !== "paid") throw Error("仅已支付订单可申请退款");
        o.status = "refund_pending";
        o.refundRequestedAt = now();
        notify(s, "模拟退款申请已提交", "等待管理员审核，无真实资金流转");
        return copy(o);
      });
    },
    approveOrderRefund(orderId) {
      return change((s) => {
        admin(s);
        const o = init(s).orders.find((o) => o.id === orderId);
        if (!o || o.status !== "refund_pending")
          throw Error("订单不在待退款状态");
        ctx.revokeGrant(s, o.grantId, "模拟会员订单退款");
        o.status = "refunded";
        o.refundedAt = now();
        audit(s, "模拟退款审核通过", o.id);
        notify(s, "模拟退款已处理", "只撤回对应订单剩余权益。");
        return copy(o);
      });
    },
    getInvites() {
      return change((s) => {
        const f = init(s),
          d = f.invites,
          userId = login(s);
        let u = d.users.find((u) => u.id === userId);
        if (!u) {
          u = {
            id: userId,
            code:
              "QD" +
              id("invite")
                .replace(/[^a-zA-Z0-9]/g, "")
                .toUpperCase(),
            nickname: s.profile.nickname || "轻友",
          };
          d.users.push(u);
        }
        const rows = d.records.filter((r) => r.inviter === userId);
        return {
          enabled: d.enabled,
          code: u.code,
          link:
            "/pages/invite-register/index?code=" + encodeURIComponent(u.code),
          records: copy(rows),
          tiers: d.tiers.map((t) =>
            Object.assign({}, t, {
              ready:
                d.enabled &&
                rows.length >= t.count &&
                !d.claims.some((c) => c.userId === userId && c.tierId === t.id),
              claimed: d.claims.some(
                (c) => c.userId === userId && c.tierId === t.id,
              ),
            }),
          ),
          claims: copy(d.claims.filter((c) => c.userId === userId)),
        };
      });
    },
    registerInvitedVisitor(input) {
      return change((s) => {
        const d = init(s).invites,
          inviter = d.users.find(
            (u) => u.code === String(input.code || "").trim(),
          );
        if (!inviter) throw Error("邀请链接无效");
        const visitorId = text(input.visitorId, "模拟访客编号", 100),
          nickname = text(input.nickname, "昵称", 20);
        if (
          visitorId === inviter.id ||
          d.users.some((u) => u.id === visitorId) ||
          d.records.some((r) => r.userId === visitorId)
        )
          throw Error("不可自邀或重复绑定；仅首次注册可绑定");
        const row = {
          id: id("invite-record"),
          userId: visitorId,
          nickname,
          inviter: inviter.id,
          date: today(),
          mock: true,
        };
        d.users.push({ id: visitorId, nickname, code: "QDN" + id("code") });
        d.records.push(row);
        if (ctx.evidence) ctx.evidence(s, "invite", visitorId, inviter.id);
        return copy(row);
      });
    },
    claimInviteTier(tierId) {
      return change((s) => {
        const d = init(s).invites,
          userId = login(s),
          t = d.tiers.find((t) => t.id === tierId);
        if (
          !d.enabled ||
          !t ||
          d.records.filter((r) => r.inviter === userId).length < t.count ||
          d.claims.some((c) => c.userId === userId && c.tierId === tierId)
        )
          throw Error("未达奖励档位或已领取");
        const g = ctx.grant(s, {
          id: "invite:" + userId + ":" + tierId,
          source: "invite",
          title: t.name,
          days: t.days,
          dailyLimit: t.dailyLimit,
        });
        d.claims.push({
          id: id("invite-claim"),
          userId,
          tierId,
          grantId: g.id,
          days: t.days,
          date: today(),
        });
        notify(
          s,
          "邀请奖励已领取",
          t.name + "：" + t.days + "天模拟会员已进入权益队列",
        );
        return copy(g);
      });
    },
    saveInviteConfig(input) {
      return change((s) => {
        hq(s);
        const d = init(s).invites;
        if (
          !Array.isArray(input.tiers) ||
          !input.tiers.length ||
          input.tiers.length > 10
        )
          throw Error("请配置1–10个邀请档位");
        const ids = new Set();
        const tiers = input.tiers.map((t) => {
          const tid = text(t.id, "档位ID", 50);
          if (ids.has(tid)) throw Error("档位ID重复");
          ids.add(tid);
          return {
            id: tid,
            name: text(t.name, "档位名称", 50),
            count: integer(t.count, "邀请人数", 1, 10000),
            days: integer(t.days, "奖励天数", 1, 365),
            dailyLimit: integer(t.dailyLimit, "每日额度", 1, 1000),
          };
        });
        d.enabled = !!input.enabled;
        d.tiers = tiers;
        audit(s, "邀请规则配置", "档位规则更新");
        return copy(d);
      });
    },
    editRecognizedMeal(input) {
      return change((s) => {
        const r = (s.records || []).find(
          (r) =>
            r.id === input.recordId &&
            r.userId === login(s) &&
            r.type === "meal",
        );
        if (!r) throw Error("餐食记录不存在");
        const slot = input.slot || r.slot;
        if (!["breakfast", "lunch", "dinner", "snack"].includes(slot))
          throw Error("餐次无效");
        Object.assign(r, {
          name: text(input.name, "餐食名称", 100),
          kcal: positive(input.kcal, "热量", 10000),
          slot,
          corrected: true,
          updatedAt: now(),
        });
        const recognition = s.recognitions.find((x) => x.recordId === r.id);
        if (recognition)
          Object.assign(recognition, {
            name: r.name,
            kcal: r.kcal,
            slot: r.slot,
            corrected: true,
          });
        return copy(recognition || r);
      });
    },
    _hooks: { assertRecognition, consumeRecognition, logRecognition },
  };
  return api;
}
module.exports = { createGrowthFullDomain };
