# CLAUDE.md

Instrucțiuni pentru oricine (om sau agent) lucrează în acest repo. Citește întâi [GOAL.md](GOAL.md). Planul tehnic complet, cu task-uri, interfețe și teste, e în [docs/plan.md](docs/plan.md) (sursa: `/mnt/project-files/plans/2026-10-24-sunproof.md`).

## Context

- **Hackathon:** AI Validation Bootcamp, Challenge 1: „One view of the energy a prosumer produces, consumes and stores”. Demo pe 25 octombrie 2026.
- **Echipa:** 2 oameni. Orice adăugare trebuie să încapă în timp. Dacă nu încape, nu o face.
- **Juriul punctează, în ordine:** (1) dovezile din interviuri, (2) prototipul funcțional, (3) prezentarea. Prototipul trebuie să facă mai mult decât un singur apel LLM: unim surse de date, urmărim în timp și declanșăm acțiuni.
- **Produsul:** SunProof, pe tagline-ul *„Un singur adevăr despre energia ta, care îți aparține.”* Un serviciu 100% software care înregistrează opririle invertorului, spune dacă vina e a rețelei (supratensiune) sau a echipamentului, verifică dacă bateria face ce a vrut proprietarul și generează acțiuni: dosarul de sesizare și alertele O&M. Un tichet O&M se închide doar când datele confirmă reparația.
- **Cine plătește:** furnizorul de energie, per casă (B2B2C).

## Decizii luate (nu le redeschide fără Alex)

- **Doar aplicație web**, responsive. Fără aplicație mobilă: telefonul primește alertele pe Telegram.
- **5 orașe** (București, Cluj, Iași, Timișoara, Constanța), cu PVGIS real. Dosarul e adresat automat **distribuitorului din județul casei** (`DISTRIBUTOR_BY_COUNTY`). Calibrarea și testele cu valori exacte rămân pe București.
- **Bateria:** intenția proprietarului vs. setarea din invertor vs. ce s-a măsurat. Programul Electrica cu bonus a fost **doar un pilot în august 2026**; îl numim „program de tip Electrica (pilot august 2026)”.
- **Tichetele O&M** au trei rezultate decise de date: **verificat**, **redeschis** sau **dovezi insuficiente** (zile înnorate sau fără date). Clientul poate trimite și el un tichet, care pleacă cu verdictul SunProof atașat.
- **„Lipsă date”** (`no_data`) e separat de oprire: gri pe hartă, 0 kWh pierduți, fără tichet.
- **Istoricul setărilor:** arătăm când o problemă a început după o schimbare de setare (Task 12b).
- **O singură interfață de adaptor**, independentă de brand (`sunproof/adapters.py`). Doar adaptorul simulat e implementat; tabelul pe branduri e în pitch-ul detaliat, §11.
- **Fără model ML antrenat.** Comparația cu vecinii e detecția de anomalii nesupervizată, iar fiecare verdict are un motiv citibil. Opțional, un strat statistic de derivă peste vecini (Task 9b).
- **Prețurile OPCOM PZU** sunt candidat pentru „cât valorează ora” (Task 13, opțional).
- **Prezentarea:** 4 grafice, fiecare cu o singură concluzie scrisă deasupra, plus slide-ul cu cifrele și citatele din interviuri.
- **Interfața din demo e site-ul MVP, fără Streamlit.** Python e motorul (detecție, PDF, Telegram, evaluare), rulat din `python -m sunproof.demo`.
- **Site-ul MVP**, în stilul AirlineSim (decis pe 24.10, înlocuiește stilul noda.energy): `/mnt/project-files/mvp/sunproof-mvp.html`. Temă întunecată, font Inter, bară laterală cu numărul de lucruri care așteaptă, bară de sus cu zona, cipul „Seara din baterii”, cipul „De răspuns N” și ceasul simulării. Panoul furnizorului e un „dispecerat”: harta României pe județe (SVG inline din Natural Earth, fără Leaflet) cu un inel pe oraș împărțit pe tipuri de probleme, alegerea județului sau orașului (clic, listă sau căutare; harta se apropie pe zonă, cu posturile ei), casele postului pe linie ca dovadă „rețea, nu echipament”, pagina „De rezolvat” cu tichetele, plus Baterii, Facturi, Rețea, Inbox și Rapoarte. Panoul clientului primește aceeași temă. Planul complet, cu schițe: https://claude.ai/artifact/LZtXDj8iEkqmdMzeXtK8fV. Cifrele din site trebuie să rămână egale cu ale motorului Python (`python -m sunproof.demo export`, inclusiv cheia `fleet` pentru hartă); Python e sursa adevărului.
- **Fiecare widget răspunde la o singură întrebare a furnizorului și se termină cu o acțiune** (trimite la distribuitor, trimite tehnicianul, explică factura, anunță clientul). Un widget fără acțiune nu intră.
- **În lucru, separat:** panoul prosumatorului după autentificare și video-ul de lansare.

