const functions = require("firebase-functions");
const admin = require("firebase-admin");


admin.initializeApp({
    apiKey: "AIzaSyA2x75RoeTo31C25tty9Fdude8Qe3Xrg8c",
    authDomain: "party-c0af9.firebaseapp.com",
    projectId: "party-c0af9",
    storageBucket: "party-c0af9.appspot.com",
    messagingSenderId: "697903592114",
    appId: "1:697903592114:web:059c685ba49c9110294fab",
    measurementId: "G-TREHBQ2EQG",
});
const firestore = admin.firestore();
const party = firestore.collection("party");

exports.hasJoined = functions.database.ref('/presence/{userId}/{partyId}')
.onCreate(async (snapshot, context) => {
    const {partyId, userId} = context.params;
    party.doc(partyId).update({
        participants: admin.firestore.FieldValue.arrayUnion(userId),
        messages: admin.firestore.FieldValue.arrayUnion({
            participant_id: userId,
            content: `has joined the party.`,
            announcement: true,
            created_at: admin.firestore.Timestamp.now()
        })
    })
});

exports.hasLeft = functions.database.ref('/presence/{userId}/{partyId}')
.onDelete(async (snapshot, context) => {
    const {partyId, userId} = context.params;
    party.doc(partyId).update({
        participants: admin.firestore.FieldValue.arrayRemove(userId),
        messages: admin.firestore.FieldValue.arrayUnion({
            participant_id: userId,
            content: `has left the party.`,
            announcement: true,
            created_at: admin.firestore.Timestamp.now()
        })
    })
});
