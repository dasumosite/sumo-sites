(() => {
  const preview = document.querySelector("#email-preview");
  const fallback = document.querySelector("#brief-fallback");
  const fallbackHint = document.querySelector("#brief-fallback-hint");
  const email = document.querySelector("#brief-email-fallback");
  const whatsapp = document.querySelector("#brief-whatsapp-fallback");
  const copy = document.querySelector("#brief-copy");
  const copyStatus = document.querySelector("#brief-copy-status");
  const emailAddress = email.getAttribute("href");
  const whatsappAddress = whatsapp.getAttribute("href");
  const maxDraftUrlLength = 2200;

  function showFallback() {
    const emailDraft = emailAddress + "?subject=Website%20enquiry&body=" +
      encodeURIComponent(preview.value.replaceAll("\n", "\r\n"));
    const whatsappDraft = whatsappAddress + "?text=" + encodeURIComponent(preview.value);
    const canPrefill = Math.max(emailDraft.length, whatsappDraft.length) <= maxDraftUrlLength;
    email.href = canPrefill ? emailDraft : emailAddress + "?subject=Website%20enquiry";
    whatsapp.href = canPrefill ? whatsappDraft : whatsappAddress;
    fallbackHint.textContent = canPrefill
      ? "Open a draft with your answers, or copy every question and answer."
      : "Copy your full answers first, then paste them into your email or WhatsApp message.";
    copyStatus.textContent = "";
    copy.hidden = false;
    fallback.hidden = false;
  }

  copy.addEventListener("click", async () => {
    copyStatus.textContent = "";
    try {
      await navigator.clipboard.writeText(preview.value);
      copyStatus.textContent = "All questions and answers copied.";
    } catch {
      preview.focus();
      preview.select();
      copyStatus.textContent = "Your answers are selected. Use your device’s copy command.";
    }
  });

  const form = document.querySelector("#website-brief");
  if (!form) {
    showFallback();
    return;
  }
  const steps = [...form.querySelectorAll(".brief-step")];
  const back = document.querySelector("#brief-back");
  const next = document.querySelector("#brief-next");
  const send = document.querySelector("#brief-send");
  const progress = document.querySelector("#brief-progress");
  const status = document.querySelector("#brief-status");
  const error = document.querySelector("#form-error");
  const success = document.querySelector("#brief-success");
  let current = 0;
  let submitting = false;

  function prepare(data = new FormData(form)) {
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
    preview.value = `Hi SumoSites, here are my website brief answers.\n\n${sections.join("\n\n")}`;
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
    fallback.hidden = true;
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
    prepare(data);
    const answers = { ...Object.fromEntries(data), features: data.getAll("features") };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    submitting = true;
    send.disabled = true;
    back.disabled = true;
    send.textContent = "Submitting…";
    error.textContent = "";
    fallback.hidden = true;
    status.textContent = "Sending your answers.";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(answers),
      });
      if (!response.ok) throw new Error("Submission failed.");
      const result = await response.json();
      if (result.ok !== true) throw new Error("Submission failed.");
    } catch {
      status.textContent = "Couldn’t confirm your answers were sent. Try Submit again or use the options below.";
      showFallback();
      return;
    } finally {
      clearTimeout(timeout);
      submitting = false;
      send.disabled = false;
      back.disabled = false;
      send.textContent = "Submit";
    }

    form.reset();
    form.hidden = true;
    success.hidden = false;
    success.querySelector("h2").focus();
  });
  show(0, false);
  form.noValidate = true;
  progress.closest(".brief-progress").hidden = false;
})();
