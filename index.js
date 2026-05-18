require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const storeApi = require("./storeApi"); // 👈 QVAPAY STORE

// ===============================
// CONFIG
// ===============================

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

if (!BOT_TOKEN || !ADMIN_ID) {
  throw new Error("❌ Faltan BOT_TOKEN o ADMIN_ID en .env");
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
// PROMOS (AHORA QVAPAY)
// ===============================

let etecsaPromos = [
  "🌍 Recarga Internacional"
];

// 🔥 AHORA USAMOS QVAPAY STORE
async function updateEtecsaPromos() {
  try {

    console.log("🔄 Cargando recargas QvaPay...");

    const res = await storeApi.getTopupCatalog();

    if (res.success && res.data?.length) {
      etecsaPromos = res.data.slice(0, 5).map(p =>
        `${p.name} - $${p.price}`
      );
      console.log("✅ Promos QvaPay cargadas");
    }

  } catch (err) {
    console.log("ERROR QVAPAY:", err.message);

    etecsaPromos = [
      "🎁 Recarga Internacional",
      "📱 Bono LTE",
      "🌍 Promo Datos"
    ];
  }
}

// actualizar al iniciar
updateEtecsaPromos();

// actualizar cada 6 horas
setInterval(updateEtecsaPromos, 1000 * 60 * 60 * 6);

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
      return bot.sendMessage(chatId, "https://t.me/JCS_LLC");
    }

    // ===============================
    // RECARGA MENU
    // ===============================

    if (text === "📱 Recarga") {
      return bot.sendMessage(chatId, "📱 Seleccione tipo", {
        reply_markup: {
          keyboard: [
            ["🇨🇺 Nacional", "🌍 Internacional"],
            ["⬅️ Volver"]
          ],
          resize_keyboard: true
        }
      });
    }

    // ===============================
    // RECARGA NACIONAL (igual)
    // ===============================

    if (text === "🇨🇺 Nacional") {

      user.type = "Recarga Nacional";
      user.step = "plan";

      return bot.sendMessage(chatId,
        "📦 Seleccione plan",
        {
          reply_markup: {
            keyboard: [
              ["120 CUP", "240 CUP"],
              ["360 CUP"],
              ["⬅️ Volver"]
            ],
            resize_keyboard: true,
          }
        }
      );
    }

    // ===============================
    // 🌍 INTERNACIONAL (AHORA QVAPAY STORE)
    // ===============================

    if (text === "🌍 Internacional") {

      user.type = "Recarga Internacional";
      user.step = "plan";

      const res = await storeApi.getTopupCatalog();

      if (!res.success || !res.data?.length) {
        return bot.sendMessage(chatId, "❌ No hay recargas disponibles");
      }

      user.catalog = res.data;

      const keyboard = res.data.slice(0, 12).map(p => [
        `${p.name} - $${p.price}`
      ]);

      keyboard.push(["⬅️ Volver"]);

      return bot.sendMessage(
        chatId,
`
🌍 Recargas Internacionales

⚡ Fuente: QvaPay Store
`,
{
  reply_markup: {
    keyboard,
    resize_keyboard: true
  }
}
      );
    }

    // ===============================
    // PLANES
    // ===============================

    if (user.step === "plan") {

      user.plan = text;
      user.step = "payment";

      return bot.sendMessage(chatId,
        "💳 Método de pago",
        {
          reply_markup: {
            keyboard: [
              ["🅿️ Zelle", "🏦 Transferencia"],
              ["⬅️ Volver"]
            ],
            resize_keyboard: true
          }
        }
      );
    }

    // ===============================
    // PAGO
    // ===============================

    if (
      user.step === "payment" &&
      (text === "🅿️ Zelle" || text === "🏦 Transferencia")
    ) {

      user.payment = text;

      user.total = "Según QvaPay";

      user.step = "phone_recharge";

      return bot.sendMessage(chatId, `
💳 Método: ${text}

💰 Total: ${user.total}

📱 Envíe número
      `);
    }

    // ===============================
    // TELEFONO
    // ===============================

    if (user.step === "phone_recharge") {

      if (!isValidPhone(text)) {
        return bot.sendMessage(chatId, "❌ Número inválido");
      }

      user.rechargePhone = `+53${text}`;

      const selected = user.catalog.find(p =>
        user.plan.includes(p.name)
      ) || user.catalog[0];

      let result;

      try {

        if (user.type === "Recarga Nacional") {
          result = await storeApi.purchasePhonePackage({
            phone_package_id: selected.id,
            phone_number: user.rechargePhone
          });
        } else {
          result = await storeApi.purchaseTopup({
            offer_id: selected.id,
            phone_number: user.rechargePhone,
            country: selected.country || "CU"
          });
        }

        if (!result.success) {
          return bot.sendMessage(chatId, "❌ Error en QvaPay");
        }

        orders.push({
          id: Date.now(),
          user: chatId,
          type: user.type,
          phone: user.rechargePhone
        });

        await bot.sendMessage(chatId, `
✅ RECARGA ENVIADA

📱 ${user.rechargePhone}
📦 ${selected.name}
        `);

        delete users[chatId];

      } catch (err) {
        console.log(err.message);
        bot.sendMessage(chatId, "❌ Error interno");
      }
    }

  } catch (err) {
    console.log("ERROR:", err.message);
  }

});

// ===============================
// FOTOS
// ===============================

bot.on("photo", async (msg) => {

  try {

    const chatId = msg.chat.id;

    if (!users[chatId]) return;

  } catch (err) {
    console.log("ERROR FOTO:", err.message);
  }

});

// ===============================
// POLLING ERROR
// ===============================

bot.on("polling_error", (err) => {
  console.log("POLLING ERROR:", err.message);
});

console.log("✅ BOT ACTUALIZADO CON QVAPAY STORE");
