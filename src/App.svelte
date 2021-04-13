<script>
	import { Router, Link, Route } from "svelte-routing";
	import Party from "./Party.svelte";
</script>

<Router>
	<Route path="party/:id" let:params>
		<Party id="{params.id}" />
	</Route>
</Router>