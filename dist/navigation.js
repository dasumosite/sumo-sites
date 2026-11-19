"use strict";

const header = document.querySelector(".site-header");
const menuButton = header.querySelector(".menu-toggle");
const navigation = header.querySelector("#site-navigation");
const demosMenu = navigation.querySelector(".demos-menu");
const demosSummary = demosMenu.querySelector("summary");
const compact = window.matchMedia("(max-width: 850px)");

function setMenuOpen(open) {
  header.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  if (!open) demosMenu.open = false;
}

function updateLayout() {
  if (!compact.matches && document.activeElement === menuButton) {
    navigation.querySelector("a").focus();
  } else if (compact.matches && navigation.contains(document.activeElement)) {
    menuButton.focus();
  }
  setMenuOpen(false);
}

menuButton.hidden = false;
header.classList.add("menu-ready");
compact.addEventListener("change", updateLayout);

menuButton.addEventListener("click", () => {
  setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
});

header.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenuOpen(false);
});

document.addEventListener("click", (event) => {
  if (!header.contains(event.target)) setMenuOpen(false);
  else if (!demosMenu.contains(event.target)) demosMenu.open = false;
});

demosMenu.addEventListener("focusout", (event) => {
  if (event.relatedTarget && !demosMenu.contains(event.relatedTarget)) demosMenu.open = false;
});

header.addEventListener("focusout", (event) => {
  if (event.relatedTarget && !header.contains(event.relatedTarget)) setMenuOpen(false);
});

header.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (demosMenu.open && demosMenu.contains(event.target)) {
    demosMenu.open = false;
    demosSummary.focus();
  } else if (menuButton.getAttribute("aria-expanded") === "true") {
    setMenuOpen(false);
    menuButton.focus();
  } else {
    return;
  }
  event.preventDefault();
});
