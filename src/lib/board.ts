// The counter board's groups (row 18b, D-47; row 21, D-50): a category's `board` rows of products.json in file order,
// split by `group` — a row without one sits under the category's own name, a named group under its name in the
// category's `groups` (lexicon §5.19 „23.10”). A board with one group carries no label. One rule for both surfaces:
// the paper rows on /producten (Rows.astro, row 22b; the Krijtbord, Board.astro, until then) and the folds of the
// bestelbon (OrderForm.astro).
import type { Locale } from '../i18n/ui';
import type { Product } from '../data/types';
import { products } from './price';

export interface BoardGroup {
  /** '' = the rows without a `group` */
  id: string;
  /** only when the board has more than one group */
  label?: string;
  items: Product[];
}

export const boardGroups = (category: string, locale: Locale, items: Product[] = products.items): BoardGroup[] => {
  const c = products.categories.find((x) => x.id === category);
  if (!c) throw new Error(`products.json: no category "${category}"`);
  const board = items.filter((p) => p.category === category && p.board);
  const ids = [...new Set(board.map((p) => p.group ?? ''))];
  return ids.map((id) => {
    const rows = board.filter((p) => (p.group ?? '') === id);
    if (ids.length < 2) return { id, items: rows };
    const name = id ? c.groups?.find((g) => g.id === id)?.name : c.name;
    if (!name) throw new Error(`products.json: category "${category}" has no name for its board group "${id}"`);
    return { id, label: name[locale], items: rows };
  });
};
