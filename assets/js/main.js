/* =========================================================================
   ANSAMBLUL „ARDEALUL" — main.js
   Fără dependențe externe. Funcționează pe fiecare pagină în același fel.
   ========================================================================= */
(function () {
  "use strict";

  /* -----------------------------------------------------------------------
     0. An curent în footer
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* -----------------------------------------------------------------------
     1. Meniu mobil
     --------------------------------------------------------------------- */
  var navToggle = document.querySelector("[data-nav-toggle]");
  var mobileNav = document.querySelector("[data-mobile-nav]");
  if (navToggle && mobileNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mobileNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
    mobileNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        mobileNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* -----------------------------------------------------------------------
     2. Revelare la scroll (IntersectionObserver)
     --------------------------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* -----------------------------------------------------------------------
     3. Buton „sus" + umbră header la scroll
     --------------------------------------------------------------------- */
  var toTop = document.querySelector("[data-to-top]");
  var header = document.querySelector(".site-header");
  window.addEventListener("scroll", function () {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (toTop) toTop.classList.toggle("is-visible", y > 480);
    if (header) header.style.boxShadow = y > 8 ? "0 6px 20px rgba(30,25,18,0.12)" : "none";
  }, { passive: true });
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* -----------------------------------------------------------------------
     4. Banner cookie-uri
     NOTĂ PENTRU PRODUCȚIE: în previzualizarea din chat, preferința se ține
     doar în memorie (sessionStorage poate fi blocat în iframe-uri sandbox).
     După ce site-ul e publicat pe domeniul propriu, înlocuiește liniile
     marcate mai jos cu localStorage pentru a reține alegerea permanent.
     --------------------------------------------------------------------- */
  var cookieBar = document.querySelector("[data-cookie-bar]");
  if (cookieBar) {
    var consentGiven = false;
    try { consentGiven = sessionStorage.getItem("ardealul-cookie-consent") === "1"; }
    catch (e) { consentGiven = false; }

    if (!consentGiven) {
      window.setTimeout(function () { cookieBar.classList.add("is-visible"); }, 900);
    }
    var acceptBtn = cookieBar.querySelector("[data-cookie-accept]");
    if (acceptBtn) {
      acceptBtn.addEventListener("click", function () {
        cookieBar.classList.remove("is-visible");
        try { sessionStorage.setItem("ardealul-cookie-consent", "1"); } catch (e) { /* noop */ }
        /* PRODUCȚIE: schimbă sessionStorage -> localStorage mai sus, pentru reținere permanentă */
      });
    }
  }

  /* -----------------------------------------------------------------------
     5. Galerie — lightbox simplu
     --------------------------------------------------------------------- */
  var lightbox = document.querySelector("[data-lightbox]");
  if (lightbox) {
    var lbBody = lightbox.querySelector("[data-lightbox-body]");
    var lbClose = lightbox.querySelector("[data-lightbox-close]");
    document.querySelectorAll("[data-gallery-item]").forEach(function (item) {
      item.addEventListener("click", function () {
        var label = item.getAttribute("data-caption") || "";
        lbBody.innerHTML =
          '<div class="photo-ph photo-ph--wide" style="max-width:640px;margin-inline:auto;">' +
          '<span class="photo-ph__label">' + label + "</span></div>";
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        lbClose.focus();
      });
    });
    function closeLb() {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
    }
    if (lbClose) lbClose.addEventListener("click", closeLb);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLb();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLb();
    });
  }

  /* -----------------------------------------------------------------------
     6. Formulare — trimitere prin fetch către Formspree, cu fallback nativ
     Fiecare <form data-ajax-form> are deja action + method reale, deci
     funcționează chiar dacă JS e dezactivat (se face un POST normal).
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-ajax-form]").forEach(function (form) {
    var statusBox = form.querySelector("[data-form-status]");
    form.addEventListener("submit", function (e) {
      var action = form.getAttribute("action") || "";
      if (action.indexOf("FORMSPREE_ID") !== -1) {
        /* Endpoint încă neconfigurat — lăsăm un mesaj clar în loc să eșueze tacit. */
        e.preventDefault();
        showStatus(statusBox, "error",
          "Formularul nu este încă legat la o adresă de trimitere. Vezi ghidul tehnic — secțiunea Formspree.");
        return;
      }
      e.preventDefault();
      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalText = submitBtn.textContent; submitBtn.textContent = "Se trimite…"; }

      fetch(action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
        .then(function (response) {
          if (response.ok) {
            form.reset();
            showStatus(statusBox, "ok", form.getAttribute("data-success") || "Mulțumim! Am primit mesajul tău.");
          } else {
            showStatus(statusBox, "error", "Ceva nu a funcționat. Te rugăm încearcă din nou sau scrie-ne direct pe e-mail.");
          }
        })
        .catch(function () {
          showStatus(statusBox, "error", "Ceva nu a funcționat. Te rugăm încearcă din nou sau scrie-ne direct pe e-mail.");
        })
        .finally(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalText; }
        });
    });
  });

  function showStatus(box, type, message) {
    if (!box) return;
    box.textContent = message;
    box.classList.remove("form-status--ok", "form-status--error");
    box.classList.add("is-visible", type === "ok" ? "form-status--ok" : "form-status--error");
    box.setAttribute("role", "status");
    box.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* -----------------------------------------------------------------------
     7. Transmisii live — playerul YouTube se încarcă doar la cerere
     Până când vizitatorul apasă „Pornește", pagina nu contactează YouTube.
     Se folosește youtube-nocookie.com (mod de confidențialitate extinsă).
     Fără JS, butonul rămâne un link obișnuit către pagina video de pe YouTube.
     --------------------------------------------------------------------- */
  document.querySelectorAll("[data-yt-id]").forEach(function (player) {
    var trigger = player.querySelector("[data-yt-load]");
    var id = player.getAttribute("data-yt-id") || "";
    if (!trigger || !/^[A-Za-z0-9_-]{11}$/.test(id)) return;
    trigger.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button > 0) return;
      e.preventDefault();
      var frame = document.createElement("iframe");
      frame.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
      frame.title = player.getAttribute("data-yt-title") || "Transmisie video";
      frame.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
      frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      frame.setAttribute("allowfullscreen", "");
      player.textContent = "";
      player.appendChild(frame);
      player.classList.add("is-playing");
      frame.focus();
    });
  });

  /* -----------------------------------------------------------------------
     8. Evenimente — etichete „Astăzi / Mâine / Încheiat"
     Se calculează după data din Europa/București, nu după fusul vizitatorului.
     Fără JS rămâne textul static din HTML. Elementele cu data-event-date
     (AAAA-LL-ZZ) primesc data-state: today | tomorrow | soon | past.
     --------------------------------------------------------------------- */
  (function () {
    var events = document.querySelectorAll("[data-event-date]");
    if (!events.length) return;

    var today;
    try {
      var parts = {};
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      today = Date.UTC(+parts.year, +parts.month - 1, +parts.day);
    } catch (err) {
      var now = new Date();
      today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    }

    var LABELS = { past: "Încheiat", today: "Astăzi", tomorrow: "Mâine", soon: "În curând" };

    events.forEach(function (el) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(el.getAttribute("data-event-date") || "");
      if (!m) return;
      var diff = Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - today) / 86400000);
      var state = diff < 0 ? "past" : diff === 0 ? "today" : diff === 1 ? "tomorrow" : "soon";
      el.setAttribute("data-state", state);
      el.classList.toggle("is-past", state === "past");

      var chip = el.querySelector("[data-event-status]");
      if (chip) { chip.textContent = LABELS[state]; chip.setAttribute("data-state", state); }

      if (state === "past") {
        var badge = el.querySelector("[data-live-badge]");
        if (badge) { badge.textContent = "Transmisie încheiată"; badge.classList.add("live-badge--rec"); }
        var playBtn = el.querySelector("[data-yt-load]");
        if (playBtn) playBtn.textContent = "Deschide playerul";
      }
      var note = el.querySelector("[data-past-note]");
      if (note) note.hidden = state !== "past";
    });

    /* banda „live" de pe prima pagină dispare singură după ultimul eveniment */
    document.querySelectorAll("[data-live-strip]").forEach(function (strip) {
      var remaining = 0;
      strip.querySelectorAll("[data-event-date]").forEach(function (item) {
        var past = item.getAttribute("data-state") === "past";
        item.hidden = past;
        if (!past) remaining += 1;
      });
      strip.hidden = remaining === 0;
    });
  })();
})();
