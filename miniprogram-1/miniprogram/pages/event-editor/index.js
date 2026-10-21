const { page, service, navigate } = require("../../utils/page");
page({
  data: {
    form: { capacity: 50, virtualCount: 0, scope: "city" },
    conditions: "完成活动签到",
    fields: "姓名|text|必填",
    memberRewards: "活动纪念会员|3|5",
    physicalRewards: "",
    otherRewards: "",
  },
  onLoad(q) {
    this.key = q.id === "first-step" ? undefined : q.id;
  },
  refresh() {
    return this.loadData(async () => {
      if (this.key) {
        const e = await service.getEvent(this.key);
        this.setData({
          form: e,
          conditions: e.conditions.join("\n"),
          fields: (e.fields || [])
            .map((f) =>
              [f.label, f.type, f.required ? "必填" : "选填"].join("|"),
            )
            .join("\n"),
          memberRewards: e.rewards
            .filter((r) => r.type === "member")
            .map((r) => [r.name, r.days, r.dailyLimit].join("|"))
            .join("\n"),
          physicalRewards: e.rewards
            .filter((r) => r.type === "physical")
            .map((r) => [r.name, r.quantity || 1].join("|"))
            .join("\n"),
          otherRewards: e.rewards
            .filter((r) => r.type === "other")
            .map((r) => [r.name, r.quantity || 1].join("|"))
            .join("\n"),
        });
      }
    });
  },
  submit(e) {
    return this.action(async () => {
      const v = e.detail.value;
      v.id = this.key;
      v.conditions = v.conditions
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      v.fields = v.fields
        .split("\n")
        .filter((x) => x.trim())
        .map((x, i) => {
          const a = x.split("|");
          return {
            key: "f" + i,
            label: a[0],
            type: a[1] || "text",
            required: a[2] === "必填",
          };
        });
      v.rewards = [];
      for (const [key, type] of [
        ["memberRewards", "member"],
        ["physicalRewards", "physical"],
        ["otherRewards", "other"],
      ])
        for (const line of String(v[key] || "")
          .split("\n")
          .filter((x) => x.trim())) {
          const a = line.split(/[|｜]/).map((x) => x.trim());
          v.rewards.push(
            type === "member"
              ? {
                  type,
                  name: a[0],
                  days: Number(a[1]),
                  dailyLimit: Number(a[2]),
                }
              : { type, name: a[0], quantity: Number(a[1] || 1) },
          );
        }
      const saved = await service.saveEvent(v);
      navigate("/pages/event-detail/index?id=" + saved.id);
    });
  },
});
