import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import foodLogo from './assets/food-logo.png'
import foodLogoWhite from './assets/food-logo-white.png'
import Header from './components/Header'
import Login from './components/Login'
import Home from './components/Home'
import ExportPdf from './components/ExportPdf'
import CreateSplitModal from './components/modals/CreateSplitModal'
import AddFriendModal from './components/modals/AddFriendModal'
import SpendAnalyzerModal from './components/modals/SpendAnalyzerModal'

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

  const headerProps = {
    theme,
    hasSplit,
    onToggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
    onLogout: handleLogout,
    onOpenAnalyzer: () => {
      setAnalyzerMode('current')
      setShowAnalyzer(true)
    }
  }

  if (!user) {
    return (
      <Login
        theme={theme}
        email={email}
        password={password}
        authError={authError}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
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
              <p className="muted">This split won&apos;t come back after deletion. Proceed?</p>
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

        <SpendAnalyzerModal
          show={showAnalyzer}
          onClose={() => setShowAnalyzer(false)}
          analyzerMode={analyzerMode}
          setAnalyzerMode={setAnalyzerMode}
          missingPayerSplits={missingPayerSplits}
          currentBalances={currentBalances}
          overallBalances={overallBalances}
          settlements={settlements}
          settlementKey={settlementKey}
          toggleSettlement={toggleSettlement}
          formatCurrency={formatCurrency}
        />

        <CreateSplitModal
          show={showCreateModal}
          onClose={() => {
            setCreateFriendError('')
            setShowCreateModal(false)
          }}
          newSplitName={newSplitName}
          setNewSplitName={setNewSplitName}
          newFriends={newFriends}
          uniqueFriendNames={uniqueFriendNames}
          addFriendRow={addFriendRow}
          updateFriendRow={updateFriendRow}
          removeFriendRow={removeFriendRow}
          errorText={createFriendError}
          onCreate={createSplit}
        />

        <AddFriendModal
          show={showModal}
          hasSplit={hasSplit}
          onClose={() => {
            setAddFriendError('')
            setShowModal(false)
          }}
          newPersonName={newPersonName}
          newPersonMrp={newPersonMrp}
          setNewPersonName={setNewPersonName}
          setNewPersonMrp={setNewPersonMrp}
          errorText={addFriendError}
          onSave={addPerson}
        />

        <Home
          headerProps={headerProps}
          hasSplit={hasSplit}
          splits={splits}
          selectedId={selectedId}
          splitName={splitName}
          paidById={paidById}
          people={people}
          totals={totals}
          totalBill={totalBill}
          totalBillNum={totalBillNum}
          mrpTotal={mrpTotal}
          mrpTotalNum={mrpTotalNum}
          savedAmount={savedAmount}
          setSplitName={setSplitName}
          setPaidById={setPaidById}
          setShowCreateModal={setShowCreateModal}
          setAddFriendError={setAddFriendError}
          setShowModal={setShowModal}
          exportPdf={exportPdf}
          selectSplit={selectSplit}
          requestDeleteSplit={requestDeleteSplit}
          setTotalBill={setTotalBill}
          setMrpTotal={setMrpTotal}
          updateCurrentSplit={updateCurrentSplit}
          removePerson={removePerson}
          formatCurrency={formatCurrency}
          uniqueSlug={uniqueSlug}
          updateUrlFromSplitId={updateUrlFromSplitId}
          setPeople={setPeople}
        />

        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </div>

      <ExportPdf
        hasSplit={hasSplit}
        splitName={splitName}
        payerName={payerName}
        totalBill={totalBill}
        mrpTotal={mrpTotal}
        totals={totals}
        savedAmount={savedAmount}
        totalInWords={totalInWords}
        paidById={paidById}
        totalBillNum={totalBillNum}
        formatCurrency={formatCurrency}
        round2={round2}
        splitUrl={splitUrl}
      />
    </div>
  )
}

export default App
