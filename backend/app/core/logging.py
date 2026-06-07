"""
Structured logging configuration for Agent Swarms.
Provides JSON-formatted log output with trace_id context support.
"""

import logging
import json
import sys
from datetime import datetime, timezone
from typing import Any


class JSONFormatter(logging.Formatter):
    """Formats log records as structured JSON for observability pipelines."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Attach extra fields (e.g. trace_id, swarm_run_id, agent_role)
        for key, value in record.__dict__.items():
            if key not in (
                "name",
                "msg",
                "args",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "exc_info",
                "exc_text",
                "stack_info",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "message",
                "taskName",
            ):
                log_entry[key] = value
        if record.exc_info:
            log_entry["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


def get_logger(name: str) -> logging.Logger:
    """
    Returns a named logger with JSON formatting wired to stdout.
    Usage:
        logger = get_logger(__name__)
        logger.info("event", extra={"trace_id": "abc123"})
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger
