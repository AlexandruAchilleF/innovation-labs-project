# Scenariul video-ului demo SunProof (60 s)

Adaptat după promptul video-ului de referință („prompt-to-website reveal”), pentru un demo tehnic:
fiecare funcționalitate apare pe ecran, cursorul arată exact elementul, iar textul de lângă cursor spune ce vedem.
Implementat în `scripts/record-demo.mjs` + `scripts/demo/` (randare cadru cu cadru, aceeași ieșire la fiecare rulare).

<inputs>
Produs: SunProof, portalul furnizorului + aplicația prosumatorului (aplicația reală, nu machete).
Cazuri: Andrei Popescu (rețea + baterie), Dan Munteanu (factură), Mihai Radu (baterie Backup), Elena Ionescu (instalație locală + tichet).
Muzică: „Voxscape”, Eugenio Mininni (Mixkit, licență gratuită, fără atribuire obligatorie).
</inputs>

<direction>
60 s, 1920x1080, 30 fps (1800 cadre), un singur fir: furnizorul găsește problemele, clientul le înțelege, tichetul clientului închide bucla.
Fundal (când camera se retrage): grafit #141414→#1d1d1d cu grafică din linii subțiri albe la 10% (simbolul transformatorului: două cercuri
suprapuse, două linii orizontale, două verticale, două diagonale, sclipiri în 4 colțuri la intersecții), o lumină difuză chihlimbar→albastru
(#d4a35a→#2b7fff) dreapta-sus și granulație fină.
Desktopul (portalul furnizorului) e o fereastră cu colțuri de 14 px și umbră moale; telefonul (aplicația clientului) are ramă neagră, colțuri de 56 px.
Cursor: săgeată albă mare (46 px, crește la 64 px pe momentele-cheie), contur #111. Apăsare: cursorul se strânge la 0,9, butonul real
se umflă 8%, un inel chihlimbar se extinde.
Textul de lângă cursor: card #eeeeee, Inter 600 30 px #111, a doua linie Fira Code 20 px cu cifrele. Cuvintele intră cu blur 6→0 px și
culoare albastru #2b7fff → chihlimbar → #111 în ~10 cadre. Cardul urmează cursorul cu o ușoară întârziere (arc).
Cifrele din carduri sunt citite din interfață în momentul filmării, nu scrise de mână.
Interzis: subtitrări jos, casete care doar se luminează, crossfade-uri între scene, glow pe text, machete false ale aplicației.
</direction>

<structure>
0:00–0:03  DESCHIDERE · landing
  Camera strânsă 1,5x pe titlul „Aflați cauza opririi invertorului înainte să trimiteți echipa”, se retrage la 1,1x.
  Cursorul intră din dreapta pe „Deschide portofoliul demo”. Tăietură dură la 2,6x pe buton, apăsare, cadrul se încețoșează 6 px sub un văl cald.

0:03–0:11  PORTOFOLIU + HARTĂ · /harta
  Fereastra apare retrasă (0,9) pe fundal și împinge la 1,0.
  Cursor pe „982 RON/lună recuperabili” → „81 de clienți · 982 RON/lună recuperabili”.
  Cursorul mătură plăcile 21 / 4 / 5 → „21 supratensiuni · 4 baterii blocate · 5 exporturi nefacturate”.
  Zoom 1,7x pe casele roșii din Dumbrăvița → „10 invertoare oprite pe același transformator”.
  Click pe ▶ în bara de timp: ziua rulează, casele se aprind roșu spre amiază → „18 august, la fiecare 15 minute”.

0:11–0:18  DIAGNOSTIC + WHAT-IF · panoul Analiză detaliată
  Click „Analiză detaliată” → panoul din dreapta. Cursor pe „Declanșări simultane 6/11” → „6 din 11 vecini opriți simultan → cauza e rețeaua”.
  „Simulează soluția” → „10 → 7 invertoare oprite · trafo 39% → 27%”; „Pe hartă: după” schimbă casele de pe hartă.
  „Descarcă dosarul tehnic pentru OD” → „Dosar PDF pentru distribuitor · tichetul clientului se închide singur” (Tichete Clienți 2 → 1).

0:18–0:27  ANALIZĂ DETALIATĂ · /triaj
  Graficul de tensiune, zoom pe linia de 253 V → „Peste 253 V · deconectat 11:00–11:35”.
  „Stocare & arbitraj PZU” → cursorul trage rezerva bateriei de la 80% la 20% → economia lunară se actualizează live.
  Dan Munteanu → „Export contor 640 kWh · facturat 0 · abatere 312,80 RON”.
  „Simulează o halucinație LLM (+999 RON)” → 999 marcat roșu → „Cifra inventată e prinsă; clientul primește șablonul verificat”.

0:27–0:41  APLICAȚIA PROSUMATORULUI · telefon
  Click „Schimbă rolul: Vezi ca Prosumator”: fereastra iese, telefonul urcă în centru.
  Mihai Radu, 18:35: „Bateria stă la 100%, dar casa cumpără din rețea”. Ghidul Fronius; cursorul trage rezerva 85% → 15% → „+176 RON pe lună”.
  Contul se schimbă pe Elena Ionescu: pagina se deschide pe minutul opririi (11:20, „Oprit · 245 V”). ▶ derulează ziua: energia curge.
  Diagnosticul → „Rețeaua e în parametri. Cablul casei urcă tensiunea cu +13,9 V.” · „Cine rezolvă: instalatorul”.

0:41–0:56  TICHETUL · ecran împărțit (telefon stânga, portalul furnizorului dreapta)
  Elena scrie tichetul (tastare reală), diagnosticul e atașat automat.
  Tăietură dură la 2,6x pe „Trimite tichetul către Furnizor”, apăsare → „Tichet #SP-1003 trimis”.
  Un card de tichet zboară din telefon în „Tichete Clienți” de pe desktop: contorul crește live 1 → 2.
  Furnizorul deschide tichetul → harta sare la casa Elenei; mesajul clientului stă lângă verdict →
  „Clientul cere distribuitorul. Datele arată instalația: 0/6 vecini opriți.”
  „Alocă intervenție O&M (Telegram)” → mesajul pentru tehnician → „Trimite tehnicianului” → tichet închis, contorul revine la 1.

0:56–1:00  FINAL
  Telefonul și fereastra se micșorează pe fundal. „SunProof” + „Rețea · Baterie · Factură — fiecare verdict cu dovada lui”. Ultimul cadru e negru.
</structure>

<build>
1. Aplicația rulează real (FastAPI + Vite) în Chromium cu ceas falsificat (`page.clock`): timpul aplicației avansează exact 1/30 s pe cadru,
   animațiile CSS sunt oprite și derulate la timpul cadrului, iar înainte de fiecare cadru se așteaptă terminarea cererilor de rețea.
   Rezultat: același video la fiecare rulare, fără sacadări, indiferent cât de greu e cadrul (harta).
2. Desktopul (1920x1080, DPR 2) și telefonul (400x860, DPR 3) sunt în același context de browser: tichetul trimis de pe telefon ajunge
   în portalul furnizorului prin aceeași sincronizare pe care o folosește aplicația.
3. Fiecare cadru: se capturează doar zona din aplicație văzută de cameră, la rezoluția nativă (zoom-urile rămân clare până la 2x pe desktop,
   3x pe telefon), apoi un compozitor HTML separat desenează fundalul, dispozitivele, camera, cursorul, cardurile și tranzițiile.
   Compozitorul e o funcție pură de starea cadrului (fără tranziții CSS, fără timere, fără Math.random; zgomot din hash cu seed).
4. Toate mișcările sunt segmente de keyframe-uri cu easing (`ease-out` pentru sosiri, `in-out` pentru camera).
5. Sunet: Voxscape tăiat pe 60 s, cu fade-out în ultimele 3 s; efecte sintetizate: tic la fiecare tastă, click la fiecare apăsare,
   whoosh la tranziții, „pop” când tichetul ajunge la furnizor. Master la -14 LUFS, vârf -1 dBTP.
6. Ieșire: `demo-sunproof.mp4` (H.264, 30 fps, CRF 16) în rădăcina proiectului.
</build>

<gotchas>
Fonturile (Inter, Fira Code, Libre Baskerville) trebuie încărcate înainte de primul cadru, altfel cardurile își schimbă lățimea.
Datele noi (alt client, altă pagină) se încarcă în afara cadrelor filmate, ca să nu apară schelete.
Harta are nevoie de câteva sute de ms de timp de aplicație după navigare ca să-și picteze plăcile.
Tichetele inițiale (Andrei, Dan) există deja; contorul pornește de la 2.
Tăietura pe buton e tăietură dură, nu zoom animat. Ultimul cadru e negru.
</gotchas>
