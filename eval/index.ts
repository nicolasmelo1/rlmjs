import { rlmBuilder } from "../src/rlm.ts";
import { llmClient } from "../src/llm.ts";
import { rlmEnvBuilder } from "../src/rlm-env.ts";
import context from "./context.txt" with { type: "text/plain" };
import query from "./query.txt" with { type: "text/plain" };

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

  const rlm = rlmBuilder(mainLlm, subLlm, { maxIterations: 10 });

  const response = await rlm(context, query, { verbose: true });
  console.log(response);
}

main();
