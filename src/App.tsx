/**
 * @licens
 * SPDX-License-Ide: Apache-2.
 */

import { lazy, Suspense, useEffect } from "react";
import { HashRouter as Router } from "react-router-dom";

import { AppRoutes } from "./app/routes";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { PWAUpdateToast } from "./components/PWAUpdateToast";
import { SessionManager } from "./components/SessionManager";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ToastContainer } from "./components/ui/Toast";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { setupPrefetchListeners } from "./utils/prefetch";

const OfflineIndicator = lazy(() =>
  import("./components/OfflineIndicator").then((m) => ({
    default: m.OfflineIndicator,
  })),
);
const MotionConfigWrapper = lazy(() =>
  import("./app/providers").then((m) => ({ default: m.MotionConfigWrapper })),
);

export default function App() {
  useEffect(() => {
    if (
      window.location.pathname !== "/" &&
      window.location.pathname !== "/index.html"
    ) {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      window.history.replaceState(null, "", `/#${path}${search}${hash}`);
    }
    const cleanup = setupPrefetchListeners();
    return cleanup;
  }, []);

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <MotionConfigWrapper>
          <ThemeProvider>
            <AuthProvider>
              <Router>
                {/* Skip-to-content links are rendered per role layout
                    (AppShell / AdminLayout / ParentLayout / PrincipalLayout)
                    so they can be positioned correctly inside each shell.
                    Rendering a global one here caused duplicate skip links. */}
                <ToastContainer />
                <OfflineIndicator />
                <PWAUpdateToast />
                <PWAInstallBanner />
                <SessionManager />
                <main id="main-content" tabIndex={-1} className="outline-none">
                  <AppRoutes />
                </main>
              </Router>
            </AuthProvider>
          </ThemeProvider>
        </MotionConfigWrapper>
      </Suspense>
    </ErrorBoundary>
  );
}
