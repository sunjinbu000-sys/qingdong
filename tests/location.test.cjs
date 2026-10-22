const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  cityFromMapAddress,
  chooseForumCity,
} = require("../miniprogram-1/miniprogram/utils/location");
test("map city resolves province and municipality addresses without guessing profile city", () => {
  assert.equal(cityFromMapAddress("浙江省 温州市 鹿城区 公园路"), "温州");
  assert.equal(cityFromMapAddress("杭州市西湖区"), "杭州");
  assert.equal(cityFromMapAddress("北京市朝阳区"), "北京");
  assert.equal(
    cityFromMapAddress("新疆维吾尔自治区乌鲁木齐市天山区"),
    "乌鲁木齐",
  );
  assert.throws(() => cityFromMapAddress("公园路123号"), /城市/);
});
test("map cancellation and permission failure never fabricate a location", async () => {
  assert.equal(
    await chooseForumCity({
      chooseLocation: (o) => o.fail({ errMsg: "chooseLocation:fail cancel" }),
    }),
    null,
  );
  await assert.rejects(
    () =>
      chooseForumCity({
        chooseLocation: (o) => o.fail({ errMsg: "auth deny" }),
      }),
    /定位/,
  );
  const city = await chooseForumCity({
    chooseLocation: (o) =>
      o.success({
        address: "浙江省温州市鹿城区",
        latitude: 28,
        longitude: 120,
      }),
  });
  assert.deepEqual(city, { city: "温州", source: "map" });
});
