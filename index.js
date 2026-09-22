const shared = globalThis[Symbol.for("lomi.plugin-api.v1")];
if (!shared)
  throw new Error(
    "The Lomi plugin SDK must run in the main application window.",
  );
export const HostContext = shared.sdk.HostContext;
export const useHostContext = shared.sdk.useHostContext;
