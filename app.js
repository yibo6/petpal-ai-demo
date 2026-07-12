const tabs = document.querySelectorAll(".tab");
const screens = document.querySelectorAll(".screen");
const pageTitle = document.querySelector("#page-title");
const quickButtons = document.querySelectorAll(".quick-grid button");
const recordForm = document.querySelector("#record-form");
const recordTitle = document.querySelector("#record-title");
const recordLabel = document.querySelector("#record-label");
const recordDetail = document.querySelector("#record-detail");
const recordCancel = document.querySelector("#record-cancel");
const recordList = document.querySelector("#record-list");
const recordCount = document.querySelector("#record-count");
const reportSummaryText = document.querySelector("#report-summary-text");

const storageKey = "petpal-health-records";
let activeRecordType = "饮食";
let memoryRecords = null;

const titles = {
  home: "首页看板",
  profile: "宠物档案",
  chat: "AI 照护问答",
  report: "健康周报",
};

const recordConfig = {
  饮食: {
    title: "新增饮食记录",
    label: "粮食组成 / 食量 / 是否换粮",
    placeholder: "例如：晚餐吃完 80g，羊肉粮 70% + 新粮 30%，无新增零食",
    metricId: "food-metric",
    fallback: "正常",
  },
  排便: {
    title: "新增排便记录",
    label: "颜色 / 形态 / 稀度",
    placeholder: "例如：棕色，成形但偏软，无血丝",
    metricId: "poop-metric",
    fallback: "偏软 1 次",
  },
  尿尿: {
    title: "新增尿尿记录",
    label: "频率 / 颜色 / 是否异常",
    placeholder: "例如：今天 3 次，浅黄色，频率正常",
    metricId: "pee-metric",
    fallback: "正常",
  },
  散步: {
    title: "新增散步记录",
    label: "时长 / 活跃度 / 精神状态",
    placeholder: "例如：晚间散步 30 分钟，精神活跃",
    metricId: "walk-metric",
    fallback: "30 分钟",
  },
};

const seedRecords = [
  {
    id: "seed-1",
    type: "排便",
    detail: "棕色，成形但偏软，疑似与换粮有关",
    createdAt: "2026-07-12T08:30:00",
  },
  {
    id: "seed-2",
    type: "饮食",
    detail: "早餐吃完 80g，羊肉粮 70% + 新粮 30%",
    createdAt: "2026-07-12T08:00:00",
  },
  {
    id: "seed-3",
    type: "散步",
    detail: "早间散步 30 分钟，精神状态活跃",
    createdAt: "2026-07-12T07:20:00",
  },
];

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

quickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeRecordType = button.dataset.action;
    quickButtons.forEach((item) => item.classList.toggle("active", item === button));
    openRecordForm(activeRecordType);
  });
});

recordCancel.addEventListener("click", () => {
  recordForm.classList.remove("active");
  quickButtons.forEach((item) => item.classList.remove("active"));
});

recordForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const detail = recordDetail.value.trim();
  if (!detail) return;

  const records = getRecords();
  records.unshift({
    id: `record-${Date.now()}`,
    type: activeRecordType,
    detail,
    createdAt: new Date().toISOString(),
  });

  saveRecords(records);
  recordDetail.value = "";
  recordForm.classList.remove("active");
  quickButtons.forEach((item) => item.classList.remove("active"));
  renderRecords();
});

const askForm = document.querySelector("#ask-form");
const chatBox = document.querySelector(".chat-box");

askForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = document.querySelector("#question").value.trim();
  if (!question) return;

  const records = getRecords().slice(0, 3);
  const recentContext = records.map((record) => `${record.type}：${record.detail}`).join("；");

  const userMessage = document.createElement("article");
  userMessage.className = "message user";
  userMessage.innerHTML = `<p>${escapeHtml(question)}</p>`;

  const aiMessage = document.createElement("article");
  aiMessage.className = "message ai";
  aiMessage.innerHTML = `
    <p><strong>风险等级：低到中</strong></p>
    <p>我会结合 Lucky 的档案和近期记录来判断。最近记录显示：${escapeHtml(recentContext || "暂无新增记录")}。</p>
    <p>建议继续记录饮食、排便和精神状态。如果 48 小时内没有改善，或同时出现呕吐、便血、精神下降，应及时咨询兽医。</p>
  `;

  chatBox.append(userMessage, aiMessage);
  aiMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

renderRecords();

function openRecordForm(type) {
  const config = recordConfig[type];
  recordTitle.textContent = config.title;
  recordLabel.textContent = config.label;
  recordDetail.placeholder = config.placeholder;
  recordForm.classList.add("active");
  recordDetail.focus();
}

function getRecords() {
  if (memoryRecords) return memoryRecords;

  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return seedRecords;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : seedRecords;
  } catch {
    return seedRecords;
  }
}

function saveRecords(records) {
  memoryRecords = records;

  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
  } catch {
    // Some file:// previews can restrict storage; the UI still updates for this session.
  }
}

function renderRecords() {
  const records = getRecords();
  const latestRecords = records.slice(0, 5);

  recordList.innerHTML = latestRecords.map((record) => {
    return `
      <li>
        <span class="record-type">${escapeHtml(record.type)}</span>
        <span class="record-detail">
          <strong>${escapeHtml(record.detail)}</strong>
          <span>${formatDate(record.createdAt)}</span>
        </span>
      </li>
    `;
  }).join("");

  recordCount.textContent = `${records.length} 条`;
  reportSummaryText.textContent = `本周已记录 ${records.length} 条健康数据，包含饮食、排便、排尿和运动情况。AI 会优先参考最近记录生成建议。`;
  updateMetrics(records);
}

function updateMetrics(records) {
  Object.entries(recordConfig).forEach(([type, config]) => {
    const metric = document.querySelector(`#${config.metricId}`);
    const latest = records.find((record) => record.type === type);
    metric.textContent = latest ? summarizeRecord(latest.detail) : config.fallback;
  });
}

function summarizeRecord(detail) {
  return detail.length > 8 ? `${detail.slice(0, 8)}...` : detail;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";

  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
