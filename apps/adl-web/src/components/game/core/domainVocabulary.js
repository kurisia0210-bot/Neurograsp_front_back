export const ITEM_NAMES = Object.freeze([
  'apple',
  'red_cube',
  'meat_raw',
  'meat_heated',
  'half_cube_left',
  'half_cube_right',
  'fridge_main',
  'fridge_door',
  'oven',
  'oven_door',
  'stove',
  'table_surface'
])

export const POI_NAMES = Object.freeze([
  'table_center',
  'fridge_zone',
  'stove_zone'
])

export const ITEM_ALIAS = Object.freeze({
  apple: 'apple',
  cube: 'red_cube',
  'red cube': 'red_cube',
  red_cube: 'red_cube',

  meat: 'meat_raw',
  'raw meat': 'meat_raw',
  meat_raw: 'meat_raw',
  'heated meat': 'meat_heated',
  meat_heated: 'meat_heated',
  plane: 'meat_raw',
  plate: 'meat_raw',

  fridge: 'fridge_main',
  refrigerator: 'fridge_main',
  'fridge main': 'fridge_main',
  fridge_main: 'fridge_main',
  door: 'fridge_door',
  'fridge door': 'fridge_door',
  fridge_door: 'fridge_door',

  oven: 'oven',
  'oven door': 'oven_door',
  oven_door: 'oven_door',

  table: 'table_surface',
  'table surface': 'table_surface',
  table_surface: 'table_surface',

  stove: 'oven'
})

export const POI_ALIAS = Object.freeze({
  table: 'table_center',
  'table center': 'table_center',
  table_center: 'table_center',
  fridge: 'fridge_zone',
  'fridge zone': 'fridge_zone',
  fridge_zone: 'fridge_zone',
  stove: 'stove_zone',
  oven: 'stove_zone',
  'stove zone': 'stove_zone',
  stove_zone: 'stove_zone'
})

export const CONTAINER_ALIAS = Object.freeze({
  fridge: 'fridge_main',
  refrigerator: 'fridge_main',
  fridge_main: 'fridge_main',
  'fridge main': 'fridge_main',
  table: 'table_surface',
  table_surface: 'table_surface',
  'table surface': 'table_surface',
  stove: 'oven',
  oven: 'oven'
})
