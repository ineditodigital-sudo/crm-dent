const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDPawtoWkJ9_2P7kCe9NoYK6PO7ypA6XWI");
    const data = await response.json();
    const models = data.models.slice(0, 10).map(m => m.name);
    console.log("Primeros 10 Modelos:", JSON.stringify(models, null, 2));
  } catch(e) {
    console.error("Error:", e);
  }
}

test();
