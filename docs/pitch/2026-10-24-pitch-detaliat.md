# SunProof: pitch detaliat, pe înțelesul tuturor

**Un singur adevăr despre energia ta, care îți aparține.**

Documentul de referință: tot ce spunem, cu dovezile și cifrele. Pentru prezentare, folosește `2026-10-25-kit-dimineata.md` (slide-uri, pitch de 60 s, scriptul demo-ului). Cifrele sunt cele rulate pe 25.10.

---

## 1. Problema, concret

**Cine o are:** cei 385.791 de prosumatori din România (ANRE, august 2026), adică oameni cu panouri pe casă, dintre care 39% au și baterie. O au și echipele de O&M care le întrețin sistemele.

**Ce se întâmplă:** e iulie, ora 12:40, cer senin. Toate casele de pe stradă trimit energie în rețea în același timp, iar tensiunea trece de 253 V. Invertoarele de la capătul străzii, cele mai departe de transformator, se opresc automat, fiecare pentru cel puțin 15 minute. Proprietarul nu primește nicio explicație: în aplicația invertorului vede doar o gaură în grafic, la prânz.

**Ce pierde:** la prânz, un sistem obișnuit de 6 kWp produce în jur de 4,8 kW. O oră de opriri înseamnă aproape 5 kWh pierduți, chiar energia cea mai bună a zilei. Din interviuri: un prosumator și un furnizor ne-au indicat, separat și fără să le sugerăm, opririle de la prânz ca problemă. Numărul de opriri pe lună: *[de confirmat din notițe]*.

**De ce nu se rezolvă:** nimeni nu poate dovedi a cui e vina. Instalatorul spune că e rețeaua, distribuitorul spune că e echipamentul. Fără date, o sesizare nu duce nicăieri, iar tehnicienii fac deplasări degeaba: un prosumator povestește de 15–20 de vizite fără diagnostic. Când chiar e un defect de echipament, echipa O&M află abia când sună clientul. Cu bateria e la fel: dacă e setată altfel decât a vrut omul, nu apare nicio alarmă, dar seara el plătește curent din rețea.

**Pe scurt:** datele există, dar sunt împărțite între aplicația invertorului, aplicația bateriei, contor și factură. Niciuna nu răspunde la întrebarea care contează: **merge sistemul cum trebuie, și dacă nu, a cui e vina și ce fac?** SunProof răspunde la ea, fără niciun aparat nou în casă.

## 2. Problemele pe care le rezolvăm și dovezile că sunt reale

### Problema 1: „La prânz, când e cel mai mult soare, invertorul se oprește”

**Ce se întâmplă:** când mulți vecini trimit energie în rețea în același timp, tensiunea pe stradă crește. Peste 253 V, invertorul se oprește singur, ca să se protejeze. Proprietarul pierde exact energia cea mai bună a zilei și de multe ori nici nu știe.

