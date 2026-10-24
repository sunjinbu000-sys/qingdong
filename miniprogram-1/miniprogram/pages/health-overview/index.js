const { page, service } = require("../../utils/page");
const { shiftDate } = require("../../utils/date");
page({
  data: {
    signedIn: false,
    date: "",
    today: "",
    overview: { nutrition: {}, calendar: [], restrictions: [] },
    curve: [],
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    paddingCells: [], showCalendar:false,showHistory:false,weekDays:[],miniPoints:[],miniLines:[],
  },
  onLoad(o) {
    if (o.date) this.setData({ date: o.date });
  },
  refresh() {
    return this.loadData(async () => {
      const s = await service.getSnapshot();
      const date =
        this.data.date && this.data.date <= s.date ? this.data.date : s.date;
      this.setData({ signedIn: s.signedIn, today: s.date, date });
      if (!s.signedIn) return;
      const overview = await service.getNutritionOverview(date);
      const visibleCurve=overview.curve.filter(x=>x.date<=date);
      const values = visibleCurve
          .flatMap((x) => [x.actual, x.scenario])
          .filter((x) => x !== null),
        min = values.length ? Math.min(...values) - 1 : 0,
        max = values.length ? Math.max(...values) + 1 : 1;
      const curve = visibleCurve.map((x) => ({
        ...x,
        dateLabel: x.date.slice(5),
        actualHeight:
          x.actual === null
            ? 0
            : Math.max(8, ((x.actual - min) / (max - min)) * 150),
        scenarioHeight:
          x.scenario === null
            ? 0
            : Math.max(8, ((x.scenario - min) / (max - min)) * 150),
      }));
      const weekDays=Array.from({length:7},(_,i)=>{const d=shiftDate(date,i-3);return {date:d,day:Number(d.slice(8)),week:this.data.weekdays[new Date(d+"T00:00:00Z").getUTCDay()],selected:d===date,future:d>s.date,hasRecords:(overview.recordDates||[]).includes(d)};});
      const weights=overview.curve.filter(r=>r.actual!==null&&r.date>=shiftDate(date,-13)&&r.date<=date);
      const amounts=weights.map(r=>r.actual),low=amounts.length?Math.min(...amounts)-.5:0,high=amounts.length?Math.max(...amounts)+.5:1;
      const miniPoints=weights.map(r=>({date:r.date,kg:r.actual,x:(Date.parse(r.date)-Date.parse(shiftDate(date,-13)))/86400000/13*240,y:115-(r.actual-low)/(high-low)*90}));
      const miniLines=miniPoints.slice(1).map((p,i)=>{const a=miniPoints[i],dx=p.x-a.x,dy=p.y-a.y;return {id:p.date,x:a.x,y:a.y,width:Math.sqrt(dx*dx+dy*dy),angle:Math.atan2(dy,dx)*180/Math.PI};});
      const delta=weights.length>1?(weights[weights.length-1].actual-weights[0].actual):null;
      this.setData({
        overview,weekDays,miniPoints,miniLines,miniLatest:weights.length?weights[weights.length-1].actual:null,weightDelta:delta===null?"—":(delta>0?"+":"")+delta.toFixed(1)+" kg",
        energyRingStyle:"background:conic-gradient(#45b77b "+Math.min(100,Math.max(0,overview.nutrition.calories/overview.goal*100))+"%,#e6f5e9 0)",
        curve,
        restrictionsText: overview.restrictions.join("、"),
        paddingCells: Array.from(
          { length: new Date(date.slice(0, 7) + "-01T00:00:00Z").getUTCDay() },
          (_, i) => i,
        ),
      });
    });
  },
  toggleCalendar(){this.setData({showCalendar:!this.data.showCalendar});},
  toggleHistory(){this.setData({showHistory:!this.data.showHistory});},
  chooseDate(e) {
    this.setData({ date: e.detail.value });
    this.refresh();
  },
  calendarDate(e) {
    this.setData({ date: e.currentTarget.dataset.date });
    this.refresh();
  },
  shift(e) {
    this.setData({
      date: shiftDate(this.data.date, Number(e.currentTarget.dataset.days)),
    });
    this.refresh();
  },
});
