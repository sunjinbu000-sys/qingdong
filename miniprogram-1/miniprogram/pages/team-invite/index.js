const {page,service}=require("../../utils/page");
page({
 data:{team:null,code:"",expires:"",poster:"",inviteAvailable:false},
 onLoad(q={}){this.key=q.id==="first-step"?undefined:q.id;},
 refresh(){return this.loadData(async()=>{if(!this.key)this.key=(await service.listTeams())[0]?.id;if(!this.key){this.setData({team:null});return;}const team=await service.getTeam(this.key);const snapshot=await service.getSnapshot();const inviteAvailable=team.isCaptain&&!team.cancelled&&!team.closed&&team.end>=snapshot.date;let invite=null;if(inviteAvailable)invite=await service.generateTeamInvite(this.key);this.setData({team,inviteAvailable,code:invite?invite.code:"",expires:invite?invite.expires:""});});},
 async ensureCode(){const invite=await service.generateTeamInvite(this.key);this.setData({code:invite.code,expires:invite.expires});return invite.code;},
 generate(){return this.action(async()=>{await this.ensureCode();wx.showToast({title:"邀请码已生成",icon:"success"});});},
 copy(){if(!this.data.code)return;wx.setClipboardData({data:this.data.code});},
  rules(){this.setData({rulesOpen:true});},
  closeRules(){this.setData({rulesOpen:false});},
  preventMove(){},
 poster(){return this.action(async()=>{if(!this.data.team||!this.data.team.isCaptain)return;const code=await this.ensureCode(),team=this.data.team,c=wx.createCanvasContext("teamInvitePoster",this);c.setFillStyle("#eee7fb");c.fillRect(0,0,300,420);c.setFillStyle("#ddf1e7");c.fillRect(16,16,268,140);c.setFillStyle("#396f65");c.setFontSize(25);c.fillText("一个人走很快，",32,68);c.fillText("一起走得更远。",32,106);c.setFillStyle("#fff");c.fillRect(16,176,268,215);c.setFillStyle("#49365f");c.setFontSize(20);c.fillText(team.name.slice(0,12),30,210);c.setFontSize(13);c.fillText(team.city+" · "+team.start+" 至 "+team.end,30,242);c.fillText("好友邀请码",30,275);c.setFontSize(15);for(let i=0;i<Math.ceil(code.length/25);i++)c.fillText(code.slice(i*25,(i+1)*25),30,305+i*22);c.setFontSize(11);c.fillText("轻动 · 好友邀我一起 · 输入邀请码加入",30,370);await new Promise(resolve=>c.draw(false,resolve));const file=await new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvasId:"teamInvitePoster",success:resolve,fail:()=>reject(Error("海报生成失败，请在手机上重试"))},this));this.setData({poster:file.tempFilePath});await require("../../utils/share-image").shareImage(wx,file.tempFilePath);});},
 onShareAppMessage(){return {title:this.data.team?this.data.team.name+"：一起坚持，更有力量":"邀请你加入轻动小队",path:this.data.code?"/pages/team-join/index?code="+encodeURIComponent(this.data.code):"/pages/team/index"};}
});
