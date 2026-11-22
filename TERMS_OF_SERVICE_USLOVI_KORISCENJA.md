# USLOVI KORIŠĆENJA I UGOVOR O LICENCI KRAJNJEG KORISNIKA (EULA / TERMS OF SERVICE)
**Aplikacija: ShiftPulse Ledger (B2B Hybrid Local-First Accounting & Payroll Suite)**  
**Nosilac prava / Davalac licence: Veles Lab**

---

## 1. Prihvatanje uslova (Obavezna EULA potvrda)
Korišćenjem platforme **ShiftPulse Ledger**, pokretanjem 14-dnevne probne evaluacije (`TRIAL_14D`) ili aktivacijom komercijalnog ključa (`MID_MARKET_ANNUAL` / `ENTERPRISE_PERPETUAL_BYO_API`), ovlašćeni predstavnik pravnog lica ili knjigovodstvene agencije potvrđuje i bezuslovno prihvata ovaj Ugovor o licenci krajnjeg korisnika (EULA) i Uslove korišćenja. Softver je namenjen isključivo pravnim licima, preduzetnicima i ovlašćenim računovodstvenim agencijama.

## 2. Intelektualna svojina, ograničena licenca i izričite zabrane
- **Vlasništvo nad softverom:** Softver (izvorni i izvršni kod, deterministički algoritmi, struktura baze podataka, UI i dokumentacija) predstavlja isključivu intelektualnu svojinu autora / privrednog društva Veles Lab i zaštićen je Zakonom o autorskom i srodnim pravima Republike Srbije.
- **Ograničena licenca:** Neisključivo, neprenosivo i vremenski ograničeno pravo korišćenja isključivo za sopstvene interne poslovne potrebe.
- **Izričite zabrane:** Strogo je zabranjena dekompilacija, disasembliranje, obrnuti inženjering (reverse engineering), kopiranje, distribucija instalacionih paketa/ključeva trećim licima i zaobilaženje tehničke zaštite ili vremenskog ograničenja probnog perioda.
  - Probni ključevi (`TRIAL_14D`) vezani su za hardverski otisak radne stanice / domen i vremenski ograničeni na 14 dana (nakon isteka radna stanica prelazi u Režim samo za čitanje — *Read-Only Lock* — bez brisanja postojećih datoteka klijenta). Zaobilaženje sistemskog sata ili deljenje ključeva predstavlja tešku povredu ugovora i povlači poništenje licence.

## 3. Garancija privatnosti (Zero-Data-Exposure)
- **Garancija privatnosti (Zero-Data-Exposure):** Svi finansijski i lični podaci klijenata ostaju isključivo lokalno kod Korisnika ili na njegovom privatnom cloudu uz enkripciju. Davalac licence nema pristup tim podacima i prikuplja isključivo anonimizovane tehničke meta-podatke (`ID klijenta / ID operatera / AI akcija / odluka operatera`), u skladu sa ZZPL i GDPR.
- **Struktura anonimizovanih meta-podataka:**
  - `client_id` — lokalni / pseudonimizovani ID klijentskog entiteta ili licence
  - `operator_id` — lokalni identifikator operatera na radnoj stanici
  - `ai_action` — tehnički modul / pokrenuta AI akcija
  - `operator_decision` — HITL odluka operatera (`approved`, `edited_approved` ili `rejected`)
- **Enterprise BYO-API:** U okviru `ENTERPRISE_PERPETUAL_BYO_API` licence, korisnik može lokalno konfigurisati sopstvene API ključeve i HTTPS krajnje tačke (*BYO-API*), čime AI saobraćaj direktno usmerava kroz sopstvenu infrastrukturu.

## 4. Struktura licenci i godišnji SLA za zakonske izmene
- **`TRIAL_14D`:** 14-dnevna evaluacija vezana za hardver/domen. Nakon isteka, podaci klijenata ostaju potpuno čitljivi, dok su kreiranje, izmena i komercijalni izvozi privremeno zaključani.
- **`MID_MARKET_ANNUAL`:** Godišnja pretplata (€600–€700/godišnje, standardno 650 €/godišnje) sa ugovorenim limitima klijentskih firmi (`max_client_companies`) i operaterskih sedišta (`max_operator_seats`).
- **`ENTERPRISE_PERPETUAL_BYO_API`:** Trajno pravo korišćenja determinističkog jezgra (`core_expiry: null`) u kombinaciji sa obaveznim godišnjim SLA ciklusom za praćenje zakonskih izmena (`law_tracker_sla_expiry`, 20% godišnji SLA). Ukoliko godišnji SLA istekne, determinističko računovodstveno jezgro nastavlja da radi neograničeno, dok se automatsko praćenje novih zakonskih izmena privremeno pauzira do obnove SLA.

## 5. Human-in-the-Loop (HITL) odgovornost i Country Pack verifikacija
- Svaki poreski proračun, PPP-PD XML prijava, SEF eFaktura i AI predlog mora biti pregledan i potvrđen od strane ovlašćenog knjigovođe pre zvaničnog podnošenja nadležnim poreskim organima.
- Regionalni *Country Pack* moduli (`HR`, `SI`, `ME`, `DE`) koji nose status šablona zahtevaju zvaničnu HITL verifikaciju lokalnog poreskog stručnjaka pre upotrebe u produkciji.
