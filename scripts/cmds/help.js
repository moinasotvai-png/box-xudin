const fs = require("fs-extra");
const path = require("path");
const https = require("https");

module.exports = {
  config: {
    name: "help",
    aliases: ["menu"],
    version: "12.0",
    author: "HRIDOY",
    shortDescription: "Animated Help Menu With Category Filter",
    category: "System",
    guide: "{pn}help [command | all]"
  },

  onStart: async function ({ message, args, prefix, api }) {

    const commandsMap = global.GoatBot.commands;
    const categories = {};
    const commands = [];

    // ===== CATEGORY WHITELIST + ICONS =====
    const categoryIcons = {
      "Admin": "⚜️",
      "AI": "🧠",
      "Group": "👥",
      "Image": "🖼️",
      "Game": "🎮",
      "Love": "💗",
      "Tag Fun": "🏷️",
      "NSFW": "🔞",
      "Media": "🎬",
      "System": "⚙️",
      "Utility": "🛠️",
      "Others": "📦"
    };

    // এই ক্যাটাগরিগুলো "help" (all ছাড়া) দিলে দেখাবে
    const allowedCategories = [
      "AI",
      "Group",
      "Image",
      "Game",
      "Love",
      "Tag Fun",
      "Media"
    ];

    const showAll = args[0] && args[0].toLowerCase() === "all";

    // ===== SINGLE COMMAND INFO =====
    if (args[0] && !showAll) {
      const cmd = commandsMap.get(args[0].toLowerCase());
      if (!cmd) return message.reply("❌ | Command not found! Try: " + prefix + "help all");

      return message.reply(
`╭───〔 ✦ 𝗖𝗢𝗠𝗠𝗔𝗡𝗗  𝗜𝗡𝗙𝗢 ✦ 〕───╮

  📌  𝗡𝗮𝗺𝗲       : ${cmd.config.name}
  🗂️  𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆    : ${categoryIcons[cmd.config.category] || "📦"} ${cmd.config.category}
  📝  𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻  : ${cmd.config.shortDescription || "N/A"}
  💡  𝗨𝘀𝗮𝗴𝗲       : ${prefix}${cmd.config.name}
  🔖  𝗔𝗹𝗶𝗮𝘀𝗲𝘀      : ${cmd.config.aliases ? cmd.config.aliases.join(", ") : "None"}

╰────────────────────────╯`
      );
    }

    // ===== BUILD CATEGORY SYSTEM =====
    for (let [name, cmd] of commandsMap) {
      const cat = cmd.config.category || "Others";

      // showAll না হলে শুধু allowedCategories এর কমান্ড নেবে
      if (!showAll && !allowedCategories.includes(cat)) continue;

      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(name);
      commands.push(name);
    }

    for (let cat in categories)
      categories[cat].sort();

    // ===== LOADING ANIMATION (PROGRESS BAR) =====
    const loadingFrames = [
      "⏳ 𝗟𝗼𝗮𝗱𝗶𝗻𝗴 𝗛𝗲𝗹𝗽 𝗠𝗲𝗻𝘂...\n▰▱▱▱▱▱▱▱▱▱ 10%",
      "⏳ 𝗟𝗼𝗮𝗱𝗶𝗻𝗴 𝗛𝗲𝗹𝗽 𝗠𝗲𝗻𝘂...\n▰▰▰▱▱▱▱▱▱▱ 30%",
      "⏳ 𝗟𝗼𝗮𝗱𝗶𝗻𝗴 𝗛𝗲𝗹𝗽 𝗠𝗲𝗻𝘂...\n▰▰▰▰▰▱▱▱▱▱ 50%",
      "⏳ 𝗟𝗼𝗮𝗱𝗶𝗻𝗴 𝗛𝗲𝗹𝗽 𝗠𝗲𝗻𝘂...\n▰▰▰▰▰▰▰▱▱▱ 70%",
      "⏳ 𝗟𝗼𝗮𝗱𝗶𝗻𝗴 𝗛𝗲𝗹𝗽 𝗠𝗲𝗻𝘂...\n▰▰▰▰▰▰▰▰▰▱ 90%",
      "✅ 𝗛𝗲𝗹𝗽 𝗠𝗲𝗻𝘂 𝗥𝗲𝗮𝗱𝘆!\n▰▰▰▰▰▰▰▰▰▰ 100%"
    ];

    let loadingMsg;
    try {
      loadingMsg = await message.reply(loadingFrames[0]);
    } catch (e) {
      console.error("Failed to send loading message");
    }

    // Animate loading
    for (let i = 1; i < loadingFrames.length; i++) {
      await new Promise(res => setTimeout(res, 400));
      if (loadingMsg) {
        try {
          await api.editMessage(loadingFrames[i], loadingMsg.messageID);
        } catch (e) {
          // Ignore if message is too old or deleted
        }
      }
    }

    // ===== DHAKA, BANGLADESH TIME =====
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Dhaka" });

    // ===== UPTIME =====
    const uptimeSeconds = process.uptime();
    const upDays = Math.floor(uptimeSeconds / 86400);
    const upHours = Math.floor((uptimeSeconds % 86400) / 3600);
    const upMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const upSeconds = Math.floor(uptimeSeconds % 60);
    const uptimeStr = `${upDays}d ${upHours}h ${upMinutes}m ${upSeconds}s`;

    let msg = `╭─❍⟣𝗧𝗢𝗥𝗨 𝗛𝗘𝗟𝗣 𝗣𝗔𝗡𝗘𝗟⟢❍─╮\n\n`;
    msg += `   📦  𝗧𝗼𝘁𝗮𝗹 𝗖𝗼𝗺𝗺𝗮𝗻𝗱𝘀 : ${commands.length}\n`;
    msg += `   🔑  𝗕𝗼𝘁 𝗣𝗿𝗲𝗳𝗶𝘅    : 『 ${prefix} 』\n`;
    msg += `   🟢  𝗦𝘁𝗮𝘁𝘂𝘀        : Active\n`;
    msg += `   📅  𝗗𝗮𝘁𝗲          : ${dateStr}\n`;
    msg += `   🕒  𝗧𝗶𝗺𝗲 (𝗕𝗗)     : ${timeStr}\n`;
    msg += `   ⏱️  𝗨𝗽𝘁𝗶𝗺𝗲       : ${uptimeStr}\n\n`;
    msg += `   ╰─────────────────────╯\n\n`;

    for (let [cat, cmds] of Object.entries(categories)) {
      const icon = categoryIcons[cat] || "📦";
      msg += `┌─「 ${icon}  ${cat.toUpperCase()} 」\n`;

      for (let i = 0; i < cmds.length; i += 2) {
        const left = cmds[i];
        const right = cmds[i + 1];
        msg += right
          ? `│  ✧ ${left}   ✧ ${right}\n`
          : `│  ✧ ${left}\n`;
      }

      msg += `└───────────────\n\n`;
    }

    msg += `╭──❍ ⟣ 👑 𝗕𝗢𝗧  𝗜𝗡𝗙𝗢 ⟢❍──╮\n\n`;
    msg += `   👤  𝗔𝗱𝗺𝗶𝗻    : HR ID OY\n`;
    msg += `   📩  𝗥𝗲𝗽𝗼𝗿𝘁    : ${prefix}callad (yourmsg)\n`;
    msg += `   ℹ️  𝗖𝗺𝗱 𝗜𝗻𝗳𝗼 : ${prefix}help <command>\n`;
    msg += `   ⚡  𝗣𝗼𝘄𝗲𝗿𝗲𝗱 𝗕𝘆 : HRIDOY\n\n`;
    msg += `╰─────────────────────╯`;

    // ===== RANDOM GIF =====
    const gifURLs = [
      "https://i.imgur.com/zex8uo7.gif",
      "https://i.imgur.com/4ki8eBI.gif",
      "https://i.imgur.com/AMKQCJc.gif",
      "https://i.imgur.com/rkjO7YV.gif",
      "https://i.imgur.com/SgNPn8E.gif",
      "https://i.imgur.com/u3qB5y2.gif",
      "https://i.imgur.com/KUFxWlF.gif",
      "https://i.imgur.com/FV9krHV.gif",
      "https://i.imgur.com/lFrFMEn.gif",
      "https://i.imgur.com/KrEez4A.gif"
    ];

    const randomGifURL = gifURLs[Math.floor(Math.random() * gifURLs.length)];
    const gifFolder = path.join(__dirname, "cache");

    if (!fs.existsSync(gifFolder))
      fs.mkdirSync(gifFolder, { recursive: true });

    const gifName = path.basename(randomGifURL);
    const gifPath = path.join(gifFolder, gifName);

    if (!fs.existsSync(gifPath)) {
      try {
        await downloadGif(randomGifURL, gifPath);
      } catch (err) {
        console.error("Failed to download GIF:", err);
      }
    }

    // Remove loading message
    if (loadingMsg) {
      try {
        await api.unsendMessage(loadingMsg.messageID);
      } catch (e) {}
    }

    // Send final help message
    const sent = await message.reply({
      body: msg,
      attachment: fs.existsSync(gifPath) ? fs.createReadStream(gifPath) : null
    });

    // ===== AUTO DELETE AFTER 1 MINUTE =====
    setTimeout(() => {
      try {
        api.unsendMessage(sent.messageID);
      } catch (e) {}
    }, 60000);
  }
};

// ===== DOWNLOAD FUNCTION =====
function downloadGif(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, response => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}