<script>
	import InlineInput2 from './input.svelte';

	let extras = {min: -100, max:100, style:"width: 5em;"}
	let min = 1
	let columns = ['Name', 'value', 'bias']
	export let data = [];
// 	for (let i=0; i<3; i++) {
// 		data.push(['ch'+i, i+1, false])
// 	}

</script>
<style>
	tr td {
		text-align: center; 
		vertical-align: middle;
		width: 5em;
		height: 2em;
		background: #eee;
	}
</style>

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
		<td><InlineInput2 bind:value={row[0]} extras={{style:"width: 5em;"}} /></td>
		<td><InlineInput2 type='number' bind:value={row[1]} extras={extras}/></td>
		<td style=""><input type=checkbox bind:checked={row[2]}/></td>
	</tr>
	{/each}
</table>

