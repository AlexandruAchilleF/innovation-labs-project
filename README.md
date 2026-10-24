# SunProof

> **Un singur adevăr despre energia ta, care îți aparține.**

Proiect pentru **AI Validation Bootcamp — Challenge 1:** *„One view of the energy a prosumer produces, consumes and stores.”*

Prosumatorii își văd energia pe bucăți: aplicația invertorului, a bateriei, contorul și factura. Nimeni nu le pune cap la cap. În 2026, mii de invertoare se opresc la prânz din cauza supratensiunii din rețea, iar oamenii nici nu observă. Între timp, echipele de O&M află de defecte abia când clientul sună.

Aplicația răspunde la o singură întrebare: **panourile și bateria ta fac ce trebuie?** Iar dacă nu, spune de ce.

## Ce face

| Problema | Ce face aplicația |
|---|---|
| Invertorul se oprește la prânz din cauza supratensiunii | Detectează fiecare oprire și cauza ei (tensiune ≥ 253 V, codul de alarmă, vecini opriți în același minut) și generează **dosarul de sesizare** către distribuitor |
| Defectele de echipament se descoperă târziu | Compară fiecare casă cu vecinii de pe aceeași stradă, pentru că norii îi afectează pe toți la fel. Echipa O&M primește **alerta în aceeași zi**, iar tichetele sunt ordonate după lei pierduți |
| Bateria e setată greșit | Verifică dacă se încarcă la prânz, livrează seara în fereastra programului furnizorului și respectă rezerva. Arată **bonusul ratat** în lei |
| Invertorul, contorul și factura nu se potrivesc | Calculează consumul fără contor nou (producție + import − export) și semnalează energia injectată nedecontată |
| Accesul la date e controlat de alții | Prosumatorul decide **cine ce vede**: distribuitorul, O&M sau furnizorul. Fiecare acces rămâne într-un jurnal, iar nimeni nu primește parola invertorului |

**Rețea sau echipament?** Dacă mai multe case de pe aceeași stradă se opresc în același minut și tensiunea trece de prag, problema e la rețea. Dacă se oprește o singură casă, cu tensiune normală, e un defect de echipament.

## Pentru cine

- **Prosumatorul** își vede energia într-un singur loc, primește alerte și dosarul de sesizare gata de trimis.
- **Echipa O&M a furnizorului** vede o hartă a străzilor: mov pentru supratensiune, roșu pentru defect. Primește tichete doar pentru defectele reale, deci evită deplasările inutile.
- **Furnizorul** poate verifica dacă bateriile din programele cu bonus chiar livrează seara, cu acordul prosumatorului.

## Fără hardware

Aplicația doar citește datele pe care invertorul le are deja, din cloud-ul producătorului sau din API-ul local (Huawei FusionSolar, Fronius Solar API, SunSpec Modbus), plus curba de sarcină a distribuitorului. Nu controlează nimic și nu schimbă setările invertorului.

**La hackathon** nu avem acces la invertoare reale și nu există date publice de tensiune. Folosim un **simulator fizic al unei străzi de joasă tensiune**: tensiunea crește spre capătul cablului odată cu exportul, iar invertoarele se opresc peste prag. Producția vine din date reale [PVGIS](https://re.jrc.ec.europa.eu/pvg_tools/en/), pentru București.

## Arhitectură

```
Date (simulator / API invertor / curba distribuitorului)
        │
        ▼
   SQLite ──► Detector determinist ──► evenimente: rețea │ echipament │ baterie
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             ▼                               ▼                               ▼
   Dosar de sesizare (PDF)        Tichete O&M + Telegram         Raport baterie
   fapte din cod, text LLM        ordonate după lei pierduți     (doar cu acord)
             │
             ▼
   Interfață TanStack Start / React (frontend/) + FastAPI backend (sunproof/app.py)
```

LLM-ul nu ia decizii. Detecția și calculele sunt deterministe, iar LLM-ul doar redactează și explică. Orice cifră din textul lui e verificată în cod.

## Tehnologii

- **Backend**: Python 3.12+, FastAPI, uvicorn, pydantic, fpdf2, httpx, pytest
- **Frontend**: TanStack Start, React 19, Tailwind CSS, Lucide icons, Recharts, Vite

## Structura

```
sunproof/      nucleul de business: modele, motoare deterministe, scenarii, explainer, PDF dossier, Telegram bot, FastAPI app
frontend/      noua interfață React 19 / TanStack Start (Triaj O&M, Rețea ce-ar fi dacă, Prosumator)
static/        interfață standalone MVP (HTML/CSS/JS)
tests/         teste automate pytest (823 teste deterministe, 100% green)
scripts/       lansator demo integrat, generator grafice pitch și evaluare 81/81 scenarii
```

## Cum rulezi

### 0. Demo complet dintr-o singură comandă (Recomandat)
```bash
./scripts/run_demo.sh
```
Pornește FastAPI backend (:8000), pre-încălzește cache-ul celor 81 gospodării și deschide interfața React 19 (:3000).

### 1. Backend (FastAPI manual)
```bash
pip install -e ".[dev]"
uvicorn sunproof.app:app --reload --port 8000
```

### 2. Frontend (React 19 / Vite manual)
```bash
cd frontend
npm install
npm run dev
```

### 3. Teste & Evaluare
```bash
# Teste backend (Python - 823 teste deterministe, 100% passed)
pytest -q

# Evaluare automată pe toate cele 81 de scenarii (Dovada GOAL.md #4)
python scripts/evaluate_proof.py

# Teste frontend (Vitest)
cd frontend && npm test
```

Variabilele de mediu sunt în `.env.example`. Nu pune chei în git.

## Status

✅ Prototip 100% funcțional și evaluat (Hackathon 24–25 octombrie 2026).

- [x] Modele modulare & scenarii (81 gospodării, 5 povești flagship verificate manual)
- [x] Motoare deterministe (rețea JT, baterie, facturare Legea 160/2026)
- [x] Evaluare 81/81 scenarii: 100% acuratețe la 1 min și 5 min, 0 alarme false pe case sănătoase
- [x] Generare dosar sesizare distribuitor (PDF transliterat ASCII, core fonts)
- [x] Simulator baterie & optimizare prag descărcare (arbitraj PZU seară vs. prânz)
- [x] Tichete O&M, verificare 48h și alerte Telegram simulate/reale
- [x] Explainer numeric cu guardrails stricte anti-halucinații
- [x] API HTTP complet cu cache thread-safe (FastAPI)
- [x] Noua interfață web React 19 / TanStack (Triaj O&M, Rețea JT, Prosumator, Audit GDPR)
- [x] 4 grafice SVG de pitch și dovadă evaluare
