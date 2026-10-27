import "server-only";
import "reflect-metadata";
import crypto from "node:crypto";
import { DOMImplementation, DOMParser, XMLSerializer } from "@xmldom/xmldom";
import * as x509 from "@peculiar/x509";
import * as xadesjs from "xadesjs";
import { setNodeDependencies } from "xml-core";
import { FA3_FORM_CODE } from "./fa3";

setNodeDependencies({ DOMParser, XMLSerializer, DOMImplementation });
x509.cryptoProvider.set(crypto.webcrypto as unknown as Crypto);
xadesjs.Application.setEngine("NodeJS", crypto.webcrypto as unknown as Crypto);

/**
 * Klient API KSeF 2.0 - WYŁĄCZNIE środowisko testowe Ministerstwa Finansów.
 * Adres jest stały celowo: aplikacja demo nie ma logowania, więc nie może wysyłać faktur do produkcyjnego KSeF.
 */
export const KSEF_TEST_BASE_URL = "https://api-test.ksef.mf.gov.pl/v2";
export const KSEF_TEST_PORTAL = "https://api-test.ksef.mf.gov.pl/docs/v2";

export class KsefError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: string,
  ) {
    super(message);
    this.name = "KsefError";
  }
}

export type KsefCredentials = { nip: string; certPem: string; keyPem: string };

const SIGN_ALG = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
  publicExponent: new Uint8Array([1, 0, 1]),
  modulusLength: 2048,
} as const;

