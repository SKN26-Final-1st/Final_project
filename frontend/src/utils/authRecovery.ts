const AUTH_RECOVERY_LOGOUT_TIMEOUT_MS = 1500;

let pendingRecoveryLogout: Promise<void> | null = null;

export function registerAuthRecoveryLogout(request: Promise<unknown>) {
  const trackedRequest = request.then(
    () => undefined,
    () => undefined,
  );
  pendingRecoveryLogout = trackedRequest;

  void trackedRequest.finally(() => {
    if (pendingRecoveryLogout === trackedRequest) {
      pendingRecoveryLogout = null;
    }
  });
}

export function startAuthRecoveryLogout(action: (signal: AbortSignal) => Promise<unknown>) {
  const controller = new AbortController();
  let timeoutId: number | null = null;
  const timeout = new Promise<void>((resolve) => {
    timeoutId = window.setTimeout(() => {
      controller.abort();
      resolve();
    }, AUTH_RECOVERY_LOGOUT_TIMEOUT_MS);
  });
  const request = action(controller.signal).then(
    () => undefined,
    () => undefined,
  );
  const recoveryLogout = Promise.race([request, timeout]).finally(() => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  });

  registerAuthRecoveryLogout(recoveryLogout);
}

export function waitForAuthRecoveryLogout() {
  return pendingRecoveryLogout ?? Promise.resolve();
}
