const GROUPS = {
  涉政: ["煽动颠覆国家政权", "恐怖主义宣传", "组织恐怖活动", "分裂国家宣传"],
  色情: ["裸聊", "色情服务", "色情视频", "约炮", "成人视频"],
  暴力: ["杀你全家", "买凶杀人", "制爆教程", "贩卖枪支", "砍死你"],
  辱骂: ["傻逼", "死全家", "狗杂种", "废物东西", "操你妈"],
  广告导流: [
    "加微信",
    "加微",
    "加vx",
    "私聊领红包",
    "刷单返利",
    "代开发票",
    "博彩代理",
  ],
  违规医疗宣传: [
    "包治百病",
    "根治糖尿病",
    "保证瘦",
    "无副作用减肥",
    "七天瘦十斤",
    "祖传秘方包治",
  ],
};
const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{White_Space}\p{P}\p{S}\p{Cf}]/gu, "");
const defaults = () =>
  Object.keys(GROUPS).flatMap((category) =>
    GROUPS[category].map((word, i) => ({
      id: category + i,
      word,
      category,
      source: "内置",
    })),
  );
function parseCSV(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (ch === "," || ch === "\n")) {
      row.push(cell.trim());
      cell = "";
      if (ch === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else if (ch !== "\r") cell += ch;
  }
  if (quoted) throw Error("CSV引号未闭合");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
function createCommunityDomain(c) {
  const init = (s) => {
    s.full = s.full || {};
    s.full.messages = s.full.messages || [];
    s.full.audit = s.full.audit || [];
    return (s.full.community = s.full.community || {
      posts: [
        {
          id: "forum-demo-1",
          userId: "demo-author",
          nickname: "轻友小林",
          city: "杭州",
          title: "把运动变成生活习惯",
          text: "下班后步行三十分钟，今天也认真照顾自己。",
          images: [],
          kind: "生活分享",
          anonymous: false,
          date: "2026-10-20",
          createdAt: "2026-10-20T08:00:00",
          status: "approved",
          likes: [],
          favorites: [],
          comments: [],
          reports: [],
          audit: [],
          recommended: true,
        },
      ],
      words: defaults(),
      blocks: [],
      reminders: { member: false, weight: false, weightTime: "08:00" },
      deleted: false,
    });
  };
  const uid = (s) => s.session && s.session.userId,
    hq = (s) => c.requireRole(s, ["hq"]),
    own = (s, p) => {
      if (p.userId !== c.requireLogin(s)) throw Error("仅作者可以操作");
    },
    find = (s, id) => {
      const p = init(s).posts.find((x) => x.id === id);
      if (!p) throw Error("帖子不存在");
      return p;
    };
  const blocked = (s, user) =>
    init(s).blocks.some(
      (x) =>
        (x.from === uid(s) && x.to === user) ||
        (x.to === uid(s) && x.from === user),
    );
  const check = (s, text) => {
    const hit = init(s).words.find((x) =>
      normalize(text).includes(normalize(x.word)),
    );
    if (hit) throw Error("内容包含违规词语（" + hit.category + "），请修改");
  };
  const view = (s, p) => ({
    ...p,
    author: p.anonymous ? "匿名轻友" : p.nickname || "轻友",
    mine: p.userId === uid(s),
    liked: p.likes.includes(uid(s)),
    favorited: p.favorites.includes(uid(s)),
    likeCount: p.likes.length,
    favoriteCount: p.favorites.length,
    following: !!(uid(s) && (init(s).follows || []).some(f=>f.from===uid(s)&&f.to===p.userId)),
    audit:
      p.userId === uid(s) || (uid(s) && s.full.role === "hq") ? p.audit : [],
    reports: uid(s) && s.full.role === "hq" ? p.reports : [],
    comments: p.comments
      .filter((x) => x.status === "approved" || x.userId === uid(s))
      .map((comment) => ({
        ...comment,
        mine: comment.userId === uid(s),
        anonymous: comment.anonymous !== false,
        author:
          comment.anonymous !== false ? "匿名轻友" : comment.nickname || "轻友",
        nickname:
          comment.anonymous !== false ? "匿名轻友" : comment.nickname || "轻友",
        userId: comment.anonymous !== false ? "" : comment.userId,
      })),
  });
  const visible = (s, p) => p.status === "approved" && !blocked(s, p.userId);
  const notify = (s, userId, title, text) =>
    s.full.messages.push({
      id: c.id("message"),
      userId,
      title,
      text,
      type: "review",
      date: c.today(),
      read: false,
    });
  const validate = (v) => {
    const text = String(v.text || "").trim(),
      images = v.images || [],
      video = v.video || "";
    if (
      text.length > 2000 ||
      (text.length < 5 && !images.length && !video) ||
      typeof video !== "string" || video.length > 1000 || (video && (!video.trim() || images.length > 0)) ||
      !Array.isArray(images) ||
      images.length > 9 ||
      images.some((x) => typeof x !== "string" || !x.trim() || x.length > 1000)
    )
      throw Error("请填写5–2000字，或上传最多9张图片/1个视频，图片和视频不能混用");
    if (v.title && v.title.length > 60) throw Error("标题最多60字");
    return {
      title: String(v.title || "").trim(),
      text,
      images: images.slice(),
      video,
      kind: ["生活分享", "饮食打卡", "运动打卡", "小队打卡", "心情宣发"].includes(v.kind)
        ? v.kind
        : "生活分享",
      anonymous: v.anonymous !== false,
    };
  };
  const api = {
    followForumUser(userId) {
      return c.change(s=>{const from=c.requireLogin(s),d=init(s);if(from===userId)throw Error("不能关注自己");if(!d.posts.some(p=>p.userId===userId&&!p.anonymous&&visible(s,p)))throw Error("暂时无法关注此用户");d.follows=d.follows||[];const index=d.follows.findIndex(f=>f.from===from&&f.to===userId);if(index<0)d.follows.push({from,to:userId});else d.follows.splice(index,1);return {following:index<0};});
    },
    getForumPersonalSummary() {
      const s=c.read(),userId=c.requireLogin(s),d=init(s),follows=d.follows||[];
      const publicPosts=d.posts.filter(p=>p.userId===userId&&p.status==="approved");
      return {userId,nickname:s.profile.nickname||"轻动伙伴",bio:(d.profileBios||{})[userId]||"",following:follows.filter(f=>f.from===userId).length,followers:follows.filter(f=>f.to===userId).length,likes:publicPosts.reduce((n,p)=>n+p.likes.length,0)};
    },
    saveForumBio(value) {
      return c.change(s=>{const userId=c.requireLogin(s),d=init(s);if(typeof value!=="string"||value.trim().length>120)throw Error("简介最多120字");const bio=value.trim();if(bio)check(s,bio);d.profileBios=d.profileBios||{};d.profileBios[userId]=bio;return {bio};});
    },
    getForumRegion() {
      return init(c.read()).localRegion || null;
    },
    saveForumRegion(region) {
      return c.change((s) => {
        if (
          !region ||
          !["map", "gps"].includes(region.source) ||
          !String(region.city || "").trim()
        )
          throw Error("请在地图中确认定位城市");
        const city = String(region.city).trim().replace(/市$/, "");
        if (!/^[\u3400-\u9fff·]{2,20}$/.test(city))
          throw Error("定位城市无效，请重新定位");
        const value = { city, label: city + "市", source: region.source };
        init(s).localRegion = value;
        return value;
      });
    },
    listForumPosts(options = {}) {
      const s = c.read(),
        d = init(s);
      if (["mine", "draft", "liked", "commented", "favorited"].includes(options.mode))
        c.requireLogin(s);
      return d.posts
        .filter((p) =>
          options.mode === "mine"
            ? p.userId === uid(s) && p.status !== "deleted"
            : options.mode === "draft"
              ? p.userId === uid(s) && p.status === "draft"
              : options.mode === "favorited"
                ? visible(s,p) && p.favorites.includes(uid(s))
              : options.mode === "liked"
                ? visible(s, p) && p.likes.includes(uid(s))
                : options.mode === "commented"
                  ? visible(s, p) &&
                    p.comments.some(
                      (x) => x.userId === uid(s) && x.status === "approved",
                    )
                  : visible(s, p),
        )
        .filter((p) => options.feed !== "recommended" || p.recommended === true)
        .filter(
          (p) =>
            options.feed !== "local" ||
            (!!d.localRegion &&
              String(p.city).replace(/市$/, "") === d.localRegion.city),
        )
        .filter((p) => !options.kind || p.kind === options.kind)
        .filter((p) => !options.city || p.city === options.city)
        .sort((a, b) => {
          const timestamp = (p) =>
            typeof p.createdAt === "number"
              ? p.createdAt
              : Date.parse(p.createdAt) || 0;
          const score = (p) =>
            p.likes.length +
            p.comments.filter((x) => x.status === "approved").length;
          return (
            (options.sort === "hot" ? score(b) - score(a) : 0) ||
            timestamp(b) - timestamp(a) ||
            b.id.localeCompare(a.id)
          );
        })
        .map((p) => view(s, p));
    },
    getForumPost(id) {
      const s = c.read(),
        p = find(s, id);
      if (
        !visible(s, p) &&
        p.userId !== uid(s) &&
        !(uid(s) && s.full.role === "hq")
      )
        throw Error("帖子尚未公开");
      return view(s, p);
    },
    createForumPost(v) {
      return c.change((s) => {
        const userId = c.requireCity(s),
          d = init(s);
        if (d.deleted) throw Error("账号已注销");
        const val = validate(v);
        check(s, val.title + " " + val.text);
        const p = {
          ...val,
          id: c.id("post"),
          userId,
          nickname: s.profile.nickname,
          city: d.localRegion ? d.localRegion.city : s.profile.city,
          date: c.today(),
          createdAt: c.now(),
          status: v.draft ? "draft" : "pending",
          likes: [],
          favorites: [],
          comments: [],
          reports: [],
          audit: [],
          recommended: false,
        };
        d.posts.push(p);
        return view(s, p);
      });
    },
    editForumPost(id, v) {
      return c.change((s) => {
        const p = find(s, id);
        if (p.userId !== c.requireLogin(s)) hq(s);
        if (["deleted", "withdrawn"].includes(p.status))
          throw Error("内容不可编辑");
        const val = validate(v);
        check(s, val.title + " " + val.text);
        p.audit.push({
          date: c.today(),
          note: "作者编辑重新送审",
          status: p.status,
        });
        Object.assign(p, val, {
          status: v.draft ? "draft" : "pending",
          recommended: false,
        });
        return view(s, p);
      });
    },
    withdrawForumPost(id) {
      return c.change((s) => {
        const p = find(s, id);
        own(s, p);
        p.status = "withdrawn";
        return p;
      });
    },
    deleteForumPost(id) {
      return c.change((s) => {
        const p = find(s, id);
        own(s, p);
        p.status = "deleted";
        p.text = "";
        p.images = [];
        p.video = "";
        return { deleted: true };
      });
    },
    commentForumPost(id, value, parentId, anonymous = true) {
      return c.change((s) => {
        const userId = c.requireLogin(s),
          p = find(s, id);
        if (!visible(s, p)) throw Error("仅可评论公开帖子");
        const text = c.text(value, "评论", 500);
        check(s, text);
        if (
          parentId &&
          !p.comments.some((x) => x.id === parentId && x.status === "approved")
        )
          throw Error("回复对象不存在");
        p.comments.push({
          id: c.id("comment"),
          userId,
          nickname: s.profile.nickname,
          anonymous: anonymous !== false,
          text,
          date: c.today(),
          status: "approved",
          parentId: parentId || "",
        });
        return view(s, p);
      });
    },
    deleteForumComment(id, commentId) {
      return c.change((s) => {
        const p = find(s, id),
          comment = p.comments.find((x) => x.id === commentId);
        if (!comment) throw Error("评论不存在");
        if (comment.userId !== c.requireLogin(s)) hq(s);
        comment.status = "deleted";
        return view(s, p);
      });
    },
    reportForumPost(id, reason) {
      return c.change((s) => {
        const userId = c.requireLogin(s),
          p = find(s, id);
        if (!visible(s, p)) throw Error("内容不可举报");
        if (
          p.reports.some((x) => x.userId === userId && x.status === "pending")
        )
          throw Error("已举报，请等待处理");
        p.reports.push({
          id: c.id("report"),
          userId,
          reason: c.text(reason, "举报原因", 200),
          date: c.today(),
          status: "pending",
        });
        return { reported: true };
      });
    },
    moderateForumPost(id, status, note) {
      return c.change((s) => {
        hq(s);
        const p = find(s, id);
        if (
          !["approved", "rejected"].includes(status) ||
          ["deleted", "withdrawn", "draft"].includes(p.status) ||
          p.status === status
        )
          throw Error("审核状态无效");
        note = c.text(note, "审核说明", 200);
        if (note.length < 4) throw Error("审核说明至少4字");
        p.status = status;
        if (status === "approved" && c.evidence)
          c.evidence(s, "forum", p.id, p.userId);
        p.audit.push({ status, note, date: c.today() });
        if (c.audit) c.audit(s, "论坛审核", id + " " + status + " " + note);
        else
          s.full.audit.push({
            id: c.id("audit"),
            action: "论坛审核",
            detail: id + " " + status + " " + note,
            date: c.today(),
          });
        notify(
          s,
          p.userId,
          status === "approved" ? "帖子审核通过" : "帖子审核未通过",
          note,
        );
        return view(s, p);
      });
    },
    listModeration() {
      const s = c.read();
      init(s);
      hq(s);
      return {
        posts: init(s).posts.map((p) => view(s, p)),
        audit: s.full.audit,
      };
    },
    resolveForumReport(postId, reportId, result) {
      return c.change((s) => {
        hq(s);
        const p = find(s, postId),
          r = p.reports.find((x) => x.id === reportId);
        if (!r || r.status !== "pending") throw Error("举报已处理或不存在");
        r.status = "resolved";
        r.result = c.text(result, "处理结论", 200);
        notify(s, r.userId, "举报处理反馈", r.result);
        return r;
      });
    },
    recommendForumPost(id) {
      return c.change((s) => {
        hq(s);
        const p = find(s, id);
        if (p.status !== "approved") throw Error("仅可推荐公开内容");
        p.recommended = !p.recommended;
        return p;
      });
    },
    getPublicProfile(userId) {
      const s = c.read(),
        posts = init(s).posts.filter(
          (p) => p.userId === userId && visible(s, p) && !p.anonymous,
        );
      return {
        userId,
        nickname: posts[0]?.nickname || "轻友",
        posts: posts.map((p) => view(s, p)),
        blocked: blocked(s, userId),
      };
    },
    blockForumUser(userId) {
      return c.change((s) => {
        const from = c.requireLogin(s),
          d = init(s);
        if (!userId || from === userId) throw Error("不能拉黑本人");
        const i = d.blocks.findIndex((x) => x.from === from && x.to === userId);
        if (i < 0) d.blocks.push({ from, to: userId });
        else d.blocks.splice(i, 1);
        return { blocked: i < 0 };
      });
    },
    getWordSettings() {
      const s = c.read(),
        d = init(s);
      hq(s);
      return { categories: Object.keys(GROUPS), entries: d.words };
    },
    saveWord(v) {
      return c.change((s) => {
        hq(s);
        const d = init(s),
          word = c.text(v.word, "词语", 60);
        if (!normalize(word)) throw Error("请输入有效词语");
        if (!GROUPS[v.category]) throw Error("分类无效");
        if (
          d.words.some(
            (x) => x.id !== v.id && normalize(x.word) === normalize(word),
          )
        )
          throw Error("词语已存在");
        let entry = v.id && d.words.find((x) => x.id === v.id);
        if (v.id && !entry) throw Error("词语不存在");
        if (!entry) {
          if (d.words.length >= 5000) throw Error("词库最多5000条");
          entry = { id: c.id("word") };
          d.words.push(entry);
        }
        Object.assign(entry, { word, category: v.category, source: "自定义" });
        return entry;
      });
    },
    deleteWord(id) {
      return c.change((s) => {
        hq(s);
        const d = init(s);
        if (!d.words.some((x) => x.id === id)) throw Error("词语不存在");
        d.words = d.words.filter((x) => x.id !== id);
        return { deleted: true };
      });
    },
    restoreWords() {
      return c.change((s) => {
        hq(s);
        init(s).words = defaults();
        return { restored: true };
      });
    },
    importWords(value, category) {
      return c.change((s) => {
        hq(s);
        const d = init(s);
        if (typeof value !== "string" || value.length > 200000)
          throw Error("最多200KB文本");
        const rows = parseCSV(value.replace(/^\uFEFF/, ""));
        if (rows[0] && rows[0][0] === "词语") rows.shift();
        if (!rows.length || rows.length > 1000) throw Error("每批1–1000行");
        const entries = rows.map((r) => ({
          word: r[0],
          category: r[1] || category,
        }));
        if (
          entries.some(
            (e, i) =>
              !normalize(e.word) ||
              e.word.length > 60 ||
              !GROUPS[e.category] ||
              rows[i].length > 2,
          )
        )
          throw Error("导入格式或分类无效，本批未导入");
        const keys = new Set(d.words.map((x) => normalize(x.word))),
          add = [];
        entries.forEach((e) => {
          const k = normalize(e.word);
          if (!keys.has(k)) {
            keys.add(k);
            add.push({ ...e, id: c.id("word"), source: "批量导入" });
          }
        });
        if (d.words.length + add.length > 5000) throw Error("词库最多5000条");
        d.words.push(...add);
        return { added: add.length, skipped: entries.length - add.length };
      });
    },
    getPersonalServices() {
      const s = c.read(),
        userId = c.requireLogin(s),
        d = init(s);
      return {
        orders: (s.full.orders || []).filter(
          (x) => (x.userId || x.user) === userId,
        ),
        messages: s.full.messages.filter(
          (x) => !x.userId || x.userId === userId,
        ),
        favorites: d.posts
          .filter((p) => visible(s, p) && p.favorites.includes(userId))
          .map((p) => view(s, p)),
        blocks: d.blocks.filter((x) => x.from === userId),
        reminders: d.reminders,
        grants: s.grants || [],
        deleted: d.deleted,
      };
    },
    readMessage(id) {
      return c.change((s) => {
        const userId = c.requireLogin(s);
        init(s);
        s.full.messages
          .filter(
            (x) => (!x.userId || x.userId === userId) && (!id || x.id === id),
          )
          .forEach((x) => {
            x.read = true;
          });
        return { read: true };
      });
    },
    saveReminders(v) {
      return c.change((s) => {
        c.requireLogin(s);
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.weightTime || ""))
          throw Error("提醒时间无效");
        return (init(s).reminders = {
          member: !!v.member,
          weight: !!v.weight,
          weightTime: v.weightTime,
        });
      });
    },
    deleteCommunityAccount(confirmation) {
      return c.change((s) => {
        const userId = c.requireLogin(s),
          d = init(s);
        if (confirmation !== "确认注销") throw Error("请输入确认注销");
        d.posts = d.posts.filter((p) => p.userId !== userId);
        d.posts.forEach((p) => {
          p.comments = p.comments.filter((x) => x.userId !== userId);
          p.likes = p.likes.filter((x) => x !== userId);
          p.favorites = p.favorites.filter((x) => x !== userId);
        });
        d.blocks = d.blocks.filter((x) => x.from !== userId && x.to !== userId);
        d.follows = (d.follows || []).filter(f => f.from !== userId && f.to !== userId);
        if(d.profileBios)delete d.profileBios[userId];
        s.full.foodFavorites=(s.full.foodFavorites||[]).filter(x=>x.userId!==userId);
        if(s.full.ads)s.full.ads.startupReceipts=(s.full.ads.startupReceipts||[]).filter(x=>x.userId!==userId);
        d.deleted = true;
        s.full.messages = s.full.messages.filter(
          (x) => x.userId && x.userId !== userId,
        );
        s.full.orders = (s.full.orders || []).filter(
          (x) => (x.userId || x.user) !== userId,
        );
        for (const key of ["records", "checkins", "grants", "recognitions"])
          if (Array.isArray(s[key]))
            s[key] = s[key].filter((x) => x.userId && x.userId !== userId);
        s.privacy = { publicRank: false, showPosterWeight: false };
        s.profile = { nickname: "已注销用户", city: "" };
        s.session = null;
        s.full.accountDeleted = true;
        return { deleted: true };
      });
    },
  };
  for (const [name, key] of [
    ["likeForumPost", "likes"],
    ["favoriteForumPost", "favorites"],
  ])
    api[name] = (id) =>
      c.change((s) => {
        const userId = c.requireLogin(s),
          p = find(s, id);
        if (!visible(s, p)) throw Error("仅可操作公开帖子");
        const i = p[key].indexOf(userId);
        if (i < 0) p[key].push(userId);
        else p[key].splice(i, 1);
        return view(s, p);
      });
  return api;
}
module.exports = { createCommunityDomain };
