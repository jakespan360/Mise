import { NextRequest, NextResponse } from 'next/server'
import { GROCERY_GENERATOR_SYSTEM_PROMPT, GeneratedGroceryList } from '@/lib/anthropic'
import { getGeminiModel } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'

type RecipeSelection = { id: string; multiplier: number }

export async function POST(request: NextRequest) {
  try {
    const { recipes: selections }: { recipes: RecipeSelection[] } = await request.json()

    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json({ error: 'recipes must be a non-empty array' }, { status: 400 })
    }

    const recipeIds = selections.map(s => s.id)
    const multiplierMap = Object.fromEntries(selections.map(s => [s.id, s.multiplier]))

    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('id, title, ingredients:recipe_ingredients(*)')
      .in('id', recipeIds)

    if (recipesError || !recipes) {
      return NextResponse.json({ error: 'Failed to fetch recipes', detail: recipesError }, { status: 500 })
    }

    const prompt = recipes.map(recipe => {
      const multiplier = multiplierMap[recipe.id] ?? 1
      const header = multiplier > 1
        ? `Recipe: ${recipe.title} (making ×${multiplier} — multiply all quantities by ${multiplier})`
        : `Recipe: ${recipe.title}`
      const lines = recipe.ingredients.map(
        (ing: { canonical_name: string; quantity: number; unit: string; unit_type: string }) =>
          `  - ${ing.canonical_name}: ${ing.quantity} ${ing.unit} (${ing.unit_type})`
      ).join('\n')
      return `${header}\n${lines}`
    }).join('\n\n')

    const model = getGeminiModel()
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: GROCERY_GENERATOR_SYSTEM_PROMPT,
    })

    const rawText = result.response.text().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let generated: GeneratedGroceryList
    try {
      generated = JSON.parse(rawText)
    } catch {
      console.error('[grocery/generate] raw response:', rawText)
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: rawText }, { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from('grocery_list_items')
      .delete()
      .eq('is_manual', false)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to clear grocery list', detail: deleteError }, { status: 500 })
    }

    const rows = generated.items.map(item => ({
      canonical_name: item.canonical_name,
      quantity: item.quantity,
      unit: item.unit,
      unit_type: item.unit_type,
      category: item.category ?? null,
      is_manual: false,
      checked: false,
      source_recipe_ids: recipeIds,
    }))

    const { error: insertError } = await supabase.from('grocery_list_items').insert(rows)

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save grocery list', detail: insertError }, { status: 500 })
    }

    const { data: updated } = await supabase
      .from('grocery_list_items')
      .select('*')
      .order('updated_at', { ascending: false })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[grocery/generate]', err)
    return NextResponse.json({ error: 'Unexpected error', detail: String(err) }, { status: 500 })
  }
}
