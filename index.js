```js
require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const PDFDocument = require("pdfkit");

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
// FUNCIONES
// ===============================

function calculateCommission(amount) {

  if (amount >= 1 && amount <= 49) {
    return 5;
  }

  return Number((amount * 0.1).toFixed(2));
}

function isValidPhone(phone) {
  return /^[0-9]{8}$/.test(phone);
}

function createPDF(order) {

  return new Promise((resolve, reject) => {

    const pdfPath = `pedido_${order.id}.pdf`;

    const doc = new PDFDocument();

    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    doc.fontSize(20).text(
      "JCS Remesas y Recargas",
      {
        align: "center",
      }
    );

    doc.moveDown();

    doc.fontSize(14).text(
      `Pedido #${order.id}`
    );

    doc.text(
      `Estado: ${order.status}`
    );

    doc.text(
      `Tipo: ${order.type}`
    );

    doc.moveDown();

    if (order.type === "Remesa") {

      doc.text(
        `Monto: $${order.amount}`
      );

      doc.text(
        `Comisión: $${order.commission}`
      );

      doc.text(
        `Total: $${order.total}`
      );

      doc.text(
        `Beneficiario: ${order.name}`
      );

      doc.text(
        `Teléfono: ${order.phone}`
      );

      doc.text(
        `Dirección: ${order.address}`
      );

      doc.text(
        `Pago: ${order.payment}`
      );

    } else {

      doc.text(
        `Número: ${order.phone}`
      );

      doc.text(
        `Plan: ${order.plan}`
      );

      doc.text(
        `Pago: ${order.payment}`
      );

      doc.text(
        `Total: ${order.total}`
      );
    }

    doc.moveDown();

    doc.text(
      "Gracias por utilizar JCS Remesas y Recargas"
    );

    doc.end();

    stream.on("finish", () => {
      resolve(pdfPath);
    });

    stream.on("error", (err) => {
      reject(err);
    });
  });
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
        "🗑 Borrar Estadísticas"
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
$${o.total}
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
$${totalMoney}
`,
{
  parse_mode: "Markdown"
}
      );
    }

    // ===============================
    // BORRAR ESTADISTICAS
    // ===============================

    if (
      text === "🗑 Borrar Estadísticas" &&
      String(chatId) === String(ADMIN_ID)
    ) {

      orders.length = 0;

      return bot.sendMessage(
        chatId,
`
🗑 ESTADÍSTICAS BORRADAS

📦 Pedidos eliminados correctamente
`
      );
    }

    // ===============================
    // REMESA
    // ===============================

    if (text === "💵 Remesa") {

      user.type = "Remesa";
      user.step = "amount";

      return bot.sendMessage(
        chatId,
        "💵 Envíe el monto de la remesa"
      );
    }

    // ===============================
    // MONTO REMESA
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

      user.commission =
        calculateCommission(amount);

      user.total =
        amount + user.commission;

      user.step = "payment";

      return bot.sendMessage(
        chatId,
`
💵 Monto:
$${user.amount}

📌 Comisión:
$${user.commission}

💰 Total:
$${user.total}

