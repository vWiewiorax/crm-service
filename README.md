# ZleceniaPro

Demonstracyjny system obsługi zleceń dla jednoosobowej firmy usługowej (JDG): klienci, zlecenia, wyceny z PDF, faktury VAT z wysyłką do testowego KSeF, zadania, kalendarz, raporty i ustawienia. Wszystkie dane są zapisywane w lokalnej bazie SQLite.

> Wersja demonstracyjna do uruchamiania lokalnie. Nie jest gotowa do wdrożenia produkcyjnego bez audytu (patrz niżej).

## Funkcje

- **Dashboard** - KPI liczone z bazy (aktywne zlecenia, nowe zapytania, otwarte wyceny, przychód, zaległe zadania), wykres przychodów i wpłat, wykres zleceń według statusu, sekcja „Wymaga uwagi”, ostatnia aktywność.
- **Zlecenia** - lista z wyszukiwarką, filtrami (status, klient, termin), sortowaniem i paginacją; tworzenie, edycja, szczegóły, zmiana statusu z historią, usuwanie z potwierdzeniem. Numer (np. `ZL-2026-0001`) nadaje serwer w transakcji z unikalnym indeksem.
- **Klienci** - osoby prywatne i firmy, opcjonalny e-mail i NIP (z walidacją sumy kontrolnej), szczegóły z listą zleceń, wycen, zadań, łączną wartością i historią współpracy.
- **Wyceny** - dynamiczne pozycje, automatyczne przeliczanie netto, VAT (od sum według stawek) i brutto, podgląd dokumentu, PDF (podgląd i pobieranie), statusy, świadoma konwersja zaakceptowanej wyceny na zlecenie (jedno zlecenie na wycenę, wymuszone unikalnym kluczem w bazie).
- **Faktury** - wystawianie faktury VAT ręcznie albo ze zlecenia (pozycje i nabywca przenoszone ze zlecenia), numeracja `FV-2026-0001` nadawana przez serwer, PDF, plik XML w strukturze FA(3) oraz wysyłka do **testowego** KSeF z numerem KSeF i UPO. Szczegóły niżej.
- **Zadania** - priorytety, statusy, opcjonalny klient i zlecenie, filtry, sortowanie, szybkie oznaczanie jako zakończone, wyróżnienie zaległych.
- **Kalendarz** - widok miesięczny i tygodniowy: terminy zleceń, wizyty, zadania, przypomnienia; filtry typów; zmiana terminu przez przeciągnięcie lub w oknie szczegółów (zapis w bazie). Brak synchronizacji z kalendarzami zewnętrznymi.
- **Raporty** - zakres dat; osobno wartość zleceń (netto), przychód z zakończonych zleceń (netto) i faktyczne wpłaty (brutto); statusy, kategorie usług, klienci według wartości współpracy. Raporty nie są ewidencją księgową.
- **Ustawienia** - dane firmy (widoczne w panelu i na wycenach), domyślny VAT, waluta PLN, terminy płatności, ważność wycen, prefiksy i długość numeracji (zlecenia, wyceny, faktury), kategorie usług.

## Wymagania

- Node.js 20.9 lub nowszy (testowane na Node 24)
- npm

## Instalacja i uruchomienie

```bash
npm install
npm run setup               # tworzy .env (jeśli brak), klient Prisma, migracje, dane demo
npm run dev
```

Aplikacja działa pod adresem http://localhost:3000.

### Baza danych

- Konfiguracja: zmienna `DATABASE_URL` w `.env` (domyślnie `file:./dev.db`, plik w katalogu `prisma/`).
- Migracje: `npm run db:deploy` (zastosowanie istniejących) lub `npm run db:migrate` (tworzenie nowych podczas rozwoju).
- Dane demonstracyjne: `npm run db:seed` czyści tabele i ładuje fikcyjne dane od nowa. Daty są liczone względem dnia uruchomienia.
- Pełny reset bazy: `npm run db:reset`. Destrukcyjne operacje są dostępne tylko z wiersza poleceń, nie w interfejsie.

### Pozostałe polecenia

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # testy jednostkowe (Vitest)
npm run build       # build produkcyjny
npm start           # uruchomienie buildu
```

## Stos technologiczny

Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Lucide, React Hook Form, Zod, Recharts, Prisma 6 + SQLite, @react-pdf/renderer, Vitest.

## Struktura projektu

```
prisma/
  schema.prisma          model danych
  migrations/            migracje SQL
  seed.ts                fikcyjne dane demonstracyjne
src/
  app/                   strony (trasy po polsku: /zlecenia, /klienci, /wyceny, ...)
    wyceny/[id]/pdf/     generowanie PDF wyceny
  actions/               Server Actions: walidacja Zod po stronie serwera i obsługa błędów
  server/                logika biznesowa i zapytania do bazy (numeracja, konwersja, raporty)
    pdf/                 szablon dokumentu PDF
  lib/                   wspólne narzędzia: kwoty, daty, statusy, schematy walidacji
    __tests__/           testy jednostkowe
  components/            UI: layout, formularze, wykresy, moduły, komponenty shadcn/ui
  assets/fonts/          fonty Roboto do PDF (polskie znaki)
