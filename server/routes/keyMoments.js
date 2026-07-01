import { Router } from 'express'
import { requireAdmin, optionalAuth } from '../middleware/auth.js'
import {
  listKeyMoments,
  listPublicKeyMoments,
  streamPublicKeyMomentPlayback,
  streamAdminKeyMomentPlayback,
  fetchKeyMoments,
  updateKeyMoment,
  deleteKeyMoment,
  recordKeyMomentView,
  recordKeyMomentShare,
  likeKeyMoment,
  diagnoseKeyMomentPlayback,
} from '../controllers/keyMomentsController.js'

const publicRouter = Router()
publicRouter.get('/', optionalAuth, listPublicKeyMoments)
publicRouter.get('/:id(\\d+)/playback', streamPublicKeyMomentPlayback)
publicRouter.post('/:id(\\d+)/view',  optionalAuth, recordKeyMomentView)
publicRouter.post('/:id(\\d+)/share', recordKeyMomentShare)
publicRouter.post('/:id(\\d+)/like',  optionalAuth, likeKeyMoment)

const adminRouter = Router()
adminRouter.get('/',              requireAdmin, listKeyMoments)
adminRouter.get('/:id(\\d+)/playback', requireAdmin, streamAdminKeyMomentPlayback)
adminRouter.get('/:id(\\d+)/diagnose', requireAdmin, diagnoseKeyMomentPlayback)
adminRouter.post('/fetch',        requireAdmin, fetchKeyMoments)
adminRouter.put('/:id(\\d+)',     requireAdmin, updateKeyMoment)
adminRouter.delete('/:id(\\d+)',  requireAdmin, deleteKeyMoment)

export { publicRouter as keyMomentsPublicRoutes, adminRouter as keyMomentsAdminRoutes }
