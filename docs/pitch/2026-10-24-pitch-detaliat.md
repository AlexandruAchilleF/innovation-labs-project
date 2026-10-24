# SunProof: pitch detaliat, pe înțelesul tuturor

**Un singur adevăr despre energia ta, care îți aparține.**

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

0. **Îți arată toată energia pe un singur grafic.** Producția, consumul casei, bateria și rețeaua (tensiunea, importul, exportul), zi de zi. Consumul îl calculăm fără contor nou: producția invertorului + importul − exportul de pe contorul distribuitorului. Peste acest grafic, SunProof marchează tot ce nu merge cum trebuie:
1. **Compară casa ta cu vecinii.** Dacă se opresc mai multe case de pe stradă în același minut și tensiunea e mare, problema e la rețea. Primești **dosarul de sesizare** în PDF, cu lista opririlor, graficul tensiunii și energia pierdută, adresat automat distribuitorului din județul tău (Rețele Electrice, Delgaz Grid, Distribuție Energie Oltenia sau Distribuție Energie Electrica România).
2. **Dacă doar tu te-ai oprit și tensiunea era normală, e echipamentul.** Tehnicianul primește **alerta pe Telegram** în aceeași zi. Problema se închide doar după două zile în care datele arată că sistemul merge. Dacă defectul revine, cazul se redeschide singur. Dacă zilele sunt înnorate și nu se poate confirma nimic, spunem cinstit „dovezi insuficiente”, nu „rezolvat”. Și tu poți trimite o problemă echipei O&M din aplicație: tichetul pleacă cu datele zilei și cu verdictul nostru atașat.
3. **Verifică bateria față de ce ai vrut tu.** Ne spui ce vrei („rezervă 20% pentru pană, restul seara”), iar noi comparăm cu setarea și cu ce s-a întâmplat. „Bateria e setată la 80%, iei curent din rețea degeaba: 4 lei pe zi.” Dacă ai vrut chiar 80%, nu primești nicio alertă. Păstrăm și istoricul setărilor, deci vezi când a început problema: „rezerva a trecut la 80% pe 3 iulie; de atunci iei din rețea seara cu 3,5 kWh mai mult pe zi”.
4. **Verifică banii.** Comparăm ce spune invertorul, ce spune contorul și ce scrie pe factură. Dacă energia trimisă în rețea lipsește de pe factură sau apare la preț zero, îți arătăm suma.
5. **Tu decizi cine vede ce.** Distribuitorul vede doar tensiunea și opririle, tehnicianul doar alertele. Nimeni nu primește parola invertorului, iar fiecare acces rămâne scris într-un jurnal.

## 4. Cum îl construim (pe scurt)

- **Datele.** Producția solară e reală: date oficiale ale Comisiei Europene (PVGIS), pe un an întreg, pentru 5 orașe (București, Cluj, Iași, Timișoara, Constanța). Metoda funcționează oriunde în țară, pentru că PVGIS acoperă orice punct, iar compararea cu vecinii merge pe orice stradă. Tensiunea pe stradă o calculăm cu un model fizic simplu al rețelei, pentru că **nu există date publice despre ea**. Spunem asta deschis.
- **Strada simulată.** 12 case pe aceeași stradă. Casele de la capăt, departe de transformator, au tensiunea cea mai mare și se opresc primele, exact ca în realitate. Putem „strica” o casă (defect de invertor) sau „seta greșit” o baterie, ca să vedem dacă aplicația observă.
- **Detectorul.** Reguli clare, scrise în cod, nu „păreri” ale unui AI: tensiune peste prag, plus vecini opriți în același minut, înseamnă rețea; tensiune normală și vecini care produc înseamnă echipament; lipsa datelor e „lipsă date”, nu oprire. Pierderea în kWh și în lei se calculează din ce au produs vecinii în acel timp. Nu antrenăm un model ML: n-avem defecte reale etichetate, iar vecinii sunt deja „modelul” care spune cât ar fi trebuit să producă fiecare casă, adică detecție de anomalii fără etichete.
- **AI-ul.** Îl folosim doar ca să scrie textul scrisorii de sesizare pe limba omului. Fiecare cifră din text e verificată în cod. Dacă AI-ul greșește o cifră, textul e rescris dintr-un șablon.
- **Interfața.** Doar o aplicație web, care merge și pe telefon; alertele vin pe Telegram, deci n-avem nevoie de o aplicație mobilă. Are două panouri: al clientului (cifrele zilei, grafice, alerte, „trimite o problemă echipei O&M”) și al furnizorului (harta problemelor pe străzi, tichetele de rezolvat).
- **Branduri.** O singură interfață de adaptor pentru toate brandurile de invertoare. Detectorul vede aceeași schemă de date, oricare ar fi brandul (tabelul din secțiunea 11).
- **Dovada că funcționează, în două teste.** (1) Un test de robustețe: zeci de zile aleatoare din simulator, cu nori, goluri de date și defecte puse la întâmplare, la date la un minut și la cinci minute. Numărăm câte opriri a clasificat corect. (2) Un test pe date reale de la case adevărate (StoreNet, Irlanda, sau Open Power System Data, Germania), unde nu au existat opriri: numărăm câte alarme false de „defect de echipament” ar fi dat detectorul. Al doilea test nu depinde de simulatorul nostru.

