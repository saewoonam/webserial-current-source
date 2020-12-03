
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
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
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

    /* src/input.svelte generated by Svelte v3.30.1 */

    const { console: console_1 } = globals;
    const file = "src/input.svelte";
    const get_selectCaret_slot_changes = dirty => ({});
    const get_selectCaret_slot_context = ctx => ({});

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i].label;
    	child_ctx[0] = list[i].value;
    	child_ctx[30] = i;
    	return child_ctx;
    }

    // (113:0) {:else}
    function create_else_block(ctx) {
    	let span;
    	let t0;
    	let t1;
    	let current;
    	let mounted;
    	let dispose;
    	const selectCaret_slot_template = /*#slots*/ ctx[23].selectCaret;
    	const selectCaret_slot = create_slot(selectCaret_slot_template, ctx, /*$$scope*/ ctx[22], get_selectCaret_slot_context);
    	const selectCaret_slot_or_fallback = selectCaret_slot || fallback_block(ctx);

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text(/*label*/ ctx[15]);
    			t1 = space();
    			if (selectCaret_slot_or_fallback) selectCaret_slot_or_fallback.c();
    			attr_dev(span, "class", /*labelClasses*/ ctx[3]);
    			add_location(span, file, 113, 2, 2448);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);

    			if (selectCaret_slot_or_fallback) {
    				selectCaret_slot_or_fallback.m(span, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*toggle*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*label*/ 32768) set_data_dev(t0, /*label*/ ctx[15]);

    			if (selectCaret_slot) {
    				if (selectCaret_slot.p && dirty & /*$$scope*/ 4194304) {
    					update_slot(selectCaret_slot, selectCaret_slot_template, ctx, /*$$scope*/ ctx[22], dirty, get_selectCaret_slot_changes, get_selectCaret_slot_context);
    				}
    			} else {
    				if (selectCaret_slot_or_fallback && selectCaret_slot_or_fallback.p && dirty & /*isSelect*/ 16384) {
    					selectCaret_slot_or_fallback.p(ctx, dirty);
    				}
    			}

    			if (!current || dirty & /*labelClasses*/ 8) {
    				attr_dev(span, "class", /*labelClasses*/ ctx[3]);
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
    			if (detaching) detach_dev(span);
    			if (selectCaret_slot_or_fallback) selectCaret_slot_or_fallback.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(113:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (95:30) 
    function create_if_block_2(ctx) {
    	let select;
    	let if_block_anchor;
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

    			attr_dev(select, "class", /*inputClasses*/ ctx[4]);
    			add_location(select, file, 95, 2, 2075);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, select, anchor);
    			if (if_block) if_block.m(select, null);
    			append_dev(select, if_block_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*value*/ ctx[0]);
    			/*select_binding*/ ctx[26](select);

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

    			if (dirty & /*options*/ 128) {
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

    			if (dirty & /*inputClasses*/ 16) {
    				attr_dev(select, "class", /*inputClasses*/ ctx[4]);
    			}

    			if (dirty & /*value*/ 1) {
    				select_option(select, /*value*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(select);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    			/*select_binding*/ ctx[26](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(95:30) ",
    		ctx
    	});

    	return block;
    }

    // (85:32) 
    function create_if_block_1(ctx) {
    	let textarea;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			attr_dev(textarea, "class", /*inputClasses*/ ctx[4]);
    			attr_dev(textarea, "placeholder", /*placeholder*/ ctx[2]);
    			textarea.value = /*value*/ ctx[0];
    			attr_dev(textarea, "rows", /*rows*/ ctx[5]);
    			attr_dev(textarea, "cols", /*cols*/ ctx[6]);
    			add_location(textarea, file, 85, 2, 1876);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, textarea, anchor);
    			/*textarea_binding*/ ctx[25](textarea);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "input", /*handleInput*/ ctx[17], false, false, false),
    					listen_dev(textarea, "blur", /*handleBlur*/ ctx[19], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*inputClasses*/ 16) {
    				attr_dev(textarea, "class", /*inputClasses*/ ctx[4]);
    			}

    			if (dirty & /*placeholder*/ 4) {
    				attr_dev(textarea, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*value*/ 1) {
    				prop_dev(textarea, "value", /*value*/ ctx[0]);
    			}

    			if (dirty & /*rows*/ 32) {
    				attr_dev(textarea, "rows", /*rows*/ ctx[5]);
    			}

    			if (dirty & /*cols*/ 64) {
    				attr_dev(textarea, "cols", /*cols*/ ctx[6]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			/*textarea_binding*/ ctx[25](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(85:32) ",
    		ctx
    	});

    	return block;
    }

    // (74:0) {#if editing && (isText || isNumber)}
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
    			add_location(input, file, 74, 2, 1650);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			input.value = input_data.value;
    			/*input_binding*/ ctx[24](input);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*handleInput*/ ctx[17], false, false, false),
    					listen_dev(input, "keyup", /*handleEnter*/ ctx[18], false, false, false),
    					listen_dev(input, "blur", /*handleBlur*/ ctx[19], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			set_attributes(input, input_data = get_spread_update(input_levels, [
    				dirty & /*inputClasses*/ 16 && { class: /*inputClasses*/ ctx[4] },
    				dirty & /*type*/ 2 && { type: /*type*/ ctx[1] },
    				dirty & /*value*/ 1 && input.value !== /*value*/ ctx[0] && { value: /*value*/ ctx[0] },
    				dirty & /*placeholder*/ 4 && { placeholder: /*placeholder*/ ctx[2] },
    				dirty & /*extras*/ 256 && /*extras*/ ctx[8]
    			]));

    			if ("value" in input_data) {
    				input.value = input_data.value;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			/*input_binding*/ ctx[24](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(74:0) {#if editing && (isText || isNumber)}",
    		ctx
    	});

    	return block;
    }

    // (119:6) {#if isSelect}
    function create_if_block_4(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "▼";
    			add_location(span, file, 119, 8, 2573);
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
    		source: "(119:6) {#if isSelect}",
    		ctx
    	});

    	return block;
    }

    // (118:29)        
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
    		source: "(118:29)        ",
    		ctx
    	});

    	return block;
    }

    // (102:4) {#if placeholder}
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
    			add_location(option, file, 102, 6, 2227);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*placeholder*/ 4) set_data_dev(t, /*placeholder*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(102:4) {#if placeholder}",
    		ctx
    	});

    	return block;
    }

    // (105:4) {#each options as { label, value }
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
    			attr_dev(option, "key", option_key_value = /*i*/ ctx[30]);
    			option.__value = option_value_value = /*value*/ ctx[0];
    			option.value = option.__value;
    			add_location(option, file, 105, 6, 2341);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*options*/ 128 && t0_value !== (t0_value = /*label*/ ctx[15] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*options*/ 128 && option_value_value !== (option_value_value = /*value*/ ctx[0])) {
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
    		source: "(105:4) {#each options as { label, value }",
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
    		p: function update(ctx, [dirty]) {
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
    	};

    	const handleBlur = e => {
    		toggle();
    		console.log("blur", e);

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
    		$$invalidate(21, selectedIndex = placeholder
    		? e.target.selectedIndex - 1
    		: e.target.selectedIndex);

    		$$invalidate(0, value = options[selectedIndex].value);
    	};

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
    		if ("$$scope" in $$props) $$invalidate(22, $$scope = $$props.$$scope);
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
    		toggle,
    		handleInput,
    		handleEnter,
    		handleBlur,
    		handleChange,
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
    		if ("selectedIndex" in $$props) $$invalidate(21, selectedIndex = $$props.selectedIndex);
    		if ("e" in $$props) e = $$props.e;
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
    		if ($$self.$$.dirty & /*type*/ 2) {
    			// Computed
    			 $$invalidate(9, isText = type === "text");
    		}

    		if ($$self.$$.dirty & /*type*/ 2) {
    			 $$invalidate(10, isNumber = type === "number");
    		}

    		if ($$self.$$.dirty & /*type*/ 2) {
    			 $$invalidate(11, isTextArea = type === "textarea");
    		}

    		if ($$self.$$.dirty & /*type*/ 2) {
    			 $$invalidate(14, isSelect = type === "select");
    		}

    		if ($$self.$$.dirty & /*isNumber, value, placeholder, isText, isTextArea, selectedIndex, options*/ 2100869) {
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

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			value: 0,
    			type: 1,
    			placeholder: 2,
    			labelClasses: 3,
    			inputClasses: 4,
    			rows: 5,
    			cols: 6,
    			options: 7,
    			extras: 8
    		});

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
    const file$1 = "src/ChTable.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	child_ctx[8] = list;
    	child_ctx[9] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (25:2) {#if data.length>0}
    function create_if_block$1(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*columns*/ ctx[2];
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
    			if (dirty & /*columns*/ 4) {
    				each_value_1 = /*columns*/ ctx[2];
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
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(25:2) {#if data.length>0}",
    		ctx
    	});

    	return block;
    }

    // (26:2) {#each columns as column}
    function create_each_block_1(ctx) {
    	let th;
    	let t_value = /*column*/ ctx[10] + "";
    	let t;

    	const block = {
    		c: function create() {
    			th = element("th");
    			t = text(t_value);
    			add_location(th, file$1, 26, 2, 466);
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
    		source: "(26:2) {#each columns as column}",
    		ctx
    	});

    	return block;
    }

    // (31:1) {#each data as row}
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
    	let current;
    	let mounted;
    	let dispose;

    	function inlineinput20_value_binding(value) {
    		/*inlineinput20_value_binding*/ ctx[3].call(null, value, /*row*/ ctx[7]);
    	}

    	let inlineinput20_props = { extras: { style: "width: 5em;" } };

    	if (/*row*/ ctx[7][0] !== void 0) {
    		inlineinput20_props.value = /*row*/ ctx[7][0];
    	}

    	inlineinput20 = new Input({
    			props: inlineinput20_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inlineinput20, "value", inlineinput20_value_binding));

    	function inlineinput21_value_binding(value) {
    		/*inlineinput21_value_binding*/ ctx[4].call(null, value, /*row*/ ctx[7]);
    	}

    	let inlineinput21_props = {
    		type: "number",
    		extras: /*extras*/ ctx[1]
    	};

    	if (/*row*/ ctx[7][1] !== void 0) {
    		inlineinput21_props.value = /*row*/ ctx[7][1];
    	}

    	inlineinput21 = new Input({
    			props: inlineinput21_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(inlineinput21, "value", inlineinput21_value_binding));

    	function input_change_handler() {
    		/*input_change_handler*/ ctx[5].call(input, /*each_value*/ ctx[8], /*row_index*/ ctx[9]);
    	}

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
    			attr_dev(td0, "class", "svelte-1r0d2qj");
    			add_location(td0, file$1, 32, 2, 539);
    			attr_dev(td1, "class", "svelte-1r0d2qj");
    			add_location(td1, file$1, 33, 2, 618);
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file$1, 34, 15, 708);
    			attr_dev(td2, "class", "svelte-1r0d2qj");
    			add_location(td2, file$1, 34, 2, 695);
    			attr_dev(tr, "class", "svelte-1r0d2qj");
    			add_location(tr, file$1, 31, 1, 532);
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
    			input.checked = /*row*/ ctx[7][2];
    			append_dev(tr, t2);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", input_change_handler);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const inlineinput20_changes = {};

    			if (!updating_value && dirty & /*data*/ 1) {
    				updating_value = true;
    				inlineinput20_changes.value = /*row*/ ctx[7][0];
    				add_flush_callback(() => updating_value = false);
    			}

    			inlineinput20.$set(inlineinput20_changes);
    			const inlineinput21_changes = {};

    			if (!updating_value_1 && dirty & /*data*/ 1) {
    				updating_value_1 = true;
    				inlineinput21_changes.value = /*row*/ ctx[7][1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			inlineinput21.$set(inlineinput21_changes);

    			if (dirty & /*data*/ 1) {
    				input.checked = /*row*/ ctx[7][2];
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(inlineinput20.$$.fragment, local);
    			transition_in(inlineinput21.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(inlineinput20.$$.fragment, local);
    			transition_out(inlineinput21.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			destroy_component(inlineinput20);
    			destroy_component(inlineinput21);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(31:1) {#each data as row}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let table;
    	let tr;
    	let t;
    	let current;
    	let if_block = /*data*/ ctx[0].length > 0 && create_if_block$1(ctx);
    	let each_value = /*data*/ ctx[0];
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
    			table = element("table");
    			tr = element("tr");
    			if (if_block) if_block.c();
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(tr, file$1, 23, 1, 409);
    			add_location(table, file$1, 22, 0, 399);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, tr);
    			if (if_block) if_block.m(tr, null);
    			append_dev(table, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(table, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*data*/ ctx[0].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(tr, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*data, extras*/ 3) {
    				each_value = /*data*/ ctx[0];
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

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			if (if_block) if_block.d();
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

    	let extras = {
    		min: -100,
    		max: 100,
    		style: "width: 5em;"
    	};

    	let min = 1;
    	let columns = ["Name", "value", "zero"];
    	let { data = [] } = $$props;
    	const writable_props = ["data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ChTable> was created with unknown prop '${key}'`);
    	});

    	function inlineinput20_value_binding(value, row) {
    		row[0] = value;
    		$$invalidate(0, data);
    	}

    	function inlineinput21_value_binding(value, row) {
    		row[1] = value;
    		$$invalidate(0, data);
    	}

    	function input_change_handler(each_value, row_index) {
    		each_value[row_index][2] = this.checked;
    		$$invalidate(0, data);
    	}

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({ InlineInput2: Input, extras, min, columns, data });

    	$$self.$inject_state = $$props => {
    		if ("extras" in $$props) $$invalidate(1, extras = $$props.extras);
    		if ("min" in $$props) min = $$props.min;
    		if ("columns" in $$props) $$invalidate(2, columns = $$props.columns);
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		data,
    		extras,
    		columns,
    		inlineinput20_value_binding,
    		inlineinput21_value_binding,
    		input_change_handler
    	];
    }

    class ChTable extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ChTable",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get data() {
    		throw new Error("<ChTable>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
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

    /* src/artboard.svelte generated by Svelte v3.30.1 */

    const file$3 = "src/artboard.svelte";

    function create_fragment$3(ctx) {
    	let svg;
    	let path;
    	let rect;
    	let line0;
    	let line1;
    	let line2;
    	let line3;
    	let line4;
    	let line5;
    	let line6;
    	let line7;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			rect = svg_element("rect");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			line2 = svg_element("line");
    			line3 = svg_element("line");
    			line4 = svg_element("line");
    			line5 = svg_element("line");
    			line6 = svg_element("line");
    			line7 = svg_element("line");
    			attr_dev(path, "stroke", "none");
    			attr_dev(path, "d", "M0 0h24v24H0z");
    			attr_dev(path, "fill", "none");
    			add_location(path, file$3, 1, 2, 227);
    			attr_dev(rect, "x", "8");
    			attr_dev(rect, "y", "8");
    			attr_dev(rect, "width", "8");
    			attr_dev(rect, "height", "8");
    			attr_dev(rect, "rx", "1");
    			add_location(rect, file$3, 2, 2, 281);
    			attr_dev(line0, "x1", "3");
    			attr_dev(line0, "y1", "8");
    			attr_dev(line0, "x2", "4");
    			attr_dev(line0, "y2", "8");
    			add_location(line0, file$3, 3, 2, 332);
    			attr_dev(line1, "x1", "3");
    			attr_dev(line1, "y1", "16");
    			attr_dev(line1, "x2", "4");
    			attr_dev(line1, "y2", "16");
    			add_location(line1, file$3, 4, 2, 371);
    			attr_dev(line2, "x1", "8");
    			attr_dev(line2, "y1", "3");
    			attr_dev(line2, "x2", "8");
    			attr_dev(line2, "y2", "4");
    			add_location(line2, file$3, 5, 2, 412);
    			attr_dev(line3, "x1", "16");
    			attr_dev(line3, "y1", "3");
    			attr_dev(line3, "x2", "16");
    			attr_dev(line3, "y2", "4");
    			add_location(line3, file$3, 6, 2, 451);
    			attr_dev(line4, "x1", "20");
    			attr_dev(line4, "y1", "8");
    			attr_dev(line4, "x2", "21");
    			attr_dev(line4, "y2", "8");
    			add_location(line4, file$3, 7, 2, 492);
    			attr_dev(line5, "x1", "20");
    			attr_dev(line5, "y1", "16");
    			attr_dev(line5, "x2", "21");
    			attr_dev(line5, "y2", "16");
    			add_location(line5, file$3, 8, 2, 533);
    			attr_dev(line6, "x1", "8");
    			attr_dev(line6, "y1", "20");
    			attr_dev(line6, "x2", "8");
    			attr_dev(line6, "y2", "21");
    			add_location(line6, file$3, 9, 2, 576);
    			attr_dev(line7, "x1", "16");
    			attr_dev(line7, "y1", "20");
    			attr_dev(line7, "x2", "16");
    			attr_dev(line7, "y2", "21");
    			add_location(line7, file$3, 10, 2, 617);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "icon icon-tabler icon-tabler-artboard");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke-width", "1.5");
    			attr_dev(svg, "stroke", "#2c3e50");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "stroke-linecap", "round");
    			attr_dev(svg, "stroke-linejoin", "round");
    			add_location(svg, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    			append_dev(svg, rect);
    			append_dev(svg, line0);
    			append_dev(svg, line1);
    			append_dev(svg, line2);
    			append_dev(svg, line3);
    			append_dev(svg, line4);
    			append_dev(svg, line5);
    			append_dev(svg, line6);
    			append_dev(svg, line7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
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

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Artboard", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Artboard> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Artboard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Artboard",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/file_down.svelte generated by Svelte v3.30.1 */

    const file$4 = "src/file_down.svelte";

    function create_fragment$4(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;
    	let line;
    	let polyline;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			line = svg_element("line");
    			polyline = svg_element("polyline");
    			attr_dev(path0, "stroke", "none");
    			attr_dev(path0, "d", "M0 0h24v24H0z");
    			attr_dev(path0, "fill", "none");
    			add_location(path0, file$4, 1, 2, 232);
    			attr_dev(path1, "d", "M14 3v4a1 1 0 0 0 1 1h4");
    			add_location(path1, file$4, 2, 2, 286);
    			attr_dev(path2, "d", "M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z");
    			add_location(path2, file$4, 3, 2, 325);
    			attr_dev(line, "x1", "12");
    			attr_dev(line, "y1", "11");
    			attr_dev(line, "x2", "12");
    			attr_dev(line, "y2", "17");
    			add_location(line, file$4, 4, 2, 411);
    			attr_dev(polyline, "points", "9 14 12 17 15 14");
    			add_location(polyline, file$4, 5, 2, 454);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "icon icon-tabler icon-tabler-file-download");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke-width", "1.5");
    			attr_dev(svg, "stroke", "#2c3e50");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "stroke-linecap", "round");
    			attr_dev(svg, "stroke-linejoin", "round");
    			add_location(svg, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    			append_dev(svg, line);
    			append_dev(svg, polyline);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
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

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("File_down", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<File_down> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class File_down extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "File_down",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/file_up.svelte generated by Svelte v3.30.1 */

    const file$5 = "src/file_up.svelte";

    function create_fragment$5(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;
    	let line;
    	let polyline;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			line = svg_element("line");
    			polyline = svg_element("polyline");
    			attr_dev(path0, "stroke", "none");
    			attr_dev(path0, "d", "M0 0h24v24H0z");
    			attr_dev(path0, "fill", "none");
    			add_location(path0, file$5, 1, 2, 230);
    			attr_dev(path1, "d", "M14 3v4a1 1 0 0 0 1 1h4");
    			add_location(path1, file$5, 2, 2, 284);
    			attr_dev(path2, "d", "M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z");
    			add_location(path2, file$5, 3, 2, 323);
    			attr_dev(line, "x1", "12");
    			attr_dev(line, "y1", "11");
    			attr_dev(line, "x2", "12");
    			attr_dev(line, "y2", "17");
    			add_location(line, file$5, 4, 2, 409);
    			attr_dev(polyline, "points", "9 14 12 11 15 14");
    			add_location(polyline, file$5, 5, 2, 452);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "icon icon-tabler icon-tabler-file-upload");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke-width", "1.5");
    			attr_dev(svg, "stroke", "#2c3e50");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "stroke-linecap", "round");
    			attr_dev(svg, "stroke-linejoin", "round");
    			add_location(svg, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    			append_dev(svg, line);
    			append_dev(svg, polyline);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("File_up", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<File_up> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class File_up extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "File_up",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/floppy.svelte generated by Svelte v3.30.1 */

    const file$6 = "src/floppy.svelte";

    function create_fragment$6(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let circle;
    	let polyline;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			circle = svg_element("circle");
    			polyline = svg_element("polyline");
    			attr_dev(path0, "stroke", "none");
    			attr_dev(path0, "d", "M0 0h24v24H0z");
    			attr_dev(path0, "fill", "none");
    			add_location(path0, file$6, 1, 2, 232);
    			attr_dev(path1, "d", "M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2");
    			add_location(path1, file$6, 2, 2, 286);
    			attr_dev(circle, "cx", "12");
    			attr_dev(circle, "cy", "14");
    			attr_dev(circle, "r", "2");
    			add_location(circle, file$6, 3, 2, 370);
    			attr_dev(polyline, "points", "14 4 14 8 8 8 8 4");
    			add_location(polyline, file$6, 4, 2, 405);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "icon icon-tabler icon-tabler-device-floppy");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke-width", "1.5");
    			attr_dev(svg, "stroke", "#2c3e50");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "stroke-linecap", "round");
    			attr_dev(svg, "stroke-linejoin", "round");
    			add_location(svg, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, circle);
    			append_dev(svg, polyline);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Floppy", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Floppy> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Floppy extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Floppy",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.30.1 */

    const { console: console_1$1 } = globals;
    const file$7 = "src/App.svelte";

    // (263:0) {:else}
    function create_else_block$1(ctx) {
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
    			add_location(h20, file$7, 263, 2, 7297);
    			add_location(h21, file$7, 264, 2, 7365);
    			add_location(h30, file$7, 265, 2, 7418);
    			add_location(h31, file$7, 267, 2, 7558);
    			add_location(h32, file$7, 269, 2, 7639);
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
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(263:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (228:0) {#if ('serial' in navigator)}
    function create_if_block$2(ctx) {
    	let button0;
    	let t0;
    	let t1;
    	let button1;
    	let t2;
    	let button1_hidden_value;
    	let t3;
    	let button2;
    	let board0;
    	let t4;
    	let svgicon0;
    	let t5;
    	let svgicon1;
    	let button2_hidden_value;
    	let t6;
    	let button3;
    	let svgicon2;
    	let t7;
    	let svgicon3;
    	let t8;
    	let board1;
    	let button3_hidden_value;
    	let t9;
    	let button4;
    	let board2;
    	let floppy;
    	let button4_hidden_value;
    	let t10;
    	let button5;
    	let filedown;
    	let button5_hidden_value;
    	let t11;
    	let button6;
    	let fileup;
    	let button6_hidden_value;
    	let t12;
    	let chtable;
    	let current;
    	let mounted;
    	let dispose;
    	board0 = new Artboard({ $$inline: true });
    	svgicon0 = new SvgIcon({ props: { d: right }, $$inline: true });
    	svgicon1 = new SvgIcon({ props: { d: computer }, $$inline: true });
    	svgicon2 = new SvgIcon({ props: { d: computer }, $$inline: true });
    	svgicon3 = new SvgIcon({ props: { d: right }, $$inline: true });
    	board1 = new Artboard({ $$inline: true });
    	board2 = new Artboard({ $$inline: true });
    	floppy = new Floppy({ $$inline: true });
    	filedown = new File_down({ $$inline: true });
    	fileup = new File_up({ $$inline: true });

    	chtable = new ChTable({
    			props: { data: /*data*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			t0 = text("connect");
    			t1 = space();
    			button1 = element("button");
    			t2 = text("disconnect");
    			t3 = space();
    			button2 = element("button");
    			create_component(board0.$$.fragment);
    			t4 = space();
    			create_component(svgicon0.$$.fragment);
    			t5 = space();
    			create_component(svgicon1.$$.fragment);
    			t6 = space();
    			button3 = element("button");
    			create_component(svgicon2.$$.fragment);
    			t7 = space();
    			create_component(svgicon3.$$.fragment);
    			t8 = space();
    			create_component(board1.$$.fragment);
    			t9 = space();
    			button4 = element("button");
    			create_component(board2.$$.fragment);
    			create_component(floppy.$$.fragment);
    			t10 = space();
    			button5 = element("button");
    			create_component(filedown.$$.fragment);
    			t11 = space();
    			button6 = element("button");
    			create_component(fileup.$$.fragment);
    			t12 = space();
    			create_component(chtable.$$.fragment);
    			button0.hidden = /*connected*/ ctx[0];
    			add_location(button0, file$7, 228, 0, 6238);
    			button1.hidden = button1_hidden_value = !/*connected*/ ctx[0];
    			add_location(button1, file$7, 231, 0, 6305);
    			button2.hidden = button2_hidden_value = !/*connected*/ ctx[0];
    			attr_dev(button2, "tooltip", "Read settings from the board");
    			attr_dev(button2, "class", "svelte-a19qck");
    			add_location(button2, file$7, 234, 2, 6381);
    			button3.hidden = button3_hidden_value = !/*connected*/ ctx[0];
    			attr_dev(button3, "tooltip", "Send config to board and bias with these values");
    			attr_dev(button3, "class", "svelte-a19qck");
    			add_location(button3, file$7, 238, 2, 6544);
    			button4.hidden = button4_hidden_value = !/*connected*/ ctx[0];
    			attr_dev(button4, "tooltip", "save settings to board flash");
    			attr_dev(button4, "class", "svelte-a19qck");
    			add_location(button4, file$7, 242, 2, 6720);
    			button5.hidden = button5_hidden_value = !/*connected*/ ctx[0];
    			attr_dev(button5, "tooltip", "download settings to  a file");
    			attr_dev(button5, "class", "svelte-a19qck");
    			add_location(button5, file$7, 254, 2, 7006);
    			button6.hidden = button6_hidden_value = !/*connected*/ ctx[0];
    			attr_dev(button6, "tooltip", "load setting to webpage from a computer file");
    			attr_dev(button6, "class", "svelte-a19qck");
    			add_location(button6, file$7, 257, 2, 7128);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, t2);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button2, anchor);
    			mount_component(board0, button2, null);
    			append_dev(button2, t4);
    			mount_component(svgicon0, button2, null);
    			append_dev(button2, t5);
    			mount_component(svgicon1, button2, null);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, button3, anchor);
    			mount_component(svgicon2, button3, null);
    			append_dev(button3, t7);
    			mount_component(svgicon3, button3, null);
    			append_dev(button3, t8);
    			mount_component(board1, button3, null);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, button4, anchor);
    			mount_component(board2, button4, null);
    			mount_component(floppy, button4, null);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, button5, anchor);
    			mount_component(filedown, button5, null);
    			insert_dev(target, t11, anchor);
    			insert_dev(target, button6, anchor);
    			mount_component(fileup, button6, null);
    			insert_dev(target, t12, anchor);
    			mount_component(chtable, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*connect*/ ctx[2], false, false, false),
    					listen_dev(button1, "click", /*disconnect*/ ctx[3], false, false, false),
    					listen_dev(button2, "click", /*fetchtest*/ ctx[4], false, false, false),
    					listen_dev(button3, "click", /*send*/ ctx[8], false, false, false),
    					listen_dev(button4, "click", /*save_board*/ ctx[7], false, false, false),
    					listen_dev(button5, "click", /*save_computer*/ ctx[5], false, false, false),
    					listen_dev(button6, "click", /*load_from_computer*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*connected*/ 1) {
    				prop_dev(button0, "hidden", /*connected*/ ctx[0]);
    			}

    			if (!current || dirty & /*connected*/ 1 && button1_hidden_value !== (button1_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button1, "hidden", button1_hidden_value);
    			}

    			if (!current || dirty & /*connected*/ 1 && button2_hidden_value !== (button2_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button2, "hidden", button2_hidden_value);
    			}

    			if (!current || dirty & /*connected*/ 1 && button3_hidden_value !== (button3_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button3, "hidden", button3_hidden_value);
    			}

    			if (!current || dirty & /*connected*/ 1 && button4_hidden_value !== (button4_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button4, "hidden", button4_hidden_value);
    			}

    			if (!current || dirty & /*connected*/ 1 && button5_hidden_value !== (button5_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button5, "hidden", button5_hidden_value);
    			}

    			if (!current || dirty & /*connected*/ 1 && button6_hidden_value !== (button6_hidden_value = !/*connected*/ ctx[0])) {
    				prop_dev(button6, "hidden", button6_hidden_value);
    			}

    			const chtable_changes = {};
    			if (dirty & /*data*/ 2) chtable_changes.data = /*data*/ ctx[1];
    			chtable.$set(chtable_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(board0.$$.fragment, local);
    			transition_in(svgicon0.$$.fragment, local);
    			transition_in(svgicon1.$$.fragment, local);
    			transition_in(svgicon2.$$.fragment, local);
    			transition_in(svgicon3.$$.fragment, local);
    			transition_in(board1.$$.fragment, local);
    			transition_in(board2.$$.fragment, local);
    			transition_in(floppy.$$.fragment, local);
    			transition_in(filedown.$$.fragment, local);
    			transition_in(fileup.$$.fragment, local);
    			transition_in(chtable.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(board0.$$.fragment, local);
    			transition_out(svgicon0.$$.fragment, local);
    			transition_out(svgicon1.$$.fragment, local);
    			transition_out(svgicon2.$$.fragment, local);
    			transition_out(svgicon3.$$.fragment, local);
    			transition_out(board1.$$.fragment, local);
    			transition_out(board2.$$.fragment, local);
    			transition_out(floppy.$$.fragment, local);
    			transition_out(filedown.$$.fragment, local);
    			transition_out(fileup.$$.fragment, local);
    			transition_out(chtable.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button2);
    			destroy_component(board0);
    			destroy_component(svgicon0);
    			destroy_component(svgicon1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(button3);
    			destroy_component(svgicon2);
    			destroy_component(svgicon3);
    			destroy_component(board1);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(button4);
    			destroy_component(board2);
    			destroy_component(floppy);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(button5);
    			destroy_component(filedown);
    			if (detaching) detach_dev(t11);
    			if (detaching) detach_dev(button6);
    			destroy_component(fileup);
    			if (detaching) detach_dev(t12);
    			destroy_component(chtable, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(228:0) {#if ('serial' in navigator)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$2, create_else_block$1];
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
    		p: function update(ctx, [dirty]) {
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
    		id: create_fragment$7.name,
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

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let fileHandle;
    	let port;
    	let reader, writer, encoder, decoder;
    	let connected = false;
    	const enc = new TextEncoder();
    	const dec = new TextDecoder();
    	let data = [];

    	/*
    for (let i=0; i<8; i++) {
      data.push(['ch'+i, i+1, false])
    }
    */
    	async function readlines(num = 1) {
    		let total_msg = "";
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
    			lines = total_msg.split(/\r\n/);

    			// console.log('lines', lines, lines[lines.length-1])
    			if (lines[lines.length - 1].length == 0 && lines.length == num + 1) {
    				// check lines.lenght==(num+1) because there is an extra empty string at the end
    				console.log("got_all");

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
    		console.log("query", msg);
    		const writer = port.writable.getWriter();
    		msg = enc.encode(msg);
    		await writer.write(msg);
    		writer.releaseLock();
    		let value = await readlines(number_lines + 1);

    		// console.log(value)
    		let cmd;

    		[cmd, ...value] = value;

    		// console.log(value)
    		return value;
    	}

    	async function write_value(channel, value) {
    		const writer = port.writable.getWriter();
    		let msg = channel + " " + value + "\r\n";
    		msg = enc.encode(msg);
    		await writer.write(msg);
    		writer.releaseLock();
    	}

    	async function jsontest() {
    		const writer = port.writable.getWriter();
    		let msg = "C " + JSON.stringify(data) + "\r\n";
    		msg = enc.encode(msg);
    		await writer.write(msg);
    		writer.releaseLock();
    		let lines = await readlines(3);
    		console.log(lines);
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

    			// console.log('msg', msg);
    			let [value] = await query(msg);

    			let [first, ...second] = value.split(" ");
    			second = second.join(" ");
    			value = JSON.parse(second);
    			values.push(value);
    		} // value = Number(value[1])
    		// values.push(value)

    		return values;
    	}

    	async function connect() {
    		try {
    			port = await navigator.serial.requestPort();
    			console.log(port.getInfo());

    			if (port) {
    				await port.open({ baudRate: 115200 });
    				console.log("port", port);
    				$$invalidate(1, data = await fetch_values());
    			}

    			console.log("connect: data:", data);
    			$$invalidate(0, connected = true);
    		} catch(e) {
    			console.log("error message", e.message);
    		}
    	}

    	async function disconnect() {
    		try {
    			port.close();
    			$$invalidate(1, data = []);
    			$$invalidate(1, data);
    			$$invalidate(0, connected = false);
    		} catch(e) {
    			console.log("error message", e.message);
    		}
    	}

    	async function fetchtest() {
    		let values = await fetch_values();
    		console.log(values);
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

    		// Need to check that that JSON has the write schema
    		$$invalidate(1, data = JSON.parse(contents));

    		$$invalidate(1, data = data); // refreshes html page
    		console.log(data);
    	}

    	async function save_board() {
    		console.log("save on board");

    		// console.log(JSON.stringify(data))
    		const writer = port.writable.getWriter();

    		let msg = "J\r\n";
    		msg = enc.encode(msg);
    		await writer.write(msg);
    		writer.releaseLock();
    		let response = await readlines(1);
    		console.log("response", response);
    	}

    	async function send() {
    		console.log("send", data);

    		for (let i = 0; i < 8; i++) {
    			// await write_value(i, data[i][1]);
    			await write_value(i, JSON.stringify(data[i]));

    			let lines = await readlines(3);
    		} // console.log(lines)
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		download,
    		upload,
    		computer,
    		right,
    		circle_up,
    		ChTable,
    		SvgIcon,
    		Board: Artboard,
    		FileDown: File_down,
    		FileUp: File_up,
    		Floppy,
    		fileHandle,
    		port,
    		reader,
    		writer,
    		encoder,
    		decoder,
    		connected,
    		enc,
    		dec,
    		data,
    		readlines,
    		query,
    		write_value,
    		jsontest,
    		writetest,
    		fetch_values,
    		connect,
    		disconnect,
    		getPorts,
    		fetchtest,
    		save_computer,
    		getNewFileHandle,
    		writeFile,
    		load_from_computer,
    		save_board,
    		send
    	});

    	$$self.$inject_state = $$props => {
    		if ("fileHandle" in $$props) fileHandle = $$props.fileHandle;
    		if ("port" in $$props) port = $$props.port;
    		if ("reader" in $$props) reader = $$props.reader;
    		if ("writer" in $$props) writer = $$props.writer;
    		if ("encoder" in $$props) encoder = $$props.encoder;
    		if ("decoder" in $$props) decoder = $$props.decoder;
    		if ("connected" in $$props) $$invalidate(0, connected = $$props.connected);
    		if ("data" in $$props) $$invalidate(1, data = $$props.data);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		connected,
    		data,
    		connect,
    		disconnect,
    		fetchtest,
    		save_computer,
    		load_from_computer,
    		save_board,
    		send
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
