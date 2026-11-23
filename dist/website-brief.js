(() => {
  const form = document.querySelector("#website-brief");
  const steps = [...form.querySelectorAll(".brief-step")];
  const back = document.querySelector("#brief-back");
  const next = document.querySelector("#brief-next");
  const send = document.querySelector("#brief-send");
  const progress = document.querySelector("#brief-progress");
  const preview = document.querySelector("#email-preview");
  const status = document.querySelector("#brief-status");
  const error = document.querySelector("#form-error");
  const success = document.querySelector("#brief-success");
  let current = 0;
  let submitting = false;

  function prepare() {
    const data = new FormData(form);
    const sections = steps.slice(0, -1).map((step, index) => {
      const answers = [...step.querySelectorAll("[data-question]")].map(
        (group) => {
          const name = group.querySelector("[name]").name;
          const answer = data
            .getAll(name)
            .map((v) => v.trim())
            .filter(Boolean)
            .join(", ");
          const question = group.dataset.question;
          const label = question.endsWith("?") ? question : question + ":";
          return `${label}\n${answer || "Not provided."}`;
        },
      );
      return `${index + 1}. ${step.dataset.title}\n${answers.join("\n\n")}`;
    });
    preview.value = `Hi SumoSites,\n\nHere are my answers about the website I need. Please recommend what to build and provide a quote.\n\n${sections.join("\n\n--------------------\n\n")}\n\nReply to: ${data.get("email").trim()}\n\nThanks,\n${data.get("name").trim()}`;
  }

  function show(index, focus = true) {
    current = index;
    steps.forEach((step, i) => {
      step.hidden = i !== index;
    });
    const last = index === steps.length - 1;
    back.hidden = index === 0;
    next.hidden = last;
    send.hidden = !last;
    next.textContent = index === steps.length - 2 ? "Review answers" : "Continue";
    document.querySelector("#step-label").textContent =
      `Step ${index + 1} of ${steps.length} · ${steps[index].dataset.title}`;
    progress.value = index + 1;
    error.textContent = "";
    status.textContent = "";
    if (last) prepare();
    if (focus) steps[index].querySelector("h2").focus();
  }

  function validate(step) {
    for (const field of step.querySelectorAll("input, textarea, select")) {
      field.setCustomValidity(
        field.required && !field.value.trim()
          ? "Please fill in this answer."
          : "",
      );
      if (!field.checkValidity()) {
        error.textContent =
          "Please check the highlighted answer before continuing.";
        field.reportValidity();
        return false;
      }
    }
    return true;
  }
  form.addEventListener("input", (event) => {
    if (event.target.setCustomValidity) event.target.setCustomValidity("");
  });
  next.addEventListener("click", () => {
    if (validate(steps[current])) show(current + 1);
  });
  back.addEventListener("click", () => show(current - 1));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (current < steps.length - 1) {
      next.click();
      return;
    }
    for (let i = 0; i < steps.length - 1; i++) {
      // Bring any invalid field into view before showing native validation.
      const invalid = [...steps[i].querySelectorAll("[required]")].find(
        (field) => !field.value.trim() || !field.checkValidity(),
      );
      if (invalid) {
        show(i);
        validate(steps[i]);
        return;
      }
    }
    const data = new FormData(form);
    const answers = { ...Object.fromEntries(data), features: data.getAll("features") };
    submitting = true;
    send.disabled = true;
    back.disabled = true;
    send.textContent = "Submitting…";
    error.textContent = "";
    status.textContent = "Sending your answers.";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (!response.ok) throw new Error("Submission failed.");
      const result = await response.json();
      if (result.ok !== true) throw new Error("Submission failed.");

      form.reset();
      form.hidden = true;
      success.hidden = false;
      success.querySelector("h2").focus();
    } catch {
      status.textContent =
        "Couldn’t submit your answers. They’re still here. Please try again, or use the email or WhatsApp link above.";
    } finally {
      submitting = false;
      send.disabled = false;
      back.disabled = false;
      send.textContent = "Submit";
    }
  });
  show(0, false);
  form.noValidate = true;
  progress.closest(".brief-progress").hidden = false;
})();
