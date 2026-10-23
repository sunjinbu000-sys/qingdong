const round = n => Math.round(n * 10) / 10;
function summarizeAnalysis(analysis, portions) {
  if (!analysis.recognized) return analysis;
  if (portions && (portions.length !== analysis.ingredients.length || portions.some(v => !Number.isFinite(Number(v)) || Number(v) < 0 || Number(v) > 5000))) throw Error("请填写0–5000克的有效份量");
  analysis.ingredients = analysis.ingredients.map((item, i) => {
    const grams = portions ? Number(portions[i]) : item.grams;
    const ratio = grams / item.baseGrams;
    return { ...item, grams, kcal: round(item.baseKcal * ratio), protein: round(item.baseProtein * ratio), carbohydrate: round(item.baseCarbohydrate * ratio), fat: round(item.baseFat * ratio) };
  });
  if (!analysis.ingredients.some(i => i.grams > 0)) throw Error("请至少保留一项有实际份量的食材");
  for (const key of ["kcal", "protein", "carbohydrate", "fat"]) analysis[key] = round(analysis.ingredients.reduce((sum, item) => sum + item[key], 0));
  const energy = analysis.protein * 4 + analysis.carbohydrate * 4 + analysis.fat * 9;
  analysis.pfc = energy > 0 ? [round(analysis.protein * 4 / energy * 100), round(analysis.carbohydrate * 4 / energy * 100), round(analysis.fat * 9 / energy * 100)] : null;
  analysis.range = Math.round(analysis.kcal * .8) + "–" + Math.round(analysis.kcal * 1.2);
  return analysis;
}
function mockAnalysis(input) {
  const recognized = input.mockScenario === "meal";
  const result = { recognized, status: recognized ? "draft" : "unrecognized", mock: true, name: recognized ? "鸡肉蔬菜饭 · 餐食演示样例" : "未识别到餐食", kcal: null, protein: null, carbohydrate: null, fat: null, ingredients: [], pfc: null,
    description: recognized ? "当前展示本地餐食样例，尚未分析这张照片。请核对真实食材与份量，样例数值不代表照片内容。" : "当前没有可用的真实识图结果，无法确认照片中是否有餐食。未确定的热量和营养不会按0处理。",
    pfcDescription: recognized ? "PFC根据样例营养值按蛋白质4、碳水4、脂肪9千卡/克计算。份量调整后会重新汇总，不代表实际检测结果。" : "营养数据不完整，暂不计算三大营养素供能比例。",
    observation: recognized ? "样例含主食、蛋白质及蔬菜。实际烹调油、酱料与食材重量会改变估算值。" : "本次没有确认食材或份量，不能据此判断营养摄入，也不能把未知热量当作0。",
    suggestion: "请拍摄光线充足、完整清晰的真实餐食照片；核对食材、份量及个人忌口，必要时手动记录。",
  };
  if (recognized) result.ingredients = [
    ["熟米饭", 200, 232, 5.2, 51.8, .6], ["熟鸡胸肉", 100, 165, 31, 0, 3.6], ["西兰花", 150, 51, 4.2, 9.9, .6], ["烹调油", 8, 72, 0, 0, 8],
  ].map(([name, grams, kcal, protein, carbohydrate, fat]) => ({ name, grams, kcal, protein, carbohydrate, fat, baseGrams: grams, baseKcal: kcal, baseProtein: protein, baseCarbohydrate: carbohydrate, baseFat: fat }));
  return summarizeAnalysis(result);
}
module.exports = { mockAnalysis, summarizeAnalysis };
