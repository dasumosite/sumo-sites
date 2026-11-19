const items = [
  ["House blend beans", "Coffee and tea", 12, "kg", 4, 24],
  ["Decaf beans", "Coffee and tea", 2, "kg", 3, 28],
  ["Matcha powder", "Coffee and tea", 4, "packs", 2, 17],
  ["Whole milk", "Milk and dairy", 16, "cartons", 8, 3.1],
  ["Oat milk", "Milk and dairy", 5, "cartons", 6, 4.2],
  ["Whipping cream", "Milk and dairy", 0, "cartons", 3, 6.8],
  ["8 oz paper cups", "Packaging", 220, "cups", 80, .16],
  ["12 oz paper cups", "Packaging", 145, "cups", 90, .19],
  ["Flat cup lids", "Packaging", 78, "lids", 100, .08],
  ["Takeaway bags", "Packaging", 80, "bags", 40, .21],
  ["Vanilla syrup", "Syrups and sauces", 4, "bottles", 2, 12.5],
  ["Caramel syrup", "Syrups and sauces", 1, "bottle", 2, 12.5],
  ["Chocolate sauce", "Syrups and sauces", 3, "bottles", 2, 15],
  ["Butter croissant", "Pastries", 14, "pieces", 6, 1.8],
  ["Banana bread", "Pastries", 0, "slices", 4, 1.4],
].map(([name, category, qty, unit, reorder, cost], id) => ({ id, name, category, qty, unit, reorder, cost }));
const team = [
  { id: 1, name: "Mei Tan", role: "Owner", active: "Today, 8:30 am" },
  { id: 2, name: "Ari Ong", role: "Staff", active: "Today, 9:00 am" },
  { id: 3, name: "Nadia Lee", role: "Staff", active: "Yesterday, 5:10 pm" },
];
const log = [
  { date: "Today, 9:00 am", name: "Whole milk", change: "+6 cartons", who: "Ari Ong", note: "Morning delivery" },
  { date: "Today, 8:35 am", name: "House blend beans", change: "−1 kg", who: "Mei Tan", note: "Opened for service" },
  { date: "Yesterday, 5:10 pm", name: "Banana bread", change: "−4 slices", who: "Nadia Lee", note: "End-of-day stock count" },
];

