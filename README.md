# SunProof — Prosumer & Grid Intelligence Engine

> **Un singur adevăr despre energia ta, apărat legal și verificabil.**  
> Proiect dezvoltat pentru **Innovation Labs 2026 — Challenge 1:** *„One view of the energy a prosumer produces, consumes and stores.”*

[![Innovation Labs 2026](https://img.shields.io/badge/Innovation%20Labs-2026%20Challenge%201-FF6B00?style=for-the-badge&logo=rocket)](https://docs.google.com/document/d/1IPJvOmaBwrPZeOkEAt2mUe2IOyT_wOXSl8bA7UVBSBA/edit?tab=t.0)
[![Dataset & APIs](https://img.shields.io/badge/Resurse%20Oficiale-PVGIS%20%7C%20OPCOM%20%7C%20StoreNet%20%7C%20OPSD-0A84FF?style=for-the-badge)](docs/research/2026-10-24-surse-date.md)
[![Tests Passing](https://img.shields.io/badge/Pytest-900%20passed%20(100%25)-30D158?style=for-the-badge&logo=pytest)](docs/pitch/2026-10-24-dovada-evaluare-81-scenarii.md)

---

## Cum am integrat Resursele Oficiale din Challenge Brief

Pentru a răspunde cerinței juriului de a **depăși un simplu apel LLM** și de a **folosi date reale de piață**, SunProof reunește și calibrează exact resursele recomandate în [Challenge Brief](https://docs.google.com/document/d/1IPJvOmaBwrPZeOkEAt2mUe2IOyT_wOXSl8bA7UVBSBA/edit?tab=t.0):

| Resursă din Brief | Sursa & Format | Rolul în SunProof | Unde se regăsește în Cod |
|---|---|---|---|
| **PVGIS** *(Comisia Europeană / JRC)* | API public (`seriescalc`) & modele orare de radiație solară per kWp | Calibrarea etalonului de producție fotovoltaică curată (`pvgis_expected_kw`) pe coordonatele reale ale României (București, Cluj, Timișoara, Brașov, Constanța, Iași), cu corecție de orientare (S/E/V) și decalaj longitudinal. | [`sunproof/grid.py`](sunproof/grid.py#L115) |
| **OPCOM PZU** *(Bursa de Energie din România)* | Prețuri orare Piața pentru Ziua Următoare (PZU) | Curba de preț 24h pentru august 2026 (scăderea în orele de vârf ale producției solare la **85–135 RON/MWh** vs. vârful de seară la **940–1.120 RON/MWh**). Folosită pentru calculul pierderilor financiare reale din bateriile blocate și arbitrajul de seară. | [`sunproof/data/opcom_and_physics.py`](sunproof/data/opcom_and_physics.py#L32)<br>[`sunproof/engine/arbitrage.py`](sunproof/engine/arbitrage.py) |
| **StoreNet Dataset** *(Irlanda, 2020 / Scientific Data)* | 20 case cu PV + baterii 10 kWh, telemetrie la 1 minut | Modelarea comportamentului realist al bateriei (BMS, randament 96%, curbe de încărcare/descărcare) și tipare dinamice de consum (electrocasnice, AC, vârf de consum). | [`sunproof/grid.py`](sunproof/grid.py#L170)<br>[`docs/research/2026-10-24-surse-date.md`](docs/research/2026-10-24-surse-date.md) |
| **Open Power System Data (OPSD)** | Date reale de consum rezidențial și profiluri la 15 minute | Validarea curbei de sarcină a contorului inteligent (seria 15-min specifică distribuitorilor) și corelarea cu producția proprie. | [`sunproof/data/archetypes.py`](sunproof/data/archetypes.py) |
| **Interfețe Invertoare Reale** *(Huawei, Fronius, Deye, SMA)* | FusionSolar Northbound API, Fronius Solar API, Modbus SunSpec | Preluarea codurilor oficiale de eroare la supratensiune (Huawei `2034`, Fronius `102`, Growatt `300`) și a telemetriei disponibile fără a cere parole instalator. | [`sunproof/grid.py`](sunproof/grid.py#L85)<br>[`sunproof/api_support.py`](sunproof/api_support.py) |
| **Statistici ANRE & Legea 160/2026** | Date oficiale ANRE (385.791 prosumatori, 151.040 baterii) | Motorul de verificare a facturilor: compensare cantitativă 1:1, decontare activă 0.68 RON/kWh și tarife reglementate de rețea specifice distribuitorilor (0.56–0.62 RON/kWh). | [`sunproof/engine/billing.py`](sunproof/engine/billing.py)<br>[`sunproof/data/archetypes.py`](sunproof/data/archetypes.py) |

> **De ce avem și un Digital Twin fizic?**  
> Așa cum arată analiza noastră din [docs/research/2026-10-24-surse-date.md](docs/research/2026-10-24-surse-date.md), **nu există un set public de date la nivel de stradă din România** care să măsoare tensiunea pe faze și deconectările simultane ale vecinilor. De aceea, am creat un simulator fizic determinist (EN 50549-1, EN 50160, impedanță cabluri `TYIR 3x50/3x70 Al`, posturi trafo 20/0.4 kV) calibrat matematic pe aceste date reale.

---

## Problema Reală: Ce se întâmplă când panourile și bateria ta tac?

În România sunt **385.791 de prosumatori, iar 151.040 (≈39%) au baterie** (ANRE, 31 august 2026). Între iunie și august 2026 au apărut aproximativ **24.000 de baterii noi** (127.084 → 151.040). Cu toate acestea, clienții își văd energia fragmentată pe 4 ecrane separate: aplicația invertorului, aplicația bateriei, contorul inteligent și factura lunară.

Din două conversații (un prosumator și un furnizor) și din cazuri publice documentate (presă, forumuri de prosumatori, verificări ale distribuitorilor) am identificat **3 probleme**, pe care le detaliem în [sinteza dovezilor](docs/interviews/2026-10-24-sinteza-dovezi-interviuri.md):

1. **Supratensiunea din orele de vârf ale producției solare (253 V):** În rețelele de joasă tensiune cu mulți prosumatori, tensiunea poate depăși pragul de **253 V** (EN 50549-1), iar invertoarele se decuplează automat („Când tensiunea din rețea depășește 253 V, echipamentele prosumatorilor se opresc automat”, APCE). Prosumatorul nu știe dacă e vina rețelei sau a instalației, iar o echipă de intervenție poate fi trimisă degeaba (costul unei deplasări, estimat de noi la **~450 RON**, urmează să fie validat în pilot).
2. **Baterii care nu livrează seara:** Setările bateriei pot diferi de ce a cerut proprietarul (de exemplu, o rezervă de 80% în loc de 20%). Bateria se încarcă puțin în orele de vârf ale producției solare și nu livrează în **vârful de seară**, când energia pe piața spot a ajuns în vara lui 2026 la un raport seară/amiază de **~8:1** ([Puterea.ro](https://www.puterea.ro/cel-mai-scump-kilowatt-e-cel-pe-care-nu-l-poti-muta/)). Cât de răspândite sunt aceste setări greșite nu știm încă. Singurul indiciu public: Distribuție Energie Oltenia a găsit **276 din 460 de invertoare (60%)** fără protecțiile obligatorii ([HotNews](https://hotnews.ro/prosumatorii-sustin-ca-distribuitorii-de-energie-incearca-sa-le-controleze-productia-panourilor-solare-replica-unui-distribuitor-in-60-dintre-cazuri-instalatiile-prosumatorilor-nu-respecta-paramet-2075879)). Cifra privește protecțiile invertoarelor, nu setările bateriei.
3. **Facturi greu de verificat (Legea 160/2026):** Compensarea cantitativă 1:1 între import (1.8.0) și export (2.8.0) poate produce discrepanțe între invertor, contor și factură, pe care clientul nu are cum să le verifice singur.

---

## Soluția SunProof: „Vecinii sunt senzorul”

SunProof este un motor software independent de brand, **fără hardware suplimentar în tablou**, care compară telemetria casei cu cea a **vecinilor anonimizați de pe același transformator**.

```
    Invertor (Cloud API / Local)       Contor Inteligent (15 min)        Curba OPCOM PZU
                 │                                  │                           │
                 └──────────────────────────────────┼───────────────────────────┘
                                                    │
                                                    ▼
                               ┌────────────────────────────────────────┐
                               │   MOTOARELE DETERMINISTE SUNPROOF      │
                               │   (Fizică pură, Legea 160/2026)        │
                               └────────────────────┬───────────────────┘
                                                    │
            ┌───────────────────────────────────────┼───────────────────────────────────────┐
            ▼                                       ▼                                       ▼
   REȚEAUA E DE VINĂ?                      BATERIA FACE CE VREI?                   FACTURA E CORECTĂ?
 Supratensiune pe post confirmată        Intenție (20%) vs. Setare (80%).        Compensare 1:1 calculată
 de vecini -> Dosar PDF generat          Arbitraj PZU seară vs. amiază            față de contor -> Diferențe
 pentru Distribuitor.                    calculat instant.                       semnalate.
```

---

## Triaj în 3 Secunde: Ce rezolvă aplicația

| Caz Detectat | Cauza Fizică | Ce face SunProof | Valoare (de validat în pilot) |
|---|---|---|---|
| **Supratensiune Rețea** | Tensiunea trece de 253V la contor ȘI vecinii se opresc simultan | Generează **Dosarul Tehnic PDF** pentru Distribuitor (DEO, Rețele Electrice, DEER) | Evită o deplasare inutilă a echipei O&M (~450 RON, estimare) |
| **Cablu Intern Subdimensionat** | Tensiune normală la contor, dar salt > 8V pe cablul intern AC | Semnalează **căderea internă de tensiune** către instalator | Problema ajunge direct la instalator, nu la distribuitor |
| **Defect Echipament** | Tensiune rețea normală, dar producție prăbușită vs. PVGIS | Deschide tichet către **tehnician pe Telegram** | Tichetul pleacă imediat, cu datele atașate |
| **Baterie Blocată** | Rezervă 80% când proprietarul a cerut 20% | Arată **arbitrajul PZU pierdut** și setarea de corectat | În simulare: **982 RON/lună** pe cele 7 baterii blocate din eșantion |
| **Eroare Factură** | Discrepanță între curba 2.8.0 și regularizarea furnizorului | Evidențiază kWh injectați nedecontați | Disputa se rezolvă cu cifrele din contor (Legea 160/2026) |

---

## Validare în Simulare

> **Important:** toate rezultatele de mai jos sunt obținute pe **date simulate**, nu pe instalații reale. Simulatorul, scenariile și răspunsurile corecte (`get_ground_truth`) sunt construite de echipă, deci rezultatele arată că logica motoarelor e consistentă cu fizica modelată, nu acuratețe demonstrată în teren. Următorul pas este un pilot pe 50–100 de locuințe.

Evaluare automată pe **81 de instalații simulate** (5 povești principale validate manual + 76 generate pe 8 topologii de joasă tensiune), [raport complet aici](docs/pitch/2026-10-24-dovada-evaluare-81-scenarii.md):

* **81/81 (100%)** clasificare corectă Rețea vs. Local/Echipament la date de 1 minut.
* **80/81 (98,8%)** la date de 5 minute, rezoluția tipică a API-urilor cloud ale producătorilor (Huawei, Fronius, Deye, SolarEdge, Victron).
* **0/60 alarme false** pe instalațiile simulate fără defecte.
* **15 cazuri de supratensiune de rețea** în eșantion: la ~450 RON pe deplasare (estimare), ar însemna **~6.750 RON** deplasări evitate.

---

## Arhitectură & Garanția Anti-Halucinație

1. **Motoare Deterministe (Zero decizii AI pe cifre):** Detecția de anomalii, calculul pierderilor și stabilirea părții responsabile sunt calculate determinist, din formule fizice și reguli explicite.
2. **Guardrail Numeric Binar:** Modelele LLM redactează explicațiile în limba română, dar fiecare cifră, procent sau sumă în RON este verificată automat. Dacă textul conține **măcar un număr** care nu provine din motoare, este respins și înlocuit cu un șablon determinist. Aplicația funcționează complet și fără LLM.
3. **GDPR by Design:** Vecinii sunt folosiți exclusiv ca martori anonimizați de tensiune. Niciun prosumator nu vede datele private sau curba de consum a vecinului; sistemul calculează doar indici agregați de simultaneitate pe post.

---

## Tech Stack

* **Backend Engine:** Python 3.12+, FastAPI, Uvicorn (cache thread-safe în memorie), Pydantic v2, FPDF2 (generare PDF securizat latin-1), HTTPX (Telegram bot), Pytest (**900 teste automate**).
* **Frontend Web:** React 19, TanStack Start / Router, Tailwind CSS, Lucide React, Recharts, Vite. Interfață responsive cu mod live, hartă stradală 2D interactivă și suport complet offline.

---

## Cum rulezi aplicația

### Lansare automată (Recomandat pentru Demo & Juriu)
O singură comandă pornește backend-ul FastAPI (:8000), pre-încălzește cache-ul în 3 secunde și deschide Noul Panou de Control React (:3000):
```bash
./scripts/run_demo.sh
```

### Rulare manuală & Teste

1. **Backend FastAPI:**
```bash
.venv/bin/uvicorn sunproof.app:app --reload --port 8000
```

2. **Frontend React 19:**
```bash
cd frontend && npm install && npm run dev
```

3. **Verificare Teste & Raport de Evaluare:**
```bash
# 900 teste backend automate (100% passed)
.venv/bin/pytest -q

# Raportul de acuratețe pe 81 de scenarii: docs/pitch/2026-10-24-dovada-evaluare-81-scenarii.md

# Teste frontend
cd frontend && npm test
```

---

## Concluzie pentru Juriul Innovation Labs

SunProof răspunde celor trei cerințe din Challenge Brief:
1. **Validate before you build:** Problema opririlor din orele de vârf ale producției solare a fost semnalată spontan în ambele conversații pe care le-am avut (un prosumator și un furnizor) și este confirmată de presă și de APCE. Frecvența problemelor de baterie și factură rămâne de validat în pilot.
2. **Go beyond one LLM call:** Unim 4 fluxuri distincte de date (Invertor + Contor Inteligent + OPCOM PZU + Vecini de pe post) într-un motor determinist; LLM-ul doar explică cifrele, sub un guardrail numeric.
3. **Real data & physics:** Folosim PVGIS, OPCOM și StoreNet pentru a calibra un digital twin al rețelei de joasă tensiune din România. Rezultatele sunt obținute în simulare; validarea pe date reale e următorul pas.
