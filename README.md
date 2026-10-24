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
             ┌───────────────────────────────┼───────────────────────────┐
             ▼                               ▼                           ▼
   Dosar de sesizare (PDF)        Tichete O&M + Telegram         Raport baterie
   fapte din cod, text LLM        ordonate după lei pierduți     (doar cu acord)
             │
             ▼
   Interfață Streamlit: Prosumator · O&M · Copilot AI (răspunde apelând unelte)
```

LLM-ul nu ia decizii. Detecția și calculele sunt deterministe, iar LLM-ul doar redactează și explică. Orice cifră din textul lui e verificată în cod.

## Tehnologii

Python 3.12, pandas, numpy, SQLite, Streamlit + pydeck, matplotlib, fpdf2, httpx, Anthropic API, pytest.

## Structura

```
sunproof/      logica: config, profiles, feeder (simulator), events (detector), store (SQLite),
               dossier (PDF), om (tichete, Telegram), battery, reconcile, consent, copilot, evaluate, llm
ui/app.py      Streamlit: modurile Prosumator și O&M + panoul demo
scripts/       download_data.sh (date PVGIS)
data/raw/      date descărcate (nu se pun în git)
tests/         pytest, câte un fișier per modul
```

## Cum rulezi

```bash
pip install -e ".[dev]"
pytest -q                      # toate testele
streamlit run ui/app.py        # interfața
bash scripts/download_data.sh  # date PVGIS (are nevoie de internet)
```

Variabilele de mediu sunt în `.env.example`. Nu pune chei în git.

## Status

🚧 În lucru la hackathon (24–25 octombrie 2026).

- [ ] Simulatorul străzii (tensiune, opriri, volt-watt, baterie)
- [ ] Detectarea și clasificarea evenimentelor: rețea vs. echipament
- [ ] Dosarul de sesizare (PDF)
- [ ] Verificarea bateriei
- [ ] Tichete O&M și alerte Telegram
- [ ] Interfața: Prosumator și O&M
- [ ] Reconcilierea invertor–contor–factură
- [ ] „Cine vede ce”
- [ ] Copilotul AI

## Ce urmează după hackathon

- Conectori reali: Huawei FusionSolar Northbound, Fronius Solar API, SunSpec Modbus
- Importul curbei de sarcină din portalurile distribuitorilor
- Hărți agregate de supratensiune pentru distribuitori
