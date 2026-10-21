const service = require("../services/index");
function errorMessage(error) {
  return (error && error.message) || "暂时没有完成，请再试一次";
}
function navigate(url) {
  const tabs = [
    "/pages/index/index",
    "/pages/health/index",
    "/pages/challenges/index",
    "/pages/profile/index",
  ];
  if (tabs.includes(url)) wx.switchTab({ url });
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
      onShow() {
        if (this.refresh) this.refresh();
      },
    },
    options,
  );
  definition.data = Object.assign(
    { loading: true, error: "", busy: false },
    options.data,
  );
  Page(definition);
}
module.exports = { page, service, navigate, errorMessage };
