"""
ARCHON Training Script for Google Colab
Trains a custom neural network on markdown documents.

Usage:
1. Upload markdown files from data/docs/ to Google Drive/Colab
2. Run this script in Colab with GPU runtime
3. Download trained model for deployment
"""

import os
import json
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from pathlib import Path
from collections import Counter

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {DEVICE}")

# ===================== DATA LOADING =====================

def load_markdown_files(data_dir: str = "/content/data/docs"):
    """Load all markdown files from directory."""
    data_path = Path(data_dir)
    if not data_path.exists():
        print(f"Directory {data_path} not found, using sample data")
        return ["# ARCHON\nARCHON is a semi-aware AI assistant.\nIt remembers user preferences.\n"]

    texts = []
    for md_file in data_path.glob("*.md"):
        content = md_file.read_text(encoding="utf-8")
        texts.append(content)
    return texts

def tokenize(texts):
    """Simple character-level tokenization."""
    combined = " ".join(texts)
    chars = sorted(set(combined))
    char_to_idx = {c: i for i, c in enumerate(chars)}
    idx_to_char = {i: c for c, i in char_to_idx.items()}
    return combined, chars, char_to_idx, idx_to_char

def encode(text, char_to_idx):
    """Encode text to indices."""
    return [char_to_idx[c] for c in text if c in char_to_idx]

def decode(indices, idx_to_char):
    """Decode indices to text."""
    return "".join(idx_to_char.get(i, "") for i in indices)

# ===================== DATASET =====================

class TextDataset(Dataset):
    def __init__(self, text_indices, seq_length=100):
        self.text_indices = text_indices
        self.seq_length = seq_length

    def __len__(self):
        return len(self.text_indices) - self.seq_length

    def __getitem__(self, idx):
        x = self.text_indices[idx:idx + self.seq_length]
        y = self.text_indices[idx + 1:idx + self.seq_length + 1]
        return torch.tensor(x), torch.tensor(y)

# ===================== MODEL =====================

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

    def generate(self, start_text, char_to_idx, idx_to_char, max_length=200, temperature=1.0):
        """Generate text from starting sequence."""
        self.eval()
        with torch.no_grad():
            input_seq = torch.tensor([encode(start_text, char_to_idx)]).to(DEVICE)
            generated = list(start_text)

            hidden = None
            for _ in range(max_length):
                logits, hidden = self.forward(input_seq, hidden)
                logits = logits[:, -1, :] / temperature
                probs = torch.softmax(logits, dim=-1)
                next_char_idx = torch.multinomial(probs, 1).item()
                next_char = idx_to_char.get(next_char_idx, "")

                if next_char == "":
                    break
                generated.append(next_char)
                input_seq = torch.tensor([[next_char_idx]]).to(DEVICE)

        return "".join(generated)

# ===================== TRAINING =====================

def train_model(model, dataloader, epochs=10, lr=0.001):
    """Train the model."""
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss()

    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for x, y in dataloader:
            x, y = x.to(DEVICE), y.to(DEVICE)
            optimizer.zero_grad()

            logits, _ = model(x)
            loss = criterion(logits.view(-1, model.vocab_size), y.view(-1))

            loss.backward()
            optimizer.step()
            total_loss += loss.item()

        avg_loss = total_loss / len(dataloader)
        print(f"Epoch {epoch + 1}/{epochs}, Loss: {avg_loss:.4f}")

    return model

# ===================== MAIN =====================

def main():
    SEQ_LENGTH = 100
    EMBEDDING_DIM = 128
    HIDDEN_DIM = 256
    NUM_LAYERS = 2
    EPOCHS = 20
    BATCH_SIZE = 64

    print("Loading markdown data...")
    texts = load_markdown_files()

    if not texts:
        print("No training data found!")
        return

    print(f"Loaded {len(texts)} documents")

    print("Tokenizing...")
    combined, chars, char_to_idx, idx_to_char = tokenize(texts)
    vocab_size = len(chars)
    print(f"Vocabulary size: {vocab_size}")

    print("Encoding...")
    text_indices = encode(combined, char_to_idx)

    print("Creating dataset...")
    dataset = TextDataset(text_indices, SEQ_LENGTH)
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)

    print("Building model...")
    model = LSTMGenerator(vocab_size, EMBEDDING_DIM, HIDDEN_DIM, NUM_LAYERS).to(DEVICE)
    print(f"Parameters: {sum(p.numel() for p in model.parameters()):,}")

    print("Training...")
    model = train_model(model, dataloader, epochs=EPOCHS)

    print("\nGenerating sample output...")
    start_seq = "# ARCHON"
    generated = model.generate(start_seq, char_to_idx, idx_to_char, max_length=200)
    print(f"\nStart: {start_seq}")
    print(f"Generated:\n{generated[:500]}")

    print("\nSaving model...")
    save_path = "/content/archon_model.pt"
    torch.save({
        "model_state_dict": model.state_dict(),
        "char_to_idx": char_to_idx,
        "idx_to_char": idx_to_char,
        "vocab_size": vocab_size,
        "config": {
            "embedding_dim": EMBEDDING_DIM,
            "hidden_dim": HIDDEN_DIM,
            "num_layers": NUM_LAYERS,
            "seq_length": SEQ_LENGTH
        }
    }, save_path)
    print(f"Model saved to {save_path}")

    print("\nDownload model file from Colab to use in inference!")

if __name__ == "__main__":
    main()