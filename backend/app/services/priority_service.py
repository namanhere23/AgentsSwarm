# STUB-FILL — Implemented by: workstream/2a-memory-system


def calculate_priority(
    recency: float,
    relevance: float,
    importance: float,
    urgency: float,
    frequency: float,
) -> float:
    """
    Enforces the priority score formula:
    score = (0.22 * recency) + (0.27 * relevance) + (0.21 * importance) + (0.20 * urgency) + (0.10 * frequency)
    Clamps the result between 0.0 and 1.0.
    """
    score = (
        (0.22 * recency)
        + (0.27 * relevance)
        + (0.21 * importance)
        + (0.20 * urgency)
        + (0.10 * frequency)
    )
    return max(0.0, min(1.0, score))
