const { page, service } = require("../../utils/page");
page({
  data: { activities: [], shown: [], filter: "all" },
  refresh() {
    return this.loadData(async () => {
      const activities=await service.listActivities();
      this.setData({ activities: activities.map((a,i)=>({...a,cardTheme:a.color==="mint"?"mint":a.color==="cream"?"peach":a.color==="sage"?"blue":["mint","peach","blue"][i%3],cardIcon:a.days<=1?"start":a.days<=3?"gold":"silver",cardAction:a.canClaim?"待领取":a.claimed?"已领取":a.enrolled&&a.statusLabel==="进行中"?"继续完成":a.statusLabel})) });
      this.applyFilter();
    });
  },
  filterChange(e) {
    this.setData({ filter: e.currentTarget.dataset.filter });
    this.applyFilter();
  },
  applyFilter() {
    const f = this.data.filter;
    this.setData({
      shown: this.data.activities.filter(
        (a) =>
          f === "all" ||
          (f === "mine" && a.enrolled) ||
          (f === "reward" && a.canClaim),
      ),
    });
  },
});
