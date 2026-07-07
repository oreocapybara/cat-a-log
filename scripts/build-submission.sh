#!/usr/bin/env bash
# build-submission.sh — Assembles the hackathon submission zip
# Structure:
#   README.md
#   source/        ← project code (no node_modules, .next, coverage, etc.)
#   documentation/ ← reports (AIKIDO_REPORT, project report, API, deployment)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/submission"
ZIP_NAME="Cat-A-Log-submission.zip"

# Clean previous build
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR/source" "$OUTPUT_DIR/documentation"

echo "📦 Building submission package..."

# ─── README at root ───────────────────────────────────────────────────────────
cp "$PROJECT_ROOT/README.md" "$OUTPUT_DIR/README.md"

# ─── documentation/ ───────────────────────────────────────────────────────────
# Main reports (top-level)
cp "$PROJECT_ROOT/docs/PROJECT_REPORT.md" "$OUTPUT_DIR/documentation/"
cp "$PROJECT_ROOT/docs/AIKIDO_REPORT.md" "$OUTPUT_DIR/documentation/"
cp "$PROJECT_ROOT/docs/API.md" "$OUTPUT_DIR/documentation/"
cp "$PROJECT_ROOT/docs/DEPLOYMENT.md" "$OUTPUT_DIR/documentation/"

# Copy CONTRIBUTING and PRODUCT docs if useful for judges
[ -f "$PROJECT_ROOT/CONTRIBUTING.md" ] && cp "$PROJECT_ROOT/CONTRIBUTING.md" "$OUTPUT_DIR/documentation/"
[ -f "$PROJECT_ROOT/PRODUCT.md" ] && cp "$PROJECT_ROOT/PRODUCT.md" "$OUTPUT_DIR/documentation/"

# Internal dev docs (judges can browse if curious)
mkdir -p "$OUTPUT_DIR/documentation/internal"
for f in DESIGN_SYSTEM.md SHAREABLE_CARDS_DESIGN.md TIER_VARIANTS_IMPLEMENTATION.md CARD_REDESIGN_GUIDE.md; do
  [ -f "$PROJECT_ROOT/docs/$f" ] && cp "$PROJECT_ROOT/docs/$f" "$OUTPUT_DIR/documentation/internal/"
done

# Plans & specs
if [ -d "$PROJECT_ROOT/docs/superpowers" ]; then
  cp -r "$PROJECT_ROOT/docs/superpowers" "$OUTPUT_DIR/documentation/internal/superpowers"
fi

# ─── source/ ──────────────────────────────────────────────────────────────────
# Use rsync to copy everything except excluded dirs/files
rsync -a --progress \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='coverage' \
  --exclude='build' \
  --exclude='out' \
  --exclude='.vercel' \
  --exclude='.env.local' \
  --exclude='.env' \
  --exclude='.env.*.local' \
  --exclude='*.tsbuildinfo' \
  --exclude='next-env.d.ts' \
  --exclude='.DS_Store' \
  --exclude='test-results' \
  --exclude='playwright-report' \
  --exclude='blob-report' \
  --exclude='e2e/.auth/user.json' \
  --exclude='.next/analyze' \
  --exclude='.superpowers' \
  --exclude='.kiro.zip' \
  --exclude='.claude' \
  --exclude='.zip.worktrees' \
  --exclude='.worktrees' \
  --exclude='submission' \
  --exclude='video' \
  --exclude='docs' \
  --exclude='README.md' \
  --exclude='CONTRIBUTING.md' \
  --exclude='PRODUCT.md' \
  --exclude='.git' \
  "$PROJECT_ROOT/" "$OUTPUT_DIR/source/"

# ─── Zip it ──────────────────────────────────────────────────────────────────
cd "$OUTPUT_DIR"
rm -f "$PROJECT_ROOT/$ZIP_NAME"
zip -r "$PROJECT_ROOT/$ZIP_NAME" . -x '*.DS_Store'

echo ""
echo "✅ Submission ready: $PROJECT_ROOT/$ZIP_NAME"
echo ""
echo "Contents:"
echo "  README.md"
echo "  documentation/"
echo "    PROJECT_REPORT.md"
echo "    AIKIDO_REPORT.md"
echo "    API.md"
echo "    DEPLOYMENT.md"
echo "    CONTRIBUTING.md"
echo "    PRODUCT.md"
echo "    internal/  (design docs, plans, specs)"
echo "  source/"
echo "    (full project code, no node_modules or build artifacts)"
echo ""
du -sh "$PROJECT_ROOT/$ZIP_NAME"
