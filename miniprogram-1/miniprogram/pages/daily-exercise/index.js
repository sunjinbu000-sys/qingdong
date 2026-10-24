const {page,service}=require("../../utils/page");
const {validDate}=require("../../utils/date");
page({
 data:{signedIn:false,date:"",today:"",records:[],totalMinutes:0,totalKcal:0},
 onLoad(q={}){this.requestedDate=q.date || "";},
 refresh(){return this.loadData(async()=>{const snapshot=await service.getSnapshot(),candidate=this.requestedDate || this.data.date || snapshot.date,date=validDate(candidate)&&candidate>="2000-01-01"&&candidate<=snapshot.date?candidate:snapshot.date;const records=snapshot.signedIn?(await service.getDiary(date)).exercises:[];this.setData({signedIn:snapshot.signedIn,date,today:snapshot.date,records,totalMinutes:records.reduce((n,r)=>n+r.minutes,0),totalKcal:Math.round(records.reduce((n,r)=>n+(r.exerciseKcal || 0),0))});});},
 remove(e){wx.showModal({title:"删除这条运动记录？",content:"删除后，当天运动时长和任务状态同步更新。",success:r=>{if(r.confirm)this.action(async()=>{await service.deleteRecord(e.currentTarget.dataset.id);await this.refresh();});}});}
});
