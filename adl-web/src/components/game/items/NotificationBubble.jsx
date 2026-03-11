import React, { useMemo } from 'react'

export function NotificationBubble({
  text,
  subText = null,
  style = {},
  showArrowAnimation = false
}) {
  const bubbleEmoji = useMemo(() => {
    const emojiPool = ['🌱', '🍀', '🌸', '⭐', '🫧', '🍎', '🐣', '🌼']
    const randomIndex = Math.floor(Math.random() * emojiPool.length)
    return emojiPool[randomIndex]
  }, [])

  const lines = [text, subText].filter(Boolean)

  return (
    <div
      style={{
        position: 'relative',
        minWidth: '360px',
        maxWidth: '680px',
        animation:
          'notificationBubblePop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), notificationBubbleFloat 4s ease-in-out 0.7s infinite alternate',
        transformOrigin: 'bottom left',
        ...style
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '4px solid #4cd1b6',
          borderRadius: '28px 28px 28px 8px',
          boxShadow: '0 8px 0 #4cd1b6, 0 15px 25px rgba(76, 209, 182, 0.2)',
          padding: '18px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: '2px dashed #edf2f7',
            paddingBottom: '10px',
            marginBottom: '2px'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: '#e6fcf5',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}
          >
            <span role="img" aria-label="agent emoji">
              {bubbleEmoji}
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#ff99c8',
              letterSpacing: '0.4px'
            }}
          >
            Flora
          </p>

          <div
            style={{
              marginLeft: 'auto',
              width: '9px',
              height: '9px',
              borderRadius: '9999px',
              backgroundColor: '#4cd1b6',
              boxShadow: '0 0 8px rgba(76, 209, 182, 0.6)'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {lines.map((line, index) => (
            <p
              key={`${index}-${line}`}
              style={{
                margin: 0,
                fontSize: index === 0 ? '1.05rem' : '0.98rem',
                fontWeight: index === 0 ? 700 : 600,
                color: index === 0 ? '#475569' : '#64748b',
                lineHeight: 1.45
              }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      {showArrowAnimation && (
        <div
          style={{
            position: 'absolute',
            right: '-54px',
            top: '50%',
            width: '36px',
            height: '36px',
            transform: 'translateY(-50%)',
            animation: 'notificationBubbleArrow 1.2s ease-in-out infinite'
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M8 18H28M28 18L21 11M28 18L21 25"
              stroke="#4cd1b6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      <style>{`
        @keyframes notificationBubblePop {
          0% {
            transform: scale(0.5) rotate(-8deg) translateY(18px);
            opacity: 0;
          }
          50% {
            transform: scale(1.04) rotate(2deg) translateY(-4px);
            opacity: 1;
          }
          100% {
            transform: scale(1) rotate(0deg) translateY(0);
            opacity: 1;
          }
        }

        @keyframes notificationBubbleFloat {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-4px);
          }
        }

        @keyframes notificationBubbleArrow {
          0%,
          100% {
            opacity: 0.35;
            transform: translateY(-50%) translateX(0);
          }
          50% {
            opacity: 1;
            transform: translateY(-50%) translateX(8px);
          }
        }
      `}</style>
    </div>
  )
}
