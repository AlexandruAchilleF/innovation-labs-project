# SunProof — Interview Questions & Raw Quotes

Acest document conține:
1. **Ghidul de interviu (Interview Guide)** folosit de echipă (structurat pe roluri, fără întrebări sugestive și fără prezentarea soluției la început);
2. **Citatele brute, cuvânt cu cuvânt (Raw Verbatim Quotes)** colectate din interviurile cu mentorii, specialiștii din energie (furnizor) și prosumatorii, plus mărturiile publice documentate.

---

# Partea 1: Interview Guide (Ghidul de Interviu)

**Reguli aplicate în toate interviurile:**
- Nu prezentăm ideea sau prototipul înainte de întrebări, pentru a evita confirmările din politețe.
- Întrebăm doar despre situații trecute, frecvență și costuri în bani/timp (nu *„ați folosi o aplicație care...?”*).
- Un membru al echipei conduce discuția, celălalt notează expresiile exacte.

### A. Întrebări pentru Mentori & Reprezentanți Furnizori (B2B — Clientul plătitor)
1. *„Din ce rol ne răspundeți (furnizor, distribuitor, O&M/instalator, business) și care a fost ultima situație concretă în care un client cu panouri fotovoltaice v-a creat o problemă operațională sau un cost?”*
2. *„Când un prosumator sună că i s-au oprit panourile la prânz sau că factura e prea mare, cum aflați astăzi dacă e vina rețelei de distribuție, a instalației din casă sau a facturării? Cât durează și cât vă costă?”*
3. *„Din apelurile venite de la prosumatori, câte sunt despre factură și câte despre «nu-mi produce sistemul»?”*
4. *„Vă costă faptul că prosumatorii injectează energie la prânz (când prețul PZU e jos) și o consumă înapoi seara (când e vârful de preț)? Cum verificați astăzi dacă bateriile lor chiar livrează seara?”*
5. *„Cine ar trebui să plătească pentru o soluție care vede în spatele contorului — prosumatorul sau furnizorul? Din ce buget și ce v-ar convinge să o cumpărați (ROI)?”*

### B. Întrebări pentru Prosumatori (Utilizatorul final)
1. *„De câte ori ți s-a oprit invertorul vara asta la prânz, când era soarele mai puternic? De unde ai aflat și după cât timp?”*
2. *„Pe cine ai sunat prima dată — instalatorul, furnizorul sau distribuitorul? Ce ți-au răspuns fiecare?”*
3. *„Cum e setată bateria ta acum în aplicație (ce procent de rezervă are)? Cine a pus setarea asta și ți s-a întâmplat seara să ai bateria încărcată, dar casa să tragă curent din rețea?”*
4. *„Ai înțeles ultima factură de prosumator? Ai plăti un abonament lunar pentru o aplicație care îți verifică sistemul sau te aștepți să fie inclusă de furnizor?”*

### C. Întrebări pentru Instalatori / Echipe O&M
1. *„Câte sesizări de tipul «nu-mi produce invertorul» ați avut luna trecută și câte s-au dovedit la fața locului a fi supratensiune din rețea (>253 V), nu defect de echipament?”*
2. *„Cât vă costă o deplasare de echipă pe teren și câte vizite faceți degeaba pentru că nu aveți diagnoza înainte să plecați?”*
3. *„De câte ori ați închis un tichet ca «rezolvat» și problema a revenit în următoarele zile?”*

---

# Partea 2: Raw Quotes (Citate Exacte, Cuvânt cu Cuvânt)

### 1. Interviu Mentor #1 (Business & Strategie Energy / B2B)
**Context:** Discuție despre modelul de monetizare (cine plătește), riscul de a construi funcționalități pe presupuneri și confirmarea supraîncărcării rețelei.

- **Despre B2B (Furnizor) vs. B2C (Prosumator):**
  > *„Nu încercați să luați bani de la prosumator, că omul și-a pus panouri tocmai ca să nu mai dea bani. Pentru prosumator dați o variantă gratuită, să vadă ce se întâmplă în casă, și mergeți B2B către furnizori — ei au volumul, ei au durerea de cap și ei plătesc dacă le simplificați treaba și le eficientizați procesele.”*

- **Despre ROI (Return on Investment) și politica de preț:**
  > *„Un furnizor nu cumpără că aveți voi o aplicație frumoasă, cumpără doar dacă îi puneți pe masă ROI-ul: câți lei pierde azi și câți lei îi rămân în buzunar după ce vă plătește pe voi. Dacă valoarea pe care i-o aduceți nu bate clar costul investiției, nu se uită la voi. Și atenție la preț: calculați-vă bine costurile voastre de dezvoltare, operare și mentenanță, ca să nu vindeți în pierdere.”*

- **Despre supraîncărcarea rețelei pe intervale orare:**
  > *„Problema cu supraîncărcarea rețelei pe anumite intervale orare e cât se poate de reală, mai ales la prânz când bagă toți în rețea. Acolo pierd și prosumatorii, și furnizorii. Țineți-vă de problema asta și arătați clar cum ajutați ambele părți.”*

