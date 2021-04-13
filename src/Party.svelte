<script>
	import HistoryItem from "./HistoryItem.svelte";
	import YouTube from "svelte-youtube";
	import firebase from "firebase";

	export let id;

	const firebaseConfig = {
		apiKey: "AIzaSyA2x75RoeTo31C25tty9Fdude8Qe3Xrg8c",
		authDomain: "party-c0af9.firebaseapp.com",
		projectId: "party-c0af9",
		storageBucket: "party-c0af9.appspot.com",
		messagingSenderId: "697903592114",
		appId: "1:697903592114:web:059c685ba49c9110294fab",
		measurementId: "G-TREHBQ2EQG",
	};

	const app = firebase.initializeApp(firebaseConfig);
	const auth = app.auth();
	const firestore = app.firestore();
	const db = app.database();
	const partyRef = firestore.collection("party").doc(id);

	let party;
	let player;
	let user;

	let messages = [];
	let message;
	let scrollElement;

	function sendMessage(event) {
		if (event.keyCode == 13 && message && String(message).trim()) {
			partyRef.update({
				messages: firebase.firestore.FieldValue.arrayUnion({
					participant_id: user.uid,
					content: String(message).trim(),
					created_at: firebase.firestore.Timestamp.now(),
				}),
			});
			message = undefined;
		}
	}

	async function partyReady() {
		const statusRef = db.ref(`/presence/${user.uid}/${id}`);
		db.ref(".info/connected").on("value", async (snapshot) => {
			if (snapshot.val() == false) {
				return;
			}
			await statusRef.onDisconnect().remove();
			await statusRef.set({
				joined_at: firebase.database.ServerValue.TIMESTAMP,
			});
		});

		player.player.loadVideoById({
			videoId: party.video_id,
			startSeconds: party.state.current_time,
		});

		if (party.state.playback_state == "playing") {
			player.player.playVideo();
		} else {
			player.player.pauseVideo();
		}

		partyRef.onSnapshot((snapshot) => {
			const currentParty = snapshot.data();

			messages = currentParty.messages;

			requestAnimationFrame(() => {
				scrollElement.scrollTop = scrollElement.scrollHeight + 100;
			});

			if (party.host != user.uid) {
		
				syncPlaybackState(currentParty.state);
				party.state = currentParty.state;
			}
		});
	}
	async function syncPlaybackState(desiredPlaybackState) {
		if (desiredPlaybackState.playback_state != party.state.playback_state) {

			player.player.seekTo(desiredPlaybackState.current_time);
			if (desiredPlaybackState.playback_state == "playing") {
				console.log("play")
				player.player.mute();
				player.player.playVideo();
				player.player.unMute();
			} else {
				player.player.pauseVideo();
			}
		}
	}

	async function getCurrentPlayerState() {
		const state = {
			1: "playing",
			2: "paused",
		};
		return state[await player.player.getPlayerState()] || "paused";
	}

	async function stateChange(event) {
		const currentState = await getCurrentPlayerState();
		if (party.host == user.uid) {
			partyRef.update({
				"state.playback_state": currentState,
				"state.current_time": event.detail.target.getCurrentTime(),
				"state.last_acknowledge": firebase.firestore.FieldValue.serverTimestamp(),
			});
		} else if (currentState != party.state.playback_state) {
			syncPlaybackState(party.state);
		}
	}

	async function ready() {
		user = (await auth.signInAnonymously()).user;
		party = (await partyRef.get()).data();
		await partyReady();
	}
</script>

<main>
	<div class="player">
		<YouTube
			bind:this={player}
			class="youtube"
			on:ready={ready}
			on:stateChange={stateChange}
		/>
	</div>
	<div class="chat">
		<div class="header">
			<h4>Youtube Party</h4>
			<button />
			<img src="avatars/Batman.svg" />
		</div>
		<div class="content scroll" bind:this={scrollElement}>
			<div class="history">
				<ul>
					{#each messages as message}
						<li>
							<HistoryItem
								name={message.participant_id}
								content={message.content}
								avatar="avatars/Batman.svg"
								announcement={message.announcement}
							/>
						</li>
					{/each}
				</ul>
			</div>
		</div>

		<div class="footer">
			<input
				bind:value={message}
				on:keydown={sendMessage}
				placeholder="Type a message"
			/>
		</div>
	</div>
</main>

<style>
	main {
		display: flex;
		height: 100vh;
	}

	.player {
		flex: 1;
	}

	.player .youtube {
		width: 100%;
	}

	.chat {
		background: #191919;
		flex-basis: 300px;
		padding: 12px 20px;
		display: flex;
		flex-flow: column;
	}

	.chat .content {
		flex: 1;
		overflow-y: scroll;
		margin-top: 15px;
		scroll-behavior: smooth;
	}

	.chat .content .history {
		margin-right: 10px;
	}

	.chat .content .history ul {
		list-style-type: none;
		padding: 0;
	}

	.chat .content .history ul li {
		margin: 10px 0px;
	}

	.chat .header {
		display: flex;
		align-items: center;
	}

	.chat .header h4 {
		color: #ef3e3a;
		margin: 0;
		flex: 1;
	}

	.chat .header button {
		background: url(/images/Link.svg);
		background-size: contain;
		height: 18px;
		width: 18px;
		border: none;
		margin-right: 10px;
		cursor: pointer;
		outline: 0;
		transition: all 0.3s ease-in-out;
	}

	.chat .header button:hover {
		height: 20px;
		width: 20px;
	}

	.chat .header img {
		height: 38px;
		width: 38px;
	}

	.footer {
	}

	.footer input {
		background: none;
		border: none;
		outline: 0;
		font-weight: var(--regular);
		color: var(--white-15);
		font-size: 14px;
		height: 50px;
	}
</style>
