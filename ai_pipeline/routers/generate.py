from fastapi import APIRouter, HTTPException
from models.schemas import GenerateRequest, GenerateResponse
from services.vector_store import search_chunks
from services.pdf_generator import generate_pdf
from agents.crew import run_paper_generation

router = APIRouter()


def _build_search_query(params) -> str:
    """Build a search query from the topic focus or use a generic one."""
    if params.topic_focus:
        return " ".join(params.topic_focus)
    return "key concepts topics definitions examples"


@router.post("/generate", response_model=GenerateResponse)
async def generate_paper(request: GenerateRequest):
    # Step 1: Retrieve relevant content chunks from ChromaDB
    query = _build_search_query(request.params)
    chunks = search_chunks(request.book_id, query, top_k=20)

    if not chunks:
        raise HTTPException(
            status_code=404,
            detail="No content found for this book. Make sure it has been ingested first.",
        )

    # Step 2: Run the 4-agent CrewAI pipeline
    try:
        paper_data = run_paper_generation(
            title=request.title,
            content_chunks=chunks,
            params=request.params.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent pipeline failed: {str(e)}")

    sections = paper_data.get("sections", [])
    if not sections:
        raise HTTPException(status_code=500, detail="Agents did not produce any question sections.")

    # Step 3: Generate the question paper PDF
    generate_pdf(
        output_path=request.output_path,
        title=request.title,
        total_marks=request.params.total_marks,
        time_minutes=request.params.time_minutes,
        sections=sections,
        include_answers=False,
    )

    # Step 4: Generate the answer key PDF if requested
    key_path = None
    if request.params.include_answer_key and request.key_output_path:
        generate_pdf(
            output_path=request.key_output_path,
            title=request.title,
            total_marks=request.params.total_marks,
            time_minutes=request.params.time_minutes,
            sections=sections,
            include_answers=True,
        )
        key_path = request.key_output_path

    return GenerateResponse(
        paper_id=request.paper_id,
        file_path=request.output_path,
        key_file_path=key_path,
        sections=sections,
    )
