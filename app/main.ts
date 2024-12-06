import {app, BrowserWindow, dialog, ipcMain, OpenDialogOptions, screen, session} from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let win: BrowserWindow | null = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

function createWindow(): BrowserWindow {

  const size = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    frame: false,
    roundedCorners: true,
    center: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: (serve),
      contextIsolation: false,
      webviewTag: true,
    },
  });

  ipcMain.on('select-project-parent-dir', async (event, openDialogOptions: OpenDialogOptions) =>{
    if (win) {
      try {
        win?.webContents.send('project-parent-dir', await dialog.showOpenDialog(win, openDialogOptions));
      } catch (e) {
        console.error(e);
      }
    }
  });

  session.fromPartition('start-spring-io').setDownloadPath('/tmp/start-spring-io');

  // https://start.spring.io/starter.zip?type=gradle-project&language=java&bootVersion=3.4.0&baseDir=demo&groupId=com.example&artifactId=demo&name=demo&description=Demo%20project%20for%20Spring%20Boot&packageName=com.example.demo&packaging=jar&javaVersion=17
  session.fromPartition('start-spring-io').webRequest.onBeforeRequest({urls: ['*://*/*']}, (details: any, callback: any) => {
    if (details.url.startsWith('https://start.spring.io/starter.zip')) {
      win?.webContents.send('message-from-main', {
        type: 'start-spring-io-project-started',
        url: downloadUrl
      });
    }
    callback({cancel: false});
  });

  let downloadUrl: string | null = null;
  session.fromPartition('start-spring-io').webRequest.onCompleted({urls: ['*://*/*']}, (details: any) => {
    if (details.url.startsWith('https://start.spring.io/starter.zip')) {
      downloadUrl = details.url;
    }
  });

  session.fromPartition('start-spring-io').on('will-download', (event, item, webContents) => {
    item.once('done', (event, state) => {
      if (state === 'completed') {
        console.log(`Download url: ${downloadUrl}`);
        console.log(`Download completed: ${item.getSavePath()}`);

        win?.webContents.send('message-from-main', {
          type: 'start-spring-io-project',
          url: downloadUrl,
          projectPath: item.getSavePath(),
        });
      } else if (state === 'cancelled') {
        win?.webContents.send('message-from-main', {
          type: 'start-spring-io-project-cancelled',
          url: downloadUrl
        });
      }
      downloadUrl = null;
    })
  })

  if (serve) {
    const debug = require('electron-debug');
    debug();

    require('electron-reloader')(module);
    win.loadURL('http://localhost:4200');
  } else {
    // win.webContents.openDevTools();

    // Path when running electron executable
    let pathIndex = './index.html';

    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
       // Path when running electron in local folder
      pathIndex = '../dist/index.html';
    }

    const url = new URL(path.join('file:', __dirname, pathIndex));
    win.loadURL(url.href);
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => setTimeout(createWindow, 400));

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}
