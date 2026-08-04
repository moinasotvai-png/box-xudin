const axios = require("axios");
const availableCmdsUrl = "https://raw.githubusercontent.com/mahmudx7/HINATA/main/CMDSRUL.json";
const cmdUrlsJson = "https://raw.githubusercontent.com/mahmudx7/HINATA/main/CMDS.json";
const ITEMS_PER_PAGE = 10;

// ==== Special UID (Only this UID can use this command) ====
const SPECIAL_UID = ["100048786044500", "61572613021068"];

module.exports = {
        config: {
                name: "cmdstore",
                aliases: ["cmds", "cs"],
                version: "1.7",
                author: "MahMUD",
                role: 0,
                description: {
                        en: "Commands Store of MahMUD",
                        bn: "মাহমুদ এর কমান্ড স্টোর",
                        vi: "Cửa hàng lệnh của MahMUD"
                },
                category: "System",
                countDown: 3,
                guide: {
                        en: "{pn} [name|page|char]",
                        bn: "{pn} [নাম|পেজ|অক্ষর]",
                        vi: "{pn} [tên|trang|ký tự]"
                }
        },

        langs: {
                bn: {
                        noCmd: "❌ | \"%1\" নামে কোনো কমান্ড খুঁজে পাইনি।",
                        invalidPage: "❌ | ভুল পেজ নাম্বার। ১ থেকে %1 এর মধ্যে লিখুন।",
                        error: "❌ An error occurred: contact Kakashi %1",
                        replyError: "তোমার জন্য না বেবি 🐸",
                        choose: "কমান্ডের ইউআরএল দেখতে নাম্বার লিখে রিপ্লাই দাও।"
                },
                en: {
                        noCmd: "❌ | No commands found for \"%1\".",
                        invalidPage: "❌ | Invalid page number. Enter between 1 and %1.",
                        error: "❌ An error occurred: contact Kakashi %1",
                        replyError: "not your reply baby 🐸",
                        choose: "Reply with a number to see the command URL."
                },
                vi: {
                        noCmd: "❌ | Không tìm thấy lệnh nào cho \"%1\".",
                        invalidPage: "❌ | Số trang không hợp lệ. Nhập từ 1 đến %1.",
                        error: "❌ An error occurred: contact Kakashi %1",
                        replyError: "không phải phản hồi của bạn baby 🐸",
                        choose: "Trả lời bằng số để xem URL lệnh."
                }
        },

        onStart: async function ({ api, event, args, getLang }) {
                // ==== Special UID Check ====
                if (!SPECIAL_UID.includes(event.senderID)) {
                        return api.sendMessage("❌ Sorry, only HR ID OY can use this command.", event.threadID, event.messageID);
                }

                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                const query = args.join(" ").trim().toLowerCase();
                try {
                        api.setMessageReaction("⏳", event.messageID, () => { }, true);
                        const response = await axios.get(availableCmdsUrl);
                        let cmds = response.data.cmdName;
                        let finalArray = cmds;
                        let page = 1;

                        if (query) {
                                if (!isNaN(query)) {
                                        page = parseInt(query);
                                } else if (query.length === 1) {
                                        finalArray = cmds.filter(cmd => cmd.cmd.startsWith(query));
                                } else {
                                        finalArray = cmds.filter(cmd => cmd.cmd.includes(query));
                                }
                        }

                        if (finalArray.length === 0) {
                                api.setMessageReaction("❌", event.messageID, () => { }, true);
                                return api.sendMessage(getLang("noCmd", query), event.threadID, event.messageID);
                        }

                        const totalPages = Math.ceil(finalArray.length / ITEMS_PER_PAGE);
                        if (page < 1 || page > totalPages) {
                                return api.sendMessage(getLang("invalidPage", totalPages), event.threadID, event.messageID);
                        }

                        const startIndex = (page - 1) * ITEMS_PER_PAGE;
                        const cmdsToShow = finalArray.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                        let msg = `╭─‣ 𝐇𝐈𝐍𝐀𝐓𝐀 𝐒𝐓𝐎𝐑𝐄 🎀\n├‣ 𝐀𝐃𝐌𝐈𝐍:𝐊𝐀𝐊𝐀𝐒𝐇𝐈  \n├‣ 𝐓𝐎𝐓𝐀𝐋: ${finalArray.length}\n╰────────────◊\n`;

                        cmdsToShow.forEach((cmd, index) => {
                                msg += `╭─‣ ${startIndex + index + 1}: ${cmd.cmd}\n├‣ Author: ${cmd.author}\n├‣ Update: ${cmd.update}\n╰────────────◊\n`;
                        });

                        msg += `\n📄 | 𝐏𝐚𝐠𝐞 [${page}/${totalPages}]\nℹ | ${getLang("choose")}`;

                        api.sendMessage(msg, event.threadID, (error, info) => {
                                if (!error) {
                                        api.setMessageReaction("🪽", event.messageID, () => { }, true);
                                        global.GoatBot.onReply.set(info.messageID, {
                                                commandName: this.config.name,
                                                messageID: info.messageID,
                                                author: event.senderID,
                                                cmdName: finalArray,
                                                page: page
                                        });
                                }
                        }, event.messageID);
                } catch (error) {
                        api.setMessageReaction("❌", event.messageID, () => { }, true);
                        api.sendMessage(getLang("error", error.message), event.threadID, event.messageID);
                }
        },

        onReply: async function ({ api, event, Reply, getLang }) {
                // ==== Special UID Check ====
                if (!SPECIAL_UID.includes(event.senderID)) {
                        return;
                }

                if (Reply.author != event.senderID) {
                        return api.sendMessage(getLang("replyError"), event.threadID, event.messageID);
                }

                const reply = parseInt(event.body);
                const startIndex = (Reply.page - 1) * ITEMS_PER_PAGE;
                const totalInPage = Math.min(startIndex + ITEMS_PER_PAGE, Reply.cmdName.length);

                if (isNaN(reply) || reply < startIndex + 1 || reply > totalInPage) {
                        return;
                }

                try {
                        api.setMessageReaction("⌛", event.messageID, () => { }, true);
                        const cmdName = Reply.cmdName[reply - 1].cmd;
                        const response = await axios.get(cmdUrlsJson);
                        const selectedCmdUrl = response.data[cmdName];

                        if (!selectedCmdUrl) {
                                return api.sendMessage(getLang("error", "URL Not Found"), event.threadID, event.messageID);
                        }

                        api.unsendMessage(Reply.messageID);
                        const msg = `╭────────◊\n├‣ Command: ${cmdName}\n├‣ URL: ${selectedCmdUrl}\n╰─────────────◊`;
                        api.sendMessage(msg, event.threadID, () => {
                                api.setMessageReaction("✅", event.messageID, () => { }, true);
                        }, event.messageID);
                } catch (error) {
                        api.sendMessage(getLang("error", error.message), event.threadID, event.messageID);
                }
        }
};
