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
    console.log('trying to write:', msg)
    const writer = port.writable.getWriter();
    msg = enc.encode(msg);
    await writer.write(msg);
    writer.releaseLock();
    console.log('done writing')
  }
  async function logout(msg) {
    await write("\x04");
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
    console.log('readlines')
    let reader;
    if (port.readable) {
      console.log('port readable');
    }
    reader = await port.readable.getReader();
    console.log('reader', reader)
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
        console.log('release reader lock', lines)
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

  async function fetch_value(i) {
      let msg = i+"?\r\n"
      // console.log('fetch_value: msg', msg);
      let [value] = await query(msg)
      let [first, ...second] = value.split(' ');
      second = second.join(' ');
      value = JSON.parse(second)
    return value;
  }

  const handle = (promise) => {
  return promise
    .then(data => ({data:data, ok:true, error: undefined}))
    .catch(error => Promise.resolve({data:undefined, ok: false, error:error}));
  }
  async function get_status() {
      let msg = "STATUS?\r\n"
      // let value = await query(msg)
      
      let value = await handle(query(msg))
      if (value.error) {
        console.log('caught error in get_status', value.error)
        return 128;
        // throw value.error;
      }
      
      value = value.data[0]
      // console.log(value)
      let [first, ...second] = value.split(' ');
      // console.log('status:', second)
      value = Number(second[0])
      console.log('status', value)
    return value;
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
        let status_byte = await get_status()
        console.log('status', status_byte)
      } catch (e) {
        console.log("error message", e, e.message, port)
        if (port) port.close();
        connected = false;
      }
      return [connected, port];
    },
    write: write,
    query: query,
    readlines: readlines,
    logout: logout,
    fetch_values: fetch_values,
    fetch_value: fetch_value,
    get_status: get_status,
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
        port = undefined
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
