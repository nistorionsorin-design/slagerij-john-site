// Typography only, never wording: a number and its unit stay on one line („10 km”, „100 g”).
export const keepUnits = (s: string) => s.replace(/(\d) (km|kg|g|min|cm|l)\b/g, '$1 $2');
