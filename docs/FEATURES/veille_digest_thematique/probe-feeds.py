#!/usr/bin/env python3
"""Sonde d'ingerabilite des flux — chantier « digest thematique » (ADR-0022 §2).

Stdlib uniquement, ne lit pas la base, ne modifie rien. Reproduit ce que fait le
workflow n8n : GET du flux, parse XML, comptage d'items, date du plus recent.
Un flux qui repond 200 mais dont le dernier item date de 2024 est inutilisable
(filtre de recence de 7 jours en aval).

  python3 docs/FEATURES/veille_digest_thematique/probe-feeds.py

LIMITE CONNUE : urllib ne suit pas les 308 et le parseur XML est strict. Un
"ERR"/"XML illisible" doit etre reverifie au `curl -L` avant d'etre declare mort
(c'est ainsi que Sequoia et Lex Fridman ont ete rattrapes le 2026-09-06).
"""
import concurrent.futures as cf
import datetime as dt
import re
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36"
# Verification TLS laissee INTACTE, volontairement : cette sonde decide quelles
# sources KREDO va ingerer. Un certificat invalide est un resultat de la sonde
# (la source est ecartee), pas une gene a contourner.

TECH = [
    ("OpenAI — News", "https://openai.com/news/rss.xml"),
    ("Anthropic — News", "https://www.anthropic.com/news/rss.xml"),
    ("Google — AI", "https://blog.google/technology/ai/rss/"),
    ("Microsoft — AI Blog", "https://blogs.microsoft.com/ai/feed/"),
    ("NVIDIA — AI Blog", "https://developer.nvidia.com/blog/tag/artificial-intelligence/feed/"),
    ("AWS — ML Blog", "https://aws.amazon.com/blogs/machine-learning/feed/"),
    ("Hugging Face — Blog", "https://huggingface.co/blog/feed.xml"),
    ("Google DeepMind — Blog", "https://deepmind.google/discover/blog/rss.xml"),
    ("MIT News — AI", "https://news.mit.edu/rss/topic/artificial-intelligence2"),
    ("IBM Think — AI", "https://www.ibm.com/think/topics/artificial-intelligence/rss"),
    ("Meta AI — Blog", "https://ai.meta.com/blog/rss/"),
]
BIZ = [
    ("Sequoia Capital", "https://www.sequoiacap.com/feed"),
    ("a16z", "https://a16z.com/feed"),
    ("Superhuman AI", "https://www.superhuman.ai/rss.xml"),
    ("The Batch", "https://www.deeplearning.ai/the-batch/feed/"),
    ("WIRED — AI", "https://www.wired.com/feed/tag/ai/latest/rss"),
    ("One Useful Thing", "https://www.oneusefulthing.org/feed"),
    ("Finxter", "https://blog.finxter.com/feed/"),
    ("Ben's Bites", "https://www.bensbites.co/rss.xml"),
    ("Not A Bot", "https://www.notabot.tech/rss.xml"),
    ("The Neuron", "https://www.theneurondaily.com/rss.xml"),
    ("Lex Fridman Podcast", "https://lexfridman.com/feed/podcast/"),
]
# Presse pro sectorielle des 2 referentiels joints — collectee en site: via Google News RSS
GNEWS = [
    ("L'Embarqué (electronique)", "lembarque.com"),
    ("ViPress (electronique)", "vipress.net"),
    ("L'Usine Nouvelle", "usinenouvelle.com"),
    ("FdEF", "filiere-electronique.fr"),
    ("FIEEC", "fieec.fr"),
    ("L'Echo Touristique", "echotouristique.com"),
    ("TourMag", "tourmag.com"),
    ("SETO", "seto.to"),
    ("ADN Tourisme", "adn-tourisme.fr"),
]

def gnews(domain):
    return f"https://news.google.com/rss/search?q=site:{domain}&hl=fr&gl=FR&ceid=FR:fr"

DATE_FMTS = ["%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S %Z", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ"]

def parse_date(s):
    if not s:
        return None
    s = s.strip()
    for f in DATE_FMTS:
        try:
            d = dt.datetime.strptime(s, f)
            return d.replace(tzinfo=None)
        except ValueError:
            pass
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m:
        return dt.datetime(int(m[1]), int(m[2]), int(m[3]))
    return None

def probe(name, url):
    res = {"name": name, "url": url, "status": None, "items": 0, "latest": None, "note": ""}
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml,application/xml,text/xml,*/*"})
        with urllib.request.urlopen(req, timeout=25) as r:
            res["status"] = r.status
            body = r.read(2_000_000)
    except urllib.error.HTTPError as e:
        res["status"] = e.code
        res["note"] = "HTTP error"
        return res
    except Exception as e:
        res["status"] = "ERR"
        res["note"] = type(e).__name__ + ": " + str(e)[:70]
        return res
    try:
        root = ET.fromstring(body)
    except ET.ParseError as e:
        res["note"] = "XML illisible: " + str(e)[:60]
        return res
    items = root.findall(".//item") or root.findall(".//{http://www.w3.org/2005/Atom}entry")
    res["items"] = len(items)
    dates = []
    for it in items:
        for tag in ("pubDate", "{http://purl.org/dc/elements/1.1/}date",
                    "{http://www.w3.org/2005/Atom}updated", "{http://www.w3.org/2005/Atom}published"):
            el = it.find(tag)
            if el is not None and el.text:
                d = parse_date(el.text)
                if d:
                    dates.append(d)
                break
    if dates:
        res["latest"] = max(dates)
    return res

def run(label, entries):
    print("\n" + "=" * 88)
    print(label)
    print("=" * 88)
    print(f"{'Source':<30}{'HTTP':>6}{'items':>7}{'dernier':>13}{'age j':>7}  note")
    print("-" * 88)
    now = dt.datetime.utcnow()
    rows = []
    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        futs = {ex.submit(probe, n, u): n for n, u in entries}
        out = {}
        for f in cf.as_completed(futs):
            r = f.result()
            out[r["name"]] = r
    for n, _ in entries:
        r = out[n]
        age = f"{(now - r['latest']).days}" if r["latest"] else "-"
        last = r["latest"].strftime("%Y-%m-%d") if r["latest"] else "-"
        print(f"{n[:29]:<30}{str(r['status']):>6}{r['items']:>7}{last:>13}{age:>7}  {r['note'][:28]}")
        rows.append(r)
    ok = [r for r in rows if r["items"] > 0]
    fresh = [r for r in ok if r["latest"] and (now - r["latest"]).days <= 30]
    print("-" * 88)
    print(f"→ {len(ok)}/{len(entries)} flux parsables · {len(fresh)}/{len(entries)} avec un item de moins de 30 jours")
    return rows

run("FOLIO AI TECH — 11 flux declares actifs", TECH)
run("FOLIO AI BUSINESS — 11 flux declares actifs", BIZ)
run("PRESSE PRO SECTORIELLE — via Google News RSS site:<domaine>", [(n, gnews(d)) for n, d in GNEWS])
