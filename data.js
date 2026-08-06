const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "What is a Stock (Equity)?",
    options: [
      "A loan you make to a government",
      "A share of ownership in a company",
      "A guaranteed high-interest savings account",
      "A physical commodity like gold or oil"
    ],
    answer: 1
  },
  {
    id: 2,
    question: "What is a Bond?",
    options: [
      "A contract to purchase physical raw goods",
      "Ownership in a private startup company",
      "An IOU / loan made to a government or corporation",
      "A cryptocurrency token"
    ],
    answer: 2
  },
  {
    id: 3,
    question: "Which of the following is considered a Commodity?",
    options: [
      "Shares of Apple Inc.",
      "UK Government Gilts",
      "Crude Oil and Gold",
      "Cash in a bank account"
    ],
    answer: 2
  },
  {
    id: 4,
    question: "Why do investors buy Bonds?",
    options: [
      "For reliable regular interest income and lower volatility",
      "To guarantee 50% yearly returns",
      "To obtain voting rights in corporate decisions",
      "To avoid paying any taxes"
    ],
    answer: 0
  },
  {
    id: 5,
    question: "How do Stocks generally compare to Cash over long horizons?",
    options: [
      "Cash always outperforms stocks over 10 years",
      "Stocks offer higher growth potential with higher price volatility",
      "Stocks are completely risk-free",
      "Cash loses all value immediately"
    ],
    answer: 1
  },
  {
    id: 6,
    question: "What typically drives price changes in Commodities like Gold or Wheat?",
    options: [
      "Corporate dividends paid quarterly",
      "Global supply and demand dynamics and economic events",
      "Fixed interest rates set by central banks",
      "Stock market index splits"
    ],
    answer: 1
  },
  {
    id: 7,
    question: "What is diversification?",
    options: [
      "Putting all your funds into a single high-performing stock",
      "Keeping 100% of money under your mattress",
      "Spreading investments across different asset types to reduce risk",
      "Borrowing money to gamble on options"
    ],
    answer: 2
  },
  {
    id: 8,
    question: "If inflation is 4% and your Cash savings account earns 1%, what happens to your purchasing power?",
    options: [
      "Your purchasing power increases by 3%",
      "Your purchasing power decreases by 3%",
      "Your purchasing power stays exactly the same",
      "Your cash doubles"
    ],
    answer: 1
  }
];

// Returns extracted directly from the spreadsheet (Investing simulation.xlsx)
const YEAR_RETURNS = [
  { year: 1, cash: 0.02, bonds: 0.14, commodities: 0.26, equities: -0.15 },
  { year: 2, cash: 0.01, bonds: 0.15, commodities: 0.24, equities: 0.40 },
  { year: 3, cash: 0.01, bonds: 0.10, commodities: 0.09, equities: 0.19 },
  { year: 4, cash: 0.03, bonds: -0.05, commodities: 0.21, equities: 0.13 },
  { year: 5, cash: 0.05, bonds: 0.07, commodities: 0.02, equities: 0.26 },
  { year: 6, cash: 0.04, bonds: 0.09, commodities: 0.16, equities: 0.10 }
];