# Programming Knowledge Base

## JavaScript/TypeScript

### Cloudflare Workers
```typescript
// Basic worker structure
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response("Hello");
  }
};

// Environment types
interface Env {
  KV_NAMESPACE: KVNamespace;
  API_KEY: string;
}

// KV operations
await env.KV_NAMESPACE.put(key, value);
const value = await env.KV_NAMESPACE.get(key);
await env.KV_NAMESPACE.delete(key);
```

### Async/Await Patterns
```typescript
// Parallel requests
const results = await Promise.all([
  fetch(url1),
  fetch(url2)
]);

// Sequential with error handling
try {
  const data = await riskyOperation();
} catch (err) {
  return new Response("Error: " + err.message);
}
```

## Python

### Flask API
```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/generate", methods=["POST"])
def generate():
    data = request.get_json()
    prompt = data.get("prompt", "")
    # Process
    return jsonify({"output": response})
```

### PyTorch Neural Network
```python
import torch
import torch.nn as nn

class LSTMGenerator(nn.Module):
    def __init__(self, vocab_size, hidden_dim):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, hidden_dim)
        self.lstm = nn.LSTM(hidden_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, vocab_size)
    
    def forward(self, x):
        embedded = self.embedding(x)
        output, _ = self.lstm(embedded)
        return self.fc(output)
```

### Training Loop
```python
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

for epoch in range(epochs):
    for batch in dataloader:
        optimizer.zero_grad()
        loss = criterion(model(batch), targets)
        loss.backward()
        optimizer.step()
```

## API Design

### REST Principles
- GET - Retrieve data
- POST - Create new resources
- PUT - Update/Replace
- DELETE - Remove

### JSON Response
```json
{
  "status": "success",
  "data": {
    "id": "123",
    "content": "Hello"
  },
  "error": null
}
```

## Git Workflow

### Basic Commands
```bash
git add .
git commit -m "Description"
git push origin main
git pull origin main
git status
```

### Branching
```bash
git checkout -b new-feature
git checkout main
git merge new-feature
```

## Serverless Architecture

### Cloudflare Workers
- Run at edge (global distribution)
- No cold starts
- Free tier: 100K requests/day
- KV storage: 1GB free

### Render
- Container deployment
- Free tier available
- Sleeps after 15 min inactivity
- Python/Flask support

## Neural Networks

### LSTM Architecture
- Long Short-Term Memory cells
- Gate mechanisms (input, forget, output)
- Good for sequential data
- Character-level generation

### Training Data
- Markdown documents
- Tokenization by character
- Sliding window sequences
- Cross-entropy loss

### Hyperparameters
- embedding_dim: 128-512
- hidden_dim: 256-1024
- num_layers: 2-4
- sequence_length: 50-200
- learning_rate: 0.001
- epochs: 20-100

## Security

### Environment Variables
- Never commit secrets
- Use KV storage for sensitive data
- Render secrets via dashboard

### CORS Headers
```typescript
headers: {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
}
```