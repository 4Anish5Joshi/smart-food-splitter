const AddFriendModal = ({
  show,
  hasSplit,
  onClose,
  newPersonName,
  newPersonMrp,
  setNewPersonName,
  setNewPersonMrp,
  errorText,
  onSave
}) => {
  if (!show || !hasSplit) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
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
            inputMode="decimal"
            placeholder="0"
            value={newPersonMrp}
            onChange={(e) => setNewPersonMrp(e.target.value)}
          />
        </label>
        {errorText && <p className="error-text">{errorText}</p>}
        <div className="modal-actions">
          <button
            className="ghost"
            onClick={() => {
              onClose()
            }}
          >
            Cancel
          </button>
          <button className="primary" onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddFriendModal
