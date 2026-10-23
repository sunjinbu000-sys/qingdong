const test = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers.cjs');

test('unknown photo analysis preserves unknown nutrition and cannot become a zero-calorie diary entry', () => {
  const f = setup(), d = f.domain; f.login();
  const credits = d.getRecognitionAccess().remaining;
  const input = { imagePath: '/owned/unknown.jpg', requestId: 'unknown-photo', slot: 'lunch' };
  const result = d.analyzeFoodPhoto(input);
  assert.equal(result.recognized, false);
  for (const key of ['kcal', 'protein', 'carbohydrate', 'fat', 'pfc']) assert.equal(result[key], null);
  assert.equal(d.getRecognitionAccess().remaining, credits);
  assert.equal(d.getDiary(result.date).meals.length, 0);
  assert.throws(() => d.saveFoodAnalysis(result.id), /未知餐食/);
  assert.equal(d.analyzeFoodPhoto(input).id, result.id);
});

test('analysis draft charges once, recalculates portions, and saves only on explicit idempotent confirmation', () => {
  const f = setup(), d = f.domain; f.login();
  const credits = d.getRecognitionAccess().remaining;
  const input = { imagePath: '/owned/meal.jpg', requestId: 'food-photo', slot: 'dinner', mockScenario: 'meal' };
  const result = d.analyzeFoodPhoto(input);
  assert.equal(result.recognized, true);
  assert.equal(result.kcal, 520);
  assert.equal(d.getDiary(result.date).meals.length, 0);
  assert.equal(d.getRecognitionAccess().remaining, credits - 1);
  assert.equal(d.analyzeFoodPhoto(input).id, result.id);
  assert.equal(d.getRecognitionAccess().remaining, credits - 1);
  const portions = result.ingredients.map(i => i.grams); portions[0] = 100;
  const edited = d.updateFoodAnalysis({ analysisId: result.id, portions });
  assert.equal(edited.kcal, 404);
  assert(Math.abs(edited.pfc.reduce((a, b) => a + b, 0) - 100) < .2);
  const saved = d.saveFoodAnalysis(result.id);
  assert.equal(d.saveFoodAnalysis(result.id).recordId, saved.recordId);
  assert.equal(d.getDiary(result.date).meals.length, 1);
  assert.equal(d.getDiary(result.date).meals[0].kcal, 404);
  assert.equal(d.getRecognitionAccess().remaining, credits - 1);
  assert.throws(() => d.updateFoodAnalysis({ analysisId: result.id, portions: [-1, 100, 150, 8] }), /份量/);
  const state = f.store.read(); state.session.userId = 'other-user'; f.store.write(state);
  assert.throws(() => d.saveFoodAnalysis(result.id), /未知餐食/);
});

test('report meal suggestions reuse the corresponding plan and fall back to allergy-filtered reference meals', () => {
  const f = setup(), d = f.domain; f.login();
  d.saveExtendedProfile({ age: 30, height: 170, initialWeight: 75, restrictions: '鸡蛋' });
  const plan = d.generateAIPlan({ days: 7, lossJin: 0, start: '18:00', end: '18:30', mealStyle: 'home' });
  const suggestions = d.getReportMealSuggestions('2026-10-22');
  assert.equal(suggestions.source, 'plan');
  assert.equal(suggestions.planId, plan.id);
  assert.deepEqual(suggestions.meals, plan.days[1].meals);
  const fallback = d.getReportMealSuggestions('2026-11-01');
  assert.equal(fallback.source, 'reference');
  assert.equal(fallback.meals.length, 3);
  assert(!JSON.stringify(fallback.meals).includes('鸡蛋'));
});

test('report suggestions do not reuse a plan that conflicts with updated profile restrictions', () => {
  const f = setup(), d = f.domain; f.login();
  d.saveExtendedProfile({ age: 30, height: 170, initialWeight: 75 });
  const plan = d.generateAIPlan({ days: 7, lossJin: 0, start: '18:00', end: '18:30' });
  const excluded = plan.days[1].meals[0].ingredients[0].name;
  d.saveExtendedProfile({ restrictions: excluded });
  const suggestions = d.getReportMealSuggestions('2026-10-22');
  assert.equal(suggestions.source, 'reference');
  assert(!suggestions.meals.some(m => m.ingredients.some(i => i.name === excluded)));
});

test('photo history includes unknown and unsaved reports, isolates accounts and never charges for reopening', () => {
  const f = setup(), d = f.domain; f.login();
  const unknown = d.analyzeFoodPhoto({imagePath:'/owned/unknown.jpg',requestId:'history-unknown'});
  const meal = d.analyzeFoodPhoto({imagePath:'/owned/meal.jpg',requestId:'history-meal',mockScenario:'meal'});
  const remaining = d.getRecognitionAccess().remaining;
  assert.equal(d.getFoodAnalysisHistory().length, 2);
  const suggestions = {date:'2026-10-24',meals:[{title:'原建议'}]};
  d.archiveFoodAnalysisSuggestions(meal.id, suggestions);
  d.archiveFoodAnalysisSuggestions(meal.id, {meals:[]});
  assert.deepEqual(d.getFoodAnalysis(meal.id).suggestions,suggestions);
  assert.equal(d.getFoodAnalysis(unknown.id).kcal,null);
  d.saveFoodAnalysis(meal.id);
  assert.equal(d.getFoodAnalysisHistory().length,2);
  assert.equal(d.getRecognitionAccess().remaining,remaining);
  const state=f.store.read();state.session.userId='someone-else';f.store.write(state);
  assert.equal(d.getFoodAnalysisHistory().length,0);
  assert.throws(()=>d.getFoodAnalysis(meal.id),/不存在/);
  assert.throws(()=>d.removeFoodAnalysis(meal.id),/不存在/);
  state.session.userId=meal.userId;f.store.write(state);
  d.removeFoodAnalysis(meal.id);
  assert.equal(d.getFoodAnalysisHistory().length,1);
  assert.equal(d.getDiary(meal.date).meals.length,0);
  assert.throws(()=>d.getFoodAnalysis(meal.id),/不存在/);
});
