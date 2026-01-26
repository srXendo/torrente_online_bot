async function btnocultar() {
	var x = document.getElementById("ocultar");
	if (x.style.display === "none") {
		x.style.display = "block";
		
		const ipv4 = document.getElementById("ipv4").value;
		const puerto = document.getElementById("puerto").value;
		const numbots = document.getElementById("numbots").value;
		if (isNaN(parseInt(numbots))&& numbots > 32) {
			alert('bot num max permitido: 32')
			return;
		}
		if (!ipv4) {
			return;
		}
		if(isNaN(parseInt(puerto))){
			alert('Escribe un puerto valido')
			return;
		}
		console.log("La dirección IP es: ", ipv4);
		console.log("El puerto es: ", puerto);
		console.log("El numero de bots es: ", numbots);
		document.getElementById('boton').value = "Desconectar"
		const response_connection = await fetch('/api/recive_start',{
			method: 'POST',
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				
				"ip_server": ipv4,
				"port_server": parseInt(puerto),
				"num_bots": parseInt(numbots)
			}),

		})
		
		console.log(response_connection)
	} else {
		x.style.display ="none";
		const response_connection = await fetch('/api/disconnect',{
        	method: 'GET',       

    	})
		document.getElementById('boton').value = "Conectar"
	}

}
