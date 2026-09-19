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
        question: "What does 'investing' mean?",
        options: [
          "Putting money away where it cannot grow at all",
          "Committing money now with the expectation of a future financial return",
          "Spending money on everyday items",
          "Borrowing money from a bank"
        ],
        answer: 1,
        explanation: "Investing means putting money to work today - accepting some risk - in the hope of growing it over time."
      },
      {
        question: "What is the main advantage of holding cash savings?",
        options: [
          "It typically offers the highest long-term returns",
          "It is very low risk and easily accessible",
          "It guarantees you will beat inflation",
          "It cannot ever lose real value"
        ],
        answer: 1,
        explanation: "Cash is one of the safest and most accessible places to keep money, though it usually grows more slowly than other assets."
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
      },
      {
        question: "Which of these best describes 'risk vs. reward' in investing?",
        options: [
          "Lower risk investments usually offer higher potential returns",
          "Higher risk investments usually offer the potential for higher returns, but also bigger potential losses",
          "Risk and reward are unrelated",
          "All investments carry the exact same risk"
        ],
        answer: 1,
        explanation: "Generally, taking on more risk gives the potential for greater reward, but also the potential for greater loss."
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
        question: "What generally happens to existing bond prices when interest rates rise?",
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
        question: "Which of these is an example of a commodity?",
        options: [
          "Shares in a technology company",
          "A UK government bond",
          "Crude oil or gold",
          "A savings account"
        ],
        answer: 2,
        explanation: "Commodities are raw materials or primary goods, such as oil, gold, wheat or other metals, traded on global markets."
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
