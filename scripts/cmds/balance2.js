const money = require("../../utils/money");
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "balance2",
    aliases: ["bal2", "টাকা"],
    version: "6.5",
    author: "Hridoy",
    countDown: 5,
    role: 0,
    description: "Ultra realistic ATM card balance",
    category: "Game"
  },

  onStart: async function ({ message, event, usersData }) {
    const { senderID } = event;

    const banks = [
      "American Express",
      "Global Trust Bank",
      "Prime Finance",
      "Neo Bank LTD"
    ];

    const formatMoney = (amount) => {
      if (!amount) return "0";
      const units = ["", "K", "M", "B", "T"];
      let unit = 0;
      while (amount >= 1000 && unit < units.length - 1) {
        amount /= 1000;
        unit++;
      }
      return amount.toFixed(1).replace(".0", "") + units[unit];
    };

    const createCard = async (name, balance) => {
      const width = 900;
      const height = 520;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext("2d");

      // ===== BACKGROUND =====
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#050816");
      bg.addColorStop(0.5, "#0f172a");
      bg.addColorStop(1, "#020617");

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // ===== BORDER GLOW =====
      ctx.strokeStyle = "rgba(0,255,255,0.15)";
      ctx.lineWidth = 6;
      ctx.strokeRect(25, 25, width - 50, height - 50);

      // ===== GLASS EFFECT =====
      const glass = ctx.createLinearGradient(0, 0, width, height);
      glass.addColorStop(0, "rgba(255,255,255,0.10)");
      glass.addColorStop(0.5, "rgba(255,255,255,0.03)");
      glass.addColorStop(1, "rgba(0,0,0,0.25)");

      ctx.fillStyle = glass;
      ctx.fillRect(0, 0, width, height);

      // ===== BANK NAME =====
      const bankName = banks[Math.floor(Math.random() * banks.length)];

      ctx.font = "bold 40px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.7)";
      ctx.shadowBlur = 10;
      ctx.fillText(bankName.toUpperCase(), 60, 85);
      ctx.shadowBlur = 0;

      // ===== CHIP =====
      const chipGrad = ctx.createLinearGradient(60, 160, 180, 240);
      chipGrad.addColorStop(0, "#f9d976");
      chipGrad.addColorStop(0.5, "#d4af37");
      chipGrad.addColorStop(1, "#8c6b1a");

      ctx.fillStyle = chipGrad;
      ctx.fillRect(60, 160, 120, 80);

      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.strokeRect(60, 160, 120, 80);

      // chip lines
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.moveTo(60, 190);
      ctx.lineTo(180, 190);
      ctx.moveTo(60, 210);
      ctx.lineTo(180, 210);
      ctx.stroke();

      // ===== CARD NUMBER =====
      const cardNumber =
        "5284 " +
        Math.floor(Math.random() * 9000 + 1000) +
        " " +
        Math.floor(Math.random() * 9000 + 1000) +
        " " +
        Math.floor(Math.random() * 9000 + 1000);

      ctx.font = "bold 42px monospace";

      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 8;
      ctx.fillText(cardNumber, 62, 322);

      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(cardNumber, 60, 320);

      // ===== NAME =====
      ctx.font = "bold 32px Arial";
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(name.toUpperCase(), 60, 430);

      // ===== EXPIRY + BALANCE RIGHT SIDE ALIGN =====
      const date = new Date();
      const expiry = `${date.getMonth() + 1}/${(date.getFullYear() + 4)
        .toString()
        .slice(-2)}`;

      // VALID THRU label
      ctx.font = "22px Arial";
      ctx.fillStyle = "#facc15";
      ctx.fillText("VALID THRU", 620, 330);

      // expiry date
      ctx.font = "26px Arial";
      ctx.fillText(expiry, 620, 360);

      // BALANCE directly under expiry
      ctx.font = "bold 38px Arial";
      ctx.fillStyle = "#22c55e";
      ctx.shadowColor = "rgba(34,197,94,0.6)";
      ctx.shadowBlur = 18;
      ctx.fillText(`$ ${formatMoney(balance)}`, 620, 430);
      ctx.shadowBlur = 0;

      // ===== LOGO =====
      ctx.globalAlpha = 0.9;

      ctx.beginPath();
      ctx.fillStyle = "#ff3b30";
      ctx.arc(760, 110, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = "#ff9500";
      ctx.arc(810, 110, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;

      // ===== NOISE =====
      ctx.globalAlpha = 0.04;
      for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
      }
      ctx.globalAlpha = 1;

      // ===== SAVE =====
      const folder = path.join(__dirname, "cache");
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

      const file = path.join(folder, `${senderID}_balance.png`);
      fs.writeFileSync(file, canvas.toBuffer());

      return file;
    };

    const userMoney = await money.get(senderID) || 0;
    const userData = await usersData.get(senderID);
    const name = userData?.name || "USER";

    const img = await createCard(name, userMoney);

    return message.reply({
      body: "💳 YOUR PREMIUM ATM CARD",
      attachment: fs.createReadStream(img)
    });
  }
};
