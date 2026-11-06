# Instrumente (nu fac parte din site-ul public)

## Pagina de presă (`presa.html`) — actualizare din dosarul CCSS

Pagina „Ardealul în presă” se actualizează direct din dosarul de presă CCSS
(https://casastudentilorsibiu.ro/noutati/ccss-in-presa/), fără export PDF.
Același flux ca pe microbis.ro. Scriptul: `presa_din_ccss.py`.

- `presa_fise.json` — sursa de adevăr: toate fișele din pagină. Fișele existente nu se rescriu.
- Intră doar fișele cu subiectele din `SUBIECTE_PAGINA` (Ansamblul „Ardealul”, Festivalul „Tradiții”, Joc și Tradiție).
  Fișele care pomenesc Ardealul, dar au alt subiect, apar în raport la „de verificat” și nu se adaugă automat.
- Se regenerează doar secțiunile `div.press-year`; graficul pe ani și numărul de apariții le calculează `assets/js/main.js`.

Pași, din rădăcina depozitului:

1. `python3 _instrumente/presa_din_ccss.py noi` — fișele noi → `presa_noi.json`.
2. `python3 _instrumente/presa_din_ccss.py aplica` — adaugă fișele și regenerează pagina.
3. Commit + push. Workflow-ul `.github/workflows/presa-imagini.yml` descarcă imaginile lipsă
   (`presa_din_ccss.py imagini`) și face singur un commit cu ele. Până atunci fișa apare cu caseta colorată.

Alte comenzi: `init` (o singură dată, deja rulat: `presa.html` → `presa_fise.json`), `pagini` (doar regenerare).
Site-ul CCSS răspunde uneori cu pagina anti-bot „One moment, please…”: se reîncearcă după 1–2 minute.
Dacă descărcarea nu merge, datele se pot salva manual și date scriptului cu `--sursa pagina.html --sursa rest.json`.
Necesită Pillow (`pip install pillow`).
