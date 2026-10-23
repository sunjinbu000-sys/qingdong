const {page,service,navigate}=require("../../utils/page");
page({
 data:{code:"",invitation:null,signedIn:false,hasCity:false,inviteError:"",rulesOpen:false,confirmingJoin:false,days:0},
 onLoad(q={}){if(q.code){this.autoPreview=true;this.setData({code:q.code});}},
 async refresh(){
  const snapshot=await service.getSnapshot();this.setData({signedIn:snapshot.signedIn,hasCity:!!snapshot.profile.city,loading:false});
  if(this.data.code&&this.autoPreview){try{await this.loadInvitation();}catch(error){this.setData({inviteError:error.message,invitation:null});}}
 },
 async loadInvitation(){const invitation=await service.getTeamInvitation(this.data.code);const days=Math.round((Date.parse(invitation.end)-Date.parse(invitation.start))/86400000)+1;this.setData({invitation,days,inviteError:""});return invitation;},
 input(e){this.autoPreview=false;this.pendingInvite=null;this.setData({code:e.detail.value,invitation:null,inviteError:"",rulesOpen:false,confirmingJoin:false});},
 viewInvite(){return this.action(async()=>{this.setData({invitation:null,inviteError:""});this.autoPreview=true;await this.loadInvitation();});},
 join(){return this.action(async()=>{
  if(!(await this.requireAccount()))return;
  const invitation=await this.loadInvitation();
  if(invitation.alreadyJoined)return this.openTeam();
  if(invitation.alreadyRequested)throw Error("已提交加入申请，请等待队长处理");
  if(invitation.closed)throw Error("小队已结束");
  this.pendingInvite={code:this.data.code.trim(),id:invitation.id};this.setData({rulesOpen:true,confirmingJoin:true});
 });},
 confirmJoin(){return this.action(async()=>{
  if(!this.data.rulesOpen||!this.data.confirmingJoin||!this.pendingInvite)return;
  if(!(await this.requireAccount()))return;
  const pending=this.pendingInvite;const result=await service.joinTeamByInvite(pending.code);
  this.pendingInvite=null;this.setData({rulesOpen:false,confirmingJoin:false});
  wx.showToast({title:result.pending?"申请已提交":"已加入小队",icon:"success"});navigate("/pages/team-detail/index?id="+result.id);
 });},
 closeRules(){if(this.data.busy)return;this.pendingInvite=null;this.setData({rulesOpen:false,confirmingJoin:false});},
 preventMove(){},
 openTeam(){if(this.data.invitation)navigate("/pages/team-detail/index?id="+this.data.invitation.id);},
 rules(){this.pendingInvite=null;this.setData({rulesOpen:true,confirmingJoin:false});}
});
