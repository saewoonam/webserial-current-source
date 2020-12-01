<script>
	let port;
	console.log(navigator.serial);
	async function connect () {
		try {
			port = await navigator.serial.requestPort();
			console.log(port.getInfo())
		} catch (e) {
			console.log("error message", e.message)
		}
	}
	async function getPorts() {
		const ports = await navigator.serial.getPorts();
		console.log(ports);
	}
	function print_port() {
		console.log(port)
	}
</script>
<button on:click={connect}>
	connect
</button>
<button on:click={getPorts}>
	getPorts
</button>
<button on:click={print_port}>
	print_port
</button>
