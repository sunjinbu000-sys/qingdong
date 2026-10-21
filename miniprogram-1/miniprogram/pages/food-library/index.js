const { page, service } = require("../../utils/page");
page({
  data: {
    tab: "foods",
    tabs: [
      { key: "foods", label: "食物库" },
      { key: "recipes", label: "家常食谱" },
      { key: "activities", label: "运动估算" },
    ],
    library: { foods: [], recipes: [], activities: [] },
    shown: [],
    query: "",
    date: "",
    today: "",
    activeId: "",
    amount: 100,
    weight: 60,
    slot: 1,
    slots: ["早餐", "午餐", "晚餐", "加餐"],
  },
  onLoad(o) {
    if (o.date) this.setData({ date: o.date });
  },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      this.setData({
        today: s.date,
        date: this.data.date || s.date,
        library: await service.getFoodLibrary(),
      });
      this.applyFilter();
    });
  },
  applyFilter() {
    this.setData({
      shown: this.data.library[this.data.tab]
        .filter((x) => !this.data.query || x.name.includes(this.data.query))
        .map((x) => ({
          ...x,
          conflictsText: (x.conflicts || []).join("、"),
          ingredientsText: (x.ingredients || []).join("、"),
        })),
    });
  },
  selectTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      tab,
      activeId: "",
      amount: tab === "recipes" ? 1 : tab === "activities" ? 30 : 100,
    });
    this.applyFilter();
  },
  search(e) {
    this.setData({ query: e.detail.value });
    this.applyFilter();
  },
  select(e) {
    this.setData({ activeId: e.currentTarget.dataset.id });
  },
  dateChange(e) {
    this.setData({ date: e.detail.value });
  },
  amount(e) {
    this.setData({ amount: e.detail.value });
  },
  weight(e) {
    this.setData({ weight: e.detail.value });
  },
  slot(e) {
    this.setData({ slot: Number(e.detail.value) });
  },
  save() {
    this.action(async () => {
      if (!(await this.requireAccount())) return;
      const base = {
        date: this.data.date,
        slot: ["breakfast", "lunch", "dinner", "snack"][this.data.slot],
      };
      if (this.data.tab === "foods")
        await service.recordFoodPortion({
          ...base,
          foodId: this.data.activeId,
          grams: this.data.amount,
        });
      else if (this.data.tab === "recipes")
        await service.recordRecipePortion({
          ...base,
          recipeId: this.data.activeId,
          portions: this.data.amount,
        });
      else
        await service.recordExerciseSession({
          ...base,
          activityId: this.data.activeId,
          minutes: this.data.amount,
          weight: this.data.weight,
        });
      wx.showToast({ title: "已记入日记" });
      this.setData({ activeId: "" });
    });
  },
});
