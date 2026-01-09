// prevents TS errors
declare var self: Worker;

import Bun from "bun";

const console = {
  log: (...args: any[]) => postMessage({ type: "console.log", args }),
};
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

let llmQueryUuidPromises: Map<
  string,
  { resolve: (result: string) => void; reject: (error: Error) => void }
> = new Map();

const llmQuery = async (prompt: string) => {
  const uuid = Bun.randomUUIDv7();
  postMessage({ type: "llmQuery", prompt, uuid });

  let resolve: (result: string) => void;
  let reject: (error: Error) => void;
  let result = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  llmQueryUuidPromises.set(uuid, { resolve: resolve!, reject: reject! });
  return result;
};

self.onmessage = async (event: MessageEvent) => {
  switch (event.data.type) {
    case "llmQueryResult": {
      const uuid = event.data.uuid;
      if (!llmQueryUuidPromises.has(uuid))
        throw new Error("No pending promise found");
      const { resolve, reject } = llmQueryUuidPromises.get(uuid)!;
      llmQueryUuidPromises.delete(uuid);
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
      break;
    }
    case "findContext": {
      console.log("WORKER MESSAGE", event.data.code);
      const functionToGetContext = new AsyncFunction(
        "context",
        "console",
        "llmQuery",
        event.data.code,
      );
      functionToGetContext(event.data.context, console, llmQuery)
        .then((res: any) => postMessage({ type: "done", result: res }))
        .catch((error: Error) =>
          postMessage({ type: "error", error: error.message }),
        );
      break;
    }
  }
};
