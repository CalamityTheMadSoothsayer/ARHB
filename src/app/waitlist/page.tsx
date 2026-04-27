'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { toast } from 'react-hot-toast'
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isPast, addHours, addDays, differenceInHours } from 'date-fns'

const PRODUCTS = [
  { id: 'prod-sourdough', name: 'Sourdough Loaf', key: 'sourdough', hasVariants: false },
  { id: 'prod-brioche', name: 'Brioche Buns', key: 'brioche', hasVariants: true },
  { id: 'prod-cinnamon-rolls', name: 'Sourdough Cinnamon Rolls', key: 'rolls', hasVariants: true },
]

export default function WaitlistPage() {
  const { data: session } = useSession()
  const [variants, setVariants] = useState<any[]>([])
  const [calendar, setCalendar] = useState<any[]>([])
  const [blackouts, setBlackouts] = useState<any[]>([])
  const [myEntries, setMyEntries] = useState<any[]>([])
  const [thresholds, setThresholds] = useState<Record<string, number>>({})
  const [thresholdMsg, setThresholdMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [residency, setResidency] = useState<boolean | null | undefined>(undefined)
  const [showResidencyModal, setShowResidencyModal] = useState(false)
  const [showPickupModal, setShowPickupModal] = useState(false)
  const [step, setStep] = useState<'items' | 'date' | 'confirm'>('items')
  const [selectedDate, setSelectedDate] = useState('')
  const [customDate, setCustomDate] = useState('')
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [form, setForm] = useState({
    sourdough: { qty: 0, notes: '' },
    brioche: { qty: 0, variant_id: 'var-brioche-4', notes: '' },
    rolls: { qty: 0, variant_id: 'var-rolls-6', notes: '' },
  })

  const fetchData = useCallback(async () => {
    if (session?.user) {
      const profileRes = await fetch('/api/profile')
      const profileData = await profileRes.json()
      if (profileData.profile === null || profileData.profile?.is_colorado_resident === null) {
        setResidency(null)
        setShowResidencyModal(true)
      } else {
        setResidency(profileData.profile.is_colorado_resident === 1)
      }
    }
    const [calRes, settingsRes, varRes] = await Promise.all([
      fetch('/api/bake-calendar'),
      fetch('/api/settings'),
      fetch('/api/admin/variants'),
    ])
    const calData = await calRes.json()
    const settingsData = await settingsRes.json()
    const varData = await varRes.json()

    setCalendar(calData.calendar || [])
    setBlackouts(calData.blackouts || [])
    setVariants(varData.variants || [])
    setThresholdMsg(settingsData.threshold_message || '')
    const t: Record<string, number> = {}
    for (const [k, v] of Object.entries(settingsData)) {
      if (k.startsWith('threshold_') && k !== 'threshold_message') t[k] = parseInt(v as string) || 0
    }
    setThresholds(t)

    if (session?.user) {
      const myRes = await fetch('/api/waitlist')
      const myData = await myRes.json()
      setMyEntries(myData.entries || [])
    }
  }, [session])

  useEffect(() => { fetchData() }, [fetchData])

  const setResident = async (value: boolean) => {
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_colorado_resident: value }),
    })
    setResidency(value)
    setShowResidencyModal(false)
    if (value) setShowPickupModal(true)
  }

  const getCalendarDay = (date: Date, product_id: string) =>
    calendar.find(c => c.bake_date === format(date, 'yyyy-MM-dd') && c.product_id === product_id)

  const isScheduledBakeDay = (dateStr: string) =>
    calendar.some(c => c.bake_date === dateStr && !c.is_unavailable)

  const isBlackout = (dateStr: string) =>
    blackouts.some(b => dateStr >= b.start_date && dateStr <= b.end_date)

  const getBlackoutReason = (dateStr: string) =>
    blackouts.find(b => dateStr >= b.start_date && dateStr <= b.end_date)?.reason ?? null

  const isTooSoon = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return differenceInHours(date, new Date()) < 48
  }

  const selectedItems = PRODUCTS.filter(p => form[p.key as keyof typeof form].qty > 0)

  const finalDate = useCustomDate ? customDate : selectedDate

  const getThresholdWarning = (product_id: string, variant_id: string | null, qty: number) => {
    const key = variant_id ? `threshold_${product_id}_${variant_id}` : `threshold_${product_id}`
    const limit = thresholds[key]
    return limit && limit > 0 && qty > limit
  }

  const leave = async (entry_id: string) => {
    if (!confirm('Remove yourself from this waitlist?')) return
    await fetch('/api/waitlist', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id }),
    })
    toast.success('Removed from waitlist')
    fetchData()
  }

  const submit = async () => {
    if (!session?.user) { signIn('google'); return }
    if (!finalDate) { toast.error('Please select a preferred bake date'); return }
    if (isTooSoon(finalDate)) { toast.error('Date must be at least 48 hours away'); return }
    if (isBlackout(finalDate)) { toast.error('That date is not available'); return }

    setSubmitting(true)
    let success = true
    for (const p of selectedItems) {
      const f = form[p.key as keyof typeof form]
      const variantId = p.hasVariants ? (f as any).variant_id : null
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: p.id,
          variant_id: variantId,
          qty: f.qty,
          notes: f.notes,
          preferred_date: finalDate,
          is_calendar_date: isScheduledBakeDay(finalDate),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Failed')
        success = false
      }
    }
    setSubmitting(false)
    if (success) {
      toast.success('Added to waitlist!')
      setStep('items')
      setSelectedDate('')
      setCustomDate('')
      setUseCustomDate(false)
      setForm({ sourdough: { qty: 0, notes: '' }, brioche: { qty: 0, variant_id: 'var-brioche-4', notes: '' }, rolls: { qty: 0, variant_id: 'var-rolls-6', notes: '' } })
      fetchData()
    }
  }

  const months = [new Date(), addMonths(new Date(), 1), addMonths(new Date(), 2)]

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {showResidencyModal && (
        <div className="py-24 text-center">
          <h2 className="text-2xl text-brand-900 mb-3">Colorado residents only</h2>
          <p className="text-stone-500 mb-8">Under Colorado cottage food laws, orders are only available to Colorado residents. Are you a Colorado resident?</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => setResident(true)} className="btn-primary">Yes, I'm a Colorado resident</button>
            <button onClick={() => setResident(false)} className="btn-secondary">No</button>
          </div>
        </div>
      )}
      {showPickupModal && (
        <div className="py-24 text-center">
          <h2 className="text-2xl text-brand-900 mb-3">Pickup only — no shipping</h2>
          <p className="text-stone-500 mb-4">All orders are pickup only in Brush, CO. We do not offer shipping or delivery.</p>
          <div className="text-sm text-stone-500 mb-8 space-y-1">
            <p>901 Edison St, Brush, CO 80723</p>
            <p>919 Edison St, Brush, CO 80723</p>
          </div>
          <button onClick={() => setShowPickupModal(false)} className="btn-primary">Got it, let me pre-order!</button>
        </div>
      )}
      {residency === false && (
        <div className="py-24 text-center">
          <h2 className="text-2xl text-brand-900 mb-3">Colorado residents only</h2>
          <p className="text-stone-500 mb-4">Sorry, under Colorado cottage food laws we can only sell to Colorado residents.</p>
          <button onClick={() => setShowResidencyModal(true)} className="text-sm text-brand-600 underline">I made a mistake — I am a Colorado resident</button>
        </div>
      )}
      {!showResidencyModal && !showPickupModal && residency !== false && <h1 className="text-4xl text-brand-900 mb-2">Pre-order waitlist</h1>}
      <p className="text-stone-500 mb-8">Select what you'd like, pick a preferred bake date, and join the list. No payment until we confirm your order.</p>

      {/* My entries */}
      {myEntries.filter(e => ['waiting','payment_pending','paid'].includes(e.status)).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-serif mb-3">Your waitlist spots</h2>
          <div className="space-y-3">
            {myEntries.filter(e => ['waiting','payment_pending','paid'].includes(e.status)).map(entry => (
              <div key={entry.id} className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{entry.product_name}{entry.variant_label ? ` — ${entry.variant_label}` : ''}</p>
                  <p className="text-sm text-stone-500">Qty: {entry.qty} · #{entry.position} in line</p>
                  {entry.preferred_date && <p className="text-xs text-stone-400">Preferred date: {entry.preferred_date}</p>}
                  {entry.status === 'payment_pending' && (
                    <div className="mt-2">
                      <p className="text-sm text-amber-700 font-medium">Order confirmed — pay to secure your spot.</p>
                      <p className="text-xs text-stone-500">Bake date: {entry.bake_date?.split('T')[0]} · {entry.pickup_window}</p>
                      <p className="text-xs text-red-500">Pay by: {new Date(entry.expires_at).toLocaleString()}</p>
                      <a href={entry.square_payment_url} className="btn-primary !py-1.5 !px-4 text-sm inline-block mt-2">Pay now</a>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${entry.status === 'waiting' ? 'bg-blue-50 text-blue-700' : entry.status === 'payment_pending' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                    {entry.status === 'waiting' ? `#${entry.position} in line` : entry.status === 'payment_pending' ? 'Awaiting payment' : entry.status}
                  </span>
                  {(entry.status === 'waiting' || entry.status === 'payment_pending') && (
                    <button onClick={() => leave(entry.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Items */}
      {step === 'items' && (
        <div className="card p-6 mb-6">
          <h2 className="font-serif text-xl mb-5">What would you like?</h2>
          <div className="space-y-5">
            {PRODUCTS.map(p => {
              const myEntry = myEntries.find(e => e.product_id === p.id && ['waiting','payment_pending'].includes(e.status))
              const f = form[p.key as keyof typeof form]
              const productVariants = variants.filter(v => v.product_id === p.id)
              const variantId = p.hasVariants ? (f as any).variant_id : null
              const warn = getThresholdWarning(p.id, variantId, f.qty)

              return (
                <div key={p.id} className={`border rounded-lg p-4 ${myEntry ? 'border-green-200 bg-green-50' : 'border-brand-100'}`}>
                  <p className="font-medium mb-2">{p.name}</p>
                  {myEntry ? (
                    <p className="text-sm text-green-700">Already on waitlist — #{myEntry.position}</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {p.hasVariants && (
                        <div>
                          <label className="text-xs text-stone-500 block mb-1">Pack size</label>
                          <select value={(f as any).variant_id}
                            onChange={e => setForm(fm => ({ ...fm, [p.key]: { ...f, variant_id: e.target.value } }))}
                            className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
                            {productVariants.map(v => <option key={v.id} value={v.id}>{v.label} — ${(v.price/100).toFixed(2)}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-stone-500 block mb-1">Quantity</label>
                        <input type="number" min="0" max="20" value={f.qty || ''} placeholder="0"
                          onChange={e => setForm(fm => ({ ...fm, [p.key]: { ...f, qty: parseInt(e.target.value) || 0 } }))}
                          className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 block mb-1">Notes (optional)</label>
                        <input type="text" placeholder="Any special requests..." value={f.notes}
                          onChange={e => setForm(fm => ({ ...fm, [p.key]: { ...f, notes: e.target.value } }))}
                          className="w-full border border-brand-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
                      </div>
                    </div>
                  )}
                  {warn && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                      {thresholdMsg || 'Large orders may require additional lead time and will be confirmed on a case-by-case basis.'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <button onClick={() => {
            if (selectedItems.length === 0) { toast.error('Select at least one item'); return }
            setStep('date')
          }} className="btn-primary w-full mt-6 !py-3">
            Next: Pick a date →
          </button>
        </div>
      )}

      {/* Step 2: Date picker */}
      {step === 'date' && (
        <div className="card p-6 mb-6">
          <button onClick={() => setStep('items')} className="text-sm text-stone-400 hover:text-stone-600 mb-4">← Back</button>
          <h2 className="font-serif text-xl mb-2">Pick a preferred bake date</h2>
          <p className="text-sm text-stone-500 mb-6">Dates marked on the calendar are scheduled bake days — selecting one improves your chances of approval. You can also request a custom date.</p>

          {/* Calendar picker */}
          {months.map((month, mi) => {
            const mDays = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
            const firstDow = startOfMonth(month).getDay()
            return (
              <div key={mi} className="mb-6">
                <h3 className="font-medium mb-2">{format(month, 'MMMM yyyy')}</h3>
                <div className="grid grid-cols-7 gap-1 text-xs text-center mb-1">
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-stone-400 font-medium">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDow }).map((_, i) => <div key={i} />)}
                  {mDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd')
                    const blacked = isBlackout(dateStr)
                    const past = (isPast(day) && !isToday(day)) || isTooSoon(dateStr)
                    const disabled = past || blacked
                    const isScheduled = isScheduledBakeDay(dateStr)
                    const isSelected = selectedDate === dateStr && !useCustomDate
                    const sourdough = getCalendarDay(day, 'prod-sourdough')
                    const brioche = getCalendarDay(day, 'prod-brioche')
                    const rolls = getCalendarDay(day, 'prod-cinnamon-rolls')

                    const blackoutReason = blacked ? getBlackoutReason(dateStr) : null
                    return (
                      <button key={dateStr} disabled={disabled}
                        onClick={() => { setSelectedDate(dateStr); setUseCustomDate(false) }}
                        title={blackoutReason ?? undefined}
                        className={`p-1 rounded text-center border transition-colors ${blacked ? 'bg-red-100 border-red-300 cursor-not-allowed' : past ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:border-brand-400'} ${isSelected ? 'border-brand-600 bg-brand-100' : isScheduled && !blacked ? 'border-brand-300 bg-brand-50' : !blacked ? 'border-brand-100' : ''}`}>
                        <p className={`text-xs font-medium mb-0.5 ${blacked ? 'text-red-400' : ''}`}>{format(day, 'd')}</p>
                        {!blacked && sourdough && !sourdough.is_unavailable && <div className="text-xs bg-amber-100 text-amber-800 rounded">S</div>}
                        {!blacked && brioche && !brioche.is_unavailable && <div className="text-xs bg-blue-100 text-blue-800 rounded">B</div>}
                        {!blacked && rolls && !rolls.is_unavailable && <div className="text-xs bg-pink-100 text-pink-800 rounded">R</div>}
                        {blacked && <div className="text-xs text-red-300">—</div>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="flex flex-wrap gap-4 text-xs text-stone-500 mb-6">
            <span><span className="inline-block w-3 h-3 bg-amber-100 rounded mr-1" />S = Sourdough</span>
            <span><span className="inline-block w-3 h-3 bg-blue-100 rounded mr-1" />B = Brioche</span>
            <span><span className="inline-block w-3 h-3 bg-pink-100 rounded mr-1" />R = Cinnamon Rolls</span>
            <span><span className="inline-block w-3 h-3 bg-red-100 border border-red-300 rounded mr-1" />Not available</span>
          </div>

          {selectedDate && !isScheduledBakeDay(selectedDate) && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4">
              This date is not a scheduled bake day — approval is less likely. We'll review your request and let you know.
            </p>
          )}

          {selectedDate && isScheduledBakeDay(selectedDate) && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2 mb-4">
              Great choice — this is a scheduled bake day!
            </p>
          )}

          <button onClick={() => {
            if (!finalDate) { toast.error('Please select a date'); return }
            if (isTooSoon(finalDate)) { toast.error('Date must be at least 48 hours away'); return }
            setStep('confirm')
          }} className="btn-primary w-full !py-3">
            Next: Review order →
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <div className="card p-6 mb-6">
          <button onClick={() => setStep('date')} className="text-sm text-stone-400 hover:text-stone-600 mb-4">← Back</button>
          <h2 className="font-serif text-xl mb-5">Review your request</h2>
          <div className="space-y-2 mb-4">
            {selectedItems.map(p => {
              const f = form[p.key as keyof typeof form]
              const v = variants.find(v => v.id === (f as any).variant_id)
              return (
                <div key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}{v ? ` — ${v.label}` : ''}</span>
                  <span>Qty: {f.qty}</span>
                </div>
              )
            })}
          </div>
          <div className="border-t border-brand-100 pt-3 mb-6">
            <p className="text-sm"><strong>Preferred bake date:</strong> {finalDate}</p>
            {!isScheduledBakeDay(finalDate) && (
              <p className="text-xs text-amber-600 mt-1">Not a scheduled bake day — approval less likely</p>
            )}
          </div>
          <div className="bg-brand-50 border border-brand-200 rounded-lg p-4 mb-6 text-sm text-stone-600 space-y-1">
            <p>No payment is collected now.</p>
            <p>If approved, you'll receive a payment link and must pay at least 24 hours before your bake date to secure your spot.</p>
          </div>
          <button onClick={submit} disabled={submitting} className="btn-primary w-full !py-3">
            {submitting ? 'Submitting…' : 'Submit waitlist request'}
          </button>
        </div>
      )}
    </div>
  )
}
