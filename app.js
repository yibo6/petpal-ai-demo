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
const onboarding = document.querySelector("#onboarding");
const createPetForm = document.querySelector("#create-pet-form");
const editPetForm = document.querySelector("#edit-pet-form");
const homePetMeta = document.querySelector("#home-pet-meta");
const profilePetMeta = document.querySelector("#profile-pet-meta");
const profileWeight = document.querySelector("#profile-weight");
const profileAllergy = document.querySelector("#profile-allergy");
const profileNotes = document.querySelector("#profile-notes");
const aiBreedTag = document.querySelector("#ai-breed-tag");
const aiAgeTag = document.querySelector("#ai-age-tag");
const avatarInputs = document.querySelectorAll('input[name="avatar"]');

const recordStorageKey = "petpal-health-records";
const petStorageKey = "petpal-current-pet";
let activeRecordType = "饮食";
let memoryRecords = null;
let currentPet = null;

const titles = {
  home: "首页看板",
  profile: "宠物档案",
  chat: "AI 照护问答",
  report: "健康周报",
};

const defaultPet = {
  id: "pet-demo",
  name: "Lucky",
  species: "狗狗",
  breed: "边境牧羊犬",
  gender: "公",
  age: "2 岁 4 个月",
  weight: "18.6kg",
  notes: "鸡肉零食可能引起皮肤瘙痒，近期换粮中。",
  avatar: "",
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

createPetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  currentPet = await getPetFromForm(createPetForm);
  savePet(currentPet);
  onboarding.classList.remove("active");
  renderPet();
});

editPetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  currentPet = await getPetFromForm(editPetForm);
  savePet(currentPet);
  renderPet();
});

avatarInputs.forEach((input) => {
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    const preview = input.closest(".avatar-upload")?.querySelector("[data-avatar-preview]");
    const imageData = await readImageFile(file);
    if (preview) {
      preview.src = imageData;
      preview.closest(".pet-avatar")?.classList.add("has-image");
    }
  });
});

const askForm = document.querySelector("#ask-form");
const chatBox = document.querySelector(".chat-box");

askForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = document.querySelector("#question").value.trim();
  if (!question) return;

  const pet = currentPet || defaultPet;
  const records = getRecords().slice(0, 3);

  const userMessage = document.createElement("article");
  userMessage.className = "message user";
  userMessage.innerHTML = `<p>${escapeHtml(question)}</p>`;

  const aiMessage = document.createElement("article");
  aiMessage.className = "message ai";
  aiMessage.innerHTML = `
    <p><strong>正在调用 AI...</strong></p>
    <p>我会结合 ${escapeHtml(pet.name)} 的档案和最近健康记录生成建议。</p>
  `;

  chatBox.append(userMessage, aiMessage);
  aiMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });

  try {
    const answer = await requestAiAdvice(question, pet, records);
    aiMessage.innerHTML = formatAiAnswer(answer);
  } catch (error) {
    aiMessage.classList.add("error");
    aiMessage.innerHTML = `
      <p><strong>AI 调用失败</strong></p>
      <p>${escapeHtml(error.message)}</p>
      <p>如果你现在是用 file:// 打开的页面，请先运行本地服务，再访问 http://localhost:3000。</p>
    `;
  }

  aiMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

initPet();
renderRecords();

function initPet() {
  currentPet = getSavedPet();

  if (!currentPet) {
    fillPetForm(createPetForm, defaultPet);
    onboarding.classList.add("active");
    currentPet = defaultPet;
  } else {
    onboarding.classList.remove("active");
  }

  fillPetForm(editPetForm, currentPet);
  renderPet();
}

function getSavedPet() {
  try {
    const saved = localStorage.getItem(petStorageKey);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    return parsed && parsed.name ? parsed : null;
  } catch {
    return null;
  }
}

function savePet(pet) {
  try {
    localStorage.setItem(petStorageKey, JSON.stringify(pet));
  } catch {
    // file:// previews can restrict storage; the current UI still reflects the edit.
  }
}

