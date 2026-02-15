import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  savedCreds: null,
  authError: ''
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload ?? null
    },
    setSavedCreds(state, action) {
      state.savedCreds = action.payload ?? null
    },
    setAuthError(state, action) {
      state.authError = action.payload ?? ''
    }
  }
})

export const { setUser, setSavedCreds, setAuthError } = authSlice.actions
export default authSlice.reducer
