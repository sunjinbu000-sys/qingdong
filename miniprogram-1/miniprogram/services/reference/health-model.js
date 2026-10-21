/* 食品及 MET 强度均为演示参数；正式版本需接入可追溯食品/配方数据。 */
(function (root) {
  "use strict";
  const r = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const foods = [
    {
      id: "rice",
      name: "熟米饭",
      group: "主食",
      unit: "g",
      kcal: 116,
      protein: 2.6,
      carb: 25.9,
      fat: 0.3,
      tags: ["米"],
    },
    {
      id: "brownrice",
      name: "熟糙米饭",
      group: "主食",
      unit: "g",
      kcal: 111,
      protein: 2.6,
      carb: 23,
      fat: 0.9,
      tags: ["糙米"],
    },
    {
      id: "chicken",
      name: "熟鸡胸肉",
      group: "肉蛋奶",
      unit: "g",
      kcal: 165,
      protein: 31,
      carb: 0,
      fat: 3.6,
      tags: ["鸡肉"],
    },
    {
      id: "egg",
      name: "水煮鸡蛋",
      group: "肉蛋奶",
      unit: "g",
      kcal: 143,
      protein: 12.6,
      carb: 0.7,
      fat: 9.5,
      tags: ["鸡蛋", "蛋类"],
    },
    {
      id: "milk",
      name: "全脂牛奶",
      group: "肉蛋奶",
      unit: "ml",
      kcal: 61,
      protein: 3.2,
      carb: 4.8,
      fat: 3.3,
      tags: ["牛奶", "乳制品", "乳糖"],
    },
    {
      id: "tofu",
      name: "嫩豆腐",
      group: "豆类",
      unit: "g",
      kcal: 55,
      protein: 5.3,
      carb: 2,
      fat: 2.8,
      tags: ["大豆", "豆制品"],
    },
    {
      id: "broccoli",
      name: "西兰花",
      group: "蔬果",
      unit: "g",
      kcal: 34,
      protein: 2.8,
      carb: 6.6,
      fat: 0.4,
      tags: ["西兰花"],
    },
    {
      id: "tomato",
      name: "番茄",
      group: "蔬果",
      unit: "g",
      kcal: 18,
      protein: 0.9,
      carb: 3.9,
      fat: 0.2,
      tags: ["番茄", "西红柿"],
    },
    {
      id: "cucumber",
      name: "黄瓜",
      group: "蔬果",
      unit: "g",
      kcal: 15,
      protein: 0.7,
      carb: 3.6,
      fat: 0.1,
      tags: ["黄瓜"],
    },
    {
      id: "banana",
      name: "香蕉",
      group: "蔬果",
      unit: "g",
      kcal: 89,
      protein: 1.1,
      carb: 22.8,
      fat: 0.3,
      tags: ["香蕉"],
    },
    {
      id: "apple",
      name: "苹果",
      group: "蔬果",
      unit: "g",
      kcal: 52,
      protein: 0.3,
      carb: 13.8,
      fat: 0.2,
      tags: ["苹果"],
    },
    {
      id: "oats",
      name: "干燕麦片",
      group: "主食",
      unit: "g",
      kcal: 389,
      protein: 16.9,
      carb: 66.3,
      fat: 6.9,
      tags: ["燕麦", "含麸质谷物"],
    },
    {
      id: "potato",
      name: "熟土豆",
      group: "主食",
      unit: "g",
      kcal: 87,
      protein: 1.9,
      carb: 20.1,
      fat: 0.1,
      tags: ["土豆"],
    },
    {
      id: "oil",
      name: "食用植物油",
      group: "调味",
      unit: "g",
      kcal: 884,
      protein: 0,
      carb: 0,
      fat: 100,
      tags: ["植物油"],
    },
    {
      id: "peanut",
      name: "花生仁",
      group: "坚果",
      unit: "g",
      kcal: 567,
      protein: 25.8,
      carb: 16.1,
      fat: 49.2,
      tags: ["花生", "坚果"],
    },
    {
      id: "shrimp",
      name: "熟虾仁",
      group: "肉蛋奶",
      unit: "g",
      kcal: 99,
      protein: 24,
      carb: 0.2,
      fat: 0.3,
      tags: ["虾", "海鲜", "甲壳类"],
    },
    {
      id: "coffee",
      name: "美式咖啡 · 无糖",
      group: "饮品",
      unit: "ml",
      kcal: 2,
      protein: 0.1,
      carb: 0.3,
      fat: 0,
      tags: ["咖啡", "咖啡因"],
    },
    {
      id: "latte",
      name: "拿铁 · 不额外加糖",
      group: "饮品",
      unit: "ml",
      kcal: 62,
      protein: 3.1,
      carb: 5,
      fat: 3.3,
      tags: ["咖啡", "咖啡因", "牛奶", "乳制品", "乳糖"],
    },
    {
      id: "milktea",
      name: "原味奶茶 · 常规糖",
      group: "饮品",
      unit: "ml",
      kcal: 68,
      protein: 1.5,
      carb: 10.8,
      fat: 2.1,
      tags: ["奶茶", "茶", "咖啡因", "牛奶", "乳制品", "乳糖"],
    },
    {
      id: "milktea0",
      name: "原味奶茶 · 不额外加糖",
      group: "饮品",
      unit: "ml",
      kcal: 45,
      protein: 1.8,
      carb: 5.4,
      fat: 1.8,
      tags: ["奶茶", "茶", "咖啡因", "牛奶", "乳制品", "乳糖"],
    },
    {
      id: "lemontea",
      name: "柠檬茶 · 常规糖",
      group: "饮品",
      unit: "ml",
      kcal: 35,
      protein: 0,
      carb: 8.7,
      fat: 0,
      tags: ["茶", "咖啡因", "柠檬"],
    },
    {
      id: "tea",
      name: "纯茶 · 无糖",
      group: "饮品",
      unit: "ml",
      kcal: 0,
      protein: 0,
      carb: 0,
      fat: 0,
      tags: ["茶", "咖啡因"],
    },
  ];
  const recipes = [
    {
      id: "chickenbowl",
      name: "鸡胸糙米蔬菜碗",
      time: 20,
      items: [
        ["brownrice", 150],
        ["chicken", 120],
        ["broccoli", 150],
        ["oil", 5],
      ],
      steps: [
        "糙米饭与鸡胸肉分别煮熟。",
        "西兰花焯熟，将熟鸡肉切块。",
        "按记录的油量拌匀，其他调味另计。",
      ],
    },
    {
      id: "tofushort",
      name: "番茄豆腐汤",
      time: 15,
      items: [
        ["tomato", 200],
        ["tofu", 150],
        ["oil", 3],
      ],
      steps: [
        "番茄切块，豆腐切丁。",
        "按记录油量炒软番茄，加水煮开。",
        "加入豆腐煮熟；额外配料需要另计。",
      ],
    },
    {
      id: "oatbowl",
      name: "燕麦牛奶香蕉碗",
      time: 8,
      items: [
        ["oats", 40],
        ["milk", 200],
        ["banana", 80],
      ],
      steps: [
        "按记录份量称取燕麦片。",
        "加入牛奶煮熟或浸泡至适合口感。",
        "放入香蕉片；蜂蜜、坚果等额外添加需另计。",
      ],
    },
    {
      id: "eggbowl",
      name: "鸡蛋土豆蔬菜碗",
      time: 18,
      items: [
        ["egg", 100],
        ["potato", 120],
        ["cucumber", 150],
        ["oil", 3],
      ],
      steps: [
        "将土豆与鸡蛋完全煮熟。",
        "黄瓜洗净切块，熟食分别切块。",
        "按记录油量拌匀，酱汁另计。",
      ],
    },
  ];
  const activities = [
    { id: "walk", name: "步行 · 演示中等强度", met: 3.5 },
    { id: "run", name: "跑步 · 演示强度", met: 8 },
    { id: "strength", name: "力量训练 · 演示强度", met: 3.5 },
    { id: "cycle", name: "骑行 · 演示强度", met: 6.8 },
    { id: "yoga", name: "瑜伽 · 演示强度", met: 2.5 },
  ];
  const aliases = {
    奶: ["牛奶", "乳制品", "乳糖"],
    乳制品: ["牛奶", "乳制品", "乳糖"],
    牛奶: ["牛奶", "乳制品"],
    鸡蛋: ["鸡蛋", "蛋类"],
    蛋类: ["鸡蛋", "蛋类"],
    豆制品: ["大豆", "豆制品"],
    大豆: ["大豆", "豆制品"],
    海鲜: ["海鲜", "虾", "甲壳类"],
    虾: ["虾", "甲壳类"],
    坚果: ["坚果", "花生"],
    麸质: ["含麸质谷物", "燕麦"],
    小麦: ["含麸质谷物"],
    乳糖: ["乳糖", "牛奶"],
    咖啡因: ["咖啡因", "咖啡", "茶"],
  };
  function nutrients(food, quantity) {
    if (!food || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0)
      throw Error("份量必须大于 0");
    return Object.fromEntries(
      ["kcal", "protein", "carb", "fat"].map((k) => [
        k,
        r((food[k] * quantity) / 100),
      ]),
    );
  }
  function recipeFood(recipe) {
    const n = { kcal: 0, protein: 0, carb: 0, fat: 0 },
      tags = [];
    recipe.items.forEach(([id, q]) => {
      const f = foods.find((x) => x.id === id),
        p = nutrients(f, q);
      for (const k in n) n[k] += p[k];
      tags.push(...f.tags, f.name);
    });
    for (const k in n) n[k] = r(n[k]);
    return {
      ...recipe,
      ...n,
      tags: [...new Set(tags)],
      unit: "份",
      group: "食谱",
    };
  }
  function initial() {
    return { signedIn: true, profile: { goal: 1800, avoid: [] }, days: {} };
  }
  function ensureDay(h, date) {
    if (!h.days[date])
      h.days[date] = { goal: h.profile.goal, meals: [], exercises: [] };
    return h.days[date];
  }
  function summary(day) {
    const meals = day.meals || [],
      exercises = day.exercises || [];
    const intake = r(meals.reduce((s, x) => s + x.kcal, 0)),
      exercise = r(exercises.reduce((s, x) => s + x.kcal, 0)),
      budget = r(day.goal + exercise),
      hasData = meals.length + exercises.length > 0;
    return {
      intake,
      exercise,
      budget,
      remaining: hasData ? r(budget - intake) : null,
      protein: r(meals.reduce((s, x) => s + (x.protein || 0), 0)),
      carb: r(meals.reduce((s, x) => s + (x.carb || 0), 0)),
      fat: r(meals.reduce((s, x) => s + (x.fat || 0), 0)),
      ratio: hasData ? intake / budget : 0,
      status: !hasData
        ? "empty"
        : intake > budget
          ? "over"
          : intake >= budget * 0.9
            ? "near"
            : "normal",
    };
  }
  function exerciseCalories(met, weight, minutes) {
    if (![met, weight, minutes].every((x) => Number.isFinite(x) && x > 0))
      throw Error("运动参数必须为有效正数");
    return r((met * weight * minutes) / 60);
  }
  function parseAvoid(text) {
    return [
      ...new Set(
        String(text)
          .split(/[，,、；;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
  }
  function conflicts(food, avoid) {
    const hay = [food.name, ...(food.tags || [])].join("|").toLowerCase();
    return avoid.filter((term) =>
      (aliases[term] || [term]).some((t) => hay.includes(t.toLowerCase())),
    );
  }
  function unknownAvoid(avoid) {
    const known = new Set([
      ...Object.keys(aliases),
      ...foods.flatMap((f) => [f.name, ...f.tags]),
    ]);
    return avoid.filter((t) => !known.has(t));
  }
  function suggestions(remaining, avoid) {
    if (remaining <= 0) return [];
    return recipes
      .map(recipeFood)
      .concat(
        foods
          .filter((f) => ["蔬果", "肉蛋奶"].includes(f.group))
          .map((f) => ({ ...f, ...nutrients(f, 100), portion: 100 })),
      )
      .filter(
        (f) => f.kcal > 0 && f.kcal <= remaining && !conflicts(f, avoid).length,
      )
      .sort((a, b) => b.kcal - a.kcal)
      .slice(0, 3);
  }
  const effectiveAvoid = (p) => [
    ...new Set([...(p.avoid || []), ...(p.allergies || [])]),
  ];
  const api = {
    effectiveAvoid,
    foods,
    recipes,
    activities,
    nutrients,
    recipeFood,
    initial,
    ensureDay,
    summary,
    exerciseCalories,
    parseAvoid,
    conflicts,
    unknownAvoid,
    suggestions,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.HealthModel = api;
})(typeof window !== "undefined" ? window : globalThis);
