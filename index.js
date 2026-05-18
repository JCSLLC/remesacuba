require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cheerio = require("cheerio");

// ===============================
// CONFIG
// ===============================

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

if (!BOT_TOKEN || !ADMIN_ID) {
  throw new Error(
    "❌ Faltan BOT_TOKEN o ADMIN_ID en .env"
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
// PROMOS ETECSA
// ===============================

let etecsaPromos = [
  "🎁 Promo Internacional"
];

async function updateEtecsaPromos() {

  try {

    console.log(
      "🔄 Actualizando promos ETECSA..."
    );

    const { data } =
      await axios.get(
        "https://www.etecsa.cu/es/recargas",
{
  headers: {
    "User-Agent":
      "Mozilla/5.0",
  },
}
      );

    const $ = cheerio.load(data);

    const promos = [];

    $("body")
      .find("*")
      .each((i, el) => {

        const text =
          $(el)
            .text()
            .trim();

        if (
          text.length > 20 &&
          (
            text.includes("Recarga") ||
            text.includes("GB") ||
            text.includes("Internet") ||
            text.includes("Datos") ||
            text.includes("Promoción")
          )
        ) {

          const clean =
            text
              .replace(/\s+/g, " ")
              .trim();

          if (
            !promos.includes(clean)
          ) {

            promos.push(clean);
          }
        }

      });

    if (promos.length > 0) {

      etecsaPromos =
        promos.slice(0, 5);

      console.log(
        "✅ Promos ETECSA actualizadas"
      );
    }

  } catch (err) {

    console.log(
      "ERROR ETECSA:",
      err.message
    );

    etecsaPromos = [

      "🎁 Recarga Internacional",

      "📱 Bono LTE + Datos",

      "🌍 Promo GB Internacional"

    ];
  }
}

// actualizar al iniciar
updateEtecsaPromos();

// actualizar cada 6 horas
setInterval(
  updateEtecsaPromos,
  1000 * 60 * 60 * 6
);

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
// MENU
// ===============================

async function mainMenu(chatId) {

  return bot.sendMessage(
    chatId,
`
💸 *JCS Remesas y Recargas*

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
    // REMESA
    // ===============================

    if (text === "💵 Remesa") {

      user.type = "Remesa";
      user.step = "amount_select";

      return bot.sendMessage(
        chatId,
`💵 Seleccione o escriba un monto`,
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

      user.type =
        "Recarga Nacional";

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

    if (
      text === "🌍 Internacional"
    ) {

      user.type =
        "Recarga Internacional";

      user.step = "plan";

      const keyboard =
        etecsaPromos.map(
          (promo) => [promo]
        );

      keyboard.push(
        ["⬅️ Volver"]
      );

      return bot.sendMessage(
        chatId,
`
🌍 Promociones Internacionales

⚡ Actualizadas desde ETECSA
`,
{
  reply_markup: {
    keyboard,
    resize_keyboard: true,
  },
}
      );
    }

    // ===============================
    // PLANES
    // ===============================

    if (
      user.step === "plan"
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
        "🅿️ Zelle",
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
        text === "🅿️ Zelle" ||
        text === "🏦 Transferencia"
      )
    ) {

      user.payment = text;

      if (user.type === "Recarga Nacional") {

        if (text === "🅿️ Zelle") {

          if (user.plan === "120 CUP") {
            user.total = "1 USD";
          }

          if (user.plan === "240 CUP") {
            user.total = "1.90 USD";
          }

          if (user.plan === "360 CUP") {
            user.total = "2.70 USD";
          }

        }

        if (text === "🏦 Transferencia") {

          if (user.plan === "120 CUP") {
            user.total = "700 CUP";
          }

          if (user.plan === "240 CUP") {
            user.total = "1500 CUP";
          }

          if (user.plan === "360 CUP") {
            user.total = "2000 CUP";
          }

        }

      } else {

        user.total =
          "Según promoción";
      }

      user.step =
        "phone_recharge";

      return bot.sendMessage(
        chatId,
`
💳 Método:
${user.payment}

💰 Total:
${user.total}

📱 Envíe número cubano

Ejemplo:
55112233
`
      );
    }

    // ===============================
    // TELEFONO RECARGA
    // ===============================

    if (
      user.step ===
      "phone_recharge"
    ) {

      if (!isValidPhone(text)) {

        return bot.sendMessage(
          chatId,
          "❌ Número inválido"
        );
      }

      user.rechargePhone =
        `+53${text}`;

      user.step = "screenshot";

      return bot.sendMessage(
        chatId,
`
📱 ${user.rechargePhone}

📸 Envíe captura del Pago
`
      );
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

    const chatId =
      msg.chat.id;

    if (!users[chatId]) return;

    const user =
      users[chatId];

    const photo =
      msg.photo[
        msg.photo.length - 1
      ]?.file_id;

    if (!photo) return;

    if (
      user.step === "screenshot"
    ) {

      const orderId =
        Date.now();

      orders.push({

        id: orderId,

        status: "Pendiente",

        clientId: chatId,

        username:
          msg.from.username ||
          "Sin username",

        type: user.type,

        phone:
          user.rechargePhone,

        plan: user.plan,

        payment:
          user.payment,

        total: user.total,

      });

      try {

        await bot.sendPhoto(
          ADMIN_ID,
          photo,
{
  caption:
`
🔥 NUEVA RECARGA

🧾 Pedido:
#${orderId}

📱 ${user.rechargePhone}

📦 ${user.plan}

💳 ${user.payment}

💰 ${user.total}
`
}
        );

      } catch (err) {

        console.log(
          "ADMIN ERROR:",
          err.message
        );

      }

      await bot.sendMessage(
        chatId,
`
✅ RECARGA RECIBIDA

🧾 Pedido:
#${orderId}

🕒 Estado:
Pendiente
`
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
// POLLING ERROR
// ===============================

bot.on(
  "polling_error",
  (err) => {

    console.log(
      "POLLING ERROR:",
      err.message
    );

  }
);

console.log(
  "✅ BOT INICIADO"
);
