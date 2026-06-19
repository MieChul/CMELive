import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import {
  triggerNewsAgent,
  getAgentConfig,
  updateAgentConfig,
  getSourceCatalog,
} from '../controllers/adminController.js'
import { listUsers, updateUserRole } from '../controllers/userController.js'

const r = Router()

r.post('/news-agent/run',  requireAdmin, triggerNewsAgent)
r.get('/config',           requireAdmin, getAgentConfig)
r.put('/config',           requireAdmin, updateAgentConfig)
r.get('/source-catalog',   requireAdmin, getSourceCatalog)

r.get('/users',            requireAdmin, listUsers)
r.patch('/users/:id/role', requireAdmin, updateUserRole)

export default r
