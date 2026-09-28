import { createContext, useContext } from 'react'

/** Everything the editor, toolbar and preview share (see useStudioController). */
export const StudioContext = createContext(null)

export function useStudio() {
  const value = useContext(StudioContext)
  if (!value) throw new Error('useStudio() must be used inside <StudioContext.Provider>')
  return value
}
