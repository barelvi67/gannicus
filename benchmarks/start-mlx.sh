#!/bin/bash

# Start MLX Server for Gannicus
# This script starts MLX server with visible output so you can see progress

set -e

echo "🍎 Starting MLX Server for Gannicus"
echo "===================================="
echo ""
echo "Model: mlx-community/Llama-3.2-3B-Instruct"
echo "Port: 8080"
echo ""
echo "⚠️  First time setup:"
echo "   - Model will download (~4-5 GB)"
echo "   - This may take 5-10 minutes"
echo "   - Server will start automatically when ready"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "Starting server..."
echo ""

python3 -m mlx_lm server \
  --model mlx-community/Llama-3.2-3B-Instruct \
  --port 8080

