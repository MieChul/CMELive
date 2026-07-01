import { useState, useCallback, useRef, useEffect, Fragment } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  X, Plus, Trash2, Copy, Sparkles, Loader2, Image as ImageIcon,
  ChevronDown, AlignLeft, AlignJustify, CheckSquare, Circle,
  BarChart2, Calendar, Clock, ArrowUp, ArrowDown, Check, AlertCircle
} from 'lucide-react'
import SiteHeader from '../components/SiteHeader'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { surveys, ai } from '../services/api'
import './CreateSurvey.css'

import heroImg from '../assets/AiExchange/Heroimage.jpg'
const HERO_IMG = heroImg

const QUESTION_TYPES = [
  { value: 'short', label: 'Short answer', icon: AlignLeft, group: 'text' },
  { value: 'long', label: 'Paragraph', icon: AlignJustify, group: 'text' },
  { value: 'single', label: 'Single choice', icon: Circle, group: 'choice' },
  { value: 'multiple', label: 'Multiple choice', icon: CheckSquare, group: 'choice' },
  { value: 'dropdown', label: 'Dropdown', icon: ChevronDown, group: 'choice' },
  { value: 'linear', label: 'Linear scale', icon: BarChart2, group: 'scale' },
  { value: 'date', label: 'Date', icon: Calendar, group: 'datetime' },
  { value: 'time', label: 'Time', icon: Clock, group: 'datetime' },
]

const TYPE_GROUPS = [
  { label: 'Text', types: ['short', 'long'] },
  { label: 'Choice', types: ['single', 'multiple', 'dropdown'] },
  { label: 'Scale', types: ['linear'] },
  { label: 'Date & Time', types: ['date', 'time'] },
]

const getTypeInfo = (val) => QUESTION_TYPES.find(t => t.value === val) || QUESTION_TYPES[0]

const newQuestion = (type = 'short') => ({
  localId: crypto.randomUUID(),
  questionText: '',
  questionType: type,
  isRequired: true,
  options: defaultOptions(type),
})

function defaultOptions(type) {
  if (['single', 'multiple', 'dropdown'].includes(type)) return ['Option 1', 'Option 2']
  if (type === 'linear') return { min: 1, max: 5, minLabel: 'Low', maxLabel: 'High' }
  return null
}

const THEME_COLOR = '#AD46FF'

