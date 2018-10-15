// let myPlayerID = 1;

$(document).ready(function() {
  console.log("READY");
  
  let JQ_IDs = {
    joinForm   : null,
    joinName   : null,
    joinSubmit : null,
    joinAlert  : null,
    joinResult : null,

      // players : null,

       p1Type : null,
       p1Name : null,
     p1Status : null,

       p2Type : null,
       p2Name : null,
     p2Status : null,
     
     myStats  : null,
     myChoices: null,
     myWins   : null,
     myLosses : null,

       result : null,

         chat : null,

    chatForm  : null,
    chatText  : null,
    chatInput : null,
    chatAlert : null
  };
  for (let id of Object.keys(JQ_IDs)) {
    JQ_IDs[id] = $(`#${id}`);
  }
  // console.log(JQ_IDs);

  let JQ_CLASSes = {
    playerDiv: null,
       choice: null,
  }
  for (let cl of Object.keys(JQ_CLASSes)) {
    JQ_CLASSes[cl] = $(`.${cl}`);
  }
  // console.log(JQ_CLASSes);  

  let nextPlayerID = 0; // ID of next player to join (1 or 2)
  let numPlyrJoined = 0;
  let inAMatch = false;

  let myName = "";
  let myPlayerID = 0 ;
  let myChoice   = "";
  let myWins = 0;
  let myLosses = 0;
  
  // #region Firebase Setup  
  let db = loadPersonalFirebase();
  // let db = {};
  
  let   connectedRef = db.ref(".info/connected");
  let connectionsRef = db.ref("/connections");
  let     playersRef = db.ref("/players");
  let    playerMeRef = null;
  let       namesRef = db.ref("/names");
  let        chatRef = db.ref("/chat");
  // let   playerOppRef = null;
  // #endregion Firebase Setup
  
  // #region Utility Functions
  // Returns 0 for tie, otherwise 1 or 2 for winner
  let calcWinner = (p1, p2) => {
    if (p1 === p2) {
      return 0; // Tie
    }
    switch (p1) {
      case "rock":
        return (p2 === "paper" ? 2 : 1)

      case "paper":
        return (p2 === "scissors" ? 2 : 1)

      case "scissors":
        return (p2 === "rock" ? 2 : 1)

      default:
        return 0;
    }
  }

  function updateMyState(mySnap) {
    const val = mySnap.val()
    console.log("updating my state", val);
    if (!val) { return; }
    JQ_IDs.myWins  .text(val.wins  );
    JQ_IDs.myLosses.text(val.losses);
  }
  // #endregion Utility Functions

  // #region Click & Submit Functions
  // User Entered Name to Connect to Game
  JQ_IDs.joinSubmit.click(function (event) {
  });

  // User selected a RPS
  JQ_IDs.joinForm.submit(function (event) {
    event.preventDefault();
    JQ_IDs.joinAlert.empty();

    let name = JQ_IDs.joinName.val().trim();
    if (!name) { return; } // ignore empty input

    if (playerMeRef) { // ignore trying to re-join
      JQ_IDs.joinAlert.append("You are already playing.");
      return;
    }

    JQ_IDs.joinName.val(""); // empty-out input field
    // Check for duplicate name
    namesRef.once("value", function (dataSnap) {
      if (dataSnap.hasChild(name)) {
        JQ_IDs.joinAlert.append(`Player with name ${name} has already joined.`);
      }
      else {
        if (myName) {
          namesRef.child(myName).set(null);
        }
        // Make a new entry in the names list
        let myNameRef = namesRef.child(name);
        myNameRef.set(true)
        myNameRef.onDisconnect().remove();
  
        myName = name;
        JQ_IDs.joinForm.hide();
  
        if (numPlyrJoined === 2) {
          JQ_IDs.joinResult.append(`Sorry ${name}, game is full. Please wait and chat.`);
          return false;
        }
  
        playerMeRef = playersRef.child(nextPlayerID);
        playerMeRef.onDisconnect().remove();
        myPlayerID = nextPlayerID;
        playerMeRef.set({
          name: name,
          choice: "deciding",
          wins: 0,
          losses: 0,
        }); // TODO: on success
        playerMeRef.on("value", updateMyState);
  
        return false;
      }
    });

  });

  JQ_CLASSes.choice.click(function(event) {
    // TODO: see if already locked
    console.log("Clicking a choice");
    JQ_IDs.myChoices.addClass("locked");
    let $this = $(this);
    $this.addClass("selected");
    myChoice = $this.data("choice");
    playerMeRef.update({choice :"locked"});
  });

  // Add Chat
  JQ_IDs.chatForm.submit(function(event) {
    JQ_IDs.chatAlert.empty();
    event.preventDefault();
    if (!myName) {
      JQ_IDs.chatAlert.append("Please join above with a name first");
      return;
    }

    let text = JQ_IDs.chatInput.val().trim();
    JQ_IDs.chatInput.val("");
    if (!text) { return false; }

    // overwrite last chat message
    // chatRef.set(null);
    chatRef.set(`${myName}: ${text}`);

    return false;
  });
  // #endregion Click Functions

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
    
  playersRef.on("child_added", function(childSnap, prevChildKey) {
    // ++numPlyrJoined;
    const val = childSnap.val();
    console.log("players/child_add", val, prevChildKey);
  });

  playersRef.on("child_removed", function(oldChildSnap) {
    // --numPlyrJoined;
    const val = oldChildSnap.val();
    console.log("players/child_removed", val);
    inAMatch = false;
    JQ_IDs.myChoices.removeClass("locked");
    JQ_CLASSes.choice.removeClass("selected");
    JQ_IDs.myChoices.hide();
    // if (playersRef_opp.key === val.name) {
    //   console.log("My opponent left");
    // }
  });
  
  playersRef.on("value", function (dataSnap) {
    numPlyrJoined = dataSnap.numChildren();
    const val = dataSnap.val();
    console.log("players/value", val || null);
    
    let p1Snap = dataSnap.child(1);
    let p2Snap = dataSnap.child(2);

    nextPlayerID = (p1Snap.exists() ? (p2Snap.exists() ? 0 : 2) : 1);

    if (!val) { return; }

    if (inAMatch) {
      let p1Val = p1Snap.val();
      let p2Val = p2Snap.val();
      let p1Lock = false;
      let p2Lock = false;
      let p1Reveal = false;
      let p2Reveal = false;
      switch (p1Val.choice) {
        case "locked":
          p1Lock = true;
          JQ_IDs.p1Status.text("has decided");
          break;
        case "deciding":
          JQ_IDs.p1Status.text("..thinking..");
          break;
        default:
          p1Reveal = true;
          JQ_IDs.p1Status.text(`chose ${p1Val.choice}`);
      }
      switch (p2Val.choice) {
        case "locked":
          p2Lock = true;
          JQ_IDs.p2Status.text("has decided");
          break;
        case "deciding":
          JQ_IDs.p2Status.text("..thinking..");
          break;
        default:
          p2Reveal = true
          JQ_IDs.p2Status.text(`chose ${p2Val.choice}`);
      }
      if (p1Lock && p2Lock) {
        // console.log("Both players locked in!");
        // Both players choice are locked in
        // If I'm an active player (not observer), update to reveal my choice
        if (playerMeRef) { playerMeRef.update({choice: myChoice}) };
      }

      if (p1Reveal && p2Reveal) {
        let winner = calcWinner(p1Val.choice, p2Val.choice);
        switch (winner) {
          case 0:
            JQ_IDs.result.text("TIE!");
            break;
          case 1:
            JQ_IDs.result.text(`${p1Val.name} wins`);
            break;
          case 2:
            JQ_IDs.result.text(`${p2Val.name} wins`);
            break;
        }
        if (playerMeRef) { // If I'm an active player, update my stats
          if (winner === myPlayerID) {
            playerMeRef.update({ wins: myWins + 1 });
          } else if (winner) {
            playerMeRef.update({ losses: myLosses + 1 });
          }
        }
        // TODO: timeout before next game
      }
    }

    else { // not in a match, players are joining
      if (p1Snap.exists()) {
        JQ_IDs.p1Type.text(myPlayerID === 1 ? '(ME)' : '');
        JQ_IDs.p1Name.text(p1Snap.val().name); // val[1].name
        JQ_IDs.p1Status.text(numPlyrJoined === 1 ? 'is waiting for a challenger' : ""); // val[1].name
      }
      else {
        JQ_IDs.p1Type.text("");
        JQ_IDs.p1Name.text("Player 1");
        JQ_IDs.p1Status.text("not joined");
      }

      if (p2Snap.exists()) {
        JQ_IDs.p2Type.text(myPlayerID === 2 ? '(ME)' : '');
        JQ_IDs.p2Name.text(p2Snap.val().name);
        JQ_IDs.p2Status.text(numPlyrJoined === 1 ? 'is waiting for a challenger' : ""); // val[1].name
      }
      else {
        JQ_IDs.p2Type.text("");
        JQ_IDs.p2Name.text("Player 2");
        JQ_IDs.p2Status.text("not joined");
      }

      if (numPlyrJoined === 2) {
        startNewMatch();
      }
    }
  });

  // Only show chat since connecting
  chatRef.once("value", function(dataSnap) {
    JQ_IDs.chatText.empty();
  });

  chatRef.on("value", function(dataSnap) {
    JQ_IDs.chatText
      .append(document.createTextNode(`${dataSnap.val()} \n`)); // createTextNode to escape sneaky html sequences "<tag>"
  });
  // #endregion Firebase Event Handlers

  // #region Game Functions
  function startNewMatch() {
    console.log("STARTING A MATCH");
    inAMatch = true;
    if (myPlayerID > 0){
      JQ_CLASSes.playerDiv.eq(myPlayerID-1).append(JQ_IDs.myChoices, JQ_IDs.myStats);
      JQ_IDs.myChoices.show();
      JQ_IDs.myStats.show();
    }
    JQ_IDs.p1Status.text("..thinking..");
    JQ_IDs.p2Status.text("..thinking..");
  }
  // #endregion Game Functions
});
