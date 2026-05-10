import { GroceryListItem, RecipeIngredient } from './supabase'
import { tryConvert } from './units'

export type MergeAction =
  | { type: 'insert'; item: Omit<GroceryListItem, 'id' | 'updated_at'> }
  | { type: 'update'; id: string; quantity: number; source_recipe_ids: string[] }

export function planGroceryMerge(
  ingredients: RecipeIngredient[],
  existing: GroceryListItem[],
  recipeId: string
): MergeAction[] {
  const actions: MergeAction[] = []
  const workingMap = new Map<string, GroceryListItem>(existing.map(item => [item.id, { ...item }]))

  for (const ingredient of ingredients) {
    const match = [...workingMap.values()].find(
      item => item.canonical_name.toLowerCase() === ingredient.canonical_name.toLowerCase()
    )

    if (!match) {
      actions.push({
        type: 'insert',
        item: {
          canonical_name: ingredient.canonical_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          unit_type: ingredient.unit_type,
          is_manual: false,
          checked: false,
          category: null,
          source_recipe_ids: [recipeId],
        },
      })
      continue
    }

    if (match.unit === ingredient.unit) {
      const newQty = match.quantity + ingredient.quantity
      const newSources = match.source_recipe_ids.includes(recipeId)
        ? match.source_recipe_ids
        : [...match.source_recipe_ids, recipeId]
      actions.push({ type: 'update', id: match.id, quantity: newQty, source_recipe_ids: newSources })
      workingMap.set(match.id, { ...match, quantity: newQty, source_recipe_ids: newSources })
      continue
    }

    const converted = tryConvert(ingredient.quantity, ingredient.unit, match.unit)
    if (converted !== null) {
      const newQty = match.quantity + converted
      const newSources = match.source_recipe_ids.includes(recipeId)
        ? match.source_recipe_ids
        : [...match.source_recipe_ids, recipeId]
      actions.push({ type: 'update', id: match.id, quantity: newQty, source_recipe_ids: newSources })
      workingMap.set(match.id, { ...match, quantity: newQty, source_recipe_ids: newSources })
    } else {
      // Incompatible unit types — insert as separate line item
      actions.push({
        type: 'insert',
        item: {
          canonical_name: ingredient.canonical_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          unit_type: ingredient.unit_type,
          is_manual: false,
          checked: false,
          category: null,
          source_recipe_ids: [recipeId],
        },
      })
    }
  }

  return actions
}
