# MIT License
# Copyright (c) 2026 Angshuman Nandy

import os
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

EMBEDDING_MODEL = "text-embedding-3-small"


def get_embedding(text: str) -> list[float]:
    """Return the embedding vector for a single text string."""
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=text)
    return response.data[0].embedding


def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Return embedding vectors for a list of texts in one API call."""
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    # The API returns embeddings in the same order as the input
    return [item.embedding for item in response.data]
