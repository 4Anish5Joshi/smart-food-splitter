const SpendAnalyzerModal = ({
  show,
  onClose,
  analyzerMode,
  setAnalyzerMode,
  missingPayerSplits,
  currentBalances,
  overallBalances,
  settlements,
  settlementKey,
  toggleSettlement,
  formatCurrency
}) => {
  if (!show) return null

  const balances = analyzerMode === 'current' ? currentBalances : overallBalances

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Spend analyzer</h3>
          <div className="analyzer-controls">
            <button
              className={`ghost small ${analyzerMode === 'current' ? 'active' : ''}`}
              onClick={() => setAnalyzerMode('current')}
            >
              This split
            </button>
            <button
              className={`ghost small ${analyzerMode === 'all' ? 'active' : ''}`}
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
                {missingPayerSplits.length} split(s) missing a payer. Set &quot;Who paid?&quot;
                for each to include them here.
              </p>
            </div>
          )}
          {balances.length === 0 ? (
            <div className="empty-state">
              No balances to settle. Add people, set a payer, and enter a bill.
            </div>
          ) : (
            balances.map((tx) => {
              const key = settlementKey(tx, analyzerMode)
              const settled = !!settlements[key]
              return (
                <div key={key} className={`balance-row ${settled ? 'settled' : ''}`}>
                  <div>
                    <span>
                      <strong>{tx.from}</strong> → <strong>{tx.to}</strong>
                    </span>
                    {tx.splitName && analyzerMode === 'all' && (
                      <p className="muted small">{tx.splitName}</p>
                    )}
                  </div>
                  <div className="balance-actions">
                    <strong className="amount">{formatCurrency(tx.amount)}</strong>
                    <button
                      className={`ghost small ${settled ? 'success' : ''}`}
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
  )
}

export default SpendAnalyzerModal
