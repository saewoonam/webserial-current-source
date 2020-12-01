<script>
  let port;
  let reader, writer, encoder, decoder;
  let connected = false;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function readlines(num=1) {
    let total_msg = '';
    let lines;
    let got_all = false;
    const reader = port.readable.getReader();

    while (true) {
      const { value, done } = await reader.read();
      // console.log(value.length)
      // console.log(value);
      total_msg += dec.decode(value);
      // console.log('readlines', value, total_msg, total_msg.length);
      lines = total_msg.split(/\r\n/)
      // console.log('lines', lines, lines[lines.length-1])

      if (lines[lines.length-1].length==0 && lines.length==(num+1)) {
          // check lines.lenght==(num+1) because there is an extra empty string at the end
					// console.log('got_all')
          got_all = true;
			}
      // console.log(total_msg)
      if (done || got_all) {
        lines = lines.filter(item => item.length>0)
        reader.releaseLock();
        // console.log('done')
        break;
      }
    }
    return lines;
  }

  async function query(msg, number_lines=1) {
      const writer = port.writable.getWriter();
      msg = enc.encode(msg);
      await writer.write(msg);
      writer.releaseLock();
    let value = await readlines(2);
    // console.log(value)
    return value[1]
  }

  async function write_value(channel, value) {
		const writer = port.writable.getWriter();
    let msg = channel + ' ' + value + '\r\n';
		msg = enc.encode(msg);
		await writer.write(msg);
		writer.releaseLock();
  }

  async function writetest() {
    await write_value(1, 1);
    let lines = await readlines(3)
    console.log(lines)
	}

  async function fetch_values() {
    let values = []
    for(let i=0; i<8; i++) {
      let msg = i+"?\r\n"
      console.log('msg', msg);
      let value = await query(msg)
      value = Number(value.split(' ')[1].trim())
      values.push(value)
      // console.log(values, values.length)
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
        let values = await fetch_values()
        console.log(values)
        connected = true;
      }
    } catch (e) {
      console.log("error message", e.message)
    }
  }
  async function disconnect () {
    try {
			port.close();
			connected = false;
    } catch (e) {
      console.log("error message", e.message)
    }
  }
  async function getPorts() {
    const ports = await navigator.serial.getPorts();
    console.log(ports);
  }
  async function fetchtest() {
    let values = await fetch_values();
    console.log(values)
  }
  function save_computer() {
    console.log("save to computer")
  }
  function save_board() {
    console.log("save to board not done")
  }
</script>
<button on:click={connect} hidden={connected}>
  connect
</button>
<button on:click={disconnect} hidden={!connected}>
  disconnect
</button>
<button on:click={fetchtest} hidden={!connected}>
  fetch test
</button>
<button on:click={writetest} hidden={!connected}>
  write test
</button>
<button on:click={save_computer} hidden={!connected}>
  save to computer
</button>
<button on:click={save_board} hidden={!connected}>
  save to board
</button>
