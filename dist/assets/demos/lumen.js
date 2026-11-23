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
const note = document.querySelector("#lumen-automation-note");
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

function classEntry(row) {
  const card = template.content.firstElementChild.cloneNode(true);
  card.querySelector("[data-level]").textContent = row.Level;
  card.querySelector("[data-subject]").textContent = row.Subject;
  card.querySelector("[data-time]").textContent = classTime(row);
  card.querySelector("[data-teacher]").textContent = [row.Teacher, row.Room && "Room " + row.Room].filter(Boolean).join(", ");
  showAvailability(card, row);
  if (connected || row.seats === null) return card;

  const pair = staffTemplate.content.firstElementChild.cloneNode(true);
  const className = row.Level + " " + row.Subject;
  pair.querySelector("[data-staff-class]").textContent = className;
  pair.querySelector("[data-staff-time]").textContent = classTime(row);
  const seats = pair.querySelector("[data-seats]");
  const decrease = pair.querySelector("[data-decrease]");
  const increase = pair.querySelector("[data-increase]");
  const classLabel = className + " on " + classTime(row);
  decrease.setAttribute("aria-label", "Remove one place for " + classLabel);
  increase.setAttribute("aria-label", "Add one place for " + classLabel);

  function showSeats() {
    seats.textContent = row.seats;
    decrease.setAttribute("aria-disabled", String(row.seats === 0));
    increase.setAttribute("aria-disabled", String(row.seats === Number.MAX_SAFE_INTEGER));
  }

  function changeSeats(amount) {
    const count = row.seats + amount;
    if (count < 0 || !Number.isSafeInteger(count)) return;
    row.seats = count;
    showSeats();
    showAvailability(card, row);
  }

  decrease.addEventListener("click", () => changeSeats(-1));
  increase.addEventListener("click", () => changeSeats(1));
  showSeats();
  card.querySelector("[data-parent-label]").hidden = false;
  pair.append(card);
  return pair;
}

function render() {
  const choices = new FormData(filters);
  const filtered = rows.filter((row) => filterKeys.every((key) => !choices.get(key) || choices.get(key) === row[key]));
  cards.replaceChildren(...filtered.map(classEntry));
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
    const hasStaffRows = !connected && rows.some((row) => row.seats !== null);
    cards.classList.toggle("three", !hasStaffRows);
    note.textContent = connected ? "This timetable uses the published Google Sheet." : "Sample timetable.";
    if (data.fallback) note.textContent = "The published Google Sheet could not load. This is the sample timetable.";
    if (hasStaffRows) {
      note.textContent += " Use − or + on any class to see its parent view update. At zero places, the button switches to a waitlist enquiry. Changes stay in this browser.";
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
filters.addEventListener("change", render);
filters.addEventListener("submit", (event) => event.preventDefault());
if (new URLSearchParams(location.search).get("mode") === "automation") {
  mode.querySelector('[value="automation"]').checked = true;
}
switchMode();
