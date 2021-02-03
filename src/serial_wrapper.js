export function serial_wrapper(extras) {
  let port;
  let connected = false;
  const e = {...extras}
  let name;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function getPorts() {
    const ports = await navigator.serial.getPorts();
    console.log(ports);
  }
  async function disconnect () {
    try {
      port.close();
      data = [];
      data = data;
      connected = false;
    } catch (e) {
      console.log("error message", e.message)
    }
  }
  async function write(msg) {
    const writer = port.writable.getWriter();
    msg = enc.encode(msg);
    await writer.write(msg);
    writer.releaseLock();
  }

  async function query(msg, number_lines=1) {
    // console.log('query', msg)
    await write(msg);
    let value = await readlines(number_lines+1);
    // console.log(value)
    let cmd
    [cmd, ...value] = value;
    // console.log(value)
    return value
  }
  async function readlines(num=1) {
    let total_msg = '';
    let lines;
    let got_all = false;
    // console.log('readlines')
    const reader = port.readable.getReader();
    // console.log('loop until get all lines')
    while (true) {
      const { value, done } = await reader.read();
      // console.log(value.length)
      // console.log(dec.decode(value));
      total_msg += dec.decode(value);
      // console.log('values, total_msg', value, total_msg, total_msg.length);
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
        // console.log('release reader lock')
        break;
      }
    }
    return lines;
  }
  //
  // application specific stuff
  //
  async function fetch_values() {
    let values = []
    for(let i=0; i<8; i++) {
      let msg = i+"?\r\n"
      // console.log('msg', msg);
      let [value] = await query(msg)
      let [first, ...second] = value.split(' ');
      second = second.join(' ');
      value = JSON.parse(second)
      values.push(value)
      // value = Number(value[1])
      // values.push(value)
    }
    return values;
  }

  const obj = {
    connect: async () => {
      try {
        port = await navigator.serial.requestPort();
        console.log(port.getInfo())
        if (port) {
          await port.open({baudRate: 115200});
          console.log('port', port)
          /*
          data = await fetch_values()
          board_name = await fetch_name();
          old_name = board_name;
          old_data = JSON.parse(JSON.stringify(data));  
          */
        }
        // console.log('connect: data:', data)
        connected = true;
      } catch (e) {
        console.log("error message", e.message)
        if (port) port.close();
        connected = false;
      }
      return [connected, port];
    },
    write: write,
    query: query,
    readlines: readlines,
    fetch_values: fetch_values,
    fetch_name: async()=>{
      let msg = "N?\r\n";
      let [value] = await query(msg)
      let [first, ...second] = value.split(' ');
      return second.join(' ');
    },
    disconnect() {
      try {
        port.close();
        // data = [];
        // data = data;
        connected = false;
      } catch (e) {
        console.log('error in disconnect', e);
      }
    },
    read() {
      console.log('read port', port, name)
    },
    port: port,
    connected: connected,
  }
  return obj
}
