const {assessPlanGoal}=require("./plan-goal");
const activityLevels=[{value:1.4,label:"日常活动较少"},{value:1.6,label:"日常轻活动"},{value:1.8,label:"日常较活跃"}];
function calorieSuggestion(profile,input,config) {
 const age=Number(profile.age),height=Number(profile.height),weight=Number(profile.weight),sex=profile.sex;
 if(!(age>0&&height>0&&weight>0) || !["男","女"].includes(sex))return {available:false,reason:"请先完善档案的年龄、身高、当前体重和性别，再计算建议。"};
 const goal=assessPlanGoal(profile,input,config);
 if(goal.needsReview)return {available:false,reason:"当前档案或目标处于记录参考模式，暂不自动给出摄入热量建议。"};
 const level=Number(input.activityLevel===undefined?1.4:input.activityLevel);
 if(!activityLevels.some(x=>x.value===level))throw Error("请选择有效的日常活动量");
 const rest=10*weight+6.25*height-5*age+(sex==="男"?5:-161);
 const maintenance=rest*level;
 const maxDeficit=Number.isFinite(Number(config.maxDeficit))?Math.min(500,Math.max(0,Number(config.maxDeficit))):500;
 const deficit=maxDeficit*Math.min(1,(goal.lossKg*7/goal.days)/goal.weeklyLimitKg);
 const floor=Math.max(1500,Number(config.minIntake)||1500);
 const kcal=Math.max(floor,Math.round((maintenance-deficit)/50)*50);
 if(kcal>10000 || !Number.isFinite(kcal))return {available:false,reason:"当前档案超出自动建议范围，请核对资料。"};
 const basis=JSON.stringify({model:"mifflin-project-v1",age,height,weight,sex,days:goal.days,loss:goal.requestedLossJin,level,floor,maxDeficit,weeklyLimit:goal.weeklyLimitKg});
 return {available:true,kcal,basis,activityLevel:level,restKcal:Math.round(rest),maintenanceKcal:Math.round(maintenance),deficitKcal:Math.round(deficit),limited:kcal>=floor && maintenance-deficit<floor,
  explanation:"按年龄、性别、身高、当前体重及所选日常活动量估算，再结合目标与周期调整；仅作记录参考，不保证达到目标。"};
}
module.exports={calorieSuggestion,activityLevels};
