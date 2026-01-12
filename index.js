
let ip_server = '192.168.1.134'
let port_server = 8888
const c_bot_helper = require('./helpers/bot.helper')
const bot_helper = new c_bot_helper()
const c_apis = require('./apis/index.api')
const apis = new c_apis(bot_helper)
const BotService = require('./services/bot.service')
const bots = []
let first = true
for(let i = 1; i< 14; i++){


    const bot = new BotService(ip_server, port_server, bot_helper, first)
    bot.connect(i)
    bots.push(bot)

    /*setInterval(()=>{
        //console.log('bot start_move')
        bots[i-1].start_move()
    }, 200)*/
    first = false

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