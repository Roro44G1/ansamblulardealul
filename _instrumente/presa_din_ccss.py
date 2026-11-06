#!/usr/bin/env python3
"""
Actualizează pagina „Ardealul în presă” (presa.html) direct din datele dosarului de presă
CCS Sibiu (https://casastudentilorsibiu.ro/noutati/ccss-in-presa/), fără export PDF.
Același flux ca la microbis.ro (_instrumente/presa_din_ccss.py din depozitul microbis).

Ce intră: fișele din dosarul CCSS cu subiectele din SUBIECTE_PAGINA (exact selecția din
PDF-urile filtrate folosite inițial). Fișele cu „Ardealul” în text, dar cu alt subiect,
apar doar în raport, la „de verificat”.

Sursa de adevăr a paginii e  _instrumente/presa_fise.json  (toate fișele din pagină).
Fișele existente NU se rescriu: se adaugă doar cele noi. Se regenerează doar dosarul
de presă (secțiunile div.press-year); restul paginii rămâne neatins. Graficul pe ani
și numerele le calculează assets/js/main.js din secțiuni.

Comenzi:
  python3 presa_din_ccss.py init        o singură dată: presa.html → presa_fise.json
  python3 presa_din_ccss.py noi [--sursa pagina.html --sursa rest.json]
                                        fișele noi din dosarul CCSS → presa_noi.json
  python3 presa_din_ccss.py aplica      adaugă fișele din presa_noi.json, descarcă imaginile
                                        (dacă rețeaua permite) și regenerează pagina
  python3 presa_din_ccss.py imagini     descarcă imaginile lipsă și regenerează (GitHub Actions)
  python3 presa_din_ccss.py pagini      doar regenerează pagina

Necesită Pillow pentru imagini (pip install pillow). Nu se urcă pe serverul web.
"""

import collections
import datetime
import hashlib
import html
import io
import json
import re
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

AICI = Path(__file__).resolve().parent
SITE = AICI.parent
PAGINA = SITE / "presa.html"
FOLDER_IMG = SITE / "assets" / "img" / "presa"
CALE_IMG = "assets/img/presa"
FISE = AICI / "presa_fise.json"
NOI = AICI / "presa_noi.json"

SUBIECTE_PAGINA = {"Ansamblul „Ardealul”", "Festivalul „Tradiții”", "Joc și Tradiție"}
CUVINTE_CHEIE = re.compile(r"ardealul|joc\s+si\s+traditie|festivalul\s+.?traditii")  # doar pentru „de verificat”

URL_CCSS = "https://casastudentilorsibiu.ro/noutati/ccss-in-presa/"
URL_REST = ("https://casastudentilorsibiu.ro/wp-json/wp/v2/posts?categories=114&per_page=100"
            "&_fields=id,title,content&page={}")
TIPURI = {"comunicat": "Comunicat de presă", "eveniment": "Eveniment"}
UA = "Mozilla/5.0 (compatible; ardealul-presa/1.0)"

INCEPUT = '        <div class="press-year"'
SFARSIT = '\n      <p class="press-note">'


# --------------------------------------------------------------------------
# utilitare
# --------------------------------------------------------------------------

