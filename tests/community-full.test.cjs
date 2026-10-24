const test = require("node:test"),
  a = require("node:assert/strict");
const {
  createCommunityDomain,
} = require("../miniprogram-1/miniprogram/services/community-full");
test("personal relation lists match counts and allow following a fan without public posts",()=>{
 const {api,s}=fixture();api.listForumPosts();
 const own=api.createForumPost({title:"我的改变",text:"今天认真记录自己的小改变",anonymous:false});s.full.role="hq";api.moderateForumPost(own.id,"approved","内容审核通过");
 api.followForumUser("demo-author");s.session.userId="fan";s.full.users={fan:{nickname:"小河",weight:99}};api.followForumUser("me");api.likeForumPost(own.id);s.session.userId="me";
 api.likeForumPost("forum-demo-1");
 const following=api.getForumRelations("following"),fans=api.getForumRelations("followers"),likes=api.getForumRelations("likes");
 a.equal(following.total,1);a.equal(following.rows[0].userId,"demo-author");a.equal(fans.rows[0].nickname,"小河");a.equal(fans.rows[0].canFollow,true);
 a.equal(likes.rows[0].postId,own.id);a.equal(likes.rows[0].postTitle,"我的改变");a.equal(JSON.stringify(fans).includes('"weight"'),false);
 const summary=api.getForumPersonalSummary();a.equal(summary.following,following.total);a.equal(summary.followers,fans.total);a.equal(summary.likes,likes.total);
 a.equal(api.followForumUser("fan").following,true);a.equal(api.getForumRelations("followers").rows[0].following,true);
 a.equal(api.followForumUser("fan").following,false);
 api.blockForumUser("fan");a.equal(api.getForumRelations("followers").total,0);a.equal(api.getForumRelations("likes").total,0);a.equal(api.getForumPersonalSummary().likes,0);
 s.session=null;a.throws(()=>api.getForumRelations("followers"),/登录/);
});
test("received likes exclude pending posts and never derive identities from anonymous posts",()=>{
 const {api,s}=fixture();api.listForumPosts();
 const publicPost=api.createForumPost({text:"我的公开日常记录",anonymous:false});s.full.role="hq";api.moderateForumPost(publicPost.id,"approved","内容审核通过");
 const pending=api.createForumPost({text:"尚未公开的个人内容",anonymous:false});
 s.session.userId="fan";s.profile.nickname="匿名笔记的作者名字";const anon=api.createForumPost({text:"不应暴露的匿名笔记内容",anonymous:true});api.moderateForumPost(anon.id,"approved","内容审核通过");api.likeForumPost(publicPost.id);
 s.full.community.posts.find(p=>p.id===pending.id).likes.push("fan");s.session.userId="me";s.profile.nickname="小满";
 const data=api.getForumRelations("likes");a.equal(data.total,1);a.equal(data.rows[0].nickname,"轻友");a.equal(data.rows[0].canFollow,false);a.equal(JSON.stringify(data).includes("匿名笔记"),false);
});
function fixture() {
  let s = {
      session: { userId: "me" },
      profile: { nickname: "小满", city: "杭州" },
      grants: [],
      records: [],
    },
    n = 0;
  return {
    s,
    api: createCommunityDomain({
      read: () => s,
      change: (f) => f(s),
      today: () => "2026-10-21",
      now: () => "2026-10-21T08:00:00",
      id: (p) => p + ++n,
      requireLogin: (s) => {
        if (!s.session) throw Error("登录");
        return s.session.userId;
      },
      requireCity: (s) => s.session.userId,
      requireRole: (s, r) => {
        if (!r.includes(s.full?.role || "consumer")) throw Error("权限");
      },
      text: (v, l, m) => {
        v = String(v || "").trim();
        if (!v || v.length > m) throw Error(l);
        return v;
      },
    }),
  };
}
test("private pending, moderation, interactions, edit and forbidden word", () => {
  const { api, s } = fixture(),
    p = api.createForumPost({ text: "今天坚持健康饮食" });
  a.equal(api.listForumPosts().length, 1);
  a.throws(() => api.moderateForumPost(p.id, "approved", "审核全部通过"));
  s.full.role = "hq";
  api.moderateForumPost(p.id, "approved", "审核全部通过");
  a.equal(api.listForumPosts().length, 2);
  api.likeForumPost(p.id);
  api.favoriteForumPost(p.id);
  a.equal(api.getPersonalServices().favorites.length, 1);
  a.throws(() => api.commentForumPost(p.id, "加VX领券"));
  api.commentForumPost(p.id, "一起坚持");
  api.editForumPost(p.id, { text: "修改后继续健康饮食" });
  a.equal(api.listForumPosts().length, 1);
});

