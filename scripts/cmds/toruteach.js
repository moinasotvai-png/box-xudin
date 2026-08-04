const axios = require("axios");
const TORU_GATEWAY = (
  process.env.HRIDoy_API_URL ||
  process.env.TORU_API_URL ||
  "https://hridoy-api.onrender.com"
).replace(/\/+$/, "");

const TORU_SECRET = process.env.TORU_BOT_SECRET || "";

const REQUEST_TIMEOUT = 12000;
const MAX_TEXT_LENGTH = 500;

// Prevent the same reply event from being sent repeatedly.
const processedReplies = new Map();
const PROCESSED_TTL = 60 * 1000;

// Small queue so a busy group does not create hundreds of
// simultaneous requests.
let requestChain = Promise.resolve();

function queueRequest(task) {
  requestChain = requestChain
    .then(task)
    .catch(err => {
      console.error(
        "[TORU AUTO-TEACH]",
        err?.message || err
      );
    });

  return requestChain;
}

function getPrefix() {
  return (
    global.GoatBot?.config?.prefix ||
    ""
  );
}

function isUsableText(text) {
  if (typeof text !== "string") return false;

  const value = text.trim();

  if (!value) return false;
  if (value.length > MAX_TEXT_LENGTH) return false;

  return true;
}

function isCommand(text) {
  if (!isUsableText(text)) return true;

  const prefix = getPrefix();

  if (!prefix) return false;

  return text.trim().startsWith(prefix);
}

function cleanupProcessed() {
  const now = Date.now();

  for (const [key, time] of processedReplies) {
    if (now - time > PROCESSED_TTL) {
      processedReplies.delete(key);
    }
  }
}

function getReplyKey(event) {
  const reply = event?.messageReply;

  return [
    event?.threadID || "",
    reply?.messageID || "",
    event?.messageID || "",
    event?.senderID || ""
  ].join(":");
}

/*
 * Enable server-side autoTeach automatically.
 *
 * Even if the API already has it ON, this simply keeps it ON.
 */
async function enableAutoTeach() {
  try {
    const response = await axios.post(
      `${TORU_GATEWAY}/api/setting`,
      {
        autoTeach: true,
        secret: TORU_SECRET
      },
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data?.success === false) {
      console.error(
        "[TORU AUTO-TEACH] Could not enable:",
        response.data?.error ||
        response.data?.message ||
        "Unknown error"
      );
    } else {
      console.log(
        "[TORU AUTO-TEACH] Enabled successfully."
      );
    }
  } catch (err) {
    console.error(
      "[TORU AUTO-TEACH] Enable error:",
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message
    );
  }
}

/*
 * Save:
 *
 * replied message = Question
 * current message = Answer
 */
async function learn(question, answer) {
  if (!isUsableText(question)) return;
  if (!isUsableText(answer)) return;

  if (isCommand(question)) return;
  if (isCommand(answer)) return;

  const payload = {
    question: question.trim(),
    answer: answer.trim(),
    secret: TORU_SECRET
  };

  try {
    const response = await axios.post(
      `${TORU_GATEWAY}/api/learn`,
      payload,
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    if (response.data?.success === false) {
      console.error(
        "[TORU AUTO-TEACH] Learn rejected:",
        response.data?.error ||
        response.data?.message ||
        "Unknown error"
      );
    }
  } catch (err) {
    console.error(
      "[TORU AUTO-TEACH] Learn error:",
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message
    );
  }
}

module.exports = {
  config: {
    name: "toruteach",
    aliases: ["autoteach"],
    version: "3.0.0",
    author: "HR ID OY",
    countDown: 3,
    role: 1,

    shortDescription:
      "Automatic reply-chat learning",

    longDescription:
      "Automatically stores every valid reply pair as Question → Answer in TORU API. Works for Bot → User, User → Bot and User → User replies.",

    category: "System",

    guide: {
      en:
        "{p}toruteach status\n" +
        "{p}toruteach on\n" +
        "{p}toruteach off"
    }
  },

  /*
   * Automatically enable autoTeach when the command module loads.
   *
   * No manual command is required after installation.
   */
  onLoad: async function () {
    await enableAutoTeach();
  },

  onStart: async function ({ args, message }) {
    const sub = (
      args?.[0] ||
      "status"
    ).toLowerCase();

    try {
      /*
       * Manual ON
       */
      if (sub === "on") {
        await enableAutoTeach();

        return message.reply(
          "✅ TORU Auto Teach এখন ON 🟢\n" +
          "সব valid reply Question → Answer হিসেবে auto-sync হবে."
        );
      }

      /*
       * Manual OFF
       *
       * This is still available if you intentionally want
       * to stop server-side learning.
       */
      if (sub === "off") {
        const response = await axios.post(
          `${TORU_GATEWAY}/api/setting`,
          {
            autoTeach: false,
            secret: TORU_SECRET
          },
          {
            timeout: REQUEST_TIMEOUT,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

        if (response.data?.success === false) {
          return message.reply(
            response.data?.error ||
            response.data?.message ||
            "❌ Auto Teach OFF করা যায়নি."
          );
        }

        return message.reply(
          "🔴 TORU Auto Teach OFF করা হয়েছে."
        );
      }

      /*
       * STATUS
       */
      const response = await axios.get(
        `${TORU_GATEWAY}/api/setting`,
        {
          timeout: REQUEST_TIMEOUT
        }
      );

      return message.reply(
        "╭─╼ 🤖 TORU AUTO-TEACH\n" +
        `├ Status: ${
          response.data?.autoTeach
            ? "ON 🟢"
            : "OFF 🔴"
        }\n` +
        "├ Mode: Automatic\n" +
        "├ Gateway: HR ID OY\n" +
        "╰─╼ Reply Sync: Active"
      );

    } catch (err) {
      return message.reply(
        "❌ TORU Gateway Error:\n" +
        (
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message
        )
      );
    }
  },

  /*
   * Every normal chat event comes here.
   *
   * IMPORTANT:
   * event.messageReply exists only when the current
   * message is replying to another message.
   */
  onChat: async function ({ api, event }) {
    try {
      if (!event) return;

      /*
       * Ignore bot's own events.
       */
      if (
        event.senderID &&
        event.senderID === api.getCurrentUserID()
      ) {
        return;
      }

      /*
       * Only reply messages are teachable.
       */
      if (!event.messageReply) return;

      const question =
        event.messageReply.body;

      const answer =
        event.body;

      /*
       * Only text Question → Answer pairs.
       */
      if (!isUsableText(question)) return;
      if (!isUsableText(answer)) return;

      /*
       * Skip commands.
       */
      if (isCommand(question)) return;
      if (isCommand(answer)) return;

      /*
       * Prevent duplicate processing.
       */
      cleanupProcessed();

      const replyKey =
        getReplyKey(event);

      if (processedReplies.has(replyKey)) {
        return;
      }

      processedReplies.set(
        replyKey,
        Date.now()
      );

      /*
       * Queue the API request.
       *
       * This prevents multiple simultaneous requests
       * when a group becomes very active.
       */
      queueRequest(() =>
        learn(
          question,
          answer
        )
      );

    } catch (err) {
      console.error(
        "[TORU AUTO-TEACH] onChat error:",
        err?.message || err
      );
    }
  }
};