def fara_diacritice(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def cheie(s):
    return re.sub(r"[^a-z0-9]+", "", fara_diacritice(s))


def url_norm(u):
    u = u.strip().lower()
    u = re.sub(r"^https?://", "", u)
    u = re.sub(r"^(www|m|amp)\.", "", u).split("#")[0]
    baza, _, q = u.partition("?")
    q = "&".join(sorted(k for k in q.split("&") if k and not re.match(r"(utm_|fbclid=|gclid=)", k)))
    baza = re.sub(r"/amp/?$", "", baza).rstrip("/")
    return baza + ("?" + q if q else "")


def citeste(cale, implicit):
    return json.loads(cale.read_text(encoding="utf-8")) if cale.exists() else implicit


def scrie(cale, date):
    cale.write_text(json.dumps(date, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8")


# --------------------------------------------------------------------------
# init: fișele din presa.html actual
# --------------------------------------------------------------------------

def init():
    u = html.unescape
    fise = []
    for bloc in re.findall(r'<article class="press-item">(.*?)</article>', PAGINA.read_text(encoding="utf-8"), re.S):
        g = lambda rx: re.search(rx, bloc, re.S)  # noqa: E731
        iso = g(r'<time datetime="([\d-]+)">')[1]
        img = g(r'<img src="([^"]+)"')
        var = g(r'press-item__media--none press-item__media--([a-z])"')
        nume = (g(r'press-item__outlet">(.*?)</span>') or g(r'press-item__name">(.*?)</span>'))[1]
        a, l, z = iso.split("-")
        fise.append({
            "iso": iso, "data": f"{z}.{l}.{a}",
            "autor": u(g(r'</time> · (.*?)</p>')[1]),
            "titlu": u(g(r'press-item__title">(.*?)</h4>')[1]),
            "subiect": u(g(r'press-item__subject"><strong>Subiect:</strong> (.*?)</p>')[1]),
            "rezumat": u(g(r'press-item__text">(.*?)</p>')[1]),
            "nume": u(nume),
            "link": u(g(r'press-item__link" href="([^"]+)"')[1]),
            "cale_img": img[1] if img else None,
            "varianta": var[1] if var else "",
            "img_url": "",
        })
    scrie(FISE, {"fise": fise})
    print(f"presa_fise.json: {len(fise)} fișe citite din presa.html")


# --------------------------------------------------------------------------
# datele CCSS
# --------------------------------------------------------------------------

def _din_pagina(text):
    m = re.search(r'<script type="application/json" class="pr-data">(.*?)</script>', text, re.S)
    if not m:
        sys.exit("Nu găsesc datele pr-data (posibil pagina anti-bot „One moment, please…”). Reîncearcă peste 1–2 minute.")
    return json.loads(m.group(1))


def _din_rest(posts):
    u = html.unescape
    out = []
    for post in posts:
        c = post["content"]["rendered"]
        m = re.search(r'<div class="ccss-presa-fisa"([^>]*)>', c)
        if not m:
            continue
        at = {k: u(v) for k, v in re.findall(r'data-([a-z-]+)="([^"]*)"', m.group(1))}
        rez = re.search(r"<p>(.*?)</p>", c, re.S)
        out.append({
            "d": at.get("date", ""), "p": at.get("pub", ""), "a": at.get("author", ""),
            "t": u(post["title"]["rendered"]), "u": at.get("url", ""), "i": at.get("img", ""),
            "y": at.get("type", "articol"), "tp": at.get("topic-ro", ""),
            "s": u(re.sub(r"<[^>]+>", "", rez.group(1))).strip() if rez else "",
        })
    return out


def date_ccss(surse=()):
    """Toate fișele dosarului CCSS: JSON-ul pr-data din pagină + articolele categoriei 114."""
    fise, rest = [], []
    if surse:
        for cale in surse:
            text = Path(cale).read_text(encoding="utf-8")
            if text.lstrip().startswith("["):
                rest += json.loads(text)
            else:
                fise += _din_pagina(text)
    else:
        fise = _din_pagina(_get(URL_CCSS))
        pag = 1
        while True:
            time.sleep(20)  # site-ul CCSS răspunde cu anti-bot la cereri dese
            lot = json.loads(_get(URL_REST.format(pag)))
            rest += lot
            if len(lot) < 100:
                break
            pag += 1
    fise += _din_rest(rest)
    unice, vazute = [], set()
    for x in fise:
        k = url_norm(x.get("u", ""))
        if x.get("u") and x.get("d") and k not in vazute:
            vazute.add(k)
            unice.append(x)
    return unice


def fisa_din_ccss(x, nume_cunoscute):
    nume = x["p"].split(" · ")[0].split(" (")[0]
    nume = nume_cunoscute.get(cheie(nume), nume)  # aceeași grafie ca în pagină (de ex. „Agerpres”)
    autor = "Autor: " + (x.get("a") or "nesemnat")
    if x.get("y") in TIPURI:
        autor += " · " + TIPURI[x["y"]]
    a, l, z = x["d"].split("-")
    return {
        "iso": x["d"], "data": f"{z}.{l}.{a}", "autor": autor,
        "titlu": x["t"], "subiect": x.get("tp", ""), "rezumat": x.get("s", ""),
        "nume": nume, "link": x["u"], "cale_img": None,
        "varianta": "abcd"[int(hashlib.md5(x["u"].encode()).hexdigest(), 16) % 4],
        "img_url": x.get("i") or "",
    }


def noi(surse=()):
    stare = citeste(FISE, None)
    if stare is None:
        sys.exit("Lipsește presa_fise.json: rulează întâi  python3 presa_din_ccss.py init")
    existente = {url_norm(f["link"]) for f in stare["fise"]}
    nume_cunoscute = {cheie(f["nume"]): f["nume"] for f in stare["fise"]}
    toate = date_ccss(surse)
    gasite, de_verificat = [], []
    for x in toate:
        if url_norm(x["u"]) in existente:
            continue
        if x.get("tp") in SUBIECTE_PAGINA:
            gasite.append(fisa_din_ccss(x, nume_cunoscute))
        elif CUVINTE_CHEIE.search(fara_diacritice(x["t"] + " " + x.get("s", ""))):
            de_verificat.append(x)
    gasite.sort(key=lambda f: f["iso"], reverse=True)
    scrie(NOI, gasite)
    print(f"Fișe în dosarul CCSS: {len(toate)} · NOI: {len(gasite)} · de verificat (alt subiect): {len(de_verificat)}")
    for f in gasite:
        print(f"  + {f['iso']} · {f['nume']} · {f['titlu'][:80]}\n    {f['link']}")
    for x in de_verificat:
        print(f"  ? {x['d']} · {x['p']} · [{x.get('tp', '')}] {x['t'][:70]}")
    return gasite


# --------------------------------------------------------------------------
# imagini
# --------------------------------------------------------------------------

def descarca_imagine(f):
    """Salvează imaginea fișei (400×250, decupată centrat). Întoarce True dacă a reușit."""
    if not f.get("img_url") or f.get("cale_img"):
        return False
    try:
        from PIL import Image
        req = urllib.request.Request(f["img_url"], headers={"User-Agent": UA})
        im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=30).read())).convert("RGB")
        r = max(400 / im.width, 250 / im.height)
        im = im.resize((max(400, round(im.width * r)), max(250, round(im.height * r))), Image.LANCZOS)
        st, sus = (im.width - 400) // 2, (im.height - 250) // 2
        im = im.crop((st, sus, st + 400, sus + 250))
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=82, optimize=True, progressive=True)
        date = buf.getvalue()
    except Exception as e:  # rețea blocată, imagine lipsă etc. → fișa rămâne fără imagine
        print(f"  ! imagine nedescărcată ({type(e).__name__}): {f['img_url'][:90]}")
        return False
    nume = hashlib.md5(date).hexdigest()[:12] + ".jpg"
    FOLDER_IMG.mkdir(parents=True, exist_ok=True)
    (FOLDER_IMG / nume).write_bytes(date)
    f["cale_img"] = f"{CALE_IMG}/{nume}"
    return True


