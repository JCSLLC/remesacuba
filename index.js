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
// CACHE PROMOS CUBATEL
// ===============================

let cubatelPromos = [
  "Recarga Internacional"
];

let lastPromoUpdate = 0;

// ===============================
// ACTUALIZAR PROMOS
// ===============================

async function updateCubatelPromos() {

  try {

    console.log(
      "🔄 Actualizando promos Cubatel..."
    );

    const { data } =
      await axios.get(
        "https://www.cubatel.com/",
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
          $(el).text().trim();

        if (
          text.length > 20 &&
          (
            text.includes("GB") ||
            text.includes("Datos") ||
            text.includes("Promoción") ||
            text.includes("Recarga") ||
            text.includes("Internet")
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

      cubatelPromos =
        promos.slice(0, 6);

      lastPromoUpdate =
        Date.now();

      console.log(
        "✅ Promos actualizadas"
      );

    }

  } catch (err) {

    console.log(
      "ERROR CUBATEL:",
      err.message
    );

  }

}

// ===============================
// AUTO UPDATE CADA 6 HORAS
// ===============================

updateCubatelPromos();

setInterval(
  updateCubatelPromos,
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
    // ADMIN
    // ===============================

    if (text === "👮 Admin") {

      if (
        String(chatId) !==
        String(ADMIN_ID)
      ) {

        return bot.sendMessage(
          chatId,
          "❌ Acceso denegado"
        );
      }

      return bot.sendMessage(
        chatId,
`
👮 *PANEL ADMIN*

📦 Pedidos:
${orders.length}

👥 Usuarios activos:
${Object.keys(users).length}

🌍 Promos internacionales:
${cubatelPromos.length}
`,
{
  parse_mode: "Markdown",
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

      for (const o of orders) {

        let details = `
━━━━━━━━━━━━━━━━━━
📦 PEDIDO #${o.id}
━━━━━━━━━━━━━━━━━━

📌 Estado:
${o.status}

👤 Usuario:
@${o.username}

📦 Tipo:
${o.type}
`;

        if (o.type === "Remesa") {

          details += `

💵 Monto:
$${o.amount}

📌 Comisión:
$${o.commission}

💰 Total:
$${o.total}

👤 Beneficiario:
${o.name}

📱 Teléfono:
${o.phone}

🏠 Dirección:
${o.address}

💳 Método:
${o.payment}
`;

        } else {

          details += `

📱 Número:
${o.phone}

📦 Plan:
${o.plan}

💳 Pago:
${o.payment}

💰 Total:
${o.total}
`;
        }

        await bot.sendMessage(
          chatId,
          details,
{
  reply_markup: {
    inline_keyboard: [

      [
        {
          text: "✅ Confirmar",
          callback_data:
            `confirm_${o.id}`
        },

        {
          text: "🗑 Eliminar",
          callback_data:
            `delete_${o.id}`
        }
      ]

    ]
  }
}
        );
      }

      return;
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
        totalMoney += Number(
          o.total || 0
        );
      });

      return bot.sendMessage(
        chatId,
`
📊 *ESTADÍSTICAS*

📦 Pedidos:
${orders.length}

💰 Total generado:
${totalMoney}
`,
{
  parse_mode: "Markdown"
}
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
`💵 Seleccione o Escriba un monto`,
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

        const amount =
          parseFloat(text);

        user.amount = amount;

        const commission =
          calculateCommission(amount);

        user.commission = commission;
        user.total =
          amount + commission;

        user.step =
          "remesa_payment";

        return bot.sendMessage(
          chatId,
`
💵 Monto:
$${amount}

📌 Comisión:
$${commission}

💰 Total:
$${user.total}

💳 Método de pago
`,
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

      if (
        text === "✍️ Personalizado"
      ) {

        user.step = "amount";

        return bot.sendMessage(
          chatId,
`
✍️ Envíe monto personalizado

Ejemplo:
75
150
`
        );
      }
    }

    // ===============================
    // MONTO PERSONALIZADO
    // ===============================

    if (user.step === "amount") {

      const amount =
        parseFloat(text);

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

      user.total =
        amount + commission;

      user.step =
        "remesa_payment";

      return bot.sendMessage(
        chatId,
`
💵 Monto:
$${amount}

📌 Comisión:
$${commission}

💰 Total:
$${user.total}

💳 Método de pago
`,
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
      user.step ===
        "remesa_payment" &&
      text === "🅿️ PayPal"
    ) {

      user.remesaPayment =
        "PayPal";

      user.step =
        "remesa_screenshot";

      return bot.sendMessage(
        chatId,
`
🅿️ *PAYPAL*

🔗 https://www.paypal.com/paypalme/josecastineira00

⚠️ NO escribir nada en el pago

📸 Envíe captura
`,
{
  parse_mode: "Markdown"
}
      );
    }

    // ===============================
    // ZELLE
    // ===============================

    if (
      user.step ===
        "remesa_payment" &&
      text === "🏦 Zelle"
    ) {

      user.remesaPayment =
        "Zelle";

      user.step =
        "remesa_screenshot";

      return bot.sendMessage(
        chatId,
`
🏦 *ZELLE*

👤 JCS LLC
📱 +15026583021

⚠️ NO escribir nada en el pago

📸 Envíe captura
`,
{
  parse_mode: "Markdown"
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
        cubatelPromos.map(
          (promo) => [promo]
        );

      keyboard.push(
        ["⬅️ Volver"]
      );

      return bot.sendMessage(
        chatId,
`
🌍 Promociones Internacionales

⚡ Actualizadas automáticamente desde Cubatel
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

      // ===============================
      // PRECIOS RECARGA NACIONAL
      // ===============================

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

    // ===============================
    // FOTO RECARGA
    // ===============================

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
`,
{
  parse_mode: "Markdown"
}
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
// CALLBACKS
// ===============================

bot.on(
  "callback_query",
  async (query) => {

    try {

      const chatId =
        query.message.chat.id;

      if (
        String(chatId) !==
        String(ADMIN_ID)
      ) {
        return;
      }

      const data =
        query.data;

      if (
        data.startsWith(
          "confirm_"
        )
      ) {

        const orderId =
          Number(
            data.split("_")[1]
          );

        const order =
          orders.find(
            (o) =>
              o.id === orderId
          );

        if (!order) {

          return bot.answerCallbackQuery(
            query.id,
            {
              text:
                "Pedido no encontrado",
            }
          );
        }

        order.status =
          "Confirmado";

        await bot.sendMessage(
          order.clientId,
`
━━━━━━━━━━━━━━━━━━
✅ *PEDIDO CONFIRMADO*
━━━━━━━━━━━━━━━━━━

🧾 *Pedido:*
#${order.id}

📦 *Tipo:*
${order.type}

🟢 *Estado:*
Confirmado
`,
{
  parse_mode: "Markdown"
}
        );

        await bot.answerCallbackQuery(
          query.id,
          {
            text:
              "Pedido confirmado",
          }
        );
      }

    } catch (err) {

      console.log(
        "CALLBACK ERROR:",
        err.message
      );

    }

  }
);

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
