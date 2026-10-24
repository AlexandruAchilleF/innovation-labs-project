"""Battery explanations use actual configured and requested settings."""
from sunproof.models import BatteryVerdictStatus, HouseholdScenario

def _pct(x):
    return str(int(x)) if float(x).is_integer() else f"{x:.2f}"

def _texts(status: BatteryVerdictStatus, v: dict, scenario: HouseholdScenario) -> tuple[str, str, list[str]]:
    cfg = scenario.battery_config
    path = cfg.app_setting_path_ro or "aplicația invertorului → setări baterie"
    loss = (
        f"Oportunitate estimată de cel mult {v['shiftable_evening_energy_kwh_per_day']:.2f} kWh/zi "
        f"({v['shiftable_evening_energy_kwh_per_month']:.2f} kWh/lună) pentru acoperirea consumului de seară: "
        f"clientul plătește în plus {v['customer_monthly_grid_tax_loss_ron']:.2f} RON/lună tarife de rețea și taxe, "
        f"iar furnizorul pierde {v['supplier_monthly_pzu_loss_ron']:.2f} RON/lună din diferența de preț PZU "
        f"de {v['pzu_spread_ron_mwh']:.2f} RON/MWh."
    )
    if status == BatteryVerdictStatus.NO_BATTERY:
        return (
            "Fără baterie instalată",
            "Gospodăria nu are baterie; surplusul de la amiază este injectat în rețea, iar consumul de seară "
            "vine din rețea. Nu există setări de baterie de verificat.",
            [],
        )
    if status == BatteryVerdictStatus.MISCONFIGURED_DISCHARGE_POLICY:
        return (
            "Descărcarea de seară contrazice intenția clientului",
            "Clientul nu permite descărcarea seara, dar modul configurat sau livrarea observată o permite. "
            "Nu recomandăm eliberarea rezervei pentru arbitraj.",
            [f"Deschideți: {path}.", "Configurați programul sau modul de rezervă pentru a interzice descărcarea seara.",
             "Verificați împreună cu clientul programul și comportamentul din ziua următoare."],
        )
    if status == BatteryVerdictStatus.MISCONFIGURED_MODE:
        return (
            "Modul bateriei diferă de intenția clientului",
            f"Mod configurat: {v['configured_mode'].value}; mod dorit: {v['desired_mode'].value}. {loss}",
            [f"Deschideți: {path}.", f"Setați modul solicitat: {v['desired_mode'].value}.",
             f"Setați SoC minim la {_pct(v['desired_min_soc_pct'])}%.",
             "Verificați programul și livrarea din ziua următoare."],
        )
    if status == BatteryVerdictStatus.MISCONFIGURED_SOC_RESERVE:
        return (
            f"Rezerva SoC diferă: {_pct(v['configured_min_soc_pct'])}% în loc de {_pct(v['desired_min_soc_pct'])}%",
            f"Rezerva configurată ({_pct(v['configured_min_soc_pct'])}%) diferă de cea solicitată "
            f"({_pct(v['desired_min_soc_pct'])}%). {loss}",
            [f"Deschideți: {path}.",
             f"Setați SoC minim de la {_pct(v['configured_min_soc_pct'])}% la {_pct(v['desired_min_soc_pct'])}%.",
             "Salvați și verificați rezerva și programul în ziua următoare."],
        )
    if status == BatteryVerdictStatus.INSUFFICIENT_DATA:
        return ("Date insuficiente", "Nu există suficiente date pentru evaluarea funcționării bateriei.", [])
    if status == BatteryVerdictStatus.UNDERPERFORMING_CAPACITY:
        return (
            "Capacitatea bateriei este degradată",
            f"Setările corespund dorinței clientului, dar bateria livrează doar "
            f"{v['evening_battery_discharge_kwh_today']:.2f} kWh seara din {v['usable_capacity_kwh']:.2f} kWh utilizabili.",
            ["Cereți instalatorului un test de capacitate și verificarea garanției bateriei."],
        )
    delivered = (
        f"Seara bateria a livrat {v['evening_battery_discharge_kwh_today']:.2f} kWh, "
        f"iar din rețea s-au importat doar {v['evening_peak_grid_import_kwh_today']:.2f} kWh."
    )
    return (
        "Bateria este configurată corect",
        f"Modul și SoC minim ({_pct(v['configured_min_soc_pct'])}%) corespund dorinței clientului. {delivered}",
        [],
    )
