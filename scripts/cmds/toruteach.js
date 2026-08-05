const axios = require("axios");

/* =========================================================
 * TORU AUTO TEACH v4.0.0
 * Reply → Question
 * Current message → Answer
 *
 * Supports:
 * User  → User
 * User  → Bot
 * Bot   → User
 * Bot   → Bot
 * ========================================================= */

const TORU_GATEWAY = (
  process.env.HRIDoy_API_URL ||
  process.env.TORU_API_URL ||
  "https://hridoy-api.onrender.com"
).replace(/\/+$/, "");

const TORU_SECRET =
  process.env.TORU_BOT_SECRET || "";

const REQUEST_TIMEOUT = 12000;
const MAX_TEXT_LENGTH = 500;
const RETRY_COUNT = 3;
const RETRY_DELAY = 1200;

/*
 * Duplicate protection
 *
 * Key থাকবে 60 seconds।
 */
const processedReplies = new Map();

const PROCESSED_TTL = 60 * 1000;

/*
 * Prevent API flooding.
 */
let requestChain = Promise.resolve();

/* =========================================================
 * Utility
 * ========================================================= */

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getPrefix() {
  return (
    global.GoatBot?.config?.prefix ||
    ""
  );
}

function normalizeText(text) {
  if (typeof text !== "string") {
    return "";
  }

  return text
    .replace(/\r\n/g, "\n")
    .trim();
}

function isUsableText(text) {
  const value = normalizeText(text);

  if (!value) {
    return false;
  }

  if (value.length > MAX_TEXT_LENGTH) {
    return false;
  }

  return true;
}

/*
 * Commands are not stored as training data.
 */
function isCommand(text) {
  const value = normalizeText(text);

  if (!value) {
    return true;
  }

  const prefix = getPrefix();

  if (!prefix) {
    return false;
  }

  return value.startsWith(prefix);
}

/* =========================================================
 * Duplicate cleanup
 * ========================================================= */

function cleanupProcessed() {
  const now = Date.now();

  for (const [key, timestamp] of processedReplies.entries()) {
    if (
      now - timestamp >
      PROCESSED_TTL
    ) {
      processedReplies.delete(key);
    }
  }
}

/*
 * Create a strong event key.
 *
 * We use:
 * threadID
 * replied messageID
 * current messageID
 * senderID
 */
function getReplyKey(event) {
  const reply =
    event?.messageReply || {};

  return [
    event?.threadID || "",
    reply?.messageID || "",
    event?.messageID || "",
    event?.senderID || ""
  ].join("|");
}

/* =========================================================
 * Request Queue
 * ========================================================= */

function queueRequest(task) {
  requestChain =
    requestChain
      .then(task)
      .catch(error => {
        console.error(
          "[TORU AUTO-TEACH] Queue error:",
          error?.message || error
        );
      });

  return requestChain;
}

/* =========================================================
 * API REQUEST WITH RETRY
 * ========================================================= */

async function apiRequest(method, url, data = null) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= RETRY_COUNT;
    attempt++
  ) {
    try {
      const config = {
        method,
        url,
        timeout: REQUEST_TIMEOUT,
        headers: {
          "Content-Type": "application/json"
        }
      };

      if (data !== null) {
        config.data = data;
      }

      return await axios(config);

    } catch (error) {
      lastError = error;

      console.error(
        `[TORU AUTO-TEACH] API attempt ${attempt}/${RETRY_COUNT} failed:`,
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        error
      );

      if (
        attempt < RETRY_COUNT
      ) {
        await sleep(
          RETRY_DELAY * attempt
        );
      }
    }
  }

  throw lastError;
}

/* =========================================================
 * ENABLE AUTO TEACH
 * ========================================================= */

async function enableAutoTeach() {
  try {
    const response =
      await apiRequest(
        "POST",
        `${TORU_GATEWAY}/api/setting`,
        {
          autoTeach: true,
          secret: TORU_SECRET
        }
      );

    if (
      response.data?.success === false
    ) {
      console.error(
        "[TORU AUTO-TEACH] Enable rejected:",
        response.data?.error ||
        response.data?.message ||
        "Unknown error"
      );

      return false;
    }

    console.log(
      "[TORU AUTO-TEACH] Enabled successfully."
    );

    return true;

  } catch (error) {
    console.error(
      "[TORU AUTO-TEACH] Enable error:",
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      error
    );

    return false;
  }
}

/* =========================================================
 * LEARN
 *
 * replied message = Question
 * current message = Answer
 * ========================================================= */

async function learn(
  question,
  answer,
  event
) {
  question =
    normalizeText(question);

  answer =
    normalizeText(answer);

  if (!isUsableText(question)) {
    return;
  }

  if (!isUsableText(answer)) {
    return;
  }

  /*
   * Never train on commands.
   */
  if (isCommand(question)) {
    return;
  }

  if (isCommand(answer)) {
    return;
  }

  const payload = {
    question,
    answer,

    /*
     * Useful metadata.
     * Your API can ignore these if unsupported.
     */
    threadID:
      event?.threadID || "",

    questionMessageID:
      event?.messageReply?.messageID || "",

    answerMessageID:
      event?.messageID || "",

    senderID:
      event?.senderID || "",

    secret: TORU_SECRET
  };

  try {
    const response =
      await apiRequest(
        "POST",
        `${TORU_GATEWAY}/api/learn`,
        payload
      );

    if (
      response.data?.success === false
    ) {
      console.error(
        "[TORU AUTO-TEACH] Learn rejected:",
        response.data?.error ||
        response.data?.message ||
        "Unknown error"
      );

      return;
    }

    console.log(
      "[TORU AUTO-TEACH] Saved:",
      JSON.stringify({
        question,
        answer
      })
    );

  } catch (error) {
    console.error(
      "[TORU AUTO-TEACH] Learn failed permanently:",
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      error
    );
  }
}

