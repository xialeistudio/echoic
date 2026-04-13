# Changelog

All notable changes to this project will be documented in this file.

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
