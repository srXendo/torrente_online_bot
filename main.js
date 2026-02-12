
module.exports = (apis)=>{

  const { app, BrowserWindow } = require('electron/main')
  const path = require('node:path')
  app.commandLine.appendSwitch('ignore-certificate-errors');
  function createWindow () {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      }
    })

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

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      apis.disconnect().then(()=>{
        setTimeout(()=>{
          app.quit()
          process.exit(0)
            
        }, 300)
        
      })

      
    }
  })
}