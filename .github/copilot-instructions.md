# FORÀGE GPT Copilot Instructions

<!-- AI-powered customer service application for FORÀGE Clothing with Zendesk integration -->

## Project Overview
This is a Next.js 15 application built with TypeScript, Tailwind CSS, and ESLint for FORÀGE Clothing. The project serves as an AI-powered customer service assistant integrated with Zendesk, featuring GPT-4o responses, webhook processing, and feedback collection.

**Core Technologies:**
- Next.js 15 with App Router and TypeScript
- OpenAI GPT-4o for customer service responses
- Zendesk ZAF (Zendesk App Framework) Client integration
- Supabase for PostgreSQL with vector similarity search
- Mailgun for automated email notifications
- Tailwind CSS for styling

## Architecture Patterns

### 1. Zendesk Integration Architecture
- **ZAF Client**: Uses Zendesk App Framework for secure ticket data access
- **Cross-Origin Communication**: PostMessage API for DOM manipulation fallbacks
- **Multiple Insertion Methods**: Composer API, DOM manipulation, and manual copy fallbacks
- **Security**: Works within Zendesk's sandboxed iframe environment

### 2. API Route Structure
All API routes are in `/src/app/api/` following Next.js 15 App Router conventions:
- `gpt/route.ts` - OpenAI completions with FORÀGE brand voice
- `webhook/route.ts` - Zendesk webhook handler for intent recognition
- `feedback/route.ts` - User feedback collection with Supabase
- `generate/route.ts` - Embedding-based response generation

### 3. Multi-Service Integration
- **OpenAI**: GPT completions and embeddings for semantic search
- **Supabase**: Logging, feedback storage, and vector similarity search
- **Mailgun**: Automated notifications for logistics team
- **Zendesk**: Ticket management and automatic commenting

## FORÀGE-Specific Conventions

### Brand Voice Guidelines
When working with customer service responses:
- Use warm, helpful tone matching FORÀGE's sustainable fashion brand
- Reference sustainability and eco-friendly practices when relevant
- Handle German customer inquiries with appropriate formality (Sie/Du)
- Include specific order management workflows for returns and address changes

### Intent Recognition Patterns
The webhook system recognizes these customer intents:
- **Stornierung** (Cancellation): Automatic logistics team notification
- **Adressänderung** (Address Change): Shipping modification workflow
- **Retoure** (Returns): Return process guidance
- Custom intents can be added to the webhook handler

### Data Flow Patterns
1. **Zendesk → Frontend**: ZAF Client loads ticket data securely
2. **Frontend → API**: Formatted conversation sent to GPT endpoint
3. **API → OpenAI**: FORÀGE-specific system prompt applied
4. **Response → Zendesk**: Multiple insertion methods ensure delivery
5. **Webhook → Processing**: Automated intent analysis and team notifications

## Code Style Guidelines

### TypeScript Patterns
- Use strict TypeScript with explicit interfaces for all API responses
- Define ZAF Client types explicitly to avoid 'any' usage
- Create custom types for FORÀGE business logic (tickets, intents, feedback)
- Use environment variable validation with fallbacks

### React Component Patterns
- Use "use client" directive for ZAF Client integration components
- Implement proper loading states for async operations
- Handle ZAF Client initialization with try-catch blocks
- Use callback patterns for parent-child communication (feedback editing)

### API Route Patterns
- Always validate request methods (POST, GET) at route entry
- Use consistent error handling with status codes and messages
- Implement proper CORS headers for Zendesk integration
- Add comprehensive logging for debugging webhook issues

## Integration Guidelines

### Zendesk ZAF Client
```typescript
// Always initialize ZAF client with error handling
const client = ZAFClient.init();
client.on('app.registered', () => {
  // Safe to make ZAF API calls
});
```

### OpenAI Integration
- Use GPT-4o model for customer service responses
- Apply FORÀGE system prompt in `/src/app/api/gpt/route.ts`
- Implement proper rate limiting and error handling
- Use embeddings for semantic search in knowledge base

### Supabase Operations
- Use vector similarity search for knowledge retrieval
- Implement proper error handling for database operations
- Log all customer interactions for analytics
- Store feedback with proper typing and validation

## Development Workflow

### Local Development
1. Set up environment variables (.env.local)
2. Run `npm run dev` with Turbopack
3. Test ZAF integration using Zendesk app development tools
4. Use Postman collections for API testing

### Zendesk App Deployment
1. Build production version: `npm run build`
2. Upload `public/zendesk-app.html` to Zendesk
3. Configure API endpoints in Zendesk app settings
4. Test in actual Zendesk environment

### Error Handling Patterns
- ZAF Client: Always check for client availability before API calls
- API Routes: Use consistent error response format
- Frontend: Implement fallback methods for critical operations
- Logging: Comprehensive console logging for debugging

## Security Considerations
- Environment variables for all API keys and secrets
- CORS configuration for Zendesk integration
- Input validation for all webhook and API endpoints
- Secure handling of customer data in compliance with privacy requirements

## Performance Optimization
- Use React.memo for expensive re-renders
- Implement proper loading states for API calls
- Optimize API route response times
- Use Supabase vector search for fast similarity matching

## Testing Guidelines
- Test ZAF Client integration in actual Zendesk environment
- Use Postman for comprehensive API testing
- Validate webhook functionality with real Zendesk webhooks
- Test cross-origin communication patterns thoroughly
