import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { requireAdmin } from '../middleware/auth.js'
import {
  listPublicTestimonials,
  listAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from '../controllers/testimonialController.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadDir = join(__dirname, '..', 'uploads')
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true })

const ALLOWED_IMAGE = /^image\/(jpeg|jpg|pjpeg|png|gif|webp)$/i
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = `testimonial-${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    cb(null, safe)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && ALLOWED_IMAGE.test(file.mimetype)) return cb(null, true)
    cb(new Error('Only image uploads are allowed (JPEG, PNG, GIF, WebP)'))
  },
})

/* Public — mounted at /api/testimonials */
const publicRouter = Router()
publicRouter.get('/', listPublicTestimonials)

/* Admin — mounted at /api/admin/testimonials (guarded by requireAdmin) */
const adminRouter = Router()
adminRouter.get('/',             requireAdmin, listAllTestimonials)
adminRouter.post('/',            requireAdmin, createTestimonial)
adminRouter.put('/:id(\\d+)',    requireAdmin, updateTestimonial)
adminRouter.delete('/:id(\\d+)', requireAdmin, deleteTestimonial)
adminRouter.post('/upload-image', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'file required' })
    res.json({ imageUrl: `/uploads/${req.file.filename}` })
  })
})

export { publicRouter as testimonialsPublicRoutes, adminRouter as testimonialsAdminRoutes }
