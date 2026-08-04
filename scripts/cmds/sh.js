const ALLOWED_UID = ["100048786044500", "61572613021068"];

module.exports = {
  config: {
    name: "sh",
    role: 2,
    category: "Admin",
    guide: "{pn} <command>"
  },
  onStart: async function({ api, event, args }) {
    // === শুধুমাত্র নির্দিষ্ট UID এই কমান্ড ব্যবহার করতে পারবে ===
    if (!ALLOWED_UID.includes(event.senderID)) {
      return api.sendMessage("⛔ শুধুমাত্র নির্দিষ্ট এডমিন এই কমান্ডটি ব্যবহার করতে পারবে।", event.threadID, event.messageID);
    }

    const cmd = args.join(" ");
    if (!cmd) return api.sendMessage("Command daw", event.threadID, event.messageID);

    const { exec } = require("child_process");
    exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
      const output = stdout || stderr || (err ? err.message : "No output");
      api.sendMessage(`Output:\n${output}`, event.threadID, event.messageID);
    });
  }
};