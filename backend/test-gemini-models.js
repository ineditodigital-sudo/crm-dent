const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyDPawtoWkJ9_2P7kCe9NoYK6PO7ypA6XWI");
    const data = await response.json();
    console.log("Models:", JSON.stringify(data, null, 2));
  } catch(e) {
    console.error("Error:", e);
  }
}

test();
