
const { app, BrowserWindow } = require('electron/main')
let apis_external = null
module.exports = (apis)=>{

  apis_external = apis
  const path = require('node:path')
  app.commandLine.appendSwitch('ignore-certificate-errors');
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');

  function createWindow () {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
      
      },

    })
    win.webContents.openDevTools({ mode: 'right' })
    win.loadURL('https://localhost:3000/')
  }

  app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })


}
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      apis_external.disconnect().then(()=>{
        setTimeout(()=>{
          app.quit()
          process.exit(0)
            
        }, 300)
        
      })

      
    }
  })