import { all, get, run } from '../config/db.js'
import { isSurveyActive } from '../utils/survey.js'

const toIso = (v) => v instanceof Date ? v.toISOString() : (v ?? null)
import { analyzeSentiment } from '../services/openaiService.js'
import { buildResponseWorkbook } from '../services/excelService.js'

const VALID_SORTS = new Set(['latest', 'votes'])
const VALID_FILTERS = new Set(['all', 'unresponded'])
const VALID_STATUSES = new Set(['active', 'inactive', 'scheduled'])
const MAX_TITLE = 200
const MAX_DESCRIPTION = 5000
const MAX_QUESTION_TEXT = 500
const MAX_OPTION_TEXT = 200
const MAX_ANSWER_TEXT = 10000
const MAX_QUESTIONS = 50

function validateImageUrl(v) {
  if (v == null || v === '') return null
  const s = String(v).trim()
  if (s === '') return null
  if (/^\/uploads\/[\w._-]+$/.test(s)) return s
  if (/^\/api\/media\/surveys\/[\w._-]+$/.test(s)) return s
  return 'INVALID'
}

function validateIsoDate(v) {
  if (v == null || v === '') return true
  return !Number.isNaN(new Date(String(v)).getTime())
}

function mapSurveyRow(row, extra = {}) {
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    status: row.status,
    activeFromDate:
      row.activeFromDate != null ? toIso(row.activeFromDate) : row.activeFromDate,
    activeToDate:
      row.activeToDate != null ? toIso(row.activeToDate) : row.activeToDate,
    aiReviewScore: row.aiReviewScore,
    isReviewed: Boolean(row.isReviewed),
    createdDate: toIso(row.createdDate),
    ...extra,
  }
}

function parseOptions(q) {
  try {
    return q.optionsJson ? JSON.parse(q.optionsJson) : []
  } catch {
    return []
  }
}

function mapQuestionRow(q) {
  let suggestion = null
  try {
    suggestion = q.aiSuggestionJson ? JSON.parse(q.aiSuggestionJson) : null
  } catch {
    suggestion = null
  }
  return {
    id: q.id,
    surveyId: q.surveyId,
    questionText: q.questionText,
    questionType: q.questionType,
    isRequired: Boolean(q.isRequired),
    orderIndex: q.orderIndex,
    options: parseOptions(q),
    aiConfidenceScore: q.aiConfidenceScore,
    aiSuggestionJson: suggestion,
  }
}

/**
 * GET /api/surveys
 */
