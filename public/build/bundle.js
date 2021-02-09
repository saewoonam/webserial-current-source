
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
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
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
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
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    const download ="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4";
    const upload = "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12";
    const computer = "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z";
    const right = "M17 8l4 4m0 0l-4 4m4-4H3";
    const circle_up = "M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z";
    const cog="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z";
    const floppy="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2 M10 14 a 2 2 0 1 0 4 0 a 2,2 0 1,0 -4,0 M14 4 L 14 8 L 8 8 L 8 4";
    const filedown = "M14 3v4a1 1 0 0 0 1 1h4 M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z M 12 11 v 6 M 9 14 l 3 3 l 3 -3 m 0 0";
    const fileup="M14 3v4a1 1 0 0 0 1 1h4 M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z M12 11 v 6 z M9 14 l 3 -3 l 3 3 m 0 0 z";
    const artboard="M 8 8 h 8 v 8 h-8 v -8 M 3 8 h 1 M 3 16 h 1 M 8 3 v1 M16 3 v 1 M20 8 h 1 M20 16 h 1 M8 20 v 1 M16 20 v 1";

    /* src/input.svelte generated by Svelte v3.30.1 */

    const { console: console_1 } = globals;
    const file = "src/input.svelte";
    const get_selectCaret_slot_changes = dirty => ({});
    const get_selectCaret_slot_context = ctx => ({});

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i].label;
    	child_ctx[0] = list[i].value;
    	child_ctx[32] = i;
    	return child_ctx;
    }

    // (157:0) {:else}
    function create_else_block(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let div_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	const selectCaret_slot_template = /*#slots*/ ctx[24].selectCaret;
    	const selectCaret_slot = create_slot(selectCaret_slot_template, ctx, /*$$scope*/ ctx[23], get_selectCaret_slot_context);
    	const selectCaret_slot_or_fallback = selectCaret_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(/*label*/ ctx[15]);
    			t1 = space();
    			if (selectCaret_slot_or_fallback) selectCaret_slot_or_fallback.c();
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(/*labelClasses*/ ctx[3]) + " svelte-akx9o9"));
    			add_location(div, file, 157, 2, 3566);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);

    			if (selectCaret_slot_or_fallback) {
    				selectCaret_slot_or_fallback.m(div, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div, "click", /*toggle*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*label*/ 32768) set_data_dev(t0, /*label*/ ctx[15]);

    			if (selectCaret_slot) {
    				if (selectCaret_slot.p && dirty[0] & /*$$scope*/ 8388608) {
    					update_slot(selectCaret_slot, selectCaret_slot_template, ctx, /*$$scope*/ ctx[23], dirty, get_selectCaret_slot_changes, get_selectCaret_slot_context);
    				}
    			} else {
    				if (selectCaret_slot_or_fallback && selectCaret_slot_or_fallback.p && dirty[0] & /*isSelect*/ 16384) {
    					selectCaret_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			if (!current || dirty[0] & /*labelClasses*/ 8 && div_class_value !== (div_class_value = "" + (null_to_empty(/*labelClasses*/ ctx[3]) + " svelte-akx9o9"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(selectCaret_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(selectCaret_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (selectCaret_slot_or_fallback) selectCaret_slot_or_fallback.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(157:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (139:30) 
    function create_if_block_2(ctx) {
    	let select;
    	let if_block_anchor;
    	let select_class_value;
    	let mounted;
    	let dispose;
    	let if_block = /*placeholder*/ ctx[2] && create_if_block_3(ctx);
    	let each_value = /*options*/ ctx[7];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			select = element("select");
    			if (if_block) if_block.c();
    			if_block_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(select, "class", select_class_value = "" + (null_to_empty(/*inputClasses*/ ctx[4]) + " svelte-akx9o9"));
    			add_location(select, file, 139, 2, 3193);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, select, anchor);
    			if (if_block) if_block.m(select, null);
    			append_dev(select, if_block_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*value*/ ctx[0]);
    			/*select_binding*/ ctx[27](select);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*handleChange*/ ctx[20], false, false, false),
    					listen_dev(select, "blur", /*handleBlur*/ ctx[19], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*placeholder*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(select, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*options*/ 128) {
    				each_value = /*options*/ ctx[7];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*inputClasses*/ 16 && select_class_value !== (select_class_value = "" + (null_to_empty(/*inputClasses*/ ctx[4]) + " svelte-akx9o9"))) {
    				attr_dev(select, "class", select_class_value);
    			}

    			if (dirty[0] & /*value*/ 1) {
    				select_option(select, /*value*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(select);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    			/*select_binding*/ ctx[27](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(139:30) ",
    		ctx
    	});

    	return block;
    }

    // (129:32) 
    function create_if_block_1(ctx) {
    	let textarea;
    	let textarea_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "class", textarea_class_value = "" + (null_to_empty(/*inputClasses*/ ctx[4]) + " svelte-akx9o9"));
    			attr_dev(textarea, "placeholder", /*placeholder*/ ctx[2]);
    			textarea.value = /*value*/ ctx[0];
    			attr_dev(textarea, "rows", /*rows*/ ctx[5]);
    			attr_dev(textarea, "cols", /*cols*/ ctx[6]);
    			add_location(textarea, file, 129, 2, 2994);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);
    			/*textarea_binding*/ ctx[26](textarea);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*handleInput*/ ctx[17], false, false, false),
    					listen_dev(textarea, "blur", /*handleBlur*/ ctx[19], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*inputClasses*/ 16 && textarea_class_value !== (textarea_class_value = "" + (null_to_empty(/*inputClasses*/ ctx[4]) + " svelte-akx9o9"))) {
    				attr_dev(textarea, "class", textarea_class_value);
    			}

    			if (dirty[0] & /*placeholder*/ 4) {
    				attr_dev(textarea, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty[0] & /*value*/ 1) {
    				prop_dev(textarea, "value", /*value*/ ctx[0]);
    			}

    			if (dirty[0] & /*rows*/ 32) {
    				attr_dev(textarea, "rows", /*rows*/ ctx[5]);
    			}

    			if (dirty[0] & /*cols*/ 64) {
    				attr_dev(textarea, "cols", /*cols*/ ctx[6]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			/*textarea_binding*/ ctx[26](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(129:32) ",
    		ctx
    	});

    	return block;
    }

    // (117:0) {#if editing && (isText || isNumber)}
    function create_if_block(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	let input_levels = [
    		{ class: /*inputClasses*/ ctx[4] },
    		{ type: /*type*/ ctx[1] },
    		{ value: /*value*/ ctx[0] },
    		{ placeholder: /*placeholder*/ ctx[2] },
    		/*extras*/ ctx[8]
    	];

    	let input_data = {};

    	for (let i = 0; i < input_levels.length; i += 1) {
    		input_data = assign(input_data, input_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			input = element("input");
    			set_attributes(input, input_data);
    			toggle_class(input, "svelte-akx9o9", true);
    			add_location(input, file, 117, 2, 2724);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			input.value = input_data.value;
    			/*input_binding*/ ctx[25](input);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "mousewheel", stop_propagation(/*wheel*/ ctx[21]), false, false, true),
    					listen_dev(input, "input", /*handleInput*/ ctx[17], false, false, false),
    					listen_dev(input, "keyup", /*handleEnter*/ ctx[18], false, false, false),
    					listen_dev(input, "blur", /*handleBlur*/ ctx[19], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			set_attributes(input, input_data = get_spread_update(input_levels, [
    				dirty[0] & /*inputClasses*/ 16 && { class: /*inputClasses*/ ctx[4] },
    				dirty[0] & /*type*/ 2 && { type: /*type*/ ctx[1] },
    				dirty[0] & /*value*/ 1 && input.value !== /*value*/ ctx[0] && { value: /*value*/ ctx[0] },
    				dirty[0] & /*placeholder*/ 4 && { placeholder: /*placeholder*/ ctx[2] },
    				dirty[0] & /*extras*/ 256 && /*extras*/ ctx[8]
    			]));

    			if ("value" in input_data) {
    				input.value = input_data.value;
    			}

    			toggle_class(input, "svelte-akx9o9", true);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[25](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(117:0) {#if editing && (isText || isNumber)}",
    		ctx
    	});

    	return block;
    }

    // (163:6) {#if isSelect}
    function create_if_block_4(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "▼";
    			add_location(span, file, 163, 8, 3690);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(163:6) {#if isSelect}",
    		ctx
    	});

    	return block;
    }

    // (162:29)        
    function fallback_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*isSelect*/ ctx[14] && create_if_block_4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*isSelect*/ ctx[14]) {
    				if (if_block) ; else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(162:29)        ",
    		ctx
    	});

    	return block;
    }

    // (146:4) {#if placeholder}
    function create_if_block_3(ctx) {
    	let option;
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(/*placeholder*/ ctx[2]);
    			option.selected = true;
    			option.__value = "";
    			option.value = option.__value;
    			option.disabled = true;
    			add_location(option, file, 146, 6, 3345);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*placeholder*/ 4) set_data_dev(t, /*placeholder*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(146:4) {#if placeholder}",
    		ctx
    	});

    	return block;
    }

    // (149:4) {#each options as { label, value }
    function create_each_block(ctx) {
    	let option;
    	let t0_value = /*label*/ ctx[15] + "";
    	let t0;
    	let t1;
    	let option_key_value;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(option, "key", option_key_value = /*i*/ ctx[32]);
    			option.__value = option_value_value = /*value*/ ctx[0];
    			option.value = option.__value;
    			add_location(option, file, 149, 6, 3459);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*options*/ 128 && t0_value !== (t0_value = /*label*/ ctx[15] + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*options*/ 128 && option_value_value !== (option_value_value = /*value*/ ctx[0])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(149:4) {#each options as { label, value }",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*editing*/ ctx[12] && (/*isText*/ ctx[9] || /*isNumber*/ ctx[10])) return 0;
    		if (/*editing*/ ctx[12] && /*isTextArea*/ ctx[11]) return 1;
    		if (/*editing*/ ctx[12] && /*isSelect*/ ctx[14]) return 2;
    		return 3;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Input", slots, ['selectCaret']);
    	const dispatch = createEventDispatcher();
    	let { value = "" } = $$props;
    	let { type = "text" } = $$props;
    	let { placeholder = "" } = $$props;
    	let { labelClasses = "" } = $$props;
    	let { inputClasses = "" } = $$props;
    	let { rows = 2 } = $$props;
    	let { cols = 20 } = $$props;
    	let { options = [] } = $$props;
    	let { extras = {} } = $$props;
    	let editing = false;
    	let inputEl;
    	let label;
    	let selectedIndex = options.findIndex(o => o.value === value);
    	let e;
    	let step = 1;

    	const toggle = async _ => {
    		$$invalidate(12, editing = !editing);

    		if (editing) {
    			await tick();
    			inputEl.focus();
    		}
    	};

    	const handleInput = e => {
    		$$invalidate(0, value = isNumber ? +e.target.value : e.target.value);
    	};

    	const handleEnter = e => {
    		if (e.keyCode === 13) inputEl.blur();

    		if (e.key == "ArrowRight" && e.shiftKey) {
    			console.log("step / 10");
    			step = step / 10;
    			if (step < 2.5 / 65535) step = 2.5 / 65535;
    		}

    		if (e.key == "ArrowLeft" && e.shiftKey) {
    			console.log("step * 10");

    			if (step <= 3 / 65535) {
    				step = 0.0001;
    			} else {
    				step *= 10;
    			}

    			if (step > 1) {
    				step = 1;
    			}
    		}
    	};

    	const handleBlur = e => {
    		toggle();

    		// console.log('blur input', e)
    		if (e.srcElement.max != "") {
    			let max = Number(e.srcElement.max);
    			if (value > max) $$invalidate(0, value = max);
    		}

    		if (e.srcElement.min != "") {
    			let min = Number(e.srcElement.min);
    			if (value < min) $$invalidate(0, value = min);
    		}

    		dispatch("blur", value);
    	};

    	const handleChange = e => {
    		$$invalidate(22, selectedIndex = placeholder
    		? e.target.selectedIndex - 1
    		: e.target.selectedIndex);

    		$$invalidate(0, value = options[selectedIndex].value);
    	};

    	function wheel(e) {
    		if (e.target.type == "number") {
    			e.preventDefault();
    			e.stopPropagation();

    			if (e.deltaY > 0 && e.target.max.length > 0) {
    				$$invalidate(0, value = Number(e.target.value) + step);
    				if (value > Number(e.target.max)) $$invalidate(0, value = Number(e.target.max));
    				$$invalidate(0, value = Number(value.toFixed(5)));
    			}

    			if (e.deltaY < 0 && e.target.min.length > 0) {
    				$$invalidate(0, value = Number(e.target.value) - step);
    				if (value < Number(e.target.min)) $$invalidate(0, value = Number(e.target.min));
    				$$invalidate(0, value = Number(value.toFixed(5)));
    			}
    		}

    		console.log("value", value, e, e.target.value);
    	}

    	const writable_props = [
    		"value",
    		"type",
    		"placeholder",
    		"labelClasses",
    		"inputClasses",
    		"rows",
    		"cols",
    		"options",
    		"extras"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Input> was created with unknown prop '${key}'`);
    	});

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputEl = $$value;
    			$$invalidate(13, inputEl);
    			$$invalidate(7, options);
    		});
    	}

    	function textarea_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputEl = $$value;
    			$$invalidate(13, inputEl);
    			$$invalidate(7, options);
    		});
    	}

    	function select_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			inputEl = $$value;
    			$$invalidate(13, inputEl);
    			$$invalidate(7, options);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("type" in $$props) $$invalidate(1, type = $$props.type);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("labelClasses" in $$props) $$invalidate(3, labelClasses = $$props.labelClasses);
    		if ("inputClasses" in $$props) $$invalidate(4, inputClasses = $$props.inputClasses);
    		if ("rows" in $$props) $$invalidate(5, rows = $$props.rows);
    		if ("cols" in $$props) $$invalidate(6, cols = $$props.cols);
    		if ("options" in $$props) $$invalidate(7, options = $$props.options);
    		if ("extras" in $$props) $$invalidate(8, extras = $$props.extras);
    		if ("$$scope" in $$props) $$invalidate(23, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		tick,
    		createEventDispatcher,
    		dispatch,
    		value,
    		type,
    		placeholder,
    		labelClasses,
    		inputClasses,
    		rows,
    		cols,
    		options,
    		extras,
    		editing,
    		inputEl,
    		label,
    		selectedIndex,
    		e,
    		step,
    		toggle,
    		handleInput,
    		handleEnter,
    		handleBlur,
    		handleChange,
    		wheel,
    		isText,
    		isNumber,
    		isTextArea,
    		isSelect
    	});

    	$$self.$inject_state = $$props => {
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("type" in $$props) $$invalidate(1, type = $$props.type);
    		if ("placeholder" in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ("labelClasses" in $$props) $$invalidate(3, labelClasses = $$props.labelClasses);
    		if ("inputClasses" in $$props) $$invalidate(4, inputClasses = $$props.inputClasses);
    		if ("rows" in $$props) $$invalidate(5, rows = $$props.rows);
    		if ("cols" in $$props) $$invalidate(6, cols = $$props.cols);
    		if ("options" in $$props) $$invalidate(7, options = $$props.options);
    		if ("extras" in $$props) $$invalidate(8, extras = $$props.extras);
    		if ("editing" in $$props) $$invalidate(12, editing = $$props.editing);
    		if ("inputEl" in $$props) $$invalidate(13, inputEl = $$props.inputEl);
    		if ("label" in $$props) $$invalidate(15, label = $$props.label);
    		if ("selectedIndex" in $$props) $$invalidate(22, selectedIndex = $$props.selectedIndex);
    		if ("e" in $$props) e = $$props.e;
    		if ("step" in $$props) step = $$props.step;
    		if ("isText" in $$props) $$invalidate(9, isText = $$props.isText);
    		if ("isNumber" in $$props) $$invalidate(10, isNumber = $$props.isNumber);
    		if ("isTextArea" in $$props) $$invalidate(11, isTextArea = $$props.isTextArea);
    		if ("isSelect" in $$props) $$invalidate(14, isSelect = $$props.isSelect);
    	};

    	let isText;
    	let isNumber;
    	let isTextArea;
    	let isSelect;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*type*/ 2) {
    			// Computed
    			 $$invalidate(9, isText = type === "text");
    		}

    		if ($$self.$$.dirty[0] & /*type*/ 2) {
    			 $$invalidate(10, isNumber = type === "number");
    		}

    		if ($$self.$$.dirty[0] & /*type*/ 2) {
    			 $$invalidate(11, isTextArea = type === "textarea");
    		}

    		if ($$self.$$.dirty[0] & /*type*/ 2) {
    			 $$invalidate(14, isSelect = type === "select");
    		}

    		if ($$self.$$.dirty[0] & /*isNumber, value, placeholder, isText, isTextArea, selectedIndex, options*/ 4198021) {
    			 if (isNumber) {
    				$$invalidate(15, label = value === "" ? placeholder : value);
    			} else if (isText || isTextArea) {
    				$$invalidate(15, label = value ? value : placeholder);
    			} else {
    				// Select
    				$$invalidate(15, label = selectedIndex === -1
    				? placeholder
    				: options[selectedIndex].label);
    			}
    		}
    	};

    	return [
    		value,
    		type,
    		placeholder,
    		labelClasses,
    		inputClasses,
    		rows,
    		cols,
    		options,
    		extras,
    		isText,
    		isNumber,
    		isTextArea,
    		editing,
    		inputEl,
    		isSelect,
    		label,
    		toggle,
    		handleInput,
    		handleEnter,
    		handleBlur,
    		handleChange,
    		wheel,
    		selectedIndex,
    		$$scope,
    		slots,
    		input_binding,
    		textarea_binding,
    		select_binding
    	];
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{
    				value: 0,
    				type: 1,
    				placeholder: 2,
    				labelClasses: 3,
    				inputClasses: 4,
    				rows: 5,
    				cols: 6,
    				options: 7,
    				extras: 8
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get value() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get labelClasses() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labelClasses(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inputClasses() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inputClasses(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rows() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rows(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get cols() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cols(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get options() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get extras() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set extras(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ChTable.svelte generated by Svelte v3.30.1 */

    const { console: console_1$1 } = globals;
    const file$1 = "src/ChTable.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[18] = list[i];
    	child_ctx[19] = list;
    	child_ctx[20] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[21] = list[i];
    	return child_ctx;
    }

    // (31:0) {#if data.length>0}
    function create_if_block_2$1(ctx) {
    	let h3;
    	let t;
    	let inlineinput2;
    	let updating_value;
    	let current;

    	function inlineinput2_value_binding(value) {
    		/*inlineinput2_value_binding*/ ctx[7].call(null, value);
    	}

    	let inlineinput2_props = {};

    	if (/*title*/ ctx[0] !== void 0) {
    		inlineinput2_props.value = /*title*/ ctx[0];
    	}

    	inlineinput2 = new Input({
    			props: inlineinput2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inlineinput2, "value", inlineinput2_value_binding));
    	inlineinput2.$on("blur", /*blur_handler*/ ctx[8]);

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			t = text("Board Name: ");
    			create_component(inlineinput2.$$.fragment);
    			add_location(h3, file$1, 31, 2, 754);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			append_dev(h3, t);
    			mount_component(inlineinput2, h3, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const inlineinput2_changes = {};

    			if (!updating_value && dirty & /*title*/ 1) {
    				updating_value = true;
    				inlineinput2_changes.value = /*title*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			inlineinput2.$set(inlineinput2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inlineinput2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inlineinput2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			destroy_component(inlineinput2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(31:0) {#if data.length>0}",
    		ctx
    	});

    	return block;
    }

    // (36:4) {#if data.length>0}
    function create_if_block_1$1(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*columns*/ ctx[5];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*columns*/ 32) {
    				each_value_1 = /*columns*/ ctx[5];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(36:4) {#if data.length>0}",
    		ctx
    	});

    	return block;
    }

    // (37:4) {#each columns as column}
    function create_each_block_1(ctx) {
    	let th;
    	let t_value = /*column*/ ctx[21] + "";
    	let t;

    	const block = {
    		c: function create() {
    			th = element("th");
    			t = text(t_value);
    			add_location(th, file$1, 37, 4, 900);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, th, anchor);
    			append_dev(th, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(th);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(37:4) {#each columns as column}",
    		ctx
    	});

    	return block;
    }

    // (47:4) {#if (advanced && row.length>=3)}
    function create_if_block$1(ctx) {
    	let td;
    	let inlineinput2;
    	let updating_value;
    	let current;

    	function inlineinput2_value_binding_1(value) {
    		/*inlineinput2_value_binding_1*/ ctx[14].call(null, value, /*row*/ ctx[18]);
    	}

    	let inlineinput2_props = {
    		type: "number",
    		extras: /*extras_dac_offset*/ ctx[4],
    		labelClasses: "input"
    	};

    	if (/*row*/ ctx[18][3] !== void 0) {
    		inlineinput2_props.value = /*row*/ ctx[18][3];
    	}

    	inlineinput2 = new Input({
    			props: inlineinput2_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inlineinput2, "value", inlineinput2_value_binding_1));
    	inlineinput2.$on("blur", /*blur_handler_3*/ ctx[15]);

    	const block = {
    		c: function create() {
    			td = element("td");
    			create_component(inlineinput2.$$.fragment);
    			attr_dev(td, "class", "svelte-14k6e1x");
    			add_location(td, file$1, 47, 4, 1345);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			mount_component(inlineinput2, td, null);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const inlineinput2_changes = {};

    			if (!updating_value && dirty & /*data*/ 2) {
    				updating_value = true;
    				inlineinput2_changes.value = /*row*/ ctx[18][3];
    				add_flush_callback(() => updating_value = false);
    			}

    			inlineinput2.$set(inlineinput2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inlineinput2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inlineinput2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    			destroy_component(inlineinput2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(47:4) {#if (advanced && row.length>=3)}",
    		ctx
    	});

    	return block;
    }

    // (42:2) {#each data as row}
    function create_each_block$1(ctx) {
    	let tr;
    	let td0;
    	let inlineinput20;
    	let updating_value;
    	let t0;
    	let td1;
    	let inlineinput21;
    	let updating_value_1;
    	let t1;
    	let td2;
    	let input;
    	let t2;
    	let t3;
    	let current;
    	let mounted;
    	let dispose;

    	function inlineinput20_value_binding(value) {
    		/*inlineinput20_value_binding*/ ctx[9].call(null, value, /*row*/ ctx[18]);
    	}

    	let inlineinput20_props = {
    		extras: { style: "width: 8em;" },
    		labelClasses: "input"
    	};

    	if (/*row*/ ctx[18][0] !== void 0) {
    		inlineinput20_props.value = /*row*/ ctx[18][0];
    	}

    	inlineinput20 = new Input({
    			props: inlineinput20_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inlineinput20, "value", inlineinput20_value_binding));
    	inlineinput20.$on("blur", /*blur_handler_1*/ ctx[10]);

    	function inlineinput21_value_binding(value) {
    		/*inlineinput21_value_binding*/ ctx[11].call(null, value, /*row*/ ctx[18]);
    	}

    	let inlineinput21_props = {
    		type: "number",
    		extras: /*extras*/ ctx[3],
    		labelClasses: "input"
    	};

    	if (/*row*/ ctx[18][1] !== void 0) {
    		inlineinput21_props.value = /*row*/ ctx[18][1];
    	}

    	inlineinput21 = new Input({
    			props: inlineinput21_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inlineinput21, "value", inlineinput21_value_binding));
    	inlineinput21.$on("blur", /*blur_handler_2*/ ctx[12]);

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[13].call(input, /*each_value*/ ctx[19], /*row_index*/ ctx[20]);
    	}

    	let if_block = /*advanced*/ ctx[2] && /*row*/ ctx[18].length >= 3 && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			create_component(inlineinput20.$$.fragment);
    			t0 = space();
    			td1 = element("td");
    			create_component(inlineinput21.$$.fragment);
    			t1 = space();
    			td2 = element("td");
    			input = element("input");
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			attr_dev(td0, "class", "svelte-14k6e1x");
    			add_location(td0, file$1, 43, 4, 981);
    			attr_dev(td1, "class", "svelte-14k6e1x");
    			add_location(td1, file$1, 44, 4, 1090);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "labelclasses", "checkbox");
    			add_location(input, file$1, 45, 17, 1211);
    			attr_dev(td2, "class", "svelte-14k6e1x");
    			add_location(td2, file$1, 45, 4, 1198);
    			attr_dev(tr, "class", "svelte-14k6e1x");
    			add_location(tr, file$1, 42, 2, 972);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			mount_component(inlineinput20, td0, null);
    			append_dev(tr, t0);
    			append_dev(tr, td1);
    			mount_component(inlineinput21, td1, null);
    			append_dev(tr, t1);
    			append_dev(tr, td2);
    			append_dev(td2, input);
    			input.checked = /*row*/ ctx[18][2];
    			append_dev(tr, t2);
    			if (if_block) if_block.m(tr, null);
    			append_dev(tr, t3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*click*/ ctx[6], false, false, false),
    					listen_dev(input, "change", input_change_handler)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const inlineinput20_changes = {};

    			if (!updating_value && dirty & /*data*/ 2) {
    				updating_value = true;
    				inlineinput20_changes.value = /*row*/ ctx[18][0];
    				add_flush_callback(() => updating_value = false);
    			}

    			inlineinput20.$set(inlineinput20_changes);
    			const inlineinput21_changes = {};

    			if (!updating_value_1 && dirty & /*data*/ 2) {
    				updating_value_1 = true;
    				inlineinput21_changes.value = /*row*/ ctx[18][1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			inlineinput21.$set(inlineinput21_changes);

    			if (dirty & /*data*/ 2) {
    				input.checked = /*row*/ ctx[18][2];
    			}

    			if (/*advanced*/ ctx[2] && /*row*/ ctx[18].length >= 3) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*advanced, data*/ 6) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(tr, t3);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inlineinput20.$$.fragment, local);
    			transition_in(inlineinput21.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inlineinput20.$$.fragment, local);
    			transition_out(inlineinput21.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_component(inlineinput20);
    			destroy_component(inlineinput21);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(42:2) {#each data as row}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t0;
    	let table;
    	let tr;
    	let t1;
    	let current;
    	let if_block0 = /*data*/ ctx[1].length > 0 && create_if_block_2$1(ctx);
    	let if_block1 = /*data*/ ctx[1].length > 0 && create_if_block_1$1(ctx);
    	let each_value = /*data*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			table = element("table");
    			tr = element("tr");
    			if (if_block1) if_block1.c();
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(tr, file$1, 34, 2, 837);
    			add_location(table, file$1, 33, 0, 826);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, tr);
    			if (if_block1) if_block1.m(tr, null);
    			append_dev(table, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*data*/ ctx[1].length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*data*/ 2) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*data*/ ctx[1].length > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					if_block1.m(tr, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*extras_dac_offset, data, advanced, click, extras*/ 94) {
    				each_value = /*data*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(table, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(table);
    			if (if_block1) if_block1.d();
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ChTable", slots, []);
    	const dispatch = createEventDispatcher();

    	let extras = {
    		min: -100,
    		max: 100,
    		style: "width: 8em;"
    	};

    	let extras_dac_offset = { min: 0, max: 65535 };
    	let min = 1;
    	let columns = ["Name", "value", "bias"];
    	let { title = "Unknown" } = $$props;
    	let { data = [] } = $$props;
    	let { advanced = true } = $$props;

    	function click(event) {
    		console.log("click", event);

    		// data = data
    		dispatch("blur", data[0]);
    	}

    	const writable_props = ["title", "data", "advanced"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<ChTable> was created with unknown prop '${key}'`);
    	});

    	function inlineinput2_value_binding(value) {
    		title = value;
    		$$invalidate(0, title);
    	}

    	function blur_handler(event) {
    		bubble($$self, event);
    	}

    	function inlineinput20_value_binding(value, row) {
    		row[0] = value;
    		$$invalidate(1, data);
    	}

    	function blur_handler_1(event) {
    		bubble($$self, event);
    	}

    	function inlineinput21_value_binding(value, row) {
    		row[1] = value;
    		$$invalidate(1, data);
    	}

    	function blur_handler_2(event) {
    		bubble($$self, event);
    	}

    	function input_change_handler(each_value, row_index) {
    		each_value[row_index][2] = this.checked;
    		$$invalidate(1, data);
    	}

    	function inlineinput2_value_binding_1(value, row) {
    		row[3] = value;
    		$$invalidate(1, data);
    	}

    	function blur_handler_3(event) {
    		bubble($$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    		if ("advanced" in $$props) $$invalidate(2, advanced = $$props.advanced);
    	};

    	$$self.$capture_state = () => ({
    		InlineInput2: Input,
    		tick,
    		createEventDispatcher,
    		dispatch,
    		extras,
    		extras_dac_offset,
    		min,
    		columns,
    		title,
    		data,
    		advanced,
    		click
    	});

    	$$self.$inject_state = $$props => {
    		if ("extras" in $$props) $$invalidate(3, extras = $$props.extras);
    		if ("extras_dac_offset" in $$props) $$invalidate(4, extras_dac_offset = $$props.extras_dac_offset);
    		if ("min" in $$props) min = $$props.min;
    		if ("columns" in $$props) $$invalidate(5, columns = $$props.columns);
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    		if ("advanced" in $$props) $$invalidate(2, advanced = $$props.advanced);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		title,
    		data,
    		advanced,
    		extras,
    		extras_dac_offset,
    		columns,
    		click,
    		inlineinput2_value_binding,
    		blur_handler,
    		inlineinput20_value_binding,
    		blur_handler_1,
    		inlineinput21_value_binding,
    		blur_handler_2,
    		input_change_handler,
    		inlineinput2_value_binding_1,
    		blur_handler_3
    	];
    }

    class ChTable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { title: 0, data: 1, advanced: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ChTable",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get title() {
    		throw new Error("<ChTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<ChTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<ChTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<ChTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get advanced() {
    		throw new Error("<ChTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set advanced(value) {
    		throw new Error("<ChTable>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/SvgIcon.svelte generated by Svelte v3.30.1 */

    const file$2 = "src/SvgIcon.svelte";

    function create_fragment$2(ctx) {
    	let svg;
    	let path;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "d", /*d*/ ctx[1]);
    			attr_dev(path, "stroke", "#4A5568");
    			attr_dev(path, "stroke-width", "2");
    			attr_dev(path, "stroke-linecap", "round");
    			attr_dev(path, "stroke-linejoin", "round");
    			add_location(path, file$2, 6, 0, 172);
    			attr_dev(svg, "class", "icon svelte-1nvbvo2");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "fill", /*fill*/ ctx[0]);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$2, 5, 0, 63);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*d*/ 2) {
    				attr_dev(path, "d", /*d*/ ctx[1]);
    			}

    			if (dirty & /*fill*/ 1) {
    				attr_dev(svg, "fill", /*fill*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SvgIcon", slots, []);
    	let { fill = "none" } = $$props;
    	let { d = "" } = $$props;
    	const writable_props = ["fill", "d"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SvgIcon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    		if ("d" in $$props) $$invalidate(1, d = $$props.d);
    	};

    	$$self.$capture_state = () => ({ fill, d });

    	$$self.$inject_state = $$props => {
    		if ("fill" in $$props) $$invalidate(0, fill = $$props.fill);
    		if ("d" in $$props) $$invalidate(1, d = $$props.d);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [fill, d];
    }

    class SvgIcon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { fill: 0, d: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SvgIcon",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get fill() {
    		throw new Error("<SvgIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fill(value) {
    		throw new Error("<SvgIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get d() {
    		throw new Error("<SvgIcon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set d(value) {
    		throw new Error("<SvgIcon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/settings.svelte generated by Svelte v3.30.1 */

    const file$3 = "src/settings.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (16:2) {#each options as option}
    function create_each_block$2(ctx) {
    	let option;
    	let t0_value = /*option*/ ctx[5].text + "";
    	let t0;
    	let t1;
    	let option_value_value;
    	let option_selected_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = /*option*/ ctx[5].id;
    			option.value = option.__value;
    			option.selected = option_selected_value = /*option*/ ctx[5].id == /*selected_option*/ ctx[1];
    			add_location(option, file$3, 16, 2, 428);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selected_option, options*/ 6 && option_selected_value !== (option_selected_value = /*option*/ ctx[5].id == /*selected_option*/ ctx[1])) {
    				prop_dev(option, "selected", option_selected_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(16:2) {#each options as option}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let label0;
    	let input;
    	let t0;
    	let t1;
    	let label1;
    	let t2;
    	let select;
    	let mounted;
    	let dispose;
    	let each_value = /*options*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			input = element("input");
    			t0 = text("\nshow dac_offset");
    			t1 = space();
    			label1 = element("label");
    			t2 = text("send data\n  ");
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input, "type", "checkbox");
    			add_location(input, file$3, 9, 0, 260);
    			add_location(label0, file$3, 8, 0, 252);
    			if (/*selected_option*/ ctx[1] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[4].call(select));
    			add_location(select, file$3, 14, 2, 360);
    			add_location(label1, file$3, 12, 0, 338);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			append_dev(label0, input);
    			input.checked = /*show_dac_offset*/ ctx[0];
    			append_dev(label0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, t2);
    			append_dev(label1, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*selected_option*/ ctx[1]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_handler*/ ctx[3]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*show_dac_offset*/ 1) {
    				input.checked = /*show_dac_offset*/ ctx[0];
    			}

    			if (dirty & /*options, selected_option*/ 6) {
    				each_value = /*options*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*selected_option, options*/ 6) {
    				select_option(select, /*selected_option*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(label1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Settings", slots, []);

    	let options = [
    		{ id: 1, text: "only via button" },
    		{
    			id: 2,
    			text: "when data is enetered in table"
    		}
    	]; /* {id: 3, text:"as data is entered in the table"} */

    	let { show_dac_offset = true } = $$props;
    	let { selected_option = 3 } = $$props;
    	const writable_props = ["show_dac_offset", "selected_option"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Settings> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler() {
    		show_dac_offset = this.checked;
    		$$invalidate(0, show_dac_offset);
    	}

    	function select_change_handler() {
    		selected_option = select_value(this);
    		$$invalidate(1, selected_option);
    		$$invalidate(2, options);
    	}

    	$$self.$$set = $$props => {
    		if ("show_dac_offset" in $$props) $$invalidate(0, show_dac_offset = $$props.show_dac_offset);
    		if ("selected_option" in $$props) $$invalidate(1, selected_option = $$props.selected_option);
    	};

    	$$self.$capture_state = () => ({
    		options,
    		show_dac_offset,
    		selected_option
    	});

    	$$self.$inject_state = $$props => {
    		if ("options" in $$props) $$invalidate(2, options = $$props.options);
    		if ("show_dac_offset" in $$props) $$invalidate(0, show_dac_offset = $$props.show_dac_offset);
    		if ("selected_option" in $$props) $$invalidate(1, selected_option = $$props.selected_option);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		show_dac_offset,
    		selected_option,
    		options,
    		input_change_handler,
    		select_change_handler
    	];
    }

    class Settings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { show_dac_offset: 0, selected_option: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Settings",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get show_dac_offset() {
    		throw new Error("<Settings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set show_dac_offset(value) {
    		throw new Error("<Settings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get selected_option() {
    		throw new Error("<Settings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selected_option(value) {
    		throw new Error("<Settings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function serial_wrapper(extras) {
      let port;
      let connected = false;
      let name;
      const enc = new TextEncoder();
      const dec = new TextDecoder();
      async function write(msg) {
        // console.log('trying to write:', msg)
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
        let cmd;
        [cmd, ...value] = value;
        // console.log(value)
        return value
      }
      async function readlines(num=1) {
        let total_msg = '';
        let lines;
        let got_all = false;
        console.log('readlines');
        let reader;
        if (port.readable) {
          console.log('port readable');
        }
        reader = await port.readable.getReader();
        console.log('reader', reader);
        // console.log('loop until get all lines')
        while (true) {
          const { value, done } = await reader.read();
          // console.log(value.length)
          console.log(dec.decode(value));
          total_msg += dec.decode(value);
          // console.log('values, total_msg', value, total_msg, total_msg.length);
          lines = total_msg.split(/\r\n/);
          // console.log('lines', lines, lines[lines.length-1])

          if (lines[lines.length-1].length==0 && lines.length==(num+1)) {
              // check lines.lenght==(num+1) because there is an extra empty string at the end
              // console.log('got_all')
              got_all = true;
          }
          // console.log(total_msg)
          if (done || got_all) {
            lines = lines.filter(item => item.length>0);
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
        let values = [];
        for(let i=0; i<8; i++) {
          let msg = i+"?\r\n";
          // console.log('msg', msg);
          let [value] = await query(msg);
          let [first, ...second] = value.split(' ');
          second = second.join(' ');
          value = JSON.parse(second);
          values.push(value);
          // value = Number(value[1])
          // values.push(value)
        }
        return values;
      }

      async function fetch_value(i) {
          let msg = i+"?\r\n";
          // console.log('fetch_value: msg', msg);
          let [value] = await query(msg);
          let [first, ...second] = value.split(' ');
          second = second.join(' ');
          value = JSON.parse(second);
        return value;
      }

      async function get_status() {
          let msg = "STATUS?\r\n";
          // console.log('fetch_value: msg', msg);
          let [value] = await query(msg);
          let [first, ...second] = value.split(' ');
          console.log(second);
          value = Number(second[0]);
        return value;
      }

      const obj = {
        connect: async () => {
          try {
            port = await navigator.serial.requestPort();
            console.log(port.getInfo());
            if (port) {
              await port.open({baudRate: 115200});
              console.log('port', port);
              /*
              data = await fetch_values()
              board_name = await fetch_name();
              old_name = board_name;
              old_data = JSON.parse(JSON.stringify(data));  
              */
            }
            // console.log('connect: data:', data)
            connected = true;
            let status_byte = await get_status();
            console.log('status', status_byte);
          } catch (e) {
            console.log("error message", e.message);
            if (port) port.close();
            connected = false;
          }
          return [connected, port];
        },
        write: write,
        query: query,
        readlines: readlines,
        fetch_values: fetch_values,
        fetch_value: fetch_value,
        get_status: get_status,
        fetch_name: async()=>{
          let msg = "N?\r\n";
          let [value] = await query(msg);
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
          console.log('read port', port, name);
        },
        port: port,
        connected: connected,
      };
      return obj
    }

    /* src/App.svelte generated by Svelte v3.30.1 */

    const { console: console_1$2 } = globals;
    const file$4 = "src/App.svelte";

    // (274:0) {:else}
    function create_else_block_1(ctx) {
    	let h20;
    	let t1;
    	let h21;
    	let t3;
    	let h30;
    	let t5;
    	let h31;
    	let t7;
    	let h32;
    	let t9;

    	const block = {
    		c: function create() {
    			h20 = element("h2");
    			h20.textContent = "Web serial doesn't seem to be enabled in your browser.";
    			t1 = space();
    			h21 = element("h2");
    			h21.textContent = "Make sure it is Chrome, Opera, or Edge.";
    			t3 = space();
    			h30 = element("h3");
    			h30.textContent = "Enable it in chrome by putting the following address in address bar";
    			t5 = text("\nchrome://flags/#enable-experimental-web-platform-features\n  ");
    			h31 = element("h3");
    			h31.textContent = "for opera:";
    			t7 = text("\nopera://flags/#enable-experimental-web-platform-features\n  ");
    			h32 = element("h3");
    			h32.textContent = "for edge:";
    			t9 = text("\nedge://flags/#enable-experimental-web-platform-features");
    			add_location(h20, file$4, 274, 2, 7994);
    			add_location(h21, file$4, 275, 2, 8062);
    			add_location(h30, file$4, 276, 2, 8115);
    			add_location(h31, file$4, 278, 2, 8255);
    			add_location(h32, file$4, 280, 2, 8336);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h20, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, h21, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, h30, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h31, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, h32, anchor);
    			insert_dev(target, t9, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h20);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(h21);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(h30);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(h31);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(h32);
    			if (detaching) detach_dev(t9);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(274:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (227:0) {#if ('serial' in navigator)}
    function create_if_block$2(ctx) {
    	let button;
    	let t0;
    	let t1;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block_1$2, create_if_block_3$1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (!/*show_settings*/ ctx[3]) return 0;
    		if (/*connected*/ ctx[1]) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_1(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text("connect");
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			button.hidden = /*connected*/ ctx[1];
    			add_location(button, file$4, 227, 0, 6412);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			insert_dev(target, t1, anchor);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*connect*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*connected*/ 2) {
    				prop_dev(button, "hidden", /*connected*/ ctx[1]);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(227:0) {#if ('serial' in navigator)}",
    		ctx
    	});

    	return block;
    }

    // (266:0) {#if connected}
    function create_if_block_3$1(ctx) {
    	let h1;
    	let t1;
    	let settings;
    	let updating_show_dac_offset;
    	let updating_selected_option;
    	let t2;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	function settings_show_dac_offset_binding(value) {
    		/*settings_show_dac_offset_binding*/ ctx[22].call(null, value);
    	}

    	function settings_selected_option_binding(value) {
    		/*settings_selected_option_binding*/ ctx[23].call(null, value);
    	}

    	let settings_props = {};

    	if (/*advanced*/ ctx[4] !== void 0) {
    		settings_props.show_dac_offset = /*advanced*/ ctx[4];
    	}

    	if (/*send_config*/ ctx[5] !== void 0) {
    		settings_props.selected_option = /*send_config*/ ctx[5];
    	}

    	settings = new Settings({ props: settings_props, $$inline: true });
    	binding_callbacks.push(() => bind(settings, "show_dac_offset", settings_show_dac_offset_binding));
    	binding_callbacks.push(() => bind(settings, "selected_option", settings_selected_option_binding));

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "settings";
    			t1 = space();
    			create_component(settings.$$.fragment);
    			t2 = space();
    			button = element("button");
    			button.textContent = "Done";
    			add_location(h1, file$4, 266, 2, 7804);
    			add_location(button, file$4, 268, 2, 7907);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(settings, target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, button, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[24], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const settings_changes = {};

    			if (!updating_show_dac_offset && dirty[0] & /*advanced*/ 16) {
    				updating_show_dac_offset = true;
    				settings_changes.show_dac_offset = /*advanced*/ ctx[4];
    				add_flush_callback(() => updating_show_dac_offset = false);
    			}

    			if (!updating_selected_option && dirty[0] & /*send_config*/ 32) {
    				updating_selected_option = true;
    				settings_changes.selected_option = /*send_config*/ ctx[5];
    				add_flush_callback(() => updating_selected_option = false);
    			}

    			settings.$set(settings_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(settings.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(settings.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t1);
    			destroy_component(settings, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(266:0) {#if connected}",
    		ctx
    	});

    	return block;
    }

    // (231:0) {#if (!show_settings) }
    function create_if_block_1$2(ctx) {
    	let button0;
    	let t0;
    	let button0_hidden_value;
    	let t1;
    	let button1;
    	let svgicon0;
    	let t2;
    	let svgicon1;
    	let t3;
    	let svgicon2;
    	let button1_hidden_value;
    	let t4;
    	let button2;
    	let svgicon3;
    	let t5;
    	let svgicon4;
    	let t6;
    	let svgicon5;
    	let button2_hidden_value;
    	let t7;
    	let button3;
    	let svgicon6;
    	let svgicon7;
    	let button3_hidden_value;
    	let t8;
    	let button4;
    	let svgicon8;
    	let button4_hidden_value;
    	let t9;
    	let button5;
    	let svgicon9;
    	let button5_hidden_value;
    	let t10;
    	let button6;
    	let svgicon10;
    	let button6_hidden_value;
    	let t11;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	svgicon0 = new SvgIcon({ props: { d: artboard }, $$inline: true });
    	svgicon1 = new SvgIcon({ props: { d: right }, $$inline: true });
    	svgicon2 = new SvgIcon({ props: { d: computer }, $$inline: true });
    	svgicon3 = new SvgIcon({ props: { d: computer }, $$inline: true });
    	svgicon4 = new SvgIcon({ props: { d: right }, $$inline: true });
    	svgicon5 = new SvgIcon({ props: { d: artboard }, $$inline: true });
    	svgicon6 = new SvgIcon({ props: { d: artboard }, $$inline: true });
    	svgicon7 = new SvgIcon({ props: { d: floppy }, $$inline: true });
    	svgicon8 = new SvgIcon({ props: { d: filedown }, $$inline: true });
    	svgicon9 = new SvgIcon({ props: { d: fileup }, $$inline: true });
    	svgicon10 = new SvgIcon({ props: { d: cog }, $$inline: true });
    	const if_block_creators = [create_if_block_2$2, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type_2(ctx, dirty) {
    		if (/*power*/ ctx[7]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_2(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			t0 = text("disconnect");
    			t1 = space();
    			button1 = element("button");
    			create_component(svgicon0.$$.fragment);
    			t2 = space();
    			create_component(svgicon1.$$.fragment);
    			t3 = space();
    			create_component(svgicon2.$$.fragment);
    			t4 = space();
    			button2 = element("button");
    			create_component(svgicon3.$$.fragment);
    			t5 = space();
    			create_component(svgicon4.$$.fragment);
    			t6 = space();
    			create_component(svgicon5.$$.fragment);
    			t7 = space();
    			button3 = element("button");
    			create_component(svgicon6.$$.fragment);
    			create_component(svgicon7.$$.fragment);
    			t8 = space();
    			button4 = element("button");
    			create_component(svgicon8.$$.fragment);
    			t9 = space();
    			button5 = element("button");
    			create_component(svgicon9.$$.fragment);
    			t10 = space();
    			button6 = element("button");
    			create_component(svgicon10.$$.fragment);
    			t11 = space();
    			if_block.c();
    			if_block_anchor = empty();
    			button0.hidden = button0_hidden_value = !/*connected*/ ctx[1];
    			add_location(button0, file$4, 231, 0, 6503);
    			button1.hidden = button1_hidden_value = !/*connected*/ ctx[1];
    			attr_dev(button1, "tooltip", "Read settings from the board");
    			attr_dev(button1, "class", "svelte-a19qck");
    			add_location(button1, file$4, 234, 2, 6579);
    			button2.hidden = button2_hidden_value = !/*connected*/ ctx[1];
    			attr_dev(button2, "tooltip", "Send config to board and bias with these values");
    			attr_dev(button2, "class", "svelte-a19qck");
    			add_location(button2, file$4, 238, 2, 6764);
    			button3.hidden = button3_hidden_value = !/*connected*/ ctx[1] || /*readonly*/ ctx[6];
    			attr_dev(button3, "tooltip", "save settings to board flash");
    			attr_dev(button3, "class", "svelte-a19qck");
    			add_location(button3, file$4, 242, 2, 6955);
    			button4.hidden = button4_hidden_value = !/*connected*/ ctx[1];
    			attr_dev(button4, "tooltip", "download settings to  a file");
    			attr_dev(button4, "class", "svelte-a19qck");
    			add_location(button4, file$4, 246, 2, 7125);
    			button5.hidden = button5_hidden_value = !/*connected*/ ctx[1];
    			attr_dev(button5, "tooltip", "load setting to webpage from a computer file");
    			attr_dev(button5, "class", "svelte-a19qck");
    			add_location(button5, file$4, 249, 2, 7259);
    			button6.hidden = button6_hidden_value = !/*connected*/ ctx[1];
    			attr_dev(button6, "tooltip", "change gui settings");
    			attr_dev(button6, "class", "svelte-a19qck");
    			add_location(button6, file$4, 253, 2, 7412);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			mount_component(svgicon0, button1, null);
    			append_dev(button1, t2);
    			mount_component(svgicon1, button1, null);
    			append_dev(button1, t3);
    			mount_component(svgicon2, button1, null);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, button2, anchor);
    			mount_component(svgicon3, button2, null);
    			append_dev(button2, t5);
    			mount_component(svgicon4, button2, null);
    			append_dev(button2, t6);
    			mount_component(svgicon5, button2, null);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, button3, anchor);
    			mount_component(svgicon6, button3, null);
    			mount_component(svgicon7, button3, null);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, button4, anchor);
    			mount_component(svgicon8, button4, null);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, button5, anchor);
    			mount_component(svgicon9, button5, null);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, button6, anchor);
    			mount_component(svgicon10, button6, null);
    			insert_dev(target, t11, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*disconnect*/ ctx[9], false, false, false),
    					listen_dev(button1, "click", /*fetch_from_board*/ ctx[10], false, false, false),
    					listen_dev(button2, "click", /*send*/ ctx[14], false, false, false),
    					listen_dev(button3, "click", /*save_board*/ ctx[13], false, false, false),
    					listen_dev(button4, "click", /*save_computer*/ ctx[11], false, false, false),
    					listen_dev(button5, "click", /*load_from_computer*/ ctx[12], false, false, false),
    					listen_dev(button6, "click", /*click_handler*/ ctx[18], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*connected*/ 2 && button0_hidden_value !== (button0_hidden_value = !/*connected*/ ctx[1])) {
    				prop_dev(button0, "hidden", button0_hidden_value);
    			}

    			if (!current || dirty[0] & /*connected*/ 2 && button1_hidden_value !== (button1_hidden_value = !/*connected*/ ctx[1])) {
    				prop_dev(button1, "hidden", button1_hidden_value);
    			}

    			if (!current || dirty[0] & /*connected*/ 2 && button2_hidden_value !== (button2_hidden_value = !/*connected*/ ctx[1])) {
    				prop_dev(button2, "hidden", button2_hidden_value);
    			}

    			if (!current || dirty[0] & /*connected, readonly*/ 66 && button3_hidden_value !== (button3_hidden_value = !/*connected*/ ctx[1] || /*readonly*/ ctx[6])) {
    				prop_dev(button3, "hidden", button3_hidden_value);
    			}

    			if (!current || dirty[0] & /*connected*/ 2 && button4_hidden_value !== (button4_hidden_value = !/*connected*/ ctx[1])) {
    				prop_dev(button4, "hidden", button4_hidden_value);
    			}

    			if (!current || dirty[0] & /*connected*/ 2 && button5_hidden_value !== (button5_hidden_value = !/*connected*/ ctx[1])) {
    				prop_dev(button5, "hidden", button5_hidden_value);
    			}

    			if (!current || dirty[0] & /*connected*/ 2 && button6_hidden_value !== (button6_hidden_value = !/*connected*/ ctx[1])) {
    				prop_dev(button6, "hidden", button6_hidden_value);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_2(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(svgicon0.$$.fragment, local);
    			transition_in(svgicon1.$$.fragment, local);
    			transition_in(svgicon2.$$.fragment, local);
    			transition_in(svgicon3.$$.fragment, local);
    			transition_in(svgicon4.$$.fragment, local);
    			transition_in(svgicon5.$$.fragment, local);
    			transition_in(svgicon6.$$.fragment, local);
    			transition_in(svgicon7.$$.fragment, local);
    			transition_in(svgicon8.$$.fragment, local);
    			transition_in(svgicon9.$$.fragment, local);
    			transition_in(svgicon10.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(svgicon0.$$.fragment, local);
    			transition_out(svgicon1.$$.fragment, local);
    			transition_out(svgicon2.$$.fragment, local);
    			transition_out(svgicon3.$$.fragment, local);
    			transition_out(svgicon4.$$.fragment, local);
    			transition_out(svgicon5.$$.fragment, local);
    			transition_out(svgicon6.$$.fragment, local);
    			transition_out(svgicon7.$$.fragment, local);
    			transition_out(svgicon8.$$.fragment, local);
    			transition_out(svgicon9.$$.fragment, local);
    			transition_out(svgicon10.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			destroy_component(svgicon0);
    			destroy_component(svgicon1);
    			destroy_component(svgicon2);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(button2);
    			destroy_component(svgicon3);
    			destroy_component(svgicon4);
    			destroy_component(svgicon5);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(button3);
    			destroy_component(svgicon6);
    			destroy_component(svgicon7);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(button4);
    			destroy_component(svgicon8);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(button5);
    			destroy_component(svgicon9);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(button6);
    			destroy_component(svgicon10);
    			if (detaching) detach_dev(t11);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(231:0) {#if (!show_settings) }",
    		ctx
    	});

    	return block;
    }

    // (262:2) {:else}
    function create_else_block$1(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Check if current source has power";
    			add_location(h2, file$4, 262, 2, 7725);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(262:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (258:2) {#if power}
    function create_if_block_2$2(ctx) {
    	let chtable;
    	let updating_title;
    	let updating_advanced;
    	let updating_data;
    	let t0;
    	let pre;
    	let t1_value = JSON.stringify(/*data*/ ctx[0]) + "";
    	let t1;
    	let current;

    	function chtable_title_binding(value) {
    		/*chtable_title_binding*/ ctx[19].call(null, value);
    	}

    	function chtable_advanced_binding(value) {
    		/*chtable_advanced_binding*/ ctx[20].call(null, value);
    	}

    	function chtable_data_binding(value) {
    		/*chtable_data_binding*/ ctx[21].call(null, value);
    	}

    	let chtable_props = {};

    	if (/*board_name*/ ctx[2] !== void 0) {
    		chtable_props.title = /*board_name*/ ctx[2];
    	}

    	if (/*advanced*/ ctx[4] !== void 0) {
    		chtable_props.advanced = /*advanced*/ ctx[4];
    	}

    	if (/*data*/ ctx[0] !== void 0) {
    		chtable_props.data = /*data*/ ctx[0];
    	}

    	chtable = new ChTable({ props: chtable_props, $$inline: true });
    	binding_callbacks.push(() => bind(chtable, "title", chtable_title_binding));
    	binding_callbacks.push(() => bind(chtable, "advanced", chtable_advanced_binding));
    	binding_callbacks.push(() => bind(chtable, "data", chtable_data_binding));
    	chtable.$on("blur", /*handle_blur*/ ctx[15]);

    	const block = {
    		c: function create() {
    			create_component(chtable.$$.fragment);
    			t0 = space();
    			pre = element("pre");
    			t1 = text(t1_value);
    			set_style(pre, "background", "#eee");
    			add_location(pre, file$4, 260, 0, 7654);
    		},
    		m: function mount(target, anchor) {
    			mount_component(chtable, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, pre, anchor);
    			append_dev(pre, t1);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const chtable_changes = {};

    			if (!updating_title && dirty[0] & /*board_name*/ 4) {
    				updating_title = true;
    				chtable_changes.title = /*board_name*/ ctx[2];
    				add_flush_callback(() => updating_title = false);
    			}

    			if (!updating_advanced && dirty[0] & /*advanced*/ 16) {
    				updating_advanced = true;
    				chtable_changes.advanced = /*advanced*/ ctx[4];
    				add_flush_callback(() => updating_advanced = false);
    			}

    			if (!updating_data && dirty[0] & /*data*/ 1) {
    				updating_data = true;
    				chtable_changes.data = /*data*/ ctx[0];
    				add_flush_callback(() => updating_data = false);
    			}

    			chtable.$set(chtable_changes);
    			if ((!current || dirty[0] & /*data*/ 1) && t1_value !== (t1_value = JSON.stringify(/*data*/ ctx[0]) + "")) set_data_dev(t1, t1_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chtable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chtable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(chtable, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(258:2) {#if power}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if ("serial" in navigator) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type();
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    async function getNewFileHandle() {
    	const options = {
    		types: [
    			{
    				description: "Text Files",
    				accept: { "text/plain": [".json"] }
    			}
    		]
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

    function find_change(a, b) {
    	let found = [];

    	for (let r = 0; r < 8; r++) {
    		for (let c = 0; c < 4; c++) {
    			// console.log('different',r,c,a[r][c], b[r][c], a[r][c]!=b[r][c]);
    			if (a[r][c] != b[r][c]) {
    				found = [r, c];
    				console.log("find_change found", r, c);
    				return found;
    			}
    		}
    	}

    	return found;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let fileHandle;
    	let port;
    	let connected = false;
    	let data = [];
    	let old_data;
    	let board_name = "no name";
    	let old_name = board_name;
    	let show_settings = false;
    	let advanced = true;
    	let on_blur = false;
    	let send_config = 2;
    	let serial_instance = serial_wrapper();
    	let ready = false;
    	let ready_count = 0;
    	let readonly;
    	let power = true;

    	async function connect() {
    		$$invalidate(1, [connected, port] = await serial_instance.connect(), connected);

    		// read config and name from board
    		await fetch_from_board();

    		// data = await serial_instance.fetch_values();
    		// old_data = JSON.parse(JSON.stringify(data));
    		console.log("old_data", old_data, old_data == data);

    		$$invalidate(2, board_name = await serial_instance.fetch_name());
    		old_name = board_name;
    		$$invalidate(6, readonly = await fetch_rw());
    		console.log("connected", connected, port, readonly);
    	}

    	async function disconnect() {
    		try {
    			port.close();
    			$$invalidate(0, data = []);
    			$$invalidate(0, data);
    			$$invalidate(2, board_name = "");
    			old_name = "";
    			$$invalidate(1, connected = false);
    		} catch(e) {
    			console.log("error message", e.message);
    		}
    	}

    	async function fetch_from_board() {
    		$$invalidate(0, data = await serial_instance.fetch_values());

    		for (let row of data) {
    			if (row.length == 3) row.push(32768);
    		}

    		$$invalidate(0, data);
    		$$invalidate(16, old_data = JSON.parse(JSON.stringify(data)));
    		console.log(data);
    		const status_byte = await serial_instance.get_status();
    		$$invalidate(7, power = status_byte == 7);
    		console.log("status", status_byte, power);
    	}

    	async function fetch_rw() {
    		let msg = "R?\r\n";
    		let [value] = await serial_instance.query(msg);
    		let [first, ...second] = value.split(" ");
    		return second.join(" ") == "True";
    	}

    	async function write_value(channel, value) {
    		let msg = channel + " " + value + "\r\n";
    		serial_instance.write(msg);
    	}

    	async function save_computer() {
    		console.log("save to computer");
    		let fileHandle = await getNewFileHandle();
    		await writeFile(fileHandle, JSON.stringify(data));
    		console.log(JSON.stringify(data));
    	}

    	async function load_from_computer() {
    		console.log("load from computer");
    		fileHandle = await window.showOpenFilePicker();
    		console.log("fileHandle", fileHandle[0]);
    		const file = await fileHandle[0].getFile();
    		const contents = await file.text();

    		// Need to check that that JSON has the right schema
    		$$invalidate(0, data = JSON.parse(contents));

    		$$invalidate(0, data = data); // refreshes html page
    		console.log(data);
    	}

    	async function save_board() {
    		console.log("save on board");
    		serial_instance.write("J\r\n");
    		let response = await serial_instance.readlines(1);
    		console.log("save on board response", response);
    	}

    	async function send_cmd(cmd) {
    		console.log("SND one line command", cmd);
    		serial_instance.write(cmd);
    		let response = serial_instance.readlines(2);
    		console.log("response", response);
    	}

    	async function send_one(i) {
    		const status_byte = await serial_instance.get_status();
    		$$invalidate(7, power = status_byte == 7);
    		console.log("status", status_byte, power);

    		if (!power) {
    			console.log("not written, no power");
    			return;
    		}

    		console.log("send_one write");
    		await write_value(i, JSON.stringify(data[i]));
    		console.log("send_one readback response");
    		let lines = await serial_instance.readlines(3);
    		console.log("send_one: got from device:", lines);
    		return lines;
    	}

    	async function send() {
    		console.log("send", data);

    		for (let i = 0; i < 8; i++) {
    			await send_one(i);
    		}
    	}

    	async function handle_blur(e) {
    		console.log("App.svelte handle blur/click", e.detail);

    		// First check if board name changed
    		if (old_name != board_name) {
    			console.log("board name edited", old_name, board_name);
    			old_name = board_name;
    			await send_cmd("N " + board_name + "\r\n");
    		} else {
    			if (send_config == 2) {
    				$$invalidate(17, ready = true);
    			}
    		}
    	}

    	async function send_one_wrapper(found) {
    		let res;
    		res = await serial_instance.fetch_value(found[0]);
    		console.log("before", res);
    		res = await send_one(found[0]);

    		// console.log(res)
    		res = await serial_instance.fetch_value(found[0]);

    		console.log("after", res);
    		$$invalidate(16, old_data = JSON.parse(JSON.stringify(data)));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(3, show_settings = true);

    	function chtable_title_binding(value) {
    		board_name = value;
    		$$invalidate(2, board_name);
    	}

    	function chtable_advanced_binding(value) {
    		advanced = value;
    		$$invalidate(4, advanced);
    	}

    	function chtable_data_binding(value) {
    		data = value;
    		$$invalidate(0, data);
    	}

    	function settings_show_dac_offset_binding(value) {
    		advanced = value;
    		$$invalidate(4, advanced);
    	}

    	function settings_selected_option_binding(value) {
    		send_config = value;
    		$$invalidate(5, send_config);
    	}

    	const click_handler_1 = () => {
    		$$invalidate(3, show_settings = false);
    	};

    	$$self.$capture_state = () => ({
    		download,
    		upload,
    		computer,
    		right,
    		circle_up,
    		artboard,
    		fileup,
    		filedown,
    		floppy,
    		cog,
    		ChTable,
    		SvgIcon,
    		Settings,
    		serial_wrapper,
    		fileHandle,
    		port,
    		connected,
    		data,
    		old_data,
    		board_name,
    		old_name,
    		show_settings,
    		advanced,
    		on_blur,
    		send_config,
    		serial_instance,
    		ready,
    		ready_count,
    		readonly,
    		power,
    		connect,
    		disconnect,
    		fetch_from_board,
    		fetch_rw,
    		write_value,
    		save_computer,
    		getNewFileHandle,
    		writeFile,
    		load_from_computer,
    		save_board,
    		send_cmd,
    		send_one,
    		send,
    		find_change,
    		handle_blur,
    		send_one_wrapper
    	});

    	$$self.$inject_state = $$props => {
    		if ("fileHandle" in $$props) fileHandle = $$props.fileHandle;
    		if ("port" in $$props) port = $$props.port;
    		if ("connected" in $$props) $$invalidate(1, connected = $$props.connected);
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("old_data" in $$props) $$invalidate(16, old_data = $$props.old_data);
    		if ("board_name" in $$props) $$invalidate(2, board_name = $$props.board_name);
    		if ("old_name" in $$props) old_name = $$props.old_name;
    		if ("show_settings" in $$props) $$invalidate(3, show_settings = $$props.show_settings);
    		if ("advanced" in $$props) $$invalidate(4, advanced = $$props.advanced);
    		if ("on_blur" in $$props) on_blur = $$props.on_blur;
    		if ("send_config" in $$props) $$invalidate(5, send_config = $$props.send_config);
    		if ("serial_instance" in $$props) serial_instance = $$props.serial_instance;
    		if ("ready" in $$props) $$invalidate(17, ready = $$props.ready);
    		if ("ready_count" in $$props) ready_count = $$props.ready_count;
    		if ("readonly" in $$props) $$invalidate(6, readonly = $$props.readonly);
    		if ("power" in $$props) $$invalidate(7, power = $$props.power);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*data, ready, old_data*/ 196609) {
    			 {
    				if (data.length > 0) {
    					if (ready) {
    						console.log("$");
    						let found = find_change(old_data, data);
    						console.log("found", found);

    						if (found.length > 0) {
    							console.log("found change in row", found);
    							send_one_wrapper(found);
    							$$invalidate(17, ready = false);
    						}
    					}
    				}
    			}
    		}
    	};

    	return [
    		data,
    		connected,
    		board_name,
    		show_settings,
    		advanced,
    		send_config,
    		readonly,
    		power,
    		connect,
    		disconnect,
    		fetch_from_board,
    		save_computer,
    		load_from_computer,
    		save_board,
    		send,
    		handle_blur,
    		old_data,
    		ready,
    		click_handler,
    		chtable_title_binding,
    		chtable_advanced_binding,
    		chtable_data_binding,
    		settings_show_dac_offset_binding,
    		settings_selected_option_binding,
    		click_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
