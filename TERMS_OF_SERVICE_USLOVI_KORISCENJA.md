# USLOVI KORIŠĆENJA I UGOVOR O LICENCI KRAJNJEG KORISNIKA (EULA / TERMS OF SERVICE)
**Aplikacija: ShiftPulse Ledger (B2B Hybrid Local-First Accounting & Payroll Suite)**

---

## 1. Prihvatanje uslova (Obavezna EULA potvrda)
Korišćenjem platforme **ShiftPulse Ledger**, pokretanjem 14-dnevne probne evaluacije (`TRIAL_14D`) ili aktivacijom komercijalnog ključa (`MID_MARKET_ANNUAL` / `ENTERPRISE_PERPETUAL_BYO_API`), ovlašćeni predstavnik pravnog lica ili knjigovodstvene agencije potvrđuje i bezuslovno prihvata ovaj Ugovor o licenci krajnjeg korisnika (EULA) i Uslove korišćenja. Softver je namenjen isključivo pravnim licima, preduzetnicima i ovlašćenim računovodstvenim agencijama.

## 2. Zaštita intelektualne svojine (Intellectual Property Protection)
- **Autorska prava:** Kompletan izvorni kod, kriptografski moduli, deterministički motori za obračun zarada i poreza, modularni Country Pack paketi, korisnički interfejs, plugin arhitektura i prateća dokumentacija isključivo su intelektualno vlasništvo nosioca autorskih prava (Veles Lab / ShiftPulse Ledger).
- **Izričite zabrane:** Korisniku je najstrože zabranjeno:
  1. **Dekompilacija i reverzni inženjering:** Pokušaj dekompilacije, disasembliranja, dekriptovanja licencnih rutina ili ekstraktovanja izvornog koda aplikacije i lokalnih determinističkih mehanizama.
  2. **Neovlašćena distribucija i podlicenciranje:** Kopiranje, iznajmljivanje, preprodaja, javno objavljivanje ili ustupanje softvera ili njegovih modula trećim licima bez izričite pisane saglasnosti vlasnika.
  3. **Deljenje probnih i licencnih ključeva:** Probni ključevi (`TRIAL_14D`) vezani su za hardverski otisak radne stanice / domen i vremenski ograničeni na 14 dana (nakon isteka radna stanica prelazi u Režim samo za čitanje — *Read-Only Lock* — bez brisanja postojećih datoteka klijenta). Deljenje, kloniranje ili zaobilaženje licencnih ključeva (`TRIAL_14D`, `MID_MARKET_ANNUAL`, `ENTERPRISE_PERPETUAL_BYO_API`), uključujući manipulaciju sistemskog sata, predstavlja tešku povredu ugovora i povlači automatsko poništenje licence.

## 3. Garancija privatnosti i Zero Client Financial Data Collection
- **Zero Client Financial Data Collection (Nulto prikupljanje finansijskih podataka klijenata):** ShiftPulse Ledger radi po *Local-First Zero-Knowledge* modelu. Svi finansijski podaci klijenata — fakture, obračuni zarada, JMBG/PIB brojevi zaposlenih, ugovori, bankarski nalozi za prenos (virmani) i AES-256-GCM šifrovane arhive — skladište se isključivo na uređaju korisnika i nikada se ne prenose na servere radi obuke modela ili analitike.
- **Minimalna pseudonimizovana telemetrija:** U svrhu dokazivanja pravne odgovornosti kod AI asistiranih akcija (*Human-in-the-Loop / HITL*) i validacije licence, obrađuju se i beleže isključivo minimalni pseudonimizovani metapodaci u formatu:
  - `client_id` / `license_id` (identifikator licence / stanice)
  - `operator_id` (identifikator lokalnog operatera bez osetljivih ličnih podataka)
  - `ai_action` (tehnički modul / pokrenuta AI akcija)
  - `operator_decision` (odluka operatera: `approved`, `edited_approved` ili `rejected`)
- **Enterprise BYO-API:** U okviru `ENTERPRISE_PERPETUAL_BYO_API` licence, korisnik može lokalno konfigurisati sopstvene API ključeve i HTTPS krajnje tačke (*BYO-API*), čime AI saobraćaj direktno usmerava kroz sopstvenu infrastrukturu.

## 4. Struktura licenci i godišnji SLA za zakonske izmene
- **`TRIAL_14D`:** 14-dnevna evaluacija vezana za hardver/domen. Nakon isteka, podaci klijenata ostaju potpuno čitljivi, dok su kreiranje, izmena i komercijalni izvozi privremeno zaključani.
- **`MID_MARKET_ANNUAL`:** Godišnja pretplata sa ugovorenim limitima klijentskih firmi (`max_client_companies`) i operaterskih sedišta (`max_operator_seats`).
- **`ENTERPRISE_PERPETUAL_BYO_API`:** Trajno pravo korišćenja determinističkog jezgra (`core_expiry: null`) u kombinaciji sa obaveznim godišnjim SLA ciklusom za praćenje zakonskih izmena (`law_tracker_sla_expiry`). Ukoliko godišnji SLA istekne, determinističko računovodstveno jezgro nastavlja da radi neograničeno, dok se automatsko praćenje novih zakonskih izmena privremeno pauzira do obnove SLA.

## 5. Human-in-the-Loop (HITL) odgovornost i Country Pack verifikacija
- Svaki poreski proračun, PPP-PD XML prijava, SEF eFaktura i AI predlog mora biti pregledan i potvrđen od strane ovlašćenog knjigovođe pre zvaničnog podnošenja nadležnim poreskim organima.
- Regionalni *Country Pack* moduli (`HR`, `SI`, `ME`, `DE`) koji nose status šablona zahtevaju zvaničnu HITL verifikaciju lokalnog poreskog stručnjaka pre upotrebe u produkciji.
