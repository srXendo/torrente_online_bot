const BotService = require('./bot.service');
module.exports = class GameService{
    #ip_server = ''
    #port_server = ''
    #number_bots = 0
    #number_connected_bots = 1;
    #first = true
    #arr_bots = []
    constructor(ip, port, number_bots){
        this.#ip_server = ip
        this.#port_server = port
        this.#number_bots = number_bots
    }
    start_game(bot_helper){
        return new Promise((resolve, reject)=>this.try_connect_bots(resolve, bot_helper))
    }
    async try_connect_bots(cb, bot_helper){

            const bot = new BotService(this.#ip_server, this.#port_server, bot_helper, this.#first)
            bot.connect(this.#number_connected_bots, async(in_game)=>{
                if(in_game){
                    this.#first = false;
                    this.#number_connected_bots = this.#number_connected_bots + 1
                    this.#arr_bots.push(bot)
                    if(this.#number_connected_bots < this.#number_bots){
                        this.try_connect_bots(cb, bot_helper)
                    }else{
                        cb('end')
                    }
                }else{
                    this.try_connect_bots(cb, bot_helper)
                }
                
            })


    }
    disconect_bots(){
        for(let bot of this.#arr_bots){
            bot.disconnect()
        }
    }
}