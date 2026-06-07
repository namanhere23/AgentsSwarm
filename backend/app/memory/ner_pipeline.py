# STUB-FILL — Implemented by: workstream/2a-memory-system
import spacy
from backend.app.core.logging import get_logger

logger = get_logger("ner_pipeline")

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("en_core_web_sm not found, using blank model")
    nlp = spacy.blank("en")


def extract_entities(text: str) -> list[dict]:
    """Parse text and extract typed entities (PERSON, ORG, DATE, LOC, TOPIC)."""
    doc = nlp(text)
    entities = []

    # 1. Map spaCy standard entities
    for ent in doc.ents:
        etype = ent.label_
        if etype in ["GPE", "LOC"]:
            etype = "LOC"
        elif etype not in ["PERSON", "ORG", "DATE"]:
            continue
        entities.append({"entity_type": etype, "entity_text": ent.text.strip()})

    # 2. Extract TOPIC (nouns and noun phrases that aren't recognized as specific entities)
    seen_texts = {e["entity_text"].lower() for e in entities}
    for chunk in doc.noun_chunks:
        chunk_text = chunk.text.strip()
        if chunk_text.lower() not in seen_texts and len(chunk_text.split()) <= 3:
            entities.append({"entity_type": "TOPIC", "entity_text": chunk_text})
            seen_texts.add(chunk_text.lower())

    return entities
