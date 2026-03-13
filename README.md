# NeuroGrasp
```text
🚧 🚧 🚧  UNDER CONSTRUCTION  🚧 🚧 🚧

 _   _ _   _ ____  _____ ____     ____ ___  _   _ ____ _____ ____  _   _  ____ _____ ___ ___  _   _
| | | | \ | |  _ \| ____|  _ \   / ___/ _ \| \ | / ___|_   _|  _ \| | | |/ ___|_   _|_ _/ _ \| \ | |
| | | |  \| | | | |  _| | |_) | | |  | | | |  \| \___ \ | | | |_) | | | | |     | |  | | | | |  \| |
| |_| | |\  | |_| | |___|  _ <  | |__| |_| | |\  |___) || | |  _ <| |_| | |___  | |  | | |_| | |\  |
 \___/|_| \_|____/|_____|_| \_\  \____\___/|_| \_|____/ |_| |_| \_\\___/ \____| |_| |___\___/|_| \_|
```

**Agent-Driven Serious Game Platform for Training Daily Living Skills (ADL)**

NeuroGrasp is an open-source research project exploring how **AI agents and serious games** can help individuals with **autism** train **activities of daily living (ADL)** such as cooking, organizing, and task sequencing.

The system transforms **game interaction data** into **interpretable behavioral metrics and caregiver reports**.

---

## Project Vision

Many individuals with autism struggle with everyday tasks that require:

- multi-step planning
- object usage
- task completion

Traditional therapy lacks **fine-grained behavioral measurement**.

NeuroGrasp explores a new approach:

> Use **serious games as measurable training environments**  
> and **AI agents as interpretable assistants**.

The design emphasizes:

- **interpretability**
- **safety**
- **clinical usability**

---

## Core Idea

Player Interaction
 閳?
Game Event Logs
 閳?
Behavioral Metrics
 閳?
LLM Explanation Agent
 閳?
Caregiver / Therapist Report

LLMs **do not control gameplay logic**.  
They only provide **explanations and structured reports**.

---

## Example Training Tasks

| Task          | Skill Trained      | Typical Error      |
| ------------- | ------------------ | ------------------ |
| Cook noodles  | sequencing         | wrong order        |
| Make sandwich | object recognition | missing ingredient |
| Clean table   | completion         | forgotten steps    |

Each action generates structured logs:

```json
{
  "task": "cook_noodles",
  "step": "boil_water",
  "success": true,
  "assist_needed": 1,
  "duration_ms": 4500
}
```

| Metric                 | Meaning                |
| ---------------------- | ---------------------- |
| Independent Step Ratio | autonomy level         |
| Average Step Duration  | execution efficiency   |
| Prompt Frequency       | dependency on guidance |
| Error Distribution     | behavioral patterns    |



## Agent Architecture

The system uses a structured agent pipeline:

Observation
     閳?
Reasoning (LLM proposal)
     閳?
Reflex Layer (deterministic safety rules)
     閳?
Action



## Technology Stack

| Layer           | Technology             |
| --------------- | ---------------------- |
| Frontend        | React + Three.js + R3F |
| Backend         | Python FastAPI         |
| Agent Framework | LangChain              |
| Vector DB       | ChromaDB               |
| LLM             | OpenAI-compatible APIs |
| State           | Zustand                |



## Maintainer

Wang Junpeng

Independent developer and researcher exploring **agent architectures and serious games**.

------

## License

MIT


