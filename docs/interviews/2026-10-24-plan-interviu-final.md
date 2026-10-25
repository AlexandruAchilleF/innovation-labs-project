# SunProof: planul pentru interviurile cu mentorii (24 octombrie, de la 15:30)

Mentorii răspund ca **potențiali clienți**. În interviu întrebăm mai mult decât explicăm. Fișa are două părți: **Partea 1** e simplă și o folosiți în interviu. **Partea 2** e pentru voi și pentru întrebările tehnice: cum construim și de unde luăm datele.

---

# Partea 1: simplu

## 1. Ce facem, într-o frază

**SunProof se uită la panourile și bateria fiecărui client și îi spune furnizorului de energie ce nu merge și cine trebuie să rezolve.** Furnizorul plătește un abonament per casă.

De spus cu voce tare (30 de secunde):

> „Furnizorul de energie are tot mai mulți clienți cu panouri și baterii, iar ei îl costă bani și îi aduc reclamații. Noi citim datele din invertorul clientului, cu acordul lui, și răspundem la trei întrebări: când panourile se opresc, e vina rețelei sau a instalației? Bateria e setată cum trebuie? Factura e corectă?”

## 2. Problemele pe care le-am găsit

Am pornit de la analiza de piață (legi, ordine ANRE, prețuri, presă, forumuri) și am vorbit deja cu **doi oameni: un prosumator și un furnizor**.

**Problema 1: în orele de vârf ale producției solare invertoarele se opresc singure, iar reclamația ajunge la furnizor.**
Pe străzile cu multe panouri, toate casele dau curent în rețea în același timp. Tensiunea crește peste limită, iar invertorul se oprește ca să se protejeze. Prosumatorul pierde producția exact în orele cele mai bune. **Asta ne-au spus, separat și fără să le sugerăm noi, atât prosumatorul, cât și furnizorul.** Presa confirmă la scară mare: din martie 2026, „zeci de mii” de prosumatori afectați. Nimeni nu are dovezi, așa că toți își pasează vina: instalatorul zice că e rețeaua, distribuitorul zice că e instalația. Uneori chiar e instalația: un distribuitor a găsit 60% din invertoarele verificate setate greșit. Clientul sună însă la furnizor, pentru că de la el primește factura. Furnizorul e obligat să preia reclamația, iar dacă i-a vândut și panourile, trimite un tehnician, adesea degeaba.

**Problema 2: bateriile setate greșit îl costă pe furnizor.**
Clientul cu panouri dă curent în rețea în orele de vârf ale producției solare, când curentul e ieftin, și ia înapoi la fel de mult seara, când curentul e scump. Legea spune că e schimb unu la unu, deci furnizorul trebuie să cumpere scump curentul de seară și nu primește nimic pentru el. Bateria ar rezolva asta: păstrează curentul din orele de vârf ale producției solare pentru seară. Dar multe baterii sunt setate greșit, de exemplu „păstrează 80% mereu”, și nu dau nimic seara. Clientul de obicei nici nu știe.

**Problema 3: facturile de prosumator aduc reclamații.**
De la 1 ianuarie 2027 se schimbă complet felul în care se facturează prosumatorii, iar ANRE a aprobat un clasament public al furnizorilor după numărul de reclamații. Fiecare factură pe care clientul n-o înțelege devine un apel la call center sau o reclamație. Pentru client, chiar și oprirea invertorului arată ca o „factură mare”: PPC însuși o trece printre cauze.

**Pe scurt:** furnizorul plătește costul și primește reclamațiile, dar **nu vede ce se întâmplă în casa clientului**. Nu știe dacă invertorul s-a oprit din cauza rețelei sau a instalației, dacă bateria dă curent seara sau dacă factura e corectă. SunProof îi arată exact asta.

## 3. Soluțiile noastre

