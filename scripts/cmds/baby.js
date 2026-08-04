const axios = require("axios");

const toru = (
  process.env.HRIDoy_API_URL ||
  process.env.TORU_API_URL ||
  "https://hridoy-api.onrender.com"
).replace(/\/+$/, "");

const TORU_SECRET = process.env.TORU_BOT_SECRET || "";
const MATCH_THRESHOLD = 0.7;

const typing = async (api, threadID, ms = 3000) => {
  try {
    if (typeof api.sendTypingIndicator === "function") {
      await api.sendTypingIndicator(threadID, true);
      await new Promise(resolve => setTimeout(resolve, ms));
      await api.sendTypingIndicator(threadID, false);
    }
  } catch {}
};

const spamMap = new Map();
const SPAM_LIMIT = 5;
const SPAM_WINDOW = 8000;
const SPAM_MUTE = 15000;

const isSpamming = (senderID) => {
  const now = Date.now();
  const entry = spamMap.get(senderID) || { hits: [], mutedUntil: 0 };

  if (entry.mutedUntil > now) return true;

  entry.hits = entry.hits.filter(t => now - t < SPAM_WINDOW);
  entry.hits.push(now);

  if (entry.hits.length >= SPAM_LIMIT) {
    entry.mutedUntil = now + SPAM_MUTE;
    entry.hits = [];
    spamMap.set(senderID, entry);
    return true;
  }

  spamMap.set(senderID, entry);
  return false;
};

