function loadFirebase() {
    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyA_ebs2-1HBEcRBT4PrWsL6Hi6dQLFL_nw",
        authDomain: "rpsls-fc1d3.firebaseapp.com",
        databaseURL: "https://rpsls-fc1d3.firebaseio.com",
        projectId: "rpsls-fc1d3",
        storageBucket: "rpsls-fc1d3.appspot.com",
        messagingSenderId: "694533803599"
    };
    firebase.initializeApp(config);

    return firebase.database();
}