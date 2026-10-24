const { exportWorkbook } = require("../../utils/export");
const { page, service, navigate } = require("../../utils/page");
const {activityLevels}=require("../../services/plan-calories");
const { weightStyles, exerciseOptions } = require("../../services/plan-preferences");
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
    weightStyles, weightStyle: "gentle", weightStyleDescription: weightStyles[0].description,
    exerciseId: "stroll", exerciseName: "散步（约4 km/h）", exerciseMinutes: 15,
    exerciseMatches: [], exerciseSearchOpen: false,
    generationError: "",
    mealStyles: [{ id: "fatloss", label: "减脂餐", description: "清淡做法，保留主食，搭配常见蛋白质与蔬果" }, { id: "home", label: "家庭日常", description: "日常易购食材、家常做法，兼顾品类与实用" }, { id: "mixed", label: "混合搭配", description: "家庭日常与减脂餐交替安排，丰富口味" }],
    calorieGoal:"",calorieSource:"manual",calorieBasis:null,calorieSuggestion:null,calorieStale:false,calorieLoading:false,activityLevels,activityIndex:0,
    goalAssessment: null,
    taskTypes: [
      { id: "weight", label: "记录体重（每天一次）" },
      { id: "photo", label: "拍照记录" },
      { id: "exercise", label: "运动记录" },
    ],
  },
  onLoad(q={}) {this.historyId=q.historyId || "";this.historyDate=q.date || "";this.setData({historyMode:!!this.historyId});if(this.historyId && wx.setNavigationBarTitle)wx.setNavigationBarTitle({title:"历史记录"});},
  onPageScroll(e) {this.scrollPosition=e.scrollTop;},
  onHide() {this.returnPosition=this.scrollPosition || 0;},
  refresh() {
    return this.loadData(async () => {
      if (!(await this.requireAccount())) return;
      const plans = await service.getAIPlans(),
        access = await service.getRecognitionAccess();
      this.plans = plans;
      this.setData({today:(await service.getSnapshot()).date});
      const extra = await service.getPlanProfile();
      const recordOnly = Number(extra.age) < 18 || Number(extra.age) >= 65 || extra.special || (extra.conditions && extra.conditions !== "无") || (extra.weight && extra.height && extra.weight / (extra.height / 100) ** 2 < 24) || extra.direction === "仅记录日常";
      this.setData({
        plans: plans.map((p) => ({
          id: p.id,
          start: p.start,
          request: p.request,
          closedOn: p.closedOn,
          dates:p.days.filter(d=>d.date<=(this.data.today)).map(d=>d.date),
        })),
        access,
        profile: extra,
        recordOnly,
      });
      if (!this.formInitialized) {
        const request = plans.length ? plans[0].request : null;
        const style = weightStyles.find(s => s.id === (request && request.weightStyle)) || weightStyles[0];
        const mealOption = this.data.mealStyles.find(s => s.id === (request && request.mealStyle)) || this.data.mealStyles[0];
        this.setData({
          days: request ? request.days : extra.goalDays || 7,
          lossJin: request ? request.requestedLossJin === undefined ? request.lossJin : request.requestedLossJin : !recordOnly && extra.direction !== "保持体重，规律生活" && extra.targetWeight && extra.weight ? Math.max(0, Math.round((extra.weight - extra.targetWeight) * 20) / 10) : 0,
          restrictions: [...new Set([...(extra.restrictions || []), ...(plans.length ? plans[0].restrictions || [] : [])])].join("、"),
          start: request ? request.start : this.data.start, end: request ? request.end : this.data.end,
          activityPreset: request ? "custom" : this.data.activityPreset,
          healthNote: request && request.healthNote || "",
          calorieGoal:request && request.calorieGoal!==undefined ? request.calorieGoal || "" : extra.calorieGoal || "",
          calorieSource:request && request.calorieSource || "manual",calorieBasis:request && request.calorieBasis || null,
          activityIndex:Math.max(0,activityLevels.findIndex(a=>a.value===(request && request.activityLevel || 1.4))),
          weightStyle: style.id, weightStyleDescription: style.description,
          mealStyle: mealOption.id, mealStyleLabel: mealOption.label,
          exerciseId: request && request.exercise ? request.exercise.activityId : "stroll",
          exerciseName: request && request.exercise ? request.exercise.name : "散步（约4 km/h）",
          exerciseMinutes: request && request.exercise ? request.exercise.minutes : style.minutes,
        });
        this.exerciseMinutesEdited = !!(request && request.exercise);
        this.formInitialized = true;
      }
      this.updateRestrictionChips();
      if(this.historyId) {
        const saved=plans.find(p=>p.id===this.historyId);
        if(!saved) throw Error("历史计划不存在");
        const index=saved.days.findIndex(d=>d.date===this.historyDate);
        if(index<0 || this.historyDate>this.data.today) throw Error("历史日期无效");
        this.setData({selected:index,historyDiary:await service.getDiary(this.historyDate)});this.showPlan(saved);
      } else if(plans.length) {
        const current=plans.find(p=>this.localPlan && p.id===this.localPlan.id) || plans[0];this.showPlan(current);
      }
      if(this.returnPosition!==undefined) {const top=this.returnPosition;delete this.returnPosition;if(wx.nextTick && wx.pageScrollTo)wx.nextTick(()=>wx.pageScrollTo({scrollTop:top,duration:0}));}
      await this.assessGoal();
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
    if(e.currentTarget.dataset.key==="calorieGoal")this.setData({calorieSource:"manual",calorieBasis:null,calorieStale:false});
    if (["days", "lossJin","healthNote"].includes(e.currentTarget.dataset.key)) this.assessGoal();
    if(e.currentTarget.dataset.key==="restrictions")this.updateRestrictionChips();
    if(["start","end"].includes(e.currentTarget.dataset.key))this.setData({activityPreset:"custom"});
    if(e.currentTarget.dataset.key==="exerciseMinutes")this.exerciseMinutesEdited=true;
    if(e.currentTarget.dataset.key==="exerciseName") {
      this.setData({exerciseId:"",exerciseSearchOpen:true});
      this.searchExercises();
    }
    if(["start","end"].includes(e.currentTarget.dataset.key))this.updateDefaultMinutes();
  },
  selectWeightStyle(e) {
    const style=weightStyles.find(s=>s.id===e.currentTarget.dataset.style);
    if(!style)return;
    this.setData({weightStyle:style.id,weightStyleDescription:style.description});
    this.updateDefaultMinutes();
  },
  updateDefaultMinutes() {
    if(this.exerciseMinutesEdited)return;
    const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
    const duration=(mins(this.data.end)-mins(this.data.start)+1440)%1440;
    const style=weightStyles.find(s=>s.id===this.data.weightStyle)||weightStyles[0];
    this.setData({exerciseMinutes:duration>=5?Math.min(style.minutes,duration):style.minutes});
  },
  searchExercises() {
    const query=String(this.data.exerciseName||"").trim().toLowerCase().replace(/漫步|慢走/g,"散步");
    this.setData({exerciseMatches:exerciseOptions.filter(a=>!query||(a.name+" "+a.category).toLowerCase().includes(query))});
  },
  openExerciseSearch() {this.setData({exerciseSearchOpen:true,exerciseMatches:exerciseOptions});},
  closeExerciseSearch() {this.setData({exerciseSearchOpen:false});},
  selectExercise(e) {
    const activity=exerciseOptions.find(a=>a.id===e.currentTarget.dataset.id);
    if(activity)this.setData({exerciseId:activity.id,exerciseName:activity.name,exerciseSearchOpen:false});
  },
  step(e){const activeStep=Number(e.currentTarget.dataset.step);this.setData({activeStep});wx.pageScrollTo({selector:["#plan-profile","#plan-goal","#plan-extra",this.data.plan?"#plan-report":"#plan-generate"][activeStep-1],duration:250});},
  chooseActivity(e){const p=this.data.activityPresets.find(p=>p.id===e.currentTarget.dataset.id);if(p){this.setData({activityPreset:p.id,start:p.start,end:p.end});this.updateDefaultMinutes();}},
  updateRestrictionChips(){const terms=String(this.data.restrictions||"").split(/[、,，;；\s]+/).filter(Boolean);this.setData({restrictionChips:["牛奶","鸡蛋","花生","海鲜"].map(value=>({value,selected:terms.includes(value)}))});},
  toggleRestriction(e){const value=e.currentTarget.dataset.value;if((this.data.profile.restrictions||[]).includes(value)){wx.showToast({title:"档案忌口请到档案修改",icon:"none"});return;}const terms=String(this.data.restrictions||"").split(/[、,，;；\s]+/).filter(Boolean);this.setData({restrictions:(terms.includes(value)?terms.filter(t=>t!==value):terms.concat(value)).join("、")});this.updateRestrictionChips();},
  relativeDay(e){if(!this.localPlan)return;const index=Math.max(0,Math.min(this.localPlan.days.length-1,this.data.selected+Number(e.currentTarget.dataset.offset)));this.selectDay({currentTarget:{dataset:{index}}});},
  todayDay(){if(!this.localPlan)return;const index=this.localPlan.days.findIndex(d=>d.date===this.data.today);this.selectDay({currentTarget:{dataset:{index:Math.max(0,index)}}});},
  toggleMealStyles() { this.setData({ mealStyleOpen: !this.data.mealStyleOpen }); },
  selectMealStyle(e) { const option = this.data.mealStyles.find(x => x.id === e.currentTarget.dataset.style); if (option) this.setData({ mealStyle: option.id, mealStyleLabel: option.label, mealStyleOpen: false }); },
  activityLevel(e) {const index=Number(e.detail.value);if(!this.data.activityLevels[index])return;this.setData({activityIndex:index});return this.assessGoal();},
  confirmCalories() {
    const suggestion=this.data.calorieSuggestion;if(this.data.calorieLoading || !suggestion || !suggestion.available)return;
    this.setData({calorieGoal:suggestion.kcal,calorieSource:"suggestion",calorieBasis:suggestion.basis,calorieStale:false});
    wx.showToast({title:"已采用，生成计划时生效",icon:"none"});
  },
  async assessGoal() {
    const revision=(this.goalRevision || 0)+1;this.goalRevision=revision;
    this.setData({calorieLoading:true});
    const input={days:Number(this.data.days),lossJin:Number(this.data.lossJin),healthNote:this.data.healthNote,activityLevel:this.data.activityLevels[this.data.activityIndex].value};
    try {
      const [assessment,suggestion]=await Promise.all([service.assessPlanGoal(input),service.getPlanCalorieSuggestion(input)]);
      if(revision===this.goalRevision)this.setData({goalAssessment:assessment,goalError:"",calorieSuggestion:suggestion,calorieLoading:false,
        calorieStale:this.data.calorieSource==="suggestion" && (!suggestion.available || this.data.calorieBasis!==suggestion.basis || Number(this.data.calorieGoal)!==suggestion.kcal)});
    } catch(error) {if(revision===this.goalRevision)this.setData({goalAssessment:null,goalError:error.message,calorieSuggestion:null,calorieLoading:false,calorieStale:this.data.calorieSource==="suggestion"});}
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
      planActive:!p.closedOn && p.start<=this.data.today && p.end>=this.data.today,
      plan: safe,planHasToday:p.days.some(d=>d.date===this.data.today),
      selected: index,
      day: p.days[index],
      todayExercise:(p.days.find(d=>d.date===this.data.today)||p.days[index]).exercise,
      taskRows:this.data.taskTypes.map(t=>({...t,done:(p.checks || []).some(c=>c.date===this.data.today&&c.type===t.id)})),

    });
  },
  selectDay(e) {
    const index = Number(e.currentTarget.dataset.index);
    this.setData({ selected: index, day: this.localPlan.days[index] });
  },
  generate() {
    return this.action(async () => {
      this.setData({generationError:""});
      try {
      const input = { mealStyle: this.data.mealStyle, weightStyle: this.data.weightStyle, exercise: {activityId:this.data.exerciseId,name:this.data.exerciseName,minutes:Number(this.data.exerciseMinutes)}, days: Number(this.data.days), lossJin: Number(this.data.lossJin), start: this.data.start, end: this.data.end, restrictions: this.data.restrictions,healthNote:this.data.healthNote,calorieGoal:this.data.calorieGoal,calorieSource:this.data.calorieSource,calorieBasis:this.data.calorieBasis,activityLevel:this.data.activityLevels[this.data.activityIndex].value };
      if(this.data.calorieSource==="suggestion" && (this.data.calorieLoading || this.data.calorieStale))throw Error("热量建议已更新，请重新确认采用或自行填写");
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
          closedOn: p.closedOn,dates:p.days.filter(d=>d.date<=this.data.today).map(d=>d.date),
        })),
        access: await service.getRecognitionAccess(),
      });
      wx.showToast({ title: "模拟计划已生成", icon: "success" });
      this.setData({activeStep:4});wx.pageScrollTo({selector:"#plan-report",duration:250});
      } catch (error) {
        this.setData({generationError:error.message || "本次生成未完成，请重试"});
        throw error;
      }
    });
  },
  history(e) {
    const p=this.plans[Number(e.currentTarget.dataset.index)];
    if(p && p.days.some(d=>d.date===e.currentTarget.dataset.date))navigate("/pages/ai-plan/index?historyId="+encodeURIComponent(p.id)+"&date="+e.currentTarget.dataset.date);
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
  confirmExecution() {return this.action(async()=>{this.showPlan(await service.confirmPlanExecution(this.data.plan.id));wx.showToast({title:"已确认执行",icon:"success"});});},
  task(e) {
    if(this.data.historyMode || !this.data.planActive || !this.data.plan.executionConfirmed)return;
    const type=e.currentTarget.dataset.type,date=this.data.today;
    const done=this.data.taskRows.find(t=>t.id===type && t.done);
    const url=type==="photo"?(done?"/pages/photo-history/index":"/pages/photo/index"):type==="weight"?"/pages/records/index?type=weight&date="+date+(done?"&edit=1":""):"/pages/exercise/index?date="+date;
    navigate(url);
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
