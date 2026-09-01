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
    if (header) header.style.boxShadow = y > 8 ? "0 6px 20px rgba(0,0,0,0.25)" : "none";
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
})();
