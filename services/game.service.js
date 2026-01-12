module.exports = class GameService{
    port_number_map_bots = {}
    number_bot = 1;
    
    constructor(){}
    add_bot(port_bot, bot, ip_server, port_server, bot_helper, first, server){
        this.port_number_map_bots[port_bot] = { number_bot: this.number_bot, bot: bot, port_bot, ip_server, port_server, bot_helper, first, server}
        this.number_bot = this.number_bot + 1



    }
    get_number_bot_from_port_bot(port_bot){
        return this.port_number_map_bots[port_bot].number_bot
    }
    route_to_bot(msg, port_bot, rinfo){
        const response = this.port_number_map_bots[port_bot].bot.handler_message(msg, rinfo)
        if(response){


            server.send(response, port_server, ip_server, (err) => {
            if (err) {
                console.error(`Error al enviar la respuesta: ${err.message}`);
            } else {
                //console.log(`Respuesta enviada: ${ip_server}:${port_server}`);
                
            }
            
            //console.log(`------FIN DEL MENSAJE------`);
            });
        }
    }
    start_bots(){
        console.log('start bots', this.port_number_map_bots)
        for(let obj_bot_index in this.port_number_map_bots){
            
            let obj_bot =  this.port_number_map_bots[obj_bot_index]
            obj_bot.server.on('listening', () => {
                
                const address = server.address();
                    //console.log(`Servidor UDP escuchando en ${address.address}:${address.port}`);
                    //console.log(`------INICIO DE LA ESCUCHA------`);
            
                obj_bot.bot.init_bot(obj_bot.ip_server, obj_bot.port_server,  obj_bot.number_bot , obj_bot.bot_helper, obj_bot.first, obj_bot.port_bot, obj_bot.server)
                obj_bot.server.on('message', (msg, rinfo) => {

                //console.log(`Mensaje recibido: ${rinfo.address}:${rinfo.port}\n${msg.toString('hex')}`);
                //console.log('handler_message')
                    this.route_to_bot(msg, rinfo.port, rinfo)
                
                });
                const helloClient = Buffer.from("00026128011242191fb8bb154e4401763631007932","hex")
                obj_bot.server.send(helloClient, port_server, ip_server, (err) => {
                    if (err) {
                        console.error(`Error al clientHello: ${err.message}`);
                    } else {
                                        console.log('here?¿')
                        //console.log(`clientHello enviada: ${ip_server}:${port_server}`);
                        
                    }
                    //console.log(`------FIN DEL clientHello------`);
                });    


            });

            obj_bot.server.on('error', (err) => {
                console.error(`Error en el servidor: ${err.message}`);
                server.close();
            });
            const HOST = '0.0.0.0';
            obj_bot.server.bind(HOST);            
            

        }

    }
}