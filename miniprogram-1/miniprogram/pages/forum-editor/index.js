const { page, service, navigate } = require("../../utils/page");
page({
  data: {
    id: "",
    userId: "",
    text: "",
    title: "",
    images: [],
    video: "",
    topicOpen: false,
    anonymous: true,
    kind: "",
    kinds: ["生活分享", "饮食打卡", "运动打卡", "小队打卡", "心情宣发"],
    kindOptions: ["请选择分类", "生活分享", "饮食打卡", "运动打卡", "小队打卡", "心情宣发"],
    kindIndex: 0,
  },
  onLoad(q = {}) {
    this.setData({ id: q.id || "", userId: q.userId || "" });
  },
  refresh() {
    return this.loadData(async () => {
      if (this.data.id && this.loadedId !== this.data.id) {
        const post = await service.getForumPost(this.data.id);
        this.loadedId = this.data.id;
        this.setData({
          ...post,
          kindIndex: this.data.kinds.indexOf(post.kind) + 1,
        });
      }
    });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  kind(e) {
    const kindIndex = Number(e.detail.value);
    this.setData({ kindIndex, kind: this.data.kinds[kindIndex - 1] || "" });
  },
  toggleTopics() { this.setData({ topicOpen: !this.data.topicOpen }); },
  chooseTopic(e) { const kind = e.currentTarget.dataset.kind; if (this.data.kinds.includes(kind)) this.setData({kind,kindIndex:this.data.kinds.indexOf(kind)+1,topicOpen:false}); },
  removeVideo() { this.setData({video:""}); },
  addVideo() {
    return this.action(async () => {
      if (this.data.images.length) throw Error("图片与视频请选择一种，先移除图片后再添加视频");
      const file = await new Promise((resolve,reject) => wx.chooseMedia({ count:1,mediaType:["video"],sourceType:["album","camera"],maxDuration:60,success:r=>resolve(r.tempFiles && r.tempFiles[0]),fail:e=>/cancel/i.test(e.errMsg || "")?resolve(null):reject(Error("无法选择视频，请检查授权")) }));
      if (!file) return;
      if (!file.tempFilePath || !Number.isFinite(file.size) || file.size > 20*1024*1024 || !Number.isFinite(file.duration) || file.duration > 60) throw Error("请选择60秒内、20MB以内的视频");
      const video = wx.env.USER_DATA_PATH + "/qingdong-forum-" + Date.now() + ".mp4";
      await new Promise((resolve,reject)=>wx.getFileSystemManager().copyFile({srcPath:file.tempFilePath,destPath:video,success:resolve,fail:()=>reject(Error("视频保存失败，请检查设备空间"))}));
      this.setData({video});
    });
  },
  anon(e) {
    this.setData({ anonymous: e.detail.value });
  },
  addImage() {
    return this.action(async () => {
      if (this.data.video) throw Error("图片与视频请选择一种，先移除视频后再添加图片");
      const count = 9 - this.data.images.length;
      if (count <= 0) throw Error("最多9张图片");
      const files = await new Promise((resolve,reject) => wx.chooseMedia({count,mediaType:["image"],sourceType:["album","camera"],sizeType:["compressed"],success:r=>resolve(r.tempFiles || []),fail:e=>/cancel/i.test(e.errMsg || "")?resolve([]):reject(Error("无法打开相册，请检查授权"))}));
      if (!files.length) return;
      if (files.length > count || files.some(f => !f.tempFilePath || !Number.isFinite(f.size) || f.size > 8*1024*1024)) throw Error("最多9张图片，每张需小于8MB");
      const m = require("../../utils/media"), paths = [], batch = Date.now() + "-" + Math.random().toString(36).slice(2,7);
      for (let i=0;i<files.length;i++) paths.push(await m.persistFoodImage(wx, files[i].tempFilePath, "forum-" + batch + "-" + i));
      this.setData({ images: this.data.images.concat(paths) });
    });
  },
  remove(e) {
    this.setData({
      images: this.data.images.filter(
        (_, i) => i !== +e.currentTarget.dataset.index,
      ),
    });
  },
  save(e) {
    return this.action(async () => {
      if (!(await this.requireAccount())) return;
      if (
        !e.currentTarget.dataset.draft &&
        !this.data.kinds.includes(this.data.kind)
      )
        throw Error("发布前请选择分类");
      const v = {
        text: this.data.text,
        title: this.data.title,
        images: this.data.images,
        video: this.data.video,
        anonymous: this.data.anonymous,
        kind: this.data.kind,
        draft: !!e.currentTarget.dataset.draft,
      };
      const p = this.data.id
        ? await service.editForumPost(this.data.id, v)
        : await service.createForumPost(v);
      if (v.draft) {
        wx.showToast({ title: "草稿已保存", icon: "success" });
        navigate("/pages/forum-detail/index?id=" + p.id);
      } else {
        wx.switchTab({ url: "/pages/forum/index", success: () => wx.showToast({ title: "发布成功", icon: "success" }) });
      }
    });
  },
});
