# M7 Multimodal — Developer Guide

## Overview
M7 adds multimodal intelligence to Genesis. It accepts images, audio recordings, and
documents, routes them to specialized analyzers, and returns structured AI-generated insights.

## Supported Inputs

| Type | MIME Types | Backend |
|------|-----------|---------|
| Images | image/jpeg, image/png, image/webp, image/gif | Google Gemini / OpenAI GPT-4o / Claude |
| Audio | audio/mpeg, audio/wav, audio/mp4, audio/ogg | OpenAI Whisper / Local Whisper |
| PDF | application/pdf | pypdf + text extraction |
| Word | application/vnd.openxmlformats... | python-docx |
| Text/Markdown | text/plain, text/markdown | Direct UTF-8 read |

## API Usage

### Upload a file
```http
POST /api/v1/multimodal/analyze
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<binary>
prompt=What is shown in this image?
```

Response:
```json
{
  "type": "image",
  "media_type": "image/jpeg",
  "result": "The image shows a flowchart depicting...",
  "summary": "Flowchart depicting a software architecture",
  "tokens_used": 142
}
```

### Base64 upload (frontend)
```http
POST /api/v1/multimodal/analyze-b64
Authorization: Bearer <token>
Content-Type: application/json

{
  "data": "<base64string>",
  "media_type": "image/png",
  "filename": "screenshot.png",
  "prompt": "Describe any UI elements visible"
}
```

## Configuration

```env
VISION_PROVIDER=google       # google | openai | anthropic
AUDIO_PROVIDER=openai        # openai | local
MAX_UPLOAD_SIZE_MB=20
```

## Python SDK

```python
from modules.m7_multimodal import MultimodalProcessor

processor = MultimodalProcessor()

# Analyze image
with open("photo.jpg", "rb") as f:
    result = await processor.process(
        data=f.read(),
        media_type="image/jpeg",
        prompt="What objects are visible?"
    )

print(result["result"])   # AI description
print(result["summary"])  # Short summary
```

## Architecture

```
MultimodalProcessor
├── VisionAnalyzer      → Google Gemini / OpenAI GPT-4o / Anthropic Claude
├── AudioTranscriber    → OpenAI Whisper / local openai-whisper
└── DocumentExtractor   → pypdf / python-docx / plain text
```

## Error Handling
All analyzers return a consistent schema even on failure:
```json
{
  "type": "image",
  "result": "Vision analysis unavailable: <error>",
  "summary": "",
  "tokens_used": 0
}
```