```

### Konwencje

- Kwoty są przechowywane w groszach (liczby całkowite). Obliczenia netto, VAT i brutto są w jednym miejscu: `src/lib/money.ts`.
- Daty bez godziny są zapisywane jako północ UTC; „dzisiaj” jest liczone w strefie `Europe/Warsaw`.
- Formularze walidują dane w przeglądarce, a Server Actions ponownie po stronie serwera tym samym schematem Zod.
- Operacje na wielu rekordach (numeracja, konwersja wyceny, zmiana statusu z historią) działają w transakcjach.

## Faktury i KSeF (środowisko testowe)

- Faktura zapisuje dane sprzedawcy (z ustawień) i nabywcy w chwili wystawienia, więc późniejsza zmiana danych klienta jej nie zmienia. Wymagany jest poprawny NIP i adres firmy w ustawieniach.
- Plik XML jest budowany w strukturze logicznej **FA(3)** (`src/server/ksef/fa3.ts`). Oficjalne schematy XSD Ministerstwa Finansów są w `ksef/schemy/`, a test `npm test` sprawdza z nimi wygenerowany plik (wymaga `xmllint`; bez niego test walidacji jest pomijany).
- Wysyłka (`src/server/ksef/client.ts`) korzysta z API KSeF 2.0 **wyłącznie** w środowisku testowym `https://api-test.ksef.mf.gov.pl/v2`. Adres jest wpisany na stałe, bo aplikacja nie ma logowania i nie może wystawiać faktur do produkcyjnego KSeF.
- Uwierzytelnienie: aplikacja sama generuje samopodpisany certyfikat testowy z NIP-em firmy z ustawień i podpisuje żądanie XAdES. KSeF akceptuje takie certyfikaty tylko w środowisku testowym. Certyfikat jest zapisany w lokalnej bazie (tabela `KsefCredential`), nie w repozytorium.
- Przebieg: sesja interaktywna, szyfrowanie faktury AES-256 (klucz szyfrowany kluczem publicznym MF), wysyłka, sprawdzenie statusu, numer KSeF, pobranie UPO, zamknięcie sesji. Faktura przyjęta lub przetwarzana przez KSeF jest zablokowana do edycji i usunięcia.
- Środowisko testowe nie wywołuje skutków podatkowych, a jego dane są wspólne dla wszystkich testujących. Używaj tylko fikcyjnych danych.
- Brak faktur korygujących, zaliczkowych, walut obcych, trybu offline i odbierania faktur zakupowych.

## Ograniczenia wersji demonstracyjnej

- **Brak logowania i kontroli dostępu.** Aplikacja zakłada jednego użytkownika na własnym komputerze. Server Actions modyfikujące dane nie są chronione, dlatego nie wolno wystawiać jej publicznie w obecnej postaci.
- SQLite i jeden plik bazy - odpowiednie do demo, nie do pracy wielu użytkowników.
- Faktury trafiają tylko do testowego KSeF. Aplikacja nie integruje się z bankami ani systemami księgowymi, a moduł faktur nie przeszedł weryfikacji księgowej.
- Raporty mają charakter poglądowy, nie są ewidencją księgową ani podstawą rozliczeń podatkowych.
- Brak synchronizacji z Google Calendar i innymi usługami zewnętrznymi.
- Brak wysyłki e-maili, kopii zapasowych i dziennika audytu.

## Przed wdrożeniem produkcyjnym

1. Prawdziwe uwierzytelnianie (np. Auth.js lub zewnętrzny dostawca) i autoryzacja sprawdzana po stronie serwera w każdej akcji i trasie, w tym `/wyceny/[id]/pdf` i `/faktury/[id]/*`.
2. Produkcyjna baza danych (np. PostgreSQL) z migracjami, kopiami zapasowymi i monitoringiem.
3. Oddzielenie danych demonstracyjnych od rzeczywistych; brak seeda w środowisku produkcyjnym.
4. Audyt bezpieczeństwa: nagłówki, limity zapytań, ochrona CSRF dla tras spoza Server Actions, przegląd zależności.
5. Zgodność z RODO: podstawa przetwarzania danych klientów, polityka retencji, eksport i usuwanie danych.
6. Testy end-to-end i obsługa błędów z logowaniem bez danych osobowych.
7. Produkcyjny KSeF: uwierzytelnienie kwalifikowanym podpisem, pieczęcią lub tokenem KSeF przypisanym do zalogowanego użytkownika, bezpieczne przechowywanie kluczy, obsługa korekt i trybu offline, przegląd przez księgowego. Alternatywnie sprawdzony system zewnętrzny.

## Dane demonstracyjne

Seed tworzy fikcyjną firmę „Elektro-Serwis Nowicki”, 12 klientów, około 20 zleceń, 10 wycen, 15 zadań i wydarzenia w kalendarzu z kilku miesięcy. Wszystkie nazwy, adresy, numery NIP i telefony są wymyślone, a adresy e-mail używają domeny `.example`.
