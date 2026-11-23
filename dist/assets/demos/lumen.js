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
const staffTemplate = document.querySelector("#staff-row");
const staffRows = document.querySelector("#lumen-staff-rows");
const staffStatus = document.querySelector("#lumen-staff-status");
const view = document.querySelector("#lumen-view");
const parentChoice = view.querySelector('[value="parent"]');
const staffChoice = view.querySelector('[value="staff"]');
const parentPanel = document.querySelector("#lumen-parent");
const staffPanel = document.querySelector("#lumen-staff");
const note = document.querySelector("#lumen-automation-note");
const renderedCards = new Map();
let rows = [];
let loading;
let connected = false;

if (config.embedUrl) {
  document.querySelector("#lumen-embed").src = config.embedUrl;
  document.querySelector("#lumen-basic-note").textContent = "This version displays the published Google Sheet directly.";
}

function classTime(row) {
  return row.Day + ", " + row.Start + "–" + row.End;
}

function availability(seats) {
  if (seats === 0) return "Full · waitlist available";
  return seats === 1 ? "1 place left" : seats + " places left";
}

function showAvailability(card, row) {
  const { seats } = row;
  const full = seats === 0;
  const status = card.querySelector("[data-availability]");
  if (seats !== null) {
    status.hidden = false;
    status.textContent = availability(seats);
    status.toggleAttribute("data-full", full);
  }

  const button = card.querySelector("button");
  button.textContent = full ? "Ask to join the waitlist" : "Ask about a trial";
  const request = full ? "join the waitlist for" : "ask about a trial for";
  button.dataset.message = "Hi Lumen, I’d like to " + request + " " + row.Level + " " +
    row.Subject + " on " + classTime(row) + ". Is this possible?";
}

function classCard(row) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector("[data-level]").textContent = row.Level;
  card.querySelector("[data-subject]").textContent = row.Subject;
  card.querySelector("[data-time]").textContent = classTime(row);
  card.querySelector("[data-teacher]").textContent = [row.Teacher, row.Room && "Room " + row.Room].filter(Boolean).join(", ");
  showAvailability(card, row);
  renderedCards.set(row, card);
  return card;
}

function switchView() {
  parentPanel.hidden = staffChoice.checked;
  staffPanel.hidden = !staffChoice.checked;
}

function showParentCard(row) {
  parentChoice.checked = true;
  switchView();
  if (!renderedCards.has(row)) {
    filters.reset();
    render();
  }
  renderedCards.get(row).focus();
}

function staffRow(row) {
  const entry = staffTemplate.content.firstElementChild.cloneNode(true);
  const className = row.Level + " " + row.Subject;
  const time = classTime(row);
  entry.querySelector("[data-staff-class]").textContent = className;
  entry.querySelector("[data-staff-time]").textContent = time;
  const seats = entry.querySelector("[data-seats]");
  const decrease = entry.querySelector("[data-decrease]");
  const increase = entry.querySelector("[data-increase]");
  const preview = entry.querySelector("[data-parent-link]");
  const classLabel = className + " on " + time;
  decrease.setAttribute("aria-label", "Remove one place for " + classLabel);
  increase.setAttribute("aria-label", "Add one place for " + classLabel);
  preview.setAttribute("aria-label", "See parent card for " + classLabel);

  function showSeats() {
    seats.textContent = row.seats ?? "—";
    decrease.setAttribute("aria-disabled", String(row.seats === null || row.seats === 0));
    increase.setAttribute("aria-disabled", String(row.seats === null || row.seats === Number.MAX_SAFE_INTEGER));
  }

  function changeSeats(amount) {
    if (row.seats === null) return;
    const count = row.seats + amount;
    if (count < 0 || !Number.isSafeInteger(count)) return;
    row.seats = count;
    showSeats();
    const card = renderedCards.get(row);
    if (card) showAvailability(card, row);
    staffStatus.textContent = className + " now shows “" + availability(count) + "” in the parent timetable.";
  }

  decrease.addEventListener("click", () => changeSeats(-1));
  increase.addEventListener("click", () => changeSeats(1));
  preview.addEventListener("click", () => showParentCard(row));
  showSeats();
  return entry;
}

function render() {
  const choices = new FormData(filters);
  const filtered = rows.filter((row) => filterKeys.every((key) => !choices.get(key) || choices.get(key) === row[key]));
  renderedCards.clear();
  cards.replaceChildren(...filtered.map(classCard));
  tally.textContent = filtered.length ? filtered.length + (filtered.length === 1 ? " class" : " classes") : "No classes match your filters.";
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
    note.textContent = connected ? "This timetable uses the published Google Sheet." : "Sample timetable.";
    if (data.fallback) note.textContent = "The published Google Sheet could not load. This is the sample timetable.";
    const hasStaffRows = !connected && rows.some((row) => row.seats !== null);
    if (hasStaffRows) {
      staffRows.replaceChildren(...rows.map(staffRow));
      view.hidden = false;
    }
    note.hidden = false;
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
  source.textContent = usingPublishedSheet ? "View the source spreadsheet" : "View original sample timetable data (CSV)";
}

mode.addEventListener("change", switchMode);
view.addEventListener("change", switchView);
filters.addEventListener("change", render);
filters.addEventListener("submit", (event) => event.preventDefault());
if (new URLSearchParams(location.search).get("mode") === "automation") {
  mode.querySelector('[value="automation"]').checked = true;
}
switchMode();
