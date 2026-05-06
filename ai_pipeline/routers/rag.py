import re
import numpy as np
from fastapi import APIRouter, HTTPException
from models.schemas import IngestRequest, IngestResponse, SearchRequest, SearchResponse
from services.vector_store import store_chunks, search_chunks, delete_collection
from services.embeddings import get_embeddings

router = APIRouter()

# Semantic chunking config
_SIMILARITY_THRESHOLD = 0.35   # cosine sim below this triggers a chunk split
_MIN_CHUNK_CHARS = 150
_MAX_CHUNK_CHARS = 1200


def _split_sentences(text: str) -> list[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]


def _cosine_sim(a: list[float], b: list[float]) -> float:
    # text-embedding-3-small returns unit vectors — dot product equals cosine similarity
    return float(np.dot(a, b))


def split_into_semantic_chunks(text: str) -> list[str]:
    """Split text into semantically coherent chunks using sentence-level embeddings."""
    sentences = _split_sentences(text)
    if not sentences:
        return []
    if len(sentences) <= 2:
        return [text.strip()]

    embeddings = get_embeddings(sentences)

    chunks: list[str] = []
    current_sents = [sentences[0]]
    current_len = len(sentences[0])

    for i in range(1, len(sentences)):
        sent = sentences[i]
        sim = _cosine_sim(embeddings[i - 1], embeddings[i])
        would_exceed = current_len + len(sent) + 1 > _MAX_CHUNK_CHARS
        semantic_break = sim < _SIMILARITY_THRESHOLD and current_len >= _MIN_CHUNK_CHARS

        if would_exceed or semantic_break:
            chunks.append(" ".join(current_sents))
            current_sents = [sent]
            current_len = len(sent)
        else:
            current_sents.append(sent)
            current_len += len(sent) + 1

    if current_sents:
        chunks.append(" ".join(current_sents))

    return [c for c in chunks if c.strip()]


@router.post("/ingest", response_model=IngestResponse)
async def ingest_pages(request: IngestRequest):
    if not request.pages:
        raise HTTPException(status_code=400, detail="No pages provided.")

    all_chunks = []
    for page in request.pages:
        all_chunks.extend(split_into_semantic_chunks(page.text))

    if not all_chunks:
        raise HTTPException(status_code=400, detail="No text content found in the pages.")

    stored = store_chunks(request.book_id, all_chunks)
    return IngestResponse(chunks_stored=stored)


@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    chunks = search_chunks(request.book_id, request.query, request.top_k)
    return SearchResponse(chunks=chunks)


@router.delete("/books/{book_id}")
async def delete_book_data(book_id: str):
    delete_collection(book_id)
    return {"message": "Book data deleted."}
