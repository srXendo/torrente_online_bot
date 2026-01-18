const c_bot_helper = require('./helpers/bot.helper')
const bot_helper = new c_bot_helper()
const c_apis = require('./apis/index.api')
const apis = new c_apis(bot_helper)


process.on('SIGINT', async() => {
    await apis.disconnect()
    setTimeout(()=>{
        process.exit(0)
    }, 2600)
})