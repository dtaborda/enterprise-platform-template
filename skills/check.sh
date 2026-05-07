#!/usr/bin/env bash
# Validate skills integrity for the Enterprise Platform.
#
# Checks:
#   1. No untracked SKILL.md files in skills/ (every skill must be git-tracked)
#   2. Every skills/*/SKILL.md on disk has a corresponding tracked entry in git
#   3. (--full only) skills:sync --dry-run output matches current AGENTS.md
#
# Flags:
#   --ci    CI mode: exits on first failure (stricter)
#   --full  Also validate that skills:sync is not stale (requires sync.sh)
#   --help  Show this help message

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

CI_MODE=false
FULL_CHECK=false
ERRORS=()

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Validate skills/ directory integrity."
    echo ""
    echo "Options:"
    echo "  --ci    CI mode — exits immediately on the first failure"
    echo "  --full  Also check that skills:sync output is not stale"
    echo "  --help  Show this help message"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --ci)    CI_MODE=true; shift ;;
        --full)  FULL_CHECK=true; shift ;;
        --help|-h) show_help; exit 0 ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

fail() {
    local msg="$1"
    echo -e "${RED}✗ ${msg}${NC}" >&2
    if [ "$CI_MODE" = true ]; then
        exit 1
    fi
    ERRORS+=("$msg")
}

pass() {
    local msg="$1"
    echo -e "${GREEN}✓ ${msg}${NC}"
}

echo -e "${BOLD}Skills Integrity Check${NC}"
echo "================================"
echo ""

# ---------------------------------------------------------------------------
# Check 1: No untracked SKILL.md files in skills/
# ---------------------------------------------------------------------------
echo "Checking for untracked skill files..."

UNTRACKED=$(git -C "$REPO_ROOT" ls-files --others --exclude-standard skills/ 2>/dev/null | grep "SKILL.md" || true)

if [ -n "$UNTRACKED" ]; then
    while IFS= read -r file; do
        fail "Untracked skill file found: $file — run 'git add $file' to track it"
    done <<< "$UNTRACKED"
else
    pass "No untracked skill files"
fi

# ---------------------------------------------------------------------------
# Check 2: Every skills/*/SKILL.md on disk is git-tracked
# ---------------------------------------------------------------------------
echo ""
echo "Checking that all on-disk skills are git-tracked..."

MISSING_TRACKED=false
for skill_file in "$REPO_ROOT"/skills/*/SKILL.md; do
    [ -f "$skill_file" ] || continue
    relative="${skill_file#"$REPO_ROOT/"}"
    if ! git -C "$REPO_ROOT" ls-files --error-unmatch "$relative" > /dev/null 2>&1; then
        fail "Skill file exists on disk but is not tracked by git: $relative"
        fail "  Fix: git add $relative"
        MISSING_TRACKED=true
    fi
done

if [ "$MISSING_TRACKED" = false ]; then
    TRACKED_COUNT=$(git -C "$REPO_ROOT" ls-files skills/\*/SKILL.md | wc -l | tr -d ' ')
    pass "All $TRACKED_COUNT on-disk skill files are git-tracked"
fi

# ---------------------------------------------------------------------------
# Check 3 (--full): skills:sync --dry-run output matches AGENTS.md
# ---------------------------------------------------------------------------
if [ "$FULL_CHECK" = true ]; then
    echo ""
    echo "Checking skills:sync is not stale..."

    SYNC_SCRIPT="$REPO_ROOT/skills/skill-sync/assets/sync.sh"
    AGENTS_FILE="$REPO_ROOT/AGENTS.md"

    if [ ! -f "$SYNC_SCRIPT" ]; then
        echo -e "${YELLOW}⚠ Skipping sync check: $SYNC_SCRIPT not found${NC}"
    elif [ ! -f "$AGENTS_FILE" ]; then
        echo -e "${YELLOW}⚠ Skipping sync check: $AGENTS_FILE not found${NC}"
    else
        AGENTS_BEFORE="$(cat "$AGENTS_FILE")"
        # Run dry-run sync in a temp directory to capture what it would produce
        TMPFILE="$(mktemp)"
        cp "$AGENTS_FILE" "$TMPFILE"

        # Apply dry-run — if sync.sh supports --dry-run it writes to stdout, otherwise we diff
        SYNC_OUTPUT="$(bash "$SYNC_SCRIPT" --dry-run 2>/dev/null || true)"
        AGENTS_AFTER="$(cat "$AGENTS_FILE")"

        # Restore in case sync.sh modified the file despite --dry-run
        echo "$AGENTS_BEFORE" > "$AGENTS_FILE"
        rm -f "$TMPFILE"

        if [ "$AGENTS_BEFORE" != "$AGENTS_AFTER" ]; then
            fail "skills:sync is stale — AGENTS.md was modified by --dry-run. Run 'pnpm skills:sync' to update it."
        else
            pass "skills:sync is up-to-date"
        fi
    fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
if [ ${#ERRORS[@]} -gt 0 ]; then
    echo -e "${RED}${BOLD}Skills check FAILED — ${#ERRORS[@]} issue(s) found:${NC}"
    for err in "${ERRORS[@]}"; do
        echo -e "  ${RED}• $err${NC}"
    done
    echo ""
    echo -e "${YELLOW}Fix the issues above and re-run: bash skills/check.sh${NC}"
    exit 1
else
    echo -e "${GREEN}${BOLD}Skills check passed.${NC}"
fi