export async function listSurveys(req, res) {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const cursor = Number(req.query.cursor) || 0
    const sort = VALID_SORTS.has(req.query.sort) ? req.query.sort : 'latest'
    const filter = VALID_FILTERS.has(req.query.filter) ? req.query.filter : 'all'
    const owner = req.query.owner
    const userId = req.user?.id ?? null

    // Fully static SQL — all conditions controlled by nullable parameters.
    // ? IS NULL short-circuits the condition when the filter doesn't apply.
    const ownerFilter  = (owner === 'me' && userId) ? userId : null
    const unrespondedFilter = (filter === 'unresponded' && userId) ? userId : null
    const cursorFilter = cursor || null

    const countSql = `
      SELECT COUNT(*) AS total
      FROM surveys s
      WHERE (? IS NULL OR s."createdByUserId" = ?)
        AND (? IS NULL OR (
              s."createdByUserId" != ?
              AND NOT EXISTS (
                SELECT 1 FROM responses r
                WHERE r."surveyId" = s.id AND r."respondentUserId" = ?
              )
            ))`
    const countParams = [ownerFilter, ownerFilter, unrespondedFilter, unrespondedFilter, unrespondedFilter]
    const totalRow = await get(countSql, countParams)
    const total = totalRow?.total ?? 0

    const sql = `
      SELECT s.*,
        (SELECT COUNT(*) FROM survey_votes v WHERE v."surveyId" = s.id) AS vote_count,
        (SELECT COUNT(*) FROM responses r WHERE r."surveyId" = s.id) AS response_count,
        (SELECT COUNT(*) FROM questions q WHERE q."surveyId" = s.id) AS question_count,
        u."displayName" AS ownerName,
        u."profilePicUrl" AS ownerProfilePicUrl,
        (SELECT EXISTS (
          SELECT 1 FROM responses r2
          WHERE r2."surveyId" = s.id AND r2."respondentUserId" = ?
        )) AS user_has_responded
      FROM surveys s
      JOIN users u ON u.id = s."createdByUserId"
      WHERE (? IS NULL OR s."createdByUserId" = ?)
        AND (? IS NULL OR (
              s."createdByUserId" != ?
              AND NOT EXISTS (
                SELECT 1 FROM responses r
                WHERE r."surveyId" = s.id AND r."respondentUserId" = ?
              )
            ))
        AND (? IS NULL OR s.id < ?)
      ORDER BY
        CASE WHEN ? = 'votes'  THEN (SELECT COUNT(*) FROM survey_votes v2 WHERE v2."surveyId" = s.id) END DESC,
        CASE WHEN ? = 'latest' THEN EXTRACT(EPOCH FROM s."createdDate") END DESC,
        s.id DESC
      LIMIT ?`
    const params = [
      userId,
      ownerFilter, ownerFilter,
      unrespondedFilter, unrespondedFilter, unrespondedFilter,
      cursorFilter, cursorFilter,
      sort, sort,
      limit + 1,
    ]

    const rows = await all(sql, params)
    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? page[page.length - 1].id : null

    const now = new Date().toISOString()
    const items = page.map((row) => {
      const active = isSurveyActive(row, now)
      const hasResponded = Boolean(row.user_has_responded)
      let canRespond = active && userId && row.createdByUserId !== userId && !hasResponded
      return {
        ...mapSurveyRow(row, {
          voteCount: row.vote_count,
          responseCount: row.response_count,
          questionCount: row.question_count,
          ownerName: row.ownerName,
          ownerProfilePicUrl: row.ownerProfilePicUrl,
          isActiveForUser: active,
          canRespond,
          hasResponded,
          isOwner: userId === row.createdByUserId,
        }),
      }
    })

    res.json({ items, nextCursor, total })
  } catch (e) {
    console.error('[listSurveys]', e)
    res.status(500).json({ error: 'Failed to load surveys' })
  }
}

/**
 * GET /api/surveys/:id
 */
export async function getSurvey(req, res) {
  try {
    const id = Number(req.params.id)
    const row = await get(
      `SELECT s.*, u."displayName" AS ownerName, u."profilePicUrl" AS ownerProfilePicUrl
       FROM surveys s JOIN users u ON u.id = s."createdByUserId" WHERE s.id = ?`,
      [id],
    )
    if (!row) return res.status(404).json({ error: 'Not found' })
    const questionsRaw = await all('SELECT * FROM questions WHERE "surveyId" = ? ORDER BY "orderIndex" ASC, id ASC', [id])
    const questions = questionsRaw.map(mapQuestionRow)
    const userId = req.user?.id ?? null
    const now = new Date().toISOString()
    const active = isSurveyActive(row, now)
    let canRespond = active && userId && row.createdByUserId !== userId
    const hasRespondedRow = userId
      ? await get('SELECT 1 AS found FROM responses WHERE "surveyId" = ? AND "respondentUserId" = ?', [id, userId])
      : null
    const hasResponded = Boolean(hasRespondedRow)
    if (hasResponded) canRespond = false
    const voteCountRow = await get('SELECT COUNT(*) AS c FROM survey_votes WHERE "surveyId" = ?', [id])
    const responseCountRow = await get('SELECT COUNT(*) AS c FROM responses WHERE "surveyId" = ?', [id])
    res.json({
      survey: {
        ...mapSurveyRow(row, {
          ownerName: row.ownerName,
          ownerProfilePicUrl: row.ownerProfilePicUrl,
          canRespond,
          hasResponded,
          isOwner: userId === row.createdByUserId,
          voteCount: voteCountRow?.c ?? 0,
          responseCount: responseCountRow?.c ?? 0,
        }),
      },
      questions,
    })
  } catch (e) {
    console.error('[getSurvey]', e)
    res.status(500).json({ error: 'Failed to load survey' })
  }
}

/**
 * POST /api/surveys
 */
