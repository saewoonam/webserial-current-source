<script>
  let options = [{id: 1, text:"only via button"},
    {id: 2, text:"when data is enetered in table"},
    /* {id: 3, text:"as data is entered in the table"} */
  ]
  export let show_dac_offset=true;
  export let selected_option = 3;
</script>
<label>
<input type=checkbox bind:checked={show_dac_offset}>
show dac_offset
</label>
<label>
  send data
  <select bind:value={selected_option}>
  {#each options as option}
  <option value={option.id} selected={option.id==selected_option}>
    {option.text}
  </option>
  {/each}
</select>
</label>

