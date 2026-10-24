"""Technical PDF dossier for the distribution operator (fpdf2, core Helvetica, latin-1 safe text).

All numbers come from the deterministic grid verdict or are aggregated from the scenario telemetry.
"""
from __future__ import annotations

from fpdf import FPDF
from fpdf.enums import XPos, YPos

from sunproof.models import HouseholdCompleteAnalysis, HouseholdScenario, InverterStatus

LIMIT_V = 253.0
MAX_EVENT_ROWS = 25
_TRANSLIT = str.maketrans({
    "ă": "a", "Ă": "A", "â": "a", "Â": "A", "î": "i", "Î": "I", "ș": "s", "ş": "s", "Ș": "S", "Ş": "S",
    "ț": "t", "ţ": "t", "Ț": "T", "Ţ": "T", "·": "-", "—": "-", "–": "-", "•": "-", "“": '"', "”": '"',
    "„": '"', "‘": "'", "’": "'", "≥": ">=", "≤": "<=", "→": "->", "…": "...", "−": "-"})
_CAUSE_RO = {"GRID_OVERVOLTAGE": "Supratensiune in reteaua de distributie (post de transformare)",
             "LOCAL_OVERVOLTAGE_SENSITIVITY": "Cauza locala: prag de declansare setat gresit in invertor",
             "LOCAL_CABLE_IMPEDANCE": "Cauza locala: cablu AC intern subdimensionat",
             "LOCAL_EQUIPMENT_FAULT": "Cauza locala: defect de echipament (invertor / stringuri)",
             "NONE": "Fara declansari anormale in ziua analizata",
             "INSUFFICIENT_DATA": "Date insuficiente pentru diagnostic",
             "MONITORING_UNCERTAIN": "Monitorizare incerta; diagnostic neconfirmat"}
_REQUESTS = ("Verificarea si reglajul plotului (tap) transformatorului din postul de transformare.",
             "Echilibrarea incarcarii pe faze pe plecarea de joasa tensiune.",
             "Verificarea impedantei plecarii (sectiune conductor, conexiuni, lungime).",
             "Monitorizarea tensiunii la punctul de racordare timp de 7 zile, cu inregistrator certificat.",
             "Raspuns in termenul prevazut de standardul de performanta ANRE pentru serviciul de distributie.")


def to_pdf_safe(text: str) -> str:
    """Romanian diacritics -> ASCII, typographic symbols -> ASCII, other non-latin-1 chars -> '?'."""
    return str(text).translate(_TRANSLIT).encode("latin-1", errors="replace").decode("latin-1")


def inverter_label(s: HouseholdScenario) -> str:
    """'Brand Model' without repeating the brand when the model already starts with it."""
    brand = s.inverter_brand.value
    return s.inverter_model if s.inverter_model.lower().startswith(brand.lower()) else f"{brand} {s.inverter_model}"


def _f(x: float, d: int = 2) -> str:
    return f"{float(x):.{d}f}"


