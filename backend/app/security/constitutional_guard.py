"""
ConstitutionalGuard — Post-generation scanner for destructive payloads.

Checks agent-generated tool payloads before execution for:
- Destructive file system operations
- Network exfiltration patterns
- Database destructive commands
- Credential theft patterns
"""
import re
from backend.app.core.logging import get_logger

logger = get_logger("constitutional_guard")

# Patterns that are unconditionally blocked
_BLOCKED_PATTERNS = [
    (r"\brm\s+-rf\s+/", "DESTRUCTIVE_FILESYSTEM: rm -rf on root path"),
    (r"\bformat\s+[cC]:", "DESTRUCTIVE_FILESYSTEM: Format drive C"),
    (r"\bdrop\s+database\b", "DESTRUCTIVE_DATABASE: DROP DATABASE command"),
    (r"\btruncate\s+table\b", "DESTRUCTIVE_DATABASE: TRUNCATE TABLE command"),
    (r"\bdelete\s+from\b.*\bwhere\b.*\b1=1\b", "DESTRUCTIVE_DATABASE: DELETE all rows"),
    (r"curl\s+.*\|\s*(bash|sh)", "CODE_EXECUTION: Remote code execution via curl pipe"),
    (r"wget\s+.*\|\s*(bash|sh)", "CODE_EXECUTION: Remote code execution via wget pipe"),
    (r"__import__\s*\(\s*['\"]os['\"]", "CODE_INJECTION: OS module import injection"),
    (r"eval\s*\(.*__import__", "CODE_INJECTION: Eval with import"),
]

# Patterns that trigger a warning (require approval gate)
_WARN_PATTERNS = [
    (r"\bssh\b.*@", "NETWORK_ACCESS: SSH connection attempt"),
    (r"\bscp\b.*@", "NETWORK_TRANSFER: SCP file transfer"),
    (r"\bnc\b.*-e\b", "NETWORK_ACCESS: Netcat reverse shell attempt"),
    (r"\/etc\/passwd", "CREDENTIAL_ACCESS: /etc/passwd read attempt"),
    (r"\/etc\/shadow", "CREDENTIAL_ACCESS: /etc/shadow read attempt"),
    (r"aws\s+s3\s+cp", "DATA_TRANSFER: AWS S3 copy operation"),
]


class ConstitutionalGuard:
    """Post-generation scanner for destructive payloads before tool execution."""

    async def check_payload(self, payload: dict) -> dict:
        """
        Scan a tool execution payload for destructive patterns.

        Args:
            payload: The tool invocation payload dict (expects 'input' or 'command' key)

        Returns:
            dict with keys: safe (bool), blocked (bool), risk_level (str), flags (list[str])
        """
        # Flatten the payload into a single string for scanning
        content = " ".join(str(v) for v in payload.values())
        flags: list[str] = []
        blocked = False

        # Check unconditionally blocked patterns first
        for pattern, description in _BLOCKED_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                flags.append(description)
                blocked = True
                logger.critical(
                    f"ConstitutionalGuard BLOCKED: {description} | payload={content[:200]}"
                )

        # Check warning patterns (require approval)
        for pattern, description in _WARN_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                flags.append(description)
                logger.warning(
                    f"ConstitutionalGuard WARN: {description} | payload={content[:200]}"
                )

        if blocked:
            return {
                "safe": False,
                "blocked": True,
                "risk_level": "critical",
                "flags": flags,
            }
        elif flags:
            return {
                "safe": True,  # Not blocked, but needs approval gate
                "blocked": False,
                "risk_level": "high",
                "flags": flags,
            }

        return {"safe": True, "blocked": False, "risk_level": "safe", "flags": []}
