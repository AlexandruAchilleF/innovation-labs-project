"""Romanian grid explanations from deterministic evidence."""
from sunproof.models import GridFaultCause
EN50549_LIMIT_V = 253.0

def _f(x):
    return f"{x:.2f}"

def _texts(cause: GridFaultCause, f: dict, operator: str) -> dict[str, str]:
    """Romanian texts; every number quoted is a verdict field (2 decimals or integer)."""
    G = GridFaultCause
    if cause in (G.INSUFFICIENT_DATA, G.MONITORING_UNCERTAIN):
        return dict(
            headline_ro="Date insuficiente pentru diagnostic" if cause == G.INSUFFICIENT_DATA else "Monitorizare sau oprire neconfirmată",
            explanation_ro="Datele disponibile nu permit confirmarea stării instalației sau atribuirea unei defecțiuni.",
            technical_proof_summary_ro="Verificați continuitatea telemetriei, comunicația și măsurătorile independente.",
            recommended_action_supplier_ro="Solicitați date complete și verificați comunicația înainte de diagnostic.",
            recommended_action_customer_ro="Verificați conexiunea monitorizării; confirmați starea invertorului cu instalatorul.",
        )
    proof = (
        f"Opriri pentru supratensiune: {f['trip']} minute, limitare de putere: {f['derate']} minute "
        f"({f['n_ev']} ferestre). Tensiune maximă la invertor: {_f(f['inv'])} V; la contorul inteligent: "
        f"{_f(f['met'])} V; creștere pe cablul intern: {_f(f['rise'])} V. Prag configurat: {_f(f['thr'])} V "
        f"(limita legală: {_f(EN50549_LIMIT_V)} V). Vecini afectați simultan: {f['aff']} din {f['tot']}. "
        f"Producție azi: {_f(f['act'])} kWh față de {_f(f['exp'])} kWh estimat PVGIS."
    )
    loss = (f"Pierderea estimată este de {_f(f['lost'])} kWh azi, adică aproximativ {_f(f['lost_m'])} kWh "
            f"și {_f(f['ron'])} RON pe lună.")
    if cause == G.GRID_OVERVOLTAGE:
        return dict(
            headline_ro=f"Rețeaua a oprit invertorul: supratensiune pe postul de transformare ({f['aff']} din {f['tot']} vecini afectați)",
            explanation_ro=(f"Tensiunea a ajuns la {_f(f['met'])} V chiar la contor, iar {f['aff']} din {f['tot']} vecini "
                            f"de pe același transformator au fost afectați în aceleași minute. Datele indică "
                            f"o problemă în rețeaua de distribuție. {loss}"),
            technical_proof_summary_ro=proof,
            recommended_action_supplier_ro=(f"Nu trimiteți echipă la client. Generați dosarul PDF și depuneți reclamația "
                                            f"la operatorul de distribuție ({operator}) pentru reglarea tensiunii pe post."),
            recommended_action_customer_ro=("Verificați mai întâi rețeaua cu distribuitorul. Dovezile pot fi trimise "
                                            "către distribuitor pentru verificare."),
        )
    if cause == G.LOCAL_OVERVOLTAGE_SENSITIVITY:
        return dict(
            headline_ro=f"Invertorul se oprește prea devreme: prag setat la {_f(f['thr'])} V în loc de {_f(EN50549_LIMIT_V)} V",
            explanation_ro=(f"Invertorul s-a oprit la {_f(f['inv'])} V, sub limita legală de {_f(EN50549_LIMIT_V)} V, "
                            f"iar coroborarea vecinilor este limitată ({f['aff']} din {f['tot']}). Pragul de protecție este "
                            f"configurat greșit (cod de țară incorect). {loss}"),
            technical_proof_summary_ro=proof,
            recommended_action_supplier_ro=(f"Trimiteți alertă tehnicianului instalator: setarea pragului de supratensiune "
                                            f"la {_f(EN50549_LIMIT_V)} V și verificarea codului de rețea România."),
            recommended_action_customer_ro=("Problema este o setare a invertorului, nu rețeaua. Tehnicianul o poate "
                                            "corecta de la distanță sau printr-o vizită scurtă."),
        )
    if cause == G.LOCAL_CABLE_IMPEDANCE:
        return dict(
            headline_ro=f"Cablul dintre invertor și contor este subdimensionat: creștere de {_f(f['rise'])} V",
            explanation_ro=(f"La contor tensiunea a fost normală ({_f(f['met'])} V), dar la bornele invertorului a urcat "
                            f"la {_f(f['inv'])} V din cauza căderii de tensiune pe cablul intern. Vecinii nu au fost "
                            f"afectați ({f['aff']} din {f['tot']}). {loss}"),
            technical_proof_summary_ro=proof,
            recommended_action_supplier_ro=("Trimiteți alertă tehnicianului instalator: înlocuirea cablului AC cu o "
                                            "secțiune mai mare sau scurtarea traseului până la tabloul contorului."),
            recommended_action_customer_ro=("Rețeaua este în regulă; cablul instalației trebuie înlocuit de "
                                            "instalator pentru a opri deconectările."),
        )
    if cause == G.LOCAL_EQUIPMENT_FAULT:
        return dict(
            headline_ro=f"Producție prăbușită la tensiune normală: {_f(f['act'])} kWh din {_f(f['exp'])} kWh așteptați",
            explanation_ro=(f"Tensiunea a fost normală (maxim {_f(f['met'])} V la contor), dar panourile au produs doar "
                            f"{_f(f['act'])} kWh față de {_f(f['exp'])} kWh estimat PVGIS. Cauza probabilă este un defect "
                            f"de echipament: invertor oprit, string întrerupt sau panouri murdare/degradate. {loss}"),
            technical_proof_summary_ro=proof,
            recommended_action_supplier_ro=("Trimiteți alertă tehnicianului instalator: verificarea invertorului, "
                                            "a stringurilor și a stării panourilor."),
            recommended_action_customer_ro=("Instalația produce mai puțin decât ar trebui. Un tehnician vă va contacta "
                                            "pentru verificare."),
        )
    return dict(
        headline_ro="Fără defect confirmat al rețelei sau instalației",
        explanation_ro=(f"Nu există dovezi suficiente de defect local: {_f(f['act'])} kWh produși față de {_f(f['exp'])} kWh estimat "
                        f"PVGIS, cu tensiune maximă de {_f(f['met'])} V la contor. {loss}"),
        technical_proof_summary_ro=proof,
        recommended_action_supplier_ro="Nicio acțiune necesară.",
        recommended_action_customer_ro="Urmăriți evoluția producției și eventualele limitări de putere.",
    )