export async function createSurvey(req, res) {
  const userId = req.user.id
  const {
    title,
    description,
    imageUrl,
    status,
    activeFromDate,
    activeToDate,
    isReviewed,
    aiReviewScore,
    reviewJson,
    questions = [],
  } = req.body || {}
  if (!title || !description) {
    return res.status(400).json({ error: 'title and description are required' })
  }
  if (String(title).length > MAX_TITLE) {
    return res.status(400).json({ error: `title must be ${MAX_TITLE} characters or fewer` })
  }
  if (String(description).length > MAX_DESCRIPTION) {
    return res.status(400).json({ error: `description must be ${MAX_DESCRIPTION} characters or fewer` })
  }
  if (!isReviewed) {
    return res.status(400).json({ error: 'Survey must pass AI review before save' })
  }
  if (Array.isArray(questions) && questions.length > MAX_QUESTIONS) {
    return res.status(400).json({ error: `Survey cannot have more than ${MAX_QUESTIONS} questions` })
  }
  const safeImageUrl = validateImageUrl(imageUrl)
  if (safeImageUrl === 'INVALID') {
    return res.status(400).json({ error: 'imageUrl must be a server-uploaded path' })
  }
  const safeStatus = VALID_STATUSES.has(status) ? status : 'active'
  if (!validateIsoDate(activeFromDate) || !validateIsoDate(activeToDate)) {
    return res.status(400).json({ error: 'Invalid date format for activeFromDate or activeToDate' })
  }
  try {
    const r = await run(
      `INSERT INTO surveys ("createdByUserId", title, description, "imageUrl", status, "activeFromDate", "activeToDate",
       "aiReviewScore", "isReviewed", "reviewJson", "createdBy", "updatedBy")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, ?, 'api', 'api')`,
      [
        userId,
        String(title),
        String(description),
        safeImageUrl,
        safeStatus,
        activeFromDate || null,
        activeToDate || null,
        aiReviewScore != null ? Number(aiReviewScore) : null,
        reviewJson ? JSON.stringify(reviewJson) : null,
      ],
    )
    const surveyId = r.lastInsertRowid
    await insertQuestions(surveyId, questions)
    const survey = await get('SELECT * FROM surveys WHERE id = ?', [surveyId])
    res.status(201).json({ survey: mapSurveyRow(survey) })
  } catch (e) {
    console.error('[createSurvey]', e)
    res.status(500).json({ error: e.message || 'Failed to create survey' })
  }
}

async function insertQuestions(surveyId, questions) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const qText = String(q.questionText || '').slice(0, MAX_QUESTION_TEXT)
    const optionsJson = q.options ? JSON.stringify(q.options) : null
    const r = await run(
      `INSERT INTO questions ("surveyId", "questionText", "questionType", "isRequired", "orderIndex", "optionsJson",
        "aiConfidenceScore", "aiSuggestionJson", "createdBy", "updatedBy")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'api', 'api')`,
      [
        surveyId,
        qText,
        String(q.questionType),
        !!q.isRequired,
        q.orderIndex != null ? q.orderIndex : i,
        optionsJson,
        q.aiConfidenceScore != null ? Number(q.aiConfidenceScore) : null,
        q.aiSuggestionJson ? (typeof q.aiSuggestionJson === 'string' ? q.aiSuggestionJson : JSON.stringify(q.aiSuggestionJson)) : null,
      ],
    )
    const qid = r.lastInsertRowid
    if (Array.isArray(q.options) && ['single', 'multiple', 'dropdown'].includes(q.questionType)) {
      for (let j = 0; j < q.options.length; j++) {
        const opt = (typeof q.options[j] === 'string' ? q.options[j] : q.options[j]?.text || '').slice(0, MAX_OPTION_TEXT)
        if (opt) {
          await run(
            'INSERT INTO question_options ("questionId", "optionText", "orderIndex", "createdBy", "updatedBy") VALUES (?, ?, ?, ?, ?)',
            [qid, String(opt), j, 'api', 'api'],
          )
        }
      }
    }
  }
}

/**
 * PUT /api/surveys/:id
 */
