import { createWorldFactsWriter } from './worldFacts'

// Backward-compatible wrapper: AgentSystem still expects executeWorldAction.
export function createAgentExecutionAdapter(worldState) {
  const writer = createWorldFactsWriter({
    getAgentState: () => worldState.agentState,
    getCubes: () => worldState.cubes,
    getFridgeOpen: () => worldState.fridgeOpen,
    setAgentLocation: worldState.setAgentLocation,
    pickUpCube: worldState.pickUpCube,
    placeCube: worldState.placeCube,
    toggleFridgeDoor: worldState.toggleFridgeDoor,
    updateCubePosition: worldState.updateCubePosition
  })

  return function executeWorldAction(actionPayload) {
    return writer.executeIntent(actionPayload)
  }
}
