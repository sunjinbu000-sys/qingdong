const { foodIcon } = require("../../utils/food-icons");
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
    category: "all", categories: [], favoritesOnly: false, limit: 10, totalCount: 0,
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
    const list=this.data.library[this.data.tab]||[],q=this.data.query.trim();
    const group=x=>this.data.tab==="foods"?x.group:this.data.tab==="recipes"?"家常食谱":x.category||"运动";
    const categories=[{key:"all",label:"全部"},...Array.from(new Set(list.map(group))).map(label=>({key:label,label}))];
    const category=categories.some(x=>x.key===this.data.category)?this.data.category:"all";
    const filtered=list.filter(x=>(category==="all"||group(x)===category)&&(!this.data.favoritesOnly||x.favorite)&&(!q||x.name.includes(q)||group(x).includes(q)));
    this.setData({categories,category,totalCount:filtered.length,shown:filtered.slice(0,this.data.limit).map(x=>({...x,categoryLabel:group(x),kcalLabel:Number(x.kcal||0).toFixed(2),iconPath:foodIcon(x,this.data.tab),conflictsText:(x.conflicts||[]).join("、"),ingredientsText:(x.ingredients||[]).join("、")}))});
  },
  chooseCategory(e){this.setData({category:e.currentTarget.dataset.key,activeId:"",limit:10});this.applyFilter();},
  toggleFavorites(){this.setData({favoritesOnly:!this.data.favoritesOnly,category:"all",activeId:"",limit:10});this.applyFilter();},
  more(){this.setData({limit:this.data.limit+10});this.applyFilter();},
  favorite(e){return this.action(async()=>{if(!(await this.requireAccount()))return;await service.toggleFoodFavorite({kind:this.data.tab,id:e.currentTarget.dataset.id});await this.refresh();});},
  calculation(){wx.showModal({title:"热量怎么算？",content:"食物和饮品按每100克/毫升参考营养值乘以实际份量；家常食谱按配方的一份合计，再乘以填写份数。饮品的杯型、糖量、冰量和加料会影响结果，请按实际配方核对。当前数据为本地记录示例，不能替代营养检测。",showCancel:false,confirmText:"我知道了"});},
  selectTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if(!this.data.tabs.some(t=>t.key===tab))return;
    this.setData({
      tab,
      category:"all",limit:10,
      activeId: "",
      amount: tab === "recipes" ? 1 : tab === "activities" ? 30 : 100,
    });
    this.applyFilter();
  },
  search(e) {
    this.setData({ query: e.detail.value,limit:10,activeId:"" });
    this.applyFilter();
  },
  select(e) {
    this.setData({ activeId: this.data.activeId===e.currentTarget.dataset.id?"":e.currentTarget.dataset.id });
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
    return this.action(async () => {
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
