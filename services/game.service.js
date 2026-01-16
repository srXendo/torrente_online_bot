const BotService = require('./bot.service');
module.exports = class GameService{
    #ip_server = ''
    #port_server = ''
    #number_bots = 0
    #number_connected_bots = 1;
    #first = true
    #arr_bots = []
    obj_bots = {}
    constructor(ip, port, number_bots){
        this.#ip_server = ip
        this.#port_server = port
        this.#number_bots = number_bots
    }
    start_game(bot_helper){

        return new Promise((resolve, reject)=>this.try_connect_bots(resolve, bot_helper))
    }
    async try_connect_bots(cb, bot_helper){
        if(this.#number_connected_bots > this.#number_bots){
            
        }else{
            const bot = new BotService(this.#ip_server, this.#port_server, bot_helper, this.#first)
            bot.connect(this.#number_connected_bots, (arr)=>this.respawn(arr))
            this.obj_bots[this.#number_connected_bots] = bot
            this.#number_connected_bots = this.#number_connected_bots + 1
            this.try_connect_bots(cb, bot_helper)
        }
    }
    bots_respawns(arr_bots){
        console.log('arr_bots_reswpans', arr_bots.length)
        for(let row of arr_bots){
            if(this.obj_bots[row.bot] && !this.obj_bots[row.bot].bot_spawn){
                this.obj_bots[row.bot].disconnect()
                this.obj_bots[row.bot].connect(this.obj_bots[row.bot].number_bot, (arr)=>this.respawn(arr))
            }
        }
    }
    disconect_bots(){
        for(let bot of Object.values(this.obj_bots)){
            bot.disconnect()
            
        }
    }
    async respawn(arr_spawn_bots){
        this.bots_respawns(arr_spawn_bots)
                
    }
}