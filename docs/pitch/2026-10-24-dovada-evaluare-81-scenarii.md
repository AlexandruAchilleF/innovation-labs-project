# Dovada (GOAL.md #4) — Evaluare pe cele 81 de scenarii SunProof

Acest raport este generat automat de `scripts/evaluate_proof.py` prin rularea motoarelor deterministe
pe toate cele **81 de instalații** (5 cazuri principale + 76 generate) și compararea cu `get_ground_truth()`.

## 1. Sumar Executiv (Pentru Pitch)

| Indicator | Rezoluție 1 minut | Rezoluție 5 minute (Cloud Polling) |
|---|---:|---:|
| **Acuratețe clasificare Rețea vs. Local / Echipament** | **81/81 (100.0%)** | **80/81 (98.8%)** |
| **Alarme false pe case sănătoase (`NONE`)** | **0/60 (0.0%)** | **0/60 (0.0%)** |
| **Acuratețe audit baterie & PZU** | **81/81 (100.0%)** | **81/81 (100.0%)** |
| **Acuratețe reconciliere factură (Legea 160/2026)** | **81/81 (100.0%)** | **81/81 (100.0%)** |

## 2. Defalcare pe tip de cauză (Rețea vs. Instalație Locală)

| Categorie Ground Truth | Cazuri | Corecte la 1 min | Corecte la 5 min | Acuratețe 1 min | Acuratețe 5 min |
|---|---:|---:|---:|---:|---:|
| Fără defect (Sănătos / doar Volt-Watt) | 60 | 60 | 60 | 100.0% | 100.0% |
| Supratensiune rețea (Distribuitor) | 15 | 15 | 14 | 100.0% | 93.3% |
| Prag U> greșit în invertor (Instalator) | 1 | 1 | 1 | 100.0% | 100.0% |
| Cablu AC intern subdimensionat (Instalator) | 1 | 1 | 1 | 100.0% | 100.0% |
| Defect echipament / string / offline (O&M) | 4 | 4 | 4 | 100.0% | 100.0% |

## 3. Concluzia pentru cele 4 grafice din Pitch

1. **Graficul 1 (Triaj Rețea vs. Local):** Din 21 de instalații cu opriri/probleme tehnice în flotă, 15 sunt supratensiuni de rețea (**6.750 RON** deplasări inutile evitate lunar) și 6 sunt defecte locale reale trimise direct la O&M pe Telegram.
2. **Graficul 2 (1 min vs. 5 min):** Chiar și cu citire la 5 minute (fără hardware dedicat, doar din API-ul cloud al invertorului + contor la 15 min), clasificarea păstrează **98,8%** acuratețe și **0 alarme false** pe casele sănătoase (inclusiv cele în regim normal Volt-Watt).
3. **Graficul 3 (Baterii & Vârful de Seară PZU):** 7 baterii blocate (rezervă SoC prea mare sau mod greșit) generează o pierdere de arbitraj PZU de **982,08 RON/lună** pe eșantion (circa **713.000 EUR/an** extrapolat la 25.000 de prosumatori).
4. **Graficul 4 (Facturi Legea 160/2026 & Guardrail):** 5 facturi cu erori reale (index de export lipsă sau estimat) sunt prinse automat, cu **1.408,42 RON** de corectat; guardrail-ul numeric respinge orice text care conține o cifră absentă din faptele deterministe.