export async function updateSurvey(req, res) {
  const id = Number(req.params.id)
  const s = await get('SELECT * FROM surveys WHERE id = ?', [id])
  if (!s) return res.status(404).json({ error: 'Not found' })
  if (s.createdByUserId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })

  const {
    title,
    description,
    imageUrl,
    status,
    activeFromDate,
    activeToDate,
    isReviewed,
    aiReviewScore,
    reviewJson,
    questions,
  } = req.body || {}

  if (isReviewed === false) {
    return res.status(400).json({ error: 'Invalid review state' })
  }
  if (questions && !isReviewed) {
    return res.status(400).json({ error: 'Must re-run AI review after edits' })
  }
  if (title != null && String(title).length > MAX_TITLE) {
    return res.status(400).json({ error: `title must be ${MAX_TITLE} characters or fewer` })
  }
  if (description != null && String(description).length > MAX_DESCRIPTION) {
    return res.status(400).json({ error: `description must be ${MAX_DESCRIPTION} characters or fewer` })
  }
  if (Array.isArray(questions) && questions.length > MAX_QUESTIONS) {
    return res.status(400).json({ error: `Survey cannot have more than ${MAX_QUESTIONS} questions` })
  }
  if (imageUrl !== undefined) {
    const safeImg = validateImageUrl(imageUrl)
    if (safeImg === 'INVALID') {
      return res.status(400).json({ error: 'imageUrl must be a server-uploaded path' })
    }
  }
  if (status !== undefined && !VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: `status must be one of: ${[...VALID_STATUSES].join(', ')}` })
  }
  if (!validateIsoDate(activeFromDate) || !validateIsoDate(activeToDate)) {
    return res.status(400).json({ error: 'Invalid date format for activeFromDate or activeToDate' })
  }

  try {
    if (title != null) {
      await run(
        `UPDATE surveys SET title = ?, description = COALESCE(?, description), "imageUrl" = COALESCE(?, "imageUrl"),
        status = COALESCE(?, status), "activeFromDate" = COALESCE(?, "activeFromDate"), "activeToDate" = COALESCE(?, "activeToDate"),
        "updatedDate" = CURRENT_TIMESTAMP, "updatedBy" = 'api' WHERE id = ?`,
        [title, description, imageUrl, status, activeFromDate, activeToDate, id],
      )
    } else {
      await run(
        `UPDATE surveys SET description = COALESCE(?, description), "imageUrl" = COALESCE(?, "imageUrl"),
        status = COALESCE(?, status), "activeFromDate" = COALESCE(?, "activeFromDate"), "activeToDate" = COALESCE(?, "activeToDate"),
        "updatedDate" = CURRENT_TIMESTAMP, "updatedBy" = 'api' WHERE id = ?`,
        [description, imageUrl, status, activeFromDate, activeToDate, id],
      )
    }

    if (isReviewed) {
      await run(
        'UPDATE surveys SET "isReviewed" = true, "aiReviewScore" = ?, "reviewJson" = ?, "updatedDate" = CURRENT_TIMESTAMP WHERE id = ?',
        [aiReviewScore != null ? Number(aiReviewScore) : null, reviewJson ? JSON.stringify(reviewJson) : null, id],
      )
    }

    if (Array.isArray(questions)) {
      await run('DELETE FROM questions WHERE "surveyId" = ?', [id])
      await insertQuestions(id, questions)
    }

    const updated = await get('SELECT * FROM surveys WHERE id = ?', [id])
    res.json({ survey: mapSurveyRow(updated) })
  } catch (e) {
    console.error('[updateSurvey]', e)
    res.status(500).json({ error: e.message || 'Failed to update survey' })
  }
}

/**
 * DELETE /api/surveys/:id
 */
