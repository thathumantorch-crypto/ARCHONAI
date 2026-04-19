"""
ARCHON Model Export Script
Converts trained PyTorch model to ONNX for deployment.

Usage:
    python scripts/export.py path/to/archon_model.pt
"""

import sys
import torch
import torch.nn as nn
import numpy as np

def load_model(model_path):
    """Load trained model from checkpoint."""
    checkpoint = torch.load(model_path, map_location="cpu")
    config = checkpoint["config"]
    char_to_idx = checkpoint["char_to_idx"]
    idx_to_char = checkpoint["idx_to_char"]
    vocab_size = checkpoint["vocab_size"]
    return config, char_to_idx, idx_to_char, vocab_size

def export_to_onnx(model, output_path, vocab_size, seq_length=1):
    """Export model to ONNX format for inference."""
    dummy_input = torch.randint(0, vocab_size, (1, seq_length))
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch", 1: "sequence"},
            "output": {0: "batch", 1: "sequence", 2: "vocab"}
        },
        opset_version=14
    )
    print(f"Model exported to {output_path}")

def export_to_tflite(model, output_path):
    """Export to TensorFlow Lite (requires conversion pipeline)."""
    import subprocess
    result = subprocess.run([
        "python", "-c",
        "import torch; print(torch.__version__)"
    ], capture_output=True, text=True)
    print("Note: TF Lite export requires ONNX -> TF -> TFLite pipeline")
    print(f"Export to ONNX: python scripts/export.py --onnx model.onnx")
    print(f"Then use: python -m onnx_tf.backend prepare model.onnx --outputmodel.tflite")

def export_model_metadata(model_path, output_json):
    """Export model metadata as JSON for inference server."""
    checkpoint = torch.load(model_path, map_location="cpu")
    metadata = {
        "vocab_size": checkpoint["vocab_size"],
        "char_to_idx": checkpoint["char_to_idx"],
        "idx_to_char": {str(k): v for k, v in checkpoint["idx_to_char"].items()},
        "config": checkpoint["config"]
    }
    with open(output_json, "w") as f:
        import json
        json.dump(metadata, f)
    print(f"Metadata saved to {output_json}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/export.py <model.pt> [--onnx] [--tflite]")
        print("Example: python scripts/export.py /content/archon_model.pt")
        return

    model_path = sys.argv[1]

    print(f"Loading model from {model_path}...")
    config, char_to_idx, idx_to_char, vocab_size = load_model(model_path)

    print(f"Model config: {config}")

    export_model_metadata(model_path, "model_metadata.json")
    print("\nMetadata exported! Copy model.pt and model_metadata.json to Render.")

if __name__ == "__main__":
    main()