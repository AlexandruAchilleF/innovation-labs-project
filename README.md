# SunProof — Prosumer & Grid Intelligence Engine

> **Un singur adevăr despre energia ta, care îți aparține.**  
> Proiect dezvoltat pentru **Innovation Labs 2026 — Challenge 1:** *„One view of the energy a prosumer produces, consumes and stores.”*

---

## Problema Reală: Ce se întâmplă când panourile și bateria ta tac?

În România (august 2026), peste **25.000 de prosumatori cu baterii** și sute de mii de posesori de fotovoltaice își văd energia fragmentată pe 4 ecrane separate: aplicația invertorului, aplicația bateriei, contorul inteligent și factura lunară. Nimeni nu le pune cap la cap.

Din interviurile noastre cu prosumatori, instalatori și dispecerate O&M, am identificat **3 găuri negre financiare invizibile**:

1. **Supratensiunea de la prânz (253 V):** Rețelele rurale și periurbane de joasă tensiune sunt saturate. La prânz (11:00–15:00), când producția solară este maximă, tensiunea depășește pragul legal EN 50549-1 de **253 V**, iar invertoarele se decuplează automat. Prosumatorul crede că „s-a înnorat”, iar furnizorul trimite echipe de intervenție în teren doar ca să constate că instalația este impecabilă (**450 RON irosiți pe fiecare deplasare inutilă**).
2. **Baterii blocate din montaj:** Peste 60% dintre baterii rămân setate la o rezervă de siguranță de **80% SoC** (setarea din fabrică), deși proprietarul a cerut rezervă de 20%. Bateria refuză să se încarce la prânz și nu livrează nimic în **vârful de seară OPCOM PZU (19:00–22:00)**, când energia este cu până la 60% mai scumpă. Pierderea: peste **1.000 RON/an per gospodărie**.
3. **Facturi decontate eronat (Legea 160/2026):** Compensarea cantitativă 1:1 între producție, import (1.8.0) și export (2.8.0) conține frecvent discrepanțe neobservate de clienți sau cantități injectate nedecontate.

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
                               │   MOTOARELE DETERMINISTE SUNPROOF     │
                               │   (Fizică pură, Legea 160/2026)        │
                               └────────────────────┬───────────────────┘
                                                    │
            ┌───────────────────────────────────────┼───────────────────────────────────────┐
            ▼                                       ▼                                       ▼
   REȚEAUA E DE VINĂ?                      BATERIA FACE CE VREI?                   FACTURA E CORECTĂ?
 Supratensiune pe post confirmată       Intenție (20%) vs. Setare (80%).        Compensare 1:1 calculată
 de vecini -> Dosar PDF generat         Arbitraj PZU seară vs. prânz            față de contor -> Bani
 oficial către Distribuitor.            calculat instant.                       recuperați.
```

---

## Ce rezolvă aplicația (Triaj în 3 secunde)

| Caz Detectat | Cauza Fizică | Ce face SunProof | Impact Financiar |
|---|---|---|---|
| **Supratensiune Rețea** | Tensiunea trece de 253V la contor ȘI vecinii se opresc simultan | Emite instant **Dosarul Tehnic PDF** pentru Distribuitor (DEO, Rețele Electrice etc.) | **Economie de 450 RON** (fără deplasare inutilă de echipă O&M) |
| **Cablu Intern Prost** | Tensiune normală la contor, dar salt > 8V pe cablul casei | Semnalează **cablu subdimensionat** către instalator | Evită incendiile sau degradarea premature a invertorului |
| **Defect Echipament** | Tensiune rețea normală, dar producție prăbușită vs. PVGIS | Deschide tichet direct la **tehnician pe Telegram** | Timp de remediere redus de la 3 săptămâni la 24h |
| **Baterie Blocată** | Rezervă 80% când proprietarul a cerut 20% | Arată **arbitrajul PZU pierdut** și oferă buton de optimizare | **+1.054 RON/lună** pe eșantionul demonstrativ |
| **Eroare Factură** | Discrepanță între curba 2.8.0 și regularizarea furnizorului | Evidențiază kWh injectați nedecontați | Protecție financiară automată conform Legii 160/2026 |

---

## Validare pe Date & Cifre de Impact

Eficiența algoritmilor noștri este dovedită prin evaluarea automată pe **toate cele 81 de gospodării din flotă** (5 povești principale validate manual + 76 generate pe 8 topologii de joasă tensiune):

* **100.0% Acuratețe de Clasificare** Rețea vs. Local/Echipament la date de 1 minut.
* **98.8% Acuratețe la Citire la 5 Minute:** Funcționează impecabil doar din API-urile cloud ale producătorilor (Huawei, Fronius, Deye, SolarEdge, Victron), **fără montaj de senzori hardware**.
* **0 Alarme False pe Case Sănătoase (0.0%):** Nicio sesizare inutilă trimisă când rețeaua sau instalația este în parametri normali (Volt-Watt).
* **6.750 RON/lună economisiți** pe o singură flotă de 81 de case doar prin eliminarea deplasărilor inutile de intervenție (15 cazuri de supratensiune rețea rezolvate prin dosar).
* **5,66 Milioane EUR/an recuperați** prin deblocarea rezervelor de baterie, extrapolat la 25.000 de prosumatori cu stocare.

---

## Arhitectură & Garanția Anti-Halucinație

1. **Motoare Deterministe (Zero decizii AI):** Detecția de anomalii, calculul pierderilor și responsabilitatea juridică sunt calculate 100% determinist prin legile fizicii și formule matematice pure.
2. **Guardrail Numeric Binar:** Modelele LLM (Claude) redactează textele explicative în limba română, dar fiecare cifră, procent sau sumă în RON este verificată automat. Dacă AI-ul generează **măcar un singur număr** neacoperit de faptele calculate, textul este respins instantaneu și înlocuit cu șablonul matematic garantat.
3. **GDPR by Design:** Vecinii sunt folosiți ca martori anonimizați de tensiune. Niciun prosumator nu vede datele private sau curba de consum a vecinului; sistemul calculează doar indici agregați de simultaneitate pe post.

---

## Tech Stack

* **Backend Engine:** Python 3.12+, FastAPI, Uvicorn (cache thread-safe în memorie, răspuns < 5ms), Pydantic v2, FPDF2 (generare PDF securizat latin-1), HTTPX (Telegram bot), Pytest (**892 teste automate, 100% green**).
* **Frontend Web:** React 19, TanStack Start / Router, Tailwind CSS, Lucide React, Recharts, Vite. Interfață responsive cu mod live și fallback automat de simulare offline.

---

## Cum rulezi aplicația

### Lansare automată (Recomandat pentru Demo)
O singură comandă pornește backend-ul FastAPI (:8000), pre-încălzește cache-ul în 3 secunde și deschide Noul Panou de Control React (:3000):
```bash
./scripts/run_demo.sh
```

### Rulare manuală

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
# 892 teste backend automate (100% passed)
.venv/bin/pytest -q

# Raportul complet de acuratețe pe 81 de scenarii (GOAL.md #4)
.venv/bin/python scripts/evaluate_proof.py

# Teste frontend
cd frontend && npm test
```

---

## Concluzie pentru Hackathon

SunProof transformă o problemă opacă de mii de euro într-o decizie clară în 3 secunde:  
**Rețeaua e de vină?** Ai dosarul PDF gata de trimis distribuitorului.  
**Instalația ta e defectă?** Tehnicianul a primit deja alerta exactă pe Telegram.  
**Bateria e blocată?** O deblochezi cu un click și începi să câștigi la vârful de seară.
