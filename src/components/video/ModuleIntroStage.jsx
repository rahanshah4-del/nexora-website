import { MODULE_INTROS } from '../../lib/moduleIntros.js'
import { Stage } from './fx.jsx'
import GenericIntro from './intros/GenericIntro.jsx'
import PremiumAiIntro from './intros/PremiumAiIntro.jsx'
import { INTRO_CONFIGS } from './intros/introConfigs.js'
import RestaurantPosIntro from './intros/RestaurantPosIntro.jsx'

/**
 * One frame of a module intro video at time t (seconds), drawn in a fixed
 * 1280 x 720 space (rendered at 1.5x to 1920 x 1080). Every frame is a pure
 * function of t. To add a module: write its scene in ./intros/ and list it here.
 */
const SCENES = {
  'restaurant-pos': RestaurantPosIntro,
  'nexora-ai': PremiumAiIntro,
}

export default function ModuleIntroStage({ id, t }) {
  const intro = MODULE_INTROS[id]
  const Intro = SCENES[id]
  if (!intro || (!Intro && !INTRO_CONFIGS[id])) return null
  // a light intro draws its own stage; the others share the dark one
  if (intro.style === 'light') return <Intro t={t} />
  return (
    <Stage t={t} accent={intro.accent}>
      {Intro ? <Intro t={t} /> : <GenericIntro id={id} t={t} />}
    </Stage>
  )
}
