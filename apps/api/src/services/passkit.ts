import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import forge from "node-forge";
import { PKPass } from "passkit-generator";

export type TenantPassData = {
  name: string;
  description: string;
  backgroundHex: string;
  textHex: string | null;
  labelHex: string | null;
};

export type ClientPassData = {
  id: string;
  name: string;
  pointsBalance: number;
};

type Certificates = {
  signerCert: string;
  signerKey: string;
  wwdr: string;
};

type Identity = {
  passTypeId: string;
  teamId: string;
};

type CertEnv = {
  certs: Certificates;
  identity: Identity;
};

let certEnvCache: CertEnv | null = null;

const ASSETS_DIR = process.env.WALLET_ASSETS_DIR ?? path.resolve("assets/wallet");

function readEnvBase64(name: string): Buffer {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  const cleaned = raw.replace(/\s+/g, "");
  const buf = Buffer.from(cleaned, "base64");
  if (buf.length === 0) {
    throw new Error(`Variable d'environnement vide ou invalide: ${name}`);
  }
  return buf;
}

function readEnvString(name: string): string {
  const raw = process.env[name];
  if (!raw) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return raw;
}

function derToPem(buf: Buffer, type: "CERTIFICATE"): string {
  const b64 = buf.toString("base64");
  const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----\n`;
}

function ensureCertPem(buf: Buffer): string {
  const ascii = buf.toString("utf8");
  if (ascii.includes("-----BEGIN CERTIFICATE-----")) return ascii;
  return derToPem(buf, "CERTIFICATE");
}

function extractFromP12(p12Buffer: Buffer, passphrase: string): { certPem: string; keyPem: string } {
  const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString("binary")));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag?.cert) {
    throw new Error("Certificat introuvable dans le PKCS#12");
  }

  const keyBag =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0] ??
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.[0];
  if (!keyBag?.key) {
    throw new Error("Clé privée introuvable dans le PKCS#12");
  }

  return {
    certPem: forge.pki.certificateToPem(certBag.cert),
    keyPem: forge.pki.privateKeyToPem(keyBag.key)
  };
}

export function loadCertificateEnv(): CertEnv {
  if (certEnvCache) return certEnvCache;

  const passphrase = process.env.APPLE_WALLET_PASSPHRASE ?? "";
  const teamId = readEnvString("APPLE_WALLET_TEAM_ID");
  const passTypeId = readEnvString("APPLE_WALLET_PASS_TYPE_ID");

  const p12 = readEnvBase64("APPLE_WALLET_P12_BASE64");
  const wwdrBuf = readEnvBase64("APPLE_WALLET_WWDR_BASE64");

  const { certPem, keyPem } = extractFromP12(p12, passphrase);
  const wwdr = ensureCertPem(wwdrBuf);

  certEnvCache = {
    certs: { signerCert: certPem, signerKey: keyPem, wwdr },
    identity: { passTypeId, teamId }
  };
  return certEnvCache;
}

export function getContrastColor(hexColor: string): string {
  const hex = hexColor.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "#000000";
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#FFFFFF";
}

function hexToRgbString(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "rgb(24, 24, 27)";
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

async function loadAssetBuffers(): Promise<Record<string, Buffer>> {
  const filenames = ["icon.png", "icon@2x.png", "logo.png", "logo@2x.png"];
  const entries = await Promise.all(
    filenames.map(async (name) => {
      const envKey = `APPLE_WALLET_${name
        .toUpperCase()
        .replace(/\./g, "_")
        .replace(/@/g, "_AT_")}_BASE64`;
      const env = process.env[envKey];
      if (env) {
        return [name, Buffer.from(env.replace(/\s+/g, ""), "base64")] as const;
      }
      const buf = await readFile(path.join(ASSETS_DIR, name));
      return [name, buf] as const;
    })
  );
  return Object.fromEntries(entries);
}

export async function generateApplePass(input: {
  tenant: TenantPassData;
  client: ClientPassData;
}): Promise<Buffer> {
  const { certs, identity } = loadCertificateEnv();
  const assets = await loadAssetBuffers();

  const contrast = getContrastColor(input.tenant.backgroundHex);
  const textHex = input.tenant.textHex?.trim() || contrast;
  const labelHex = input.tenant.labelHex?.trim() || contrast;

  const pass = new PKPass(
    assets,
    {
      wwdr: certs.wwdr,
      signerCert: certs.signerCert,
      signerKey: certs.signerKey
    },
    {
      formatVersion: 1,
      passTypeIdentifier: identity.passTypeId,
      teamIdentifier: identity.teamId,
      organizationName: input.tenant.name,
      serialNumber: input.client.id,
      description: input.tenant.description,
      backgroundColor: hexToRgbString(input.tenant.backgroundHex),
      foregroundColor: hexToRgbString(textHex),
      labelColor: hexToRgbString(labelHex)
    }
  );

  pass.type = "storeCard";
  pass.headerFields.push({
    key: "points",
    label: "Points",
    value: input.client.pointsBalance ?? 0
  });
  pass.primaryFields.push({
    key: "name",
    label: "Membre",
    value: input.client.name || "Client"
  });
  pass.secondaryFields.push({
    key: "resto",
    label: "Resto",
    value: input.tenant.name
  });

  pass.setBarcodes({
    message: input.client.id,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: input.client.id.slice(0, 8)
  });

  return pass.getAsBuffer();
}
