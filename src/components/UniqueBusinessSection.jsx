import './UniqueBusinessSection.css'
import excitedGif from '../assets/HomePage/excited.gif'
import bearMp4 from '../assets/HomePage/bear.mp4'
import omgMp4 from '../assets/HomePage/omg.mp4'
import crossShapedGuy from '../assets/HomePage/source_cross-shaped-guy.png'

const ChevronIcon = ({ size = 36 }) => (
  <svg
    className="ubs-chevron"
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="18" cy="18" r="18" fill="#1E1A22" />
    <path
      d="M12 15L18 21L24 15"
      stroke="#ffffff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const Card = ({ text, variant }) => (
  <div className={`ubs-card ubs-card--${variant}`}>
    <span className="ubs-card-text">{text}</span>
    <ChevronIcon />
  </div>
)

const ScrollUnit = (props) => (
  <div className="ubs-unit" {...props}>
    {/* Main text drives the unit width */}
    <span className="ubs-main-text">Unique Business Creativity Stories</span>

    {/* ── ABOVE the text ── */}
    <div className="ubs-item ubs-item--1">
      <img src={excitedGif} alt="" className="ubs-media" />
    </div>
    <div className="ubs-item ubs-item--2">
      <Card text="AI-native thinking" variant="pink" />
    </div>
    <div className="ubs-item ubs-item--3">
      <img src={crossShapedGuy} alt="" className="ubs-media ubs-media--tall" />
    </div>
    <div className="ubs-item ubs-item--4">
      <Card text="Large scale impact" variant="green" />
    </div>

    {/* ── BELOW the text ── */}
    <div className="ubs-item ubs-item--5">
      <Card text="First-of-a-kind" variant="green" />
    </div>
    <div className="ubs-item ubs-item--6">
      <video className="ubs-media" autoPlay muted loop playsInline>
        <source src={bearMp4} type="video/mp4" />
      </video>
    </div>
    <div className="ubs-item ubs-item--7">
      <Card text="Experience Redefined" variant="pink" />
    </div>
    <div className="ubs-item ubs-item--8">
      <video className="ubs-media" autoPlay muted loop playsInline>
        <source src={omgMp4} type="video/mp4" />
      </video>
    </div>
  </div>
)

const UniqueBusinessSection = () => (
  <section className="ubs-section">
    <div className="ubs-marquee" aria-label="Unique Business Creativity Stories">
      <ScrollUnit />
      <ScrollUnit aria-hidden="true" />
    </div>
  </section>
)

export default UniqueBusinessSection
