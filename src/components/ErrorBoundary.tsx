import { Component, type ErrorInfo, type ReactNode } from 'react'
import Icon from './Icon'
import appShell from '../i18n/ns/appShell'

// A chunk that can't be fetched (offline, or removed by a deploy the tab
// hasn't picked up). Wording differs per browser.
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unable to preload CSS/i.test(message)
}

type Props = {
  children: ReactNode
  // Any change clears the error (e.g. the page shown), so leaving a broken
  // page brings the next one back instead of keeping the error screen.
  resetKey?: unknown
  // What to show instead; default = <ErrorScreen>.
  fallback?: ReactNode
  fullScreen?: boolean
}

type State = { error: unknown; hasError: boolean }

// React 19 unmounts the whole root on an uncaught render error (blank page):
// this keeps the damage to the part that failed and offers a way out.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, hasError: false }

  static getDerivedStateFromError(error: unknown): State {
    return { error, hasError: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Render error caught by ErrorBoundary', error, info.componentStack)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && !Object.is(prev.resetKey, this.props.resetKey)) this.setState({ error: null, hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback
    return <ErrorScreen error={this.state.error} fullScreen={this.props.fullScreen} />
  }
}

// Sober screen in the app's style: what happened, « Recharger », and a way
// home. A missing chunk while offline says so instead. Strings read with
// `appShell.t` (no hook: this screen also stands in for a crashed tree).
export function ErrorScreen({ error, fullScreen, compact }: { error: unknown; fullScreen?: boolean; compact?: boolean }) {
  const offline = isChunkLoadError(error) && typeof navigator !== 'undefined' && navigator.onLine === false
  return (
    <div role="alert" className={`flex items-center justify-center px-4 text-center ${fullScreen ? 'min-h-screen bg-surface' : compact ? 'h-full py-8' : 'min-h-[60vh] py-10'}`}>
      <div className="flex max-w-sm flex-col items-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-fixed text-primary">
          <Icon name={offline ? 'wifi_off' : 'error'} size={32} />
        </span>
        <h1 className="m-0 mt-4 text-headline-sm text-on-surface">{offline ? appShell.t('error.offlineTitle') : appShell.t('error.title')}</h1>
        <p className="m-0 mt-1 text-body-md text-on-surface-variant">
          {offline ? appShell.t('error.offlineText') : appShell.t('error.text')}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => window.location.reload()} className="flex h-11 cursor-pointer items-center gap-1.5 rounded-xl border-none bg-primary px-5 text-label-md text-white">
            <Icon name="refresh" size={18} /> {offline ? appShell.t('error.retry') : appShell.t('error.reload')}
          </button>
          {!compact && (
            <a href="/" className="flex h-11 items-center rounded-xl bg-surface-container-high px-5 text-label-md text-on-surface no-underline">
              {appShell.t('error.home')}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
