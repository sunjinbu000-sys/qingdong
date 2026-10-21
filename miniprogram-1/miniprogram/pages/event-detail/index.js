const { page, service, navigate } = require("../../utils/page");
page({
  data: {},
  onLoad(q) {
    this.key = q.id === "first-step" ? undefined : q.id;
  },
  refresh() {
    return this.loadData(async () => {
      if (!this.key) this.key = (await service.listEvents())[0]?.id;
      this.setData({
        event: this.key ? await service.getEvent(this.key) : null,
      });
    });
  },
  enroll(e) {
    return this.action(async () => {
      await service.enrollEvent(this.key, e.detail.value);
      await this.refresh();
    });
  },
  act(e) {
    return this.action(async () => {
      const a = e.currentTarget.dataset.a;
      if (a === "cancel") await service.cancelEventEnrollment(this.key);
      if (a === "claim") await service.claimEventReward(this.key);
      if (a === "withdraw") await service.withdrawEvent(this.key);
      await this.refresh();
    });
  },
  verify(e) {
    return this.action(async () => {
      const checks = this.data.event.conditions.map((x, i) =>
        (e.detail.value.checks || []).includes(String(i)),
      );
      await service.verifyEvent(this.key, e.currentTarget.dataset.user, checks);
      await this.refresh();
    });
  },
});
