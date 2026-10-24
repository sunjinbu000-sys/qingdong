const { page, service, navigate } = require("../../utils/page");
const { chooseForumCity, locateForumCity } = require("../../utils/location");
page({
  data: {
    tab: "recommended",
    mine: "mine",
    posts: [],
    moreOpen: false, morePost: null,
    signedIn: false,
    personal: { nickname: "轻动新朋友", bio: "", following: 0, followers: 0, likes: 0 },
    region: null,
    locationError: "",
    locating: false,
    tabs: [
      { id: "recommended", label: "推荐" },
      { id: "local", label: "本地" },
      { id: "national", label: "全国" },
      { id: "latest", label: "最新" },
      { id: "mine", label: "我的" },
    ],
    mineTabs: [
      { id: "mine", label: "笔记" },
      { id: "favorited", label: "收藏" },
      { id: "liked", label: "赞过" },
      { id: "commented", label: "评论过" },
    ],
  },
  refresh() {
    const load = this._feedReady ? async work => { this.setData({error:""}); try { await work(); } catch(error) { this.setData({error:error.message}); } } : this.loadData.bind(this);
    return load(async () => {
      const revision = (this.revision || 0) + 1;
      this.revision = revision;
      const snapshot = await service.getSnapshot(),
        savedRegion = await service.getForumRegion();
      const region = this.data.tab === "local" && this._locationFailed ? null : savedRegion;
      const tab = this.data.tab,
        mode = tab === "mine" ? this.data.mine : "public";
      let posts = [];
      if (
        !(tab === "mine" && !snapshot.signedIn) &&
        !(tab === "local" && !region)
      )
        posts = await service.listForumPosts({
          mode,
          feed: tab === "mine" ? "" : tab,
          sort: tab === "recommended" || tab === "national" ? "hot" : "new",
        });
      const personal = snapshot.signedIn && tab === "mine" ? await service.getForumPersonalSummary() : null;
      if (this.revision !== revision) return;
      this._feedReady = true;
      this.setData({
        signedIn: snapshot.signedIn,
        personal: personal || this.data.personal,
        region,
        posts: posts.map(post => {
          const stamp=new Date(post.createdAt).getTime(),elapsed=Date.now()-stamp;
          const timeLabel=Number.isFinite(stamp)&&elapsed>=0?(elapsed<60000?"刚刚":elapsed<3600000?Math.floor(elapsed/60000)+"分钟前":elapsed<86400000?Math.floor(elapsed/3600000)+"小时前":post.date):post.date;
          return {...post,timeLabel};
        }),
        emptyText:
          tab === "mine"
            ? mode === "favorited"
              ? "还没有收藏的笔记，遇到喜欢的内容就收藏起来吧"
              : mode === "liked"
              ? "还没有点赞的文章"
              : mode === "commented"
                ? "还没有评论过的文章"
                : "还没有发布文章，分享你的第一篇吧"
            : tab === "local"
              ? "本地还没有公开文章，来分享你的生活吧"
              : tab === "recommended"
                ? "暂时没有推荐文章，去全国或最新看看吧"
                : "还没有公开文章",
      });
    });
  },
  async changeTab(e) {
    const tab = e.currentTarget.dataset.id;
    if (!this.data.tabs.some((t) => t.id === tab)) return;
    this.setData({ tab, posts: [], error: "" });
    if(tab === "local") return this.locate();
    return this.refresh();
  },
  changeMine(e) {
    if(!this.data.mineTabs.some(t=>t.id===e.currentTarget.dataset.id))return;
    this.setData({ mine: e.currentTarget.dataset.id, posts: [] });
    return this.refresh();
  },
  async locate() {
    if(this.data.locating)return;
    this._locationFailed=true;
    this.setData({locating:true,locationError:"",region:null,posts:[]});
    try {const region=await locateForumCity(wx);await service.saveForumRegion(region);this._locationFailed=false;await this.refresh();}
    catch(error){this.setData({locationError:error.message});}
    finally{this.setData({locating:false});}
  },
  manualLocate(){return this.action(async()=>{const region=await chooseForumCity(wx);if(!region)return;await service.saveForumRegion(region);this._locationFailed=false;await this.refresh();this.setData({locationError:""});});},
  follow(e){return this.action(async()=>{if(!(await this.requireAccount()))return;await service.followForumUser(e.currentTarget.dataset.user);await this.refresh();});},
  like(e){return this.action(async()=>{if(!(await this.requireAccount()))return;await service.likeForumPost(e.currentTarget.dataset.id);await this.refresh();});},
  author(e){const p=this.data.posts.find(p=>p.id===e.currentTarget.dataset.id);if(p&&!p.anonymous)navigate("/pages/public-profile/index?userId="+encodeURIComponent(p.userId));},
  more(e) {
    const post=this.data.posts.find(p=>p.id===e.currentTarget.dataset.id);
    if(!post)return;
    this.setData({moreOpen:true,morePost:{id:post.id,mine:!!post.mine,shareable:post.status==='approved'}});
  },
  closeMore(){this.setData({moreOpen:false});},
  onHide(){this.closeMore();},
  stopMore(){},
  menuNavigate(e) {
    const post=this.data.morePost;
    if(!post)return;
    this.closeMore();
    navigate('/pages/'+(e.currentTarget.dataset.action==='edit'?'forum-editor':'forum-detail')+'/index?id='+encodeURIComponent(post.id));
  },
  reportMore() {
    const post=this.data.morePost;
    if(!post||post.mine)return;
    this.closeMore();
    return this.action(async()=>{
      if(!(await this.requireAccount()))return;
      wx.showModal({title:'举报笔记',editable:true,placeholderText:'请填写举报原因',success:result=>{
        if(result.confirm)this.action(async()=>{await service.reportForumPost(post.id,result.content);wx.showToast({title:'举报已提交',icon:'success'});});
      }});
    });
  },
  onShareAppMessage(e) {
    const id=e&&e.target&&e.target.dataset&&e.target.dataset.id;
    const post=id&&this.data.posts.find(p=>p.id===id&&p.status==='approved');
    this.closeMore();
    return post?{title:post.title||String(post.text||'轻友的生活分享').slice(0,42),path:'/pages/forum-detail/index?id='+encodeURIComponent(post.id)}:{title:'轻友论坛',path:'/pages/forum/index'};
  },
  editBio(){if(!this.data.signedIn)return navigate("/pages/account/index");wx.showModal({title:"编辑个人简介",editable:true,content:this.data.personal.bio||"",placeholderText:"介绍一下自己（最多120字）",confirmText:"保存",success:r=>{if(r.confirm)this.action(async()=>{await service.saveForumBio(r.content||"");await this.refresh();wx.showToast({title:"简介已更新",icon:"success"});});}});},
  publish() {
    navigate(
      this.data.signedIn ? "/pages/forum-editor/index" : "/pages/account/index",
    );
  },
  preview(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.current,
      urls: e.currentTarget.dataset.images,
    });
  },
});