**Dovezi:**
- Asociația Prosumatorilor (APCE) spune public: „Când tensiunea din rețea depășește 253 V, echipamentele prosumatorilor se opresc automat” ([Economica.net, aprilie 2025](https://www.economica.net/apce-indeamna-prosumatorii-sa-opreasca-invertoarele-daca-pleaca-de-acasa-de-paste_829117.html)).
- În România sunt **385.791 de prosumatori, iar 151.040 (circa 39%) au baterie** (ANRE, 31 august 2026, prin Cotidianul). La sfârșitul lui iunie erau 127.084 de baterii ([StartupCafe](https://startupcafe.ro/romani-panouri-solare-cati-prosumatori-racordare-retelele-electrice-romania-105065)), deci au apărut aproximativ 24.000 de baterii noi în două luni. Cu cât sunt mai mulți prosumatori pe aceeași stradă, cu atât problema e mai mare.
- Din interviurile noastre: **2 din 2** interlocutori (un prosumator, un furnizor) au indicat spontan opririle de la prânz. Câți nu știau de ele: *[de confirmat]*.
- Un distribuitor a găsit **60% din invertoarele verificate** setate greșit (în brief: 60% din 460; cifra 460 *[de confirmat sursa]*).
- Citat reprezentativ 1 (APCE, public): „Când tensiunea din rețea depășește 253 V, echipamentele prosumatorilor se opresc automat.”
- Citat reprezentativ 2 (Softpedia, caz documentat): un prosumator povestește **15–20 vizite fără diagnostic**. Citatul exact din interviuri: *[de confirmat din notițe]*.
- Toate cele 8 conversații și cazurile documentate sunt în `docs/interviews/2026-10-24-sinteza-dovezi-interviuri.md`.

### Problema 2: „Nimeni nu-și asumă vina”

**Ce se întâmplă:** instalatorul spune că e de la rețea, distribuitorul spune că e de la echipament, iar proprietarul nu are cum să dovedească nimic. Tehnicienii fac deplasări degeaba.

**Dovezi:**
- Un prosumator de pe Softpedia povestește **15–20 de vizite fără un diagnostic** ([forum, ianuarie 2026](https://forum.softpedia.com/topic/1253407-reclamatie-firma-fotovoltaice/)).
- Alt proprietar a descoperit târziu că o intrare a invertorului nu producea nimic și n-a primit ajutor tehnic ([Reddit, noiembrie 2025](https://www.reddit.com/r/panourifotovoltaice/comments/1orkkg9/probleme_prosumator/)).

### Problema 3: „Bateria e plină, dar iau curent din rețea”

**Ce se întâmplă:** bateria e setată altfel decât a vrut proprietarul (de exemplu, păstrează 80% în loc de 20%). Totul pare în regulă, nu există nicio alarmă, dar seara omul plătește curent din rețea.

**Dovezi:**
- Exact întrebarea asta apare pe forumul prosumatorilor români ([Reddit](https://www.reddit.com/r/panourifotovoltaice/comments/1tlo2pe/consum_din_re%C8%9Bea_cu_bateria_plina/)).
- Furnizorii au început să plătească pentru energia din baterie livrată seara. Electrica a plătit un bonus de 0,40 lei/kWh în august 2026, ca pilot ([Financial Intelligence](https://financialintelligence.ro/electrica-ii-stimuleaza-pe-prosumatorii-cu-baterii-sa-livreze-energie-seara-bonus-de-040-lei-kwh-in-luna-august/)). O baterie setată greșit pierde și banii ăștia.

### Problema 4: „Cine are acces la datele mele?”

**Ce se întâmplă:** ca să afle ce se întâmplă, unii distribuitori au cerut direct acces la invertoarele oamenilor.

**Dovezi:**
- Delgaz Grid și Distribuție Oltenia au cerut instalatorilor acces la invertoarele clienților, iar APCE a reclamat la ANSPDCP, la Consiliul Concurenței și la Comisia Europeană ([Europa Liberă, octombrie 2025](https://romania.europalibera.org/a/prosumatori-accest-invertoare-distribuitori-energie-instalatori/33548234.html)).

## 3. Ce face SunProof

Pe scurt: **citim datele pe care invertorul și contorul le au deja și răspundem la trei întrebări, cu dovada la vedere.** Fiecare verificare dă un verdict clar, cine trebuie să rezolve și ce face mai departe.

1. **Rețea sau instalație?** Ne uităm la tensiunea casei și la vecinii de pe același post de transformare. Dacă mai mulți vecini se opresc în același minut și tensiunea trece de 253 V, e rețeaua. Furnizorul nu mai trimite echipa, iar clientul primește **dosarul tehnic în PDF** pentru distribuitor: opririle, tensiunea minut cu minut, vecinii afectați și energia pierdută. Dacă se oprește doar casa ta și vecinii produc normal, e instalația: un prag setat greșit, un cablu prea subțire sau un defect. Atunci tehnicianul primește **alerta pe Telegram**.
2. **Bateria e blocată seara?** Comparăm ce a vrut clientul („folosesc bateria seara, păstrez 20% pentru pană”) cu ce e setat de fapt și cu ce s-a întâmplat. Dacă bateria stă plină seara, arătăm câți kWh sunt blocați și câți lei pierd clientul și furnizorul, după prețurile OPCOM de la prânz și de seară. Dacă clientul chiar a vrut o rezervă mare, nu dăm alarmă.
3. **Factura e corectă?** Punem lângă ce a produs invertorul, ce a măsurat contorul și ce scrie pe factură, după regula 1:1 din Legea 160/2026. Dacă energia trimisă în rețea lipsește de pe factură, arătăm suma de corectat. Dacă factura e corectă, explicăm de ce: „ai produs 780 kWh, dar 470 i-ai folosit direct în casă, deci la contor au ajuns doar 310”.

**Tichetul se închide pe date, nu pe cuvânt.** După o reparație, tichetul O&M se închide abia după zile însorite fără defect. Dacă defectul revine, se redeschide singur. Dacă e înnorat sau invertorul nu mai trimite date, spunem „dovezi insuficiente”, nu „rezolvat”.

**Textele le poate scrie un AI, dar cifrele nu.** Explicația pentru client, scriptul pentru call center și scrisoarea către distribuitor pot fi redactate de Claude. Orice cifră din text trebuie să existe în calculul nostru. Dacă nu există, textul e aruncat și rescris dintr-un șablon.

### Cum arată în aplicație

| Ecran | Pentru cine | Ce vezi |
|---|---|---|
| `/` (prima pagină) | Oricine | Cele trei verificări, cu cazurile reale din demo, și cum se închide un caz |
| `/harta` | Furnizorul | Harta posturilor de transformare, casele colorate după stare, încărcarea străzilor. **Analiză detaliată** deschide cele trei verificări, cu acțiunile: **Descarcă dosarul tehnic pentru OD**, **Alocă intervenție O&M (Telegram)**, **Emite factura de corecție**. **Simulează soluția** arată distribuitorului înainte/după |
| `/triaj` | Furnizorul, analistul | Lista tuturor caselor și, pentru fiecare, graficele de tensiune, baterie și factură, ciclul tichetului O&M și verificarea textelor generate |
| `/prosumator` | Clientul | Casa lui, cu energia care curge prin ea, de-a lungul zilei (**Avarie / Prânz / Seară**), explicația pe limba lui, luna zi cu zi (**Pe zile**) și butonul de tichet către furnizor |

## 4. Cum l-am construit (pe scurt)

- **Datele.** Producția solară e reală: date oficiale ale Comisiei Europene (PVGIS). Tensiunea pe stradă o calculăm cu un model fizic al rețelei de joasă tensiune, pentru că **nu există date publice despre ea**. Spunem asta deschis. Prețurile de la prânz și de seară urmează curba OPCOM PZU.
- **Cartierele simulate.** 8 cartiere reale ca locație (Dumbrăvița, Giroc, Bragadiru, Corbeanca, Florești, Cluj-Zorilor, București-Aviației, Brașov-Răcădău), fiecare cu postul lui de transformare și cu aproximativ 220 de case în total. Dintre ele, 81 sunt clienți ai furnizorului care și-au dat acordul. Casele de la capătul străzii au tensiunea cea mai mare și se opresc primele, exact ca în realitate. Am pus în flotă și defecte: praguri setate greșit, cabluri subdimensionate, baterii pe modul greșit, facturi fără index de export.
- **Motoarele de decizie.** Reguli clare, scrise în cod, nu „păreri” ale unui AI. Vecini opriți în același minut plus tensiune peste prag înseamnă rețea. Tensiune normală și vecini care produc înseamnă instalație. Lipsa datelor e „lipsă date”, nu oprire. Aceleași date dau mereu același verdict. Nu antrenăm un model ML: n-avem defecte reale etichetate, iar vecinii sunt deja reperul care spune cât ar fi trebuit să producă fiecare casă.
- **AI-ul.** Doar scrie textele, iar fiecare cifră e verificată în cod (vezi secțiunea 3). Fără cheie API, aplicația merge cu șabloane, deci demo-ul nu depinde de internet.
- **Interfața.** O aplicație web care merge și pe telefon. Alertele pentru tehnicieni vin pe Telegram, deci nu avem nevoie de o aplicație mobilă separată.
- **Dovada că funcționează.** Rulăm motoarele pe toate cele 81 de case și comparăm verdictul cu ce știm că am pus în simulare. Repetăm testul și cu date la 5 minute, cum le dă cloud-ul unui invertor obișnuit, ca să vedem că nu avem nevoie de hardware dedicat.

## 5. Ce arătăm în demo (3 minute)

Scriptul complet, cu ce apeși și ce spui, e în `2026-10-25-kit-dimineata.md`, secțiunea C. Pe scurt:

1. **Harta furnizorului, Andrei (Dumbrăvița):** invertorul a văzut 257 V, iar 6 din 11 vecini s-au oprit în aceleași minute. 91 de minute de oprire, peste 9 kWh pierduți azi. Verdictul: rețeaua. Nu trimitem echipa, descărcăm dosarul pentru Rețele Electrice și arătăm soluția înainte/după.
2. **Triajul, Elena (Corbeanca):** se oprește doar ea, la 246 V, pentru că pragul e setat la 245 V în loc de 253 V. E instalația: alertă pe Telegram pentru tehnician.
3. **Triajul, Mihai (Cluj):** bateria e pe modul de rezervă și păstrează 85% în loc de 15%. Seara cumpără 9 kWh din rețea cu bateria plină. Furnizorul pierde aproape 246 lei pe lună, clientul aproape 176.
4. **Triajul, Dan (Brașov):** 640 kWh trimiși în rețea lipsesc de pe factură. A plătit 598 lei în loc de 285,20, deci 312,80 lei în plus.
5. **Verificarea textelor:** apăsăm **Simulează o halucinație LLM (+999 RON)** și arătăm cum textul greșit e respins.
6. **Ce vede clientul (Andrei):** pagina se deschide pe momentul opririi; explicația, luna zi cu zi și tichetul.

Cazul de control e **Cristina (București)**: totul e în regulă, iar aplicația nu dă nicio alarmă. E bine de arătat dacă cineva întreabă de alarme false.

### Graficele din prezentare

Patru grafice, fiecare cu o singură concluzie scrisă deasupra și cu mențiunea ce e real și ce e simulat:

1. **„Bateriile cresc mai repede decât le verifică cineva.”** Baterii la prosumatori, iunie–august 2026: de la 127.084 la 151.040 (ANRE). Real.
2. **„Prânzul e și cel mai bun moment, și cel mai riscant.”** Producția PVGIS pe o zi de vară, peste tensiunea pe stradă. Producția e reală, tensiunea simulată.
3. **„Capătul străzii se oprește primul, deși panourile sunt bune.”** Tensiunea maximă casă cu casă pe o stradă demo. Simulat.
4. **„Ce pierd omul și furnizorul.”** Energia pierdută la opriri și banii pierduți din bateriile setate greșit. Simulat, cu formula la vedere.

Înaintea lor vine slide-ul cu cifrele din interviuri („2 din 2 interlocutori au pomenit singuri opririle de la prânz”, 15–20 de vizite fără diagnostic, 60% invertoare setate greșit) și două citate: cel al APCE despre 253 V și cazul de pe Softpedia (citatul din interviuri: *[de confirmat]*).

### Dovada că funcționează (evaluare pe 81 de case)

Rulăm motoarele pe toate cele 81 de case și comparăm cu ce am pus în simulare:

- **Rețea sau echipament:** **81/81 (100%)** cu date la 1 minut și **80/81 (98,8%)** cu date la 5 minute, cum le dă cloud-ul invertorului. Singura greșeală la 5 minute e un caz de rețea.
- **Alarme false:** **0 din 60** case sănătoase, inclusiv cele care își reduc singure puterea (Volt-Watt), la 1 și la 5 minute.
- **Baterie și factură:** **81/81 (100%)** fiecare.
- **Deplasări inutile evitate:** 15 cazuri de rețea × 450 lei = **6.750 lei/lună** pe eșantion.
- **Baterii setate greșit:** 7 baterii îl costă pe furnizor **982,08 lei/lună** pe eșantion, adică circa **713.000 EUR/an** extrapolat la 25.000 de prosumatori.
- **Facturi greșite:** 5 facturi, cu **1.408,42 lei** de corectat.

Precizare: datele sunt simulate (producția solară e reală, din PVGIS), deci cifrele arată că logica e corectă, nu cum merge pe case reale. Raport complet, regenerat cu `scripts/evaluate_proof.py`: `docs/pitch/2026-10-24-dovada-evaluare-81-scenarii.md`.

## 6. De ce noi, și nu o aplicație care există deja

- Aplicațiile existente (SolarAssistant, Home Assistant, YellowGrid, asistentul Enphase) îți arată datele **unui singur sistem**. Noi le comparăm cu **vecinii** și spunem a cui e vina.
- Nu ne oprim la grafic: generăm **acțiunea** (dosarul, alerta, tichetul care se închide doar când datele confirmă).
- Verificăm **ce a vrut omul**, nu doar dacă echipamentul are alarme.
- Fără aparate noi și fără parola invertorului.

## 7. Cine plătește

**Furnizorul de energie, per casă.** Valoarea principală pentru el e operațională: echipa lui de O&M află de defecte în aceeași zi, primește tichete doar pentru defectele reale și nu mai pleacă degeaba la casele unde vina e a rețelei. În plus, îl oferă clienților ca serviciu de fidelizare (oamenii primesc răspunsuri în loc să sune la call center) și poate trimite distribuitorului un raport pe stradă, fără să ceară acces la invertoare. Același serviciu se poate vinde și instalatorilor sau firmelor independente de O&M.

## 8. Întrebări grele și răspunsurile noastre

**„Challenge-ul cere o singură imagine a energiei. Voi ați făcut un detector de opriri?”**
Nu doar. Clientul își vede casa pe un singur ecran: producția, consumul, bateria și rețeaua, de-a lungul zilei și zi cu zi pe toată luna. Verdictele sunt ce fac imaginea utilă: în loc să te uiți tu la curbe, îți spunem ce nu merge, a cui e vina și ce faci mai departe. Un grafic unificat există deja (Home Assistant, SolarAssistant), dar nu dă un diagnostic și nu declanșează nicio acțiune.

**„Furnizorul și distribuitorul fac des parte din același grup. De ce ar plăti furnizorul ca proprii clienți să reclame rețeaua grupului?”**
Furnizorul nu plătește pentru plângeri. Plătește ca echipa lui de O&M să nu mai facă deplasări degeaba și ca reclamațiile „nu-mi merge sistemul” să primească răspuns. Dosarul de sesizare e un drept al prosumatorului, iar noi doar îl facem ușor de exercitat. Raportul agregat pe stradă ajută chiar grupul: distribuitorul vede unde crește tensiunea și unde trebuie investit, fără să ceară parolele invertoarelor, care au dus la reclamații la ANSPDCP.

**„Cum știți ce case sunt pe aceeași stradă, și ce faceți dacă vecinii nu folosesc aplicația?”**
Dovada principală vine de la casa însăși: tensiunea măsurată de invertor și codul lui de alarmă („Grid overvoltage”). Asta merge și pentru o singură casă. Vecinii doar întăresc dovada. Pe cei de pe aceeași „stradă” îi găsim după apropierea geografică, iar cu acordul distribuitorului putem folosi și postul de transformare exact. Cu cât un furnizor are mai mulți clienți într-o zonă, cu atât dovada e mai puternică.

**„Tensiunea e simulată. De ce să credem acuratețea?”**
Nu cereți să credeți cifra, ci regula. Verdictul se bazează pe lucruri pe care le poate verifica oricine: tensiunea măsurată de invertor, limita de 253 V și vecinii opriți în același minut. Simularea arată că regula nu se încurcă la case sănătoase (0 alarme false din 60) și nici la date luate doar la 5 minute (80 din 81 corect). Producția e reală, din PVGIS. Tensiunea e simulată pentru că nu există date publice despre ea pe străzile din România, iar acesta e chiar golul pe care îl acoperim. Primul pas după demo e un pilot pe case reale.

**„De ce nu folosiți machine learning?”**
Pentru că n-avem defecte reale etichetate, iar un model antrenat pe simularea noastră ar învăța doar regulile simulatorului. În plus, distribuitorul trebuie să afle *de ce*: „257 V și 6 vecini opriți în același minut” convinge, „modelul a zis 0,87” nu. Compararea fiecărei case cu vecinii e chiar detecție de anomalii fără etichete. Peste ea putem pune un strat statistic pentru derive lente (murdărie, un string care cedează), dar verdictul rețea/echipament rămâne pe reguli citibile.

**„Ce câștigă omul din sesizare?”**
Nu promitem despăgubiri. Distribuitorul e obligat să verifice și să remedieze calitatea tensiunii, iar un dosar cu date, ore și grafice e mult mai greu de ignorat decât un telefon. Ce au primit cei care au făcut deja sesizare: *[de confirmat; nu avem încă un caz documentat]*.

## 9. Ce am construit și cum creștem

### Ce merge azi, în demo

- **8 cartiere simulate** cu postul lor de transformare, aproximativ 220 de case, dintre care 81 sunt clienții furnizorului. Producție solară reală (PVGIS), tensiune calculată cu un model fizic al rețelei.
- **Trei motoare de decizie:** rețea sau instalație, baterie față de intenția clientului, factură față de contor. Fiecare dă verdictul, cine e responsabil, ce trebuie făcut și cât costă, în kWh și în lei.
- **Dosarul tehnic în PDF** pentru distribuitorul casei (în demo, Rețele Electrice și Distribuție Energie Electrica România).
- **Alerta pe Telegram** pentru tehnician (reală dacă e configurat botul, altfel simulată) și ciclul tichetului O&M care se închide doar pe date.
- **Simularea soluției pentru distribuitor:** ce se întâmplă pe stradă înainte și după măsuri, de exemplu reglarea ploturilor transformatorului, un transformator mai mare, cabluri mai groase, reechilibrarea fazelor, Volt-Watt pe toate invertoarele sau bateriile setate corect.
- **Simularea bateriei:** „cât câștigi dacă schimbi rezerva”.
- **Textele pentru client, call center și distribuitor**, cu verificarea cifrelor.
- **Trei ecrane:** harta furnizorului, triajul și pagina clientului, plus prima pagină de prezentare.
- **Evaluarea pe 81 de case**, la 1 și la 5 minute, regenerabilă cu un singur script. 823 de teste automate.

Tensiunea, bateriile, facturile și invertoarele sunt simulate. Producția solară e reală.

### Ce vine după demo

**Pasul 1, primele 3 luni: date reale de la primele case**
- Conectori reali, doar pentru citire: Huawei FusionSolar și Fronius (cele mai răspândite în România), apoi SolarEdge, Deye și Growatt.
- Un pilot cu un furnizor sau o firmă de O&M, pe 50–100 de case din același cartier, ca să avem vecini reali.
- Importul automat al curbei de sarcină din portalul distribuitorului și al facturii (PDF sau e-Factura).
- **Cine vede ce:** clientul alege ce date vede distribuitorul (doar tensiunea și opririle) și ce vede tehnicianul (doar alertele), cu un jurnal al fiecărui acces.
- Istoricul setărilor bateriei, ca să vedem când a început problema („rezerva a trecut la 80% pe 3 iulie”).

**Pasul 2, 3–12 luni: din casă în casă, pe toată țara**
- Harta tensiunii pe străzi, construită din datele clienților care și-au dat acordul. Azi nu există date publice despre asta în România.
- Raportul lunar pe post de transformare pentru distribuitor: „pe strada X, 14 case s-au oprit de 60 de ori în iulie”. Distribuitorul vede unde să investească, fără acces la invertoare.
- Verificarea programelor de baterie ale furnizorilor și ale agregatorilor (YellowGrid, programe de tip Electrica): câștigă omul net sau nu?
- Simularea „merită o baterie mai mare?”, pe datele reale ale casei.

**Pasul 3, peste un an: mai mult decât panouri**
- Pompe de căldură, încărcătoare de mașini electrice și alte consumatoare mari, ca să vedem când lucrează unele împotriva altora.
- Comunitățile de energie, unde vecinii împart energia și au nevoie de o evidență comună în care să aibă încredere.
- Alte țări din regiune cu aceeași problemă (Ungaria, Bulgaria, Polonia), pentru că metoda cu vecinii nu ține de România.

**Ce nu facem nici pe viitor:** nu controlăm invertoarele și nu cerem parole. Citim, verificăm și dăm dovezi. Decizia rămâne la om.

## 10. Ce spunem deschis

- Tensiunea, bateriile și facturile din demo sunt **simulate**. Producția solară e reală (PVGIS).
- Cifrele din evaluare arată că logica e corectă, nu cum merge pe case reale. Asta aflăm din pilot.
- Nu controlăm invertoare și nu schimbăm setări. **Doar citim.**
- Nu promitem despăgubiri din sesizare. Valoarea e că distribuitorul trebuie să verifice și să repare.

## 11. Ce folosim tehnic

### Limbaj și biblioteci

| Ce | Pentru ce |
|---|---|
| **Python 3.14 + FastAPI** | Serverul: simularea cartierelor, cele trei motoare de decizie, API-ul pentru interfață |
| **pydantic** | Contractele de date: citirile invertorului, ale contorului, facturile și verdictele au aceeași formă peste tot |
| **pandas, numpy** | Citirile la minut, agregarea la 5 și la 15 minute, calculele de kWh și lei |
| **React 19 + TanStack Start** | Interfața web: harta furnizorului, triajul, pagina clientului, prima pagină |
| **MapLibre GL** | Harta, cu imagini satelit sau fundal întunecat, fără cheie API |
| **Recharts** | Graficele de tensiune, producție, baterie și factură |
| **fpdf2** | Dosarul tehnic în PDF pentru distribuitor |
| **httpx** | Apelurile HTTP către Telegram |
| **anthropic** | Redactarea textelor cu Claude (opțional; fără cheie, șabloane) |
| **pytest** | Testele automate, cu valori exacte (823 de teste) |

### API-uri și surse de date

| API sau sursă | Ce luăm de acolo | În demo |
|---|---|---|
| **PVGIS** (Comisia Europeană, JRC) | Producția solară reală, cu norii reali | Real, descărcat o dată |
| **OPCOM PZU** | Cât valorează energia la fiecare oră: prânz față de seară | Curba de preț a lunii august 2026 |
| **Claude API** (Anthropic) | Textele pentru client, call center și distribuitor | Real cu `SUNPROOF_USE_LLM=1` și cheie API; altfel șabloane |
| **Telegram Bot API** (`sendMessage`) | Alerta către tehnician | Real cu `TELEGRAM_BOT_TOKEN`; altfel simulat |
| **Huawei FusionSolar Northbound API**, **Fronius Solar API** | În produsul real: puterea, tensiunea rețelei, starea și alarmele invertorului | Datele vin din simulator, în același format |
| **Curba de sarcină** din portalul distribuitorului (import/export la 15 minute) | Ce spune contorul, pentru consumul real și pentru factură | Generată din simulator, în același format |

### Conectorii pe branduri: câte un API pentru fiecare brand major

În produsul real citim datele prin API-ul fiecărui brand major. Un adaptor per brand traduce datele în aceeași schemă de citiri, așa că detectorul nu depinde de brand. La hackathon arătăm doar interfața adaptorului.

| Brand | Cota estimată în România | Cum citim datele | Ce trebuie de la client |
|---|---|---|---|
| Huawei | 22–42% (APCE: 70% invertoare chinezești, dintre care 60% Huawei; cel puțin 85.000 de unități) | FusionSolar Northbound API (cloud); Modbus-TCP local, dacă e activat | Cont de API creat de instalator; circa 1 apel pe minut, o singură sesiune |
| Deye | Parte din restul de ~30% | Solarman OpenAPI (cloud) | Cont sau cheie Solarman |
| Growatt | Parte din restul de ~30% | Growatt OpenAPI (cloud) | Token de la Growatt |
| Fronius | Parte din restul de ~30% | Fronius Solar API (local, doar citire); SunSpec Modbus | Acces la rețeaua casei |
| SolarEdge | Parte din restul de ~30% | SolarEdge Monitoring API (cloud); SunSpec Modbus | Cheie de API de la proprietar; limită zilnică de apeluri |
| SMA | Parte din restul de ~30% | SunSpec Modbus (local); API-ul Sunny Portal / ennexOS | Modbus activat sau acord de partener |
| Victron | Parte din restul de ~30% | VRM API (cloud); Modbus-TCP pe dispozitivul GX | Token VRM |
| Orice brand | 100% | Curba de sarcină a distribuitorului (import și export la 15 minute) | Exportul din portalul distribuitorului |

Un adaptor e cod, nu hardware: estimăm 1–3 zile pentru un prototip și 1–2 săptămâni per brand pentru producție. Accesul la API e de obicei gratuit, deci nu există un cost per casă. **De verificat:** cotele brandurilor în afară de Huawei și dacă fiecare API expune tensiunea rețelei.

### Piesele scrise de noi

| Modul | Ce face |
|---|---|
| `sunproof/grid.py`, `neighborhoods.py` | Simularea rețelei de joasă tensiune în cele 8 cartiere: tensiunea crește spre capătul străzii cu cât se trimite mai multă energie, iar invertoarele se opresc peste prag |
| `sunproof/scenarios.py` | Singura intrare în date: cele 81 de case și cartierele lor |
| `sunproof/engine/grid_fault.py` | Rețea sau instalație: opririle, vecinii afectați simultan, creșterea de tensiune în casă, energia pierdută |
| `sunproof/engine/battery.py` | Bateria față de intenția clientului: kWh blocați, pierderea la prețurile PZU, eligibilitatea pentru bonus |
| `sunproof/engine/billing.py` | Invertor, contor și factură, după Legea 160/2026: suma corectă și diferența |
| `sunproof/engine/pipeline.py` | Leagă cele trei verdicte și strânge toate cifrele care au voie să apară în texte |
| `sunproof/explainer.py`, `text_templates.py` | Textele în română, de la Claude sau din șablon, cu verificarea cifrelor |
| `sunproof/pdf_dossier.py` | Dosarul tehnic în PDF pentru distribuitor |
| `sunproof/telegram_bot.py` | Alerta pentru tehnician |
| `sunproof/app.py`, `api_support.py` | API-ul pentru interfață, inclusiv simulările „ce-ar fi dacă” |
| `scripts/evaluate_proof.py` | Evaluarea pe 81 de case, la 1 și la 5 minute |

### Reguli tehnice importante

- **Decizia e deterministă.** AI-ul nu decide nimic, doar scrie text. Aceleași date dau mereu același verdict.
- **Testele nu au nevoie de internet.** AI-ul și Telegram sunt opționale, iar fără ele aplicația merge cu șabloane și alerte simulate.
- **Interfața merge și fără server.** Dacă backend-ul nu răspunde, aplicația folosește date locale și o spune pe ecran.
- **Fără hardware și fără control:** doar citim date, nu schimbăm setări pe invertor.
- **Cheile API** (Claude, Telegram) stau în variabile de mediu, nu în cod și nu pe GitHub.


---
*De confirmat înainte de pitch:* citatele exacte din interviurile 1 și 2, numărul de opriri pe lună și sursa cifrei 460 (vezi `docs/interviews/2026-10-24-sinteza-dovezi-interviuri.md`). Acuratețea din evaluare e integrată în secțiunea 5.
