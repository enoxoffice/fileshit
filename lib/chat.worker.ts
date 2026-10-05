import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

let generator: any = null;

async function load() {
  if (generator) return;
  generator = await pipeline("text2text-generation", "Xenova/LaMini-Flan-T5-248M", {
    progress_callback: (data: any) => self.postMessage({ type: "progress", data }),
  });
}

self.onmessage = async (e: MessageEvent) => {
  const { type, prompt } = e.data;
  try {
    await load();
    if (type === "load") {
      self.postMessage({ type: "ready" });
      return;
    }
    const out = await generator(
      `Answer briefly and in a friendly way, as ShitBot, a robot assistant inside FileShit, a private browser-based file converter. Question: ${prompt}`,
      { max_new_tokens: 120, do_sample: true, temperature: 0.7, repetition_penalty: 1.2 }
    );
    self.postMessage({ type: "reply", text: out[0].generated_text });
  } catch (err) {
    self.postMessage({ type: "error", message: String(err) });
  }
};