## Prioritățile (nu le inversa)

1. **Panourile:** oprire → cauză (rețea vs. echipament vs. lipsă de date, prin tensiune și vecini) → dosarul PDF sau alerta O&M → tichetul verificat în zilele următoare
2. **Bateria:** intenția proprietarului vs. setarea vs. ce s-a măsurat, plus istoricul setărilor; se încarcă la prânz, livrează seara, respectă rezerva; importul evitabil în lei și, dacă e într-un program, bonusul ratat
3. **Banii:** reconcilierea invertor–contor–factură și consumul derivat
4. **Cine vede ce:** permisiuni și jurnal de acces

**Dacă suntem în urmă, tăiem în ordinea asta:** prețurile PZU, stratul statistic, simularea „baterie mai mare?”, copilotul AI, detectarea volt-watt, absorbția inteligentă, „Cine vede ce” (rămâne ecran static), reconcilierea. **Nu se taie niciodată:** simulatorul cu baterie, clasificarea rețea/echipament (cu „lipsă date”), dosarul PDF, verificarea bateriei și tichetele O&M cu verificarea reparației.

## Reguli de arhitectură

- **Detecția și calculele sunt deterministe**, în Python. LLM-ul doar redactează (sesizarea, SMS-ul) și explică (copilotul). Orice cifră dintr-un text generat de LLM e verificată în cod față de datele calculate, iar dacă nu se potrivește, se rescrie dintr-un șablon.
- **Doar citim.** Nu controlăm invertoare și nu schimbăm setări. Singura „acțiune” fizică e priza smart din simulare.
- **Nimic nu depinde de brand în afara `sunproof/adapters.py`.** Detectorul, bateria și O&M primesc doar schema citirilor.
- **Datele la hackathon sunt simulate,** și spunem asta deschis. Producția vine din PVGIS (date reale pentru 2020, în 5 orașe), iar tensiunea dintr-un model fizic al străzii (`sunproof/feeder.py`).
- **Datele pentru terți trec doar prin `sunproof/consent.share()`**: rapoartele pentru distribuitor și furnizor, alertele. Nimic nu ocolește permisiunile.
- **Schema citirilor**, peste tot: `site_id: str`, `ts` (UTC, la minut), `p_ac_w`, `v_grid_v`, `status` (`"on"`/`"off"`), `alarm`, `soc`, `p_batt_w`. Simularea adaugă și `load_w`. Detectorul trebuie să dea același rezultat și pe date agregate la 5 minute.
- **Toate pragurile stau în `sunproof/config.py`**, niciodată hardcodate: `OV_10MIN = 253.0`, `OV_INSTANT = 264.5`, `RECONNECT_MIN = 15`, `VW_START = 248.0`, `VW_END = 253.0`, `VERIFY_DAYS = 2`, `VERIFY_MAX_DAYS = 5`, `LEI_PER_KWH`, `BONUS_LEI_PER_KWH = 0.40`, `PROGRAM_WINDOW = (19, 21)`, `CITIES`, `DISTRIBUTOR_BY_COUNTY` etc. Valorile marcate „demo” rămân etichetate „demo” și în UI.

## Structura

```
sunproof/      logica: config, adapters (interfața pe branduri), llm (Anthropic + FakeLLM), profiles,
               feeder (simulator), events (detector), store (SQLite), dossier (PDF), om (tichete,
               Telegram), battery (inclusiv istoricul setărilor), reconcile, consent, copilot, evaluate,
               prices (opțional, PZU), demo (scriptul de demo și exportul cifrelor pentru site)
scripts/       download_data.sh (PVGIS pe 5 orașe; rulat de pe laptop)
data/raw/      date descărcate (nu se pun în git)
tests/         pytest, câte un fișier per modul
docs/plan.md   planul complet: task-uri, interfețe, teste cu valori exacte
```

