# SunProof — Diagnostic pentru furnizori și prosumatori

> **Aflați de ce s-a oprit invertorul înainte să trimiteți echipa.**
> Proiect pentru **Innovation Labs 2026 · AI Validation Bootcamp, Challenge 1**: *„One view of the energy a prosumer produces, consumes and stores.”*
> Echipa: **Alex & David**.

[![Demo live](https://img.shields.io/badge/Demo%20live-innovation--labs--project.vercel.app-000000?style=for-the-badge&logo=vercel)](https://innovation-labs-project.vercel.app)
[![Challenge Brief](https://img.shields.io/badge/Innovation%20Labs-2026%20Challenge%201-FF6B00?style=for-the-badge)](https://docs.google.com/document/d/1IPJvOmaBwrPZeOkEAt2mUe2IOyT_wOXSl8bA7UVBSBA/edit?tab=t.0)
[![Pytest](https://img.shields.io/badge/Pytest-900%20passed-30D158?style=for-the-badge&logo=pytest)](#teste-și-reproducerea-evaluării)

SunProof citește datele invertorului și ale contorului inteligent și răspunde la trei întrebări pentru fiecare instalație de prosumator:

1. **Rețea sau instalație?** Invertorul s-a oprit din cauza supratensiunii din rețea (peste 253 V) sau din cauza instalației din casă?
2. **Bateria e blocată seara?** Setarea reală din invertor corespunde cu ce a vrut proprietarul, și cât costă diferența în vârful de seară?
3. **Factura e corectă?** Invertorul, contorul și factura se potrivesc conform Legii 160/2026?

Motoarele deterministe stabilesc verdictul. Textul doar explică cifrele deja calculate.

---

## Livrabile pentru juriu

Toate se află în [`deliverables/`](deliverables/):

| Fișier | Conținut |
|---|---|
| [`01_Primary_Hypothesis.pdf`](deliverables/01_Primary_Hypothesis.pdf) | Ipoteza principală (furnizorul plătește, prosumatorul are acces gratuit), sub-ipotezele H1–H3 testate în prototip, ce nu construim |
| [`02_Interview_Questions_and_Raw_Quotes.pdf`](deliverables/02_Interview_Questions_and_Raw_Quotes.pdf) | Ghidul de interviu și citatele exacte ale interlocutorilor |
| [`03_Pitch_Deck.pdf`](deliverables/03_Pitch_Deck.pdf) | Prezentarea pentru juriu (10 diapozitive, 16:9) |
| [`04_Pitch_2_Minute_2_Persoane.pdf`](deliverables/04_Pitch_2_Minute_2_Persoane.pdf) | Textul pitch-ului, diapozitiv cu diapozitiv, împărțit pe doi vorbitori ([sursa `.md`](deliverables/04_Pitch_2_Minute_2_Persoane.md)) |
| [`demo-sunproof.mp4`](deliverables/demo-sunproof.mp4) | Video demo (~60 s, 1080p): landing → hartă și portofoliu → analiză detaliată și simulare → aplicația prosumatorului |

---

## Demo live

**https://innovation-labs-project.vercel.app** (frontend React + API FastAPI, același deployment)

| Pagina | Pentru cine | Ce arată |
|---|---|---|
| `/` | toți | Prezentarea produsului |
| `/harta` | furnizor | Harta rețelei de joasă tensiune: posturi de transformare, congestie, opriri simultane, simulator „ce-ar fi dacă” |
| `/triaj` | furnizor / O&M | Portofoliul de instalații, verdictele pe rețea, baterie și factură, dosarul PDF pentru distribuitor, tichete pentru tehnician |
| `/prosumator` | prosumator | Aplicația clientului: ce s-a întâmplat, de ce și ce urmează |

Cazul din pitch: **Andrei, Dumbrăvița** (`RO-TM-001`). 6 din 11 invertoare de pe același post se opresc în același minut, la 257 V.

---

## Problema

În România sunt **385.791 de prosumatori, iar 151.040 (≈39%) au baterie** (ANRE, 31 august 2026).

- **Supratensiune în orele de vârf ale producției solare.** Peste 253 V (EN 50549-1), invertoarele se deconectează automat ([Știrile PRO TV, 17.04.2026](https://stirileprotv.ro/stiri/pro-verde/panouri-fotovoltaice-oprite-automat-de-ce-prosumatorii-din-romania-pierd-energie-in-orele-de-varf.html); APCE). Instalatorul spune că e rețeaua, distribuitorul spune că e invertorul, iar clientul sună la furnizor.
- **Baterii care nu livrează seara.** Rezerva setată de instalator poate diferi de ce a cerut proprietarul (de exemplu 80% în loc de 20%). Seara, energia pe piața spot a ajuns în vara 2026 la un raport de aproximativ 8:1 față de amiază ([Puterea.ro](https://www.puterea.ro/cel-mai-scump-kilowatt-e-cel-pe-care-nu-l-poti-muta/)).
- **Facturi greu de verificat.** Compensarea cantitativă 1:1 din Legea 160/2026, între import (1.8.0) și export (2.8.0), poate produce diferențe între invertor, contor și factură.

Dovezile din interviuri și din surse publice sunt în [livrabilul 02](deliverables/02_Interview_Questions_and_Raw_Quotes.pdf) și în [sinteza dovezilor](docs/interviews/2026-10-24-sinteza-dovezi-interviuri.md).

---

## Cum funcționează: „vecinii sunt senzorul”

Fără hardware suplimentar și fără parola invertorului. SunProof compară telemetria casei cu cea a **vecinilor anonimizați de pe același post de transformare**.

```
  Invertor (cloud, 1–5 min)      Contor inteligent (15 min)      Preț PZU orar
             │                              │                          │
             └──────────────────────────────┼──────────────────────────┘
                                            ▼
                         ┌──────────────────────────────────────┐
                         │   MOTOARE DETERMINISTE (sunproof/    │
                         │   engine): fizică + reguli explicite │
                         └──────────────────┬───────────────────┘
          ┌─────────────────────────────────┼─────────────────────────────────┐
          ▼                                 ▼                                 ▼
  REȚEA SAU INSTALAȚIE?            BATERIA E BLOCATĂ?                FACTURA E CORECTĂ?
  Opriri simultane la vecini       Intenția proprietarului vs.       Invertor vs. contor vs.
  → dosar PDF pentru distribuitor  setarea reală → pierderea în lei  factură → diferențe în kWh/lei
  Doar la tine → tichet Telegram
  pentru tehnician
```

| Caz detectat | Semnătura fizică | Ce face SunProof |
|---|---|---|
| **Supratensiune rețea** | Peste 253 V la contor și opriri simultane la vecinii de pe același post | Dosar tehnic PDF pentru distribuitor |
| **Cablu AC intern subdimensionat** | Tensiune normală la contor, dar creștere mare pe cablul dintre invertor și tablou | Trimite problema la instalator, nu la distribuitor |
| **Prag de declanșare greșit în invertor** | Invertorul se oprește sub 253 V, vecinii produc normal | Indică setarea de corectat |
| **Defect echipament / string / offline** | Rețea normală, dar producție mult sub cea așteptată | Tichet pentru tehnician pe Telegram |
| **Baterie blocată** | Rezervă SoC sau mod de lucru diferit de intenția proprietarului | Pierderea din vârful de seară și setarea de corectat |
| **Eroare de factură** | Index de export lipsă/estimat, tarif greșit, diferență față de contor | kWh și lei de corectat, conform Legii 160/2026 |

---

## Dovada (pe simulare)

> **Important:** rezultatele sunt obținute pe **date simulate**, nu pe instalații reale. Simulatorul, scenariile și răspunsurile corecte (`get_ground_truth`) sunt construite de echipă. Ele arată că logica motoarelor e corectă pe fizica modelată, nu acuratețe în teren. Următorul pas este un pilot pe 50–100 de locuințe.

Evaluare pe **81 de instalații simulate** (5 povești verificate manual + 76 generate, în 8 cartiere de joasă tensiune). [Raport complet](docs/pitch/2026-10-24-dovada-evaluare-81-scenarii.md).

| Metrică | Date la 1 minut | Date la 5 minute (cloud) |
|---|---:|---:|
| Rețea vs. instalație locală | **81/81** | **80/81** |
| Alarme false pe instalații fără defect | **0/60** | **0/60** |
| Verdict baterie | **81/81** | **81/81** |
| Verdict factură | **81/81** | **81/81** |

Pe eșantion: **15 cazuri de rețea** × ~450 lei pe deplasare (estimare de validat) = **6.750 lei/lună** deplasări evitate. **7 baterii blocate** = **982,08 lei/lună** pierduți în vârful de seară. **5 facturi greșite** = **1.408,42 lei** de corectat.

---

## Date folosite și limitele lor

Nu există un set public de date la nivel de stradă din România cu tensiunea pe faze și opririle simultane ale vecinilor ([analiza surselor](docs/research/2026-10-24-surse-date.md)). De aceea, telemetria este generată de un **simulator fizic determinist** al rețelei de joasă tensiune: posturi 20/0,4 kV, cabluri de aluminiu cu impedanțe reale, curgere de putere cuplată pe faze, praguri EN 50549-1 / EN 50160 ([`sunproof/grid.py`](sunproof/grid.py)).

> **Ce înseamnă „inspirat din”:** niciun set de date recomandat în Challenge Brief (PVGIS, OPCOM, StoreNet, Open Power System Data) nu este descărcat sau încărcat în cod. Curbele de producție, consum și preț sunt formule și constante scrise de echipă, care imită forma acestor surse. Înlocuirea lor cu date reale este pasul următor.

| Sursă | Cum o folosim |
|---|---|
| **PVGIS** (JRC) | Forma curbei de producție pentru o zi senină de august în România, cu orientare S/E/V și decalaj pe longitudine ([`clear_sky_pv_kw`](sunproof/grid.py#L117)). Curba este o formulă analitică (sinus), inspirată din profilele PVGIS, nu încărcată din PVGIS. |
| **OPCOM PZU** | 24 de prețuri orare scrise manual pentru o zi tipică de august (amiază ~85–135 RON/MWh, seară ~940–1.120 RON/MWh), folosite la calculul pierderii din bateriile blocate ([`opcom_and_physics.py`](sunproof/data/opcom_and_physics.py#L35)). Nu provin dintr-un export OPCOM. |
| **StoreNet / OPSD** | Inspirație pentru forma consumului casnic (vârfuri dimineața, la prânz și seara, AC, mașină electrică). Consumul este o sumă de curbe gaussiene ([`household_load_kw`](sunproof/grid.py#L189)), nu este potrivit pe datele StoreNet sau OPSD. |
| **ANRE și Legea 160/2026** | Regulile de compensare cantitativă 1:1 din verificarea facturii ([`engine/billing.py`](sunproof/engine/billing.py)). Toate instalațiile simulate sunt casnice, sub vechiul plafon de 200 kW, deci noul plafon de 400 kW nu este modelat. Cifrele ANRE (385.791 prosumatori, 151.040 cu baterie) apar doar în pitch, ca context de piață. |
| **Mixul de invertoare** | Flota simulată respectă aproximativ proporția din brief: 57 din 81 de invertoare sunt chinezești (Huawei, Deye, Growatt), dintre care 41 Huawei. |
| **Coduri de eroare ale invertoarelor** | Huawei `2034`, Fronius `102`, Growatt `300`, folosite în telemetria simulată ([`grid.py`](sunproof/grid.py#L86)). Integrarea reală cu Huawei FusionSolar și Fronius Solar API este planificată pentru pilot. |
| **OpenStreetMap** | Geometria străzilor pentru hartă ([`scripts/import_map_geometry.py`](scripts/import_map_geometry.py)). Topologia rețelei este sintetică, nu a distribuitorului. |

---

## Arhitectură

1. **Motoare deterministe** ([`sunproof/engine/`](sunproof/engine)): `grid_fault.py` (rețea vs. instalație), `battery.py` (intenție vs. setare, pierderea în vârful de seară), `billing.py` (reconciliere invertor–contor–factură), `pipeline.py` (analiza completă a unei instalații). Aceleași date de intrare dau mereu același verdict.
2. **Texte explicative**: implicit din **șabloane deterministe** în limba română ([`text_templates.py`](sunproof/text_templates.py)). Opțional (`SUNPROOF_USE_LLM=1`), textul poate fi formulat de Claude, dar trece printr-un **guardrail numeric** ([`explainer.py`](sunproof/explainer.py)). Dacă textul conține o cifră care nu există în rezultatele motoarelor, este respins și se folosește șablonul. Demo-ul live rulează pe șabloane.
3. **Acțiuni**: dosar PDF pentru distribuitor ([`pdf_dossier.py`](sunproof/pdf_dossier.py)), alertă Telegram pentru tehnician ([`telegram_bot.py`](sunproof/telegram_bot.py), simulată dacă nu există token), tichete O&M ([`tickets.py`](sunproof/tickets.py)).
4. **Confidențialitate**: vecinii sunt folosiți doar ca martori anonimi de tensiune. Nimeni nu vede consumul vecinului; se calculează doar indici agregați de simultaneitate pe post. Doar citire: SunProof nu modifică setările invertorului.

### Tech stack

- **Backend:** Python ≥ 3.10 (dezvoltat pe 3.14), FastAPI, Pydantic v2, fpdf2, httpx, pytest (900 de teste)
- **Frontend:** React 19, TanStack Start / Router, Tailwind CSS 4, MapLibre GL, Recharts, Vite, Vitest
- **Deployment:** Vercel (serviciu `web` pentru frontend + serviciu `api` pentru FastAPI, vezi [`vercel.json`](vercel.json))

### Structura repo-ului

```
sunproof/            backend: modele, simulator, motoare, texte, PDF, Telegram, API
  engine/            motoarele deterministe (rețea, baterie, factură, pipeline)
  scenarios.py       singurul punct de acces la cele 81 de scenarii
  app.py             rutele FastAPI (/api/portfolio, /api/households/..., /api/neighborhoods/...)
frontend/            aplicația React (landing, /harta, /triaj, /prosumator)
tests/               teste pytest, validate față de get_ground_truth pe toate cele 81 de scenarii
scripts/             run_demo.sh, evaluate_proof.py, import_map_geometry.py
docs/                ipoteză, interviuri, cercetare, materiale de pitch, raportul de evaluare
deliverables/        documentele pentru juriu
```

---

## Cum rulezi local

```bash
# backend (o singură dată)
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
# frontend (o singură dată)
cd frontend && npm install && cd ..

# pornește API-ul (:8000) și frontend-ul (:3000)
./scripts/run_demo.sh
```

Sau separat:

```bash
.venv/bin/uvicorn sunproof.app:app --reload --port 8000
cd frontend && npm run dev
```

Variabile opționale (vezi [`.env.example`](.env.example)): `SUNPROOF_USE_LLM=1` + `ANTHROPIC_API_KEY` pentru texte formulate de LLM; `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` pentru alerte reale. Fără ele, aplicația folosește șabloane și alerte simulate.

## Teste și reproducerea evaluării

```bash
.venv/bin/python -m pytest -q --tb=short      # 900 de teste backend
.venv/bin/python scripts/evaluate_proof.py    # regenerează raportul pe 81 de scenarii
cd frontend && npm test                       # teste frontend (Vitest)
```

`evaluate_proof.py` rulează motoarele pe toate cele 81 de scenarii, la 1 și la 5 minute, compară rezultatele cu `get_ground_truth()` și rescrie [`docs/pitch/2026-10-24-dovada-evaluare-81-scenarii.md`](docs/pitch/2026-10-24-dovada-evaluare-81-scenarii.md).

---

## Ce urmează

- **În 3 luni:** integrare de citire cu Huawei FusionSolar și Fronius și un test pe 50–100 de locuințe din același cartier.
- **Ce căutăm:** un furnizor de energie sau o firmă de mentenanță pentru pilot.
- **Ce măsurăm în pilot:** corectitudinea diagnosticului față de verificarea tehnicianului, alarmele false, timpul de rezolvare și costul intervențiilor.
- **Model propus (de validat):** furnizorul plătește un abonament pe instalație monitorizată, prosumatorul are acces gratuit.
