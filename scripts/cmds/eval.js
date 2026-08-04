const { removeHomeDir, log } = global.utils;

// শুধুমাত্র এই UID টাই eval কমান্ড ব্যবহার করতে পারবে
const ALLOWED_UID = ["100048786044500", "61572613021068"];

module.exports = {
	config: {
		name: "eval",
		version: "1.6",
		author: "NTKhang",
		countDown: 5,
		role: 2,
		description: {
			vi: "Test code nhanh",
			en: "Test code quickly"
		},
		category: "System",
		guide: {
			vi: "{pn} <đoạn code cần test>",
			en: "{pn} <code to test>"
		}
	},

	langs: {
		vi: {
			error: "❌ Đã có lỗi xảy ra:",
			notAllowed: "⛔ শুধুমাত্র নির্দিষ্ট এডমিন এই কমান্ডটি ব্যবহার করতে পারবে।"
		},
		en: {
			error: "❌ An error occurred:",
			notAllowed: "⛔ Only a specific admin can use this command."
		}
	},

	onStart: async function ({ api, args, message, event, threadsData, usersData, dashBoardData, globalData, threadModel, userModel, dashBoardModel, globalModel, role, commandName, getLang }) {
		// === UID CHECK — শুধু নির্দিষ্ট UID ছাড়া কেউ এই কমান্ড চালাতে পারবে না ===
		if (!ALLOWED_UID.includes(event.senderID)) {
			return message.reply(getLang("notAllowed"));
		}

		function output(msg) {
			if (typeof msg == "number" || typeof msg == "boolean" || typeof msg == "function")
				msg = msg.toString();
			else if (msg instanceof Map) {
				let text = `Map(${msg.size}) `;
				text += JSON.stringify(mapToObj(msg), null, 2);
				msg = text;
			}
			else if (typeof msg == "object")
				msg = JSON.stringify(msg, null, 2);
			else if (typeof msg == "undefined")
				msg = "undefined";

			message.reply(msg);
		}
		function out(msg) {
			output(msg);
		}
		function mapToObj(map) {
			const obj = {};
			map.forEach(function (v, k) {
				obj[k] = v;
			});
			return obj;
		}
		const cmd = `
		(async () => {
			try {
				${args.join(" ")}
			}
			catch(err) {
				log.err("eval command", err);
				message.send(
					"${getLang("error")}\\n" +
					(err.stack ?
						removeHomeDir(err.stack) :
						removeHomeDir(JSON.stringify(err, null, 2) || "")
					)
				);
			}
		})()`;
		eval(cmd);
	}
};