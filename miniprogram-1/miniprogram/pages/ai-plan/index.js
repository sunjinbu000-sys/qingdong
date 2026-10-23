const { exportWorkbook } = require("../../utils/export");
const { page, service, navigate } = require("../../utils/page");
page({
  data: {
    plans: [],
    plan: null,
    day: null,
    days: 7,
    lossJin: 0,
    start: "18:00",
    end: "18:30",
    restrictions: "",
    selected: 0,
    profile: {},
    taskTypes: [
      { id: "signin", label: "签到" },
      { id: "photo", label: "拍照记录" },
      { id: "exercise", label: "活动完成" },
    ],
  },
  refresh() {
    return this.loadData(async () => {
      if (!(await this.requireAccount())) return;
      const plans = await service.getAIPlans(),
        access = await service.getRecognitionAccess();
      this.plans = plans;
      const extra = await service.getPlanProfile();
      const recordOnly = Number(extra.age) < 18 || Number(extra.age) >= 65 || extra.special || (extra.conditions && extra.conditions !== "无") || (extra.weight && extra.height && extra.weight / (extra.height / 100) ** 2 < 24) || extra.direction === "仅记录日常";
      this.setData({
        plans: plans.map((p) => ({
          id: p.id,
          start: p.start,
          request: p.request,
          closedOn: p.closedOn,
        })),
        access,
        profile: extra,
        days: extra.goalDays || 7,
        lossJin: !recordOnly && extra.direction !== "保持体重，规律生活" && extra.targetWeight && extra.weight ? Math.max(0, Math.round((extra.weight - extra.targetWeight) * 20) / 10) : 0,
        recordOnly,
        restrictions: (extra.restrictions || []).join("、"),
      });
      if (plans.length) this.showPlan(plans[0]);
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  showPlan(p) {
    this.localPlan = p;
    const index = Math.min(this.data.selected, p.days.length - 1),
      safe = Object.assign({}, p, {
        days: undefined,
        dates: p.days.map((d) => d.date),
      });
    delete safe.days;
    this.setData({
      plan: safe,
      selected: index,
      day: p.days[index],

    });
  },
  selectDay(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ selected: index, day: this.localPlan.days[index] });
  },
  generate() {
    return this.action(async () => {
      const p = await service.generateAIPlan({
        days: Number(this.data.days),
        lossJin: Number(this.data.lossJin),
        start: this.data.start,
        end: this.data.end,
        restrictions: this.data.restrictions,
      });
      this.setData({ selected: 0 });
      this.showPlan(p);
      this.plans = await service.getAIPlans();
      this.setData({
        plans: this.plans.map((p) => ({
          id: p.id,
          start: p.start,
          request: p.request,
          closedOn: p.closedOn,
        })),
        access: await service.getRecognitionAccess(),
      });
      wx.showToast({ title: "模拟计划已生成", icon: "success" });
    });
  },
  history(e) {
    this.showPlan(this.plans[Number(e.currentTarget.dataset.index)]);
  },
  regenerate(e) {
    this.action(async () => {
      this.showPlan(
        await service.regeneratePlanMeal({
          planId: this.data.plan.id,
          date: this.data.day.date,
          slot: e.currentTarget.dataset.slot,
        }),
      );
    });
  },
  edit(e) {
    const m = this.data.day.meals.find(
      (m) => m.slot === e.currentTarget.dataset.slot,
    );
    this.setData({ editSlot: m.slot, editTitle: m.title, editKcal: m.kcal });
  },
  saveMeal() {
    this.action(async () => {
      this.showPlan(
        await service.editPlanMeal({
          planId: this.data.plan.id,
          date: this.data.day.date,
          slot: this.data.editSlot,
          title: this.data.editTitle,
          kcal: Number(this.data.editKcal),
        }),
      );
      this.setData({ editSlot: "" });
    });
  },
  task(e) {
    this.action(async () => {
      const type = e.currentTarget.dataset.type;
      if (type === "photo") {
        navigate("/pages/photo/index?planId=" + this.data.plan.id);
        return;
      }
      this.showPlan(
        await service.completePlanTask({ planId: this.data.plan.id, type }),
      );
      wx.showToast({ title: "今日任务已完成", icon: "success" });
    });
  },
  toggleTask(e) {
    this.action(async () => {
      const type = e.currentTarget.dataset.type,
        key = e.currentTarget.dataset.key,
        tasks = JSON.parse(JSON.stringify(this.data.plan.tasks));
      tasks[type][key] = e.detail.value;
      this.showPlan(
        await service.configurePlanTasks({ planId: this.data.plan.id, tasks }),
      );
    });
  },
  taskTime(e) {
    this.action(async () => {
      const tasks = JSON.parse(JSON.stringify(this.data.plan.tasks));
      tasks[e.currentTarget.dataset.type].time = e.detail.value;
      this.showPlan(
        await service.configurePlanTasks({ planId: this.data.plan.id, tasks }),
      );
    });
  },
  exportExcel() {
    this.action(async () =>
      exportWorkbook(
        await service.getAIPlanExportRows(this.data.plan.id),
        "轻动-AI模拟计划",
      ),
    );
  },
  exportPlan() {
    this.action(async () =>
      wx.setClipboardData({
        data: await service.exportAIPlan(this.data.plan.id),
      }),
    );
  },
});
