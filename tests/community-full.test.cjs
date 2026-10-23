const test = require("node:test"),
  a = require("node:assert/strict");
const {
  createCommunityDomain,
} = require("../miniprogram-1/miniprogram/services/community-full");
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
