const { page, service, navigate } = require("../../utils/page");
const {shiftDate}=require("../../utils/date");
page({
 data:{rulesOpen:true,creatingFromRules:false,creationSummary:null,earlyError:"",form:{name:"",max:5,start:"",end:"",method:"invite",tasks:["signin","early","weight"],earlyBefore:""},capacities:[3,5,10,20,50,100],capacityIndex:1,advanced:false,today:"",duration:7,methods:["仅邀请加入","申请审核加入","公开加入"],methodValues:["invite","approval","open"],methodIndex:0,taskOptions:[{id:"signin",label:"每日签到",checked:true},{id:"early",label:"早起打卡",checked:true},{id:"weight",label:"体重记录",checked:true}]},
 async refresh(){const s=await service.getSnapshot();const start=this.data.form.start||shiftDate(s.date,1);this.setData({today:s.date,"form.start":start,"form.end":this.data.form.end||shiftDate(start,6),loading:false});},
 input(e){this.setData({["form."+e.currentTarget.dataset.key]:e.detail.value});},
 capacity(e){const capacityIndex=Number(e.detail.value);this.setData({capacityIndex,"form.max":this.data.capacities[capacityIndex]});},
 method(e){const methodIndex=Number(e.detail.value);this.setData({methodIndex,"form.method":this.data.methodValues[methodIndex]});},
 tasks(){this.setData({"form.tasks":["signin","early","weight"],taskOptions:this.data.taskOptions.map(t=>({...t,checked:true}))});},
 earlyTime(e){this.setData({"form.earlyBefore":e.detail.value,earlyError:""});},
 date(e){this.setData({["form."+e.currentTarget.dataset.key]:e.detail.value});this.setData({duration:Math.round((Date.parse(this.data.form.end)-Date.parse(this.data.form.start))/86400000)+1});},
 toggleAdvanced(){this.setData({advanced:!this.data.advanced});},
 rules(){this.pendingTeam=null;this.setData({rulesOpen:true,creatingFromRules:false,creationSummary:null});},
 closeRules(){if(this.data.busy)return;this.pendingTeam=null;this.setData({rulesOpen:false,creatingFromRules:false,creationSummary:null});},
 preventMove(){},
 submit(e){return this.action(async()=>{
  if(!(await this.requireAccount()))return;
  const value=JSON.parse(JSON.stringify(Object.assign({},this.data.form,e&&e.detail&&e.detail.value||{})));
  value.tasks=["signin","early","weight"];
  if(typeof value.earlyBefore!=="string"||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.earlyBefore)||value.earlyBefore==="00:00"){
   this.pendingTeam=null;this.setData({rulesOpen:false,creatingFromRules:false,creationSummary:null,earlyError:"请先设置早起打卡截止时间（北京时间，晚于00:00）"});
   const scroll=()=>{if(wx.pageScrollTo)wx.pageScrollTo({selector:"#team-early-time",duration:250});};if(wx.nextTick)wx.nextTick(scroll);else scroll();
   throw Error("请先设置早起打卡截止时间");
  }
  const days=(Date.parse(value.end)-Date.parse(value.start))/86400000+1;
  const {validDate}=require("../../utils/date");
  if(!String(value.name||"").trim()||String(value.name).trim().length>20)throw Error("请填写1–20字的小队名字");
  if(!Number.isInteger(Number(value.max))||Number(value.max)<3||Number(value.max)>100||!validDate(value.start)||!validDate(value.end)||value.start<this.data.today||days<7||days>365||!["open","approval","invite"].includes(value.method)||!Array.isArray(value.tasks)||new Set(value.tasks).size!==3||value.tasks.some(t=>!["early","signin","weight"].includes(t)))throw Error("人数3–100，周期7–365天，三项习惯任务自动启用");
  this.pendingTeam=value;this.setData({rulesOpen:true,creatingFromRules:true,creationSummary:{name:String(value.name).trim(),max:Number(value.max),start:value.start,end:value.end,days,method:({invite:"仅邀请加入",approval:"申请审核加入",open:"公开加入"})[value.method],earlyBefore:value.earlyBefore,tasks:value.tasks.map(t=>({signin:"每日签到",early:"早起打卡",weight:"体重记录"})[t]).join("、")}});
 });},
 confirmCreate(){return this.action(async()=>{
  if(!this.data.rulesOpen||!this.data.creatingFromRules||!this.pendingTeam)return;
  if(!(await this.requireAccount()))return;
  const t=await service.createTeam(this.pendingTeam);
  this.pendingTeam=null;this.setData({rulesOpen:false,creatingFromRules:false,creationSummary:null});navigate("/pages/team-detail/index?id="+t.id);
 });}
});
