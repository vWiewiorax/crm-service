// Dane demonstracyjne - wyłącznie fikcyjne. Daty liczone względem dnia uruchomienia seeda.
import { PrismaClient } from "@prisma/client";
import { documentTotals, totalsFromNet } from "../src/lib/money";
import { addDays, today } from "../src/lib/dates";
import { formatDocumentNumber } from "../src/lib/numbering-format";

const db = new PrismaClient();

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Seed danych demonstracyjnych jest zablokowany w środowisku produkcyjnym.");
  process.exit(1);
}

const T = today();
const d = (offset: number) => addDays(T, offset);
/** Znacznik czasu w ciągu dnia (12:00 czasu polskiego ~ 10:00 UTC) */
const ts = (offset: number, hour = 10) => new Date(addDays(T, offset).getTime() + hour * 3_600_000);
const zl = (value: number) => Math.round(value * 100);

const CATEGORIES = [
  "Instalacje elektryczne",
  "Awarie i naprawy",
  "Oświetlenie",
  "Pomiary elektryczne",
  "Montaż osprzętu",
  "Automatyka domowa",
];

/** Fikcyjny NIP z poprawną sumą kontrolną */
function fakeNip(base: string): string {
  const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  for (let tail = 0; tail < 100; tail++) {
    const nine = (base + String(tail).padStart(2, "0")).slice(0, 9);
    const sum = w.reduce((s, x, i) => s + x * Number(nine[i]), 0) % 11;
    if (sum !== 10) return nine + sum;
  }
  throw new Error("nip");
}