test("forum feeds separate recommendations, location and private interaction lists", () => {
  const { api, s } = fixture();
  const pending = api.createForumPost({
    text: "审核后才可以公开的文章",
    kind: "生活分享",
  });
  a.equal(
    api
      .listForumPosts({ feed: "recommended" })
      .some((p) => p.id === pending.id),
    false,
  );
  a.equal(api.listForumPosts({ feed: "local" }).length, 0);
  api.saveForumRegion({ city: "温州市", district: "鹿城区", source: "map" });
  a.equal(api.getForumRegion().city, "温州");
  a.equal(s.profile.city, "杭州");
  a.equal(api.listForumPosts({ feed: "local" }).length, 0);
  api.saveForumRegion({ city: "杭州市", source: "map" });
  a.equal(api.listForumPosts({ feed: "local" }).length, 1);
  api.likeForumPost("forum-demo-1");
  api.commentForumPost("forum-demo-1", "这是我评论过的文章");
  a.deepEqual(
    api.listForumPosts({ mode: "liked" }).map((p) => p.id),
    ["forum-demo-1"],
  );
  a.deepEqual(
    api.listForumPosts({ mode: "commented" }).map((p) => p.id),
    ["forum-demo-1"],
  );
  a.equal(
    api.listForumPosts({ mode: "mine" }).some((p) => p.id === pending.id),
    true,
  );
  s.full.role = "hq";
  api.moderateForumPost(pending.id, "approved", "文字图片审核通过");
  a.equal(
    api
      .listForumPosts({ feed: "recommended" })
      .some((p) => p.id === pending.id),
    false,
  );
  api.recommendForumPost(pending.id);
  a.equal(
    api
      .listForumPosts({ feed: "recommended" })
      .some((p) => p.id === pending.id),
    true,
  );
  api.editForumPost("forum-demo-1", {
    text: "内容修改后需要重新审核",
    kind: "运动打卡",
  });
  a.equal(api.listForumPosts({ mode: "liked" }).length, 0);
  a.equal(api.listForumPosts({ mode: "commented" }).length, 0);
  s.session = null;
  a.throws(() => api.listForumPosts({ mode: "liked" }), /登录/);
});
test("word imports validate atomically and dedupe", () => {
  const { api, s } = fixture();
  s.full = { role: "hq" };
  a.equal(api.importWords("测试词,辱骂\n测试词,辱骂").added, 1);
  a.throws(() => api.importWords("新词,未知"));
  api.restoreWords();
  a.ok(api.getWordSettings().entries.length > 20);
});
test("draft and anonymous profiles stay private, blocks hide approved posts", () => {
  const { api, s } = fixture();
  const draft = api.createForumPost({
    text: "今天继续认真记录",
    draft: true,
    anonymous: false,
  });
  a.equal(api.listForumPosts({ mode: "draft" }).length, 1);
  a.equal(api.getPublicProfile("me").posts.length, 0);
  s.session = { userId: "other" };
  a.throws(() => api.getForumPost(draft.id));
  api.blockForumUser("demo-author");
  a.equal(api.listForumPosts().length, 0);
  api.blockForumUser("demo-author");
  a.equal(api.listForumPosts().length, 1);
});
test("personal services consume real orders and reminders validate, deletion confirmation enforced", () => {
  const { api, s } = fixture();
  api.listForumPosts();
  s.full.orders = [
    { id: "order1", userId: "me" },
    { id: "order2", userId: "other" },
  ];
  s.full.messages = [
    { id: "m1", userId: "me", read: false },
    { id: "m2", userId: "other", read: false },
  ];
  a.equal(api.getPersonalServices().orders.length, 1);
  api.readMessage();
  a.equal(s.full.messages[0].read, true);
  a.equal(s.full.messages[1].read, false);
  a.throws(() => api.saveReminders({ weightTime: "25:00" }));
  api.saveReminders({ weight: true, member: true, weightTime: "08:30" });
  a.equal(api.getPersonalServices().reminders.weightTime, "08:30");
  a.throws(() => api.deleteCommunityAccount(""));
  api.deleteCommunityAccount("确认注销");
  a.equal(s.session, null);
  a.equal(s.full.accountDeleted, true);
  a.equal(s.full.orders.length, 1);
});
test("word normalization prevents punctuation and format bypass", () => {
  const { api, s } = fixture();
  s.full = { role: "hq" };
  a.throws(() => api.commentForumPost("forum-demo-1", "加 v-X 联系"));
  a.throws(() => api.saveWord({ word: "加 V.X", category: "广告导流" }));
  a.throws(() => api.saveWord({ word: "!!", category: "辱骂" }));
  a.equal(api.importWords("ABC,辱骂\na.b c,辱骂").added, 1);
});
test("CSV quoted cells import and malformed batch leaves words unchanged", () => {
  const { api, s } = fixture();
  s.full = { role: "hq" };
  const before = api.getWordSettings().entries.length;
  a.equal(api.importWords('"合法自定义词","辱骂"').added, 1);
  a.throws(() => api.importWords('"未闭合,辱骂'));
  a.equal(api.getWordSettings().entries.length, before + 1);
});
test("comments and replies default anonymous, explicit opt out exposes author", () => {
  const { api, s } = fixture();
  let p = api.commentForumPost("forum-demo-1", "匿名记录生活");
  const first = p.comments.at(-1);
  a.equal(first.anonymous, true);
  a.equal(first.nickname, "匿名轻友");
  a.equal(first.author, "匿名轻友");
  a.equal(first.userId, "");
  a.equal(s.full.community.posts[0].comments[0].nickname, "小满");
  p = api.commentForumPost("forum-demo-1", "公开一起坚持", first.id, false);
  const reply = p.comments.at(-1);
  a.equal(reply.anonymous, false);
  a.equal(reply.author, "小满");
  a.equal(reply.userId, "me");
  a.equal(reply.parentId, first.id);
  p = api.commentForumPost("forum-demo-1", "再次匿名回复", reply.id);
  a.equal(p.comments.at(-1).author, "匿名轻友");
  a.equal(p.comments.at(-1).parentId, reply.id);
});
test("native comment composer defaults anonymous and anonymous author cannot navigate", () => {
  let definition;
  global.Page = (value) => {
    definition = value;
  };
  const file = require.resolve(
    "../miniprogram-1/miniprogram/pages/forum-detail/index.js",
  );
  delete require.cache[file];
  require(file);
  a.equal(definition.data.anonymousComment, true);
  let navigated = false;
  global.wx = {
    navigateTo: () => {
      navigated = true;
    },
  };
  definition.commentAuthor({
    currentTarget: { dataset: { anonymous: true, user: "secret-user" } },
  });
  a.equal(navigated, false);
  const local = {
    data: { anonymousComment: true },
    setData(updates) {
      Object.assign(this.data, updates);
    },
  };
  definition.commentAnonymous.call(local, { detail: { value: false } });
  a.equal(local.data.anonymousComment, false);
});

