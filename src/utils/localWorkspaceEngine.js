/**
 * Local-First Workspace & User-Controlled Encrypted Backup Engine (Zero-Knowledge)
 * All client accounting documents & backups reside strictly on the user's device or user's own cloud.
 */

export const WORKSPACE_ROOT_NAME = "ShiftPulse_Workspace";

export const WORKSPACE_TREE = {
  "01_Ulaz_Dokumenta": [
    "Fakture_Racuni",
    "Otpremnice",
    "POS_Slipovi_Fiskalni",
    "Bankarski_Izvodi",
    "Obrada_Zavrseno",
  ],
  "02_Izlaz_Dokumenta": [
    "Bilansi_Porezi_CSV",
    "Zarade_ePorezi_XML",
    "Virmani_Nalozi",
    "Arhiva_Ugovori",
  ],
  "03_Korisnicki_Backup": [],
};

export const WORKSPACE_README_TEXT = `SHIFTPULSE LEDGER PRO — LOKALNI RADNI PROSTOR (OFFLINE READY)
==================================================================
Svi poslovni podaci, fakture, otpremnice i obračuni čuvaju se ISKLJUČIVO lokalno na vašem uređaju.
Centralni server nema uvid u vaše podatke (radi isključivo kao gateway za licencu i propise).

STRUKTURA FOLDERA:
1) 01_Ulaz_Dokumenta/
   - Fakture_Racuni/       -> Ubacite ulazne i izlazne SEF XML, PDF ili TXT račune
   - Otpremnice/           -> Ubacite otpremnice i prijemnice robe
   - POS_Slipovi_Fiskalni/ -> Ubacite POS slipove i fiskalne isečke
   - Bankarski_Izvodi/     -> Ubacite CSV/XML izvode iz banke
   - Obrada_Zavrseno/      -> Arhiva već proknjiženih ulaznih dokumenata

2) 02_Izlaz_Dokumenta/
   - Bilansi_Porezi_CSV/   -> Aplikacija ovde snima obračune prihoda, rashoda, PDV i dobiti
   - Zarade_ePorezi_XML/   -> Aplikacija ovde snima PPP-PD XML deklaracije i obračune zarada
   - Virmani_Nalozi/       -> Aplikacija ovde snima naloge za prenos
   - Arhiva_Ugovori/       -> Rešenja za odmore, bolovanja i ugovori

3) 03_Korisnicki_Backup/
   - Lokalni i AES-256-GCM šifrovani backup fajlovi. Ako povežete folder unutar
     Google Drive / OneDrive / Dropbox direktorijuma, backup se automatski sinhronizuje
     isključivo u VAŠ lični cloud nalog.
`;

const IDB_DB_NAME = "shiftpulse_workspace_idb_v1";
const IDB_STORE_NAME = "handles";
const IDB_HANDLE_KEY = "primary_workspace_root";

export function isFileSystemAccessSupported() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

function openHandleDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB nije dostupan u ovom okruženju."));
      return;
    }
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
        db.createObjectStore(IDB_STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB greška"));
  });
}

