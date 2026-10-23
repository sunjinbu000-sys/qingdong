const {page,service}=require("../../utils/page");
const Health=require("../../services/reference/health-model");
page({
 data:{date:"",today:"",query:"",expanded:false,activities:[],shown:[],sessions:[],weight:70,weightSource:"参考体重",totalMinutes:0,totalKcal:"0.00",selected:null,minutes:"30"},
 onLoad(q={}){this.requestedDate=q.date||"";},
 refresh(){return this.loadData(async()=>{
  const s=await service.getSnapshot();const candidate=this.requestedDate||this.data.date||s.date;
  const parsed=new Date(candidate+"T00:00:00Z");const date=Number.isFinite(parsed.getTime())&&candidate>="2000-01-01"&&candidate<=s.date&&parsed.toISOString().slice(0,10)===candidate?candidate:s.date;
  let weight=70,weightSource="参考体重";if(s.signedIn){const p=await service.getPlanProfile();if(Number(p.weight)>0){weight=Number(p.weight);weightSource="健康档案/体重记录";}}
  const diary=s.signedIn?await service.getDiary(date):{exercises:[]};
  const activities=Health.activities.map(a=>({...a,kcal:Health.exerciseCalories(a.met,weight,60).toFixed(2),icon:a.category==="舒缓"?"leaf":a.category==="力量"?"sprout":"walk"}));
  this.setData({date,today:s.date,weight,weightSource,activities,sessions:diary.exercises,totalMinutes:diary.exercises.reduce((n,r)=>n+r.minutes,0),totalKcal:diary.exercises.reduce((n,r)=>n+(r.exerciseKcal||0),0).toFixed(2)});this.filter();
 });},
 filter(){const q=this.data.query.trim();this.setData({shown:this.data.activities.filter(a=>!q||a.name.includes(q)||(a.category||"").includes(q)).slice(0,this.data.expanded||q?100:10)});},
 search(e){this.setData({query:e.detail.value});this.filter();},
 more(){this.setData({expanded:!this.data.expanded});this.filter();},
 dateChange(e){this.requestedDate=e.detail.value;this.setData({selected:null});return this.refresh();},
 choose(e){const selected=this.data.activities.find(a=>a.id===e.currentTarget.dataset.id);this.setData({selected,minutes:"30"});},
 duration(e){this.setData({minutes:e.detail.value});},
 cancel(){this.setData({selected:null});},
 add(){return this.action(async()=>{if(!(await this.requireAccount()))return;if(!this.data.selected)return;await service.recordExerciseSession({date:this.data.date,activityId:this.data.selected.id,minutes:Number(this.data.minutes),weight:this.data.weight});this.setData({selected:null});await this.refresh();wx.showToast({title:"已记入当天运动",icon:"success"});});},
 remove(e){wx.showModal({title:"删除这次运动？",content:"当天运动时长和消耗会同步更新。",success:r=>{if(r.confirm)this.action(async()=>{await service.deleteRecord(e.currentTarget.dataset.id);await this.refresh();});}});},
 done(){wx.navigateBack();}
});
