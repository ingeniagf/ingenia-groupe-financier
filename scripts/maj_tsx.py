#!/usr/bin/env python3
"""Met à jour assets/data/tsx.json : historique mensuel de l'indice composé S&P/TSX (^GSPTSE) depuis 1985.

Exécuté automatiquement par GitHub Actions (.github/workflows/maj-tsx.yml), chaque jour ouvrable.
Source : Yahoo Finance. En cas d'erreur ou de données incomplètes, le fichier existant est conservé.
"""
import json, os, sys, time, urllib.request
from datetime import datetime, timezone

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FICHIER = os.path.join(RACINE, "assets", "data", "tsx.json")
URL = ("https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPTSE"
       "?period1=473385600&period2={fin}&interval=1mo&events=history")

def telecharger():
    req = urllib.request.Request(URL.format(fin=int(time.time()) + 86400),
                                 headers={"User-Agent": "Mozilla/5.0 (ingeniagf.ca; mise a jour TSX)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def construire(donnees):
    res = donnees["chart"]["result"][0]
    mois = {}
    for ts, c in zip(res["timestamp"], res["indicators"]["quote"][0]["close"]):
        if c is None:
            continue
        d = datetime.fromtimestamp(ts, tz=timezone.utc)
        mois[f"{d.year:04d}-{d.month:02d}"] = round(c, 2)   # la dernière valeur du mois l'emporte
    cles = sorted(mois)
    if not cles or cles[0] != "1985-01":
        raise ValueError(f"Début inattendu : {cles[:1]}")
    # Vérifie la continuité (aucun mois manquant)
    a, m = 1985, 1
    for k in cles:
        if k != f"{a:04d}-{m:02d}":
            raise ValueError(f"Mois manquant avant {k}")
        m += 1
        if m > 12: a, m = a + 1, 1
    meta = res.get("meta", {})
    prix, quand = meta.get("regularMarketPrice"), meta.get("regularMarketTime")
    derniere = {"date": datetime.fromtimestamp(quand, tz=timezone.utc).strftime("%Y-%m-%d"), "valeur": round(prix, 2)} if prix and quand else None
    if derniere:
        mois[cles[-1]] = derniere["valeur"]
    vals = [mois[k] for k in cles]
    if len(vals) < 480 or min(vals) <= 0:
        raise ValueError("Série trop courte ou invalide")
    return {"indice": "S&P/TSX Composite (^GSPTSE)", "source": "Yahoo Finance", "debut": "1985-01",
            "maj": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "derniere": derniere, "clotures": vals}

def main():
    try:
        nouveau = construire(telecharger())
    except Exception as e:
        print(f"Mise à jour annulée, fichier conservé : {e}")
        return 0
    ancien = None
    if os.path.exists(FICHIER):
        with open(FICHIER, encoding="utf-8") as f:
            ancien = json.load(f)
    if ancien and ancien.get("clotures") == nouveau["clotures"] and ancien.get("derniere") == nouveau["derniere"]:
        print("Aucun changement.")
        return 0
    os.makedirs(os.path.dirname(FICHIER), exist_ok=True)
    with open(FICHIER, "w", encoding="utf-8") as f:
        json.dump(nouveau, f, ensure_ascii=False, separators=(",", ":"))
    print(f"tsx.json mis à jour : {len(nouveau['clotures'])} mois, dernière valeur {nouveau['derniere']}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
