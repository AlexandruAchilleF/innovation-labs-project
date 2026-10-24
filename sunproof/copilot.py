"""Prosumer copilot with tools (Task 7). The LLM explains; numbers come from tools."""

MAX_ROUNDS = 5


def day_timeline(site_id: str, day) -> dict:
    raise NotImplementedError


def events(site_id: str, start, end, kind: str | None = None) -> list[dict]:
    raise NotImplementedError


def month_summary(site_id: str, month) -> dict:
    raise NotImplementedError


def compare_neighbours(site_id: str, day) -> dict:
    raise NotImplementedError


def ask(question: str, site_id: str, llm_client) -> tuple[str, list[str]]:
    """Answer and the list of tools called (at most MAX_ROUNDS tool rounds)."""
    raise NotImplementedError
