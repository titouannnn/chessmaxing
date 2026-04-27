// 1. On définit webApi tout en haut du fichier
const webApi = typeof browser !== "undefined" ? browser : chrome;
const btn = document.getElementById('btn');
const mess = document.getElementById('status-message');

const getPGNManual = async (tabId) => {
  // Utilisation de l'API scripting via webApi
  const results = await webApi.scripting.executeScript({
    target: { tabId: tabId },
    func: async () => {
      const delay = (ms) => new Promise(res => setTimeout(res, ms));

      // 1. Bouton Share
      const shareBtn = document.querySelector("[data-cy='sidebar-share-icon']");
      if (!shareBtn) return {error: "PGN not find. Are you on a chess.com game ?"};
      shareBtn.click();

      await delay(500);

      // 2. Onglet PGN
      const pgnTab = document.querySelector("#tab-pgn");
      if (!pgnTab) return { error: "PGN button not find" };
      pgnTab.click();

      await delay(300);

      // 3. Lire le PGN
      const pgnArea = document.querySelector("[name='pgn']");
      const pgnValue = pgnArea ? pgnArea.value : null;

      // 4. Fermer la modale
      const closeBtn = document.querySelector(".share-menu-modal-header button");
      if (closeBtn) closeBtn.click();

      return { pgn: pgnValue };
    }
  });

  // Récupération du résultat
  const res = results[0].result;
  if (res && res.error) throw new Error(res.error);
  return res ? res.pgn : null;
};

function writeErrorMessage(mess, text) {
  const originalText = mess.innerText;
  const originalColor = mess.style.color;

  mess.innerText = text;
  mess.style.color = "#f80808";

  // get back to the previous style after 3 seconds
  setTimeout(() => {
      mess.innerText = originalText;
      mess.style.color = originalColor;
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {

    btn.addEventListener('click', async () => {
        try {
            // On utilise webApi ici aussi
            const tabs = await webApi.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) return;
            
            const tabId = tabs[0].id;

            // Vérification de l'API scripting
            if (!webApi.scripting) {
                // alert("L'API scripting n'est pas disponible sur Firefox. Vérifiez le manifest.json.");
                writeErrorMessage(mess, "L'API scripting n'est pas disponible sur Firefox. Vérifiez le manifest.json.")
                return;
            }

            const pgn = await getPGNManual(tabId);

            if (!pgn) {
                // alert("Impossible de récupérer le PGN.");
                writeErrorMessage(mess, "It's not possible to get the PGN");
                return;
            }

            mess.innerText = "Exported !";
            mess.style.color = "#08f860";

            await webApi.storage.local.set({ pgn });
            
            webApi.tabs.create({
                url: "http://localhost:3000/analysis"
            });

        } catch (e) {
            // alert("Error: " + e.message);
            writeErrorMessage(mess, "Error: " + e.message);
        }
    });
});