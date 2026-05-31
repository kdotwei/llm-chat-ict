# LLM Chatroom v2 - Advanced Local & Cloud Agentic Client

LLM Chatroom v2 is a high-performance, feature-rich, and highly responsive React 19 chat application designed for both local inference (such as LM Studio, Ollama) and cloud API providers (such as OpenAI). 

It features real-time Server-Sent Events (SSE) streaming, local tool execution (Model Context Protocol / MCP), heuristic model auto-routing, dynamic model discovery, and long-term conversation memory.

---

## Key Features

- **Zero-Friction Local Connection**: Pre-configured with IPv4 default endpoints (`http://127.0.0.1:1234`) to completely bypass macOS dual-stack `localhost` IPv6 resolution conflicts, ensuring reliable out-of-the-box local connections.
- **Dynamic Model Discovery**: Automatically queries the active endpoint `/v1/models` in real time to populate the base, vision, and reasoning model selections. Falls back to provider-specific presets if offline.
- **Timezone-Aware Local Tools (MCP)**: Equipped with a local time checker that automatically identifies the client system's time zone (e.g., `Asia/Taipei`) and UTC offset, a local high-safety calculator, DuckDuckGo instant web search, Google News RSS aggregators, and browser tab handoff.
- **Robust Local Inference Tuning**:
  - **Memory Window Slider**: Limits chat history sent to the model to reduce prefill processing latency on slow local hardware.
  - **Recency-Bias Prompt Injection**: Dynamically appends Traditional Chinese system guidelines at the very end of post-tool chat history to override local GGUF model template-stripping faults, ensuring highly detailed responses instead of lazy completions.
- **Intelligent Model Routing**: Heuristically routes prompts containing image attachments to the designated **Vision Model**, and analytical/code prompts to the **Reasoning Model**.
- **Long-Term Memory**: Automatically indexes and stores key conversation terms in the browser's localStorage, dynamically prepending relevant memory context to subsequent queries.
- **Premium Responsive UI**: Features a modern glassmorphic dark/light theme, auto-expanding textareas, RWD mobile-first grids, visual loading indicators, and unified messaging toolbars.

---

## Tech Stack

- **Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Advanced Rendering**: `react-markdown` (GitHub Flavored Markdown support), `react-syntax-highlighter` (Prism-based code blocks)

---

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (v18.0.0 or higher) installed on your system.

### Installation

Clone the repository to your local machine and install the dependencies:

```bash
npm install
```

### Running the Development Server

Start the local Vite development server:

```bash
npm run dev
```

Open `http://127.0.0.1:5173/` in your browser to access the chatroom.

### Building for Production

Compile the TypeScript files and build the optimized production bundle:

```bash
npm run build
```

The compiled assets will be saved to the `dist/` directory, which can be hosted on any static web server (such as Vercel, Netlify, or GitHub Pages).

---

## Configuration & Connection Guide

### 1. Connecting to Local LM Studio

1. Open **LM Studio** on your computer.
2. Select and load your desired model (e.g., `qwen/qwen3.5-9b` or `deepseek-r1-8b`).
3. Click the **Local Server** icon in the left sidebar.
4. Locate the **Cross-Origin Resource Sharing (CORS)** setting in the right-hand panel and toggle it **ON** (CORS must be enabled for the browser client to communicate with LM Studio).
5. Click **Start Server** (Default port is `1234`).
6. Open the LLM Chatroom in your browser, click **Settings** (gear icon in the top right), and select **LM Studio (Local)** as the preset.
7. The panel will instantly query the active server, fetch your loaded model under "Default Model", and light up the **● LM Studio Connected** status badge in the header.

### 2. Connecting to Remote LM Studio or Custom Endpoints

1. Set up LM Studio or Ollama on your remote machine (e.g., `192.168.1.100`).
2. Ensure the remote machine's firewall permits inbound TCP connections on port `1234` (or your custom port), and ensure LM Studio is bound to `0.0.0.0` (all interfaces) rather than `127.0.0.1`.
3. In the chatroom **Settings** panel, select the **Custom Endpoint** preset.
4. Input your remote Completions URL: `http://192.168.1.100:1234/v1/chat/completions`.
5. The Settings panel will dynamically fetch the remote models in real time as you type. Click **Save** to apply the settings.

### 3. Connecting to OpenAI Cloud

1. In the chatroom **Settings** panel, select the **OpenAI Cloud** preset.
2. Enter your secure API key under **API Key** (e.g., `sk-...`). 
3. *Note: Storing API Keys is strictly local to your browser's localStorage. Keys are never transmitted to any third party except the target completions URL.*
4. Select your preferred model (e.g., `gpt-4o-mini` or `gpt-4o`) from the dynamic dropdown. Click **Save**.

---

## Local Tool Usage (MCP)

When **Tool Use** is enabled in the Settings panel, the AI will automatically decide to execute the following tools locally inside your browser when necessary:

1. **Clock Utility (`utilities_time_now`)**:
   - *Example query*: `"What time is it now?"` or `"請問現在幾點？"`
   - *Behavior*: Fetches the system's exact local time, local timezone identifier (e.g., `Asia/Taipei`), and displays a sleek timezone badge on the UI card, allowing the model to respond accurately.
2. **Calculator (`utilities_calculate`)**:
   - *Example query*: `"What is the result of (48 * 12) / 3?"`
   - *Behavior*: Executes arithmetic expressions inside a secure local parser and returns the value instantly to the model.
3. **Web Search (`browser_search_web`)**:
   - *Example query*: `"Search Google News for React updates"`
   - *Behavior*: Aggregates fresh search query metrics and summarizes articles with citation links without requiring any server-side database.
4. **Memory Search (`memory_search`)**:
   - *Example query*: `"What is my name?"` (after telling the AI to remember it).
   - *Behavior*: Allows the model to inspect long-term keyword contexts.
5. **Open URL (`browser_open_url`)**:
   - *Example query*: `"Open Google in a new tab"`
   - *Behavior*: Securely hands off tab execution to the browser window.
