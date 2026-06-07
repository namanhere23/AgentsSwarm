"""
GuardianAI — Pre-flight offline scanner for prompt injection and PII.

Scans user-submitted objective text before it is passed to any LLM agent.
Runs deterministically with no external API calls.
"""
import re
from typing import NamedTuple


class ScanResult(NamedTuple):
    safe: bool
    risk_level: str  # "safe" | "warn" | "block"
    flags: list[str]


# Patterns that signal prompt injection attempts
_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
    r"you\s+are\s+now\s+a",
    r"act\s+as\s+if\s+you\s+(have\s+no|don.t\s+have)",
    r"jailbreak",
    r"DAN\s+mode",
    r"pretend\s+you\s+are\s+(not\s+)?an?\s+AI",
    r"disregard\s+your\s+(safety|guidelines|training)",
    r"override\s+your\s+(safety|system)\s+prompt",
]

# Patterns indicating PII presence
_PII_PATTERNS = [
    r"\b\d{3}-\d{2}-\d{4}\b",              # SSN
    r"\b\d{16}\b",                           # Credit card (16 digits)
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",  # Email
    r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b",   # Phone number
]

# Commands that should require approval before execution
_DANGEROUS_COMMANDS = [
    r"\brm\s+-rf\b",
    r"\bformat\s+[cC]:\b",
    r"\bdrop\s+table\b",
    r"\bdelete\s+from\b",
    r"\btruncate\b",
    r"\bexec\s*\(",
    r"\beval\s*\(",
    r"\b__import__\b",
    r"\bos\.system\b",
    r"\bsubprocess\.Popen\b",
]


class GuardianAI:
    """Pre-flight offline scanner for prompt injection and PII."""

    async def scan_input(self, text: str) -> dict:
        """
        Scans the input text for prompt injection, PII, and dangerous commands.

        Returns:
            dict with keys: safe (bool), risk_level (str), flags (list[str])
        """
        flags: list[str] = []
        text_lower = text.lower()

        # Check for prompt injection
        for pattern in _INJECTION_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                flags.append(f"INJECTION_PATTERN: {pattern}")

        # Check for PII
        for pattern in _PII_PATTERNS:
            if re.search(pattern, text):
                flags.append(f"PII_DETECTED: {pattern}")

        # Check for dangerous shell/code commands
        for pattern in _DANGEROUS_COMMANDS:
            if re.search(pattern, text, re.IGNORECASE):
                flags.append(f"DANGEROUS_COMMAND: {pattern}")

        # Determine risk level
        if any("INJECTION" in f for f in flags):
            risk_level = "block"
            safe = False
        elif any("DANGEROUS_COMMAND" in f for f in flags):
            risk_level = "warn"
            safe = True  # warn but don't block — approval gate handles it
        elif any("PII" in f for f in flags):
            risk_level = "warn"
            safe = True
        else:
            risk_level = "safe"
            safe = True

        return {"safe": safe, "risk_level": risk_level, "flags": flags}
