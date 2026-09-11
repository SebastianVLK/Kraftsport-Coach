import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * The site in German or English, switched from the header.
 *
 * Strings sit in the components as German/English pairs — t("Anmelden", "Sign
 * in") — rather than behind keys in a separate table, so every translation is
 * read right next to the German it has to match.
 */
export type Lang = "de" | "en";

const STORAGE_KEY = "formcoach.lang";

const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({
  lang: "de",
  setLang: () => {},
});

const remembered = (): Lang => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "de";
  } catch {
    return "de";
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(remembered);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the choice is simply not remembered */
    }
  }, []);

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);

/** Picks the half of a German/English pair that matches the chosen language. */
export const useT = () => {
  const { lang } = useLang();
  return useCallback((de: string, en: string) => (lang === "de" ? de : en), [lang]);
};

export const localeOf = (lang: Lang) => (lang === "de" ? "de-CH" : "en-GB");

/**
 * The server's own messages are German, few and fixed. Their English is looked
 * up here instead of threading the language through every route.
 */
const SERVER_MESSAGES: Record<string, string> = {
  "Nicht angemeldet.": "Not signed in.",
  "Der Benutzername braucht 2 bis 40 Zeichen.": "The username needs 2 to 40 characters.",
  "Bitte eine gültige E-Mail-Adresse angeben.": "Please enter a valid email address.",
  "Das Passwort braucht mindestens 8 Zeichen.": "The password needs at least 8 characters.",
  "Für diese E-Mail gibt es bereits ein Konto.": "An account with this email already exists.",
  "E-Mail oder Passwort stimmt nicht.": "Email or password is incorrect.",
  "Zum Ändern von E-Mail oder Passwort das aktuelle Passwort eingeben.":
    "Enter your current password to change your email or password.",
  "Diese E-Mail wird bereits verwendet.": "This email is already in use.",
  "Kein Video oder Bildmaterial übermittelt.": "No video or images were sent.",
  "Die Video-Analyse konnte nicht durchgeführt werden.": "The video analysis could not be completed.",
  "Kein Übungskontext vorhanden.": "No exercise context available.",
};

export const serverMessage = (message: string, lang: Lang) =>
  lang === "en" ? SERVER_MESSAGES[message] ?? message : message;

/**
 * The verdict travels as a fixed German value from the model and the database;
 * only its label follows the page.
 */
const VERDICT_LABELS: Record<string, [string, string]> = {
  gut: ["Gut", "Good"],
  brauchbar: ["Brauchbar", "Fair"],
  mangelhaft: ["Mangelhaft", "Poor"],
  nicht_beurteilbar: ["Nicht beurteilbar", "Not assessable"],
};

export const verdictLabel = (verdict: string, lang: Lang) => {
  const [de, en] = VERDICT_LABELS[verdict] ?? VERDICT_LABELS.nicht_beurteilbar;
  return lang === "de" ? de : en;
};
