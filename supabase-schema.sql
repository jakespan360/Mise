-- Run this in the Supabase SQL editor

CREATE TABLE recipes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  source_url  text,
  source_text text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE recipe_ingredients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id      uuid REFERENCES recipes ON DELETE CASCADE,
  canonical_name text NOT NULL,
  quantity       numeric NOT NULL,
  unit           text NOT NULL,
  unit_type      text NOT NULL CHECK (unit_type IN ('count','weight','volume','bulk')),
  original_text  text
);

CREATE TABLE grocery_list_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name    text NOT NULL,
  quantity          numeric NOT NULL,
  unit              text NOT NULL,
  unit_type         text NOT NULL,
  is_manual         boolean DEFAULT false,
  checked           boolean DEFAULT false,
  source_recipe_ids uuid[] DEFAULT '{}',
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE user_preferences (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weight_unit  text DEFAULT 'oz',
  volume_unit  text DEFAULT 'cup'
);

-- Seed a single preferences row
INSERT INTO user_preferences DEFAULT VALUES;
