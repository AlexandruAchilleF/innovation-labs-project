import pytest

from sunproof.llm import FakeLLM


@pytest.fixture
def fake_llm():
    return FakeLLM
