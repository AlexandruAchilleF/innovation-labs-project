# Kitul de prezentare: user testing la 09:00, pitch la 11:45

Pregătire (08:45): `./scripts/run_demo.sh`, apoi deschide `http://127.0.0.1:3000/harta?household=RO-TM-001`.
Backup dacă nu merge rețeaua: `demo-sunproof.mp4` (sau `.webm`) din rădăcina repo-ului, de 68 de secunde.
Dacă backend-ul cade în timpul demo-ului, aplicația trece singură pe date locale („Mod demonstrativ”) și arată aceleași cifre.

Toate cifrele de mai jos vin din motoarele aplicației (rulate pe 25.10) și din `2026-10-24-dovada-evaluare-81-scenarii.md`.

---

## A. User testing, 09:00 (5 minute)

**Regula:** tu taci, ei dau click. Nu explici ce e pe ecran. Dacă te întreabă ceva, răspunzi tot cu o întrebare: „Ce crezi că înseamnă?”.

| Minut | Ecran | Ce le spui (o singură propoziție) | Ce urmărești |
|---|---|---|---|
| 0:00–0:30 | — | „Lucrezi la un furnizor de energie. Un client a sunat nervos că i se oprește invertorul în orele de vârf ale producției solare. Află de ce.” | — |
| 0:30–2:00 | `/harta?household=RO-TM-001` | (nimic) | Văd casele roșii de pe același transformator? Deschid singuri **Analiză detaliată**? Apasă **Simulează soluția** și înțeleg comparația înainte/după? |
| 2:00–3:00 | `/triaj` | „Acum verifică bateria și factura la alți doi clienți: Mihai Radu și Dan Munteanu.” | Găsesc clientul în listă? Citesc verdictul înainte de grafic? |
| 3:00–4:15 | `/prosumator?household=RO-TM-001` | „Acum ești chiar clientul. Ce s-a întâmplat la tine azi?” | Observă că pagina se deschide pe momentul opririi? Folosesc butoanele **Avarie / Amiază / Seară**? Găsesc tab-ul **Pe zile** și butonul de tichet? |
| 4:15–5:00 | — | Cele 3 întrebări de mai jos | Notează cuvintele lor exacte |

**Cele 3 întrebări (exact așa, în ordinea asta):**

1. „Cu cuvintele tale: a cui era vina pentru oprirea din orele de vârf ale producției solare și de unde ai știut?”
2. „Care a fost momentul în care n-ai mai știut ce să faci sau unde să apeși?”
3. „Dacă ai fi furnizorul, ce ai face mâine dimineață cu ecranul ăsta? Ce ți-ar lipsi ca să-l folosești?”

**Notezi la fiecare:** citatul exact de la întrebarea 1, primul loc unde s-a blocat (ecran + element) și dacă a apăsat singur pe **Analiză detaliată** și pe **Simulează soluția** (da/nu).

---

## B. Pitch-ul de 60 de secunde (4 blocuri × 15 s)

Ține minte un cuvânt pe bloc: **SUNĂ → NIMENI → TREI → BANI**. Nu-l învăța pe de rost; spune ideea cu cuvintele tale.

**1. SUNĂ (0–15 s)**
> „E august, amiază, cer senin. Pe o stradă din Dumbrăvița, toate casele cu panouri trimit curent în rețea deodată, tensiunea urcă peste 253 de volți și invertoarele se opresc singure. Omul crede că i s-a stricat sistemul și sună la furnizor.”

**2. NIMENI (15–30 s)**
> „Instalatorul zice că e rețeaua, distribuitorul zice că e invertorul, și nimeni nu are dovezi. Un prosumator a povestit pe forum de 15–20 de vizite fără diagnostic. Și sunt aproape 386.000 de prosumatori în România, 4 din 10 cu baterie.”

