const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  try {
    const genAI = new GoogleGenerativeAI("AIzaSyDPawtoWkJ9_2P7kCe9NoYK6PO7ypA6XWI");
    // Probando 1.5 flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hola");
    console.log("Response 1.5-flash:", result.response.text());
  } catch(e) {
    console.error("Error 1.5-flash:", e.message);
  }

  try {
    const genAI = new GoogleGenerativeAI("AIzaSyDPawtoWkJ9_2P7kCe9NoYK6PO7ypA6XWI");
    // Probando pro
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hola");
    console.log("Response pro:", result.response.text());
  } catch(e) {
    console.error("Error pro:", e.message);
  }
}

test();
