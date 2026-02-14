import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import foodLogo from './assets/food-logo.png'
import foodLogoWhite from './assets/food-logo-white.png'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0)

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100

const slugify = (name) =>
  (name || 'split')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'split'

const uniqueSlug = (name, splits, currentId = null) => {
  const base = slugify(name)
  let slug = base
  let i = 2
  const existing = new Set(
    splits
      .filter((s) => s.id !== currentId)
      .map((s) => (s.slug ? s.slug.toLowerCase() : slugify(s.name || 'split')))
  )
  while (existing.has(slug)) {
    slug = `${base}-${i++}`
  }
  return slug
}

const numberToWords = (num) => {
  if (!Number.isFinite(num)) return ''
  if (num === 0) return 'zero'
  const belowTwenty = [
    '',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'eleven',
    'twelve',
    'thirteen',
    'fourteen',
    'fifteen',
    'sixteen',
    'seventeen',
    'eighteen',
    'nineteen'
  ]
  const tens = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety'
  ]
  const scales = [
    { value: 1_00_00_000, label: 'crore' },
    { value: 1_00_000, label: 'lakh' },
    { value: 1_000, label: 'thousand' },
    { value: 100, label: 'hundred' }
  ]

  const chunk = (n) => {
    let words = []
    if (n >= 100) {
      words.push(belowTwenty[Math.floor(n / 100)], 'hundred')
      n = n % 100
    }
    if (n >= 20) {
      words.push(tens[Math.floor(n / 10)])
      n = n % 10
    }
    if (n > 0 && n < 20) {
      words.push(belowTwenty[n])
    }
    return words.filter(Boolean).join(' ')
  }

  const build = (n) => {
    if (n < 100) return chunk(n)
    let words = []
    for (const { value, label } of scales) {
      if (n >= value) {
        const count = Math.floor(n / value)
        words.push(build(count), label)
        n = n % value
      }
    }
    if (n > 0) words.push(chunk(n))
    return words.filter(Boolean).join(' ')
  }

  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)
  const rupeeWords = build(rupees) || 'zero'
  const paiseWords = paise ? ` and ${build(paise)} paise` : ''
  return `${rupeeWords}${paiseWords}`.trim()
}

const STORAGE_KEY = 'smart-food-splitter-v2'
const USER_KEY = 'smart-food-splitter-user'
const CREDS_KEY = 'smart-food-splitter-creds'
const BASE_PATH = '/smart-food-splitter'
const PALETTE = [
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
  '#34d399',
  '#f59e0b',
  '#f87171',
  '#22d3ee',
  '#c084fc'
]

