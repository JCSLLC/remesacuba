```js id="rls6mc"
require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");

// ===============================
// VALIDAR VARIABLES
// ===============================

if (!process.env.BOT_TOKEN) {
  console.log("❌ BOT_TOKEN faltante");
  process.exit(1);
}

if (!process.env.ADMIN_ID) {
  console.log("❌ ADMIN_ID faltante");
  process.exit(1);
}

// ===============================
// BOT
// ===============================

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: {
    interval: 1000,
    autoStart: true,
    params: {
      timeout: 10,
    },
  },
});

// ===============================
// ANTI CRASH
// ===============================

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION");
  console.log(err);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION");
  console.log(err);
});

// ===============================
// MEMORIA
// ===============================

const users = {};

// ===============================
// FUNCIONES
// ===============================

function calculateCommission(amount) {
  if (amount >= 1 && amount <= 49) {
    return 5;
  }

  return amount * 0.1;
}

function isValidPhone(phone) {
  return /^[0-9+]{8,15}$/.test(phone);
}

// ===============================
// START
// ===============================

bot.onText(/\/start/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    users[chatId] = {};

    await bot.sendMessage(
      chatId,
      `🇨🇺 *SERVICIO PREMIUM CUBA*

━━━━━━━━━━━━━━━
💸 Remesas a Cuba
📱 Recargas Nacionales
🌍 Recargas Internacionales
━━━━━━━━━━━━━━━

Seleccione una opción:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "💵 Enviar Remesa",
                callback_data: "remesa",
              },
            ],
            [
              {
                text: "📱 Recargas",
                callback_data: "recargas",
              },
            ],
          ],
        },
      }
    );
  } catch (err) {
    console.log(err);
  }
});

// ===============================
// CALLBACKS
// ===============================

bot.on("callback_query", async (query) => {
  try {
    await bot.answerCallbackQuery(query.id);

    if (!query.message) return;

    const chatId = query.message.chat.id;

    if (!users[chatId]) {
      users[chatId] = {};
    }

    const user = users[chatId];

    // ===============================
    // REMESA
    // ===============================

    if (query.data === "remesa") {
      user.type = "Remesa";
      user.step = "amount";

      return bot.sendMessage(
        chatId,
        "💵 Envíe monto o seleccione:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "$50",
                  callback_data: "monto_50",
                },
                {
                  text: "$100",
                  callback_data: "monto_100",
                },
              ],
            ],
          },
        }
      );
    }

    // ===============================
    // MONTOS
    // ===============================

    if (query.data.startsWith("monto_")) {
      const amount = Number(query.data.split("_")[1]);

      if (!amount) {
        return bot.sendMessage(chatId, "❌ Monto inválido");
      }

      user.amount = amount;

      const commission = calculateCommission(amount);

      user.commission = commission;
      user.total = amount + commission;

      user.step = "name";

      return bot.sendMessage(
        chatId,
        `💵 Monto: $${amount}
📌 Comisión: $${commission}
✅ Total: $${user.total}

👤 Envíe nombre del familiar`
      );
    }

    // ===============================
    // MENU RECARGAS
    // ===============================

    if (query.data === "recargas") {
      return bot.sendMessage(
        chatId,
        "📱 Seleccione tipo:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🇨🇺 Nacional",
                  callback_data: "nacional",
                },
              ],
              [
                {
                  text: "🌍 Internacional",
                  callback_data: "internacional",
                },
              ],
            ],
          },
        }
      );
    }

    // ===============================
    // NACIONAL
    // ===============================

    if (query.data === "nacional") {
      user.type = "Recarga Nacional";
      user.step = "phone_recharge";

      return bot.sendMessage(
        chatId,
        "📱 Envíe número a recargar"
      );
    }

    // ===============================
    // INTERNACIONAL
    // ===============================

    if (query.data === "internacional") {
      user.type = "Recarga Internacional";
      user.step = "phone_recharge";

      return bot.sendMessage(
        chatId,
        "🌍 Envíe número a recargar"
      );
    }

    // ===============================
    // SALDOS
    // ===============================

    if (query.data.startsWith("saldo_")) {
      user.saldo = query.data.split("_")[1];

      return bot.sendMessage(
        chatId,
        "💳 Seleccione método:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Transferencia",
                  callback_data: "transferencia",
                },
              ],
            ],
          },
        }
      );
    }

    // ===============================
    // TRANSFERENCIA
    // ===============================

    if (query.data === "transferencia") {
      user.payment = "Transferencia";
      user.step = "screenshot";

      return bot.sendMessage(
        chatId,
        `🏦 TRANSFERENCIA

💳 Tarjeta:
${process.env.CARD_NUMBER || "NO CONFIG"}

📸 Envíe captura`
      );
    }
  } catch (err) {
    console.log("CALLBACK ERROR");
    console.log(err);
  }
});

