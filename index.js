require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");

// ===============================
// CONFIG
// ===============================

const BOT_TOKEN =
  process.env.BOT_TOKEN ||
  "TU_TOKEN_AQUI";

const ADMIN_ID = "6794562791";

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
});

// ===============================
// MEMORIA
// ===============================

const users = {};

// ===============================
// FUNCIONES
// ===============================

function calculateCommission(amount) {

  // 1 a 49 = comisión fija 5

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
// MENU PRINCIPAL
// ===============================

async function mainMenu(chatId) {

  return bot.sendMessage(
    chatId,
`\`\`\`
          JCS
  Remesas y Recarga
\`\`\`

_Este es un bot de Remesas y Recargas para Cuba._

🔥 Servicio rápido y seguro
📱 Recargas nacionales e internacionales
💸 Remesas automáticas`,
{
  parse_mode: "Markdown",
  reply_markup: {
    keyboard: [

      [
        "💵 Remesa",
        "📱 Recarga"
      ],

      [
        "🆘 Soporte"
      ],

      [
        "👮 Admin"
      ],

    ],
    resize_keyboard: true,
  },
}
  );
}

// ===============================
// START
// ===============================

bot.onText(/\/start/, async (msg) => {

  const chatId = msg.chat.id;

  users[chatId] = {};

  await mainMenu(chatId);

});

// ===============================
// MENSAJES
// ===============================

bot.on("message", async (msg) => {

  try {

    if (!msg.text) return;

    const chatId = msg.chat.id;

    if (!users[chatId]) {
      users[chatId] = {};
    }

    const user = users[chatId];

    const text = msg.text;

    if (text === "/start") return;

    // ===============================
    // MENU
    // ===============================

    if (text === "⬅️ Volver") {

      users[chatId] = {};

      return mainMenu(chatId);
    }

    // ===============================
    // SOPORTE
    // ===============================

    if (text === "🆘 Soporte") {

      return bot.sendMessage(
        chatId,
        "🆘 Soporte:\n\nhttps://t.me/JCS_LLC"
      );
    }

    // ===============================
    // ADMIN
    // ===============================

    if (text === "👮 Admin") {

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

    if (text === "💵 Remesa") {

      user.type = "Remesa";
      user.step = "amount_select";

      return bot.sendMessage(
        chatId,
`💵 Seleccione un monto`,
{
  reply_markup: {
    keyboard: [

      [
        "50",
        "100"
      ],

      [
        "✍️ Personalizado"
      ],

      [
        "⬅️ Volver"
      ],

    ],
    resize_keyboard: true,
  },
}
      );
    }

    // ===============================
    // SELECCION MONTO REMESA
    // ===============================

    if (user.step === "amount_select") {

      if (text === "50" || text === "100") {

        const amount = parseFloat(text);

        user.amount = amount;

        const commission =
          calculateCommission(amount);

        user.commission = commission;
        user.total = amount + commission;

        user.step = "remesa_payment";

        return bot.sendMessage(
          chatId,
`💵 Monto: $${amount}
📌 Comisión: $${commission}
✅ Total: $${user.total}

💳 Seleccione método de pago`,
{
  reply_markup: {
    keyboard: [

      [
        "🅿️ PayPal",
        "🏦 Zelle"
      ],

      [
        "⬅️ Volver"
      ],

    ],
    resize_keyboard: true,
  },
}
        );
      }

      if (text === "✍️ Personalizado") {

        user.step = "amount";

        return bot.sendMessage(
          chatId,
`✍️ Envíe el monto personalizado

Ejemplo:
75
150
250`
        );
      }
    }

    // ===============================
    // MONTO PERSONALIZADO REMESA
    // ===============================

    if (user.step === "amount") {

      const amount = parseFloat(text);

      if (isNaN(amount)) {

        return bot.sendMessage(
          chatId,
          "❌ Monto inválido"
        );
      }

      user.amount = amount;

      const commission =
        calculateCommission(amount);

      user.commission = commission;
      user.total = amount + commission;

      user.step = "remesa_payment";

      return bot.sendMessage(
        chatId,
`💵 Monto: $${amount}
📌 Comisión: $${commission}
✅ Total: $${user.total}

💳 Seleccione método de pago`,
{
  reply_markup: {
    keyboard: [

      [
        "🅿️ PayPal",
        "🏦 Zelle"
      ],

      [
        "⬅️ Volver"
      ],

    ],
    resize_keyboard: true,
  },
}
      );
    }

    // ===============================
    // PAYPAL
    // ===============================

    if (
      user.step === "remesa_payment" &&
      text === "🅿️ PayPal"
    ) {

      user.remesaPayment = "PayPal";
      user.step = "remesa_screenshot";

      return bot.sendMessage(
        chatId,
`🅿️ PAYPAL

🔗 Link:
https://www.paypal.com/paypalme/josecastineira00

⚠️ IMPORTANTE
NO poner nada relacionado al pago.

📸 Después de pagar envíe captura de pantalla`
      );
    }

    // ===============================
    // ZELLE
    // ===============================

    if (
      user.step === "remesa_payment" &&
      text === "🏦 Zelle"
    ) {

      user.remesaPayment = "Zelle";
      user.step = "remesa_screenshot";

      return bot.sendMessage(
        chatId,
`🏦 ZELLE

👤 Nombre:
JCS LLC

📱 Número:
+15026583021

⚠️ IMPORTANTE
NO poner nada relacionado al pago.

📸 Después de pagar envíe captura de pantalla`
      );
    }

    // ===============================
    // RECARGA
    // ===============================

    if (text === "📱 Recarga") {

      return bot.sendMessage(
        chatId,
        "📱 Seleccione tipo:",
        {
          reply_markup: {
            keyboard: [

              [
                "🇨🇺 Nacional",
                "🌍 Internacional"
              ],

              [
                "⬅️ Volver"
              ],

            ],
            resize_keyboard: true,
          },
        }
      );
    }

    // ===============================
    // RECARGA NACIONAL
    // ===============================

    if (text === "🇨🇺 Nacional") {

      user.type = "Recarga Nacional";
      user.step = "plan";

      return bot.sendMessage(
        chatId,
        "📦 Seleccione plan:",
        {
          reply_markup: {
            keyboard: [

              [
                "120 CUP",
                "240 CUP"
              ],

              [
                "360 CUP"
              ],

              [
                "⬅️ Volver"
              ],

            ],
            resize_keyboard: true,
          },
        }
      );
    }

    // ===============================
    // RECARGA INTERNACIONAL
    // ===============================

    if (text === "🌍 Internacional") {

      user.type = "Recarga Internacional";
      user.step = "plan";

      return bot.sendMessage(
        chatId,
        "🌍 Seleccione promoción:",
        {
          reply_markup: {
            keyboard: [

              [
                "Promo 1",
                "Promo 2"
              ],

              [
                "⬅️ Volver"
              ],

            ],
            resize_keyboard: true,
          },
        }
      );
    }

    // ===============================
    // PLANES
    // ===============================

    if (
      text === "120 CUP" ||
      text === "240 CUP" ||
      text === "360 CUP" ||
      text === "Promo 1" ||
      text === "Promo 2"
    ) {

      user.plan = text;
      user.step = "payment";

      return bot.sendMessage(
        chatId,
        "💳 Seleccione método de pago:",
        {
          reply_markup: {
            keyboard: [

              [
                "💵 Efectivo",
                "🏦 Transferencia"
              ],

              [
                "⬅️ Volver"
              ],

            ],
            resize_keyboard: true,
          },
        }
      );
    }

    // ===============================
    // PAGO RECARGA
    // ===============================

    if (
      text === "💵 Efectivo" ||
      text === "🏦 Transferencia"
    ) {

      user.payment = text;

      let total = 0;

      if (user.plan === "120 CUP") {
        total =
          text === "🏦 Transferencia"
            ? 700
            : 500;
      }

      if (user.plan === "240 CUP") {
        total =
          text === "🏦 Transferencia"
            ? 1500
            : 1000;
      }

      if (user.plan === "360 CUP") {
        total =
          text === "🏦 Transferencia"
            ? 2000
            : 1500;
      }

      if (user.plan === "Promo 1") {
        total = 20;
      }

      if (user.plan === "Promo 2") {
        total = 40;
      }

      user.total = total;
      user.step = "phone_recharge";

      if (text === "💵 Efectivo") {

        return bot.sendMessage(
          chatId,
`💵 PAGO EN EFECTIVO

📦 Plan: ${user.plan}
💰 Total: ${total}

📱 Ahora envíe el número`
        );
      }

      return bot.sendMessage(
        chatId,
`🏦 TRANSFERENCIA

📦 Plan: ${user.plan}
💰 Total: ${total}

💳 Tarjeta:
1234 5678 9012 3456

📱 Ahora envíe el número`
      );
    }

    // ===============================
    // NUMERO RECARGA
    // ===============================

    if (user.step === "phone_recharge") {

      if (!isValidPhone(text)) {

        return bot.sendMessage(
          chatId,
          "❌ Número inválido"
        );
      }

      user.rechargePhone = `+53${text}`;

      user.step = "screenshot";

      return bot.sendMessage(
        chatId,
`📦 Plan: ${user.plan}
📱 Número: ${user.rechargePhone}

📸 Envíe captura/foto`
      );
    }

    // ===============================
    // NOMBRE REMESA
    // ===============================

    if (user.step === "name") {

      user.name = text;

      user.step = "phone";

      return bot.sendMessage(
        chatId,
        "📱 Envíe teléfono del familiar"
      );
    }

    // ===============================
    // TELEFONO REMESA
    // ===============================

    if (user.step === "phone") {

      if (!isValidPhone(text)) {

        return bot.sendMessage(
          chatId,
          "❌ Número inválido"
        );
      }

      user.phone = `+53${text}`;

      user.step = "address";

      return bot.sendMessage(
        chatId,
        "🏠 Envíe dirección"
      );
    }

    // ===============================
    // DIRECCION REMESA
    // ===============================

    if (user.step === "address") {

      user.address = text;

      await bot.sendMessage(
        ADMIN_ID,
`🔥 NUEVA REMESA

💵 Monto: ${user.amount}
📌 Comisión: ${user.commission}
💰 Total: ${user.total}

💳 Método:
${user.remesaPayment}

👤 Nombre:
${user.name}

📱 Número:
${user.phone}

🏠 Dirección:
${user.address}`
      );

      await bot.sendMessage(
        chatId,
        "✅ Remesa enviada correctamente"
      );

      delete users[chatId];

      return;
    }

  } catch (err) {

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

👤 Ahora envíe el nombre del familiar`
      );
    }

    // ===============================
    // RECARGA
    // ===============================

    if (user.step === "screenshot") {

      await bot.sendPhoto(
        ADMIN_ID,
        photo,
        {
          caption:
`🔥 NUEVA RECARGA

📦 Plan: ${user.plan}

📱 Número:
${user.rechargePhone}

💳 Pago:
${user.payment}

💰 Total:
${user.total}`
        }
      );

      await bot.sendMessage(
        chatId,
        "✅ Recarga enviada correctamente"
      );

      delete users[chatId];
    }

  } catch (err) {

    console.log(err);

  }

});

// ===============================
// ERROR
// ===============================

bot.on("polling_error", (err) => {

  console.log(err.message);

});

console.log("✅ BOT INICIADO");
