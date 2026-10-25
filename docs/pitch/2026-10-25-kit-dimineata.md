# Kitul de dimineață: user testing la 09:00, pitch la 11:45

Pregătire (08:45): `./scripts/run_demo.sh`, apoi deschide `http://127.0.0.1:3000/harta?household=RO-TM-001`.
Backup dacă nu merge rețeaua: `demo-sunproof.mp4` (sau `.webm`) din rădăcina repo-ului, de 68 de secunde.

---

## A. User testing, 09:00 (5 minute)

**Regula:** tu taci, ei dau click. Nu explici ce e pe ecran. Dacă te întreabă ceva, răspunzi tot cu o întrebare: „Ce crezi că înseamnă?”.

| Minut | Ecran | Ce le spui (o singură propoziție) | Ce urmărești |
|---|---|---|---|
| 0:00–0:30 | — | „Ești la un furnizor de energie și un prosumator a sunat furios că i se oprește invertorul la prânz. Găsește de ce.” | — |
| 0:30–2:00 | `/harta?household=RO-TM-001` | (nimic) | Văd casele roșii de pe același transformator? Deschid **Analiză detaliată** singuri? Apasă **Simulează soluția** și înțeleg **Înainte/După**? |
| 2:00–3:00 | `/triaj` | „Acum verifică și bateria și factura pentru alți doi clienți: Mihai Radu și Dan Munteanu.” | Găsesc clientul în listă? Citesc cardul de verdict înainte de grafic? |
| 3:00–4:15 | `/prosumator?household=RO-TM-001` | „Acum ești chiar clientul. Ce s-a întâmplat la tine azi?” | Pagina se deschide la 10:40, pe avarie: o observă? Folosesc butoanele **Avarie / Prânz / Seară**? Ajung la explicație și la tichet? |
| 4:15–5:00 | — | Cele 3 întrebări de mai jos | Notează cuvintele lor exacte |

**Cele 3 întrebări (exact așa, în ordinea asta):**

1. „Cu cuvintele tale: a cui era vina pentru oprirea de la prânz și de unde ai știut?”
2. „Care a fost momentul în care nu ai știut ce să faci sau unde să apeși?”
3. „Dacă ai fi furnizorul, ce ai face mâine dimineață cu ecranul ăsta? Și ce ți-ar lipsi ca să-l folosești?”

**Notezi la fiecare:** citatul exact la întrebarea 1, primul loc unde s-a blocat (ecran + element) și dacă a apăsat singur pe **Analiză detaliată** și pe **Simulează soluția** (da/nu).

---

## B. Slide-urile pentru 11:45 (text gata de copiat)

Sursele: `2026-10-24-pitch-scurt.md`, `2026-10-24-pitch-detaliat.md`, `2026-10-24-dovada-evaluare-81-scenarii.md`, graficele din `charts/`.

**Slide 1: Titlu**
> **SunProof**
> Fiecare reclamație de prosumator, cu dovada ei.
> Rețea · Baterie · Factură

**Slide 2: Problema** (grafic: `charts/chart1_baterii_anre.svg`)
> **386.000 de prosumatori. 39% au baterie. Nimeni nu verifică dacă merg cum trebuie.**
> - La prânz, peste 253 V, invertoarele se opresc singure. Clientul sună la furnizor.
> - Bateria stă plină seara, exact când energia e de până la 8 ori mai scumpă.
> - Legea 160/2026 schimbă facturile. Fiecare factură neclară devine o reclamație.
> *Sursă: ANRE, august 2026*

**Slide 3: Nimeni nu are dovezi** (grafic: `charts/chart3_capatul_strazii.svg`)
> **Instalatorul zice că e rețeaua. Distribuitorul zice că e invertorul.**
> Un prosumator povestește de 15–20 de vizite fără diagnostic (Softpedia).
> „Când tensiunea din rețea depășește 253 V, echipamentele prosumatorilor se opresc automat.” (APCE)

