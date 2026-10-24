const { loadInviteDashboard } = require("../../services/invite-dashboard");
const qrcode = require("../../services/reference/qrcode");
const { page, service, navigate } = require("../../utils/page");
const { shareImage } = require("../../utils/share-image");
page({
  data: {
    invite: { records: [], tiers: [], claims: [] },
    poster: "",
    activities: [],
    rewards: [],
    role: "consumer",
    profile: {}, claimableCount: 0,
    statusLabels: {pending:"待处理",issued:"已发放",claimed:"已领取",fulfilled:"已完成",revoked:"已撤回",cancelled:"已取消",shipping:"配送中"},
  },
  refresh() {
    return this.loadData(async () => {
      if (!(await this.requireAccount())) return;
      this.setData(await loadInviteDashboard(service));
    });
  },
  jump(e) { const mode=({"invite-records":"records","invite-activities":"activities","invite-rewards":"rewards"})[e.currentTarget.dataset.section];if(mode)navigate("/pages/invite-data/index?mode="+mode); },
  rules() { wx.showModal({title:"邀请好友，如何获得奖励？",content:"分享你的专属邀请码或邀请入口，好友首次注册并成功绑定后，计入成功邀请人数。同一新用户只能绑定一次。奖励按已发布活动的邀请人数、档位、名额与领取期限发放；部分活动仅能领取最高达标档位。会员奖励进入统一权益队列，实物奖励按活动规则处理。具体以邀请活动页面说明为准。",showCancel:false,confirmText:"我知道了"}); },
  sharePoster() { return this.action(()=>shareImage(wx,this.data.poster)); },
  copy() {
    wx.setClipboardData({
      data:
        this.data.invite.link +
        "\n邀请码 " +
        this.data.invite.code +
        "（本地演示路径，需同一模拟数据）",
    });
  },
  preview() {
    navigate(this.data.invite.link);
  },
  claim(e) {
    return this.action(async () => {
      await service.claimTaskReward({
        activityId: e.currentTarget.dataset.activity,
        tierId: e.currentTarget.dataset.tier,
        requestId:
          "invite-claim-" +
          Date.now() +
          "-" +
          Math.random().toString(36).slice(2, 7),
      });
      await this.refresh();
      wx.showToast({ title: "模拟奖励已到账", icon: "success" });
    });
  },
  poster() {
    this.action(async () => {
      const c = wx.createCanvasContext("invitePoster", this);
      const qr = qrcode(0, "M");
      qr.addData(this.data.invite.link, "Byte");
      qr.make();
      c.setFillStyle("#eff4e7");
      c.fillRect(0, 0, 300, 560);
      c.setFillStyle("#173f34");
      c.fillRect(0, 0, 300, 82);
      c.setFillStyle("#e2efbf");
      c.setFontSize(20);
      c.fillText("轻动 · 一起养成好习惯", 20, 49);
      c.setFillStyle("#173f34");
      c.setFontSize(19);
      c.fillText("邀请你认真记录每一天", 25, 121);
      c.setFontSize(13);
      c.fillText("饮食 · 运动 · 每一个小小坚持", 25, 146);
      const count = qr.getModuleCount(),
        scale = Math.max(1, Math.floor(224 / (count + 8))),
        size = (count + 8) * scale,
        left = Math.floor((300 - size) / 2),
        top = 170;
      c.setFillStyle("#fff");
      c.fillRect(left, top, size, size);
      c.setFillStyle("#10251c");
      for (let row = 0; row < count; row++)
        for (let col = 0; col < count; col++)
          if (qr.isDark(row, col))
            c.fillRect(
              left + (col + 4) * scale,
              top + (row + 4) * scale,
              scale,
              scale,
            );
      c.setFontSize(13);
      c.fillText("本地模拟邀请路径二维码", 25, 410);
      c.fillText("邀请码", 25, 434);
      c.setFontSize(12);
      const chunks = this.data.invite.code.match(/.{1,28}/g) || [];
      chunks.forEach((line, i) => c.fillText(line, 25, 455 + i * 17));
      c.setFontSize(11);
      c.fillText("仅编码本地邀请路径，需同一模拟数据。", 25, 518);
      c.fillText("不是微信小程序码，未连接线上注册服务。", 25, 538);
      await new Promise((r) => c.draw(false, r));
      const result = await new Promise((resolve, reject) =>
        wx.canvasToTempFilePath(
          {
            canvasId: "invitePoster",
            destWidth: 600,
            destHeight: 1120,
            success: resolve,
            fail: reject,
          },
          this,
        ),
      );
      this.setData({ poster: result.tempFilePath });
      wx.previewImage({
        urls: [result.tempFilePath],
        current: result.tempFilePath,
      });
    });
  },
  onShareAppMessage() {
    return { title: "和我一起，把健康记下来", path: this.data.invite.link };
  },
});
