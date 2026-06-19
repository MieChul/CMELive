import { getLatestAiNews, getLatestAiNewsDebug, reviewQuestions } from '../services/openaiService.js'
import { config } from '../config/env.js'

/**
 * POST /api/ai/review
 * Body: { surveyTitle, surveyDescription, questions: [{ id, text, type }] }
 */
export async function postReview(req, res) {
  try {
    const { surveyTitle, surveyDescription, questions } = req.body || {}
    if (!surveyTitle || !surveyDescription) {
      return res.status(400).json({ error: 'surveyTitle and surveyDescription are required' })
    }
    if (!Array.isArray(questions) || !questions.length) {
      return res.status(400).json({ error: 'questions array required' })
    }
    const result = await reviewQuestions({
      surveyTitle: String(surveyTitle),
      surveyDescription: String(surveyDescription),
      questions: questions.map((q) => ({
        id: q.id,
        text: String(q.text || q.questionText || ''),
        type: String(q.type || q.questionType || 'short'),
      })),
    })
    const items = result.items || result.data?.items || (Array.isArray(result) ? result : null)
    if (!items || !Array.isArray(items)) {
      return res.status(500).json({ error: 'Invalid AI response shape' })
    }
    return res.json({ items })
  } catch (e) {
    console.error('[AI review error]', e?.status, e?.message, e?.error)
    if (config.isProduction) {
      return res.status(500).json({ error: 'AI review failed' })
    }
    return res.status(500).json({ error: e.message || 'AI review failed' })
  }
}

/**
 * GET /api/ai/latest-news
 * Response: { items: [{ title, description, link }] }
 */
export async function getLatestNews(req, res) {
  try {
    const result = await getLatestAiNews()
    const items = Array.isArray(result?.items) ? result.items : []
    if (!items.length) {
      return res.status(503).json({ error: 'Live AI news currently unavailable' })
    }
    return res.json({ items, fallback: Boolean(result?.fallback) })
  } catch (e) {
    console.error('[AI latest-news error]', e?.message)
    if (config.isProduction) {
      return res.status(503).json({ error: 'Could not fetch live AI news' })
    }
    return res.status(503).json({ error: e?.message || 'Could not fetch live AI news' })
  }
}

/**
 * GET /api/ai/latest-news/debug
 */
export async function getLatestNewsDebug(req, res) {
  try {
    const diagnostics = await getLatestAiNewsDebug()
    return res.json(diagnostics)
  } catch (e) {
    console.error('[AI latest-news debug error]', e?.message)
    if (config.isProduction) {
      return res.status(500).json({ error: 'Could not fetch latest-news diagnostics' })
    }
    return res.status(500).json({ error: e?.message || 'Could not fetch latest-news diagnostics' })
  }
}
