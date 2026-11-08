# Instrumente (nu fac parte din site-ul public)

Actualizarea rulează automat săptămânal, ca sarcină programată Claude (ambele site-uri; vezi mai jos).

## Pagina de presă (`presa.html`) — actualizare din dosarul CCSS

Pagina „Ardealul în presă” se actualizează direct din dosarul de presă CCSS
(https://casastudentilorsibiu.ro/noutati/ccss-in-presa/), fără export PDF.
Același flux ca pe microbis.ro. Scriptul: `presa_din_ccss.py`.

- `presa_fise.json` — sursa de adevăr: toate fișele din pagină. Fișele existente nu se rescriu.
- Intră fișele cu subiectele din `SUBIECTE_PAGINA` (Ansamblul „Ardealul”, Spectacolul folcloric „Tradiții” — în fișele vechi „Festivalul „Tradiții”” —, Joc și Tradiție)
  și fișele cu alt subiect care pomenesc Ardealul în context de spectacol, concert, premii, festival sau turnee
  (regula din 7.11.2026, funcția `in_context`). Mențiunile din listele de finanțare („Finanțări pentru proiecte”)
  nu intră; apar doar în raport, la „de verificat”.
- Se regenerează doar secțiunile `div.press-year`; graficul pe ani și numărul de apariții le calculează `assets/js/main.js`.

Pași, din rădăcina depozitului:

1. `python3 _instrumente/presa_din_ccss.py noi` — fișele noi → `presa_noi.json`.
   Sau, cu o singură descărcare pentru ambele site-uri: `descarca /tmp/ccss`, apoi
   `noi --sursa /tmp/ccss/pagina.html --sursa /tmp/ccss/rest.json`.
2. `python3 _instrumente/presa_din_ccss.py aplica` — adaugă fișele și regenerează pagina.
3. Commit + push. Workflow-ul `.github/workflows/presa-imagini.yml` descarcă imaginile lipsă
   (`presa_din_ccss.py imagini`) și face singur un commit cu ele. Până atunci fișa apare cu caseta colorată.

Alte comenzi: `init` (o singură dată, deja rulat: `presa.html` → `presa_fise.json`), `pagini` (doar regenerare).
Site-ul CCSS răspunde uneori cu pagina anti-bot „One moment, please…”: se reîncearcă după 1–2 minute.
Dacă descărcarea nu merge, datele se pot salva manual și date scriptului cu `--sursa pagina.html --sursa rest.json`.
Necesită Pillow (`pip install pillow`).