export async function deleteSurvey(req, res) {
  try {
    const id = Number(req.params.id)
    const s = await get('SELECT * FROM surveys WHERE id = ?', [id])
    if (!s) return res.status(404).json({ error: 'Not found' })
    if (s.createdByUserId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
    await run('DELETE FROM surveys WHERE id = ?', [id])
    res.json({ ok: true })
  } catch (e) {
    console.error('[deleteSurvey]', e)
    res.status(500).json({ error: 'Failed to delete survey' })
  }
}

/**
 * My surveys
 */
export async function listMySurveys(req, res) {
  try {
    const userId = req.user.id
    const rows = await all('SELECT * FROM surveys WHERE "createdByUserId" = ? ORDER BY "createdDate" DESC', [userId])
    res.json({ items: rows.map((r) => mapSurveyRow(r)) })
  } catch (e) {
    console.error('[listMySurveys]', e)
    res.status(500).json({ error: 'Failed to load surveys' })
  }
}

/**
 * POST /api/surveys/:id/respond
 */
export async function postRespond(req, res) {
  try {
    const surveyId = Number(req.params.id)
    const s = await get('SELECT * FROM surveys WHERE id = ?', [surveyId])
    if (!s) return res.status(404).json({ error: 'Not found' })
    const userId = req.user.id
    if (s.createdByUserId === userId) {
      return res.status(400).json({ error: 'Cannot respond to your own survey' })
    }
    if (!isSurveyActive(s)) {
      return res.status(400).json({ error: 'Survey is not active' })
    }
    const existingResponse = await get('SELECT 1 AS found FROM responses WHERE "surveyId" = ? AND "respondentUserId" = ?', [surveyId, userId])
    if (existingResponse) {
      return res.status(400).json({ error: 'Already responded' })
    }
    const { answers: answerPayload } = req.body || {}
    if (!answerPayload || typeof answerPayload !== 'object') {
      return res.status(400).json({ error: 'answers object required' })
    }
    const questions = await all('SELECT * FROM questions WHERE "surveyId" = ? ORDER BY "orderIndex"', [surveyId])
    for (const q of questions) {
      if (q.isRequired) {
        const v = answerPayload[String(q.id)]
        if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) {
          return res.status(400).json({ error: `Question ${q.id} is required` })
        }
      }
    }
    const r = await run('INSERT INTO responses ("surveyId", "respondentUserId", "createdBy", "updatedBy") VALUES (?, ?, ?, ?)', [
      surveyId,
      userId,
      'api',
      'api',
    ])
    const responseId = r.lastInsertRowid
    for (const q of questions) {
      const val = answerPayload[String(q.id)]
      let text = val == null ? '' : Array.isArray(val) ? val.join(', ') : String(val)
      text = text.slice(0, MAX_ANSWER_TEXT)
      const sent = await analyzeSentiment(text)
      let label = String(sent.label || 'neutral').toLowerCase()
      if (!['positive', 'negative', 'neutral'].includes(label)) label = 'neutral'
      await run(
        `INSERT INTO answers ("responseId", "questionId", "answerText", "sentimentLabel", "sentimentScore", "createdBy", "updatedBy")
         VALUES (?, ?, ?, ?, ?, 'api', 'api')`,
        [responseId, q.id, text, label, sent.score != null ? Number(sent.score) : null],
      )
    }
    res.status(201).json({ responseId, ok: true })
  } catch (e) {
    console.error('[postRespond]', e)
    res.status(500).json({ error: 'Failed to submit response' })
  }
}

/**
 * POST /api/surveys/:id/vote
 */
export async function postVote(req, res) {
  try {
    const surveyId = Number(req.params.id)
    const s = await get('SELECT * FROM surveys WHERE id = ?', [surveyId])
    if (!s) return res.status(404).json({ error: 'Not found' })
    const userId = req.user.id
    if (s.createdByUserId === userId) {
      return res.status(400).json({ error: 'Cannot vote on your own survey' })
    }
    await run('INSERT INTO survey_votes ("surveyId", "userId") VALUES (?, ?) ON CONFLICT DO NOTHING', [surveyId, userId])
    const c = await get('SELECT COUNT(*) AS c FROM survey_votes WHERE "surveyId" = ?', [surveyId])
    res.json({ ok: true, voteCount: c.c })
  } catch (e) {
    console.error('[postVote]', e)
    res.status(500).json({ error: 'Failed to submit vote' })
  }
}

/**
 * GET /api/surveys/:id/responses - owner only
 */
