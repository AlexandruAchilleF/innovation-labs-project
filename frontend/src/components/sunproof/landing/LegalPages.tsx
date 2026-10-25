import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ProsumerEntry, SupplierEntry } from "./RoleEntry";

export type LegalDocKey = "termeni" | "confidentialitate" | "cookies";

interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: [label: string, detail: string][];
}

interface LegalDocument {
  key: LegalDocKey;
  path: "/termeni" | "/confidentialitate" | "/cookies";
  shortTitle: string;
  title: string;
  subtitle: string;
  updatedAt: string;
  effectiveDate: string;
  summaryPoints: [label: string, value: string][];
  sections: LegalSection[];
}

const LEGAL_DOCUMENTS: Record<LegalDocKey, LegalDocument> = {
  termeni: {
    key: "termeni",
    path: "/termeni",
    shortTitle: "Termeni și condiții",
    title: "Termeni și condiții de utilizare",
    subtitle:
      "Condițiile contractuale și tehnice aplicabile utilizării platformei SunProof de către furnizorii de energie electrică, operatorii O&M și prosumatorii din România.",
    updatedAt: "August 2026",
    effectiveDate: "1 august 2026",
    summaryPoints: [
      ["Regim aplicabil", "Legea 160/2026 · Ordinul ANRE nr. 15/2022"],
      ["Standard tehnic rețea", "SR EN 50549-1 (prag supratensiune 253,0 V)"],
      ["Jurisdicție", "România · Instanțele competente din București"],
    ],
    sections: [
      {
        id: "obiect",
        title: "1. Obiectul serviciului și identificarea platformei",
        paragraphs: [
          "Prezentul document («Termenii și condițiile») reglementează accesul și utilizarea platformei software SunProof («Platforma»), un sistem determinist de analiză, diagnostic tehnic și reconciliere energetică destinat furnizorilor de energie electrică, echipelor de operare și mentenanță (O&M) și prosumatorilor racordate la rețelele electrice de joasă tensiune din România.",
          "Prin accesarea interfeței web, consultarea hărților de contur de joasă tensiune, generarea dosarelor tehnice PDF pentru operatorii de distribuție sau utilizarea portalului dedicat prosumatorului, utilizatorul confirmă că a citit, a înțeles și acceptă în mod necondiționat prezentele condiții legale.",
        ],
      },
      {
        id: "definitii",
        title: "2. Definiții și termeni de specialitate",
        paragraphs: [
          "În sensul prezentului acord, termenii de mai jos au semnificațiile stabilite de legislația națională în domeniul energiei electrice (Legea energiei electrice și a gazelor naturale nr. 123/2012, cu modificările aduse prin Legea nr. 160/2026) și de reglementările Autorității Naționale de Reglementare în Domeniul Energiei (ANRE):",
        ],
        bullets: [
          [
            "Prosumator",
            "Clientul final care își desfășoară activitățile în spațiul propriu și care produce energie electrică din surse regenerabile (fotovoltaice) pentru consumul propriu, având capacitatea de a stoca și de a injecta surplusul în rețeaua operatorului de distribuție.",
          ],
          [
            "Operator de Distribuție (OD)",
            "Entitatea titulară a unei licențe de distribuție care deține, exploatează și întreține rețeaua electrică de joasă și medie tensiune (inclusiv posturile de transformare și fiderele aferente).",
          ],
          [
            "Contor inteligent (Smart Meter)",
            "Echipamentul de măsurare omologat care înregistrează curba de sarcină la intervale de 15 minute pe indecșii standardizați OBIS 1.8.0 (energie activă consumată din rețea) și 2.8.0 (energie activă injectată în rețea).",
          ],
          [
            "Motoare deterministe SunProof",
            "Algoritmii matematici și fizici rulați în cadrul Platformei care calculează cauzele opririlor de invertor în orele de vârf ale producției solare, randamentul de arbitraj al bateriei pe Piața pentru Ziua Următoare (OPCOM PZU) și reconcilierea cantitativă 1:1 a facturilor.",
          ],
          [
            "Garda numerică (Numeric Guardrail)",
            "Mecanismul intern de siguranță prin care orice text explicativ este validat strict împotriva valorilor numerice calculate de motoarele deterministe, respingând automat orice cifră neconfirmată și revenind la șabloanele verificate.",
          ],
        ],
      },
      {
        id: "arhitectura-verdicte",
        title: "3. Natura deterministă a diagnosticelor și limitele tehnice",
        paragraphs: [
          "SunProof funcționează pe principiul separării stricte între decizia algoritmică și explicația în limbaj natural: motoarele deterministe decid, iar textul doar explică cifrele deja calculate. Platforma evaluează trei ipoteze tehnice principale pentru fiecare instalație:",
        ],
        bullets: [
          [
            "Diagnosticul supratensiunii (EN 50549-1)",
            "Separarea dintre supratensiunea de rețea (creșterea simultană a tensiunii peste pragul de 253,0 V la mai multe echipamente racordate pe același transformator și fider) și defecțiunea instalației locale (cădere sau creștere de tensiune pe cablul intern subdimensionat dintre invertor și contor, în timp ce rețeaua din zonă rămâne în parametri normali).",
          ],
          [
            "Auditul configurației bateriei",
            "Compararea intenției declarate a prosumatorului cu parametrii efectiv programați în invertor (ex. rezervă de avarie / backup excesivă, ferestre de timp blocate sau regim exclusiv de autoconsum) și cuantificarea valorii pierdute în vârful de seară conform cotațiilor orare OPCOM PZU.",
          ],
          [
            "Reconcilierea facturii (Legea 160/2026)",
            "Verificarea încrucișată între telemetria invertorului, indecșii la 15 minute ai contorului inteligent (1.8.0 / 2.8.0) și energia activă compensată cantitativ 1:1 pe factura emisă de furnizor.",
          ],
        ],
      },
      {
        id: "obligatii-utilizatori",
        title: "4. Drepturile și obligațiile utilizatorilor",
        paragraphs: [
          "Utilizarea Platformei este permisă exclusiv în scopuri legitime de monitorizare energetică, triaj operațional, asistență tehnică pentru clienți și pregătirea documentației probatorii în relația cu operatorii de distribuție sau cu ANRE.",
        ],
        bullets: [
          [
            "Interdicția intervențiilor neautorizate în instalații",
            "Recomandările afișate în portalul prosumatorului vizează exclusiv setările software din aplicația mobilă a invertorului (ex. reducerea pragului de rezervă SOC sau activarea regimului TOU). Orice intervenție fizică asupra tabloului electric, cablajului AC/DC, sigiliilor contorului sau protecțiilor de rețea trebuie efectuată exclusiv de electricieni autorizați ANRE.",
          ],
          [
            "Respectarea parametrilor de racordare",
            "Utilizatorilor le este strict interzis să modifice în invertor pragurile de protecție la supratensiune peste limitele impuse de standardul SR EN 50549-1 și de avizul tehnic de racordare (ATR) emis de operatorul de distribuție.",
          ],
          [
            "Integritatea datelor și securitatea accesului",
            "Furnizorii și operatorii O&M au obligația de a proteja credențialele de acces, de a respecta confidențialitatea datelor de telemetrie ale instalațiilor monitorizate și de a nu utiliza API-urile Platformei pentru interogări abuzive sau inginerie inversă.",
          ],
        ],
      },
      {
        id: "portofoliu-demonstrativ",
        title: "5. Regimul datelor demonstrative și al simulărilor «What-If»",
        paragraphs: [
          "Mediul demonstrativ public al Platformei include un portofoliu sintetic calibrat fizic (81 de scenarii de instalații distribuite în 8 rețele de joasă tensiune din România), construit pe baza ecuațiilor de flux de putere și a profilurilor reale de iradiere și preț OPCOM PZU din august 2026.",
          "Simulările de tip «Ce-ar fi dacă» (ex. reglajul prizei transformatorului din postul de transformare, activarea regimului Volt-VAR Q(U) la invertoare sau eliberarea rezervelor de baterie în vârful de seară) au caracter analitic și estimativ. Aplicarea în teren a măsurilor pe rețeaua de distribuție cade în competența exclusivă a Operatorului de Distribuție concesionar.",
        ],
      },
      {
        id: "proprietate-intelectuala",
        title: "6. Proprietate intelectuală și licență de utilizare",
        paragraphs: [
          "Întregul conținut al Platformei — incluzând, fără limitare, arhitectura motoarelor deterministe de diagnostic, modelele fizice de rețea, mecanismul de gardă numerică, codul sursă, reprezentările cartografice, graficele vectoriale și identitatea vizuală SunProof — este protejat de legislația română și europeană privind drepturile de autor și proprietatea intelectuală.",
          "Dosarele tehnice PDF generate de Platformă pot fi descărcate, arhivate și transmise fără restricții către operatorii de distribuție, instalatori, furnizori sau ANRE în vederea soluționării sesizărilor tehnice sau de facturare.",
        ],
      },
      {
        id: "limitare-raspundere",
        title: "7. Limitarea răspunderii",
        paragraphs: [
          "SunProof furnizează diagnostice bazate pe datele telemetrice și pe citirile contoarelor inteligente recepționate din sistemele terțe (invertoare, sisteme de telegestiune SMI/AMM, platforme de facturare). Platforma nu garantează lipsa erorilor de transmisie din rețelele de comunicații ale terților și nu poate fi ținută răspunzătoare pentru:",
        ],
        bullets: [
          [
            "Întreruperi sau limitări în rețeaua publică",
            "Pierderile de producție cauzate de declanșarea protecțiilor la supratensiune (253,0 V), întreruperile programate sau accidentale în rețeaua de distribuție ori întârzierile operatorului de distribuție în soluționarea sesizărilor.",
          ],
          [
            "Fluctuațiile pieței de energie",
            "Variațiile cotațiilor orare pe Piața pentru Ziua Următoare (OPCOM PZU), modificările tarifelor reglementate de distribuție/transport sau schimbările legislative ulterioare privind mecanismul de compensare cantitativă.",
          ],
          [
            "Intervenții neconforme",
            "Daunele materiale sau pierderile financiare rezultate din modificarea neautorizată a parametrilor de rețea ai invertorului sau din intervenții fizice executate de persoane neautorizate ANRE.",
          ],
        ],
      },
      {
        id: "legea-aplicabila",
        title: "8. Legea aplicabilă, soluționarea litigiilor și contact",
        paragraphs: [
          "Prezenții Termeni și condiții sunt guvernați și interpretați în conformitate cu legislația din România și cu reglementările aplicabile ale Uniunii Europene. Orice neînțelegere decurgând din utilizarea Platformei va fi soluționată pe cale amiabilă, iar în cazul în care acest lucru nu este posibil, litigiul va fi înaintat instanțelor judecătorești competente din Municipiul București.",
          "Pentru aspecte legate de reglementările sectoriale în domeniul energiei electrice, utilizatorii se pot adresa Autorității Naționale de Reglementare în Domeniul Energiei (ANRE — www.anre.ro), iar consumatorii persoane fizice pot apela la mecanismele de soluționare alternativă a litigiilor (SAL / ANPC).",
        ],
      },
    ],
  },
  confidentialitate: {
    key: "confidentialitate",
    path: "/confidentialitate",
    shortTitle: "Politică de confidențialitate",
    title: "Politică de confidențialitate și protecția datelor (GDPR)",
    subtitle:
      "Informare completă privind prelucrarea datelor cu caracter personal și a telemetriei energetice în conformitate cu Regulamentul (UE) 2016/679 (GDPR) și Legea nr. 190/2018.",
    updatedAt: "August 2026",
    effectiveDate: "1 august 2026",
    summaryPoints: [
      ["Reglementare", "Regulamentul (UE) 2016/679 (GDPR) · Legea 190/2018"],
      ["Suveranitatea datelor", "Procesare deterministă în UE · Gardă numerică activă"],
      ["Autoritate de supraveghere", "ANSPDCP România (www.dataprotection.ro)"],
    ],
    sections: [
      {
        id: "operator-date",
        title: "1. Operatorul de date și cadrul legal",
        paragraphs: [
          "Prezenta Politică de confidențialitate descrie modul în care platforma SunProof («Platforma») colectează, prelucrează, stochează și protejează datele cu caracter personal și datele tehnice asociate punctelor de consum și de producție (POD), în strictă conformitate cu Regulamentul (UE) 2016/679 privind protecția persoanelor fizice în ceea ce privește prelucrarea datelor cu caracter personal («GDPR») și cu Legea nr. 190/2018 privind măsuri de punere în aplicare a GDPR în România.",
          "În funcție de modul de utilizare a Platformei, SunProof acționează fie în calitate de Persoană Împuternicită de Operator (atunci când prelucrează datele portofoliului de prosumatori în numele și pe baza instrucțiunilor unui Furnizor de energie electrică licențiat), fie în calitate de Operator independent (pentru datele de navigare și conturile directe din Platformă).",
        ],
      },
      {
        id: "categorii-date",
        title: "2. Categorii de date prelucrate",
        paragraphs: [
          "Conform jurisprudenței și orientărilor europene în sectorul energetic, datele de telemetrie și curbele de sarcină înregistrate la nivel de instalație constituie date cu caracter personal atunci când pot fi asociate unui titular de contract sau unui cod unic de identificare a punctului de măsurare (POD). SunProof prelucrează exclusiv datele strict necesare diagnosticului tehnic și financiar:",
        ],
        bullets: [
          [
            "Date de identificare a locului de consum/producție",
            "Identificatorul intern al instalației, numele titularului (în mediul demonstrativ: exclusiv identități sintetice), localitatea, județul, operatorul de distribuție concesionar, codul postului de transformare (PT) și fiderul de joasă tensiune.",
          ],
          [
            "Telemetrie tehnică de la invertor și baterie",
            "Serii de timp (tensiune AC în volți, putere activă produsă în kW, putere de încărcare/descărcare a bateriei în kW, stare de încărcare SOC în %, stare operațională a invertorului și pragul configurat de decuplare la supratensiune).",
          ],
          [
            "Date de măsurare din contorul inteligent (Smart Meter)",
            "Intervalele de măsurare la 15 minute pentru energia activă consumată din rețea (index OBIS 1.8.0) și energia activă injectată în rețea (index OBIS 2.8.0).",
          ],
          [
            "Date de facturare și decontare prosumator",
            "Sumele lunare facturate, cantitățile de energie activă compensată cantitativ 1:1 conform Legii 160/2026, soldul reportat de energie și regimul de decontare aplicabil.",
          ],
          [
            "Date de analiză a echipamentelor din zonă (anonimizate la nivel de fider)",
            "Pentru determinarea simultaneității supratensiunii pe transformator, Platforma calculează indicatori agregați (rata de simultaneitate a decuplărilor pe același fider) fără a expune unui prosumator identitatea proprietarilor sau consumul privat asociat celorlalte echipamente.",
          ],
        ],
      },
      {
        id: "scopuri-temeiuri",
        title: "3. Scopurile și temeiurile legale ale prelucrării (Art. 6 GDPR)",
        paragraphs: [
          "Datele sunt prelucrate exclusiv pentru următoarele scopuri determinate, explicite și legitime:",
        ],
        bullets: [
          [
            "Executarea contractului și furnizarea serviciului de diagnostic (Art. 6 alin. 1 lit. b GDPR)",
            "Identificarea cauzelor opririlor de invertor în orele de vârf ale producției solare, diagnosticarea rezervelor de baterie blocate și verificarea corectitudinii facturilor lunare de prosumator.",
          ],
          [
            "Îndeplinirea obligațiilor legale din sectorul energetic (Art. 6 alin. 1 lit. c GDPR)",
            "Asigurarea conformității cu regulile de compensare cantitativă prevăzute de Legea nr. 160/2026, standardele de calitate a energiei electrice și procedurile ANRE de soluționare a reclamațiilor.",
          ],
          [
            "Interesul legitim al operatorului și al prosumatorului (Art. 6 alin. 1 lit. f GDPR)",
            "Prevenirea deplasărilor inutile ale echipelor tehnice în teren (truck rolls), protejarea echipamentelor împotriva regimurilor de supratensiune și generarea dosarelor tehnice probatorii pentru operatorul de distribuție.",
          ],
          [
            "Consimțământul utilizatorului (Art. 6 alin. 1 lit. a GDPR)",
            "Aplicabil exclusiv pentru funcționalități opționale, precum transmiterea alertelor tehnice în timp real sau integrarea unor canale suplimentare de notificare.",
          ],
        ],
      },
      {
        id: "decizii-automate",
        title: "4. Procesarea algoritmică, explicațiile asistate și Articolul 22 GDPR",
        paragraphs: [
          "SunProof nu ia decizii exclusiv automate care să producă efecte juridice negative asupra prosumatorului în sensul Art. 22 din GDPR. Toate verdictele tehnice (cauza supratensiunii, starea bateriei, reconcilierea facturii) sunt calculate prin formule fizice și contabile transparente, auditabile pas cu pas.",
          "Atunci când Platforma generează explicații în limbaj natural în limba română (fie prin șabloane deterministe, fie prin modele lingvistice de mari dimensiuni — LLM), datele personale de identificare directă sunt minimizate, iar fiecare număr din textul generat este verificat de Garda Numerică (Numeric Guardrail) împotriva faptelor deterministe. Orice abatere numerică determină respingerea automată a textului și afișarea șablonului determinist verificat.",
        ],
      },
      {
        id: "destinatari",
        title: "5. Destinatarii datelor și transferurile de date",
        paragraphs: [
          "Datele prelucrate în cadrul Platformei nu sunt vândute, închiriate și nu sunt utilizate în scopuri de publicitate comportamentală. Accesul la date este limitat strict la:",
        ],
        bullets: [
          [
            "Furnizorul de energie electrică și echipele O&M",
            "Personalul autorizat care gestionează portofoliul de prosumatori, tichetele de asistență și alertele operaționale (inclusiv notificările tehnice transmise prin canalul securizat Telegram către inginerii de teren).",
          ],
          [
            "Operatorul de Distribuție concesionar",
            "Exclusiv în măsura în care utilizatorul sau furnizorul generează și transmite Dosarul Tehnic PDF de supratensiune pentru remedierea nivelului de tensiune în postul de transformare.",
          ],
          [
            "Furnizori de infrastructură cloud și procesare",
            "Infrastructura de găzduire și calcul situată în Spațiul Economic European (SEE) sau la furnizori care oferă garanții adecvate conform Art. 46 GDPR (Clauze Contractuale Standard).",
          ],
        ],
      },
      {
        id: "retentie-securitate",
        title: "6. Perioada de stocare și măsurile de securitate",
        paragraphs: [
          "Datele de telemetrie la nivel de minut și de 15 minute sunt păstrate pe durata contractuală necesară auditării ciclurilor anuale de decontare și compensare cantitativă (conform termenelor de prescripție și arhivare contabilă din legislația română, de regulă 3 ani pentru datele operaționale de măsurare și până la 5–10 ani pentru documentele financiar-contabile justificative).",
          "Platforma aplică măsuri tehnice și organizatorice de securitate: criptarea comunicațiilor în tranzit (TLS 1.3), izolarea logică a datelor pe instalații, controlul accesului bazat pe rol (Furnizor vs. Prosumator) și validarea integrității datelor la fiecare interogare.",
        ],
      },
      {
        id: "drepturi-gdpr",
        title: "7. Drepturile persoanelor vizate conform GDPR",
        paragraphs: [
          "În conformitate cu articolele 15–22 din Regulamentul (UE) 2016/679, fiecare prosumator sau utilizator persoană fizică beneficiază de următoarele drepturi:",
        ],
        bullets: [
          [
            "Dreptul de acces și de portabilitate (Art. 15 și Art. 20 GDPR)",
            "Dreptul de a obține confirmarea prelucrării datelor, accesul la valorile telemetrice înregistrate și descărcarea dosarului tehnic în format structurat.",
          ],
          [
            "Dreptul la rectificare (Art. 16 GDPR)",
            "Dreptul de a solicita corectarea datelor inexacte privind configurația instalației locale, puterea instalată sau indecșii contorului inteligent.",
          ],
          [
            "Dreptul la ștergerea datelor («dreptul de a fi uitat», Art. 17 GDPR)",
            "Dreptul de a solicita ștergerea datelor care nu mai sunt necesare pentru scopurile colectării, sub rezerva obligațiilor legale de păstrare a evidențelor energetice și fiscale.",
          ],
          [
            "Dreptul la restricționarea prelucrării și la opoziție (Art. 18 și Art. 21 GDPR)",
            "Dreptul de a solicita limitarea prelucrării în cazul contestării exactității datelor sau de a se opune prelucrărilor întemeiate pe interesul legitim.",
          ],
          [
            "Dreptul de a depune o plângere la ANSPDCP",
            "Dreptul de a vă adresa Autorității Naționale de Supraveghere a Prelucrării Datelor cu Caracter Personal (B-dul G-ral. Gheorghe Magheru nr. 28-30, Sector 1, București, www.dataprotection.ro).",
          ],
        ],
      },
    ],
  },
  cookies: {
    key: "cookies",
    path: "/cookies",
    shortTitle: "Politică de cookies",
    title: "Politică privind fișierele cookie și stocarea locală",
    subtitle:
      "Detalii tehnice privind absența modulelor de urmărire publicitară și modul în care SunProof utilizează stocarea locală strict necesară funcționării interfeței.",
    updatedAt: "August 2026",
    effectiveDate: "1 august 2026",
    summaryPoints: [
      ["Tracking publicitar", "0 module (fără Google Analytics, Meta Pixel sau terți)"],
      ["Cadrul legal", "Legea nr. 506/2004 · Directiva ePrivacy 2002/58/CE"],
      ["Stocare utilizată", "Exclusiv tehnică și funcțională (sesiune & cache interogări)"],
    ],
    sections: [
      {
        id: "principiu-zero-tracking",
        title: "1. Arhitectură fără module de urmărire (Zero Ad-Tracking)",
        paragraphs: [
          "Platforma SunProof este proiectată conform principiului confidențialității implicite («Privacy by Design»). Nu utilizăm module cookie de marketing, rețele de publicitate, pixeli de urmărire comportamentală sau instrumente invazive de profilare cross-site.",
          "În conformitate cu prevederile Legii nr. 506/2004 privind prelucrarea datelor cu caracter personal și protecția vieții private în sectorul comunicațiilor electronice, stocarea tehnică utilizată de Platformă se încadrează exclusiv în categoria elementelor strict necesare pentru furnizarea serviciului solicitat în mod expres de utilizator.",
        ],
      },
      {
        id: "tehnologii-utilizate",
        title: "2. Elemente tehnice de stocare și resurse externe",
        paragraphs: [
          "Pentru a asigura funcționarea hărții interactive de joasă tensiune, comutarea instantanee între instalații și păstrarea stării tichetelor operaționale în timpul sesiunii de lucru, aplicația utilizează următoarele mecanisme tehnice în browser:",
        ],
        bullets: [
          [
            "Stare de sesiune și parametri URL (TanStack Router & Query Cache)",
            "Păstrează în memoria volatilă a aplicației instalația selectată (ex. ?household=RO-TM-001), rezultatele calculelor deterministe și simulările «Ce-ar fi dacă» pentru a evita reîncărcarea repetată a seriilor de timp.",
          ],
          [
            "Stocare locală pentru tichete și preferințe UI",
            "Reține local pe durata sesiunii confirmările de expediere a alertelor O&M, starea panourilor laterale și opțiunile de afișare a straturilor cartografice.",
          ],
          [
            "Hărți vectoriale și imagistică satelitară (MapLibre GL · CARTO · Esri)",
            "La deschiderea suprafeței «Hartă» (/harta), browserul încarcă dale cartografice (tiles) de la serverele CARTO (basemap întunecat) și Esri World Imagery. Aceste cereri tehnice transmit adresa IP necesară livrării imaginilor de hartă, fără a atașa identificatori ai prosumatorului.",
          ],
          [
            "Tipografie web (Google Fonts)",
            "Familiile tipografice Libre Baskerville, Inter și Fira Code sunt încărcate prin conexiuni securizate fără setarea de fișiere cookie în browserul utilizatorului.",
          ],
        ],
      },
      {
        id: "control-browser",
        title: "3. Controlul și ștergerea datelor din browser",
        paragraphs: [
          "Utilizatorii pot șterge în orice moment datele stocate local sau memoria cache din setările browserului utilizat (Chrome, Firefox, Safari, Edge) fără a afecta integritatea datelor energetice de pe server. La reîncărcarea aplicației, SunProof va reconstrui automat starea portofoliului pe baza datelor deterministe din backend.",
        ],
      },
    ],
  },
};

