"""All thresholds and constants. Never hardcode these elsewhere.

Values marked DEMO are placeholders and must stay labelled "demo" in the UI.
"""

from datetime import date

# Voltage (SR EN 50160 / ANRE; verify before the pitch)
V_NOMINAL = 230.0
OV_10MIN = 253.0  # 10-minute average disconnection threshold
OV_INSTANT = 264.5  # instantaneous disconnection threshold
RECONNECT_MIN = 15  # minutes an inverter stays off after a trip

# Volt-watt curve
VW_START = 248.0
VW_END = 253.0
VW_MIN_FRACTION = 0.2

# Feeder simulator (calibrate in Task 2, Step 3, on seed 1)
V_TX = 240.0
R_SEG_OHM = 0.01

# Event classification
MIN_PEERS = 2  # peers tripped in the same window to confirm a grid cause
PEER_WINDOW_MIN = 5
NO_DATA_MIN = 15
GRID_OUTAGE_V = 100.0
GRID_OUTAGE_SHARE = 0.8
MIN_EXPECTED_W = 50.0  # trips below this expected power are not events (night, sunrise)
PARTIAL_OUTPUT_RATIO = 0.65
PARTIAL_OUTPUT_MIN = 60
VW_CURTAIL_RATIO = 0.8
VW_CURTAIL_MIN = 10

# O&M
VERIFY_DAYS = 2

# Money (DEMO values)
LEI_PER_KWH = 1.00  # DEMO
REF_EXPORT_LEI_PER_KWH = 0.50  # DEMO

# Battery program (DEMO: Electrica pilot, August 2026; verify before the pitch)
PROGRAM_WINDOW = (19, 21)  # local hours
CHARGE_WINDOW = (11, 16)  # local hours
BONUS_LEI_PER_KWH = 0.40  # DEMO
PROGRAM_RESERVE = 0.2

LOCAL_TZ = "Europe/Bucharest"
DEMO_DAY = date(2020, 7, 15)

# Demo cities: (lat, lon, county code)
CITIES = {
    "bucuresti": (44.375, 26.120, "B"),
    "cluj": (46.770, 23.590, "CJ"),
    "iasi": (47.160, 27.590, "IS"),
    "timisoara": (45.750, 21.230, "TM"),
    "constanta": (44.180, 28.630, "CT"),
}
DEFAULT_CITY = "bucuresti"

# Distribution operator by county (verify on the ANRE site before the pitch)
_RE = "Rețele Electrice"
_DEER = "Distribuție Energie Electrica România"
_DELGAZ = "Delgaz Grid"
_DEO = "Distribuție Energie Oltenia"

DISTRIBUTOR_BY_COUNTY = {
    # Rețele Electrice: Muntenia Sud, Banat, Dobrogea
    **dict.fromkeys(["B", "IF", "GR"], _RE),
    **dict.fromkeys(["TM", "AR", "CS", "HD"], _RE),
    **dict.fromkeys(["CT", "TL", "CL", "IL"], _RE),
    # Delgaz Grid: Moldova
    **dict.fromkeys(["IS", "BC", "BT", "NT", "SV", "VS"], _DELGAZ),
    # Distribuție Energie Oltenia
    **dict.fromkeys(["DJ", "GJ", "MH", "OT", "VL", "AG", "TR"], _DEO),
    # DEER: Transilvania Nord, Transilvania Sud, Muntenia Nord
    **dict.fromkeys(["CJ", "BH", "BN", "MM", "SJ", "SM"], _DEER),
    **dict.fromkeys(["AB", "BV", "CV", "HR", "MS", "SB"], _DEER),
    **dict.fromkeys(["PH", "BZ", "BR", "GL", "DB", "VN"], _DEER),
}
