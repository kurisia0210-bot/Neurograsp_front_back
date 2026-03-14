import React from 'react'
import { Level2 } from './legacy/Level2'

export default function LegacyApp() {
  const goHome = () => {
    window.location.href = '/'
  }

  return <Level2 onBack={goHome} />
}
