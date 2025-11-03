/*
  # Warframe Builder Application Schema

  1. New Tables
    - `warframes`
      - `id` (uuid, primary key)
      - `name` (text, warframe name)
      - `image_url` (text, optional image)
      - `base_health` (integer)
      - `base_shield` (integer)
      - `base_armor` (integer)
      - `base_energy` (integer)
      - `created_at` (timestamp)
    
    - `weapons`
      - `id` (uuid, primary key)
      - `name` (text, weapon name)
      - `type` (text, primary/secondary/melee)
      - `image_url` (text, optional image)
      - `base_damage` (integer)
      - `created_at` (timestamp)
    
    - `mods`
      - `id` (uuid, primary key)
      - `name` (text, mod name)
      - `type` (text, warframe/weapon)
      - `polarity` (text, mod polarity)
      - `max_rank` (integer)
      - `drain` (integer, base drain cost)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `arcanes`
      - `id` (uuid, primary key)
      - `name` (text, arcane name)
      - `type` (text, warframe/weapon)
      - `max_rank` (integer)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `archon_shards`
      - `id` (uuid, primary key)
      - `name` (text, shard name)
      - `color` (text, shard color)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `builds`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `name` (text, build name)
      - `warframe_id` (uuid, references warframes)
      - `warframe_mods` (jsonb, array of mod configurations)
      - `warframe_arcanes` (jsonb, array of arcanes)
      - `archon_shards` (jsonb, array of shards)
      - `primary_weapon_id` (uuid, references weapons)
      - `primary_mods` (jsonb)
      - `primary_arcane` (jsonb)
      - `secondary_weapon_id` (uuid, references weapons)
      - `secondary_mods` (jsonb)
      - `secondary_arcane` (jsonb)
      - `melee_weapon_id` (uuid, references weapons)
      - `melee_mods` (jsonb)
      - `melee_arcane` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Public read access for warframes, weapons, mods, arcanes, archon_shards
    - Users can only manage their own builds
*/

CREATE TABLE IF NOT EXISTS warframes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text DEFAULT '',
  base_health integer DEFAULT 100,
  base_shield integer DEFAULT 100,
  base_armor integer DEFAULT 100,
  base_energy integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weapons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('primary', 'secondary', 'melee')),
  image_url text DEFAULT '',
  base_damage integer DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('warframe', 'weapon', 'universal')),
  polarity text DEFAULT 'none',
  max_rank integer DEFAULT 10,
  drain integer DEFAULT 6,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arcanes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('warframe', 'weapon')),
  max_rank integer DEFAULT 5,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS archon_shards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  warframe_id uuid REFERENCES warframes(id) ON DELETE SET NULL,
  warframe_mods jsonb DEFAULT '[]'::jsonb,
  warframe_arcanes jsonb DEFAULT '[]'::jsonb,
  archon_shards jsonb DEFAULT '[]'::jsonb,
  primary_weapon_id uuid REFERENCES weapons(id) ON DELETE SET NULL,
  primary_mods jsonb DEFAULT '[]'::jsonb,
  primary_arcane jsonb DEFAULT '[]'::jsonb,
  secondary_weapon_id uuid REFERENCES weapons(id) ON DELETE SET NULL,
  secondary_mods jsonb DEFAULT '[]'::jsonb,
  secondary_arcane jsonb DEFAULT '[]'::jsonb,
  melee_weapon_id uuid REFERENCES weapons(id) ON DELETE SET NULL,
  melee_mods jsonb DEFAULT '[]'::jsonb,
  melee_arcane jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE warframes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE mods ENABLE ROW LEVEL SECURITY;
ALTER TABLE arcanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE archon_shards ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view warframes"
  ON warframes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can view weapons"
  ON weapons FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can view mods"
  ON mods FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can view arcanes"
  ON arcanes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can view archon shards"
  ON archon_shards FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can view own builds"
  ON builds FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own builds"
  ON builds FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own builds"
  ON builds FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own builds"
  ON builds FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO warframes (name, base_health, base_shield, base_armor, base_energy) VALUES
  ('Excalibur', 100, 100, 225, 100),
  ('Mag', 75, 150, 65, 175),
  ('Volt', 100, 150, 15, 150),
  ('Rhino', 100, 190, 190, 100),
  ('Frost', 100, 300, 300, 150),
  ('Nova', 100, 75, 65, 175),
  ('Loki', 75, 75, 65, 175),
  ('Ash', 100, 100, 65, 150),
  ('Trinity', 100, 100, 15, 150),
  ('Saryn', 100, 125, 225, 150)
