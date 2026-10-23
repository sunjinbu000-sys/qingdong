const STYLES = {
  fatloss: { label: "减脂餐", staples: ["杂粮饭", "燕麦饭", "蒸红薯", "煮玉米", "糙米饭", "蒸土豆", "小米饭", "杂豆饭"], proteins: ["鸡胸肉", "去皮鸡腿肉", "豆腐", "鸡蛋", "草鱼", "瘦猪肉", "豆腐干"], vegetables: ["西兰花", "胡萝卜", "菠菜", "番茄", "卷心菜", "小白菜", "黄瓜", "冬瓜", "南瓜", "油麦菜", "茄子"], methods: ["清蒸", "炖煮", "水煮"] },
  home: { label: "家庭日常", staples: ["米饭", "小米饭", "家常面条", "馒头", "杂粮饭", "蒸土豆", "玉米饭", "蒸红薯"], proteins: ["鸡腿肉", "鸡蛋", "豆腐", "瘦猪肉", "草鱼", "鸡胸肉", "豆腐干"], vegetables: ["青椒", "西红柿", "小白菜", "胡萝卜", "卷心菜", "冬瓜", "茄子", "西葫芦", "菠菜", "白萝卜", "油麦菜"], methods: ["清炖", "焖煮", "少油炒"] },
};
function normalizeMealStyle(style) {
  if (style === undefined || style === null || style === "") return "fatloss";
  if (!["fatloss", "home", "mixed"].includes(style)) throw Error("请选择有效餐食风格");
  return style;
}
function mealPreset(style, index, slot) {
  style = normalizeMealStyle(style);
  const chosen = style === "mixed" ? (index % 2 === 0 ? "home" : "fatloss") : style;
  const preset = { ...STYLES[chosen], id: chosen };
  if (slot === "breakfast") {
    preset.staples = chosen === "home" ? ["小米粥", "馒头", "全麦面包", "燕麦粥", "煮玉米", "蒸红薯", "南瓜粥", "杂粮粥"] : ["燕麦粥", "煮玉米", "蒸红薯", "小米粥", "全麦面包", "南瓜粥", "杂粮粥", "蒸土豆"];
    preset.proteins = ["鸡蛋", "纯牛奶", "无糖豆浆", "豆腐", "无糖酸奶", "鸡胸肉", "豆腐干"];
    preset.vegetables = ["黄瓜", "番茄", "胡萝卜", "小白菜", "苹果", "橙子", "香蕉", "菠菜", "卷心菜"];
    preset.methods = ["熟制", "煮熟", "蒸煮"];
  }
  return preset;
}
module.exports = { normalizeMealStyle, mealPreset };
