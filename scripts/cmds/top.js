const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { Canvas, loadImage } = require("canvas");
const money = require("../../utils/money"); // ✅ live balance এর real source (MongoDB)

const cacheDir = path.join(__dirname, "cache");

module.exports = {
  config: {
    name: "top",
    aliases: ["balldb", "topbalance"],
    version: "1.15",
    author: "Hridoy",
    countDown: 15,
    role: 0,
    description: { en: "Balance leaderboard - Fixed" },
    category: "Game",
    guide: { en: "{pn} [page]" },
    envConfig: {
      ACCESS_TOKEN: "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662"
    }
  },

  onStart: async function({ api, event, args, message }) {
    const loadingMsg = await api.sendMessage({ body: "🔄 Generating leaderboard..." }, event.threadID);

    try {
      const threadInfo = await api.getThreadInfo(event.threadID);
      const members = threadInfo.participantIDs;

      let data = [];

      for (const uid of members) {
        // ✅ Live balance সরাসরি real DB (money.js -> MongoDB) থেকে আসছে,
        // তাই যেকোনো গ্রুপে balance সবসময় same/আপডেটেড দেখাবে
        let userMoney = 0;
        try {
          userMoney = await money.get(uid);
        } catch {}

        let name = "Facebook User";
        try {
          const info = await api.getUserInfo(uid);
          name = info?.[uid]?.name || name;
        } catch {}

        data.push({ uid, name, money: userMoney, rank: 0 });
      }

      data.sort((a, b) => b.money - a.money);
      data.forEach((u, i) => u.rank = i + 1);

      const page = parseInt(args[0]) || 1;
      const perPage = 11;
      const start = (page - 1) * perPage;
      const pageData = data.slice(start, start + perPage);

      if (pageData.length === 0) {
        await api.unsendMessage(loadingMsg.messageID);
        return message.reply("No more pages.");
      }

      // Canvas
      const canvas = new Canvas(1200, 1700);
      const ctx = canvas.getContext("2d");

      // Background
      try {
        const bg = await loadImage("https://i.imgur.com/jMrPT8g.jpeg");
        ctx.drawImage(bg, 0, 0, 1200, 1700);
      } catch {
        ctx.fillStyle = "#0a0a1f";
        ctx.fillRect(0, 0, 1200, 1700);
      }

      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, 1200, 1700);

      const glowColors = ["#FFD700","#FF4500","#00FFFF","#FF00FF","#00FF9D","#FFA500","#1E90FF","#FF69B4"];

      const getAvatar = async (uid) => {
        try {
          let url = `https://graph.facebook.com/${uid}/picture?width=512&height=512`;
          if (this.config.envConfig.ACCESS_TOKEN) url += `&access_token=${this.config.envConfig.ACCESS_TOKEN}`;

          const res = await axios.get(url, { responseType: "arraybuffer" });
          return await loadImage(Buffer.from(res.data));
        } catch {
          return await loadImage("https://i.imgur.com/9hlzf9f.jpeg");
        }
      };

      const drawAvatar = (ctx, img, x, y, r) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
        ctx.restore();
      };

      // Top 3
      if (page === 1) {
        const top3 = data.slice(0, 3);
        const positions = [
          { x: 600, y: 280, r: 110 },
          { x: 300, y: 380, r: 85 },
          { x: 900, y: 380, r: 85 }
        ];

        for (let i = 0; i < top3.length; i++) {
          const user = top3[i];
          const avatar = await getAvatar(user.uid);
          const p = positions[i];
          const color = glowColors[i];

          ctx.shadowColor = color;
          ctx.shadowBlur = 50;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r + 22, 0, Math.PI * 2);
          ctx.fillStyle = color + "40";
          ctx.fill();
          ctx.shadowBlur = 0;

          drawAvatar(ctx, avatar, p.x, p.y, p.r);

          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.font = "bold 45px Arial";
          ctx.fillText(user.name, p.x, p.y + p.r + 85);

          ctx.font = "bold 40px Arial";
          ctx.fillText(`${user.money.toLocaleString()}`, p.x, p.y + p.r + 140);  // ✅ Fixed
        }
      }

      // List
      let y = page === 1 ? 670 : 190;

      for (const user of pageData) {
        if (page === 1 && user.rank <= 3) continue;

        ctx.fillStyle = "rgba(20,20,45,0.92)";
        ctx.fillRect(40, y, 1120, 110);

        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.font = "bold 58px Arial";
        ctx.fillText(`#${user.rank}`, 80, y + 75);

        const avatar = await getAvatar(user.uid);
        drawAvatar(ctx, avatar, 235, y + 55, 48);

        ctx.font = "bold 39px Arial";
        ctx.fillText(user.name, 320, y + 75);

        ctx.textAlign = "right";
        ctx.font = "bold 44px Arial";
        ctx.fillText(`${user.money.toLocaleString()}`, 1145, y + 75);  // ✅ Fixed

        y += 135;
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#ddd";
      ctx.font = "bold 30px Arial";
      ctx.fillText(`Page ${page} • ${data.length} Members`, 600, 1645);

      // Save & Send
      await fs.ensureDir(cacheDir);
      const cachePath = path.join(cacheDir, `top_balance_${Date.now()}.png`);

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(cachePath, buffer);

      await api.unsendMessage(loadingMsg.messageID);

      await message.reply({
        body: `💰 Balance Leaderboard - Page ${page}`,
        attachment: fs.createReadStream(cachePath)
      });

      // Cleanup
      setTimeout(() => fs.unlink(cachePath).catch(() => {}), 25000);

    } catch (err) {
      console.error(err);
      await api.unsendMessage(loadingMsg.messageID).catch(() => {});
      message.reply("❌ Failed to create image. Check console.");
    }
  }
};