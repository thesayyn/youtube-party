<script>
	import { Router, Route } from "svelte-routing";
	import Party from "./Party.svelte";
	import Create from "./Create.svelte";
</script>

<Router>
	<Route path="/">
		<Create/>
	</Route>
	<Route path="party/:id" let:params>
		<Party id={params.id} />
	</Route>
</Router>