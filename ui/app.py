"""SunProof Streamlit app: Prosumator and O&M modes, plus the demo panel (Task 8)."""

import streamlit as st

from sunproof import config

st.set_page_config(page_title="SunProof", page_icon="☀️", layout="wide")

with st.sidebar:
    st.title("SunProof")
    st.caption("Un singur adevăr despre energia ta, care îți aparține.")
    mode = st.radio("Mod", ["Prosumator", "O&M"])
    city = st.selectbox("Oraș", list(config.CITIES), index=list(config.CITIES).index(config.DEFAULT_CITY))
    st.divider()
    st.subheader("Panou demo")
    st.button("Crește tensiunea la transformator (+2 V)")
    st.button("Injectează defect de invertor")
    st.button("Rețea căzută")
    st.button("Rulează ziua")
    st.caption("Date simulate: producție PVGIS 2020, tensiune din modelul fizic al străzii.")

if mode == "Prosumator":
    tab_today, tab_month, tab_battery, tab_money, tab_consent, tab_chat = st.tabs(
        ["Azi", "Luna", "Bateria", "Invertor · Contor · Factură", "Cine vede ce", "Întreabă"]
    )
    with tab_today:
        st.info("Producția reală vs. așteptată și tensiunea, cu linia de 253 V. (în lucru)")
    with tab_month:
        st.info("Opriri, kWh și lei; rețea vs. echipament; dosarul de sesizare (PDF). (în lucru)")
    with tab_battery:
        st.info("Ce ai vrut vs. ce e setat; curba SoC; bonusul ratat. (în lucru)")
    with tab_money:
        st.info("Produs, injectat pe contor, injectat pe factură. (în lucru)")
    with tab_consent:
        st.info("Cine vede ce și jurnalul de acces. (în lucru)")
    with tab_chat:
        st.info("Copilotul răspunde apelând unelte. (în lucru)")
else:
    tab_map, tab_tickets, tab_report = st.tabs(["Harta străzilor", "Tichete", "Raport pentru distribuitor"])
    with tab_map:
        st.info("Mov = supratensiune, roșu = defect, verde = ok. (în lucru)")
    with tab_tickets:
        st.info("Tichete de echipament, ordonate după lei pe zi. (în lucru)")
    with tab_report:
        st.info("Rezumatul pe stradă pentru distribuitor. (în lucru)")
