import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = "AIzaSyAFEMVGoosC_0PIe9xy48aO6DXqkjnL9Lw";
const genAI = new GoogleGenerativeAI(API_KEY);

async function run() {
  console.log("Testing gemini-pro...");
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Hello");
    console.log("gemini-pro success:", result.response.text());
  } catch (e) {
    console.error("gemini-pro error:", e.message);
  }

  console.log("\nTesting gemini-1.5-flash...");
  try {
    const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result2 = await model2.generateContent("Hello");
    console.log("gemini-1.5-flash success:", result2.response.text());
  } catch (e) {
    console.error("gemini-1.5-flash error:", e.message);
  }
}

run();
