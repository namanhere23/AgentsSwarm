"""
SemanticQAScorer — Semantic alignment scorer between generated code/output and plan intent.

Uses sentence-transformers cosine similarity for production.
Hard-fails below threshold (default 45/100).
"""
from backend.app.core.logging import get_logger

logger = get_logger("semantic_scorer")

DEFAULT_THRESHOLD = 45  # Minimum alignment score to pass QA


class SemanticQAScorer:
    """
    Sentence-transformer based semantic alignment scorer.
    Produces a 0-100 similarity score between generated output and the plan intent.
    Runs as Phase 1.5 in the QA pipeline (after deterministic checks, before LLM Critic).
    Hard-fails below threshold (default 45).
    """

    def __init__(self, threshold: int = DEFAULT_THRESHOLD):
        self.threshold = threshold
        self._model = None

    def _get_model(self):
        """Lazy-load SentenceTransformer to avoid slowing down startup."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            except ImportError:
                logger.warning(
                    "sentence-transformers not installed. SemanticQAScorer will use fallback."
                )
        return self._model

    def score_alignment(self, code: str, intent: str) -> int:
        """
        Return integer 0-100 alignment score between output and intent.
        Uses cosine similarity from sentence-transformers embeddings.
        Falls back to keyword overlap if model unavailable.
        """
        model = self._get_model()

        if model is not None:
            try:
                import numpy as np
                embeddings = model.encode([code, intent])
                # Cosine similarity
                a, b = embeddings[0], embeddings[1]
                cos_sim = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
                # Scale from [-1, 1] to [0, 100]
                score = int((cos_sim + 1) / 2 * 100)
                logger.info(f"SemanticQAScorer: cos_sim={cos_sim:.3f} → score={score}")
                return score
            except Exception as e:
                logger.warning(f"SemanticQAScorer embedding failed: {e}. Using keyword fallback.")

        # Keyword overlap fallback
        code_words = set(code.lower().split())
        intent_words = set(intent.lower().split())
        if not intent_words:
            return 50  # Neutral score if no intent provided
        overlap = len(code_words & intent_words) / len(intent_words)
        score = int(overlap * 100)
        logger.info(f"SemanticQAScorer (keyword fallback): score={score}")
        return score

    def passes(self, code: str, intent: str) -> tuple[bool, int]:
        """Return (passes_threshold, score) tuple."""
        score = self.score_alignment(code, intent)
        return score >= self.threshold, score