| Problema | Ce face SunProof | Ce câștigă furnizorul | Ce câștigă clientul |
| --- | --- | --- | --- |
| Panourile oprite | Se uită la vecini: dacă se opresc mai multe case de pe stradă în același minut, e rețeaua; dacă doar una, e instalația | Trimite reclamația direct la distribuitor, cu dovezi. Trimite tehnician doar când chiar e defect | Primește dosarul gata făcut pentru distribuitor sau tehnicianul în aceeași zi |
| Bateria setată greșit | Îl întreabă pe client ce vrea de la baterie, compară cu setarea reală și cu ce face bateria în fiecare zi, și îi spune ce să schimbe | Mai puțin curent scump de cumpărat seara. Știe cui să ofere un bonus pentru baterie, ca Electrica în august, și verifică zilnic că bateria chiar livrează | Plătește mai puține taxe pe curentul luat seara din rețea și, eventual, primește bonusul |
| Factura neînțeleasă | Compară ce a produs invertorul, ce a măsurat contorul și ce scrie pe factură. Operatorul primește explicația gata scrisă | Apeluri mai scurte, mai puține reclamații, loc mai bun în clasamentul ANRE | Înțelege factura sau află că e greșită |

**Ce nu facem:** nu controlăm bateria și nu schimbăm setări. Doar arătăm și recomandăm, iar clientul sau instalatorul schimbă setarea. Clientul decide cine îi vede datele.

## 4. Întrebările pentru mentori

### Cum decurge (10 minute per mentor)

1. **Început (1 minut).** Întrebați: „Din ce rol ne răspundeți? Furnizor, tehnician sau instalator, prosumator ori distribuitor?” și „Putem cita ce spuneți, fără nume?”. Unul întreabă, celălalt notează cuvânt cu cuvânt.
2. **Deschiderea, fără demo:** „Lucrăm pe clienții cu panouri și baterii. Vrem să înțelegem ce probleme vă fac azi. Ne puteți povesti ultima situație de acest fel?”
3. **5–6 întrebări** din setul pentru rolul mentorului (mai jos).
4. **Abia la final, 2 minute de prototip** și întrebările de plată.

### Dacă mentorul e furnizor (clientul nostru)

1. Povestiți-mi ultima dată când un client cu panouri v-a sunat nemulțumit. Ce voia și cum s-a terminat?
2. Care sunt primele trei motive pentru care sună clienții cu panouri? Cât durează un apel?
3. Când clientul spune „mi s-au oprit panourile” sau „factura e prea mare”, cum aflați dacă e rețeaua, instalația sau factura?
4. Ce vă îngrijorează cel mai mult la facturarea nouă din 1 ianuarie 2027?
5. Vă costă faptul că clienții dau curent în orele de vârf ale producției solare și iau seara? Cât, aproximativ?
6. Ați plăti un bonus clienților ca să-și seteze bateria să dea curent seara? Cum ați verifica că o fac?
7. Ce date primiți lunar de la distribuitor despre clienții cu panouri?
8. Cine din firmă are bugetul pentru așa ceva: facturarea, relația cu clienții, trading-ul sau echipa tehnică?

### Dacă mentorul e tehnician sau instalator

1. Cum ați aflat de ultimul defect? Câte zile au trecut până ați ajuns la client?
2. Câte apeluri de tip „nu produce” ați avut luna trecută? Câte erau de fapt de la rețea?
3. Cât costă o deplasare? Câte au fost degeaba?
4. Cum setați de obicei bateria la montaj? Îl întrebați pe client ce vrea?
5. De câte ori ați zis „rezolvat” și problema a revenit?
6. Din câte aplicații vă uitați la instalațiile clienților (Huawei, Deye etc.)?

### Dacă mentorul e prosumator

1. De câte ori s-au oprit panourile vara asta? De unde ai aflat?
2. Pe cine ai sunat: furnizorul, distribuitorul sau instalatorul? Ce ți-au răspuns?
3. Arată-mi în aplicație: cum e setată bateria acum? Cine a setat-o? E ce ai vrut?
4. Ai înțeles ultima factură? Ți s-a întâmplat să nu se potrivească cu aplicația?

### Dacă mentorul e distribuitor

1. Câte sesizări de supratensiune de la prosumatori ați avut anul acesta? Câte s-au confirmat?
2. Câte vin prin furnizor? Ce dovezi primiți?

**Întrebări de săpat, oricând:** „Puteți da un exemplu concret?”, „Cât v-a costat?”, „Ce ați făcut după?”

### La final: prototipul (2 minute)

Arătați site-ul MVP pe panoul furnizorului, câte 20 de secunde: tichetul „rețea, confirmat de vecini”, ecranul bateriei („a vrut 20%, e setat 80%”) și explicația facturii. Apoi:

1. „Care dintre cele trei vă ajută cel mai mult? Care nu contează?”
2. „Ce lipsește ca să plătiți pentru asta?”
3. „Cât ar fi rezonabil per client, pe lună? Sau ați prefera un audit cu preț fix pe datele pe care le aveți deja?”
4. „Pe cine ne recomandați să mai întrebăm?”

### Ce să NU faceți

- Nu explicați ideea înainte de întrebări. Mentorul va fi politicos și va confirma orice.
- Nu întrebați „ați folosi?” sau „vi se pare util?”.
- Nu contraziceți un răspuns care vă dărâmă ideea. Acela e cel mai valoros.
- Așteptați 3 secunde după fiecare răspuns.

### Fișa de notițe (una per mentor)

| Câmp | Ce scrieți |
| --- | --- |
| Mentor și rol | ex. „mentor, ca furnizor” |
| Citatul cel mai bun | cuvânt cu cuvânt |
| Cifre | apeluri pe lună, lei, zile, deplasări |
| Ce face azi în loc | Excel, telefon, nimic |
| Ce a confirmat / ce a dărâmat | bateria, factura, vecinii, plata |
| Preț sau buget pomenit | sau „nu a spus” |
| Pas următor | contact, încă un apel, date |

### Ce verificăm

| Ce credem | Ne confirmă dacă | Ne dărâmă dacă |
| --- | --- | --- |
| Bateriile setate greșit îl costă pe furnizor | Pomenește singur costul serii sau un program de baterie | „Ne e indiferent când descarcă” |
| Facturile de prosumator aglomerează call centerul | Dă un procent sau un exemplu | „Sunt puține, se rezolvă automat” |
| Opririle de rețea ajung la furnizor | Descrie cum e pasat clientul de la unii la alții | „Nu ne sună nimeni pentru asta” |
| Ar plăti per client | Spune un preț sau un buget | Doar „interesant”, fără pas următor |

Dacă doi mentori dărâmă aceeași idee, o scoatem din pitch.

Că tensiunea crește și oprește invertoarele ne-au spus deja un prosumator și un furnizor, iar presa confirmă. Cu mentorii întrebăm mai departe **cine plătește pentru asta**: ajunge reclamația la furnizor, cât de des și cât îl costă? Dacă un mentor pomenește singur supratensiunea, o notăm ca a treia confirmare.

**După fiecare interviu, trimiteți fișa în thread.**

---

# Partea 2: cum construim și de unde luăm datele

## Cum funcționează (pe scurt)

```
date din invertor (la minut) ─┐
contor (la 15 min)            ├─► motorul SunProof (Python) ─► verdicte ─► site-ul (clientul / furnizorul)
factură                       │      reguli, nu „magie”          │        dosar PDF pentru distribuitor
ce vrea clientul (o dată)    ─┘                                  └──────► alertă pe Telegram pentru tehnician
```

- **Motorul** e în Python, în repo, în pachetul `sunproof/`. Totul e calculat cu reguli clare, nu cu un model ML antrenat, pentru că dosarul trebuie să spună *de ce*, iar defecte reale etichetate nu avem.
- **AI-ul (Claude)** doar scrie textele: sesizarea, explicația facturii. Orice cifră dintr-un text e verificată în cod. Dacă nu se potrivește, textul se reface dintr-un șablon.
- **Interfața** e site-ul MVP, un singur fișier HTML, cu panoul clientului și panoul furnizorului.

## Ce iese din comparații

Nicio sursă singură nu răspunde la întrebare. Răspunsul e diferența dintre ele:

- **Invertor + vecini:** se opresc mai multe case în același minut, deci e rețeaua. Se oprește doar una, deci e instalația.
- **Ce a vrut clientul + setarea + ce s-a întâmplat:** „a vrut 20%, e setat 80%”, deci bateria nu dă curent seara. Calculăm cât pierde clientul și cât câștigă furnizorul dacă se corectează.
- **Invertor + contor + factură:** fie „factura e corectă, iată de ce”, fie „lipsește indexul de export din august”.
- **Producția de referință (PVGIS) + invertor:** cât ar fi trebuit să producă instalația în ziua aceea, deci câtă energie lipsește.
- **Prețul pe ore (amiază vs. seară):** cât valorează pentru furnizor o baterie setată corect.