export async function getResponses(req, res) {
  try {
    const surveyId = Number(req.params.id)
    const s = await get('SELECT * FROM surveys WHERE id = ?', [surveyId])
    if (!s) return res.status(404).json({ error: 'Not found' })
    if (s.createdByUserId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
    res.setHeader('Cache-Control', 'no-store')
    const responses = await all(
      `SELECT r.*, u.email, u."displayName" FROM responses r
       JOIN users u ON u.id = r."respondentUserId"
       WHERE r."surveyId" = ? ORDER BY r."submittedAt" DESC`,
      [surveyId],
    )
    res.json({ responses })
  } catch (e) {
    console.error('[getResponses]', e)
    res.status(500).json({ error: 'Failed to load responses' })
  }
}

/**
 * GET /api/surveys/:id/analytics
 */
export async function getAnalytics(req, res) {
  try {
    const surveyId = Number(req.params.id)
    const s = await get('SELECT * FROM surveys WHERE id = ?', [surveyId])
    if (!s) return res.status(404).json({ error: 'Not found' })
    if (s.createdByUserId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
    res.setHeader('Cache-Control', 'no-store')
    const questions = await all('SELECT * FROM questions WHERE "surveyId" = ? ORDER BY "orderIndex"', [surveyId])
    const totalResponsesRow = await get('SELECT COUNT(*) AS c FROM responses WHERE "surveyId" = ?', [surveyId])
    const totalResponses = totalResponsesRow?.c ?? 0
    const sentimentRows = await all(
      `SELECT "sentimentLabel", COUNT(*) AS c FROM answers a
       JOIN responses r ON r.id = a."responseId" WHERE r."surveyId" = ? AND a."sentimentLabel" IS NOT NULL
       GROUP BY "sentimentLabel"`,
      [surveyId],
    )
    const sentMap = { positive: 0, negative: 0, neutral: 0 }
    for (const r of sentimentRows) {
      if (r.sentimentLabel in sentMap) sentMap[r.sentimentLabel] = r.c
    }
    const totalSent = sentMap.positive + sentMap.negative + sentMap.neutral
    const perQuestion = []
    for (const q of questions) {
      const answers = await all(
        `SELECT "answerText", "sentimentLabel" FROM answers a
         JOIN responses r ON r.id = a."responseId" WHERE a."questionId" = ? AND r."surveyId" = ?`,
        [q.id, surveyId],
      )
      perQuestion.push({
        question: mapQuestionRow(q),
        responseCount: answers.length,
        sampleAnswers: answers.slice(0, 5).map((a) => a.answerText),
      })
    }
    res.json({
      totalResponses,
      sentiment: {
        ...sentMap,
        positivePct: totalSent ? Math.round((sentMap.positive / totalSent) * 10000) / 100 : 0,
        negativePct: totalSent ? Math.round((sentMap.negative / totalSent) * 10000) / 100 : 0,
        neutralPct: totalSent ? Math.round((sentMap.neutral / totalSent) * 10000) / 100 : 0,
      },
      perQuestion,
    })
  } catch (e) {
    console.error('[getAnalytics]', e)
    res.status(500).json({ error: 'Failed to load analytics' })
  }
}

/**
 * GET /api/surveys/:id/export
 */
export async function exportExcel(req, res) {
  try {
    const surveyId = Number(req.params.id)
    const s = await get('SELECT * FROM surveys WHERE id = ?', [surveyId])
    if (!s) return res.status(404).json({ error: 'Not found' })
    if (s.createdByUserId !== req.user.id) return res.status(403).json({ error: 'Forbidden' })
    const questions = await all('SELECT * FROM questions WHERE "surveyId" = ? ORDER BY "orderIndex"', [surveyId])
    const responses = await all(
      `SELECT r.id, r."submittedAt", u.email, u."displayName" FROM responses r
       JOIN users u ON u.id = r."respondentUserId" WHERE r."surveyId" = ? ORDER BY r.id`,
      [surveyId],
    )
    const rows = []
    for (const r of responses) {
      const row = {
        responseId: r.id,
        submittedAt: r.submittedAt,
        email: r.email,
        displayName: r.displayName,
      }
      for (const q of questions) {
        const a = await get('SELECT "answerText" FROM answers WHERE "responseId" = ? AND "questionId" = ?', [r.id, q.id])
        row[`Q${q.id}_${(q.questionText || '').slice(0, 30)}`] = a?.answerText ?? ''
      }
      rows.push(row)
    }
    const wb = buildResponseWorkbook(rows)
    const buffer = await wb.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="survey-${surveyId}.xlsx"`)
    return res.send(Buffer.from(buffer))
  } catch (e) {
    console.error('[exportExcel]', e)
    res.status(500).json({ error: 'Failed to export' })
  }
}

/**
 * GET /api/surveys/owner - alias my surveys (handled in route)
 */
export async function getMySurveyForEdit(req, res) {
  return getSurvey(req, res)
}
