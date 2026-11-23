import { loadSheet } from "./csv.js";
import { timetable as config } from "./sheets-config.js";

const sample = "/assets/demos/timetable.csv";
const columns = ["Level", "Subject", "Day", "Start", "End", "Teacher", "Room"];
const mode = document.querySelector("#lumen-mode");
const basic = document.querySelector("#timetable-basic");
const automation = document.querySelector("#timetable-automation");
const source = document.querySelector("#lumen-source");
const packageLabel = document.querySelector("#demo-package");
const filters = document.querySelector("#class-filters");
const cards = document.querySelector("#class-cards");
const tally = document.querySelector("#class-count");
const template = document.querySelector("#class-card");
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
let rows = [];
let loaded = false;
let connected = false;

if (config.embedUrl) {
  document.querySelector("#lumen-embed").src = config.embedUrl;
  document.querySelector("#lumen-basic-note").textContent = "This version displays the published Google Sheet directly.";
}

function render() {
  const choices = new FormData(filters);
  const filtered = rows.filter((row) => ["Level", "Subject", "Day"].every((key) => !choices.get(key) || choices.get(key) === row[key]));
  const items = filtered.map((row) => {
    const node = template.content.cloneNode(true);
    const [level, subject, time, teacher] = node.querySelector("article").children;
    level.textContent = row.Level;
    subject.textContent = row.Subject;
    time.textContent = row.Day + ", " + row.Start + "–" + row.End;
    teacher.textContent = [row.Teacher, row.Room && "Room " + row.Room].filter(Boolean).join(", ");
    return node;
  });
  cards.replaceChildren(...items);
  tally.textContent = items.length ? items.length + (items.length === 1 ? " class" : " classes") : "No classes match your filters.";
}

async function loadAutomation() {
  if (loaded) return;
  loaded = true;
  tally.textContent = "Loading classes…";
  try {
    const data = await loadSheet(config.csvUrl, sample, columns);
    rows = data.rows.filter((row) => row.Level && row.Subject && row.Day);
    connected = data.connected;
    for (const key of ["Level", "Subject", "Day"]) {
      const values = [...new Set(rows.map((row) => row[key]))];
      if (key === "Day") values.sort((a, b) => days.indexOf(a) - days.indexOf(b));
      filters.elements[key].append(...values.map((value) => new Option(value, value)));
    }
    if (connected) document.querySelector("#lumen-automation-note").textContent = "These cards use the connected Google Sheet.";
    else if (data.fallback) document.querySelector("#lumen-automation-note").textContent = "The published Google Sheet could not load. This is the sample timetable.";
    render();
  } catch {
    loaded = false;
    tally.textContent = "Could not load the timetable. Try refreshing the page.";
  }
}

async function switchMode() {
  const showAutomation = mode.querySelector(":checked").value === "automation";
  basic.hidden = showAutomation;
  automation.hidden = !showAutomation;
  packageLabel.textContent = showAutomation ? "Built as: Website + automation, S$85" : "Built as: Basic website, S$42.50";
  if (showAutomation) await loadAutomation();
  const usingAutomation = mode.querySelector(":checked").value === "automation";
  const usingPublishedSheet = usingAutomation ? connected : Boolean(config.embedUrl);
  source.href = usingPublishedSheet
    ? config.sourceUrl || (usingAutomation ? config.csvUrl : config.embedUrl)
    : sample;
  source.textContent = usingPublishedSheet ? "View the source spreadsheet" : "View sample timetable data (CSV)";
}

mode.addEventListener("change", switchMode);
filters.addEventListener("change", render);
filters.addEventListener("submit", (event) => event.preventDefault());
if (new URLSearchParams(location.search).get("mode") === "automation") {
  mode.querySelector('[value="automation"]').checked = true;
}
switchMode();
