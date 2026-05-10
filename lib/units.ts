type UnitType = 'weight' | 'volume'

const conversions: Record<UnitType, Record<string, number>> = {
  weight: { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 },
  volume: { ml: 1, l: 1000, tsp: 4.92892, tbsp: 14.7868, cup: 236.588, fl_oz: 29.5735 },
}

const unitToType: Record<string, UnitType> = {
  g: 'weight', kg: 'weight', oz: 'weight', lb: 'weight',
  ml: 'volume', l: 'volume', tsp: 'volume', tbsp: 'volume', cup: 'volume', fl_oz: 'volume',
}

function getUnitType(unit: string): UnitType | null {
  return unitToType[unit] ?? null
}

function toBase(quantity: number, unit: string, unitType: UnitType): number {
  return quantity * (conversions[unitType][unit] ?? 1)
}

function fromBase(baseQuantity: number, targetUnit: string, unitType: UnitType): number {
  return baseQuantity / (conversions[unitType][targetUnit] ?? 1)
}

export function tryConvert(quantity: number, fromUnit: string, toUnit: string): number | null {
  if (fromUnit === toUnit) return quantity
  const fromType = getUnitType(fromUnit)
  const toType = getUnitType(toUnit)
  if (!fromType || !toType || fromType !== toType) return null
  const base = toBase(quantity, fromUnit, fromType)
  return fromBase(base, toUnit, toType)
}

export function displayQuantity(
  quantity: number,
  unit: string,
  unitType: string,
  prefs: { weight_unit: string; volume_unit: string }
): string {
  if (unitType === 'count') {
    return `${Math.ceil(quantity)}`
  }
  if (unitType === 'bulk') {
    return `${Math.round(quantity * 4) / 4} ${unit}`
  }
  const preferredUnit = unitType === 'weight' ? prefs.weight_unit : prefs.volume_unit
  const converted = tryConvert(quantity, unit, preferredUnit)
  if (converted === null) return `${Math.round(quantity * 4) / 4} ${unit}`
  const rounded = Math.round(converted * 4) / 4
  return `${rounded} ${preferredUnit}`
}
