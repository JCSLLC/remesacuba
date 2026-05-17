require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");

// ===============================
// CONFIG
// ===============================

const BOT_TOKEN =
  process.env.BOT_TOKEN ||
  "8908816666:AAHlljrxy7VG15_zOl7UoVNVb0BziY0bmtg";

const ADMIN_ID = "6794562791";

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
});

// ===============================
// ANTI CRASH
// ===============================

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION:");
  console.log(err);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION:");
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

  // 1 - 49 = fijo 5

  if (amount >= 1 && amount <= 49) {
    return 5;
  }

  // 50+ = 10%

  return amount * 0.1;
}

function isValidPhone(phone) {
  return /^[0-9]{8}$/.test(phone);
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
                text: "💵 Remesa",
                callback_data: "remesa",
              },
              {
                text: "📱 Recarga",
                callback_data: "recargas",
              },
            ],

            [
              {
                text: "🆘 Soporte",
                url: "https://t.me/JCS_LLC",
              },
            ],

            [
              {
                text: "👮 Admin",
                callback_data: "admin",
              },
            ],

          ],
        },
      }
    );

  } catch (err) {

    console.log("START ERROR:");
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
    // ADMIN
    // ===============================

    if (query.data === "admin") {

      if (String(chatId) !== String(ADMIN_ID)) {

        return bot.sendMessage(
          chatId,
          "❌ Acceso denegado"
        );
      }

      return bot.sendMessage(
        chatId,
        `👮 PANEL ADMIN

✅ Bot funcionando correctamente`
      );
    }

    // ===============================
    // REMESA
    // ===============================

    if (query.data === "remesa") {

      user.type = "Remesa";
      user.step = "amount";

      return bot.sendMessage(
        chatId,
        "💵 Seleccione o Escriba un monto:",
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
    // MONTOS REMESA
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

      user.step = "remesa_payment";

      return bot.sendMessage(
        chatId,
        `💵 Monto: $${amount}
📌 Comisión: $${commission}
✅ Total a Pagar: $${user.total}

💳 Seleccione método de pago:`,
        {
          reply_markup: {
            inline_keyboard: [

              [
                {
                  text: "🅿️ PayPal",
                  callback_data: "remesa_paypal",
                },
              ],

              [
                {
                  text: "🏦 Zelle",
                  callback_data: "remesa_zelle",
                },
              ],

            ],
          },
        }
      );
    }

    // ===============================
    // PAYPAL
    // ===============================

    if (query.data === "remesa_paypal") {

      user.remesaPayment = "PayPal";
      user.step = "remesa_screenshot";

      return bot.sendMessage(
        chatId,
        `🅿️ Pago por PayPal

🔗 Link:
https://www.paypal.com/paypalme/josecastineira00

⚠️ IMPORTANTE:
NO poner nada relacionado al pago.

📸 Después de pagar envíe captura de pantalla`
      );
    }

    // ===============================
    // ZELLE
    // ===============================

    if (query.data === "remesa_zelle") {

      user.remesaPayment = "Zelle";
      user.step = "remesa_screenshot";

      return bot.sendMessage(
        chatId,
        `🏦 Pago por Zelle

👤 Nombre: JCS LLC
📱 Número: +15026583021

⚠️ IMPORTANTE:
NO poner nada relacionado al pago.

📸 Después de pagar envíe captura de pantalla`
      );
    }

    // ===============================
    // RECARGAS
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
      user.step = "select_plan";

      return bot.sendMessage(
        chatId,
        "📦 Seleccione el plan nacional:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "120 CUP",
                  callback_data: "plan_120",
                },
              ],
              [
                {
                  text: "240 CUP",
                  callback_data: "plan_240",
                },
              ],
              [
                {
                  text: "360 CUP",
                  callback_data: "plan_360",
                },
              ],
            ],
          },
        }
      );
    }

    // ===============================
    // INTERNACIONAL
    // ===============================

    if (query.data === "internacional") {

      user.type = "Recarga Internacional";
      user.step = "select_plan";

      return bot.sendMessage(
        chatId,
        "🌍 Seleccione el plan internacional:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Promoción",
                  callback_data: "plan_120",
                },
              ],
              [
                {
                  text: "Promoción 2",
                  callback_data: "plan_240",
                },
              ],
            ],
          },
        }
      );
    }

    // ===============================
    // PLANES
    // ===============================

    if (query.data.startsWith("plan_")) {

      const plan = query.data.split("_")[1];

      user.plan = plan;

      return bot.sendMessage(
        chatId,
        "💳 Seleccione método de pago:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "💵 Efectivo",
                  callback_data: "pago_efectivo",
                },
              ],
              [
                {
                  text: "🏦 Transferencia",
                  callback_data: "pago_transferencia",
                },
              ],
            ],
          },
        }
      );
    }

    // ===============================
    // PAGOS RECARGA
    // ===============================

    if (query.data.startsWith("pago_")) {

      const metodo = query.data.split("_")[1];

      user.payment = metodo;

      let precio = 0;

      if (metodo === "transferencia") {

        if (user.plan === "120") {
          precio = 700;
        }

        if (user.plan === "240") {
          precio = 1500;
        }

        if (user.plan === "360") {
          precio = 2000;
        }

      } else {

        if (user.plan === "120") {
          precio = 500;
        }

        if (user.plan === "240") {
          precio = 1000;
        }

        if (user.plan === "360") {
          precio = 1500;
        }
      }

      user.total = precio;
      user.step = "phone_recharge";

      // EFECTIVO

      if (metodo === "efectivo") {

        return bot.sendMessage(
          chatId,
          `💳 MÉTODO: EFECTIVO

📦 Plan: ${user.plan}

💰 Total: ${precio}

📱 Envíe el número a recargar`
        );
      }

      // TRANSFERENCIA

      return bot.sendMessage(
        chatId,
        `💳 MÉTODO: TRANSFERENCIA

📦 Plan: ${user.plan}

💰 Total: ${precio}

🏦 Tarjeta:
${process.env.CARD_NUMBER || "NO CONFIG"}

📱 Envíe el número a recargar`
      );
    }

  } catch (err) {

    console.log("CALLBACK ERROR:");
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
    // MONTO REMESA MANUAL
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

      user.step = "remesa_payment";

      return bot.sendMessage(
        chatId,
        `💵 Monto: $${amount}
📌 Comisión: $${commission}
✅ Total a Pagar: $${user.total}

💳 Seleccione método de pago:`,
        {
          reply_markup: {
            inline_keyboard: [

              [
                {
                  text: "🅿️ PayPal",
                  callback_data: "remesa_paypal",
                },
              ],

              [
                {
                  text: "🏦 Zelle",
                  callback_data: "remesa_zelle",
                },
              ],

            ],
          },
        }
      );
    }

    // ===============================
    // NOMBRE REMESA
    // ===============================

    if (user.step === "name") {

      user.name = msg.text;

      user.step = "phone";

      return bot.sendMessage(
        chatId,
        "📱 Envíe el teléfono del familiar"
      );
    }

    // ===============================
    // TELEFONO REMESA
    // ===============================

    if (user.step === "phone") {

      if (!isValidPhone(msg.text)) {

        return bot.sendMessage(
          chatId,
          "❌ Número inválido"
        );
      }

      user.phone = `+53${msg.text}`;

      user.step = "address";

      return bot.sendMessage(
        chatId,
        "🏠 Envíe la dirección"
      );
    }

    // ===============================
    // DIRECCION
    // ===============================

    if (user.step === "address") {

      user.address = msg.text;

      return bot.sendMessage(
        chatId,
        `✅ DATOS RECIBIDOS

👤 Nombre: ${user.name}
📱 Teléfono: ${user.phone}
🏠 Dirección: ${user.address}

💵 Total pagado: $${user.total}`
      );
    }

    // ===============================
    // TELEFONO RECARGA
    // ===============================

    if (user.step === "phone_recharge") {

      if (!isValidPhone(msg.text)) {

        return bot.sendMessage(
          chatId,
          "❌ Número inválido\n\nDebe contener 8 dígitos"
        );
      }

      user.rechargePhone = `+53${msg.text}`;

      user.step = "screenshot";

      if (user.payment === "efectivo") {

        return bot.sendMessage(
          chatId,
          `📦 Plan: ${user.plan}
📱 Número: ${user.rechargePhone}

💵 Pago en efectivo

📸 Envíe foto/comprobante`
        );
      }

      return bot.sendMessage(
        chatId,
        `📦 Plan: ${user.plan}
📱 Número: ${user.rechargePhone}

🏦 Transferencia:
${process.env.CARD_NUMBER || "NO CONFIG"}

📸 Envíe captura del pago`
      );
    }

  } catch (err) {

    console.log("MESSAGE ERROR:");
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

    // ===============================
    // CAPTURA REMESA
    // ===============================

    if (user.step === "remesa_screenshot") {

      user.remesaPhoto = photo;

      user.step = "name";

      return bot.sendMessage(
        chatId,
        `✅ Captura recibida

👤 Envíe el nombre del familiar`
      );
    }

    // ===============================
    // ENVIO ADMIN
    // ===============================

    await bot.sendPhoto(
      ADMIN_ID,
      user.remesaPhoto || photo,
      {
        caption:
          `🔥 NUEVA OPERACIÓN\n\n` +
          `📌 Tipo: ${user.type || "N/A"}\n` +
          `💳 Método: ${user.remesaPayment || user.payment || "N/A"}\n` +
          `📦 Plan: ${user.plan || "N/A"}\n` +
          `📱 Número: ${user.rechargePhone || user.phone || "N/A"}\n` +
          `💵 Total: ${user.total || "N/A"}`
      }
    );

    await bot.sendMessage(
      chatId,
      "✅ Operación recibida correctamente"
    );

    delete users[chatId];

  } catch (err) {

    console.log("PHOTO ERROR:");
    console.log(err);

  }

});

// ===============================
// POLLING ERROR
// ===============================

bot.on("polling_error", (err) => {

  console.log("POLLING ERROR:");
  console.log(err.message);

});

console.log("✅ BOT INICIADO");
