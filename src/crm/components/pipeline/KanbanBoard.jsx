import { memo, useMemo, useState } from 'react'
import Badge from '../ui/Badge.jsx'
import DealCard from './DealCard.jsx'
import DealDrawer from './DealDrawer.jsx'
import { pipelineStages } from '../../data/pipelineStages.js'

function KanbanBoard({ deals, onMove, onSave, onDelete }) {
  const [openDeal, setOpenDeal] = useState(null)

  const byStage = useMemo(() => {
    const map = Object.fromEntries(pipelineStages.map((s) => [s, []]))
    for (const d of deals) map[d.stage]?.push(d)
    return map
  }, [deals])

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {pipelineStages.map((stage) => (
          <section
            key={stage}
            className="w-[18rem] shrink-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const dealId = e.dataTransfer.getData('text/dealId')
              if (!dealId) return
              onMove?.(dealId, stage)
            }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{stage}</p>
              <Badge variant="default">{byStage[stage]?.length ?? 0}</Badge>
            </div>
            <div className="space-y-3">
              {(byStage[stage] ?? []).map((deal) => (
                <DealCard key={deal.id} deal={deal} onOpen={() => setOpenDeal(deal)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <DealDrawer
        open={!!openDeal}
        deal={openDeal}
        onClose={() => setOpenDeal(null)}
        onSave={(d) => {
          onSave?.(d)
          setOpenDeal(null)
        }}
        onDelete={(d) => {
          onDelete?.(d)
          setOpenDeal(null)
        }}
      />
    </>
  )
}

export default memo(KanbanBoard)
