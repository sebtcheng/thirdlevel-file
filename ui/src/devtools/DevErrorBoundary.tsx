import { Component, type ErrorInfo, type ReactNode } from "react";
import { devLogger } from "./dev-logger";

export interface DevErrorBoundaryProps {
  children: ReactNode;
  /** The app's existing fallback. Without one the error is rethrown to the nearest parent boundary. */
  fallback?: ReactNode;
}

/** Errors whose commit reached componentDidCatch (so their component stack was logged). */
const committed = new WeakSet<Error>();

/** Throws on demand, from a child, so the boundary above can catch it (a component cannot catch its own render). */
function InjectedCrash({ armed }: { armed: boolean }): null {
  if (armed) throw new Error("Injected render crash (dev-diagnostics verify)");
  return null;
}

interface State {
  error: Error | null;
  forcedCrash: boolean;
}

/** Logs every render error with its component stack, then defers to the app's own fallback. No styling. */
export class DevErrorBoundary extends Component<DevErrorBoundaryProps, State> {
  public override state: State = { error: null, forcedCrash: false };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    if (import.meta.env.DEV) {
      // Rethrowing without a fallback means React never commits this boundary, so componentDidCatch never runs.
      // Log from a microtask unless the committed path already did (that one has the component stack).
      queueMicrotask(() => {
        if (!committed.has(error)) devLogger.logReactError(error, {});
      });
    }
    return { error };
  }

  public override componentDidMount(): void {
    if (import.meta.env.DEV) {
      // Lets scripts/verify.mjs prove the boundary works end to end.
      // oxlint-disable-next-line react/no-did-mount-set-state
      window.__DEV_DIAG_CRASH__ = () => this.setState({ forcedCrash: true });
    }
  }

  public override componentWillUnmount(): void {
    if (import.meta.env.DEV) delete window.__DEV_DIAG_CRASH__;
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      committed.add(error);
      devLogger.logReactError(error, info);
    }
  }

  public override render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      throw this.state.error;
    }
    return (
      <>
        {this.props.children}
        <InjectedCrash armed={this.state.forcedCrash} />
      </>
    );
  }
}
