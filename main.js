// Gitar Öğren — Electron ana süreci
const { app, BrowserWindow, protocol, net, ipcMain, dialog, session, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

let log;
try {
  log = require('electron-log/main');
  log.initialize();
} catch {
  log = console;
}

// Şarkı eşliği için kullanıcı tıklaması beklemeden ses çalabilsin
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Uygulama dosyaları "app://local/..." adresinden sunulur. Böylece alphaTab'in
// worker / audio worklet'leri ve ses kartı erişimi güvenli bir kaynakta çalışır.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
  },
]);

const ROOT = __dirname;
const ALPHATAB_DIST = path.join(ROOT, 'node_modules', '@coderline', 'alphatab', 'dist');
const userDir = () => app.getPath('userData');
const userSongsDir = () => path.join(userDir(), 'songs');

const SONG_EXT = ['.gp', '.gp3', '.gp4', '.gp5', '.gpx', '.musicxml', '.xml', '.mxl', '.atex', '.alphatex', '.cap', '.capx'];

function safeJoin(base, rel) {
  const p = path.normalize(path.join(base, rel));
  if (!p.startsWith(path.normalize(base))) return null;
  return p;
}

function resolveAppUrl(urlStr) {
  const u = new URL(urlStr);
  const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  if (rel.startsWith('vendor/alphatab/')) return safeJoin(ALPHATAB_DIST, rel.slice('vendor/alphatab/'.length));
  if (rel.startsWith('songs/')) return safeJoin(path.join(ROOT, 'songs'), rel.slice('songs/'.length));
  if (rel.startsWith('user-songs/')) return safeJoin(userSongsDir(), rel.slice('user-songs/'.length));
  if (rel.startsWith('assets/')) return safeJoin(path.join(ROOT, 'assets'), rel.slice('assets/'.length));
  return safeJoin(path.join(ROOT, 'src'), rel || 'index.html');
}

// ---------- basit kalıcı depo (ilerleme, ayarlar) ----------
const storeFile = () => path.join(userDir(), 'veri.json');
let storeCache = null;
let storeTimer = null;
function loadStore() {
  if (storeCache) return storeCache;
  try {
    storeCache = JSON.parse(fs.readFileSync(storeFile(), 'utf8'));
  } catch {
    storeCache = {};
  }
  return storeCache;
}
function saveStoreSoon() {
  clearTimeout(storeTimer);
  storeTimer = setTimeout(flushStore, 400);
}
function flushStore() {
  clearTimeout(storeTimer);
  if (!storeCache) return;
  try {
    fs.mkdirSync(userDir(), { recursive: true });
    const tmp = storeFile() + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(storeCache, null, 1));
    fs.renameSync(tmp, storeFile());
  } catch (e) {
    log.error('Depo yazılamadı', e);
  }
}

// ---------- şarkılar ----------
function readTexMeta(file) {
  try {
    const head = fs.readFileSync(file, 'utf8').slice(0, 2000);
    const t = head.match(/\\title\s+"([^"]*)"/);
    const a = head.match(/\\artist\s+"([^"]*)"/);
    return { title: t ? t[1] : null, artist: a ? a[1] : null };
  } catch {
    return {};
  }
}

function listSongs() {
  const out = [];
  const builtIn = path.join(ROOT, 'songs');
  if (fs.existsSync(builtIn)) {
    for (const f of fs.readdirSync(builtIn).sort()) {
      if (!f.endsWith('.atex')) continue;
      const m = readTexMeta(path.join(builtIn, f));
      out.push({ id: 'b:' + f, url: 'app://local/songs/' + encodeURIComponent(f), file: f, format: 'tex', builtIn: true, title: m.title || f, artist: m.artist || '' });
    }
  }
  const ud = userSongsDir();
  if (fs.existsSync(ud)) {
    const meta = loadStore().songMeta || {};
    for (const f of fs.readdirSync(ud).sort((a, b) => a.localeCompare(b, 'tr'))) {
      const ext = path.extname(f).toLowerCase();
      if (!SONG_EXT.includes(ext)) continue;
      const isTex = ext === '.atex' || ext === '.alphatex';
      const m = meta['u:' + f] || (isTex ? readTexMeta(path.join(ud, f)) : {});
      out.push({
        id: 'u:' + f,
        url: 'app://local/user-songs/' + encodeURIComponent(f),
        file: f,
        format: isTex ? 'tex' : 'binary',
        builtIn: false,
        title: m.title || path.basename(f, ext),
        artist: m.artist || '',
      });
    }
  }
  return out;
}

function importFiles(paths) {
  fs.mkdirSync(userSongsDir(), { recursive: true });
  const added = [];
  for (const src of paths) {
    const ext = path.extname(src).toLowerCase();
    if (!SONG_EXT.includes(ext)) continue;
    let name = path.basename(src);
    let dest = path.join(userSongsDir(), name);
    let i = 2;
    while (fs.existsSync(dest)) {
      name = `${path.basename(src, ext)} (${i++})${ext}`;
      dest = path.join(userSongsDir(), name);
    }
    fs.copyFileSync(src, dest);
    added.push('u:' + name);
  }
  return added;
}