**3. TREI (30–45 s)**
> „SunProof citește datele pe care invertorul și contorul le au deja și răspunde la trei întrebări. E rețeaua sau instalația? Stă bateria plină seara, când curentul e de opt ori mai scump? E corectă factura? Dacă vecinii s-au oprit în același minut, e rețeaua, și dosarul pentru distribuitor e gata.”

**4. BANI (45–60 s)**
> „Plătește furnizorul, per casă. Nu mai trimite tehnicianul degeaba, scurtează apelurile și primește mai multă energie seara din bateriile clienților. Pe 81 de case simulate, am găsit cauza corectă în toate cazurile, fără nicio alarmă falsă. Căutăm un furnizor pentru un pilot.”

---

## C. Demo-ul de 3 minute: ce apeși și ce spui

Ordinea e mereu aceeași: **o întrebare a clientului → verdictul → dovada → acțiunea**. Citește verdictul cu voce tare înainte să arăți graficul.

### 1. Harta furnizorului (`/harta?household=RO-TM-001`), ~60 s

**Ce arăți:** postul de transformare din Dumbrăvița, casele colorate după stare, panoul cu clientul Andrei Popescu.

> „Asta vede furnizorul dimineața. Andrei din Dumbrăvița a sunat că i s-a oprit invertorul. Înainte să trimitem pe cineva, ne uităm la vecini: 6 din cei 11 de pe același transformator s-au oprit în aceleași minute. Invertorul lui a văzut 257 de volți, peste limita de 253. Deci nu e casa lui, e rețeaua.”

Apasă **Analiză detaliată**.

> „Aici sunt cele trei verificări, cu cea mai importantă sus. 91 de minute de oprire azi, peste 9 kWh pierduți. Recomandarea e clară: nu trimiteți echipa, trimiteți dosarul la Rețele Electrice. Asta înseamnă 450 de lei economisiți pe o deplasare.”

Apasă **Descarcă dosarul tehnic pentru OD** și arată PDF-ul 5 secunde.

> „Dosarul e gata de trimis: opririle, tensiunea minut cu minut, vecinii afectați și energia pierdută.”

Apasă **Simulează soluția** (în panoul rețelei).

> „Putem arăta și distribuitorului ce ar rezolva problema, înainte și după. Nu doar reclamăm, venim cu dovada și cu soluția.”

### 2. Triajul (`/triaj`), ~60 s

Caută **Elena Ionescu** (Corbeanca), secțiunea **Tensiune & declanșări**.

> „Altă casă, alt verdict. Elena se oprește și ea, dar vecinii ei produc normal, iar tensiunea e sub limită. Problema e că invertorul are pragul setat la 245 de volți în loc de 253. E o setare, nu rețeaua. Tehnicianul primește alerta pe Telegram și o poate corecta de la distanță.”

Arată **Ciclul de viață al tichetului O&M** (în hartă, același caz are butonul **Alocă intervenție O&M (Telegram)**).

> „Tichetul nu se închide când zice tehnicianul, ci când datele arată că sistemul merge iar. Dacă defectul revine, se redeschide singur. Dacă e înnorat și nu putem confirma, spunem asta, nu «rezolvat».”

Caută **Mihai Radu** (Cluj-Napoca), secțiunea **Stocare & arbitraj PZU**.

> „Mihai a vrut să folosească bateria seara. Dar bateria e pe modul de rezervă și păstrează 85% în loc de 15%. Seara cumpără 9 kWh din rețea, deși are bateria plină. În orele de vârf ale producției solare energia costă 123 de lei pe MWh, seara 990. Furnizorul pierde aproape 246 de lei pe lună doar la casa asta, iar Mihai aproape 176.”

Caută **Dan Munteanu** (Brașov), secțiunea **Decontare prosumator**.

> „Dan a trimis 640 kWh în rețea luna asta, iar pe factură apar zero. A plătit 598 de lei în loc de 285, deci 312,80 lei în plus. Operatorul de call center primește explicația gata scrisă, iar în hartă are butonul **Emite factura de corecție**.”

