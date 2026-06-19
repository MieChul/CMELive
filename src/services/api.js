import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export default api

export const auth = {
  local: (body) => api.post('/api/auth/local', body),
  ssoStatus: () => api.get('/api/auth/sso/status'),
  me: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
}

export const surveys = {
  list: (params) => api.get('/api/surveys', { params }),
  mine: () => api.get('/api/surveys/mine'),
  get: (id) => api.get(`/api/surveys/${id}`),
  create: (body) => api.post('/api/surveys', body),
  update: (id, body) => api.put(`/api/surveys/${id}`, body),
  remove: (id) => api.delete(`/api/surveys/${id}`),
  respond: (id, answers) => api.post(`/api/surveys/${id}/respond`, { answers }),
  vote: (id) => api.post(`/api/surveys/${id}/vote`),
  responses: (id) => api.get(`/api/surveys/${id}/responses`),
  analytics: (id) => api.get(`/api/surveys/${id}/analytics`),
  exportXlsx: (id) =>
    api.get(`/api/surveys/${id}/export`, { responseType: 'blob' }),
  uploadImage: (file) => {
    const form = new FormData()
    form.append('image', file)
    return api.post('/api/surveys/upload-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const ai = {
  review: (body) => api.post('/api/ai/review', body),
  latestNews: () => api.get('/api/ai/latest-news'),
}

export const news = {
  list: () => api.get('/api/news'),
  listPublic: () => api.get('/api/news/public'),
  update: (id, body) => api.put(`/api/news/${id}`, body),
  remove: (id) => api.delete(`/api/news/${id}`),
  recordView: (id) => api.post(`/api/news/${id}/view`),
  recordShare: (id) => api.post(`/api/news/${id}/share`),
  like: (id, action = 'like') => api.post(`/api/news/${id}/like`, { action }),
}

export const admin = {
  runNewsAgent: (body = {}) => api.post('/api/admin/news-agent/run', body),
  getConfig: () => api.get('/api/admin/config'),
  updateConfig: (body) => api.put('/api/admin/config', body),
  getSourceCatalog: () => api.get('/api/admin/source-catalog'),
  listUsers: () => api.get('/api/admin/users'),
  updateUserRole: (id, roles) => api.patch(`/api/admin/users/${id}/role`, { roles }),
}

export const testimonials = {
  publicList: () => api.get('/api/testimonials'),
  adminList: () => api.get('/api/admin/testimonials'),
  create: (body) => api.post('/api/admin/testimonials', body),
  update: (id, body) => api.put(`/api/admin/testimonials/${id}`, body),
  remove: (id) => api.delete(`/api/admin/testimonials/${id}`),
  uploadImage: (file) => {
    const form = new FormData()
    form.append('image', file)
    return api.post('/api/admin/testimonials/upload-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const cornerOffice = {
  publicList: () => api.get('/api/corner-office'),
  adminList: () => api.get('/api/admin/corner-office'),
  create: (body) => api.post('/api/admin/corner-office', body),
  update: (id, body) => api.put(`/api/admin/corner-office/${id}`, body),
  remove: (id) => api.delete(`/api/admin/corner-office/${id}`),
  uploadImage: (file, onUploadProgress) => {
    const form = new FormData()
    form.append('image', file)
    return api.post('/api/admin/corner-office/upload-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
  },
  uploadVideo: (file, onUploadProgress) => {
    const form = new FormData()
    form.append('video', file)
    return api.post('/api/admin/corner-office/upload-video', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    })
  },
}

export const keyMoments = {
  publicList: () => api.get('/api/key-moments'),
  adminList: () => api.get('/api/admin/key-moments'),
  fetchNow: (body = {}) => api.post('/api/admin/key-moments/fetch', body),
  update: (id, body) => api.put(`/api/admin/key-moments/${id}`, body),
  remove: (id) => api.delete(`/api/admin/key-moments/${id}`),
  recordView: (id) => api.post(`/api/key-moments/${id}/view`),
  recordShare: (id) => api.post(`/api/key-moments/${id}/share`),
  like: (id, action = 'like') => api.post(`/api/key-moments/${id}/like`, { action }),
}
