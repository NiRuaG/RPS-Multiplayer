$(document).ready(function() {
  console.log("READY!");

  let JQ_IDs = {
    input_form  : null,
    input_name  : null,
    input_submit: null,
     form_alert : null,

     players : null,
  };
  for (let id of Object.keys(JQ_IDs)) {
    JQ_IDs[id] = $(`#${id}`);
  }

  let JQ_CLASSes = {
    playerDiv : null,

    pType  : null,
    pName  : null,
    pChoice: null,
  }
  for (let cl of Object.keys(JQ_CLASSes)) {
    JQ_CLASSes[cl] = $(`.${cl}`);
  }

  let playersJoined = 0;
  let playersJoined_me = -1;
  // #region Firebase Setup  
  let db = loadPersonalFirebase();
  // let db = {};
  
  let   connectedRef = db.ref(".info/connected");
  let connectionsRef = db.ref("/connections");
  let     playersRef = db.ref("/players");
  let     playersRef_me  = null;
  let     playersRef_opp = null;
  // #endregion Firebase Setup
  
  // #region Clicks
  // User Entered Name to Connect to Game
  JQ_IDs.input_submit.click(function(event){
    event.preventDefault();
    JQ_IDs.form_alert.empty();
    
    if (playersJoined === 2) {
      JQ_IDs.form_alert.html("Sorry. Game is full. Please wait.");
      return;
    }

    let name = JQ_IDs.input_name.val().trim();
    JQ_IDs.input_name.val(""); // empty-out input field
    if (!name){ return; } // ignore empty input
    if (playersRef_me) { return; } // ignore trying to make another connection

    let ref = playersRef.child(playersJoined);
    ref.onDisconnect().remove();
    playersJoined_me = playersJoined;
    ref.set({
      name: name,
    });
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
    let val = dataSnap.val();
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
  //   ++playersJoined;
  //   let val = childSnap.val();
  //   console.log("player/child_add", val, prevChildKey || null, playersJoined);
  //   // See if this is my opponet joining the game 
  //   if (  (!prevChildKey && !playersRef_me ) //     first connection and    I    haven't joined yet 
  //      || ( prevChildKey && !playersRef_opp) // not-first connection and opponent hadn't joined yet
  //       ) {
  //     JQ_IDs.oppName.text(val.name);
  //     playersRef_opp = playersRef.child(val.name);
  //   }
  // });

  // playersRef.on("child_removed", function(oldChildSnap) {
  //   --playersJoined;
  //   let val = oldChildSnap.val();
  //   console.log("player/child_removed", val, playersJoined);
  //   if (playersRef_opp.key === val.name) {
  //     console.log("My opponent left");
  //   }
  // });
  
  playersRef.on("value", function(dataSnap) {
    let val = dataSnap.val();
    console.log("players/value", val || null);
    dataSnap.forEach(function(childSnap) {
      // console.log(childSnap.key, childSnap.val());
      // console.log(JQ_CLASSes.pName[childSnap.key]);
      console.log(childSnap.key);
      JQ_CLASSes.pType.eq(childSnap.key).text(+childSnap.key === playersJoined_me ? '(ME)' : '(Opponent)');
      JQ_CLASSes.pName.eq(childSnap.key).text(childSnap.val().name);
    });
    playersJoined = dataSnap.numChildren();
  });
  // #endregion Firebase Event Handlers
});
