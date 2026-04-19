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
DEVICE = torch.device("cpu")
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
    return jsonify({"status": "online", "model": "loaded" if model_runner else "loading"})


@app.route("/generate", methods=["POST"])
def generate():
    if model_runner and not DEMO_MODE:
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

def init_model():
    global model_runner
    model_path = Path(MODEL_PATH)
    if model_path.exists():
        model_runner = ModelRunner(str(model_path))
    else:
        print(f"Warning: Model file not found at {model_path}")
        print("Set MODEL_PATH environment variable")


if __name__ == "__main__":
    init_model()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)