// ---------- pencere ----------
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0e1116',
    title: 'Gitar Öğren',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(ROOT, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL('app://local/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) e.preventDefault();
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url) => log.error('Sayfa yüklenemedi', code, desc, url));
  win.webContents.on('render-process-gone', (_e, d) => {
    log.error('Arayüz çöktü', d);
    dialog.showErrorBox('Gitar Öğren', 'Ekran çizilemedi (' + d.reason + '). Programı kapatıp tekrar aç.');
  });
  win.webContents.on('console-message', (_e, level, message, line, source) => {
    if (level >= 2) log.warn('[arayüz]', message, source + ':' + line);
  });
  win.on('closed', () => (win = null));
}

// ---------- otomatik güncelleme ----------
let autoUpdater = null;
function sendUpdate(state, extra = {}) {
  if (win) win.webContents.send('update:status', { state, ...extra });
}
function setupUpdater() {
  if (!app.isPackaged) return;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    log.error('electron-updater yüklenemedi', e);
    return;
  }
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () => sendUpdate('checking'));
  autoUpdater.on('update-available', (i) => sendUpdate('available', { version: i.version }));
  autoUpdater.on('update-not-available', () => sendUpdate('latest'));
  autoUpdater.on('download-progress', (p) => sendUpdate('downloading', { percent: Math.round(p.percent) }));
  autoUpdater.on('update-downloaded', (i) => sendUpdate('ready', { version: i.version }));
  autoUpdater.on('error', (e) => sendUpdate('error', { message: String(e?.message || e) }));
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000);
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 1000 * 60 * 60 * 3);
}

// ---------- IPC ----------
function setupIpc() {
  ipcMain.handle('store:get', (_e, key) => {
    const s = loadStore();
    return key ? s[key] : s;
  });
  ipcMain.handle('store:set', (_e, key, value) => {
    loadStore()[key] = value;
    saveStoreSoon();
    return true;
  });
  ipcMain.handle('songs:list', () => listSongs());
  ipcMain.handle('songs:import', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Şarkı dosyası seç',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Guitar Pro / MusicXML / alphaTex', extensions: SONG_EXT.map((e) => e.slice(1)) },
        { name: 'Tüm dosyalar', extensions: ['*'] },
      ],
    });
    if (r.canceled) return [];
    return importFiles(r.filePaths);
  });
  ipcMain.handle('songs:importPaths', (_e, paths) => importFiles(Array.isArray(paths) ? paths : []));
  ipcMain.handle('songs:delete', (_e, id) => {
    if (typeof id !== 'string' || !id.startsWith('u:')) return false;
    const p = safeJoin(userSongsDir(), id.slice(2));
    if (p && fs.existsSync(p)) fs.unlinkSync(p);
    const s = loadStore();
    if (s.songMeta) delete s.songMeta[id];
    saveStoreSoon();
    return true;
  });
  ipcMain.handle('songs:setMeta', (_e, id, meta) => {
    const s = loadStore();
    s.songMeta = s.songMeta || {};
    s.songMeta[id] = { title: String(meta?.title || ''), artist: String(meta?.artist || '') };
    saveStoreSoon();
    return true;
  });
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    packaged: app.isPackaged,
    soundfont: fs.existsSync(path.join(ROOT, 'assets', 'soundfont', 'GeneralUser-GS.sf2')),
  }));
  ipcMain.handle('update:check', async () => {
    if (!autoUpdater) return { state: 'dev' };
    try {
      await autoUpdater.checkForUpdates();
      return { state: 'checking' };
    } catch (e) {
      return { state: 'error', message: String(e?.message || e) };
    }
  });
  ipcMain.handle('update:install', () => {
    if (autoUpdater) {
      flushStore();
      autoUpdater.quitAndInstall(false, true);
    }
  });
  ipcMain.handle('shell:openReleases', () =>
    shell.openExternal('https://github.com/kubilaytekinoz/gitar-ogren-claude/releases'),
  );
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // Dosya tipi açıkça belirtilir: bazı Windows'larda kayıt defteri .js'yi
    // "text/plain" sayıyor ve sayfa hiç çalışmıyordu.
    const MIME = {
      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf',
      '.woff': 'font/woff', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png',
      '.sf2': 'application/octet-stream', '.sf3': 'application/octet-stream', '.atex': 'text/plain; charset=utf-8',
    };
    protocol.handle('app', async (req) => {
      try {
        const file = resolveAppUrl(req.url);
        if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
          log.warn('Bulunamadı:', req.url);
          return new Response('bulunamadı', { status: 404 });
        }
        const res = await net.fetch(pathToFileURL(file).toString());
        const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
        return new Response(res.body, { status: 200, headers: { 'content-type': type, 'cache-control': 'no-cache' } });
      } catch (e) {
        log.error('Dosya okunamadı', req.url, e);
        return new Response('hata: ' + e.message, { status: 500 });
      }
    });

    // Gitar girişi (mikrofon / USB ses kartı) iznini otomatik ver
    const ses = session.defaultSession;
    ses.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'media' || permission === 'midi'));
    ses.setPermissionCheckHandler((_wc, permission) => permission === 'media' || permission === 'midi');
    ses.setDevicePermissionHandler(() => true);

    setupIpc();
    createWindow();
    setupUpdater();
  });

  app.on('before-quit', flushStore);
  app.on('window-all-closed', () => app.quit());
}
