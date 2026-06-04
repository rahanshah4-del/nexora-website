export function goToWorkspace(navigate, location) {
  console.log('[Back To Workspace] clicked', {
    currentPath: location?.pathname || (typeof window !== 'undefined' ? window.location.pathname : ''),
    target: '/workspace',
  })
  navigate('/workspace', { replace: false })
}