/* =========================================================
 * MODULE
 * ========================================================= */

module.exports = {

  config: {
    name: "toruteach",

    aliases: [
      "autoteach",
      "teach"
    ],

    version: "4.0.0",

    author: "HR ID OY",

    countDown: 3,

    role: 1,

    shortDescription:
      "Automatic reply learning",

    longDescription:
      "Automatically syncs every valid reply pair as Question → Answer to TORU API. Sender type does not matter.",

    category: "System",

    guide: {
      en:
        "{p}toruteach status\n" +
        "{p}toruteach on\n" +
        "{p}toruteach off"
    }
  },

  /* =======================================================
   * MODULE LOAD
   * ======================================================= */

  onLoad: async function () {

    console.log(
      "[TORU AUTO-TEACH] Loading..."
    );

    console.log(
      "[TORU AUTO-TEACH] Gateway:",
      TORU_GATEWAY
    );

    /*
     * Automatically enable server-side
     * AutoTeach.
     */
    await enableAutoTeach();

  },

  /* =======================================================
   * COMMAND
   * ======================================================= */

  onStart: async function ({
    args,
    message
  }) {

    const sub =
      (
        args?.[0] ||
        "status"
      )
      .toString()
      .toLowerCase();

    try {

      /* ---------------------------------------------------
       * ON
       * --------------------------------------------------- */

      if (sub === "on") {

        const success =
          await enableAutoTeach();

        if (!success) {

          return message.reply(
            "❌ TORU Auto Teach ON করা যায়নি.\n" +
            "Gateway/API check করো."
          );

        }

        return message.reply(
          "╭─╼ 🤖 TORU AUTO-TEACH\n" +
          "├ Status: ON 🟢\n" +
          "├ Mode: Reply Auto Sync\n" +
          "├ User → User: ✓\n" +
          "├ User → Bot: ✓\n" +
          "├ Bot → User: ✓\n" +
          "├ Bot → Bot: ✓\n" +
          "╰─╼ Question → Answer Active"
        );
      }

      /* ---------------------------------------------------
       * OFF
       * --------------------------------------------------- */

      if (sub === "off") {

        const response =
          await apiRequest(
            "POST",
            `${TORU_GATEWAY}/api/setting`,
            {
              autoTeach: false,
              secret: TORU_SECRET
            }
          );

        if (
          response.data?.success === false
        ) {

          return message.reply(
            response.data?.error ||
            response.data?.message ||
            "❌ Auto Teach OFF করা যায়নি."
          );

        }

        return message.reply(
          "╭─╼ 🤖 TORU AUTO-TEACH\n" +
          "├ Status: OFF 🔴\n" +
          "╰─╼ Auto learning stopped."
        );
      }

      /* ---------------------------------------------------
       * STATUS
       * --------------------------------------------------- */

      const response =
        await apiRequest(
          "GET",
          `${TORU_GATEWAY}/api/setting`
        );

      const status =
        response.data?.autoTeach
          ? "ON 🟢"
          : "OFF 🔴";

      return message.reply(
        "╭─╼ 🤖 TORU AUTO-TEACH\n" +
        `├ Status: ${status}\n` +
        "├ Mode: Automatic Reply Sync\n" +
        "├ User → User: ✓\n" +
        "├ User → Bot: ✓\n" +
        "├ Bot → User: ✓\n" +
        "├ Bot → Bot: ✓\n" +
        "├ Duplicate Guard: ✓\n" +
        "├ API Retry: 3x\n" +
        "╰─╼ Gateway: HR ID OY"
      );

    } catch (error) {

      return message.reply(
        "❌ TORU Gateway Error:\n" +
        (
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Unknown error"
        )
      );

    }
  },

  /* =======================================================
   * AUTO CHAT LISTENER
   *
   * IMPORTANT:
   *
   * No sender type filtering exists here.
   *
   * So:
   * User → User
   * User → Bot
   * Bot → User
   * Bot → Bot
   *
   * সব valid reply pair process হবে।
   * ======================================================= */

  onChat: async function ({
    api,
    event
  }) {

    try {

      if (!event) {
        return;
      }

      /*
       * We ONLY learn when the current message
       * is a reply to another message.
       */
      if (!event.messageReply) {
        return;
      }

      /*
       * Question
       */
      const question =
        event.messageReply.body;

      /*
       * Answer
       */
      const answer =
        event.body;

      /*
       * Validate
       */
      if (!isUsableText(question)) {
        return;
      }

      if (!isUsableText(answer)) {
        return;
      }

      /*
       * Ignore commands.
       */
      if (isCommand(question)) {
        return;
      }

      if (isCommand(answer)) {
        return;
      }

      /*
       * Duplicate protection.
       */
      cleanupProcessed();

      const replyKey =
        getReplyKey(event);

      if (
        processedReplies.has(replyKey)
      ) {
        return;
      }

      /*
       * Mark immediately.
       *
       * This prevents duplicate events
       * from entering the queue.
       */
      processedReplies.set(
        replyKey,
        Date.now()
      );

      /*
       * Instant queue.
       *
       * Sender can be anyone.
       */
      queueRequest(
        () =>
          learn(
            question,
            answer,
            event
          )
      );

    } catch (error) {

      console.error(
        "[TORU AUTO-TEACH] onChat error:",
        error?.message ||
        error
      );

    }
  }
};