# --------------------------------------------------------------------------
# pagina
# --------------------------------------------------------------------------

def card_html(f):
    e = html.escape
    if f["cale_img"]:
        media = (f'<div class="press-item__media"><img src="{f["cale_img"]}" alt="" width="400" height="250" '
                 f'loading="lazy" decoding="async"><span class="press-item__outlet">{e(f["nume"])}</span></div>')
    else:
        media = (f'<div class="press-item__media press-item__media--none press-item__media--{f["varianta"] or "a"}">'
                 f'<span class="press-item__name">{e(f["nume"])}</span><span class="press-item__sub">{e(f["subiect"])}</span></div>')
    return f"""            <article class="press-item">
              {media}
              <div class="press-item__body">
                <p class="press-item__meta"><time datetime="{f['iso']}">{f['data']}</time> · {e(f['autor'])}</p>
                <h4 class="press-item__title">{e(f['titlu'])}</h4>
                <p class="press-item__subject"><strong>Subiect:</strong> {e(f['subiect'])}</p>
                <p class="press-item__text">{e(f['rezumat'])}</p>
                <a class="press-item__link" href="{html.escape(f['link'])}" target="_blank" rel="noopener">Citește articolul în {e(f['nume'])}<span class="sr-only"> (se deschide într-o filă nouă)</span> »</a>
              </div>
            </article>"""


def pagini(stare):
    pe_ani = collections.OrderedDict()
    for f in sorted(stare["fise"], key=lambda f: f["iso"], reverse=True):  # stabil: la zi egală, ordinea existentă
        pe_ani.setdefault(f["iso"][:4], []).append(f)
    sectiuni = []
    for an, fise in pe_ani.items():
        carduri = "\n".join(card_html(f) for f in fise)
        sectiuni.append(f"""        <div class="press-year" data-press-year="{an}" id="an-{an}">
          <h3 class="press-year__title">{an}</h3>
          <div class="press-grid">
{carduri}
          </div>
        </div>""")
    text = PAGINA.read_text(encoding="utf-8")
    i, j = text.index(INCEPUT), text.index(SFARSIT)
    text = text[:i] + "\n".join(sectiuni) + "\n" + text[j:]
    PAGINA.write_text(text, encoding="utf-8")
    print(f"Pagina scrisă: {PAGINA} ({len(stare['fise'])} fișe, {len(pe_ani)} ani)")


def aplica():
    stare = citeste(FISE, None)
    noi_ = citeste(NOI, [])
    if not noi_:
        print("Nimic de adăugat (presa_noi.json e gol).")
        return
    for f in noi_:
        descarca_imagine(f)
    stare["fise"] = noi_ + stare["fise"]
    scrie(FISE, stare)
    scrie(NOI, [])
    pagini(stare)
    print(f"Adăugate: {len(noi_)} · total în pagină: {len(stare['fise'])}")


def imagini():
    stare = citeste(FISE, None)
    n = sum(descarca_imagine(f) for f in stare["fise"])
    print(f"Imagini descărcate: {n}")
    if n:
        scrie(FISE, stare)
        pagini(stare)


def main():
    a = sys.argv[1:]
    cmd = a[0] if a else ""
    if cmd == "init":
        init()
    elif cmd == "noi":
        noi([a[i + 1] for i, v in enumerate(a) if v == "--sursa"])
    elif cmd == "aplica":
        aplica()
    elif cmd == "imagini":
        imagini()
    elif cmd == "pagini":
        pagini(citeste(FISE, None))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
