#!/bin/bash
# Setup AI Skills for Enterprise Platform development
# Configures AI coding assistants that follow agentskills.io standard:
#   - Claude Code: .claude/skills/ symlink + CLAUDE.md copies
#   - Cursor: Uses AGENTS.md natively (no setup needed)
#   - OpenCode: .agents/skills/ symlink
#   - Gemini CLI: .gemini/skills/ symlink + GEMINI.md copies
#   - Codex (OpenAI): .codex/skills/ symlink + AGENTS.md (native)
#   - GitHub Copilot: .github/copilot-instructions.md copy

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SKILLS_SOURCE="$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SETUP_CLAUDE=false
SETUP_OPENCODE=false
SETUP_GEMINI=false
SETUP_CODEX=false
SETUP_COPILOT=false

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Configure AI coding assistants for Enterprise Platform development."
    echo ""
    echo "Options:"
    echo "  --all       Configure all AI assistants"
    echo "  --claude    Configure Claude Code"
    echo "  --opencode  Configure OpenCode (.agents/skills)"
    echo "  --gemini    Configure Gemini CLI"
    echo "  --codex     Configure Codex (OpenAI)"
    echo "  --copilot   Configure GitHub Copilot"
    echo "  --help      Show this help message"
}

show_menu() {
    echo -e "${BOLD}Which AI assistants do you use?${NC}"
    echo -e "${CYAN}(Use numbers to toggle, Enter to confirm)${NC}"
    echo ""

    local options=("Claude Code" "OpenCode" "Gemini CLI" "Codex (OpenAI)" "GitHub Copilot")
    local selected=(false true false false false)

    while true; do
        for i in "${!options[@]}"; do
            if [ "${selected[$i]}" = true ]; then
                echo -e "  ${GREEN}[x]${NC} $((i+1)). ${options[$i]}"
            else
                echo -e "  [ ] $((i+1)). ${options[$i]}"
            fi
        done
        echo ""
        echo -e "  ${YELLOW}a${NC}. Select all"
        echo -e "  ${YELLOW}n${NC}. Select none"
        echo ""
        echo -n "Toggle (1-5, a, n) or Enter to confirm: "

        read -r choice

        case $choice in
            1) selected[0]=$([ "${selected[0]}" = true ] && echo false || echo true) ;;
            2) selected[1]=$([ "${selected[1]}" = true ] && echo false || echo true) ;;
            3) selected[2]=$([ "${selected[2]}" = true ] && echo false || echo true) ;;
            4) selected[3]=$([ "${selected[3]}" = true ] && echo false || echo true) ;;
            5) selected[4]=$([ "${selected[4]}" = true ] && echo false || echo true) ;;
            a|A) selected=(true true true true true) ;;
            n|N) selected=(false false false false false) ;;
            "") break ;;
            *) echo -e "${RED}Invalid option${NC}" ;;
        esac

        echo -en "\033[11A\033[J"
    done

    SETUP_CLAUDE=${selected[0]}
    SETUP_OPENCODE=${selected[1]}
    SETUP_GEMINI=${selected[2]}
    SETUP_CODEX=${selected[3]}
    SETUP_COPILOT=${selected[4]}
}