const query = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD", currencyDisplay: "narrowSymbol" });
const stamp = new Intl.DateTimeFormat("en-SG", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Singapore" });
const stockRows = query("#stock-rows");
const logRows = query("#log-rows");
const staffRows = query("#staff-rows");
const category = query("#stock-category");
const search = query("#stock-search");
const status = query("#stock-status");
const roleSwitch = query("#stock-role");
const screens = [...document.querySelectorAll("[data-screen]")];
const stockDialog = query("#stock-change");
const stockForm = query("#stock-change-form");
const staffDialog = query("#staff-edit");
const staffForm = query("#staff-edit-form");

let role = "owner";
let selectedScreen = "stock";
let changeRequest;
let selectedStaff;
let staffId = 4;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function row(values) {
  const tr = element("tr");
  tr.append(...values.map((value) => element("td", value)));
  return tr;
}
function emptyRow(text, span) {
  const tr = row([text]);
  tr.firstElementChild.colSpan = span;
  return tr;
}
function button(label, description) {
  const control = element("button", label);
  control.type = "button";
  control.setAttribute("aria-label", description);
  return control;
}

function openStockChange(item, direction) {
  changeRequest = { item, direction };
  stockForm.reset();
  stockForm.elements.quantity.setCustomValidity("");
  stockForm.elements.quantity.max = direction > 0 ? 10000 : item.qty;
  query("#stock-change-title").textContent = direction > 0 ? "Stock in" : "Stock out";
  query("#stock-change-item").textContent = item.name + " · " + item.qty + " " + item.unit + " in stock";
  stockDialog.showModal();
}

function renderStock() {
  const term = search.value.trim().toLowerCase();
  const visible = items.filter((item) => item.name.toLowerCase().includes(term) && (!category.value || item.category === category.value));
  query("#stock-count").textContent = visible.length + (visible.length === 1 ? " item" : " items");
  query("#unit-cost").hidden = role !== "owner";
  const renderedRows = visible.map((item) => {
    const tr = row([item.name, item.category, item.qty, item.unit, item.reorder, money.format(item.cost)]);
    tr.lastElementChild.hidden = role !== "owner";
    const state = item.qty === 0 ? "Out" : item.qty <= item.reorder ? "Low" : "OK";
    const statusCell = element("td");
    statusCell.append(element("span", state, "badge badge-" + state.toLowerCase()));
    if (state !== "OK") statusCell.append(element("span", "Reorder", "reorder"));
    const actions = element("td");
    const add = button("Stock in", "Stock in for " + item.name);
    const remove = button("Stock out", "Stock out for " + item.name);
    add.addEventListener("click", () => openStockChange(item, 1));
    remove.addEventListener("click", () => openStockChange(item, -1));
    remove.disabled = item.qty === 0;
    actions.append(add, remove);
    tr.append(statusCell, actions);
    return tr;
  });
  stockRows.replaceChildren(...(renderedRows.length ? renderedRows : [emptyRow("No stock items match.", role === "owner" ? 8 : 7)]));
}

function renderLog() {
  logRows.replaceChildren(...log.map((entry) => row([entry.date, entry.name, entry.change, entry.who, entry.note])));
}

function openStaffDialog(person) {
  if (role !== "owner") return;
  selectedStaff = person;
  staffForm.reset();
  staffForm.elements.name.setCustomValidity("");
  query("#staff-edit-title").textContent = person ? "Remove staff" : "Add staff";
  query("#staff-add-fields").hidden = Boolean(person);
  staffForm.elements.name.required = !person;
  const description = query("#staff-remove-copy");
  description.hidden = !person;
  description.textContent = person ? "Remove " + person.name + " from this sample staff list?" : "";
  query("#staff-save").textContent = person ? "Remove staff" : "Add staff";
  staffDialog.showModal();
}

function renderStaff() {
  const rows = team.map((person) => {
    const tr = row([person.name, person.role, person.active]);
    const actions = element("td");
    const remove = button("Remove", "Remove " + person.name);
    remove.addEventListener("click", () => openStaffDialog(person));
    actions.append(remove);
    tr.append(actions);
    return tr;
  });
  staffRows.replaceChildren(...(rows.length ? rows : [emptyRow("No staff in this sample.", 4)]));
}

function showScreen(next) {
  selectedScreen = next === "staff" && role === "staff" ? "stock" : next;
  for (const tab of screens) {
    const screen = tab.dataset.screen;
    tab.hidden = screen === "staff" && role === "staff";
    if (screen === selectedScreen) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
    query("#" + screen + "-screen").hidden = screen !== selectedScreen;
  }
  if (selectedScreen === "stock") renderStock();
  else if (selectedScreen === "log") renderLog();
  else renderStaff();
  status.textContent = "";
}

stockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const { item, direction } = changeRequest;
  const amount = stockForm.elements.quantity.valueAsNumber;
  if (!Number.isInteger(amount) || amount < 1 || (direction < 0 && amount > item.qty)) {
    stockForm.elements.quantity.setCustomValidity("Enter a valid quantity for this stock change.");
    stockForm.elements.quantity.reportValidity();
    return;
  }
  item.qty += amount * direction;
  log.unshift({
    date: stamp.format(new Date()),
    name: item.name,
    change: (direction > 0 ? "+" : "−") + amount + " " + item.unit,
    who: role === "owner" ? "Mei Tan (Owner)" : "Ari Ong (Staff)",
    note: stockForm.elements.note.value.trim() || "—",
  });
  stockDialog.close();
  renderStock();
  status.textContent = item.name + " updated to " + item.qty + " " + item.unit + ".";
  search.focus();
});

staffForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (role !== "owner") return;
  const name = staffForm.elements.name.value.trim();
  if (selectedStaff) {
    team.splice(team.indexOf(selectedStaff), 1);
    status.textContent = selectedStaff.name + " removed.";
  } else {
    if (!name) {
      staffForm.elements.name.setCustomValidity("Enter a name.");
      staffForm.elements.name.reportValidity();
      return;
    }
    team.push({ id: staffId++, name, role: staffForm.elements.role.value, active: "Never" });
    status.textContent = name + " added.";
  }
  staffDialog.close();
  renderStaff();
  query("#add-staff").focus();
});

staffForm.elements.name.addEventListener("input", () => staffForm.elements.name.setCustomValidity(""));
stockForm.elements.quantity.addEventListener("input", () => stockForm.elements.quantity.setCustomValidity(""));
for (const cancel of document.querySelectorAll("[data-close]")) {
  cancel.addEventListener("click", () => cancel.closest("dialog").close());
}
for (const tab of screens) tab.addEventListener("click", () => showScreen(tab.dataset.screen));
roleSwitch.addEventListener("change", () => {
  role = roleSwitch.querySelector(":checked").value;
  showScreen(selectedScreen);
});
query("#add-staff").addEventListener("click", () => openStaffDialog(null));
category.append(...[...new Set(items.map((item) => item.category))].map((text) => new Option(text, text)));
category.addEventListener("change", renderStock);
search.addEventListener("input", renderStock);
showScreen("stock");
