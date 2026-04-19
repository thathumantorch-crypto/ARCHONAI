# Hosted Services

## ARCHON Architecture

### Cloudflare Worker
- Serverless API at archon.thathumantorch.workers.dev
- Handles HTTP requests and routing
- Uses KV for storage

### Render Inference
- Server at archonai-jxpe.onrender.com
- Flask-based Python API
- Handles neural network inference

### GitHub Repository
- https://github.com/thathumantorch-crypto/ARCHONAI
- Contains all source code
- Continuous deployment enabled

## API Endpoints

### POST /chat
Send messages to ARCHON
```json
{"userId": "user123", "messages": [{"role": "user", "content": "Hello"}]}
```

### POST /generate
Direct inference (Render only)
```json
{"prompt": "Hello", "max_length": 200}
```

## Environment Variables
- INFERENCE_URL: Render endpoint
- SEARCH_API_KEY: Web search (optional)
- VECTOR_DB_URL: Vector database (optional)