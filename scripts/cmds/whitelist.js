const fs = require("fs");
const { config } = global.GoatBot;
const { client } = global;

module.exports = {
  config: {
    name: "wl",
    aliases: ["whitelist"],
    version: "1.0",
    author: "Kakashi",
    role: 3, // adminBot only
    description: "Manage whitelist users (VIP)",
    category: "Admin",
    guide: "{pn} [on|off|add|remove|list] <uid or reply>",
    cooldown: 5
  },

  onStart: function ({ args, event, message }) {

    const sub = args[0]?.toLowerCase();

    let targetID = args[1];
    if (!targetID && event.messageReply)
      targetID = event.messageReply.senderID;

    if (!sub)
      return message.reply("Usage: whitelist [on|off|add|remove|list] <uid or reply>");

    switch (sub) {

      case "on":
        config.whiteListMode.enable = true;
        fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
        return message.reply("✅ Whitelist mode ON (only whitelisted users can use bot)");

      case "off":
        config.whiteListMode.enable = false;
        fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
        return message.reply("❌ Whitelist mode OFF (all users can use bot)");

      case "add":
        if (!targetID)
          return message.reply("❌ Provide userID or reply to a user");

        if (config.whiteListMode.whiteListIds.includes(targetID))
          return message.reply("⚠️ User already in whitelist");

        config.whiteListMode.whiteListIds.push(targetID);
        fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
        return message.reply(`✅ Added ${targetID} to whitelist`);

      case "remove":
        if (!targetID)
          return message.reply("❌ Provide userID or reply to a user");

        if (!config.whiteListMode.whiteListIds.includes(targetID))
          return message.reply("⚠️ User not in whitelist");

        config.whiteListMode.whiteListIds =
          config.whiteListMode.whiteListIds.filter(id => id !== targetID);

        fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
        return message.reply(`✅ Removed ${targetID} from whitelist`);

      case "list":
        if (config.whiteListMode.whiteListIds.length === 0)
          return message.reply("📭 Whitelist is empty");

        return message.reply(
          "📋 Whitelisted users:\n" +
          config.whiteListMode.whiteListIds.join("\n")
        );

      default:
        return message.reply("Usage: whitelist [on|off|add|remove|list] <uid or reply>");
    }
  }
};