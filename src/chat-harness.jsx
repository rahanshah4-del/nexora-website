import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import './index.css'
import './pages/public/tools/geolint.css'
import './pages/public/tools/GeoLintChat.css'
import UpsellFloat from './pages/public/tools/GeoLintUpsell.jsx'
import { ChatLauncher } from './pages/public/tools/GeoLintChat.jsx'
const order={id:'o1',plan:'geo',status:'completed',siteUrl:'https://ex.com',after:{scorePercent:94},siteCrawl:{score:{indexable:71.9},distribution:{fair:75,poor:0,good:100,excellent:25}}}
createRoot(document.getElementById('r')).render(<MemoryRouter><div style={{height:800}}>content</div><UpsellFloat order={order}/><ChatLauncher unread={0} onClick={()=>{}}/></MemoryRouter>)
