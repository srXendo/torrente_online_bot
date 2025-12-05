const routerApi = require("./router.api");
const fs = require('fs')
const html = fs.readFileSync('./public/index.html');
const map = fs.readFileSync('./public/map.obj');
const model = fs.readFileSync('./public/model.bot.obj');
let AUsers = null

class publicApi {
  router = new routerApi('');
  bot = null
  constructor(bot) {
    this.bot = bot
    this.registerRoutes();
  }

  registerRoutes() {
    // index
    this.router.set_route("GET", "/", this.get_index.bind(this));
    this.router.set_route("GET", "/map.obj", this.get_map.bind(this));
    this.router.set_route("GET", "/model.bot.obj", this.get_model.bind(this));
    this.router.set_route("GET", "/api/connect", this.connect_client.bind(this));
  }
 
  async get_index(stream, headers, params){
    const response =  {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/html; charset=utf-8',
      ":status": 200,
    }

    stream.respond(response)
    stream.write(html)
    stream.end()
    return null
  }
  async get_map(stream, headers, params){
    const response =  {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/html; charset=utf-8',
      ":status": 200,
    }
    stream.respond(response)
    stream.write(map)
    stream.end()
    return null
  }
  async get_model(stream, headers, params){
    const response =  {
      "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
      "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
      'Access-Control-Allow-Credentials': true,
      "access-control-allow-headers": "Content-Type, Cookies",
      'content-type': 'text/html; charset=utf-8',
      ":status": 200,
    }

    stream.respond(response)
    stream.write(model)
    stream.end()
    return null
  }
  async connect_client(stream, headers, params){

    stream.respond({
      'content-type': 'text/event-stream; charset=utf-8',
      ':status': 200, 
    });
    const msg_event = JSON.stringify({
      hello: 'world'
    })
    this.bot.set_stream(stream)
    this.bot.send_event(msg_event)

  }

}

module.exports = publicApi;