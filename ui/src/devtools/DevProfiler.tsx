import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from "react";
import { devLogger } from "./dev-logger";

export interface DevProfilerProps {
  id: string;
  children: ReactNode;
}

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  devLogger.reportCommit(id, phase, actualDuration);
};

/** Reports slow and excessive commits in dev; renders children untouched in production. */
export function DevProfiler({ id, children }: DevProfilerProps): ReactNode {
  if (!import.meta.env.DEV) return children;
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
