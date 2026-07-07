// Trợ lý mua hộ — SSE streaming qua raw fetch + ReadableStream.
// axios không stream được nên dùng fetch trực tiếp tới AiAssistantController.
// Backend stream interleaved: token (chữ chảy) xen tool_call_start/tool_call/tool_result.
import { store } from "~/lib/feature/store";

const MODULE1_BASE =
  import.meta.env.VITE_MODULE1_API_URL ?? "https://localhost:7167";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantSseEvent {
  type: string; // token | thinking | tool_call_start | tool_call | tool_result | done | error
  data: any;
}

// Đẩy hội thoại lên gateway, gọi onEvent cho từng sự kiện SSE.
export async function streamAssistant(
  messages: AssistantMessage[],
  opts: { sessionKey?: string; signal?: AbortSignal },
  onEvent: (ev: AssistantSseEvent) => void,
): Promise<void> {
  const token = store.getState().authState.token;

  const res = await fetch(`${MODULE1_BASE}/api/assistant/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ messages, sessionKey: opts.sessionKey }),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Assistant HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // Tách theo block SSE "\n\n".
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const ev = parseBlock(block);
      if (ev) onEvent(ev);
    }
  }
}

function parseBlock(block: string): AssistantSseEvent | null {
  let type = "message";
  const dataLines: string[] = [];

  for (const raw of block.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.startsWith("event:")) type = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
  }

  if (dataLines.length === 0) return null;
  const dataStr = dataLines.join("\n");
  let data: any = dataStr;
  try {
    data = JSON.parse(dataStr);
  } catch {
    /* giữ chuỗi thô */
  }
  return { type, data };
}
