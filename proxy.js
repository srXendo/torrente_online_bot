const dgram = require('dgram');
const server = dgram.createSocket('udp4');
let n_msg = {}
let ip_server = '192.168.1.135'
let ip_client
let port_server = 8888
let port_client
counter = 0;
server.on('message', (msg, rinfo) => {
    if(counter === 0){
        ip_client = rinfo.address
        port_client = rinfo.port
    }
   console.log(`Mensaje recibido: ${rinfo.address}:${rinfo.port}\n${msg.toString('hex')}`);
   
    // Procesar el mensaje recibido
        // Enviar la respuesta al cliente
        
    let port_response =  rinfo.port === port_client ? port_server: port_client
    let ip_response = rinfo.address === ip_client ? ip_server : ip_client
    counter ++
    let no_call = false
    if(port_response !== port_server){
      if(msg.readUInt8(0) === 0x3f && msg.readUInt8(1) === 0x00 && msg.readUInt8(5) === 0x0e){
       // console.log('client respawn: ', msg)
        no_call = false
      }else if(msg.readUInt8(0) === 0x3f && msg.readUInt8(1) === 0x00 && msg.readUInt8(5) === 0xed){
        //console.log('client die: ', msg)
        no_call = false
      }else if(msg.readUInt8(0) === 0x3f && msg.readUInt8(1) === 0x00 && msg.readUInt8(5) === 0x26){
        //console.log('what?: ', msg)
        no_call = false
      }

    }
    if(port_response === port_server){
      if(msg.readUInt8(0) === 0x3f && msg.readUInt8(1) === 0x00 && msg.readUInt8(5) === 0x05){
       console.log('esto muerto ', msg)
        no_call = false
      }

    }
    if(!no_call ){
      server.send(msg, port_response, ip_response, (err) => {
        if (err) {
          console.error(`Error al enviar la respuesta: ${err.message}`);
        } else {
        console.log(`Respuesta enviada: ${ip_response}:${port_response}`);
            
        }
      console.log(`------FIN DEL MENSAJE------`);
      });
    }
});

server.on('listening', () => {
  const address = server.address();
 console.log(`Servidor UDP escuchando en ${address.address}:${address.port}`);
 console.log(`------INICIO DE LA ESCUCHA------`);
});

server.on('error', (err) => {
  console.error(`Error en el servidor: ${err.message}`);
  server.close();
});

// Configuración del servidor
const PORT = 8888;
const HOST = '0.0.0.0';
server.bind(PORT, HOST);
