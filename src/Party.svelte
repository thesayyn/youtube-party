<script>
	import YouTube from "svelte-youtube";
	import Loading from "./Loading.svelte";
	import Icon from "./Icon.svelte";
	import HistoryItem from "./HistoryItem.svelte";

	import firebase from "firebase/app";
	import { app, authorize } from "./firebase";
	import { avatars } from "./avatars";
	import { fade } from "svelte/transition";

	export let id;

	const auth = app.auth();
	const firestore = app.firestore();
	const db = app.database();

	let player;

	let undock;
	let undockedMessageReceived = false;
	let undockedMessageReceivedTimer;

	let party;
	let user;
	let partyRef = firestore.collection("party").doc(id);
	let userRef;

	let profileOpen;
	let avatarsOpen;

	let message;
	let scrollElement;

	let participantMap = new Map();

	let isPartyReady;

	let stop;
	function updateParticipants() {
		if (stop) {
			stop();
		}
		const messages = party.messages.slice(
			Math.max(party.messages.length - 50, 1)
		);

		const participants = messages
			.map((m) => m.participant_id)
			.concat(party.participants);

		if (!participants.length) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			stop = firestore
				.collection("users")
				.where(
					firebase.firestore.FieldPath.documentId(),
					"in",
					Array.from(new Set(participants))
				)
				.onSnapshot((snapshot) => {
					participantMap = new Map(
						snapshot.docs.map((p) => {
							return [p.id, p.data()];
						})
					);
					resolve();
				});
		});
	}

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

	function getCurrentPlayerState(num) {
		const state = {
			1: "playing",
			2: "paused",
		};
		return state[num] || "paused";
	}

	async function stateChange(event) {
		if (!isPartyReady) {
			return;
		}
		const currentState = getCurrentPlayerState(
			event.detail.target.getPlayerState()
		);
		if (party.host == user.uid) {
			partyRef.update({
				"state.playback_state": currentState,
				"state.current_time": event.detail.target.getCurrentTime(),
				"state.last_acknowledge": firebase.firestore.FieldValue.serverTimestamp(),
			});
		} else if (currentState == "playing") {
			const currentTime = event.detail.target.getCurrentTime();
			const desiredTime =
				party.state.current_time +
				calculateLatencySinceLastAcknowledge(party);
			if (
				currentTime + 2 < desiredTime ||
				currentTime > desiredTime + 2
			) {
				player.player.seekTo(desiredTime);
			}
		}
	}

	function calculateLatencySinceLastAcknowledge(party) {
		const ackUnix = party.state.last_acknowledge.toDate().getTime();
		return Math.abs(Date.now() - ackUnix) / 1000 + 0.7;
	}

	async function upstreamChanged(currentParty) {
		if (currentParty.host != user.uid) {
			if (party.video_id != currentParty.video_id) {
				player.player.loadVideoById({
					videoId: currentParty.video_id,
					startSeconds: currentParty.state.current_time,
				});
			}

			if (
				currentParty.state.playback_state != party.state.playback_state
			) {
				let timeToSeek = currentParty.state.current_time;

				if (currentParty.state.playback_state == "playing") {
					timeToSeek += calculateLatencySinceLastAcknowledge(
						currentParty
					);
				}
				player.player.seekTo(timeToSeek);

				if (currentParty.state.playback_state == "playing") {
					console.log("play");
					player.player.mute();
					player.player.playVideo();
					player.player.unMute();
				} else {
					player.player.pauseVideo();
				}
			}
		}

		if (party.messages.length != currentParty.messages.length) {
			clearTimeout(undockedMessageReceivedTimer);
			undockedMessageReceived = true;
			setTimeout(() => (undockedMessageReceived = false), 5000);
		}

		party = currentParty;

		updateParticipants();

		requestAnimationFrame(() => {
			scrollElement.scrollTop = scrollElement.scrollHeight + 100;
		});
	}

	async function ready() {
		userRef = await authorize();
		user = { ...auth.currentUser };

		party = await partyRef.get().then((snapshot) => snapshot.data());
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

		let currentTime = party.state.current_time;

		if (party.state.playback_state == "playing") {
			currentTime += calculateLatencySinceLastAcknowledge(party);
		}

		player.player.loadVideoById({
			videoId: party.video_id,
			startSeconds: currentTime,
		});

		if (party.state.playback_state == "playing") {
			player.player.playVideo();
		} else {
			player.player.pauseVideo();
		}

		await updateParticipants();

		partyRef.onSnapshot((snapshot) => upstreamChanged(snapshot.data()));

		setTimeout(
			() =>
				requestAnimationFrame(() => {
					isPartyReady = true;
				}),
			2000
		);

		if (party.host == user.uid) {
			setInterval(async () => {
				partyRef.update({
					"state.current_time": await player.player.getCurrentTime(),
					"state.last_acknowledge": firebase.firestore.FieldValue.serverTimestamp(),
				});
			}, 5000);
		}
	}

	let nickname;

	function announceProfileUpdate() {
		partyRef.update({
			messages: firebase.firestore.FieldValue.arrayUnion({
				participant_id: user.uid,
				content: "updated their user icon or nickname",
				created_at: firebase.firestore.Timestamp.now(),
				announcement: true,
			}),
		});
	}

	function updateNickname() {
		if (nickname) {
			auth.currentUser.updateProfile({
				displayName: nickname,
			});
			userRef.update({
				displayName: nickname,
			});
			user.displayName = nickname;
			nickname = undefined;
			announceProfileUpdate();
		}

		profileOpen = false;
	}

	function updateAvatar(avatar) {
		avatarsOpen = false;
		if (avatar != user.photoURL) {
			user.photoURL = avatar;
			auth.currentUser.updateProfile({
				photoURL: avatar,
			});
			userRef.update({
				photoURL: avatar,
			});
			announceProfileUpdate();
		}
	}

	ready();
