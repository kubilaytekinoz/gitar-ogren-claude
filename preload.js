// Arayüze yalnızca ihtiyaç duyduğu kadar yetki verilir.
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('gitar', {
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
  },
  songs: {
    list: () => ipcRenderer.invoke('songs:list'),
    import: () => ipcRenderer.invoke('songs:import'),
    importFiles: (files) => ipcRenderer.invoke('songs:importPaths', Array.from(files).map((f) => webUtils.getPathForFile(f))),
    remove: (id) => ipcRenderer.invoke('songs:delete', id),
    setMeta: (id, meta) => ipcRenderer.invoke('songs:setMeta', id, meta),
  },
  app: {
    info: () => ipcRenderer.invoke('app:info'),
    openReleases: () => ipcRenderer.invoke('shell:openReleases'),
  },
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    install: () => ipcRenderer.invoke('update:install'),
    onStatus: (cb) => {
      const h = (_e, s) => cb(s);
      ipcRenderer.on('update:status', h);
      return () => ipcRenderer.removeListener('update:status', h);
    },
  },
});
