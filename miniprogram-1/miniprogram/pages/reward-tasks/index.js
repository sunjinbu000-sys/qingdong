const { page, service, navigate } = require("../../utils/page");
page({
  data: {
    tasks: [],
    shown: [],
    filter: "all",
    filterLabel: "全部奖励",
    dropdownOpen: false,
    types: [
      { key: "all", label: "全部" },
      { key: "checkin", label: "签到" },
      { key: "forum", label: "发帖" },
      { key: "invite", label: "邀请" },
      { key: "video", label: "视频" },
      { key: "event", label: "线下" },
      { key: "team", label: "小队" },
      { key: "rank", label: "榜单" },
      { key: "manual", label: "核验" },
    ],
  },
  refresh() {
    return this.loadData(async () => {
      this.setData({ tasks: await service.getRewardTasks() });
      this.applyFilter();
    });
  },
  applyFilter() {
    this.setData({
      shown: this.data.tasks.filter(
        (a) => this.data.filter === "all" || a.type === this.data.filter,
      ),
    });
  },
  toggleDropdown() { this.setData({ dropdownOpen: !this.data.dropdownOpen }); },
  filter(e) {
    const selected = this.data.types.find(t => t.key === e.currentTarget.dataset.key);
    if (!selected) return;
    this.setData({ filter: selected.key, filterLabel: selected.key === "all" ? "全部奖励" : selected.label + "奖励", dropdownOpen: false });
    this.applyFilter();
  },
  goTask(e) {
    const links = {
      checkin: "index",
      forum: "forum",
      invite: "invite",
      video: "photo",
      event: "events",
      team: "team",
      rank: "rank",
      manual: "events",
    };
    navigate("/pages/" + links[e.currentTarget.dataset.type] + "/index");
  },
  claim(e) {
    this.action(async () => {
      if (!(await this.requireAccount())) return;
      const key =
        e.currentTarget.dataset.activity + ":" + e.currentTarget.dataset.tier;
      if (!this.request || this.request.key !== key)
        this.request = { key, id: "claim-" + Date.now() };
      await service.claimTaskReward({
        activityId: e.currentTarget.dataset.activity,
        tierId: e.currentTarget.dataset.tier,
        requestId: this.request.id,
      });
      this.request = null;
      await this.refresh();
      wx.showToast({ title: "奖励已领取" });
    });
  },
});
