export function createWebPreviewTab(sourceTab, id) {
  if (!sourceTab || !Number.isFinite(id)) return null
  const baseName = sourceTab.name?.trim() ? sourceTab.name : `new ${id}`
  return {
    ...sourceTab,
    id,
    name: `${baseName} (webpage)`,
    modified: false,
    renderMode: 'webpage',
  }
}
