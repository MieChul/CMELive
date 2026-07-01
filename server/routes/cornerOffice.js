import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { unlink } from 'fs/promises'
import { requireAdmin } from '../middleware/auth.js'
import {
  checkFileMagicBytesFromBuffer,
  checkFileMagicBytes,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
} from '../utils/upload.js'
import { uploadBuffer, uploadLocalFile } from '../services/imageStorageService.js'
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

// Images use memoryStorage — buffer is uploaded directly to GCS (no disk temp file)
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && ALLOWED_IMAGE.test(file.mimetype)) return cb(null, true)
    cb(new Error('Only image uploads are allowed (JPEG, PNG, GIF, WebP)'))
  },
})

// Videos use diskStorage — too large to buffer in memory; streamed from disk to GCS
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `co-vid-${Date.now()}-${sanitize(file.originalname)}`),
})
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
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
  uploadImage.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'file required' })

    const valid = await checkFileMagicBytesFromBuffer(req.file.buffer, ALLOWED_IMAGE_MIMES)
    if (!valid) return res.status(400).json({ error: 'File content does not match an allowed image type' })

    const filename = `co-img-${Date.now()}-${sanitize(req.file.originalname)}`
    const objectPath = `cornerOffice/${filename}`
    const uploaded = await uploadBuffer(req.file.buffer, objectPath, req.file.mimetype)

    const imageUrl = uploaded ? `/api/media/${objectPath}` : `/uploads/cornerOffice/${filename}`
    res.json({ imageUrl })
  })
})

adminRouter.post('/upload-video', requireAdmin, (req, res) => {
  uploadVideo.single('video')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'file required' })

    const localPath = req.file.path
    try {
      const valid = await checkFileMagicBytes(localPath, ALLOWED_VIDEO_MIMES)
      if (!valid) {
        await unlink(localPath).catch(() => {})
        return res.status(400).json({ error: 'File content does not match an allowed video type' })
      }

      const objectPath = `cornerOffice/${req.file.filename}`
      const uploaded = await uploadLocalFile(localPath, objectPath, req.file.mimetype)

      if (uploaded) {
        await unlink(localPath).catch(() => {})
        return res.json({ videoUrl: `/api/media/${objectPath}` })
      }

      // No GCS configured (dev) — serve from local disk
      res.json({ videoUrl: `/uploads/cornerOffice/${req.file.filename}` })
    } catch (e) {
      await unlink(localPath).catch(() => {})
      res.status(500).json({ error: e.message || 'Video upload failed' })
    }
  })
})

export { publicRouter as cornerOfficePublicRoutes, adminRouter as cornerOfficeAdminRoutes }
