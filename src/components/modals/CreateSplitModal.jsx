const CreateSplitModal = ({
  show,
  onClose,
  newSplitName,
  setNewSplitName,
  newFriends,
  uniqueFriendNames,
  addFriendRow,
  updateFriendRow,
  removeFriendRow,
  errorText,
  onCreate
}) => {
  if (!show) return null

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        onClose()
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
            <button className="ghost small" onClick={() => addFriendRow()}>
              + Add friend
            </button>
          </div>
          {uniqueFriendNames.length > 0 && <div className="muted small">Suggestions</div>}
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
                    addFriendRow(name)
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
                  autoFocus={idx === newFriends.length - 1}
                  onChange={(e) => updateFriendRow(f.id, 'name', e.target.value)}
                />
              </label>
              {newFriends.length > 1 && (
                <button className="ghost small danger" onClick={() => removeFriendRow(f.id)}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {errorText && <p className="error-text">{errorText}</p>}
        <div className="modal-actions">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" onClick={onCreate} disabled={!newSplitName.trim()}>
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateSplitModal
