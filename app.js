// Simple SPA Router using hash routes
const routes = {
  "/list": showListView,
  "/new": () => showFormView(),
  "/edit": (id) => showFormView(id),
};

const el = (id) => document.getElementById(id);
const tbody = el("company-tbody");
const pageTitle = el("page-title");
const searchWrap = el("search-wrap");
const searchInput = el("search");

const STORAGE_KEY = "companies";

function saveAll(companies) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
}
function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function formatMonthYear(value) {
  // value is "YYYY-MM"
  if (!value) return "";
  const [y, m] = value.split("-");
  const date = new Date(Number(y), Number(m) - 1);
  return date.toLocaleString(undefined, { month: "short", year: "numeric" });
}

// -------- LIST VIEW ----------
function showListView() {
  pageTitle.textContent = "Company List";
  searchWrap.hidden = false;
  el("view-list").hidden = false;
  el("view-form").hidden = true;
  document.querySelectorAll(".sidebar a").forEach(a => a.classList.remove("active"));
  document.getElementById("link-list").classList.add("active");

  const companies = loadAll();
  renderTable(companies);

  searchInput.oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = companies.filter(c => 
      c.companyName.toLowerCase().includes(q) ||
      c.companyEmail.toLowerCase().includes(q) ||
      c.companyPhone.toLowerCase().includes(q)
    );
    renderTable(filtered);
  };
}

function renderTable(list) {
  tbody.innerHTML = "";
  if (list.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" class="muted">No companies added yet.</td>`;
    tbody.appendChild(tr);
    return;
  }

  list.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.companyName}</td>
      <td>${c.companyEmail}</td>
      <td>${c.companyPhone}</td>
      <td>${c.createdAt}</td>
      <td>
        <button class="icon-btn icon-edit" title="Edit" data-id="${c.id}">✏️</button>
        <button class="icon-btn" title="Delete" data-id="${c.id}">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });

  // action handlers
  tbody.querySelectorAll(".icon-edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      location.hash = `#/edit/${id}`;
    });
  });

  tbody.querySelectorAll(".icon-btn:not(.icon-edit)").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this company?")) {
        const companies = loadAll().filter(c => c.id !== id);
        saveAll(companies);
        showListView();
      }
    });
  });
}

// -------- FORM VIEW ----------
function showFormView(editId) {
  pageTitle.textContent = editId ? "Edit Company" : "New Company";
  searchWrap.hidden = true;
  el("view-list").hidden = true;
  el("view-form").hidden = false;
  document.querySelectorAll(".sidebar a").forEach(a => a.classList.remove("active"));
  document.getElementById("link-new").classList.add("active");

  const form = el("company-form");
  const errors = el("errors");
  const msg = el("form-message");
  const idInput = el("company-id");

  // Clear form & dynamic lists
  form.reset();
  el("skills-list").innerHTML = "";
  el("edu-list").innerHTML = "";
  errors.hidden = true;
  msg.hidden = true;
  idInput.value = editId || "";

  // If editing, populate fields
  if (editId) {
    const data = loadAll().find(c => c.id === editId);
    if (data) {
      el("companyName").value = data.companyName || "";
      el("companyAddress").value = data.companyAddress || "";
      el("companyEmail").value = data.companyEmail || "";
      el("companyPhone").value = data.companyPhone || "";
      el("employeeName").value = data.employeeName || "";
      el("designation").value = data.designation || "";
      el("joinDate").value = data.joinDate || "";
      el("empEmail").value = data.empEmail || "";
      el("empPhone").value = data.empPhone || "";
      // skills
      (data.skills || []).forEach(s => addSkillChip(s.name, s.rating));
      // education
      (data.education || []).forEach(e => addEducationRow(e.school, e.course, e.completedYear));
    }
  }

  // Skills: filter list (virtual scroll style by hiding non-matching)
  const skillSearch = el("skill-search");
  const skillSelect = el("skill-name");
  skillSearch.oninput = () => {
    const q = skillSearch.value.toLowerCase();
    Array.from(skillSelect.options).forEach(opt => {
      opt.hidden = q && !opt.text.toLowerCase().includes(q);
    });
  };

  el("add-skill").onclick = () => {
    const opt = skillSelect.options[skillSelect.selectedIndex];
    const name = opt ? opt.text : "";
    const rating = Number(el("skill-rating").value);
    if (!name) return toastError("Select a skill name.");
    if (!rating || rating < 1 || rating > 5) return toastError("Enter rating 1–5.");
    addSkillChip(name, rating);
    el("skill-rating").value = "";
    skillSearch.value = "";
  };

  el("add-edu").onclick = () => {
    const school = el("edu-school").value.trim();
    const course = el("edu-course").value.trim();
    const year = el("edu-year").value; // YYYY-MM
    if (!school || !course || !year) return toastError("Education: all fields are required.");
    addEducationRow(school, course, year);
    el("edu-school").value = "";
    el("edu-course").value = "";
    el("edu-year").value = "";
  };

  el("cancel").onclick = () => (location.hash = "#/list");

  form.onsubmit = (e) => {
    e.preventDefault();
    errors.hidden = true;
    msg.hidden = true;
    const err = validateForm();
    if (err.length) {
      errors.innerHTML = "<ul><li>" + err.join("</li><li>") + "</li></ul>";
      errors.hidden = false;
      return;
    }

    const payload = collectFormData();
    const all = loadAll();
    if (editId) {
      const idx = all.findIndex(x => x.id === editId);
      if (idx !== -1) {
        payload.createdAt = all[idx].createdAt; // keep original
        all[idx] = payload;
      }
    } else {
      payload.id = uid();
      payload.createdAt = new Date().toLocaleString();
      all.push(payload);
    }
    saveAll(all);
    msg.hidden = false;
    setTimeout(() => (location.hash = "#/list"), 800);
  };
}

function toastError(t) {
  const errors = el("errors");
  errors.innerHTML = `<ul><li>${t}</li></ul>`;
  errors.hidden = false;
  setTimeout(() => (errors.hidden = true), 2000);
}

function addSkillChip(name, rating) {
  const wrap = el("skills-list");
  // prevent duplicates of same skill name: remove existing
  Array.from(wrap.querySelectorAll(".chip")).forEach(c => {
    if (c.dataset.name === name) c.remove();
  });
  const chip = document.createElement("span");
  chip.className = "chip";
  chip.innerHTML = `${name} — Rating: ${rating} <button type="button" class="remove">✖</button>`;
  chip.dataset.name = name;
  chip.dataset.rating = rating;
  chip.querySelector(".remove").onclick = () => chip.remove();
  wrap.appendChild(chip);
}

function addEducationRow(school, course, year) {
  const row = document.createElement("div");
  row.className = "edu-row";
  const text = document.createElement("span");
  text.className = "edu-text";
  text.textContent = `${school} — ${course} — ${formatMonthYear(year)}`;
  row.appendChild(text);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "icon-btn remove-edu";
  btn.textContent = "🗑️";
  btn.title = "Remove";
  btn.onclick = () => row.remove();
  row.dataset.school = school;
  row.dataset.course = course;
  row.dataset.year = year;
  row.appendChild(btn);
  el("edu-list").appendChild(row);
}

function validateForm() {
  const err = [];
  const v = (id) => el(id).value.trim();
  const max = (val, n, label) => { if (val.length > n) err.push(`${label} max length ${n}`); };

  const companyName = v("companyName");
  const companyEmail = v("companyEmail");
  const companyPhone = v("companyPhone");
  const employeeName = v("employeeName");
  const joinDate = v("joinDate");
  const empEmail = v("empEmail");
  const empPhone = v("empPhone");

  if (!companyName) err.push("Company Name is required.");
  if (!companyEmail) err.push("Company Email is required.");
  if (!companyPhone) err.push("Company Phone is required.");
  if (!employeeName) err.push("Employee Name is required.");
  if (!joinDate) err.push("Join Date is required.");
  if (!empEmail) err.push("Employee Email is required.");
  if (!empPhone) err.push("Employee Phone is required.");
  // max lengths
  max(companyName, 50, "Company Name");
  max(companyEmail, 100, "Company Email");
  max(companyPhone, 15, "Company Phone");
  max(employeeName, 25, "Employee Name");
  max(empEmail, 100, "Employee Email");
  max(empPhone, 15, "Employee Phone");

  // joinDate cannot be future
  if (joinDate) {
    const jd = new Date(joinDate);
    const today = new Date(); today.setHours(0,0,0,0);
    if (jd > today) err.push("Join Date must be a past date.");
  }

  // at least one skill?
  const skills = Array.from(document.querySelectorAll("#skills-list .chip"));
  if (skills.length === 0) err.push("Add at least one skill.");

  // at least one education?
  const edus = Array.from(document.querySelectorAll("#edu-list .edu-row"));
  if (edus.length === 0) err.push("Add at least one education entry.");

  return err;
}

function collectFormData() {
  const skills = Array.from(document.querySelectorAll("#skills-list .chip")).map(c => ({
    name: c.dataset.name,
    rating: Number(c.dataset.rating)
  }));
  const education = Array.from(document.querySelectorAll("#edu-list .edu-row")).map(r => ({
    school: r.dataset.school,
    course: r.dataset.course,
    completedYear: r.dataset.year
  }));

  const id = el("company-id").value || uid();
  return {
    id,
    companyName: el("companyName").value.trim(),
    companyAddress: el("companyAddress").value.trim(),
    companyEmail: el("companyEmail").value.trim(),
    companyPhone: el("companyPhone").value.trim(),
    employeeName: el("employeeName").value.trim(),
    designation: el("designation").value,
    joinDate: el("joinDate").value,
    empEmail: el("empEmail").value.trim(),
    empPhone: el("empPhone").value.trim(),
    skills,
    education,
    createdAt: new Date().toLocaleString(),
  };
}

// --------- Router boot ---------
function handleRoute() {
  const hash = location.hash || "#/list";
  const parts = hash.replace("#", "").split("/").filter(Boolean); // ['list'] or ['edit','id']
  if (parts[0] === "edit" && parts[1]) return routes["/edit"](parts[1]);
  if (routes[`/${parts[0]}`]) return routes[`/${parts[0]}`]();
  // default
  routes["/list"]();
}

window.addEventListener("hashchange", handleRoute);
window.addEventListener("load", handleRoute);
