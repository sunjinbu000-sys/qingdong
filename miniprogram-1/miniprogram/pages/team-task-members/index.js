const {page,service}=require("../../utils/page");
page({
  data:{id:"",task:"signin",status:"pending",query:"",rows:[],shown:[],meta:null},
  onLoad(q={}) {
    this.setData({id:q.id||"",task:["signin","early","weight"].includes(q.task)?q.task:"signin",status:q.status==="done"?"done":"pending"});
    wx.setNavigationBarTitle({title:this.data.status==="done"?"已打卡成员":"未完成成员"});
  },
  refresh(){return this.loadData(async()=>{
    if(!(await this.requireAccount())||!this.data.id)return;
    const meta=await service.getTeamTaskMembers(this.data.id,this.data.task,this.data.status);
    this.setData({meta,rows:meta.rows});this.filterRows();
  });},
  search(e){this.setData({query:e.detail.value});this.filterRows();},
  filterRows(){const query=String(this.data.query||"").trim().toLowerCase();this.setData({shown:this.data.rows.filter(m=>!query||m.nickname.toLowerCase().includes(query))});},
  onShareAppMessage(){const m=this.data.meta;return {title:m?m.teamName+"：一起完成"+m.taskLabel:"一起完成今天的小队任务",path:"/pages/team-detail/index?id="+encodeURIComponent(this.data.id)+"&task="+this.data.task};},
});
