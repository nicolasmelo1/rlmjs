# Simple RLMJs

This is a simple implementation of a Recursive Language Model (RLM) in JavaScript using Bun. It was inspired by [Arjun's Own Implementation In Python](https://x.com/arjunkocher/status/2009446964652593593?s=61)

Feel free to use, modify, and improve this code as you see fit. This was made mostly for learning

## Installation and Usage

Create a `.env` file with the following content:

```
API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BASE_API=https://api.openai.com/v1
```

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

## Differences from Arjun's Implementation

- This implementation uses Bun instead of Python
- I prefer to use simple functions instead of classes so that was my preference
- On his implementation the LLM pretty much called an `eval`, on the main thread. Instead I let the code run on a separate worker using `new Worker`. You can probably improve it by letting the LLM call on a separate process instead, offering even more isolation.
- Also I don't use `eval`, i opted for `new Function` instead. So i can control the sandbox environment the SubLLM is iterating on without worrying to much if it'll leak my secrets.

## What is a Recursive Language Model?

The RLM framework is a significant architectural shift that reframes the problem of long-context processing from a hardware/architectural challenge to a software/algorithmic one. It suggests that the solution to "infinite context" lies not just in bigger context windows, but in teaching models how to manage and interact with information programmatically. Researchers suggest that explicitly training models to operate within this recursive framework could unlock even greater potential.

Paper: https://arxiv.org/abs/2302.06692
