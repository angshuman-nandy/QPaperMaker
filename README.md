---
title: AI QPaperMaker
emoji: 📝
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# AI QPaperMaker

Upload photos of textbook pages and generate customized PDF question papers using AI.

## Features
- OCR textbook pages with GPT-4o Vision (parallel processing)
- Semantic chunking + ChromaDB vector store for RAG
- 3-agent CrewAI pipeline to design and format questions
- Configurable difficulty, question types, marks, and time
- PDF download with optional answer key

## Setup (HuggingFace Spaces)

Set the following secrets in your Space settings:

| Secret | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |
| `JWT_SECRET` | Any random string for signing tokens |
| `PORT` | `7860` |
| `AI_PIPELINE_URL` | `http://localhost:8000` |
| `DATA_DIR` | `/data` |

Enable **Persistent Storage** in Space settings to retain uploaded books and generated papers across restarts.
