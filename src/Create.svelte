<script>
    import Icon from "./Icon.svelte";
    import Spinner from "./Spinner.svelte";
    import { fade } from "svelte/transition";
    import { app, authorize } from "./firebase";
    import { navigate } from "svelte-routing";

    let url;
    let valid;
    let videoId;

    $: {
        try {
            const parsed = new URL(url);
            const v = parsed.searchParams.get("v");
            valid =
                parsed.searchParams.has("v") && /[A-Za-z0-9_\-]{11}/.test(v);
            videoId = parsed.searchParams.get("v");
        } catch {
            valid =false
        }
    }

    let creating;
    let partyId;

    const firestore = app.firestore();
    const auth = app.auth();

    async function createParty() {
        await authorize();
        creating = true;

        const party = await firestore.collection("party").add({
            host: auth.currentUser.uid,
            video_id: videoId,
            state: {
                current_time: 0,
                playback_state: "paused",
            },
            participants: [],
            messages: []
        });

        creating = false;
        partyId = party.id;
    }

    async function startTheParty() {
        navigate(`/party/${partyId}`, { replace: true });
    }
</script>

<main>
    <Icon />
    <h2 transition:fade>Enjoy watching Youtube with your friends.</h2>

    {#if !partyId}
        {#if !creating}
            <div transition:fade>
                <small>create a party</small>
                <input
                    placeholder="https://www.youtube.com/watch?v=U9pGr6KMdyg"
                    bind:value={url}
                />
                <button disabled={!valid} on:click={createParty}>Go!</button>
            </div>
        {:else}
            <Spinner />
        {/if}
    {:else}
        <div transition:fade>
            <h5>Share this url with your friends to join you!</h5>
            <pre
                contenteditable
                oncut="return false"
                onpaste="return false"
                onkeydown="if(event.metaKey) return true; return false;"
                onclick="document.execCommand('selectAll',false,null)">
                {location.href}party/{partyId}
            </pre>

            <button on:click={startTheParty}>Start the party</button>
        </div>
    {/if}
</main>

<style>
    main {
        height: 100%;
        background-color: var(--black-25);
        display: flex;
        flex-flow: column;
        align-items: center;
        justify-content: center;
        gap: 50px;
    }

    main h2 {
        color: var(--white-5);
    }

    main div {
        display: flex;
        flex-flow: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
    }

    main div small {
        color: var(--base-white);
        opacity: 0.4;
    }

    main div input {
        background-color: var(--black-10);
        color: var(--white-10);
        padding: 10px 20px;
        width: max(50%, 400px);
        border-radius: 20px;
    }

    main div button {
        background-color: var(--base-red);
        color: var(--base-white);
        padding: 10px 20px;
        border-radius: 20px;
    }

    main div button[disabled] {
        background-color: var(--black-20);
    }

    main div button:not([disabled]):hover {
        background-color: var(--active-red);
        cursor: pointer;
    }

    main div h5 {
        color: var(--base-white);
        margin: 0;
        font-size: 16px;
    }

    main div pre {
        outline: 0;
        padding: 5px 10px;
        color: var(--base-orange);
        margin-top: 35px;
        font-weight: var(--semi-bold);
    }

    main div pre:before {
        display: inline-block;
        vertical-align: middle;
        content: "";
        height: 15px;
        width: 15px;
        background-image: url(/images/Link.svg);
        margin-right: 10px;
    }
</style>