## 5. Ce arătăm în demo (3 minute)

1. Strada la prânz: tensiunea trece de 253 V, trei case de la capăt se opresc. Eticheta: **„Problemă de rețea, confirmată de 2 vecini”**. Apăsăm un buton și apare dosarul PDF.
2. Stricăm invertorul unei case de pe altă stradă: **„Defect de echipament”**, iar alerta ajunge pe telefonul tehnicianului.
3. Bateria setată greșit: „Iei curent din rețea degeaba.” O setăm corect și casa are mai puține opriri la prânz, pentru că bateria absoarbe energia.
4. Factura: energia trimisă în rețea apare la preț zero, adică 150 de lei pierduți.
5. Retragem accesul distribuitorului la date, iar jurnalul arată încercarea refuzată.
6. Cifrele finale: cât de des am avut dreptate pe scenariile aleatoare și câte alarme false am dat pe datele reale.

### Graficele din prezentare

Patru grafice, fiecare cu o singură concluzie scrisă deasupra și cu mențiunea ce e real și ce e simulat:

1. **„Bateriile cresc mai repede decât oricine le verifică.”** Baterii la prosumatori, iunie–august 2026: de la 127.084 la 151.040 (ANRE). Real.
2. **„Prânzul e și cel mai bun moment, și cel mai riscant.”** Producția PVGIS pe o zi de iulie în 5 orașe, peste tensiunea pe stradă. Producția e reală, tensiunea simulată.
3. **„Capătul străzii se oprește primul, deși panourile sunt bune.”** Tensiunea maximă casă cu casă pe strada demo. Simulat.
4. **„Ce pierde omul.”** kWh și lei pierduți pe zi, plus bateria setată greșit. Simulat, cu formula la vedere.

Înaintea lor vine slide-ul cu cifrele din interviuri („2 din 2 interlocutori au indicat spontan opririle de la prânz”, 15–20 vizite fără diagnostic, 60% invertoare setate greșit) și două citate: cel al APCE despre 253 V și cazul Softpedia (citat din interviuri: *[de confirmat]*).

### Dovada că funcționează (evaluare pe 81 de scenarii)

Rulăm motoarele deterministe pe toate cele 81 de gospodării și comparăm cu adevărul de referință:

- **Rețea vs. echipament:** **81/81 (100%)** la date la 1 minut și **81/81 (100%)** la 5 minute (cloud polling, fără hardware dedicat).
- **Alarme false:** **0/60 (0%)** pe casele sănătoase, inclusiv cele în regim normal Volt-Watt, la 1 și la 5 minute.
- **Deplasări inutile evitate:** 15 cazuri de rețea × 450 RON = **6.750 RON/lună** pe eșantion.
- **Baterii setate greșit:** 7 baterii pierd **1.054,20 RON/lună** din arbitrajul PZU pe eșantion, adică **5,66 milioane EUR/an** extrapolat la 25.000 de prosumatori.
- Auditul bateriei și reconcilierea facturii (Legea 160/2026): 81/81 (100%) fiecare.

Precizare: datele sunt simulate (producția solară e reală, din PVGIS), deci cifrele arată corectitudinea logicii, nu performanța pe case reale. Raport complet: `docs/pitch/2026-10-24-dovada-evaluare-81-scenarii.md`.

## 6. De ce noi, și nu o aplicație care există deja

- Aplicațiile existente (SolarAssistant, Home Assistant, YellowGrid, asistentul Enphase) îți arată datele **unui singur sistem**. Noi le comparăm cu **vecinii** și spunem a cui e vina.
- Nu ne oprim la grafic: generăm **acțiunea** (dosarul, alerta, tichetul care se închide doar când datele confirmă).
- Verificăm **ce a vrut omul**, nu doar dacă echipamentul are alarme.
- Fără aparate noi și fără parola invertorului.

## 7. Cine plătește

