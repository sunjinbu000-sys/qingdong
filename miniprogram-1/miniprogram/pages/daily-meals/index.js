const { page, service } = require("../../utils/page");
const groups = [["breakfast","早餐","sun"],["lunch","午餐","cup"],["dinner","晚餐","leaf"],["snack","加餐","sprout"]];
page({
  data: { signedIn:false, date:"", today:"", mealGroups:[] },
  onLoad(query = {}) { this.requestedDate = query.date || ""; },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      const candidate = this.requestedDate || this.data.date || snapshot.date;
      const parsed = new Date(candidate+"T00:00:00Z");
      const date = /^\d{4}-\d{2}-\d{2}$/.test(candidate) && candidate >= "2000-01-01" && candidate <= snapshot.date && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === candidate ? candidate : snapshot.date;
      const diary = snapshot.signedIn ? await service.getDiary(date) : {meals:[]};
      this.setData({ signedIn:snapshot.signedIn,date,today:snapshot.date,mealGroups:groups.map(([key,label,icon])=>{const records=diary.meals.filter(r=>r.slot===key);return {key,label,icon,records,total:Math.round(records.reduce((sum,r)=>sum+r.kcal,0))};}) });
    });
  },
  remove(e) {
    wx.showModal({title:"删除这条记录？",content:"删除后无法恢复，其他记录会保留。",success:r=>{if(r.confirm)this.action(async()=>{await service.deleteRecord(e.currentTarget.dataset.id);await this.refresh();});}});
  }
});