## Cele trei verificări, tehnic

| Verificarea | Ce citește | Regula, simplu | Unde e în plan |
| --- | --- | --- | --- |
| Rețea sau echipament | puterea invertorului, tensiunea, starea (pornit/oprit), codul de alarmă, la fel pentru vecini | Oprit + tensiune peste 253 V + vecinii opriți în același minut → **rețea**. Oprit cu tensiune normală, doar el → **echipament**. Fără date → „lipsă date”, nu oprire | Task 2 (strada simulată), Task 3 (detectorul), Task 5 (dosarul PDF), Task 6 (tichete, Telegram) |
| Bateria | procentul bateriei, încărcare/descărcare, consumul casei, ce ia din rețea, setarea rezervei, ce a vrut clientul | Seara bateria stă la rezerva setată, casa ia din rețea, iar rezerva e mai mare decât a vrut clientul → **setare greșită**, cu suma în lei. Dacă așa a vrut clientul → fără alertă | Task 12, cu teste exacte (de ex. 4 lei pe seară în exemplul demo) |
| Factura | producția invertorului, contorul (ce a luat și ce a dat în rețea), factura | Energia dată în rețea lipsește de pe factură, are preț zero sau contorul arată mai mult decât a produs invertorul → **constatare**, cu suma și explicația | Task 10 |

## De unde luăm datele

| Ce | La hackathon | În produsul real |
| --- | --- | --- |
| Ce a vrut clientul de la baterie | Simulat (exemplul „vrut 20%, setat 80%”) | Clientul alege o dată, în aplicație |
| Prețul energiei pe ore | Cifre publice (vezi anexa) | Prețurile OPCOM pe ore |
| Producția panourilor | **Reală:** PVGIS (Comisia Europeană), pentru 5 orașe | Din invertor, prin API-ul producătorului (Huawei, Fronius, Deye etc.), cu acordul clientului |
| Consumul caselor | Profiluri reale de consum (StoreNet, Open Power System Data) sau sintetice | Din invertor sau din contorul inteligent |
| Tensiunea rețelei | **Simulată**, cu un model fizic al străzii. Nu există date publice despre ea, și o spunem deschis | Din invertor: majoritatea raportează tensiunea (de verificat pe fiecare brand) |
| Bateria (procent, setare) | Simulată, cu setări corecte și greșite | Din invertor, prin același API |
| Contorul | Generat din simulare, în formatul exportului de la distribuitor | Exportul din portalul distribuitorului sau datele pe care furnizorul le primește lunar |
| Facturile | Facturi de test, cu 2 erori plantate | Din sistemul de facturare al furnizorului (export CSV) |
| Vecinii | Casele de pe strada simulată | Clienții aceluiași furnizor din aceeași zonă |

**Ce spunem deschis la demo:** producția solară e reală, tensiunea și bateriile sunt simulate. Exact acest gol îl acoperim: azi nimeni nu are la un loc datele din invertor, contor și factură.

## E fezabil în 24h?

Da, fără module noi. Tot ce e mai sus e deja în plan, cu teste. Adăugăm doar trei lucruri mici (~2h): cifra „cât câștigă furnizorul” pe ecranul bateriei, explicația facturii pentru operator și eticheta „ține de distribuitor” pe tichet. Riscul: dacă la ora 13 a planului suntem în urmă, verificarea facturii o arătăm pe o lună cu date fixe. Rețea/echipament și bateria nu se taie niciodată.

---

# Anexă: sursele