- **Despre validarea problemei înainte de implementare:**
  > *„Nu vă apucați să scrieți cod și să băgați funcționalități doar pe presupunerile voastre despre ce credeți voi că ar fi util. Cel mai mare risc e să construiți ceva ce vi se pare vouă valoros, dar pe care piața nu-l caută. Porniți de la o problemă bine înțeleasă și validată cu oameni din industrie — de ce apare, cât costă, de ce nu merg soluțiile de azi — nu de la o soluție pe care încercați după aia s-o justificați.”*

---

### 2. Interviu Specialist din Industrie — Furnizor de Energie
**Context:** Discuție cu o persoană care lucrează în sectorul de furnizare despre reclamațiile prosumatorilor, pasarea vinei între actori și costul orelor de vârf.

- **Despre apelurile prosumatorilor când se opresc panourile la prânz:**
  > *„Când îi sare invertorul la prânz sau îi vine factura, omul nu știe cine e distribuitorul și cine e furnizorul — el ne sună pe noi, că de la noi îi vine factura. Și noi suntem obligați să-i luăm sesizarea, dar în call center ești legat la ochi: nu vezi ce face invertorul lui în casă, nu știi dacă a sărit tensiunea pe stradă peste 253 de volți sau dacă i-a montat instalatorul prost echipamentul.”*

- **Despre deplasările inutile și dezechilibrul prânz–seară:**
  > *„Dacă i-am vândut tot noi pachetul de panouri, ajungem să trimitem echipa pe teren și constatăm că instalația n-are nimic, e doar rețeaua încărcată la prânz. Iar pe partea comercială, pe noi ne arde vârful de seară: îi iei curentul la prânz când e ieftin pe piață și i-l dai înapoi la opt seara când prețul sare în aer.”*

---

### 3. Interviu Prosumator Rezidențial (6 kWp + baterie)
**Context:** Proprietar de casă cu sistem fotovoltaic care s-a confruntat cu opriri repetate la prânz și lipsa unui răspuns din partea instalatorului și a distribuitorului.

- **Despre opririle la prânz și pasarea responsabilității:**
  > *„La prânz, fix când e soarele sus și ar trebui să producă maxim, mă uit în aplicație și văd că invertorul e în zero, s-a oprit singur. Am sunat la băieții care mi l-au montat, ei mi-au zis direct că nu e de la ei, că e tensiunea prea mare pe stradă de la distribuitor. Suni la distribuție, ăia îți zic că la ei rețeaua e în parametri și să-mi verific invertorul. Rămâi la mijloc ca prostul și pierzi curentul în cele mai bune ore.”*

- **Despre setările bateriei:**
  > *„Eu habar n-am ce praguri au lăsat în meniul de instalator când au plecat. Dacă aplicația nu-ți dă eroare cu roșu, tu crezi că totul merge bine, și abia când vine factura vezi că seara ai tras curent din rețea.”*

---

### 4. Citate Verbatim din Cazuri Documentate și Asociații din Industrie (România, 2025–2026)
Pentru a valida că experiențele din interviurile directe se repetă la nivelul întregii piețe (385.791 prosumatori), am extras cuvintele exacte din declarațiile publice și comunitățile de prosumatori:

- **Asociația Prosumatorilor și a Comunităților de Energie (APCE) — despre pragul de 253 V:**
  > *„Când tensiunea din rețea depășește 253 V, echipamentele prosumatorilor se opresc automat.”*
  *(Sursă: Declarație oficială Dan Pîrșan / APCE, Economica.net)*

- **Electrica Furnizare (CEO Alexandru Chiriță) — despre nevoia furnizorilor de a muta injecția din baterii în vârful de seară (pilotul de bonus 0,40 lei/kWh, august 2026):**
  > *„Nu vă cerem să reduceți nimic. Vă cerem să mutați.”*
  *(Sursă: Comunicat oficial Electrica Furnizare, „Ținem România Aprinsă”, august 2026)*

- **Distribuție Energie Oltenia (DEO) — despre ponderea instalațiilor de prosumator configurate greșit în teren:**
  > *„În 60% dintre cazuri, instalațiile prosumatorilor nu respectă parametrii tehnici.”* (276 din 460 de invertoare verificate în teren nu aveau setările obligatorii conform Ordinului ANRE 132/2020).
  *(Sursă: Poziție oficială DEO, HotNews)*

- **Mărturie Prosumator (Cazul Softpedia — 15–20 vizite fără diagnostic):**
  > *„Au venit de 15–20 de ori fără să pună un diagnostic clar, de fiecare dată ziceau că au rezolvat din setări și a doua zi la prânz făcea exact la fel.”*
  *(Sursă: Forum Softpedia, topic reclamație instalație fotovoltaică, ianuarie 2026)*

- **Mărturie Prosumator (Comunitatea Reddit `r/panourifotovoltaice` — baterie blocată seara):**
  > *„Am bateria plină (80–100%), dar seara casa ia curent din rețea în loc să descarce din baterie. Instalatorul nu mai răspunde la telefon, știe cineva ce setare trebuie schimbată?”*
  *(Sursă: Reddit `r/panourifotovoltaice`, thread „Consum din rețea cu bateria plină”)*
