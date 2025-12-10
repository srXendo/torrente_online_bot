const dgram = require('dgram');

const server = dgram.createSocket('udp4');
let ip_server = '192.168.1.134'
let port_server = 6073

function handler_message(msg, rinfo){
    const headers = msg.readUInt16BE(0)
    switch(headers){
       
        default: 

            console.log("err: msg not recognice: ",msg.toString('hex'))
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
