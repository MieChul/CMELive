import { Link } from 'react-router-dom'
import { useAuth, PLACEHOLDER_AVATAR } from '../../context/AuthContext'
import './shared-exchange.css'

function imgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return path
}

export default function SurveyCard({ item, onVote, busy }) {
  const { isAuthenticated } = useAuth()
  const canVote = isAuthenticated && item.isOwner === false
  const desc = (item.description || '').slice(0, 120) + (item.description?.length > 120 ? '…' : '')

  return (
    <article className="survey-card">
      <div className="survey-card__media">
        {item.imageUrl ? (
          <img
            src={imgUrl(item.imageUrl)}
            alt=""
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        ) : (
          <div className="survey-card__placeholder" />
        )}
        <div className="survey-card__owner">
          <img
            src={item.ownerProfilePicUrl || PLACEHOLDER_AVATAR}
            alt=""
            onError={(e) => {
              e.target.src = PLACEHOLDER_AVATAR
            }}
          />
          <div className="survey-card__owner-text">
            <span className="survey-card__owner-name">{item.ownerName || 'User'}</span>
            {item.isOwner ? <span className="survey-card__owner-badge">Owner</span> : null}
          </div>
        </div>
      </div>
      <div className="survey-card__body">
        <div className="survey-card__top">
          <h3 className="survey-card__title">{item.title}</h3>
          <div className="survey-card__stats">
            <span className="survey-pill">
              <span className="dot dot--pink" />
              {item.voteCount ?? 0} votes
            </span>
            <span className="survey-pill">
              <span className="dot dot--cyan" />
              {item.responseCount ?? 0} responses
            </span>
          </div>
        </div>
        <p className="survey-card__desc">{desc || ' '}</p>
        <div className="survey-card__actions">
          {isAuthenticated && item.canRespond && (
            <Link className="btn btn-primary survey-card__btn" to={`/ai-exchange/survey/${item.id}`}>
              Respond
            </Link>
          )}
          {canVote && (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => onVote?.(item.id)}
            >
              Upvote
            </button>
          )}
          {item.isOwner && (
            <Link className="btn btn-ghost" to={`/ai-exchange/survey/${item.id}/details`}>
              View Analytics
            </Link>
          )}
          {(!isAuthenticated || !item.isOwner) && (
            <Link className="btn btn-ghost" to={`/ai-exchange/survey/${item.id}`}>
              View Details
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
