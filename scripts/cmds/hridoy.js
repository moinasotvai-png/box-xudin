const axios = require("axios");

// Cooldown storage (per thread)
const cooldowns = new Map();

module.exports = {
  config: {
    name: "hridoy",
    version: "1.5.0",
    author: "Hridoy",
    role: 0,
    category: "Admin",
    shortDescription: "Auto profile reply with keyword + admin mention",
    countDown: 3
  },

  onStart: async function () {
    return;
  },

  onChat: async function ({ event, api }) {
    // ✅ নিজের (বটের) মেসেজে রিয়েক্ট না করা — স্প্যাম/লুপ বন্ধ রাখতে
    if (event.senderID === api.getCurrentUserID()) return;

    const msg = (event.body || "").toLowerCase();

    // ✅ তোমার admin UID
    const adminUID = ["100048786044500", "61572613021068"];

    const isKeyword = msg.includes("hridoy");
    const isAdminMention =
      event.mentions &&
      Object.keys(event.mentions).some((id) => adminUID.includes(id));

    if (!isKeyword && !isAdminMention) return;

    // ✅ Cooldown per thread (spam বন্ধ রাখতে ১৫ সেকেন্ড)
    const threadID = event.threadID;
    const COOLDOWN_MS = 15000;
    const now = Date.now();

    if (
      cooldowns.has(threadID) &&
      now - cooldowns.get(threadID) < COOLDOWN_MS
    ) {
      return;
    }

    cooldowns.set(threadID, now);

    const imageUrl = "https://i.imgur.com/6dpggxq.jpeg";

    const body =
`✦━━━━━━〔 𝑷𝑹𝑶𝑭𝑰𝑳𝑬 〕━━━━━━✦
✨ NAME   ➤ HR ID OY
✨ AGE    ➤ 20+
✨ STATUS ➤ SINGLE
✨ LOC    ➤ JASHORE

✦━━━━━━━〔 𝑺𝑶𝑪𝑰𝑨𝑳〕━━━━━━━✦
🌐 FB   ➤ fb.me/100048786044500
📧 MAIL ➤ hridoyhossen049@gmail.com
📱 WA   ➤ 01744-******

✦━━━━━━━━〔 𝑮𝑨𝑴𝑬〕━━━━━━━✦
🔫 FREE FIRE

✦━━━━━━━━━━━━━━━━━━━━✦
⚡ SYSTEM STATUS : ONLINE`;

    try {
      const img = await axios.get(imageUrl, {
        responseType: "stream",
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      return api.sendMessage(
        {
          body,
          attachment: img.data
        },
        threadID,
        event.messageID
      );

    } catch (err) {
      return api.sendMessage(
        body + "\n\n❌ Image load failed!",
        threadID,
        event.messageID
      );
    }
  }
};
