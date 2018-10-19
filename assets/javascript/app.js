$(document).ready(function() {
  // console.log("READY");
  
  let JQ_IDs = {
    joinForm   : null,
    joinName   : null,
    joinSubmit : null,
    joinAlert  : null,
    joinResult : null,

    //  p1Div    : null,
     p1Name   : null,
     p1Status : null,
     p1Wins   : null,
     p1Losses : null,

    //  p2Div    : null,
     p2Name   : null,
     p2Status : null,
     p2Wins   : null,
     p2Losses : null,
     
       result : null,

    chat      : null,
    chatForm  : null,
    chatText  : null,
    chatInput : null,
    chatAlert : null
  };
  for (let id of Object.keys(JQ_IDs)) {
    JQ_IDs[id] = $(`#${id}`);
  }

  let JQ_CLASSes = {
    myChoices: null,
      choice : null,
      // pStats : null,
  }
  for (let cl of Object.keys(JQ_CLASSes)) {
    JQ_CLASSes[cl] = $(`.${cl}`);
  }

  const playerStatuses = {
     waiting : "waiting for a challenger!",
    thinking : "..thinking..",
     decided : "has decided",
       chose : "chose",
  }
  
  // #region Game Variables
  let nextPlayerID  = 0; // ID of next player to join (1 or 2)
  let numPlyrJoined = 0; // Number of players that have joined game (limit 2)
  let inAMatch = false;  //
  // #endregion Game Variables

  // #region (personal) Game Variables
  let myName     = "";
  let myPlayerID = 0 ;
  let myChoice   = "";
  let myWins     = 0 ;
  let myLosses   = 0 ;
  // #endregion (personal) Game Variables
  
  // #region Firebase Setup & References
  let db = loadFirebase();
  
  let   connectedRef = db.ref(".info/connected");
  let connectionsRef = db.ref("/connections");
  let       namesRef = db.ref("/names");
  let        chatRef = db.ref("/chat");
  let     playersRef = db.ref("/players");
  let     player1Ref = db.ref("/players/1");
  let     player2Ref = db.ref("/players/2");
  let    playerMeRef = null;
  // let   playerOppRef = null;
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
  // #endregion Utility Functions


  // #region Click & Submit Functions

  // User Entered Name to Connect to Game
  JQ_IDs.joinForm.submit(function(event) {
    event.preventDefault();
    JQ_IDs.joinAlert.empty();

    let name = JQ_IDs.joinName.val().trim();
    if (!name) { return; } // ignore empty input

    if (playerMeRef) { // ignore trying to re-join
      JQ_IDs.joinAlert.append("You are already playing.");
      return;
    }

    JQ_IDs.joinName.val(""); // empty-out input field

    namesRef.once("value", function (dataSnap) {
      // Check for duplicate name
      if (dataSnap.hasChild(name)) {
        JQ_IDs.joinAlert.append(`Player with name ${name} has already joined.`);
      }
      else {
        if (myName) {
          namesRef.child(myName).set(null); // force removal of previous name from firebase, if trying to overwrite
        }

        // Make a new entry in the firebase names list
        let myNameRef = namesRef.child(name);
        myNameRef.set(true)
        myNameRef.onDisconnect().remove();
  
        myName = name;
        JQ_IDs.joinForm.hide();
  
        if (numPlyrJoined === 2) {
          JQ_IDs.joinResult.append(`Sorry ${name}, game is full. Please wait and chat.`);
          return;
        }
  
        playerMeRef = playersRef.child(nextPlayerID);
        playerMeRef.onDisconnect().remove();
        myPlayerID = nextPlayerID;
        playerMeRef.set({
          name: name,
          status: playerStatuses.waiting,
          wins: 0,
          losses: 0,
        }); 

        return;
      }
    });
  });

  // User selected a RPSLS
  JQ_CLASSes.choice.click(function(event) {
    // TODO: see if already locked?
    // console.log("Clicking a choice");

    // DOM changes
    JQ_CLASSes.myChoices.addClass("locked"   );
    JQ_CLASSes.choice   .addClass("invisible");
    let $this = $(this);
    $this.removeClass("invisible").addClass("active");

    // (personal) Game Variables 
    myChoice = $this.data("choice");

    // Update status to firebase 
    playerMeRef.update({status: playerStatuses.decided});
  });

  // Add Chat Message
  JQ_IDs.chatForm.submit(function(event) {
    event.preventDefault();
    JQ_IDs.chatAlert.empty();
    if (!myName) {
      JQ_IDs.chatAlert.append("Please join above with a name first");
      return false;
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
    // console.log("connected/value", val);
    
    if (val) {
      let con = connectionsRef.push();
      con.onDisconnect().remove();
      con.set(true);
    }
  });


  // Update Player 1 State
  player1Ref.on("value", function (dataSnap) {
    const val = dataSnap.val();
    // console.log("player1/value", val);
    if (!val) {
      JQ_IDs.p1Name  .text("Player 1"  );
      JQ_IDs.p1Status.text("not joined");
      JQ_IDs.p1Wins  .text(0);
      JQ_IDs.p1Losses.text(0);
      return;
    }

    JQ_IDs.p1Name  .text(val.name  );
    JQ_IDs.p1Wins  .text(val.wins  );
    JQ_IDs.p1Losses.text(val.losses);
    JQ_IDs.p1Status.text(val.status);
  });


  // Update Player 2 State
  player2Ref.on("value", function(dataSnap) {
    const val = dataSnap.val();
    // console.log("player2/value", val);
    if (!val) {
      JQ_IDs.p2Name  .text("Player 2"  );
      JQ_IDs.p2Status.text("not joined");
      JQ_IDs.p2Wins  .text(0);
      JQ_IDs.p2Losses.text(0);
      return;
    }

    JQ_IDs.p2Name  .text(val.name  );
    JQ_IDs.p2Wins  .text(val.wins  );
    JQ_IDs.p2Losses.text(val.losses);
    JQ_IDs.p2Status.text(val.status);
  });
  
  // playersRef.on("child_added", function(childSnap, prevChildKey) {
  //   // ++numPlyrJoined;
  //   const val = childSnap.val();
  //   console.log("players/child_add", val, prevChildKey);
  // });

  playersRef.on("child_removed", function (oldChildSnap) {
    // When a player disconnects in the middle of a game, do some resets

    // const val = oldChildSnap.val();
    // console.log("players/child_removed", oldChildSnap.key, val, inAMatch);

    JQ_CLASSes.myChoices.removeClass("locked").addClass("invisible");
    JQ_CLASSes.choice.removeClass("invisible").removeClass("active");

    // If previously in middle of a match, then update the remaining player's status to be waiting
    if (oldChildSnap.key === "1" && inAMatch) {
      inAMatch = false;
      player2Ref.update({ status: playerStatuses.waiting });
    }
    else if (oldChildSnap.key === "2" && inAMatch) {
      inAMatch = false;
      player1Ref.update({ status: playerStatuses.waiting });
    }
  });
  
  playersRef.on("value", function (dataSnap) {
    // Update Game State Variables 
    numPlyrJoined = dataSnap.numChildren(); // number of players in the game

    let p1Child = dataSnap.child(1);
    let p2Child = dataSnap.child(2);
    nextPlayerID = (p1Child.exists() ? (p2Child.exists() ? 0 : 2) : 1); // what player slot is open


    const val = dataSnap.val();
    // console.log("players/value", val || null);
    if (!val) { return; }

    if (inAMatch) {
      let p1Val = p1Child.val();
      let p2Val = p2Child.val();

      // Check if both players have decided their choice
      if (p1Val.status === playerStatuses.decided && p2Val.status === playerStatuses.decided) {
        // If I'm an active player (not observer), update to "reveal" my choice
        if (playerMeRef) {
          playerMeRef.update(
            {
              status: `${playerStatuses.chose} ${myChoice}`,
              choice: myChoice
            });
        }
      }

      // Check if both players have revealed their choice
      if (p1Child.child("choice").exists() && p2Child.child("choice").exists()) {
        // See who's choice was the winner
        let p1Choice = p1Val.choice.toUpperCase();
        let p2Choice = p2Val.choice.toUpperCase();

        // double check that the choices are 'valid' (are in the matchup array)
        if (enumThrows.hasOwnProperty(p1Choice) && enumThrows.hasOwnProperty(p2Choice)) {
          let p1Throw = enumThrows[p1Choice];
          let p2Throw = enumThrows[p2Choice];

          const matchup = matchUps[p1Throw][p2Throw];
          const winner = matchup.winner;
          
          let winThrow = null;
          let loseThrow = null;
          let winnerName = null;
          switch (winner) {
            case 0: // TIE
              // set these variables even in a TIE result
              winThrow   = p1Choice; 
              loseThrow  = p2Choice;
              winnerName = "";
              break;
            case 1: // Player 1 Won
              winThrow   = p1Choice;
              loseThrow  = p2Choice;
              winnerName = p1Val.name;
              break;
            case 2: // Player 2 Won
              winThrow   = p2Choice;
              loseThrow  = p1Choice;
              winnerName = p2Val.name;
              break;
          }

          // Show result DOM element
          JQ_IDs.result.text(winnerName ? `${winnerName} WINS!` : `TIE!`);

          // Add message to chat for result
          JQ_IDs.chatText
            .prepend(`${winThrow} ${matchup.how} ${loseThrow}\n`);
          
          // Show on screen both Player 1 & 2's choice
          JQ_CLASSes.choice.filter(`[data-choice="${p1Val.choice}"]`).eq(0).removeClass("invisible").addClass("visible");
          JQ_CLASSes.choice.filter(`[data-choice="${p2Val.choice}"]`).eq(1).removeClass("invisible").addClass("visible");
          
          // Timeout before starting a new game
          setTimeout(function() {
            // If I'm an active player, update my stats & state
            if (playerMeRef) { 
              if (winner === myPlayerID) {
                ++myWins;
                playerMeRef.update({ wins: myWins, choice: null}); 
              } else if (winner) { // there was a winner (not a tie), but it wasn't me = loss
                ++myLosses;
                playerMeRef.update({ losses: myLosses, choice: null });
              }
              else { // was a tie
                playerMeRef.update( {choice: null} ); // it's important to still null out the choice, so not to fall back into this loop
              }
            }
            startNewGame();
          }, 1000 * 3); // 3 seconds
        }
        else {
          // Some player had an invalid choice, try a new game
          console.log("Invalid choices, trying new game");
          setTimeout(startNewGame, 1000 * 2);
        }
      }
    }
    else { // not yet in a match, players are joining
      if (numPlyrJoined === 2) {
        startNewMatch();
      }
    }
  });

  // Only show chat messages since connecting
  chatRef.once("value", function(dataSnap) {
    JQ_IDs.chatText.empty();
  });

  chatRef.on("value", function(dataSnap) {
    JQ_IDs.chatText
      .prepend(document.createTextNode(`${dataSnap.val()} \n`)); // createTextNode to escape sneaky html sequences "<tag>"
  });
  // #endregion Firebase Event Handlers


  // #region Game Functions
  function startNewGame() {

    // Clear/Reset DOM elements
    JQ_IDs.result.empty();
    JQ_CLASSes.myChoices.removeClass("locked");
    JQ_CLASSes.choice.removeClass("visible invisible active");

    // Clear/Reset Game Variables
    myChoice = "";

    // If I'm an active player, my start of a game status is 'thinking'
    if (playerMeRef && inAMatch) { // need to dobule check for inAMatch in case a player disconnected in between revealing choices and starting a new game
      playerMeRef.update({ status: playerStatuses.thinking });
    }
  }

  function startNewMatch() {
    // console.log("STARTING A MATCH");
    inAMatch = true;

    // If I'm
    if (myPlayerID > 0) {
      // Show on screen choices for my player # (1 or 2)
      JQ_CLASSes.myChoices.eq(myPlayerID - 1).removeClass("invisible");
    }

    startNewGame();
  }
  // #endregion Game Functions
});
