import { useMemo, useState } from 'react'

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID || ''

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  message: '',
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

function formatTelegramMessage({ fullName, email, phone, address, message }) {
  const safe = (v) => String(v || '').trim()
  return [
    'New Form Submission:',
    `Name: ${safe(fullName)}`,
    `Email: ${safe(email)}`,
    `Phone: ${safe(phone)}`,
    `Address: ${safe(address)}`,
    `Message: ${safe(message)}`,
  ].join('\n')
}

function classNames(...xs) {
  return xs.filter(Boolean).join(' ')
}

function App() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alert, setAlert] = useState(null) // { type: 'success' | 'error', title, message }

  const errors = useMemo(() => {
    const next = {}

    if (!form.fullName.trim()) next.fullName = 'Full name is required.'
    if (!form.email.trim()) next.email = 'Email is required.'
    else if (!isValidEmail(form.email)) next.email = 'Please enter a valid email.'
    if (!form.phone.trim()) next.phone = 'Phone number is required.'
    if (!form.address.trim()) next.address = 'Address is required.'
    if (!form.message.trim()) next.message = 'Message is required.'

    return next
  }, [form])

  const canSubmit = !isSubmitting && Object.keys(errors).length === 0

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onBlur = (e) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setAlert(null)

    const allTouched = Object.keys(INITIAL_FORM).reduce((acc, k) => {
      acc[k] = true
      return acc
    }, {})
    setTouched(allTouched)

    if (Object.keys(errors).length > 0) {
      setAlert({
        type: 'error',
        title: 'Fix the highlighted fields',
        message: 'Please fill all required fields with valid values before submitting.',
      })
      return
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      setAlert({
        type: 'error',
        title: 'Missing Telegram config',
        message:
          'Set VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID in your .env file, then restart the dev server.',
      })
      return
    }

    const text = formatTelegramMessage(form)

    setIsSubmitting(true)
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text,
            parse_mode: 'HTML',
          }),
        },
      )

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        const reason =
          data?.description ||
          `Request failed (${res.status} ${res.statusText || 'Error'})`
        throw new Error(reason)
      }

      setAlert({
        type: 'success',
        title: 'Sent to Telegram',
        message: 'Your submission was delivered successfully.',
      })
      setForm(INITIAL_FORM)
      setTouched({})
    } catch (err) {
      setAlert({
        type: 'error',
        title: 'Submission failed',
        message: err?.message || 'Something went wrong while sending to Telegram.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldBase =
    'w-full rounded-xl border bg-white/70 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition'
  const fieldOk =
    'border-slate-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100'
  const fieldBad =
    'border-rose-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'

  const Alert = ({ type, title, message }) => {
    const isOk = type === 'success'
    return (
      <div
        className={classNames(
          'rounded-2xl border p-4 text-left text-sm shadow-sm',
          isOk
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-rose-200 bg-rose-50 text-rose-900',
        )}
        role="status"
        aria-live="polite"
      >
        <div className="font-semibold">{title}</div>
        <div className="mt-1 opacity-90">{message}</div>
      </div>
    )
  }

  const FieldError = ({ name }) => {
    if (!touched[name] || !errors[name]) return null
    return <p className="mt-1 text-xs text-rose-600">{errors[name]}</p>
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 px-4 py-10 text-slate-100">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 backdrop-blur">
            Frontend-only • React + Tailwind • Telegram Bot API
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            User Details Form
            <span className="text-violet-300"> → Telegram notification</span>
          </h1>
          <p className="max-w-prose text-sm leading-6 text-white/75">
            Fill the form and submit—your details are sent instantly to your Telegram chat
            via the Bot API.
          </p>

          <div className="rounded-2xl border border-amber-300/30 bg-amber-200/10 p-4 text-sm text-amber-50 backdrop-blur">
            <div className="font-semibold">Security note</div>
            <p className="mt-1 text-amber-50/90">
              Sending directly from the frontend exposes your Telegram bot token in the
              browser. This is <span className="font-semibold">not secure for production</span>.
              It’s acceptable for testing/personal projects. For real apps, use a backend
              to keep the token secret.
            </p>
          </div>

          <div className="text-xs text-white/60">
            Config expected: <span className="font-mono">VITE_TELEGRAM_BOT_TOKEN</span> and{' '}
            <span className="font-mono">VITE_TELEGRAM_CHAT_ID</span>
          </div>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-violet-500/30 via-fuchsia-500/20 to-cyan-500/20 blur-2xl" />
          <div className="relative rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur sm:p-7">
            <form onSubmit={submit} className="space-y-4">
              {alert ? <Alert {...alert} /> : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-white/80">Full Name *</label>
                  <input
                    name="fullName"
                    value={form.fullName}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="John Doe"
                    className={classNames(
                      fieldBase,
                      touched.fullName && errors.fullName ? fieldBad : fieldOk,
                    )}
                    autoComplete="name"
                  />
                  <FieldError name="fullName" />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/80">Email *</label>
                  <input
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="john@example.com"
                    className={classNames(
                      fieldBase,
                      touched.email && errors.email ? fieldBad : fieldOk,
                    )}
                    autoComplete="email"
                    inputMode="email"
                  />
                  <FieldError name="email" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-white/80">Phone Number *</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="+1 555 123 4567"
                    className={classNames(
                      fieldBase,
                      touched.phone && errors.phone ? fieldBad : fieldOk,
                    )}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                  <FieldError name="phone" />
                </div>

                <div>
                  <label className="text-xs font-medium text-white/80">Address *</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder="221B Baker Street"
                    className={classNames(
                      fieldBase,
                      touched.address && errors.address ? fieldBad : fieldOk,
                    )}
                    autoComplete="street-address"
                  />
                  <FieldError name="address" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-white/80">
                  Message / Description *
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={onChange}
                  onBlur={onBlur}
                  placeholder="Write your message..."
                  rows={5}
                  className={classNames(
                    fieldBase,
                    'resize-none',
                    touched.message && errors.message ? fieldBad : fieldOk,
                  )}
                />
                <FieldError name="message" />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={classNames(
                    'group inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg transition sm:w-auto',
                    canSubmit
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:brightness-110 active:brightness-95'
                      : 'cursor-not-allowed bg-white/10 text-white/50',
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Submit
                      <span className="transition group-hover:translate-x-0.5">→</span>
                    </>
                  )}
                </button>

                <div className="text-xs text-white/60">
                  By submitting, you’ll send a message to your Telegram chat.
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
