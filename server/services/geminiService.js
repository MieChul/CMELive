import { GoogleAuth } from 'google-auth-library'
import { config } from '../config/env.js'

let _authClient = null

export function isConfigured() {
  return Boolean(config.vertexAi.projectId && config.vertexAi.credentialsJson)
}

export async function getAccessToken() {
  const { credentialsJson, projectId } = config.vertexAi
  if (!credentialsJson || !projectId) return null
  try {
    if (!_authClient) {
      const credentials = JSON.parse(credentialsJson)
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
      }
      _authClient = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })
    }
    const client = await _authClient.getClient()
    const { token } = await client.getAccessToken()
    return token
  } catch (err) {
    console.warn('[gemini] Auth failed:', err?.message)
    return null
  }
}

/**
 * Calls Gemini 2.0 Flash via Vertex AI and returns the raw text response.
 * Returns null when credentials are not configured or auth fails.
 * Throws on API errors so callers can handle them.
 */
export async function callGemini(systemPrompt, userContent) {
  const token = await getAccessToken()
  if (!token) return null

  const { projectId, location } = config.vertexAi
  const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-2.5-flash:generateContent`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userContent }] }],
        generationConfig: { responseMimeType: 'application/json' },
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT',  threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT',         threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',  threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Gemini API error (${res.status}): ${body.slice(0, 200)}`)
    }

    const payload = await res.json()
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Empty Gemini response')
    return text
  } finally {
    clearTimeout(timeout)
  }
}
