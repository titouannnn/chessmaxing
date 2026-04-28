// 1. On définit webApi tout en haut du fichier
const webApi = typeof browser !== "undefined" ? browser : chrome;
const btn = document.getElementById('btn');
const mess = document.getElementById('status-message');

const getPGNManual = async (tabId) => {
  const results = await webApi.scripting.executeScript({
    target: { tabId: tabId },
    func: async () => {
      console.log("CHESSMAXER: Début de l'extraction...");
      
      const delay = (ms) => new Promise(res => setTimeout(res, ms + Math.random() * 200));

      const clickElement = (el) => {
        if (!el) return;
        const opts = { bubbles: true, cancelable: true, view: window };
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.click();
      };

      try {
        // ÉTAPE 0 : Vérifier si le PGN est DÉJÀ visible (mode manuel)
        let pgnArea = document.querySelector("[name='pgn']") || 
                       document.querySelector(".share-menu-pgn-textarea") ||
                       document.querySelector("textarea[readonly]");
        
        if (pgnArea && pgnArea.value && pgnArea.value.length > 20) {
          console.log("CHESSMAXER: PGN déjà visible, récupération directe.");
          return { pgn: pgnArea.value };
        }

        // ÉTAPE 1 : Trouver le bouton Share
        const shareBtn = document.querySelector("[data-cy='sidebar-share-icon']") || 
                         document.querySelector(".icon-font-chess-share") ||
                         document.querySelector(".share-menu-button") ||
                         document.querySelector(".board-controls-share") ||
                         document.querySelector("button[aria-label='Share']");

        if (!shareBtn) {
           console.log("CHESSMAXER: Bouton Share non trouvé.");
           return { error: "Bouton de partage non trouvé. Ouvrez-le manuellement sur Chess.com avant de cliquer ici." };
        }
        
        console.log("CHESSMAXER: Clic sur Share...");
        clickElement(shareBtn);
        await delay(1000);

        // ÉTAPE 2 : Trouver l'onglet PGN
        console.log("CHESSMAXER: Recherche de l'onglet PGN...");
        let pgnTab = document.querySelector("#tab-pgn") || 
                     document.querySelector("[data-tab='pgn']") ||
                     document.querySelector(".share-menu-tab-pgn");

        if (!pgnTab) {
          // Recherche textuelle très large
          const allElements = Array.from(document.querySelectorAll("button, div, span, li, a"));
          pgnTab = allElements.find(el => {
            const text = el.textContent.trim();
            return text === "PGN" || text === "PGN/FEN";
          });
        }

        if (!pgnTab) {
          console.log("CHESSMAXER: Onglet PGN introuvable.");
          // On liste les boutons trouvés pour aider au debug dans la console de l'utilisateur
          const btns = Array.from(document.querySelectorAll("button")).map(b => b.textContent.trim());
          console.log("Boutons visibles :", btns);
          return { error: "Onglet PGN introuvable. Ouvrez la fenêtre de partage sur l'onglet PGN manuellement." };
        }
        
        console.log("CHESSMAXER: Clic sur l'onglet PGN...");
        clickElement(pgnTab);
        await delay(800);

        // ÉTAPE 3 : Lire le PGN
        pgnArea = document.querySelector("[name='pgn']") || 
                   document.querySelector(".share-menu-pgn-textarea") ||
                   document.querySelector("textarea[readonly]") ||
                   document.querySelector(".ui_v5-input-component");
        
        const pgnValue = pgnArea ? (pgnArea.value || pgnArea.textContent) : null;

        if (!pgnValue || pgnValue.length < 10) {
          console.log("CHESSMAXER: Zone PGN vide.");
          return { error: "Zone PGN vide. Assurez-vous d'être sur l'onglet PGN." };
        }

        console.log("CHESSMAXER: PGN extrait avec succès.");
        
        // Fermeture
        const closeBtn = document.querySelector(".share-menu-modal-header button") || 
                         document.querySelector(".ui_modal-close") ||
                         document.querySelector(".icon-font-chess-x");
        if (closeBtn) clickElement(closeBtn);

        return { pgn: pgnValue };
      } catch (err) {
        return { error: "Erreur: " + err.message };
      }
    }
  });

  const res = results[0].result;
  if (res && res.error) throw new Error(res.error);
  return res ? res.pgn : null;
};

function writeErrorMessage(mess, text) {
  const originalText = mess.innerText;
  mess.innerText = text;
  mess.style.color = "#f80808";
  setTimeout(() => {
      mess.innerText = "Export to Analysis";
      mess.style.color = "#fff";
  }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    btn.addEventListener('click', async () => {
        try {
            const tabs = await webApi.tabs.query({ active: true, currentWindow: true });
            if (!tabs || tabs.length === 0) return;
            const tabId = tabs[0].id;

            mess.innerText = "Recherche...";
            mess.style.color = "#aaa";

            const pgn = await getPGNManual(tabId);

            if (!pgn) {
                writeErrorMessage(mess, "PGN non trouvé.");
                return;
            }

            mess.innerText = "Exporté !";
            mess.style.color = "#08f860";

            await webApi.storage.local.set({ pgn: pgn });
            
            webApi.tabs.create({
                url: "http://localhost:3000/analysis"
            });

        } catch (e) {
            writeErrorMessage(mess, e.message);
        }
    });
});
