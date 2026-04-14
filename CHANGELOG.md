# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-04-14

### Added
- **Content Gallery** — browse and import curated VOA Learning English and BBC Learning English episodes directly from the app
- **Sentence mastered toggle** — mark sentences as mastered to hide them from the list; practice count badge shown per sentence
- **Sentence search** — filter sentences by text within any audio file
- **Word error review** — aggregate word accuracy across all practice sessions, sorted worst-first
- **Playback speed persistence** — selected speed saved to localStorage and restored on next visit
- **Overview overhaul** — stat cards now show average score alongside practice count; new streak (consecutive days) counter with flame indicator; fixed date locale to respect app language setting
- **Japanese UI** (`ja`) and **Korean UI** (`ko`) interface language options
- Demo GIF added to README

### Fixed
- Pronunciation assessment button in the More dropdown closed the menu without executing — changed `onSelect` to `onClick` (base-ui API)
- Assessment menu item now keeps the dropdown open during scoring (`closeOnClick={false}`)
- Date format in Recent Practice list was hardcoded to `zh-CN` regardless of selected language

## [1.2.0] - 2026-04-13

### Added
- Docker Compose support: `docker compose up` for one-command local deployment
- Multi-stage Dockerfile (Node.js frontend build + Python backend)
- HuggingFace model cache and storage persisted via Docker volumes

## [1.1.0] - 2026-04-13

### Added
- Ollama backend support for local LLM inference (no API key required)
- `LLM__BACKEND=ollama` configuration with `BASE_URL`, `MODEL`, `NUM_CTX`, and `THINK` options
- `num_ctx` config to cap KV cache memory (default 512, sufficient for sentence analysis)
- `think` config to toggle qwen3.5 thinking mode (default false)

### Fixed
- LLM availability check was hardcoded to OpenAI; now correctly allows Ollama backend without an API key
- Sentence analysis result lost after switching sentences and returning — now persisted in local state

## [1.0.0] - 2026-04-06

### Added
- Initial release