**Slide 4: Ce face SunProof**
> **Citim datele invertorului și răspundem la 3 întrebări:**
> 1. **Rețea sau instalație?** Mai mulți vecini opriți în același minut înseamnă rețeaua → dosar PDF către distribuitor.
> 2. **Bateria e blocată seara?** Setarea reală față de ce a vrut clientul, în lei pe lună.
> 3. **Factura e corectă?** Invertor vs. contor vs. factură, pe Legea 160/2026.
> Fără hardware nou. Fără parola invertorului. Doar citim.

**Slide 5: Demo** (rulează `demo-sunproof.mp4` sau live `/harta` → `/triaj` → `/prosumator`)
> **Demo: un caz, trei ecrane**
> Harta furnizorului → Analiza detaliată → Ce vede clientul

**Slide 6: Dovada** (grafic: `charts/chart4_pierderi_si_dovada.svg`)
> **Pe 81 de scenarii simulate:**
> - Rețea vs. echipament: **81/81 (100%)** la 1 minut, **80/81 (98,8%)** la 5 minute (cloud, fără hardware)
> - Alarme false pe case sănătoase: **0/60**
> - Baterie și factură: **81/81 (100%)** fiecare
> - **6.750 RON/lună** deplasări inutile evitate (15 cazuri de rețea × 450 RON)
> - **1.054,20 RON/lună** pierdere PZU pe 7 baterii setate greșit
> *Tensiunea e simulată, producția e reală (PVGIS). Cifrele arată corectitudinea logicii, nu performanța pe case reale.*

**Slide 7: Cine plătește și ce câștigă**
> **Furnizorul de energie, per casă de prosumator.**
> - Mai multă energie livrată seara din baterii
> - Mai puține deplasări degeaba și apeluri mai scurte la call center
> - Mai puține reclamații care nu sunt ale lui
> - Clientul cu baterie, cel mai valoros, nu mai pleacă (peste 500.000 de schimbări de furnizor în 2025)

**Slide 8: Ce urmează**
> **Următoarele 3 luni:** conectori reali Huawei FusionSolar și Fronius (doar citire) și un pilot pe 50–100 de case din același cartier.
> **Ce cerem:** un furnizor sau o firmă de O&M pentru pilot.
> SunProof · Un singur adevăr despre energia ta, care îți aparține.

---

## C. Pitch-ul de 60 de secunde (4 × 15 s)

Ține minte câte un cuvânt-cheie pe bloc: **SUNĂ → DOVADA → TREI → BANI**.

**1. SUNĂ (0–15 s)**
> „E prânz, cer senin. Pe o stradă cu panouri, tensiunea trece de 253 de volți și invertoarele se opresc singure. Omul crede că i s-a stricat sistemul și îl sună pe furnizor. Iar seara bateria lui stă plină, exact când curentul e cel mai scump.”

**2. DOVADA (15–30 s)**
> „Instalatorul zice că e rețeaua, distribuitorul zice că e invertorul și nimeni nu are dovezi. Un prosumator a avut 15–20 de vizite fără diagnostic. Iar România are 386.000 de prosumatori, 39% cu baterie.”

**3. TREI (30–45 s)**
> „SunProof citește datele invertorului, fără parolă și fără hardware, și răspunde la trei întrebări: e rețeaua sau instalația, e bateria blocată seara, e factura corectă. Dacă vecinii s-au oprit în același minut, e rețeaua, și dosarul pentru distribuitor e gata.”

**4. BANI (45–60 s)**
> „Plătește furnizorul, per casă: mai puține deplasări degeaba, mai puține reclamații, mai multă energie seara. Pe 81 de scenarii, separăm rețeaua de echipament în 100% din cazuri, cu zero alarme false. Căutăm un furnizor pentru pilot.”

---

**Atenție la cifre:** `2026-10-24-pitch-scurt.md` și `2026-10-24-pitch-detaliat.md` spun „81/81 la 5 minute”. Evaluarea rulată pe 25.10 (`scripts/evaluate_proof.py`) dă **80/81 (98,8%)** la 5 minute, deci pe slide folosim 98,8%. În pitch-ul vorbit, „100%” se referă la datele la 1 minut.