/** Odpowiedź API: treść błędu KSeF jest zwracana jako JSON z listą szczegółów. */
async function request<T>(path: string, init: RequestInit & { token?: string; raw?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${KSEF_TEST_BASE_URL}${path}`, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    throw new KsefError("Brak połączenia z testowym KSeF. Sprawdź internet i spróbuj ponownie.", undefined, String(error));
  }
  const body = await res.text();
  if (!res.ok) throw new KsefError(describeError(res.status, body), res.status, body.slice(0, 2000));
  if (init.raw) return body as T;
  return (body ? JSON.parse(body) : {}) as T;
}

function describeError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { exception?: { exceptionDetailList?: { exceptionDescription?: string; details?: string[] }[] } };
    const first = parsed.exception?.exceptionDetailList?.[0];
    if (first?.exceptionDescription) {
      return `KSeF: ${first.exceptionDescription}${first.details?.length ? ` (${first.details.join("; ")})` : ""}`;
    }
  } catch {
    // treść nie jest JSON-em
  }
  if (status === 429) return "KSeF: przekroczono limit zapytań. Spróbuj ponownie za chwilę.";
  if (status >= 500) return `KSeF (test) jest chwilowo niedostępny (HTTP ${status}).`;
  return `KSeF odrzucił żądanie (HTTP ${status}).`;
}

function toPem(der: ArrayBuffer | Buffer, label: string): string {
  const b64 = Buffer.from(der as ArrayBuffer).toString("base64");
  return `-----BEGIN ${label}-----\n${b64.match(/.{1,64}/g)!.join("\n")}\n-----END ${label}-----\n`;
}

function pemBody(pem: string): Buffer {
  return Buffer.from(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""), "base64");
}

/**
 * Samopodpisany certyfikat osoby fizycznej z NIP-em (serialNumber TINPL-...).
 * KSeF akceptuje takie certyfikaty wyłącznie w środowisku testowym.
 */
export async function createTestCredentials(nip: string, ownerName: string | null): Promise<KsefCredentials> {
  const keys = await crypto.webcrypto.subtle.generateKey(SIGN_ALG, true, ["sign", "verify"]);
  const [given = "Demo", ...rest] = (ownerName?.trim() || "Demo ZleceniaPro").split(/\s+/);
  const surname = rest.join(" ") || "ZleceniaPro";
  const safe = (v: string) => v.replace(/[,=+<>#;"\\]/g, " ");
  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: crypto.randomBytes(8).toString("hex"),
    name: `CN=${safe(`${given} ${surname}`)}, 2.5.4.42=${safe(given)}, 2.5.4.4=${safe(surname)}, 2.5.4.5=TINPL-${nip}, C=PL`,
    notBefore: new Date(Date.now() - 3600_000),
    notAfter: new Date(Date.now() + 2 * 365 * 86400_000),
    keys,
    signingAlgorithm: SIGN_ALG,
  });
  const pkcs8 = await crypto.webcrypto.subtle.exportKey("pkcs8", keys.privateKey);
  return { nip, certPem: cert.toString("pem"), keyPem: toPem(pkcs8, "PRIVATE KEY") };
}

async function signXades(xml: string, creds: KsefCredentials): Promise<string> {
  const key = await crypto.webcrypto.subtle.importKey("pkcs8", pemBody(creds.keyPem), SIGN_ALG, false, ["sign"]);
  const certB64 = pemBody(creds.certPem).toString("base64");
  const doc = xadesjs.Parse(xml);
  const signed = new xadesjs.SignedXml();
  await signed.Sign({ name: "RSASSA-PKCS1-v1_5" }, key, doc, {
    references: [{ uri: "", hash: "SHA-256", transforms: ["enveloped", "exc-c14n"] }],
    x509: [certB64],
    signingCertificate: { certificate: certB64, digestAlgorithm: "SHA-256" },
  });
  doc.documentElement.appendChild(signed.GetXml()!);
  return new XMLSerializer().serializeToString(doc as unknown as Parameters<XMLSerializer["serializeToString"]>[0]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Token = { token: string; validUntil: string };
let cachedAccess: { nip: string; certPem: string; token: string; expires: number } | null = null;

/** Uwierzytelnienie podpisem XAdES: challenge -> podpis -> status -> accessToken. */
export async function getAccessToken(creds: KsefCredentials): Promise<string> {
  if (cachedAccess && cachedAccess.nip === creds.nip && cachedAccess.certPem === creds.certPem && cachedAccess.expires > Date.now() + 60_000) {
    return cachedAccess.token;
  }
  const challenge = await request<{ challenge: string }>("/auth/challenge", { method: "POST" });
  const authRequest =
    `<?xml version="1.0" encoding="utf-8"?><AuthTokenRequest xmlns="http://ksef.mf.gov.pl/auth/token/2.0">` +
    `<Challenge>${challenge.challenge}</Challenge><ContextIdentifier><Nip>${creds.nip}</Nip></ContextIdentifier>` +
    `<SubjectIdentifierType>certificateSubject</SubjectIdentifierType></AuthTokenRequest>`;
  const signed = await signXades(authRequest, creds);
  const started = await request<{ referenceNumber: string; authenticationToken: Token }>(
    "/auth/xades-signature?verifyCertificateChain=false",
    { method: "POST", body: signed, headers: { "Content-Type": "application/xml" } },
  );
  const authToken = started.authenticationToken.token;
  let status: { code: number; description: string; details?: string[] } | undefined;
  for (let i = 0; i < 20; i++) {
    const res = await request<{ status: typeof status }>(`/auth/${started.referenceNumber}`, { token: authToken });
    status = res.status;
    if (status && status.code !== 100) break;
    await sleep(1000);
  }
  if (status?.code !== 200) {
    throw new KsefError(`Uwierzytelnienie w KSeF nie powiodło się: ${status?.description ?? "brak odpowiedzi"}`, undefined, status?.details?.join("; "));
  }
  const tokens = await request<{ accessToken: Token }>("/auth/token/redeem", { method: "POST", token: authToken });
  cachedAccess = {
    nip: creds.nip,
    certPem: creds.certPem,
    token: tokens.accessToken.token,
    expires: new Date(tokens.accessToken.validUntil).getTime(),
  };
  return cachedAccess.token;
}

async function symmetricKeyCertificate(): Promise<{ pem: string; publicKeyId?: string }> {
  const list = await request<{ certificate: string; publicKeyId?: string; usage: string[]; validTo: string }[]>(
    "/security/public-key-certificates",
  );
  const now = Date.now();
  const cert =
    list.find((c) => c.usage.includes("SymmetricKeyEncryption") && new Date(c.validTo).getTime() > now) ??
    list.find((c) => c.usage.includes("SymmetricKeyEncryption"));
  if (!cert) throw new KsefError("KSeF nie zwrócił klucza publicznego do szyfrowania.");
  return { pem: toPem(Buffer.from(cert.certificate, "base64"), "CERTIFICATE"), publicKeyId: cert.publicKeyId };
}

/** AES-256-CBC (PKCS#7) dla dokumentu, klucz symetryczny szyfrowany RSA-OAEP SHA-256 kluczem MF. */
export function encryptInvoice(xml: Buffer, key: Buffer, iv: Buffer) {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([cipher.update(xml), cipher.final()]);
}

const sha256 = (b: Buffer) => crypto.createHash("sha256").update(b).digest("base64");

export type KsefSendResult = { sessionRef: string; invoiceRef: string };

/** Otwiera sesję interaktywną, wysyła jedną fakturę FA(3) i zwraca numery referencyjne. */
export async function sendInvoice(creds: KsefCredentials, xml: string): Promise<KsefSendResult> {
  const token = await getAccessToken(creds);
  const mf = await symmetricKeyCertificate();
  const key = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const encryptedKey = crypto.publicEncrypt(
    { key: mf.pem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    key,
  );
  const session = await request<{ referenceNumber: string }>("/sessions/online", {
    method: "POST",
    token,
    body: JSON.stringify({
      formCode: FA3_FORM_CODE,
      encryption: {
        encryptedSymmetricKey: encryptedKey.toString("base64"),
        initializationVector: iv.toString("base64"),
        ...(mf.publicKeyId ? { publicKeyId: mf.publicKeyId } : {}),
      },
    }),
  });
  const plain = Buffer.from(xml, "utf8");
  const encrypted = encryptInvoice(plain, key, iv);
  const sent = await request<{ referenceNumber: string }>(`/sessions/online/${session.referenceNumber}/invoices`, {
    method: "POST",
    token,
    body: JSON.stringify({
      invoiceHash: sha256(plain),
      invoiceSize: plain.length,
      encryptedInvoiceHash: sha256(encrypted),
      encryptedInvoiceSize: encrypted.length,
      encryptedInvoiceContent: encrypted.toString("base64"),
    }),
  });
  return { sessionRef: session.referenceNumber, invoiceRef: sent.referenceNumber };
}

export type KsefInvoiceStatus = { code: number; description: string; details?: string[]; ksefNumber?: string };

export async function getInvoiceStatus(creds: KsefCredentials, sessionRef: string, invoiceRef: string): Promise<KsefInvoiceStatus> {
  const token = await getAccessToken(creds);
  const res = await request<{ ksefNumber?: string; status: { code: number; description: string; details?: string[] } }>(
    `/sessions/${sessionRef}/invoices/${invoiceRef}`,
    { token },
  );
  return { ...res.status, ksefNumber: res.ksefNumber };
}

/** Czeka krótko na wynik weryfikacji (KSeF przetwarza fakturę asynchronicznie). */
export async function waitForInvoiceStatus(creds: KsefCredentials, sessionRef: string, invoiceRef: string, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let status = await getInvoiceStatus(creds, sessionRef, invoiceRef);
  while (isPending(status.code) && Date.now() < deadline) {
    await sleep(1500);
    status = await getInvoiceStatus(creds, sessionRef, invoiceRef);
  }
  return status;
}

export function isPending(code: number) {
  return code === 100 || code === 150;
}

export async function getInvoiceUpo(creds: KsefCredentials, sessionRef: string, invoiceRef: string): Promise<string> {
  const token = await getAccessToken(creds);
  return request<string>(`/sessions/${sessionRef}/invoices/${invoiceRef}/upo`, { token, raw: true });
}

export async function closeSession(creds: KsefCredentials, sessionRef: string): Promise<void> {
  const token = await getAccessToken(creds);
  await request<unknown>(`/sessions/online/${sessionRef}/close`, { method: "POST", token, raw: true });
}
