#!/bin/bash
set -e

# ─── Usage ───────────────────────────────────────────
# bun run release <version>
# Example: bun run release 0.2.0
# ─────────────────────────────────────────────────────

VERSION="$1"

if [ -z "$VERSION" ]; then
  echo "❌ Usage: bun run release <version>"
  echo "   Example: bun run release 0.2.0"
  exit 1
fi

# Validate semver format
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "❌ Invalid version format: $VERSION"
  echo "   Must be MAJOR.MINOR.PATCH (e.g., 0.2.0)"
  exit 1
fi

TAG="v$VERSION"

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Working directory is not clean. Commit or stash changes first."
  exit 1
fi

# Check tag doesn't already exist
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "❌ Tag $TAG already exists."
  exit 1
fi

# ─── Get previous tag ────────────────────────────────
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [ -z "$PREV_TAG" ]; then
  LOG_RANGE="HEAD"
  echo "📋 No previous tag found. Including all commits."
else
  LOG_RANGE="$PREV_TAG..HEAD"
  echo "📋 Generating changelog: $PREV_TAG → $TAG"
fi

# ─── Collect commits by category ─────────────────────
collect_commits() {
  local prefix="$1"
  git log "$LOG_RANGE" --pretty=format:"- %s" --grep="^${prefix}" | sed "s/^- ${prefix}: /- /" | sed "s/^- ${prefix} /- /"
}

FEAT=$(collect_commits "feat")
FIX=$(collect_commits "fix")
STYLE=$(collect_commits "style")
CHORE=$(collect_commits "chore")
# Catch everything else
OTHER=$(git log "$LOG_RANGE" --pretty=format:"%s" | grep -vE "^(feat|fix|style|chore)" | sed 's/^/- /' || true)

# ─── Build changelog entry ───────────────────────────
DATE=$(date +%Y-%m-%d)
ENTRY="## [$TAG] - $DATE"
ENTRY+="\n"

if [ -n "$FEAT" ]; then
  ENTRY+="\n### ✨ Features\n$FEAT\n"
fi
if [ -n "$FIX" ]; then
  ENTRY+="\n### 🐛 Bug Fixes\n$FIX\n"
fi
if [ -n "$STYLE" ]; then
  ENTRY+="\n### 🎨 Styling\n$STYLE\n"
fi
if [ -n "$CHORE" ]; then
  ENTRY+="\n### 🔧 Chores\n$CHORE\n"
fi
if [ -n "$OTHER" ]; then
  ENTRY+="\n### 📝 Other\n$OTHER\n"
fi

# ─── Update CHANGELOG.md ─────────────────────────────
CHANGELOG="CHANGELOG.md"
if [ ! -f "$CHANGELOG" ]; then
  echo -e "# Changelog\n" > "$CHANGELOG"
fi

# Prepend new entry after the "# Changelog" header
TMPFILE=$(mktemp)
head -1 "$CHANGELOG" > "$TMPFILE"
echo "" >> "$TMPFILE"
echo -e "$ENTRY" >> "$TMPFILE"
tail -n +2 "$CHANGELOG" >> "$TMPFILE"
mv "$TMPFILE" "$CHANGELOG"

echo "📝 Updated $CHANGELOG"

# ─── Update package.json version ─────────────────────
# Use node to update version (cross-platform safe)
# Use sed to update version (Mac compatible)
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
echo "📦 Updated package.json → $VERSION"

# ─── Commit and tag ──────────────────────────────────
git add -A
git commit -m "chore(release): $TAG"
git tag -a "$TAG" -m "Release $TAG"

echo ""
echo "✅ Released $TAG!"
echo "   • package.json: $VERSION"
echo "   • CHANGELOG.md: updated"
echo "   • Git tag: $TAG"
echo ""
echo "To push: git push && git push --tags"
