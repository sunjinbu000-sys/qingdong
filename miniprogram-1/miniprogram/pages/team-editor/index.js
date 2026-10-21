const { page, service, navigate } = require("../../utils/page");
page({
  data: { form: { max: 10 } },
  refresh() {
    this.setData({ loading: false });
  },
  submit(e) {
    return this.action(async () => {
      const t = await service.createTeam(e.detail.value);
      navigate("/pages/team-detail/index?id=" + t.id);
    });
  },
});
