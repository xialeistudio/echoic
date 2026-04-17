# Echoic

**Entraînement à l'expression orale propulsé par l'IA.** Importez n'importe quel fichier audio, entraînez-vous phrase par phrase et obtenez un score de prononciation instantané au niveau des phonèmes.

[English](./README.md) · [简体中文](./README_CN.md) · [繁體中文](./README_TW.md) · [日本語](./README_JA.md) · [한국어](./README_KO.md) · [Français](./README_FR.md) · [Deutsch](./README_DE.md)

---

![Démo Echoic](./demo.gif)

---

## Fonctionnalités

- **Galerie de contenu** — Parcourez et importez des épisodes sélectionnés de VOA Learning English et BBC Learning English
- **Import audio** — Téléversez des fichiers locaux ou importez depuis n'importe quelle URL directe
- **Collections** — Organisez vos fichiers audio en collections
- **Pratique par phrase** — Entraînez-vous phrase par phrase avec une vitesse de lecture ajustable (0,5×–2×)
- **Score de prononciation** — Précision, fluidité et complétude avec détail au niveau du mot
- **Affichage des phonèmes** — Transcription IPA par mot ; phonèmes colorés selon le score après évaluation
- **Révision des mots** — Agrégation de la précision des mots sur toutes les sessions pour identifier les points faibles
- **Comparaison A/B** — Écoutez l'original puis votre enregistrement en un clic
- **Analyse IA des phrases** — Traduction et analyse grammaticale via OpenAI ou Ollama local (optionnel)
- **Historique de pratique** — Chaque tentative sauvegardée avec le score complet ; cliquez pour réécouter
- **États des phrases** — Marquez des phrases en favori pour révision ; marquez comme maîtrisées pour les masquer
- **Recherche de phrases** — Filtrez les phrases par texte dans n'importe quel fichier audio
- **Carte thermique** — Calendrier d'activité sur 365 jours
- **Raccourcis clavier** — Space / R / Entrée / ←→ / Échap pour une pratique sans les mains
- **Mode sombre** — Thèmes clair, sombre et suivi système
- **Apprentissage multilingue** — Pratiquez l'anglais, le français et l'allemand ; le score de prononciation s'adapte selon la langue
- **Interface multilingue** — Français, anglais, chinois simplifié, chinois traditionnel, japonais, coréen, allemand

## Langues d'apprentissage supportées

| Langue | `ASR__WHISPERX__LANGUAGE` | `ALIGNMENT__WAV2VEC2__LANGUAGE` | `SCORING__PHONEME__LANGUAGE` |
|---|---|---|---|
| Anglais | `en` | `en` | `en-us` |
| Français | `fr` | `fr` | `fr-fr` |
| Allemand | `de` | `de` | `de` |

Pour changer de langue d'apprentissage, définissez trois variables dans `.env` :

```env
ASR__WHISPERX__LANGUAGE=fr
ALIGNMENT__WAV2VEC2__LANGUAGE=fr
SCORING__PHONEME__LANGUAGE=fr-fr
```

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, shadcn/ui, WaveSurfer.js |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Base de données | PostgreSQL 16 |
| ASR | WhisperX (faster-whisper + CTranslate2) |
| Alignement | wav2vec2 |
| Notation | wav2vec2 + phonemizer |
| LLM | OpenAI API / Ollama (optionnel) |

## Démarrage rapide (Docker)

