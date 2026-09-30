import { Component, type ReactNode } from 'react'

interface Props {
  /** Called before re-rendering children, e.g. to reset failed queries so they refetch. */
  onReset: () => void
  fallback: (retry: () => void, error: Error) => ReactNode
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  retry = () => {
    this.props.onReset()
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) return this.props.fallback(this.retry, this.state.error)
    return this.props.children
  }
}
