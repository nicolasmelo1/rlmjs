export function rlmEnvBuilder(
  llmQueryFn: (context: string) => Promise<string>,
  context: string,
) {
  const variables = new Map<string, any>();

  /**
   * Executes the given code and returns the result
   */
  return {
    variables,
    async run(code: string): Promise<string> {
      const worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      const output: any[] = [];

      let resolve: (result: string) => void;
      let reject: (error: Error) => void;
      let result = new Promise<string>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      worker.onmessage = (event: MessageEvent) => {
        switch (event.data.type) {
          case "done":
            worker.terminate();
            if (event.data.result && typeof event.data.result === "object")
              for (const [key, value] of Object.entries(event.data.result))
                variables.set(key, value);

            return resolve(output.join("\n"));

          case "error":
            worker.terminate();
            const error = `Error: ${event.data.error.message}\n\nStack: ${event.data.error.stack}`;
            return resolve(error);

          case "console.log":
            output.push(...event.data.args);
            break;
          case "llmQuery":
            const prompt = event.data.prompt;
            const uuid = event.data.uuid;
            llmQueryFn(prompt)
              .then((result) => {
                worker.postMessage({ type: "llmQueryResult", result, uuid });
              })
              .catch((error) => {
                worker.postMessage({
                  type: "llmQueryResult",
                  error: error.message,
                  uuid,
                });
              });
            break;
        }
      };

      worker.postMessage({
        type: "findContext",
        code,
        context,
      });
      return result;
    },
  };
}
