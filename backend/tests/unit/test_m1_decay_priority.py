from backend.app.services.priority_service import calculate_priority


def test_priority_score_calculation():
    # Test formula outputs
    score = calculate_priority(
        recency=1.0, relevance=0.8, importance=0.5, urgency=1.0, frequency=0.3
    )
    expected = (0.22 * 1.0) + (0.27 * 0.8) + (0.21 * 0.5) + (0.20 * 1.0) + (0.10 * 0.3)
    assert abs(score - expected) < 1e-6


def test_priority_score_clamping():
    assert calculate_priority(2.0, 2.0, 2.0, 2.0, 2.0) == 1.0
    assert calculate_priority(-1.0, -1.0, -1.0, -1.0, -1.0) == 0.0


def test_ner_pipeline_extraction():
    from backend.app.memory.ner_pipeline import extract_entities

    res = extract_entities(
        "Schedule a budget review with John Doe from Google next Monday."
    )

    # Assert entity tags
    texts = [e["entity_text"] for e in res]

    assert "John Doe" in texts
    assert "Google" in texts
