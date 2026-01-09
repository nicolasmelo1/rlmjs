import type { llmClient } from "./llm";
import systemPrompt from "./system-prompt.txt" with { type: "text/plain" };
import { rlmEnvBuilder } from "./rlm-env";

/**
 * Builds a RLM (Recursive Language Model) that can be used to answer queries.
 *
 * The RLM is a recursive function that takes a context and a query as input.
 * It uses the context to query a subLLM (sub-LLM) to get information.
 * It then uses the information to answer the query.
 *
 * @param llm - The main LLM to use for querying information
 * @param subLlm - The sub-LLM to use for querying information
 * @param options - Options for the RLM
 * @param options.maxIterations - The maximum number of iterations to run the RLM
 *
 * @returns The RLM function that can be used to answer queries
 */
export function rlmBuilder(
  llm: ReturnType<typeof llmClient>,
  subLlm: ReturnType<typeof llmClient>,
  options: { maxIterations?: number } = {},
) {
  const maxIterations = options.maxIterations ?? 5;

  function findFinal(
    text: string,
    variables: ReturnType<typeof rlmEnvBuilder>["variables"],
  ) {
    // FINAL_VAR
    let match = text.match(/FINAL_VAR\(([^)]*)\)/s);
    if (match) {
      const names = Array.from(
        match?.[1]?.matchAll(/['"]?(\w+)['"]?/g) ?? [],
      ).map((entry) => entry[1]);
      if (names.length === 0) throw new Error("No variable names provided");

      if (names) {
        let output = "";
        for (const name of names) {
          if (!name) throw new Error("Variable name not found");
          const variable = name.trim();
          if (!variable) throw new Error(`Variable ${variable} not found`);
          const value = variables.get(variable);
          if (!value) throw new Error(`Variable ${variable} not found`);
          output += `${name}: ${value}\n`;
        }
        return output;
      }

      const output: Record<string, string> = {};
      for (const variable of (names || []) as string[]) {
        const value = variables.get(variable);
        if (!value) throw new Error(`Variable ${variable} not found`);
        output[variable] = String(value);
      }

      return JSON.stringify(output);
    }

    // FINAL
    match = text.match(/FINAL\((.+?)\)$/s);
    if (match) return match?.[1]?.trim();

    return undefined;
  }

  return async (
    context: string,
    query: string,
    options?: {
      verbose?: boolean;
    },
  ) => {
    const repl = rlmEnvBuilder(async (prompt: string) => {
      return subLlm([{ role: "user", content: prompt }]);
    }, context);

    const messages: Array<{ role: "user" | "system"; content: string }> = [
      {
        role: "system",
        content: systemPrompt
          .replace("{context_type}", "string")
          .replace("{context_length}", context.length.toString()),
      },
    ];

    for (let i = 0; i < maxIterations; i++) {
      if (options?.verbose)
        console.log(`------------- Iteration ${i + 1} ---------------`);
      if (options?.verbose) console.log(`Query: ${query}`, "\n");

      const userMsg =
        i === 0
          ? `First, explore the context in the REPL. Then answer: "${query}"\n\nYou are on iteration ${i} of ${maxIterations}\n\nYour next action:`
          : `Continue working to answer: "${query}"\n\nYou are on iteration ${i} of ${maxIterations}\n\nYour next action:`;

      messages.push({ role: "user", content: userMsg });

      const response = await llm(messages);
      if (options?.verbose)
        console.log("Response with code or final: ", response, "\n");

      const codes: string[] = Array.from(
        response.matchAll(/<<<repl:begin>>>([\s\S]*?)<<<repl:end>>>/g),
      )
        .map((m) => m[1]?.trim())
        .filter(Boolean) as string[];

      for (const code of codes) {
        if (options?.verbose)
          console.log(
            `------------- Code : Iteration ${i + 1} -------------`,
            "\n",
          );
        if (options?.verbose) console.log("Executing code:", code, "\n");
        const result = await repl.run(code);
        if (options?.verbose) console.log("Result:", result, "\n");

        messages.push({
          role: "user",
          content: `Code executed:\n\n \`\`\`javascript\n${code}\n\`\`\`\n\nOutput:\n${result}`,
        });
      }
      const final = findFinal(response, repl.variables);
      if (final) return final;

      if (options?.verbose) console.log("No final answer found, continuing...");
    }
  };
}
