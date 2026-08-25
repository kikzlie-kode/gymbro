const LIFF_URL = process.env.LIFF_URL || "https://liff.line.me/YOUR-LIFF-ID";

function welcomeMessage() {
  return {
    type: "text",
    text:
      "ยินดีต้อนรับสู่ GymBro! 💪\n" +
      "เปิดแอปเพื่อวางตารางออกกำลังกาย บันทึกผล และดูความคืบหน้าได้เลย",
    quickReply: {
      items: [
        {
          type: "action",
          action: { type: "uri", label: "เปิด GymBro", uri: LIFF_URL },
        },
      ],
    },
  };
}

function reminderMessage(todo) {
  return {
    type: "flex",
    altText: `⏰ ถึงเวลาออกกำลังกาย: ${todo.title}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "⏰ ถึงเวลาแล้ว!", weight: "bold", color: "#ff5555", size: "sm" },
          { type: "text", text: todo.title, weight: "bold", size: "lg", wrap: true },
          {
            type: "text",
            text: todo.exerciseType ? `ประเภท: ${todo.exerciseType}` : " ",
            size: "sm",
            color: "#888888",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#06c755",
            action: { type: "uri", label: "เปิด GymBro เพื่อบันทึกผล", uri: `${LIFF_URL}?todoId=${todo.id}` },
          },
        ],
      },
    },
  };
}

function unknownCommandMessage() {
  return {
    type: "text",
    text: "พิมพ์ 'เมนู' เพื่อเปิด GymBro หรือใช้ LIFF app เพื่อจัดการตารางออกกำลังกายของคุณได้เลย",
    quickReply: {
      items: [
        { type: "action", action: { type: "uri", label: "เปิด GymBro", uri: LIFF_URL } },
      ],
    },
  };
}

module.exports = { welcomeMessage, reminderMessage, unknownCommandMessage, LIFF_URL };
