const API_KEY = "AIzaSyAFEMVGoosC_0PIe9xy48aO6DXqkjnL9Lw";

async function run() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await res.json();
    console.log("Available models:");
    data.models.forEach(m => console.log(m.name));
  } catch (e) {
    console.error(e);
  }
}

run();
