<script>
  let port;
  let reader, writer, encoder, decoder;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function read_all() {
    let total_msg = '';
  	const reader = port.readable.getReader();

		while (true) {
			const { value, done } = await reader.read();
      // console.log(value, done)
      console.log(value.length)
			if (done || value.length==0) {
				// Allow the serial port to be closed later.
				reader.releaseLock();
        console.log('done')
				break;
			}
			// value is a Uint8Array.
			console.log(value);
      total_msg += dec.decode(value);
      console.log(total_msg);
		}
    console.log(value);
    total_msg += dec.decode(value);
    console.log(total_msg);
		return total_msg;
  }

  async function fetch_values() {
    let values = []
    for(let i=0; i<8; i++) {
      let msg = i+"?\r"
      console.log('msg', msg);
      msg = enc.encode(msg);
      let writer = port.writable.getWriter();
      await writer.write(msg);
      writer.releaseLock();
      let value = await read_all()
      values.push(value)
    }
    return values;
  }
  async function connect () {
    try {
      port = await navigator.serial.requestPort();
      console.log(port.getInfo())
      if (port) {
        await port.open({baudRate: 115200});
        console.log('port', port)
        values = await fetch_values()
        console.log(values)
      }
    } catch (e) {
      console.log("error message", e.message)
    }
  }
  async function getPorts() {
    const ports = await navigator.serial.getPorts();
    console.log(ports);
  }
  function save_computer() {
    console.log("save to computer")
  }
  function save_board() {
    console.log("save to board not done")
  }
</script>
<button on:click={connect}>
  connect
</button>
<button on:click={save_computer}>
  save to computer
</button>
<button on:click={save_board}>
  save to board
</button>
