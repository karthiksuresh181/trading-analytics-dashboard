# MT5 Analytics Dashboard

An advanced, gamified behavioral analytics platform for MetaTrader 5 (MT5) traders. This application parses standard MT5 HTML statement reports fully in the browser to instantly generate a sleek, interactive, and data-driven dashboard. Heavily inspired by modern premium design languages (such as xAI) and advanced trading journals like TradesViz, it is designed to help traders discover psychological triggers, eliminate trading errors, and optimize their edge.

---

## Key Features

The application operates entirely client-side, ensuring maximum privacy. Your trade reports are parsed and analyzed directly in your browser without any data being uploaded to external servers.

### 1. **Gamified Overview & Grading**
*   **Account Grade:** Automatically awards a letter grade (`S`, `A`, `B`, `C`, `F`) based on a combination of Win Rate, Profit Factor, and Expectancy.
*   **Consistency Score:** Tracks consistency in trade sizes, hold times, and results.
*   **Streak Indicators:** Visually represents consecutive winning and losing streaks to highlight behavioral momentum.
*   **Essential Metric Cards:** Win Rate, Profit Factor, Net Profit, Expectancy, Max Drawdown, and Total Trades, accompanied by detailed mini-insights.
*   **Secondary Metrics:** A breakdown of averages (Win vs. Loss ratio) and extremes (Largest Win/Loss trades).

### 2. **Advanced Behavioral Analytics**
*   **Hold Time Analysis:** Correlates trade duration (scalps, intraday, swing trades) with outcomes to see where your edge really lies.
*   **Expectancy Deep-Dive:** Measures the average profit/loss per trade in currency and R-multiple terms.
*   **Asset Breakdown:** Shows win rates and profit distributions across different trading instruments.
*   **Profit Leakage Detector:** Highlights potential money left on the table or losses that got out of hand (e.g., holding losers too long, cutting winners too early).
*   **AI Behavioral Insights:** Simulates cognitive-behavioral coaching insights to flag issues like FOMO, revenge trading, or over-leveraging based on statistical anomalies in the report.

### 3. **Interactive Visualizations (Charts)**
*   **Equity Curve:** Area chart showing cumulative balance/equity growth with high-contrast gradient styling.
*   **Hourly Distribution:** Bar chart displaying P&L and trade counts by hour of the day to discover your peak performance window.
*   **Day-of-Week Performance:** Visualizes which days are your most profitable.
*   **Asset Performance:** Asset-by-asset profit and loss breakdown.
*   **Win/Loss Ratio:** Pie chart displaying the distribution of winning vs. losing trades.

### 4. **Interactive Trade Journal Calendar**
*   **Calendar Heatmap:** A visual month-by-month grid mapping daily trading activity.
*   **P&L Micro-Grids:** Days are dynamically color-coded by daily net profit (vibrant green for wins, red for losses, muted gray for inactive days).
*   **Month Navigator:** Allows seamless browsing of historical monthly logs.

### 5. **Export & Report Features**
*   **Demo Mode:** Instantly load a pre-configured sample MT5 report (`ReportHistorytest.html`) to explore the platform features immediately.
*   **Text/Data Export:** Export analyzed statistics in text format for quick copying to external logs.

---

## Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Vite + React 19** | Core application framework and build system. |
| **TypeScript** | Static typing and interface structure. |
| **Tailwind CSS v4** | Modern CSS setup, utilizing a custom premium dark system (inspired by xAI: `#0a0a0a` canvas, `#141618` card surfaces, and vibrant orange and dusk violet accents). |
| **Recharts** | Fully responsive, high-performance interactive charting. |
| **Lucide React** | Sleek, clean vector iconography. |

---

## Project Structure

```
trading-analysis-dashboard/
├── public/
│   └── ReportHistorytest.html    # Sample MT5 report for Demo mode
├── src/
│   ├── components/
│   │   ├── FileUploader.jsx       # Drag-and-drop parser interface
│   │   ├── GamifiedOverview.jsx   # Grading, metrics cards, streaks
│   │   ├── AdvancedAnalytics.jsx  # Hold times, leakage, AI recommendations
│   │   ├── InteractiveCharts.jsx  # Equity, hourly, asset, and daily graphs
│   │   └── JournalCalendar.jsx    # Monthly heatmap calendar journal
│   ├── utils/
│   │   └── mt5Engine.js           # Core parser engine (HTML table scraping & metrics)
│   ├── App.jsx                    # Core layout, state router & navigation
│   ├── index.css                  # Custom design tokens, typography, and styles
│   ├── main.jsx                   # Application entrypoint
│   └── assets/                    # Static assets & styles
├── vite.config.ts                 # Vite bundler configuration
├── package.json                   # Project dependencies and scripts
└── tsconfig.json                  # TypeScript compiler settings
```

---

## Design System

The application is styled with a custom dark-mode design system:
*   **Canvas Backplate:** `#0a0a0a` (pure near-black)
*   **Card Container:** `#141618` (subtle slate dark gray) with a thin border (`#212327`)
*   **Typography:** Google Inter (sans-serif) for body and displays, paired with monospace fonts for metrics, values, and status tags to give a precise, terminal-like feel.
*   **Accents:** 
    *   Primary Accent: xAI Sunset Orange (`#ff7a17` / `#ffc285` gradient)
    *   Secondary Accent: Dusk Violet (`#7c3aed` / `#c4b5fd` gradient)
*   **Interactive Elements:** Hover states utilize smooth transitions, scale shifts, and high-contrast pill outline highlights.

---

## Getting Started

### Prerequisites

You will need [Node.js](https://nodejs.org/) installed (v18+ recommended) along with `npm` (or `yarn`/`pnpm`).

### Installation

1. Clone or copy the project files to your directory.
2. Open a terminal in the root directory and install dependencies:
   ```bash
   npm install
   ```

### Development Mode

Run the local development server:
```bash
npm run dev
```
By default, the application will run at `http://localhost:5173`.

### Production Build

To build the project for production:
```bash
npm run build
```
This will compile the TypeScript, compile Tailwind, and bundle assets into the `dist/` directory.

### Preview Build

To preview the production build locally:
```bash
npm run preview
```

---

## How to Parse Your Own MT5 Reports

1. Open your **MetaTrader 5 Desktop Terminal**.
2. Go to the **History** tab in the toolbox (bottom).
3. Right-click in the history list, select **Report**, and click **HTML** to save the report to your machine.
4. Open the MT5 Analytics Dashboard application.
5. Drag and drop the saved `.html`/`.htm` file into the upload box (or click to select the file).
6. The dashboard will instantly process all trades, positions, and history, updating all tabs with your live statistics.
