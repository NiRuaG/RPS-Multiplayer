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

     p1Name   : null,
     p1Status : null,
     p1Wins   : null,
     p1Losses : null,

     p2Name   : null,
     p2Status : null,
     p2Wins   : null,
     p2Losses : null,
     
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
    myChoices: null,
      choice : null,
      pStats : null,
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
  let     player1Ref = db.ref("/players/1");
  let     player2Ref = db.ref("/players/2");
  let    playerMeRef = null;
  let       namesRef = db.ref("/names");
  let        chatRef = db.ref("/chat");
  let   playerOppRef = null;
  // #endregion Firebase Setup
  
  // #region Utility Functions
  const enumThrows = { ROCK: 0, PAPER: 1, SCISSORS: 2, LIZARD: 3, SPOCK: 4 };
  
  // 5x5 array with default Ties's 
  let matchUps = Array(Object.keys(enumThrows).length);
  for(var i=0; i< matchUps.length; i++){
    matchUps[i] = Array(Object.keys(enumThrows).length).fill({winner: 0, how: "ties", loser: 0});
  }
  
  function setMatchUp(winThrow, beats, loseThrow) {
    matchUps[winThrow ][loseThrow] = { winner: 1, how: beats, loser: 2 };  
    matchUps[loseThrow][winThrow ] = { winner: 2, how: beats, loser: 1 };
  }

  // Only need to set what beats what, helper function above makes sure the opposite matchup is accounted for
  setMatchUp(enumThrows.ROCK    , "crushes"    , enumThrows.SCISSORS);
  setMatchUp(enumThrows.SCISSORS, "cuts"       , enumThrows.PAPER   );
  setMatchUp(enumThrows.PAPER   , "covers"     , enumThrows.ROCK    );
  setMatchUp(enumThrows.ROCK    , "crushes"    , enumThrows.LIZARD  );
  setMatchUp(enumThrows.LIZARD  , "poisons"    , enumThrows.SPOCK   );
  setMatchUp(enumThrows.SPOCK   , "smashes"    , enumThrows.SCISSORS);
  setMatchUp(enumThrows.SCISSORS, "decapitates", enumThrows.LIZARD  );
  setMatchUp(enumThrows.LIZARD  , "eats"       , enumThrows.PAPER   );
  setMatchUp(enumThrows.PAPER   , "disproves"  , enumThrows.SPOCK   );
  setMatchUp(enumThrows.SPOCK   , "vaporizes"  , enumThrows.ROCK    );

  function updateMyState(mySnap) {
    
  }
  // #endregion Utility Functions

  // #region Click & Submit Functions
  // User Entered Name to Connect to Game
  JQ_IDs.joinSubmit.click(function (event) {
  });

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
          choice: "",
          wins: 0,
          losses: 0,
        }); // TODO: on success

        // playerMeRef.on("value", updateMyState);
  
        return false;
      }
    });

  });

  // User selected a RPS
  JQ_CLASSes.choice.click(function(event) {
    // TODO: see if already locked
    console.log("Clicking a choice");
    JQ_CLASSes.myChoices.addClass("locked");
    JQ_CLASSes.choice.hide();
    let $this = $(this);
    $this.show().addClass("active");
    myChoice = $this.data("choice");
    playerMeRef.update({choice: "locked"});
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

  player1Ref.on("value", function (dataSnap) {
    const val = dataSnap.val();
    console.log("player1/value", val);
    if (!val) {
      JQ_IDs.p1Name  .text("Player 1"  );
      JQ_IDs.p1Status.text("not joined");
      return;
    }

    JQ_IDs.p1Name  .text(val.name  );
    JQ_IDs.p1Wins  .text(val.wins  );
    JQ_IDs.p1Losses.text(val.losses);

    JQ_IDs.p1Status.text(numPlyrJoined === 1 ? 'waiting for a challenger' : ""); // val[1].name

    switch (val.choice) {
      case "locked":
        JQ_IDs.p1Status.text("has decided");
        break;
      case "deciding":
        JQ_IDs.p1Status.text("..thinking..");
        break;
      default:
        JQ_IDs.p1Status.text(`chose ${val.choice}`);
    }
  });

  player2Ref.on("value", function(dataSnap) {
    const val = dataSnap.val();
    console.log("player2/value", val);
    if (!val) {
      JQ_IDs.p2Name  .text("Player 2"  );
      JQ_IDs.p2Status.text("not joined");
      return;
    }

    JQ_IDs.p2Name  .text(val.name  );
    JQ_IDs.p2Wins  .text(val.wins  );
    JQ_IDs.p2Losses.text(val.losses);

    JQ_IDs.p2Status.text(numPlyrJoined === 1 ? 'waiting for a challenger' : ""); // val[1].name

    switch (val.choice) {
      case "locked":
        JQ_IDs.p2Status.text("has decided");
        break;
      case "deciding":
        JQ_IDs.p2Status.text("..thinking..");
        break;
      default:
        JQ_IDs.p2Status.text(`chose ${val.choice}`);
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

    JQ_CLASSes.myChoices.removeClass("locked");
    JQ_CLASSes.choice.show();
    JQ_CLASSes.choice.removeClass("active");

    JQ_CLASSes.myChoices.addClass("invisible");
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
      
      if (p1Val.choice === "locked" && p2Val.choice === "locked") {
        // If I'm an active player (not observer), update to reveal my choice
        if (playerMeRef) { playerMeRef.update({choice: myChoice}) };
      }

      let p1Choice = p1Val.choice.toUpperCase();
      let p2Choice = p2Val.choice.toUpperCase();
      if (enumThrows.hasOwnProperty(p1Choice) && enumThrows.hasOwnProperty(p2Choice)) {        
        let p1Throw = enumThrows[p1Choice];
        let p2Throw = enumThrows[p2Choice];

        let winner = matchUps[p1Throw][p2Throw].winner;

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
            playerMeRef.update({   wins: myWins   + 1 });
          } else if (winner) {
            playerMeRef.update({ losses: myLosses + 1 });
          }
        }
        // TODO: timeout before next game
      }
    }

    else { // not in a match, players are joining
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
    if (myPlayerID > 0) {
      let oppPlayerID = (myPlayerID % 2)+1;
      JQ_CLASSes.myChoices.eq( myPlayerID-1).removeClass("invisible");
      JQ_CLASSes.pStats.removeClass("invisible");
      // JQ_CLASSes.myChoices.eq(oppPlayerID-1).hide();
      // JQ_CLASSes.myStats  .eq(oppPlayerID-1).hide();
    }

    JQ_IDs.p1Status.text("..thinking..");
    JQ_IDs.p2Status.text("..thinking..");
  }
  // #endregion Game Functions
});
