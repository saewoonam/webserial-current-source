<script>
  import {download, upload, computer, right, circle_up, artboard, fileup,
    filedown, floppy, cog} from './AppIcons.js'
  import ChTable from './ChTable.svelte';
  import SvgIcon from './SvgIcon.svelte';
  import Settings from './settings.svelte';
  let fileHandle;
  let port;
  let reader, writer, encoder, decoder;
  let connected = false;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let data = []
  let old_data;
  let board_name = "no name";
  let old_name = board_name;
  let show_settings = false;
  let advanced=true;
  let on_blur  = false;
  let send_config = 2;

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
      // console.log(value);
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
        // console.log('done')
        break;
      }
    }
    return lines;
  }

  async function query(msg, number_lines=1) {
    console.log('query', msg)
    const writer = port.writable.getWriter();
    msg = enc.encode(msg);
    await writer.write(msg);
    writer.releaseLock();
    let value = await readlines(number_lines+1);
    // console.log(value)
    let cmd
    [cmd, ...value] = value;
    // console.log(value)
    return value
  }

  async function write_value(channel, value) {
    const writer = port.writable.getWriter();
    let msg = channel + ' ' + value + '\r\n';
    msg = enc.encode(msg);
    await writer.write(msg);
    writer.releaseLock();
  }

  async function jsontest() {
    const writer = port.writable.getWriter();
    let msg = 'C ' + JSON.stringify(data) + '\r\n';
    msg = enc.encode(msg);
    await writer.write(msg);
    writer.releaseLock();
    let lines = await readlines(3)
    console.log(lines)

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
  async function fetch_name() {
    let msg = "N?\r\n";
    let [value] = await query(msg)
    let [first, ...second] = value.split(' ');
    return second.join(' ');
  }
  async function connect () {
    try {
      port = await navigator.serial.requestPort();
      console.log(port.getInfo())
      if (port) {
        await port.open({baudRate: 115200});
        console.log('port', port)
        data = await fetch_values()
        board_name = await fetch_name();
        old_name = board_name;
        old_data = JSON.parse(JSON.stringify(data));  
      }
      console.log('connect: data:', data)
      connected = true;
    } catch (e) {
      console.log("error message", e.message)
      if (port) port.close();
    }
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
  async function getPorts() {
    const ports = await navigator.serial.getPorts();
    console.log(ports);
  }
  async function fetchtest() {
    data = await fetch_values();
    console.log(data)
  }
  async function save_computer() {
    console.log("save to computer")
    let fileHandle = await getNewFileHandle()
    await writeFile(fileHandle, JSON.stringify(data))
    console.log(JSON.stringify(data))
  }
  async function getNewFileHandle() {
    const options = {
      types: [
        {
          description: 'Text Files',
          accept: {
            'text/plain': ['.json'],
          },
        },
      ],
    };
    const handle = await window.showSaveFilePicker(options);
    return handle;
  }
  async function writeFile(fileHandle, contents) {
    // Create a FileSystemWritableFileStream to write to.
    const writable = await fileHandle.createWritable();
    // Write the contents of the file to the stream.
    await writable.write(contents);
    // Close the file and write the contents to disk.
    await writable.close();
  }
  async function load_from_computer() {
    console.log("load from computer")
    fileHandle = await window.showOpenFilePicker();
    console.log('fileHandle', fileHandle[0]);
    const file = await fileHandle[0].getFile();
    const contents = await file.text();
    // Need to check that that JSON has the write schema
    data = JSON.parse(contents)
    data = data // refreshes html page
    console.log(data)
  }
  async function save_board() {
    console.log("save on board")
    // console.log(JSON.stringify(data))
    const writer = port.writable.getWriter();
    let msg = 'J\r\n';
    msg = enc.encode(msg);
    await writer.write(msg);
    writer.releaseLock();
    let response = await readlines(1);
    console.log('response', response);
  }
  async function send_cmd(cmd) {
    console.log("SND one line command", cmd);
    // console.log(JSON.stringify(data))
    const writer = port.writable.getWriter();
    let msg = cmd;
    msg = enc.encode(msg);
    await writer.write(msg);
    writer.releaseLock();
    let response = await readlines(2);
    console.log('response', response);
  }
  async function send_one(i) {
      await write_value(i, JSON.stringify(data[i]));
      let lines = await readlines(3)
      console.log('send, got lines:', lines)
  }
  async function send() {
    console.log('send', data)
    for (let i=0; i<8; i++) {
      await send_one(i)
    }
  }
  function find_change() {
    console.log('check if table changed')
    let found = [];
    console.log('change')
    for (let r=0; r<8; r++) {
      for(let c=0; c<4; c++) {
        if (data[r][c] != old_data[r][c]) {
          console.log('different',r,c,data[r][c]);
          found = [r, c];
        }
      }
    }
    old_data = JSON.parse(JSON.stringify(data));	
    return found;
  }

  async function handle_blur() {
    // First check if board name changed
    if (old_name != board_name) {
      console.log("board name edited", old_name, board_name)
      old_name = board_name
      await send_cmd("N "+board_name+"\r\n")
    } else {
      console.log('send_config', send_config);
      if (send_config==2) {
        let found = find_change()
        if (found.length>0) {
          console.log('found change in row', found[0])
          await send_one(found[0])
        } else {
          console.log('no diff')
        }
      }
    }
  }

  $: async () => {
    if(data) {
      console.log('data changed')
      if (send_config==3) {
        let found = find_change()
        if (found.length>0) {
          console.log('found change in row', found[0])
          await send_one(found[0])
        } else {
          console.log('no diff')
        }
      }
    }
  }
</script>
<style>
button[tooltip] {
  position: relative;
}
button[tooltip]:after {
    opacity: 0;
    content: "";
}
button[tooltip]:hover::after,
button[tooltip]:focus::after {
  opacity: 1;
  transition: opacity  0s linear 0.25s; 
  content: attr(tooltip);
  position: absolute;
  left: 0;
  top: 100%;
  width: 100%;
  min-width: 100px;
  border: 1px #aaaaaa solid;
  border-radius: 10px;
  background-color: #ffffcc;
  padding: 5px;
  color: #000000;
  font-size: 14px;
  z-index: 1;

}

</style>
{#if ('serial' in navigator)}
<button on:click={connect} hidden={connected}>
  connect
</button>
{#if (!show_settings) }
<button on:click={disconnect} hidden={!connected}>
  disconnect
</button>
  <button on:click={fetchtest} hidden={!connected}
  tooltip="Read settings from the board">
  <SvgIcon d={artboard} />  <SvgIcon d={right} /> <SvgIcon d={computer} />
</button>
  <button on:click={send} hidden={!connected}
  tooltip="Send config to board and bias with these values">
  <SvgIcon d={computer} /> <SvgIcon d={right} /> <SvgIcon d={artboard} />
</button>
  <button on:click={save_board} hidden={!connected} 
  tooltip="save settings to board flash">
  <SvgIcon d={artboard} /><SvgIcon d={floppy} />
  </button>
<!--
  <button on:click={writetest} hidden={!connected}>
write test
  </button>
  <button on:click={jsontest} hidden={!connected}>
json test
  </button>
-->
  <button on:click={save_computer} hidden={!connected} tooltip="download settings to  a file">
  <SvgIcon d={filedown} />
  </button>
  <button on:click={load_from_computer} hidden={!connected}
tooltip="load setting to webpage from a computer file">
  <SvgIcon d={fileup} />
  </button>
  <button on:click={()=>show_settings=true} hidden={!connected}
tooltip="change gui settings">
  <SvgIcon d={cog} />
  </button>
  <ChTable on:blur={handle_blur} bind:title={board_name}
bind:advanced={advanced} bind:data={data}/>
<pre style="background: #eee">{JSON.stringify(data)}</pre>

{:else}
{#if connected}
  <h1> settings </h1>
  <Settings bind:show_dac_offset={advanced} bind:selected_option={send_config}/>
  <button on:click={()=>{show_settings=false}}>
  Done
  </button>
{/if}
{/if}
{:else}
  <h2> Web serial doesn't seem to be enabled in your browser. </h2>
  <h2> Make sure it is Chrome, Opera, or Edge. </h2>
  <h3>  Enable it in chrome by putting the following address in address bar </h3>
chrome://flags/#enable-experimental-web-platform-features
  <h3> for opera: </h3>
opera://flags/#enable-experimental-web-platform-features
  <h3> for edge: </h3>
edge://flags/#enable-experimental-web-platform-features

{/if}
