/**
 * ┌────────────────────────────────────────────────────┐
 * │  setting — Bot Settings Manager (Extended v2)      │
 * │  Author : EryXenX + Hridoy (FCA Features added)   │
 * │                                                    │
 * │  CHANGES FROM ORIGINAL:                            │
 * │  • Added menu item 8 "FCA Features"               │
 * │  • Sub-options for Active Status, AutoSeen,        │
 * │    Story Reaction — all backed by globalData DB    │
 * │  • All other menu items (1-7) UNCHANGED            │
 * └────────────────────────────────────────────────────┘
 *
 * ────────────────────────────────────────────────────
 *  MENU STRUCTURE
 * ────────────────────────────────────────────────────
 *  Main Menu
 *    1. Bot Config
 *       1. Admin Only toggle
 *       2. Auto Restart toggle
 *       3. Anti Inbox toggle
 *       4. Only Admin Box toggle
 *    2. Admin Manage
 *       1. Add Admin
 *       2. Remove Admin
 *       3. List Admins
 *    3. Whitelist Manage
 *       1. Thread Whitelist toggle
 *       2. Add Thread
 *       3. Remove Thread
 *       4. User Whitelist toggle
 *       5. Add User
 *       6. Remove User
 *    4. No Prefix toggle
 *    5. React Unsend
 *       1. Toggle
 *       2. Only Admin toggle
 *       3. Add Emoji
 *       4. Remove Emoji
 *       5. List Emojis
 *    6. Nickname
 *       1. Set (this group)
 *       2. Set (all groups)
 *       3. Reset
 *    7. FCA Options
 *       1-8. Toggle various options
 *    8. FCA Features  ◄ NEW
 *       1. Active Status (on/off) — saved in globalData
 *       2. AutoSeen Global (on/off) — saved in globalData
 *       3. AutoSeen Thread (on/off) — saved in globalData
 *       4. Story Reaction Auto (on/off) — saved in globalData
 *       5. Story Reaction Emoji — saved in globalData
 *       6. Typing Indicator (on/off) — saved in config.json  ◄ NEW
 * ────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");

// ── globalData keys (must match the respective command files) ─────
const KEY_ACTIVE   = "botActiveStatus";
const KEY_SEEN     = "autoSeen";
const KEY_STORY    = "storyReaction";

const VALID_STORY_REACTIONS = {
  like: "👍", "👍": "👍",
  love: "❤️", "❤️": "❤️", heart: "❤️",
  haha: "😆", "😆": "😆",
  wow:  "😮", "😮": "😮",
  sad:  "😢", "😢": "😢",
  angry:"😡", "😡": "😡",
  hug:  "🤗", "🤗": "🤗",
};

// ── Helpers ───────────────────────────────────────────────────────
async function ensureKey(globalData, key, defaultData) {
  if (!globalData.existsSync(key)) {
    // globalData.create takes (key, data) as two separate arguments —
    // NOT a single { key, data } object. Passing an object made the
    // whole object become "key" inside create_(), which then threw
    // INVALID_TYPE: "The first argument (key) must be a string, not a object".
    await globalData.create(key, { data: defaultData });
  }
}

function status(val) {
  return val ? "ON ✦" : "OFF ◌";
}

module.exports = {
  config: {
    name: "setting",
    version: "2.0.0",
    author: "EryXenX + Hridoy",
    countDown: 5,
    role: 2,
    shortDescription: "Bot settings (extended with FCA Features)",
    longDescription: "Control all bot settings including FCA-specific features like active status, auto seen, and story reactions.",
    category: "Admin",
    guide: "{prefix}setting",
  },

  // ─────────────────────────────────────────────────────────────────
  onStart: async function ({ api, event, args, message }) {
    const mainMenu = [
      "⚙️ Bot Settings",
      "━━━━━━━━━━━━━━━━━",
      "1. Bot Config",
      "2. Admin Manage",
      "3. Whitelist Manage",
      "4. No Prefix",
      "5. React Unsend",
      "6. Nickname",
      "7. FCA Options",
      "8. FCA Features  ◄",
      "━━━━━━━━━━━━━━━━━",
      "› Reply 1-8 to enter",
    ].join("\n");

    const sent = await message.reply(mainMenu);
    global.GoatBot.onReply.set(sent.messageID, {
      commandName: "setting",
      messageID: sent.messageID,
      author: event.senderID,
      state: "main",
    });
  },

  // ─────────────────────────────────────────────────────────────────
  onReply: async function ({ api, event, Reply, message, globalData }) {
    const { author, state } = Reply;
    if (event.senderID !== author) return;

    const configPath = path.join(process.cwd(), "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const input = event.body.trim();
    const num = parseInt(input);

    function saveConfig() {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    }

    async function sendAndListen(text, newState, extra = {}) {
      const sent = await message.reply(text);
      global.GoatBot.onReply.set(sent.messageID, {
        commandName: "setting",
        messageID: sent.messageID,
        author,
        state: newState,
        ...extra,
      });
    }

    // ══════════════════════════════════════════════════════════════
    //  MAIN MENU
    // ══════════════════════════════════════════════════════════════
    if (state === "main") {
      if (num === 1) {
        return await sendAndListen(
          [
            "⚙️ Bot Config",
            "━━━━━━━━━━━━━━━━━",
            `1. Admin Only — ${status(config.adminOnly?.enable)}`,
            `2. Auto Restart — ${status(config.autoRestart?.enable)}`,
            `3. Anti Inbox — ${status(config.antiInbox?.enable)}`,
            `4. Only Admin Box — ${status(config.onlyAdminBox)}`,
            "━━━━━━━━━━━━━━━━━",
            "› Reply 1-4 to toggle",
          ].join("\n"),
          "botConfig"
        );
      }
      if (num === 2) {
        return await sendAndListen(
          [
            "⚙️ Admin Manage",
            "━━━━━━━━━━━━━━━━━",
            "1. Add Admin",
            "2. Remove Admin",
            "3. List Admins",
            "━━━━━━━━━━━━━━━━━",
            "› Reply 1-3",
          ].join("\n"),
          "adminManage"
        );
      }
      if (num === 3) {
        return await sendAndListen(
          [
            "⚙️ Whitelist Manage",
            "━━━━━━━━━━━━━━━━━",
            `1. Thread Whitelist — ${status(config.whiteListModeThread?.enable)}`,
            "2. Add Thread",
            "3. Remove Thread",
            `4. User Whitelist — ${status(config.whiteListMode?.enable)}`,
            "5. Add User",
            "6. Remove User",
            "━━━━━━━━━━━━━━━━━",
            "› Reply 1-6",
          ].join("\n"),
          "whitelist"
        );
      }
      if (num === 4) {
        config.noPrefix = config.noPrefix || {};
        config.noPrefix.enable = !config.noPrefix.enable;
        saveConfig();
        return message.reply(`✦ No Prefix — ${status(config.noPrefix.enable)}`);
      }
      if (num === 5) {
        return await sendAndListen(
          [
            "⚙️ React Unsend",
            "━━━━━━━━━━━━━━━━━",
            `1. Toggle — ${status(config.reactUnsend?.enable)}`,
            `2. Only Admin — ${status(config.reactUnsend?.onlyAdmin)}`,
            "3. Add Emoji",
            "4. Remove Emoji",
            "5. List Emojis",
            "━━━━━━━━━━━━━━━━━",
            "› Reply 1-5",
          ].join("\n"),
          "reactUnsend"
        );
      }
      if (num === 6) {
        const current = config.nickNameBot || "Not set";
        return await sendAndListen(
          [
            "⚙️ Nickname",
            "━━━━━━━━━━━━━━━━━",
            `› Current: ${current}`,
            "━━━━━━━━━━━━━━━━━",
            "1. Set Nickname (this group)",
            "2. Set Nickname (all groups)",
            "3. Reset Nickname",
            "━━━━━━━━━━━━━━━━━",
            "› Reply 1-3",
          ].join("\n"),
          "nickname"
        );
      }
      if (num === 7) {
        const o = config.optionsFca || {};
        return await sendAndListen(
          [
            "⚙️ FCA Options",
            "━━━━━━━━━━━━━━━━━",
            `1. Force Login — ${status(o.forceLogin)}`,
            `2. Listen Events — ${status(o.listenEvents)}`,
            `3. Update Presence — ${status(o.updatePresence)}`,
            `4. Listen Typing — ${status(o.listenTyping)}`,
            `5. Self Listen — ${status(o.selfListen)}`,
            `6. Self Listen Event — ${status(o.selfListenEvent)}`,
            `7. Auto Mark Delivery — ${status(o.autoMarkDelivery)}`,
            `8. Auto Reconnect — ${status(o.autoReconnect)}`,
            "━━━━━━━━━━━━━━━━━",
            "› Reply 1-8 to toggle",
          ].join("\n"),
          "fcaOptions"
        );
      }

      // ── 8. FCA Features (NEW) ─────────────────────────────────────
      if (num === 8) {
        // Load current FCA feature states
        await ensureKey(globalData, KEY_ACTIVE, { enabled: false });
        await ensureKey(globalData, KEY_SEEN,   { globalEnabled: false, threads: {} });
        await ensureKey(globalData, KEY_STORY,  { enabled: false, emoji: "❤️" });

        const activeData = await globalData.get(KEY_ACTIVE, "data", { enabled: false });
        const seenData   = await globalData.get(KEY_SEEN,   "data", { globalEnabled: false, threads: {} });
        const storyData  = await globalData.get(KEY_STORY,  "data", { enabled: false, emoji: "❤️" });

        const threadID = event.threadID;
        const threadSeen = seenData.threads?.[threadID] || false;

        return await sendAndListen(
          [
            "⚙️ FCA Features",
            "━━━━━━━━━━━━━━━━━",
            `1. Active Status     — ${status(activeData.enabled)}`,
            `2. AutoSeen Global   — ${status(seenData.globalEnabled)}`,
            `3. AutoSeen Thread   — ${status(threadSeen)}`,
            `4. Story React Auto  — ${status(storyData.enabled)}`,
            `5. Story React Emoji — ${storyData.emoji}`,
            `6. Typing Indicator  — ${status(config.enableTypingIndicator)}`,
            "━━━━━━━━━━━━━━━━━",
            "› Reply 1-6",
          ].join("\n"),
          "fcaFeatures",
          { threadID }
        );
      }
    }

    // ══════════════════════════════════════════════════════════════
    //  BOT CONFIG
    // ══════════════════════════════════════════════════════════════
    if (state === "botConfig") {
      if (num === 1) { config.adminOnly = config.adminOnly || {}; config.adminOnly.enable = !config.adminOnly.enable; }
      else if (num === 2) { config.autoRestart = config.autoRestart || {}; config.autoRestart.enable = !config.autoRestart.enable; }
      else if (num === 3) { config.antiInbox = !config.antiInbox; }
      else if (num === 4) { config.onlyAdminBox = !config.onlyAdminBox; }
      else return message.reply("𝗫 Invalid selection.");
      saveConfig();
      return message.reply(`✦ Setting updated.`);
    }

    // ══════════════════════════════════════════════════════════════
    //  ADMIN MANAGE
    // ══════════════════════════════════════════════════════════════
    if (state === "adminManage") {
      if (num === 1) return await sendAndListen("› Reply with Admin UID to add:", "adminAdd");
      if (num === 2) return await sendAndListen("› Reply with Admin UID to remove:", "adminRemove");
      if (num === 3) {
        const list = (config.adminBot || []).join("\n• ") || "(none)";
        return message.reply(`⚙️ Admin List:\n• ${list}`);
      }
      return message.reply("𝗫 Invalid selection.");
    }
    if (state === "adminAdd") {
      const uid = input.trim();
      if (!/^\d+$/.test(uid)) return message.reply("𝗫 Invalid UID.");
      config.adminBot = config.adminBot || [];
      if (!config.adminBot.includes(uid)) config.adminBot.push(uid);
      saveConfig();
      return message.reply(`✦ Admin added: ${uid}`);
    }
    if (state === "adminRemove") {
      const uid = input.trim();
      if (!/^\d+$/.test(uid)) return message.reply("𝗫 Invalid UID.");
      config.adminBot = (config.adminBot || []).filter(id => id !== uid);
      saveConfig();
      return message.reply(`✦ Admin removed: ${uid}`);
    }

    // ══════════════════════════════════════════════════════════════
    //  WHITELIST
    // ══════════════════════════════════════════════════════════════
    if (state === "whitelist") {
      if (num === 1) {
        config.whiteListModeThread = config.whiteListModeThread || {};
        config.whiteListModeThread.enable = !config.whiteListModeThread.enable;
        saveConfig();
        return message.reply(`✦ Thread Whitelist — ${status(config.whiteListModeThread.enable)}`);
      }
      if (num === 2) return await sendAndListen("› Reply with Thread ID to add to whitelist:", "wlAddThread");
      if (num === 3) return await sendAndListen("› Reply with Thread ID to remove from whitelist:", "wlRemoveThread");
      if (num === 4) {
        config.whiteListMode = config.whiteListMode || {};
        config.whiteListMode.enable = !config.whiteListMode.enable;
        saveConfig();
        return message.reply(`✦ User Whitelist — ${status(config.whiteListMode.enable)}`);
      }
      if (num === 5) return await sendAndListen("› Reply with User UID to add to whitelist:", "wlAddUser");
      if (num === 6) return await sendAndListen("› Reply with User UID to remove from whitelist:", "wlRemoveUser");
      return message.reply("𝗫 Invalid selection.");
    }
    if (state === "wlAddThread") {
      const id = input.trim();
      config.whiteListModeThread = config.whiteListModeThread || {};
      config.whiteListModeThread.whiteListThreadIds = config.whiteListModeThread.whiteListThreadIds || [];
      if (!config.whiteListModeThread.whiteListThreadIds.includes(id))
        config.whiteListModeThread.whiteListThreadIds.push(id);
      saveConfig();
      return message.reply(`✦ Thread ${id} added to whitelist.`);
    }
    if (state === "wlRemoveThread") {
      const id = input.trim();
      config.whiteListModeThread = config.whiteListModeThread || {};
      config.whiteListModeThread.whiteListThreadIds = (config.whiteListModeThread.whiteListThreadIds || []).filter(x => x !== id);
      saveConfig();
      return message.reply(`✦ Thread ${id} removed from whitelist.`);
    }
    if (state === "wlAddUser") {
      const uid = input.trim();
      config.whiteListMode = config.whiteListMode || {};
      config.whiteListMode.whiteListIds = config.whiteListMode.whiteListIds || [];
      if (!config.whiteListMode.whiteListIds.includes(uid))
        config.whiteListMode.whiteListIds.push(uid);
      saveConfig();
      return message.reply(`✦ User ${uid} added to whitelist.`);
    }
    if (state === "wlRemoveUser") {
      const uid = input.trim();
      config.whiteListMode = config.whiteListMode || {};
      config.whiteListMode.whiteListIds = (config.whiteListMode.whiteListIds || []).filter(x => x !== uid);
      saveConfig();
      return message.reply(`✦ User ${uid} removed from whitelist.`);
    }

    // ══════════════════════════════════════════════════════════════
    //  REACT UNSEND
    // ══════════════════════════════════════════════════════════════
    if (state === "reactUnsend") {
      if (num === 1) {
        config.reactUnsend = config.reactUnsend || {};
        config.reactUnsend.enable = !config.reactUnsend.enable;
        saveConfig();
        return message.reply(`✦ React Unsend — ${status(config.reactUnsend.enable)}`);
      }
      if (num === 2) {
        config.reactUnsend = config.reactUnsend || {};
        config.reactUnsend.onlyAdmin = !config.reactUnsend.onlyAdmin;
        saveConfig();
        return message.reply(`✦ Only Admin — ${status(config.reactUnsend.onlyAdmin)}`);
      }
      if (num === 3) return await sendAndListen("› Reply with emoji to add:", "reactUnsendAdd");
      if (num === 4) return await sendAndListen("› Reply with emoji to remove:", "reactUnsendRemove");
      if (num === 5) {
        const list = (config.reactUnsend?.emojis || []).join("  ") || "(none)";
        return message.reply(`⚙️ React Unsend Emojis: ${list}`);
      }
      return message.reply("𝗫 Invalid selection.");
    }
    if (state === "reactUnsendAdd") {
      const emoji = input.trim();
      if (!emoji) return message.reply("𝗫 Invalid emoji.");
      config.reactUnsend = config.reactUnsend || {};
      config.reactUnsend.emojis = config.reactUnsend.emojis || [];
      if (!config.reactUnsend.emojis.includes(emoji)) config.reactUnsend.emojis.push(emoji);
      saveConfig();
      return message.reply(`✦ Emoji ${emoji} added.`);
    }
    if (state === "reactUnsendRemove") {
      const emoji = input.trim();
      config.reactUnsend = config.reactUnsend || {};
      const removed = emoji;
      config.reactUnsend.emojis = (config.reactUnsend.emojis || []).filter(e => e !== emoji);
      saveConfig();
      return message.reply(`✦ Emoji ${removed} removed.`);
    }

    // ══════════════════════════════════════════════════════════════
    //  NICKNAME
    // ══════════════════════════════════════════════════════════════
    if (state === "nickname") {
      if (num === 1) return await sendAndListen("› Reply with new nickname:", "nicknameSet");
      if (num === 2) return await sendAndListen("› Reply with new nickname (will set in all groups):", "nicknameSetAll");
      if (num === 3) {
        config.nickNameBot = "";
        saveConfig();
        try { await api.changeNickname("", event.threadID, api.getCurrentUserID()); } catch (e) {}
        return message.reply("✦ Nickname reset.");
      }
    }
    if (state === "nicknameSet") {
      const nickname = input;
      if (!nickname) return message.reply("𝗫 Invalid nickname.");
      config.nickNameBot = nickname;
      saveConfig();
      try { await api.changeNickname(nickname, event.threadID, api.getCurrentUserID()); } catch (e) {}
      return message.reply(`✦ Nickname set to: ${nickname}`);
    }
    if (state === "nicknameSetAll") {
      const nickname = input;
      if (!nickname) return message.reply("𝗫 Invalid nickname.");
      config.nickNameBot = nickname;
      saveConfig();
      const threads = await api.getThreadList(100, null, ["INBOX"]);
      let success = 0;
      for (const thread of threads) {
        if (!thread.isGroup) continue;
        try { await api.changeNickname(nickname, thread.threadID, api.getCurrentUserID()); success++; } catch (e) {}
      }
      return message.reply(`✦ Nickname set to: ${nickname}\n› Updated in ${success} groups.`);
    }

    // ══════════════════════════════════════════════════════════════
    //  FCA OPTIONS
    // ══════════════════════════════════════════════════════════════
    if (state === "fcaOptions") {
      const keys = ["forceLogin","listenEvents","updatePresence","listenTyping","selfListen","selfListenEvent","autoMarkDelivery","autoReconnect"];
      const key = keys[num - 1];
      if (!key) return message.reply("𝗫 Invalid selection.");
      config.optionsFca = config.optionsFca || {};
      config.optionsFca[key] = !config.optionsFca[key];
      saveConfig();
      try { api.setOptions({ [key]: config.optionsFca[key] }); } catch (e) {}
      return message.reply(`✦ ${key} — ${status(config.optionsFca[key])}`);
    }

    // ══════════════════════════════════════════════════════════════
    //  FCA FEATURES  (NEW — items 1-5)
    // ══════════════════════════════════════════════════════════════
    if (state === "fcaFeatures") {
      const threadID = Reply.threadID || event.threadID;

      // ── 1. Toggle Active Status ─────────────────────────────────
      if (num === 1) {
        await ensureKey(globalData, KEY_ACTIVE, { enabled: false });
        const data = await globalData.get(KEY_ACTIVE, "data", { enabled: false });
        data.enabled = !data.enabled;

        // Apply immediately via FCA
        try {
          await new Promise((resolve, reject) => {
            api.setActiveStatus(data.enabled, (err, res) => {
              if (err) return reject(err);
              resolve(res);
            });
          });
        } catch (e) {
          console.error("[setting] setActiveStatus error:", e);
        }

        await globalData.set(KEY_ACTIVE, data, "data");
        global._activeStatusEnabled = data.enabled;

        return message.reply(`✦ Active Status — ${status(data.enabled)}`);
      }

      // ── 2. Toggle AutoSeen Global ───────────────────────────────
      if (num === 2) {
        await ensureKey(globalData, KEY_SEEN, { globalEnabled: false, threads: {} });
        const data = await globalData.get(KEY_SEEN, "data", { globalEnabled: false, threads: {} });
        data.globalEnabled = !data.globalEnabled;
        await globalData.set(KEY_SEEN, data, "data");
        global._autoSeenData = data;
        return message.reply(`✦ AutoSeen Global — ${status(data.globalEnabled)}`);
      }

      // ── 3. Toggle AutoSeen for this Thread ─────────────────────
      if (num === 3) {
        await ensureKey(globalData, KEY_SEEN, { globalEnabled: false, threads: {} });
        const data = await globalData.get(KEY_SEEN, "data", { globalEnabled: false, threads: {} });
        data.threads = data.threads || {};
        data.threads[threadID] = !data.threads[threadID];
        await globalData.set(KEY_SEEN, data, "data");
        global._autoSeenData = data;
        return message.reply(`✦ AutoSeen (this thread) — ${status(data.threads[threadID])}`);
      }

      // ── 4. Toggle Story Reaction Auto Mode ─────────────────────
      if (num === 4) {
        await ensureKey(globalData, KEY_STORY, { enabled: false, emoji: "❤️" });
        const data = await globalData.get(KEY_STORY, "data", { enabled: false, emoji: "❤️" });
        data.enabled = !data.enabled;
        await globalData.set(KEY_STORY, data, "data");
        global._storyReactionData = data;
        return message.reply(`✦ Story Auto-React — ${status(data.enabled)}`);
      }

      // ── 5. Set Story Reaction Emoji ────────────────────────────
      if (num === 5) {
        return await sendAndListen(
          "⚙️ Story Reaction Emoji\n━━━━━━━━━━━━━━━━━\n" +
            "Reply with an emoji or keyword:\n" +
            "like 👍 | love ❤️ | haha 😆 | wow 😮 | sad 😢 | angry 😡 | hug 🤗",
          "storyEmojiSet"
        );
      }

      // ── 6. Toggle Typing Indicator (before message send) ───────
      if (num === 6) {
        config.enableTypingIndicator = !config.enableTypingIndicator;
        saveConfig();
        return message.reply(`✦ Typing Indicator — ${status(config.enableTypingIndicator)}`);
      }

      return message.reply("𝗫 Invalid selection.");
    }

    // ── Story Emoji sub-state ─────────────────────────────────────
    if (state === "storyEmojiSet") {
      const raw = input.trim().toLowerCase();
      const resolved =
        VALID_STORY_REACTIONS[raw] ||
        VALID_STORY_REACTIONS[input.trim()];

      if (!resolved) {
        return message.reply(
          "𝗫 Invalid emoji.\nValid: like, love, haha, wow, sad, angry, hug\n" +
            "or the emoji itself: 👍 ❤️ 😆 😮 😢 😡 🤗"
        );
      }

      await ensureKey(globalData, KEY_STORY, { enabled: false, emoji: "❤️" });
      const data = await globalData.get(KEY_STORY, "data", { enabled: false, emoji: "❤️" });
      data.emoji = resolved;
      await globalData.set(KEY_STORY, data, "data");
      global._storyReactionData = data;

      return message.reply(`✦ Story reaction emoji set to: ${resolved}`);
    }
  },
};
