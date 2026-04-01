
const dgram = require('dgram')
for(let i = 0; i < 10; i++){
    const udp4 = dgram.createSocket('udp4')
    udp4.on('listening',()=>{
        const handshack = Buffer.from('000221a5011242191fb8bb154e4401763631007932', 'hex')
        udp4.send(handshack, 8883, 'gunner.es', (err)=>{
            if(err) console.error(new Error(err))
        })
    })
    udp4.on('message', (msg, rinfo)=>{
        console.log(`new msg recv ${i}: `, msg.toString('hex'))

    })

    udp4.bind()
}

