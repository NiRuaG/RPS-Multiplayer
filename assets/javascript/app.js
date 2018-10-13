$(document).ready(function() {
  console.log("READY!");

  let JQ_IDs = {
    input_form  : null,
    input_name  : null,
    input_submit: null,
     form_alert : null,

    playerName  : null,
    playerChoice: null,
       oppName  : null,
       oppChoice: null
  };
  for (let id of Object.keys(JQ_IDs)) {
    JQ_IDs[id] = $(`#${id}`);
  }

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
    let name = JQ_IDs.input_name.val().trim();
    JQ_IDs.input_name.val(""); // empty-out input field
    if (!name){ return; } // ignore empty input
    if (playersRef_me) { return; } // ignore trying to connect again

    playersRef_me = playersRef.child(name);
    playersRef_me.onDisconnect().remove();
    playersRef_me.once("value", function(snap) {
      if (snap.exists()) {
          JQ_IDs.form_alert.html(`A Player with name <strong>${name}</strong> is already in the game.`);
          playersRef_me = null;
      }
      else {
        playersRef_me.set({
          name: name,
        });
        JQ_IDs.playerName.text(name);
        JQ_IDs.input_form.hide();
      }
    });
  });
  // #endregion Clicks


  // #region Firebase Event Handlers
  connectedRef.on("value", function(snap) {
    console.log(snap);
    
    console.log("connection value change", snap.val());
    if (snap.val()){
      let con = connectionsRef.push();
      con.onDisconnect().remove();
      con.set(true);
    }
  });
  
  // connectionsRef.on("value", function(snap){
  //   console.log("users value change", snap.val());
  //   JQ_IDs.playerName.text(name);
  // });
  
  playersRef.on("child_added", function(childSnap, prevChildKey) {
    console.log("player/child_add", childSnap, childSnap.val(), prevChildKey || null);
    // See if this is my opponet joining the game 
    if (  (!prevChildKey && !playersRef_me ) //  first connection and I haven't joined yet 
       || ( prevChildKey && !playersRef_opp) // second connection and opponent hasn't already
        ) {
      JQ_IDs.oppName.text(childSnap.val().name);
      playersRef_opp = playersRef.child(childSnap.val().name);
    }
  });
  // #endregion Firebase Event Handlers
});
