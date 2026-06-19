import { all, get, run } from '../config/db.js'

function serialize(u) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    profilePicUrl: u.profilePicUrl || null,
    ssoObjectId: u.ssoObjectId || null,
    isAdmin: !!u.isAdmin,
    roles: u.isAdmin ? ['admin'] : [],
    createdDate: u.createdDate,
    updatedDate: u.updatedDate,
  }
}

/**
 * GET /api/admin/users
 * Returns the full user list (admin-only).
 */
export async function listUsers(req, res) {
  try {
    const rows = await all(
      'SELECT id, email, displayName, profilePicUrl, ssoObjectId, isAdmin, createdDate, updatedDate FROM users ORDER BY displayName',
    )
    return res.json({ ok: true, users: rows.map(serialize) })
  } catch (err) {
    console.error('[admin/users] list failed:', err)
    return res.status(500).json({ error: 'Failed to load users' })
  }
}

/**
 * PATCH /api/admin/users/:id/role
 * Body: { roles: string[] } — currently only 'admin' is recognized.
 */
export async function updateUserRole(req, res) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid user id' })
  }

  const roles = Array.isArray(req.body?.roles) ? req.body.roles.map(String) : null
  if (!roles) {
    return res.status(400).json({ error: 'roles must be an array' })
  }
  const nextIsAdmin = roles.includes('admin') ? 1 : 0

  try {
    const target = await get('SELECT id, isAdmin FROM users WHERE id = ?', [id])
    if (!target) return res.status(404).json({ error: 'User not found' })

    // Guard: cannot demote yourself
    if (req.user && req.user.id === id && target.isAdmin && !nextIsAdmin) {
      return res.status(400).json({ error: 'You cannot remove the Admin role from yourself' })
    }

    // Guard: cannot remove the last remaining admin
    if (target.isAdmin && !nextIsAdmin) {
      const row = await get('SELECT COUNT(*) AS c FROM users WHERE isAdmin = 1')
      const count = Number(row?.c ?? 0)
      if (count <= 1) {
        return res.status(400).json({ error: 'At least one admin must remain' })
      }
    }

    await run(
      'UPDATE users SET isAdmin = ?, updatedDate = ?, updatedBy = ? WHERE id = ?',
      [nextIsAdmin, new Date().toISOString(), req.user?.email ?? 'admin', id],
    )
    const updated = await get(
      'SELECT id, email, displayName, profilePicUrl, ssoObjectId, isAdmin, createdDate, updatedDate FROM users WHERE id = ?',
      [id],
    )
    return res.json({ ok: true, user: serialize(updated) })
  } catch (err) {
    console.error('[admin/users] role update failed:', err)
    return res.status(500).json({ error: 'Failed to update role' })
  }
}
