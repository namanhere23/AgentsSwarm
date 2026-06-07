"""
Blackboard — Shared In-Memory State Bus for one Swarm Run.

All agents read/write through this object; no direct coupling between agents required.
Keys are namespaced by agent role (e.g. 'planner.step_sequence').
"""
from typing import Any
from threading import Lock


class Blackboard:
    """
    Thread-safe shared in-memory state bus for one swarm run.
    All agents read/write through this object; no direct coupling required.
    Keys are namespaced by agent role (e.g. 'planner.step_sequence').
    """

    def __init__(self):
        self._state: dict[str, Any] = {}
        self._lock = Lock()

    def post(self, key: str, value: Any) -> None:
        """Write a value to the blackboard under the given namespaced key."""
        with self._lock:
            self._state[key] = value

    def read(self, key: str, default: Any = None) -> Any:
        """Read a value from the blackboard. Returns default if key missing."""
        with self._lock:
            return self._state.get(key, default)

    def snapshot(self) -> dict:
        """Return an immutable copy of the full state for checkpointing."""
        with self._lock:
            return dict(self._state)

    def clear(self) -> None:
        """Reset all state — called between retries or on run teardown."""
        with self._lock:
            self._state.clear()
