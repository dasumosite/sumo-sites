for (const comparison of document.querySelectorAll("[data-apex-compare]")) {
  const control = comparison.querySelector("input[type='range']");
  function reveal() {
    comparison.style.setProperty("--apex-reveal", control.value + "%");
    control.setAttribute("aria-valuetext", control.value + "% before photo");
  }
  control.addEventListener("input", reveal);
  reveal();
  comparison.classList.add("is-interactive");
  control.closest("label").hidden = false;
}

const booking = document.querySelector("[data-apex-booking]");
if (booking) {
  const form = booking.querySelector("form");
  const service = form.elements.namedItem("service");
  const vehicle = form.elements.namedItem("vehicle");
  const breakdown = booking.querySelector("#apex-quote-breakdown");
  const total = booking.querySelector("#apex-quote-total");
  const preview = booking.querySelector("button[data-simulate]");
  const requestedService = new URLSearchParams(location.search).get("service");
  if ([...service.options].some((option) => option.value === requestedService)) {
    service.value = requestedService;
  }

  function updateQuote() {
    const size = vehicle.selectedOptions[0];
    const selected = service.selectedOptions[0];
    const serviceName = selected.textContent.split(" · ")[0];
    const extras = [...form.querySelectorAll("input[name='extras']:checked")];
    const items = [[serviceName, Number(selected.dataset.price)]];
    if (Number(size.dataset.price)) items.push(["Vehicle size surcharge", Number(size.dataset.price)]);
    for (const extra of extras) items.push([extra.value, Number(extra.dataset.price)]);

    breakdown.replaceChildren();
    for (const [name, price] of items) {
      const label = document.createElement("dt");
      const amount = document.createElement("dd");
      label.textContent = name;
      amount.textContent = "S$" + price;
      breakdown.append(label, amount);
    }

    const estimate = items.reduce((sum, [, price]) => sum + price, 0);
    const extraNames = extras.map((extra) => extra.value).join(", ") || "None";
    const sizeName = size.textContent.split(" · ")[0];
    total.value = "S$" + estimate;
    preview.dataset.message = [
      "Hi Apex, I'd like to book a detail.",
      "Package: " + serviceName,
      "Vehicle: " + sizeName,
      "Extras: " + extraNames,
      "Online estimate: " + total.value,
    ].join("\n");
  }

  form.addEventListener("change", updateQuote);
  form.addEventListener("submit", (event) => event.preventDefault());
  updateQuote();
  booking.hidden = false;
}
