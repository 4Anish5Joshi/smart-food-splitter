import Header from './Header'

const Home = ({
  headerProps,
  hasSplit,
  splits,
  selectedId,
  splitName,
  paidById,
  people,
  totals,
  totalBill,
  totalBillNum,
  mrpTotal,
  mrpTotalNum,
  savedAmount,
  setSplitName,
  setPaidById,
  setShowCreateModal,
  setAddFriendError,
  setShowModal,
  exportPdf,
  selectSplit,
  requestDeleteSplit,
  setTotalBill,
  setMrpTotal,
  updateCurrentSplit,
  removePerson,
  setPeople,
  formatCurrency,
  uniqueSlug,
  updateUrlFromSplitId
}) => {
  return (
    <>
      <header className="hero">
        <div>
          <Header {...headerProps} />
          <h2>Split the bill by what everyone really ate.</h2>

          <div className="split-list">
            <div className="split-list-head">
              <div>
                <p className="eyebrow">Your splits</p>
                <p className="muted small">Create a split, then click it to manage calculations.</p>
              </div>
              <div className="hero-actions">
                <button className="primary no-print" onClick={() => setShowCreateModal(true)}>
                  + Create split
                </button>
                <button className="ghost no-print" onClick={exportPdf} disabled={!splits.length}>
                  Export PDF
                </button>
              </div>
            </div>
            {splits.length === 0 && (
              <div className="empty-state">No splits yet. Create one to begin.</div>
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
                        {s.people?.length ? ': ' + s.people.map((p) => p.name).join(', ') : ''}
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
                    const newSlug = uniqueSlug(e.target.value || 'split', splits, selectedId)
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
                  <p className="muted small">Select who paid so balances appear in the analyzer.</p>
                </div>
              )}
            </div>
          )}

          <p className="subhead">
            Enter the total payable amount (with GST/discounts) and each person&apos;s pre-discount
            MRP. We&apos;ll allocate the final bill by eating efficiency.
          </p>
        </div>
        <div className="glow-card">
          <div className="stat">
            <p>Total payable</p>
            <strong>{formatCurrency(totalBill || 0)}</strong>
          </div>
          <div className="stat">
            <p>Original MRP</p>
            <strong>{formatCurrency((mrpTotal !== '' ? mrpTotal : totals.mrpEnteredTotal) || 0)}</strong>
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
                    const val = e.target.value === '' ? '' : Number(e.target.value)
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
                    const val = e.target.value === '' ? '' : Number(e.target.value)
                    setMrpTotal(val)
                    updateCurrentSplit((s) => ({ ...s, mrpTotal: val }))
                  }}
                />
              </label>
            </div>
            <p className="hint">
              If MRP isn&apos;t known, leave it zero and we will base the split on the entered person
              MRPs.
            </p>
            {mrpTotalNum > 0 && totals.mrpEnteredTotal > 0 && totals.mrpEnteredTotal !== mrpTotalNum && (
              <div className="callout">
                <div>
                  <strong>Heads up</strong>
                  <p>
                    Sum of individual MRPs is {formatCurrency(totals.mrpEnteredTotal)} which
                    doesn&apos;t match the original MRP value. We still use the original MRP to
                    calculate each person&apos;s efficiency.
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
                <div className="empty-state">No friends yet. Use “+ Add friend” to start.</div>
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
                            const val = e.target.value === '' ? '' : Number(e.target.value)
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
                      <button className="ghost small danger" onClick={() => removePerson(person.id)}>
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
                      <span className="dot" style={{ background: slice.color }} />
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
                <div className="empty-state">Add people and amounts to see the split.</div>
              )}
              {totals.perPerson.map((person) => {
                const pct = (person.efficiency * 100 || 0).toFixed(1)
                const barPct = totalBillNum > 0 ? Math.min(100, (person.share / totalBillNum) * 100) : 0
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
              Values use proportional split (person MRP ÷ total MRP × final bill). Rounded to 2
              decimals; tiny rounding drift may appear.
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
    </>
  )
}

export default Home
