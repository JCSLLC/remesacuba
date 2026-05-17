require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");

// ===============================
// CONFIG
// ===============================

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

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
💸 *Remesas y Recargas*

_Este es un bot de Remesas y Recargas para Cuba._

🔥 Servicio rápido y seguro
📱 Recargas nacionales e internacionales
💸 Remesas automáticas
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

📦 Pedidos guardados: ${orders.length}
👥 Usuarios activos: ${Object.keys(users).length}

Seleccione una opción`,
{
  reply_markup: {
    keyboard: [

      [
        "📦 Pedidos"
      ],

      [
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

      return bot.sendMessage(
        chatId,
        message
      );
    }

    // ===============================
    // ESTADISTICAS
    // ===============================

    if (
      text === "📊 Estadísticas" &&
      String(chatId) === String(ADMIN_ID)
    ) {

      const totalOrders = orders.length;

      let totalMoney = 0;

      orders.forEach(o => {
        totalMoney += Number(o.total || 0);
      });

      return bot.sendMessage(
        chatId,
`📊 ESTADÍSTICAS

📦 Pedidos:
${totalOrders}

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
    // MONTO PERSONALIZADO
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

📸 Después de pagar envíe captura`
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

📸 Después de pagar envíe captura`
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
      user.step === "payment" &&
      (
        text === "💵 Efectivo" ||
        text === "🏦 Transferencia"
      )
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

      orders.push({
        type: "Remesa",
        amount: user.amount,
        total: user.total,
        phone: user.phone,
        name: user.name,
      });

      await bot.sendPhoto(
        ADMIN_ID,
        user.remesaPhoto,
{
  caption:
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
${user.address}

👤 Cliente:
@${msg.from.username || "Sin username"}

🆔 ID:
${chatId}`
}
      );

      await bot.sendMessage(
        chatId,
`✅ REMESA ENVIADA CORRECTAMENTE

🧾 RECIBO

━━━━━━━━━━━━━━
💵 Tipo: Remesa
💰 Monto: $${user.amount}
📌 Comisión: $${user.commission}
💳 Total Pagado: $${user.total}

💳 Método:
${user.remesaPayment}

👤 Beneficiario:
${user.name}

📱 Teléfono:
${user.phone}

🏠 Dirección:
${user.address}
━━━━━━━━━━━━━━

🔥 Gracias por utilizar JCS`
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

      orders.push({
        type: "Recarga",
        plan: user.plan,
        phone: user.rechargePhone,
        total: user.total,
      });

      await bot.sendPhoto(
        ADMIN_ID,
        photo,
{
  caption:
`🔥 NUEVA RECARGA

📦 Plan:
${user.plan}

📱 Número:
${user.rechargePhone}

💳 Pago:
${user.payment}

💰 Total:
${user.total}

👤 Cliente:
@${msg.from.username || "Sin username"}

🆔 ID:
${chatId}`
}
      );

      await bot.sendMessage(
        chatId,
`✅ RECARGA ENVIADA CORRECTAMENTE

🧾 RECIBO

━━━━━━━━━━━━━━
📦 Tipo:
${user.type}

📱 Número:
${user.rechargePhone}

📦 Plan:
${user.plan}

💳 Método:
${user.payment}

💰 Total:
${user.total}
━━━━━━━━━━━━━━

🔥 Gracias por utilizar JCS`
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
