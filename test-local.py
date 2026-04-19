#!/usr/bin/env python3
"""
Local test script for ARCHON inference.
Tests the Flask API locally without deploying.
"""

import json
import subprocess
import sys
import time
import requests

def test_demo_mode():
    """Test the demo mode (no model required)."""
    print("Testing demo mode...")

    response = requests.post("http://localhost:5000/generate", json={
        "prompt": "Hello, who are you?",
        "max_length": 100
    })

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Demo mode working")
        print(f"  Response: {data.get('output', '')[:100]}...")
        return True
    else:
        print(f"✗ Demo mode failed: {response.status_code}")
        return False

def test_health():
    """Test health endpoint."""
    print("Testing health endpoint...")

    try:
        response = requests.get("http://localhost:5000/")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Health check: {data}")
            return True
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return False

def start_server():
    """Start the Flask server."""
    print("Starting Flask server...")
    proc = subprocess.Popen(
        [sys.executable, "-m", "flask", "--app", "inference.main:app", "run", "--port", "5000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    time.sleep(3)
    return proc

def main():
    proc = None
    try:
        proc = start_server()

        if test_health() and test_demo_mode():
            print("\n✓ All tests passed!")
        else:
            print("\n✗ Some tests failed")
            sys.exit(1)
    finally:
        if proc:
            print("\nStopping server...")
            proc.terminate()
            proc.wait()

if __name__ == "__main__":
    main()