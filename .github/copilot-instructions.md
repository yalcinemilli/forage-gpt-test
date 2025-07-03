# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a Next.js 15 application built with TypeScript, Tailwind CSS, and ESLint. The project uses the App Router and stores source files in the `src/` directory.

## Code Style Guidelines
- Use TypeScript for all new components and utilities
- Follow React best practices with hooks and functional components
- Use Tailwind CSS for styling with a mobile-first approach
- Implement server-side rendering and static generation where appropriate
- Use the App Router for routing and layouts

## Component Structure
- Place React components in `src/components/`
- Use the `src/app/` directory for pages and layouts
- Keep utility functions in `src/lib/` or `src/utils/`
- Store type definitions in appropriate `.types.ts` files

## Performance Considerations
- Optimize images using Next.js Image component
- Implement proper loading states and error boundaries
- Use React.memo and useMemo where beneficial
- Consider Server Components vs Client Components appropriately
