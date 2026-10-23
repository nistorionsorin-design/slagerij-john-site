// Typography only, never wording: a number and its unit stay on one line („10 km”, „100 g”; row 15c:
// „180 °C”, „3 u” on the counter tags’ cooking lines).
// Row 21: „5 %” too (the NL volume discount; RO writes „5%”, no space).
export const keepUnits = (s: string) => s.replace(/(\d) (km|kg|g|min|cm|l|u|°C)\b/g, '$1 $2').replace(/(\d) %/g, '$1 %');
