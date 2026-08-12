const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "What is a stock (equity)?",
    options: [
      "A loan you make to a government",
      "A little piece of a company",
      "A guaranteed high-interest savings account",
      "A physical commodity like gold or oil"
    ],
    answer: 1,
    explanation: "A stock (equity) means you own a small share of a company, so your return depends on how that company performs."
  },
  {
    id: 2,
    question: "What is a bond?",
    options: [
      "A commodity",
      "Little piece of a company",
      "An IOU / loan made to a government or company",
      "A cryptocurrency token"
    ],
    answer: 2,
    explanation: "A bond is a loan from investors to a government or company, which pays fixed interest each year and then repays the original loan."
  },
  {
    id: 3,
    question: "Which of the following is considered a commodity?",
    options: [
      "Shares in Tesco",
      "UK Government gilts",
      "Crude oil and gold",
      "Cash in a bank account"
    ],
    answer: 2,
    explanation: "Commodities are raw materials like oil, metals, and agricultural products that are traded in global markets."
  },
  {
    id: 4,
    question: "Why do investors buy bonds?",
    options: [
      "For fixed income and lower overall risk",
      "To guarantee 50% yearly returns",
      "To obtain voting rights in corporate decisions",
      "To avoid paying any taxes"
    ],
    answer: 0,
    explanation: "Many investors use bonds for steadier income and to reduce portfolio volatility compared with equities."
  },
  {
    id: 5,
    question: "How do stocks generally compare to cash over the long-term?",
    options: [
      "Cash is likely to outperform stocks",
      "Stocks offer higher growth potential with higher price volatility",
      "Stocks are less risky than cash",
      "Cash loses all value immediately"
    ],
    answer: 1,
    explanation: "Stocks usually have higher long-term growth potential than cash, but they also have larger short-term price swings."
  },
  {
    id: 6,
    question: "Which of these is considered most risky?",
    options: [
      "Cash in savings account",
      "Corporate bond",
      "Government bond",
      "Cash in current account"
    ],
    answer: 1,
    explanation: "Corporate bonds are higher risk because companies are more likely to go bust than a Government."
  },
  {
    id: 7,
    question: "Which of these generally cause bonds (specifically) to fall in value?",
    options: [
      "Interest rates rise",
      "Inflation falls",
      "Recession",
      "Interest rates fall"
    ],
    answer: 0,
    explanation: "When interest rates rise, existing bonds with lower interest become less attractive, so their market prices usually fall."
  },
  {
    id: 8,
    question: "Which of these would you expect to perform worst when interest rates rise?",
    options: [
      "3-year corporate bond",
      "10-year corporate bond",
      "10-year Government bond",
      "20-year Government bond"
    ],
    answer: 3,
    explanation: "Longer-duration bonds are more sensitive to rate rises, so a 20-year Government bond is usually hit hardest."
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