from .w9b_mapper.mapper import map_question
from .w9b_mapper.errors import UnsupportedQueryError  # noqa: F401

def wrap_kg_query(question: str):
    """Map a natural-language question to (cypher, params).

    Inputs:
        question — natural-language question (non-empty, <= 500 chars).
    Returns:
        Tuple (cypher: str, params: dict) suitable for `session.run`.
    Raises:
        UnsupportedQueryError — if the question does not match any
        supported pattern. The path operation converts this to 422.
    """
    return map_question(question)