function isUsable(text, prefix) {
  if (!text || typeof text !== "string") return false;

  const trimmed = text.trim();

  if (!trimmed) return false;
  if (prefix && trimmed.startsWith(prefix)) return false;
  if (trimmed.length > 500) return false;

  return true;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function similarity(a, b) {
  const x = (a || "").toLowerCase().trim();
  const y = (b || "").toLowerCase().trim();

  if (!x.length && !y.length) return 1;

  const maxLen = Math.max(x.length, y.length);
  if (maxLen === 0) return 1;

  return 1 - levenshtein(x, y) / maxLen;
}

async function findBestMatch(query) {
  try {
    const res = await axios.get(
      `${toru}/api/qa`,
      { params: { search: query }, timeout: 12000 }
    );

    const items = Array.isArray(res.data)
      ? res.data
      : (res.data?.data || []);

    let best = null;
    let bestScore = 0;

    for (const it of items) {
      const score = similarity(query, it.question);
      if (score > bestScore) {
        bestScore = score;
        best = it;
      }
    }

    return best ? { item: best, score: bestScore } : null;
  } catch {
    return null;
  }
}

async function findExactItem(ask, answerFilter) {
  try {
    const res = await axios.get(
      `${toru}/api/qa`,
      { params: { search: ask }, timeout: 12000 }
    );

    const items = Array.isArray(res.data)
      ? res.data
      : (res.data?.data || []);

    const askNorm = ask.trim().toLowerCase();
    const ansNorm = answerFilter.trim().toLowerCase();

    return (
      items.find(
        it =>
          String(it.question || "").trim().toLowerCase() === askNorm &&
          String(it.answer || "").trim().toLowerCase() === ansNorm
      ) || null
    );
  } catch {
    return null;
  }
}

async function autoLearnFromReply(question, answer) {
  try {
    await axios.post(
      `${toru}/api/learn`,
      { question, answer, secret: TORU_SECRET },
      { timeout: 12000, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(
      "Baby auto-learn gateway error:",
      err.response?.data?.error || err.response?.data?.message || err.message
    );
  }
}

async function getSmartReply(query, threadID) {
  const match = await findBestMatch(query);

  if (match && match.score >= MATCH_THRESHOLD) {
    return match.item.answer;
  }

  const res = await axios.post(
    `${toru}/api/chat`,
    { message: query, sessionId: `fb-${threadID}` },
    { timeout: 20000 }
  );

  return res.data?.reply || "Hmm, bujhi nai baby 😅";
}

const PREFIX_TRIGGERS = [
  "toru ", "toruchan ", "tori ", "bot ",
  "তরু", "বট", "jan", "জান", "বেবি", "baby "
];

const FUNNY_REPLIES = [
  "Bolo baby 💖",
  "Hea, ki khobor? 😚",
  "Yes I'm here 😘",
  "Ki lagbe bolo 🥰",
  "𝐀𝐬𝐬𝐚𝐥𝐚𝐦𝐮 𝐰𝐚𝐥𝐚𝐢𝐤𝐮𝐦 ♥",
  "বলেন sir__😌",
  "𝐁𝐨𝐥𝐨 𝐣𝐚𝐧 𝐤𝐢 𝐤𝐨𝐫𝐭𝐞 𝐩𝐚𝐫𝐢 𝐭𝐨𝐦𝐫 𝐣𝐨𝐧𝐧𝐨 🐸",
  "𝐋𝐞𝐛𝐮 𝐤𝐡𝐚𝐰 𝐝𝐚𝐤𝐭𝐞 𝐝𝐚𝐤𝐭𝐞 𝐭𝐨 𝐡𝐚𝐩𝐚𝐲 𝐠𝐞𝐬𝐨.🫴🍋",
  "𝐆𝐚𝐧𝐣𝐚 𝐤𝐡𝐚 𝐦𝐚𝐧𝐮𝐬𝐡 𝐡𝐨 🍁",
  "মদ খাও মানুষ হও 🍷",
  "𝐋𝐞𝐦𝐨𝐧 𝐭𝐮𝐬 🍋",
  "মুড়ি খাও 🫥",
  "𝐚𝐦𝐤𝐞 𝐬𝐞𝐫𝐞 𝐝𝐞𝐰 𝐚𝐦𝐢 𝐚𝐦𝐦𝐮𝐫 𝐤𝐚𝐬𝐞 𝐣𝐚𝐛𝐨!!🥺.....😗",
  "অন্যকে নই, নিজেকে ভালোবাসতে শিখো প্রিয় 😌",
  "একা বাঁচতে শিখো দেখবে পৃথিবী অনেক সুন্দর ✨",
  "──‎ 𝐇𝐮𝐌..? 👉👈",
  "আম গাছে আম নাই ঢিল কেন মারো, তোমার সাথে প্রেম নাই বেবি কেন ডাকো 😒🐸",
  "কি হলো, মিস টিস করচ্ছো নাকি 🤣",
  "𝐓𝐫𝐮𝐬𝐭 𝐦𝐞 𝐢𝐚𝐦 𝐭𝐨𝐫𝐮 𝐟𝐫𝐨𝐦 𝐇𝐫 𝐢𝐝 𝐨𝐲🧃",
  "𝗛𝗲𝘆 𝘅𝗮𝗻 𝗶𝗮𝗺 𝘁𝗼𝗿𝘂 𝗰𝗵𝗮𝗻✨",
  "𝐓𝐨𝐫 𝐣𝐧𝐧𝐨 𝐛𝐬𝐢 𝐚𝐜𝐡𝐢, 𝐣𝐥𝐝𝐢 𝐛𝐨𝐥 𝐤𝐢 𝐝𝐫𝐤𝐚𝐫 ✨",
  "একাকিত্ব মানুষকে ধীরে ধীরে শেষ করে ফেলে🥀",
  "চা খাবেন ,ঢেলে দেবো..?😙🤏",
  "𝙜𝙤𝙥 𝙜𝙤𝙥 𝙜𝙤𝙥 🙊"
];

module.exports = {
  config: {
    name: "BabyAi",
    version: "2.2.0",
    author: "Hridoy",
    countDown: 0,
    role: 0,
    shortDescription: "Toru Chan AI — HR ID OY Gateway",
    longDescription:
      "Teachable TORU AI with fuzzy-match replies and noprefix chat.",
    category: "System",
    guide: {
      en:
        "{p}baby [message]\n" +
        "{p}baby teach [q] - [a]\n" +
        "{p}baby autoteach on/off\n" +
        "{p}baby list\n" +
        "{p}baby msg [trigger]\n" +
        "{p}baby edit [q] - [old] - [new]\n" +
        "{p}baby remove/rm [q] - [a]"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const senderID = event.senderID;

    if (senderID === api.getCurrentUserID()) return;
    if (isSpamming(senderID)) return;

    const threadID = event.threadID;
    const rawArgs = args.join(" ").trim();
    const sub = (args[0] || "").toLowerCase();

    try {
      if (!rawArgs) {
        await typing(api, threadID, 1500);

        return message.reply(
          FUNNY_REPLIES[Math.floor(Math.random() * FUNNY_REPLIES.length)]
        );
      }

      if (sub === "autoteach") {
        const mode = (args[1] || "").toLowerCase();

        if (!["on", "off"].includes(mode)) {
          return message.reply("Use: baby autoteach on/off");
        }

        const status = mode === "on";

        const res = await axios.post(
          `${toru}/api/setting`,
          { autoTeach: status, secret: TORU_SECRET },
          { timeout: 12000 }
        );

        if (!res.data?.success) {
          return message.reply(
            res.data?.error || res.data?.message || "❌ Change kora jayni."
          );
        }

        return message.reply(`✅ Auto Teach ekhon ${status ? "ON 🟢" : "OFF 🔴"}`);
      }

      if (sub === "list") {
        const res = await axios.get(`${toru}/api/status`, { timeout: 12000 });
        const d = res.data || {};

        return message.reply(
`╭─╼🌟 𝐓𝐨𝐫𝐮 𝐀𝐈 𝐒𝐭𝐚𝐭𝐮𝐬
├ 📝 𝐓𝐞𝐚𝐜𝐡𝐞𝐝 𝐐𝐮𝐞𝐬𝐭𝐢𝐨𝐧𝐬: ${d.teachedQuestions || 0}
├ 📦 𝐒𝐭𝐨𝐫𝐞𝐝 𝐑𝐞𝐩𝐥𝐢𝐞𝐬: ${d.storedReplies || 0}
├ 🔁 𝐀𝐮𝐭𝐨 𝐓𝐞𝐚𝐜𝐡: ${d.autoTeach ? "ON 🟢" : "OFF 🔴"}
╰─╼👤 𝐃𝐞𝐯: ${d.developer || "Toru"}`
        );
      }

      if (sub === "msg") {
        const trigger = args.slice(1).join(" ").trim();

        if (!trigger) {
          return message.reply("Use: baby msg [trigger]");
        }

        const res = await axios.get(
          `${toru}/api/qa`,
          { params: { search: trigger }, timeout: 12000 }
        );

        const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);

        if (!items.length) {
          return message.reply("❌ Ei trigger-er kono answer paoa jayni.");
        }

        const formatted = items
          .slice(0, 15)
          .map((it, i) => `➤ ${i + 1}. [${it.question}] → ${it.answer}`)
          .join("\n");

        return message.reply(
`📌 𝗧𝗿𝗶𝗴𝗴𝗲𝗿: ${trigger}
📋 𝗧𝗼𝘁𝗮𝗹: ${items.length}
━━━━━━━━━━━━━━
${formatted}`
        );
      }

      if (sub === "teach") {
        const parts = rawArgs.replace(/^teach\s+/i, "").split(" - ");

        if (parts.length < 2) {
          return message.reply("Use: baby teach question - answer");
        }

        const [ask, ans] = parts.map(s => s.trim());

        const res = await axios.post(
          `${toru}/api/teach`,
          { question: ask, answer: ans, secret: TORU_SECRET },
          { timeout: 12000 }
        );

        return message.reply(
          res.data?.success
            ? "✅ Shekhano hoyeche!"
            : (res.data?.error || res.data?.message || "❌ Vul hoyeche.")
        );
      }

      if (sub === "edit") {
        const parts = rawArgs.replace(/^edit\s+/i, "").split(" - ");

        if (parts.length < 3) {
          return message.reply("Use: baby edit question - old reply - new reply");
        }

        const [ask, oldR, newR] = parts.map(s => s.trim());
        const found = await findExactItem(ask, oldR);

        if (!found) {
          return message.reply("❌ Ei question/old-answer mile emon kichu paoa jayni.");
        }

        const res = await axios.put(
          `${toru}/api/qa/${encodeURIComponent(found.id)}`,
          { question: ask, answer: newR, secret: TORU_SECRET },
          { timeout: 12000 }
        );

        return message.reply(
          res.data?.success
            ? "✅ Edit hoyeche!"
            : (res.data?.error || res.data?.message || "❌ Vul hoyeche.")
        );
      }

      if (["remove", "rm"].includes(sub)) {
        const parts = rawArgs.replace(/^(remove|rm)\s+/i, "").split(" - ");

        if (parts.length < 2) {
          return message.reply("Use: baby remove question - answer");
        }

        const [ask, ans] = parts.map(s => s.trim());
        const found = await findExactItem(ask, ans);

        if (!found) {
          return message.reply("❌ Ei question/answer mile emon kichu paoa jayni.");
        }

        const res = await axios.delete(
          `${toru}/api/qa/${encodeURIComponent(found.id)}`,
          { timeout: 12000, data: { secret: TORU_SECRET } }
        );

        return message.reply(
          res.data?.success
            ? "✅ Delete hoyeche!"
            : (res.data?.error || res.data?.message || "❌ Vul hoyeche.")
        );
      }

      await typing(api, threadID, 2000);

      const reply = await getSmartReply(rawArgs, threadID);
      return message.reply(reply);

    } catch (err) {
      console.error(
        "baby command error:",
        err.response?.data?.error || err.response?.data?.message || err.message
      );

      return message.reply(
        "❌ Error: " + (err.response?.data?.error || err.response?.data?.message || err.message)
      );
    }
  },

  onChat: async function ({ api, event, message }) {
    const senderID = event.senderID;

    if (senderID === api.getCurrentUserID()) return;
    if (isSpamming(senderID)) return;

    const botID = api.getCurrentUserID();

    const prefix =
      (global.GoatBot && global.GoatBot.config && global.GoatBot.config.prefix) || "";

    const raw = event.body ? event.body.toLowerCase().trim() : "";
    const threadID = event.threadID;

    try {
      if (event.messageReply) {
        const question = event.messageReply.body;
        const answer = event.body;

        if (isUsable(question, prefix) && isUsable(answer, prefix)) {
          await autoLearnFromReply(question.trim(), answer.trim());
        }
      }

      if (
        event.messageReply &&
        event.messageReply.senderID === botID &&
        isUsable(event.body, prefix)
      ) {
        await typing(api, threadID, 2000);
        const reply = await getSmartReply(event.body.trim(), threadID);
        return message.reply(reply);
      }

      if (!raw) return;

      const foundPrefix = PREFIX_TRIGGERS.find(p => raw.startsWith(p));

      if (foundPrefix) {
        const q = event.body.slice(foundPrefix.length).trim();
        if (!q) return;

        await typing(api, threadID, 2000);
        const reply = await getSmartReply(q, threadID);
        return message.reply(reply);
      }

    } catch (err) {
      console.error(
        "baby onChat error:",
        err.response?.data?.error || err.response?.data?.message || err.message
      );
    }
  }
};
      
