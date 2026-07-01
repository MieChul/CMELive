import { Router } from 'express'
import multer from 'multer'
import { checkFileMagicBytesFromBuffer, ALLOWED_IMAGE_MIMES } from '../utils/upload.js'
import { uploadBuffer } from '../services/imageStorageService.js'
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

const ALLOWED_IMAGE = /^image\/(jpeg|jpg|pjpeg|png|gif|webp)$/i

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && ALLOWED_IMAGE.test(file.mimetype)) return cb(null, true)
    cb(new Error('Only image uploads are allowed (JPEG, PNG, GIF, WebP)'))
  },
})

const r = Router()
r.get('/', optionalAuth, listSurveys)
r.get('/mine', requireAuth, listMySurveys)
r.post('/upload-image', requireAuth, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'file required' })

    const valid = await checkFileMagicBytesFromBuffer(req.file.buffer, ALLOWED_IMAGE_MIMES)
    if (!valid) return res.status(400).json({ error: 'File content does not match an allowed image type' })

    const filename = `survey-img-${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const objectPath = `surveys/${filename}`
    const uploaded = await uploadBuffer(req.file.buffer, objectPath, req.file.mimetype)

    const imageUrl = uploaded ? `/api/media/${objectPath}` : `/uploads/${filename}`
    res.json({ imageUrl })
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
