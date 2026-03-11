import React from 'react'

export function AvatarHoverMenu({
  className = '',
  tooltipText = 'Click to talk with me',
  onProgressClick,
  onTaskClick,
  onChatClick,
  children
}) {
  return (
    <div className={`avatar-hover-menu-root ${className}`}>
      <div className="avatar-hover-menu-options">
        <button
          type="button"
          className="avatar-hover-menu-item"
          style={{ '--delay': '0.15s' }}
          onClick={onProgressClick}
        >
          Progress
        </button>
        <button
          type="button"
          className="avatar-hover-menu-item"
          style={{ '--delay': '0.07s' }}
          onClick={onTaskClick}
        >
          Tasks
        </button>
        <button
          type="button"
          className="avatar-hover-menu-item"
          style={{ '--delay': '0s' }}
          onClick={onChatClick}
        >
          Talk
        </button>
      </div>

      <div className="avatar-hover-menu-tooltip">{tooltipText}</div>

      <div className="avatar-hover-menu-hitbox">
        <div className="avatar-hover-menu-toggle">{children}</div>
      </div>

      <style>{`
        .avatar-hover-menu-root {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .avatar-hover-menu-hitbox {
          position: absolute;
          inset: -42px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .avatar-hover-menu-toggle {
          width: 100%;
          height: 100%;
          transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
        }

        .avatar-hover-menu-root:hover .avatar-hover-menu-toggle {
          transform: translateY(-4px) scale(1.03);
        }

        .avatar-hover-menu-tooltip {
          position: absolute;
          right: calc(100% + 10px);
          bottom: 62px;
          margin-right: -10px;
          background: #ff99c8;
          color: white;
          padding: 10px 18px;
          border-radius: 20px 20px 4px 20px;
          font-weight: 700;
          font-size: 0.98rem;
          white-space: nowrap;
          opacity: 0;
          transform: translateX(20px) scale(0.85);
          pointer-events: none;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 6px 15px rgba(255, 153, 200, 0.3);
          z-index: 4;
        }

        .avatar-hover-menu-root:hover .avatar-hover-menu-tooltip {
          opacity: 1;
          transform: translateX(-14px) scale(1);
        }

        .avatar-hover-menu-options {
          position: absolute;
          right: -12px;
          bottom: calc(100% + 34px);
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-end;
          pointer-events: none;
          z-index: 5;
        }

        .avatar-hover-menu-item {
          background: #ffffff;
          border: 3px solid #ffd166;
          color: #475569;
          font-size: 1rem;
          font-weight: 700;
          padding: 10px 20px;
          border-radius: 22px;
          cursor: pointer;
          box-shadow: 0 4px 0 #ffd166, 0 8px 15px rgba(255, 209, 102, 0.15);
          opacity: 0;
          transform: translateY(18px) scale(0.82);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          transition-delay: var(--delay);
        }

        .avatar-hover-menu-root:hover .avatar-hover-menu-options {
          pointer-events: auto;
        }

        .avatar-hover-menu-root:hover .avatar-hover-menu-item {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .avatar-hover-menu-item:hover {
          background: #fff9db;
          color: #d97706;
          transform: translateY(-4px) scale(1.05) !important;
          box-shadow: 0 8px 0 #ffd166, 0 12px 20px rgba(255, 209, 102, 0.3);
          transition-delay: 0s !important;
        }
      `}</style>
    </div>
  )
}
