$(document).ready(function() {
  console.log("READY!");

  let JQ_IDs = {
    input_form  : null,
    input_name  : null,
    input_submit: null,
     form_alert : null,

    players : null,

       p1Type : null,
       p1Name : null,
     p1Choice : null,
       p2Type : null,
       p2Name : null,
     p2Choice : null,

     myChoices: null,
  };
  for (let id of Object.keys(JQ_IDs)) {
    JQ_IDs[id] = $(`#${id}`);
  }

  let JQ_CLASSes = {
    playerDiv: null,

        rock: null,
       paper: null,
    scissors: null,
  }
  for (let cl of Object.keys(JQ_CLASSes)) {
    JQ_CLASSes[cl] = $(`.${cl}`);
  }

  let nextPlayerID = 0; // ID of next player to joing
  let   myPlayerID = 0;
  // #region Firebase Setup  
  let db = loadPersonalFirebase();
  // let db = {};
  
  let   connectedRef = db.ref(".info/connected");
  let connectionsRef = db.ref("/connections");
  let     playersRef = db.ref("/players");
  let     player1Ref = db.ref("/players/1");
  let     player2Ref = db.ref("/players/2");
  // let     playersRef_me  = null;
  // let     playersRef_opp = null;
  // #endregion Firebase Setup
  
  // #region Clicks
  // User Entered Name to Connect to Game
  JQ_IDs.input_submit.click(function(event){
    event.preventDefault();
    JQ_IDs.form_alert.empty();
    
    if (numPlyrJoined === 2) {
      JQ_IDs.form_alert.html("Sorry. Game is full. Please wait.");
      return;
    }

    let name = JQ_IDs.input_name.val().trim();
    JQ_IDs.input_name.val(""); // empty-out input field
    if (!name){ return; } // ignore empty input
    // if (playersRef_me) { return; } // ignore trying to make another connection

    let ref = playersRef.child(nextPlayerID);
    ref.onDisconnect().remove();
    myPlayerID = nextPlayerID;
    ref.set({
      name: name,
    }); // TODO: on success
    JQ_IDs.input_form.hide();

    // playersRef_me = playersRef.child(name);
    // playersRef_me.onDisconnect().remove();
    // playersRef_me.once("value", function(snap) {
    //   if (snap.exists()) {
    //       JQ_IDs.form_alert.html(`A Player with name <strong>${name}</strong> is already in the game.`);
    //       playersRef_me = null;
    //   }
    //   else {
    //     playersRef_me.set({
    //       name: name,
    //     });
    //     JQ_IDs.playerName.text(name);
    //     JQ_IDs.input_form.hide();
    //   }
    // });
  });
  // #endregion Clicks


  // #region Firebase Event Handlers
  connectedRef.on("value", function(dataSnap) {
    const val = dataSnap.val();
    console.log("connected/value", val);
    
    if (val) {
      let con = connectionsRef.push();
      con.onDisconnect().remove();
      con.set(true);
    }
  });
  
  // connectionsRef.on("value", function(snap){
  //   console.log("users value change", snap.val());
  //   JQ_IDs.playerName.text(name);
  // });
  
  // playersRef.on("child_added", function(childSnap, prevChildKey) {
  //   ++numPlyrJoined;
  //   let val = childSnap.val();
  //   console.log("player/child_add", val, prevChildKey || null, numPlyrJoined);
  //   // See if this is my opponet joining the game 
  //   if (  (!prevChildKey && !playersRef_me ) //     first connection and    I    haven't joined yet 
  //      || ( prevChildKey && !playersRef_opp) // not-first connection and opponent hadn't joined yet
  //       ) {
  //     JQ_IDs.oppName.text(val.name);
  //     playersRef_opp = playersRef.child(val.name);
  //   }
  // });

  // playersRef.on("child_removed", function(oldChildSnap) {
  //   --numPlyrJoined;
  //   let val = oldChildSnap.val();
  //   console.log("player/child_removed", val, numPlyrJoined);
  //   if (playersRef_opp.key === val.name) {
  //     console.log("My opponent left");
  //   }
  // });
  
  playersRef.on("value", function(dataSnap) {
    const val = dataSnap.val();
    const num = dataSnap.numChildren();
    console.log("players/value", val || null);

    let p2snap = dataSnap.child(2);
    if (p2snap.exists()){
      JQ_IDs.p2Type.text(myPlayerID === 2 ? '(ME)' : '');
      JQ_IDs.p2Name.text(p2snap.val().name);
      JQ_IDs.p2Choice.text(num === 1 ? 'waiting for a challenger' : ""); // val[1].name
    }
    else {
      JQ_IDs.p2Type.text("");
      JQ_IDs.p2Name.text("not joined");
      JQ_IDs.p2Choice.text("");
      // nextPlayerID = 2;
    }

    let p1snap = dataSnap.child(1);
    if (p1snap.exists()){
      JQ_IDs.p1Type.text(myPlayerID === 1 ? '(ME)' : '');
      JQ_IDs.p1Name.text(p1snap.val().name); // val[1].name
      JQ_IDs.p1Choice.text(num === 1 ? 'waiting for a challenger' : ""); // val[1].name
    }
    else {
      JQ_IDs.p1Type.text("");
      JQ_IDs.p1Name.text("not joined");
      JQ_IDs.p1Choice.text("");
      // nextPlayerID = 1;
    }

    nextPlayerID = (!p1snap.exists() ? 1 : (!p2snap.exists() ? 2 : 0));

    numPlyrJoined = num;
    if (numPlyrJoined === 2) {
      startNewMatch();
    }
    // console.log(dataSnap);
       
    // JQ_IDs.p1Name = dataSnap
    // JQ_CLASSes.pType.eq(childSnap.key).text(+childSnap.key === numPlyrJoined_me ? '(ME)' : '(Opponent)');
    // JQ_CLASSes.pType.eq(childSnap.key).text(+childSnap.key === numPlyrJoined_me ? '(ME)' : '(Opponent)');
    // JQ_CLASSes.pName.eq(childSnap.key).text(childSnap.val().name);
    // dataSnap.forEach(function(childSnap) {
      // console.log(childSnap.key, childSnap.val());
      // console.log(JQ_CLASSes.pName[childSnap.key]);
      // console.log(childSnap.key);
      
    // });
  });
  // #endregion Firebase Event Handlers

  // #region Game Functions
  function startNewMatch() {
    console.log("STARTING A MATCH");
    if (myPlayerID > 0){
      JQ_IDs.myChoices.show();
      JQ_CLASSes.playerDiv.eq(myPlayerID-1).append(JQ_IDs.myChoices);
    }
    JQ_IDs.p1Choice.text("..thinking");
    JQ_IDs.p2Choice.text("..thinking");
  }
  // #endregion Game Functions
});
