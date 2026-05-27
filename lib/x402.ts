import { x402ResourceServer, HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { registerExactSvmScheme } from "@x402/svm/exact/server";
import { createFacilitatorConfig } from "@coinbase/x402";

function buildFacilitatorClient(): HTTPFacilitatorClient {
  const cdpApiKeyId = process.env.CDP_API_KEY_ID;
  const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET;
  const facilitatorUrl = process.env.FACILITATOR_URL;

  // CDP keys present → production facilitator with auth
  if (cdpApiKeyId && cdpApiKeySecret) {
    const config = createFacilitatorConfig(cdpApiKeyId, cdpApiKeySecret);
    return new HTTPFacilitatorClient({
      url: facilitatorUrl || config.url,
      createAuthHeaders: config.createAuthHeaders,
    });
  }

  // Explicit FACILITATOR_URL without CDP keys (unauthenticated)
  if (facilitatorUrl) {
    return new HTTPFacilitatorClient({ url: facilitatorUrl });
  }

  // Default public facilitator
  return new HTTPFacilitatorClient();
}

const facilitatorClient = buildFacilitatorClient();

// Register EVM (eip155:*) and SVM (solana:*) exact schemes
// syncFacilitatorOnStart stays true (default) — prevents Vercel cold-start 500s
export const x402Server = registerExactSvmScheme(
  registerExactEvmScheme(new x402ResourceServer(facilitatorClient))
);
