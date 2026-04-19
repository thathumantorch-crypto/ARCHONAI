# ARCHON – Serverless Semi‑Aware AI

A custom neural network-powered assistant using serverless infrastructure.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Google Colab   │────▶│  archon_model.pt  │────▶│  Render (free)  │
│  train.py       │     │  (trained model)  │     │  inference API  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  Cloudflare     │
                                                │  Worker        │
                                                └─────────────────┘
```

## Quick Start

### Step 1: Deploy Inference API to Render

1. Go to [Render.com](https://render.com) → **New +** → **Web Service**
2. Connect your GitHub repository containing the `inference/` folder
3. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:5000 main:app`
   - **Environment**: Python 3.11
4. Click **Create Web Service**
5. Copy your service URL (e.g., `https://archon-api.onrender.com`)

### Step 2: Configure Cloudflare Worker

```bash
cd worker
wrangler secret put INFERENCE_URL
# Enter your Render URL: https://archon-api.onrender.com/generate
```

### Step 3: Test Locally (Optional)

```bash
# First install Python dependencies
pip install flask requests torch numpy

# Test the API
python test-local.py

# Or manually:
python -m flask --app inference.main:app run --port 5000
```

### Step 4: Run Worker Locally

```bash
npm install
npm run dev
```

Test with:
```bash
curl -X POST http://localhost:8787/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

## Training Your Custom Model

### Using Google Colab

1. Upload `scripts/colab_train.ipynb` to Colab
2. Run with GPU enabled
3. Upload your markdown files from `data/docs/`
4. Download `archon_model.pt`

### Using the Python Script Directly

```bash
# In Colab with GPU
!pip install torch numpy

# Upload files or mount Drive
from google.colab import files
uploaded = files.upload()

# Run training
!python train.py

# Download the model
files.download("archon_model.pt")
```

### Deploying Trained Model to Render

1. Upload `archon_model.pt` to Render:
   - Using Render CLI: `render-cli files upload archon_model.pt`
   - Or mount from Dropbox/Google Drive
2. Set environment variable `MODEL_PATH=archon_model.pt`
3. Set `DEMO_MODE=false`

## API Reference

### Inference API (Render)

**Endpoint**: `POST /generate`

```json
{
  "prompt": "User message",
  "max_length": 200,
  "temperature": 0.8,
  "top_k": null
}
```

**Response**:
```json
{
  "output": "Generated text...",
  "prompt": "User message",
  "mode": "demo" or "model"
}
```

### Worker Chat API (Cloudflare)

**Endpoint**: `POST /chat`

```json
{
  "userId": "user-123",
  "messages": [
    {"role": "user", "content": "Hello ARCHON"}
  ]
}
```

**Response**:
```json
{
  "reply": "ARCHON's response..."
}
```

## Files Overview

| File | Purpose |
|------|---------|
| `worker/src/index.ts` | Main Worker handler |
| `worker/src/llm.ts` | Inference API calls |
| `worker/src/memory.ts` | KV-based conversation memory |
| `worker/src/rag.ts` | Vector search for docs |
| `worker/src/web_search.ts` | Optional web search |
| `scripts/train.py` | Colab training script |
| `scripts/colab_train.ipynb` | Colab notebook |
| `inference/main.py` | Flask API for Render |
| `inference/Dockerfile` | Container deployment |
| `web/index.html` | Web UI |

## Environment Variables

### Cloudflare Worker

| Variable | Description |
|----------|-------------|
| `INFERENCE_URL` | Your Render inference endpoint |
| `SEARCH_API_KEY` | Optional web search API key |
| `VECTOR_DB_URL` | Optional vector database |

### Render Service

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_PATH` | `archon_model.pt` | Path to trained model |
| `DEMO_MODE` | `true` | Use demo responses |
| `PORT` | `5000` | Server port |

## How It Works

1. **User sends message** → Cloudflare Worker
2. **Worker retrieves** → User profile, conversation memory, relevant docs
3. **Worker calls** → Render inference API
4. **Neural network generates** → Response (or demo fallback)
5. **Worker saves** → Memory and responds to user