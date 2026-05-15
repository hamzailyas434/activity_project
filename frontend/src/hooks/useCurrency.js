import { useState, useCallback } from "react";

const CURRENCIES = {
  PKR: { symbol: "PKR", locale: "en-PK" },
  USD: { symbol: "$",   locale: "en-US" },
  EUR: { symbol: "€",   locale: "de-DE" },
  GBP: { symbol: "£",   locale: "en-GB" },
};

const STORAGE_KEY = "userCurrency";

export function useCurrency() {
  const [currency, setCurrencyState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "PKR"
  );

  const setCurrency = useCallback((code) => {
    if (CURRENCIES[code]) {
      localStorage.setItem(STORAGE_KEY, code);
      setCurrencyState(code);
    }
  }, []);

  const cfg = CURRENCIES[currency] || CURRENCIES.PKR;

  const format = (n) => {
    if (n == null || Number.isNaN(Number(n))) return "";
    const num = Number(n);
    if (currency === "PKR") {
      return `PKR ${num.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return num.toLocaleString(cfg.locale, { style: "currency", currency, maximumFractionDigits: 0 });
  };

  return { currency, setCurrency, symbol: cfg.symbol, format, options: Object.keys(CURRENCIES) };
}
