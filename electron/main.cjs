const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

let mainWindow = null;
const PORT = process.env.PORT || 5000;
const isDev = process.env.ELECTRON_DEV === 'true';

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on('second-instance', (event, commandLine, workingDirectory) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Start embedded Express backend server inside Electron process
async function startServer() {
  try {
    const serverScriptPath = path.join(__dirname, '..', 'server', 'server.js');
    const serverUrl = pathToFileURL(serverScriptPath).href;
    console.log('🔄 جاري تشغيل خادم Express المدمج من:', serverUrl);
    await import(serverUrl);
    console.log('✅ تم تشغيل خادم المنظومة وقاعدة البيانات بنجاح داخل Electron');
    return true;
  } catch (err) {
    console.error('❌ خطأ في تشغيل خادم المنظومة:', err);
    return false;
  }
}
async function createWindow() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    fullscreen: true,
    autoHideMenuBar: true,
    icon: iconPath,
    title: 'منظومة فحص وتسجيل المجندين - وحدة الأمن والتحريات - SECURITY EYE',
    backgroundColor: '#090d13',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Toggle fullscreen with F11
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  // Grant webcam/microphone permissions only for local origins
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents.getURL();
    const allowedOrigins = ['http://localhost:5173', `http://localhost:${PORT}`];
    const isLocal = allowedOrigins.some(o => url.startsWith(o));
    const allowedPerms = ['media', 'mediaKeySystem', 'camera', 'microphone'];
    callback(isLocal && allowedPerms.includes(permission));
  });

  const url = isDev ? 'http://localhost:5173' : `http://localhost:${PORT}`;

  console.log('🌐 جاري تحميل واجهة البرنامج من:', url);

  // Load URL with automatic retry if server is still starting
  let retries = 0;
  const maxRetries = 10;
  
  const tryLoad = async () => {
    try {
      await mainWindow.loadURL(url);
      console.log('✅ تم تحميل الواجهة بنجاح');
      mainWindow.maximize();
      mainWindow.show();
    } catch (err) {
      if (retries < maxRetries) {
        retries++;
        console.log(`⏳ جاري إعادة المحاولة (${retries}/${maxRetries})...`);
        setTimeout(tryLoad, 800);
      } else {
        console.error('❌ فشل تحميل الواجهة بعد عدة محاولات:', err);
        // Fallback to load direct dist/index.html if available
        const localHtml = path.join(__dirname, '..', 'dist', 'index.html');
        mainWindow.loadFile(localHtml).then(() => {
          mainWindow.maximize();
          mainWindow.show();
        }).catch(e => console.error('Fallback failed:', e));
      }
    }
  };

  tryLoad();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Start server first, then open window
  await startServer();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  console.log('🛑 إغلاق البرنامج والتنظيف...');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
