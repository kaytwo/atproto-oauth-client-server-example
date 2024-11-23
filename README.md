# @proto OAUTH minimum working server side example

Confused by the docs for [@atproto/oauth-client-node](https://www.npmjs.com/package/@atproto/oauth-client-node)? This is a minimum working example of a server that uses the library.

Quickstart:
* `mv .env.example .env`
* Host your server on a public https URL. I used a [Cloudflared tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/), but you can use ngrok or something similar.
* Fill in the `.env` file with your URL
* generate at least one keypair with `tsx generate.ts`
* Put each JSON string for the keypair in the `.env` file under PRIVATE_KEY_1, PRIVATE_KEY_2, etc.
* `npm start`