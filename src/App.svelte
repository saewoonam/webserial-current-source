<script>
  let port;
  let reader, writer, encoder, decoder;
  let connected = false;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function readlines(num=1) {
    let total_msg = '';
    let lines;
    const reader = port.readable.getReader();

    while (true) {
      const { value, done } = await reader.read();
      // console.log(value.length)
      // console.log(value);
      total_msg += dec.decode(value);
      console.log(value, total_msg, total_msg.length);
      lines = total_msg.split(/\r\n/).filter(item => item.length>0)
      if (done || lines.length==num) {
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
    console.log(value)
    return value[1]
  }
  async function fetch_values() {
    let values = []
    for(let i=0; i<8; i++) {
      let msg = i+"?\r"
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
<button on:click={connect}>
  connect
</button>
<button on:click={fetchtest} disabled={!connected}>
  fetch test
</button>
<button on:click={save_computer}>
  save to computer
</button>
<button on:click={save_board}>
  save to board
</button>
