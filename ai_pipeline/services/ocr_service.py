import os
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM_PROMPT = (
    "You are an OCR assistant. Extract all text from the provided textbook page image. "
    "Preserve headings, paragraphs, numbered lists, and bullet points. "
    "Do not add any commentary — output only the extracted text."
)


async def extract_text_from_image(image_data: str, mimetype: str) -> str:
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": SYSTEM_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mimetype};base64,{image_data}",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
        max_tokens=4096,
    )
    return response.choices[0].message.content.strip()