**Furnizorul de energie, per casă.** Valoarea principală pentru el e operațională: echipa lui de O&M află de defecte în aceeași zi, primește tichete doar pentru defectele reale, ordonate după banii pierduți, și nu mai pleacă degeaba la casele unde vina e a rețelei. În plus, îl oferă clienților ca serviciu de fidelizare (oamenii primesc răspunsuri în loc să sune la call center) și poate trimite distribuitorului un raport pe stradă, fără să ceară acces la invertoare. Același serviciu se poate vinde și instalatorilor sau firmelor independente de O&M.

## 8. Întrebări grele și răspunsurile noastre

**„Challenge-ul cere o singură imagine a energiei. Voi ați făcut un detector de opriri?”**
Nu doar. Baza e graficul zilei cu producția, consumul, bateria și rețeaua, toate laolaltă, cu consumul calculat fără contor nou. Detectorul e ce face graficul util: în loc să te uiți tu la curbe, îți spunem ce nu merge, a cui e vina și ce faci mai departe. Un grafic unificat există deja (Home Assistant, SolarAssistant), dar nu dă un diagnostic și nu declanșează nicio acțiune.

**„Furnizorul și distribuitorul fac des parte din același grup. De ce ar plăti furnizorul ca proprii clienți să reclame rețeaua grupului?”**
Furnizorul nu plătește pentru plângeri. Plătește ca echipa lui de O&M să nu mai facă deplasări degeaba și ca reclamațiile „nu-mi merge sistemul” să primească răspuns. Dosarul de sesizare e un drept al prosumatorului, iar noi doar îl facem ușor de exercitat. Raportul agregat pe stradă ajută chiar grupul: distribuitorul vede unde crește tensiunea și unde trebuie investit, fără să ceară parolele invertoarelor, care au dus la reclamații la ANSPDCP.

**„Cum știți ce case sunt pe aceeași stradă, și ce faceți dacă vecinii nu folosesc aplicația?”**
Dovada principală vine de la casa însăși: tensiunea măsurată de invertor și codul lui de alarmă („Grid overvoltage”). Asta merge și pentru o singură casă. Vecinii doar întăresc dovada. Pe cei de pe aceeași „stradă” îi găsim după apropierea geografică, iar cu acordul distribuitorului putem folosi și postul de transformare exact. Cu cât un furnizor are mai mulți clienți într-o zonă, cu atât dovada e mai puternică.

**„Tensiunea e simulată. De ce să credem acuratețea?”**
Pentru că nu ne bazăm doar pe simulator. Testul de robustețe arată că detectorul nu se încurcă la nori, la goluri de date sau la date luate la 5 minute. Testul pe date reale de la case adevărate arată câte alarme false ar fi dat. Nu există date publice de tensiune pe străzile din România, iar acesta e chiar golul pe care îl acoperim.

**„De ce nu folosiți machine learning?”**
Pentru că n-avem defecte reale etichetate, iar un model antrenat pe simularea noastră ar învăța doar regulile simulatorului. În plus, distribuitorul trebuie să afle *de ce*: „254 V și 2 vecini opriți în același minut” convinge, „modelul a zis 0,87” nu. Compararea fiecărei case cu vecinii e chiar detecție de anomalii fără etichete. Peste ea putem pune un strat statistic pentru derive lente (murdărie, un string care cedează), dar verdictul rețea/echipament rămâne pe reguli citibile.

**„Ce câștigă omul din sesizare?”**
Nu promitem despăgubiri. Distribuitorul e obligat să verifice și să remedieze calitatea tensiunii, iar un dosar cu date, ore și grafice e mult mai greu de ignorat decât un telefon. Ce au primit cei care au făcut deja sesizare: *[de confirmat; nu avem încă un caz documentat]*.

## 9. Ce construim acum și cum creștem

### Ce implementăm acum, pentru demo (24 de ore)

- **Strada simulată** cu 12 case, în 5 orașe (București, Cluj, Iași, Timișoara, Constanța), cu producție solară reală din PVGIS și tensiune calculată cu un model fizic.
- **Detectorul:** fiecare oprire e clasificată ca rețea, echipament, pană de curent sau lipsă de date, cu energia pierdută în kWh și lei.
- **Dosarul de sesizare** în PDF, adresat automat distribuitorului din județul casei.
- **Alerta pe Telegram** pentru tehnician și tichetul care se închide doar când datele confirmă reparația (verificat, redeschis sau dovezi insuficiente), plus tichetele trimise de clienți.
- **Verificarea bateriei** față de ce a vrut proprietarul, cu importul evitabil în lei și istoricul setărilor („a început după schimbarea din 3 iulie”).
- **O singură interfață de adaptor** pentru toate brandurile; la hackathon, datele vin din adaptorul simulat.
- **Site-ul** cu panoul clientului și panoul furnizorului.
- **Invertor vs. contor vs. factură**, pe facturi sintetice cu două erori plantate.
- **„Cine vede ce”:** permisiuni și jurnalul de acces.
- **Evaluarea:** cât de des avem dreptate, pe zeci de zile aleatoare, la date la 1 și la 5 minute, plus alarmele false pe date reale.
- **Dacă rămâne timp:** prețurile OPCOM PZU, ca să arătăm cât valorează un kWh la prânz față de seară.

