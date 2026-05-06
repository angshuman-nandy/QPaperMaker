import os
import chromadb
from .embeddings import get_embeddings

DATA_DIR = os.environ.get("DATA_DIR", "./local_data")
CHROMA_DIR = os.path.join(DATA_DIR, "chromadb")

# One persistent ChromaDB client shared across the app
_client = chromadb.PersistentClient(path=CHROMA_DIR)


def _collection_name(book_id: str) -> str:
    return f"book_{book_id}"


def store_chunks(book_id: str, chunks: list[str]) -> int:
    """Embed and store text chunks for a book. Returns the number stored."""
    collection = _client.get_or_create_collection(_collection_name(book_id))

    embeddings = get_embeddings(chunks)
    ids = [f"{book_id}_chunk_{i}" for i in range(len(chunks))]

    collection.add(documents=chunks, embeddings=embeddings, ids=ids)
    return len(chunks)


def search_chunks(book_id: str, query: str, top_k: int = 10) -> list[str]:
    """Return the top-k most relevant chunks for a query."""
    try:
        collection = _client.get_collection(_collection_name(book_id))
    except Exception:
        return []

    from .embeddings import get_embedding
    query_embedding = get_embedding(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
    )
    return results["documents"][0] if results["documents"] else []


def delete_collection(book_id: str) -> None:
    """Remove all stored data for a book."""
    try:
        _client.delete_collection(_collection_name(book_id))
    except Exception:
        pass  # Collection may not exist — that is fine
