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
    activeStep:1,healthNote:"",activityPreset:"evening",restrictionChips:[],
    activityPresets:[{id:"morning",label:"早晨",start:"06:30",end:"07:00"},{id:"noon",label:"午间",start:"12:30",end:"13:00"},{id:"evening",label:"傍晚",start:"18:00",end:"18:30"},{id:"night",label:"晚间",start:"20:00",end:"20:30"}],
    mealStyle: "fatloss", mealStyleLabel: "减脂餐", mealStyleOpen: false,
    mealStyles: [{ id: "fatloss", label: "减脂餐", description: "清淡做法，保留主食，搭配常见蛋白质与蔬果" }, { id: "home", label: "家庭日常", description: "日常易购食材、家常做法，兼顾品类与实用" }, { id: "mixed", label: "混合搭配", description: "家庭日常与减脂餐交替安排，丰富口味" }],
    goalAssessment: null,
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
        today:(await service.getSnapshot()).date,
        restrictions: (extra.restrictions || []).join("、"),
      });
      this.updateRestrictionChips();
      if (plans.length) this.showPlan(plans[0]);
      await this.assessGoal();
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
    if (["days", "lossJin","healthNote"].includes(e.currentTarget.dataset.key)) this.assessGoal();
    if(e.currentTarget.dataset.key==="restrictions")this.updateRestrictionChips();
    if(["start","end"].includes(e.currentTarget.dataset.key))this.setData({activityPreset:"custom"});
  },
  step(e){const activeStep=Number(e.currentTarget.dataset.step);this.setData({activeStep});wx.pageScrollTo({selector:["#plan-profile","#plan-goal","#plan-extra",this.data.plan?"#plan-report":"#plan-generate"][activeStep-1],duration:250});},
  chooseActivity(e){const p=this.data.activityPresets.find(p=>p.id===e.currentTarget.dataset.id);if(p)this.setData({activityPreset:p.id,start:p.start,end:p.end});},
  updateRestrictionChips(){const terms=String(this.data.restrictions||"").split(/[、,，\s]+/).filter(Boolean);this.setData({restrictionChips:["牛奶","鸡蛋","花生","海鲜"].map(value=>({value,selected:terms.includes(value)}))});},
  toggleRestriction(e){const value=e.currentTarget.dataset.value;if((this.data.profile.restrictions||[]).includes(value)){wx.showToast({title:"档案忌口请到档案修改",icon:"none"});return;}const terms=String(this.data.restrictions||"").split(/[、,，\s]+/).filter(Boolean);this.setData({restrictions:(terms.includes(value)?terms.filter(t=>t!==value):terms.concat(value)).join("、")});this.updateRestrictionChips();},
  relativeDay(e){if(!this.localPlan)return;const index=Math.max(0,Math.min(this.localPlan.days.length-1,this.data.selected+Number(e.currentTarget.dataset.offset)));this.selectDay({currentTarget:{dataset:{index}}});},
  todayDay(){if(!this.localPlan)return;const index=this.localPlan.days.findIndex(d=>d.date===this.data.today);this.selectDay({currentTarget:{dataset:{index:Math.max(0,index)}}});},
  toggleMealStyles() { this.setData({ mealStyleOpen: !this.data.mealStyleOpen }); },
  selectMealStyle(e) { const option = this.data.mealStyles.find(x => x.id === e.currentTarget.dataset.style); if (option) this.setData({ mealStyle: option.id, mealStyleLabel: option.label, mealStyleOpen: false }); },
  async assessGoal() {
    const revision = (this.goalRevision || 0) + 1; this.goalRevision = revision;
    try { const assessment = await service.assessPlanGoal({ days: Number(this.data.days), lossJin: Number(this.data.lossJin),healthNote:this.data.healthNote }); if (revision === this.goalRevision) this.setData({ goalAssessment: assessment, goalError: "" }); }
    catch (error) { if (revision === this.goalRevision) this.setData({ goalAssessment: null, goalError: error.message }); }
  },
  extendPeriod() { this.setData({ days: this.data.goalAssessment.suggestedDays }); return this.assessGoal(); },
  showPlan(p) {
    this.localPlan = p;
    const index = Math.min(this.data.selected, p.days.length - 1),
      safe = Object.assign({}, p, {
        days: undefined,
        dates: p.days.map((d) => d.date),
      });
    delete safe.days;
    this.setData({
      plan: safe,planHasToday:p.days.some(d=>d.date===this.data.today),
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
      const input = { mealStyle: this.data.mealStyle, days: Number(this.data.days), lossJin: Number(this.data.lossJin), start: this.data.start, end: this.data.end, restrictions: this.data.restrictions,healthNote:this.data.healthNote };
      const assessment = await service.assessPlanGoal(input);
      this.setData({ goalAssessment: assessment });
      if (assessment.tooLow) throw Error(assessment.message + "请先调整目标体重。");
      if (assessment.tooFast && assessment.requestedLossJin > 0) {
        const accepted = await new Promise(resolve => wx.showModal({ title: "确认计划方式", content: assessment.message + "实际体重变化不受本规则限制。选择记录模式会保留你的目标，但不据此制定快速减重或低热量方案，也不承诺达成。", confirmText: "记录模式", cancelText: "调整目标", success: r => resolve(r.confirm), fail: () => resolve(false) }));
        if (!accepted) return;
        input.allowRecordOnly = true;
      }
      const p = await service.generateAIPlan(input);
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
      this.setData({activeStep:4});wx.pageScrollTo({selector:"#plan-report",duration:250});
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
