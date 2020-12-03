<script>
	import {download, upload, computer, right, circle_up} from './AppIcons.js'
  import ChTable from './ChTable.svelte';
	import SvgIcon from './SvgIcon.svelte';
	import Board from './artboard.svelte';
	import FileDown from './file_down.svelte';
	import FileUp from './file_up.svelte';
	import Floppy from './floppy.svelte';
	let fileHandle;
  let port;
  let reader, writer, encoder, decoder;
  let connected = false;
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let data = []
	/*
	for (let i=0; i<8; i++) {
		data.push(['ch'+i, i+1, false])
  }
  */
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
					console.log('got_all')
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
  async function connect () {
    try {
      port = await navigator.serial.requestPort();
      console.log(port.getInfo())
      if (port) {
        await port.open({baudRate: 115200});
        console.log('port', port)
        data = await fetch_values()
			}
      console.log('connect: data:', data)
      connected = true;
		} catch (e) {
      console.log("error message", e.message)
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
    let values = await fetch_values();
    console.log(values)
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
  async function send() {
		console.log('send', data)
		for (let i=0; i<8; i++) {
			// await write_value(i, data[i][1]);
			await write_value(i, JSON.stringify(data[i]));
			let lines = await readlines(3)
			// console.log(lines)
	  }
  }
</script>
<button on:click={connect} hidden={connected}>
  connect
</button>
<button on:click={disconnect} hidden={!connected}>
  disconnect
</button>
<button on:click={fetchtest} hidden={!connected}>
  <Board />  <SvgIcon d={right} /> <SvgIcon d={computer} />
</button>
<button on:click={send} hidden={!connected}>
	<SvgIcon d={computer} /> <SvgIcon d={right} /> <Board /> 
</button>
<button on:click={save_board} hidden={!connected}>
	<Board /><Floppy />
</button>
<!--
<button on:click={writetest} hidden={!connected}>
  write test
</button>
<button on:click={jsontest} hidden={!connected}>
  json test
</button>
-->
<button on:click={save_computer} hidden={!connected}>
	<FileDown />
	download from website
</button>
<button on:click={load_from_computer} hidden={!connected}>
	<FileUp />
 upload to website 
</button>
<ChTable {data}/>