</script>

{#if !isPartyReady}
	<main class="loading" transition:fade><Loading /></main>
{/if}
<main style="display: {isPartyReady ? 'flex' : 'none'}">
	<div class="player">
		<YouTube
			bind:this={player}
			class="youtube"
			on:stateChange={stateChange}
		/>
	</div>
	<div
		class="side"
		class:undocked={undock}
		class:message={undock && undockedMessageReceived}
	>
		<div class="header">
			<div on:click={() => (undock = !undock)}><Icon size={30} /></div>
			<img
				src="avatars/{user?.photoURL}.svg"
				on:click={() => (profileOpen = !profileOpen)}
				alt={user?.photoURL}
			/>
		</div>
		{#if !profileOpen}
			<div class="host">
				<img
					src="avatars/{participantMap.get(party?.host)
						?.photoURL}.svg"
					alt={user?.photoURL}
				/>
				<h3>{participantMap.get(party?.host)?.displayName}</h3>
				<small
					>{party?.state.playback_state} • {party?.participants
						.length ?? 0}</small
				>
			</div>
		{/if}
		<div class="content scroll" bind:this={scrollElement}>
			{#if !profileOpen}
				<div class="history">
					<ul>
						{#each party?.messages.slice(Math.max(party?.messages.length - 50, 1)) || [] as message}
							<li>
								<HistoryItem
									name={participantMap.get(
										message.participant_id
									)?.displayName}
									content={message.content}
									avatar="avatars/{participantMap.get(
										message.participant_id
									)?.photoURL}.svg"
									announcement={message.announcement}
								/>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<div class="profile">
					{#if !avatarsOpen}
						<div class="info">
							<img
								src="avatars/{user.photoURL}.svg"
								on:click={() => (avatarsOpen = true)}
								alt="avatar"
							/>

							<fieldset>
								<label for="nickname">Nickname</label>
								<input
									id="nickname"
									placeholder={user.displayName}
									bind:value={nickname}
								/>
							</fieldset>

							<button on:click={updateNickname}>
								Save changes
							</button>
						</div>
					{:else}
						<div class="avatars">
							{#each avatars as avatar}
								<img
									src="avatars/{avatar}.svg"
									on:click={() => updateAvatar(avatar)}
									alt="avatar"
								/>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
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
		height: 100%;
	}

	main.loading {
		position: absolute;
		z-index: 1;
		width: 100%;
		height: 100%;
	}

	.player {
		flex: 1;
	}

	.side {
		background: var(--base-black);
		flex-basis: 280px;
		padding: 12px 20px;
		display: flex;
		flex-flow: column;
	}

	.side.undocked {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		width: 280px;
		opacity: 0.05;
		transition: 0.7s opacity ease-in-out;
	}

	.side.undocked:hover {
		opacity: 1;
	}

	.side.undocked.message {
		opacity: 0.8;
	}

	.side .header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.side .header div {
		color: var(--base-red);
		margin: 0;
		transition: 0.2s transform ease-in-out;
	}
	.side .header div:hover {
		transform: scale(1.1);
		cursor: pointer;
	}

	.side .header button:hover {
		height: 20px;
		width: 20px;
	}

	.side .header img {
		height: 38px;
		width: 38px;
	}

	.side .host {
		padding: 5px 0px;
		color: var(--base-white);
		display: grid;
		grid-template-columns: 1fr 4fr;
		grid-template-rows: repeat(2, 1fr);
		column-gap: 10px;
	}

	.side .host img {
		height: 50px;
		background-color: var(--black-20);
		padding: 4px;
		border-radius: 50%;
		grid-area: 1 / 1 / 3 / 2;
	}

	.side .host h3 {
		margin: 0;
	}

	.side .content {
		flex: 1;
		overflow-y: scroll;
		margin-top: 15px;
		scroll-behavior: smooth;
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

	.profile .info {
		display: flex;
		flex-flow: column;
		gap: 25px;
	}

	.profile .info fieldset {
		border: none;
		padding: 0;
		margin: 0;
	}

	.profile .info fieldset label {
		font-weight: var(--medium);
		color: var(--white-10);
		font-size: 13px;
	}

	.profile .info fieldset input {
		border-radius: 2px;
		padding: 8px 10px;
		width: 100%;
		background: var(--black-15);
		color: var(--white-15);
	}

	.profile .info button {
		width: 100%;
		background: var(--base-red);
		color: var(--base-white);
		padding: 10px 0;
		border-radius: 2px;
		font-weight: var(--medium);
		transition: background 0.3s ease;
		outline: 0;
		border: 0;
		margin: 0;
	}

	.profile .info button:hover {
		background: var(--active-red);
		cursor: pointer;
	}

	.profile .info img {
		height: 80px;
	}

	.profile .avatars {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr 1fr;
		gap: 10px;
	}

	.history ul {
		list-style-type: none;
		padding: 0;
		margin: 0;
	}

	.history ul li {
		margin: 10px 0px;
		margin-right: 10px;
	}

	.history ul li:first-of-type {
		margin-top: 0;
	}
</style>
