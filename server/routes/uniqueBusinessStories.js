import { Router } from 'express'
import multer from 'multer'
import { requireAdmin } from '../middleware/auth.js'
import { checkFileMagicBytesFromBuffer, ALLOWED_IMAGE_MIMES } from '../utils/upload.js'
import { uploadBuffer } from '../services/imageStorageService.js'
import {
  listPublicStories,
  listAllStories,
  createStory,
  updateStory,
  deleteStory,
} from '../controllers/uniqueBusinessStoriesController.js'

const ALLOWED_IMAGE = /^image\/(jpeg|jpg|pjpeg|png|gif|webp)$/i

const sanitize = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && ALLOWED_IMAGE.test(file.mimetype)) return cb(null, true)
    cb(new Error('Only image uploads are allowed (JPEG, PNG, GIF, WebP)'))
  },
})

/* Public — mounted at /api/unique-business-stories */
const publicRouter = Router()
publicRouter.get('/', listPublicStories)

/* Admin — mounted at /api/admin/unique-business-stories (guarded by requireAdmin) */
const adminRouter = Router()
adminRouter.get('/',             requireAdmin, listAllStories)
adminRouter.post('/',            requireAdmin, createStory)
adminRouter.put('/:id(\\d+)',    requireAdmin, updateStory)
adminRouter.delete('/:id(\\d+)', requireAdmin, deleteStory)

adminRouter.post('/upload-image', requireAdmin, (req, res) => {
  uploadImage.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'file required' })

    const valid = await checkFileMagicBytesFromBuffer(req.file.buffer, ALLOWED_IMAGE_MIMES)
    if (!valid) return res.status(400).json({ error: 'File content does not match an allowed image type' })

    const filename = `ubs-img-${Date.now()}-${sanitize(req.file.originalname)}`
    const objectPath = `uniqueBusinessStories/${filename}`
    const uploaded = await uploadBuffer(req.file.buffer, objectPath, req.file.mimetype)

    const imageUrl = uploaded ? `/api/media/${objectPath}` : `/uploads/uniqueBusinessStories/${filename}`
    res.json({ imageUrl })
  })
})

export {
  publicRouter as uniqueBusinessStoriesPublicRoutes,
  adminRouter as uniqueBusinessStoriesAdminRoutes,
}
