require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");

// ===============================
// CONFIG
// ===============================

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

if (!BOT_TOKEN || !ADMIN_ID) {
  throw new Error(
    "❌ Faltan BOT_TOKEN o ADMIN_ID en el archivo .env"
  );
}

const bot = new TelegramBot(BOT_TOKEN, {
  polling: true,
});

// ===============================
// MEMORIA
// ===============================

const users = {};
const orders = [];

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
  return /^[0-9]{8}$/.test(phone);
}

// ===============================
// MENU PRINCIPAL
// ===============================

async function mainMenu(chatId) {

  return bot.sendMessage(
    chatId,
`
💸 *Remesas y Recargas Cuba*

🔥 Servicio rápido y seguro
📱 Recargas nacionales e internacionales
💵 Remesas automáticas
`,
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
    // VOLVER
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

📦 Pedidos: ${orders.length}
👥 Usuarios activos: ${Object.keys(users).length}`,
{
  reply_markup: {
    keyboard: [

      [
        "📦 Pedidos",
        "📊 Estadísticas"
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
    // PEDIDOS ADMIN
    // ===============================

    if (
      text === "📦 Pedidos" &&
      String(chatId) === String(ADMIN_ID)
    ) {

      if (orders.length === 0) {

        return bot.sendMessage(
          chatId,
          "❌ No hay pedidos"
        );
      }

      let message = "📦 PEDIDOS\n\n";

      orders.forEach((o, i) => {

        message +=
`${i + 1}. ${o.type}
💰 ${o.total}

`;
      });

      return bot.sendMessage(chatId, message);
    }

    // ===============================
    // ESTADISTICAS
    // ===============================

    if (
      text === "📊 Estadísticas" &&
      String(chatId) === String(ADMIN_ID)
    ) {

      let totalMoney = 0;

      orders.forEach((o) => {
        totalMoney += Number(o.total || 0);
      });

      return bot.sendMessage(
        chatId,
`📊 ESTADÍSTICAS

📦 Pedidos:
${orders.length}

💰 Total generado:
${totalMoney}`
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
    // MONTO REMESA
    // ===============================

    if (user.step === "amount_select") {

      if (
        text === "50" ||
        text === "100"
      ) {

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
`✍️ Envíe el monto

Ejemplo:
75
150`
        );
      }
    }

    // ===============================
    // MONTO PERSONALIZADO
    // ===============================

    if (user.step === "amount") {

      const amount = parseFloat(text);

      if (
        isNaN(amount) ||
        amount <= 0
      ) {

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

💳 Método de pago`,
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

🔗 https://www.paypal.com/paypalme/josecastineira00

⚠️ NO escribir nada en el pago

📸 Envíe captura`
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

👤 JCS LLC
📱 +15026583021

⚠️ NO escribir nada en el pago

📸 Envíe captura`
      );
    }

    // ===============================
    // RECARGA
    // ===============================

    if (text === "📱 Recarga") {

      return bot.sendMessage(
        chatId,
        "📱 Seleccione tipo",
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
        "📦 Seleccione plan",
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
        "🌍 Seleccione promoción",
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
      user.step === "plan" &&
      (
        text === "120 CUP" ||
        text === "240 CUP" ||
        text === "360 CUP" ||
        text === "Promo 1" ||
        text === "Promo 2"
      )
    ) {

      user.plan = text;
      user.step = "payment";

      return bot.sendMessage(
        chatId,
        "💳 Método de pago",
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
      user.step === "payment" &&
      (
        text === "💵 Efectivo" ||
        text === "🏦 Transferencia"
      )
    ) {

      user.payment = text;

      user.total = 1000;

      user.step = "phone_recharge";

      return bot.sendMessage(
        chatId,
`📱 Envíe número cubano

Ejemplo:
55112233`
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
`📱 ${user.rechargePhone}

📸 Envíe captura`
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
        "📱 Envíe teléfono"
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

      orders.push({
        type: "Remesa",
        amount: user.amount,
        total: user.total,
      });

      try {

        if (user.remesaPhoto) {

          await bot.sendPhoto(
            ADMIN_ID,
            user.remesaPhoto,
{
  caption:
`🔥 NUEVA REMESA

💵 Monto: ${user.amount}
📌 Comisión: ${user.commission}
💰 Total: ${user.total}

👤 ${user.name}
📱 ${user.phone}

🏠 ${user.address}

💳 ${user.remesaPayment}`
}
          );

        } else {

          await bot.sendMessage(
            ADMIN_ID,
`🔥 NUEVA REMESA

💵 ${user.amount}
💰 ${user.total}`
          );

        }

      } catch (adminError) {

        console.log(
          "ERROR ADMIN:",
          adminError.message
        );

      }

      await bot.sendMessage(
        chatId,
`✅ REMESA ENVIADA

🧾 RECIBO

💵 ${user.amount}
📌 Comisión: ${user.commission}
💰 Total: ${user.total}

👤 ${user.name}
📱 ${user.phone}`
      );

      delete users[chatId];

      return;
    }

  } catch (err) {

    console.log(
      "ERROR:",
      err.message
    );

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
    // REMESA FOTO
    // ===============================

    if (user.step === "remesa_screenshot") {

      user.remesaPhoto = photo;

      user.step = "name";

      return bot.sendMessage(
        chatId,
`✅ Captura recibida

👤 Envíe nombre del familiar`
      );
    }

    // ===============================
    // RECARGA FOTO
    // ===============================

    if (user.step === "screenshot") {

      orders.push({
        type: "Recarga",
        total: user.total,
      });

      try {

        await bot.sendPhoto(
          ADMIN_ID,
          photo,
{
  caption:
`🔥 NUEVA RECARGA

📱 ${user.rechargePhone}

📦 ${user.plan}

💳 ${user.payment}

💰 ${user.total}`
}
        );

      } catch (adminError) {

        console.log(
          "ERROR ADMIN:",
          adminError.message
        );

      }

      await bot.sendMessage(
        chatId,
`✅ RECARGA ENVIADA

📱 ${user.rechargePhone}
📦 ${user.plan}
💰 ${user.total}`
      );

      delete users[chatId];
    }

  } catch (err) {

    console.log(
      "ERROR FOTO:",
      err.message
    );

  }

});

// ===============================
// ERROR POLLING
// ===============================

bot.on("polling_error", (err) => {

  console.log(
    "POLLING ERROR:",
    err.message
  );

});

console.log("✅ BOT INICIADO");