async function main() {
  console.log("Czyszczenie danych...");
  await db.$transaction([
    db.invoiceItem.deleteMany(),
    db.invoice.deleteMany(),
    db.ksefCredential.deleteMany(),
    db.calendarEvent.deleteMany(),
    db.task.deleteMany(),
    db.orderStatusChange.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.quoteItem.deleteMany(),
    db.quote.deleteMany(),
    db.client.deleteMany(),
    db.counter.deleteMany(),
    db.settings.deleteMany(),
  ]);

  await db.settings.create({
    data: {
      id: 1,
      companyName: "Elektro-Serwis Nowicki",
      ownerName: "Tomasz Nowicki",
      address: "ul. Przykładowa 12\n35-001 Rzeszów",
      nip: fakeNip("8130000"),
      email: "kontakt@elektro-serwis.example",
      phone: "+48 600 000 123",
      bankAccount: "PL00 1020 0000 0000 0000 0000 0000",
      defaultVatRate: "23",
      paymentTermDays: 14,
      quoteValidityDays: 30,
      orderNumberPrefix: "ZL",
      quoteNumberPrefix: "WYC",
      numberPadding: 4,
      serviceCategories: JSON.stringify(CATEGORIES),
    },
  });

  const clientsData = [
    { type: "PRIVATE", name: "Anna Wiśniewska", email: "anna.wisniewska@example.com", phone: "+48 501 000 101", address: "ul. Lipowa 4/12, 35-002 Rzeszów", notes: "Preferuje kontakt SMS po 16:00." },
    { type: "COMPANY", name: "Paweł Zając", companyName: "Piekarnia Złoty Kłos s.c.", email: "biuro@zlotyklos.example", phone: "+48 17 000 01 02", address: "ul. Młyńska 8, 35-005 Rzeszów", nip: fakeNip("8131111"), notes: "Prace tylko poza godzinami pracy piekarni (po 14:00)." },
    { type: "PRIVATE", name: "Marek Lewandowski", phone: "+48 502 000 202", address: "Tyczyn, ul. Polna 17" },
    { type: "COMPANY", name: "Katarzyna Duda", companyName: "Biuro Rachunkowe Bilans", email: "k.duda@bilans.example", phone: "+48 503 000 303", address: "al. Testowa 21, 35-010 Rzeszów", nip: fakeNip("8132222") },
    { type: "PRIVATE", name: "Joanna i Piotr Majewscy", email: "majewscy@example.com", phone: "+48 504 000 404", address: "Boguchwała, ul. Sadowa 3", notes: "Budowa domu jednorodzinnego - etapowanie prac." },
    { type: "COMPANY", name: "Robert Kowalczyk", companyName: "Warsztat Samochodowy AutoKor", email: "serwis@autokor.example", phone: "+48 505 000 505", address: "ul. Warsztatowa 2, 35-020 Rzeszów", nip: fakeNip("8133333") },
    { type: "PRIVATE", name: "Ewa Szymańska", phone: "+48 506 000 606", address: "ul. Klonowa 9, 35-003 Rzeszów" },
    { type: "COMPANY", name: "Michał Wójcik", companyName: "Wspólnota Mieszkaniowa Słoneczna 5", email: "zarzad.sloneczna5@example.com", phone: "+48 507 000 707", address: "ul. Słoneczna 5, 35-004 Rzeszów", nip: fakeNip("8134444"), notes: "Faktury na wspólnotę, akceptacja zarządu wymagana przy kwotach > 5 000 zł." },
    { type: "PRIVATE", name: "Krzysztof Pawlak", email: "k.pawlak@example.com", address: "Łańcut, ul. Ogrodowa 11" },
    { type: "COMPANY", name: "Agnieszka Kamińska", companyName: "Gabinet Fizjoterapii Ruch", email: "recepcja@ruch.example", phone: "+48 508 000 808", address: "ul. Zdrowa 6, 35-030 Rzeszów", nip: fakeNip("8135555") },
    { type: "PRIVATE", name: "Tadeusz Mazur", phone: "+48 509 000 909", address: "Strzyżów, ul. Leśna 2", notes: "Starszy klient - prosi o telefon dzień przed wizytą." },
    { type: "COMPANY", name: "Łukasz Grabowski", companyName: "Kawiarnia Pod Zegarem", email: "kawiarnia@podzegarem.example", phone: "+48 510 000 010", address: "Rynek 14, 35-040 Rzeszów", nip: fakeNip("8136666") },
  ];
  const clients: { id: string }[] = [];
  for (let i = 0; i < clientsData.length; i++) {
    clients.push(await db.client.create({ data: { ...clientsData[i], createdAt: ts(-200 + i * 9) } }));
  }
  const C = (i: number) => clients[i].id;

  // ---------- Wyceny ----------
  type Item = { name: string; quantity: number; unit: string; unitPriceNet: number; vatRate: string };
  const quotesData: {
    client: number; title: string; description: string; issue: number; valid: number; status: string; items: Item[]; notes?: string;
  }[] = [
    { client: 4, title: "Instalacja elektryczna - dom jednorodzinny", description: "Kompletna instalacja elektryczna w domu 140 m²: okablowanie, rozdzielnica, osprzęt, pomiary odbiorcze.", issue: -150, valid: -120, status: "ACCEPTED", items: [
      { name: "Okablowanie obwodów gniazd i oświetlenia", quantity: 1, unit: "kpl.", unitPriceNet: zl(9800), vatRate: "8" },
      { name: "Rozdzielnica 3-rzędowa z zabezpieczeniami", quantity: 1, unit: "kpl.", unitPriceNet: zl(2650), vatRate: "8" },
      { name: "Montaż osprzętu (gniazda, łączniki)", quantity: 64, unit: "szt.", unitPriceNet: zl(35), vatRate: "8" },
      { name: "Pomiary odbiorcze z protokołem", quantity: 1, unit: "usł.", unitPriceNet: zl(600), vatRate: "8" },
    ] },
    { client: 1, title: "Modernizacja oświetlenia hali produkcyjnej", description: "Wymiana 24 opraw świetlówkowych na oprawy LED wraz z nowym sterowaniem.", issue: -110, valid: -80, status: "ACCEPTED", items: [
      { name: "Oprawa LED przemysłowa 120 W", quantity: 24, unit: "szt.", unitPriceNet: zl(290), vatRate: "23" },
      { name: "Demontaż starych opraw i montaż nowych", quantity: 24, unit: "szt.", unitPriceNet: zl(85), vatRate: "23" },
      { name: "Przebudowa sterowania oświetleniem", quantity: 1, unit: "kpl.", unitPriceNet: zl(1400), vatRate: "23" },
    ] },
    { client: 7, title: "Przegląd instalacji w budynku wspólnoty", description: "Okresowe pomiary instalacji elektrycznej (5-letnie) w 18 lokalach i częściach wspólnych.", issue: -70, valid: -40, status: "ACCEPTED", items: [
      { name: "Pomiary instalacji w lokalu", quantity: 18, unit: "szt.", unitPriceNet: zl(150), vatRate: "23" },
      { name: "Pomiary części wspólnych i WLZ", quantity: 1, unit: "usł.", unitPriceNet: zl(900), vatRate: "23" },
      { name: "Protokoły pomiarowe", quantity: 1, unit: "kpl.", unitPriceNet: zl(300), vatRate: "23" },
    ] },
    { client: 9, title: "Instalacja gabinetu - nowy lokal", description: "Dodatkowe obwody dla urządzeń zabiegowych oraz oświetlenie sal.", issue: -45, valid: -15, status: "ACCEPTED", items: [
      { name: "Dedykowane obwody 230 V dla urządzeń", quantity: 4, unit: "szt.", unitPriceNet: zl(420), vatRate: "23" },
      { name: "Oświetlenie sal zabiegowych LED", quantity: 3, unit: "kpl.", unitPriceNet: zl(780), vatRate: "23" },
    ] },
    { client: 11, title: "Oświetlenie ogródka kawiarni", description: "Girlandy LED, gniazda zewnętrzne IP44 i wyłącznik zmierzchowy.", issue: -12, valid: 18, status: "ACCEPTED", items: [
      { name: "Girlanda LED zewnętrzna 20 m", quantity: 3, unit: "szt.", unitPriceNet: zl(260), vatRate: "23" },
      { name: "Gniazdo zewnętrzne IP44 z montażem", quantity: 4, unit: "szt.", unitPriceNet: zl(140), vatRate: "23" },
      { name: "Wyłącznik zmierzchowy z montażem", quantity: 1, unit: "szt.", unitPriceNet: zl(190), vatRate: "23" },
    ] },
    { client: 5, title: "Zasilanie podnośnika i kompresora", description: "Linia siłowa 400 V z rozdzielnicą warsztatową.", issue: -8, valid: 22, status: "SENT", items: [
      { name: "Linia zasilająca 5x6 mm²", quantity: 35, unit: "m", unitPriceNet: zl(48), vatRate: "23" },
      { name: "Rozdzielnica warsztatowa z gniazdami 400 V", quantity: 1, unit: "kpl.", unitPriceNet: zl(1850), vatRate: "23" },
      { name: "Robocizna", quantity: 10, unit: "godz.", unitPriceNet: zl(120), vatRate: "23" },
    ] },
    { client: 3, title: "Dodatkowe gniazda w biurze", description: "6 podwójnych gniazd w listwie oraz punkt sieciowy przy recepcji.", issue: -5, valid: 25, status: "SENT", items: [
      { name: "Gniazdo podwójne w listwie z okablowaniem", quantity: 6, unit: "szt.", unitPriceNet: zl(165), vatRate: "23" },
      { name: "Punkt sieciowy RJ45", quantity: 1, unit: "szt.", unitPriceNet: zl(220), vatRate: "23" },
    ] },
    { client: 0, title: "Inteligentne sterowanie roletami", description: "Moduły sterujące do 5 rolet z aplikacją mobilną producenta.", issue: -2, valid: 28, status: "DRAFT", items: [
      { name: "Moduł sterowania roletą Wi-Fi", quantity: 5, unit: "szt.", unitPriceNet: zl(189), vatRate: "8" },
      { name: "Montaż i konfiguracja", quantity: 5, unit: "szt.", unitPriceNet: zl(90), vatRate: "8" },
    ] },
    { client: 8, title: "Wymiana tablicy bezpiecznikowej", description: "Wymiana starej tablicy na nową z wyłącznikiem różnicowoprądowym.", issue: -60, valid: -30, status: "REJECTED", items: [
      { name: "Rozdzielnica 2-rzędowa z zabezpieczeniami", quantity: 1, unit: "kpl.", unitPriceNet: zl(1350), vatRate: "8" },
      { name: "Robocizna", quantity: 5, unit: "godz.", unitPriceNet: zl(110), vatRate: "8" },
    ], notes: "Klient wybrał tańszą ofertę." },
    { client: 6, title: "Oświetlenie schodów i korytarza", description: "Oświetlenie LED schodów z czujnikami ruchu.", issue: -50, valid: -20, status: "SENT", items: [
      { name: "Oprawa schodowa LED", quantity: 12, unit: "szt.", unitPriceNet: zl(75), vatRate: "8" },
      { name: "Sterownik z czujnikami ruchu", quantity: 1, unit: "kpl.", unitPriceNet: zl(420), vatRate: "8" },
      { name: "Montaż", quantity: 1, unit: "usł.", unitPriceNet: zl(900), vatRate: "8" },
    ] },
  ];
  const year = T.getUTCFullYear();
  let quoteSeq = 0;
  const quotes = [];
  for (const q of quotesData) {
    const totals = documentTotals(q.items);
    const issueDate = d(q.issue);
    quoteSeq += 1;
    const decided = q.status === "ACCEPTED" || q.status === "REJECTED";
    quotes.push(
      await db.quote.create({
        data: {
          number: formatDocumentNumber("WYC", year, quoteSeq, 4),
          clientId: C(q.client),
          title: q.title,
          description: q.description,
          issueDate,
          validUntil: d(q.valid),
          status: q.status,
          notes: q.notes,
          netTotal: totals.net,
          vatTotal: totals.vat,
          grossTotal: totals.gross,
          sentAt: q.status === "DRAFT" ? null : ts(q.issue, 12),
          decidedAt: decided ? ts(q.issue + 5, 9) : null,
          createdAt: ts(q.issue, 9),
          items: { create: q.items.map((it, position) => ({ ...it, position })) },
        },
      }),
    );
  }
  await db.counter.create({ data: { key: `quote-${year}`, value: quoteSeq } });
  // Wycena wysłana po terminie ważności (index 9) zostanie automatycznie oznaczona jako wygasła przy pierwszym odczycie.

  // ---------- Zlecenia ----------
  type O = {
    client: number; title: string; category: string; created: number; due: number | null; status: string;
    net: number; vat?: string; pay?: "UNPAID" | "PARTIAL" | "PAID"; paid?: number; paidOffset?: number;
    completed?: number; quote?: number; description?: string; notes?: string; history?: [string, number][];
  };
  const ordersData: O[] = [
    { client: 4, title: "Instalacja elektryczna - dom jednorodzinny", category: CATEGORIES[0], created: -118, due: -60, status: "COMPLETED", net: 0, vat: "8", pay: "PAID", paidOffset: -55, completed: -62, quote: 0, history: [["IN_PROGRESS", -100], ["COMPLETED", -62]] },
    { client: 1, title: "Modernizacja oświetlenia hali produkcyjnej", category: CATEGORIES[2], created: -78, due: -48, status: "COMPLETED", net: 0, pay: "PAID", paidOffset: -35, completed: -50, quote: 1, history: [["IN_PROGRESS", -60], ["COMPLETED", -50]] },
    { client: 7, title: "Przegląd instalacji w budynku wspólnoty", category: CATEGORIES[3], created: -38, due: -20, status: "COMPLETED", net: 0, pay: "PARTIAL", paid: 2000, paidOffset: -12, completed: -21, quote: 2, history: [["IN_PROGRESS", -25], ["COMPLETED", -21]] },
    { client: 9, title: "Instalacja gabinetu - nowy lokal", category: CATEGORIES[0], created: -14, due: 6, status: "IN_PROGRESS", net: 0, pay: "PARTIAL", paid: 1500, paidOffset: -10, quote: 3, history: [["IN_PROGRESS", -6]] },
    { client: 0, title: "Wymiana gniazd w kuchni", category: CATEGORIES[4], created: -170, due: -160, status: "COMPLETED", net: zl(480), vat: "8", pay: "PAID", paidOffset: -160, completed: -161, history: [["COMPLETED", -161]] },
    { client: 2, title: "Usunięcie awarii - brak zasilania w garażu", category: CATEGORIES[1], created: -150, due: -149, status: "COMPLETED", net: zl(350), vat: "8", pay: "PAID", paidOffset: -149, completed: -149, history: [["COMPLETED", -149]] },
    { client: 5, title: "Naprawa oświetlenia warsztatu", category: CATEGORIES[1], created: -135, due: -130, status: "COMPLETED", net: zl(1250), pay: "PAID", paidOffset: -115, completed: -131, history: [["COMPLETED", -131]] },
    { client: 3, title: "Pomiary instalacji w biurze", category: CATEGORIES[3], created: -95, due: -88, status: "COMPLETED", net: zl(650), pay: "PAID", paidOffset: -80, completed: -89, history: [["COMPLETED", -89]] },
    { client: 10, title: "Wymiana instalacji w łazience", category: CATEGORIES[0], created: -90, due: -75, status: "COMPLETED", net: zl(2300), vat: "8", pay: "PAID", paidOffset: -74, completed: -76, history: [["PLANNED", -88], ["IN_PROGRESS", -78], ["COMPLETED", -76]] },
    { client: 11, title: "Podłączenie ekspresu i zmywarki", category: CATEGORIES[4], created: -66, due: -63, status: "COMPLETED", net: zl(780), pay: "PAID", paidOffset: -50, completed: -63, history: [["COMPLETED", -63]] },
    { client: 6, title: "Awaria wyłącznika różnicowoprądowego", category: CATEGORIES[1], created: -30, due: -29, status: "COMPLETED", net: zl(290), vat: "8", pay: "UNPAID", completed: -29, history: [["COMPLETED", -29]], notes: "Klient zapłaci przy kolejnej wizycie." },
    { client: 2, title: "Oświetlenie ogrodu i podjazdu", category: CATEGORIES[2], created: -25, due: -3, status: "IN_PROGRESS", net: zl(3400), vat: "8", pay: "UNPAID", history: [["PLANNED", -22], ["IN_PROGRESS", -8]], notes: "Czekamy na dostawę słupków oświetleniowych." },
    { client: 11, title: "Oświetlenie ogródka kawiarni", category: CATEGORIES[2], created: -6, due: 9, status: "PLANNED", net: 0, pay: "UNPAID", quote: 4 },
    { client: 8, title: "Podłączenie płyty indukcyjnej", category: CATEGORIES[4], created: -4, due: 3, status: "PLANNED", net: zl(250), vat: "8", pay: "UNPAID", history: [["PLANNED", -3]] },
    { client: 5, title: "Zasilanie podnośnika i kompresora", category: CATEGORIES[0], created: -9, due: null, status: "AWAITING_ACCEPTANCE", net: zl(5730), pay: "UNPAID", history: [["TO_QUOTE", -9], ["AWAITING_ACCEPTANCE", -8]] },
    { client: 3, title: "Dodatkowe gniazda w biurze", category: CATEGORIES[4], created: -6, due: null, status: "AWAITING_ACCEPTANCE", net: zl(1210), pay: "UNPAID", history: [["AWAITING_ACCEPTANCE", -5]] },
    { client: 0, title: "Inteligentne sterowanie roletami", category: CATEGORIES[5], created: -3, due: null, status: "TO_QUOTE", net: zl(1395), vat: "8", pay: "UNPAID", history: [["TO_QUOTE", -2]] },
    { client: 10, title: "Sprawdzenie iskrzącego gniazdka", category: CATEGORIES[1], created: -1, due: 1, status: "NEW", net: zl(150), vat: "8", pay: "UNPAID", description: "Klient zgłasza iskrzenie gniazdka w sypialni. Wymaga pilnej wizyty." },
    { client: 9, title: "Montaż oświetlenia awaryjnego", category: CATEGORIES[2], created: -2, due: null, status: "NEW", net: zl(1800), pay: "UNPAID", description: "Zapytanie o oświetlenie ewakuacyjne w nowym lokalu." },
    { client: 8, title: "Wymiana tablicy bezpiecznikowej", category: CATEGORIES[0], created: -62, due: null, status: "CANCELLED", net: zl(1900), vat: "8", pay: "UNPAID", history: [["CANCELLED", -28]], notes: "Klient zrezygnował - wybrał inną ofertę." },
    { client: 1, title: "Przegląd instalacji w piekarni", category: CATEGORIES[3], created: -20, due: -2, status: "PLANNED", net: zl(950), pay: "UNPAID", history: [["PLANNED", -18]] },
  ];
  const orderIds: string[] = [];
  let orderSeq = 0;
  const sortedOrders = [...ordersData].map((o, i) => ({ o, i })).sort((a, b) => a.o.created - b.o.created);
  const idByIndex = new Map<number, string>();
  for (const { o, i } of sortedOrders) {
    orderSeq += 1;
    const quote = o.quote !== undefined ? quotes[o.quote] : null;
    const quoteItems = o.quote !== undefined ? quotesData[o.quote].items : [];
    const net = quote ? quote.netTotal : o.net;
    const vatRate = o.vat ?? (quoteItems[0]?.vatRate ?? "23");
    const gross = totalsFromNet(net, vatRate).gross;
    const pay = o.pay ?? "UNPAID";
    const paidAmount = pay === "PAID" ? gross : pay === "PARTIAL" ? zl(o.paid ?? 0) : 0;
    const history: { fromStatus: string | null; toStatus: string; changedAt: Date; note: string | null }[] = [];
    const firstStatus = o.history?.length ? "NEW" : o.status;
    history.push({
      fromStatus: null,
      toStatus: quote ? "PLANNED" : firstStatus,
      changedAt: ts(o.created, 9),
      note: quote ? `Utworzone z wyceny ${quote.number}` : "Utworzenie zlecenia",
    });
    let prev = quote ? "PLANNED" : firstStatus;
    for (const [status, offset] of o.history ?? []) {
      if (status === prev) continue;
      history.push({ fromStatus: prev, toStatus: status, changedAt: ts(offset, 14), note: null });
      prev = status;
    }
    const lastChange = history[history.length - 1].changedAt;
    const created = await db.order.create({
      data: {
        number: formatDocumentNumber("ZL", year, orderSeq, 4),
        title: o.title,
        description: o.description ?? quote?.description ?? null,
        clientId: C(o.client),
        category: o.category,
        createdDate: d(o.created),
        dueDate: o.due === null ? null : d(o.due),
        status: o.status,
        netAmount: net,
        vatRate,
        paymentStatus: pay,
        paidAmount,
        paidAt: pay === "UNPAID" ? null : ts(o.paidOffset ?? o.created, 11),
        completedAt: o.status === "COMPLETED" ? ts(o.completed ?? o.created, 15) : null,
        internalNotes: o.notes ?? null,
        quoteId: quote?.id ?? null,
        createdAt: ts(o.created, 9),
        updatedAt: lastChange,
        items: quote ? { create: quoteItems.map((it, position) => ({ ...it, position })) } : undefined,
        statusHistory: { create: history },
      },
    });
    idByIndex.set(i, created.id);
  }
  for (let i = 0; i < ordersData.length; i++) orderIds.push(idByIndex.get(i)!);
  await db.counter.create({ data: { key: `order-${year}`, value: orderSeq } });
  const Ord = (i: number) => orderIds[i];

  // ---------- Zadania ----------
  const tasks = [
    { title: "Zamówić słupki oświetleniowe do ogrodu", due: -4, priority: "HIGH", status: "IN_PROGRESS", client: 2, order: 11 },
    { title: "Wysłać protokoły pomiarowe do wspólnoty", due: -6, priority: "HIGH", status: "TODO", client: 7, order: 2, description: "Protokoły w PDF + wersja papierowa dla zarządu." },
    { title: "Przypomnieć o płatności za awarię RCD", due: -1, priority: "NORMAL", status: "TODO", client: 6, order: 10 },
    { title: "Zadzwonić w sprawie decyzji - linia 400 V", due: 0, priority: "NORMAL", status: "TODO", client: 5, order: 14 },
    { title: "Przygotować wycenę sterowania roletami", due: 0, priority: "HIGH", status: "IN_PROGRESS", client: 0, order: 16 },
    { title: "Kupić przewody YDY 3x2,5 (2 krążki)", due: 1, priority: "NORMAL", status: "TODO" },
    { title: "Potwierdzić termin montażu w kawiarni", due: 2, priority: "NORMAL", status: "TODO", client: 11, order: 12 },
    { title: "Odebrać mierniki po kalibracji", due: 4, priority: "LOW", status: "TODO", description: "Serwis zamknięty w soboty." },
    { title: "Uzgodnić z kierownikiem gabinetu wyłączenie prądu", due: 3, priority: "HIGH", status: "TODO", client: 9, order: 3 },
    { title: "Przegląd samochodu służbowego", due: 12, priority: "LOW", status: "TODO" },
    { title: "Oddzwonić do klienta w sprawie oświetlenia awaryjnego", due: 1, priority: "NORMAL", status: "TODO", client: 9, order: 18 },
    { title: "Zaktualizować cennik usług", due: null, priority: "LOW", status: "TODO" },
    { title: "Dostarczyć dokumentację powykonawczą", due: -58, priority: "NORMAL", status: "DONE", client: 4, order: 0, completed: -57 },
    { title: "Rozliczyć materiały z hali", due: -45, priority: "NORMAL", status: "DONE", client: 1, order: 1, completed: -46 },
    { title: "Zamówić oprawy LED do sal zabiegowych", due: -9, priority: "HIGH", status: "DONE", client: 9, order: 3, completed: -10 },
  ];
  for (const t of tasks) {
    await db.task.create({
      data: {
        title: t.title,
        description: t.description ?? null,
        dueDate: t.due === null ? null : d(t.due),
        priority: t.priority,
        status: t.status,
        clientId: t.client !== undefined ? C(t.client) : null,
        orderId: t.order !== undefined ? Ord(t.order) : null,
        completedAt: t.completed !== undefined ? ts(t.completed, 16) : null,
        createdAt: ts((t.due ?? 0) - 7, 8),
      },
    });
  }

  // ---------- Wizyty i przypomnienia ----------
  const events = [
    { type: "VISIT", title: "Oględziny - iskrzące gniazdko", date: 1, start: "09:00", end: "10:00", client: 10, order: 17, location: "Strzyżów, ul. Leśna 2" },
    { type: "VISIT", title: "Montaż - płyta indukcyjna", date: 3, start: "08:00", end: "10:00", client: 8, order: 13, location: "Łańcut, ul. Ogrodowa 11" },
    { type: "VISIT", title: "Prace w gabinecie - etap 2", date: 5, start: "15:00", end: "19:00", client: 9, order: 3, location: "ul. Zdrowa 6, Rzeszów" },
    { type: "VISIT", title: "Montaż oświetlenia ogródka", date: 9, start: "07:30", end: "13:00", client: 11, order: 12, location: "Rynek 14, Rzeszów" },
    { type: "VISIT", title: "Pomiar lokalu - oświetlenie awaryjne", date: 2, start: "12:00", end: "13:00", client: 9, order: 18 },
    { type: "REMINDER", title: "Ważność wyceny - warsztat AutoKor", date: 22, client: 5 },
    { type: "REMINDER", title: "Przegląd 5-letni - Biuro Bilans (za rok)", date: 40, client: 3, notes: "Zaproponować kolejne pomiary." },
    { type: "VISIT", title: "Wizyta serwisowa - piekarnia", date: -2, start: "14:30", end: "17:00", client: 1, order: 20 },
  ];
  for (const e of events) {
    await db.calendarEvent.create({
      data: {
        type: e.type,
        title: e.title,
        date: d(e.date),
        startTime: e.start ?? null,
        endTime: e.end ?? null,
        location: e.location ?? null,
        notes: e.notes ?? null,
        clientId: C(e.client),
        orderId: e.order !== undefined ? Ord(e.order) : null,
      },
    });
  }

  // Faktury (jeszcze niewysłane do KSeF) dla dwóch ostatnio zakończonych zleceń firmowych
  const seller = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
  const toInvoice = await db.order.findMany({
    where: { status: "COMPLETED", client: { type: "COMPANY" } },
    include: { client: true, items: { orderBy: { position: "asc" } } },
    orderBy: { completedAt: "desc" },
    take: 2,
  });
  for (const o of toInvoice) {
    const done = o.completedAt ?? o.createdDate;
    const issueDate = new Date(Date.UTC(done.getUTCFullYear(), done.getUTCMonth(), done.getUTCDate()));
    const year = issueDate.getUTCFullYear();
    const counter = await db.counter.upsert({
      where: { key: `invoice-${year}` },
      create: { key: `invoice-${year}`, value: 1 },
      update: { value: { increment: 1 } },
    });
    const items = o.items.length
      ? o.items.map((i) => ({ name: i.name, quantity: i.quantity, unit: i.unit, unitPriceNet: i.unitPriceNet, vatRate: i.vatRate }))
      : [{ name: o.title, quantity: 1, unit: "usł.", unitPriceNet: o.netAmount, vatRate: o.vatRate }];
    const totals = documentTotals(items);
    await db.invoice.create({
      data: {
        number: formatDocumentNumber(seller.invoiceNumberPrefix, year, counter.value, seller.numberPadding),
        clientId: o.clientId,
        orderId: o.id,
        issueDate,
        saleDate: issueDate,
        dueDate: new Date(issueDate.getTime() + seller.paymentTermDays * 86_400_000),
        placeOfIssue: "Rzeszów",
        paymentMethod: "TRANSFER",
        sellerName: seller.companyName,
        sellerNip: seller.nip!,
        sellerAddress: seller.address!,
        sellerBankAccount: seller.bankAccount,
        buyerName: o.client.companyName ?? o.client.name,
        buyerNip: o.client.nip,
        buyerAddress: o.client.address,
        netTotal: totals.net,
        vatTotal: totals.vat,
        grossTotal: totals.gross,
        items: { create: items.map((i, position) => ({ ...i, position })) },
      },
    });
  }

  console.log(
    `Gotowe: ${clients.length} klientów, ${ordersData.length} zleceń, ${quotesData.length} wycen, ${tasks.length} zadań, ${events.length} wydarzeń.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
