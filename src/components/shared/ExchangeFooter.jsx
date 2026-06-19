import { Link } from 'react-router-dom'
import './shared-exchange.css'

export default function ExchangeFooter() {
  return (
    <footer className="exch-footer">
      <p className="exch-footer__text">
        <Link to="/">Home</Link>
        <span> · </span>
        <Link to="/ai-exchange/create-survey">Create survey</Link>
      </p>
    </footer>
  )
}