export async function saveWorkspaceHandleToDb(dirHandle) {
  const db = await openHandleDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_NAME, "readwrite");
    tx.objectStore(IDB_STORE_NAME).put(dirHandle, IDB_HANDLE_KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function restoreSavedWorkspaceHandle() {
  try {
    const db = await openHandleDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readonly");
      const req = tx.objectStore(IDB_STORE_NAME).get(IDB_HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearSavedWorkspaceHandle() {
  try {
    const db = await openHandleDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE_NAME, "readwrite");
      tx.objectStore(IDB_STORE_NAME).delete(IDB_HANDLE_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function verifyWorkspacePermission(handle, requestIfPrompt = false) {
  if (!handle) return false;
  try {
    const opts = { mode: "readwrite" };
    if ((await handle.queryPermission(opts)) === "granted") return true;
    if (requestIfPrompt && (await handle.requestPermission(opts)) === "granted") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function ensureDir(parentHandle, name) {
  return parentHandle.getDirectoryHandle(name, { create: true });
}

async function writeTextFile(dirHandle, filename, content) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
  return fileHandle;
}

/**
 * Inicijalizuje kompletnu strukturu foldera unutar izabranog direktorijuma (ili pravi ShiftPulse_Workspace podfolder)
 */
export async function initializeBrowserWorkspaceTree(pickedHandle) {
  const rootHandle =
    pickedHandle.name === WORKSPACE_ROOT_NAME
      ? pickedHandle
      : await ensureDir(pickedHandle, WORKSPACE_ROOT_NAME);

  for (const [topFolder, subFolders] of Object.entries(WORKSPACE_TREE)) {
    const topDir = await ensureDir(rootHandle, topFolder);
    for (const sub of subFolders) {
      await ensureDir(topDir, sub);
    }
  }

  await writeTextFile(rootHandle, "UPUTSTVO_OFFLINE_RAD.txt", WORKSPACE_README_TEXT);
  await writeTextFile(
    rootHandle,
    "workspace-manifest.json",
    JSON.stringify(
      {
        app: "ShiftPulse Ledger Pro",
        storagePolicy: "zero-knowledge-local-only",
        createdAt: new Date().toISOString(),
        tree: WORKSPACE_TREE,
      },
      null,
      2,
    ),
  );

  await saveWorkspaceHandleToDb(rootHandle);
  return rootHandle;
}

export async function pickAndInitializeWorkspace() {
  if (!isFileSystemAccessSupported()) {
    throw new Error(
      "Vaš pregledač ne podržava direktni pristup folderima (koristite Chrome, Edge ili Desktop instalaciju).",
    );
  }
  const picked = await window.showDirectoryPicker({
    id: "shiftpulse_workspace",
    mode: "readwrite",
  });
  return initializeBrowserWorkspaceTree(picked);
}

/**
 * Skenira 01_Ulaz_Dokumenta/* u povezanom browser workspace folderu
 */
export async function scanBrowserInputFiles(rootHandle) {
  if (!rootHandle) return [];
  const hasPerm = await verifyWorkspacePermission(rootHandle, false);
  if (!hasPerm) return [];

  const inputDir = await rootHandle.getDirectoryHandle("01_Ulaz_Dokumenta", { create: true });
  const collected = [];

  for await (const [entryName, entryHandle] of inputDir.entries()) {
    if (entryHandle.kind === "file") {
      if (entryName.startsWith(".") || entryName.endsWith(".txt") && entryName.includes("UPUTSTVO")) {
        continue;
      }
      const file = await entryHandle.getFile();
      collected.push({
        id: `ws-in-${entryName}-${file.size}`,
        subfolder: "01_Ulaz_Dokumenta",
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        source: "browser-fs",
        file,
      });
    } else if (entryHandle.kind === "directory" && entryName !== "Obrada_Zavrseno") {
      for await (const [subEntryName, subEntryHandle] of entryHandle.entries()) {
        if (subEntryHandle.kind === "file" && !subEntryName.startsWith(".")) {
          const file = await subEntryHandle.getFile();
          collected.push({
            id: `ws-in-${entryName}-${subEntryName}-${file.size}`,
            subfolder: entryName,
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            source: "browser-fs",
            file,
          });
        }
      }
    }
  }

  return collected.sort((a, b) => b.lastModified - a.lastModified);
}

/**
 * Snima generisani dokument (CSV, XML, JSON) direktno u 02_Izlaz_Dokumenta/<subfolder>/ ili 03_Korisnicki_Backup/
 */
export async function saveOutputToBrowserWorkspace(
  rootHandle,
  topFolder,
  subFolder,
  filename,
  content,
) {
  if (!rootHandle) return { ok: false, reason: "Nije povezan lokalni folder." };
  const ok = await verifyWorkspacePermission(rootHandle, true);
  if (!ok) return { ok: false, reason: "Dozvola za upis u folder je odbijena." };

  const targetTop = await ensureDir(rootHandle, topFolder);
  const targetDir = subFolder ? await ensureDir(targetTop, subFolder) : targetTop;
  await writeTextFile(targetDir, filename, content);
  return {
    ok: true,
    relativePath: subFolder
      ? `${rootHandle.name}/${topFolder}/${subFolder}/${filename}`
      : `${rootHandle.name}/${topFolder}/${filename}`,
  };
}

// ========================================================
// USER-CONTROLLED AES-256-GCM CLIENT-SIDE ENCRYPTION (Web Crypto)
// ========================================================
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveAesKey(passphrase, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 120000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Šifruje JSON backup isključivo na uređaju korisnika pre odlaska u korisnikov cloud
 */
export async function encryptBackupPayload(plainJsonStr, passphrase) {
  if (!passphrase || !passphrase.trim()) {
    return plainJsonStr;
  }
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error("Web Crypto API nije dostupan za AES-256-GCM enkripciju.");
  }
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const iv = cryptoApi.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(passphrase.trim(), salt);
  const encoded = new TextEncoder().encode(plainJsonStr);
  const encryptedBuf = await cryptoApi.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  return JSON.stringify(
    {
      format: "shiftpulse-encrypted-backup-v1",
      algorithm: "AES-256-GCM",
      kdf: "PBKDF2-SHA256",
      iterations: 120000,
      createdAt: new Date().toISOString(),
      salt: arrayBufferToBase64(salt),
      iv: arrayBufferToBase64(iv),
      ciphertext: arrayBufferToBase64(encryptedBuf),
    },
    null,
    2,
  );
}

export async function decryptBackupPayload(rawText, passphrase = "") {
  const parsed = JSON.parse(rawText);
  if (parsed?.format !== "shiftpulse-encrypted-backup-v1") {
    return rawText;
  }
  if (!passphrase || !passphrase.trim()) {
    throw new Error("Ovaj backup je šifrovan. Unesite vašu lozinku za dešifrovanje.");
  }
  const cryptoApi = globalThis.crypto;
  const salt = base64ToUint8Array(parsed.salt);
  const iv = base64ToUint8Array(parsed.iv);
  const cipherBytes = base64ToUint8Array(parsed.ciphertext);
  const key = await deriveAesKey(passphrase.trim(), salt);

  try {
    const decryptedBuf = await cryptoApi.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBytes,
    );
    return new TextDecoder().decode(decryptedBuf);
  } catch {
    throw new Error("Pogrešna lozinka za dešifrovanje korisničkog backup-a.");
  }
}

/**
 * Direktno slanje šifrovanog backup-a na korisnički Cloud (WebDAV / Nextcloud / S3 Presigned PUT)
 * Nikada ne prolazi kroz developerski server!
 */
export async function uploadBackupToUserCloud({ targetUrl, authHeader, payloadStr }) {
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl.trim())) {
    throw new Error("Unesite ispravan HTTPS URL vašeg Cloud WebDAV ili Pre-Signed endpointa.");
  }
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
  };
  if (authHeader && authHeader.trim()) {
    headers["Authorization"] = authHeader.trim();
  }
  const res = await fetch(targetUrl.trim(), {
    method: "PUT",
    headers,
    body: payloadStr,
  });
  if (!res.ok) {
    throw new Error(`Cloud server vratio status ${res.status} (${res.statusText}). Proverite CORS i token.`);
  }
  return { ok: true, status: res.status };
}
