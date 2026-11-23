import { loadSheet } from "./csv.js";
import { timetable as config } from "./sheets-config.js";

const sample = "/assets/demos/timetable.csv";
const columns = ["Level", "Subject", "Day", "Start", "End", "Teacher", "Room"];
const filterKeys = ["Level", "Subject", "Day"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const mode = document.querySelector("#lumen-mode");
const basic = document.querySelector("#timetable-basic");
const automation = document.querySelector("#timetable-automation");
const source = document.querySelector("#lumen-source");
const packageLabel = document.querySelector("#demo-package");
const filters = document.querySelector("#class-filters");
const cards = document.querySelector("#class-cards");
const tally = document.querySelector("#class-count");
const template = document.querySelector("#class-card");
const scenario = document.querySelector("#availability-demo");
const scenarioClass = document.querySelector("#scenario-class");
const scenarioPlaces = document.querySelector("#scenario-places");
const scenarioToggle = document.querySelector("#scenario-toggle");
const scenarioPreview = document.querySelector("#scenario-preview");
const scenarioStatus = document.querySelector("#scenario-status");
let rows = [];
let loading;
let connected = false;
let featuredClass;
let lastPlaceTaken = false;

if (config.embedUrl) {
  document.querySelector("#lumen-embed").src = config.embedUrl;
  document.querySelector("#lumen-basic-note").textContent = "This version displays the published Google Sheet directly.";
}

function classTime(row) {
  return row.Day + ", " + row.Start + "–" + row.End;
}

function seatCount(row) {
  return row === featuredClass && lastPlaceTaken ? 0 : row.seats;
}

function availability(seats) {
  if (seats === 0) return "Full · waitlist available";
  return seats === 1 ? "1 place left" : seats + " places left";
}

function classCard(row) {
  const node = template.content.cloneNode(true);
  node.querySelector("[data-level]").textContent = row.Level;
  node.querySelector("[data-subject]").textContent = row.Subject;
  node.querySelector("[data-time]").textContent = classTime(row);
  node.querySelector("[data-teacher]").textContent = [row.Teacher, row.Room && "Room " + row.Room].filter(Boolean).join(", ");

  const seats = seatCount(row);
  const full = seats === 0;
  const status = node.querySelector("[data-availability]");
  if (seats !== null) {
    status.hidden = false;
    status.textContent = availability(seats);
    status.toggleAttribute("data-full", full);
  }

  const button = node.querySelector("button");
  button.textContent = full ? "Ask to join the waitlist" : "Ask about a trial";
  const request = full ? "join the waitlist for" : "ask about a trial for";
  button.dataset.message = "Hi Lumen, I’d like to " + request + " " + row.Level + " " +
    row.Subject + " on " + classTime(row) + ". Is this possible?";
  return node;
}

function render() {
  const choices = new FormData(filters);
  const filtered = rows.filter((row) => filterKeys.every((key) => !choices.get(key) || choices.get(key) === row[key]));
  cards.replaceChildren(...filtered.map(classCard));
  tally.textContent = filtered.length ? filtered.length + (filtered.length === 1 ? " class" : " classes") : "No classes match your filters.";
}

function renderScenario() {
  scenarioPlaces.textContent = seatCount(featuredClass);
  scenarioToggle.textContent = lastPlaceTaken ? "Reopen the last place" : "Mark last place taken";
  scenarioPreview.replaceChildren(classCard(featuredClass));
  scenarioStatus.textContent = lastPlaceTaken
    ? "The class is full. Parents can now ask to join the waitlist."
    : "One place is available. Parents can ask about a trial.";
}

async function loadAutomation() {
  tally.textContent = "Loading classes…";
  try {
    const data = await loadSheet(config.csvUrl, sample, columns);
    rows = data.rows.filter((row) => row.Level && row.Subject && row.Day).map((row) => ({
      ...row,
      seats: /^\d+$/.test(row.Seats ?? "") && Number.isSafeInteger(Number(row.Seats)) ? Number(row.Seats) : null,
    }));
    connected = data.connected;
    for (const key of filterKeys) {
      const values = [...new Set(rows.map((row) => row[key]))];
      if (key === "Day") values.sort((a, b) => days.indexOf(a) - days.indexOf(b));
      filters.elements[key].append(...values.map((value) => new Option(value, value)));
    }
    if (connected) {
      document.querySelector("#lumen-automation-note").textContent = "This timetable uses the published Google Sheet.";
    } else {
      featuredClass = rows.find((row) => row.seats === 1);
      if (featuredClass) {
        scenarioClass.textContent = featuredClass.Level + " " + featuredClass.Subject;
        scenario.hidden = false;
        renderScenario();
      }
      if (data.fallback) document.querySelector("#lumen-automation-note").textContent = "The published Google Sheet could not load. This is the sample timetable.";
    }
    render();
  } catch {
    loading = undefined;
    tally.textContent = "Could not load the timetable. Try refreshing the page.";
  }
}

async function switchMode() {
  const showAutomation = mode.querySelector(":checked").value === "automation";
  basic.hidden = showAutomation;
  automation.hidden = !showAutomation;
  packageLabel.textContent = showAutomation ? "Built as: Website + automation, S$85" : "Built as: Basic website, S$42.50";
  if (showAutomation) await (loading ??= loadAutomation());
  const usingAutomation = mode.querySelector(":checked").value === "automation";
  const usingPublishedSheet = usingAutomation ? connected : Boolean(config.embedUrl);
  source.href = usingPublishedSheet
    ? config.sourceUrl || (usingAutomation ? config.csvUrl : config.embedUrl)
    : sample;
  source.textContent = usingPublishedSheet ? "View the source spreadsheet" : "View sample timetable data (CSV)";
}

scenarioToggle.addEventListener("click", () => {
  lastPlaceTaken = !lastPlaceTaken;
  renderScenario();
  render();
});
mode.addEventListener("change", switchMode);
filters.addEventListener("change", render);
filters.addEventListener("submit", (event) => event.preventDefault());
if (new URLSearchParams(location.search).get("mode") === "automation") {
  mode.querySelector('[value="automation"]').checked = true;
}
switchMode();
