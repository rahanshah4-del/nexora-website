import { createRoot } from 'react-dom/client'
import './index.css'
import './pages/public/tools/geolint.css'
import { SpeedCard } from './pages/public/tools/GeoLintSpeedPanel.jsx'
const run=(s)=>({score:s,metrics:{},ratings:{},opportunities:[],field:null})
const done={status:'done',error:'',run(){},speed:{before:{mobile:run(41),desktop:run(80)},after:{mobile:run(72),desktop:run(95)}}}
createRoot(document.getElementById('r')).render(<div style={{maxWidth:1000,margin:'0 auto',padding:12}}><SpeedCard test={done}/><SpeedCard test={{status:'loading',speed:null,error:'',run(){}}}/><SpeedCard test={{status:'error',speed:null,error:"Google's speed test is busy or its free quota is used up.",run(){}}}/></div>)
