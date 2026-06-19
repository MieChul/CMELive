import './App.css'
import SiteHeader from './components/SiteHeader'
import HeroSection from './components/HeroSection'
import NewsSection from './components/NewsSection'
import MediaEntertainment from './components/MediaEntertainment'
import ArticlesSection from './components/ArticlesSection'
import UniqueBusinessSection from './components/UniqueBusinessSection'
import CardGridSection from './components/CardGridSection'
import CMERadarSection from './components/CMERadarSection'
import CornerOfficeSection from './components/CornerOfficeSection'
import CustomerSignalSection from './components/CustomerSignalSection'
import Footer from './components/Footer'
import CircularTextCursor from './components/CircularTextCursor'

function App() {
  return (
    <div className="app">
      <CircularTextCursor />
      <SiteHeader />
      <main>
        <HeroSection />
        <NewsSection />
        <MediaEntertainment />
        <ArticlesSection />
        <UniqueBusinessSection />
        <CardGridSection />
        <CMERadarSection />
        <CornerOfficeSection />
        <CustomerSignalSection />
      </main>
      <Footer />
    </div>
  )
}

export default App
