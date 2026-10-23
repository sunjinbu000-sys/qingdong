const test=require('node:test'),assert=require('node:assert/strict');
const {setup}=require('./helpers.cjs');
test('food and recipe favorites stay with their owning account',()=>{
 const f=setup(),d=f.domain;f.login();d.toggleFoodFavorite({kind:'foods',id:'coffee'});d.toggleFoodFavorite({kind:'recipes',id:'chickenbowl'});
 let library=d.getFoodLibrary();assert.equal(library.foods.find(x=>x.id==='coffee').favorite,true);assert.equal(library.recipes.find(x=>x.id==='chickenbowl').favorite,true);
 const state=f.store.read();state.session.userId='other-account';f.store.write(state);library=d.getFoodLibrary();assert(!library.foods.some(x=>x.favorite));assert(!library.recipes.some(x=>x.favorite));
 assert.throws(()=>d.toggleFoodFavorite({kind:'foods',id:'missing'}),/不存在/);
});
test('recipe grams use total recipe weight and agree with a one-portion food record',()=>{
 const f=setup(),d=f.domain;f.login();const recipe=d.getFoodLibrary().recipes[0],date=d.getSnapshot().date;
 const portion=d.recordRecipePortion({date,slot:'lunch',recipeId:recipe.id,portions:1});
 const [grams]=d.recordMealBasket({requestId:'recipe-grams',date,slot:'dinner',items:[{recipeId:recipe.id,grams:recipe.totalGrams}]});
 assert.equal(grams.kcal,portion.kcal);assert.equal(grams.protein,portion.protein);assert.equal(grams.carb,portion.carb);
 const [drink]=d.recordMealBasket({requestId:'drink-unit',date,slot:'snack',items:[{foodId:'coffee',grams:250}]});assert.match(drink.name,/250ml$/);assert.equal(drink.kcal,5);
});
