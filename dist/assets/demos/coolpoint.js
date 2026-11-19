const form = document.querySelector("#aircon-quote");
const layout = document.querySelector(".quote-layout");
const panel = document.querySelector("#aircon-result");
const fields = [
  ["service", "Service"],
  ["units", "Units"],
  ["area", "Area"],
  ["date", "Preferred date"],
  ["name", "Name"],
  ["mobile", "Mobile"],
];
const dateFormat = new Intl.DateTimeFormat("en-SG", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function cell(tag, text) {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = new FormData(form);
  const mobile = values.get("mobile").replaceAll(" ", "");
  if (!/^(?:\+65)?[89][0-9]{7}$/.test(mobile)) {
    form.elements.mobile.setCustomValidity("Enter an 8-digit Singapore mobile number.");
    form.elements.mobile.reportValidity();
    return;
  }
  const name = values.get("name").trim();
  if (!name) {
    form.elements.name.setCustomValidity("Enter a name.");
    form.elements.name.reportValidity();
    return;
  }
  values.set("name", name);
  values.set("date", dateFormat.format(new Date(values.get("date") + "T00:00:00Z")));
  document.querySelector("#email-subject").textContent = "New quote request: " + values.get("service") + ", " + values.get("units") + " units";
  document.querySelector("#email-fields").replaceChildren(...fields.flatMap(([key, label]) => [cell("dt", label), cell("dd", values.get(key))]));
  document.querySelector("#new-enquiry").replaceChildren(...fields.map(([key]) => cell("td", values.get(key))));
  layout.hidden = true;
  panel.hidden = false;
  panel.querySelector("h2").focus();
});
for (const name of ["mobile", "name"]) {
  form.elements[name].addEventListener("input", () => form.elements[name].setCustomValidity(""));
}

document.querySelector("#aircon-reset").addEventListener("click", () => {
  form.reset();
  document.querySelector("#email-subject").textContent = "";
  document.querySelector("#email-fields").replaceChildren();
  document.querySelector("#new-enquiry").replaceChildren();
  panel.hidden = true;
  layout.hidden = false;
  form.elements.service.focus();
});
form.hidden = false;
