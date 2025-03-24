# Steam Boiler Simulation - Developer Guide

## Commands
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm lint` - Run ESLint
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test -- -t "test name"` - Run specific test

## Code Style Guidelines
- **TypeScript**: Strict mode enabled, no `any` types allowed
- **Components**: Use functional components with hooks
- **State Management**: Use React Context API (context, provider, logic in separate files)
- **File Structure**:
  - Context-related files in `/context` directory
  - Calculation logic in `/utils` directory
- **Exports**: Use default exports where possible
- **Types**: Use type aliases instead of interfaces
- **Formatting**: Prettier enforced via ESLint
- **Error Handling**: Use try/catch for async operations
- **No unused variables or parameters** (enforced by tsconfig)

## Simulation Rules
- Temperature in Celsius, pressure in bar, energy in kJ
- Display values rounded to 1 decimal place
- Water volume expansion with temperature change
- Natural cooling at 1°C per 15 seconds without gas flow
- Gas conversion efficiency: 85%