<script>
    import Spinner from "./Spinner.svelte";
    import Icon from "./Icon.svelte";
</script>

<main>
    <Icon />
    <Spinner />
</main>

<style>
    main {
        background-color: var(--black-20);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-flow: column;
        gap: 5px;
        height: 100%;
        width: 100%;
    }
</style>
