import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 text-center">
            <p className="text-sm text-zinc-500">Something went wrong loading this content.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 text-xs text-lime-400 hover:text-lime-300"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}