const LEGAL_DOC_LIST: LegalDocument[] = [
  LEGAL_DOCUMENTS.termeni,
  LEGAL_DOCUMENTS.confidentialitate,
  LEGAL_DOCUMENTS.cookies,
];

export function LegalFooter() {
  return (
    <footer className="border-t border-graphite bg-obsidian">
      <div className="mx-auto max-w-[1200px] px-6 py-16">
        <div className="flex flex-col justify-between gap-10 md:flex-row md:items-start">
          <Link
            to="/"
            className="font-display text-[18px] text-bone transition-colors hover:text-bone/80"
          >
            SunProof
          </Link>

          <div className="flex flex-wrap gap-12 text-[13px]">
            <div className="space-y-3">
              <div className="eyebrow">Documente legale</div>
              <ul className="space-y-2.5">
                {LEGAL_DOC_LIST.map((doc) => (
                  <li key={doc.key}>
                    <Link
                      to={doc.path}
                      className="text-fog transition-colors hover:text-bone"
                      activeProps={{ className: "!text-bone underline underline-offset-4" }}
                    >
                      {doc.shortTitle}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="eyebrow">Cadrul de reglementare</div>
              <ul className="space-y-2.5 text-fog">
                <li>Legea nr. 160/2026 (compensare 1:1)</li>
                <li>Standardul SR EN 50549-1 (253,0 V)</li>
                <li>Regulamentul (UE) 2016/679 (GDPR)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-graphite pt-8 text-[12px] text-fog">
          <span>© 2026 SunProof · România</span>
        </div>
      </div>
    </footer>
  );
}

export function LegalDocumentPage({ docKey }: { docKey: LegalDocKey }) {
  const doc = LEGAL_DOCUMENTS[docKey];

  return (
    <div className="min-h-screen bg-canvas text-bone">
      <header className="border-b border-border bg-obsidian/60">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[13px] text-fog transition-colors hover:text-bone"
            >
              <ArrowLeft className="size-3.5" />
              <span>SunProof</span>
            </Link>
            <span className="text-pewter">/</span>
            <span className="text-[13px] text-bone">{doc.shortTitle}</span>
          </div>

          <nav aria-label="Intrare" className="flex items-center gap-5">
            <ProsumerEntry
              size="sm"
              variant="text"
              className="hidden h-10 text-[13px] sm:inline-flex"
            >
              Vedere prosumator
            </ProsumerEntry>
            <SupplierEntry size="sm">Deschide portofoliul demo</SupplierEntry>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[260px_1fr] lg:gap-16">
          <aside className="space-y-8 lg:sticky lg:top-8 lg:self-start">
            <nav aria-label="Pagini legale" className="space-y-2">
              <div className="eyebrow">Pagini legale</div>
              <ul className="mt-3 space-y-1 border-l border-border">
                {LEGAL_DOC_LIST.map((item) => {
                  const active = item.key === doc.key;
                  return (
                    <li key={item.key}>
                      <Link
                        to={item.path}
                        className={`block border-l py-2 pl-4 text-[13px] transition-colors ${
                          active
                            ? "-ml-px border-bone font-medium text-bone"
                            : "border-transparent text-fog hover:text-bone"
                        }`}
                      >
                        {item.shortTitle}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <nav aria-label="Cuprins document" className="hidden space-y-2 lg:block">
              <div className="eyebrow">Cuprins</div>
              <ol className="mt-3 space-y-2 text-[12px] text-fog">
                {doc.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block leading-snug transition-colors hover:text-bone"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="max-w-[72ch]">
            <header className="border-b border-border pb-10">
              <h1 className="font-display text-balance text-[32px] leading-[1.15] text-bone sm:text-[42px]">
                {doc.title}
              </h1>
              <p className="mt-4 text-pretty text-[15px] leading-relaxed text-fog">
                {doc.subtitle}
              </p>

              <dl className="mt-8 grid gap-6 border-t border-border pt-6 sm:grid-cols-3">
                {doc.summaryPoints.map(([label, value]) => (
                  <div key={label} className="space-y-1">
                    <dt className="text-[11px] uppercase tracking-[0.05em] text-fog">{label}</dt>
                    <dd className="text-[13px] font-medium text-bone">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-fog">
                <span>
                  Versiune în vigoare:{" "}
                  <strong className="num font-normal text-bone">{doc.effectiveDate}</strong>
                </span>
                <span>
                  Ultima actualizare:{" "}
                  <strong className="num font-normal text-bone">{doc.updatedAt}</strong>
                </span>
              </div>
            </header>

            <div className="divide-y divide-border">
              {doc.sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-8 py-10">
                  <h2 className="font-display text-[22px] leading-snug text-bone sm:text-[26px]">
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4 text-[14px] leading-[1.7] text-bone/90">
                    {section.paragraphs.map((p, idx) => (
                      <p key={idx} className="text-pretty">
                        {p}
                      </p>
                    ))}
                  </div>

                  {section.bullets && (
                    <dl className="mt-6 space-y-4 border-l border-pewter pl-5">
                      {section.bullets.map(([label, detail]) => (
                        <div key={label} className="space-y-1">
                          <dt className="text-[13px] font-medium text-bone">{label}</dt>
                          <dd className="text-pretty text-[13px] leading-relaxed text-fog">
                            {detail}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              ))}
            </div>
          </article>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
