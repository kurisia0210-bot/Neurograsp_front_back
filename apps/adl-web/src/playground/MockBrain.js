// src/playground/MockBrain.js

export async function mockPythonBackend(observationJSON) {
  console.log('[Mock Python] Received:', observationJSON)

  await new Promise((resolve) => setTimeout(resolve, 500))

  const worldFacts = observationJSON?.world_facts || {}
  const entities = worldFacts?.entities || {}

  const agent = entities.agent || { location: 'table_center', holding: null }
  const cube = entities.red_cube || entities.apple || null
  const fridgeDoor = entities.fridge_door || null

  if (agent.holding === null) {
    if (cube && cube.state === 'on_table') {
      return {
        type: 'INTERACT',
        target_item: cube.id || 'red_cube',
        content: 'I see the cube. Picking it up.'
      }
    }
  }

  if (agent.holding === 'red_cube' || agent.holding === 'apple') {
    if (agent.location !== 'fridge_zone') {
      return {
        type: 'MOVE_TO',
        target_poi: 'fridge_zone',
        content: 'Moving to fridge to store the cube.'
      }
    }

    if (agent.location === 'fridge_zone') {
      if (fridgeDoor && fridgeDoor.state === 'closed') {
        return {
          type: 'INTERACT',
          target_item: 'fridge_door',
          content: 'Opening the fridge.'
        }
      }

      if (fridgeDoor && fridgeDoor.state === 'open') {
        return {
          type: 'INTERACT',
          target_item: 'fridge_main',
          content: 'Putting cube inside.'
        }
      }
    }
  }

  return { type: 'IDLE', content: 'Waiting...' }
}
