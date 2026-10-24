const {page,service}=require("../../utils/page");
const {loadInviteDashboard}=require("../../services/invite-dashboard");
page({
 data:{mode:"records",title:"邀请数据",invite:{records:[]},activities:[],rewards:[],statusLabels:{pending:"待处理",issued:"已发放",claimed:"已领取",fulfilled:"已完成",revoked:"已撤回",cancelled:"已取消",shipping:"配送中"}},
 onLoad(q={}){const mode=["records","activities","rewards"].includes(q.mode)?q.mode:"records",title=({records:"邀请数据",activities:"当前邀请活动",rewards:"邀请奖励记录"})[mode];this.setData({mode,title});wx.setNavigationBarTitle({title});},
 refresh(){return this.loadData(async()=>{if(!(await this.requireAccount())){this.setData({invite:{records:[]},activities:[],rewards:[]});return;}this.setData(await loadInviteDashboard(service));});},
 claim(e){return this.action(async()=>{if(!(await this.requireAccount()))return;const {activity,tier}=e.currentTarget.dataset;const key=activity+":"+tier;if(!this.request || this.request.key!==key)this.request={key,id:"invite-claim-"+Date.now()+"-"+Math.random().toString(36).slice(2)};await service.claimTaskReward({activityId:activity,tierId:tier,requestId:this.request.id});this.request=null;await this.refresh();wx.showToast({title:"奖励已领取",icon:"success"});});}
});