symlink_agents_md() {
    local target_name="$1"
    local count=0

    while IFS= read -r -d '' agents_file; do
        local agents_dir
        agents_dir="$(dirname "$agents_file")"
        local target_path="$agents_dir/$target_name"
        [ -L "$target_path" ] && rm "$target_path"
        [ -f "$target_path" ] && rm "$target_path"
        ln -s "AGENTS.md" "$target_path"
        count=$((count + 1))
    done < <(find "$REPO_ROOT" \( -name "AGENTS.md" -o -name "AGENTS.MD" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.venv/*" -print0 2>/dev/null)

    echo -e "${GREEN}  ✓ Symlinked $count AGENTS.md -> $target_name${NC}"
}

setup_claude() {
    local target="$REPO_ROOT/.claude/skills"
    mkdir -p "$REPO_ROOT/.claude"
    [ -L "$target" ] && rm "$target"
    [ -d "$target" ] && mv "$target" "$REPO_ROOT/.claude/skills.backup.$(date +%s)"
    ln -s "$SKILLS_SOURCE" "$target"
    echo -e "${GREEN}  ✓ .claude/skills -> skills/${NC}"
    symlink_agents_md "CLAUDE.md"
}

setup_opencode() {
    local target="$REPO_ROOT/.agents/skills"
    mkdir -p "$REPO_ROOT/.agents"
    [ -L "$target" ] && rm "$target"
    [ -d "$target" ] && mv "$target" "$REPO_ROOT/.agents/skills.backup.$(date +%s)"
    ln -s "$SKILLS_SOURCE" "$target"
    echo -e "${GREEN}  ✓ .agents/skills -> skills/${NC}"
    echo -e "${GREEN}  ✓ OpenCode uses AGENTS.md natively${NC}"
}

setup_gemini() {
    local target="$REPO_ROOT/.gemini/skills"
    mkdir -p "$REPO_ROOT/.gemini"
    [ -L "$target" ] && rm "$target"
    [ -d "$target" ] && mv "$target" "$REPO_ROOT/.gemini/skills.backup.$(date +%s)"
    ln -s "$SKILLS_SOURCE" "$target"
    echo -e "${GREEN}  ✓ .gemini/skills -> skills/${NC}"
    symlink_agents_md "GEMINI.md"
}

setup_codex() {
    local target="$REPO_ROOT/.codex/skills"
    mkdir -p "$REPO_ROOT/.codex"
    [ -L "$target" ] && rm "$target"
    [ -d "$target" ] && mv "$target" "$REPO_ROOT/.codex/skills.backup.$(date +%s)"
    ln -s "$SKILLS_SOURCE" "$target"
    echo -e "${GREEN}  ✓ .codex/skills -> skills/${NC}"
    echo -e "${GREEN}  ✓ Codex uses AGENTS.md natively${NC}"
}

setup_copilot() {
    if [ -f "$REPO_ROOT/AGENTS.md" ] || [ -f "$REPO_ROOT/AGENTS.MD" ]; then
        mkdir -p "$REPO_ROOT/.github"
        local agents_file
        if [ -f "$REPO_ROOT/AGENTS.md" ]; then
            agents_file="$REPO_ROOT/AGENTS.md"
        else
            agents_file="$REPO_ROOT/AGENTS.MD"
        fi
        cp "$agents_file" "$REPO_ROOT/.github/copilot-instructions.md"
        echo -e "${GREEN}  ✓ AGENTS.md -> .github/copilot-instructions.md${NC}"
    fi
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --all)
            SETUP_CLAUDE=true; SETUP_OPENCODE=true; SETUP_GEMINI=true; SETUP_CODEX=true; SETUP_COPILOT=true; shift ;;
        --claude)
            SETUP_CLAUDE=true; shift ;;
        --opencode)
            SETUP_OPENCODE=true; shift ;;
        --gemini)
            SETUP_GEMINI=true; shift ;;
        --codex)
            SETUP_CODEX=true; shift ;;
        --copilot)
            SETUP_COPILOT=true; shift ;;
        --help|-h)
            show_help; exit 0 ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"; show_help; exit 1 ;;
    esac
done

echo "🤖 Enterprise Platform - AI Skills Setup"
echo "============================================"
echo ""

SKILL_COUNT=$(find "$SKILLS_SOURCE" -maxdepth 2 -name "SKILL.md" | wc -l | tr -d ' ')

if [ "$SKILL_COUNT" -eq 0 ]; then
    echo -e "${RED}No skills found in $SKILLS_SOURCE${NC}"
    exit 1
fi

echo -e "${BLUE}Found $SKILL_COUNT skills to configure${NC}"
echo ""

if [ "$SETUP_CLAUDE" = false ] && [ "$SETUP_OPENCODE" = false ] && [ "$SETUP_GEMINI" = false ] && [ "$SETUP_CODEX" = false ] && [ "$SETUP_COPILOT" = false ]; then
    show_menu
    echo ""
fi

if [ "$SETUP_CLAUDE" = false ] && [ "$SETUP_OPENCODE" = false ] && [ "$SETUP_GEMINI" = false ] && [ "$SETUP_CODEX" = false ] && [ "$SETUP_COPILOT" = false ]; then
    echo -e "${YELLOW}No AI assistants selected. Nothing to do.${NC}"
    exit 0
fi

STEP=1
TOTAL=0
[ "$SETUP_CLAUDE" = true ] && TOTAL=$((TOTAL + 1))
[ "$SETUP_OPENCODE" = true ] && TOTAL=$((TOTAL + 1))
[ "$SETUP_GEMINI" = true ] && TOTAL=$((TOTAL + 1))
[ "$SETUP_CODEX" = true ] && TOTAL=$((TOTAL + 1))
[ "$SETUP_COPILOT" = true ] && TOTAL=$((TOTAL + 1))

if [ "$SETUP_CLAUDE" = true ]; then echo -e "${YELLOW}[$STEP/$TOTAL] Setting up Claude Code...${NC}"; setup_claude; STEP=$((STEP + 1)); fi
if [ "$SETUP_OPENCODE" = true ]; then echo -e "${YELLOW}[$STEP/$TOTAL] Setting up OpenCode...${NC}"; setup_opencode; STEP=$((STEP + 1)); fi
if [ "$SETUP_GEMINI" = true ]; then echo -e "${YELLOW}[$STEP/$TOTAL] Setting up Gemini CLI...${NC}"; setup_gemini; STEP=$((STEP + 1)); fi
if [ "$SETUP_CODEX" = true ]; then echo -e "${YELLOW}[$STEP/$TOTAL] Setting up Codex (OpenAI)...${NC}"; setup_codex; STEP=$((STEP + 1)); fi
if [ "$SETUP_COPILOT" = true ]; then echo -e "${YELLOW}[$STEP/$TOTAL] Setting up GitHub Copilot...${NC}"; setup_copilot; fi

echo ""
echo -e "${GREEN}✅ Successfully configured $SKILL_COUNT AI skills!${NC}"
echo ""
echo "Configured:"
[ "$SETUP_CLAUDE" = true ] && echo "  • Claude Code:    .claude/skills/ + CLAUDE.md"
[ "$SETUP_OPENCODE" = true ] && echo "  • OpenCode:       .agents/skills/"
[ "$SETUP_CODEX" = true ] && echo "  • Codex (OpenAI): .codex/skills/ + AGENTS.md (native)"
[ "$SETUP_GEMINI" = true ] && echo "  • Gemini CLI:     .gemini/skills/ + GEMINI.md"
[ "$SETUP_COPILOT" = true ] && echo "  • GitHub Copilot: .github/copilot-instructions.md"
echo ""
echo -e "${BLUE}Note: Restart your AI assistant to load the skills.${NC}"
echo -e "${BLUE}      AGENTS.md is the source of truth - edit it, then re-run this script.${NC}"