function CreateSurvey() {
  const { isAuthenticated, loading } = useAuth()
  const nav = useNavigate()
  const headerImgRef = useRef()
  
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [status, setStatus] = useState('active')
  const [activeFrom, setActiveFrom] = useState('')
  const [activeTo, setActiveTo] = useState('')
  const [uploading, setUploading] = useState(false)
  const [questions, setQuestions] = useState([newQuestion('short')])
  const [activeQId, setActiveQId] = useState(questions[0].localId)

  const [reviewItems, setReviewItems] = useState(null)
  const [reviewed, setReviewed] = useState(false)
  const [acceptLow, setAcceptLow] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(true)

  const markDirty = () => {
    setDirty(true)
    setReviewed(false)
    setReviewItems(null)
  }

  const uq = (id, patch) => {
    markDirty()
    setQuestions(qs => qs.map(q => q.localId === id ? { ...q, ...patch } : q))
  }

  const addQuestion = (type = 'short', afterId = null) => {
    const q = newQuestion(type)
    markDirty()
    setQuestions(qs => {
      if (!afterId) return [...qs, q]
      const i = qs.findIndex(x => x.localId === afterId)
      return [...qs.slice(0, i + 1), q, ...qs.slice(i + 1)]
    })
    setActiveQId(q.localId)
  }

  const duplicateQuestion = (id) => {
    const src = questions.find(q => q.localId === id)
    const copy = { ...src, localId: crypto.randomUUID() }
    const i = questions.findIndex(q => q.localId === id)
    markDirty()
    setQuestions(qs => [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)])
    setActiveQId(copy.localId)
  }

  const removeQuestion = (id) => {
    if (questions.length === 1) return
    const idx = questions.findIndex(q => q.localId === id)
    const next = questions[idx + 1] || questions[idx - 1]
    markDirty()
    setQuestions(qs => qs.filter(q => q.localId !== id))
    if (next) setActiveQId(next.localId)
  }

  const moveQuestion = (id, dir) => {
    setQuestions(qs => {
      const i = qs.findIndex(q => q.localId === id)
      const j = i + dir
      if (j < 0 || j >= qs.length) return qs
      const arr = [...qs]
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
      return arr
    })
  }

  const changeType = (id, type) => {
    const defaults = newQuestion(type)
    uq(id, { questionType: type, options: defaults.options })
  }

  const onUpload = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    try {
      const { data } = await surveys.uploadImage(f)
      setImageUrl(data.imageUrl)
      markDirty()
    } catch {
      toast.error('Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  const runReview = useCallback(async () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Title and description are required')
      return
    }
    if (!questions.length || !questions.some((q) => q.questionText.trim())) {
      toast.error('Add at least one question with text')
      return
    }
    setReviewing(true)
    try {
      const payload = {
        surveyTitle: title,
        surveyDescription: description,
        questions: questions
          .filter((q) => q.questionText.trim())
          .map((q) => ({
            id: q.localId,
            text: q.questionText,
            type: q.questionType,
          })),
      }
      const { data } = await ai.review(payload)
      setReviewItems(data.items)
      setReviewed(true)
      setAcceptLow(false)
      setStep(3)
      setDirty(false)
      setQuestions((prev) => {
        const byId = Object.fromEntries((data.items || []).map((i) => [String(i.questionId), i]))
        return prev.map((q) => {
          const m = byId[String(q.localId)]
          if (!m) return { ...q, aiConfidenceScore: undefined, aiSuggestionJson: undefined }
          return {
            ...q,
            aiConfidenceScore: m.score,
            aiSuggestionJson: m,
          }
        })
      })
      toast.success('Review complete')
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || 'Review failed')
    } finally {
      setReviewing(false)
    }
  }, [title, description, questions])

  const canSave = () => {
    if (!reviewed) return false
    if (dirty) return false
    const qs = questions.filter((q) => q.questionText.trim())
    if (!qs.length) return false
    const scores = qs.map((q) => (q.aiConfidenceScore != null ? q.aiConfidenceScore : 100))
    const min = Math.min(...scores)
    if (min < 40 && !acceptLow) return false
    return true
  }

  const onSave = async () => {
    if (!canSave()) return
    setSaving(true)
    try {
      const qs = questions
        .filter((q) => q.questionText.trim())
        .map((q, i) => {
          const opt = getOptionsForServer(q)
          return {
            questionText: q.questionText,
            questionType: q.questionType,
            isRequired: q.isRequired,
            orderIndex: i,
            options: opt,
            aiConfidenceScore: q.aiConfidenceScore,
            aiSuggestionJson: q.aiSuggestionJson || null,
          }
        })
      const avg = qs.length ? qs.reduce((a, s) => a + (s.aiConfidenceScore || 0), 0) / qs.length : 0
      await surveys.create({
        title,
        description,
        imageUrl: imageUrl || null,
        status,
        activeFromDate: status === 'scheduled' && activeFrom ? new Date(activeFrom).toISOString() : null,
        activeToDate: status === 'scheduled' && activeTo ? new Date(activeTo).toISOString() : null,
        isReviewed: true,
        aiReviewScore: avg,
        reviewJson: { items: reviewItems },
        questions: qs,
      })
      toast.success('Survey published!')
      nav('/ai-exchange')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="loader-container">
        <div className="loader">
          <span className="loader-text">AI</span>
        </div>
      </div>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/ai-exchange" replace />
  }

  const isStep2Ready = title.trim().length > 0 && description.trim().length > 0

  return (
    <div className="ai-exchange-page cs-page">
      <SiteHeader />

      <section className="ae-hero ae-hero--short">
        <div className="ae-hero__image" style={{ backgroundImage: `url(${HERO_IMG})` }} />
        <div className="ae-hero__overlay" />
        <div className="ae-hero__text">
          <h1 className="ae-hero__title ae-hero__title--sm">Create Survey</h1>
        </div>
      </section>

      <main className="cs-main">
        {/* Progress Steps */}
        <div className="cs-steps">
          {['Details', 'Questions', 'Review & Save'].map((label, i) => (
            <button
              key={label}
              className={`cs-step ${step === i + 1 ? 'cs-step--active' : ''} ${step > i + 1 ? 'cs-step--done' : ''}`}
              onClick={() => {
                if (i === 0) setStep(1)
                else if (i === 1 && isStep2Ready) setStep(2)
                else if (i === 2 && reviewed) setStep(3)
              }}
            >
              <span className="cs-step__num">{step > i + 1 ? <Check size={14} /> : i + 1}</span>
              <span className="cs-step__label">{label}</span>
            </button>
          ))}
        </div>

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="cs-card animate-fadeIn">
            <div className="cs-card__gradient" />
            
            {/* Header Image Upload */}
            {imageUrl ? (
              <div className="cs-card__header-img">
                <img src={imageUrl} alt="Cover" />
                <button className="cs-card__remove-img" onClick={() => { setImageUrl(''); markDirty() }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                className="cs-card__upload-zone"
                onClick={() => headerImgRef.current?.click()}
              >
                <div className="cs-card__upload-icon">
                  <Plus size={24} />
                </div>
                <span>Add cover image</span>
              </button>
            )}
            <input
              ref={headerImgRef}
              type="file"
              accept="image/*"
              className="cs-hidden"
              onChange={onUpload}
              disabled={uploading}
            />

            <div className="cs-card__body">
              <div className="cs-field">
                <label className="cs-label">Survey Title *</label>
                <input
                  className="cs-input"
                  placeholder="Enter your survey title"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); markDirty() }}
                  autoFocus
                />
              </div>

              <div className="cs-field">
                <label className="cs-label">Description *</label>
                <textarea
                  className="cs-textarea"
                  placeholder="What is this survey about? Let your audience know what to expect."
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); markDirty() }}
                  rows={4}
                />
              </div>

              <div className="cs-field">
                <label className="cs-label">Status</label>
                <div className="cs-select-wrap">
                  <select
                    className="cs-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                  <ChevronDown size={16} className="cs-select-icon" />
                </div>
              </div>

              {status === 'scheduled' && (
                <div className="cs-row">
                  <div className="cs-field">
                    <label className="cs-label">From</label>
                    <input
                      type="datetime-local"
                      className="cs-input"
                      value={activeFrom}
                      onChange={(e) => setActiveFrom(e.target.value)}
                    />
                  </div>
                  <div className="cs-field">
                    <label className="cs-label">To</label>
                    <input
                      type="datetime-local"
                      className="cs-input"
                      value={activeTo}
                      onChange={(e) => setActiveTo(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="cs-actions">
                <button
                  className="cs-btn cs-btn--primary"
                  onClick={() => isStep2Ready && setStep(2)}
                  disabled={!isStep2Ready}
                >
                  Add Questions
                  <ChevronDown size={16} style={{ transform: 'rotate(-90deg)' }} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && (
          <div className="animate-fadeIn">
            {/* Mini Header */}
            <div className="cs-mini-header" onClick={() => setStep(1)}>
              <div className="cs-mini-header__gradient" />
              {imageUrl && <img src={imageUrl} alt="" className="cs-mini-header__img" />}
              <div className="cs-mini-header__content">
                <h3>{title}</h3>
                <p>{description.slice(0, 80)}{description.length > 80 ? '...' : ''}</p>
              </div>
            </div>

            {/* Questions */}
            {questions.map((q, idx) => (
              <QuestionCard
                key={q.localId}
                question={q}
                index={idx}
                isActive={activeQId === q.localId}
                totalCount={questions.length}
                onClick={() => setActiveQId(q.localId)}
                onChange={(patch) => uq(q.localId, patch)}
                onChangeType={(type) => changeType(q.localId, type)}
                onDuplicate={() => duplicateQuestion(q.localId)}
                onDelete={() => removeQuestion(q.localId)}
                onMoveUp={() => moveQuestion(q.localId, -1)}
                onMoveDown={() => moveQuestion(q.localId, 1)}
              />
            ))}

            {/* Add Question */}
            <AddQuestionBar onAdd={addQuestion} />

            <div className="cs-actions">
              <button className="cs-btn cs-btn--ghost" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="cs-btn cs-btn--primary"
                onClick={runReview}
                disabled={reviewing}
              >
                {reviewing ? (
                  <>
                    <Loader2 size={16} className="cs-spin" />
                    Reviewing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Review
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="cs-review animate-fadeIn">
            <div className="cs-review__header">
              <h2>Review Complete</h2>
              <p>Review the scores and suggestions below. Higher scores indicate better question quality.</p>
            </div>

            {questions
              .filter((q) => q.questionText.trim())
              .map((q) => {
                const sc = q.aiConfidenceScore
                const tier = sc >= 70 ? 'good' : sc >= 40 ? 'mid' : 'low'
                const s = q.aiSuggestionJson?.suggestion
                return (
                  <div key={q.localId} className={`cs-review-card cs-review-card--${tier}`}>
                    <div className="cs-review-card__header">
                      <p className="cs-review-card__text">{q.questionText}</p>
                      <div className={`cs-review-card__score cs-review-card__score--${tier}`}>
                        {sc != null ? Math.round(sc) : '—'}
                      </div>
                    </div>
                    {q.aiSuggestionJson?.issues?.length > 0 && (
                      <ul className="cs-review-card__issues">
                        {q.aiSuggestionJson.issues.map((x, i) => (
                          <li key={i}><AlertCircle size={14} />{x}</li>
                        ))}
                      </ul>
                    )}
                    {s && s.type === 'rephrase' && s.rephrasedQuestion && (
                      <div className="cs-review-card__suggestion">
                        <p><strong>Suggested rephrase:</strong> {s.rephrasedQuestion}</p>
                        {s.explanation && <p className="cs-review-card__exp">{s.explanation}</p>}
                        <button
                          className="cs-btn cs-btn--sm"
                          onClick={() => {
                            setQuestions((prev) =>
                              prev.map((x) =>
                                x.localId === q.localId
                                  ? { ...x, questionText: s.rephrasedQuestion, aiSuggestionJson: null, aiConfidenceScore: 85 }
                                  : x
                              )
                            )
                          }}
                        >
                          <Check size={14} />
                          Use suggestion
                        </button>
                      </div>
                    )}
                    {s && s.type === 'rewrite' && (
                      <div className="cs-review-card__suggestion cs-review-card__suggestion--rewrite">
                        <p><strong>Rewrite needed:</strong> {s.rewritePrompt}</p>
                        {s.guidance?.length > 0 && (
                          <ul>
                            {s.guidance.map((g, i) => <li key={i}>{g}</li>)}
                          </ul>
                        )}
                        <p className="cs-review-card__exp">Edit the question, then re-run review.</p>
                      </div>
                    )}
                  </div>
                )
              })}

            {Array.isArray(reviewItems) && reviewItems.some((x) => x.fallback) && (
              <p className="cs-fallback">AI not configured: review skipped. You can still save.</p>
            )}

            <label className="cs-checkbox">
              <input type="checkbox" checked={acceptLow} onChange={(e) => setAcceptLow(e.target.checked)} />
              <span>I accept publishing with questions under 40 confidence</span>
            </label>

            <div className="cs-actions">
              <button className="cs-btn cs-btn--ghost" onClick={() => setStep(2)}>
                Back to Edit
              </button>
              <button className="cs-btn cs-btn--ghost" onClick={runReview} disabled={reviewing}>
                Re-run Review
              </button>
              <button
                className="cs-btn cs-btn--primary"
                disabled={!canSave() || saving}
                onClick={onSave}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="cs-spin" />
                    Saving...
                  </>
                ) : (
                  'Publish Survey'
                )}
              </button>
            </div>

            {dirty && <p className="cs-warn">Content changed — run review again to enable save.</p>}
            {!canSave() && !dirty && !acceptLow && questions.some((q) => (q.aiConfidenceScore ?? 100) < 40) && (
              <p className="cs-warn">Check the acceptance box to save low-confidence questions.</p>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

function getOptionsForServer(q) {
  if (['single', 'multiple', 'dropdown'].includes(q.questionType)) {
    if (Array.isArray(q.options)) return q.options.map((o) => (typeof o === 'string' ? o : o.text)).filter(Boolean)
  }
  if (q.options && typeof q.options === 'object') {
    return q.options
  }
  return null
}

function QuestionCard({
  question, index, isActive, totalCount,
  onClick, onChange, onChangeType, onDuplicate, onDelete, onMoveUp, onMoveDown
}) {
  const [typePicker, setTypePicker] = useState(false)
  const typePickerRef = useRef()
  const typeInfo = getTypeInfo(question.questionType)
  const TypeIcon = typeInfo.icon

  useEffect(() => {
    if (!typePicker) return
    const close = (e) => {
      if (typePickerRef.current && !typePickerRef.current.contains(e.target)) {
        setTypePicker(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [typePicker])

  return (
    <div
      className={`cs-q ${isActive ? 'cs-q--active' : ''}`}
      onClick={onClick}
    >
      <div className="cs-q__header">
        <div className="cs-q__input-wrap">
          <textarea
            className="cs-q__input"
            placeholder="Your question"
            value={question.questionText}
            rows={1}
            onChange={(e) => onChange({ questionText: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {isActive && (
          <div className="cs-q__type-picker" ref={typePickerRef} onClick={(e) => e.stopPropagation()}>
            <button
              className={`cs-q__type-btn ${typePicker ? 'cs-q__type-btn--open' : ''}`}
              onClick={() => setTypePicker(!typePicker)}
            >
              <TypeIcon size={15} />
              <span>{typeInfo.label}</span>
              <ChevronDown size={12} className={`cs-q__type-chevron ${typePicker ? 'cs-q__type-chevron--up' : ''}`} />
            </button>
            {typePicker && (
              <div className="cs-q__type-menu">
                {QUESTION_TYPES.map((t, idx) => {
                  const Icon = t.icon
                  const isNewGroup = idx > 0 && QUESTION_TYPES[idx - 1].group !== t.group
                  const isSelected = question.questionType === t.value
                  return (
                    <Fragment key={t.value}>
                      {isNewGroup && <div className="cs-q__type-divider" />}
                      <button
                        className={`cs-q__type-option ${isSelected ? 'cs-q__type-option--active' : ''}`}
                        onClick={() => { onChangeType(t.value); setTypePicker(false) }}
                      >
                        <div className="cs-q__type-option-icon">
                          <Icon size={16} />
                        </div>
                        <span>{t.label}</span>
                        {isSelected && <Check size={14} className="cs-q__type-check" />}
                      </button>
                    </Fragment>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <AnswerPreview question={question} isActive={isActive} onChange={onChange} />

      {isActive && (
        <div className="cs-q__footer" onClick={(e) => e.stopPropagation()}>
          <div className="cs-q__tools">
            <button className="cs-q__tool" title="Duplicate" onClick={onDuplicate}>
              <Copy size={14} />
            </button>
            <button className="cs-q__tool cs-q__tool--danger" title="Delete" onClick={onDelete}>
              <Trash2 size={14} />
            </button>
            {index > 0 && (
              <button className="cs-q__tool" title="Move up" onClick={onMoveUp}>
                <ArrowUp size={14} />
              </button>
            )}
            {index < totalCount - 1 && (
              <button className="cs-q__tool" title="Move down" onClick={onMoveDown}>
                <ArrowDown size={14} />
              </button>
            )}
          </div>
          <label className="cs-q__required">
            <span>Required</span>
            <div
              className={`cs-toggle ${question.isRequired ? 'cs-toggle--on' : ''}`}
              onClick={() => onChange({ isRequired: !question.isRequired })}
            >
              <div className="cs-toggle__knob" />
            </div>
          </label>
        </div>
      )}
    </div>
  )
}

function AnswerPreview({ question, isActive, onChange }) {
  const { questionType: type, options } = question

  if (type === 'short') {
    return <div className="cs-q__preview cs-q__preview--text">Short answer text</div>
  }
  if (type === 'long') {
    return <div className="cs-q__preview cs-q__preview--text">Long answer text</div>
  }
  if (type === 'date') {
    return (
      <div className="cs-q__preview cs-q__preview--datetime">
        <Calendar size={14} /> Month / Day / Year
      </div>
    )
  }
  if (type === 'time') {
    return (
      <div className="cs-q__preview cs-q__preview--datetime">
        <Clock size={14} /> Time
      </div>
    )
  }
  if (type === 'linear') {
    const scale = options && !Array.isArray(options) ? options : { min: 1, max: 5 }
    return (
      <div className="cs-q__preview cs-q__preview--scale">
        {Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i).map(n => (
          <div key={n} className="cs-q__scale-item">{n}</div>
        ))}
      </div>
    )
  }

  const isCheck = type === 'multiple'
  const opts = Array.isArray(options) ? options : []

  return (
    <div className="cs-q__options" onClick={(e) => e.stopPropagation()}>
      {opts.map((opt, i) => (
        <div key={i} className="cs-q__option">
          <div className={`cs-q__option-radio ${isCheck ? 'cs-q__option-radio--check' : ''}`} />
          {isActive ? (
            <input
              className="cs-q__option-input"
              value={opt}
              onChange={(e) => {
                const newOpts = [...opts]
                newOpts[i] = e.target.value
                onChange({ options: newOpts })
              }}
            />
          ) : (
            <span>{opt}</span>
          )}
          {isActive && opts.length > 1 && (
            <button
              className="cs-q__option-remove"
              onClick={() => onChange({ options: opts.filter((_, j) => j !== i) })}
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      {isActive && (
        <button
          className="cs-q__add-option"
          onClick={() => onChange({ options: [...opts, `Option ${opts.length + 1}`] })}
        >
          <Plus size={12} /> Add option
        </button>
      )}
    </div>
  )
}

function AddQuestionBar({ onAdd }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="cs-add-bar">
      <button className="cs-add-bar__btn" onClick={() => setOpen(!open)}>
        <div className="cs-add-bar__icon">
          <Plus size={16} />
        </div>
        Add question
      </button>

      {open && (
        <div className="cs-add-bar__menu">
          {TYPE_GROUPS.map(group => (
            <div key={group.label} className="cs-add-bar__group">
              <div className="cs-add-bar__group-label">{group.label}</div>
              <div className="cs-add-bar__group-items">
                {group.types.map(tid => {
                  const t = getTypeInfo(tid)
                  const Icon = t.icon
                  return (
                    <button
                      key={tid}
                      className="cs-add-bar__item"
                      onClick={() => { onAdd(tid); setOpen(false) }}
                    >
                      <div className="cs-add-bar__item-icon">
                        <Icon size={16} />
                      </div>
                      <span>{t.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CreateSurvey
