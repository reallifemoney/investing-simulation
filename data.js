const QUIZ_SECTIONS = [
  {
    title: "Cash & Bonds",
    questions: [
      {
        question: "A savings account pays 3% interest while inflation is 5%. What happens to the purchasing power of the money over the year?",
        options: ["It rises by about 2%", "It falls by about 2%", "It stays the same", "It falls by 5% exactly"],
        answer: 1,
        explanation: "The balance grows, but prices rise faster, so its purchasing power falls by roughly 2%."
      },
      {
        question: "Market interest rates rise after a bond is issued. What generally happens to its price?",
        options: ["It rises because the coupon increases", "It stays fixed until maturity", "It falls because newer bonds offer higher yields", "It rises because the issuer owes more"],
        answer: 2,
        explanation: "The bond's interest rate is less attractive compared with newer bonds, so its market price generally falls."
      },
      {
        question: "Two similar government bonds differ only in their duration. Which is generally more sensitive to an interest-rate rise?",
        options: ["The bond maturing in one year", "The bond maturing in twenty years", "Both are equally sensitive", "Neither can change in price"],
        answer: 1,
        explanation: "Longer-duration bonds are generally more sensitive to changes in interest rates."
      },
      {
        question: "Why might a company's bond offer a higher yield than a government bond of similar maturity?",
        options: ["Company bonds always rise in price", "Investors may demand compensation for greater default risk", "Its coupon must increase with inflation", "The company bond grants voting rights"],
        answer: 1,
        explanation: "A higher yield can compensate investors for a greater risk that the issuer will not make promised payments."
      },
      {
        question: "Why do investors invest in bonds as part of their portfolio?",
        options: ["They provide regular income and lower risk compared to equities", "They always outperform stocks", "They are risk-free", "They automatically convert into shares"],
        answer: 0,
        explanation: "Investors include bonds in their portfolio for diversification, regular income, and generally lower risk compared to equities."
      }
    ]
  },
  {
    title: "Equities & Commodities",
    questions: [
      {
        question: "What does it mean to invest in equities?",
        options: ["Buying shares of a company", "Share prices can never reflect expectations", "Profits determine the share price exactly", "All shareholders must sell when profits rise"],
        answer: 0,
        explanation: "Share prices reflect expectations as well as results; a positive result can disappoint investors if they expected more."
      },
      {
        question: "What risk is most effectively reduced by holding shares in many companies across different industries?",
        options: ["The risk of a market-wide fall", "The risk specific to an individual company", "Inflation risk entirely", "All investment risk"],
        answer: 1,
        explanation: "Diversification can reduce company-specific risk, although a broad market downturn can still affect the portfolio."
      },
      {
        question: "A share pays a £2 annual dividend and costs £40. What is its dividend yield?",
        options: ["2%", "5%", "20%", "40%"],
        answer: 1,
        explanation: "Dividend yield is the annual dividend divided by the share price: £2 / £40 = 5%. Dividends are not guaranteed."
      },
      {
        question: "A share falls by 20%. Approximately how much must it rise from its new price to return to its original price?",
        options: ["20%", "25%", "30%", "40%"],
        answer: 1,
        explanation: "A £100 share falls to £80; gaining £20 from £80 requires a 25% rise."
      },
      {
        question: "What is a key difference between holding physical gold and holding dividend-paying shares?",
        options: ["Gold guarantees a dividend", "Gold produces no income by itself", "Gold cannot fall in price", "Gold represents ownership of a company"],
        answer: 1,
        explanation: "Physical gold does not pay income itself; its return depends on price changes and any costs of holding it."
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
