const { page } = require("../../utils/page");
page({
  data: { url: "", valid: false, opened: false },
  onLoad(o) {
    const url = o.url ? decodeURIComponent(o.url) : "";
    this.setData({ url, valid: /^https:\/\//.test(url) });
  },
  refresh() {
    this.setData({ loading: false });
  },
  open() {
    this.setData({ opened: true });
  },
  copy() {
    wx.setClipboardData({ data: this.data.url });
  },
  failed() {
    this.setData({ opened: false });
    wx.showToast({ title: "无法打开，请核对业务域名或复制链接", icon: "none" });
  },
});
