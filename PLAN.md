# 内容广场：多 Provider RSS 集成（VOA 先行，LibriVox 预留）

## Context

在 Echoic 中新增"内容广场"，让用户直接浏览 VOA Learning English 等公有领域内容并一键导入练习。架构设计为多 provider，VOA 先实现，LibriVox 后续只需新增一个文件。

---

## 架构：Provider 模式

```
backend/app/services/gallery/
├── base.py          # 抽象基类 ContentProvider + GalleryEpisode schema
├── voa.py           # VOA Learning English 实现（本期）
└── librivox.py      # LibriVox 实现（后期，只需新建此文件）
```

新增 provider = 新建文件 + 路由中加一行注册，不改其他代码。

---

## GalleryEpisode Schema（base.py）

```python
class GalleryEpisode(BaseModel):
    title: str
    description: str       # 摘要，前端 2 行截断
    audio_url: str         # 直链 mp3
    pub_date: str          # ISO 格式
    duration: str | None   # "mm:ss" 或 None
    program: str           # 节目显示名
    program_id: str        # slug，用于筛选
    level: str             # "beginner" | "elementary" | "intermediate" | "upper-intermediate"
    source: str            # "voa" | "librivox"
    source_label: str      # "VOA Learning English"

class ContentProvider(ABC):
    source: str
    source_label: str
    @abstractmethod
    async def fetch(self) -> list[GalleryEpisode]: ...
```

---

## VOA 节目列表（10 个，voa.py 中硬编码）

| program_id | 显示名 | 难度 | 更新频率 |
|---|---|---|---|
| `how-to-pronounce` | How to Pronounce | beginner | 频繁 |
| `english-in-a-minute` | English in a Minute | beginner | 频繁 |
| `everyday-grammar` | Everyday Grammar | elementary | 每周 |
| `words-and-their-stories` | Words and Their Stories | elementary | 每周 |
| `ask-a-teacher` | Ask a Teacher | elementary | 每周 |
| `news-words` | News Words | elementary | 每周 |
| `as-it-is` | As It Is | intermediate | 每天 |
| `health-lifestyle` | Health & Lifestyle | intermediate | 每天 |
| `american-stories` | American Stories | intermediate | 每周 |
| `science-technology` | Science & Technology | upper-intermediate | 每周 |

> RSS URL 实现时通过 VOA 订阅页逐个验证，通常为 `https://learningenglish.voanews.com/api/z.../rss.xml`。验证 `<enclosure>` 字段含 mp3 链接。

---

## 缓存策略

每个 provider 独立缓存：
```python
_cache: dict[str, dict] = {}
# {"voa": {"data": [...], "fetched_at": datetime}}
CACHE_TTL = 3600  # 1 小时
```

---

## API 设计

```
GET /api/gallery
  ?source=voa                    # 可选，不传返回所有 provider
  ?level=beginner                # 可选，难度筛选
  ?program=everyday-grammar      # 可选，节目筛选

响应：
{
  "sources": [{"id": "voa", "label": "VOA Learning English"}],
  "programs": [{"id": "...", "name": "...", "level": "...", "source": "voa"}],
  "episodes": [ GalleryEpisode, ... ],
  "cached_at": "2026-04-14T10:00:00Z"
}
```

---

## 文件清单

| 文件 | 操作 |
|---|---|
| `backend/app/services/gallery/base.py` | 新建 |
| `backend/app/services/gallery/voa.py` | 新建 |
| `backend/app/api/routes/gallery.py` | 新建 |
| `backend/app/main.py` | 注册路由 |
| `frontend/src/pages/Gallery.jsx` | 新建 |
| `frontend/src/App.jsx` | 添加路由 `/gallery` |
| `frontend/src/components/Layout/index.jsx` | 添加导航项 |
| `frontend/src/api/index.js` | 添加 `galleryApi` |
| `frontend/src/i18n/locales/en.json` | 添加 `gallery.*` 键 |
| `frontend/src/i18n/locales/zh-CN.json` | 同上 |
| `frontend/src/i18n/locales/zh-TW.json` | 同上 |

---

## 前端页面设计

```
[来源 pills: 全部 | VOA]
[难度 pills: 全部 | 入门 | 初中级 | 中级 | 中高级]
[节目 pills: 全部 | How to Pronounce | Everyday Grammar | ...]   ← 随来源/难度联动

[卡片网格]
  ┌──────────────────────────┐
  │ VOA · Everyday Grammar   │  ← source · program（小字）
  │ The Uses of "Have Been"  │  ← 标题
  │ In this lesson, we ex... │  ← 描述 2 行截断
  │ 3:45 · Apr 10 · 初中级   │  ← 时长 · 日期 · 难度 badge
  │ [合集 ▾]  [导入练习]     │
  └──────────────────────────┘
```

- 每张卡片独立状态：`idle → importing（显示 step）→ done（跳转）/ error`
- 导入逻辑复用 `AudioUpload/index.jsx` 的 SSE fetch 模式
- 合集选择复用已有 `collections` 数据

---

## i18n 键（gallery.*）

```json
"gallery": {
  "title": "Content Square",
  "allSources": "All Sources",
  "allLevels": "All Levels",
  "allPrograms": "All Programs",
  "beginner": "Beginner",
  "elementary": "Elementary",
  "intermediate": "Intermediate",
  "upperIntermediate": "Upper Intermediate",
  "import": "Import",
  "importing": "Importing…",
  "noEpisodes": "No episodes found",
  "loadFailed": "Failed to load content"
}
```

---

## 验证方式

1. `curl http://localhost:8000/api/gallery` → 返回 episodes，`audio_url` 是有效 mp3
2. `?level=beginner` / `?program=everyday-grammar` 筛选生效
3. 前端三层 pill 联动过滤正确
4. 点击"导入练习" → SSE 进度 → 跳转 `/speaking/:id` → 可播放、有句子列表
5. 导入时选合集 → 音频出现在正确合集下
6. 1 小时内再次请求 → `cached_at` 不变（缓存生效）
