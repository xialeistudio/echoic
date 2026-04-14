import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const audioApi = {
  upload: (file, { compress = false, collectionId = null } = {}) => {
    const form = new FormData()
    form.append('file', file)
    const params = new URLSearchParams({ compress })
    if (collectionId) params.set('collection_id', collectionId)
    return api.post(`/audio/upload?${params}`, form)
  },
  importFromUrl: (url, title, { compress = false, collectionId = null } = {}) =>
    api.post(`/audio/from-url?compress=${compress}`, { url, title, collection_id: collectionId || null }),
  get: (audioFileId) => api.get(`/audio/${audioFileId}`),
  list: () => api.get('/audio'),
  rename: (audioFileId, title, language) => api.patch(`/audio/${audioFileId}`, { title, language }),
  delete: (audioFileId) => api.delete(`/audio/${audioFileId}`),
  streamUrl: (audioFileId) => `/api/audio/${audioFileId}/stream`,
  getPhonemes: (audioFileId, sentenceIndex) =>
    api.get(`/audio/${audioFileId}/sentence/${sentenceIndex}/phonemes`),
  analyze: (audioFileId, sentenceIndex, { lang } = {}) =>
    api.post(`/audio/${audioFileId}/sentence/${sentenceIndex}/analyze${lang ? `?lang=${lang}` : ''}`),
  toggleBookmark: (audioFileId, sentenceIndex) =>
    api.post(`/audio/${audioFileId}/sentence/${sentenceIndex}/bookmark`),
  toggleMastered: (audioFileId, sentenceIndex) =>
    api.post(`/audio/${audioFileId}/sentence/${sentenceIndex}/master`),
}

export const practiceApi = {
  saveRecording: (audioFileId, sentenceIndex, blob) => {
    const form = new FormData()
    form.append('file', blob, 'recording.webm')
    return api.post(`/practice/${audioFileId}/sentence/${sentenceIndex}/save`, form)
  },
  scoreRecording: (recordId) => api.post(`/practice/record/${recordId}/score`),
  getHistory: (audioFileId, sentenceIndex) =>
    api.get(`/practice/${audioFileId}/sentence/${sentenceIndex}/history`),
  recordStreamUrl: (recordId) => `/api/practice/record/${recordId}/stream`,
  deleteRecord: (recordId) => api.delete(`/practice/record/${recordId}`),
}

export const collectionApi = {
  list: () => api.get('/collections'),
  create: (name) => api.post('/collections', { name }),
  rename: (id, name) => api.put(`/collections/${id}`, { name }),
  delete: (id) => api.delete(`/collections/${id}`),
}

export const statsApi = {
  getSummary: () => api.get('/stats/summary'),
  getHeatmap: () => api.get('/stats/heatmap'),
  getRecent: (limit = 20) => api.get(`/stats/recent?limit=${limit}`),
}

export const galleryApi = {
  list: ({ source, level, program } = {}) => {
    const params = new URLSearchParams()
    if (source) params.set('source', source)
    if (level) params.set('level', level)
    if (program) params.set('program', program)
    const qs = params.toString()
    return api.get(`/gallery${qs ? `?${qs}` : ''}`)
  },
}
