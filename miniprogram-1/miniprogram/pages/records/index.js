const { page, service } = require("../../utils/page");
const { bizDate } = require("../../utils/date");
page({
  data: {
    type: "meal",
    foods: [], shownFoods: [], basket: [], query: "", expanded: false, selectedFood: null, grams: "100", totalKcal: "0.00", manual: false,
    weightInitial: "—", weightTarget: "—", weightDelta: "—",
    today: "",
    slots: ["早餐", "午餐", "晚餐", "加餐"],
    slotIndex: 1,
    form: { date: "", name: "", kcal: "", minutes: "", kg: "", note: "" },
  },
  onLoad(options) {
    const type = ["meal", "exercise", "weight"].includes(options.type)
      ? options.type
      : "meal";
    const slotIndex = ["breakfast", "lunch", "dinner", "snack"].indexOf(
      options.slot,
    );
    this.setData({
      type,
      "form.date": options.date || bizDate(),
      slotIndex: slotIndex >= 0 ? slotIndex : 1,
    });
  },
  async refresh() {
    this.setData({today:bizDate(),loading:false});
    if(this.data.type==="weight")return this.loadData(async()=>{
      const snapshot=await service.getSnapshot();
      if(wx.setNavigationBarTitle)wx.setNavigationBarTitle({title:"记体重"});
      if(!snapshot.signedIn){this.weightTrend=null;this.setData({weightInitial:"—",weightTarget:"—",weightDelta:"—"});return;}
      this.weightTrend=await service.getWeightTrend();this.updateWeightStats();
    });
    if(this.data.type==="meal")return this.loadData(async()=>{
      const library=await service.getFoodLibrary();
      this.setData({foods:[...library.foods.map(f=>({...f,key:"food:"+f.id,foodId:f.id})),...library.recipes.map(f=>({...f,key:"recipe:"+f.id,recipeId:f.id,unit:"g",kcal:f.kcal*100/f.totalGrams,group:"家常食谱"}))].map(f=>({...f,kcalLabel:Number(f.kcal).toFixed(2)}))});this.filterFoods();
    });
  },
  filterFoods(){const q=this.data.query.trim();this.setData({shownFoods:this.data.foods.filter(f=>!q||f.name.includes(q)||(f.group||"").includes(q)).slice(0,this.data.expanded||q?1000:10)});},
  searchFoods(e){this.setData({query:e.detail.value});this.filterFoods();},
  moreFoods(){this.setData({expanded:!this.data.expanded});this.filterFoods();},
  mealSlot(e){this.setData({slotIndex:Number(e.currentTarget.dataset.index)});},
  selectFood(e){const selectedFood=this.data.foods.find(f=>f.key===e.currentTarget.dataset.key);this.setData({selectedFood,grams:"100"});},
  grams(e){this.setData({grams:e.detail.value});},
  cancelFood(){this.setData({selectedFood:null});},
  addFood(){const grams=Number(this.data.grams),f=this.data.selectedFood;if(!f)return;if(!Number.isFinite(grams)||grams<=0||grams>10000)return wx.showToast({title:"请填写0–10000之间的有效克数",icon:"none"});if(this.data.basket.length>=50)return wx.showToast({title:"每餐最多选择50项",icon:"none"});const basket=this.data.basket.concat({...f,grams,lineKcal:(f.kcal*grams/100).toFixed(2)});this.setData({basket,selectedFood:null,totalKcal:basket.reduce((n,x)=>n+Number(x.lineKcal),0).toFixed(2)});},
  removeFood(e){const basket=this.data.basket.filter((_,i)=>i!==Number(e.currentTarget.dataset.index));this.setData({basket,totalKcal:basket.reduce((n,x)=>n+Number(x.lineKcal),0).toFixed(2)});},
  toggleManual(){this.setData({manual:!this.data.manual});},
  photo(){require("../../utils/page").navigate("/pages/photo/index?slot="+["breakfast","lunch","dinner","snack"][this.data.slotIndex]);},
  completeMeal(){return this.action(async()=>{if(!(await this.requireAccount()))return;if(!this.data.basket.length)return;if(!this.batchRequest)this.batchRequest="meal-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);await service.recordMealBasket({requestId:this.batchRequest,date:this.data.form.date,slot:["breakfast","lunch","dinner","snack"][this.data.slotIndex],items:this.data.basket.map(f=>({foodId:f.foodId,recipeId:f.recipeId,grams:f.grams}))});this.batchRequest=null;this.setData({basket:[],totalKcal:"0.00"});wx.showToast({title:"已记入这一餐",icon:"success"});wx.navigateBack();});},
  updateWeightStats(){
    const t=this.weightTrend;if(!t)return;
    const initial=t.initialWeight||(t.records[0]&&t.records[0].kg);
    const latest=t.records[t.records.length-1];const current=Number(this.data.form.kg)||(latest&&latest.kg);
    const delta=initial&&current?Math.round((current-initial)*100)/100:null;
    this.setData({weightInitial:initial||"—",weightTarget:t.targetWeight||"—",weightDelta:delta===null?"—":(delta>0?"+":"")+delta});
  },
  input(e) {
    this.setData({ ["form." + e.currentTarget.dataset.field]: e.detail.value });
    if(this.data.type==="weight" && e.currentTarget.dataset.field==="kg")this.updateWeightStats();
  },
  dateChange(e) {
    this.setData({ "form.date": e.detail.value });
  },
  slotChange(e) {
    this.setData({ slotIndex: Number(e.detail.value) });
  },
  save() {
    return this.action(async () => {
      if (!(await this.requireAccount())) return;
      let weightConfirmation = {};
      if (this.data.type === "weight") {
        const kg = Number(this.data.form.kg);
        if (!Number.isFinite(kg) || kg <= 0 || kg > 350) throw Error("请填写0–350之间的有效体重");
        const diary = await service.getDiary(this.data.form.date), weights = diary.weights;
        const signature = JSON.stringify(weights.map(r => [r.id, r.kg, r.note || ""]));
        if (weights.length) {
          const latest = weights[weights.length - 1];
          const confirmed = await new Promise(resolve => wx.showModal({title:"请确认",content:this.data.form.date + " 已记录 " + latest.kg + " kg，要替换为 " + kg + " kg 吗？",cancelText:"取消",confirmText:"确定",confirmColor:"#07c160",success:r=>resolve(r.confirm),fail:()=>resolve(false)}));
          if (!confirmed) return;
        }
        weightConfirmation = { dailyWeight: true, replaceConfirmed: weights.length > 0, expectedWeightSignature: signature };
      }
      await service.saveRecord(
        Object.assign({}, this.data.form, weightConfirmation, {
          type: this.data.type,
          slot: ["breakfast", "lunch", "dinner", "snack"][this.data.slotIndex],
        }),
      );
      wx.showToast({ title: "记录已保存", icon: "success" });
      wx.navigateBack();
    });
  },
});
