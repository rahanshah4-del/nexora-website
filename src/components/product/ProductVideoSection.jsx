import { PRODUCT_VIDEOS, productVideoSchemas } from '../../lib/productVideos.js'
import ProductLoopVideo from './ProductLoopVideo.jsx'

/** The "see it at work" loops for a product page; renders nothing for products without clips. */
export default function ProductVideoSection({ solutionSlug }) {
  const group = PRODUCT_VIDEOS[solutionSlug]
  if (!group) return null
  const schemas = productVideoSchemas(solutionSlug)
  return (
    <section id="see-it-at-work" data-reveal className="bg-white py-16 sm:py-20 lg:py-24" aria-labelledby="see-it-heading">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="see-it-heading" className="text-3xl font-medium tracking-tight text-slate-900 sm:text-5xl">{group.heading}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-500">{group.intro}</p>
        </div>
        <div className="mt-14 grid gap-16 lg:gap-24">
          {group.clips.map((clip, index) => <ProductLoopVideo key={clip.id} clip={clip} reverse={index % 2 === 1} />)}
        </div>
        <p className="mx-auto mt-12 max-w-2xl text-center text-xs leading-6 text-slate-400">Illustrations with sample data. The screens are simplified, and the figures and names are made up.</p>
      </div>
      {schemas.map((schema) => <script key={schema['@id']} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />)}
    </section>
  )
}
