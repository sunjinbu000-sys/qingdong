const { page, service, navigate } = require("../../utils/page");
const {shiftDate}=require("../../utils/date");
page({
 data:{rulesOpen:false,creatingFromRules:false,form:{name:"",max:5,start:"",end:"",method:"invite",tasks:["signin","early"]},capacities:[3,5,10,20,50,100],capacityIndex:1,advanced:false,today:"",duration:7,methods:["仅邀请加入","申请审核加入","公开加入"],methodValues:["invite","approval","open"],methodIndex:0,taskOptions:[{id:"signin",label:"每日签到",checked:true},{id:"early",label:"早起打卡",checked:true},{id:"weight",label:"体重记录",checked:false}]},
 async refresh(){const s=await service.getSnapshot();const start=this.data.form.start||shiftDate(s.date,1);this.setData({today:s.date,"form.start":start,"form.end":this.data.form.end||shiftDate(start,6),loading:false});},
 input(e){this.setData({["form."+e.currentTarget.dataset.key]:e.detail.value});},
 capacity(e){const capacityIndex=Number(e.detail.value);this.setData({capacityIndex,"form.max":this.data.capacities[capacityIndex]});},
 method(e){const methodIndex=Number(e.detail.value);this.setData({methodIndex,"form.method":this.data.methodValues[methodIndex]});},
 tasks(e){const tasks=e.detail.value;this.setData({"form.tasks":tasks,taskOptions:this.data.taskOptions.map(t=>({...t,checked:tasks.includes(t.id)}))});},
 date(e){this.setData({["form."+e.currentTarget.dataset.key]:e.detail.value});this.setData({duration:Math.round((Date.parse(this.data.form.end)-Date.parse(this.data.form.start))/86400000)+1});},
 toggleAdvanced(){this.setData({advanced:!this.data.advanced});},
 rules(){this.pendingTeam=null;this.setData({rulesOpen:true,creatingFromRules:false});},
 closeRules(){if(this.data.busy)return;this.pendingTeam=null;this.setData({rulesOpen:false,creatingFromRules:false});},
 preventMove(){},
 submit(e){return this.action(async()=>{
  if(!(await this.requireAccount()))return;
  const value=JSON.parse(JSON.stringify(Object.assign({},this.data.form,e&&e.detail&&e.detail.value||{})));
  const days=(Date.parse(value.end)-Date.parse(value.start))/86400000+1;
  const {validDate}=require("../../utils/date");
  if(!String(value.name||"").trim()||String(value.name).trim().length>20)throw Error("请填写1–20字的小队名字");
  if(!Number.isInteger(Number(value.max))||Number(value.max)<3||Number(value.max)>100||!validDate(value.start)||!validDate(value.end)||value.start<this.data.today||days<7||days>365||!["open","approval","invite"].includes(value.method)||!Array.isArray(value.tasks)||new Set(value.tasks).size<2||value.tasks.some(t=>!["early","signin","weight"].includes(t)))throw Error("人数3–100，周期7–365天，至少选择2项任务");
  this.pendingTeam=value;this.setData({rulesOpen:true,creatingFromRules:true});
 });},
 confirmCreate(){return this.action(async()=>{
  if(!this.data.rulesOpen||!this.data.creatingFromRules||!this.pendingTeam)return;
  if(!(await this.requireAccount()))return;
  const t=await service.createTeam(this.pendingTeam);
  this.pendingTeam=null;this.setData({rulesOpen:false,creatingFromRules:false});navigate("/pages/team-detail/index?id="+t.id);
 });}
});
