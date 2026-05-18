# TheWheel

Trading dashboard to simplify utilizing of "The Wheel" strategy. 


## Features

- **Portfolio Management**: View and track positions from your Interactive Brokers account
- **Options Analysis**: Real-time options chain data and expiration calendars via Tradier API
- **Market Data**: Live market prices and charts
- **Risk Management**: Monitor unrealized/realized P&L and position sizing
- **Responsive UI**: Clean, modern interface built with React and TypeScript

## Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **AG-Grid** - Data grid component for position tables
- **AG-Charts** - Chart visualizations
- **Lightweight-Charts** - Advanced charting capabilities

### Backend
- **Express.js** - REST API server
- **Interactive Brokers API** (`@stoqey/ibkr`) - Portfolio and account data
- **Tradier API** - Options chain and market data

### Development
- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking

## Project Structure

```
thewheel/
├── src/                          # Frontend React application
│   ├── components/
│   │   ├── controls/            # Control panels and refresh buttons
│   │   ├── feedback/            # Loading and error states
│   │   ├── layout/              # Header and sidebar
│   │   ├── options/             # Options chain and equity charts
│   │   └── portfolio/           # Main portfolio page and watchlist
│   ├── hooks/                   # Custom React hooks
│   │   ├── usePositions.ts      # Fetch portfolio positions
│   │   ├── useOptionsData.ts    # Fetch options data
│   │   └── useWatchlist.ts      # Manage watchlist
│   ├── api/                     # API client functions
│   └── types/                   # TypeScript type definitions
├── server/                       # Express backend
│   ├── index.ts                 # Main server file
│   ├── tradier.ts               # Tradier API integration
│   ├── options.ts               # Options data handling
│   └── types/
│       └── ibkr.d.ts            # Interactive Brokers type definitions
├── package.json                 # Frontend dependencies
├── vite.config.ts              # Vite configuration
└── tsconfig.json               # TypeScript configuration
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Interactive Brokers account
- Tradier API credentials

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd thewheel
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   # Interactive Brokers
   IBKR_ACCOUNT_ID=<your-account-id>
   
   # Tradier API
   TRADIER_API_KEY=<your-tradier-api-key>
   TRADIER_ACCOUNT_ID=<your-tradier-account-id>
   
   # Server
   PORT=3001
   ```

### Development

Run the development environment with both frontend and backend:

```bash
# Terminal 1 - Start the backend server
npm run server

# Terminal 2 - Start the Vite dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`
The backend will be running at `http://localhost:3001`

### Build & Deploy

```bash
# Build the frontend
npm run build

# Build TypeScript
npm run typecheck

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run server` | Start Express backend server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type check frontend and backend |

## API Endpoints

### Backend API (served on port 3001)

The backend provides endpoints for:
- `/api/positions` - Get portfolio positions
- `/api/options/*` - Options chain data
- `/api/market/*` - Market data and quotes

All API responses include cache control headers to ensure fresh data.

## Configuration

### Vite Configuration
See `vite.config.ts` for build and dev server settings.

### TypeScript Configuration
- Frontend: `tsconfig.json`
- Backend: `server/tsconfig.json`

### ESLint Configuration
See `eslint.config.js` for linting rules.

## Common Tasks

### Fetching Portfolio Data
The `usePositions` hook automatically fetches portfolio data and handles loading/error states:
```tsx
const { positions, loading, error } = usePositions();
```

### Working with Options Data
Use the `useOptionsData` hook to fetch options chain information for a selected symbol.

### Adding New Features
1. Create components in `src/components/`
2. Add API functions in `src/api/`
3. Create custom hooks in `src/hooks/` for data fetching
4. Update TypeScript types in `src/types/`

## Troubleshooting

### Backend Connection Issues
- Ensure the backend server is running on port 3001
- Check that environment variables are properly set
- Verify Interactive Brokers and Tradier API credentials

### Type Errors
Run `npm run typecheck` to validate TypeScript types across the project.

### Build Issues
Clear the cache and rebuild:
```bash
rm -rf dist node_modules
npm install
npm run build
```

## Contributing

1. Follow the existing code structure and naming conventions
2. Run ESLint before committing: `npm run lint`
3. Ensure type safety: `npm run typecheck`
4. Test in development mode: `npm run dev`

## License

See LICENSE file for details.

## Support

For issues or questions, please check the documentation or create an issue in the repository.