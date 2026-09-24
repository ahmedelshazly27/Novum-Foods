// Novum contact form -> Supabase `contact` edge function.
// Injected before </body> of the site bundle (see scripts/inject-contact-form.py).
(() => {
  const ENDPOINT = "https://YOUR_PROJECT_REF.supabase.co/functions/v1/contact";

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function contactForm(form) {
    return form.querySelector('input[placeholder="name@company.com"]') ? form : null;
  }

  function showError(form, msg) {
    let el = form.querySelector("[data-contact-error]");
    if (!el) {
      el = document.createElement("div");
      el.setAttribute("data-contact-error", "");
      el.style.cssText = "grid-column:1/-1;color:#b42318;font-size:14px";
      form.appendChild(el);
    }
    el.textContent = msg;
  }

  // Capture phase on window: runs before the form's inline onsubmit and
  // survives the bundle swapping in the real document.
  window.addEventListener("submit", async (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;

    // Approach page "Start a conversation": go to the contact route with the email filled in.
    const work = form.querySelector('input[placeholder="Work email"]');
    if (work) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const email = work.value.trim();
      location.hash = "contact";
      setTimeout(() => {
        const target = document.querySelector('input[placeholder="name@company.com"]');
        if (target && email) target.value = email;
        document.querySelector('input[placeholder="Full name"]')?.focus();
      }, 50);
      return;
    }

    if (!contactForm(form)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (form.dataset.sending) return;

    const payload = {
      role: form.querySelector("select")?.value ?? "",
      name: form.querySelector('input[placeholder="Full name"]')?.value ?? "",
      company: form.querySelector('input[placeholder="Company"]')?.value ?? "",
      email: form.querySelector('input[placeholder="name@company.com"]')?.value ?? "",
      message: form.querySelector("textarea")?.value ?? "",
      website: form.querySelector('input[name="website"]')?.value ?? "",
      page: location.href,
    };
    if (!payload.name.trim()) return showError(form, "Please enter your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email.trim())) {
      return showError(form, "Please enter a valid email address.");
    }

    const button = form.querySelector('button[type="submit"]');
    form.dataset.sending = "1";
    if (button) button.disabled = true;
    showError(form, "");

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please email hello@novum-foods.com.");
      const first = payload.name.trim().split(/\s+/)[0];
      form.innerHTML =
        '<div style="grid-column:1/-1"><div class="eyebrow">Received</div>' +
        '<h3 class="h3" style="margin-top:12px">Thank you, ' + esc(first) + ". We will be in touch.</h3>" +
        '<p class="muted" style="margin-top:12px">A confirmation is on its way to ' + esc(payload.email.trim()) + ".</p></div>";
    } catch (err) {
      showError(form, err.message || "Something went wrong. Please email hello@novum-foods.com.");
    } finally {
      delete form.dataset.sending;
      if (button) button.disabled = false;
    }
  }, true);

  // Hidden honeypot field for bots.
  function addHoneypot() {
    document.querySelectorAll("form").forEach((form) => {
      if (!contactForm(form) || form.querySelector('input[name="website"]')) return;
      const hp = document.createElement("input");
      hp.name = "website";
      hp.tabIndex = -1;
      hp.autocomplete = "off";
      hp.setAttribute("aria-hidden", "true");
      hp.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0";
      form.appendChild(hp);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addHoneypot);
  else addHoneypot();
})();
