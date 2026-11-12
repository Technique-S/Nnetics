# Ask Nnetics Agent Implementation Test

This document demonstrates how the enhanced Ask Nnetics agent works.

## Setup

1. The agent is accessible at `/api/agent` endpoint
2. It accepts POST requests with JSON body: `{ "message": "your natural language request" }`
3. It requires authentication via `nnetics_identity` cookie for live mode
4. For demo mode, it checks for `nnetics_demo_workspace` and `nnetics_demo_portal_owner` cookies

## Demo Mode Examples

Assuming demo cookies are present:

### 1. Create a Contractor
**Request:**
```json
{
  "message": "Create a contractor named John Doe"
}
```

**Expected Response:**
```json
{
  "reply": "I've created the contractor \"John Doe\" (ID: [uuid]). This contractor is now available in your demo workspace.",
  "actions": [
    {
      "action": { "kind": "create-contractor", "name": "John Doe" },
      "label": `View contractor "John Doe"`
    }
  ],
  "mode": "demo"
}
```

### 2. List Contractors
**Request:**
```json
{
  "message": "List my contractors"
}
```

**Expected Response (if contractors exist):**
```json
{
  "reply": "Your demo contractors are: John Doe, Jane Smith.",
  "actions": [
    {
      "action": { "kind": "list-contractors", "args": {} },
      "label": "Refresh contractor list"
    }
  ],
  "mode": "demo"
}
```

### 3. Check Vault Balance
**Request:**
```json
{
  "message": "What's my vault balance?"
}
```

**Expected Response:**
```json
{
  "reply": "Your demo vault has 100.0 NEAR available for spending.",
  "actions": [
    {
      "action": { "kind": "get-vault-available-balance", "args": {} },
      "label": "Refresh balance"
    }
  ],
  "mode": "demo"
}
```

### 4. Get Organization Overview
**Request:**
```json
{
  "message": "Give me an overview of my organization"
}
```

**Expected Response:**
```json
{
  "reply": "Demo Organization Overview:\n• Name: My Demo Org\n• Contractors: 2\n• Outstanding Amount: 50.0 NEAR\n• Available Funds: 100.0\n• Total Funded: 200.0\n• Total Spent: 50.0",
  "actions": [
    {
      "action": { "kind": "get-organization-overview", "args": {} },
      "label": "Refresh overview"
    }
  ],
  "mode": "demo"
}
```

## Live Mode Examples

When authenticated with valid `nnetics_identity` cookie:

### 1. Create a Contractor
**Request:**
```json
{
  "message": "Create a contractor named Alice Johnson"
}
```

**Expected Response (if live mode implemented):**
```json
{
  "reply": "I've created the contractor \"Alice Johnson\".",
  "actions": [],
  "mode": "live"
}
```

### 2. Check Vault Balance
**Request:**
```json
{
  "message": "How much NEAR is in my vault?"
}
```

**Expected Response (if live mode implemented):**
```json
{
  "reply": "Your vault has 150.5 NEAR available.",
  "actions": [],
  "mode": "live"
}
```

## Error Cases

### Invalid Request
**Request:**
```json
{
  "message": ""
}
```

**Response:**
```json
{
  "reply": "Please provide a message. For example: 'Create a contractor named John' or 'What's my vault balance?'",
  "actions": [],
  "mode": "error"
}
```

### Unsupported Request
**Request:**
```json
{
  "message": "Do something complicated that I haven't implemented yet"
}
```

**Response:**
```json
{
  "reply": "I'm not sure how to help with that. Try asking things like: 'Create a contractor named [name]', 'What's my vault balance?', or 'List my contractors'.",
  "actions": [],
  "mode": "demo" // or "live" depending on context
}
```

### Authentication Required (Live Mode)
**Request:** (without valid nnetics_identity cookie)
```json
{
  "message": "Create a contractor"
}
```

**Response:**
```json
{
  "reply": "Agent error: Authentication required",
  "actions": [],
  "mode": "error",
  "status": 401
}
```

## Implementation Notes

1. **Security**: The agent verifies request origin matches NNETICS_APP_ORIGIN
2. **Authentication**: Requires valid identity cookie for live mode
3. **Demo/Live Separation**: Demo mode uses demo services, live mode uses live services
4. **Extensibility**: New tools can be added by:
   - Adding definitions to agent-tools.ts
   - Implementing methods in agent-tool-executor.ts
   - Adding cases to the executeTool switch statement
   - Updating parseMessageToTool for natural language recognition
   - Updating formatToolResponse for custom response formatting
   - Updating createActionChips for custom action UI

## Next Steps for Enhancement

1. **Integrate LLM for Natural Language**: Replace keyword parsing with OpenRouter function calling
2. **Extract Session Tokens**: Get actual tokens from cookies instead of hardcoded values
3. **Complete Live Mode Implementation**: Connect to live backend services
4. **Enhanced Action Chips**: Provide more contextual action options
5. **Multi-step Reasoning**: Implement tool chaining for complex queries
6. **Progress Indicators**: Better UI feedback during long operations
7. **Cancellation Support**: Allow users to cancel long-running operations