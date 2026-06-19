import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Pie, Bar, Doughnut } from 'react-chartjs-2'
import toast from 'react-hot-toast'
import {
  Download, Users, Clock, TrendingUp, BarChart2,
  MessageSquare, ThumbsUp, ThumbsDown, Minus, ChevronDown, FileSpreadsheet
} from 'lucide-react'
import SiteHeader from '../components/SiteHeader'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { surveys } from '../services/api'
import { formatIstDate } from '../utils/dates'
import './SurveyViewDetails.css'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

import heroImg from '../assets/AiExchange/Heroimage.jpg'
const HERO_IMG = heroImg

const SurveyViewDetails = () => {
  const { id } = useParams()
  const { isAuthenticated, loading: authLoad } = useAuth()
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [data, setData] = useState(null)
  const [expandedQ, setExpandedQ] = useState(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setForbidden(false)
    try {
      const s = await surveys.get(id)
      if (!s.data.survey.isOwner) {
        setForbidden(true)
        return
      }
      const [a, r] = await Promise.all([surveys.analytics(id), surveys.responses(id)])
      setData({ analytics: a.data, survey: s.data.survey, responses: r.data.responses || [] })
    } catch (e) {
      if (e?.response?.status === 403) setForbidden(true)
      else toast.error(e?.response?.data?.error || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const onExport = async () => {
    try {
      const { data } = await surveys.exportXlsx(id)
      const url = window.URL.createObjectURL(new Blob([data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `survey-${id}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Export failed')
    }
  }

  if (authLoad || loading) {
    return (
      <div className="ai-exchange-page">
        <SiteHeader />
        <div className="svd-loading">
          <div className="svd-loading__spinner" />
          <p>Loading analytics...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (!isAuthenticated || forbidden || !data) {
    return <Navigate to="/ai-exchange" replace />
  }

  if (!data.survey.isOwner) {
    return <Navigate to={`/ai-exchange/survey/${id}`} replace />
  }

  const { analytics, survey, responses } = data
  const { sentiment, perQuestion, totalResponses } = analytics

  const hasResponses = totalResponses > 0
  const totalSentiment = (sentiment.positive || 0) + (sentiment.negative || 0) + (sentiment.neutral || 0)

  const sentimentData = {
    labels: ['Positive', 'Negative', 'Neutral'],
    datasets: [{
      data: [sentiment.positive || 0, sentiment.negative || 0, sentiment.neutral || 0],
      backgroundColor: ['#05DF72', '#FF5E4F', '#6B7280'],
      borderColor: ['#05DF72', '#FF5E4F', '#6B7280'],
      borderWidth: 0,
    }],
  }

  const responsesByQuestion = {
    labels: perQuestion.slice(0, 8).map((pq, i) => `Q${i + 1}`),
    datasets: [{
      label: 'Responses',
      data: perQuestion.slice(0, 8).map(pq => pq.responseCount),
      backgroundColor: 'rgba(173, 70, 255, 0.6)',
      borderColor: '#AD46FF',
      borderWidth: 1,
      borderRadius: 8,
    }],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9ca3af',
          padding: 20,
          font: { size: 12 }
        }
      }
    }
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#6b7280' }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#6b7280', stepSize: 1 }
      }
    }
  }

  return (
    <div className="ai-exchange-page svd-page">
      <SiteHeader />

      <section className="ae-hero ae-hero--short">
        <div className="ae-hero__image" style={{ backgroundImage: `url(${HERO_IMG})` }} />
        <div className="ae-hero__overlay" />
        <div className="ae-hero__text">
          <h1 className="ae-hero__title ae-hero__title--sm">Survey Analytics</h1>
        </div>
      </section>

      <main className="svd-main">
        {/* Header */}
        <div className="svd-header">
          <div className="svd-header__info">
            <h1>{survey.title}</h1>
            <span className={`svd-status svd-status--${survey.status}`}>
              {survey.status === 'active' ? 'Active' : survey.status === 'inactive' ? 'Inactive' : 'Scheduled'}
            </span>
          </div>
          <button className="svd-export" onClick={onExport}>
            <FileSpreadsheet size={18} />
            Export to Excel
          </button>
        </div>

        {/* KPIs */}
        <div className="svd-kpis">
          <div className="svd-kpi">
            <div className="svd-kpi__icon svd-kpi__icon--blue">
              <Users size={20} />
            </div>
            <div className="svd-kpi__content">
              <span className="svd-kpi__value">{totalResponses}</span>
              <span className="svd-kpi__label">Total Responses</span>
            </div>
          </div>
          <div className="svd-kpi">
            <div className="svd-kpi__icon svd-kpi__icon--green">
              <ThumbsUp size={20} />
            </div>
            <div className="svd-kpi__content">
              <span className="svd-kpi__value">{sentiment.positivePct || 0}%</span>
              <span className="svd-kpi__label">Positive Sentiment</span>
            </div>
          </div>
          <div className="svd-kpi">
            <div className="svd-kpi__icon svd-kpi__icon--purple">
              <BarChart2 size={20} />
            </div>
            <div className="svd-kpi__content">
              <span className="svd-kpi__value">{perQuestion.length}</span>
              <span className="svd-kpi__label">Questions</span>
            </div>
          </div>
          <div className="svd-kpi">
            <div className="svd-kpi__icon svd-kpi__icon--orange">
              <TrendingUp size={20} />
            </div>
            <div className="svd-kpi__content">
              <span className="svd-kpi__value">{survey.voteCount || 0}</span>
              <span className="svd-kpi__label">Votes</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        {hasResponses ? (
          <div className="svd-charts">
            <div className="svd-chart-card">
              <h3>Sentiment Analysis</h3>
              <p className="svd-chart-card__desc">AI-powered analysis of response sentiment</p>
              <div className="svd-chart-card__chart">
                <Doughnut data={sentimentData} options={chartOptions} />
              </div>
              <div className="svd-sentiment-breakdown">
                <div className="svd-sentiment-item">
                  <ThumbsUp size={16} className="svd-sentiment-item--positive" />
                  <span>Positive</span>
                  <strong>{sentiment.positive || 0}</strong>
                </div>
                <div className="svd-sentiment-item">
                  <ThumbsDown size={16} className="svd-sentiment-item--negative" />
                  <span>Negative</span>
                  <strong>{sentiment.negative || 0}</strong>
                </div>
                <div className="svd-sentiment-item">
                  <Minus size={16} className="svd-sentiment-item--neutral" />
                  <span>Neutral</span>
                  <strong>{sentiment.neutral || 0}</strong>
                </div>
              </div>
            </div>

            <div className="svd-chart-card">
              <h3>Responses by Question</h3>
              <p className="svd-chart-card__desc">Response distribution across questions</p>
              <div className="svd-chart-card__chart svd-chart-card__chart--bar">
                <Bar data={responsesByQuestion} options={barOptions} />
              </div>
            </div>
          </div>
        ) : (
          <div className="svd-empty">
            <div className="svd-empty__icon">
              <MessageSquare size={48} />
            </div>
            <h3>No Responses Yet</h3>
            <p>Share your survey to start collecting responses. Analytics will appear here once people respond.</p>
            <Link to="/ai-exchange" className="svd-empty__btn">
              Back to AI Exchange
            </Link>
          </div>
        )}

        {/* Questions Breakdown */}
        <div className="svd-questions">
          <h2>Questions Breakdown</h2>
          {perQuestion.length === 0 ? (
            <p className="svd-questions__empty">No questions in this survey.</p>
          ) : (
            perQuestion.map((pq, idx) => (
              <div key={pq.question.id} className="svd-q">
                <div
                  className="svd-q__header"
                  onClick={() => setExpandedQ(expandedQ === pq.question.id ? null : pq.question.id)}
                >
                  <div className="svd-q__info">
                    <span className="svd-q__num">Q{idx + 1}</span>
                    <div className="svd-q__text">
                      <p>{pq.question.questionText} {pq.question.isRequired && <span className="svd-q__req">*</span>}</p>
                      <span className="svd-q__type">{pq.question.questionType}</span>
                    </div>
                  </div>
                  <div className="svd-q__stats">
                    <div className="svd-q__stat">
                      <span className="svd-q__stat-value">{pq.responseCount}</span>
                      <span className="svd-q__stat-label">responses</span>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`svd-q__chevron ${expandedQ === pq.question.id ? 'svd-q__chevron--open' : ''}`}
                    />
                  </div>
                </div>
                {expandedQ === pq.question.id && (
                  <div className="svd-q__body">
                    {pq.sampleAnswers?.length > 0 ? (
                      <>
                        <h4>Recent Answers</h4>
                        <ul className="svd-q__answers">
                          {pq.sampleAnswers.map((ans, i) => (
                            <li key={i}>{ans || <em>Empty response</em>}</li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="svd-q__no-answers">No answers yet for this question.</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Recent Responses */}
        {responses.length > 0 && (
          <div className="svd-responses">
            <h2>Recent Responses</h2>
            <div className="svd-responses__list">
              {responses.slice(0, 10).map((r, i) => (
                <div key={r.id} className="svd-response">
                  <div className="svd-response__avatar">
                    {(r.displayName || r.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="svd-response__info">
                    <span className="svd-response__name">{r.displayName || r.email || 'Anonymous'}</span>
                    <span className="svd-response__time">
                      <Clock size={12} />
                      {formatIstDate(r.submittedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="svd-actions">
          <Link className="svd-btn svd-btn--ghost" to="/ai-exchange">
            Back to AI Exchange
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default SurveyViewDetails
