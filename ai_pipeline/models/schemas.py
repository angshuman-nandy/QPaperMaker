from pydantic import BaseModel
from typing import Optional


class ImageInput(BaseModel):
    filename: str
    data: str       # base64-encoded image
    mimetype: str


class PageText(BaseModel):
    page: int
    text: str


class OCRRequest(BaseModel):
    images: list[ImageInput]


class OCRResponse(BaseModel):
    pages: list[PageText]


class IngestRequest(BaseModel):
    book_id: str
    pages: list[PageText]


class IngestResponse(BaseModel):
    chunks_stored: int


class SearchRequest(BaseModel):
    book_id: str
    query: str
    top_k: int = 10


class SearchResponse(BaseModel):
    chunks: list[str]


class DifficultyConfig(BaseModel):
    easy_pct: int = 30
    medium_pct: int = 50
    hard_pct: int = 20


class QuestionTypeConfig(BaseModel):
    enabled: bool = True
    count: int
    marks_each: int


class PaperParams(BaseModel):
    total_marks: int
    time_minutes: int
    difficulty: DifficultyConfig
    question_types: dict[str, QuestionTypeConfig]
    topic_focus: list[str] = []
    include_answer_key: bool = True


class GenerateRequest(BaseModel):
    paper_id: str
    book_id: str
    title: str
    params: PaperParams
    output_path: str
    key_output_path: Optional[str] = None


class GenerateResponse(BaseModel):
    paper_id: str
    file_path: str
    key_file_path: Optional[str] = None
    sections: list[dict] = []
