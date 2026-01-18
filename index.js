const dgram = require('dgram');
const BotService = require('./services/bot.service')
let ip_server = '192.168.1.134';
let port_server = 8888;
const c_bot_helper = require('./helpers/bot.helper')
const bot_helper = new c_bot_helper()
const c_apis = require('./apis/index.api')
const apis = new c_apis(bot_helper)
const num_bots = 22;
let mapper = {}
let id_bot_mapper = {}
async function start_bots(){
    const ports_bots_map = {}
    for(let i = 1; i < num_bots+1; i++){
        
        const obj_starter = await get_server_and_port()
        console.log(`new bot: id_bot${i} port: ${obj_starter.port}`);
        ports_bots_map[obj_starter.port] = {
            server: obj_starter.server,
            number_bot: i,
            port_bot: obj_starter.port,
            bot: new BotService(i, bot_helper)
        }
        id_bot_mapper[i] = obj_starter.port,
        ports_bots_map[obj_starter.port].server.on('message', handler_message)

    }

    return ports_bots_map
}
function send_package_to_server(id_bot, buf){
    return new Promise((resolve, reject)=>{
        mapper[id_bot_mapper[id_bot]].server.send(buf, port_server, ip_server, (err) => {
            if (err) {
                console.error(`Error al clientHello: ${err.message}`);
                resolve(false)
            } else {
                console.log(`Mensaje enviado: id_bot: ${id_bot} ${id_bot_mapper[id_bot]} \n${buf.toString('hex')}`);
                console.log('handler_message')
                resolve(true)
                
            }
        });
    })

}
function get_server_and_port(){
    return new Promise(async (resolve, reject)=>{

        const server = dgram.createSocket('udp4');

        server.on('listening', () => {
            const address = server.address();
            resolve({server: server, port: address.port})
            
        });
        server.on('error', (err) => {
            console.error(`Error en el servidor: ${err.message}`);
            server.close();
        });
        const HOST = '0.0.0.0';
        server.bind(HOST);
    })
}

async function handler_message(msg, rconf){
    console.log(`Mensaje recibido: id_bot: ${mapper[this.address().port].number_bot} ${this.address().port} \n${msg.toString('hex')}`);
    console.log('handler_message')
    const responses = mapper[this.address().port].bot.handler_message(msg, rconf)
    const id_bot = mapper[this.address().port].number_bot
    if(!responses){
        console.error(new Error(`[handler_message]: bot nº ${id_bot} msg not recognize`))
        return
    }
    for(let msg_to_server of responses){
        if(!msg_to_server.is_external){
            await send_package_to_server(id_bot, msg_to_server)
        }else{
            for(let respawn of msg_to_server.arr_respawns){
                const bot_port = id_bot_mapper[respawn.bot]
                if(!mapper[bot_port].bot.in_game){
                    mapper[bot_port].bot.spawn(respawn.cords)
                }
                
            }
        }
    }
    
}


start_bots().then(async(arr_bots)=>{
    mapper = arr_bots
    for(let bot of Object.values(arr_bots)){
        const helloClient = Buffer.from("00026128011242191fb8bb154e4401763631007932","hex")
        const hello_response = await send_package_to_server(bot.number_bot, helloClient)
    }

})
process.on('SIGINT', async() => {
    for(let bot of Object.values(mapper)){
        const responses = bot.bot.disconnect()
        send_package_to_server(bot.number_bot, responses[0])
        send_package_to_server(bot.number_bot, responses[1])
    }
    setTimeout(()=>{
        process.exit(0)
    }, 2600)
})