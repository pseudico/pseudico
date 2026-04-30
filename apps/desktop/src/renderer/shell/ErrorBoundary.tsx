import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  errorMessage: string | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    errorMessage: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      errorMessage: error.message
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Renderer error boundary caught an error.", error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.errorMessage) {
      return (
        <main className="error-screen">
          <section className="error-panel">
            <p className="top-eyebrow">Renderer error</p>
            <h1>Local Work OS could not render this view.</h1>
            <p>{this.state.errorMessage}</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
