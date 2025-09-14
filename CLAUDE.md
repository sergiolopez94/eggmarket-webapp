# Claude Development Guidelines

## Database Management Rules

### Supabase Database Protection
- **NEVER use `supabase db reset` unless explicitly requested by user**
- **ALWAYS use `supabase db push` or `supabase migration up` to apply schema changes**
- **PRESERVE existing user-created data during all schema modifications**
- **Use proper migrations to maintain data integrity**

### Migration Best Practices
- Create migrations for all schema changes
- Test migrations on development data before applying
- Never delete user data without explicit permission
- Use `ALTER TABLE` commands instead of recreating tables

## General Development Rules

### Development Methodology
- Follow the PRD and phase-based approach defined in `.claude/settings.json`
- Prioritize easiest features first within each phase
- Start with Phase 1: Dashboard + Users + Carters (current focus)

### Code Quality
- Maintain existing code patterns and conventions
- Use TypeScript types consistently
- Follow the established UI component structure with ShadCN/ui
- Preserve existing authentication and authorization patterns

### Communication
- Update todo list to track progress on multi-step tasks
- Be concise in responses unless detail is requested
- Ask for clarification when user requirements are ambiguous

## Project Context
- Business management platform for egg market operations
- Tech stack: Next.js 15.5.3, Supabase, ShadCN/ui, Tailwind CSS
- Current focus: Carter (driver) management with document handling