Toate datele de tensiune, facturile și invertoarele sunt simulate. Producția solară e reală.

### Ce vine după demo

**Pasul 1, primele 3 luni: date reale de la primele case**
- Conectori reali, doar pentru citire: Huawei FusionSolar și Fronius (cele mai răspândite în România), apoi SolarEdge, Deye și Growatt.
- Un pilot cu un furnizor sau o firmă de O&M, pe 50–100 de case din același cartier, ca să avem vecini reali.
- Importul automat al curbei de sarcină din portalul distribuitorului și al facturii (PDF sau e-Factura).
- Aplicația mobilă, peste aceleași date (până atunci, alertele vin pe Telegram).

**Pasul 2, 3–12 luni: din casă în casă, pe toată țara**
- Harta tensiunii pe străzi, construită din datele clienților care și-au dat acordul. Azi nu există date publice despre asta în România.
- Raportul lunar pe post de transformare pentru distribuitor: „pe strada X, 14 case s-au oprit de 60 de ori în iulie”. Distribuitorul vede unde să investească, fără acces la invertoare.
- Verificarea programelor de baterie ale furnizorilor și a agregatorilor (YellowGrid, programe de tip Electrica): câștigă omul net sau nu?
- Simularea „merită o baterie mai mare?”, pe datele reale ale casei, înainte de Casa Verde Baterii.

**Pasul 3, peste un an: mai mult decât panouri**
- Pompe de căldură, încărcătoare de mașini electrice și alte aparate mari, ca să vedem când lucrează unele împotriva altora.
- Comunitățile de energie (prevăzute de lege), unde vecinii împart energia și au nevoie de o evidență comună în care să aibă încredere.
- Alte țări din regiune cu aceeași problemă (Ungaria, Bulgaria, Polonia), pentru că metoda cu vecinii nu ține de România.

**Ce nu facem nici pe viitor:** nu controlăm invertoarele și nu cerem parole. Citim, verificăm și dăm dovezi. Decizia rămâne la om.

## 10. Ce spunem deschis

- Tensiunea și facturile din demo sunt **simulate**. Producția solară e reală.
- Nu controlăm invertoare și nu schimbăm setări. **Doar citim.**
- Nu promitem despăgubiri din sesizare. Valoarea e că distribuitorul trebuie să verifice și să repare.

## 11. Ce folosim tehnic

### Limbaj și biblioteci

| Ce | Pentru ce |
|---|---|
| **Python 3.12** | Tot codul: simulatorul, detectorul, calculele |
| **pandas, numpy** | Citirile la minut ale caselor, agregarea la 5 și la 15 minute, calculele de kWh și lei |
| **SQLite** | Baza de date locală: citiri, evenimente, tichete, permisiuni, jurnalul de acces. Nu cere server |
| **HTML + Leaflet** | Interfața: site-ul cu panoul clientului, panoul furnizorului și harta străzilor colorată după stare, cu aceeași simulare portată în JavaScript |
| **Scriptul de demo** (`python -m sunproof.demo`) | Rulează motorul real în demo: ziua simulată, defectul, dosarul PDF, alerta pe Telegram, evaluarea |
| **matplotlib** | Graficele din PDF (tensiunea pe zi, cu linia de 253 V) |
| **fpdf2** | Generarea dosarului de sesizare în PDF |
| **httpx** | Apelurile HTTP: Telegram, PVGIS, Claude, priza smart |
| **pytest** | Testele, cu valori exacte (de exemplu 4,8 kWh pierduți, 3,20 lei bonus ratat) |

### API-uri și surse de date

