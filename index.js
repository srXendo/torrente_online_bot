const c_bot_helper = require('./helpers/bot.helper')
const bot_helper = new c_bot_helper()
const c_apis = require('./apis/index.api')
const apis = new c_apis(bot_helper)
const isElectron = !!process.versions.electron;
if(isElectron){
    const electron = require('./main.js')
    electron(apis)
}else{
    const { recive_start, connectSSE, startSensorLoop } = require('./no_electron.js');

        recive_start('192.168.1.130', 8888, process.argv[4]).then(_=>{
        connectSSE('192.168.1.130', 8888);
        startSensorLoop('192.168.1.130', 8888);
    }).catch(err=>{
        console.error(new Error(err.stack))
    });
    process.on('SIGINT', async() => {
        await apis.disconnect()
        setTimeout(()=>{
            process.exit(0)
        }, 1200)
    })
}


