const foods={rice:"rice",brownrice:"brown-rice",chicken:"chicken",egg:"egg",milk:"milk",tofu:"tofu",broccoli:"broccoli",tomato:"tomato",cucumber:"cucumber",banana:"banana",apple:"apple",oats:"oats",potato:"potato",oil:"oil",peanut:"peanut",shrimp:"shrimp",coffee:"coffee",latte:"latte",milktea:"milk-tea",milktea0:"milk-tea",lemontea:"lemon-tea",tea:"tea"};
const recipes={chickenbowl:"food-bowl",tofushort:"soup",oatbowl:"oats",eggbowl:"food-bowl"};
function foodIcon(item,tab){
 if(tab==="activities")return "/images/ui/walk.svg";
 const name=(tab==="recipes"?recipes:foods)[item.id];
 if(name)return "/images/foods/"+name+".svg";
 return "/images/ui/"+(tab==="recipes"?"bowl":item.unit==="ml"?"cup":item.group==="蔬果"?"leaf":item.group==="肉蛋奶"?"protein":"bowl")+".svg";
}
module.exports={foodIcon};