// ===============================
// MENSAJES
// ===============================

bot.on("message", async (msg) => {
  try {
    if (!msg.text) return;

    const chatId = msg.chat.id;

    if (!users[chatId]) return;

    const user = users[chatId];

    if (msg.text === "/start") return;

    // ===============================
    // MONTO
    // ===============================

    if (user.step === "amount") {
      const amount = parseFloat(msg.text);

      if (isNaN(amount)) {
        return bot.sendMessage(
          chatId,
          "❌ Monto inválido"
        );
      }

      user.amount = amount;

      const commission = calculateCommission(amount);

      user.commission = commission;
      user.total = amount + commission;

      user.step = "name";

      return bot.sendMessage(
        chatId,
        "👤 Envíe nombre"
      );
    }

    // ===============================
    // NOMBRE
    // ===============================

    if (user.step === "name") {
      user.name = msg.text;

      user.step = "phone";

      return bot.sendMessage(
        chatId,
        "📱 Envíe teléfono"
      );
    }

    // ===============================
    // TELEFONO
    // ===============================

    if (user.step === "phone") {
      if (!isValidPhone(msg.text)) {
        return bot.sendMessage(
          chatId,
          "❌ Número inválido"
        );
      }

      user.phone = msg.text;

      user.step = "address";

      return bot.sendMessage(
        chatId,
        "🏠 Envíe dirección"
      );
    }

    // ===============================
    // DIRECCION
    // ===============================

    if (user.step === "address") {
      user.address = msg.text;

      return bot.sendMessage(
        chatId,
        "💳 Seleccione pago",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "PayPal",
                  callback_data: "paypal",
                },
              ],
            ],
          },
        }
      );
    }

    // ===============================
    // RECARGA TELEFONO
    // ===============================

    if (user.step === "phone_recharge") {
      if (!isValidPhone(msg.text)) {
        return bot.sendMessage(
          chatId,
          "❌ Número inválido"
        );
      }

      user.rechargePhone = msg.text;

      return bot.sendMessage(
        chatId,
        "📱 Seleccione saldo",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "120",
                  callback_data: "saldo_120",
                },
              ],
              [
                {
                  text: "240",
                  callback_data: "saldo_240",
                },
              ],
            ],
          },
        }
      );
    }
  } catch (err) {
    console.log("MESSAGE ERROR");
    console.log(err);
  }
});

// ===============================
// FOTOS
// ===============================

bot.on("photo", async (msg) => {
  try {
    const chatId = msg.chat.id;

    if (!users[chatId]) return;

    const user = users[chatId];

    const photo =
      msg.photo[msg.photo.length - 1]?.file_id;

    if (!photo) return;

    await bot.sendPhoto(
      process.env.ADMIN_ID,
      photo,
      {
        caption:
          `🔥 NUEVA OPERACIÓN\n\n` +
          `📌 Tipo: ${user.type || "N/A"}\n` +
          `📱 Número: ${user.rechargePhone || "N/A"}\n` +
          `💵 Total: ${user.total || user.price || "N/A"}`
      }
    );

    await bot.sendMessage(
      chatId,
      "✅ Operación recibida"
    );

    delete users[chatId];

  } catch (err) {
    console.log("PHOTO ERROR");
    console.log(err);
  }
});

// ===============================
// ERROR TELEGRAM
// ===============================

bot.on("polling_error", (err) => {
  console.log("POLLING ERROR");
  console.log(err.code);
});
```
