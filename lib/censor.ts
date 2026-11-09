// Masks curse words, slurs and NSFW words in chat text when it's shown:
// "fuck" -> "f***", "putangina" -> "p********". Only what's displayed changes;
// the stored message keeps the original words, so crisis detection and the
// Guidance Associate's records still see exactly what was written.
//
// Whole words only (after letters are allowed to repeat, like "fuuuck"), so
// ordinary words that contain one, like "cockroach", "class" or "Scunthorpe",
// are left alone. Stems marked with * also catch their endings
// ("fucking", "shitty", "bitches").

const ENGLISH = [
  "fuck*", "motherfuck*", "fck*", "fuk*", "shit*", "bullshit*", "bitch*", "asshole*", "ass", "arse", "bastard*",
  "damn", "dick", "dickhead*", "cock", "cocks", "cunt*", "pussy", "pussies", "slut*", "whore*", "wtf", "stfu",
  "nigga*", "nigger*", "fag", "fags", "faggot*", "retard", "retarded", "retards",
  "porn*", "nude", "nudes", "horny", "dildo*", "blowjob*", "handjob*", "boobs", "tits", "titties", "cum", "jizz", "milf*", "hentai",
];

const TAGALOG = [
  "putangina*", "putang", "tangina*", "tanginamo", "taena", "tngina", "puta", "pota", "potangina*", "putragis",
  "gago", "gaga", "gagi", "ulol", "olol", "tarantado*", "tanga", "bobo", "bobito", "inutil", "kupal", "pakyu", "pakshet",
  "leche", "letse", "punyeta", "pucha", "puchang", "hinayupak", "lintik", "buwisit", "bwisit", "bwiset", "kantot*", "kantutan",
  "jakol*", "salsal*", "tamod", "titi", "puke", "pekpek", "burat", "bayag", "tite", "iyot*", "chupa*", "libog*", "malibog",
];

// "fuck*" -> /f+u+c+k+\p{L}*/ ; "ass" -> /a+s+s+/
function pattern(word: string) {
  const stem = word.endsWith("*");
  const letters = (stem ? word.slice(0, -1) : word).split("").map((c) => `${c.replace(/[^\p{L}\d]/gu, "\\$&")}+`).join("");
  return letters + (stem ? "\\p{L}*" : "");
}

const BAD_WORDS = new RegExp(`(?<![\\p{L}\\d])(?:${[...ENGLISH, ...TAGALOG].map(pattern).join("|")})(?![\\p{L}\\d])`, "giu");

// Keeps the first letter so the reader can tell a word was there.
export function censor(text: string): string {
  return text.replace(BAD_WORDS, (w) => w[0] + "*".repeat(Math.max(w.length - 1, 2)));
}

export function hasBadWords(text: string): boolean {
  BAD_WORDS.lastIndex = 0;
  return BAD_WORDS.test(text);
}
