<script>
  import {download, upload, computer, right, circle_up, artboard, fileup,
    filedown, floppy, cog} from './AppIcons.js'
  import ChTable from './ChTable.svelte';
  import SvgIcon from './SvgIcon.svelte';
  import Settings from './settings.svelte';
  import {serial_wrapper} from './serial_wrapper.js';
  let fileHandle;
  let port;
  let connected = false;
  let data = []
  let old_data;
  let board_name = "no name";
  let old_name = board_name;
  let show_settings = false;
  let advanced=true;
  let on_blur  = false;
  let send_config = 2;
  let serial_instance = serial_wrapper();
  let ready = false;
  let ready_count = 0;
  let readonly;
  let power = true
  async function connect () {
    [connected,port] = await serial_instance.connect(); 
    if (connected) {
      // read config and name from board
      await fetch_from_board()
      // data = await serial_instance.fetch_values();
      // old_data = JSON.parse(JSON.stringify(data));
      console.log('old_data', old_data, old_data==data);
      board_name = await serial_instance.fetch_name();
      old_name = board_name;
      readonly = await fetch_rw();
      console.log('connected', connected, port, readonly);
    }
  }
  async function disconnect () {
    try {
      // port.close();
      serial_instance.disconnect()
      data = [];
      data = data;
      board_name = ''
      old_name = ''
      connected = false;
      port = undefined
      power = true; // this is to clear the screen
    } catch (e) {
      console.log("error message", e.message)
    }
  }
  async function fetch_from_board() {
    const status_byte = await serial_instance.get_status();
    power = (status_byte==7)
    console.log('status', status_byte, power)
    if (status_byte == 128) {
      await disconnect()
    } else {
      data = await serial_instance.fetch_values();
      for (let row of data) {
        if (row.length == 3) row.push(32768)
      }
      data = data;
      old_data = JSON.parse(JSON.stringify(data));
      console.log(data)
    }

  }
  async function fetch_rw() {
    let msg = "R?\r\n";
    let [value] = await serial_instance.query(msg)
    let [first, ...second] = value.split(' ');
    return second.join(' ')=='True';
  }
  async function write_value(channel, value) {
    let msg = channel + ' ' + value + '\r\n';
    serial_instance.write(msg);
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
    // Need to check that that JSON has the right schema
    data = JSON.parse(contents)
    data = data // refreshes html page
    console.log(data)
  }
  async function save_board() {
    console.log("save on board")
    serial_instance.write('J\r\n');
    let response = await serial_instance.readlines(1);
    console.log('save on board response', response);
  }
  async function send_cmd(cmd) {
    console.log("SND one line command", cmd);
    serial_instance.write(cmd);
    let response = serial_instance.readlines(2);
    console.log('response', response);
  }
  async function send_one(i) {
      const status_byte = await serial_instance.get_status();
      power = (status_byte==7)
      console.log('status', status_byte, power)
      if (!power) {
        console.log('not written, no power');
        return;
      }
      console.log('send_one write')
      await write_value(i, JSON.stringify(data[i]));
      console.log('send_one readback response')
      let lines = await serial_instance.readlines(3)
      console.log('send_one: got from device:', lines)
      return(lines);
  }
  async function send() {
    console.log('send', data)
    if (!await check_connected()) {
      await disconnect()
      return
    }
    for (let i=0; i<8; i++) {
      await send_one(i)
    }
  }
  function find_change(a, b) {
    let found = [];
    for (let r=0; r<8; r++) {
      for(let c=0; c<4; c++) {
        // console.log('different',r,c,a[r][c], b[r][c], a[r][c]!=b[r][c]);
        if (a[r][c] != b[r][c]) {
          found = [r, c];
          console.log('find_change found', r, c);
          return found;
        }
      }
    }
    return found;
  }

  async function handle_blur(e) {
    console.log('App.svelte handle blur/click', e.detail)
    // First check if board name changed
    if (old_name != board_name) {
      console.log("board name edited", old_name, board_name)
      old_name = board_name
      await send_cmd("N "+board_name+"\r\n")
    } else {
      if (send_config==2) {
        ready = true;
      }
    }
  }
  async function check_connected() {
    const status_byte = await serial_instance.get_status();
    console.log('check_connected', status_byte!=128)
    return status_byte!=128
  }
  async function send_one_wrapper(found) {
    let res;
    if (!await check_connected()) {
      await disconnect()
      return
    }
    console.log('send_one_wrapper')
    res = await serial_instance.fetch_value(found[0])
    console.log('before', res)
    res= await send_one(found[0])
    // console.log(res)
    res = await serial_instance.fetch_value(found[0])
    console.log('after', res)
    old_data = JSON.parse(JSON.stringify(data));
  }

  $: { 
    if(data.length>0) {
      if (ready) {
        console.log('$')
        let found = find_change(old_data, data);
        console.log('found', found)
        if (found.length>0) {
          console.log('found change in row', found)
          send_one_wrapper(found)
          ready = false
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
  <button on:click={fetch_from_board} hidden={!connected}
  tooltip="Read settings from the board">
  <SvgIcon d={artboard} />  <SvgIcon d={right} /> <SvgIcon d={computer} />
</button>
  <button on:click={send} hidden={!connected}
  tooltip="Send config to board and bias with these values">
  <SvgIcon d={computer} /> <SvgIcon d={right} /> <SvgIcon d={artboard} />
</button>
  <button on:click={save_board} hidden={(!connected)||(readonly)} 
  tooltip="save settings to board flash">
  <SvgIcon d={artboard} /><SvgIcon d={floppy} />
  </button>
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
  <button on:click={serial_instance.get_status} hidden={!connected}>
    get_status
  </button>
  {#if power}
  <ChTable on:blur={handle_blur} bind:title={board_name}
bind:advanced={advanced} bind:data={data}/>
<pre style="background: #eee">{JSON.stringify(data)}</pre>
  {:else}
  <h2> Check if current source has power </h2>
  {/if}
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
