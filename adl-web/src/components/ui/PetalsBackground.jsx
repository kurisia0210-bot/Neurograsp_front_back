import React, { useEffect, useRef } from 'react'

export function PetalsBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // ============ 参数配置 ============
    const { sin, cos, PI, abs, pow } = Math
    const QUALITY = 1
    const STEP_SIZE = 40
    const SPEED = 0.0002 
    
    let w, h, scale
    let animationId

    // 🎨 核心修改：配色翻转 (外浅 -> 内深)
    const getColor = (ringProgress) => {
      // ringProgress: 1 (最外圈) -> 0 (最中心)

      // 1. Hue (色相):
      // 外圈 (1.0): 200 (天空蓝/浅蓝)
      // 内圈 (0.0): 270 (深紫)
      // 变化：270 -> 200，形成了 Purple -> Blue -> Sky Blue 的反向渐变
      const hue = 270 - ringProgress * 70 
      
      // 2. Saturation (饱和度): 
      // 保持适中，外圈稍微低一点显得清新，内圈高一点显得浓郁
      const sat = 80 - ringProgress * 20
      
      // 3. Lightness (亮度): 关键！
      // 外圈 (1.0): 85% (非常亮，接近白色的浅蓝)
      // 内圈 (0.0): 35% (深邃的紫色)
      // 这完美实现了 "浅蓝 -> 深蓝 -> 紫" 的深度递进
      const light = 35 + ringProgress * 50
      
      return `hsl(${hue}, ${sat}%, ${light}%)`
    }

    // ============ 下面的绘制逻辑保持不变 ============
    function setSize() {
      scale = window.devicePixelRatio * QUALITY
      w = window.innerWidth
      canvas.width = w * scale
      h = window.innerHeight
      canvas.height = h * scale
      ctx.scale(scale, scale)
    }

    function polarToCartesian(r, theta) {
      return [r * sin(theta), r * cos(theta)]
    }

    function drawFrame(t) {
      ctx.clearRect(0, 0, w, h)
      ctx.save()
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.translate(w / 2, h / 2)
      ctx.scale(1, -1)

      const time = t * SPEED

      for (let ring = 20; ring > 0; --ring) {
        const ringProgress = ring / 20
        
        ctx.fillStyle = getColor(ringProgress)
        // 描边设为半透明白，增加层次感
        ctx.strokeStyle = `rgba(255, 255, 255, 0.25)`
        ctx.lineWidth = 1
        
        ctx.beginPath()
        const points = 300 
        for (let point = 0; point < points; ++point) {
          let pointProgress = point / points
          let angle = PI * 2 * pointProgress
          let p = 4 * (angle + sin(ringProgress * 2 * PI + time) + ((ring % 2) ? 0 : PI/4))
          let a = pow(abs(sin(p)), 1/3)
          let b = pow(1 - abs(sin(p + PI/2)), 9) / 4
          
          let rOgee = (a + b) * STEP_SIZE
          let rRing = ring * STEP_SIZE * 0.8
          
          const [x, y] = polarToCartesian(rRing + rOgee, angle)
          if (!point) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
      ctx.restore()
    }

    setSize()
    window.addEventListener('resize', setSize)

    function render(t) {
      drawFrame(t)
      animationId = requestAnimationFrame(render)
    }
    animationId = requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', setSize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.8 }} // 稍微提高一点透明度，让浅蓝色背景更明显
    />
  )
}