Scheletul e pe `main` (PR #1): `config.py` complet, restul modulelor sunt stub-uri, iar testele sunt marcate „skip” până la task-ul lor. `adapters.py`, `prices.py` și `demo.py` nu sunt încă în schelet; `ui/app.py`, `tests/test_ui_smoke.py` și dependențele `streamlit`/`pydeck` din schelet se șterg la primul commit de cod.

În afara repo-ului, în folderul proiectului: site-ul MVP (`mvp/sunproof-mvp.html`), planul, pitch-urile, `CLAUDE.md` și `GOAL.md`.

## Comenzi

```bash
pip install -e ".[dev]"
pytest -q                      # toate testele
pytest tests/test_events.py -v # un singur modul
python -m sunproof.demo day     # scriptul de demo (și: fault, dossier, battery, verify, eval, export)
bash scripts/download_data.sh  # date PVGIS (are nevoie de internet)
```

Variabile de mediu: `ANTHROPIC_API_KEY`, `LLM_MODEL` (implicit `claude-sonnet-5-5`), `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `DEMO_MODE=1` (citește rezultatele din cache, ca demo-ul să nu depindă de rețea). Nu pune chei în git.

## Cum lucrăm

- **Teste întâi.** Testele din `docs/plan.md` au valori exacte, de exemplu `lost_kwh == 4.8` sau `missed_lei == 3.20`. Nu le schimba ca să treacă codul. Dacă un test pare greșit, spune de ce.
- **Calibrarea** pragurilor se face pe seed-ul 1, iar raportarea pe seed-ul 2. Nu ajustăm pragurile pe datele pe care raportăm.
- **LLM-ul în teste** e întotdeauna simulat (`FakeLLM`), deci testele nu cer rețea și nici cheie API.
- **Commit-uri mici,** câte unul per task, cu mesaje în engleză în stilul `feat: ...`.
- **Autorul commit-urilor:** `AlexandruAchilleF <239040232+AlexandruAchilleF@users.noreply.github.com>`, fără trailere de co-autor.
- **Nu împinge nimic pe GitHub** fără cererea explicită a lui Alex. `CLAUDE.md`, `GOAL.md`, planul și pitch-urile nu intră în repo.
- **Textele din UI și din documente sunt în română,** cu diacritice corecte (ș, ț cu virgulă). Codul, numele de funcții și comentariile sunt în engleză.

## De verificat înainte de pitch

Nu prezenta ca fapt până nu e verificat:

- pragul de deconectare (253 V, medie pe 10 minute) în normele ANRE / NTE;
- câmpurile de tensiune, stare și alarmă la Huawei FusionSolar și Fronius, și dacă celelalte branduri din tabel expun tensiunea rețelei;
- harta distribuitorilor pe județe, pe site-ul ANRE;
- procedura de sesizare și termenul de răspuns, în textul oficial al Ordinului ANRE 46/2021 (până atunci, dosarul citează doar „standardul de performanță în vigoare”);
- programul Electrica cu bonus pentru baterie: **verificat pe 24.10**, a fost un pilot doar pentru august 2026 (19–21, încărcare 11–16, rezervă 20%), fără prelungire găsită. Îl prezentăm ca „program de tip Electrica (pilot august 2026)”, nu ca program activ;
- Casa Verde Baterii: nu spunem că sesiunea a început până nu vedem anunțul AFM;
- Legea 160/2026: nu cităm pragul de compensare (sursele spun 200 sau 400 kW) și nu spunem că furnizorii plătesc în general cu întârziere (depinde de contract).

## Ce să nu faci

- Să adaugi funcții care nu sunt în `docs/plan.md` înainte ca prioritățile 1–2 să meargă cap-coadă.
- Să transformi produsul într-un „dashboard unificat cu chatbot”. Asta există deja (SolarAssistant, Home Assistant, YellowGrid, asistentul Enphase) și nu ne diferențiază.
- Să faci o aplicație mobilă, o interfață Streamlit sau să antrenezi un model ML. Le-am evaluat pe 24.10 și nu intră.
- Să construiești hardware local, mod offline, încărcarea mașinii electrice, recomandări zilnice de consum, verificarea comutării pe backup, experimente ghidate de AI sau conflictul baterie–mașină electrică. Le-am evaluat pe 24.10 și nu intră în 24h.
- Să promiți despăgubiri în bani din sesizare. Valoarea e că distribuitorul trebuie să intervină.
- Să afirmi că datele simulate sunt reale.
