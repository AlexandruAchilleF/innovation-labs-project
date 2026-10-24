# Dovada (GOAL.md #4) — Evaluare pe cele 81 de scenarii SunProof

Acest raport este generat automat de `scripts/evaluate_proof.py` prin rularea motoarelor deterministe
pe toate cele **81 de gospodării** (5 cazuri principale + 76 generate) și compararea cu `get_ground_truth()`.

## 1. Sumar Executiv (Pentru Pitch)

| Indicator | Rezoluție 1 minut | Rezoluție 5 minute (Cloud Polling) |
|---|---:|---:|
| **Acuratețe clasificare Rețea vs. Local / Echipament** | **81/81 (100.0%)** | **81/81 (100.0%)** |
| **Alarme false pe case sănătoase (`NONE`)** | **0/60 (0.0%)** | **0/60 (0.0%)** |
| **Acuratețe audit baterie & PZU** | **81/81 (100.0%)** | **81/81 (100.0%)** |
| **Acuratețe reconciliere factură (Legea 160/2026)** | **81/81 (100.0%)** | **81/81 (100.0%)** |

## 2. Defalcare pe tip de cauză (Rețea vs. Instalație Locală)

| Categorie Ground Truth | Cazuri | Corecte la 1 min | Corecte la 5 min | Acuratețe 1 min | Acuratețe 5 min |
|---|---:|---:|---:|---:|---:|
| Fără defect (Sănătos / doar Volt-Watt) | 60 | 60 | 60 | 100.0% | 100.0% |
| Supratensiune rețea (Distribuitor) | 15 | 15 | 15 | 100.0% | 100.0% |
| Prag U> greșit în invertor (Instalator) | 1 | 1 | 1 | 100.0% | 100.0% |
| Cablu AC intern subdimensionat (Instalator) | 1 | 1 | 1 | 100.0% | 100.0% |
| Defect echipament / string / offline (O&M) | 4 | 4 | 4 | 100.0% | 100.0% |

## 3. Concluzia pentru cele 4 grafice din Pitch

1. **Graficul 1 (Triaj Rețea vs. Local):** Din 21 de gospodării cu opriri/probleme tehnice în flotă, 15 sunt supratensiuni de rețea (450 RON × 15 = **6.750 RON** deplasări inutile evitate lunar) și 6 sunt defecte locale reale trimise direct la O&M pe Telegram.
2. **Graficul 2 (1 min vs. 5 min):** Chiar și cu citire la 5 minute (fără hardware dedicat, doar din API-ul cloud al invertorului + contor la 15 min), clasificarea păstrează **100.0%** acuratețe și **0 alarme false** pe casele sănătoase (inclusiv cele în regim normal Volt-Watt).
3. **Graficul 3 (Baterii & Vârful de Seară PZU):** 7 baterii blocate la 80% SoC sau în mod greșit generează o pierdere de arbitraj PZU de **1.054,20 RON/lună** pe eșantion (peste **5,66 milioane EUR/an** extrapolat la 25.000 prosumatori).
4. **Graficul 4 (Facturi Legea 160/2026 & Guardrail):** 5 facturi cu erori reale (index 2.8.0 lipsă sau estimat abuziv) sunt prinse automat, iar guardrail-ul numeric blochează 100% din sumele neacoperite de fapte deterministe.
