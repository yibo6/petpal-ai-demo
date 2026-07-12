const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

loadEnvFile();

const port = Number(process.env.PORT || 3000);
const rootDir = __dirname;
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "POST" && url.pathname === "/api/chat") {
    await handleChat(request, response);
    return;
  }

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  serveStatic(url.pathname, response);
});

server.listen(port, () => {
  console.log(`PetPal AI demo running at http://localhost:${port}`);
});

async function handleChat(request, response) {
  if (!apiKey) {
    sendJson(response, 500, {
      error: "Missing OPENAI_API_KEY. Set it in your terminal or .env file before starting the server.",
    });
    return;
  }

  try {
    const body = await readJson(request);
    const { question, pet, records } = body;

    if (!question || typeof question !== "string") {
      sendJson(response, 400, { error: "Question is required." });
      return;
    }

    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions: [
          "你是 PetPal AI，一名谨慎、温和、专业的宠物日常照护助手。",
          "你可以基于宠物档案和近期记录提供饲养建议、观察建议和风险分级。",
          "你不能声称自己能诊断疾病，也不能替代专业兽医。",
          "如果用户描述便血、持续呕吐、精神明显下降、呼吸困难、抽搐、无法进食饮水等情况，要明确建议尽快联系兽医。",
          "请用中文回答，结构包括：风险等级、可能原因、建议怎么做、何时就医。",
        ].join("\n"),
        input: JSON.stringify({
          userQuestion: question,
          petProfile: pet || {},
          recentHealthRecords: Array.isArray(records) ? records.slice(0, 8) : [],
        }),
      }),
    });

    const data = await aiResponse.json();

    if (!aiResponse.ok) {
      sendJson(response, aiResponse.status, {
        error: data.error?.message || "OpenAI API request failed.",
      });
      return;
    }

    sendJson(response, 200, {
      answer: extractOutputText(data),
      model,
    });
  } catch (error) {
    sendJson(response, 500, {
      error: error.message || "Server error.",
    });
  }
}

function serveStatic(pathname, response) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(rootDir, safePath));

  if (!filePath.startsWith(rootDir)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    });
    response.end(data);
  });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;

  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim() || "AI 暂时没有返回内容，请稍后再试。";
}

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}
