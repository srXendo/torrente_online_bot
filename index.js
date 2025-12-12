
let ip_server = '192.168.1.134'
let port_server = 8888
const c_bot_helper = require('./helpers/bot.helper')
const bot_helper = new c_bot_helper()
const c_apis = require('./apis/index.api')
const apis = new c_apis(bot_helper)
const BotService = require('./services/bot.service')
const bots = []
for(let i = 0; i< 31; i++){
    setTimeout(()=>{
        bots.push(new BotService(ip_server, port_server, i, bot_helper))

        bots[i].connect()
    }, 300*i)
}

process.on('SIGINT', () => {
    
    for(let bot of bots){
        bot.disconnect()
    }
    setTimeout(()=>{
        process.exit(0)
    }, 500)
})
//<Buffer 3f 00 1f 7a 00 0a 27 c2 e4 02>