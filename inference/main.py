"""
ARCHON Inference API for Render
Flask-based API that serves the trained neural network model.

Deploy on Render: connect this repo, set environment variables.
Supports DEMO mode when no model is loaded.
"""

import os
import json
import random
import numpy as np
import torch
import torch.nn as nn
from flask import Flask, request, jsonify
from pathlib import Path

app = Flask(__name__)

MODEL_PATH = os.environ.get("MODEL_PATH", "archon_model.pt")
MODEL_PATHS = [
    "archon_model.pt",
    "/app/archon_model.pt",
    "/opt/render/project/procache/archon_model.pt",
]
DEVICE = torch.device("cpu")
# Default to demo mode while model loads
DEMO_MODE = os.environ.get("DEMO_MODE", "true").lower() == "true"

DEMO_RESPONSES = [
    "I am ARCHON, a semi-aware AI assistant. I can help answer questions from my knowledge base.",
    "As your AI assistant, I maintain memory of our conversation and user preferences.",
    "I'm designed to be helpful while being honest about my limitations. I don't have true consciousness.",
    "I can access internal documentation to answer your questions accurately.",
    "My core knowledge comes from the markdown documents I've been trained on.",
    "I remember our conversation and can build on previous context.",
    "I operate on serverless infrastructure, which keeps me lightweight and fast.",
]

class LSTMGenerator(nn.Module):
    def __init__(self, vocab_size, embedding_dim=128, hidden_dim=256, num_layers=2, dropout=0.2):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, num_layers,
                          batch_first=True, dropout=dropout if num_layers > 1 else 0)
        self.fc = nn.Linear(hidden_dim, vocab_size)
        self.vocab_size = vocab_size

    def forward(self, x, hidden=None):
        embedded = self.embedding(x)
        if hidden is None:
            output, hidden = self.lstm(embedded)
        else:
            output, hidden = self.lstm(embedded, hidden)
        logits = self.fc(output)
        return logits, hidden


class ModelRunner:
    def __init__(self, model_path):
        print(f"Loading model from {model_path}...")
        checkpoint = torch.load(model_path, map_location=DEVICE)

        config = checkpoint["config"]
        self.char_to_idx = checkpoint["char_to_idx"]
        self.idx_to_char = checkpoint["idx_to_char"]
        vocab_size = checkpoint["vocab_size"]

        self.model = LSTMGenerator(
            vocab_size,
            config["embedding_dim"],
            config["hidden_dim"],
            config["num_layers"]
        ).to(DEVICE)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

        self.vocab_size = vocab_size
        print(f"Model loaded! Vocab size: {vocab_size}")

    def encode(self, text):
        return [self.char_to_idx[c] for c in text if c in self.char_to_idx]

    def decode(self, indices):
        return "".join(self.idx_to_char.get(i, "") for i in indices)

    def generate(self, prompt, max_length=200, temperature=0.8, top_k=None):
        """Generate text from prompt."""
        self.model.eval()
        with torch.no_grad():
            input_indices = self.encode(prompt)
            if not input_indices:
                return "Error: No valid characters in prompt"

            generated_indices = input_indices.copy()
            hidden = None

            for _ in range(max_length):
                input_tensor = torch.tensor([generated_indices[-100:]]).to(DEVICE)

                logits, hidden = self.model(input_tensor, hidden)
                logits = logits[:, -1, :] / temperature

                if top_k:
                    top_k_vals = torch.topk(logits, top_k)
                    logits[logits < top_k_vals[0][-1]] = float("-inf")

                probs = torch.softmax(logits, dim=-1)
                next_idx = torch.multinomial(probs, 1).item()

                if next_idx == 0 or next_idx not in self.idx_to_char:
                    break

                generated_indices.append(next_idx)

                if self.idx_to_char.get(next_idx, "") == "\n" and len(generated_indices) > 50:
                    break

        return self.decode(generated_indices)


model_runner = None

# ===================== ROUTES =====================

@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status": "online", 
        "model": "loaded" if model_runner else "loading",
        "demo_mode": DEMO_MODE
    })


@app.route("/generate", methods=["POST"])
def generate():
    # Lazy load on first request
    global model_runner
    if model_runner is None and not DEMO_MODE:
        init_model()
    
    if model_runner:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        prompt = data.get("prompt", "")
        max_length = data.get("max_length", 200)
        temperature = data.get("temperature", 0.8)
        top_k = data.get("top_k", None)

        if not prompt:
            return jsonify({"error": "Missing 'prompt' field"}), 400

        try:
            output = model_runner.generate(
                prompt,
                max_length=max_length,
                temperature=temperature,
                top_k=top_k
            )
            return jsonify({"output": output, "prompt": prompt})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    if DEMO_MODE:
        data = request.get_json() or {}
        prompt = data.get("prompt", "Hello")
        response = random.choice(DEMO_RESPONSES)
        return jsonify({
            "output": response,
            "prompt": prompt,
            "mode": "demo"
        })

    return jsonify({"error": "Model not loaded and demo mode disabled"}), 503


# ===================== INIT =====================

# Don't load model at startup - too slow for serverless
model_runner = None

def init_model():
    global model_runner
    if model_runner:
        return  # Already loaded

    model_url = os.environ.get("MODEL_URL")

    for path_cand in MODEL_PATHS:
        model_path = Path(path_cand)
        print(f"Checking for model at: {path_cand}")
        if model_path.exists():
            try:
                model_runner = ModelRunner(str(model_path))
                print(f"Model loaded from {path_cand}!")
                return
            except Exception as e:
                print(f"Load error from {path_cand}: {e}")

    if model_url:
        import urllib.request
        print(f"Downloading model from: {model_url}")
        try:
            urllib.request.urlretrieve(model_url, "archon_model.pt")
            if Path("archon_model.pt").exists():
                model_runner = ModelRunner("archon_model.pt")
                print("Model loaded from URL!")
                return
        except Exception as e:
            print(f"Download failed: {e}")

    print("Demo mode - no model")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)