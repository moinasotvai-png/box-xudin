module.exports = {
  config: {
    name: "top2",
    version: "5.0",
    author: "Hridoy",
    category: "Game",
    shortDescription: { en: "Global money leaderboard (all groups)" },
    guide: { en: "{pn}" },
    role: 0,
    countDown: 5
  },

  onStart: async function ({ message, usersData }) {

    // ✅ সব group এর সব user - live balance সরাসরি real DB (MongoDB) থেকে
    let allUsers;
    try {
      allUsers = await usersData.getAll();
    } catch (e) {
      console.error(e);
      return message.reply("⚠️ ডাটাবেজ এরর।");
    }

    if (!Array.isArray(allUsers) || allUsers.length === 0) {
      return message.reply("⚠️ কোনো ইউজার পাওয়া যায়নি।");
    }

    let users = allUsers.map(u => ({
      uid: String(u.userID),
      name: u.name || "Unknown User",
      money: Number(u.money || 0)
    }));

    users.sort((a, b) => b.money - a.money);

    let msg = `🏆 GLOBAL MONEY LEADERBOARD 🏆\n━━━━━━━━━━━━━━\n\n`;

    const top = Math.min(10, users.length);

    for (let i = 0; i < top; i++) {
      const u = users[i];

      let rank =
        i === 0 ? "🥇 King" :
        i === 1 ? "🥈 Queen" :
        i === 2 ? "🥉 Elite" :
        `${i + 1}. Member`;

      msg += `${rank}: ${u.name}\n`;
      msg += `🆔 ${u.uid}\n`;
      msg += `💰 $${u.money.toLocaleString()}\n\n`;
    }

    msg += `━━━━━━━━━━━━━━\n👥 মোট ইউজার (সব গ্রুপ মিলিয়ে): ${users.length}`;

    return message.reply(msg);
  }
};
