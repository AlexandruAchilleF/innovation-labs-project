# SunProof: pitch scurt (~1 minut) și discuția cu mentorii

**Un singur adevăr despre energia ta, care îți aparține.**

Cifrele de aici vin din motoarele aplicației (rulate pe 25.10). Pentru demo și slide-uri, vezi `2026-10-25-kit-dimineata.md`.

## Pitch-ul (de spus cu voce tare, ~1 minut)

Spune-l ca pe o poveste, nu ca pe o listă. Pauzele sunt marcate cu „/”.

> „Să zicem că sunteți furnizor de energie. / E august, orele de vârf ale producției solare, cer senin. Pe o stradă din Dumbrăvița, toate casele cu panouri trimit curent în rețea deodată, tensiunea trece de 253 de volți și invertoarele se opresc singure. / Clientul crede că i s-a stricat sistemul și vă sună pe voi.
>
> Voi trimiteți un tehnician. Tehnicianul nu găsește nimic, pentru că problema e în rețea, nu în casă. Instalatorul zice că e rețeaua, distribuitorul zice că e invertorul, și nimeni nu are dovezi. / Un prosumator a povestit pe forum de 15–20 de vizite fără diagnostic.
>
> Și asta nu e singura problemă. Aproape 4 din 10 prosumatori au baterie, dar multe stau pline seara, exact când curentul e de opt ori mai scump decât în orele de vârf ale producției solare. Iar cu Legea 160, fiecare factură neclară devine un apel la call center.
>
> SunProof citește datele pe care invertorul și contorul le au deja, fără hardware nou și fără parola clientului, și răspunde la trei întrebări. / E rețeaua sau instalația? Dacă 6 din 11 vecini s-au oprit în același minut, e rețeaua, și dosarul pentru distribuitor e gata. / Stă bateria blocată seara? Vă spunem cât pierdeți, în lei. / E corectă factura? Comparăm invertorul, contorul și factura.
>
> Pe 81 de case simulate, am găsit cauza corectă în toate cazurile, fără nicio alarmă falsă. / Plătiți per casă și primiți mai puține deplasări degeaba, apeluri mai scurte și mai multă energie seara. / Căutăm un furnizor pentru un pilot.”

### Aceleași idei, pe puncte (dacă te pierzi)

**Cine plătește.** Furnizorul de energie, per casă de prosumator.

**De ce îl doare.** România are aproape 386.000 de prosumatori, iar 39% au baterie (ANRE, august 2026). Prosumatorii îl costă pe furnizor din trei motive:

1. **Bateriile descarcă la ora greșită.** Cu Legea 160/2026, furnizorul preia energia din orele de vârf ale producției solare, când e ieftină, și o compensează cu cea consumată seara, când e de până la opt ori mai scumpă. Electrica a plătit în august un bonus pentru bateriile care livrează seara, dar a putut verifica abia pe factură, la o lună după, dacă bateria era setată bine.
2. **Facturile de prosumator aduc dispute.** Până în ianuarie 2027, furnizorii trebuie să-și refacă facturile pentru noua lege. Fiecare factură neclară devine un apel sau o reclamație, iar ANRE vrea să claseze public furnizorii după reclamații.
3. **Primesc reclamații care nu sunt ale lor.** Când invertorul se oprește din cauza rețelei, clientul sună tot la furnizor. Furnizorul e obligat să preia reclamația și s-o ducă la distribuitor. Dacă i-a vândut și panourile, trimite un tehnician, de multe ori degeaba.

**Ce face SunProof, pe exemplele din demo:**

1. **Rețeaua (Andrei, Dumbrăvița):** invertorul a văzut 257 V, iar 6 din cei 11 vecini de pe același transformator s-au oprit în aceleași minute. Verdictul: e rețeaua. Nu trimitem echipa (450 lei economisiți), trimitem dosarul PDF la distribuitor.
2. **Instalația (Elena, Corbeanca):** se oprește doar casa ei, la 246 V, pentru că pragul invertorului e setat la 245 V în loc de 253 V. Tehnicianul primește alerta pe Telegram și o poate corecta de la distanță.
3. **Bateria (Mihai, Cluj):** a vrut să folosească bateria seara, dar e pe modul de rezervă și păstrează 85% în loc de 15%. Seara cumpără 9 kWh din rețea cu bateria plină. Furnizorul pierde aproape 246 lei pe lună la casa asta.
4. **Factura (Dan, Brașov):** contorul a măsurat 640 kWh trimiși în rețea, pe factură apar zero. A plătit 312,80 lei în plus. Call center-ul primește explicația gata scrisă.

