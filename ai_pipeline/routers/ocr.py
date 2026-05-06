import asyncio
from fastapi import APIRouter, HTTPException
from models.schemas import OCRRequest, OCRResponse, PageText
from services.ocr_service import extract_text_from_image

router = APIRouter()


@router.post("/ocr", response_model=OCRResponse)
async def ocr_images(request: OCRRequest):
    if not request.images:
        raise HTTPException(status_code=400, detail="No images provided.")

    texts = await asyncio.gather(*[
        extract_text_from_image(image.data, image.mimetype)
        for image in request.images
    ])

    pages = [PageText(page=i + 1, text=text) for i, text in enumerate(texts)]
    return OCRResponse(pages=pages)
