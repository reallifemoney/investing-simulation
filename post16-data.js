// Post-16 version: questions are grouped into 2 taught sections of 5 questions each.
// Section 0: Investing basics, cash and bonds
// Section 1: Equities & commodities
// Feel free to edit/replace any question, option, answer index (0-based) or explanation below.

const QUIZ_SECTIONS_POST16 = [
  {
    title: "Investing, Cash & Bonds",
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
        question: "What is the main downside of gaining interest from cash?",
        options: [
          "It may grow slower than inflation and make my money lose purchasing power over time",
          "I will lose most of the interest to tax",
          "There is no downside",
          "There is risk that the value of my cash will go down"
        ],
        answer: 0,
        explanation: "The main downside of cash savings is that the interest earned often grows slower than inflation, which can erode purchasing power over time."
      },
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
          "Bonds cannot lose value",
          "Bonds always grow faster than shares",
          "Bonds usually offer more stable, predictable income and lower risk",
          "Bonds give you voting rights in a company"
        ],
        answer: 2,
        explanation: "Bonds tend to be lower risk than shares and can provide steady interest payments, which appeals to more cautious investors."
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
          "Investing in a fund (also called Index Fund or ETF)",
          "Crude oil or gold",
          "Shares in a big company like Apple"
        ],
        answer: 1,
        explanation: "A fund or ETF typically holds a diversified mix of assets, which helps spread and manage risk more effectively than holding a few individual shares."
      },
      {
        question: "Why can equities be considered higher risk than bonds?",
        options: [
          "You are very likely to lose money with equities",
          "Spreading your risk is difficult with equities",
          "There is no guarantee of fixed annual returns",
          "Bonds are protected by the government"
        ],
        answer: 2,
        explanation: "Shares have no guaranteed return, unlike a bond's fixed interest."
      },
      {
        question: "What kind of percentage change could I expect from equities?",
        options: [
          "Generally moderate swings - perhaps 10% up or down",
          "They can experience significant swings of as much as -40% to +40%",
          "They may move around 5% up or down",
          "Very stable prices"
        ],
        answer: 1,
        explanation: "Equities can experience significant fluctuations in value, both upward and downward, reflecting the performance of the underlying companies and market conditions."
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
  { year: 4, cash: 0.01, bonds: 0.07, commodities: 0.19, equities: 0.27 }
];
