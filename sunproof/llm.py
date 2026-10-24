"""Thin LLM wrapper. Tests always use FakeLLM (no network, no API key)."""

import os
from typing import Protocol


class LLM(Protocol):
    def complete(self, system: str, prompt: str) -> str: ...


class AnthropicLLM:
    def __init__(self, model: str | None = None):
        self.model = model or os.environ.get("LLM_MODEL", "claude-sonnet-5-5")

    def complete(self, system: str, prompt: str) -> str:
        raise NotImplementedError


class FakeLLM:
    """Returns canned replies in order; for tests."""

    def __init__(self, replies: list[str]):
        self.replies = list(replies)
        self.calls: list[tuple[str, str]] = []

    def complete(self, system: str, prompt: str) -> str:
        self.calls.append((system, prompt))
        return self.replies.pop(0)
