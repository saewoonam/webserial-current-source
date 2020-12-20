<script>
import { tick, createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

// Props
export let value = '';
export let type = 'text';
export let placeholder = '';
export let labelClasses = '';
export let inputClasses = '';
export let rows = 2;
export let cols = 20;
export let options = [];
export let extras={};

let editing = false;
let inputEl;
let label;
let selectedIndex = options.findIndex(o => o.value === value);
let e;
let step = 1;
  
// Computed
$: isText = type === 'text';
$: isNumber = type === 'number';
$: isTextArea = type === 'textarea';
$: isSelect = type === 'select';
$: if (isNumber) {
      label = value === '' ? placeholder : value;
    } else if (isText || isTextArea) {
      label = value ? value : placeholder;
    } else { // Select
      label = selectedIndex === -1 ? placeholder : options[selectedIndex].label;
    }

const toggle = async (_) => {
  editing = !editing;

  if (editing) {
    await tick();
    inputEl.focus();
  }
};

const handleInput = (e) => {
  value = isNumber ? +e.target.value : e.target.value;
};

const handleEnter = (e) => {
  if (e.keyCode === 13) inputEl.blur();
  if ((e.key == 'ArrowRight') && (e.shiftKey)) {
    console.log("step / 10");
    step = step/10;
    if (step<2.5/65535) step = 2.5/65535
  }
  if ((e.key == 'ArrowLeft') && (e.shiftKey)) {
    console.log("step * 10");
    if (step<=3/65535) {
      step = 0.0001;
    } else {
      step *= 10;
    }
    if (step>1) {
      step = 1;
    }
  }
};

const handleBlur = (e) => {
  toggle();
  console.log('blur input', e)
  if (e.srcElement.max!="") {
    let max = Number(e.srcElement.max)
    if (value>max) value = max;
  }
  if (e.srcElement.min!="") {
    let min = Number(e.srcElement.min)
    if (value<min) value = min;
  }
  dispatch('blur', value);
  
};

const handleChange = (e) => {
  selectedIndex = placeholder ? e.target.selectedIndex - 1 : e.target.selectedIndex;
  value = options[selectedIndex].value;
};

  function wheel(e) {
    if (e.target.type=='number') {
      e.preventDefault()
      e.stopPropagation()
      if ((e.deltaY>0) && (e.target.max.length>0)) {
        value = Number(e.target.value)+step;
        if (value>Number(e.target.max)) value = Number(e.target.max);
        value = Number(value.toFixed(5));
      }
      if ((e.deltaY<0)&&(e.target.min.length>0)) {
        value = Number(e.target.value)-step;
        if (value<Number(e.target.min)) value = Number(e.target.min);
        value = Number(value.toFixed(5));
      }
    }
    console.log('value', value, e, e.target.value)
  }
</script>
<style>
  .input {
    width: 8em;
  }
  .checkbox {
    width: auto;
  }
</style>

{#if editing && (isText || isNumber)}
  <input
    class={inputClasses}
    bind:this={inputEl}
    {type}
    {value}
    {placeholder}
    {...extras}
    on:mousewheel|stopPropagation={wheel}
    on:input={handleInput}
    on:keyup={handleEnter}
    on:blur={handleBlur}>
{:else if editing && isTextArea}
  <textarea
    class={inputClasses}
    bind:this={inputEl}
    {placeholder}
    {value}
    {rows}
    {cols}
    on:input={handleInput}
    on:blur={handleBlur} />
{:else if editing && isSelect}
  <select
    class={inputClasses}
    bind:this={inputEl}
    on:change={handleChange}
    {value}
    on:blur={handleBlur}>
    {#if placeholder}
      <option selected value disabled>{placeholder}</option>
    {/if}
    {#each options as { label, value }, i}
      <option
        key={i}
        {value}>
        {label}
      </option>
    {/each}
  </select>
{:else}
  <div
    class={labelClasses}
    on:click={toggle}>
    {label}
    <slot name="selectCaret">
      {#if isSelect}
        <span>&#9660;</span>
      {/if}
    </slot>
  </div>
{/if}
