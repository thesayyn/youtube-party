import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyA2x75RoeTo31C25tty9Fdude8Qe3Xrg8c",
    authDomain: "party-c0af9.firebaseapp.com",
    projectId: "party-c0af9",
    storageBucket: "party-c0af9.appspot.com",
    messagingSenderId: "697903592114",
    appId: "1:697903592114:web:059c685ba49c9110294fab",
    measurementId: "G-TREHBQ2EQG",
};

export const app = firebase.initializeApp(firebaseConfig);

export async function authorize() {
    const auth = app.auth();
    const firestore = app.firestore();
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    await auth.signInAnonymously();
    const userRef = firestore.collection("users").doc(auth.currentUser.uid);
    const exists = await userRef.get().then(s => s.exists);
    const info = {
        displayName: `Smurf ${auth.currentUser.uid.slice(0, 5)}`,
        photoURL: "characters/smurf"
    };

    if (!exists) {
        await auth.currentUser.updateProfile(info);
        await userRef.set({
            displayName: `Smurf ${auth.currentUser.uid.slice(0, 5)}`,
            photoURL: "characters/smurf"
        })
    }
    return userRef;
}