const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, PageBreak, TabStopType, TabStopPosition,
  Header, Footer
} = require('docx');
const fs = require('fs');

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  primary:   "1A1A2E",   // deep navy
  accent:    "E94560",   // red-pink
  accent2:   "0F3460",   // dark blue
  accent3:   "16213E",   // darker navy
  gold:      "F5A623",   // gold for phases
  green:     "27AE60",   // green ticks
  gray:      "7F8C8D",   // muted text
  lightBg:   "F4F6F8",   // section backgrounds
  tableBg:   "EBF5FB",   // table header
  white:     "FFFFFF",
};

const border  = { style: BorderStyle.SINGLE, size: 1, color: "D5D8DC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 4 } },
    children: [new TextRun({ text, font: "Arial", size: 36, bold: true, color: C.primary })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: C.accent2 })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: C.primary })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: opts.color || C.primary, bold: opts.bold || false, italics: opts.italic || false })]
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: C.primary })]
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 22, color: C.primary })]
  });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D5D8DC", space: 1 } },
    children: []
  });
}

function phaseBox(phase, title, color) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            shading: { fill: color, type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 240, right: 240 },
            width: { size: 9360, type: WidthType.DXA },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({ text: phase + "  ", font: "Arial", size: 26, bold: true, color: C.gold }),
                  new TextRun({ text: title, font: "Arial", size: 26, bold: true, color: C.white }),
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function infoBox(label, content, bg) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1800, 7560],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders,
            shading: { fill: bg || C.tableBg, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            width: { size: 1800, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: label, font: "Arial", size: 20, bold: true, color: C.accent2 })] })]
          }),
          new TableCell({
            borders,
            shading: { fill: C.white, type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            width: { size: 7560, type: WidthType.DXA },
            children: [new Paragraph({ children: [new TextRun({ text: content, font: "Arial", size: 20, color: C.primary })] })]
          }),
        ]
      })
    ]
  });
}

function tableRow(cells, isHeader) {
  return new TableRow({
    children: cells.map((text, i) =>
      new TableCell({
        borders,
        shading: { fill: isHeader ? C.accent2 : (i === 0 ? C.lightBg : C.white), type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, bold: isHeader, color: isHeader ? C.white : C.primary })] })]
      })
    )
  });
}

function dataTable(headers, rows, colWidths) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      tableRow(headers, true),
      ...rows.map(r => tableRow(r, false))
    ]
  });
}

function sp(n = 1) {
  return Array(n).fill(null).map(() => new Paragraph({ children: [] }));
}

