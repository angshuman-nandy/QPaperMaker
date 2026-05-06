# MIT License
# Copyright (c) 2026 Angshuman Nandy

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import ocr, rag, generate

app = FastAPI(title="QPaperMaker AI Pipeline")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ocr.router)
app.include_router(rag.router)
app.include_router(generate.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
