const money = require("../../utils/money");

module.exports = {
  config: {
    name: "resetmoney",
    aliases: ["resetbalance", "resetallmoney"],
    version: "1.1",
    author: "Assistant",
    role: 2,
    countDown: 15,
    category: "Admin",
    description: { en: "Reset every user's money balance to 1000" },
    guide: {
      en:
        "{pn} confirm  →  সকল ইউজারের balance 1000 করে দেবে (Permanent, Undo নেই)"
    }
  },

  onStart: async function ({ message, args, usersData }) {
    if (args[0] !== "confirm") {
      return message.reply(
        "⚠️ এই কমান্ড সকল ইউজারের ব্যালেন্স 1000 করে দেবে (Permanent, কোনো Undo নেই)।\n\n" +
        "নিশ্চিত হলে লিখুন:\nresetmoney confirm"
      );
    }

    let allUsers;
    try {
      allUsers = await usersData.getAll();
    } catch (e) {
      console.error(e);
      return message.reply("❌ ডাটাবেজ থেকে ইউজার লিস্ট আনতে ব্যর্থ হলো।");
    }

    if (!Array.isArray(allUsers) || allUsers.length === 0) {
      return message.reply("⚠️ কোনো ইউজার পাওয়া যায়নি।");
    }

    await message.reply(`🔄 মোট ${allUsers.length} জন ইউজারের ব্যালেন্স 1000 করা হচ্ছে, একটু সময় লাগতে পারে...`);

    const RESET_AMOUNT = 1000;
    const BATCH_SIZE = 20; // ekbare koyta user process hobe (rate-limit ba db load control korar jonno)

    let success = 0;
    let failed = 0;

    const validUsers = allUsers.filter(u => u.userID);

    for (let i = 0; i < validUsers.length; i += BATCH_SIZE) {
      const batch = validUsers.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(u => setUserBalance(u.userID, RESET_AMOUNT, usersData))
      );

      for (const r of results) {
        if (r.status === "fulfilled") success++;
        else failed++;
      }
    }

    return message.reply(
      `✅ রিসেট সম্পন্ন হয়েছে!\n\n` +
      `👤 মোট ইউজার: ${allUsers.length}\n` +
      `✔️ সফল: ${success}\n` +
      `❌ ব্যর্থ: ${failed}`
    );
  }
};

// money.set() na thakle usersData diye fallback try kora hocche, jate command "kaj na kora" issue theke bache
async function setUserBalance(uid, amount, usersData) {
  try {
    if (money && typeof money.set === "function") {
      return await money.set(uid, amount);
    }
  } catch (e) {
    // fallback e jabe
  }
  // fallback: direct usersData diye
  return await usersData.set(uid, { money: amount }, "", true);
}