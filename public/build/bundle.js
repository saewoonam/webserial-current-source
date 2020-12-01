
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.30.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.30.1 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let button0;
    	let t0;
    	let t1;
    	let button1;
    	let t2;
    	let button1_hidden_value;
    	let t3;
    	let button2;
    	let t4;
    	let button2_hidden_value;
    	let t5;
    	let button3;
    	let t6;
    	let button3_hidden_value;
    	let t7;
    	let button4;
    	let t8;
    	let button4_hidden_value;
    	let t9;
    	let button5;
    	let t10;
    	let button5_hidden_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			t0 = text("connect");
    			t1 = space();
    			button1 = element("button");
    			t2 = text("disconnect");
    			t3 = space();
    			button2 = element("button");
    			t4 = text("fetch test");
    			t5 = space();
    			button3 = element("button");
    			t6 = text("write test");
    			t7 = space();
    			button4 = element("button");
    			t8 = text("save to computer");
    			t9 = space();
    			button5 = element("button");
    			t10 = text("save to board");
    			button0.hidden = /*connected*/ ctx[0];
    			add_location(button0, file, 112, 0, 2938);
    			button1.hidden = button1_hidden_value = !/*connected*/ ctx[0];
    			add_location(button1, file, 115, 0, 3005);
    			button2.hidden = button2_hidden_value = !/*connected*/ ctx[0];
    			add_location(button2, file, 118, 0, 3079);
    			button3.hidden = button3_hidden_value = !/*connected*/ ctx[0];
    			add_location(button3, file, 121, 0, 3152);
    			button4.hidden = button4_hidden_value = !/*connected*/ ctx[0];
    			add_location(button4, file, 124, 0, 3225);
    			button5.hidden = button5_hidden_value = !/*connected*/ ctx[0];
    			add_location(button5, file, 127, 0, 3308);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button2, anchor);
    			append_dev(button2, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, button3, anchor);
    			append_dev(button3, t6);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, button4, anchor);
    			append_dev(button4, t8);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, button5, anchor);
    			append_dev(button5, t10);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*connect*/ ctx[2], false, false, false),
    					listen_dev(button1, "click", /*disconnect*/ ctx[3], false, false, false),
    					listen_dev(button2, "click", /*fetchtest*/ ctx[4], false, false, false),
    					listen_dev(button3, "click", /*writetest*/ ctx[1], false, false, false),
    					listen_dev(button4, "click", save_computer, false, false, false),
    					listen_dev(button5, "click", save_board, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*connected*/ 1) {
    				prop_dev(button0, "hidden", /*connected*/ ctx[0]);
    			}

    			if (dirty & /*connected*/ 1 && button1_hidden_value !== (button1_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button1, "hidden", button1_hidden_value);
    			}

    			if (dirty & /*connected*/ 1 && button2_hidden_value !== (button2_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button2, "hidden", button2_hidden_value);
    			}

    			if (dirty & /*connected*/ 1 && button3_hidden_value !== (button3_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button3, "hidden", button3_hidden_value);
    			}

    			if (dirty & /*connected*/ 1 && button4_hidden_value !== (button4_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button4, "hidden", button4_hidden_value);
    			}

    			if (dirty & /*connected*/ 1 && button5_hidden_value !== (button5_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button5, "hidden", button5_hidden_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(button3);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(button4);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(button5);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function getPorts() {
    	const ports = await navigator.serial.getPorts();
    	console.log(ports);
    }

    function save_computer() {
    	console.log("save to computer");
    }

    function save_board() {
    	console.log("save to board not done");
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let port;
    	let reader, writer, encoder, decoder;
    	let connected = false;
    	const enc = new TextEncoder();
    	const dec = new TextDecoder();

    	async function readlines(num = 1) {
    		let total_msg = "";
    		let lines;
    		let got_all = false;
    		const reader = port.readable.getReader();

    		while (true) {
    			const { value, done } = await reader.read();

    			// console.log(value.length)
    			// console.log(value);
    			total_msg += dec.decode(value);

    			// console.log('readlines', value, total_msg, total_msg.length);
    			lines = total_msg.split(/\r\n/);

    			// console.log('lines', lines, lines[lines.length-1])
    			if (lines[lines.length - 1].length == 0 && lines.length == num + 1) {
    				// check lines.lenght==(num+1) because there is an extra empty string at the end
    				// console.log('got_all')
    				got_all = true;
    			}

    			// console.log(total_msg)
    			if (done || got_all) {
    				lines = lines.filter(item => item.length > 0);
    				reader.releaseLock();

    				// console.log('done')
    				break;
    			}
    		}

    		return lines;
    	}

    	async function query(msg, number_lines = 1) {
    		const writer = port.writable.getWriter();
    		msg = enc.encode(msg);
    		await writer.write(msg);
    		writer.releaseLock();
    		let value = await readlines(2);

    		// console.log(value)
    		return value[1];
    	}

    	async function write_value(channel, value) {
    		const writer = port.writable.getWriter();
    		let msg = channel + " " + value + "\r\n";
    		msg = enc.encode(msg);
    		await writer.write(msg);
    		writer.releaseLock();
    	}

    	async function writetest() {
    		await write_value(1, 1);
    		let lines = await readlines(3);
    		console.log(lines);
    	}

    	async function fetch_values() {
    		let values = [];

    		for (let i = 0; i < 8; i++) {
    			let msg = i + "?\r\n";
    			console.log("msg", msg);
    			let value = await query(msg);
    			value = Number(value.split(" ")[1].trim());
    			values.push(value);
    		} // console.log(values, values.length)

    		return values;
    	}

    	async function connect() {
    		try {
    			port = await navigator.serial.requestPort();
    			console.log(port.getInfo());

    			if (port) {
    				await port.open({ baudRate: 115200 });
    				console.log("port", port);
    				let values = await fetch_values();
    				console.log(values);
    				$$invalidate(0, connected = true);
    			}
    		} catch(e) {
    			console.log("error message", e.message);
    		}
    	}

    	async function disconnect() {
    		try {
    			port.close();
    			$$invalidate(0, connected = false);
    		} catch(e) {
    			console.log("error message", e.message);
    		}
    	}

    	async function fetchtest() {
    		let values = await fetch_values();
    		console.log(values);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		port,
    		reader,
    		writer,
    		encoder,
    		decoder,
    		connected,
    		enc,
    		dec,
    		readlines,
    		query,
    		write_value,
    		writetest,
    		fetch_values,
    		connect,
    		disconnect,
    		getPorts,
    		fetchtest,
    		save_computer,
    		save_board
    	});

    	$$self.$inject_state = $$props => {
    		if ("port" in $$props) port = $$props.port;
    		if ("reader" in $$props) reader = $$props.reader;
    		if ("writer" in $$props) writer = $$props.writer;
    		if ("encoder" in $$props) encoder = $$props.encoder;
    		if ("decoder" in $$props) decoder = $$props.decoder;
    		if ("connected" in $$props) $$invalidate(0, connected = $$props.connected);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [connected, writetest, connect, disconnect, fetchtest];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