Opțional, 10 s: în panoul de validare a textelor, apasă **Simulează o halucinație LLM (+999 RON)**.

> „Textele le poate scrie un AI, dar orice cifră care nu vine din calcul e respinsă și textul e rescris din șablon. Clientul nu primește niciodată o sumă inventată.”

### 3. Ce vede clientul (`/prosumator?household=RO-TM-001`), ~45 s

> „Acum suntem Andrei. Pagina se deschide exact pe momentul opririi.”

Apasă **Avarie**, apoi **Seară**.

> „Vede casa lui, energia care curge prin ea și ce s-a întâmplat. Nu un grafic tehnic, ci o explicație: rețeaua te-a oprit, nu panourile tale, iar dosarul a plecat la distribuitor.”

Deschide tab-ul **Pe zile**.

> „Și vede toată luna, zi cu zi, cu zilele în care s-a oprit. Dacă vrea, trimite un tichet, iar datele zilei pleacă automat cu el.”

### 4. Închiderea, ~15 s

> „Un singur caz, trei ecrane: furnizorul știe ce să facă, tehnicianul merge doar unde e nevoie, iar clientul primește un răspuns în loc de un grafic.”

---

## D. Slide-urile pentru 11:45 (text gata de copiat)

Sursele: `2026-10-24-pitch-scurt.md`, `2026-10-24-pitch-detaliat.md`, `2026-10-24-dovada-evaluare-81-scenarii.md`, graficele din `charts/`.

**Slide 1: Titlu**
> **SunProof**
> Aflați de ce s-a oprit invertorul înainte să trimiteți echipa.
> Rețea · Baterie · Factură

*Spui:* „Suntem SunProof. Ajutăm furnizorii de energie să răspundă la reclamațiile prosumatorilor cu dovezi, nu cu presupuneri.”

**Slide 2: Problema** (grafic: `charts/chart1_baterii_anre.svg`)
> **386.000 de prosumatori. 4 din 10 au baterie. Nimeni nu verifică dacă merg cum trebuie.**
> - În orele de vârf ale producției solare, peste 253 V, invertoarele se opresc singure, iar clientul sună la furnizor.
> - Seara, când energia e de 8 ori mai scumpă, multe baterii stau pline.
> - Legea 160/2026 schimbă facturile, iar fiecare factură neclară devine o reclamație.
> *Sursă: ANRE, august 2026*

*Spui:* „În două luni au apărut 24.000 de baterii noi. Cresc mai repede decât le poate verifica cineva.”

**Slide 3: Nimeni nu are dovezi** (grafic: `charts/chart3_capatul_strazii.svg`)
> **Instalatorul zice că e rețeaua. Distribuitorul zice că e invertorul.**
> Un prosumator povestește de 15–20 de vizite fără diagnostic (forum Softpedia).
> „Când tensiunea din rețea depășește 253 V, echipamentele prosumatorilor se opresc automat.” (APCE)

*Spui:* „Casele de la capătul străzii se opresc primele, deși au panouri bune. Fără date de la vecini, nimeni nu poate dovedi asta.”

**Slide 4: Ce face SunProof**
> **Citim datele invertorului și ale contorului și răspundem la 3 întrebări:**
> 1. **Rețea sau instalație?** Dacă vecinii se opresc în același minut, e rețeaua: dosar PDF pentru distribuitor. Dacă se oprește doar casa ta, alertă pe Telegram pentru tehnician.
> 2. **Bateria e blocată seara?** Setarea reală față de ce a vrut clientul, în lei pe lună.
> 3. **Factura e corectă?** Invertor, contor și factură, comparate după Legea 160/2026.
> Fără hardware nou. Fără parola invertorului. Doar citim.

**Slide 5: Demo** (live `/harta` → `/triaj` → `/prosumator`, sau `demo-sunproof.mp4`)
> **Un caz, trei ecrane**
> Harta furnizorului → Analiza detaliată → Ce vede clientul

