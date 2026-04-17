# Changelog

All notable changes to this project will be documented in this file.

## [1.5.0] - 2026-04-17

### Added
- **Japanese learning support** — full pipeline (ASR → alignment → phoneme scoring) now works for Japanese (`ja`); alignment uses `jonatasgrosman/wav2vec2-large-xlsr-53-japanese` via whisperx, phoneme scoring uses espeak `ja`
- Configure via:
  ```env
  ASR__WHISPERX__LANGUAGE=ja
  ALIGNMENT__WAV2VEC2__LANGUAGE=ja
  SCORING__PHONEME__LANGUAGE=ja
  ```

### Fixed
- `phoneme.py` `_display_word` and `_normalize_text` regexes changed from `[^A-Za-z']` to Unicode-aware `[^\w']` so CJK characters are not stripped
- `wav2vec2.py` text cleaning regexes updated to Unicode-aware `\W`/`\w` for consistency

## [1.4.0] - 2026-04-17

### Added
- **French and German learning support** — full pipeline (ASR → alignment → phoneme scoring) now works for French (`fr`) and German (`de`); configure via `ASR__WHISPERX__LANGUAGE`, `ALIGNMENT__WAV2VEC2__LANGUAGE`, and `SCORING__PHONEME__LANGUAGE`
- **Language badge** — audio language shown as a pill badge in the library list and practice page breadcrumb
- **Language filter** — select dropdown in the audio library to filter by language (shown only when multiple languages are present)
- **French UI** (`fr`) and **German UI** (`de`) interface language options
- **Multilingual README** — separate README files for 7 languages (EN / 简体中文 / 繁體中文 / 日本語 / 한국어 / Français / Deutsch)

### Fixed
- Wav2vec2 alignment text cleaning now uses Unicode-aware regex (`\w`) to handle accented characters in French and German
- French espeak language code is `fr-fr` (not `fr`) — `fr` causes a `RuntimeError` in phonemizer

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
