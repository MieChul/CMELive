import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BarChart2, Users, Clock, ThumbsUp, Eye, ChevronRight } from 'lucide-react'
import SiteHeader from '../components/SiteHeader'
import Footer from '../components/Footer'
import { surveys } from '../services/api'
import { useAuth, PLACEHOLDER_AVATAR } from '../context/AuthContext'
import './AIExchange.css'
import { timeAgoIstLabel } from '../utils/dates'

import heroImg from '../assets/AiExchange/Heroimage.jpg'
const HERO_IMG = heroImg

const AIExchange = () => {
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const [tab, setTab] = useState('community') // 'community' | 'yours'
  const [sort, setSort] = useState('latest')
  const [filter, setFilter] = useState('all')
  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [nextCursor, setNextCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [voteBusy, setVoteBusy] = useState(false)
  const sentinelRef = useRef(null)
  const nextCursorRef = useRef(null)

  useEffect(() => {
    setNextCursor(null)
    nextCursorRef.current = null
    setItems([])
  }, [sort, filter, tab])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const params = { sort, filter, limit: 15, cursor: undefined }
        if (tab === 'yours' && isAuthenticated) {
          params.owner = 'me'
        }
        const { data } = await surveys.list(params)
        if (cancelled) return
        setItems(data.items || [])
        setTotalCount(data.total || data.items?.length || 0)
        setNextCursor(data.nextCursor)
        nextCursorRef.current = data.nextCursor
      } catch (e) {
        if (!cancelled) toast.error(e?.response?.data?.error || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sort, filter, tab, isAuthenticated])

  useEffect(() => {
    nextCursorRef.current = nextCursor
  }, [nextCursor])

  const loadMore = useCallback(async () => {
    const c = nextCursorRef.current
    if (!c || loadingMore) return
    setLoadingMore(true)
    try {
      const params = { sort, filter, limit: 15, cursor: c }
      if (tab === 'yours' && isAuthenticated) {
        params.owner = 'me'
      }
      const { data } = await surveys.list(params)
      setItems((prev) => [...prev, ...(data.items || [])])
      setNextCursor(data.nextCursor)
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load more')
    } finally {
      setLoadingMore(false)
    }
  }, [sort, filter, tab, loadingMore, isAuthenticated])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !nextCursor) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && !loading) {
          loadMore()
        }
      },
      { rootMargin: '200px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [loadMore, nextCursor, loadingMore, loading])

  const onVote = async (id) => {
    if (!isAuthenticated) {
      toast.error('Sign in to vote')
      return
    }
    setVoteBusy(true)
    try {
      const { data } = await surveys.vote(id)
      setItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, voteCount: data.voteCount } : p)),
      )
      toast.success('Vote recorded')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Vote failed')
    } finally {
      setVoteBusy(false)
    }
  }

  if (authLoading) {
    return (
      <div className="loader-container">
        <div className="loader">
          <span className="loader-text">AI</span>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-exchange-page ex-page">
      <SiteHeader />

      <section className="ae-hero">
        <div className="ae-hero__image" style={{ backgroundImage: `url(${HERO_IMG})` }} />
        <div className="ae-hero__overlay" />
        <div className="ae-hero__text">
          <p className="ae-hero__kicker">Community for</p>
          <h1 className="ae-hero__title">Ai Engineers</h1>
        </div>
      </section>

      <main className="ae-main">
        {/* Activity Strip */}
        <div className="ae-activity">
          <h2 className="ae-activity__title">Start your Activity</h2>
          <div className="ae-activity__actions">
            <button type="button" className="ae-btn ae-btn--disabled" disabled title="Coming soon">
              Ask Question
            </button>
            <Link className="ae-btn ae-btn--gradient" to="/ai-exchange/create-survey">
              Create Survey
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="ae-tabs">
          <button
            className={`ae-tab ${tab === 'community' ? 'ae-tab--active' : ''}`}
            onClick={() => setTab('community')}
          >
            Community Surveys
          </button>
          {isAuthenticated && (
            <button
              className={`ae-tab ${tab === 'yours' ? 'ae-tab--active' : ''}`}
              onClick={() => setTab('yours')}
            >
              Your Surveys
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="ae-filters">
          <div className="ae-filters__count">
            <span className="ae-count">{totalCount}</span> {tab === 'yours' ? 'Your Surveys' : 'Total Surveys'}
          </div>
          <div className="ae-filters__chips">
            <button
              className={`ae-chip ${sort === 'latest' ? 'ae-chip--active' : ''}`}
              onClick={() => setSort('latest')}
            >
              Newest
            </button>
            <button
              className={`ae-chip ${sort === 'votes' ? 'ae-chip--active' : ''}`}
              onClick={() => setSort('votes')}
            >
              Most Voted
            </button>
            <button
              className={`ae-chip ${filter === 'unresponded' ? 'ae-chip--active' : ''}`}
              onClick={() => setFilter(filter === 'unresponded' ? 'all' : 'unresponded')}
            >
              Unanswered
            </button>
          </div>
        </div>

        {/* Survey List */}
        {loading && !items.length ? (
          <div className="ae-loading">
            <div className="ae-loading__spinner" />
            <p>Loading surveys...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="ae-empty">
            <BarChart2 size={48} />
            <h3>{tab === 'yours' ? 'No surveys yet' : 'No surveys found'}</h3>
            <p>{tab === 'yours' ? 'Create your first survey to get started' : 'Be the first to create a survey!'}</p>
            <Link className="ae-btn ae-btn--gradient" to="/ai-exchange/create-survey">
              Create Survey
            </Link>
          </div>
        ) : (
          <div className="ae-list">
            {items.map((item) => (
              <SurveyRowCard
                key={item.id}
                item={item}
                onVote={onVote}
                busy={voteBusy}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}

        <div ref={sentinelRef} className="ae-sentinel">
          {loadingMore ? (
            <div className="ae-loading__spinner" />
          ) : nextCursor ? (
            'Scroll for more'
          ) : items.length ? (
            ''
          ) : (
            ''
          )}
        </div>
      </main>

      <section className="ae-cta">
        <h2>
          Ready to <span className="ae-cta__gradient">Transform</span> with AI?
        </h2>
        <p>Join the CME AI community and be part of the innovation</p>
        <div className="ae-cta__actions">
          <button className="ae-btn ae-btn--pink">Explore Demos</button>
          <Link to="/ai-exchange/create-survey" className="ae-btn ae-btn--blue">
            Join AI Exchange
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function SurveyRowCard({ item, onVote, busy, isAuthenticated }) {
  const desc = (item.description || '').slice(0, 200) + (item.description?.length > 200 ? '…' : '')
  const canVote = isAuthenticated && item.isOwner === false

  return (
    <article className="survey-row">
      <div className="survey-row__left">
        <div className="survey-row__avatar">
          <img
            src={item.ownerProfilePicUrl || PLACEHOLDER_AVATAR}
            alt=""
            onError={(e) => { e.target.src = PLACEHOLDER_AVATAR }}
          />
        </div>
        <div className="survey-row__content">
          <div className="survey-row__meta">
            <span className="survey-row__author">{item.ownerName || 'User'}</span>
            <span className="survey-row__badge">SURVEY</span>
            <span className="survey-row__time">
              <Clock size={12} />
              {timeAgoIstLabel(item.createdAt || item.createdDate)}
            </span>
          </div>
          <h3 className="survey-row__title">{item.title}</h3>
          {desc && <p className="survey-row__desc">{desc}</p>}
          <div className="survey-row__stats">
            <span className="survey-row__stat">
              <BarChart2 size={14} />
              {item.questionCount || 0} questions
            </span>
            <span className="survey-row__stat">
              <Users size={14} />
              {item.responseCount || 0} responses
            </span>
          </div>
        </div>
      </div>

      <div className="survey-row__right">
        <div className="survey-row__metrics">
          <div className="survey-row__metric">
            <span className="survey-row__metric-value">{item.voteCount || 0}</span>
            <span className="survey-row__metric-label">VOTES</span>
          </div>
          <div className="survey-row__metric">
            <span className="survey-row__metric-value survey-row__metric-value--secondary">
              {item.responseCount || 0}
            </span>
            <span className="survey-row__metric-label">RESPONSES</span>
          </div>
        </div>

        <div className="survey-row__actions">
          {canVote && (
            <button
              type="button"
              className="survey-row__btn survey-row__btn--vote"
              disabled={busy}
              onClick={() => onVote?.(item.id)}
            >
              <ThumbsUp size={14} />
              Upvote
            </button>
          )}
          {isAuthenticated && item.canRespond && (
            <Link className="survey-row__btn survey-row__btn--primary" to={`/ai-exchange/survey/${item.id}`}>
              Take Survey
              <ChevronRight size={14} />
            </Link>
          )}
          {item.isOwner && (
            <Link className="survey-row__btn survey-row__btn--analytics" to={`/ai-exchange/survey/${item.id}/details`}>
              <Eye size={14} />
              Analytics
            </Link>
          )}
          {(!isAuthenticated || (!item.isOwner && !item.canRespond)) && (
            <Link className="survey-row__btn survey-row__btn--secondary" to={`/ai-exchange/survey/${item.id}`}>
              View Details
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

export default AIExchange
