/**
 * Lazy loader for Midtrans Snap.js. Single-shot: re-uses an existing script
 * tag if already injected. Picks the sandbox URL by default; production must
 * set VITE_MIDTRANS_PRODUCTION=true at build time.
 */

const SCRIPT_ID = 'midtrans-snap-script'

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: unknown) => void
          onPending?: (result: unknown) => void
          onError?: (result: unknown) => void
          onClose?: () => void
        },
      ) => void
    }
  }
}

function snapScriptUrl(): string {
  const isProd =
    import.meta.env.VITE_MIDTRANS_PRODUCTION === 'true' ||
    import.meta.env.VITE_MIDTRANS_PRODUCTION === '1'
  return isProd
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'
}

function clientKey(): string {
  return (
    (import.meta.env.VITE_MIDTRANS_CLIENT_KEY as string | undefined) ?? ''
  )
}

export async function loadSnap(): Promise<NonNullable<Window['snap']>> {
  if (typeof window === 'undefined') {
    throw new Error('Midtrans Snap hanya tersedia di browser')
  }
  if (window.snap) return window.snap

  const existing = document.getElementById(SCRIPT_ID)
  if (existing) {
    await new Promise<void>((resolve) => {
      existing.addEventListener('load', () => resolve(), { once: true })
    })
    if (!window.snap) throw new Error('Snap.js failed to initialise')
    return window.snap
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = snapScriptUrl()
    const ck = clientKey()
    if (ck) script.setAttribute('data-client-key', ck)
    script.async = true
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Gagal memuat Snap.js — periksa koneksi internet.'))
    document.head.appendChild(script)
  })

  if (!window.snap) throw new Error('Snap.js loaded but window.snap missing')
  return window.snap
}
