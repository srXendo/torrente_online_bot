
const dgram = require('dgram');

const server = dgram.createSocket('udp4');
module.exports = class BotService{
    #server;
    #ip_server = '192.168.1.134'
    #port_server = 8888
    obj_key_press = {pressed_key: null, is_pressed: false}
    arr_actions = []
    start = false
    dpnid = null
    party = null
    max_name_byte = 16
    max_map_name_byte = 21
    buffer_session = 'cac340'
    bot_helper = null
    user_bot = null
    bot_number = null 
    constructor(ip_server, port_server, bot_number, bot_helper){
        this.bot_number = bot_number
        this.bot_helper = bot_helper
        this.#ip_server = ip_server
        this.#port_server = port_server
        //console.log(`${bot_number}`.padStart(2, '0'))
        this.buffer_session = (this.buffer_session + `${bot_number}`.padStart(2, '0'))
        this.user_bot = Buffer.from(('Bot'+`${bot_number}`.padStart(2, "0")), 'ascii')
    }
    connect(){
        this.#server = dgram.createSocket('udp4');
        const helloClient = Buffer.from("00026128011242191fb8bb154e4401763631007932","hex")
        this.#server.on('listening', () => {
            const address = this.#server.address();
            //console.log(`Servidor UDP escuchando en ${address.address}:${address.port}`);
            //console.log(`------INICIO DE LA ESCUCHA------`);
            this.#server.send(helloClient, this.#port_server, this.#ip_server, (err) => {
                if (err) {
                    console.error(`Error al clientHello: ${err.message}`);
                } else {
                    //console.log(`clientHello enviada: ${this.#ip_server}:${this.#port_server}`);
                    
                }
                //console.log(`------FIN DEL clientHello------`);
            });
        });
        this.#server.on('message', (msg, rinfo) => {
            //console.log(`Mensaje recibido: ${rinfo.address}:${rinfo.port}\n${msg.toString('hex')}`);
            //console.log('handler_message')
            const response = this.handler_message(msg, rinfo)
            if(response){


                this.#server.send(response, this.#port_server, this.#ip_server, (err) => {
                if (err) {
                    console.error(`Error al enviar la respuesta: ${err.message}`);
                } else {
                    //console.log(`Respuesta enviada: ${ip_server}:${port_server}`);
                    
                }
                
                //console.log(`------FIN DEL MENSAJE------`);
                });
            }
        });
        this.#server.on('error', (err) => {
            console.error(`Error en el servidor: ${err.message}`);
            this.#server.close();
        });
        const HOST = '0.0.0.0';
        this.#server.bind(HOST);
    }
    handler_message(msg, rinfo){
        const headers = msg.readUInt16BE(0)
        switch(headers){
            case 0x3f08:
                //disconnect
                console.log('disconnected bot ')
                break;
            case 0x3700:
                //console.log('msg: No uknow: ', '0x3700')
                
                const ok = Buffer.from("3f020404"+this.buffer_session, 'hex')
                ok.writeUint8(msg.readUint8(3), 2)
                ok.writeUint8(msg.readUint8(2), 3)
                return ok

                break;
            case 0x3f00:

                this.users_actions(msg)
                const ok2 = Buffer.from("3f020404"+this.buffer_session, 'hex')
                ok2.writeUint8(msg.readUint8(3), 2)
                ok2.writeUint8(msg.readUint8(2), 3)
                return ok2

            break;
            case 0x3f01:
                //console.log('msg: No uknow2: ', '0x3f001')
                return //Buffer.from('800601000606000076758a00', 'hex')
                break;


            case 0x8006:
                //console.log('msg: main bucle: ', '0x8006')
                const action_response = this.get_action()
                action_response.writeUint8(msg.readUint8(5), 2)
                action_response.writeUint8(msg.readUint8(4), 3)
                return action_response
            break;
            case 0x7f00:
                //this.dpnid = msg.slice(164, 167)
                const before_name = Buffer.from("3f0003020000",'hex')
                const name = Buffer.from(this.user_bot.toString('hex').padEnd(this.max_name_byte * 2, "0"), 'hex')
                const after_name_before_map_name = Buffer.from('0b0200000000000000000000080600000003', 'hex')
                
                const map_name = Buffer.from(this.party.mapNameBuff.toString('hex').padEnd(this.max_map_name_byte * 2, "0"), 'hex')//Buffer.from("000000034d505f444d545f5645525449474f0000000000",'hex')
                const after_map_name = Buffer.from('90b51900be000000b0b4190001000000010000000500000074b31900c7932b5380b3190001000000102d6903','hex')
                return this.replace_name_map((Buffer.concat([before_name, name, after_name_before_map_name, map_name, after_map_name])), this.party.mapName)
                
                break;
            case 0x3f02:
                //console.log('msg: ping: ', '0x3f02')
                return Buffer.from("7f000202c3000000", 'hex')
            break;
            case 0x8802:
                //console.log('msg: firstStage: ', "0x8802")
                const session = Buffer.from('7f000100c100000002000000070000005800000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000430068006100760061006c006f00740065000000','hex')
                this.#server.send(Buffer.from("8002010006000100"+this.buffer_session+"e665f602", "hex"), this.#port_server, this.#ip_server, (err)=>{
                    if(err){
                        console.error(`Error al enviar la respuesta: ${err.message}`);                    
                    }
                })
                this.#server.send(Buffer.from("3f020000"+this.buffer_session+"", 'hex'), this.#port_server, this.#ip_server, (err)=>{
                    if(err){
                        console.error(`Error al enviar la respuesta: ${err.message}`);                    
                    }
                })
                return session
            break;
            case 0x0003: 
                //console.log('headers msg: helloServe: ', "0x0003")
                this.party = this.extract_data(msg)
                //console.log(party)
                return Buffer.from("8801000006000100"+this.buffer_session+"c2091002", 'hex')
            break;
            default: 
                console.log("err: msg not recognice: ",msg)
                console.error(new Error('msg not recognice'))
                return false
            break;
        }
    }
    extract_data(buffer) {
        let offsetByte = buffer.readUInt8(4);
        let nameStartIdx = 0;

        // Ajuste de offset si hay separadores especiales
        if (buffer.readUInt8(offsetByte + 1) !== 0x00 && buffer.readUInt8(offsetByte + 2) === 0x00) {
            offsetByte += 2;
        }

        // Busca el inicio del nombre de la sala
        for (let i = offsetByte + 1; i < buffer.length; i++) {
            const byte = buffer.readUInt8(i);
            if (byte > 0x20 && byte < 0x7E && byte !== 0x00) {
                nameStartIdx = i;
                break;
            }
        }

        const currentPlayers = buffer.readUInt8(nameStartIdx - 2);
        const maxPlayers = buffer.readUInt8(nameStartIdx - 1);

        // Detectar nombre de mapa desde "MP_"
        const mapSignature = Buffer.from('4d505f', 'hex');
        const mapOffset = buffer.indexOf(mapSignature);
        let mapName = null;
        let mapNameBuff = null
        if (mapOffset !== -1) {
            const chars = [];
            for (let i = mapOffset; i < buffer.length; i++) {
                const byte = buffer[i];
                if (byte === 0x00 || byte < 0x20 || byte > 0x7E) break;
                chars.push(String.fromCharCode(byte));
            }
            const nameCandidate = chars.join('');
            if (nameCandidate.startsWith('MP_')) {

                mapName = nameCandidate;
                mapNameBuff = Buffer.from(nameCandidate, 'ascii')
            } else {
                console.warn('⚠️ Nombre de mapa inválido:', nameCandidate);
            }
        } else {
            console.warn('⚠️ No se encontró la firma "MP_" en el buffer');
        }

        ////console.log('Encontrado nombre idx:', nameStartIdx, currentPlayers, maxPlayers, mapName);

        return {
            currentPlayers,
            maxPlayers,
            mapName,
            mapNameBuff
        };
    }
    replace_name_map(buffer, new_name_map){
        // Actualiza nombre de mapa si está disponible
        const copy = Buffer.from(buffer);
        if (new_name_map) {
            const mapSignature = Buffer.from('4d505f', 'hex');
            const mapOffset = copy.indexOf(mapSignature);
            if (mapOffset !== -1) {
                const mapBytes = Buffer.from(new_name_map, 'ascii');
                mapBytes.copy(copy, mapOffset);
                if (mapBytes.length < 20) {
                    copy.fill(0x00, mapOffset + mapBytes.length, mapOffset + 20);

                    if (new_name_map.startsWith('MP_DMT')) copy.writeUInt8(0x03, mapOffset - 1);
                    else if (new_name_map.startsWith('MP_DM')) copy.writeUInt8(0x00, mapOffset - 1);
                    else if (new_name_map.startsWith('MP_B')) copy.writeUInt8(0x01, mapOffset - 1);
                    else if (new_name_map.startsWith('MP_DO')) copy.writeUInt8(0x02, mapOffset - 1);
                }
            }
        }
        return copy
    }

    get_action(){
        const ping = Buffer.from("3f020c0c"+this.buffer_session, 'hex')
                
        if(!this.start){
            this.start = true
            const pj_setup = Buffer.from('3f001376030e0000261370c522beb644d58c1dc614ae473f010b0610'.replace('261370c5', this.buffer_session.toString('hex')), 'hex')
            pj_setup.writeUInt8(this.bot_number, 4) //byte ultimo numero de jugadores en partida 0x00
            pj_setup.writeUInt8(0x02, 25) //modelo byte 0x00 torrente 0x0b yonki
            pj_setup.writeUInt8(0x02, 24) //equipo byte 0x02 random 0x01 amarillo 0x00 rojo
            //pj_setup.writeUInt8(0x02, pj_setup.length- 10) //numero de jugador 0x01 jugador 1 0x02 jugador 2
            this.arr_actions.push(pj_setup)
            this.start = true
            const pj_response = Buffer.from('3f00800d000d1000010000e55e1d465c55b244ba37d045f6a30000'.replace('261370c5', this.buffer_session.toString('hex')), 'hex')
            //pj_response.writeUInt8(this.bot_number+1, 4)
            this.arr_actions.push(pj_response)
            return ping
        }else if(this.arr_actions.length === 0){

            return ping
        }else{
            
            return this.arr_actions.shift(0);
        }
    }

    send_msg_chat_bot(){
        setInterval(()=>{             
            //4022250ca4360610
            //363011070b21900020b0610
            //3f00f01101fbff6573746f7964656e74726f20792070756e746f6b61646a61646164610019000000050000001f71da0c01000000020000004022250ca436061000000000
            const camera_mov = JSON.stringify({hello: 'bot'})
            this.bot_helper.send_event(camera_mov)
            this.arr_actions.push(Buffer.from('3f00f01101fbff6573746f7964656e74726f20792070756e746f6b61646a61646164610019000000050000001f71da0c01000000020000004022250ca436061000000000', 'hex'))
            this.arr_actions.push(Buffer.from('3f00d932010c060101803f140319c65b55b2446e2a11c6110ef013010afe0ce150','hex'))
            
            this.arr_actions.push(Buffer.from('3f009ef8000a7440e4b1', 'hex'))
            this.arr_actions.push(Buffer.from('3f00673f000a0ea8e4b1', 'hex'))
            setTimeout(()=>{
                this.arr_actions.push(Buffer.from('3f00f2320101803f104620c65b55b244608c08c64507f013','hex'))
                
            },300)
        },5000)
        
                    
    }
    convertirHP(msg) {
        return msg.readUInt8(10);
    }

    users_actions(msg){
        const action = msg.readUInt8(5) //action player byte
        switch(action){
            case 0x0c:
                if(this.bot_number === 0){
                    this.user_move(msg)
                }                
                //console.log('any user mov')
                //
            break;
            case 0x0a:
                //this.user_camera(msg)
            break;
            case 0xfc:
                if(this.bot_number === msg.readUint8(4)){

                    const have_life = msg.readUInt8(10)
                    console.log(`${this.user_bot} ha sido impactado por: other user. `)
                    console.log(`${this.user_bot} vida restante: `, msg.readUInt8(10))
                    if(msg.readUInt8(10) === 0){
                        console.log(`ha muerto: ${this.user_bot}`)
                        const pj_setup = Buffer.from('3f001376030e0000261370c522beb644d58c1dc614ae473f010b0610'.replace('261370c5', this.buffer_session.toString('hex')), 'hex')
                        pj_setup.writeUInt8(this.bot_number, 4) //byte ultimo numero de jugadores en partida 0x00
                        pj_setup.writeUInt8(0x02, 25) //modelo byte 0x00 torrente 0x0b yonki
                        pj_setup.writeUInt8(0x02, 24) //equipo byte 0x02 random 0x01 amarillo 0x00 rojo
                        this.#server.send(pj_setup, this.#port_server, this.#ip_server, (err) => {
                            if (err) {
                                console.error(`Error al BOTDIE: ${err.message}`);
                            } else {
                                console.log(`BOTDIE enviada: ${this.#ip_server}:${this.#port_server}`);
                                
                            }
                            console.log(`------FIN DEL BOTDIE------`);
                        });
                        const buff2 = Buffer.from('3f00314a100510788359e5c50038ed4020aa83c5','hex')
                        buff2.writeUInt8(this.bot_number, 4) //byte ultimo numero de jugadores en partida 0x00
                        this.#server.send(buff2, this.#port_server, this.#ip_server, (err) => {
                            if (err) {
                                console.error(`Error al BOTDIE2: ${err.message}`);
                            } else {
                                console.log(`BOTDIE2 enviada: ${this.#ip_server}:${this.#port_server}`);
                                
                            }
                            console.log(`------FIN DEL BOTDIE------`);
                        });               
                    }
                    
                }
                
                break;
            case 0xed:
                if(this.bot_number === 0){
                    console.log('any player death')
                }
                break;
            case 0x0e:
                if(this.bot_number === 0){
                    console.log('respawn any player: ', msg.toString('hex'), this.extractRespawnXZR(msg) )
                    const bot = buffer.readUInt8(4)
                    this.bot_helper.send_event(JSON.stringify({type_action: 'spawn', value_action: this.extractRespawnXZR(msg), id_bot: bot}))
                }
                break;
            case 0x26:
               // console.log('shot air', msg)    
            break;
            default:
                break;
        }
    }
    extractRespawnXZR(buffer) {

        // Delimitador final del bloque de respawn
        const marker = Buffer.from('0610', 'hex');
        const markerIndex = buffer.indexOf(marker)-2;

        if (markerIndex < -1 || markerIndex < 16) {
            console.error('Bloque de respawn no encontrado')
        }

        // Inicio del bloque X Y Z R
        const baseOffset = markerIndex - 16;

        const x = buffer.readFloatLE(baseOffset);
        const y = buffer.readFloatLE(baseOffset + 4);
        const z = buffer.readFloatLE(baseOffset + 8);
        const r = buffer.readFloatLE(baseOffset + 12);
        
        return { x, y, z, r, bot };

    }

    user_move(msg){
        const pressed_key= msg.readUInt8(6) //pressed key
        const id_bot = msg.readUInt8(4)
        this.obj_key_press.pressed_key = null
        this.obj_key_press.pressed_key = false
        switch(pressed_key){
            case 0x0c: 
                //derecha
                this.obj_key_press.pressed_key = 'd'
                this.obj_key_press.is_pressed = true
            break;
            case 0x0d: 
                //izquierda
                this.obj_key_press.pressed_key = 'a'
                this.obj_key_press.is_pressed = true
            break;
            case 0x0a:
                //avanza
                this.obj_key_press.pressed_key = 'w'
                this.obj_key_press.is_pressed = true
                break;
            case 0x0b:
                //comeback
                this.obj_key_press.pressed_key = 's'
                this.obj_key_press.is_pressed = true
                break;
            case 0x07:
                //up press key byte
                this.obj_key_press.pressed_key = false;
                this.obj_key_press.is_pressed = false
                break;

            case 63:
                //a + w
                this.obj_key_press.pressed_key = 'a+w'
                this.obj_key_press.is_pressed = true
                break;
            case 64:  
                //w + d
                this.obj_key_press.pressed_key = 'w+d'
                this.obj_key_press.is_pressed = true
                break;
            case 65:
                //a + s
                this.obj_key_press.pressed_key = 'a+s'
                this.obj_key_press.is_pressed = true
                break;
            case 66:
                //s + d
                this.obj_key_press.pressed_key = 's+d'
                this.obj_key_press.is_pressed = true

                break;
            default:
                console.log('key not recognice: ', pressed_key )
                break;
        }
        this.bot_helper.send_event(JSON.stringify({type_action: 'move', value_action: this.obj_key_press.pressed_key, id_bot: id_bot}))
    }
    user_camera(msg){
        
        this.bot_helper.send_event(JSON.stringify({type_action: 'camera', value_action:((msg.readUInt8(7) / 255) * 360) * (Math.PI / 180)}))

    }
    disconnect(){
        this.bot_helper.send_event(JSON.stringify({bye: 'bot'}))
        /*
        client action:  <Buffer 3f 03 dc 0e e1 db 66 1e>
        client action:  <Buffer 3f 01 dd 0e 00 02>
        client action:  <Buffer 3f 08 de 0e>
        */
        this.#server.send(Buffer.from('3f08e60f', 'hex'), this.#port_server, this.#ip_server, (err) => {
            if (err) {
                console.error(`Error al clientDisconnect: ${err.message}`);
            } else {
                console.log(`clientDisconnect enviada: ${this.#ip_server}:${this.#port_server}`);
                
            }
            console.log(`------FIN DEL clientDisconnect------`);
        });
        this.#server.send('3f08fc89',this.#port_server, this.#ip_server, (err) => {
            if (err) {
                console.error(`Error al clientDisconnect: ${err.message}`);
            } else {
                console.log(`clientDisconnect enviada: ${this.#ip_server}:${this.#port_server}`);
                
            }
            console.log(`------FIN DEL clientDisconnect------`);
        });
    }
}