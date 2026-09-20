// Post-16 version: questions are grouped into 3 taught sections of 4 questions each.
// Section 0: Investing basics / cash as an investment
// Section 1: Bonds
// Section 2: Equities & commodities
// Feel free to edit/replace any question, option, answer index (0-based) or explanation below.

const QUIZ_SECTIONS_POST16 = [
  {
    title: "Investing Basics & Cash",
    questions: [
      {
        question: "Which best describes 'investing'?",
        options: [
          "Using money to get rich",
          "Committing money now with the hope of a future financial return",
          "Savings in my bank account",
          "Borrowing money to buy nice things"
        ],
        answer: 1,
        explanation: "Investing means putting money to work today - accepting some risk - in the hope of growing it over time."
      },
      {
        question: "What is always a factor when it comes to investing?",
        options: [
          "Every investment comes with risk and you could lose money",
          "The more money you invest the better chance you have of winning",
          "Investing guarantees you will beat inflation",
          "Trust someone who promises you will get rich quickly"
        ],
        answer: 0,
        explanation: "All investments carry some level of risk, and this risk is always a factor to consider when investing."
      },
      {
        question: "What is the main benefit of having cash savings?",
        options: [
          "It will grow at the same rate as inflation",
          "Any growth is tax-free",
          "The Government rewards you for having cash savings",
          "The value cannot go down so it reduces your overall risk"
        ],
        answer: 3,
        explanation: "Investing in cash savings reduces overall risk because the value cannot go down, providing a safe place to store money."
      },
      {
        question: "What is a key risk of holding too much money in cash long-term?",
        options: [
          "The bank keeps the cash locked away forever",
          "Inflation can reduce its real spending power over time",
          "Cash cannot be withdrawn once deposited",
          "Cash automatically converts into stocks"
        ],
        answer: 1,
        explanation: "If inflation rises faster than the interest earned on cash, the real value (purchasing power) of that cash falls over time."
      }
    ]
  },
  {
    title: "Bonds",
    questions: [
      {
        question: "What is a bond?",
        options: [
          "A small piece of ownership in a company",
          "A loan made by an investor to a government or company",
          "A physical commodity like gold or oil",
          "A type of savings account with no interest"
        ],
        answer: 1,
        explanation: "A bond is essentially an IOU - the investor lends money and the borrower agrees to pay interest and repay the loan later."
      },
      {
        question: "Why might an investor choose bonds over equities?",
        options: [
          "Bonds usually offer more stable, predictable income and lower risk",
          "Bonds always grow faster than shares",
          "Bonds cannot lose value under any circumstances",
          "Bonds give you voting rights in a company"
        ],
        answer: 0,
        explanation: "Bonds tend to be lower risk than shares and can provide steady interest payments, which appeals to more cautious investors."
      },
      {
        question: "What generally happens to the value of bonds when interest rates rise?",
        options: [
          "Bond prices rise",
          "Bond prices fall",
          "Bond prices are unaffected by interest rates",
          "Bonds automatically convert to cash"
        ],
        answer: 1,
        explanation: "When interest rates rise, new bonds pay more, making older, lower-interest bonds less attractive, so their prices tend to fall."
      },
      {
        question: "Which type of bond is generally considered lowest risk?",
        options: [
          "A bond issued by a small, unstable company",
          "A bond issued by a stable national government",
          "A bond with no fixed repayment date",
          "A bond from a company already in financial difficulty"
        ],
        answer: 1,
        explanation: "Government bonds from stable countries are usually seen as lower risk because governments are less likely to default than most companies."
      }
    ]
  },
  {
    title: "Equities & Commodities",
    questions: [
      {
        question: "What is an equity (share/stock)?",
        options: [
          "A loan to a government",
          "A small ownership stake in a company",
          "A raw material traded on global markets",
          "A guaranteed fixed rate of interest"
        ],
        answer: 1,
        explanation: "Buying equity means buying a small piece of a company, so your investment's value rises and falls with the company's performance."
      },
      {
        question: "Which of these will best spread our risk?",
        options: [
          "Shares in 10 companies",
          "A fund or ETF",
          "Crude oil or gold",
          "Shares in Apple"
        ],
        answer: 1,
        explanation: "A fund or ETF typically holds a diversified mix of assets, which helps spread and manage risk more effectively than holding a few individual shares."
      },
      {
        question: "Why can equities be considered higher risk than bonds?",
        options: [
          "Share prices can be more volatile and are not guaranteed to pay anything back",
          "Shares always guarantee a fixed annual return",
          "Shares cannot be bought or sold",
          "Equities are protected by the government"
        ],
        answer: 0,
        explanation: "Share prices can swing significantly with company performance and market sentiment, and there's no guaranteed return, unlike a bond's fixed interest."
      },
      {
        question: "What is a common reason investors add commodities to a portfolio?",
        options: [
          "They always rise steadily in value",
          "They can help diversify a portfolio, as they often behave differently to shares and bonds",
          "They are completely risk free",
          "They pay guaranteed dividends"
        ],
        answer: 1,
        explanation: "Commodities often move differently from shares and bonds, so including them can help spread and manage overall portfolio risk."
      }
    ]
  }
];

const YEAR_RETURNS = [
  { year: 1, cash: 0.05, bonds: 0.07, commodities: 0.02, equities: 0.26 },
  { year: 2, cash: 0.04, bonds: 0.09, commodities: 0.16, equities: 0.10 },
  { year: 3, cash: 0.01, bonds: 0.05, commodities: -0.36, equities: -0.41 },
  { year: 4, cash: 0.01, bonds: 0.07, commodities: 0.19, equities: 0.27 },
  { year: 5, cash: 0.01, bonds: 0.06, commodities: 0.17, equities: 0.08 },
  { year: 6, cash: 0.01, bonds: 0.06, commodities: -0.13, equities: -0.12 }
];
