const {page,service,navigate}=require("../../utils/page");
page({
 data:{code:"",invitation:null},
 onLoad(q={}){if(q.code)this.setData({code:q.code});},
 refresh(){this.setData({loading:false});},
 input(e){this.setData({code:e.detail.value,invitation:null});},
 viewInvite(){return this.action(async()=>{if(!(await this.requireAccount()))return;const invitation=await service.getTeamInvitation(this.data.code);this.setData({invitation});});},
 join(){return this.action(async()=>{if(!(await this.requireAccount()))return;if(!this.data.invitation)return;const result=await service.joinTeamByInvite(this.data.code);wx.showToast({title:result.pending?"申请已提交":"已加入小队",icon:"success"});navigate("/pages/team-detail/index?id="+result.id);});},
 openTeam(){if(this.data.invitation)navigate("/pages/team-detail/index?id="+this.data.invitation.id);},
 rules(){wx.showModal({title:"小队挑战怎么玩？",content:"使用好友分享的邀请码查看邀请，确认小队后加入。至少3人才能由队长开赛，按小队设定日期完成习惯任务。PK比较习惯完成率，不比较掉秤速度。加入仍需符合城市、人数与挑战周期等要求。队友仅查看昵称和习惯完成情况，不公开具体体重、餐食照片及健康档案。",showCancel:false,confirmText:"我知道了"});}
});
