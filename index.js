const dgram = require('dgram');
const server = dgram.createSocket('udp4');
let ip_server = '192.168.1.134'
let port_server = 8888
const user_fix_name = Buffer.from('Xendo3', 'ascii')
const user_name = Buffer.from('Xendo', 'ascii')
const user_bot = Buffer.from('Bot01', 'ascii')
let party = null
function handler_message(msg, rinfo){
    const headers = msg.readUInt16BE(0)
    switch(headers){
        case 0x3700:
            console.log('msg: No uknow: ', '0x3700')
            
            const ok = Buffer.from("3f0200009a35fcaf", 'hex')
            ok.writeUint8(msg.readUint8(3), 2)
            ok.writeUint8(msg.readUint8(2), 3)
            return ok

            break;
        case 0x3f00:
            console.log('msg: No uknow: ', '0x3f000')

                const ok2 = Buffer.from("3f0200009a35fcaf", 'hex')
                ok2.writeUint8(msg.readUint8(3), 2)
                ok2.writeUint8(msg.readUint8(2), 3)
                return ok2

        break;
        case 0x3f01:
            console.log('msg: No uknow2: ', '0x3f001')
            return Buffer.from('800601000606000076758a00', 'hex')
            break;


        case 0x8006:
            console.log('msg: main bucle: ', '0x8006')
            const action_response = get_action()
            action_response.writeUint8(msg.readUint8(5), 2)
            action_response.writeUint8(msg.readUint8(4), 3)
            return action_response
        break;
        case 0x7f00:
            console.log('msg: session: ', '0x7f00', replace_name_map(Buffer.from(("3f000302000058656e646f00000000000000000000000b02000000000000000000000806000000004d505f444f5f504c415a41000000000070b5190090b51900be000000b0b4190001000000010000000500000074b31900c7932b5380b3190001000000102d6903").replace(user_name.toString('hex'), user_bot.toString('hex')), 'hex'), party.mapName).toString('hex'))
            return replace_name_map(Buffer.from(("3f000302000058656e646f00000000000000000000000b02000000000000000000000806000000004d505f444f5f504c415a41000000000070b5190090b51900be000000b0b4190001000000010000000500000074b31900c7932b5380b3190001000000102d6903").replace(user_name.toString('hex'), user_bot.toString('hex')), 'hex'), party.mapName)
            break;
        case 0x3f02:
            console.log('msg: ping: ', '0x3f02')
            return Buffer.from("7f000202c3000000", 'hex')
        break;
        case 0x8802:
            console.log('msg: firstStage: ', "0x8802")
            const session = Buffer.from('7f000100c100000002000000070000005800000014000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000430068006100760061006c006f00740065000000','hex')
            server.send(Buffer.from("80020100060001009a35fcaf2a758a00", "hex"), port_server, ip_server, (err)=>{
                if(err){
                    console.error(`Error al enviar la respuesta: ${err.message}`);                    
                }
            })
            server.send(Buffer.from("3f0200009a35fcaf", 'hex'), port_server, ip_server, (err)=>{
                if(err){
                    console.error(`Error al enviar la respuesta: ${err.message}`);                    
                }
            })
            return session
        break;
        case 0x0003: 
            console.log('headers msg: helloServe: ', "0x0003")
            party = extract_data(msg)
            console.log(party)
            return Buffer.from("88010000060001009a35fcaf18758a00", 'hex')
        break;
        default: 
            console.log("err: msg not recognice: ",msg.toString('hex'))
            console.error(new Error('msg not recognice'))
            return false
        break;
    }
}
server.on('message', (msg, rinfo) => {
    console.log(`Mensaje recibido: ${rinfo.address}:${rinfo.port}\n${msg.toString('hex')}`);
    console.log('handler_message')
    const response = handler_message(msg, rinfo)
    if(response){


        server.send(response, port_server, ip_server, (err) => {
        if (err) {
            console.error(`Error al enviar la respuesta: ${err.message}`);
        } else {
            console.log(`Respuesta enviada: ${ip_server}:${port_server}`);
            
        }
        
        console.log(`------FIN DEL MENSAJE------`);
        });
    }
});
const helloClient = Buffer.from("000211f3011242191fb8bb154e4401763631007932","hex")
server.on('listening', () => {
  const address = server.address();
  console.log(`Servidor UDP escuchando en ${address.address}:${address.port}`);
  console.log(`------INICIO DE LA ESCUCHA------`);
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
        } else {
            console.warn('⚠️ Nombre de mapa inválido:', nameCandidate);
        }
    } else {
        console.warn('⚠️ No se encontró la firma "MP_" en el buffer');
    }

    //console.log('Encontrado nombre idx:', nameStartIdx, currentPlayers, maxPlayers, mapName);

    return {
        currentPlayers,
        maxPlayers,
        mapName,
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
    const ping = Buffer.from("3f02970d9a35fcaf", 'hex')
            
    if(!start){
        start = true

            
            arr_actions.push(Buffer.from('3f004f0c010e000000000000000000000363011070b21900020b0610'.replace(user_name.toString('hex'), user_bot.toString('hex')), 'hex'))
            start = true


            
            arr_actions.push(Buffer.from('3f02500bfdd63373', 'hex'))
            start = true
            
        return ping
    }else if(arr_actions.length === 0){

        return ping
    }else{
        
        return arr_actions.shift(0);
    }
}
send_msg_chat_bot()
function send_msg_chat_bot(){
    setInterval(()=>{
        arr_actions.push(Buffer.from('3f00f01101fbff6573746f7964656e74726f20792070756e746f6b61646a61646164610019000000050000001f71da0c01000000020000004022250ca436061000000000', 'hex'))
    },5000)
    
                
}