ON CONFLICT DO NOTHING;

INSERT INTO weapons (name, type, base_damage) VALUES
  ('Braton', 'primary', 20),
  ('Boltor', 'primary', 25),
  ('Soma', 'primary', 12),
  ('Tigris', 'primary', 1050),
  ('Acceltra', 'primary', 40),
  ('Lato', 'secondary', 18),
  ('Lex', 'secondary', 60),
  ('Atomos', 'secondary', 20),
  ('Kuva Nukor', 'secondary', 18),
  ('Skana', 'melee', 35),
  ('Orthos', 'melee', 40),
  ('Galatine', 'melee', 110),
  ('Kronen Prime', 'melee', 48)
ON CONFLICT DO NOTHING;

INSERT INTO mods (name, type, polarity, max_rank, drain, description) VALUES
  ('Vitality', 'warframe', 'vazarin', 10, 14, '+440% Health'),
  ('Redirection', 'warframe', 'vazarin', 10, 14, '+440% Shields'),
  ('Steel Fiber', 'warframe', 'naramon', 10, 14, '+110% Armor'),
  ('Intensify', 'warframe', 'madurai', 10, 11, '+30% Ability Strength'),
  ('Streamline', 'warframe', 'naramon', 5, 9, '-30% Ability Efficiency'),
  ('Fleeting Expertise', 'warframe', 'madurai', 5, 6, '+60% Efficiency, -60% Duration'),
  ('Continuity', 'warframe', 'vazarin', 10, 11, '+30% Ability Duration'),
  ('Stretch', 'warframe', 'naramon', 10, 9, '+45% Ability Range'),
  ('Serration', 'weapon', 'madurai', 10, 14, '+165% Damage'),
  ('Split Chamber', 'weapon', 'madurai', 10, 15, '+90% Multishot'),
  ('Hornet Strike', 'weapon', 'madurai', 10, 14, '+220% Damage'),
  ('Barrel Diffusion', 'weapon', 'madurai', 10, 15, '+120% Multishot'),
  ('Pressure Point', 'weapon', 'madurai', 10, 14, '+120% Damage'),
  ('Fury', 'weapon', 'naramon', 10, 11, '+30% Attack Speed'),
  ('Reach', 'weapon', 'naramon', 10, 11, '+3m Range')
ON CONFLICT DO NOTHING;

INSERT INTO arcanes (name, type, max_rank, description) VALUES
  ('Arcane Energize', 'warframe', 5, 'On Energy Pickup: 60% chance to replenish Energy'),
  ('Arcane Grace', 'warframe', 5, 'On Damaged: 6% chance to regenerate 9% Health/s'),
  ('Arcane Guardian', 'warframe', 5, 'On Damaged: 15% chance for +600 Armor'),
  ('Arcane Avenger', 'warframe', 5, 'On Damaged: 45% chance for +45% Critical Chance'),
  ('Arcane Precision', 'weapon', 5, '+300% Damage to Headshots'),
  ('Arcane Rage', 'weapon', 5, 'On Headshot: 30% chance for +180% Damage')
ON CONFLICT DO NOTHING;

INSERT INTO archon_shards (name, color, description) VALUES
  ('Crimson Archon Shard', 'red', '+25% Ability Strength or +1650 Health'),
  ('Azure Archon Shard', 'blue', '+25% Ability Efficiency or +150 Energy'),
  ('Amber Archon Shard', 'yellow', '+25% Ability Duration or +1650 Armor'),
  ('Violet Archon Shard', 'purple', '+25% Ability Range or +1650 Shields'),
  ('Tau Crimson Archon Shard', 'red', '+50% Ability Strength')
ON CONFLICT DO NOTHING;