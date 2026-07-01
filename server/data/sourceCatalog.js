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

/* ════════════════════════════════════════════════════════════════════════════
   TRENDS — General world news catalog (separate from the AI/media feed above)
   Broad global coverage: world, politics, business, tech, science, sports, etc.
   ════════════════════════════════════════════════════════════════════════════ */

export const TRENDS_SOURCE_TIERS = [
  { id: 'world',    label: 'Tier 1 — Global Wire & Breaking',  color: '#F2665B', desc: 'International wire services and breaking world news' },
  { id: 'business', label: 'Tier 2 — Business & Economy',      color: '#FF8A7A', desc: 'Markets, economy, finance and corporate news' },
  { id: 'tech',     label: 'Tier 3 — Technology & Science',    color: '#60A5FA', desc: 'Consumer tech, gadgets, research and discovery' },
  { id: 'politics', label: 'Tier 4 — Politics & Policy',       color: '#FFB347', desc: 'Government, elections, policy and geopolitics' },
  { id: 'sports',   label: 'Tier 5 — Sports & Live',           color: '#00E5A0', desc: 'Global sports, leagues, tournaments and results' },
  { id: 'culture',  label: 'Tier 6 — Culture & Lifestyle',     color: '#A78BFA', desc: 'Health, science, environment, arts and society' },
  { id: 'search',   label: 'Tier 7 — Search & Discovery (GCP)', color: '#4285F4', desc: 'Google Custom Search — broad web news discovery. Requires GOOGLE_CSE_API_KEY + GOOGLE_CSE_ID in env.' },
]

export const TRENDS_SOURCE_CATALOG = {
  // ── Tier 1: Global Wire & Breaking ────────────────────────────────────────
  reutersworld:    { label: 'Reuters World',          tier: 'world',    rss: 'https://feeds.reuters.com/Reuters/worldNews' },
  bbcworld:        { label: 'BBC World',              tier: 'world',    rss: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  aljazeera:       { label: 'Al Jazeera',             tier: 'world',    rss: 'https://www.aljazeera.com/xml/rss/all.xml' },
  apnews:          { label: 'Associated Press',       tier: 'world',    rss: 'https://news.google.com/rss/search?q=when:1d+allinurl:apnews.com&hl=en-US&gl=US&ceid=US:en' },
  npr:             { label: 'NPR News',               tier: 'world',    rss: 'https://feeds.npr.org/1001/rss.xml' },
  guardianworld:   { label: 'The Guardian World',     tier: 'world',    rss: 'https://www.theguardian.com/world/rss' },

  // ── Tier 2: Business & Economy ────────────────────────────────────────────
  reutersbiz:      { label: 'Reuters Business',       tier: 'business', rss: 'https://feeds.reuters.com/reuters/businessNews' },
  cnbcbiz:         { label: 'CNBC',                   tier: 'business', rss: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664' },
  bbcbusiness:     { label: 'BBC Business',           tier: 'business', rss: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  marketwatch:     { label: 'MarketWatch',            tier: 'business', rss: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  economisttrends: { label: 'The Economist',          tier: 'business', rss: 'https://www.economist.com/finance-and-economics/rss.xml' },

  // ── Tier 3: Technology & Science ──────────────────────────────────────────
  bbctech:         { label: 'BBC Technology',         tier: 'tech',     rss: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  techcrunchtr:    { label: 'TechCrunch',             tier: 'tech',     rss: 'https://techcrunch.com/feed/' },
  arstechnica:     { label: 'Ars Technica',           tier: 'tech',     rss: 'https://feeds.arstechnica.com/arstechnica/index' },
  vergetr:         { label: 'The Verge',              tier: 'tech',     rss: 'https://www.theverge.com/rss/index.xml' },
  sciencedaily:    { label: 'ScienceDaily',           tier: 'tech',     rss: 'https://www.sciencedaily.com/rss/top/science.xml' },

  // ── Tier 4: Politics & Policy ─────────────────────────────────────────────
  bbcpolitics:     { label: 'BBC Politics',           tier: 'politics', rss: 'https://feeds.bbci.co.uk/news/politics/rss.xml' },
  politicotr:      { label: 'Politico',               tier: 'politics', rss: 'https://www.politico.com/rss/politicopicks.xml' },
  thehill:         { label: 'The Hill',               tier: 'politics', rss: 'https://thehill.com/rss/syndicator/19110' },
  guardianpolitics:{ label: 'The Guardian Politics',  tier: 'politics', rss: 'https://www.theguardian.com/politics/rss' },

  // ── Tier 5: Sports & Live ─────────────────────────────────────────────────
  bbcsport:        { label: 'BBC Sport',              tier: 'sports',   rss: 'https://feeds.bbci.co.uk/sport/rss.xml' },
  espn:            { label: 'ESPN',                   tier: 'sports',   rss: 'https://www.espn.com/espn/rss/news' },
  skysports:       { label: 'Sky Sports',             tier: 'sports',   rss: 'https://www.skysports.com/rss/12040' },
  guardiansport:   { label: 'The Guardian Sport',     tier: 'sports',   rss: 'https://www.theguardian.com/sport/rss' },

  // ── Tier 6: Culture & Lifestyle ───────────────────────────────────────────
  bbchealth:       { label: 'BBC Health',             tier: 'culture',  rss: 'https://feeds.bbci.co.uk/news/health/rss.xml' },
  natgeo:          { label: 'National Geographic',    tier: 'culture',  rss: 'https://www.nationalgeographic.com/pages/topic/latest-stories.rss' },
  guardianculture: { label: 'The Guardian Culture',   tier: 'culture',  rss: 'https://www.theguardian.com/culture/rss' },
  guardianenv:     { label: 'The Guardian Environment',tier: 'culture', rss: 'https://www.theguardian.com/environment/rss' },

  // ── Tier 7: Search & Discovery (GCP) ──────────────────────────────────────
  googlecse:       { label: 'Google Custom Search',    tier: 'search',  rss: null, apiType: 'google-cse' },
}

/** Default enabled trends sources (a balanced global starter set) */
export const DEFAULT_TRENDS_ENABLED_SOURCES = [
  'reutersworld', 'bbcworld', 'aljazeera', 'npr',
  'reutersbiz', 'cnbcbiz',
  'bbctech', 'arstechnica',
  'bbcpolitics', 'thehill',
  'bbcsport', 'espn',
  'bbchealth', 'guardianculture',
]
