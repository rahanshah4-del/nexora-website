import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Nexora App] Runtime error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-slate-950">
          <section className="w-full max-w-xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-600">Nexora</p>
            <h1 className="mt-3 text-2xl font-black tracking-tight">Application could not render</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              A runtime error was caught before the page could finish loading. Please reload or sign in again.
            </p>
            <pre className="mt-4 max-h-56 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-rose-100">
              {this.state.error?.message || String(this.state.error)}
            </pre>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
                onClick={() => this.setState({ error: null })}
              >
                Try Again
              </button>
              <a className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700" href="/login">
                Go to Login
              </a>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
