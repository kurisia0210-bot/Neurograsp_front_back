NeuroGrasp
Agent-Driven Serious Game Platform for Training Daily Living Skills (ADL)

NeuroGrasp is an open-source research project that explores how agent architectures and serious games can support training of Activities of Daily Living (ADL) for individuals with autism.

The system combines:

🎮 Embodied game environments (kitchen tasks)

🤖 LLM-powered explanation agents

📊 Structured behavioral metrics

📄 Automatically generated caregiver reports

to create a closed loop:

Game Interaction
      ↓
Behavioral Metrics
      ↓
Agent Explanation & Feedback
      ↓
Caregiver / Therapist Report

The goal is to transform raw gameplay interaction data into interpretable clinical insights.

Why This Project Exists

Many individuals with autism struggle with daily living skills, such as:

preparing food

organizing objects

completing multi-step routines

Traditional therapy often lacks fine-grained behavioral metrics.

NeuroGrasp explores a new paradigm:

Use serious games as measurable training environments, and AI agents as interpretable assistants.

Key design principle:

LLMs do not control the game logic — they only provide explanations and reporting.

This ensures:

interpretability

safety

clinical usability

System Architecture

NeuroGrasp follows a three-layer architecture:

┌────────────────────┐
│  Game Environment  │
│  (Kitchen tasks)   │
└─────────┬──────────┘
          │ interaction logs
          ▼
┌────────────────────┐
│ Metrics & Data     │
│ (JSON event logs)  │
└─────────┬──────────┘
          │ structured metrics
          ▼
┌────────────────────┐
│ LLM Agent Layer    │
│ Explanation +      │
│ Report Generation  │
└────────────────────┘

The LLM is not responsible for gameplay control.

Instead it provides:

short explanations

structured session summaries

caregiver reports

Core Components
1. Serious Game Environment

The environment simulates daily kitchen tasks.

Example tasks:

Task	Skills Trained	Typical Errors
Cook noodles	sequencing, safety	wrong order
Make sandwich	object recognition	missing ingredient
Clean table	completion behavior	forgotten items

Each action generates structured interaction logs.

Example:

{
  "task": "cook_noodles",
  "step": "boil_water",
  "success": true,
  "assist_needed": 1,
  "duration_ms": 4500
}
Behavioral Metrics

The system computes clinically meaningful indicators:

Metric	Meaning
Independent Step Ratio	autonomy level
Average Step Duration	task execution efficiency
Prompt Frequency	dependence on guidance
Error Type Distribution	behavioral patterns

These metrics enable longitudinal progress tracking.

LLM Agent Roles

LLMs are used only for explanation and reporting.

Task Explanation Agent

Input:

current step

user action

error label

Output:

We are boiling water.
You clicked the pot correctly.
Next step: turn on the stove.

Constraints:

≤ 20 words

concrete vocabulary

child-friendly language

Report Generation Agent

Input:

Session metrics JSON.

Output:

Task: Cook noodles

Completion: 6/8 steps independently.
Prompts: 2
Total time: 3.5 minutes.

Strength:
Water boiling step improved by 20%.

Concern:
Frequent mistakes in step order.

Reports are designed for:

parents

therapists

clinicians

Agent Architecture

The agent system follows a structured reasoning pipeline:

Observation
     ↓
Reasoning
     ↓
Reflex Safety Layer
     ↓
Structured Action

Key features:

Reflex Layer
deterministic safety rules

Watchdog System
detects cognitive loops or idle states

Failure Memory
episodic memory of past mistakes

Semantic Rule Retrieval
vector database for contextual constraints

Technology Stack
Layer	Technology
Frontend	React + Three.js + R3F
Backend	Python FastAPI
Agent Framework	LangChain
Vector DB	ChromaDB
LLM Provider	OpenAI / Grok / compatible APIs
State Management	Zustand
Example Data Flow
Player action
      ↓
Game event log
      ↓
Metric computation
      ↓
LLM explanation
      ↓
Session report

Over multiple sessions:

Session history
      ↓
Trend analysis
      ↓
Personalized training adjustment
Research Direction

NeuroGrasp explores several research questions:

Can serious games generate clinically useful behavioral metrics?

Can LLMs provide interpretable explanations for therapy support?

How can agent architectures monitor and guide embodied interaction?

Future work includes:

eye-tracking integration

adaptive task difficulty

multi-agent coaching systems

Project Status

Current stage: prototype development

Completed:

agent reasoning pipeline

watchdog cognitive monitoring

failure memory system

two playable task environments

Planned:

more ADL scenarios

clinician evaluation

longitudinal training study

Roadmap
v0.1  Prototype architecture
v0.2  Expanded kitchen scenarios
v0.3  Metrics validation
v0.4  Clinical pilot study
Contributing

This project is in active research development.

Contributions are welcome in:

game mechanics

agent architecture

evaluation metrics

serious game design

Contact

Maintained by:

Kurisu

For questions or collaboration please open an issue.

License

MIT License

Acknowledgement

This project explores the intersection of:

AI agents

serious games

autism support technology

with the goal of making daily life training more measurable and accessible.
