const { page, service } = require("../../utils/page");
page({
  data: { code: "", nickname: "", visitorId: "", registered: false },
  onLoad(q) {
    this.setData({
      code: q.code || "",
      visitorId:
        "visitor-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    });
  },
  refresh() {
    this.setData({ loading: false });
  },
  input(e) {
    this.setData({ [e.currentTarget.dataset.key]: e.detail.value });
  },
  register() {
    this.action(async () => {
      this.setData({
        record: await service.registerInvitedVisitor({
          code: this.data.code,
          nickname: this.data.nickname,
          visitorId: this.data.visitorId,
        }),
        registered: true,
      });
    });
  },
  another() {
    this.setData({
      registered: false,
      nickname: "",
      visitorId:
        "visitor-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    });
  },
});
