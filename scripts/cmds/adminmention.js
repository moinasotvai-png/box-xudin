module.exports = {
  config: {
    name: "adminmention",
    version: "3.0.0",
    author: "Hridoy",
    role: 1,
    shortDescription: "Auto reply when admin is mentioned",
    longDescription: "Auto reply when admin UID is mentioned",
    category: "System",
    guide: "{pn} on/off"
  },

  // 👉 Multiple Admin UID
  ADMIN_UIDS: [
    "100048786044500",
    "100061935903355",
    "100048786044500",
    "61572613021068"
  ],

  isOn: true,

  replies: [
"Admin is busy right now 😴👑",
"Please wait... Admin will reply soon! ⏳",
"Admin is not available at the moment 🚫",
"Leave your message, admin will check later 💬",
"Admin is offline right now 📴",
"Admin is thinking deeply... wait a bit 😆🧠",
"Admin is in stealth mode 🥷🔥",
"Boss is currently unavailable 😎",
"Admin is taking a break 📵",
"একটু অপেক্ষা করুন, admin আসবে ⌛",
"Admin ঘুমাচ্ছে, disturb করো না 😴",
"Admin দেখছে... কিন্তু এখন busy 👀",
"Boss is sleeping peacefully 💤",
"Admin is on a mission 🚀",
"Please don’t spam admin 🛑",
"Admin is studying now 📚",
"Admin is gaming 🎮",
"Admin is eating 🍔🍟",
"Admin is working 💼",
"Admin is listening music 🎧",
"Admin is resting 🛌",
"Admin is ignoring everyone 😂😶",
"Bot says: admin busy bro 🤖",
"Admin is out of network 📡",
"Please wait for admin reply 📢",
"Admin will respond later 🕒",
"Admin under maintenance 🤣🚧",
"King is not here now 👑",
"Admin vanished mysteriously 😈",
"Admin is offline tonight 🌙",
"Try again later ☀️",
"Your message is noted 📥",
"Admin chilling now 🧃",
"Don’t disturb admin 💤",
"Access denied to admin 😆🚫",
"Admin will reply soon 🎯",
"Admin is watching silently 🕵️",
"Admin phone not reachable 📲",
"Admin in power saving mode ⚡",
"Admin phone silent 📴",
"Keep calm, admin will come 🤫",
"Admin is busy with something 🎤",
"Admin solving problems 🧩",
"Admin relaxing now 🧘",
"Admin will answer later 💡",
"Admin একটু ব্যস্ত আছে 😅",
"Admin connection weak 📶",
"Admin not available 🚷",
"Please try again later 🕐",
"Boss will come soon 👑",
"Admin temporarily unavailable 📛",
"Admin is invisible now 😂🧿"
  ],

  // 👉 auto detect mention
  onChat: async function ({ api, event }) {
    if (!this.isOn) return;

    const mentions = Object.keys(event.mentions || {});
    if (!mentions.length) return;

    if (mentions.some(uid => this.ADMIN_UIDS.includes(uid))) {
      const msg = this.replies[Math.floor(Math.random() * this.replies.length)];
      return api.sendMessage(msg, event.threadID, event.messageID);
    }
  },

  // 👉 command system
  onStart: async function ({ api, event, args }) {
    if (!args[0]) {
      return api.sendMessage("⚙️ Use: autoreply on/off", event.threadID, event.messageID);
    }

    if (args[0].toLowerCase() === "on") {
      this.isOn = true;
      return api.sendMessage("✅ Auto Reply turned ON", event.threadID, event.messageID);
    }

    if (args[0].toLowerCase() === "off") {
      this.isOn = false;
      return api.sendMessage("❌ Auto Reply turned OFF", event.threadID, event.messageID);
    }

    return api.sendMessage("⚠️ Invalid option! Use on/off", event.threadID, event.messageID);
  }
};