async function getPetFromForm(form) {
  const data = new FormData(form);
  const avatarFile = form.elements.avatar?.files?.[0];
  const avatar = avatarFile ? await readImageFile(avatarFile) : currentPet?.avatar || "";

  return {
    id: currentPet?.id || `pet-${Date.now()}`,
    name: String(data.get("name") || "").trim() || defaultPet.name,
    species: String(data.get("species") || defaultPet.species),
    breed: String(data.get("breed") || "").trim() || defaultPet.breed,
    gender: String(data.get("gender") || defaultPet.gender),
    age: String(data.get("age") || "").trim() || defaultPet.age,
    weight: String(data.get("weight") || "").trim() || defaultPet.weight,
    notes: String(data.get("notes") || "").trim(),
    avatar,
  };
}

function fillPetForm(form, pet) {
  form.elements.name.value = pet.name;
  form.elements.species.value = pet.species;
  form.elements.breed.value = pet.breed;
  form.elements.gender.value = pet.gender;
  form.elements.age.value = pet.age;
  form.elements.weight.value = pet.weight;
  form.elements.notes.value = pet.notes;
  form.elements.avatar.value = "";
  renderAvatarPreview(form, pet.avatar);
}

function renderPet() {
  const pet = currentPet || defaultPet;
  document.querySelectorAll("[data-pet-name]").forEach((item) => {
    item.textContent = pet.name;
  });

  homePetMeta.textContent = `${pet.age} · ${pet.breed} · ${pet.weight}`;
  profilePetMeta.textContent = `${pet.breed} · ${pet.gender} · ${pet.age}`;
  profileWeight.textContent = pet.weight;
  profileAllergy.textContent = extractAllergy(pet.notes);
  profileNotes.textContent = pet.notes || "暂无特殊健康备注。";
  aiBreedTag.textContent = pet.breed;
  aiAgeTag.textContent = pet.age;
  fillPetForm(editPetForm, pet);
  renderPetAvatars(pet.avatar);
}

function renderPetAvatars(avatar) {
  document.querySelectorAll("[data-pet-avatar]").forEach((image) => {
    const holder = image.closest(".pet-avatar");
    if (avatar) {
      image.src = avatar;
      holder?.classList.add("has-image");
    } else {
      image.removeAttribute("src");
      holder?.classList.remove("has-image");
    }
  });

  document.querySelectorAll("[data-avatar-preview]").forEach((image) => {
    const holder = image.closest(".pet-avatar");
    if (avatar) {
      image.src = avatar;
      holder?.classList.add("has-image");
    } else {
      image.removeAttribute("src");
      holder?.classList.remove("has-image");
    }
  });
}

function renderAvatarPreview(form, avatar) {
  const preview = form.querySelector("[data-avatar-preview]");
  const holder = preview?.closest(".pet-avatar");
  if (!preview || !holder) return;

  if (avatar) {
    preview.src = avatar;
    holder.classList.add("has-image");
  } else {
    preview.removeAttribute("src");
    holder.classList.remove("has-image");
  }
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function requestAiAdvice(question, pet, records) {
  if (window.location.protocol === "file:") {
    throw new Error("真实 AI 需要通过本地服务访问，不能直接用 file:// 调用。");
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      pet: {
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        gender: pet.gender,
        age: pet.age,
        weight: pet.weight,
        notes: pet.notes,
      },
      records,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "请求失败，请稍后再试。");
  }

  return data.answer || "AI 暂时没有返回内容，请稍后再试。";
}

function formatAiAnswer(answer) {
  return escapeHtml(answer)
    .split(/\n{2,}|\n/)
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function extractAllergy(notes) {
  if (!notes) return "暂无";
  if (notes.includes("鸡肉")) return "鸡肉";
  if (notes.includes("过敏")) return "有备注";
  return "暂无";
}

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
    const saved = localStorage.getItem(recordStorageKey);
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
    localStorage.setItem(recordStorageKey, JSON.stringify(records));
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
