<script>
  import InlineInput2 from './input.svelte';

  let extras = {min: -100, max:100, style:"width: 8em;"}
  let extras_dac_offset = {min:0,  max:65535}
  let min = 1
  let columns = ['Name', 'value', 'bias']
  export let title='Unknown'
  export let data = [];
  export let advanced = true;
//  for (let i=0; i<3; i++) {
//    data.push(['ch'+i, i+1, false])
//  }
</script>
<style>
  tr td {
    text-align: center; 
    vertical-align: middle;
    width: auto;
    height: 2em;
    background: #eee;
  }
</style>
{#if data.length>0}
  <h3> Board Name: <InlineInput2 on:blur bind:value={title} /></h3>
{/if}
<table> 
  <tr>
    {#if data.length>0}
    {#each columns as column}
    <th>{column}</th>
    {/each}
    {/if}
  </tr>
  {#each data as row}
  <tr>
    <td><InlineInput2 bind:value={row[0]} extras={{style:"width: 8em;"}} labelClasses="input"/></td>
    <td><InlineInput2 type='number' bind:value={row[1]} extras={extras} labelClasses="input"/></td>
    <td style=""><input type=checkbox bind:checked={row[2]} labelClasses="checkbox"/></td>
    {#if (advanced && row.length>=3)}
    <td><InlineInput2 type='number' bind:value={row[3]}
        extras={extras_dac_offset} labelClasses="input"/></td>
    {/if}
  </tr>
  {/each}
</table>

