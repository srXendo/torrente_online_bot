const http2 = require("http2");
const fs = require("fs");
const path = require('path')
class apis{
  server 
  constructor(bot_helper){
    // 🔹 Importar APIs con rutas
    //const loginApi = require("./loginApi");
    const c_publicApi = require("./public.api");
    const publicApi = new c_publicApi(bot_helper)
    const routes = [
      ...publicApi.router.get_routes(),
      //...roomApi.get_routes(),
    ];
    this.publicApi = publicApi
    // 🔹 Crear servidor HTTP/2 seguro
    const certPath = path.join(__dirname, 'server.crt');
    const keyPath  = path.join(__dirname, 'server.key');

    const cert = fs.readFileSync(certPath);
    const key  = fs.readFileSync(keyPath);
    const server = http2.createSecureServer(
      {
        key: key,
        cert: cert,
        allowHTTP1: true, // compatibilidad con clientes HTTP/1.1
      }
    );

    // 🔹 Middleware de enrutado
    server.on("stream", async (stream, headers) => {
      const method = headers[":method"];
      let path = headers[":path"];

      console.log("request on", path, method);

      // 🔹 Respuesta base con CORS
      const response = {
        "content-type": "application/json",
        "access-control-allow-origin": `${process.env.PROT_FRONT}://${process.env.DOMAIN_FRONT}:${process.env.PORT_FRONT}`,
        "access-control-allow-methods": "GET,POST,OPTIONS,PUT",
        "Access-Control-Allow-Credentials": true,
        "access-control-allow-headers": "Content-Type, Cookies",
      };

      // 🔹 OPTIONS (preflight)
      if (method === "OPTIONS") {
        console.log("CORS preflight");
        response[":status"] = 204;
        stream.respond(response);
        stream.end();
        return;
      }

      // 🔹 Buscar coincidencia en rutas
      for (let row_route_api of routes) {
        let params = {};

        const paramNames = [];
        const regexPath = new RegExp(
          "^" +
            row_route_api.path.replace(/:([^/]+)/g, (_, key) => {
              paramNames.push(key);
              return "([^/]+)";
            }) +
            "$"
        );

        const match = path.match(regexPath);

        if (row_route_api.method === method && match) {
          // Extraer parámetros
          paramNames.forEach((key, i) => {
            params[key] = match[i + 1];
          });

          try {
            const aux = await row_route_api.funct(stream, headers, params);
            console.log(aux)
            if (aux && (aux.isError || aux.status || aux.message || aux.newCookie)) {
              const [isError, status, message, newCookie] = aux;

              response[":status"] = status;

              if (!!newCookie || newCookie === 0) {
                response["Set-Cookie"] = `musicstarterSession=${newCookie.toString()};Path=/;SameSite=none;Domain=${process.env.DOMAIN_FRONT};Secure;HttpOnly;`;
              }
              stream.respond(response);

              if (message instanceof Object) {
                stream.end(JSON.stringify(message));
              } else if (message) {
                stream.write(message);
                stream.end();
              }
            }
          } catch (err) {
            
            console.error("Handler error:", err, err.stack);
            response[":status"] = 500;
            stream.respond(response);
            stream.end(JSON.stringify({ error: "Internal Server Error" }));
          }
          return;
        }
      }


      // 🔹 Si no encuentra ruta
      response[":status"] = 404;
      stream.respond(response);
      stream.end(JSON.stringify({ error: "Not found" }));
    });

    // 🔹 Manejo de errores del servidor
    server.on("error", (err) => {
      console.error(new Error(err.stack || err));
    });

    // 🔹 Levantar servidor
    const PORT = process.env.API_PORT_BACK || 3000;
    server.listen(PORT, () => {
      console.log(`Servidor corriendo en https://localhost:${PORT}`);
    });

    this.server = server
  }
  disconnect(){

    return this.publicApi.disconnect()
  }
}
module.exports = apis;
