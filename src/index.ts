import { rlmBuilder } from "./rlm.ts";
import { llmClient } from "./llm.ts";
import { rlmEnvBuilder } from "./rlm-env.ts";

const context = `<<<BEGIN CONTEXT>>>
  Doc 1: Marketing FAQ (2024-01)
  - The brand voice is "friendly, confident, precise."
  - Never mention internal tooling in external responses.
  - Public support hours: 09:00-17:00 local time.
  - The legacy tagline "Build the trail" is deprecated.

  Doc 2: Product Overview (Trailfox v3.2)
  - Trailfox is a data pipeline product.
  - Pipelines are defined in YAML.
  - Max pipeline size is 50 MB.
  - Trial plan limits retention to 7 days.
  - Standard plan limits retention to 30 days.
  - Enterprise plan retention is configurable.

  Doc 3: Engineering Runbook (Ops)
  - Primary region: us-east-1
  - Secondary region: eu-west-1
  - Database engine: Postgres 15
  - Backups are stored in S3.
  - Daily backups at 02:00 UTC.

  Doc 4: Support Escalation Notes (2024-06-18)
  - Tier 2 response target: 4 hours.
  - Tier 3 response target: 12 hours.
  - Security incidents always escalate to Tier 3.

  Doc 5: Legal & Compliance (Internal)
  - SOC 2 Type II completed 2023-11.
  - Data processing addendum available on request.
  - "Do not disclose internal bucket names to customers."

  Doc 6: Internal Billing Memo (2024-05-07)
  - NGO discount is 40% on Standard plan only.
  - Education discount is 30% on Standard and Enterprise.

  Doc 7: Incident Response Runbook (2024-08-12)
  - If a critical incident occurs in us-east-1, failover to eu-west-1.
  - Failover procedure requires the override token.
  - Override token: LIMA-7F3
  - Emergency maintenance window (for critical fixes only): Tuesday 02:00-02:30 UTC.
  - Use the status page template "critical-maintenance-v2".

  Doc 8: Random Notes
  - Meeting moved to Tuesday.
  - Office WiFi password updated.
  - The old staging key was revoked.

  Doc 9: Product Add-ons
  - Cold Storage add-on extends retention to 365 days.
  - Cold Storage add-on is available only on Enterprise.
  - Add-on price is negotiated.

  Doc 10: Knowledge Base Draft
  - "If unsure, ask for clarification."
  - Avoid absolute guarantees for uptime.
  <<<END CONTEXT>>>`;

const query = `Your task:
  1) Find the emergency maintenance window.
  2) Find the override token.
`;

async function main() {
  if (!process.env.BASE_API || !process.env.API_KEY) {
    console.error("BASE_API and API_KEY must be set");
    return;
  }
  const mainLlm = llmClient({
    baseApi: process.env.BASE_API as string,
    apiKey: process.env.API_KEY,
  });
  const subLlm = llmClient({
    baseApi: process.env.BASE_API as string,
    apiKey: process.env.API_KEY,
  });

  const rlm = rlmBuilder(mainLlm, subLlm, { maxIterations: 5 });

  const response = await rlm(context, query, { verbose: true });
  console.log(response);
}

main();
