const { page, service, navigate } = require("../../utils/page");
const { shiftDate } = require("../../utils/date");
page({
  data: { days: 7, ranges: [7, 30, 90], current: "—", difference: "暂无对比", goalGap: "—", bmi: "—", records: [], points: [], lines: [], ticks: [], labels: [] },
  refresh() {
    return this.loadData(async () => {
      const snapshot = await service.getSnapshot();
      const source = snapshot.signedIn ? await service.getWeightTrend() : { records: [] };
      this.source = source;
      this.today = snapshot.date;
      this.setData({ signedIn: snapshot.signedIn, today: snapshot.date });
      this.renderTrend();
    });
  },
  editWeightAndGoal() { navigate("/pages/health-profile/index"); },
  editWeight(e) {
    const records=(this.source&&this.source.records)||[],date=e&&e.currentTarget&&e.currentTarget.dataset.date;
    const latest=date?records.filter(r=>r.date===date).slice(-1)[0]:records[records.length-1];
    navigate("/pages/records/index?type=weight&date="+(latest?latest.date:this.today)+ (latest?"&edit=1":""));
  },
  chooseRange(e) { const days=Number(e.currentTarget.dataset.days);if(!this.data.ranges.includes(days))return;this.setData({days}); this.renderTrend(); },
  renderTrend() {
    const source=this.source || {records:[]};
    const all=(source.records || []).filter(r=>r.date<=this.today && Number(r.kg)>0 && Number.isFinite(Number(r.kg)) && !["pending","rejected"].includes(r.status)).slice().sort((a,b)=>a.date.localeCompare(b.date)||(a.createdAt||0)-(b.createdAt||0));
    const latest=all[all.length-1], current=latest?Number(latest.kg):null, initial=source.initialWeight || (all[0]&&all[0].kg);
    const median=values=>{const v=values.slice().sort((a,b)=>a-b),n=v.length;return n?Number((n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2).toFixed(2)):null;};
    let buckets,periodNote;
    if(this.data.days===7) {
      buckets=Array.from({length:7},(_,i)=>{const date=shiftDate(this.today,i-3);return {start:date,end:date,label:i===3?"今天":date.slice(5).replace("-",".")};});
      periodNote="以今天为中间位置，每天取当天最后一次记录，共7天。";
    } else if(this.data.days===30) {
      const weekday=new Date(this.today+"T00:00:00Z").getUTCDay(),monday=shiftDate(this.today,-((weekday+6)%7));
      buckets=Array.from({length:5},(_,i)=>{const start=shiftDate(monday,(i-2)*7);return {start,end:shiftDate(start,6),label:i===2?"本周":start.slice(5).replace("-",".")+"周"};});
      periodNote="以本周为中间位置，共5周；每周取每日最后记录的中位数。";
    } else {
      const [year,month]=this.today.split("-").map(Number);
      buckets=Array.from({length:3},(_,i)=>{const start=new Date(Date.UTC(year,month-2+i,1)).toISOString().slice(0,10),next=new Date(Date.UTC(year,month-1+i,1)).toISOString().slice(0,10);return {start,end:shiftDate(next,-1),label:i===1?"本月":Number(start.slice(5,7))+"月"};});
      periodNote="以本月为中间位置，共3个月；每月取每日最后记录的中位数。";
    }
    const byDay=new Map();all.forEach(r=>byDay.set(r.date,r));
    const rows=buckets.flatMap((b,i)=>{const values=[...byDay.values()].filter(r=>r.date>=b.start&&r.date<=b.end).map(r=>Number(r.kg));return values.length?[{date:b.start,kg:median(values),bucket:i}]:[];});
    const forecastReady=current!==null && Number(source.targetWeight)>0 && Number(source.goalDays)>0;
    const middle=(buckets.length-1)/2;
    const forecastRows=forecastReady?buckets.flatMap((b,i)=>{
      if(i<middle)return [];
      const date=i===middle?this.today:shiftDate(b.start,Math.floor((Date.parse(b.end+"T00:00:00Z")-Date.parse(b.start+"T00:00:00Z"))/86400000/2));
      const elapsed=(Date.parse(date+"T00:00:00Z")-Date.parse(this.today+"T00:00:00Z"))/86400000;
      return [{date,kg:current+(source.targetWeight-current)*Math.min(elapsed/source.goalDays,1),bucket:i}];
    }):[];
    const values=rows.concat(forecastRows).map(r=>r.kg),min=values.length?Math.floor(Math.min(...values)-1):0,max=values.length?Math.ceil(Math.max(...values)+1):1;
    const position=r=>({...r,x:r.bucket/(buckets.length-1)*540,y:260-(r.kg-min)/(max-min)*240});
    const points=rows.map(position),forecastPoints=forecastRows.map(position);
    const connect=points=>points.slice(1).flatMap((p,i)=>{const a=points[i];if(p.bucket!==a.bucket+1)return [];const dx=p.x-a.x,dy=p.y-a.y;return [{id:p.date,x:a.x,y:a.y,width:Math.hypot(dx,dy),angle:Math.atan2(dy,dx)*180/Math.PI}];});
    this.setData({current:current===null?"—":current,difference:current!==null&&initial?((current-initial)>0?"+":"")+(current-initial).toFixed(1)+" kg":"暂无对比",
      goalGap:current!==null&&source.targetWeight?Math.abs(current-source.targetWeight).toFixed(1):"—",bmi:current!==null&&source.height?(current/(source.height/100)**2).toFixed(1):"—",
      points,lines:connect(points),forecastLines:connect(forecastPoints),forecastReady,forecastEnd:buckets[buckets.length-1].end,buckets,periodNote,
      ticks:Array.from({length:4},(_,i)=>({value:(max-(max-min)*i/3).toFixed(1),y:20+i*80})),
      labels:buckets.map(b=>b.label),axisLabels:buckets.map((b,i)=>({text:b.label,x:i/(buckets.length-1)*540})),
      records:all.slice().reverse().slice(0,20),lastDate:latest?latest.date:"暂无记录",
    });

  },
});
