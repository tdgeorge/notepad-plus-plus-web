export function createVimTab(sourceTab, id) {
  if (!sourceTab || !Number.isFinite(id)) return null
  const baseName = sourceTab.name?.trim() ? sourceTab.name : `Untitled ${id}`
  return {
    ...sourceTab,
    id,
    name: `${baseName} (vim)`,
    modified: false,
    renderMode: 'vim',
  }
}
