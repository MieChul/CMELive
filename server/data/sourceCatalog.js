/**
 * Master source catalog for the AI News Agent.
 * Each entry defines a key, display label, tier, and RSS feed URL.
 * Sources without a public RSS feed (rss: null) can only be reached via NewsAPI.
 */

export const SOURCE_TIERS = [
  { id: 'industry',  label: 'Tier 1 — Industry & Breaking News', color: '#F2665B', desc: 'Studio strategy, OTT moves, ad models, partnerships' },
  { id: 'business',  label: 'Tier 2 — Business & CXO Insights',  color: '#FF8A7A', desc: 'Why decisions are made, investor analysis' },
  { id: 'streaming', label: 'Tier 3 — OTT & Streaming Intel',     color: '#A78BFA', desc: 'Streaming economics, subscription vs ad-tier, content ROI' },
  { id: 'adtech',    label: 'Tier 4 — AdTech & Monetization',     color: '#FFB347', desc: 'Programmatic trends, retail media, CTV ads' },
  { id: 'sports',    label: 'Tier 5 — Sports, Gaming & Live',     color: '#00E5A0', desc: 'Media rights deals, streaming + betting, fan engagement' },
  { id: 'tech',      label: 'Tier 6 — Tech, AI & Innovation',     color: '#60A5FA', desc: 'AI in media, creator economy, journalism future' },
  { id: 'premium',   label: 'Tier 7 — Premium Business Press',    color: '#F472B6', desc: 'Deep editorial context from premium publications' },
  { id: 'search',    label: 'Tier 8 — Search & Discovery (GCP)',  color: '#4285F4', desc: 'Google Custom Search — broad web news discovery. Requires GOOGLE_CSE_API_KEY + GOOGLE_CSE_ID in env.' },
]

export const SOURCE_CATALOG = {
  // ── Tier 1: Industry & Breaking News ──────────────────────────────────────
  variety:         { label: 'Variety',               tier: 'industry',  rss: 'https://variety.com/feed/' },
  thr:             { label: 'Hollywood Reporter',     tier: 'industry',  rss: 'https://www.hollywoodreporter.com/feed/' },
  deadline:        { label: 'Deadline',               tier: 'industry',  rss: 'https://deadline.com/feed/' },
  nexttv:          { label: 'Broadcasting & Cable',   tier: 'industry',  rss: 'https://www.nexttv.com/rss/news' },
  mediapost:       { label: 'MediaPost',              tier: 'industry',  rss: 'https://www.mediapost.com/rss/' },
  adweek:          { label: 'Adweek',                 tier: 'industry',  rss: 'https://www.adweek.com/feed/' },

  // ── Tier 2: Business & CXO ────────────────────────────────────────────────
  bloomberg:       { label: 'Bloomberg Media',        tier: 'business',  rss: null },         // NewsAPI only
  reuters:         { label: 'Reuters Media',          tier: 'business',  rss: 'https://feeds.reuters.com/reuters/businessNews' },
  cnbc:            { label: 'CNBC Media',             tier: 'business',  rss: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000108' },
  wsj:             { label: 'Wall Street Journal',    tier: 'business',  rss: 'https://feeds.a.dj.com/rss/RSSWSJD.xml' },
  ft:              { label: 'Financial Times',        tier: 'business',  rss: 'https://www.ft.com/rss/home/uk' },
  axios:           { label: 'Axios Media',            tier: 'business',  rss: 'https://api.axios.com/feed/' },

  // ── Tier 3: OTT & Streaming ───────────────────────────────────────────────
  theinformation:  { label: 'The Information',        tier: 'streaming', rss: null },         // Paywalled
  lightshed:       { label: 'LightShed Partners',     tier: 'streaming', rss: 'https://www.lightshedpartners.com/feed/' },
  parrotanalytics: { label: 'Parrot Analytics',       tier: 'streaming', rss: null },         // No public RSS
  ampere:          { label: 'Ampere Analysis',        tier: 'streaming', rss: null },         // No public RSS
  midiaresearch:   { label: 'MIDiA Research',         tier: 'streaming', rss: 'https://midiaresearch.com/blog/feed/' },
  tvrev:           { label: 'TVREV',                  tier: 'streaming', rss: 'https://tvrev.com/feed/' },

  // ── Tier 4: AdTech & Monetization ─────────────────────────────────────────
  adexchanger:     { label: 'AdExchanger',            tier: 'adtech',    rss: 'https://www.adexchanger.com/feed/' },
  digiday:         { label: 'Digiday',                tier: 'adtech',    rss: 'https://digiday.com/feed/' },
  exchangewire:    { label: 'ExchangeWire',           tier: 'adtech',    rss: 'https://www.exchangewire.com/feed/' },
  insiderintel:    { label: 'eMarketer / Insider Intel', tier: 'adtech', rss: null },         // No public RSS

  // ── Tier 5: Sports, Gaming & Live ─────────────────────────────────────────
  sbj:             { label: 'Sports Business Journal', tier: 'sports',   rss: 'https://www.sportsbusinessjournal.com/Daily/Morning-Buzz.aspx?feed=rss' },
  sportspro:       { label: 'SportsPro Media',         tier: 'sports',   rss: 'https://www.sportspromedia.com/feed/' },
  frontoffice:     { label: 'Front Office Sports',     tier: 'sports',   rss: 'https://frontofficesports.com/feed/' },
  gamesindustry:   { label: 'GamesIndustry.biz',      tier: 'sports',   rss: 'https://www.gamesindustry.biz/feed' },

  // ── Tier 6: Tech, AI & Innovation ─────────────────────────────────────────
  techcrunch:      { label: 'TechCrunch',              tier: 'tech',     rss: 'https://techcrunch.com/feed/' },
  theverge:        { label: 'The Verge',               tier: 'tech',     rss: 'https://www.theverge.com/rss/index.xml' },
  venturebeat:     { label: 'VentureBeat',             tier: 'tech',     rss: 'https://venturebeat.com/feed/' },
  niemanlab:       { label: 'Nieman Lab',              tier: 'tech',     rss: 'https://www.niemanlab.org/feed/' },

  // ── Tier 7: Premium Business Press ────────────────────────────────────────
  nytimes:         { label: 'New York Times',          tier: 'premium',  rss: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml' },
  washingtonpost:  { label: 'Washington Post',         tier: 'premium',  rss: 'https://feeds.washingtonpost.com/rss/business' },
  economist:       { label: 'The Economist',           tier: 'premium',  rss: 'https://www.economist.com/business/rss.xml' },
  guardian:        { label: 'The Guardian',            tier: 'premium',  rss: 'https://www.theguardian.com/media/rss' },
  latimes:         { label: 'LA Times Entertainment',  tier: 'premium',  rss: 'https://www.latimes.com/entertainment-arts/rss2.0.xml' },
  forbes:          { label: 'Forbes Media',            tier: 'premium',  rss: 'https://www.forbes.com/innovation/feed2/' },
  fastcompany:     { label: 'Fast Company',            tier: 'premium',  rss: 'https://www.fastcompany.com/latest/rss' },
  businessinsider: { label: 'Business Insider',        tier: 'premium',  rss: 'https://feeds.businessinsider.com/tech' },
  fortune:         { label: 'Fortune',                 tier: 'premium',  rss: 'https://fortune.com/feed/' },
  politico:        { label: 'Politico Media',          tier: 'premium',  rss: 'https://www.politico.com/rss/media.xml' },

  // ── Tier 8: Search & Discovery (GCP) ──────────────────────────────────────
  googlecse:       { label: 'Google Custom Search',    tier: 'search',   rss: null, apiType: 'google-cse' },
}

/** Default enabled sources (a balanced starter set) */
export const DEFAULT_ENABLED_SOURCES = [
  'variety', 'thr', 'deadline',
  'reuters', 'axios',
  'tvrev', 'midiaresearch',
  'adexchanger', 'digiday',
  'techcrunch', 'theverge', 'venturebeat', 'niemanlab',
  'guardian', 'fortune',
]