function App() {
  const [splits, setSplits] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [savedCreds, setSavedCreds] = useState(() => {
    try {
      const saved = localStorage.getItem(CREDS_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [splitName, setSplitName] = useState('')
  const [totalBill, setTotalBill] = useState('')
  const [mrpTotal, setMrpTotal] = useState('')
  const [people, setPeople] = useState([])
  const [paidById, setPaidById] = useState(null)

  // Add-friend modal (inside calculation screen)
  const [showModal, setShowModal] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonMrp, setNewPersonMrp] = useState('')

  // Create-split modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSplitName, setNewSplitName] = useState('')
  const [newFriends, setNewFriends] = useState([{ id: 1, name: '', mrp: '' }])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [showAnalyzer, setShowAnalyzer] = useState(false)
  const [analyzerMode, setAnalyzerMode] = useState('current')
  const [settlements, setSettlements] = useState(() => {
    try {
      const saved = localStorage.getItem('smart-food-splitter-settlements')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('smart-food-splitter-theme') || 'dark'
    } catch {
      return 'dark'
    }
  })
  const [addFriendError, setAddFriendError] = useState('')
  const [createFriendError, setCreateFriendError] = useState('')
  const importInputRef = useRef(null)

  const hasHydrated = useRef(false)
  const [hydrated, setHydrated] = useState(false)
  const [showSplash, setShowSplash] = useState(true)

  const totalBillNum = Number(totalBill) || 0
  const mrpTotalNum = Number(mrpTotal) || 0
  const hasSplit = selectedId !== null
  const savedAmount = Math.max(0, mrpTotalNum - totalBillNum)

  // Load saved data
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved)
      const rawSplits = Array.isArray(parsed.splits) ? parsed.splits : []
      // ensure slugs
      const hydratedSplits = rawSplits.map((s, idx, arr) => ({
        ...s,
        slug: s.slug || uniqueSlug(s.name || `split-${idx + 1}`, arr, s.id)
      }))
      setSplits(hydratedSplits)
      const rawPath = window.location.pathname
      const trimmed =
        rawPath.startsWith(BASE_PATH) ? rawPath.slice(BASE_PATH.length) : rawPath
      const pathParts = trimmed.split('/').filter(Boolean)
      const pathSlug = pathParts.length ? pathParts[pathParts.length - 1] : null
      const fromUrl =
        pathSlug &&
        hydratedSplits.find(
          (s) => (s.slug || '').toLowerCase() === pathSlug.toLowerCase()
        )?.id
      const selected =
        fromUrl ||
        hydratedSplits.find((s) => s.id === parsed.selectedId)?.id ||
        hydratedSplits[0]?.id ||
        null
      if (selected) setSelectedId(selected)
    } catch (e) {
      console.warn('Failed to read saved split', e)
    } finally {
      queueMicrotask(() => {
        hasHydrated.current = true
        setHydrated(true)
      })
    }
  }, [])

  useEffect(() => {
    document.title = 'Smart Food Splitter'
    const existing =
      document.querySelector("link[rel*='icon']") ||
      document.createElement('link')
    existing.rel = 'icon'
    existing.type = 'image/png'
    existing.href = foodLogo
    existing.sizes = '64x64'
    if (!existing.parentNode) {
      document.head.appendChild(existing)
    }

    const apple =
      document.querySelector("link[rel='apple-touch-icon']") ||
      document.createElement('link')
    apple.rel = 'apple-touch-icon'
    apple.href = foodLogo
    apple.sizes = '180x180'
    if (!apple.parentNode) {
      document.head.appendChild(apple)
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('smart-food-splitter-theme', theme)
    } catch {}
  }, [theme])

  // Persist data
  useEffect(() => {
    if (!hasHydrated.current) return
    const validSelected = splits.find((s) => s.id === selectedId)?.id ?? null
    const payload = {
      splits,
      selectedId: validSelected
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [splits, selectedId])

  useEffect(() => {
    if (!hasHydrated.current) return
    if (!user) {
      window.history.replaceState({}, '', `${BASE_PATH}/login`)
      return
    }
    if (splits.length === 0) {
      window.history.replaceState({}, '', `${BASE_PATH}/home`)
      return
    }
    updateUrlFromSplitId(selectedId)
  }, [user, selectedId, splits])

  useEffect(() => {
    if (!hydrated) return
    const t = setTimeout(() => setShowSplash(false), 450)
    return () => clearTimeout(t)
  }, [hydrated])

  useEffect(() => {
    localStorage.setItem(
      'smart-food-splitter-settlements',
      JSON.stringify(settlements)
    )
  }, [settlements])

  // When selecting a split, load its data into working fields
  useEffect(() => {
    if (!selectedId) return
    const split = splits.find((s) => s.id === selectedId)
    if (!split) return
    setSplitName(split.name || '')
    setTotalBill(split.totalBill ?? '')
    setMrpTotal(split.mrpTotal ?? '')
    setPeople(split.people ?? [])
    setPaidById(split.paidById ?? (split.people?.[0]?.id ?? null))
  }, [selectedId, splits])

  useEffect(() => {
    if (!paidById && people.length > 0) {
      setPaidById(people[0].id)
    }
  }, [paidById, people])

  const totals = useMemo(() => {
    const mrpEnteredTotal = people.reduce(
      (sum, person) => sum + (Number(person.mrp) || 0),
      0
    )
    const baseMrp = mrpTotalNum > 0 ? mrpTotalNum : mrpEnteredTotal || 0

    const perPerson = people.map((person) => {
      const efficiency = baseMrp
        ? (Number(person.mrp) || 0) / baseMrp
        : 0
      const share = round2(totalBillNum * efficiency)
      return {
        ...person,
        efficiency,
        share
      }
    })

    const splitTotal = perPerson.reduce((sum, p) => sum + p.share, 0)
    const discountPct =
      mrpTotalNum > 0 && totalBillNum > 0
        ? Math.max(0, 1 - totalBillNum / mrpTotalNum) * 100
        : 0

    const payer = perPerson.find((p) => p.id === paidById)
    const balances =
      payer && totalBillNum > 0
        ? perPerson
            .filter((p) => p.id !== paidById)
            .map((p) => ({
              from: p.name || 'Friend',
              to: payer.name || 'Payer',
              amount: round2(p.share)
            }))
        : []

    const totalForPie =
      totalBillNum > 0
        ? perPerson.reduce((s, p) => s + p.share, 0)
        : perPerson.reduce((s, p) => s + (p.efficiency || 0), 0)
    let acc = 0
    const pieSegments =
      totalForPie > 0
        ? perPerson.map((p, idx) => {
            const val = totalBillNum > 0 ? p.share : p.efficiency || 0
            const pct = (val / totalForPie) * 100
            const start = acc
            const end = acc + pct
            acc = end
            return `${PALETTE[idx % PALETTE.length]} ${start}% ${end}%`
          })
        : []
    const pieSlices =
      totalForPie > 0
        ? perPerson.map((p, idx) => {
            const val = totalBillNum > 0 ? p.share : p.efficiency || 0
            const pct = totalForPie > 0 ? (val / totalForPie) * 100 : 0
            return {
              id: p.id,
              name: p.name || 'Friend',
              color: PALETTE[idx % PALETTE.length],
              pct
            }
          })
        : []

    return {
      mrpEnteredTotal,
      perPerson,
      splitTotal,
      discountPct,
      balances,
      pieSegments,
      pieSlices
    }
  }, [mrpTotalNum, people, totalBillNum, paidById])

  const updateCurrentSplit = (mutator) => {
    if (!selectedId) return
    setSplits((prev) =>
      prev.map((s) => (s.id === selectedId ? mutator(s) : s))
    )
  }

  const addPerson = () => {
    const trimmedName =
      newPersonName.trim() || `Person ${people.length + 1}`
    if (!newPersonName.trim()) {
      setAddFriendError('Name is required')
      return
    }
    const exists = people.some(
      (p) => (p.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
    )
    if (exists) {
      setAddFriendError('This name already exists in this split')
      return
    }
    const nextPeople = [
      ...people,
      { id: Date.now(), name: trimmedName, mrp: newPersonMrp || '' }
    ]
    setPeople(nextPeople)
    updateCurrentSplit((s) => ({ ...s, people: nextPeople }))
    setNewPersonName('')
    setNewPersonMrp('')
    setShowModal(false)
    setAddFriendError('')
  }

  const removePerson = (id) => {
    const next = people.filter((p) => p.id !== id)
    setPeople(next)
    updateCurrentSplit((s) => ({ ...s, people: next }))
  }

  const createSplit = () => {
    const name = newSplitName.trim()
    if (!name) return
    const cleanedFriends = newFriends
      .filter((f) => f.name.trim().length > 0)
      .map((f, idx) => ({
        id: Date.now() + idx,
        name: f.name.trim(),
        mrp: f.mrp || ''
      }))
    const names = cleanedFriends.map((f) => f.name.toLowerCase())
    const hasDupes = new Set(names).size !== names.length
    if (hasDupes) {
      setCreateFriendError('Duplicate friend names are not allowed')
      return
    }
    const slug = uniqueSlug(name || 'split', splits)
    const newSplit = {
      id: Date.now(),
      name,
      slug,
      people: cleanedFriends,
      totalBill: '',
      mrpTotal: '',
      paidById: cleanedFriends[0]?.id ?? null
    }
    setSplits((prev) => [...prev, newSplit])
    setSelectedId(newSplit.id)
    updateUrlFromSplitId(newSplit.id, [...splits, newSplit])
    setShowCreateModal(false)
    setNewSplitName('')
    setNewFriends([{ id: 1, name: '', mrp: '' }])
    setCreateFriendError('')
  }

  const addFriendRow = () => {
    setNewFriends((prev) => [...prev, { id: Date.now(), name: '', mrp: '' }])
  }

  const updateFriendRow = (id, key, value) => {
    setNewFriends((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    )
  }

  const removeFriendRow = (id) => {
    setNewFriends((prev) => prev.filter((f) => f.id !== id))
  }

  const selectSplit = (id) => {
    setSelectedId(id)
    updateUrlFromSplitId(id)
  }

  const requestDeleteSplit = (id) => {
    const target = splits.find((s) => s.id === id) || null
    setDeleteTarget(target)
    setShowDeleteModal(true)
  }

  const confirmDeleteSplit = () => {
    if (!deleteTarget) return
    const remaining = splits.filter((s) => s.id !== deleteTarget.id)
    setSplits(remaining)
    const nextSelected = remaining[0]?.id ?? null
    setSelectedId(nextSelected)
    updateUrlFromSplitId(nextSelected, remaining)
    if (!nextSelected) {
      setSplitName('')
      setTotalBill('')
      setMrpTotal('')
      setPeople([])
      setPaidById(null)
    }
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  const cancelDeleteSplit = () => {
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  const computeSplitBalances = (split) => {
    if (!split || !split.people || !split.paidById) return []
    const totalBillNum = Number(split.totalBill) || 0
    if (totalBillNum <= 0) return []
    const mrpTotalNum = Number(split.mrpTotal) || 0
    const mrpEnteredTotal = split.people.reduce(
      (sum, person) => sum + (Number(person.mrp) || 0),
      0
    )
    const baseMrp = mrpTotalNum > 0 ? mrpTotalNum : mrpEnteredTotal || 0
    const perPerson = split.people.map((person) => {
      const efficiency = baseMrp
        ? (Number(person.mrp) || 0) / baseMrp
        : 0
      const share = round2(totalBillNum * efficiency)
      return { ...person, efficiency, share }
    })
    const payer = perPerson.find((p) => p.id === split.paidById)
    if (!payer) return []
    return perPerson
      .filter((p) => p.id !== split.paidById)
      .map((p) => ({
        splitId: split.id,
        splitName: split.name || 'Split',
        from: p.name || 'Friend',
        to: payer.name || 'Payer',
        amount: round2(p.share)
      }))
  }

  const currentSplit = splits.find((s) => s.id === selectedId)
  const payerName =
    people.find((p) => p.id === paidById)?.name || 'Not set'
  const totalInWords = numberToWords(totalBillNum)
  const splitUrl =
    currentSplit?.slug && window.location.origin
      ? `${window.location.origin}${BASE_PATH}/${currentSplit.slug}`
      : window.location.origin || ''

  const currentBalances = useMemo(
    () => computeSplitBalances(currentSplit),
    [currentSplit]
  )

  const overallBalances = useMemo(() => {
    return splits.flatMap((split) => computeSplitBalances(split))
  }, [splits])

  const missingPayerSplits = useMemo(
    () => splits.filter((s) => !s.paidById || !s.people || s.people.length === 0),
    [splits]
  )

  const settlementKey = (tx, scope) =>
    `${tx.splitId}:${tx.from}->${tx.to}`

  const toggleSettlement = (tx, scope) => {
    const key = settlementKey(tx, scope)
    setSettlements((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const uniqueFriendNames = useMemo(() => {
    const names = new Set()
    splits.forEach((s) =>
      (s.people || []).forEach((p) => {
        if (p.name) names.add(p.name)
      })
    )
    return Array.from(names)
  }, [splits])

  const exportPdf = () => {
    if (!splits.length) {
      window.alert('Create a split first to export')
      return
    }
    // Name the PDF based on split
    const safeName = (splitName || 'Smart Food Splitter').replace(/[^a-z0-9\- ]/gi, '_')
    document.title = `smart-food-splitter-${safeName}`
    window.print()
    // Restore title
    document.title = 'Smart Food Splitter'
  }

  const updateUrlFromSplitId = (id, list = splits) => {
    const target = list.find((s) => s.id === id)
    const slug = target?.slug
    const newPath = slug ? `${BASE_PATH}/${slug}` : `${BASE_PATH}/`
    window.history.replaceState({}, '', newPath)
  }

  const exportSplits = () => {
    const payload = {
      splits,
      selectedId,
      settlements
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'smart-food-splitter.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        if (Array.isArray(parsed.splits)) {
          const mapped = parsed.splits.map((s, idx) => ({
            ...s,
            slug: s.slug || uniqueSlug(s.name || `split-${idx + 1}`, parsed.splits, s.id)
          }))
          setSplits(mapped)
          updateUrlFromSplitId(mapped[0]?.id, mapped)
          if (parsed.selectedId) setSelectedId(parsed.selectedId)
        }
        if (parsed.settlements) setSettlements(parsed.settlements)
      } catch (err) {
        console.error('Import failed', err)
      }
    }
    reader.readAsText(file)
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter email and password')
      return
    }
    if (savedCreds) {
      if (
        email.trim() !== savedCreds.email ||
        password.trim() !== savedCreds.password
      ) {
        setAuthError('Invalid email or password')
        return
      }
    } else {
      const nextCreds = { email: email.trim(), password: password.trim() }
      setSavedCreds(nextCreds)
      localStorage.setItem(CREDS_KEY, JSON.stringify(nextCreds))
    }
    const nextUser = { email: email.trim() }
    setUser(nextUser)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setAuthError('')
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem(USER_KEY)
  }

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand auth-brand">
            <img
              src={theme === 'dark' ? foodLogo : foodLogoWhite}
              alt="Food logo"
              style={{ width: 140, height: 70, objectFit: 'contain' }}
            />
            <p className="eyebrow brand-title">Smart Food Splitter</p>
          </div>
          <h2>Sign in</h2>
          {/* <p className="muted small">
            Demo login — first login sets your email/password locally. Next time
            it must match.
          </p> */}
          <form className="auth-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {authError && <p className="error">{authError}</p>}
            <button className="primary" type="submit">
              Sign in
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="screen-only">
        {showSplash && (
        <div className="splash">
          <div className="splash-content">
            <img
              src={theme === 'dark' ? foodLogo : foodLogoWhite}
              alt="Food logo"
              className="splash-logo"
              style={{ width: 140, height: 70, objectFit: 'contain' }}
            />
            <p className="eyebrow">Smart Food Splitter</p>
            <div className="loader" aria-label="Loading" />
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={cancelDeleteSplit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete split</h3>
            <p className="muted">
              This split won&apos;t come back after deletion. Proceed?
            </p>
            <div className="modal-actions">
              <button className="ghost" onClick={cancelDeleteSplit}>
                Cancel
              </button>
              <button className="primary danger" onClick={confirmDeleteSplit}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {showAnalyzer && (
        <div className="modal-backdrop" onClick={() => setShowAnalyzer(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Spend analyzer</h3>
              <div className="analyzer-controls">
                <button
                  className={`ghost small ${
                    analyzerMode === 'current' ? 'active' : ''
                  }`}
                  onClick={() => setAnalyzerMode('current')}
                >
                  This split
                </button>
                <button
                  className={`ghost small ${
                    analyzerMode === 'all' ? 'active' : ''
                  }`}
                  onClick={() => setAnalyzerMode('all')}
                >
                  All splits
                </button>
              </div>
            </div>
            <div className="balances analyzer-list">
              {analyzerMode === 'all' && missingPayerSplits.length > 0 && (
                <div className="callout">
                  <strong>Heads up</strong>
                  <p className="muted small">
                    {missingPayerSplits.length} split(s) missing a payer. Set
                    &quot;Who paid?&quot; for each to include them here.
                  </p>
                </div>
              )}
              {(analyzerMode === 'current'
                ? currentBalances
                : overallBalances
              ).length === 0 ? (
                <div className="empty-state">
                  No balances to settle. Add people, set a payer, and enter a
                  bill.
                </div>
              ) : (
                (analyzerMode === 'current'
                  ? currentBalances
                  : overallBalances
                ).map((tx) => {
                  const key = settlementKey(tx, analyzerMode)
                  const settled = !!settlements[key]
                  return (
                    <div
                      key={key}
                      className={`balance-row ${settled ? 'settled' : ''}`}
                    >
                      <div>
                        <span>
                          <strong>{tx.from}</strong> → <strong>{tx.to}</strong>
                        </span>
                        {tx.splitName && analyzerMode === 'all' && (
                          <p className="muted small">{tx.splitName}</p>
                        )}
                      </div>
                      <div className="balance-actions">
                        <strong className="amount">
                          {formatCurrency(tx.amount)}
                        </strong>
                        <button
                          className={`ghost small ${
                            settled ? 'success' : ''
                          }`}
                          onClick={() => toggleSettlement(tx, analyzerMode)}
                        >
                          {settled ? 'Completed ✅' : 'Mark received'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
      {/* Create split modal */}
      {showCreateModal && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setCreateFriendError('')
            setShowCreateModal(false)
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Create split</h3>
            <label className="field">
              <span>Split name</span>
              <input
                type="text"
                placeholder="Dominos lunch"
                value={newSplitName}
                onChange={(e) => setNewSplitName(e.target.value)}
              />
            </label>
            <div className="friends-list">
              <div className="friends-head">
                <span>Friends</span>
                <button className="ghost small" onClick={addFriendRow}>
                  + Add friend
                </button>
              </div>
              {uniqueFriendNames.length > 0 && (
                <div className="muted small">Suggestions</div>
              )}
              {uniqueFriendNames.length > 0 && (
                <div className="suggestions">
                  {uniqueFriendNames.map((name) => (
                    <span
                      key={name}
                      className="chip"
                      onClick={() => {
                        const exists = newFriends.some(
                          (f) => f.name.trim().toLowerCase() === name.toLowerCase()
                        )
                        if (exists) return
                        setNewFriends((prev) => [
                          ...prev,
                          { id: Date.now(), name, mrp: '' }
                        ])
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
              {newFriends.map((f, idx) => (
                <div key={f.id} className="person-row">
                  <label className="field small">
                    <span>Name</span>
                    <input
                      type="text"
                      placeholder={`Friend ${idx + 1}`}
                      value={f.name}
                      onChange={(e) =>
                        updateFriendRow(f.id, 'name', e.target.value)
                      }
                    />
                  </label>
                  {newFriends.length > 1 && (
                    <button
                      className="ghost small danger"
                      onClick={() => removeFriendRow(f.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {createFriendError && <p className="error-text">{createFriendError}</p>}
            <div className="modal-actions">
              <button className="ghost" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button
                className="primary"
                onClick={createSplit}
                disabled={!newSplitName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add friend modal (inside selected split) */}
      {showModal && hasSplit && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setAddFriendError('')
            setShowModal(false)
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add friend</h3>
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                placeholder="Friend name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>MRP portion</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={newPersonMrp}
                onChange={(e) =>
                  setNewPersonMrp(
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
              />
            </label>
            {addFriendError && <p className="error-text">{addFriendError}</p>}
            <div className="modal-actions">
              <button className="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="primary" onClick={addPerson}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="hero">
        <div>
          <div className="brand">
            <img
              src={theme === 'dark' ? foodLogo : foodLogoWhite}
              alt="Food logo"
              style={{ width: 140, height: 70, objectFit: 'contain' }}
            />
            <p className="eyebrow brand-title">Smart Food Splitter</p>
            <button className="ghost small logout-btn" onClick={handleLogout}>
              Logout
            </button>
            {hasSplit && (
              <button
                className="ghost small"
                onClick={() => {
                  setAnalyzerMode('current')
                  setShowAnalyzer(true)
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                📊 Spend analyzer
              </button>
            )}
            <button
              className="ghost small theme-toggle"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          <h2>Split the bill by what everyone really ate.</h2>

          <div className="split-list">
            <div className="split-list-head">
              <div>
                <p className="eyebrow">Your splits</p>
                <p className="muted small">
                  Create a split, then click it to manage calculations.
                </p>
              </div>
              <div className="hero-actions">
                <button
                  className="primary no-print"
                  onClick={() => setShowCreateModal(true)}
                >
                  + Create split
                </button>
                <button className="ghost no-print" onClick={exportPdf} disabled={!splits.length}>
                  Export PDF
                </button>
                {/* <button className="ghost no-print" onClick={exportSplits}>
                  Export JSON
                </button> */}
                {/* <button
                  className="ghost no-print"
                  onClick={() => importInputRef.current?.click()}
                >
                  Import JSON
                </button> */}
              </div>
            </div>
            {splits.length === 0 && (
              <div className="empty-state">
                No splits yet. Create one to begin.
              </div>
            )}
            <div className="split-list-items">
              {splits.map((s) => (
                <div
                  key={s.id}
                  className={`split-tile ${selectedId === s.id ? 'active' : ''}`}
                >
                  <button className="split-body" onClick={() => selectSplit(s.id)}>
      <div>
                      <strong>{s.name}</strong>
                      <p className="muted small">
                        {s.people?.length || 0} friends
                        {s.people?.length
                          ? ': ' + s.people.map((p) => p.name).join(', ')
                          : ''}
                      </p>
                    </div>
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Delete split"
                    onClick={() => requestDeleteSplit(s.id)}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </div>

          {hasSplit && (
            <div className="form-grid single">
              <label className="field">
                <span>Split name</span>
                <input
                  type="text"
                  placeholder="Dominos lunch"
                  value={splitName}
                  onChange={(e) => {
                    setSplitName(e.target.value)
                    const newSlug = uniqueSlug(
                      e.target.value || 'split',
                      splits,
                      selectedId
                    )
                    updateCurrentSplit((s) => ({
                      ...s,
                      name: e.target.value,
                      slug: newSlug
                    }))
                    updateUrlFromSplitId(selectedId)
                  }}
                />
              </label>
              <label className="field">
                <span>Who paid?</span>
                <select
                  value={paidById || ''}
                  onChange={(e) => {
                    const next = e.target.value === '' ? null : Number(e.target.value)
                    setPaidById(next)
                    updateCurrentSplit((s) => ({ ...s, paidById: next }))
                  }}
                >
                  {people.length === 0 && <option value="">Add people first</option>}
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || 'Friend'}
                    </option>
                  ))}
                </select>
              </label>
              {!paidById && (
                <div className="callout">
                  <strong>Set a payer</strong>
                  <p className="muted small">
                    Select who paid so balances appear in the analyzer.
                  </p>
                </div>
              )}
      </div>
          )}

          <p className="subhead">
            Enter the total payable amount (with GST/discounts) and each
            person&apos;s pre-discount MRP. We&apos;ll allocate the final bill
            by eating efficiency.
          </p>

          {/* {hasSplit && (
            <div className="hero-actions">
              <button className="primary" onClick={() => setShowModal(true)}>
                + Add friend
              </button>
              <button
                className="ghost"
                onClick={() => {
                  setAnalyzerMode('current')
                  setShowAnalyzer(true)
                }}
              >
                Spend analyzer
        </button>
            </div>
          )} */}
        </div>
        <div className="glow-card">
          <div className="stat">
            <p>Total payable</p>
            <strong>{formatCurrency(totalBill || 0)}</strong>
          </div>
          <div className="stat">
            <p>Original MRP</p>
            <strong>
              {formatCurrency(
                (mrpTotal !== '' ? mrpTotal : totals.mrpEnteredTotal) || 0
              )}
            </strong>
          </div>
          <div className="stat accent">
            <p>Discount captured</p>
            <strong>{totals.discountPct.toFixed(1)}%</strong>
          </div>
        </div>
      </header>

      {hasSplit && (
        <main className="grid">
          <section className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Bill inputs</p>
                <h2>Order details</h2>
              </div>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Total bill paid (incl. GST & discounts)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalBill}
                    onChange={(e) => {
                      const val =
                        e.target.value === '' ? '' : Number(e.target.value)
                      setTotalBill(val)
                      updateCurrentSplit((s) => ({ ...s, totalBill: val }))
                    }}
                />
              </label>
              <label className="field">
                <span>Original MRP sum (before discounts)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mrpTotal}
                  onChange={(e) => {
                    const val =
                      e.target.value === '' ? '' : Number(e.target.value)
                    setMrpTotal(val)
                    updateCurrentSplit((s) => ({ ...s, mrpTotal: val }))
                  }}
                />
              </label>
            </div>
            <p className="hint">
              If MRP isn&apos;t known, leave it zero and we will base the split on
              the entered person MRPs.
            </p>
            {mrpTotalNum > 0 &&
              totals.mrpEnteredTotal > 0 &&
              totals.mrpEnteredTotal !== mrpTotalNum && (
              <div className="callout">
                <div>
                  <strong>Heads up</strong>
                  <p>
                    Sum of individual MRPs is{' '}
                    {formatCurrency(totals.mrpEnteredTotal)} which doesn&apos;t
                    match the original MRP value. We still use the original MRP
                    to calculate each person&apos;s efficiency.
        </p>
      </div>
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Who ate what</p>
                <h2>People & MRPs</h2>
              </div>
              <button
                className="ghost"
                onClick={() => {
                  setAddFriendError('')
                  setShowModal(true)
                }}
              >
                + Add friend
              </button>
            </div>
            <div className="people-grid">
              {people.length === 0 && (
                <div className="empty-state">
                  No friends yet. Use “+ Add friend” to start.
                </div>
              )}
              {people.map((person) => {
                const sharePct =
                  (totals.perPerson.find((p) => p.id === person.id)?.efficiency * 100 || 0).toFixed(1)
                return (
                  <div key={person.id} className="person-row">
                    <div className="person-inputs">
                      <label className="field small">
                        <span>Name</span>
                        <input
                          type="text"
                          value={person.name}
                          onChange={(e) => {
                            const next = people.map((p) =>
                              p.id === person.id ? { ...p, name: e.target.value } : p
                            )
                            setPeople(next)
                            updateCurrentSplit((s) => ({ ...s, people: next }))
                          }}
                        />
                      </label>
                      <label className="field small">
                        <span>MRP portion</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={person.mrp}
                          onChange={(e) => {
                            const val =
                              e.target.value === '' ? '' : Number(e.target.value)
                            const next = people.map((p) =>
                              p.id === person.id ? { ...p, mrp: val } : p
                            )
                            setPeople(next)
                            updateCurrentSplit((s) => ({ ...s, people: next }))
                          }}
                        />
                      </label>
                    </div>
                    <div className="person-actions">
                      <div className="pill">{sharePct}% share</div>
                      <button
                        className="ghost small danger"
                        onClick={() => removePerson(person.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

        {totals.perPerson.length > 0 && (
          <section className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Share chart</p>
                <h2>Consumption pie</h2>
              </div>
            </div>
            <div className="pie">
              <div className="pie-shell">
                <div
                  className="pie-chart"
                  style={{
                    backgroundImage:
                      totals.pieSegments.length > 0
                        ? `conic-gradient(${totals.pieSegments.join(',')})`
                        : 'none'
                  }}
                />
                <div className="pie-center">
                  <span className="muted small">Shares</span>
                </div>
              </div>
              <div className="pie-legend">
                {totals.pieSlices.map((slice) => (
                  <span key={slice.id}>
                    <span
                      className="dot"
                      style={{ background: slice.color }}
                    />
                    {slice.name} ({slice.pct.toFixed(1)}%)
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

          <section className="card full">
            <div className="card-header">
              <div>
                <p className="eyebrow">Split preview</p>
                <h2>Who pays how much</h2>
              </div>
              <div className="totals">
                <div>
                  <p>Split total</p>
                  <strong>{formatCurrency(totals.splitTotal)}</strong>
                </div>
                <div>
                  <p>Bill total</p>
                  <strong>{formatCurrency(totalBill)}</strong>
                </div>
              </div>
            </div>

            <div className="results">
              {totals.perPerson.length === 0 && (
                <div className="empty-state">
                  Add people and amounts to see the split.
                </div>
              )}
              {totals.perPerson.map((person) => {
                const pct = (person.efficiency * 100 || 0).toFixed(1)
                const barPct =
                  totalBillNum > 0 ? Math.min(100, (person.share / totalBillNum) * 100) : 0
                return (
                  <div key={person.id} className="result-row">
                    <div>
                      <h3>{person.name}</h3>
                      <p className="muted">
                        MRP: {formatCurrency(person.mrp || 0)} · Efficiency: {pct}%
                      </p>
                      <div className="bar">
                        <div className="bar-fill" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                    <strong className="amount">{formatCurrency(person.share)}</strong>
                  </div>
                )
              })}
            </div>
            <p className="hint">
              Values use proportional split (person MRP ÷ total MRP × final bill).
              Rounded to 2 decimals; tiny rounding drift may appear.
            </p>

            {totals.balances.length > 0 && (
              <div className="balances">
                <p className="eyebrow">Who owes whom</p>
                {totals.balances.map((b, idx) => (
                  <div key={idx} className="balance-row">
                    <span>
                      {b.from} → {b.to}
                    </span>
                    <strong>{formatCurrency(b.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      )}
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
      </div>
      {hasSplit && (
        <div className="print-only">
          <div className="print-header">
            <div className="print-brand">
              <img
                src={foodLogo}
                alt="Food logo"
                className="print-logo"
              />
              <h1 className="print-title">Smart Food Splitter</h1>
            </div>
            <div className="print-meta">
              <span>
                <strong>Split:</strong> {splitName || 'Split'}
              </span>
              <span>
                <strong>Payer:</strong> {payerName}
              </span>
            </div>
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th colSpan={4}>Summary</th>
              </tr>
              <tr>
                <th>Total payable</th>
                <th>Original MRP</th>
                <th>Discount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatCurrency(totalBill || 0)}</td>
                <td>{formatCurrency(mrpTotal || totals.mrpEnteredTotal)}</td>
                <td className="print-accent">
                  {totals.discountPct.toFixed(1)}% (You saved{' '}
                  {formatCurrency(savedAmount)})
                </td>
                <td>{new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td colSpan={4}>
                  Amount in words: {totalInWords} rupees
                </td>
              </tr>
            </tbody>
          </table>

          <table className="print-table">
            <thead>
              <tr>
                <th colSpan={5}>People</th>
              </tr>
              <tr>
                <th>Name</th>
                <th>MRP</th>
                <th>Share</th>
                <th>Percent</th>
                <th>Net (owes/gets)</th>
              </tr>
            </thead>
            <tbody>
              {totals.perPerson.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{formatCurrency(person.mrp || 0)}</td>
                  <td>{formatCurrency(person.share)}</td>
                  <td>{(person.efficiency * 100).toFixed(1)}%</td>
                  <td>
                    {paidById
                      ? person.id === paidById
                        ? `Gets ${formatCurrency(
                            round2(totalBillNum - person.share)
                          )}`
                        : `Owes ${formatCurrency(person.share)}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totals.balances.length > 0 && (
            <table className="print-table">
              <thead>
                <tr>
                  <th colSpan={3}>Who owes whom</th>
                </tr>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {totals.balances.map((b, idx) => (
                  <tr key={idx}>
                    <td>{b.from}</td>
                    <td>{b.to}</td>
                    <td>{formatCurrency(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p style={{ marginTop: '12px' }}>
            Values use proportional split (person MRP ÷ total MRP × final bill).
            Thank you.
          </p>
          {splitUrl && (
            <div className="print-qr">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                  splitUrl
                )}`}
                alt="QR to open split"
              />
              <p className="muted small">Scan to visit website: {splitUrl}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
