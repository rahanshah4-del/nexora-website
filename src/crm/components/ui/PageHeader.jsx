export default function PageHeader({ title, subtitle, right }) {
  return (
    <div className="mb-5 flex min-w-0 flex-col gap-3 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-300">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">{right}</div> : null}
    </div>
  )
}
