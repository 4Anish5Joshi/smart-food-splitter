import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  items: [],
  selectedId: null
}

const splitsSlice = createSlice({
  name: 'splits',
  initialState,
  reducers: {
    setSplits(state, action) {
      state.items = action.payload || []
    },
    setSelectedId(state, action) {
      state.selectedId = action.payload ?? null
    }
  }
})

export const { setSplits, setSelectedId } = splitsSlice.actions
export default splitsSlice.reducer
