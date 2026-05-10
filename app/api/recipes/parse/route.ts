import { NextRequest, NextResponse } from 'next/server'
import { RECIPE_PARSER_SYSTEM_PROMPT, ParsedRecipe } from '@/lib/anthropic'
import { getGeminiModel } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { input, type } = await request.json()

    if (!input || !type) {
      return NextResponse.json({ error: 'input and type are required' }, { status: 400 })
    }

    let text = input

    if (type === 'url') {
      const jinaRes = await fetch(`https://r.jina.ai/${input}`)
      if (!jinaRes.ok) {
        return NextResponse.json({ error: 'Failed to fetch URL content' }, { status: 400 })
      }
      text = await jinaRes.text()
    }

    const model = getGeminiModel()
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text }] }],
      systemInstruction: RECIPE_PARSER_SYSTEM_PROMPT,
    })

    const rawText = result.response.text().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let parsed: ParsedRecipe
    try {
      parsed = JSON.parse(rawText)
    } catch {
      console.error('[parse] Gemini raw response:', rawText)
      return NextResponse.json({ error: 'AI returned invalid JSON', raw: rawText }, { status: 500 })
    }

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        title: parsed.title,
        source_url: type === 'url' ? input : null,
        source_text: type === 'text' ? input : null,
      })
      .select()
      .single()

    if (recipeError || !recipe) {
      return NextResponse.json({ error: 'Failed to save recipe', detail: recipeError }, { status: 500 })
    }

    const ingredientRows = parsed.ingredients
      .filter(ing => typeof ing.quantity === 'number' && !isNaN(ing.quantity))
      .map(ing => ({
        recipe_id: recipe.id,
        canonical_name: ing.canonical_name,
        quantity: ing.quantity,
        unit: ing.unit,
        unit_type: ing.unit_type,
        original_text: ing.original_text,
      }))

    const { data: ingredients, error: ingError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientRows)
      .select()

    if (ingError) {
      return NextResponse.json({ error: 'Failed to save ingredients', detail: ingError }, { status: 500 })
    }

    return NextResponse.json({ ...recipe, ingredients })
  } catch (err) {
    console.error('[/api/recipes/parse]', err)
    return NextResponse.json({ error: 'Unexpected error', detail: String(err) }, { status: 500 })
  }
}