| API sau sursă | Ce luăm de acolo | În demo |
|---|---|---|
| **PVGIS** (Comisia Europeană, JRC), endpoint `seriescalc` | Producția solară orară reală pentru 5 orașe, anul 2020, cu norii reali | Real. Îl descărcăm o dată, cu `scripts/download_data.sh` |
| **Claude API** (Anthropic, biblioteca `anthropic`) | Redactarea scrisorii de sesizare și a mesajelor, plus copilotul care răspunde la „de ce n-am produs azi?” | Real, cu cheie API. Cu `DEMO_MODE=1`, răspunsurile vin din cache, ca demo-ul să nu depindă de internet |
| **Telegram Bot API** (`sendMessage`) | Alerta către tehnician când e un defect de echipament | Real: mesajul ajunge pe telefon. Dacă nu e internet, alertele stau la coadă și pleacă după, în ordine |
| **Huawei FusionSolar Northbound API** și **Fronius Solar API** (`GetInverterRealtimeData`, câmpul `UAC`) | În produsul real: puterea, tensiunea rețelei, starea și alarmele invertorului | Doar interfața adaptorului. Datele vin din simulator, în același format |
| **Exportul curbei de sarcină** din portalul distribuitorului (CSV, import/export la 15 minute) | Ce spune contorul, pentru consumul real al casei și pentru verificarea facturii | Generat din simulator, în același format |
| **OPCOM PZU** (prețurile orare pe ziua următoare) | Cât valorează energia la fiecare oră: prânz vs. seară, la baterie și la factură | Opțional, dacă rămâne timp; descărcat de pe laptop |
| **Shelly**, API HTTP local | Priza smart care pornește boilerul când tensiunea urcă (opțional) | Simulată |

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
| `adapters.py` | Interfața unică pentru toate brandurile: orice invertor intră în aceeași schemă de citiri. La hackathon e implementat doar adaptorul simulat |
| `config.py` | Toate pragurile într-un singur loc: 253 V (medie pe 10 minute), 264,5 V instantaneu, repornire după 15 minute, ferestrele bateriei. Nimic nu e scris direct în cod |
| `profiles.py` | Transformă datele PVGIS orare în date la minut și generează consumul fiecărei case (vârf dimineața și seara) |
| `feeder.py` | Simulatorul străzii: 12 case pe un cablu, tensiunea crește spre capăt cu cât se trimite mai multă energie. Invertorul se oprește peste prag, exact ca în realitate. Bateria, defectele de invertor și stringul pe jumătate inactiv sunt incluse |
| `events.py` | Detectorul: găsește opririle și le clasifică în rețea, echipament, pană de curent, reducere de putere sau lipsă de date. Calculează energia pierdută față de vecini |
| `store.py` | Salvarea în SQLite și simularea unei luni întregi |
| `dossier.py` | Dosarul PDF: scrisoarea, tabelul opririlor și graficul tensiunii. Cifrele din textul scris de AI sunt verificate în cod |
| `om.py` | Tichetele pentru tehnicieni (deschis, rezolvat, verificat, redeschis, dovezi insuficiente), tichetele trimise de clienți, coada de alerte Telegram, harta și contorul „deplasări inutile evitate” |
| `battery.py` | Verificarea bateriei: intenția proprietarului vs. setarea vs. ce s-a măsurat, istoricul setărilor, importul evitabil și bonusul ratat |
| `reconcile.py` | Invertor vs. contor vs. factură și consumul real calculat fără contor nou (producție + import − export) |
| `consent.py` | Cine vede ce: permisiuni pe categorii și jurnalul de acces. Orice dată pentru terți trece doar pe aici |
| `copilot.py` | Asistentul: Claude, cu unelte care citesc din baza de date. Cifrele vin din unelte, nu din model |
| `evaluate.py` | Evaluarea: zeci de zile aleatoare cu defecte puse la întâmplare, apoi acuratețea clasificării la 1 și la 5 minute |

### Reguli tehnice importante

- **Detecția e deterministă.** AI-ul nu decide nimic, doar scrie text. Aceleași date dau mereu același rezultat.
- **Testele nu au nevoie de internet:** AI-ul e înlocuit în teste cu unul fals (`FakeLLM`).
- **Calibrăm și raportăm pe date diferite:** pragurile se aleg pe seed-ul 1, iar acuratețea se raportează pe seed-ul 2, ca să nu ne păcălim singuri.
- **Fără hardware și fără control:** doar citim date, nu schimbăm setări pe invertor.
- **Cheile API** (Claude, Telegram) stau în variabile de mediu, nu în cod și nu pe GitHub.

---
*De confirmat înainte de pitch:* citatele exacte din interviurile 1 și 2, numărul de opriri pe lună și sursa cifrei 460 (vezi `docs/interviews/2026-10-24-sinteza-dovezi-interviuri.md`). Acuratețea din evaluare e integrată în secțiunea 5.