**Slide 6: Dovada** (grafic: `charts/chart4_pierderi_si_dovada.svg`)
> **Pe 81 de case simulate, în 8 cartiere:**
> - Rețea sau echipament: **81/81 corect** cu date la 1 minut, **80/81** cu date la 5 minute (din cloud, fără hardware)
> - Alarme false pe case sănătoase: **0 din 60**
> - Baterie și factură: **81/81** fiecare
> - **6.750 lei/lună** deplasări inutile evitate (15 cazuri de rețea × 450 lei)
> - **982 lei/lună** pierduți de furnizor din 7 baterii setate greșit
> - **1.408 lei** de corectat pe 5 facturi greșite
> *Producția solară e reală (PVGIS), tensiunea e simulată. Cifrele arată că logica e corectă, nu performanța pe case reale.*

*Spui:* „Spunem deschis: tensiunea e simulată, pentru că nu există date publice despre ea. Exact golul ăsta îl acoperim.”

**Slide 7: Cine plătește și ce câștigă**
> **Furnizorul de energie, per casă de prosumator.**
> - Tehnicianul merge doar unde chiar e un defect
> - Call center-ul primește explicația gata scrisă
> - Mai multă energie livrată seara din baterii
> - Clientul cu baterie, cel mai valoros, are un motiv să rămână (peste 500.000 de schimbări de furnizor în 2025)

**Slide 8: Ce urmează**
> **Următoarele 3 luni:** conectori reali Huawei FusionSolar și Fronius (doar citire) și un pilot pe 50–100 de case din același cartier.
> **Ce cerem:** un furnizor sau o firmă de O&M pentru pilot.
> SunProof · Un singur adevăr despre energia ta, care îți aparține.

---

## E. Întrebări probabile, răspunsuri scurte

**„Tensiunea e simulată. De ce să vă credem?”**
> „Producția e reală, din PVGIS. Tensiunea o calculăm cu un model fizic al rețelei de joasă tensiune, pentru că nu există date publice. Testăm și pe date la 5 minute, cum le dă cloud-ul invertorului, și tot nu dăm alarme false. Pilotul ne dă primele date reale.”

**„De ce n-ați folosit machine learning?”**
> „Pentru că distribuitorul trebuie să afle de ce. «257 de volți și 6 vecini opriți în același minut» convinge. «Modelul a zis 0,87» nu. Și n-avem defecte reale etichetate pe care să antrenăm ceva.”

**„Ce face AI-ul, atunci?”**
> „Doar scrie textul pentru client și pentru distribuitor. Orice cifră din text trebuie să existe în calcul, altfel textul e înlocuit cu un șablon.”

**„De ce ar plăti furnizorul, dacă distribuitorul e din același grup?”**
> „Furnizorul nu plătește pentru reclamații. Plătește ca să nu mai trimită tehnicieni degeaba și ca apelurile să se închidă repede. Iar distribuitorul primește raportul pe stradă fără să ceară parolele invertoarelor.”

**„Ce faceți dacă vecinii nu sunt clienți?”**
> „Dovada principală vine de la casa însăși: tensiunea măsurată de invertor și codul de alarmă. Vecinii doar o întăresc. Cu cât furnizorul are mai mulți clienți într-o zonă, cu atât dovada e mai puternică.”

---

**Atenție la cifre:** versiunile vechi ale pitch-urilor spuneau „81/81 la 5 minute”, „1.054,20 RON/lună” și „5,66 mil. EUR/an”. Evaluarea rulată pe 25.10 dă **80/81 la 5 minute**, **982,08 RON/lună** și circa **713.000 EUR/an** extrapolat la 25.000 de prosumatori. Folosește doar cifrele noi. În pitch-ul vorbit, „toate cazurile” se referă la datele la 1 minut.
