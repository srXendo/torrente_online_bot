const dgram = require('dgram');
const server = dgram.createSocket('udp4');
let n_msg = {}
let ip_server = '192.168.1.134'
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
    if(ip_response === ip_server){
      if(msg.readUInt8(0) === 0x3f && msg.readUInt8(1) === 0x00){
       //console.log('client action: ', msg)
      }else if(msg.readUInt8(0) === 0x3f){
        //console.log('0x3f: ', msg)
      }
    }
    server.send(msg, port_response, ip_response, (err) => {
      if (err) {
        console.error(`Error al enviar la respuesta: ${err.message}`);
      } else {
       console.log(`Respuesta enviada: ${ip_response}:${port_response}`);
          
      }
     //console.log(`------FIN DEL MENSAJE------`);
    });
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
const PORT = 2222;
const HOST = '0.0.0.0';
server.bind(PORT, HOST);