**Ce câștigă furnizorul.** Mai puține deplasări degeaba, apeluri mai scurte, mai puține reclamații care nu sunt ale lui, mai multă energie seara din baterii și un motiv în plus pentru clientul cu baterie, cel mai valoros, să nu plece. Peste 500.000 de oameni au schimbat furnizorul în 2025.

**Dovada.** Pe 81 de case simulate, în 8 cartiere:
- rețea sau echipament: **81/81 corect** cu date la 1 minut și **80/81** cu date la 5 minute, cum le dă cloud-ul invertorului;
- **0 alarme false** pe cele 60 de case sănătoase;
- baterie și factură: **81/81** fiecare;
- **6.750 lei/lună** deplasări inutile evitate (15 cazuri de rețea × 450 lei);
- **982 lei/lună** pierduți de furnizor din 7 baterii setate greșit, adică circa **713.000 EUR/an** extrapolat la 25.000 de prosumatori;
- **1.408 lei** de corectat pe 5 facturi greșite.

**Ce spunem deschis.** Producția solară e reală (PVGIS). Tensiunea, bateriile și facturile sunt simulate, pentru că nu există date publice despre ele. Cifrele arată că logica e corectă, nu cum merge pe case reale. Pilotul ne dă primele date reale.

---

## Cum le explicăm mentorilor în 30 de secunde

> „Facem un serviciu pe care furnizorul de energie îl plătește per casă de prosumator. Citim datele invertorului și ale contorului și răspundem la trei întrebări. Când se oprește producția, e vina rețelei sau a echipamentului? Bateria livrează seara, cum a vrut clientul? Factura e corectă? Furnizorul trimite tehnicianul doar unde e nevoie, call center-ul are răspunsul gata și primește mai multă energie seara.”

## Ce îi întrebăm pe mentori

Scopul e să aflăm dacă problemele sunt reale pentru furnizor, nu să le vindem ideea. Arătăm prototipul abia la final.

1. Dintre cele trei probleme, care îl doare cel mai tare pe un furnizor? Pe care am înțeles-o greșit?
2. Cine dintr-un furnizor ar cumpăra asta (relația cu clienții, trading sau O&M) și din ce buget?
3. Ce știți despre programul Electrica pentru baterii? Cum s-a verificat livrarea de seară și câți s-au înscris?
4. Cât de des sună prosumatorii pentru factură, față de producție sau rețea? Câte apeluri de tip „mi s-a oprit sistemul” erau de fapt supratensiune, și câte deplasări s-au făcut degeaba?
5. E realist ca un furnizor să plătească per casă? Ce preț vi s-ar părea rezonabil?
6. Pe cine ne puteți recomanda, de la un furnizor sau de la o firmă de O&M, cu care să vorbim azi?

**Notați la fiecare:** citatul exact, cine a spus (sau „mentor, anonim”), orice cifră și dacă ne-a dat un contact.

---

## De verificat înainte de pitch-ul final

- Din interviuri: **2 din 2** interlocutori (un prosumator, un furnizor) au pomenit singuri opririle din orele de vârf ale producției solare; un distribuitor a găsit 60% din invertoarele verificate setate greșit; un prosumator povestește de 15–20 de vizite fără diagnostic (Softpedia). Citat public (APCE): „Când tensiunea din rețea depășește 253 V, echipamentele prosumatorilor se opresc automat.” Citatul exact din interviuri și rezultatele de la mentori: *[de confirmat]*. Detalii: `docs/interviews/2026-10-24-sinteza-dovezi-interviuri.md`.
- Programul Electrica a fost un pilot în august 2026. Nu spunem că mai e activ.
- Proiectele de ordin ANRE pentru Legea 160 erau în consultare în august. Nu spunem că au fost adoptate.
- Sursele pentru fiecare cifră sunt în `docs/research/2026-10-24-ce-plateste-furnizorul.md`, secțiunea „Constatări”.
