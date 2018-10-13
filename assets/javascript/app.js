$(document).ready(function() {
  console.log("READY!");

  let db = loadPersonalFirebase();

  db.ref().on("value", function(valueSnap) {
    console.log("updating from value trigger");
    console.log(valueSnap.val());
  });

  // db.ref().push({
  //   test: "test"
  // });
});
