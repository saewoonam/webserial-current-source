<script>
  let port;
  let reader, writer, encoder, decoder;
  async function fetch_values() {
    let values = []
    for(let i=0; i<8; i++) {
      await writer.write(i+"?\r\n");
      let value = await reader.read();
      values.push(value)
    }
    writer.releaseLock();
    reader.releaseLock();
    return values;
  }
  async function connect () {
    try {
      port = await navigator.serial.requestPort();
      console.log(port.getInfo())
      if (port) {
        await port.open({baudRate: 115200});

        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        reader = textDecoder.readable.getReader();
        const textEncoder = new TextEncoderStream();
        const writableStreamClosed = textEncoder.readable.pipeTo(port.writable);
        writer = textEncoder.writable.getWriter();

        writer = port.writable.getWriter();
        values = await fetch_values(reader, writer)
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
