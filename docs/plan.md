# SunProof — plan de implementare

**Pitch într-o frază:** *Un singur adevăr despre energia ta, care îți aparține.* Găsim banii pierduți între invertor, baterie, rețea, contor și factură, iar prosumatorul decide cine ce vede.

**Întrebarea la care răspunde produsul (actualizată cu sursele din 2026):** *„Bateria și panourile tale fac ce trebuie?”* În 2026 momentul consumului contează din nou: energia a fost cu ~60% mai scumpă în iunie față de anul trecut, compensarea nu acoperă tarifele de rețea, furnizorii testează programe care plătesc livrarea din baterie seara (Electrica a plătit 0,40 lei/kWh în august 2026, ca pilot de o lună), iar Casa Verde Baterii (400 mil. lei, max. 15.000 lei pe proiect) poate finanța zeci de mii de baterii, deși deschiderea sesiunii nu e confirmată. Ordinea priorităților: **(1)** panourile (supratensiune vs. defect), **(2)** bateria (face ce vrea proprietarul și ce cere programul?), **(3)** banii (contor vs. factură), **(4)** cine vede ce.

> **Pentru agenți:** SUB-SKILL OBLIGATORIU: folosește superpowers:subagent-driven-development (recomandat) sau superpowers:executing-plans pentru a implementa planul task cu task. Pașii folosesc checkbox-uri (`- [ ]`) pentru urmărire.

**Scop:** Un serviciu software care înregistrează fiecare oprire și fiecare reducere de putere a invertorului unui prosumator. Comparând casa cu vecinii de pe aceeași stradă, spune a cui e vina: a rețelei (supratensiune) sau a echipamentului. Prosumatorul primește un dosar de sesizare către distribuitor, gata de trimis, iar echipa de O&M primește doar defectele reale de echipament.

**Arhitectură:** Citirile la nivel de minut sau la 5 minute (putere AC, tensiunea rețelei, status sau cod de alarmă) intră într-un SQLite. Pentru hackathon, ele vin dintr-un simulator fizic al unei străzi de joasă tensiune. În produs, vin din API-urile producătorilor (cloud sau local), fără hardware. Un detector determinist extrage evenimentele, estimează producția pierdută față de vecini și le clasifică. Pe baza lui, un generator construiește dosarul PDF de sesizare (fapte și grafice din cod, text redactat de LLM), un modul de tichete și Telegram servește echipa de O&M, iar un copilot cu unelte răspunde prosumatorului.

**Tech stack:** Python 3.12, pandas, numpy, SQLite, matplotlib, `fpdf2` (PDF), httpx (Telegram, PVGIS, Shelly), `anthropic` (model din `LLM_MODEL`, implicit `claude-sonnet-5-5`), pytest. **Interfața e site-ul MVP**, un singur fișier HTML (harta României ca SVG inline din Natural Earth, fără Leaflet; simulare în JS), fără server; motorul Python rulează din `python -m sunproof.demo`. Fără Streamlit. Fără aplicație mobilă și fără model ML antrenat.

**Spec:** mesajul lui Alex din 24.10.2026, 07:40 („Ce ar fi inovativ la Challenge 1”), planul anterior [vecinii-sunt-senzorul.md](/mnt/project-files/plans/2026-10-24-vecinii-sunt-senzorul.md), pe care acesta îl înlocuiește, și brief-ul Challenge 1.

## Deciziile de până acum (24.10.2026, ora 10)

Aceste decizii sunt luate. Nu le redeschide fără Alex.

