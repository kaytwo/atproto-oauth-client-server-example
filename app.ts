import { Agent } from "@atproto/api";
import { JoseKey } from "@atproto/jwk-jose";
import {
  NodeOAuthClient,
  NodeSavedSession,
  NodeSavedState,
} from "@atproto/oauth-client-node";
import dotenv from "dotenv";
import express from "express";
import { join } from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");
const base_url = process.env.BASE_URL ?? "https://domain.invalid";
const stateStore = new Map<string, NodeSavedState>();
const sessionStore = new Map<string, NodeSavedSession>();

const client = new NodeOAuthClient({
  // This object will be used to build the payload of the /client-metadata.json
  // endpoint metadata, exposing the client metadata to the OAuth server.
  clientMetadata: {
    // Must be a URL that will be exposing this metadata
    client_id: `${base_url}/client-metadata.json`,
    client_name: "My App",
    client_uri: `${base_url}`,
    logo_uri: `${base_url}/logo.png`,
    tos_uri: `${base_url}/tos`,
    policy_uri: `${base_url}/policy`,
    redirect_uris: [`${base_url}/callback`],
    scope: "transition:generic atproto",
    token_endpoint_auth_signing_alg: "ES256",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    application_type: "web",
    token_endpoint_auth_method: "private_key_jwt",
    dpop_bound_access_tokens: true,
    jwks_uri: `${base_url}/jwks.json`,
  },

  // Used to authenticate the client to the token endpoint. Will be used to
  // build the jwks object to be exposed on the "jwks_uri" endpoint.
  keyset: await Promise.all([
    JoseKey.fromImportable(process.env.PRIVATE_KEY_1 ?? "", "0"),
    JoseKey.fromImportable(process.env.PRIVATE_KEY_2 ?? "", "1"),
    JoseKey.fromImportable(process.env.PRIVATE_KEY_3 ?? "", "2"),
  ]),

  // Interface to store authorization state data (during authorization flows)
  stateStore: {
    async set(key: string, internalState: NodeSavedState): Promise<void> {
      stateStore.set(key, internalState);
    },
    async get(key: string): Promise<NodeSavedState | undefined> {
      return stateStore.get(key);
    },
    async del(key: string): Promise<void> {
      stateStore.delete(key);
    },
  },

  // Interface to store authenticated session data
  sessionStore: {
    async set(sub: string, session: NodeSavedSession): Promise<void> {
      sessionStore.set(sub, session);
    },
    async get(sub: string): Promise<NodeSavedSession | undefined> {
      return sessionStore.get(sub);
    },
    async del(sub: string): Promise<void> {
      sessionStore.delete(sub);
    },
  },
});

const app = express();

// Expose the metadata and jwks
app.get("/client-metadata.json", (req, res) => {
  res.json(client.clientMetadata);
});
app.get("/jwks.json", (req, res) => {
  res.json(client.jwks);
});
app.get("/", (req, res) => {
  const fileName = join(__dirname, "index.html");
  return res.sendFile(fileName);
});
// Create an endpoint to initiate the OAuth flow
app.get("/login", async (req, res, next) => {
  try {
    // read handle from query string ?handle=XXX
    const handle = req.query.handle as string;

    const state = "434321";

    // Revoke any pending authentication requests if the connection is closed (optional)
    const ac = new AbortController();
    req.on("close", () => ac.abort());

    const url = await client.authorize(handle, {
      signal: ac.signal,
      state,
      // Only supported if OAuth server is openid-compliant
      ui_locales: "en",
    });

    res.redirect(url.toString());
  } catch (err) {
    next(err);
  }
});

// Create an endpoint to handle the OAuth callback
app.get("/callback", async (req, res, next) => {
  try {
    const params = new URLSearchParams(req.url.split("?")[1]);

    const { session, state } = await client.callback(params);

    // Process successful authentication here
    console.log("authorize() was called with state:", state);

    console.log("User authenticated as:", session.did);

    const agent = new Agent(session);
    if (agent.did !== undefined) {
      // Make Authenticated API calls
      const profile = await agent.getProfile({ actor: agent.did });
      console.log("Bsky profile:", profile.data);
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Whenever needed, restore a user's session
async function worker() {
  const userDid = "did:plc:123";

  const oauthSession = await client.restore(userDid);

  // Note: If the current access_token is expired, the session will automatically
  // (and transparently) refresh it. The new token set will be saved though
  // the client's session store.

  const agent = new Agent(oauthSession);
  if (agent.did !== undefined) {
    // Make Authenticated API calls

    const profile = await agent.getProfile({ actor: agent.did });
    console.log("Bsky profile:", profile.data);
  }
}

// listen
app.listen(3000, () => console.log("Server running on port 3000"));
