const {page,service,navigate}=require("../../utils/page");
const titles={following:"我的关注",followers:"我的粉丝",likes:"我的获赞"};
page({
  data:{type:"following",query:"",rows:[],shown:[],total:0,title:titles.following},
  onLoad(q={}) {
    const type=titles[q.type]?q.type:"following";
    this.setData({type,title:titles[type]});
    wx.setNavigationBarTitle({title:titles[type]});
  },
  refresh(){return this.loadData(async()=>{
    if(!(await this.requireAccount()))return;
    const result=await service.getForumRelations(this.data.type);
    this.setData({rows:result.rows.map(row=>({...row,followLabel:row.following?(row.follower?"互相关注":"已关注"):(this.data.type==="followers"?"回关":"关注")})),total:result.total});
    this.filterRows();
  });},
  search(e){this.setData({query:e.detail.value});this.filterRows();},
  filterRows(){const q=String(this.data.query||"").trim().toLowerCase();this.setData({shown:this.data.rows.filter(row=>!q||(row.nickname+" "+(row.postTitle||"")).toLowerCase().includes(q))});},
  follow(e){return this.action(async()=>{await service.followForumUser(e.currentTarget.dataset.user);await this.refresh();});},
  author(e){navigate("/pages/public-profile/index?userId="+encodeURIComponent(e.currentTarget.dataset.user));},
  post(e){navigate("/pages/forum-detail/index?id="+encodeURIComponent(e.currentTarget.dataset.id));},
});