💳 Seleccione método de pago
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
      ]
    ],
    resize_keyboard: true,
  }
}
      );
    }

    // ===============================
    // PAGO REMESA
    // ===============================

    if (
      user.step === "payment" &&
      (
        text === "🅿️ PayPal" ||
        text === "🏦 Zelle"
      )
    ) {

      user.payment =
        text === "🅿️ PayPal"
          ? "PayPal"
          : "Zelle";

      user.step = "photo";

      return bot.sendMessage(
        chatId,
        "📸 Envíe captura del pago"
      );
    }

    // ===============================
    // RECARGA
    // ===============================

    if (text === "📱 Recarga") {

      user.type = "Recarga";
      user.step = "recharge_phone";

      return bot.sendMessage(
        chatId,
        "📱 Envíe número cubano"
      );
    }

    // ===============================
    // TELEFONO RECARGA
    // ===============================

    if (
      user.step === "recharge_phone"
    ) {

      if (!isValidPhone(text)) {

        return bot.sendMessage(
          chatId,
          "❌ Número inválido"
        );
      }

      user.phone = `+53${text}`;
      user.total = 1000;
      user.plan = "Recarga";
      user.payment = "Transferencia";

      user.step = "recharge_photo";

      return bot.sendMessage(
        chatId,
        "📸 Envíe captura del pago"
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

    const chatId = msg.chat.id;

    if (!users[chatId]) return;

    const user = users[chatId];

    const photo =
      msg.photo[
        msg.photo.length - 1
      ]?.file_id;

    if (!photo) return;

    // ===============================
    // FOTO REMESA
    // ===============================

    if (user.step === "photo") {

      user.photo = photo;

      user.step = "name";

      return bot.sendMessage(
        chatId,
        "👤 Envíe nombre del beneficiario"
      );
    }

    // ===============================
    // FOTO RECARGA
    // ===============================

    if (
      user.step === "recharge_photo"
    ) {

      const orderId = Date.now();

      const order = {

        id: orderId,

        status: "Pendiente",

        clientId: chatId,

        username:
          msg.from.username ||
          "Sin username",

        type: "Recarga",

        phone: user.phone,

        plan: user.plan,

        payment: user.payment,

        total: user.total,
      };

      orders.push(order);

      await bot.sendPhoto(
        ADMIN_ID,
        photo,
{
  caption:
`
🔥 NUEVA RECARGA

🧾 Pedido:
#${orderId}

📱 ${user.phone}

💰 $${user.total}
`
}
      );

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
// NOMBRE REMESA
// ===============================

bot.on("message", async (msg) => {

  try {

    if (!msg.text) return;

    const chatId = msg.chat.id;

    const user = users[chatId];

    if (!user) return;

    if (user.step === "name") {

      user.name = msg.text;

      user.step = "phone";

      return bot.sendMessage(
        chatId,
        "📱 Envíe teléfono del beneficiario"
      );
    }

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
        "🏠 Envíe dirección"
      );
    }

    if (user.step === "address") {

      user.address = msg.text;

      const orderId = Date.now();

      const order = {

        id: orderId,

        status: "Pendiente",

        clientId: chatId,

        username:
          msg.from.username ||
          "Sin username",

        type: "Remesa",

        amount: user.amount,

        commission: user.commission,

        total: user.total,

        payment: user.payment,

        name: user.name,

        phone: user.phone,

        address: user.address,
      };

      orders.push(order);

      await bot.sendPhoto(
        ADMIN_ID,
        user.photo,
{
  caption:
`
🔥 NUEVA REMESA

🧾 Pedido:
#${orderId}

💵 Monto:
$${user.amount}

💰 Total:
$${user.total}

👤 ${user.name}

📱 ${user.phone}
`
}
      );

      await bot.sendMessage(
        chatId,
`
✅ REMESA RECIBIDA

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
      "ERROR REMESA:",
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

      const data = query.data;

      // ===============================
      // CONFIRMAR
      // ===============================

      if (
        data.startsWith(
          "confirm_"
        )
      ) {

        const orderId = Number(
          data.split("_")[1]
        );

        const order = orders.find(
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

        // PDF
        const pdfPath =
          await createPDF(order);

        // Enviar PDF
        await bot.sendDocument(
          order.clientId,
          pdfPath,
{
  caption:
`
✅ PEDIDO CONFIRMADO

🧾 Pedido:
#${order.id}

📦 Tipo:
${order.type}

🟢 Estado:
Confirmado
`
}
        );

        // Eliminar PDF
        fs.unlink(
          pdfPath,
          () => {}
        );

        // Editar botones admin
        await bot.editMessageReplyMarkup(
          {
            inline_keyboard: [
              [
                {
                  text:
                    "✅ Confirmado",
                  callback_data:
                    "confirmed",
                },
              ],
            ],
          },
{
  chat_id: chatId,
  message_id:
    query.message.message_id,
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

      // ===============================
      // ELIMINAR PEDIDO
      // ===============================

      if (
        data.startsWith(
          "delete_"
        )
      ) {

        const orderId = Number(
          data.split("_")[1]
        );

        const index =
          orders.findIndex(
            (o) =>
              o.id === orderId
          );

        if (index === -1) {

          return bot.answerCallbackQuery(
            query.id,
            {
              text:
                "Pedido no encontrado",
            }
          );
        }

        const deletedOrder =
          orders[index];

        orders.splice(index, 1);

        await bot.editMessageText(
`
❌ PEDIDO ELIMINADO

🧾 Pedido:
#${deletedOrder.id}

📦 Tipo:
${deletedOrder.type}
`,
{
  chat_id: chatId,
  message_id:
    query.message.message_id,
}
        );

        await bot.answerCallbackQuery(
          query.id,
          {
            text:
              "Pedido eliminado",
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
```
