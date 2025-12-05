module.exports = class routerApi{
    #routes = []
    base_path;
    constructor(base_path){
        this.base_path = base_path
    }
    set_route(method, path, funct){
        this.#routes.push({
            method,
            path: `${this.base_path}${path}`,
            funct
        })
    }
    get_routes(){
        return this.#routes
    }
}