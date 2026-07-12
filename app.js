const tabs = document.querySelectorAll(".tab");
const screens = document.querySelectorAll(".screen");
const pageTitle = document.querySelector("#page-title");

const titles = {
  home: "首页看板",
  profile: "宠物档案",
  chat: "AI 照护问答",
  report: "健康周报",
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.target;

    tabs.forEach((item) => item.classList.toggle("active", item === tab));
    screens.forEach((screen) => {
      screen.classList.toggle("active", screen.id === target);
    });

    pageTitle.textContent = titles[target];
  });
});

document.querySelectorAll(".quick-grid button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".quick-grid button").forEach((item) => {
      item.classList.remove("active");
    });
    button.classList.add("active");
  });
});

const askForm = document.querySelector("#ask-form");
const chatBox = document.querySelector(".chat-box");

askForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = document.querySelector("#question").value.trim();
  if (!question) return;

  const userMessage = document.createElement("article");
  userMessage.className = "message user";
  userMessage.innerHTML = `<p>${escapeHtml(question)}</p>`;

  const aiMessage = document.createElement("article");
  aiMessage.className = "message ai";
  aiMessage.innerHTML = `
    <p><strong>风险等级：低到中</strong></p>
    <p>我会结合 Lucky 的档案、近期换粮记录和昨日软便情况来判断。建议先降低新粮比例，继续记录排便颜色、形态和精神状态。</p>
    <p>如果 48 小时内没有改善，或同时出现呕吐、便血、精神下降，应及时咨询兽医。</p>
  `;

  chatBox.append(userMessage, aiMessage);
  aiMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
