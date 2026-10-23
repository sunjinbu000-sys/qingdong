const { page, service, navigate } = require("../../utils/page");
const {shiftDate}=require("../../utils/date");
page({
 data:{form:{name:"",max:5,start:"",end:"",method:"invite",tasks:["signin","early"]},capacities:[3,5,10,20,50,100],capacityIndex:1,advanced:false,today:"",duration:7,methods:["仅邀请加入","申请审核加入","公开加入"],methodValues:["invite","approval","open"],methodIndex:0,taskOptions:[{id:"signin",label:"每日签到",checked:true},{id:"early",label:"早起打卡",checked:true},{id:"weight",label:"体重记录",checked:false}]},
 async refresh(){const s=await service.getSnapshot();const start=this.data.form.start||shiftDate(s.date,1);this.setData({today:s.date,"form.start":start,"form.end":this.data.form.end||shiftDate(start,6),loading:false});},
 input(e){this.setData({["form."+e.currentTarget.dataset.key]:e.detail.value});},
 capacity(e){const capacityIndex=Number(e.detail.value);this.setData({capacityIndex,"form.max":this.data.capacities[capacityIndex]});},
 method(e){const methodIndex=Number(e.detail.value);this.setData({methodIndex,"form.method":this.data.methodValues[methodIndex]});},
 tasks(e){const tasks=e.detail.value;this.setData({"form.tasks":tasks,taskOptions:this.data.taskOptions.map(t=>({...t,checked:tasks.includes(t.id)}))});},
 date(e){this.setData({["form."+e.currentTarget.dataset.key]:e.detail.value});this.setData({duration:Math.round((Date.parse(this.data.form.end)-Date.parse(this.data.form.start))/86400000)+1});},
 toggleAdvanced(){this.setData({advanced:!this.data.advanced});},
 rules(){wx.showModal({title:"小队挑战怎么玩？",content:"创建小队不收费，至少3人才能由队长开赛。按选定起止日期记录，队员完成所选习惯任务，比较小队完成率与坚持情况，不以掉秤速度作为PK目标。支持签到、早起和体重记录任务；体重仅记录，不比较减重速度。可通过邀请码邀请，或在更多设置选择审核/公开加入。",showCancel:false,confirmText:"我知道了"});},
 submit(e){return this.action(async()=>{if(!(await this.requireAccount()))return;const value=Object.assign({},this.data.form,e&&e.detail&&e.detail.value||{});const t=await service.createTeam(value);navigate("/pages/team-detail/index?id="+t.id);});}
});
