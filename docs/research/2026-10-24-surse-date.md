# SunProof: de unde luăm datele (24 octombrie 2026)

**Pe scurt:** pentru hackathon avem date publice reale pentru producție, consum și baterii, plus prețuri. Tensiunea rețelei nu există public pentru România, deci o simulăm. În producție, datele vin din trei locuri care există deja: cloud-ul invertorului, portalul distribuitorului și sistemul de facturare al furnizorului.

**Atenție:** din mediul meu din cloud, site-urile astea sunt blocate. Descărcați fișierele de pe laptop în `data/raw/`.

## 1. Pentru hackathon

| Ce ne trebuie | Setul de date | Ce conține | Format și mărime | Cum îl luăm |
| --- | --- | --- | --- | --- |
| Producția solară, 5 orașe din România | [PVGIS](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en) (Comisia Europeană) | Producție orară pe kWp, cu vremea reală din 2020 | JSON/CSV, mic | `bash scripts/download_data.sh` (apelul e deja în plan) |
| **Baterii reale, la minut** | [StoreNet](https://doi.org/10.6084/m9.figshare.c.6829134) (Irlanda, [articol](https://pmc.ncbi.nlm.nih.gov/articles/PMC11169232)) | 20 de case cu baterie de 10 kWh, 10 cu panouri: producție, consum, **încărcare/descărcare, procentul bateriei**, import și export din rețea, vreme. Anul 2020, la 1 minut | CSV pe Figshare, CC BY 4.0 | Descărcare manuală de pe Figshare. Cel mai bun set pentru verificarea bateriei |
| Consum, export și import, ca de la contor | [Open Power System Data, Household Data](https://data.open-power-system-data.org/household_data/2020-04-15/) (Germania) | 11 clădiri; 3 case au producție + import + export, una are baterie | CSV la 1, 15 sau 60 min; `household_data_15min_singleindex.csv` are 58 MB | Descărcare directă. Varianta la 15 min seamănă cu curba de la contorul inteligent |
| Mai multe case cu panouri și baterii (opțional) | [Residential Power and Battery Data](https://zenodo.org/records/8219786) (Monash/SwitchDin, Australia) | Consum și producție la minut pentru multe case, plus capacitatea bateriilor | RDS/ZIP, ~4,6 GB, CC BY 4.0 | Doar dacă e timp: e mare și în format R |
| Tensiune reală pe străzi (de verificat) | [FeederBW](https://zenodo.org/records/19550073) ([articol](https://arxiv.org/abs/2602.03521)) | 200 de rețele de joasă tensiune din Germania, 2023–2025, la 1 minut | Zenodo | **N-am putut confirma că are tensiune.** Merită 5 minute de verificat: dacă are, înlocuim tensiunea simulată cu una reală |
| Prețul energiei pe ore | [OPCOM](https://www.opcom.ro/) (PZU) | Preț orar, prânz vs. seară | Export din site | Opțional. Pentru demo ajung două valori fixe, marcate „demo”, cu sursa Puterea.ro |
| Tensiunea pe strada din România | **Nu există set public** | | | O simulăm cu modelul fizic al străzii (`sunproof/feeder.py`) și spunem asta deschis |
| Exportul de la contor | Format copiat după portalul Rețele Electrice | Curba la 15 min și indexul, în CSV | Generat din simulare | Arată că pe un export real merge la fel |
| Facturi | Facturi de test, cu 2 erori plantate | | JSON | Le scriem noi |

**Recomandarea pentru demo:** PVGIS pentru producție, StoreNet ca să facem bateriile din simulare să se comporte ca unele reale (și ca dovadă că datele de baterie există la minut), OPSD pentru forma curbei de la contor. Restul rămâne simulat, după plan.

## 2. Pentru producție (produsul real)

| Sursa | Ce dă | Cum o accesăm | Ce trebuie verificat |
| --- | --- | --- | --- |
| **Cloud-ul invertorului: Huawei FusionSolar** (cel mai răspândit) | Producție, stare, alarme, baterie, contorul invertorului | API „Northbound”: se cere un cont openAPI de la eu_inverter_support@huawei.com, apoi drepturi pentru API. Maximum o cerere pe minut pe același API ([documentație](https://docs.rs/crate/huawei_client/latest/source/docs/Communicate%20with%20FusionSolar%20through%20an%20openAPI%20account.pdf)) | Lista exactă de câmpuri (tensiune, setarea bateriei) e într-un document separat, cerut de la Huawei |
| Fronius | Producție, tensiunea rețelei (`UAC`) | Solar API, local, prin rețeaua casei, JSON | Funcționează doar din rețeaua locală, deci e nevoie de cloud-ul Fronius sau de un mic agent |
| SolarEdge, Deye/Solarman, Growatt, SMA | Producție, stare, baterie | API-uri cloud, cu cheie dată de proprietar sau de instalator | Ce câmpuri dă fiecare |
| Exportul manual din aplicația invertorului | Rapoarte zilnice/lunare | Clientul descarcă un fișier și îl încarcă | Bun pentru un pilot, înainte de integrare |
| **Contorul oficial (distribuitorul)** | Curba la 15 min, indexul, **tensiunea pe fiecare fază** | Clientul descarcă CSV/XLS din portal. La Rețele Electrice: „Contul tău” → „Smart Meter” ([manual](https://www.reteleelectrice.ro/wp-content/uploads/manual-utilizare-smart-meter.pdf)). ANRE pregătește acces direct pentru terți, cu acordul clientului ([Bihon](https://www.bihon.ro/stirile-judetului-bihor/economic/anre-pregateste-reguli-noi-pentru-accesul-la-datele-contoarelor-inteligente-ce-drepturi-vor-avea-consumatorii-5344581/)), deocamdată proiect | Doar pentru contoarele inteligente. Formatul la ceilalți distribuitori |
| **Furnizorul** | Indexul lunar (consum și export), facturile, reclamațiile | Export CSV din sistemul lui de facturare | Ce câmpuri are exportul (îi întrebăm pe mentori) |
| Prețuri | Preț orar | OPCOM | |
| Vremea | Radiație, nori, temperatură | Open-Meteo sau ERA5 | Open-Meteo gratuit e doar pentru uz necomercial |

**Ce spunem în pitch:** fără hardware nou și fără parola invertorului. Datele există deja la producătorul invertorului, la distribuitor și la furnizor. SunProof le pune cap la cap, cu acordul clientului.
