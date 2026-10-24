from sunproof import config
from sunproof.dossier import distributor_for


def test_thresholds():
    assert config.OV_10MIN == 253.0
    assert config.OV_INSTANT == 264.5
    assert config.RECONNECT_MIN == 15
    assert config.VW_START < config.VW_END


def test_distributor_by_county():
    assert len(config.DISTRIBUTOR_BY_COUNTY) == 42
    assert distributor_for("CJ") == "Distribuție Energie Electrica România"
    assert distributor_for("IS") == "Delgaz Grid"
    assert distributor_for("TM") == "Rețele Electrice"
    assert distributor_for("B") == "Rețele Electrice"
    assert distributor_for("DJ") == "Distribuție Energie Oltenia"


def test_unknown_county_raises():
    import pytest

    with pytest.raises(KeyError):
        distributor_for("XX")