| Ce susținem | Dovada | Sursa |
| --- | --- | --- |
| Schimbul unu la unu (compensare cantitativă lunară până în 2030); dezechilibrele rămân la furnizor | Legea 160/2026 | [BPV Grigorescu](https://bpv-grigorescu.com/latest/publications/amendments-to-the-legal-framework-on-prosumers) |
| Seara curentul e mult mai scump decât în orele de vârf ale producției solare | Vara 2026: ~90–100 vs. peste 800 EUR/MWh | [Puterea.ro](https://www.puterea.ro/cel-mai-scump-kilowatt-e-cel-pe-care-nu-l-poti-muta/) |
| Furnizorii simt deja costul | Hidroelectrica bugetează pentru 2026 cu 152 mil. lei mai mult pentru energia de la prosumatori | [ZF](https://www.zf.ro/burse-fonduri-mutuale/hidroelectrica-bugeteaza-un-profit-net-de-3-6-miliarde-lei-in-2026-23139638) |
| Un furnizor a plătit deja pentru curentul din baterii seara | Electrica, august 2026: bonus de 0,40 lei, verificat doar pe factură | [InvesTenergy](https://www.investenergy.ro/tinem-romania-aprinsa-cu-prosumatorii-cu-baterii-electrica-ofera-bonus-de-040-lei-kwh-in-luna-august-pentru-energia-livrata-seara-in-retea/) |
| Tot mai mulți au baterie | 151.040 de prosumatori cu baterie (39%) la 31 august 2026 | ANRE, prin brief-ul Challenge 1 |
| Facturarea are termen fix | Acte adiționale până la 1 nov., IT până la 31 dec. 2026, regim nou din 1 ian. 2027 (proiect ANRE) | [issuemonitoring.eu](https://issuemonitoring.eu/impact/noile-reguli-pentru-prosumatori-de-la-reportul-in-kwh-la-facturare-lunara-si-alocare-multi-loc/) |
| Clasament public după reclamații | Ordinul ANRE 61/2026, aprobat (anunțat pe 8 oct. 2026), publicat trimestrial | [dcbusiness](https://www.dcbusiness.ro/furnizorii-de-energie-pusi-la-semafor-anre-schimba-regulile-pentru-reclamatiile-clientilor_699705.html) |
| Oprirea invertorului ajunge la furnizor ca „factură mare” | PPC însuși o trece printre cauzele facturii mari, alături de indexul citit greșit și statutul de prosumator neactivat | [PPC Electripedia](https://www.ppcenergy.ro/electripedia/eficienta-pentru-prosumatori/factura-de-prosumator-este-mai-mare-decat-te-asteptai-de-ce-se-intampla-si-cum-o-reduci/) |
| Furnizorul e obligat să preia și reclamațiile de rețea | Ordinul ANRE 235/2019, art. 30 lit. q și art. 33 lit. w | [textul ordinului](https://www.engie.ro/wp-content/uploads/2020/01/Ordinul-ANRE-nr.-235.-2019-Regulamentul-de-furnizare-a-energiei-electrice-la-clien%C5%A3ii-finali.pdf) |
| Opririle sunt la scară mare | Din martie 2026, „zeci de mii” de prosumatori afectați, „mii” de reclamații | [Știrile ProTV](https://stirileprotv.ro/stiri/pro-verde/panouri-fotovoltaice-oprite-automat-de-ce-prosumatorii-din-romania-pierd-energie-in-orele-de-varf.html) |
| Nimeni nu are dovezi | Instalatorul zice „rețeaua”, distribuitorul *„a dat vina pe instalator/invertor”* | [elforum](https://www.elforum.info/topic/145912-probleme-tensiune-retea-prosumatorpanour-solare/) |
| Și instalațiile greșesc des | DEO: 276 din 460 de invertoare verificate (60%) fără protecțiile obligatorii | [HotNews](https://hotnews.ro/prosumatorii-sustin-ca-distribuitorii-de-energie-incearca-sa-le-controleze-productia-panourilor-solare-replica-unui-distribuitor-in-60-dintre-cazuri-instalatiile-prosumatorilor-nu-respecta-paramet-2075879) |
| Furnizorii vând și instalații | E.ON: peste 10.500 de sisteme din 2020, 91% cu baterie în S1 2026 | [Revista Biz](https://www.revistabiz.ro/9-din-10-sisteme-fotovoltaice-instalate-de-e-on-includ-acum-baterii-de-stocare/) |
| Clienții pleacă ușor | Peste 500.000 au schimbat furnizorul în 2025 | [Știrile ProTV](https://stirileprotv.ro/stiri/actualitate/hidroelectrica-a-depasit-un-milion-de-clienti-si-conduce-piata-energiei-ce-a-atras-consumatorii.html) |

**Nu spunem ca fapt:** câți s-au înscris în programul Electrica, cifrele AFEER pe care nu le-am putut verifica integral și nicio cifră despre apelurile la call center. Pe acestea le aflăm de la mentori.
