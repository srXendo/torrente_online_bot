
let ip_server = '192.168.1.134'
let port_server = 8888
const c_bot_helper = require('./helpers/bot.helper')
const bot_helper = new c_bot_helper()
const c_apis = require('./apis/index.api')
const apis = new c_apis(bot_helper)
const BotService = require('./services/bot.service')
const PartyService = require('./services/game.service')


const bots = []
let first = true
const partyService = new PartyService(ip_server, port_server, 30)
partyService.start_game(bot_helper).then(()=>{
    console.log('connect bot end')
})
/*for(let i = 1; i< 14; i++){
    const bot = new BotService(ip_server, port_server, bot_helper, first)
    bot.connect(i)
    bots.push(bot)
    first = false
}*/

process.on('SIGINT', () => {
    partyService.disconect_bots();
    setTimeout(()=>{
        process.exit(0)
    }, 600)
})
//<Buffer 3f 00 1f 7a 00 0a 27 c2 e4 02>