const service = require("../services/index");
const { validDate } = require("./date");
let diaryDateIntent = null;
function takeDiaryDate() {
  const date = diaryDateIntent;
  diaryDateIntent = null;
  return date;
}
function errorMessage(error) {
  return (error && error.message) || "暂时没有完成，请再试一次";
}
function navigate(url) {
  const route = url.split("?")[0];
  const tabs = [
    "/pages/index/index",
    "/pages/health/index",
    "/pages/challenges/index",
    "/pages/profile/index",
  ];
  if (route === "/pages/health/index") {
    const match = /[?&]date=(\d{4}-\d{2}-\d{2})(?:&|$)/.exec(url);
    if (match && validDate(match[1])) diaryDateIntent = match[1];
  }
  if (tabs.includes(route)) wx.switchTab({ url: route });
  else wx.navigateTo({ url });
}
function page(options) {
  const definition = Object.assign(
    {
      data: {},
      go(event) {
        navigate(event.currentTarget.dataset.url);
      },
      retry() {
        this.refresh();
      },
      async loadData(work) {
        this.setData({ loading: true, error: "" });
        try {
          await work();
        } catch (error) {
          this.setData({ error: errorMessage(error) });
        } finally {
          this.setData({ loading: false });
        }
      },
      async action(work) {
        if (this.data.busy) return;
        this.setData({ busy: true });
        try {
          await work();
        } catch (error) {
          wx.showToast({
            title: errorMessage(error),
            icon: "none",
            duration: 2600,
          });
        } finally {
          this.setData({ busy: false });
        }
      },
      async requireAccount() {
        const snapshot = await service.getSnapshot();
        if (!snapshot.signedIn || !snapshot.profile.city) {
          navigate("/pages/account/index");
          return false;
        }
        return true;
      },
      async onShow() {
        if (this.refresh) await this.refresh();
        const pages = getCurrentPages(),
          current = pages[pages.length - 1];
        const slots = {
          "pages/index/index": "homeBanner",
          "pages/health/index": "healthBanner",
          "pages/profile/index": "profileBanner",
        };
        const key = current && slots[current.route];
        if (key) {
          try {
            const placement = await service.getAdPlacement(key);
            this.setData({ adPlacement: placement.enabled ? placement : null });
            if (key === "homeBanner" && !this._interstitialShown) {
              const interstitial =
                await service.getAdPlacement("homeInterstitial");
              if (interstitial.enabled) {
                this._interstitialShown = true;
                wx.showModal({
                  title: "模拟插屏广告",
                  content:
                    "已配置首页插屏广告位 " +
                    interstitial.unitId +
                    "。本次仅展示本地模拟，不加载真实广告。",
                  showCancel: false,
                });
              }
            }
          } catch (_) {
            this.setData({ adPlacement: null });
          }
        }
      },
    },
    options,
  );
  definition.data = Object.assign(
    { loading: true, error: "", busy: false, statusLabels: { approved:'已通过',pending:'待审核',rejected:'未通过',appealed:'申诉中',draft:'草稿',withdrawn:'已撤回',deleted:'已删除',published:'已发布',cancelled:'已取消',paid:'已支付',refund_pending:'退款待审核',refunded:'已退款' } },
    options.data,
  );
  Page(definition);
}
module.exports = { page, service, navigate, errorMessage, takeDiaryDate };
