/*
Script for generating atproto oauth keys in the format used by @atproto/oauth-client-node
Usage:
  pnpm install jose tsx
  pnpm tsx generate-keys.ts

Copy the output into your .env file, and then use the PRIVATE_KEY_1, PRIVATE_KEY_2, PRIVATE_KEY_3 in
your NodeOauthClient.
*/

import { generateKeyPair, exportJWK } from "jose";

async function generateAndPrintKey(keyNumber: number) {
  try {
    // Generate an ECDSA P-256 key pair with extractable privateKey
    const { publicKey, privateKey } = await generateKeyPair("ES256", {
      extractable: true,
    });

    // Export key as JWK
    const privateJwk = await exportJWK(privateKey);

    // Convert to JSON string
    const privateJwkString = JSON.stringify(privateJwk);

    // Print in .env format
    console.log(`PRIVATE_KEY_${keyNumber}=${privateJwkString}`);

    return privateJwkString;
  } catch (error) {
    console.error(`Error generating key ${keyNumber}:`, error);
  }
}

async function generateAllKeys() {
  // Generate three separate keys
  await generateAndPrintKey(1);
  await generateAndPrintKey(2);
  await generateAndPrintKey(3);
}

// Run the function
generateAllKeys().catch((error) => {
  console.error("Failed to generate keys:", error);
});
