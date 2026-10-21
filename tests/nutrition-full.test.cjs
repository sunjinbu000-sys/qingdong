const test = require("node:test"),
  assert = require("node:assert/strict");
const { setup } = require("./helpers.cjs");
test("food library portions, exercise estimates and calendar derive from the same diary", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  const food = d.getFoodLibrary().foods.find((x) => x.id === "rice");
  assert.equal(food.kcal, 116);
  d.recordFoodPortion({
    foodId: "rice",
    grams: 200,
    date: "2026-10-21",
    slot: "lunch",
  });
  d.recordExerciseSession({
    activityId: "walk",
    minutes: 30,
    weight: 60,
    date: "2026-10-21",
  });
  const v = d.getNutritionOverview("2026-10-21");
  assert.equal(v.nutrition.calories, 232);
  assert.equal(v.exerciseCalories, 105);
  assert.ok(v.calendar.some((x) => x.date === "2026-10-21" && x.hasRecords));
  assert.throws(() =>
    d.recordFoodPortion({
      foodId: "rice",
      grams: 0,
      date: "2026-10-21",
      slot: "lunch",
    }),
  );
});
test("full health profile and restrictions persist and goal changes affect budget", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.saveExtendedProfile({
    sex: "女",
    age: 30,
    initialWeight: 61,
    goalDays: 90,
    restrictions: "花生,牛奶",
    calorieGoal: 1800,
  });
  assert.deepEqual(d.getExtendedProfile().restrictions, ["花生", "牛奶"]);
  assert.equal(d.getNutritionOverview("2026-10-21").goal, 1800);
});
test("recipe portions use original ingredient model and flag known restrictions", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.saveExtendedProfile({ restrictions: ["牛奶"] });
  const recipe = d.getFoodLibrary().recipes.find((r) => r.id === "oatbowl");
  assert.ok(recipe.conflicts.includes("牛奶"));
  const r = d.recordRecipePortion({
    recipeId: "oatbowl",
    portions: 1,
    date: "2026-10-21",
    slot: "breakfast",
  });
  assert.equal(r.kcal, recipe.kcal);
  assert.ok(r.protein > 0);
});
test("health advice uses configured BMI scenario instead of always normal", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.setDemoRole("hq");
  d.saveHealthSettings({
    lowAdvice: "低组提示",
    normalAdvice: "中组提示",
    highAdvice: "高组提示",
  });
  d.setDemoRole("consumer");
  d.saveExtendedProfile({ height: 170, initialWeight: 45 });
  assert.equal(d.getNutritionOverview("2026-10-21").advice, "低组提示");
  d.saveExtendedProfile({ initialWeight: 90 });
  assert.equal(d.getNutritionOverview("2026-10-21").advice, "高组提示");
});
test("recognized meal macros feed canonical nutrition summary", () => {
  const f = setup(),
    d = f.domain;
  f.login();
  d.recognizeMeal({ imagePath: "wxfile://saved/a.jpg", requestId: "macro" });
  const n = d.getNutritionOverview("2026-10-21").nutrition;
  assert.equal(n.protein, 32);
  assert.equal(n.carb, 62);
  assert.equal(n.fat, 16);
});