| Tema | Decizia |
|---|---|
| Codul | Pachetul Python se numește `sunproof/` (nu `cn/`). Scheletul e pe `main` (PR #1): `config.py` complet, câte un modul per task cu funcții stub, câte un fișier de test per modul (doar `test_config.py` e activ). `CLAUDE.md`, `GOAL.md`, planul și pitch-urile **nu** intră în repo; stau în `/mnt/project-files/`. Nu împingem nimic pe GitHub fără cererea explicită a lui Alex |
| Platforma | **Doar aplicație web**, responsive. Fără aplicație mobilă: partea „de telefon” o acoperă alertele pe Telegram. În pitch, aplicația mobilă e pasul următor |
| Acoperire | **5 orașe** (București, Cluj, Iași, Timișoara, Constanța), cu PVGIS real pentru fiecare. Dosarul de sesizare e adresat automat **distribuitorului din județul casei** (`DISTRIBUTOR_BY_COUNTY`, toate cele 42 de coduri). Calibrarea și testele cu valori exacte rămân pe București |
| Bateria | Verificăm **intenția proprietarului vs. setarea din invertor vs. ce s-a măsurat**. Programul Electrica cu bonus (0,40 lei/kWh, 19–21) a fost **doar un pilot în august 2026**; îl numim „program de tip Electrica (pilot august 2026)”, iar verificarea bateriei nu depinde de el |
| Tichetele O&M | „Rezolvat” spus de tehnician nu închide tichetul. Datele decid, cu 3 rezultate: **verificat** (`VERIFY_DAYS` zile cu producție, fără simptom), **redeschis** (simptomul revine) sau **dovezi insuficiente** (zile înnorate sau fără date, deci nu se poate confirma; tichetul rămâne în verificare) |
| Golurile de date | „Lipsă date” (`no_data`) e separat de oprire: monitorizarea a căzut, nu producția. Gri pe hartă, 0 kWh pierduți, fără tichet |
| Istoricul setărilor | Păstrăm istoricul setărilor bateriei și arătăm când o problemă a început după o schimbare („rezerva a trecut la 80% pe 3 iulie; de atunci importul seara a crescut, producția a rămas la fel”). Ideea #4 din research, Task 12b |
| Branduri | **O singură interfață de adaptor**, independentă de brand (`sunproof/adapters.py`). La hackathon e implementat doar adaptorul simulat; tabelul cu API-ul fiecărui brand (Huawei, Deye, Growatt, Fronius, SolarEdge, SMA, Victron, plus curba de sarcină a distribuitorului pentru orice brand) e în pitch-ul detaliat, §11 |
| ML | **Fără model ML antrenat.** N-avem defecte reale etichetate, iar un model antrenat pe simulator ar învăța doar regulile simulatorului; dosarul trebuie să spună *de ce*. Comparația cu vecinii (producție pe kWp față de mediana vecinilor) **e** detecția de anomalii nesupervizată. Opțional: un strat statistic peste diferența față de vecini (scor de abatere pe 7 zile) pentru derive lente, Task 9b, după interviuri |
| Prețuri | **OPCOM PZU** e candidat pentru „cât valorează fiecare oră” (prânz vs. seară, la baterie și la factură). Opțional, Task 13; datele se descarcă de pe laptop |
| Prezentarea | **4 grafice, fiecare cu o singură concluzie scrisă deasupra** (vezi „Prezentarea” mai jos), plus slide-ul cu cifrele și citatele din interviuri |
| Site-ul | MVP-ul clicabil, **în stilul AirlineSim** (decis pe 24.10, înlocuiește stilul noda.energy; plan și schițe: [panoul furnizorului în stilul AirlineSim](https://claude.ai/artifact/LZtXDj8iEkqmdMzeXtK8fV)): `/mnt/project-files/mvp/sunproof-mvp.html` ([link](https://claude.ai/artifact/KCkrh4oGRfkekbuWDZqrZ4)). Are **panoul clientului** (cifrele zilei, grafice producție/consum vs. așteptat și baterie, alerte cu acțiune, „Trimite o problemă echipei O&M”) și **panoul furnizorului**, un „dispecerat” (harta României cu inele pe orașe, alegerea județului sau orașului cu posturile și casele pe linie, pagina „De rezolvat” cu tichetele și verdictul SunProof atașat, Baterii, Facturi, Rețea, Inbox). **Site-ul e interfața din demo; fără Streamlit** (Alex, 24.10). Simularea din site e un port JS al aceleiași logici; cifrele trebuie să rămână egale cu ale motorului Python, verificate cu `python -m sunproof.demo export` |
| În lucru, în alte thread-uri | Panoul prosumatorului după autentificare (design) și video-ul de lansare |

---

## Ce face aplicația, pe scurt

**Pentru prosumator:**
1. O cronologie a zilei: producția, tensiunea rețelei și fiecare oprire marcată, cu cauza ei (rețea sau echipament).
2. Un rezumat lunar: „Invertorul s-a oprit de 23 de ori, ai pierdut 41 kWh, aproximativ 41 lei. În 21 din cazuri, și vecinii s-au oprit în același minut: problema e la rețea.”
3. Butonul **„Generează sesizarea”**: un PDF în română către distribuitor, cu datele de identificare, lista opririlor, graficul tensiunii, pierderea calculată și cererea de verificare și remediere.
4. Un chat: „De ce n-am produs azi la prânz?”. Răspunsul vine cu cifre, din unelte.
5. **„Invertor vs. contor vs. factură”:** consumul real al casei e calculat fără contor nou, ca producție din invertor + import − export, unde importul și exportul vin din curba de sarcină a distribuitorului. Apoi fiecare factură e verificată față de contor: energie injectată nedecontată sau decontată la preț zero.
6. **„Cine vede ce”:** prosumatorul acordă și retrage accesul la date pe categorii (distribuitorul vede doar tensiunea și opririle, O&M doar alertele, furnizorul doar livrarea din baterie), cu jurnal de acces. Nimeni nu primește parola invertorului.
7. **„Bateria ta face ce trebuie?”** Proprietarul spune ce vrea (de exemplu „rezervă 20% pentru pană, restul seara”), iar verificarea compară intenția cu setarea și cu ce s-a măsurat. Verifică zilnic dacă bateria se încarcă la prânz (când altfel energia s-ar pierde prin opriri), dacă livrează seara și dacă respectă rezerva. Răspunsul diferă după intenție: „bateria îți păstrează rezerva aleasă” nu e o alertă, „bateria e setată la 80%, tu ai vrut 20%” e o alertă, cu importul seara din rețea în lei. Dacă prosumatorul e într-un program de furnizor, arată și bonusul ratat și generează raportul verificat al livrării de seară (cu acordul lui).
8. **„Ce s-a schimbat?”** Istoricul setărilor bateriei: dacă importul seara a crescut după o schimbare de setare, iar producția a rămas la fel, aplicația arată data schimbării și diferența în kWh și lei.
9. **„Trimite o problemă echipei O&M”:** prosumatorul descrie problema, iar tichetul pleacă cu datele zilei și cu verdictul SunProof atașat (de exemplu „rețea, nu echipament, fără deplasare”). Prosumatorul vede statusul tichetului.
10. (Opțional) **Absorbție inteligentă:** când tensiunea se apropie de prag, pornește boilerul printr-o priză smart, ca energia să fie folosită în casă. Simulatorul arată câte opriri se evită.

**Pentru echipa de O&M a furnizorului:**
1. O hartă a străzilor: mov pentru supratensiune (problemă de rețea), roșu pentru defect de echipament (merită o deplasare), gri pentru lipsă de date (monitorizarea a căzut, nu producția), verde pentru ok.
2. Tichete pentru echipament, ordonate după lei pierduți pe zi, cu alertă pe Telegram, plus tichetele trimise de clienți (cu verdictul SunProof atașat). Un tichet nu se închide când tehnicianul spune „rezolvat”, ci după 2 zile cu producție fără simptom (**verificat**); dacă defectul revine, se redeschide singur, cu dovezile (**redeschis**); dacă zilele sunt înnorate sau fără date, rămâne în verificare cu **dovezi insuficiente**.
3. Contorul **„deplasări inutile evitate”** (opriri din cauza rețelei care altfel ar fi părut defecte) și un raport agregat pe stradă, pe care furnizorul îl poate trimite distribuitorului.

## De ce e inovativ

- **Diagnostic de cauză prin vecini.** Solar Analytics semnalează supratensiunea, dar casă cu casă. Noi demonstrăm că e problema rețelei: mai multe case de pe aceeași stradă se opresc în același minut. Producția așteptată vine tot de la vecini, deci ține cont de nori și de anotimp fără model meteo.
- **Verificăm rezultatul pe care l-a vrut proprietarul, nu doar dacă echipamentul e „sănătos”.** Un sistem fără nicio alarmă poate să nu facă ce a cerut omul (rezerva setată greșit, bateria goală seara). Aceleași date dau alt verdict când intenția e alta. Concurenții (YellowGrid în România, asistentul AI Enphase din august 2026, Solar Analytics) explică datele unui singur echipament; noi comparăm intenția, setarea, măsurătorile și vecinii.
- **Tichetul rămâne deschis până când datele confirmă reparația.** Un prosumator de pe Softpedia povestește 15–20 de deplasări fără diagnostic; la noi „rezolvat” înseamnă că simptomul n-a mai apărut.
- **Transformă datele în acțiune legală,** adică dosarul de sesizare. Problema e actuală (plângeri în creștere din martie 2026) și nu există date naționale despre ea.
- **Fără hardware și fără acces la setările invertorului.** Doar citim. Distribuitorul primește dovezile, nu controlul.
- **Pune cap la cap invertorul, contorul și factura.** N-am găsit pe nimeni care verifică lunar dacă cele trei se potrivesc, iar consumul se poate calcula fără hardware nou.
- **Răspunde unui conflict real și actual:** distribuitorii au cerut parolele aplicațiilor de monitorizare (Delgaz, Distribuție Oltenia), iar Asociația Prosumatorilor a reclamat cererea la ANSPDCP. EU Data Act dă utilizatorului dreptul la datele invertorului. Noi oferim varianta în care prosumatorul controlează ce se partajează.
- **Detecție de anomalii fără model antrenat:** vecinii sunt „modelul” care spune cât ar fi trebuit să producă fiecare casă. Fiecare verdict are un motiv citibil („254 V și 2 vecini opriți în același minut”), nu un scor.
- **Vede și pierderile ascunse,** nu doar opririle: reducerea automată de putere a invertorului la tensiune mare (volt-watt), pe care prosumatorul nu o observă deloc.

## Este posibil? Resursele

| Resursă | Rol | Status |
|---|---|---|
| PVGIS `seriescalc` (orar, nori reali, 2020) | Profilul de producție pentru stradă | API public. Mediul meu nu-l poate accesa, deci îl descărcați de pe laptop. Rezervă: un profil „clopot” scalat |
| Profiluri de consum | Consumul fiecărei case (contează pentru export, deci pentru tensiune) | StoreNet are consumul la minut. Rezervă: profil sintetic cu vârf seara |
| **Tensiunea rețelei** | Cauza opririlor | **Nu există un set public.** O simulăm cu un model fizic simplu al străzii (Task 2), iar în pitch spunem asta deschis. Invertoarele reale raportează tensiunea AC: la Fronius, câmpul `UAC` din `GetInverterRealtimeData`; la Huawei, KPI-urile de tensiune de fază din API-ul Northbound. **De verificat** pe documentația oficială înainte de pitch |
| Pragurile de deconectare | Regula de oprire | Folosim 253 V (230 V + 10%) ca medie pe 10 minute și 264,5 V instantaneu, cu repornire după 15 minute. Valorile sunt configurabile. **De verificat** în normele ANRE / NTE și în setările invertoarelor din România |
| Procedura de sesizare (Ord. ANRE 46/2021, termen de 20 de zile) | Textul dosarului | Sursa e un blog. **De verificat** în textul oficial. Până atunci, dosarul citează doar „standardul de performanță în vigoare”, fără termen |
| Curba de sarcină a distribuitorului (import/export la 15 min, export CSV din portal, de ex. Rețele Electrice) | Consumul derivat și reconcilierea | Formatul exact **de verificat** în manualul distribuitorului. În demo, curba e generată din simulator, cu același format |
| Facturi de prosumator | Reconcilierea cu contorul | Sintetice (JSON), cu 2 erori plantate. Regulile de compensare se schimbă (metodologia ANRE pentru Legea 160/2026 nu e încă actualizată), deci prețurile sunt configurabile și marcate „demo”. Legea aduce facturarea și decontarea lunară a energiei livrate. Pragul pentru compensarea cantitativă apare diferit în surse (400 kW în presă, 200 kW plus regularizare financiară între 200 și 400 kW în altă lectură), deci nu-l cităm: casele sunt oricum sub 27 kW. Termenul de plată depinde de contract (PPC MaxControl plătește soldul la 30 de zile), deci nu spunem că furnizorii plătesc cu întârziere în general |
| Programul Electrica (0,40 lei/kWh pentru livrarea din baterie 19–21, încărcare 11–16, rezervă 20%) | Regulile programului în verificarea bateriei | **Verificat (24.10):** bonusul a fost doar pentru august 2026 ([Financial Intelligence](https://financialintelligence.ro/electrica-ii-stimuleaza-pe-prosumatorii-cu-baterii-sa-livreze-energie-seara-bonus-de-040-lei-kwh-in-luna-august/)); n-am găsit o prelungire. În demo îl numim „program de tip Electrica (pilot august 2026)”, cu valori marcate „demo”. Verificarea bateriei nu depinde de el: funcționează pe intenția proprietarului |
| Casa Verde Baterii (AFM) | Contextul pieței | 400 mil. lei, max. 15.000 lei pe proiect, cel puțin 10 kWh. Lansarea era așteptată în octombrie 2026, fără confirmare găsită; ordinea „primul venit” a fost înlocuită cu criterii ([SpotMedia, 20.08](https://spotmedia.ro/stiri/mediu/casa-verde-baterii-schimba-regulile-nu-va-mai-conta-cine-se-inscrie-primul-cand-ar-putea-incepe-programul)). Nu spunem în pitch că a început |
| Prețurile OPCOM PZU (orare, ziua următoare) | „Cât valorează fiecare oră”: prânz vs. seară, la baterie și la factură (Task 13, opțional) | Publice pe site-ul OPCOM; blocate din mediul cloud, deci le descărcați de pe laptop în `data/raw/pzu_{luna}.csv`. Testele rămân pe `LEI_PER_KWH` fix |
| API-urile producătorilor (Huawei, Deye, Growatt, Fronius, SolarEdge, SMA, Victron) | Sursa reală a citirilor, în produs | La hackathon doar interfața adaptorului (Task 0b); tabelul pe branduri e în pitch-ul detaliat, §11. **De verificat** dacă fiecare API expune tensiunea rețelei |
| Telegram Bot API, Shelly local HTTP API | Alerte și acțiunea pe priza smart | Publice. Priza Shelly e doar simulată în demo |
| Cheie API Anthropic | Copilot și textul sesizării | Necesară pentru demo; testele rulează cu un LLM fals |

**Concluzie:** e realizabil de 2 oameni în 24h, 100% software. Singurul compromis e că tensiunea e simulată, iar asta e ușor de apărat: oricum nu există date publice, și tocmai acesta e golul pe care îl acoperim.

## Global Constraints

- Schema citirilor: `site_id: str`, `ts: pd.Timestamp` (UTC, la minut), `p_ac_w: float`, `v_grid_v: float`, `status: Literal["on","off"]`, `alarm: str | None` (de exemplu `"grid_overvoltage"`). Detectorul trebuie să funcționeze identic și pe date agregate la 5 minute.
- Fiecare casă are `site_id`, `feeder_id` (strada), `position` (1 = cea mai aproape de transformator), `kwp`, `lat`, `lon`, `volt_watt: bool`.
- Pachetul e `sunproof/`; constantele stau în `sunproof/config.py` (scheletul din PR #1 le are deja).
- Constante în `config.py`: `V_NOMINAL = 230.0`, `OV_10MIN = 253.0`, `OV_INSTANT = 264.5`, `RECONNECT_MIN = 15`, `VW_START = 248.0`, `VW_END = 253.0`, `VW_MIN_FRACTION = 0.2`, `LEI_PER_KWH = 1.00` (valoare demo, marcată ca atare), `MIN_PEERS = 2` (pentru clasificarea „rețea” e nevoie de cel puțin 2 vecini opriți în aceeași fereastră), `PEER_WINDOW_MIN = 5`, `NO_DATA_MIN = 15`, `VERIFY_DAYS = 2`, `VERIFY_MAX_DAYS = 5`, `REGRESSION_PROD_TOL = 0.15`. (Ultimele două nu sunt încă în scheletul din PR #1; se adaugă la Task 6 și Task 12b.)
- Data demo-ului: `DEMO_DAY = date(2020, 7, 15)`.
- Orașele demo, în `config.py`: `CITIES = {"bucuresti": (44.375, 26.120, "B"), "cluj": (46.770, 23.590, "CJ"), "iasi": (47.160, 27.590, "IS"), "timisoara": (45.750, 21.230, "TM"), "constanta": (44.180, 28.630, "CT")}` (lat, lon, județ). `DEFAULT_CITY = "bucuresti"`; calibrarea și testele cu valori exacte se fac pe București.
- Distribuitorul după județ, în `config.py`: `DISTRIBUTOR_BY_COUNTY` acoperă toate cele 41 de județe și Bucureștiul. Rețele Electrice: Muntenia Sud (B, IF, GR), Banat (TM, AR, CS, HD), Dobrogea (CT, TL, CL, IL). Delgaz Grid: Moldova (IS, BC, BT, NT, SV, VS). Distribuție Energie Oltenia: Oltenia (DJ, GJ, MH, OT, VL, AG, TR). Distribuție Energie Electrica România: Transilvania Nord (CJ, BH, BN, MM, SJ, SM), Transilvania Sud (AB, BV, CV, HR, MS, SB) și Muntenia Nord (PH, BZ, BR, GL, DB, VN). **De verificat** pe site-ul ANRE înainte de pitch.
- Detectorul și calculele sunt deterministe. LLM-ul doar redactează și explică, iar orice cifră din textul lui e verificată în cod față de datele calculate.
- Textele din UI și din documente sunt în română, cu diacritice.

## Review Focus

1. **Înnorare bruscă pe toată strada:** producția scade simultan la toți, dar tensiunea e normală și statusul rămâne „on”. Așteptat: niciun eveniment. Test în Task 3.
2. **Pană de curent în toată rețeaua** (tensiune 0 la toți): așteptat un eveniment `grid_outage`, nu supratensiune și nu defect de echipament. Test în Task 3.
3. **O singură casă la capătul străzii se oprește din supratensiune,** iar vecinii mai apropiați de transformator nu: tensiunea ei depășește 253 V, deci clasificarea e `grid_overvoltage` chiar fără confirmare de la vecini. Vecinii întăresc dovada, dar nu sunt obligatorii când tensiunea măsurată e clară. Test în Task 3.
4. **Date la 5 minute în loc de 1 minut:** aceleași evenimente, cu durate rotunjite. Test în Task 3.
5. **Oprire noaptea sau la răsărit** (producție așteptată aproape de zero): nu e eveniment și nu are pierdere. Test în Task 3.

---

## Structura fișierelor

```
sunproof/
  pyproject.toml
  sunproof/
    config.py
    adapters.py     # interfața de adaptor, independentă de brand; doar SimulatedAdapter e implementat
    llm.py          # AnthropicLLM și FakeLLM (pentru teste)
    profiles.py     # PVGIS + consum → profiluri pe minut
    feeder.py       # simulatorul străzii: tensiune, opriri, volt-watt, defecte, absorbție inteligentă
    events.py       # extragerea și clasificarea evenimentelor + pierderi
    store.py        # SQLite
    dossier.py      # dosarul de sesizare (PDF)
    om.py           # tichete (inclusiv de la clienți), verificarea reparației, hartă, Telegram, deplasări evitate
    battery.py      # intenție vs. setare vs. măsurat, istoricul setărilor, bonusul ratat
    reconcile.py    # invertor vs. contor vs. factură
    consent.py      # cine vede ce, jurnal de acces
    prices.py       # (opțional) prețurile OPCOM PZU, „cât valorează ora”
    copilot.py      # chat cu unelte
    evaluate.py     # acuratețea clasificării + alarmele false pe date reale
    demo.py         # scriptul de demo: zi, defect, dosar, baterie, verificare, evaluare, export pentru site
  site (în afara repo-ului): /mnt/project-files/mvp/sunproof-mvp.html
  scripts/download_data.sh
  tests/
```

### Task 0b: Interfața de adaptor (o singură interfață, orice brand)

**Files:** Create `sunproof/adapters.py`, `tests/test_adapters.py`

**Interfaces:**
- Produces:
  - `class InverterAdapter(Protocol)`: `readings(site_id: str, start: pd.Timestamp, end: pd.Timestamp) -> pd.DataFrame` (exact schema citirilor din Global Constraints, UTC, la 1 sau 5 minute); `settings(site_id: str) -> dict` (de exemplu `{"reserve": 0.8, "mode": "self_consumption"}`); `capabilities() -> set[str]` (de exemplu `{"voltage", "alarm", "battery"}`, ca detectorul să știe ce lipsește)
  - `SimulatedAdapter(store: Store)`: singura implementare reală, citește din SQLite
  - `HuaweiNorthboundAdapter`, `FroniusSolarApiAdapter`: doar clase cu docstring-ul câmpurilor mapate (de exemplu Fronius `UAC` → `v_grid_v`) și `NotImplementedError`. Restul brandurilor apar doar în tabelul din pitch
- Regula: nimic din `events.py`, `battery.py` sau `om.py` nu știe de brand. Tot ce depinde de brand stă în adaptor.

- [ ] **Step 1: Teste:** `test_simulated_adapter_schema` (coloanele și tipurile din schemă); `test_simulated_adapter_5min` (cere rezoluția de 5 minute și primește media corectă); `test_brand_stubs_not_implemented`.
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS. (~45 min, după Task 4.)
- [ ] **Step 3: Commit** `feat: brand-agnostic inverter adapter interface`.

### Task 1: Profiluri de producție și consum

**Files:** Create `pyproject.toml`, `sunproof/config.py`, `sunproof/profiles.py`, `scripts/download_data.sh`, `tests/test_profiles.py`, `tests/fixtures/pvgis_mini.json`

**Interfaces:**
- Produces: `load_pvgis(path: Path) -> pd.Series` (W per kWp, orar, UTC); `to_minute(hourly: pd.Series) -> pd.Series` (interpolare liniară, aceeași energie pe oră ±1%); `bell_profile(day: date, kwh_per_kwp: float = 6.0) -> pd.Series` (rezerva fără internet); `consumption_profile(day: date, daily_kwh: float, seed: int) -> pd.Series` (W la minut: bază de 150 W, vârfuri la 07–08 și 18–22, zgomot cu seed)

- [ ] **Step 1:** `download_data.sh` face apelul PVGIS pentru fiecare oraș din `CITIES` (București: o stradă din Berceni, 44.375, 26.120): `seriescalc?lat={lat}&lon={lon}&pvcalculation=1&peakpower=1&loss=14&angle=30&aspect=0&startyear=2020&endyear=2020&outputformat=json`, salvat în `data/raw/pvgis_{oras}.json`. Dacă un oraș lipsește, se folosește profilul „clopot”, scalat cu randamentul anual din PVGIS pentru acel oraș.
- [ ] **Step 2: Teste:** `test_to_minute_preserves_energy`; `test_bell_profile_energy` (suma pe zi / 60 / 1000 == `pytest.approx(6.0)`); `test_consumption_daily_total` (suma == `daily_kwh` ±1%, același seed dă aceeași serie).
- [ ] **Step 3:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 4: Commit** `feat: production and consumption profiles`.

### Task 2: Simulatorul străzii

**Files:** Create `sunproof/feeder.py`, `tests/test_feeder.py`

**Interfaces:**
- Consumes: profilurile din Task 1, constantele din `config.py`
- Produces:
  - `Battery(capacity_kwh: float = 10.0, max_kw: float = 5.0, reserve: float = 0.2, mode: Literal["self_consumption","evening_program","full_by_morning","never_discharges"] = "self_consumption")`. Modurile: `self_consumption` încarcă din surplus și descarcă pentru consumul casei oricând; `evening_program` încarcă din surplus între 11 și 16, păstrează energia și descarcă la putere maximă în fereastra `PROGRAM_WINDOW` (export permis), până la rezervă; `full_by_morning` (configurare greșită) încarcă din primul surplus și e plină înainte de prânz; `never_discharges` (rezervă setată la 100%)
  - `House(site_id: str, position: int, kwp: float, daily_kwh: float, volt_watt: bool = False, smart_load_w: float = 0.0, battery: Battery | None = None)`. Citirile capătă coloanele `soc` (0–1) și `p_batt_w` (+ descărcare, − încărcare), iar `export[i]` din algoritm include bateria
  - `FeederConfig(feeder_id: str, houses: list[House], r_seg_ohm: float = 0.01, v_tx: float = 240.0)`
  - `Fault(site_id: str, kind: Literal["inverter_trip","string_loss"], start: pd.Timestamp, end: pd.Timestamp | None)`
  - `simulate(cfg: FeederConfig, pv_w_per_kwp: pd.Series, day: date, faults: list[Fault] = [], smart_absorb: bool = False, seed: int = 0) -> pd.DataFrame` (schema citirilor din Global Constraints)

Algoritmul, pas cu pas pe minut (nu reiese din semnătură):
```
pentru fiecare minut t:
  p_pv[i]   = pv_w_per_kwp[t] · kwp[i] · (0.5 dacă string_loss activ) · (0 dacă invertorul e oprit)
  dacă volt_watt[i] și v[i] din minutul anterior > VW_START:
      p_pv[i] ·= max(VW_MIN_FRACTION, 1 - (v_prev - VW_START)/(VW_END - VW_START)·(1 - VW_MIN_FRACTION))
  load[i]   = consum[i][t] + (smart_load_w[i] dacă smart_absorb și v_prev[i] ≥ VW_START - 1)
  export[i] = p_pv[i] - load[i]                       (poate fi negativ)
  I_k       = Σ_{j ≥ k} export[j] / V_NOMINAL          (curentul pe segmentul k, model monofazat simplificat)
  v[i]      = v_tx + Σ_{k ≤ i} r_seg_ohm · I_k
  oprire dacă media pe 10 minute a v[i] > OV_10MIN sau v[i] > OV_INSTANT  → alarm = "grid_overvoltage",
     invertorul rămâne oprit RECONNECT_MIN minute, apoi repornește dacă v < OV_10MIN
  inverter_trip injectat → status off, alarm = "inverter_fault", tensiunea rămâne cea a rețelei
```

- [ ] **Step 1: Teste:**
  - `test_voltage_rise_exact`: 3 case, export constant de 2.300 W fiecare, `r_seg_ohm=0.01`, `v_tx=240` → `I = [30, 20, 10]` A, `v = [240.30, 240.50, 240.60]`.
  - `test_end_of_street_trips_first`: pe strada demo (12 case de 6 kWp, `DEMO_DAY`, profil PVGIS sau bell), ultimele case se opresc la prânz, iar primele 3 nu se opresc deloc.
  - `test_trip_lasts_reconnect`: după o oprire, statusul rămâne `off` cel puțin 15 minute.
  - `test_volt_watt_reduces_not_trips`: o casă cu `volt_watt=True` la 250 V produce 0,68 din putere (1 − 2/5 · 0,8) și rămâne `on`.
  - `test_smart_absorb_reduces_trips`: același scenariu cu `smart_absorb=True` și `smart_load_w=2000` are strict mai puține opriri.
  - `test_equipment_fault_normal_voltage`: un `inverter_trip` injectat la casa 3 dă `alarm == "inverter_fault"`, iar tensiunea ei rămâne sub 253.
  - `test_night_no_trips`.
- [ ] **Step 2:** Rulează → FAIL; implementează vectorizat pe case, iterativ pe minute (1.440 de pași). → PASS.
- [ ] **Step 3: Calibrare:** alege `v_tx` și `r_seg_ohm` astfel încât, în `DEMO_DAY`, 3–5 case de la capătul străzii să se oprească de 2–4 ori fiecare între 10:00 și 16:00. Notează valorile în `config.py`.
- [ ] **Step 4: Commit** `feat: physical LV feeder simulator with overvoltage trips and volt-watt`.

### Task 3: Evenimente, clasificare și pierderi

**Files:** Create `sunproof/events.py`, `tests/test_events.py`

**Interfaces:**
- Consumes: schema citirilor, `sites`
- Produces:
  - `Event(site_id: str, feeder_id: str, start: pd.Timestamp, end: pd.Timestamp, kind: Literal["grid_overvoltage","grid_outage","equipment","volt_watt_curtailment","no_data","unknown"], v_max: float, peers_affected: int, lost_kwh: float, lost_lei: float, evidence: dict)`
  - `extract_events(readings, sites) -> list[Event]`
  - `expected_power(readings, sites) -> pd.Series` (per `site_id, ts`: `kwp ×` mediana W/kWp a vecinilor care sunt `on` în acel minut; dacă nu există vecini `on`, se folosește maximul casei din aceeași oră în ultimele 7 zile)
  - `monthly_summary(events, site_id, month) -> dict` (număr opriri, kWh, lei, procent rețea vs. echipament)

Regulile de clasificare, în ordine:
```
0. no_data:       lipsesc citirile casei ≥ NO_DATA_MIN (config, 15) minute → monitorizarea a căzut,
                  nu producția; lost_kwh = 0, nu deschide tichet, apare gri pe hartă
1. grid_outage:   v_grid < 100 V la ≥ 80% din casele străzii în aceeași fereastră
2. grid_overvoltage: în cele 10 min dinaintea opririi, v_max ≥ OV_10MIN sau alarm == "grid_overvoltage"
                  (peers_affected = câte alte case de pe stradă s-au oprit în ±PEER_WINDOW_MIN;
                   evidence["confirmed_by_peers"] = peers_affected ≥ MIN_PEERS)
3. equipment:     oprire cu v_max < OV_10MIN - 3, peers_affected == 0 și vecinii produc
   equipment (partial_output): casa e „on”, dar p_ac < 0.65 · expected timp de ≥ 60 min, cu v < VW_START
                  (string inactiv sau umbrire nouă; nu e volt-watt, pentru că tensiunea e normală)
4. volt_watt_curtailment: casa e „on”, dar p_ac < 0.8 · expected timp de ≥ 10 min, cu v > VW_START
5. altfel unknown
Opririle cu expected_power < 50 W nu sunt evenimente (noapte, răsărit).
lost_kwh = Σ (expected - p_ac) pe durata evenimentului / 60 000,  lost_lei = lost_kwh · LEI_PER_KWH
```

- [ ] **Step 1: Teste** (pe ieșirea simulatorului din Task 2, cu seed fix):
  - `test_overvoltage_classified_with_peers`: opririle de la capătul străzii sunt `grid_overvoltage`, iar cel puțin unul are `confirmed_by_peers=True`.
  - `test_single_house_overvoltage` (Review Focus 3): o stradă în care se oprește doar ultima casă → `grid_overvoltage`, `confirmed_by_peers=False`.
  - `test_equipment_fault`: un `inverter_trip` injectat la casa 3 → un eveniment `equipment`, `peers_affected == 0`.
  - `test_cloud_no_event` (Review Focus 1): toată producția × 0,2 timp de 30 de minute → niciun eveniment.
  - `test_grid_outage` (Review Focus 2): tensiunea 0 la toți timp de 20 de minute → un eveniment `grid_outage` per casă, niciun `equipment`.
  - `test_volt_watt_detected`: o casă cu `volt_watt=True` → evenimente `volt_watt_curtailment` cu `lost_kwh > 0`.
  - `test_night_ignored` (Review Focus 5).
  - `test_5min_resolution` (Review Focus 4): pe datele agregate la 5 minute, același număr de evenimente și aceleași tipuri.
  - `test_lost_kwh_exact`: o casă de 6 kWp oprită 60 de minute, cu vecinii la 800 W/kWp → `lost_kwh == pytest.approx(4.8)`, `lost_lei == pytest.approx(4.8)`.
  - `test_data_gap_not_outage`: scoatem 60 de minute de citiri ale casei 4 la prânz → un singur eveniment `no_data`, cu `lost_kwh == 0`, niciun `equipment`.
  - `test_string_loss_detected`: `string_loss` la casa 2 (jumătate de string inactiv) → casa e „on”, dar `p_ac` ≈ 50% din așteptat toată ziua; apare ca `equipment` cu `evidence["pattern"] == "partial_output"`. În pitch: verificarea din prima lună („o intrare PV n-a produs niciodată”), cazul real de pe r/panourifotovoltaice.
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 3: Commit** `feat: event extraction, grid-vs-equipment classification, lost energy`.

### Task 4: Stocare și simularea unei luni

**Files:** Create `sunproof/store.py`, `tests/test_store.py`

**Interfaces:**
- Produces: `Store(path: Path)` cu `upsert_sites`, `append_readings` (idempotent pe `site_id, ts`), `readings(site_id: str | None, start, end)`, `save_events(list[Event])`, `events(site_id: str | None = None, kind: str | None = None)`; și `simulate_month(store, cfg, pv, month: date, faults, seed) -> int` (rulează simulatorul zi cu zi, salvează citirile și evenimentele și returnează numărul de evenimente). Strada demo are 2 străzi × 12 case; pe a doua, `v_tx = 236`, fără supratensiune, dar cu 2 defecte de echipament.

- [ ] **Step 1: Teste:** `test_idempotent`; `test_month_has_both_kinds` (iulie 2020: strada A are evenimente `grid_overvoltage`, strada B are exact 2 evenimente `equipment`).
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 3: Commit** `feat: SQLite store and month simulation`.

### Task 5: Dosarul de sesizare

**Files:** Create `sunproof/dossier.py`, `tests/test_dossier.py`

**Interfaces:**
- Consumes: `Store`, `Event`, `monthly_summary`, `LLM`
- Produces:
  - `Owner(name: str, address: str, county: str, pod_code: str, email: str)`; `distributor_for(county) -> str` citește `DISTRIBUTOR_BY_COUNTY` (un județ necunoscut ridică eroare, nu ghicește). Scrisoarea e adresată distribuitorului din județul casei
  - `DossierFacts(owner: Owner, period: tuple[date, date], events: list[Event], n_events: int, lost_kwh: float, lost_lei: float, v_max: float, peers_confirmed: int)`
  - `build_facts(store, site_id, owner, start, end) -> DossierFacts` (doar evenimentele `grid_overvoltage` și `volt_watt_curtailment`)
  - `draft_letter(facts, llm) -> str`: textul scrisorii în română. După generare, codul verifică faptul că numărul de evenimente, kWh-ul și tensiunea maximă apar exact. Dacă nu, rescrie paragraful de fapte dintr-un șablon fix.
  - `render_pdf(facts, letter: str, out: Path) -> Path`: pagina 1 e scrisoarea; pagina 2, tabelul evenimentelor (data, ora, durata, tensiunea maximă, vecini afectați, kWh); pagina 3, graficul tensiunii pe zilele cu evenimente, cu linia de 253 V.

- [ ] **Step 1: Teste:**
  - `test_distributor_by_county`: `CJ` → Distribuție Energie Electrica România, `IS` → Delgaz Grid, `TM` și `B` → Rețele Electrice, `DJ` → Distribuție Energie Oltenia; toate cele 42 de coduri au un distribuitor; un cod necunoscut ridică `KeyError`.
  - `test_facts_only_grid_events`: evenimentele `equipment` nu apar în dosar.
  - `test_letter_numbers_enforced`: un `FakeLLM` care inventează „15 opriri” când sunt 23 → textul final conține „23”, nu „15”.
  - `test_pdf_created`: fișierul are 3 pagini și conține codul POD.
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 3:** Rulare reală cu LLM-ul. Citiți scrisoarea: trebuie să ceară verificarea calității tensiunii și remedierea, iar temeiul legal să fie formulat prudent până verificați Ordinul 46/2021.
- [ ] **Step 4: Commit** `feat: grid complaint dossier with verified facts`.

### Task 6: Partea de O&M (tichete, Telegram, deplasări evitate)

**Files:** Create `sunproof/om.py`, `tests/test_om.py`

**Interfaces:**
- Consumes: `Store`, `Event`
- Produces:
  - `Ticket(ticket_id: int, site_id: str, opened: pd.Timestamp, status: Literal["open","acknowledged","fixed","verified","reopened","insufficient_evidence"], lost_lei_per_day: float, source: Literal["detector","client"] = "detector", verdict: str | None = None, fixed_at: pd.Timestamp | None = None)`
  - `sync_tickets(store) -> list[Ticket]`: din evenimente `equipment`, unul singur deschis per casă
  - `client_ticket(store, site_id, text, ts) -> Ticket`: tichetul trimis de prosumator din panoul lui. Atașează automat verdictul SunProof pentru ziua respectivă (de exemplu „rețea, nu echipament, fără deplasare” dacă ziua are doar `grid_overvoltage`) și datele zilei
  - `mark_fixed(store, ticket_id, ts)` și `verify_tickets(store, today) -> list[Ticket]`: o zi „utilizabilă” are date complete și `expected_power` peste 30% din maximul sezonier. Un tichet `fixed` devine `verified` după `VERIFY_DAYS` (config, 2) zile utilizabile fără eveniment `equipment` la acea casă; dacă apare unul, devine `reopened`, cu noul eveniment în dovezi, și trimite din nou alerta; dacă după `VERIFY_MAX_DAYS` (config, 5) zile nu s-au strâns zilele utilizabile, devine `insufficient_evidence` și rămâne în lista O&M cu mesajul „nu putem confirma încă: zile înnorate sau fără date”
  - `avoided_truck_rolls(store, start, end) -> int`: câte case au avut opriri de tip rețea, dar niciun defect de echipament (fără monitorizare, fiecare ar fi fost un apel „nu-mi merge sistemul”)
  - `feeder_status(store, day) -> pd.DataFrame` (`feeder_id, lat, lon, status ∈ {"ok","overvoltage","equipment"}, n_events`)
  - store-and-forward: `queue(store, text)`, `flush(store, send) -> int`, `telegram_sender(token, chat_id)`, cu aceleași reguli ca în brief-ul colegului: se oprește la primul eșec și păstrează ordinea
  - `distributor_report(store, feeder_id, start, end) -> str`: rezumatul agregat pe stradă, pe care furnizorul îl poate trimite distribuitorului

- [ ] **Step 1: Teste:** `test_tickets_only_equipment` (luna simulată → 2 tichete, ambele pe strada B); `test_avoided_truck_rolls` (strada A → numărul caselor cu opriri doar din cauza rețelei); `test_flush_stops_on_failure`; `test_flush_resumes`; `test_feeder_status` (A = `overvoltage`, B = `equipment`); `test_ticket_verified_after_clean_days` (fix în ziua 1, zilele 2–3 curate → `verified`); `test_ticket_reopens_on_relapse` (fix în ziua 1, defectul revine în ziua 2 → `reopened`, o alertă nouă în coadă); `test_ticket_insufficient_evidence` (fix în ziua 1, zilele 2–6 înnorate, cu producția vecinilor la 10% → `insufficient_evidence`, nu `verified`); `test_no_data_no_ticket` (o pauză de date nu deschide tichet); `test_client_ticket_gets_verdict` (tichet de client într-o zi cu doar `grid_overvoltage` → `verdict` conține „rețea”).
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 3:** Verificare reală: alerta pentru defectul de echipament ajunge pe telefon.
- [ ] **Step 4: Commit** `feat: O&M tickets, feeder map data, avoided truck rolls, Telegram`.

### Task 7: Copilotul prosumatorului

**Files:** Create `sunproof/copilot.py`, `tests/test_copilot.py`

**Interfaces:**
- Produces: uneltele `day_timeline(site_id, day)`, `events(site_id, start, end, kind=None)`, `month_summary(site_id, month)`, `compare_neighbours(site_id, day)`; plus `ask(question, site_id, llm_client) -> tuple[str, list[str]]` (maximum 5 runde de unelte; promptul de sistem interzice cifre care nu vin din unelte)

- [ ] **Step 1: Teste** (cu un client LLM fals): `test_ask_calls_day_timeline` (întrebarea „de ce n-am produs azi la prânz” → `day_timeline`); `test_round_limit`; `test_tools_return_kinds` (răspunsul `events` conține tipul în română: „supratensiune în rețea”).
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 3: Commit** `feat: prosumer copilot with tools`.

### Task 8: Scriptul de demo și sincronizarea cu site-ul (fără Streamlit)

**Decizie (Alex, 24.10, 10:28):** interfața din demo e **site-ul MVP**. Motorul Python face partea reală (detecția, PDF-ul, Telegram, evaluarea) și se rulează dintr-un script. Streamlit nu se mai construiește.

**Files:** Create `sunproof/demo.py`, `tests/test_demo.py`. La primul commit de cod: Delete `ui/app.py` și `tests/test_ui_smoke.py`, scoate `streamlit` și `pydeck` din `pyproject.toml` și `requirements.txt`.

**Interfaces:**
- `python -m sunproof.demo <comandă> [--city bucuresti] [--seed 1]`, cu comenzile:
  - `day`: simulează `DEMO_DAY` pe străzile A și B, salvează în SQLite și tipărește în română opririle clasificate (rețea / echipament / lipsă date), kWh și lei
  - `fault --site B5`: injectează defectul de invertor, rulează ziua, deschide tichetul și trimite alerta pe Telegram (sau o pune în coadă dacă nu e rețea)
  - `dossier --site A10`: generează PDF-ul real de sesizare în `out/`, adresat distribuitorului din județ
  - `battery --site A10 --intent 0.2 --setting 0.8`: constatările bateriei și regresia după schimbarea de setare
  - `verify --ticket N --days 2 [--cloudy]`: marchează reparația și arată `verified` / `reopened` / `insufficient_evidence`
  - `eval`: acuratețea la 1 și la 5 minute și alarmele false pe date reale
  - `export`: scrie `out/site_numbers.json` cu cifrele-cheie (`lost_kwh`, `lost_lei`, `avoidable_import_lei`, `missed_lei`, numărul de opriri pe casă, verdictele), ca să le comparăm cu site-ul, plus cheia `fleet` pentru harta furnizorului: pe județ și oraș, numărul de case și de probleme pe tipuri (`grid`, `fault`, `battery`, `no_data`); pe post, poziția aproximativă, cea mai gravă problemă și casele în ordinea de pe linie, cu tensiunea la fiecare oră și starea
- Toate textele tipărite sunt în română; cifrele vin doar din module, nimic calculat în `demo.py`.

- [ ] **Step 1: Teste:** `test_demo_day_prints_kinds` (ieșirea conține „supratensiune în rețea” și „defect de echipament” după `fault`); `test_demo_dossier_creates_pdf`; `test_export_has_keys` (inclusiv `fleet`); `test_fleet_counts_match_verdicts` (suma problemelor pe orașe din `fleet` e egală cu numărul de verdicte).
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 3: Sincronizare:** rulează `export` și compară cu cifrele din `sunproof-mvp.html`. Orice diferență se corectează în site (Python e sursa adevărului).
- [ ] **Step 4:** Parcurge scenariul demo de două ori, fără erori: site-ul pe ecran, iar la pașii cu PDF și Telegram rulăm scriptul și arătăm PDF-ul și telefonul.
- [ ] **Step 5: Commit** `feat: demo CLI and site number export; drop Streamlit`.

### Task 9: Evaluarea (slide-ul de dovezi)

**Files:** Create `sunproof/evaluate.py`, `tests/test_evaluate.py`

**Interfaces:**
- Produces: `run_eval(n_days: int = 30, seed: int = 1, resolution_min: int = 1) -> dict`: rulează simulatorul pe zile cu `v_tx` aleator în [236, 242] și 0–2 defecte de echipament injectate aleator pe zi, apoi compară clasificarea cu adevărul de teren. Returnează matricea de confuzie rețea/echipament, acuratețea și eroarea medie a `lost_kwh` față de energia reală pierdută din simulator.

- [ ] **Step 1: Teste:** `test_eval_deterministic`; `test_eval_has_confusion_keys`.
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
  - `false_alarm_rate(readings_real: pd.DataFrame, sites) -> dict`: rulează detectorul pe date reale de la case adevărate (StoreNet sau Open Power System Data, descărcate de pe laptop), unde nu există opriri cunoscute, și numără evenimentele `equipment` (fiecare e o alarmă falsă). Acest test nu depinde de simulatorul nostru și răspunde la „acuratețea e circulară”.

- [ ] **Step 1b: Test:** `test_false_alarm_rate_zero_on_clean`: o săptămână de citiri fără opriri, cu nori → `equipment == 0`.
- [ ] **Step 3:** Rulează la 1 și la 5 minute; cifrele merg pe slide („97% din opriri clasificate corect, și la date la 5 minute”). Calibrează pe seed 1, raportează pe seed 2. Rulează `false_alarm_rate` pe datele reale și pune numărul lângă acuratețe.
- [ ] **Step 4: Commit** `feat: classification evaluation and real-data false alarms`.

### Task 9b (opțional, după interviuri, ~2–3h): stratul statistic peste vecini

Nu e un model antrenat. Pentru fiecare casă, `residual = p_ac / expected_power` pe zile însorite; un scor de abatere robust pe 7 zile (mediană și MAD) semnalează **derive lente** (murdărie, un string care cedează) ca `drift` (info, fără tichet automat). Regulile din Task 3 rămân singurele care decid rețea vs. echipament.

- [ ] **Teste:** `test_drift_detected` (producție care scade cu 2% pe zi timp de 10 zile → `drift`); `test_no_drift_on_clouds` (zile înnorate la toată strada → nimic).
- [ ] **Commit** `feat: optional statistical drift layer over peer residuals`.

---

### Task 10: Invertor vs. contor vs. factură

**Files:** Create `sunproof/reconcile.py`, `data/bills/2020-07.json`, `data/bills/2020-08.json`, `tests/test_reconcile.py`

**Interfaces:**
- Consumes: ieșirea simulatorului. Task 2 adaugă coloana `load_w` (adevărul de teren, doar în simulare)
- Produces:
  - `meter_curve(readings) -> pd.DataFrame` (`site_id, ts` la 15 min, `import_kwh`, `export_kwh`), în formatul exportului distribuitorului
  - `derive_consumption(production_kwh: pd.Series, meter: pd.DataFrame) -> pd.Series`: producție + import − export, pe intervale de 15 min
  - `Bill(site_id: str, month: date, injected_kwh: float, injected_price_lei: float, consumed_kwh: float)` și `load_bills(folder) -> list[Bill]`
  - `Finding(kind: Literal["export_not_billed","export_price_zero","meter_inverter_mismatch"], month: date, amount_lei: float, explanation_ro: str, evidence: dict)`
  - `reconcile(production_kwh_month: float, meter_month: dict, bill: Bill) -> list[Finding]`. Reguli: `injected_kwh < 0.98 · export` → `export_not_billed`, cu `amount = (export − injected) · REF_EXPORT_LEI_PER_KWH`; `injected_price_lei == 0` cu export > 0 → `export_price_zero`, cu `amount = export · REF_EXPORT_LEI_PER_KWH`; export > producție → `meter_inverter_mismatch` (date desincronizate, fără sumă). `REF_EXPORT_LEI_PER_KWH = 0.50` în `config.py` (demo).

- [ ] **Step 1: Teste:**
  - `test_derive_consumption_exact`: producție 2,0, import 0,5, export 1,2 → consum 1,3 kWh; pe o zi simulată, consumul derivat e egal cu `load_w` integrat (±1%).
  - `test_export_not_billed`: export 300 kWh, facturat 255 → `amount_lei == pytest.approx(22.50)`.
  - `test_export_price_zero`: export 300 kWh la preț 0 → `amount_lei == pytest.approx(150.0)`.
  - `test_correct_bill_no_findings`.
  - `test_export_exceeds_production`: export 310, producție 300 → `meter_inverter_mismatch`.
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 3: UI:** ecranul „Invertor · Contor · Factură”: trei coloane pe lună (produs, injectat pe contor, injectat pe factură), consumul derivat, constatările în lei și butonul „Adaugă în sesizare către furnizor”.
- [ ] **Step 4: Commit** `feat: inverter-meter-bill reconciliation and derived consumption`.

### Task 11: „Cine vede ce” (consimțământ și jurnal de acces)

**Files:** Create `sunproof/consent.py`, `tests/test_consent.py`

**Interfaces:**
- Produces:
  - `Scope = Literal["voltage_events","trip_events","alerts","battery_delivery","production_hourly","consumption"]`
  - `Grant(site_id: str, party: Literal["distribuitor","furnizor","om"], scopes: set[Scope], expires: date | None)`
  - `DEFAULT_GRANTS`: distribuitor = {voltage_events, trip_events}; om = {alerts, trip_events}; furnizor = {battery_delivery}
  - `set_grant(store, grant)`, `revoke(store, site_id, party)`
  - `share(store, party, site_id, scope: Scope) -> pd.DataFrame | None`: returnează datele doar dacă scope-ul e acordat și neexpirat și scrie în `access_log` (`ts, party, site_id, scope, allowed`)
  - `distributor_report` (Task 6) și `build_facts` (Task 5) citesc datele pentru distribuitor **doar prin `share`**

- [ ] **Step 1: Teste:**
  - `test_distributor_cannot_see_consumption` → `None`, iar încercarea apare în jurnal cu `allowed=False`.
  - `test_revoke` → după revocare, `voltage_events` dă `None`.
  - `test_expired_grant`.
  - `test_report_respects_consent`: fără grant, raportul pe stradă exclude casa respectivă.
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 3: UI:** ecranul „Cine vede ce”: un tabel părți × categorii cu comutatoare, jurnalul de acces și mențiunea „Fără parola invertorului. Conform EU Data Act”. Livrarea din baterie (programul cu bonus) apare ca rând, dar rămâne viziune: datele de baterie nu sunt construite.
- [ ] **Step 4: Commit** `feat: prosumer-controlled data sharing with access log`.

---

### Task 12: „Bateria ta face ce trebuie?”

**Files:** Create `sunproof/battery.py`, `tests/test_battery.py`

**Interfaces:**
- Consumes: citirile cu `soc` și `p_batt_w` (Task 2), `Store`, `share` (Task 11)
- Produces:
  - constante în `config.py`: `PROGRAM_WINDOW = (19, 21)` (ore locale), `CHARGE_WINDOW = (11, 16)`, `BONUS_LEI_PER_KWH = 0.40` (demo: pilotul Electrica din august 2026), `PROGRAM_RESERVE = 0.2`
  - `OwnerIntent(reserve: float = 0.2, evening_use: bool = True, in_program: bool = False)`: ce a vrut proprietarul, introdus de el la configurare. `Battery.reserve` rămâne setarea reală din invertor
  - `BatteryFinding(site_id: str, day: date, kind: Literal["not_charging_midday","full_before_noon","no_evening_delivery","reserve_violation","reserve_mismatch","holding_owner_reserve"], severity: Literal["alert","info"], missed_lei: float, avoidable_import_lei: float, evidence: dict)`
  - `check_day(readings_site_day: pd.DataFrame, battery: Battery, intent: OwnerIntent, day: date) -> list[BatteryFinding]`. Reguli noi, întâi: `reserve_mismatch` (alertă) dacă `battery.reserve > intent.reserve + 0.05` și casa importă din rețea seara (18–23) cât timp `soc` stă la rezerva setată; `avoidable_import_lei = min(import seara, (battery.reserve − intent.reserve) · capacity) · LEI_PER_KWH`; `evidence` are setarea, intenția, orele și kWh. `holding_owner_reserve` (info, fără alertă) dacă bateria stă la rezervă, dar rezerva e cea aleasă de proprietar. Regulile de program (`no_evening_delivery` și `missed_lei`) rulează doar dacă `intent.in_program`. Celelalte reguli: `full_before_noon` dacă `soc ≥ 0.95` înainte de 11:00 locală într-o zi însorită; `not_charging_midday` dacă `soc` crește cu mai puțin de 30% din capacitate în `CHARGE_WINDOW` deși casa exportă; `no_evening_delivery` dacă energia descărcată în `PROGRAM_WINDOW` e sub 50% din energia disponibilă peste rezervă la ora 19; `reserve_violation` dacă `soc < reserve − 0.02`. `missed_lei = (livrare posibilă − livrare reală) · BONUS_LEI_PER_KWH`, unde livrarea posibilă = `min((soc_19 − reserve) · capacity, max_kw · durata ferestrei)`
  - `delivery_report(store, site_id, month) -> pd.DataFrame` (pe zile: kWh livrați în fereastră, verificați din `p_batt_w`) pentru furnizor, accesibil doar prin `share(..., scope="battery_delivery")`

- [ ] **Step 1: Teste:**
  - `test_evening_program_ok`: baterie de 10 kWh, plină la 19:00, 5 kW → livrează 8 kWh între 19 și 21, nicio constatare.
  - `test_never_discharges`: același scenariu cu `never_discharges` → `no_evening_delivery`, `missed_lei == pytest.approx(3.20)` (8 kWh × 0,40).
  - `test_full_before_noon`: `full_by_morning` într-o zi însorită → `full_before_noon`.
  - `test_battery_reduces_trips`: pe strada demo, casele de la capăt cu `evening_program` au strict mai puține opriri din supratensiune decât aceleași case cu `full_by_morning`. Acesta e argumentul care leagă bateria de rețea.
  - `test_delivery_report_needs_consent`: fără grantul `battery_delivery`, furnizorul primește `None`.
  - `test_reserve_mismatch`: intenție 20%, setare 80%, baterie de 10 kWh, casa importă 4 kWh seara → `reserve_mismatch` (alert), `avoidable_import_lei == pytest.approx(4.0)` (min(4, 6) kWh × 1,00 demo).
  - `test_intended_high_reserve_no_alert`: aceleași date, dar intenție 80% → doar `holding_owner_reserve` (info), nicio alertă. Aceleași măsurători, alt verdict.
  - `test_fixed_setting_clears`: după schimbarea setării la 20%, ziua următoare nu mai are `reserve_mismatch`.
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 3: UI:** ecranul „Bateria”: un rând „Ce ai vrut: rezervă 20%, seara din baterie” lângă „Ce e setat: 80%”; curba SoC pe zi, cu ferestrele de încărcare și program evidențiate; constatările, importul evitabil și (dacă e în program) bonusul ratat în lună; un comutator „configurare corectă / greșită” care rerulează ziua și arată efectul asupra opririlor și a banilor.
- [ ] **Step 3b (doar dacă e timp după H16, primul care se taie):** „Mi-ar trebui o baterie mai mare?”: reluăm luna în simulator cu 15 kWh în loc de 10 și arătăm câți kWh în plus s-ar fi stocat. Dacă panourile nu produc surplusul, răspunsul e „nu, îți lipsește energie, nu stocare”. Legătura cu Casa Verde Baterii.
- [ ] **Step 4: Commit** `feat: battery behaviour checks and verified evening delivery`.

### Task 12b: Istoricul setărilor („a început după o schimbare”, ~1h)

**Files:** Modify `sunproof/store.py`, `sunproof/battery.py`, `tests/test_battery.py`

**Interfaces:**
- Produces:
  - `SettingChange(site_id: str, ts: pd.Timestamp, field: str, old: float | str, new: float | str, source: Literal["adapter","installer","owner"])`; `Store.save_setting_change(...)` și `Store.settings_history(site_id)`. În simulare, schimbarea vine din panoul demo; în produs, din `adapter.settings()` citit zilnic (diferența față de ziua anterioară)
  - `check_regression(store, site_id, change: SettingChange, window_days: int = 7) -> BatteryFinding | None`: compară media zilnică a importului seara (18–23) în `window_days` înainte și după schimbare. Constatare `setting_change_regression` (alertă) dacă importul crește cu cel puțin 1 kWh/zi **și** producția medie zilnică s-a schimbat cu mai puțin de `REGRESSION_PROD_TOL` (config, 0.15). Altfel, nimic (schimbarea nu explică diferența, de exemplu vremea)
- [ ] **Step 1: Teste:**
  - `test_regression_after_setting_change`: rezerva trece de la 0,2 la 0,8 pe 3 iulie; importul seara e 0,5 kWh/zi înainte și 4,0 după; producția variază cu 5% → `setting_change_regression`, `evidence["changed_on"] == date(2020, 7, 3)`, `evidence["delta_kwh_per_day"] == pytest.approx(3.5)`.
  - `test_no_regression_if_production_dropped`: aceeași schimbare, dar producția scade cu 40% → `None`.
- [ ] **Step 2:** Rulează → FAIL; implementează; → PASS.
- [ ] **Step 3: UI:** pe ecranul „Bateria”, o linie verticală pe graficul importului la data schimbării, cu textul „Rezerva: 20% → 80% pe 3 iulie. De atunci, +3,5 kWh/zi din rețea seara.”
- [ ] **Step 4: Commit** `feat: settings history and regression after a setting change`.

### Task 13 (opțional, candidat): „Cât valorează ora” cu prețurile OPCOM PZU

**Files:** Create `sunproof/prices.py`, `tests/test_prices.py`

**Interfaces:**
- Produces: `load_pzu(path: Path) -> pd.Series` (lei/MWh pe oră, ora locală); `hour_value(day: date, prices) -> pd.Series` (lei/kWh); `value_of_shift(kwh: float, from_hour: int, to_hour: int, day, prices) -> float` (cât valorează mutarea unui kWh de la prânz la seară).
- Folosire: pe ecranul „Bateria” și în panoul clientului, „energia ta de la 13:00 valora X lei/kWh, cea de la 20:00 Y lei/kWh”. **Testele cu valori exacte din Task 12 rămân pe `LEI_PER_KWH`**, iar PZU apare doar ca a doua coloană, marcată cu sursa și data.
- [ ] **Teste:** `test_load_pzu_24_hours`; `test_hour_value_units` (500 lei/MWh → 0,50 lei/kWh).
- [ ] **Commit** `feat: OPCOM PZU hourly value (optional)`.

---

## Site-ul MVP și panourile

Site-ul (`/mnt/project-files/mvp/sunproof-mvp.html`, publicat la același [link](https://claude.ai/artifact/KCkrh4oGRfkekbuWDZqrZ4)) prezintă funcționalitățile startup-ului și e fața demo-ului.

**Tema, din 24.10: stilul AirlineSim.** Alex a cerut ca tot site-ul să preia stilul panoului AirlineSim (studiul de caz Phenomenon Studio). Planul complet, cu schița ecranului principal și a ecranului de zonă, e în [panoul furnizorului în stilul AirlineSim](https://claude.ai/artifact/LZtXDj8iEkqmdMzeXtK8fV). Pe scurt: temă întunecată neutră (fundal `#0B0D12`, carduri `#121722`), font Inter cu cifre tabulare, widgeturi mici în loc de tabele, bară laterală cu numărul de lucruri care așteaptă, bară de sus cu zona, cipurile „Seara din baterii” și „De răspuns N” și ceasul simulării, alerte după urgență în patru culori (roșu urgent, violet rețea, galben bani, verde vești bune). Tema de zi și varianta pe mobil rămân. Stilul noda.energy nu se mai folosește.

- **Landing-ul** rămâne simplu, pentru furnizori, cu login ca prosumator sau ca furnizor.
- **Panoul furnizorului**, un „dispecerat”. **Panou:** harta României pe județe (SVG inline din Natural Earth, ~37 KB, fără Leaflet și fără internet), cu un inel pe oraș împărțit pe tipuri de probleme și un verdict de o propoziție deasupra; pe margini, „Seara de ieri”, „Unde au plecat problemele azi”, „Ziua în ferestre”, Inbox și Termene. **Alegerea zonei** (fără radar, Alex 24.10: nu ne ocupăm de nimic aerian): clic pe județ, lista „Alege zona” sau căutare după județ, oraș, post sau client; harta se apropie pe zonă, cu posturile colorate după cea mai gravă problemă, iar dreapta arată „De rezolvat în zonă” și distribuitorul zonei. La clic pe post, **casele pe linie**: de la post la capăt, colorate după tensiune, cu pragul de 253 V, ca dovadă „rețea, nu echipament”. **De rezolvat:** tichetele cu verdictul SunProof atașat, Preia/Rezolvat, verificarea reparației din date. **Baterii:** casele cu bateria setată altfel decât vrea clientul, ca niște carduri de ofertă. **Facturi:** explicația gata scrisă pentru call center. **Rețea:** posturile cu supratensiune, sesizările și răspunsurile distribuitorului, raportul lunar și contorul „deplasări inutile evitate”.
- **Panoul clientului** (tabul „Acasă”) primește aceeași temă și păstrează conținutul: cifrele zilei, graficul producție și consum față de așteptat, graficul bateriei, alertele cu acțiune și formularul „Trimite o problemă echipei O&M”.
- **Ce păstrăm din site-ul de acum**, mutat în noile pagini: cronologia, chatul care își verifică cifrele, dosarul către distribuitorul din județ, selectorul de 5 orașe (devine selectorul de zonă din bara de sus) și secțiunea „Plătește furnizorul, per casă” de pe landing. Harta străzilor cu Leaflet e înlocuită de zoomul pe județ și de casele pe linie.
- **Regula de design:** fiecare widget răspunde la o singură întrebare a furnizorului și se termină cu o acțiune. Un widget fără acțiune nu intră.
- **Datele pentru hartă** vin din `python -m sunproof.demo export`, cheia `fleet` (Task 8). Până atunci, site-ul folosește o constantă `FLEET` etichetată „demo”.
- **Construcția** se face într-o copie a site-ului (cu backup), după aprobarea lui Alex, iar linkul publicat se schimbă doar când merg cap-coadă tema, harta cu alegerea zonei și „De rezolvat”.
- **Regula:** cifrele din site (simularea JS) trebuie să rămână egale cu cele ale motorului Python (`lost_kwh == 4.8`, `missed_lei == 3.20`, `avoidable_import_lei == 4.0`). Dacă una se schimbă în Python, se schimbă și în site.

## Prezentarea: 4 grafice, fiecare cu o singură concluzie

Concluzia stă scrisă deasupra graficului. Pe fiecare grafic scrie ce e real și ce e simulat.

1. **„Bateriile cresc mai repede decât oricine le verifică.”** Prosumatori și baterii, iunie–august 2026, din ANRE (127.084 → 151.040 baterii, ~24.000 în 2 luni). Date reale.
2. **„Prânzul e și cel mai bun moment, și cel mai riscant.”** Producția PVGIS pe o zi de iulie în 5 orașe, peste tensiunea pe stradă. Producția e reală, tensiunea simulată. Are nevoie de PVGIS descărcat de pe laptop.
3. **„Capătul străzii se oprește primul, deși panourile sunt bune.”** Tensiunea maximă casă cu casă pe strada demo. Simulat.
4. **„Ce pierde omul.”** kWh și lei pierduți pe zi, plus bateria setată greșit (≈3,39 lei/zi în site). Simulat, cu formula la vedere.

Înaintea lor, slide-ul care contează cel mai mult: **„X din Y prosumatori au avut opriri, Z nu știau”**, cu 2 citate exacte din interviuri.

---

## Program pentru 2 oameni

P1 = simulator, detector, evaluare. P2 = dosar, O&M, UI, copilot. Interviurile le faceți amândoi.

| Interval | P1 | P2 | Interviuri |
|---|---|---|---|
| H0–1 | `download_data.sh`, Task 1 | Botul Telegram, scheletul `demo.py` | Mesaje în 2–3 grupuri de prosumatori de pe Facebook și către 3–5 instalatori |
| H1–5 | **Task 2** (inclusiv bateria) + calibrare | Task 4, ecranul „Azi” pe date mock | 2 apeluri |
| H5–9 | **Task 3** | Task 5 (dosarul) | 2 apeluri |
| **H9** | **Checkpoint: o zi simulată → opriri clasificate pe ecran → PDF generat** | | |
| H9–13 | **Task 12** (cu intenția proprietarului), Task 12b, Task 9 (cu alarmele false pe date reale) | Task 6 (verificat / redeschis / dovezi insuficiente, tichetele clientului), Task 0b, harta O&M, ecranul „Bateria” | 2 apeluri |
| H13–16 | Task 10, absorbția inteligentă, Task 9b sau 13 dacă e timp | Task 11, Task 8 (scriptul de demo), sincronizarea cifrelor cu site-ul, Task 7 dacă e timp | Ultimele apeluri |
| **H16** | **Feature freeze** | | |
| H16–19 | Cifrele finale, cele 4 grafice, video backup | Slide-uri, citate | |
| H19–21 | Repetiție generală, cronometrată | | |
| H21–24 | Buffer și somn | | |

**Dacă suntem în urmă la H13, tăiem în ordinea asta:** prețurile PZU (Task 13), stratul statistic (Task 9b), „baterie mai mare?” (Task 12, Step 3b), copilotul (Task 7), detectarea volt-watt, absorbția inteligentă (rămâne pe slide), Task 11 (rămâne un ecran static), apoi Task 10 (reconcilierea rămâne pe slide). **Nu tăiem** simulatorul cu baterie, clasificarea rețea/echipament (cu „lipsă date”), dosarul PDF adresat după județ, verificarea bateriei (Task 12) și tichetele O&M cu verificarea reparației.

## Întrebări pentru interviuri

- **Prosumatori:** De câte ori s-a oprit invertorul luna asta? De unde ai aflat? La ce oră se întâmplă? Ai făcut sesizare la distribuitor? Cum ai dovedit problema? Ce ți-au răspuns și în cât timp? Ai folosi un dosar generat automat?
- **Baterie (2026):** Ți-ai pus baterie anul ăsta sau te gândești la Casa Verde Baterii? Are aplicație separată? Știi dacă se descarcă seara? Ce ai vrut să facă bateria (rezervă pentru pană, seara, mașina) și ți-a arătat instalatorul că face asta? Ai avut seara „bateria plină, dar iau din rețea”? Ai intrat în programul Electrica din august și cum ai setat-o? Știi cât îți datorează furnizorul pentru surplus? Pentru furnizor: cum verificați că bateriile din program chiar livrează seara?
- **Fragmentare și date:** Câte aplicații sau portaluri folosești pentru panouri, baterie și factură? Arată-mi pe telefon (numărați voi). Ți s-a întâmplat ca factura să nu se potrivească cu aplicația? Ai acces de administrator la invertor sau doar instalatorul? Ți-a cerut cineva parola?
- **Instalatori și O&M:** Câte apeluri de tip „nu-mi merge sistemul” primiți pe lună? Câte erau de fapt supratensiune? Cât costă o deplasare? Ce vă cer distribuitorii? Cât de târziu aflați de un defect (întrebare din brief)? De câte ori ați declarat ceva „rezolvat” și a revenit?
- **Momentul consumului (din brief):** Cum decizi când pornești mașina de spălat, boilerul sau mașina electrică? Cât crezi că pierzi pentru că le pornești seara?
- **Setări:** Ți-a schimbat cineva setările bateriei sau ale invertorului (instalatorul, o actualizare)? Ai aflat? După cât timp?
- **Instalatori, cu o mostră:** arătați-le dosarul și tichetul cu dovezi. „V-ar fi scutit o deplasare sau o întrebare în plus către client?”
- **Pe cine să sunați:** autorii postărilor din research (r/panourifotovoltaice: intrare PV inactivă, „consum din rețea cu bateria plină”, primele 10 luni; Softpedia: SmartGuard, 15–20 de deplasări). Scrieți-le în H0–1; o poveste confirmată la telefon valorează mai mult decât un link.
- Notați pentru fiecare: citatul exact, numărul de opriri, durata până la detecție, suma pierdută, dacă a făcut sesizare și ce rezultat a avut.

## Scenariul demo (3 minute)

1. **0:00–0:25:** citatul unui prosumator („în orele de vârf nu produc nimic”) și cifra din interviuri („X din Y au opriri și nu știau”).
2. **0:25–1:10:** modul Prosumator, ziua de 15 iulie: la 12:40 tensiunea trece de 253 V și trei case de la capătul străzii se opresc în același minut. Eticheta spune „Problemă de rețea, confirmată de 2 vecini”. Butonul generează PDF-ul de sesizare, pe care îl arătăm pe ecran.
3. **1:10–1:40:** panoul demo: injectăm un defect de invertor la casa 5 de pe strada B. Eticheta spune „Defect de echipament”, iar mesajul ajunge pe Telegram la tehnician.
4. **1:40–2:05:** panoul furnizorului: harta României cu inelele pe orașe, clic pe București și Ilfov, harta se apropie pe județ, apoi clic pe PT 2041: în casele pe linie, A10–A12 de la capăt sunt peste 253 V și oprite, iar PT 1187, cu casa B5, e roșu pe hartă. Contorul „deplasări inutile evitate: 7”.
5. **2:05–2:25:** „Bateria”: proprietarul a vrut rezervă 20%, invertorul e setat la 80%. „Bateria e plină, dar iei din rețea seara: 4 lei pe zi.” Schimbăm intenția la 80% și verdictul devine „îți păstrează rezerva aleasă”, fără alertă: aceleași date, alt răspuns. Apoi setarea corectă: 3 opriri mai puțin la prânz și, într-un program de tip Electrica (pilot august 2026), 3,20 lei bonus pe seară. „Bateria bine setată ajută și rețeaua.”
5a. **(10 s):** pe graficul bateriei, linia „Rezerva: 20% → 80% pe 3 iulie” arată când a început importul seara.
5b. **(opțional, 10 s):** tichetul O&M de la pasul 3 e marcat „rezolvat”; după două zile simulate fără defect devine „verificat”. Cu zile înnorate, rămâne „dovezi insuficiente”, nu „verificat”.
5c. **2:25–2:32:** „Invertor · Contor · Factură”: în august, energia injectată apare pe factură la preț zero, adică 150 lei. Consumul casei e calculat fără niciun contor nou.
6. **2:32–2:40:** „Cine vede ce”: retragem accesul distribuitorului la consum, iar jurnalul arată încercarea refuzată. „Dovezi pentru distribuitor, fără parola invertorului.”
7. **2:40–3:00:** slide-ul de dovezi (acuratețea clasificării) și modelul de business. Furnizorul îl oferă prosumatorilor ca serviciu de fidelizare și îl folosește intern pentru O&M. Distribuitorul primește un raport pe stradă, fără acces la invertoare.
