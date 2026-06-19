import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import SiteHeader from '../components/SiteHeader'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { surveys } from '../services/api'
import './SurveyDetail.css'

function renderInput(q, value, onChange) {
  const t = q.questionType
  const v = value ?? ''
  if (t === 'short') {
    return <input className="sf-ctrl" value={v} onChange={(e) => onChange(e.target.value)} required={q.isRequired} />
  }
  if (t === 'long') {
    return (
      <textarea
        className="sf-ctrl"
        rows={4}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        required={q.isRequired}
      />
    )
  }
  if (t === 'single' || t === 'dropdown') {
    const list = Array.isArray(q.options) ? q.options : []
    return (
      <div className="sf-stack">
        {list.map((opt, i) => {
          const label = typeof opt === 'string' ? opt : opt.text || `Option ${i}`
          const val = typeof opt === 'string' ? opt : opt.text || String(i)
          return (
            <label key={i} className="sf-check">
              <input
                type="radio"
                name={String(q.id)}
                value={val}
                checked={v === val}
                onChange={() => onChange(val)}
                required={q.isRequired}
              />
              {label}
            </label>
          )
        })}
      </div>
    )
  }
  if (t === 'multiple') {
    const list = Array.isArray(q.options) ? q.options : []
    const arr = Array.isArray(v) ? v : v ? [v] : []
    return (
      <div className="sf-stack">
        {list.map((opt, i) => {
          const label = typeof opt === 'string' ? opt : opt.text || `Option ${i}`
          const val = typeof opt === 'string' ? opt : opt.text || String(i)
          return (
            <label key={i} className="sf-check">
              <input
                type="checkbox"
                checked={arr.includes(val)}
                onChange={(e) => {
                  if (e.target.checked) onChange([...arr, val])
                  else onChange(arr.filter((x) => x !== val))
                }}
              />
              {label}
            </label>
          )
        })}
      </div>
    )
  }
  if (t === 'date') {
    return <input className="sf-ctrl" type="date" value={v} onChange={(e) => onChange(e.target.value)} required={q.isRequired} />
  }
  if (t === 'time') {
    return <input className="sf-ctrl" type="time" value={v} onChange={(e) => onChange(e.target.value)} required={q.isRequired} />
  }
  if (t === 'linear' && q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
    const o = q.options
    const min = Number(o.min) || 1
    const max = Number(o.max) || 5
    const opts = []
    for (let i = min; i <= max; i += 1) opts.push(i)
    return (
      <div className="sf-lin">
        <span className="sf-lin-label">{o.minLabel}</span>
        <div className="sf-lin-opts">
          {opts.map((n) => (
            <label key={n} className="sf-pill">
              <input
                type="radio"
                name={String(q.id)}
                checked={String(v) === String(n)}
                onChange={() => onChange(String(n))}
              />
              {n}
            </label>
          ))}
        </div>
        <span className="sf-lin-label">{o.maxLabel}</span>
      </div>
    )
  }
  if (t === 'checkbox_grid' && q.options && q.options.rows && q.options.columns) {
    const rows = q.options.rows
    const cols = q.options.columns
    const grid = typeof v === 'object' && v ? v : {}
    return (
      <div className="sf-grid">
        <div className="sf-grid-header">
          <div />
          {cols.map((c) => (
            <div key={c} className="sf-grid-h">
              {c}
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row} className="sf-grid-row">
            <div className="sf-grid-h">{row}</div>
            {cols.map((col) => {
              const key = `${row}::${col}`
              return (
                <div key={key} className="sf-grid-cell">
                  <input
                    type="checkbox"
                    checked={Boolean(grid[key])}
                    onChange={(e) => {
                      const next = { ...grid, [key]: e.target.checked }
                      onChange(next)
                    }}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }
  if (t === 'file') {
    return (
      <input
        className="sf-ctrl"
        type="text"
        placeholder="File name or URL"
        value={v}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return <input className="sf-ctrl" value={v} onChange={(e) => onChange(e.target.value)} />
}

const SurveyDetail = () => {
  const { id } = useParams()
  const nav = useNavigate()
  const { isAuthenticated, loading: authLoad } = useAuth()
  const [loading, setLoading] = useState(true)
  const [survey, setSurvey] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await surveys.get(id)
      setSurvey(data.survey)
      setQuestions(data.questions || [])
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const setAns = (qid, v) => {
    setAnswers((prev) => ({ ...prev, [qid]: v }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      toast.error('Sign in to respond')
      return
    }
    if (!survey?.canRespond) {
      toast.error('You cannot respond to this survey')
      return
    }
    setSubmitting(true)
    try {
      const payload = {}
      for (const q of questions) {
        payload[q.id] = answers[q.id]
      }
      await surveys.respond(survey.id, payload)
      toast.success('Response submitted')
      nav('/ai-exchange')
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoad) {
    return (
      <div className="loader-container">
        <div className="loader">
          <span className="loader-text">AI</span>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="ai-exchange-page">
        <SiteHeader />
        <p className="load-more" style={{ padding: '2rem' }}>
          Loading…
        </p>
        <Footer />
      </div>
    )
  }

  if (!survey) {
    return <Navigate to="/ai-exchange" replace />
  }

  if (survey.isOwner) {
    return (
      <div className="ai-exchange-page survey-form-page">
        <SiteHeader />
        <div className="sf-wrap">
          <p className="sf-note">This is your survey. You cannot respond to it.</p>
          <Link className="btn btn-primary" to={`/ai-exchange/survey/${id}/details`}>
            View analytics
          </Link>
          <Link className="btn btn-ghost" to="/ai-exchange">
            Back
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  if (survey.hasResponded) {
    return (
      <div className="ai-exchange-page survey-form-page">
        <SiteHeader />
        <div className="sf-wrap">
          <p className="sf-note">You have already submitted a response.</p>
          <Link className="btn btn-primary" to="/ai-exchange">
            Back to AI Exchange
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="ai-exchange-page survey-form-page">
        <SiteHeader />
        <div className="sf-wrap">
          <h1 className="sf-title">{survey.title}</h1>
          <p className="sf-sub">{survey.description}</p>
          {survey.isOwner && (
            <>
              <p className="sf-note">This is your survey. View analytics to see results.</p>
              <Link className="btn btn-primary" to={`/ai-exchange/survey/${id}/details`}>
                View analytics
              </Link>
            </>
          )}
          {survey.hasResponded && <p className="sf-note">You already submitted a response.</p>}
          {!survey.isOwner && !survey.hasResponded && survey.canRespond && (
            <p className="sf-note">
              <Link to="/ai-exchange">Sign in on AI Exchange</Link> to respond to this survey.
            </p>
          )}
          {!survey.isOwner && !survey.hasResponded && !survey.canRespond && (
            <p className="sf-note">This survey is not open for responses.</p>
          )}
          <p style={{ marginTop: '1rem' }}>
            <Link className="btn btn-ghost" to="/ai-exchange">
              Back
            </Link>
          </p>
        </div>
        <Footer />
      </div>
    )
  }

  if (!survey.canRespond) {
    return (
      <div className="ai-exchange-page survey-form-page">
        <SiteHeader />
        <div className="sf-wrap">
          <p className="sf-note">This survey is not open for responses.</p>
          <Link className="btn btn-ghost" to="/ai-exchange">
            Back
          </Link>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="ai-exchange-page survey-form-page">
      <SiteHeader />
      <main className="sf-wrap">
        <h1 className="sf-title">{survey.title}</h1>
        <p className="sf-sub">{survey.description}</p>
        {survey.imageUrl && (
          <img className="sf-cover" src={survey.imageUrl.startsWith('http') ? survey.imageUrl : survey.imageUrl} alt="" />
        )}
        <form onSubmit={onSubmit} className="sf-form">
          {questions.map((q, i) => (
            <div key={q.id} className="sf-qa">
              <p className="sf-qindex">
                Question {i + 1} {q.isRequired ? '*' : ''}
              </p>
              <h2 className="sf-qtitle">{q.questionText}</h2>
              {renderInput(q, answers[q.id], (v) => setAns(q.id, v))}
            </div>
          ))}
          <div className="sf-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
            <Link className="btn btn-ghost" to="/ai-exchange">
              Cancel
            </Link>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  )
}

export default SurveyDetail