// ─── Document ─────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
          { level: 2, format: LevelFormat.BULLET, text: "\u25AA", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ]},
      { reference: "numbers", levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.DECIMAL, text: "%1.%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
      ]},
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: C.primary },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: C.accent2 },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: C.primary },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.accent, space: 4 } },
            children: [
              new TextRun({ text: "GENESIS AI  ", font: "Arial", size: 18, bold: true, color: C.accent }),
              new TextRun({ text: "v4.0 — Master Upgrade Plan", font: "Arial", size: 18, color: C.gray }),
            ]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.accent, space: 4 } },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "CONFIDENTIAL — GENESIS v4.0 Master Plan  |  Page ", font: "Arial", size: 16, color: C.gray }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray }),
            ]
          })
        ]
      })
    },
    children: [

      // ── COVER ──────────────────────────────────────────────────────────────
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [9360],
        rows: [new TableRow({ children: [new TableCell({
          borders: noBorders,
          shading: { fill: C.primary, type: ShadingType.CLEAR },
          margins: { top: 480, bottom: 480, left: 480, right: 480 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "GENESIS AI", font: "Arial", size: 72, bold: true, color: C.accent })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "v4.0 MASTER UPGRADE PLAN", font: "Arial", size: 36, bold: true, color: C.white })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Full System Architecture, Training Pipeline,", font: "Arial", size: 24, color: C.gray, italics: true })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Admin Panel, and Domain-Specific Model Engine", font: "Arial", size: 24, color: C.gray, italics: true })] }),
            ...sp(1),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Prepared: April 2026  |  Status: APPROVED FOR BUILD", font: "Arial", size: 20, color: C.gold })] }),
          ]
        })}])}]
      }),

      ...sp(2),

      // ── TABLE OF CONTENTS ──────────────────────────────────────────────────
      h1("Table of Contents"),
      p("PART 1  —  Vision & Architecture Overview", { bold: true }),
      p("PART 2  —  Multi-Model Backbone (All LLM APIs)"),
      p("PART 3  —  11 Layers System (How Every Output Is Processed)"),
      p("PART 4  —  9 Modules + New M10 (Auto-Training)"),
      p("PART 5  —  Domain-Specific Model Engine (Training Pipeline)"),
      p("PART 6  —  Coding Model v1.0 (First Build Target)"),
      p("PART 7  —  Trading Model v1.0 (Second Build Target)"),
      p("PART 8  —  Future Models (Image Gen, Video Gen, Reading)"),
      p("PART 9  —  Deep Search & Auto-Data Ingestion Engine"),
      p("PART 10 —  Admin Panel (Full Design: Backend + Frontend)"),
      p("PART 11 —  User-Facing Frontend"),
      p("PART 12 —  Voice Integration"),
      p("PART 13 —  Version Control & Model Rollout (v1.0, v1.1, v2.0...)"),
      p("PART 14 —  Database & Storage Architecture"),
      p("PART 15 —  Security, Testing & Deployment"),
      p("PART 16 —  Phase-by-Phase Build Order & File Map"),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 1 — VISION
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 1 — Vision & Architecture Overview"),

      p("GENESIS v4.0 transforms from a single-model AI assistant into a multi-model, self-training, continuously improving intelligence platform. Every query, every coding task, every analysis runs through a unified pipeline that combines multiple LLM APIs, all 9 specialist modules, and all 11 quality/security layers before producing output.", { }),

      ...sp(1),
      h2("1.1  Core Idea in One Sentence"),
      new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
        rows: [new TableRow({ children: [new TableCell({
          borders: noBorders,
          shading: { fill: C.accent2, type: ShadingType.CLEAR },
          margins: { top: 200, bottom: 200, left: 300, right: 300 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "All 9 Modules + All 11 Layers + All LLM APIs  =  One Perfect Domain-Specific Answer", font: "Arial", size: 26, bold: true, color: C.white })
          ]})]
        })}])}]
      }),

      ...sp(1),
      h2("1.2  What Is Being Built"),
      bullet("A multi-LLM orchestration engine (Gemini, GPT, MiniMax, Groq) that picks the best model per task"),
      bullet("Domain-specific fine-tuned models: Coding Model, Trading Model, Image Gen Model, Video Gen Model, Reading Model"),
      bullet("Each specialized model is trained by feeding all 9 modules' knowledge through all 11 processing layers"),
      bullet("An auto-training engine (M10) that continuously crawls Google, GitHub, YouTube, Wikipedia, Twitter, PDFs and feeds data into training — even when admins are offline"),
      bullet("An Admin Panel where admins: configure data sources, watch training progress, test models in sandbox, approve and publish to users"),
      bullet("A public frontend where users pick which trained model to use — and every response goes through all 11 layers again for quality"),
      bullet("Version control for every model: Coding v1.0, v1.1, v1.2, v2.0 — upgradeable continuously"),
      bullet("Voice interface for all interactions"),
      bullet("Self-fixing code generation pipeline that tests its own output, searches for errors, and corrects itself"),

      ...sp(1),
      h2("1.3  High-Level Architecture Diagram"),
      p("The system works in two modes: TRAINING MODE (admin-triggered or auto) and INFERENCE MODE (user-facing)."),
      ...sp(1),

      dataTable(
        ["Layer", "Component", "Role"],
        [
          ["Input", "User Query / Admin Training Data", "Entry point for any request or data feed"],
          ["Routing", "Multi-Model Router", "Decides: which LLM API handles this query (Gemini / GPT / MiniMax / Groq)"],
          ["Processing", "9 Modules (M1-M9)", "Each module enriches the query with its specialized knowledge"],
          ["Layers", "11 Quality Layers", "Passes output through syntax, type safety, security, alignment, quality checks"],
          ["Model", "Domain Model (Coding / Trading / etc.)", "Specialized fine-tuned model gives the primary answer"],
          ["Output", "Response Engine", "Final structured output: text, code, PDF, visual"],
          ["Feedback", "Training Loop", "Every interaction improves the domain model version"],
        ],
        [1200, 3000, 5160]
      ),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 2 — MULTI-MODEL BACKBONE
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 2 — Multi-Model Backbone (All LLM APIs)"),

      p("GENESIS v4.0 does not depend on a single LLM. It maintains a pool of LLM APIs and routes tasks to the best-suited model, combining outputs when necessary for maximum quality."),

      ...sp(1),
      h2("2.1  Supported LLM APIs"),
      dataTable(
        ["API", "Model", "Best Used For", "Env Variable"],
        [
          ["Gemini", "gemini-2.0-flash / gemini-1.5-pro", "Multimodal tasks, long context, Google-integrated search", "GEMINI_API_KEY"],
          ["OpenAI GPT", "gpt-4o / gpt-4-turbo", "General reasoning, instruction following, code gen", "OPENAI_API_KEY"],
          ["MiniMax", "abab6.5s-chat", "Deep complex reasoning, creative writing, structured output", "MINIMAX_API_KEY + MINIMAX_GROUP_ID"],
          ["Groq", "llama3-70b / mixtral-8x7b", "Ultra-fast inference, quick lookups, low-latency QA", "GROQ_API_KEY"],
          ["HuggingFace", "Gemma-3 / custom fine-tuned", "Local models, fine-tuned domain models, offline operation", "HF_TOKEN"],
        ],
        [1200, 2200, 3200, 2760]
      ),

      ...sp(1),
      h2("2.2  How the Router Decides Which Model to Use"),
      p("The Multi-Model Router lives in core/model_router.py. It classifies every incoming query into a task type, then maps that to the best available model:"),
      ...sp(1),
      dataTable(
        ["Task Type", "Primary Model", "Fallback Model", "Why"],
        [
          ["complex_reasoning", "MiniMax abab6.5s", "GPT-4o", "MiniMax excels at step-by-step deep reasoning"],
          ["code_generation", "GPT-4o", "Gemini 2.0 Flash", "GPT-4o produces the cleanest, most accurate code"],
          ["simple_qa", "Groq llama3-70b", "Gemma-3-1b", "Groq is fastest for short factual answers"],
          ["creative_writing", "MiniMax", "GPT-4o", "MiniMax handles creative + structured narrative well"],
          ["multimodal (image/audio)", "Gemini 1.5 Pro", "GPT-4o Vision", "Gemini has native multimodal support"],
          ["data_analysis", "GPT-4o", "Gemini 2.0", "GPT-4o with code interpreter handles data well"],
          ["trading_analysis", "Coding Model (fine-tuned)", "GPT-4o", "Domain-specific fine-tuned model is most accurate"],
          ["default", "Groq / Gemma", "Any available", "Fastest available for unclassified queries"],
        ],
        [2000, 2000, 2000, 3360]
      ),

      ...sp(1),
      h2("2.3  Model Combination Strategy"),
      p("For high-stakes queries (complex_reasoning, trading_analysis), GENESIS uses a multi-model consensus approach:"),
      numbered("Query sent to primary model (e.g. MiniMax)"),
      numbered("Same query sent in parallel to secondary model (e.g. GPT-4o)"),
      numbered("Both responses passed through the 11 layers"),
      numbered("Response Combiner picks the better answer, or merges both"),
      numbered("Final answer returned to user"),
      p("This is controlled by the FEATURE_CONSENSUS flag. Default: off. Enable per task type in config."),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 3 — 11 LAYERS
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 3 — The 11 Layers System"),

      p("Every output — whether from training, inference, or code generation — passes through all 11 layers before being finalized. These layers are the quality, safety, and alignment backbone of GENESIS."),
      p("Layers run in sequence. Each layer can: PASS the output unchanged, MODIFY the output (fix/improve it), or REJECT and trigger re-generation."),

      ...sp(1),
      dataTable(
        ["Layer", "Name", "What It Does", "File"],
        [
          ["L01", "Syntax Check", "Validates Python/JS/SQL syntax in any code output. Auto-fixes common errors.", "layers/l01_syntax.py"],
          ["L02", "Type & Scope", "Checks variable types, function signatures, scope leaks. Enforces type hints.", "layers/l02_type_scope.py"],
          ["L03", "Dependencies", "Validates all imports exist. Checks for circular deps. Suggests fixes.", "layers/l03_dependencies.py"],
          ["L04", "Control Flow", "Detects unreachable code, infinite loops, missing returns, dead branches.", "layers/l04_control_flow.py"],
          ["L05", "Runtime Simulation", "Simulates execution with mock data. Catches runtime errors before they happen.", "layers/l05_runtime_sim.py"],
          ["L06", "Async Safety", "Ensures async/await is used correctly. Detects race conditions. Validates concurrency.", "layers/l06_async_safety.py"],
          ["L07", "Security", "Checks for SQL injection, XSS, hardcoded secrets, insecure patterns.", "layers/l07_security.py"],
          ["L08", "Compliance", "Validates output follows GDPR, data handling, and platform usage policies.", "layers/l08_compliance.py"],
          ["L09", "Performance", "Detects O(n^2) patterns, memory leaks, inefficient queries. Suggests optimizations.", "layers/l09_performance.py"],
          ["L10", "Quality", "Checks output completeness, clarity, and formatting. Ensures nothing is half-done.", "layers/l10_quality.py"],
          ["L11", "Alignment", "Final check: does the output actually answer what was asked? Safety and ethics check.", "layers/l11_alignment.py"],
        ],
        [500, 1500, 4860, 2500]
      ),

      ...sp(1),
      h2("3.1  How Layers Work in Training vs Inference"),
      dataTable(
        ["Mode", "When Layers Run", "What Happens on Failure"],
        [
          ["Training", "After each batch of training data is generated/processed", "Bad data is flagged, filtered out, or regenerated — never used for training"],
          ["Inference", "On every response before it reaches the user", "Response is regenerated or corrected automatically — user never sees a failed response"],
          ["Code Gen", "After each iteration of code generation", "Code is self-corrected, re-tested, and re-submitted to layers until it passes all 11"],
        ],
        [1500, 3500, 4360]
      ),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 4 — 9 MODULES + M10
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 4 — 9 Modules + New M10 (Auto-Training Engine)"),

      p("GENESIS has 9 specialist modules (M1-M9), each expert in a domain. In v4.0, all 9 modules work together to TRAIN each new domain-specific model. They don't each become a separate model — they collectively contribute their knowledge to build ONE specialized model (e.g. the Coding Model or Trading Model)."),
      p("A 10th module (M10) is introduced in v4.0: the Autonomous Data Ingestion & Training Module. It runs 24/7 without admin involvement."),

      ...sp(1),
      dataTable(
        ["Module", "Name", "Contribution to Training", "Key Training Data Source"],
        [
          ["M1", "Self-Learner", "Learns from new data sources. Ingests and structures raw training data.", "YouTube, PDFs, Wikipedia, GitHub READMEs"],
          ["M2", "Research Accelerator", "Parses research papers, extracts hypotheses. Contributes academic knowledge.", "arXiv, PubMed, Google Scholar, ResearchGate"],
          ["M3", "AI Builder", "Generates code examples, architecture designs. Contributes code training pairs.", "GitHub, Stack Overflow, LeetCode, CodeForces"],
          ["M4", "Time Reconstructor", "Analyzes historical patterns, market timelines. Contributes time-series training data.", "Historical market data APIs, news archives"],
          ["M5", "Intuition Engine", "Bayesian reasoning, gap-filling. Contributes reasoning chain training examples.", "Reasoning benchmarks, logic datasets"],
          ["M6", "Reality Simulator", "Runs simulations of real-world scenarios. Contributes synthetic training data.", "Simulation engines, Monte Carlo datasets"],
          ["M7", "Multimodal Processor", "Processes images, audio, video. Contributes multimodal training pairs.", "YouTube transcripts, image datasets, audio APIs"],
          ["M8", "Agent Runner", "Plans and executes multi-step tasks. Contributes agentic training examples.", "Task planning benchmarks, agent interaction logs"],
          ["M9", "Code Interpreter", "Executes code, validates results. Contributes code-execution training pairs.", "Code execution results, test case datasets"],
          ["M10", "Auto-Training Engine", "NEW: Runs 24/7. Crawls web, ingests new data, triggers retraining automatically.", "ALL sources: Google, Twitter, GitHub, LinkedIn, news, APIs"],
        ],
        [500, 1800, 3500, 3560]
      ),

      ...sp(1),
      h2("4.1  How All 9 Modules Build One Domain Model"),
      p("Using the Coding Model as an example:"),
      numbered("M3 (AI Builder) crawls GitHub, Stack Overflow, pulls 10,000 code examples"),
      numbered("M1 (Self-Learner) ingests YouTube coding tutorials, converts to text, structures them"),
      numbered("M9 (Code Interpreter) runs each code example, captures input-output pairs"),
      numbered("M5 (Intuition Engine) generates reasoning chains: 'why this code works, why this fails'"),
      numbered("M2 (Research Accelerator) pulls latest CS papers on algorithms and software patterns"),
      numbered("M7 (Multimodal) transcribes coding video walkthroughs from YouTube"),
      numbered("M8 (Agent Runner) creates agentic coding task examples (plan, execute, debug)"),
      numbered("M6 (Reality Simulator) runs adversarial tests: 'what breaks this code?'"),
      numbered("M4 (Time Reconstructor) adds historical context: how coding practices evolved"),
      numbered("All data is merged into one training dataset, processed through all 11 layers"),
      numbered("Fine-tuned model trained on this dataset = Coding Model v1.0"),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 5 — DOMAIN-SPECIFIC MODEL ENGINE
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 5 — Domain-Specific Model Engine (Training Pipeline)"),

      p("This is the core of v4.0. The Domain-Specific Model Engine is a reusable training pipeline that can produce ANY specialized model (Coding, Trading, Image Gen, etc.) by following the same process."),

      ...sp(1),
      h2("5.1  Training Pipeline — Step by Step"),
      phaseBox("STEP 1", "DATA INGESTION", C.accent2),
      ...sp(1),
      bullet("Admin configures sources in Admin Panel: GitHub, Google Search, YouTube, Twitter, Wikipedia, PDFs, market data APIs"),
      bullet("M10 (or admin trigger) starts crawling all sources"),
      bullet("Raw data collected: text, code, video transcripts, PDFs, JSON, CSV"),
      bullet("Data stored in: data/raw/{model_name}/"),
      ...sp(1),

      phaseBox("STEP 2", "DATA PROCESSING — 9 MODULES WORKING TOGETHER", C.accent2),
      ...sp(1),
      bullet("Each module processes the raw data in its specialty"),
      bullet("M1 structures and labels text data"),
      bullet("M3 extracts clean code examples with expected inputs/outputs"),
      bullet("M9 executes code and validates results"),
      bullet("M5 generates reasoning chains for complex problems"),
      bullet("All module outputs merged into unified training dataset"),
      bullet("Stored in: data/processed/{model_name}/"),
      ...sp(1),

      phaseBox("STEP 3", "LAYER FILTERING — 11 LAYERS VALIDATE EVERY TRAINING EXAMPLE", C.accent2),
      ...sp(1),
      bullet("Each training example passes through all 11 layers"),
      bullet("L01-L04: code/syntax quality checks"),
      bullet("L07-L08: security and compliance filtering"),
      bullet("L10-L11: quality and alignment checks"),
      bullet("Any training example that fails is either corrected or discarded"),
      bullet("Only layer-validated data reaches the fine-tuning step"),
      ...sp(1),

      phaseBox("STEP 4", "FINE-TUNING — USING ALL LLM APIS", C.accent2),
      ...sp(1),
      bullet("Base model selected (Gemma-3, GPT-4o fine-tune, or HuggingFace model)"),
      bullet("Training data fed in batches"),
      bullet("Gemini API used for data augmentation (generate more examples)"),
      bullet("GPT-4o used to label and validate ambiguous training pairs"),
      bullet("MiniMax used to generate reasoning-chain training examples"),
      bullet("Fine-tuning runs on GPU (local or cloud: RunPod, Google Colab, Lambda Labs)"),
      bullet("Checkpoints saved every N steps"),
      ...sp(1),

      phaseBox("STEP 5", "EVALUATION — AUTOMATED TESTING", C.accent2),
      ...sp(1),
      bullet("Model tested on held-out benchmark dataset"),
      bullet("Metrics: accuracy, perplexity, pass@k for code, BLEU for text"),
      bullet("Results displayed in Admin Panel test sandbox"),
      bullet("Admin runs manual test queries in sandbox"),
      bullet("If metrics pass threshold: model marked as READY FOR REVIEW"),
      ...sp(1),

      phaseBox("STEP 6", "ADMIN APPROVAL & PUBLISH", C.accent2),
      ...sp(1),
      bullet("Admin reviews sandbox test results"),
      bullet("Admin clicks APPROVE in Admin Panel"),
      bullet("Model version tagged: CodingModel-v1.0, CodingModel-v1.1, etc."),
      bullet("Model automatically linked to public frontend"),
      bullet("Users can now select the new model version"),
      bullet("Previous version kept as fallback"),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 6 — CODING MODEL
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 6 — Coding Model v1.0 (First Build Target)"),

      p("The Coding Model is the FIRST specialized model to be built. It will be the most complete showcase of the entire v4.0 system."),

      ...sp(1),
      h2("6.1  What the Coding Model Does"),
      bullet("Generates production-quality code in Python, JavaScript, TypeScript, SQL, Bash, and more"),
      bullet("Self-tests its own code output using M9 (Code Interpreter) sandbox"),
      bullet("Searches Google / GitHub / Stack Overflow for missing knowledge or error fixes"),
      bullet("Iterates until the code passes all tests AND all 11 layers"),
      bullet("Returns clean, commented, production-ready code"),
      bullet("Explains what the code does, why each decision was made"),
      bullet("Outputs as: inline code block, downloadable file, or GitHub gist"),

      ...sp(1),
      h2("6.2  Self-Fixing Code Generation Loop"),
      p("This is the most important feature of the Coding Model. It never returns broken code:"),
      ...sp(1),
      dataTable(
        ["Step", "Action", "If Fails"],
        [
          ["1", "User submits coding request", "—"],
          ["2", "Multi-model router sends to Coding Model (GPT-4o primary)", "Falls back to Gemini"],
          ["3", "Code generated by model", "—"],
          ["4", "M9 executes code in sandboxed environment", "If error: go to step 5"],
          ["5", "Error captured. L01-L04 layers analyze error type", "—"],
          ["6", "System searches Google / GitHub / Stack Overflow for fix", "—"],
          ["7", "Fix applied. Code regenerated.", "—"],
          ["8", "Steps 4-7 repeat up to 5 times until code passes", "After 5 fails: return with error explanation"],
          ["9", "Passing code goes through all 11 layers", "Layer failure triggers targeted fix"],
          ["10", "Final clean code returned to user", "—"],
        ],
        [500, 4000, 4860]
      ),

      ...sp(1),
      h2("6.3  Training Data Sources for Coding Model"),
      bullet("GitHub: Top 100,000 public repositories by stars (Python, JS, TS, Go, Rust)"),
      bullet("Stack Overflow: All Q&A pairs tagged Python, JavaScript, TypeScript — 5M+ pairs"),
      bullet("YouTube: Coding tutorials — transcripts extracted by M7"),
      bullet("LeetCode / HackerRank: Algorithm problems + solutions"),
      bullet("Official documentation: Python docs, MDN Web Docs, FastAPI docs, React docs"),
      bullet("arXiv CS papers: Algorithms, software engineering, ML papers — via M2"),
      bullet("GENESIS interaction logs: Real user coding queries and validated answers"),
      bullet("Synthetic data: Generated by GPT-4o and Gemini for rare edge cases"),

      ...sp(1),
      h2("6.4  New Files Needed for Coding Model"),
      dataTable(
        ["File Path", "Type", "Purpose"],
        [
          ["modules/m10_auto_trainer/__init__.py", "New Module", "M10 Auto-Training Engine"],
          ["modules/m10_auto_trainer/crawler.py", "New", "Deep web crawler: Google, GitHub, YouTube, Twitter"],
          ["modules/m10_auto_trainer/data_pipeline.py", "New", "Processes raw crawled data into training pairs"],
          ["modules/m10_auto_trainer/scheduler.py", "New", "Schedules auto-training runs (cron-style)"],
          ["modules/m10_auto_trainer/training_trigger.py", "New", "Triggers fine-tuning when enough data collected"],
          ["core/domain_model_engine.py", "New", "Main engine: orchestrates all 9 modules for training"],
          ["core/self_fix_loop.py", "New", "Self-fixing code generation loop (10 step loop above)"],
          ["core/consensus_engine.py", "New", "Multi-model consensus: combines outputs from 2+ LLMs"],
          ["services/github_client.py", "New", "GitHub API client for code data collection"],
          ["services/youtube_client.py", "New", "YouTube Data API v3 + transcript extraction"],
          ["services/search_client.py", "New", "Google Custom Search API + Serper.dev deep search"],
          ["services/twitter_client.py", "New", "Twitter/X API v2 for trend and discussion data"],
          ["training/coding_model/config.yaml", "New", "Training config for Coding Model v1.0"],
          ["training/coding_model/dataset_builder.py", "New", "Builds the training dataset from all module outputs"],
          ["training/coding_model/evaluator.py", "New", "Benchmark evaluation suite"],
          ["training/coding_model/trainer.py", "New", "Fine-tuning runner (HuggingFace Trainer API)"],
          ["models/coding_model/v1.0/", "New Dir", "Saved model checkpoints for Coding Model v1.0"],
        ],
        [3500, 1200, 4660]
      ),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 7 — TRADING MODEL
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 7 — Trading Model v1.0 (Second Build Target)"),

      p("The Trading Model is the second specialized model. It is specifically trained to understand, analyze, and reason about financial markets: crypto, stocks, forex, commodities."),

      h2("7.1  What the Trading Model Does"),
      bullet("Analyzes market conditions using live API data"),
      bullet("Gives trading signals: BUY / SELL / HOLD with confidence score and reasoning"),
      bullet("Explains WHY a signal was generated using step-by-step reasoning (MiniMax primary)"),
      bullet("Backtests strategies against historical data"),
      bullet("Monitors multiple assets simultaneously"),
      bullet("Outputs: signal cards, charts, PDF reports, or raw JSON for integration"),

      ...sp(1),
      h2("7.2  Training Data Sources for Trading Model"),
      bullet("Historical OHLCV data: Binance API, CoinGecko, Yahoo Finance, Alpha Vantage"),
      bullet("News data: CryptoPanic, NewsAPI, Bloomberg RSS, Reuters RSS"),
      bullet("Social sentiment: Twitter/X (crypto discussions), Reddit (r/trading, r/stocks)"),
      bullet("YouTube: Trading tutorial transcripts, market analysis videos"),
      bullet("Wikipedia: Financial concepts, market history"),
      bullet("PDFs: Trading books, technical analysis guides, institutional reports"),
      bullet("On-chain data: Glassnode, Nansen, Dune Analytics (crypto-specific)"),
      bullet("GENESIS interaction logs: Real user trading queries and validated analyses"),

      ...sp(1),
      h2("7.3  Model Versioning Plan"),
      dataTable(
        ["Version", "Focus", "New Capabilities Added"],
        [
          ["Trading Model v1.0", "Core trading signals", "BUY/SELL/HOLD signals for top 20 crypto + major stocks. Basic technical analysis."],
          ["Trading Model v1.1", "Sentiment layer", "Adds Twitter/Reddit sentiment scoring to signals. News impact analysis."],
          ["Trading Model v1.2", "Multi-timeframe", "Signals across 1h, 4h, 1D, 1W timeframes. Trend alignment scoring."],
          ["Trading Model v2.0", "On-chain + macro", "On-chain whale tracking, macro economic indicators, correlation analysis."],
          ["Trading Model v2.1", "Strategy backtester", "Test any strategy against 5 years of historical data. Win rate, drawdown, Sharpe ratio."],
        ],
        [2200, 2200, 4960]
      ),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 8 — FUTURE MODELS
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 8 — Future Models (Image Gen, Video Gen, Reading Model)"),

      dataTable(
        ["Model", "Version", "Core Capability", "Primary APIs Used", "Key Data Sources"],
        [
          ["Image Generation Model", "v1.0", "Generate images from text prompts. Educational visual output. Diagram generation.", "Gemini Vision, DALL-E 3, Stable Diffusion API", "LAION dataset, COCO, educational diagrams"],
          ["Video Generation Model", "v1.0", "Short video generation from text. Explainer video creation. Animation.", "Runway ML API, Pika Labs API, Gemini Video", "YouTube (licensed), synthetic video pairs"],
          ["Reading / Research Model", "v1.0", "Deep research on any topic. Reads and synthesizes 100+ sources. Outputs structured report.", "Google Search API, Gemini 1.5 Pro (2M context), MiniMax", "Wikipedia, arXiv, PubMed, news archives"],
        ],
        [2000, 1000, 2500, 2000, 1860]
      ),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 9 — DEEP SEARCH & AUTO DATA INGESTION
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 9 — Deep Search & Auto-Data Ingestion Engine"),

      p("M10 is the autonomous data engine. It runs continuously, sourcing training data from the entire surface web and structured APIs without admin involvement."),

      h2("9.1  Data Sources (All Connected in M10)"),
      dataTable(
        ["Source", "Type", "API / Method", "Data Extracted"],
        [
          ["Google Search", "Web", "Google Custom Search API + Serper.dev", "Top results per query topic, full page content"],
          ["GitHub", "Code", "GitHub REST API v3", "Repository code, README files, issues, wikis"],
          ["YouTube", "Video", "YouTube Data API v3 + youtube-transcript-api", "Video transcripts, metadata, comments"],
          ["Wikipedia", "Knowledge", "Wikipedia REST API", "Full article text, categories, links"],
          ["Twitter / X", "Social", "Twitter API v2", "Trending topics, expert discussions, signals"],
          ["Reddit", "Community", "Reddit API (PRAW)", "Posts, comments from relevant subreddits"],
          ["arXiv", "Academic", "arXiv API", "Latest CS, AI, Finance, Math papers"],
          ["PubMed", "Academic", "PubMed E-utilities API", "Medical, biology, science papers"],
          ["LinkedIn", "Professional", "Scraped (ScraperAPI)", "Professional articles, company updates"],
          ["PDFs (any)", "Documents", "PyMuPDF + M7 extraction", "Text, tables, diagrams from any PDF"],
          ["Crypto APIs", "Financial", "Binance, CoinGecko, CoinMarketCap", "Live prices, OHLCV, market cap data"],
          ["Stock APIs", "Financial", "Yahoo Finance, Alpha Vantage, Polygon.io", "Stock prices, earnings, financials"],
          ["News APIs", "News", "NewsAPI, CryptoPanic, Reuters RSS", "Breaking news, market news, headlines"],
          ["HuggingFace Datasets", "ML Data", "HuggingFace Hub API", "Pre-labeled ML datasets for any domain"],
        ],
        [1500, 1000, 2500, 4360]
      ),

      ...sp(1),
      h2("9.2  Deep Search Strategy"),
      bullet("M10 uses a topic graph: a map of all topics relevant to each domain model"),
      bullet("For Coding Model: topics include Python, JavaScript, algorithms, system design, debugging, etc."),
      bullet("For Trading Model: crypto, technical analysis, candlestick patterns, DeFi, macroeconomics, etc."),
      bullet("Every 6 hours: M10 picks 50 topics from the graph and deep-searches each"),
      bullet("Deep search = Google top 20 results + follow each link + extract full page content"),
      bullet("Deduplication: content fingerprinted with SHA-256, duplicates discarded"),
      bullet("Quality filter: all crawled content passes L10 (Quality) and L11 (Alignment) before storage"),
      bullet("Volume: M10 targets ingesting 10,000-50,000 new training examples per day per model"),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 10 — ADMIN PANEL
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 10 — Admin Panel (Full Design)"),

      p("The Admin Panel is the control center. Admins use it to manage training, test models, approve launches, and monitor the whole system. It is isolated from the public frontend — accessible only to admins."),

      h2("10.1  Admin Panel Sections"),
      dataTable(
        ["Section", "URL", "What Admin Can Do"],
        [
          ["Dashboard", "/admin/dashboard", "Overview: active models, training status, system health, recent activity"],
          ["Model Manager", "/admin/models", "See all models and versions. Start training. Stop training. View metrics."],
          ["Training Studio", "/admin/training", "Configure training: pick domain, data sources, base model, hyperparameters"],
          ["Data Sources", "/admin/data-sources", "Add/remove crawl sources. Set crawl frequency. View ingestion stats."],
          ["Test Sandbox", "/admin/sandbox", "Test any model version before publishing. Run benchmark queries. See scores."],
          ["Publish Control", "/admin/publish", "Approve model for public use. Schedule rollout. Set user access tiers."],
          ["Layer Monitor", "/admin/layers", "See layer pass/fail rates per model. Debug which layer catches most issues."],
          ["User Manager", "/admin/users", "Manage user accounts, roles, access levels"],
          ["API Key Manager", "/admin/api-keys", "Add/update all LLM API keys (Gemini, OpenAI, MiniMax, Groq, etc.)"],
          ["Logs Viewer", "/admin/logs", "Full system logs, training logs, error logs. Filterable, searchable."],
          ["Backup Manager", "/admin/backups", "Schedule and run backups of models, data, database"],
        ],
        [2000, 2200, 5160]
      ),

      ...sp(1),
      h2("10.2  Training Workflow in Admin Panel"),
      numbered("Admin goes to Training Studio"),
      numbered("Selects domain: Coding / Trading / Image / Custom"),
      numbered("Configures data sources: select from connected APIs, upload PDFs, add GitHub repos"),
      numbered("Selects base model: Gemma-3-27b / GPT-4o fine-tune / custom"),
      numbered("Sets training parameters: epochs, batch size, learning rate, validation split"),
      numbered("Clicks START TRAINING"),
      numbered("Real-time progress visible: current step, loss curve, estimated completion time"),
      numbered("When training completes: model automatically appears in Test Sandbox"),
      numbered("Admin runs manual tests in sandbox: types queries, sees model responses"),
      numbered("Admin reviews automated benchmark scores: accuracy, perplexity, pass@k"),
      numbered("Admin clicks APPROVE — model goes live to public frontend"),
      numbered("Admin can ROLLBACK to previous version at any time with one click"),

      ...sp(1),
      h2("10.3  Test Sandbox — Design"),
      p("The Test Sandbox is a fully isolated environment that mirrors the public frontend but is admin-only:"),
      bullet("Left panel: query input. Right panel: model response"),
      bullet("Model selector: choose which version to test (v1.0, v1.1, etc.)"),
      bullet("Layer inspector: see which layers the response passed through and any modifications made"),
      bullet("Compare mode: run same query on two different model versions side by side"),
      bullet("Benchmark runner: run 100 pre-defined test queries and see aggregate scores"),
      bullet("Export results: download test results as PDF for documentation"),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 11 — USER FRONTEND
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 11 — User-Facing Frontend"),

      h2("11.1  New User-Facing Features in v4.0"),
      bullet("Model Picker: users can choose which specialized model to use (Coding Model v1.2, Trading Model v1.0, etc.)"),
      bullet("Response Format Picker: text, code block, PDF download, structured JSON"),
      bullet("Voice Input: speak your query, get voice response"),
      bullet("Layer Transparency toggle: user can see which layers processed their response"),
      bullet("Model Version History: see when model was last updated, what changed"),
      bullet("Feedback button on every response: thumbs up/down feeds back into training loop"),

      ...sp(1),
      h2("11.2  Frontend Components to Build/Modify"),
      dataTable(
        ["Component", "File", "Change Type", "Description"],
        [
          ["ModelPicker", "frontend/src/components/ModelPicker.jsx", "NEW", "Dropdown to select Coding/Trading/etc. + version"],
          ["OutputFormatPicker", "frontend/src/components/FormatPicker.jsx", "NEW", "Select: text, code, PDF, JSON output"],
          ["LayerInspector", "frontend/src/components/LayerInspector.jsx", "NEW", "Expandable panel showing layer processing results"],
          ["VoiceInterface", "frontend/src/pages/Voice.jsx", "MODIFY", "Add MiniMax TTS for voice output of model responses"],
          ["Chat", "frontend/src/pages/Chat.jsx", "MODIFY", "Add model picker, format picker, feedback buttons"],
          ["Dashboard", "frontend/src/pages/Dashboard.jsx", "MODIFY", "Show available trained model versions and their stats"],
          ["ModelCard", "frontend/src/components/ModelCard.jsx", "NEW", "Card showing model name, version, accuracy, last updated"],
        ],
        [2000, 3000, 900, 3460]
      ),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 12 — VOICE
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 12 — Voice Integration"),

      p("Voice is a first-class interface in v4.0. Every module and model supports voice input and voice output."),

      dataTable(
        ["Feature", "Technology", "Where Used"],
        [
          ["Voice Input (Speech to Text)", "Whisper API (OpenAI) / Gemini Speech API", "Main chat, Trading Model queries, Coding voice commands"],
          ["Voice Output (Text to Speech)", "MiniMax TTS API / ElevenLabs / Google TTS", "Response readout, trading signal announcements, code explanations"],
          ["Wake Word", "Picovoice Porcupine / Web Speech API", "Hands-free activation: say 'Hey Genesis' to activate"],
          ["Voice Mode", "Full conversation loop", "Continuous back-and-forth voice conversation — no typing needed"],
          ["Voice + Code", "Special handling", "Code is NOT read aloud — explained in natural language, shown on screen"],
        ],
        [2000, 3000, 4360]
      ),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 13 — VERSION CONTROL
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 13 — Version Control & Model Rollout"),

      p("Every trained model follows semantic versioning exactly like software releases. This mirrors how Anthropic releases Claude 3.5, 4.0, 4.5, etc."),

      h2("13.1  Version Numbering"),
      dataTable(
        ["Version Format", "Meaning", "Example"],
        [
          ["v1.0", "First stable release of this domain model", "CodingModel-v1.0 — first trained, approved, published version"],
          ["v1.1", "Minor improvement: better accuracy, more training data, bug fixes", "CodingModel-v1.1 — 15% better Python code quality"],
          ["v1.2, v1.3...", "Incremental updates: new data sources, fine-tuning tweaks", "CodingModel-v1.2 — added TypeScript training data"],
          ["v2.0", "Major upgrade: new architecture, new capabilities, large data expansion", "CodingModel-v2.0 — added self-fixing loop, 10x more training data"],
        ],
        [1800, 3500, 4060]
      ),

      ...sp(1),
      h2("13.2  Rollout Process"),
      numbered("Model trained and passes all benchmarks"),
      numbered("Admin approves in Admin Panel"),
      numbered("v1.0 becomes available in public frontend — visible in ModelPicker"),
      numbered("Previous version (if any) remains available as 'v{prev} (legacy)'"),
      numbered("Users can pin their preferred version or always use latest"),
      numbered("When v1.1 is ready: admin can do staged rollout — 10% of users first, then 100%"),
      numbered("If v1.1 causes regressions: one-click rollback to v1.0 from Admin Panel"),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 14 — DATABASE
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 14 — Database & Storage Architecture"),

      dataTable(
        ["Store", "Technology", "Stores"],
        [
          ["Primary DB", "MongoDB (existing)", "Users, conversations, training configs, model metadata, module states"],
          ["Vector DB", "ChromaDB (existing)", "Embeddings for semantic search, training data similarity, knowledge graph"],
          ["Object Storage", "AWS S3 / Google Cloud Storage", "Raw training data files, model checkpoints, PDF documents, audio/video"],
          ["Cache", "Redis (add)", "Session data, rate limits, LLM response cache, feature flags"],
          ["Training Data", "Filesystem + S3", "data/raw/{model}/, data/processed/{model}/, data/embeddings/"],
          ["Model Checkpoints", "Filesystem + S3", "models/{domain_model}/v{version}/checkpoints/"],
          ["Logs", "MongoDB + files", "Training logs, layer logs, error logs, audit trails"],
          ["Search Index", "Elasticsearch (optional)", "Full-text search over all ingested documents"],
        ],
        [2000, 2500, 4860]
      ),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 15 — SECURITY, TESTING, DEPLOYMENT
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 15 — Security, Testing & Deployment"),

      h2("15.1  Security Requirements"),
      bullet("All LLM API keys stored in environment variables only — never in code or database"),
      bullet("Admin Panel behind separate authentication — JWT with short expiry + refresh tokens"),
      bullet("Model sandbox is fully isolated — cannot affect production system"),
      bullet("All training data passes L07 (Security) and L08 (Compliance) before storage"),
      bullet("Rate limiting on all public endpoints — Redis-backed rate limiter"),
      bullet("Field encryption for sensitive user data — existing field_encryption.py"),
      bullet("All API keys rotatable without system restart via Admin Panel"),

      ...sp(1),
      h2("15.2  Testing Requirements"),
      bullet("Unit tests for every new service (minimax_client, github_client, search_client, etc.)"),
      bullet("Integration tests for the full training pipeline (end-to-end with mock data)"),
      bullet("Load tests for inference endpoints (Locust — existing locustfile.py)"),
      bullet("Security tests for Admin Panel (existing tests/security/test_security.py — extend)"),
      bullet("Benchmark tests run automatically after every training run"),
      bullet("All layer tests (L01-L11) must pass on 100% of test cases before each release"),

      ...sp(1),
      h2("15.3  Deployment"),
      bullet("Primary: Railway (existing railway.toml) for API backend"),
      bullet("Frontend: Vercel (existing vercel.json)"),
      bullet("Training runs: RunPod / Google Colab / Lambda Labs (GPU required for fine-tuning)"),
      bullet("M10 Auto-Trainer: runs as separate Celery worker (existing celery_app.py — extend)"),
      bullet("Model serving: FastAPI endpoint wrapping HuggingFace model (or API proxy for GPT/Gemini fine-tunes)"),
      bullet("Docker: all services containerized, docker-compose.yml updated for new services"),

      divider(),

      // ══════════════════════════════════════════════════════════════════════
      // PART 16 — PHASE BUILD ORDER
      // ══════════════════════════════════════════════════════════════════════
      h1("PART 16 — Phase-by-Phase Build Order"),

      p("This is the exact order we will build everything. Each phase has a clear deliverable and must be tested before moving to the next."),
      ...sp(1),

      phaseBox("PHASE 0", "Foundation & Infrastructure (Do First)", C.primary),
      ...sp(1),
      bullet("Add Redis to docker-compose.yml for caching + rate limiting"),
      bullet("Add all new API keys to .env: GROQ_API_KEY, SERPER_API_KEY, GITHUB_TOKEN, YOUTUBE_API_KEY, TWITTER_BEARER_TOKEN, NEWSAPI_KEY"),
      bullet("Update config/settings.py with all new keys"),
      bullet("Add feature flags for all new features: FEATURE_CONSENSUS, FEATURE_AUTO_TRAIN, FEATURE_CODING_MODEL, FEATURE_TRADING_MODEL"),
      bullet("Delete root-level experimental_routes.py (confirmed duplicate)"),
      bullet("Add httpx and all new dependencies to requirements.txt"),
      ...sp(1),

      phaseBox("PHASE 1", "Multi-Model Router Upgrade", C.accent2),
      ...sp(1),
      bullet("Upgrade core/model_router.py: add Groq, OpenAI, Gemini routing"),
      bullet("Create services/groq_client.py — async Groq client"),
      bullet("Create services/gemini_client.py — async Gemini client"),
      bullet("Upgrade services/minimax_client.py — already created, enhance with streaming"),
      bullet("Create core/consensus_engine.py — multi-model response combiner"),
      bullet("Unit tests for all clients"),
      ...sp(1),

      phaseBox("PHASE 2", "Deep Search & Data Ingestion Services", C.accent2),
      ...sp(1),
      bullet("Create services/search_client.py — Google Custom Search + Serper.dev"),
      bullet("Create services/github_client.py — GitHub REST API"),
      bullet("Create services/youtube_client.py — YouTube API + transcript extraction"),
      bullet("Create services/twitter_client.py — Twitter API v2"),
      bullet("Create services/news_client.py — NewsAPI + RSS feeds"),
      bullet("Create services/crypto_client.py — Binance + CoinGecko + Alpha Vantage"),
      bullet("Integration tests for all data clients"),
      ...sp(1),

      phaseBox("PHASE 3", "M10 Auto-Training Module", C.accent2),
      ...sp(1),
      bullet("Create modules/m10_auto_trainer/ directory and all files"),
      bullet("crawler.py: multi-source parallel crawler using all services from Phase 2"),
      bullet("data_pipeline.py: raw data -> cleaned training pairs"),
      bullet("scheduler.py: Celery beat schedule for auto-crawl every 6 hours"),
      bullet("training_trigger.py: triggers fine-tuning when data threshold reached"),
      bullet("Wire M10 into api/main.py lifespan startup"),
      ...sp(1),

      phaseBox("PHASE 4", "Domain Model Engine & Training Pipeline", C.accent2),
      ...sp(1),
      bullet("Create core/domain_model_engine.py — orchestrates all 9 modules for training"),
      bullet("Create core/self_fix_loop.py — self-fixing code generation loop"),
      bullet("Create training/ directory with Coding Model configs"),
      bullet("Create training/coding_model/dataset_builder.py"),
      bullet("Create training/coding_model/trainer.py (HuggingFace Trainer)"),
      bullet("Create training/coding_model/evaluator.py"),
      bullet("End-to-end training pipeline test with small mock dataset"),
      ...sp(1),

      phaseBox("PHASE 5", "Admin Panel — Backend", C.accent2),
      ...sp(1),
      bullet("Extend api/v1/admin_routes.py with new endpoints: model management, training control, data sources, sandbox, publish"),
      bullet("Create admin/backend/training_controller.py — start/stop/monitor training"),
      bullet("Create admin/backend/sandbox_manager.py — test model in isolation"),
      bullet("Create admin/backend/publish_manager.py — approve and deploy model versions"),
      bullet("Create admin/backend/data_source_manager.py — manage M10 sources"),
      bullet("API tests for all new admin endpoints"),
      ...sp(1),

      phaseBox("PHASE 6", "Admin Panel — Frontend", C.accent2),
      ...sp(1),
      bullet("Upgrade admin/frontend/src/AdminApp.jsx with new navigation sections"),
      bullet("Create TrainingStudio.jsx — full training configuration UI"),
      bullet("Create TestSandbox.jsx — query testing and benchmark UI"),
      bullet("Create PublishControl.jsx — model approval and staged rollout UI"),
      bullet("Create DataSources.jsx — M10 source configuration UI"),
      bullet("Create ModelVersionHistory.jsx — version comparison and rollback UI"),
      bullet("Upgrade ModelMonitor.jsx — add real-time training progress charts"),
      ...sp(1),

      phaseBox("PHASE 7", "User Frontend Upgrades", C.accent2),
      ...sp(1),
      bullet("Create ModelPicker.jsx component"),
      bullet("Create OutputFormatPicker.jsx component"),
      bullet("Create LayerInspector.jsx component"),
      bullet("Create ModelCard.jsx component"),
      bullet("Modify Chat.jsx — add model picker, format picker, feedback buttons"),
      bullet("Modify Dashboard.jsx — add available trained models section"),
      bullet("Add feedback loop: thumbs up/down -> stored in DB -> fed to training"),
      ...sp(1),

      phaseBox("PHASE 8", "Voice Upgrade", C.accent2),
      ...sp(1),
      bullet("Add OpenAI Whisper API to services/voice_service.py for speech-to-text"),
      bullet("Add MiniMax TTS to services/voice_service.py for text-to-speech"),
      bullet("Wire voice into Chat.jsx — voice input button, voice output toggle"),
      bullet("Add wake word detection (Web Speech API in browser)"),
      bullet("Test full voice loop: speak query -> process -> speak response"),
      ...sp(1),

      phaseBox("PHASE 9", "Coding Model v1.0 — Full Training Run", C.accent2),
      ...sp(1),
      bullet("Trigger first real training run using M10 + all 9 modules"),
      bullet("Target dataset size: 100,000 high-quality coding training pairs"),
      bullet("Run training (GPU required — RunPod or Colab)"),
      bullet("Evaluate in Admin Panel test sandbox"),
      bullet("Admin approves — Coding Model v1.0 goes live"),
      bullet("Users can now select Coding Model v1.0 in ModelPicker"),
      ...sp(1),

      phaseBox("PHASE 10", "Trading Model v1.0 — Full Training Run", C.accent2),
      ...sp(1),
      bullet("Configure Trading Model data sources in M10"),
      bullet("Crawl: Binance historical data, crypto news, Twitter finance discussions, YouTube trading tutorials"),
      bullet("Run training pipeline: all 9 modules + all 11 layers"),
      bullet("Evaluate in Admin Panel test sandbox"),
      bullet("Admin approves — Trading Model v1.0 goes live"),
      ...sp(1),

      phaseBox("PHASE 11", "Continuous Improvement Loop", C.green),
      ...sp(1),
      bullet("M10 running 24/7 — continuously ingesting new data"),
      bullet("Every week: check if enough new data for v1.1 training run"),
      bullet("Training run triggered automatically when threshold reached"),
      bullet("Model evaluated automatically against benchmarks"),
      bullet("If improvement confirmed: admin notified for approval"),
      bullet("Staged rollout to 10% users first, then 100%"),
      bullet("System runs, learns, improves — forever"),

      divider(),

      // ── SUMMARY TABLE ──────────────────────────────────────────────────────
      h1("Summary — New Files & Changes"),

      dataTable(
        ["Area", "New Files", "Modified Files"],
        [
          ["LLM Clients", "groq_client.py, gemini_client.py (enhanced minimax_client.py)", "model_router.py"],
          ["Data Services", "search_client.py, github_client.py, youtube_client.py, twitter_client.py, news_client.py, crypto_client.py", "—"],
          ["M10 Module", "modules/m10_auto_trainer/__init__.py, crawler.py, data_pipeline.py, scheduler.py, training_trigger.py", "tasks/celery_app.py, api/main.py"],
          ["Training Engine", "core/domain_model_engine.py, core/self_fix_loop.py, core/consensus_engine.py, training/coding_model/*, training/trading_model/*", "reasoning_pipeline.py"],
          ["Admin Backend", "admin/backend/training_controller.py, sandbox_manager.py, publish_manager.py, data_source_manager.py", "admin_routes.py, admin_api.py"],
          ["Admin Frontend", "TrainingStudio.jsx, TestSandbox.jsx, PublishControl.jsx, DataSources.jsx, ModelVersionHistory.jsx", "AdminApp.jsx, ModelMonitor.jsx"],
          ["User Frontend", "ModelPicker.jsx, FormatPicker.jsx, LayerInspector.jsx, ModelCard.jsx", "Chat.jsx, Dashboard.jsx, Voice.jsx"],
          ["Config", "training/coding_model/config.yaml, training/trading_model/config.yaml", ".env, settings.py, feature_flags.py"],
          ["Database", "—", "models_mongo.py (add TrainedModel, ModelVersion, TrainingRun documents)"],
          ["Infrastructure", "—", "docker-compose.yml (add Redis), requirements.txt (add httpx, transformers, datasets, peft)"],
        ],
        [1500, 4000, 3860]
      ),

      ...sp(2),

      new Table({
        width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
        rows: [new TableRow({ children: [new TableCell({
          borders: noBorders,
          shading: { fill: C.primary, type: ShadingType.CLEAR },
          margins: { top: 300, bottom: 300, left: 400, right: 400 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "GENESIS v4.0", font: "Arial", size: 48, bold: true, color: C.accent })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Plan Complete. Ready to Build.", font: "Arial", size: 28, bold: true, color: C.white })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "16 Parts  |  11 Phases  |  70+ New Files  |  Infinite Improvement Loop", font: "Arial", size: 20, color: C.gold })] }),
          ]
        })}])}]
      }),

    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/mnt/user-data/outputs/GENESIS_v4_MASTER_PLAN.docx", buffer);
  console.log("Done");
});
