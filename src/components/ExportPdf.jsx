import foodLogo from '../assets/food-logo.png'

const ExportPdf = ({
  hasSplit,
  splitName,
  payerName,
  totalBill,
  mrpTotal,
  totals,
  savedAmount,
  totalInWords,
  paidById,
  totalBillNum,
  formatCurrency,
  round2,
  splitUrl
}) => {
  if (!hasSplit) return null

  return (
    <div className="print-only">
      <div className="print-header">
        <div className="print-brand">
          <img src={foodLogo} alt="Food logo" className="print-logo" />
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
              {totals.discountPct.toFixed(1)}% (You saved {formatCurrency(savedAmount)})
            </td>
            <td>{new Date().toLocaleString()}</td>
          </tr>
          <tr>
            <td colSpan={4}>Amount in words: {totalInWords} rupees</td>
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
                    ? `Gets ${formatCurrency(round2(totalBillNum - person.share))}`
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
        Values use proportional split (person MRP ÷ total MRP × final bill). Thank you.
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
  )
}

export default ExportPdf
