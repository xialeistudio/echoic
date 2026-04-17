"""Language-specific phonemizer backends.

Each backend implements ``phonemize(words) -> phonemes`` for a particular
language or script family.  Add a new language by subclassing
``LanguagePhonemizerBackend`` and registering it in ``_REGISTRY``.
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from typing import Callable


class LanguagePhonemizerBackend(ABC):
    """Convert a list of words to phoneme strings."""

    @abstractmethod
    def phonemize(self, words: list[str]) -> list[str]:
        """Return one IPA string per input word (used internally for CTC scoring)."""

    def display(self, words: list[str]) -> list[str]:
        """Return human-readable phoneme strings for UI display.

        Defaults to IPA.  Override for languages where a different notation
        (e.g. Hepburn romaji for Japanese) is more learner-friendly.
        """
        return self.phonemize(words)


class LatinScriptBackend(LanguagePhonemizerBackend):
    """espeak-backed backend for Latin-script languages (en, fr, de, …)."""

    def __init__(self, language: str) -> None:
        self.language = language  # espeak language code, e.g. "en-us", "fr-fr", "de"

    @staticmethod
    def _fallback(words: list[str]) -> list[str]:
        return [re.sub(r"[^\w']", "", w).lower() for w in words]

    def phonemize(self, words: list[str]) -> list[str]:
        if not words:
            return []
        try:
            from phonemizer import phonemize as _phonemize

            result = _phonemize(
                words,
                language=self.language,
                backend="espeak",
                strip=True,
                preserve_punctuation=False,
                with_stress=True,
            )
            return [str(p) for p in result]
        except RuntimeError:
            return self._fallback(words)


class JapaneseBackend(LanguagePhonemizerBackend):
    """MeCab (fugashi + unidic-lite) → hiragana → espeak IPA backend for Japanese.

    Pipeline per word:
      1. MeCab morpheme analysis via ``fugashi`` + ``unidic-lite``
      2. Katakana pronunciation field → hiragana via ``jaconv``
      3. Hiragana → IPA via ``phonemizer`` + espeak ``ja``
    """

    @staticmethod
    def _kana_of(morpheme) -> str:
        """Extract katakana pronunciation from a fugashi morpheme.

        UniDic-lite exposes ``pron`` (surface pronunciation) and ``kana``
        (citation form).  We prefer ``pron`` for accurate surface readings
        (e.g. は as a topic particle → "わ").
        """
        feature = morpheme.feature
        for attr in ("pron", "kana", "lForm"):
            val = getattr(feature, attr, None)
            if val and val != "*":
                return val
        return morpheme.surface  # ASCII / unknown — pass through as-is

    @staticmethod
    def _split_mora(hira: str) -> list[str]:
        """Split a hiragana string into mora units.

        Combining rules (in priority order):
          ゃゅょ  — attach to the *preceding* mora (e.g. し+ょ → しょ)
          ー      — attach to the *preceding* mora (long-vowel extension)
          っ      — attach to the *following* mora (geminate consonant prefix)

        The っ rule keeps the geminate together with its target consonant so
        romanisation stays clean (e.g. にっぽん → [に, っぽ, ん] → ni+ppo+n
        rather than [に, っ, ぽ, ん] → ni+xtsu+po+n).
        """
        ATTACH_PREV = set("ゃゅょー")
        mora: list[str] = []
        for ch in hira:
            if mora and ch in ATTACH_PREV:
                mora[-1] += ch          # glide / long-vowel: attach to left
            elif mora and mora[-1] == "っ":
                mora[-1] += ch          # っ pending: absorb next kana into it
            else:
                mora.append(ch)
        return mora

    @staticmethod
    def _is_kana(s: str) -> bool:
        """Return True if *s* contains at least one hiragana or katakana character."""
        return any("\u3041" <= ch <= "\u30ff" for ch in s)

    def _to_hiragana(self, words: list[str]) -> list[str]:
        """Convert words to hiragana using full-context MeCab analysis.

        All words are joined before analysis so compound kanji are read
        correctly (e.g. 今 + 日 → 今日 → きょう, not いま + ひ).

        For multi-character morphemes the hiragana reading is distributed
        across the characters by splitting into mora and spreading them
        evenly (ceiling-first).  Example:

          天気 → てんき (3 mora, 2 chars) → 天:てん  気:き
          練習 → れんしゅう (4 mora, 2 chars) → 練:れん  習:しゅう
          今日 → きょう (2 mora, 2 chars) → 今:きょ  日:う
        """
        import fugashi
        import jaconv

        tagger = fugashi.Tagger()
        full_text = "".join(words)
        morphemes = tagger(full_text)

        per_char: list[str] = []
        for m in morphemes:
            hira = jaconv.kata2hira(self._kana_of(m))
            n = len(m.surface)
            if n <= 1:
                per_char.append(hira)
            else:
                # Distribute mora evenly, earlier chars get any remainder.
                mora = self._split_mora(hira)
                n_mora = len(mora)
                pos = 0
                for i in range(n):
                    remaining_chars = n - i
                    remaining_mora = n_mora - pos
                    take = -(-remaining_mora // remaining_chars)  # ceiling div
                    per_char.append("".join(mora[pos : pos + take]))
                    pos += take

        # Safety: pad if MeCab returned fewer chars than the joined text
        while len(per_char) < len(full_text):
            per_char.append("")

        # Map per-character readings back to the original word boundaries
        result: list[str] = []
        pos = 0
        for word in words:
            result.append("".join(per_char[pos : pos + len(word)]))
            pos += len(word)
        return result

    @staticmethod
    def _fix_romaji(romaji: str) -> str:
        """Clean up romaji produced by jaconv.kana2alphabet.

        Two fixes applied in sequence:
        1. Long-vowel dashes: 'kyo-' → 'kyoo'  (ー mapped to '-' by jaconv)
        2. Geminate prefix:   'xtsup…' → 'pp…'  (っ before consonant)
        """
        import re

        # Fix 1: long-vowel '-' → repeat the preceding vowel
        buf: list[str] = []
        for ch in romaji:
            if ch == "-" and buf and buf[-1] in "aeiou":
                buf.append(buf[-1])
            else:
                buf.append(ch)
        s = "".join(buf)

        # Fix 2: 'xtsu<consonant>' → '<consonant><consonant>'
        s = re.sub(r"xtsu([a-z])", lambda m: m.group(1) * 2, s)
        return s

    def display(self, words: list[str]) -> list[str]:
        """Return romaji for UI display.

        Pipeline: MeCab pronunciation field → hiragana → romaji via
        ``jaconv.kana2alphabet``.  Avoids espeak entirely so kanji that
        MeCab cannot read fall back to their surface form rather than
        producing garbage IPA like ``(en)tʃˈaɪniːz(ja)``.
        """
        if not words:
            return []
        try:
            import jaconv

            hiragana = self._to_hiragana(words)
            result = []
            for word, h in zip(words, hiragana):
                if not h:
                    # Empty hiragana: either a compound-morpheme tail (kanji/kana
                    # that shared its reading with an adjacent char) or punctuation.
                    # Show "—" for the former so the UI stays aligned; "" for the
                    # latter so no phoneme row is rendered at all.
                    if self._is_kana(word) or any("\u4e00" <= c <= "\u9fff" for c in word):
                        result.append("—")   # compound tail — visually placeholder
                    else:
                        result.append("")    # punctuation — omit phoneme row
                    continue
                romaji = self._fix_romaji(jaconv.kana2alphabet(h))
                # kana2alphabet passes punctuation through unchanged (non-ASCII).
                result.append(romaji if (romaji and romaji.isascii()) else "")
            return result
        except Exception:
            return words[:]  # last resort: show original surface form

    def phonemize(self, words: list[str]) -> list[str]:
        """Return IPA via espeak — used internally for CTC forced-alignment scoring."""
        if not words:
            return []
        try:
            from phonemizer import phonemize as _phonemize

            hiragana = self._to_hiragana(words)
            # Only pass entries that contain actual kana (skip punctuation/empty).
            ph_result: list[str] = [""] * len(words)
            indices = [i for i, h in enumerate(hiragana) if self._is_kana(h)]
            if indices:
                batch = [hiragana[i] for i in indices]
                phonemes = _phonemize(
                    batch,
                    language="ja",
                    backend="espeak",
                    strip=True,
                    preserve_punctuation=False,
                    with_stress=True,
                )
                for i, ph in zip(indices, phonemes):
                    ph_result[i] = str(ph)
            return ph_result
        except (RuntimeError, ImportError):
            return [""] * len(words)


# ---------------------------------------------------------------------------
# Registry — maps espeak/config language codes to backend factories.
# ---------------------------------------------------------------------------

_REGISTRY: dict[str, Callable[[], LanguagePhonemizerBackend]] = {
    "ja": JapaneseBackend,
}


def get_backend(language: str) -> LanguagePhonemizerBackend:
    """Return the appropriate backend for *language*.

    Languages not in the registry use :class:`LatinScriptBackend`.
    """
    factory = _REGISTRY.get(language)
    if factory is not None:
        return factory()
    return LatinScriptBackend(language)
