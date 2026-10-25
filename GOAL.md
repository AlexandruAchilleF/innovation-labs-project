# Goal

**Până la demo (25 octombrie 2026) avem un prototip funcțional, 100% software și doar web, care răspunde pentru orice prosumator la întrebarea „Panourile și bateria ta fac ce trebuie?”, și dovezi din interviuri reale că problema există.**

## Rezultatul măsurabil

Prototipul e gata când scenariul demo merge cap-coadă, de două ori la rând, fără erori:

1. **Supratensiune → sesizare.** Pe o stradă simulată, în orele de vârf ale producției solare, tensiunea trece de 253 V și casele de la capăt se opresc. Aplicația le marchează „problemă de rețea, confirmată de vecini” și generează dosarul PDF de sesizare, adresat distribuitorului din județul casei (merge în toate cele 5 orașe demo). O casă care doar nu trimite date apare „lipsă date”, nu oprire.
2. **Defect → alertă O&M.** Un defect de invertor injectat la o casă cu tensiune normală e marcat „defect de echipament”, iar alerta ajunge pe Telegram în aceeași zi. După reparație, tichetul devine „verificat” doar după 2 zile cu producție fără defect, „redeschis” dacă defectul revine și „dovezi insuficiente” dacă zilele sunt înnorate. Un tichet trimis de client din panoul lui ajunge la O&M cu verdictul SunProof atașat.
3. **Baterie → intenție vs. setare.** Proprietarul a vrut rezervă 20%, bateria e setată la 80%: aplicația arată importul seara din rețea în lei și data la care s-a schimbat setarea. Cu intenția schimbată la 80%, aceleași date nu dau alertă. Aceeași casă, cu bateria setată corect, are mai puține opriri, iar într-un program de tip Electrica (pilot august 2026) se vede și bonusul ratat.
4. **Dovada.** O evaluare pe scenarii aleatoare arată acuratețea clasificării rețea vs. echipament, la date la 1 minut și la 5 minute, plus numărul de alarme false pe date reale de la case adevărate.
5. **Prezentarea.** Site-ul MVP arată panoul clientului și panoul furnizorului, iar pitch-ul are 4 grafice, fiecare cu o singură concluzie.

## Dovezile din interviuri (criteriul nr. 1 al juriului)

- Cel puțin **8 conversații**: prosumatori, instalatori sau O&M, plus mentorii companiei.
- **Citate exacte** și, unde se poate, **screenshot-uri din istoricul de alarme** al invertorului („Grid overvoltage”).
- Pentru fiecare: câte opriri, de unde a aflat, după cât timp și cât a pierdut.

## În afara scopului

- Hardware, controlul invertoarelor sau schimbarea setărilor lor
- Conectori reali la API-urile producătorilor. Arătăm doar interfața adaptorului, una singură pentru toate brandurile
- Aplicație mobilă (alertele pe Telegram acoperă telefonul)
- Un model ML antrenat (vecinii sunt detecția de anomalii)
- Optimizare de tarif sau tranzacționare de energie (prețurile PZU, dacă apar, doar arată cât valorează ora)
