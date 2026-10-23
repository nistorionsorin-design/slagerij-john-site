// Typography only, never wording: a number and its unit stay on one line („10 km”, „100 g”; row 15c:
// „180 °C”, „3 u” on the counter tags’ cooking lines).
// Row 21: „5 %” too (the NL volume discount; RO writes „5%”, no space).
export const keepUnits = (s: string) => s.replace(/(\d) (km|kg|g|min|cm|l|u|°C)\b/g, '$1 $2').replace(/(\d) %/g, '$1 %');

// Row 22b: a group's or category's name inside a sentence („Toon alle 23 van varken”, „Arată toate cele 8 de la organe”)
// starts lower case — except an adjective of nationality in Dutch, which keeps its capital („van Roemeense
// specialiteiten”); Romanian writes those lower case anyway („mezeluri românești”).
export const midSentence = (name: string, locale: 'nl' | 'ro') =>
  locale === 'nl' && /^(Roemeens|Belgisch|Ardeens|Italiaans|Frans|Spaans)/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1);
