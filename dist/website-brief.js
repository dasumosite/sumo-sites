(() => {
  const form = document.querySelector("#website-brief");
  const steps = [...form.querySelectorAll(".brief-step")];
  const back = document.querySelector("#brief-back");
  const next = document.querySelector("#brief-next");
  const send = document.querySelector("#brief-send");
  const preview = document.querySelector("#email-preview");
  const status = document.querySelector("#brief-status");
  const error = document.querySelector("#form-error");
  const recipient = "dasumo.site@gmail.com";
  let current = 0;
  let subject = "";
  let emailURI = "";

  function prepare() {
    const data = new FormData(form);
    subject = `Website enquiry — ${data.get("business").trim()}`;
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
    const params = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(preview.value)}`;
    emailURI = `mailto:${recipient}?${params}`;
    document.querySelector("#gmail-draft").href =
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipient)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(preview.value)}`;
    document.querySelector("#long-draft").hidden = emailURI.length < 1800;
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
    document.querySelector("#brief-progress").value = index + 1;
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
  form.addEventListener("submit", (event) => {
    event.preventDefault();
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
    prepare();
    window.open(emailURI, "_self");
    status.textContent =
      "Email draft requested. If your email app did not open, use Gmail or copy or download your answers. You still need to press Send in your email app.";
  });
  document.querySelector("#copy-brief").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(preview.value);
      status.textContent =
        "Answers copied. Paste it into an email to dasumo.site@gmail.com.";
    } catch {
      preview.focus();
      preview.select();
      status.textContent =
        "Your answers are selected. Use your device’s Copy command, then paste it into an email to dasumo.site@gmail.com.";
    }
  });
  document.querySelector("#download-brief").addEventListener("click", () => {
    const blob = new Blob(
      [`To: ${recipient}\nSubject: ${subject}\n\n${preview.value}`],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sumosites-website-answers.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status.textContent =
      "Answers download requested. Attach the text file and any photos to your email to dasumo.site@gmail.com.";
  });
  show(0, false);
  form.hidden = false;
})();
