"""Romanian invoice explanations for deterministic billing statuses."""
from sunproof.models import BillingVerdictStatus

def _fmt(value):
    value = round(float(value), 2)
    return str(int(value)) if value.is_integer() else f"{value:.2f}".replace(".", ",")

def _texts(status: BillingVerdictStatus, n: dict[str, float]) -> dict[str, str]:
    """Romanian headline / call-center script / customer explanation / recommended action."""
    f = {k: _fmt(v) for k, v in n.items()}
    walk = (
        f"Luna aceasta panourile au produs {f['prod']} kWh. Din aceștia, {f['self']} kWh "
        f"({f['ratio']}%) au fost consumați direct în casă, fără să treacă prin contorul rețelei"
        + (f", inclusiv {f['batt']} kWh stocați în baterie și folosiți seara" if n["batt"] > 0 else "")
        + f". Doar surplusul de {f['inv_exp']} kWh a plecat în rețea; contorul inteligent "
        f"(registrul de export) a măsurat oficial {f['m_exp']} kWh injectați. "
    )
    if status == BillingVerdictStatus.UNSUPPORTED_SETTLEMENT:
        return {"headline": "Regimul de compensare necesită verificare", "script": "Nu putem confirma factura: regimul de decontare nu este acoperit de calculul automat.", "explanation": "Factura nu a fost declarată corectă deoarece regimul de decontare necesită verificare manuală.", "action": "Verificați contractul și regulile de decontare aplicabile înainte de recalculare."}
    if status == BillingVerdictStatus.AMOUNT_MISMATCH:
        return {"headline": f"Liniile sau totalul facturii nu se reconciliază: {f['billed']} RON", "script": f"Suma tipărită ({f['billed']} RON) nu corespunde liniilor de energie și tarife.", "explanation": walk + f"Totalul tipărit este {f['billed']} RON, iar valoarea reconciliată cu contorul și tarifele este {f['correct']} RON.", "action": "Solicitați furnizorului detalierea și corectarea totalului facturii."}
    savings = (
        f"Energia consumată direct v-a economisit deja {f['savings']} RON, bani pe care nu îi mai "
        "vedeți pe factură tocmai pentru că nu ați cumpărat-o din rețea."
    )
    if status == BillingVerdictStatus.MISSING_EXPORT_INDEX:
        return {
            "headline": f"Factura nu recunoaște {f['missing']} kWh injectați: plată în plus de {f['disc']} RON",
            "script": (
                f"Aveți dreptate să verificați. Contorul a înregistrat {f['m_exp']} kWh injectați în rețea, "
                f"dar pe factură apar doar {f['b_exp']} kWh, deci indexul de export lipsește. Suma corectă "
                f"este {f['correct']} RON, nu {f['billed']} RON. Deschidem acum o cerere de refacturare."
            ),
            "explanation": walk + (
                f"Factura a recunoscut însă doar {f['b_exp']} kWh exportați, așa că cei {f['m_imp']} kWh "
                f"importați nu au fost compensați kWh pentru kWh cu energia injectată. Ați fost facturat cu "
                f"{f['billed']} RON, iar suma corectă este {f['correct']} RON (diferență {f['disc']} RON). "
            ) + savings,
            "action": (
                "Furnizorul trebuie să preia indexul real de export de la distribuitor, să storneze factura "
                f"și să reemită factura cu {f['m_exp']} kWh compensați; diferența de {f['disc']} RON se "
                "restituie sau se compensează pe factura următoare. Dacă nu se rezolvă, reclamație la ANRE."
            ),
        }
    if status == BillingVerdictStatus.ESTIMATED_INDEX_OVERCHARGE:
        return {
            "headline": f"Import facturat pe estimare: {f['b_imp']} kWh în loc de {f['m_imp']} kWh, {f['disc']} RON în plus",
            "script": (
                f"Factura folosește un index de consum estimat: {f['b_imp']} kWh facturați, dar contorul "
                f"inteligent a măsurat {f['m_imp']} kWh. Suma corectă este {f['correct']} RON în loc de "
                f"{f['billed']} RON. Solicităm regularizarea pe baza citirii reale."
            ),
            "explanation": walk + (
                f"Din rețea ați consumat de fapt {f['m_imp']} kWh, însă factura a folosit o estimare de "
                f"{f['b_imp']} kWh. Recalculată pe indexul real, factura este {f['correct']} RON, nu "
                f"{f['billed']} RON (diferență {f['disc']} RON). "
            ) + savings,
            "action": (
                "Furnizorul (care a emis factura) trebuie să ceară distribuitorului citirea reală a "
                f"contorului inteligent și să regularizeze factura cu {f['disc']} RON în favoarea clientului."
            ),
        }
    if status == BillingVerdictStatus.METER_INVERTER_DISCREPANCY:
        return {
            "headline": "Invertorul și contorul inteligent raportează cantități diferite",
            "script": (
                f"Invertorul raportează {f['inv_exp']} kWh exportați și {f['inv_imp']} kWh importați, "
                f"iar contorul oficial {f['m_exp']} kWh și {f['m_imp']} kWh. Factura respectă contorul; "
                "trimitem un tehnician să verifice senzorul de măsură al invertorului."
            ),
            "explanation": walk + (
                f"Aplicația invertorului arată însă alte valori ({f['inv_exp']} kWh export, {f['inv_imp']} kWh "
                f"import). Factura se bazează legal pe contor: {f['billed']} RON. "
            ) + savings,
            "action": (
                "Instalatorul verifică senzorul de curent (CT/smart meter) al invertorului, cablarea și "
                "configurarea; dacă diferența persistă, se solicită distribuitorului verificarea contorului."
            ),
        }
    return {
        "headline": f"Factura este corectă: {f['b_exp']} kWh injectați, restul de {f['self']} kWh i-ați consumat direct",
        "script": (
            f"Factura este corectă. Panourile au produs {f['prod']} kWh, dar {f['self']} kWh au fost "
            f"consumați direct în casă și nu ajung la contor; doar {f['m_exp']} kWh au fost injectați, "
            f"exact cât apare pe factură. De plată: {f['billed']} RON."
        ),
        "explanation": walk + (
            f"Aceasta este exact cantitatea recunoscută pe factură ({f['b_exp']} kWh). Din rețea ați "
            f"consumat {f['m_imp']} kWh"
            + (
                ", toți compensați kWh pentru kWh cu energia injectată; surplusul rămâne credit pentru "
                "lunile următoare. Suma de "
                if n["m_exp"] >= n["m_imp"] else
                f", din care {f['m_exp']} kWh au fost compensați kWh pentru kWh cu energia injectată, iar "
                "diferența neacoperită se plătește la prețul energiei. Suma de "
            )
            + f"{f['billed']} RON include tarifele de rețea și taxele, care prin lege nu se compensează. "
        ) + savings,
        "action": (
            "Nicio corecție necesară. Explicați clientului diferența dintre producția totală a panourilor "
            "și energia injectată în rețea; pentru a reduce importul, mutați consumul mare la prânz."
        ),
    }
