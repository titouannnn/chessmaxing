const webApi = typeof browser !== "undefined" ? browser : chrome;

// LOG IMMEDIAT POUR DEBUG
console.log("!!! CHESSMAXING BRIDGE LOADED !!!");

let pgnSent = false;

function sendPgnToPage(pgn) {
  if (pgnSent) return;
  console.log("ChessMaxing: Sending PGN to React page...");
  window.postMessage({ type: "FROM_EXTENSION", pgn: pgn }, "*");
}

function trySendPgn() {
  if (pgnSent) return;
  webApi.storage.local.get("pgn").then((result) => {
    if (result.pgn) {
      sendPgnToPage(result.pgn);
    }
  });
}

window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GET_PGN_FROM_EXTENSION") {
    trySendPgn();
  }
  if (event.data && event.data.type === "PGN_RECEIVED") {
    console.log("ChessMaxing: PGN received by page, stopping.");
    pgnSent = true;
    webApi.storage.local.remove("pgn");
  }
});

// Essayer immédiatement et plusieurs fois
trySendPgn();
for (let i = 1; i <= 10; i++) {
  setTimeout(trySendPgn, i * 500);
}
