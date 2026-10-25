# SunProof — Primary Hypothesis (Ipoteza Principală)

## 1. Ipoteza Principală (The Primary Hypothesis)

> **Credem că furnizorii de energie din România (B2B) vor plăti un abonament lunar pe instalație monitorizată (și vor oferi aplicația gratuit prosumatorilor — model B2B2C / Freemium) pentru o platformă software care diagnostichează automat telemetria din spatele contorului, deoarece le reduce direct trei costuri măsurabile (ROI):**
> 1. **Deplasările O&M inutile și apelurile în call center** cauzate de supraîncărcarea rețelei în orele de vârf ale producției solare (>253 V), separând matematic oprirea de rețea (confirmată de vecinii de pe același transformator) de defectul local de echipament;
> 2. **Costul dezechilibrelor PZU din vârful de seară** (când energia este de până la 8× mai scumpă decât în orele de vârf ale producției solare pe Legea 160/2026), identificând bateriile configurate greșit (ex. rezervă blocată la 80% în loc de 20%);
> 3. **Disputele de facturare și reclamațiile ANRE** (Ordinul ANRE 61/2026), reconciliind automat producția invertorului, contorul inteligent și factura.

---

## 2. De ce am formulat această ipoteză (Pivotul B2B2C din interviuri)

Am pornit de la durerea prosumatorului („De ce mi se oprește invertorul în orele de vârf ale producției solare și de ce iau curent din rețea seara cu bateria plină?”), dar **interviurile cu mentorii și specialiștii din energie ne-au schimbat perspectiva de monetizare**:
- **Prosumatorul (B2C)** are problema tehnică, dar se așteaptă ca panourile să-i aducă economii, nu un nou abonament lunar → **pentru prosumator, produsul trebuie să fie gratuit (Freemium)**.
- **Furnizorul de energie (B2B)** încasează toate reclamațiile (este obligat prin Ordinul ANRE 235/2019 să preia și sesizările de rețea), suportă costul dezechilibrelor amiază–seară (Legea 160/2026) și trimite echipe O&M pe teren fără să știe dacă problema e în rețeaua distribuitorului sau în casa clientului → **furnizorul are buget și cumpără pe bază de ROI demonstrabil**.

---

## 3. Sub-ipotezele testate prin prototip și criteriile de validare

| # | Sub-ipoteză testată | Ce am construit în prototip pentru a o testa | Criteriu de succes / Metrică (ROI) | Rezultat pe setul de evaluare (81 instalații, 8 rețele JT) |
|---|---|---|---|---|
| **H1** | **Supraîncărcarea rețelei (>253 V) vs. Defect local poate fi separată doar din software, fără hardware nou în casă** | Motor determinist de corelare spațio-temporală pe același transformator (invertor + vecini + prag EN 50549-1 de 253 V) + generator automat de dosar PDF către distribuitor și alertă Telegram O&M | **>95% acuratețe** la 1 min și 5 min (cloud polling) și **0% alarme false** pe case sănătoase / Volt-Watt | **81/81 (100%)** acuratețe la 1 min și 5 min; **0/60 (0%)** alarme false; **6.750 RON/lună** deplasări O&M inutile evitate pe eșantion (15 cazuri rețea × 450 RON/vizită) |
| **H2** | **Bateriile configurate greșit blochează arbitrajul de seară și generează pierderi PZU cuantificabile pentru furnizor și prosumator** | Comparator între intenția declarată a proprietarului (ex. 20% rezervă backup) și pragul real SoC din invertor (ex. 80%), evaluat la spread-ul PZU amiază–seară și bonusul de livrare (0,40 RON/kWh) | Cuantificarea exactă în RON/zi a importului evitabil de seară și **0 alerte false** când utilizatorul își dorește explicit rezervă 80% | **81/81 (100%)** detecție corectă; **1.054,20 RON/lună** valoare PZU recuperabilă pe 7 baterii greșit setate (**~5,66 mil. EUR/an** extrapolat la 25.000 prosumatori) |
| **H3** | **Disputele de facturare pe Legea 160/2026 pot fi explicate în <1 minut în call center, fără halucinații numerice** | Motor de reconciliere în 3 puncte (Invertor – Contor – Factură) + Guardrail numeric strict care blochează orice cifră generată de AI care nu există în faptele deterministe | **100% detecție** a erorilor de facturare (index export omis, tarif 0, neconcordanță contor) și **0 cifre inventate** | **81/81 (100%)** reconciliere corectă; explicație gata redactată pentru operatorul de call center și client |

---

## 4. Ce am decis să NU construim înainte de validarea completă în piață

Conform recomandării din interviuri (*„înțelegerea și validarea problemei înaintea dezvoltării tehnice grele”*), prototipul SunProof validează **logica de decizie și ROI-ul economic** fără investiții premature:
- **Fără hardware suplimentar în casă:** folosim exclusiv telemetria deja existentă în invertoare (1–5 minute) și profilul de contor.
- **Fără control activ (write-access) în invertor:** nu modificăm de la distanță setările rețelei sau ale bateriei (evităm blocajele de securitate și scandalul accesului la parolele invertoarelor); oferim dovada tehnică și pasul exact de remediere, cu consimțământ GDPR auditabil.
- **Fără modele ML opace:** un distribuitor sau un furnizor nu acceptă un dosar ANRE bazat pe „așa a zis rețeaua neuronală”. Toate verdictele SunProof sunt 100% deterministe și verificabile, iar textul doar explică cifrele deja calculate.