class _Dossier(FPDF):
    def header(self) -> None:
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(160, 35, 35)
        self.cell(0, 6, "DEMO / DATE SIMULATE - sursa: scenarii sintetice SunProof",
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(0, 0, 0)

    def footer(self) -> None:
        self.set_y(-12)
        self.set_font("Helvetica", "I", 7)
        self.cell(0, 5, to_pdf_safe(f"SunProof - dosar tehnic generat automat - pagina {self.page_no()}"), align="C")

    def line_text(self, text: str, size: float = 9, style: str = "", h: float = 4.6) -> None:
        self.set_font("Helvetica", style, size)
        self.multi_cell(0, h, to_pdf_safe(text), align="L", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def section(self, title: str) -> None:
        self.ln(2)
        self.set_fill_color(230, 236, 245)
        self.set_font("Helvetica", "B", 10.5)
        self.cell(0, 6.5, to_pdf_safe(title), fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(1)

    def grid_table(self, headers: list[str], widths: list[float], rows: list[list[str]]) -> None:
        self.set_font("Helvetica", "B", 6.8)
        self.set_fill_color(210, 220, 235)
        for h, w in zip(headers, widths):
            self.cell(w, 7, to_pdf_safe(h), border=1, align="C", fill=True)
        self.ln(7)
        self.set_font("Helvetica", "", 6.8)
        for i, row in enumerate(rows):
            if self.get_y() > self.h - 22:
                self.add_page()
            self.set_fill_color(*((245, 247, 250) if i % 2 else (255, 255, 255)))
            if len(row) == 1:
                self.cell(sum(widths), 5, to_pdf_safe(row[0]), border=1, align="C", fill=True)
            else:
                for val, w in zip(row, widths):
                    self.cell(w, 5, to_pdf_safe(val)[:40], border=1, align="C", fill=True)
            self.ln(5)


def _telemetry_stats(scenario: HouseholdScenario) -> dict:
    inv = scenario.inverter_telemetry
    tripped = {s.minute_of_day for s in inv if s.status == InverterStatus.TRIPPED_OVERVOLTAGE}
    meter_over = sum(15 for m in scenario.smart_meter_15m if m.meter_voltage_avg_v > LIMIT_V)
    neighbors = []
    for nb in scenario.neighbors:
        nb_trip = {t.minute_of_day for t in nb.telemetry if t.status == InverterStatus.TRIPPED_OVERVOLTAGE}
        neighbors.append([nb.anonymized_label.split(" · ")[0], str(nb.distance_from_transformer_m), nb.phase,
                          _f(nb.installed_kw, 1), _f(max((t.ac_voltage_v for t in nb.telemetry), default=0.0)),
                          str(sum(1 for t in nb.telemetry if t.ac_voltage_v > LIMIT_V)), str(len(nb_trip)),
                          "DA" if nb_trip & tripped else "nu"])
    return {"inverter_minutes_over": sum(1 for s in inv if s.ac_voltage_v > LIMIT_V),
            "meter_minutes_over": meter_over, "tripped_minutes": len(tripped), "neighbors": neighbors}


def build_distributor_pdf_bytes(scenario: HouseholdScenario, analysis: HouseholdCompleteAnalysis) -> bytes:
    """Complete A4 dossier (header, client, diagnosis, event table, neighbor correlation, requests)."""
    g, s = analysis.grid_verdict, scenario
    is_grid = g.cause.value == "GRID_OVERVOLTAGE"
    uncertain = g.cause.value not in _CAUSE_RO or g.cause.value in {"INSUFFICIENT_DATA", "MONITORING_UNCERTAIN"}
    stats = _telemetry_stats(s)
    pdf = _Dossier(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(10, 10, 10)
    pdf.add_page()
    pdf.set_title(to_pdf_safe(f"Dosar supratensiune {s.household_id}"))
    pdf.line_text("SunProof - Prosumer & Grid Intelligence (in numele furnizorului de energie)", 8, "I")
    pdf.line_text(f"Data analizei: {s.date_analyzed}    Referinta: {s.household_id} / {s.pod_code}", 8)
    pdf.line_text(f"Catre: {s.distribution_operator.value}", 10, "B", 6)
    pdf.ln(1)
    pdf.line_text("Dosar tehnic retea JT — EN 50549-1", 14, "B", 7)
    pdf.line_text(f"Perioada: ziua {s.date_analyzed}; luna {s.monthly_summary.month_label}", 8)
    pdf.line_text("Pregatit / netrimis. Nu exista dovada de livrare a unei sesizari.", 9, "B")
    category = ("RETEA: proiect de sesizare pentru verificarea operatorului." if is_grid else
                "CAUZA LOCALA: document informativ pentru instalatia clientului." if g.cause.value.startswith("LOCAL_") else
                "Fara declansari anormale; nu se solicita interventii." if g.cause.value == "NONE" else
                "Date insuficiente / monitorizare incerta: completati datele; fara solicitare de interventie.")
    pdf.line_text(category, 9, "B")

    pdf.section("1. Date client si loc de consum")
    for k, v in (("Client", s.customer_name), ("Adresa", f"{s.street_address}, {s.city}, jud. {s.county}"),
                 ("Cod POD", s.pod_code), ("Post de transformare", s.transformer_id),
                 ("Plecare (feeder) / faza", f"{s.feeder_id or '-'} / {s.connection_phase}"),
                 ("Distanta pana la PT", f"{s.distance_from_transformer_m} m"),
                 ("Invertor", f"{inverter_label(s)}, {_f(s.installed_pv_kw, 1)} kW"),
                 ("Prag declansare configurat", f"{_f(s.configured_overvoltage_trip_v)} V (limita EN 50549-1: "
                                                f"{_f(g.en50549_legal_limit_v)} V)"),
                 ("Cablu AC intern", f"{_f(s.internal_ac_cable_section_mm2, 1)} mm2, {_f(s.internal_ac_cable_length_m, 1)} m")):
        pdf.line_text(f"{k}: {v}", 9)

    pdf.section("2. Diagnostic")
    pdf.line_text(f"Cauza: {_CAUSE_RO.get(g.cause.value, g.cause.value)}  |  Severitate: {g.severity.value}"
                  f"  |  Responsabil: {g.responsible_party.value}", 9, "B")
    pdf.line_text(g.headline_ro, 9, "B")
    pdf.line_text(g.explanation_ro, 8.5)
    if uncertain:
        pdf.line_text("Masuratorile nu permit confirmarea maximelor sau a absentei evenimentelor.", 8.5)
    else:
        pdf.line_text(g.technical_proof_summary_ro, 8.5)
        for line in (f"Tensiune maxima la invertor: {_f(g.max_inverter_voltage_v)} V; maximul mediilor de 15 min la contor (PCC): "
                     f"{_f(g.max_meter_voltage_v)} V; crestere pe cablul intern: {_f(g.voltage_rise_internal_cable_v)} V.",
                     f"Esantioane invertor / durata intervalelor contor cu media > {_f(LIMIT_V, 0)} V: {stats['inverter_minutes_over']} la invertor (telemetrie "
                     f"1 min), {stats['meter_minutes_over']} la contor (medii 15 min).",
                     f"Vecini afectati simultan: {g.neighbors_affected_simultaneously} din {g.neighbors_total} "
                     f"(raport de simultaneitate {_f(g.simultaneity_ratio)}).",
                     f"Minute deconectat azi: {g.total_trip_minutes_today}; productie pierduta: "
                     f"{_f(g.lost_production_today_kwh)} kWh azi, {_f(g.lost_production_month_est_kwh)} kWh/luna "
                     f"estimat; valoare pierduta client: {_f(g.lost_value_customer_month_ron)} RON/luna."):
            pdf.line_text("- " + line, 8.5)
    pdf.line_text("Contor: medii de 15 min, nu maxime instantanee. Invertor: esantioane la un minut; "
                  "valorile din ferestre nu dovedesc varfuri simultane intre surse. Lipsa datelor nu inseamna zero.", 8)
    pdf.section(f"3. Tabel 1 - ferestre de supratensiune / declansare ({len(g.events)} ferestre)")
    rows = [[e.start_time, e.end_time, str(e.duration_minutes), _f(e.peak_inverter_voltage_v),
             _f(e.peak_meter_voltage_v), _f(e.internal_cable_voltage_rise_v), str(e.neighbors_tripped_count),
             str(e.neighbors_over_250v_count), _f(e.lost_energy_kwh, 3),
             "DA" if max(e.peak_inverter_voltage_v, e.peak_meter_voltage_v) > LIMIT_V else "nu"]
            for e in g.events[:MAX_EVENT_ROWS]]
    if len(g.events) > MAX_EVENT_ROWS:
        rows.append([f"... inca {len(g.events) - MAX_EVENT_ROWS} ferestre (disponibile in format electronic)"])
    if uncertain:
        rows = [["Ferestre neconfirmate: completati datele de monitorizare"]]
    elif not rows:
        rows = [["Nicio fereastra de declansare in ziua analizata"]]
    pdf.grid_table(["Start", "Sfarsit", "Durata min", "Umax inv. V", "Max med.15m V", "Cadere cablu V",
               "Vecini declansati", "Vecini >250V", "kWh pierduti", ">253V"],
              [17, 17, 16, 21, 22, 21, 20, 20, 19, 17], rows)

    pdf.section(f"4. Tabel 2 - corelare cu vecinii anonimizati de pe acelasi PT ({s.transformer_id})")
    pdf.grid_table(["Vecin", "Distanta m", "Faza", "kW instalat", "Umax V", "Min >253V", "Min declansat",
               "Simultan cu clientul"], [42, 18, 16, 18, 20, 20, 22, 34],
              stats["neighbors"] or [["Nu exista vecini monitorizati cu consimtamant"]])

    pdf.section("5. Solicitari propuse (netrimise)" if is_grid else "5. Concluzie informativa")
    if is_grid:
        for req in _REQUESTS:
            pdf.line_text("- " + req, 9)
        pdf.line_text("Propuneri pregatite pentru verificarea operatorului; transmiterea necesita o actiune separata.", 8.5, "I")
    else:
        pdf.line_text(category, 9)
    return bytes(pdf.output())


build_distributor_dossier_pdf = build_distributor_pdf_bytes
