import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import {
  listSurveys,
  getSurvey,
  createSurvey,
  updateSurvey,
  deleteSurvey,
  listMySurveys,
  postRespond,
  postVote,
  getResponses,
  getAnalytics,
  exportExcel,
} from '../controllers/surveyController.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadDir = join(__dirname, '..', 'uploads')
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })
const ALLOWED_IMAGE = /^image\/(jpeg|jpg|pjpeg|png|gif|webp)$/i

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    cb(null, safe)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && ALLOWED_IMAGE.test(file.mimetype)) {
      return cb(null, true)
    }
    cb(new Error('Only image uploads are allowed (JPEG, PNG, GIF, WebP)'))
  },
})

const r = Router()
r.get('/', optionalAuth, listSurveys)
r.get('/mine', requireAuth, listMySurveys)
r.post('/upload-image', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'file required' })
    const publicUrl = `/uploads/${req.file.filename}`
    res.json({ imageUrl: publicUrl })
  })
})
r.get('/:id(\\d+)', optionalAuth, getSurvey)
r.post('/', requireAuth, createSurvey)
r.put('/:id(\\d+)', requireAuth, updateSurvey)
r.delete('/:id(\\d+)', requireAuth, deleteSurvey)
r.post('/:id(\\d+)/respond', requireAuth, postRespond)
r.post('/:id(\\d+)/vote', requireAuth, postVote)
r.get('/:id(\\d+)/responses', requireAuth, getResponses)
r.get('/:id(\\d+)/analytics', requireAuth, getAnalytics)
r.get('/:id(\\d+)/export', requireAuth, exportExcel)

export default r
