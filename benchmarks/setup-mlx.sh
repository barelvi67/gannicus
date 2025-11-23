#!/bin/bash

# MLX Setup Script for macOS (Apple Silicon)
# This script installs and sets up MLX for Gannicus

set -e

echo "🍎 MLX Setup for macOS (Apple Silicon)"
echo "========================================"
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    echo "   Install Python 3: brew install python3"
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"
echo ""

# Check if pip is available
if ! python3 -m pip --version &> /dev/null; then
    echo "❌ pip is not available"
    echo "   Install pip: python3 -m ensurepip --upgrade"
    exit 1
fi

echo "✅ pip found"
echo ""

# Install MLX
echo "📦 Installing mlx-lm..."
python3 -m pip install mlx-lm

echo ""
echo "✅ MLX installed successfully!"
echo ""
echo "🚀 To start MLX server:"
echo "   python3 -m mlx_lm server --model mlx-community/Llama-3.2-3B-Instruct --port 8080"
echo ""
echo "⏳ First time setup:"
echo "   - Model will download automatically (~4-5 GB)"
echo "   - Server will start on http://localhost:8080"
echo "   - This may take 5-10 minutes on first run"
echo ""
echo "💡 After starting, run: bun benchmarks/quick-test.ts"