La méthode la plus simple. Nécessite uniquement [Docker](https://docs.docker.com/get-docker/).

```bash
git clone https://github.com/xialeistudio/echoic.git
cd echoic
docker compose up
```

Ouvrez **http://localhost:8000** dans votre navigateur.

> **Premier lancement :** Les modèles ASR et d'alignement (~1 Go) sont téléchargés automatiquement lors de la première utilisation et mis en cache dans un volume Docker. Les démarrages suivants sont instantanés.

### Activer l'analyse IA des phrases (optionnel)

Créez un fichier `.env` à la racine du projet avant `docker compose up`.

**OpenAI :**
```env
LLM__BACKEND=openai
LLM__OPENAI__API_KEY=sk-...
LLM__OPENAI__MODEL=gpt-4o-mini
# Tout point de terminaison compatible OpenAI est supporté :
# LLM__OPENAI__BASE_URL=https://api.openai.com/v1
```

**Ollama (local, sans clé API) :**

Installez [Ollama](https://ollama.com) et téléchargez un modèle :
```bash
ollama pull qwen2.5:3b
```

Créez `.env` :
```env
LLM__BACKEND=ollama
LLM__OLLAMA__BASE_URL=http://host.docker.internal:11434
LLM__OLLAMA__MODEL=qwen2.5:3b
LLM__OLLAMA__NUM_CTX=512
```

> `host.docker.internal` permet au conteneur d'accéder à Ollama sur votre machine hôte. Sur Linux, remplacez par l'IP de l'hôte.

---

## Installation manuelle

### Prérequis

- Python 3.11+, [uv](https://docs.astral.sh/uv/)
- Node.js 20+, [pnpm](https://pnpm.io)
- PostgreSQL 16
- ffmpeg
- espeak-ng

**macOS (Homebrew) :**
```bash
brew install ffmpeg espeak-ng postgresql@16
```

**Ubuntu / Debian :**
```bash
sudo apt install ffmpeg espeak-ng postgresql
```

### Étapes

```bash
# 1. Cloner
git clone https://github.com/xialeistudio/echoic.git
cd echoic

# 2. Démarrer PostgreSQL
make db                          # démarre PostgreSQL via Docker sur le port 5433

# 3. Backend
cd backend
uv sync
cp .env.example .env             # éditez selon vos besoins
uv run alembic upgrade head
cd .. && make run                # http://localhost:8000

# 4. Frontend (développement uniquement)
make dev-frontend                # http://localhost:5173
```

En **production**, construisez d'abord le frontend :

```bash
make build   # sortie dans backend/static/
make run     # API + frontend sur http://localhost:8000
```

---

## Variables d'environnement

Copiez `backend/.env.example` vers `backend/.env`. Toutes les variables sont optionnelles sauf `DATABASE_URL`.

### Core

| Variable | Défaut | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://echoic:echoic@localhost:5433/echoic` | Chaîne de connexion PostgreSQL |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Origines CORS autorisées (tableau JSON) |

### ASR

> WhisperX utilise CTranslate2 qui **ne supporte pas** MPS (Apple Silicon GPU). Utilisez `cpu` sur macOS.

| Variable | Défaut | Description |
|---|---|---|
| `ASR__WHISPERX__MODEL_SIZE` | `base` | `tiny` · `base` · `small` · `medium` · `large-v2` — plus grand = plus précis, plus lent |
| `ASR__WHISPERX__DEVICE` | `cpu` | `cpu` ou `cuda` |
| `ASR__WHISPERX__COMPUTE_TYPE` | `int8` | `int8` · `float16` · `float32` |
| `ASR__WHISPERX__LANGUAGE` | `en` | Code de langue pour la transcription |

### Alignement & Notation

> Utilise PyTorch — MPS **est** supporté sur Apple Silicon.

| Variable | Défaut | Description |
|---|---|---|
| `ALIGNMENT__WAV2VEC2__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `ALIGNMENT__WAV2VEC2__LANGUAGE` | `en` | Code de langue — doit correspondre à `ASR__WHISPERX__LANGUAGE` |
| `SCORING__PHONEME__DEVICE` | `cpu` | `cpu` · `cuda` · `mps` |
| `SCORING__PHONEME__LANGUAGE` | `en-us` | Code de langue espeak (`en-us` · `fr-fr` · `de` · `ja` …) |
| `SCORING__PHONEME__ACCURACY_WEIGHT` | `0.5` | Poids de la précision |
| `SCORING__PHONEME__FLUENCY_WEIGHT` | `0.3` | Poids de la fluidité |
| `SCORING__PHONEME__COMPLETENESS_WEIGHT` | `0.2` | Poids de la complétude |

### Stockage

| Variable | Défaut | Description |
|---|---|---|
| `STORAGE__BACKEND` | `local` | `local` ou `s3` |
| `STORAGE__LOCAL_DIR` | `storage` | Répertoire local pour les fichiers audio et enregistrements |
| `STORAGE__S3_BUCKET` | — | Nom du bucket S3 (quand `STORAGE__BACKEND=s3`) |
| `STORAGE__S3_PREFIX` | `echoic/` | Préfixe de clé S3 |

### LLM (optionnel)

Requis uniquement pour la fonctionnalité « Traduction & Analyse ».

| Variable | Défaut | Description |
|---|---|---|
| `LLM__BACKEND` | — | `openai` ou `ollama` — laisser vide pour désactiver |
| `LLM__OPENAI__API_KEY` | — | Clé API OpenAI |
| `LLM__OPENAI__MODEL` | `gpt-4o-mini` | Nom du modèle |
| `LLM__OPENAI__BASE_URL` | `https://api.openai.com/v1` | Tout point de terminaison compatible OpenAI |
| `LLM__OLLAMA__BASE_URL` | `http://localhost:11434` | URL du serveur Ollama |
| `LLM__OLLAMA__MODEL` | `llama3` | Nom du modèle Ollama |
| `LLM__OLLAMA__NUM_CTX` | `512` | Taille du contexte (512 suffit pour l'analyse de phrases) |
| `LLM__OLLAMA__THINK` | `false` | Activer le mode de réflexion (ex. qwen3) |

---

## Développement

```bash
# Terminal 1 — base de données (port 5433)
docker compose up db

# Terminal 2 — backend avec rechargement à chaud
make dev-backend

# Terminal 3 — frontend avec HMR
make dev-frontend
```

Ouvrez **http://localhost:5173**. Le serveur de développement proxie `/api` vers le backend sur le port 8000.

---

## Raccourcis clavier

Disponibles sur la page de pratique :

| Touche | Action |
|---|---|
| `Space` | Lire / mettre en pause l'audio original |
| `R` | Démarrer / terminer l'enregistrement |
| `Entrée` | Soumettre pour évaluation |
| `← →` | Phrase précédente / suivante |
| `Échap` | Annuler l'enregistrement |

---

## Sauvegarde des données

Toutes les données sont stockées à deux endroits :

- **Base de données** : Volume Docker `postgres_data` (enregistrements, scores, états des phrases)
- **Fichiers audio** : Volume Docker `storage` (fichiers audio uploadés et enregistrements)

Copiez les deux volumes lors d'une migration ou d'une sauvegarde.

---

## Licence

[MIT](./LICENSE)
