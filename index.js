const dgram = require('dgram');
const c_bot_helper = require('./helpers/bot.helper')
const bot_helper = new c_bot_helper()
const c_apis = require('./apis/index.api')
const apis = new c_apis(bot_helper)
const server = dgram.createSocket('udp4');
let ip_server = '192.168.1.134'
let port_server = 8888
const buffer_session = 'cac340f2'
const max_name_byte = 16
const max_map_name_byte = 21
const user_fix_name = Buffer.from('Xendo3', 'ascii')
const user_name = Buffer.from('Xendo', 'ascii')
const user_bot = Buffer.from('Bot01', 'ascii')
let dpnid = null
let party = null
function handler_message(msg, rinfo){
    const headers = msg.readUInt16BE(0)
    switch(headers){
        case 0x3f08:
            //disconnect
            console.log('disconnected bot ')
            break;
        case 0x3700:
            //console.log('msg: No uknow: ', '0x3700')
            
            const ok = Buffer.from("3f020404"+buffer_session, 'hex')
            ok.writeUint8(msg.readUint8(3), 2)
            ok.writeUint8(msg.readUint8(2), 3)
            return ok

            break;
        case 0x3f00:

            users_actions(msg)
            const ok2 = Buffer.from("3f020404"+buffer_session, 'hex')
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
            const action_response = get_action()
            action_response.writeUint8(msg.readUint8(5), 2)
            action_response.writeUint8(msg.readUint8(4), 3)
            return action_response
        break;
        case 0x7f00:
            //console.log('msg: session: ', '0x7f00', replace_name_map(Buffer.from(("3f000302000058656e646f00000000000000000000000b02000000000000000000000806000000004d505f444f5f504c415a41000000000070b5190090b51900be000000b0b4190001000000010000000500000074b31900c7932b5380b3190001000000102d6903").replace(user_name.toString('hex'), user_bot.toString('hex')), 'hex'), party.mapName).toString('hex'))
            dpnid = msg.slice(164, 167)
            const before_name = Buffer.from("3f0003020000",'hex')
            const name = Buffer.from(user_bot.toString('hex').padEnd(max_name_byte * 2, "0"), 'hex')
            const after_name_before_map_name = Buffer.from('0b0200000000000000000000080600000003', 'hex')
            
            const map_name = Buffer.from(party.mapNameBuff.toString('hex').padEnd(max_map_name_byte * 2, "0"), 'hex')//Buffer.from("000000034d505f444d545f5645525449474f0000000000",'hex')
            console.log(map_name)
            const after_map_name = Buffer.from('90b51900be000000b0b4190001000000010000000500000074b31900c7932b5380b3190001000000102d6903','hex')
             return replace_name_map((Buffer.concat([before_name, name, after_name_before_map_name, map_name, after_map_name])), party.mapName)
            //return replace_name_map(Buffer.from(("3f000302000058656e646f00000000000000000000000b02000000000000000000000806000000004d505f444f5f504c415a41000000000070b5190090b51900be000000b0b4190001000000010000000500000074b31900c7932b5380b3190001000000102d6903").replace(user_name.toString('hex'), user_bot.toString('hex')), 'hex'), party.mapName)//
            break;
        case 0x3f02:
            //console.log('msg: ping: ', '0x3f02')
            return Buffer.from("7f000202c3000000", 'hex')
        break;
        case 0x8802:
            //console.log('msg: firstStage: ', "0x8802")
            const session = Buffer.from('7f000100c100000002000000070000005800000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000430068006100760061006c006f00740065000000','hex')
            server.send(Buffer.from("8002010006000100"+buffer_session+"e665f602", "hex"), port_server, ip_server, (err)=>{
                if(err){
                    console.error(`Error al enviar la respuesta: ${err.message}`);                    
                }
            })
            server.send(Buffer.from("3f020000"+buffer_session+"", 'hex'), port_server, ip_server, (err)=>{
                if(err){
                    console.error(`Error al enviar la respuesta: ${err.message}`);                    
                }
            })
            return session
        break;
        case 0x0003: 
            //console.log('headers msg: helloServe: ', "0x0003")
            party = extract_data(msg)
            //console.log(party)
            return Buffer.from("8801000006000100"+buffer_session+"c2091002", 'hex')
        break;
        default: 
            console.log("err: msg not recognice: ",msg)
            console.error(new Error('msg not recognice'))
            return false
        break;
    }
}
server.on('message', (msg, rinfo) => {
    //console.log(`Mensaje recibido: ${rinfo.address}:${rinfo.port}\n${msg.toString('hex')}`);
    //console.log('handler_message')
    const response = handler_message(msg, rinfo)
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
});
const helloClient = Buffer.from("00026128011242191fb8bb154e4401763631007932","hex")
server.on('listening', () => {
  const address = server.address();
  //console.log(`Servidor UDP escuchando en ${address.address}:${address.port}`);
  //console.log(`------INICIO DE LA ESCUCHA------`);
  server.send(helloClient, port_server, ip_server, (err) => {
      if (err) {
        console.error(`Error al clientHello: ${err.message}`);
      } else {
        console.log(`clientHello enviada: ${ip_server}:${port_server}`);
          
      }
      console.log(`------FIN DEL clientHello------`);
    });
});

server.on('error', (err) => {
  console.error(`Error en el servidor: ${err.message}`);
  server.close();
});


// Configuración del servidor