test("forum composer video persists through draft and review with exclusive media types", () => {
  const {api} = fixture();
  const draft = api.createForumPost({text:"",video:"/owned/forum.mp4",kind:"运动打卡",draft:true});
  a.equal(draft.status,"draft");
  a.equal(draft.video,"/owned/forum.mp4");
  const pending = api.editForumPost(draft.id,{text:"今天一起轻松动一动",video:draft.video,kind:"运动打卡"});
  a.equal(pending.status,"pending");
  a.equal(pending.kind,"运动打卡");
  a.equal(pending.video,draft.video);
  a.throws(()=>api.createForumPost({text:"分享今天的运动日常",video:"/owned/forum.mp4",images:["/owned/photo.jpg"]}),/不能混用/);
  api.deleteForumPost(draft.id);
  a.equal(api.getForumPost(draft.id).video,"");
});

test("mood topic remains its own category when saved and edited", () => {
  const {api}=fixture();
  const post=api.createForumPost({text:"今天给自己一点快乐",kind:"心情宣发",draft:true});
  a.equal(post.kind,"心情宣发");
  a.equal(api.editForumPost(post.id,{text:"今天也要好好照顾自己",kind:"心情宣发"}).kind,"心情宣发");
});

test("forum accepts nine ordered images and rejects a tenth", () => {
  const {api}=fixture(),images=Array.from({length:9},(_,i)=>"/owned/"+i+".jpg");
  const p=api.createForumPost({images,kind:"生活分享",text:""});
  a.deepEqual(p.images,images);
  a.throws(()=>api.createForumPost({images:images.concat("/owned/10.jpg"),text:"",kind:"生活分享"}),/最多9/);
});

test("real-name public authors can be followed while anonymous authors stay private", () => {
 const {api,s}=fixture();const p=api.createForumPost({text:"分享今日健康的小日常",kind:"生活分享",anonymous:false});
 s.full.role="hq";api.moderateForumPost(p.id,"approved","完整内容审核通过");s.session.userId="reader";
 a.equal(api.followForumUser("me").following,true);a.equal(api.getForumPost(p.id).following,true);a.equal(api.followForumUser("me").following,false);
 s.session.userId="me";const anon=api.createForumPost({text:"匿名分享自己的小日常",kind:"生活分享",anonymous:true});api.moderateForumPost(anon.id,"approved","完整内容审核通过");
 a.throws(()=>api.followForumUser("me"),/自己/);
});

test("forum personal counts, biography and collection are based on the signed-in user", () => {
 const {api,s}=fixture();const own=api.createForumPost({title:"日常笔记",text:"今天也认真吃饭记录",kind:"生活分享",anonymous:false});s.full.role="hq";api.moderateForumPost(own.id,"approved","完整内容审核通过");api.saveForumBio("记录生活的小改变");
 s.session.userId="reader";s.profile.nickname="另一位轻友";api.favoriteForumPost(own.id);api.likeForumPost(own.id);api.followForumUser("me");
 a.equal(api.listForumPosts({mode:"favorited"})[0].id,own.id);a.equal(api.getForumPersonalSummary().following,1);a.equal(api.getForumPersonalSummary().bio,"");
 s.session.userId="me";const summary=api.getForumPersonalSummary();a.equal(summary.followers,1);a.equal(summary.likes,1);a.equal(summary.bio,"记录生活的小改变");a.equal(api.listForumPosts({mode:"favorited"}).length,0);
 a.throws(()=>api.saveForumBio("a".repeat(121)),/120/);
});
