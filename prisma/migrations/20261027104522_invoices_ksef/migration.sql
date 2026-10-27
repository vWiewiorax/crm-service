-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "orderId" TEXT,
    "issueDate" DATETIME NOT NULL,
    "saleDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "placeOfIssue" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'TRANSFER',
    "vatExemptionBasis" TEXT,
    "notes" TEXT,
    "sellerName" TEXT NOT NULL,
    "sellerNip" TEXT NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "sellerBankAccount" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerNip" TEXT,
    "buyerAddress" TEXT,
    "netTotal" INTEGER NOT NULL DEFAULT 0,
    "vatTotal" INTEGER NOT NULL DEFAULT 0,
    "grossTotal" INTEGER NOT NULL DEFAULT 0,
    "ksefStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
    "ksefNumber" TEXT,
    "ksefSessionRef" TEXT,
    "ksefInvoiceRef" TEXT,
    "ksefStatusCode" INTEGER,
    "ksefStatusDescription" TEXT,
    "ksefSentAt" DATETIME,
    "ksefAcceptedAt" DATETIME,
    "ksefXml" TEXT,
    "upoXml" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPriceNet" INTEGER NOT NULL,
    "vatRate" TEXT NOT NULL,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KsefCredential" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "nip" TEXT NOT NULL,
    "certPem" TEXT NOT NULL,
    "keyPem" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "companyName" TEXT NOT NULL,
    "ownerName" TEXT,
    "address" TEXT,
    "nip" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "bankAccount" TEXT,
    "defaultVatRate" TEXT NOT NULL DEFAULT '23',
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "paymentTermDays" INTEGER NOT NULL DEFAULT 14,
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 30,
    "orderNumberPrefix" TEXT NOT NULL DEFAULT 'ZL',
    "quoteNumberPrefix" TEXT NOT NULL DEFAULT 'WYC',
    "invoiceNumberPrefix" TEXT NOT NULL DEFAULT 'FV',
    "numberPadding" INTEGER NOT NULL DEFAULT 4,
    "serviceCategories" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("address", "bankAccount", "companyName", "currency", "defaultVatRate", "email", "id", "nip", "numberPadding", "orderNumberPrefix", "ownerName", "paymentTermDays", "phone", "quoteNumberPrefix", "quoteValidityDays", "serviceCategories", "updatedAt") SELECT "address", "bankAccount", "companyName", "currency", "defaultVatRate", "email", "id", "nip", "numberPadding", "orderNumberPrefix", "ownerName", "paymentTermDays", "phone", "quoteNumberPrefix", "quoteValidityDays", "serviceCategories", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

-- CreateIndex
CREATE INDEX "Invoice_ksefStatus_idx" ON "Invoice"("ksefStatus");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
