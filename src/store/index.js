import { configureStore } from '@reduxjs/toolkit'
import splitsReducer from './slices/splitsSlice'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    splits: splitsReducer,
    auth: authReducer
  }
})

export default store
