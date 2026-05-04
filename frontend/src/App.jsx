import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import AudioLibrary from './pages/AudioLibrary'
import Practice from './pages/Practice'
import Settings from './pages/Settings'
import Gallery from './pages/Gallery'
import OralHome from './pages/OralHome'
import OralPractice from './pages/OralPractice'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/speaking" element={<AudioLibrary />} />
        <Route path="/speaking/:audioFileId" element={<Practice />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/oral" element={<OralHome />} />
        <Route path="/oral/:type" element={<OralPractice />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}
