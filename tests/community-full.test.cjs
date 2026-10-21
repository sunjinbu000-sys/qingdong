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
