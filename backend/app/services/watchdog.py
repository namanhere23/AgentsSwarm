# NEW — Implemented by: workstream/3a-crew-execution-engine
"""
Swarm Watchdog — Formal Termination Guarantee
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Provides a hard, time-based termination guarantee independent
of retry counters. As the deadline approaches, progressively 
reduces token budgets to force faster, more concise responses.
"""

import time
import logging

logger = logging.getLogger("SwarmWatchdog")


class SwarmTimeoutError(Exception):
    pass


class SwarmWatchdog:
    def __init__(self, max_wall_time_seconds: int = 300):
        self.max_wall_time_seconds = max_wall_time_seconds
        self.start_time = time.time()
        self.deadline = self.start_time + max_wall_time_seconds
        self.completed_tasks = 0
        self.total_tasks = 0
        self._warned_75 = False
        self._warned_90 = False

    def check(self) -> bool:
        now = time.time()
        elapsed = now - self.start_time
        ratio = elapsed / self.max_wall_time_seconds

        if ratio >= 0.90 and not self._warned_90:
            self._warned_90 = True
            logger.warning(
                f"Watchdog: 90% time used ({elapsed:.0f}s). {(self.deadline - now):.1f}s remaining."
            )
        elif ratio >= 0.75 and not self._warned_75:
            self._warned_75 = True
            logger.info(
                f"Watchdog: 75% time used. {(self.deadline - now):.1f}s remaining."
            )

        if now > self.deadline:
            raise SwarmTimeoutError(
                f"Swarm exceeded {self.max_wall_time_seconds}s wall time. Total elapsed: {elapsed:.1f}s."
            )
        return True

    def get_remaining_budget_tokens(self, base_budget: int) -> int:
        ratio = (time.time() - self.start_time) / self.max_wall_time_seconds
        if ratio >= 0.90:
            scale = 0.30
        elif ratio >= 0.75:
            scale = 0.60
        elif ratio >= 0.50:
            scale = 0.80
        else:
            scale = 1.0
        return max(200, int(base_budget * scale))
