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
  filterRows(){
    const q=String(this.data.query||"").trim().toLowerCase();let rows=this.data.rows;
    if(this.data.type==="likes"){
      const groups=new Map();
      rows.forEach(row=>{if(!groups.has(row.userId))groups.set(row.userId,{...row,id:row.userId,likeCount:0,notes:[],searchText:row.nickname});const group=groups.get(row.userId);group.likeCount++;group.notes.push({id:row.id,postId:row.postId,title:row.postTitle});group.searchText+=" "+row.postTitle;});
      rows=[...groups.values()];
    }
    this.setData({shown:rows.filter(row=>!q||(row.searchText||row.nickname+" "+(row.postTitle||"")).toLowerCase().includes(q))});
  },
  toggleNotes(e){this.setData({expandedUser:this.data.expandedUser===e.currentTarget.dataset.user?"":e.currentTarget.dataset.user});},
  follow(e){return this.action(async()=>{await service.followForumUser(e.currentTarget.dataset.user);await this.refresh();});},
  author(e){navigate("/pages/public-profile/index?userId="+encodeURIComponent(e.currentTarget.dataset.user));},
  post(e){navigate("/pages/forum-detail/index?id="+encodeURIComponent(e.currentTarget.dataset.id));},
});
