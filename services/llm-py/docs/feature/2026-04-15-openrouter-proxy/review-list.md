# OpenRouter + LangChain - Feature Testing Checklist

**Created**: 2026-04-15
**Task ID**: p2-6
**Architecture**: FastAPI "Gateway" + LangChain "Brain"

## Test Coverage

| Test Item | Type | Priority | Status |
|-----------|------|----------|--------|
| Dependency installation | Manual | High | Pending |
| LLMFactory initialization | Unit | High | Pending |
| ChatPromptTemplate creation | Unit | High | Pending |
| Chain composition (Prompt \| Model \| Parser) | Unit | High | Pending |
| Message format conversion | Unit | High | Pending |
| Streaming chat (astream) | Integration | High | Pending |
| Non-streaming chat (ainvoke) | Integration | High | Pending |
| NLP intent recognition | Integration | High | Pending |
| Error handling (missing config) | Integration | High | Pending |
| API documentation generation | Manual | Medium | Pending |
| Health check with LangChain status | Manual | Medium | Pending |
| Startup configuration warnings | Manual | Medium | Pending |
| langchain-openrouter fallback | Manual | Low | Pending |

## Feature Verification

### 1. LangChain Brain Layer (`app/core/llm_factory.py`)

- [ ] **LLMFactory initialization with config**
  - Expected: Creates factory with settings loaded
  - Method: `get_llm_factory()`

- [ ] **Model creation (ChatOpenRouter)**
  - Expected: Creates ChatOpenRouter instance
  - Required env: `DDO_OPENROUTER_API_KEY`, `DDO_LLM_MODEL`

- [ ] **Fallback model creation (ChatOpenAI)**
  - Expected: Falls back to ChatOpenAI if langchain-openrouter import fails
  - Method: `_create_chat_model()`

- [ ] **ChatPromptTemplate with system prompt**
  - Expected: Creates template with system + messages placeholder
  - Method: `create_chat_chain(system_prompt="You are helpful")`

- [ ] **ChatPromptTemplate without system prompt**
  - Expected: Creates template with only messages placeholder
  - Method: `create_chat_chain()`

- [ ] **Chain composition**
  - Expected: `prompt | chat_model | parser` produces Runnable
  - Format: Supports `|` operator

- [ ] **Message conversion**
  - Expected: API format `[{role, content}]` → LangChain Messages
  - Types: SystemMessage, HumanMessage, AIMessage

- [ ] **Non-streaming chat (ainvoke)**
  - Expected: Returns complete string response
  - Method: `await factory.chat(messages)`

- [ ] **Streaming chat (astream)**
  - Expected: Yields chunks asynchronously
  - Method: `async for chunk in factory.stream_chat(messages)`

- [ ] **RAG chain creation**
  - Expected: Creates chain with context variable
  - Method: `create_rag_chain()`

- [ ] **NLP intent chain creation**
  - Expected: Creates chain with JSON output
  - Method: `create_nlp_intent_chain()`

### 2. FastAPI Gateway Layer (`app/api/*.py`)

#### Chat API (`app/api/chat.py`)

- [ ] **ChatRequest validation**
  - Expected: Validates messages, model, stream, temperature
  - Temperature range: 0-2

- [ ] **Non-streaming endpoint**
  - Path: `POST /api/chat/completions`
  - Expected: Returns ChatResponse format

- [ ] **Streaming endpoint**
  - Path: `POST /api/chat/completions/stream`
  - Expected: Returns SSE with `data: {...}\n\n` format
  - End marker: `data: [DONE]\n\n`

- [ ] **Error mapping - missing model config**
  - Expected: HTTP 400 with error message
  - Condition: `DDO_LLM_MODEL` not set, model not in request

- [ ] **Error mapping - missing API key**
  - Expected: HTTP 401 with auth error
  - Condition: `DDO_OPENROUTER_API_KEY` not set

- [ ] **Error mapping - LLM error**
  - Expected: HTTP 502 for LangChain/OpenRouter errors

#### NLP API (`app/api/nlp.py`)

- [ ] **Intent analysis endpoint**
  - Path: `POST /api/nlp/`
  - Expected: Returns intent, parameters, reply

- [ ] **Command parsing endpoint**
  - Path: `POST /api/nlp/parse`
  - Expected: Matches command to available_commands

#### Models API (`app/api/models.py`)

- [ ] **List models**
  - Path: `GET /api/models/`
  - Expected: Returns cached or fresh model list

- [ ] **Refresh models**
  - Path: `POST /api/models/refresh`
  - Expected: Forces cache refresh

### 3. Configuration

- [ ] **DDO_OPENROUTER_API_KEY**
  - Required: Yes
  - Usage: Authenticate with OpenRouter

- [ ] **DDO_LLM_MODEL**
  - Required: Yes
  - Usage: Default model when not specified in request
  - Example values: `anthropic/claude-3.5-sonnet`, `gpt-4o`, `deepseek/deepseek-chat`

- [ ] **Startup warning for missing DDO_LLM_MODEL**
  - Expected: Log warning message about configuration

- [ ] **Startup info when configured**
  - Expected: Log message showing configured model

### 4. Health Check (`app/api/health.py`)

- [ ] **Health endpoint**
  - Path: `GET /health`
  - Expected: Returns service status, version, OpenRouter config status

- [ ] **OpenRouter configured check**
  - Field: `openrouter_configured`
  - Expected: true when `DDO_OPENROUTER_API_KEY` is set

- [ ] **OpenRouter connected check**
  - Field: `openrouter_connected`
  - Expected: Tests actual connectivity

### 5. API Documentation

- [ ] **Auto-generated docs**
  - Path: `/docs`
  - Tool: FastAPI + Swagger UI

- [ ] **Schemas visible**
  - Expected: ChatRequest, ChatResponse, NLPRequest, NLPResponse

- [ ] **Endpoint descriptions**
  - Expected: All endpoints have summary and description

## Regression Tests

- [ ] `/health` endpoint returns valid JSON
- [ ] `/ready` endpoint returns readiness status
- [ ] `/docs` loads without errors
- [ ] Unimplemented endpoints return 501

## Quick Test Commands

```bash
cd services/llm-py

# Install dependencies
pip install -r requirements.txt

# Set environment variables (Windows)
set DDO_OPENROUTER_API_KEY=sk-or-v1-xxx
set DDO_LLM_MODEL=anthropic/claude-3.5-sonnet

# Start server
python main.py

# Test health
curl http://localhost:8000/health

# Test models list
curl http://localhost:8000/api/models/

# Test chat (non-streaming)
curl -X POST http://localhost:8000/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"model":"anthropic/claude-3.5-sonnet"}'

# Test chat (streaming)
curl -N -X POST http://localhost:8000/api/chat/completions/stream \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Test NLP
curl -X POST http://localhost:8000/api/nlp/ \
  -H "Content-Type: application/json" \
  -d '{"text":"Set a timer for 5 minutes"}'

# View API docs
start http://localhost:8000/docs
```

## Verification Records

| Date | Tester | Result | Notes |
|------|--------|--------|-------|
| | | | |

## Known Issues

*None currently*
