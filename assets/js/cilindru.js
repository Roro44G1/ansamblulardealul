/* =========================================================================
   ANSAMBLUL „ARDEALUL" — cilindru.js
   Galerie foto „cilindru": fotografiile stau pe un cilindru vertical care se
   rotește lent (același carusel ca pe casastudentilorsibiu.ro). Fețele laterale
   se întunecă, ca să se vadă rotunjimea. Se oprește la trecerea mouse-ului, se
   rotește prin tragere (mouse sau deget); clic / Enter = fotografia mare, cu
   navigare ‹ › și Esc. Fără dependențe externe.

   Marcaj (fără JS rămâne o grilă de miniaturi cu linkuri spre fotografiile mari):
     <div class="cilindru" data-cilindru>
       <ul class="cilindru__lista">
         <li><a href="mare.jpg"><img src="miniatura.jpg" alt="…" width="768" height="432" loading="lazy"></a></li>
         …
       </ul>
     </div>
   Rânduri: 1 până la 16 fotografii, apoi câte unul la fiecare 20 (minimum 2),
   ca cilindrul să aibă tot ~20 de fețe pe rând; se poate impune cu data-randuri="N".
   Viteza și tragerea se scalează cu numărul de fețe de pe un rând.
   ========================================================================= */
(function () {
  "use strict";

  var galerii = document.querySelectorAll("[data-cilindru]");
  if (!galerii.length) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- fereastra cu fotografia mare (una pentru toată pagina) ------------ */
  var lb = document.createElement("div");
  lb.className = "cilindru-lb";
  lb.hidden = true;
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.setAttribute("aria-label", "Fotografie mărită");
  lb.innerHTML =
    '<button type="button" class="cilindru-lb__x" aria-label="Închide">×</button>' +
    '<button type="button" class="cilindru-lb__p" aria-label="Fotografia anterioară">‹</button>' +
    '<figure class="cilindru-lb__fig"><img alt=""><figcaption class="cilindru-lb__nr"></figcaption></figure>' +
    '<button type="button" class="cilindru-lb__n" aria-label="Fotografia următoare">›</button>';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector("img");
  var lbNr = lb.querySelector(".cilindru-lb__nr");
  var lbList = [], lbK = 0, lbOrigine = null;

  function arata(i) {
    lbK = (i + lbList.length) % lbList.length;
    lbImg.src = lbList[lbK].full;
    lbImg.alt = lbList[lbK].alt;
    lbNr.textContent = (lbK + 1) + " / " + lbList.length;
  }
  function deschide(list, i, origine) {
    lbList = list;
    lbOrigine = origine || null;
    arata(i);
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    lb.querySelector(".cilindru-lb__x").focus();
  }
  function inchide() {
    lb.hidden = true;
    lbImg.removeAttribute("src");
    document.body.style.overflow = "";
    if (lbOrigine) lbOrigine.focus();
  }
  lb.querySelector(".cilindru-lb__x").addEventListener("click", inchide);
  lb.querySelector(".cilindru-lb__p").addEventListener("click", function (e) { e.stopPropagation(); arata(lbK - 1); });
  lb.querySelector(".cilindru-lb__n").addEventListener("click", function (e) { e.stopPropagation(); arata(lbK + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) inchide(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") inchide();
    if (e.key === "ArrowLeft") arata(lbK - 1);
    if (e.key === "ArrowRight") arata(lbK + 1);
  });

  /* --- fiecare galerie ---------------------------------------------------- */
  galerii.forEach(function (root) {
    var cyl = root.querySelector(".cilindru__lista");
    var linkuri = Array.prototype.slice.call(root.querySelectorAll(".cilindru__lista a[href]"));
    if (!cyl || !linkuri.length) return;

    var list = linkuri.map(function (a) {
      var img = a.querySelector("img");
      return { full: a.getAttribute("href"), alt: img ? img.alt : "" };
    });
    var n = linkuri.length;
    var rows = parseInt(root.getAttribute("data-randuri"), 10) ||
      (n <= 16 ? 1 : Math.max(2, Math.ceil(n / 20)));
    var m = Math.ceil(n / rows);
    var scara = Math.min(1, 20 / m);   // la 20 de fețe pe rând: exact ca pe CCSS

    var F = linkuri.map(function (a, k) {
      var li = a.parentNode;
      li.className = "cilindru__fata";
      li.style.setProperty("--k", k % m);
      li.style.setProperty("--row", Math.floor(k / m));
      a.setAttribute("draggable", "false");
      var img = a.querySelector("img");
      if (img) img.setAttribute("draggable", "false");
      return li;
    });
    root.style.setProperty("--m", m);
    root.style.setProperty("--rows", rows);
    root.classList.add("is-3d");
    var floor = document.createElement("div");
    floor.className = "cilindru__podea";
    floor.setAttribute("aria-hidden", "true");
    root.insertBefore(floor, cyl);

    var r = 0;
    function setR() {
      r = (cyl.offsetWidth / 2 + 5) / Math.tan(Math.PI / m);
      root.style.setProperty("--r", r + "px");
    }
    setR();
    window.addEventListener("resize", setR);

    var a = 0, v = reduce ? 0 : -0.12 * scara, paused = false, drag = null, moved = 0, vizibil = true, rulez = false;

    function deseneaza() {
      cyl.style.transform = "translateZ(" + (-r) + "px) rotateY(" + a + "deg)";
      F.forEach(function (f, k) {
        var t = ((k % m) * 360 / m + a) * Math.PI / 180;
        f.style.filter = "brightness(" + (0.25 + 0.75 * Math.max(0, Math.cos(t))) + ")";
      });
    }
    function tick() {
      if (!vizibil) { rulez = false; return; }
      if (!(paused || drag)) a += v;
      deseneaza();
      requestAnimationFrame(tick);
    }
    function porneste() { if (!rulez) { rulez = true; requestAnimationFrame(tick); } }
    deseneaza();

    // animația rulează doar cât galeria e pe ecran
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (intrari) {
        vizibil = intrari[0].isIntersecting;
        if (vizibil) porneste();
      }).observe(root);
    } else {
      porneste();
    }

    root.addEventListener("mouseenter", function () { paused = true; });
    root.addEventListener("mouseleave", function () { paused = false; });
    root.addEventListener("focusin", function () { paused = true; });
    root.addEventListener("focusout", function () { paused = false; });

    root.addEventListener("pointerdown", function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      drag = { x: e.clientX, a0: a };
      moved = 0;
      root.setPointerCapture(e.pointerId);
      porneste();
    });
    root.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var d = e.clientX - drag.x;
      moved = Math.max(moved, Math.abs(d));
      a = drag.a0 + d * 0.25 * scara;
    });
    root.addEventListener("pointerup", function (e) {
      if (!drag) return;
      root.releasePointerCapture(e.pointerId);
      if (moved < 6) {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        var li = el ? el.closest(".cilindru__fata") : null;
        var k = li ? F.indexOf(li) : -1;
        if (k >= 0) deschide(list, k, null);
      }
      drag = null;
    });
    root.addEventListener("pointercancel", function () { drag = null; });

    // linkurile nu mai duc la fișier; tastatura (Enter) deschide fotografia mare
    root.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest("a[href]") : null;
      if (!link || !root.contains(link)) return;
      e.preventDefault();
      if (e.detail === 0) {
        var k = linkuri.indexOf(link);
        if (k >= 0) deschide(list, k, link);
      }
    });
    // la focus cu Tab, cilindrul se rotește până la fotografia aleasă
    linkuri.forEach(function (link, k) {
      link.addEventListener("focus", function () {
        a = -((k % m) * 360 / m);
        deseneaza();
      });
    });
  });
})();
