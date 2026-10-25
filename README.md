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

În România, piața prosumatorilor a depășit **4.280 MW instalați**, iar numărul bateriilor a crescut cu **24.000 în doar două luni** (ajungând la peste 151.000 de unități). Cu toate acestea, clienții își văd energia fragmentată pe 4 ecrane separate: aplicația invertorului, aplicația bateriei, contorul inteligent și factura lunară.

Din interviurile noastre cu prosumatori, instalatori și dispecerate O&M, am identificat **3 găuri negre financiare invizibile**:

1. **Supratensiunea din orele de vârf ale producției solare (253 V):** Rețelele rurale și periurbane de joasă tensiune sunt saturate. În orele de vârf ale producției solare (11:00–15:00), tensiunea depășește pragul legal EN 50549-1 de **253 V**, iar invertoarele se decuplează automat. Prosumatorul crede că „s-a înnorat”, iar furnizorul trimite echipe de intervenție în teren doar ca să constate că instalația din casă este impecabilă (**450 RON irosiți pe fiecare deplasare inutilă**).
2. **Baterii blocate din montaj:** Peste 60% dintre baterii rămân setate la o rezervă de siguranță de **80% SoC** (setarea din fabrică), deși proprietarul a cerut rezervă de 20%. Bateria refuză să se încarce în orele de vârf ale producției solare și nu livrează nimic în **vârful de seară OPCOM PZU (19:00–22:00)**, când energia este cu până la 60% mai scumpă. Pierderea: peste **1.000 RON/an per instalație**.
3. **Facturi decontate eronat (Legea 160/2026):** Compensarea cantitativă 1:1 între producție, import (1.8.0) și export (2.8.0) conține frecvent discrepanțe neobservate de clienți sau cantități injectate nedecontate de furnizor.

---

## Soluția SunProof: „Vecinii sunt senzorul”

SunProof este un motor software independent de brand, **100% fără hardware suplimentar în tablou**, care compară telemetria casei cu cea a **vecinilor anonimizați de pe același transformator**.

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
 de vecini -> Dosar PDF generat          Arbitraj PZU seară vs. amiază            față de contor -> Bani
 oficial către Distribuitor.             calculat instant.                       recuperați.
```

---

## Triaj în 3 Secunde: Ce rezolvă aplicația

| Caz Detectat | Cauza Fizică | Ce face SunProof | Impact Financiar |
|---|---|---|---|
| **Supratensiune Rețea** | Tensiunea trece de 253V la contor ȘI vecinii se opresc simultan | Emite instant **Dosarul Tehnic PDF** pentru Distribuitor (DEO, Rețele Electrice, DEER) | **Economie de 450 RON** (fără deplasare inutilă de echipă O&M) |
| **Cablu Intern Subdimensionat** | Tensiune normală la contor, dar salt > 8V pe cablul intern AC | Semnalează **cădere internă de tensiune** către instalator | Evită incendiile sau degradarea prematură a invertorului |
| **Defect Echipament** | Tensiune rețea normală, dar producție prăbușită vs. PVGIS | Deschide tichet direct la **tehnician pe Telegram** | Timp de remediere redus de la 3 săptămâni la 24h |
| **Baterie Blocată** | Rezervă 80% când proprietarul a cerut 20% | Arată **arbitrajul PZU pierdut** și oferă buton de remediere | **982 RON/lună** pe cele 7 baterii blocate din eșantion |
| **Eroare Factură** | Discrepanță între curba 2.8.0 și regularizarea furnizorului | Evidențiază kWh injectați nedecontați | Protecție financiară automată conform Legii 160/2026 |

---

## Validare pe Date & Cifre de Impact

Eficiența algoritmilor noștri este dovedită prin evaluarea automată pe **toate cele 81 de instalații din flotă** (5 povești principale validate manual + 76 generate pe 8 topologii de joasă tensiune):

* **100.0% Acuratețe de Clasificare** Rețea vs. Local/Echipament la date de 1 minut.
* **98.8% Acuratețe la Citire la 5 Minute:** Funcționează impecabil doar din API-urile cloud ale producătorilor (Huawei, Fronius, Deye, SolarEdge, Victron), **fără montaj de senzori hardware**.
* **0 Alarme False pe Case Sănătoase (0.0%):** Nicio sesizare inutilă trimisă când rețeaua sau instalația este în parametri normali (Volt-Watt).
* **6.750 RON/lună economisiți** pe o singură flotă de 81 de case doar prin eliminarea deplasărilor inutile de intervenție (15 cazuri de supratensiune rețea rezolvate prin dosar).
* **≈713.000 EUR/an recuperați** prin deblocarea rezervelor de baterie, extrapolat la 25.000 de prosumatori cu stocare.

---

## Arhitectură & Garanția Anti-Halucinație

1. **Motoare Deterministe (Zero decizii AI pe cifre):** Detecția de anomalii, calculul pierderilor și responsabilitatea juridică sunt calculate 100% determinist prin legile fizicii și formule matematice pure.
2. **Guardrail Numeric Binar:** Modelele LLM redactează explicațiile în limba română prietenoasă, dar fiecare cifră, procent sau sumă în RON este verificată automat. Dacă AI-ul generează **măcar un singur număr** neacoperit de faptele calculate, textul este respins instantaneu și înlocuit cu șablonul matematic garantat.
3. **GDPR by Design:** Vecinii sunt folosiți exclusiv ca martori anonimizați de tensiune. Niciun prosumator nu vede datele private sau curba de consum a vecinului; sistemul calculează doar indici agregați de simultaneitate pe post.

---

## Tech Stack

* **Backend Engine:** Python 3.12+, FastAPI, Uvicorn (cache thread-safe în memorie, răspuns < 5ms), Pydantic v2, FPDF2 (generare PDF securizat latin-1), HTTPX (Telegram bot), Pytest (**900 teste automate, 100% green**).
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

SunProof răspunde direct celor trei cerințe de aur din Challenge Brief:
1. **Validate before you build:** Punctele dureroase (450 RON drum O&M inutil, bateria blocată la 80%, dosar tehnic de rețea) au fost validate direct cu prosumatori și instalatori.
2. **Go beyond one LLM call:** Unim 4 fluxuri distincte de date (Invertor + Contor Inteligent + OPCOM PZU + Vecini de pe post) într-un motor determinist cu zero halucinații.
3. **Real data & physics:** Folosim PVGIS, OPCOM și StoreNet integrate într-un digital twin riguros pentru rețeaua de joasă tensiune din România.
