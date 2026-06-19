import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { requireAdmin } from '../middleware/auth.js'
import {
  listPublicConversations,
  listAllConversations,
  createConversation,
  updateConversation,
  deleteConversation,
} from '../controllers/cornerOfficeController.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadRoot = join(__dirname, '..', 'uploads')
const uploadDir = join(uploadRoot, 'cornerOffice')
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })

const ALLOWED_IMAGE = /^image\/(jpeg|jpg|pjpeg|png|gif|webp)$/i
const ALLOWED_VIDEO = /^video\/(mp4|quicktime|webm)$/i

const sanitize = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `co-img-${Date.now()}-${sanitize(file.originalname)}`),
})
const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && ALLOWED_IMAGE.test(file.mimetype)) return cb(null, true)
    cb(new Error('Only image uploads are allowed (JPEG, PNG, GIF, WebP)'))
  },
})

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `co-vid-${Date.now()}-${sanitize(file.originalname)}`),
})
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype && ALLOWED_VIDEO.test(file.mimetype)) return cb(null, true)
    cb(new Error('Only MP4, WebM or MOV videos are allowed'))
  },
})

/* Public — mounted at /api/corner-office */
const publicRouter = Router()
publicRouter.get('/', listPublicConversations)

/* Admin — mounted at /api/admin/corner-office (guarded by requireAdmin) */
const adminRouter = Router()
adminRouter.get('/',             requireAdmin, listAllConversations)
adminRouter.post('/',            requireAdmin, createConversation)
adminRouter.put('/:id(\\d+)',    requireAdmin, updateConversation)
adminRouter.delete('/:id(\\d+)', requireAdmin, deleteConversation)

adminRouter.post('/upload-image', requireAdmin, (req, res) => {
  uploadImage.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'file required' })
    res.json({ imageUrl: `/uploads/cornerOffice/${req.file.filename}` })
  })
})

adminRouter.post('/upload-video', requireAdmin, (req, res) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'file required' })
    res.json({ videoUrl: `/uploads/cornerOffice/${req.file.filename}` })
  })
})

export { publicRouter as cornerOfficePublicRoutes, adminRouter as cornerOfficeAdminRoutes }
