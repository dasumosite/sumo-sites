const dialog = document.querySelector("#demo-contact");
const title = document.querySelector("#contact-popup-title");
const description = document.querySelector("#contact-popup-description");
const message = document.querySelector("#contact-popup-message");

const descriptions = {
  WhatsApp: "On a real site, WhatsApp would open with this message ready to send.",
  "Google Maps": "On a real site, Google Maps would open with the business location or service area.",
  Phone: "On a real site, your phone app would open with the business number ready to call.",
  Email: "On a real site, your email app would open a message addressed to the business.",
  Instagram: "On a real site, this would open the business’s Instagram profile.",
};

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-simulate]");
  if (!button) return;
  const channel = button.dataset.simulate;
  title.textContent = channel + " preview";
  description.textContent = descriptions[channel];
  message.textContent = button.dataset.message || "";
  message.hidden = !message.textContent;
  dialog.showModal();
});