const HOST = '0.0.0.0';
server.bind(HOST);
function extract_data(buffer) {
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
function replace_name_map(buffer, new_name_map){
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
const arr_actions = []
let start = false
function get_action(){
    const ping = Buffer.from("3f020c0c"+buffer_session, 'hex')
            
    if(!start){
        start = true
            const pj_setup = Buffer.from('3f001376030e0000261370c522beb644d58c1dc614ae473f010b0610'.replace('261370c5', buffer_session.toString('hex')), 'hex')
            pj_setup.writeUInt8(0x01, 4) //byte ultimo numero de jugadores en partida 0x00
            pj_setup.writeUInt8(0x02, pj_setup.length-3) //modelo byte 0x00 torrente 0x0b yonki
            pj_setup.writeUInt8(0x02, pj_setup.length-4) //equipo byte 0x02 random 0x01 amarillo 0x00 rojo
            //pj_setup.writeUInt8(0x02, pj_setup.length- 10) //numero de jugador 0x01 jugador 1 0x02 jugador 2
            arr_actions.push(pj_setup)
            start = true
            arr_actions.push(Buffer.from('3f00800d000d1000010000e55e1d465c55b244ba37d045f6a30000'.replace('261370c5', buffer_session.toString('hex')), 'hex'))
            


        return ping
    }else if(arr_actions.length === 0){

        return ping
    }else{
        
        return arr_actions.shift(0);
    }
}

function send_msg_chat_bot(){
    setInterval(()=>{             
        //4022250ca4360610
        //363011070b21900020b0610
        //3f00f01101fbff6573746f7964656e74726f20792070756e746f6b61646a61646164610019000000050000001f71da0c01000000020000004022250ca436061000000000
        const camera_mov = JSON.stringify({hello: 'bot'})
        bot_helper.send_event(camera_mov)
        arr_actions.push(Buffer.from('3f00f01101fbff6573746f7964656e74726f20792070756e746f6b61646a61646164610019000000050000001f71da0c01000000020000004022250ca436061000000000', 'hex'))
        arr_actions.push(Buffer.from('3f00d932010c060101803f140319c65b55b2446e2a11c6110ef013010afe0ce150','hex'))
        
        arr_actions.push(Buffer.from('3f009ef8000a7440e4b1', 'hex'))
        arr_actions.push(Buffer.from('3f00673f000a0ea8e4b1', 'hex'))
        setTimeout(()=>{
            arr_actions.push(Buffer.from('3f00f2320101803f104620c65b55b244608c08c64507f013','hex'))
            
        },300)
    },5000)
    
                
}

function users_actions(msg){
    const action = msg.readUInt8(5) //action player byte
    switch(action){
        case 0x0c:
            console.log('any user mov')
            user_move(msg)
        break;
        case 0x0a:
            
            user_camera(msg)
        break;
        default:
            break;
    }
}
const obj_key_press = {pressed_key: null, is_pressed: false}
function user_move(msg){
    const pressed_key= msg.readUInt8(6) //pressed key
    obj_key_press.pressed_key = null
    obj_key_press.pressed_key = false
    switch(pressed_key){
        case 0x0c: 
            //derecha
            obj_key_press.pressed_key = 'd'
            obj_key_press.is_pressed = true
        break;
        case 0x0d: 
            //izquierda
            obj_key_press.pressed_key = 'a'
            obj_key_press.is_pressed = true
        break;
        case 0x0a:
            //avanza
            obj_key_press.pressed_key = 'w'
            obj_key_press.is_pressed = true
            break;
        case 0x0b:
            //comeback
            obj_key_press.pressed_key = 's'
            obj_key_press.is_pressed = true
            break;
        case 0x07:
            //up press key byte
            obj_key_press.pressed_key = false;
            is_pressed = false
            break;

        case 63:
            //a + w
            obj_key_press.pressed_key = 'a+w'
            obj_key_press.is_pressed = true
            break;
        case 64:  
            //w + d
            obj_key_press.pressed_key = 'w+d'
            obj_key_press.is_pressed = true
            break;
        case 65:
            //a + s
            obj_key_press.pressed_key = 'a+s'
            obj_key_press.is_pressed = true
            break;
        case 66:
            //s + d
            obj_key_press.pressed_key = 's+d'
            obj_key_press.is_pressed = true

            break;
        default:
            console.log('key not recognice: ', pressed_key )
            break;
    }
    bot_helper.send_event(JSON.stringify({type_action: 'move', value_action: obj_key_press.pressed_key}))
}
function user_camera(msg){
    const moviment= msg.readUInt8(6) //pressed key
    console.log('any user move camera: ',msg.readUInt16LE(6),msg.readUInt8(6), msg.readUInt8(7) ,msg)
    
    bot_helper.send_event(JSON.stringify({type_action: 'camera', value_action:((msg.readUInt8(7) / 255) * 360) * (Math.PI / 180)}))

}
process.on('SIGINT', () => {

    bot_helper.send_event(JSON.stringify({bye: 'bot'}))
    /*
    client action:  <Buffer 3f 03 dc 0e e1 db 66 1e>
    client action:  <Buffer 3f 01 dd 0e 00 02>
    client action:  <Buffer 3f 08 de 0e>
    */
    server.send(Buffer.from('3f08e60f', 'hex'), port_server, ip_server, (err) => {
      if (err) {
        console.error(`Error al clientDisconnect: ${err.message}`);
      } else {
        console.log(`clientDisconnect enviada: ${ip_server}:${port_server}`);
          
      }
      console.log(`------FIN DEL clientDisconnect------`);
    });
    server.send('3f08fc89', port_server, ip_server, (err) => {
      if (err) {
        console.error(`Error al clientDisconnect: ${err.message}`);
      } else {
        console.log(`clientDisconnect enviada: ${ip_server}:${port_server}`);
          
      }
      console.log(`------FIN DEL clientDisconnect------`);
    });
    setTimeout(()=>{
        process.exit(0)
    }, 500)
})
//<Buffer 3f 00 1f 7a 00 0a 27 c2 e4 02>