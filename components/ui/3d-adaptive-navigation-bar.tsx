import React, { useState, useRef, useEffect } from 'react'
import { motion, useSpring, AnimatePresence } from 'framer-motion'

export interface NavItem {
  label: string
  id: string
}

export interface PillBaseProps {
  items?: NavItem[]
  activeId?: string
  onChange?: (id: string) => void
  theme?: 'glass' | 'dark' | 'light'
  height?: number
  collapsedWidth?: number
  expandedWidth?: number
  className?: string
}

const DEFAULT_ITEMS: NavItem[] = [
  { label: 'Home', id: 'home' },
  { label: 'Problem', id: 'problem' },
  { label: 'Solution', id: 'solution' },
  { label: 'Contact', id: 'contact' },
]

/**
 * 3D Adaptive Navigation Pill
 * Smart navigation with scroll detection, 3D specular light catch, and hover expansion
 */
export const PillBase: React.FC<PillBaseProps> = ({
  items,
  activeId,
  onChange,
  theme = 'dark',
  height = 44,
  collapsedWidth = 136,
  expandedWidth = 590,
  className = '',
}) => {
  const navItems = items || DEFAULT_ITEMS
  const isControlled = activeId !== undefined

  const [internalActive, setInternalActive] = useState<string>(() => activeId || navItems[0]?.id || 'home')
  const [expanded, setExpanded] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentActive = isControlled ? (activeId || navItems[0]?.id) : internalActive

  // Spring animations for ultra-smooth fluid motion
  const pillWidth = useSpring(collapsedWidth, { stiffness: 220, damping: 25, mass: 0.9 })
  const pillShift = useSpring(0, { stiffness: 220, damping: 25, mass: 1 })

  // Handle hover expansion
  useEffect(() => {
    if (hovering) {
      setExpanded(true)
      pillWidth.set(expandedWidth)
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setExpanded(false)
        pillWidth.set(collapsedWidth)
      }, 550)
    }

    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [hovering, pillWidth, collapsedWidth, expandedWidth])

  const handleMouseEnter = () => {
    setHovering(true)
  }

  const handleMouseLeave = () => {
    setHovering(false)
  }

  const handleSectionClick = (sectionId: string) => {
    setIsTransitioning(true)
    if (!isControlled) {
      setInternalActive(sectionId)
    }
    if (onChange) {
      onChange(sectionId)
    }
    
    // Collapse the pill after selection
    setHovering(false)
    
    setTimeout(() => {
      setIsTransitioning(false)
    }, 400)
  }

  const activeItem = navItems.find((item) => item.id === currentActive) || navItems[0]
  const isGlass = theme === 'glass'
  const isDark = theme === 'dark' || isGlass

  return (
    <motion.nav
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-full select-none cursor-pointer ${className}`}
      style={{
        width: pillWidth,
        height: `${height}px`,
        backdropFilter: isGlass ? 'blur(28px) saturate(190%)' : undefined,
        WebkitBackdropFilter: isGlass ? 'blur(28px) saturate(190%)' : undefined,
        background: isGlass
          ? `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.16) 0%, 
              rgba(255, 255, 255, 0.07) 30%, 
              rgba(255, 255, 255, 0.03) 65%, 
              rgba(255, 255, 255, 0.11) 100%
            )
          `
          : isDark
          ? `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.22) 0%, 
              rgba(255, 255, 255, 0.12) 15%, 
              rgba(40, 46, 62, 0.88) 35%, 
              rgba(22, 26, 38, 0.95) 60%, 
              rgba(12, 14, 20, 0.98) 100%
            )
          `
          : `
            linear-gradient(135deg, 
              #fcfcfd 0%, 
              #f8f8fa 15%, 
              #f3f4f6 30%, 
              #eeeff2 45%, 
              #e9eaed 60%, 
              #e4e5e8 75%, 
              #dee0e3 90%, 
              #e2e3e6 100%
            )
          `,
        boxShadow: isGlass
          ? expanded
            ? `
              0 16px 40px rgba(0, 0, 0, 0.55),
              0 0 24px rgba(255, 255, 255, 0.18),
              inset 0 1.5px 1.5px rgba(255, 255, 255, 0.65),
              inset 0 -2px 6px rgba(0, 0, 0, 0.35)
            `
            : `
              0 8px 25px rgba(0, 0, 0, 0.4),
              inset 0 1.5px 1px rgba(255, 255, 255, 0.55),
              inset 0 -2px 5px rgba(0, 0, 0, 0.25)
            `
          : isDark
          ? expanded
            ? `
              0 4px 12px rgba(0, 0, 0, 0.5),
              0 12px 28px rgba(0, 0, 0, 0.6),
              0 0 24px rgba(255, 255, 255, 0.12),
              inset 0 2px 2px rgba(255, 255, 255, 0.6),
              inset 0 -3px 8px rgba(0, 0, 0, 0.6),
              inset 2px 2px 8px rgba(255, 255, 255, 0.1),
              inset -2px 2px 8px rgba(0, 0, 0, 0.4)
            `
            : `
              0 4px 16px rgba(0, 0, 0, 0.45),
              0 1px 3px rgba(0, 0, 0, 0.3),
              inset 0 1.5px 1px rgba(255, 255, 255, 0.65),
              inset 0 -2px 6px rgba(0, 0, 0, 0.45),
              inset 0 0 15px rgba(255, 255, 255, 0.1)
            `
          : expanded
          ? `
            0 2px 4px rgba(0, 0, 0, 0.08),
            0 6px 12px rgba(0, 0, 0, 0.12),
            0 12px 24px rgba(0, 0, 0, 0.14),
            0 24px 48px rgba(0, 0, 0, 0.10),
            inset 0 2px 2px rgba(255, 255, 255, 0.8),
            inset 0 -3px 8px rgba(0, 0, 0, 0.12),
            inset 3px 3px 8px rgba(0, 0, 0, 0.10),
            inset -3px 3px 8px rgba(0, 0, 0, 0.09),
            inset 0 -1px 2px rgba(0, 0, 0, 0.08)
          `
          : isTransitioning
          ? `
            0 3px 6px rgba(0, 0, 0, 0.10),
            0 8px 16px rgba(0, 0, 0, 0.08),
            0 16px 32px rgba(0, 0, 0, 0.06),
            0 1px 2px rgba(0, 0, 0, 0.10),
            inset 0 2px 1px rgba(255, 255, 255, 0.85),
            inset 0 -2px 6px rgba(0, 0, 0, 0.08),
            inset 2px 2px 8px rgba(0, 0, 0, 0.06),
            inset -2px 2px 8px rgba(0, 0, 0, 0.05),
            inset 0 0 1px rgba(0, 0, 0, 0.12),
            inset 0 0 20px rgba(255, 255, 255, 0.15)
          `
          : `
            0 3px 6px rgba(0, 0, 0, 0.12),
            0 8px 16px rgba(0, 0, 0, 0.10),
            0 16px 32px rgba(0, 0, 0, 0.08),
            0 1px 2px rgba(0, 0, 0, 0.12),
            inset 0 2px 1px rgba(255, 255, 255, 0.7),
            inset 0 -2px 6px rgba(0, 0, 0, 0.10),
            inset 2px 2px 8px rgba(0, 0, 0, 0.08),
            inset -2px 2px 8px rgba(0, 0, 0, 0.07),
            inset 0 0 1px rgba(0, 0, 0, 0.15)
          `,
        x: pillShift,
        overflow: 'hidden',
        transition: 'box-shadow 0.3s ease-out',
      }}
    >
      {/* Primary top edge ridge - ultra bright 3D specular highlight */}
      <div 
        className="absolute inset-x-0 top-0 rounded-t-full pointer-events-none"
        style={{
          height: '2px',
          background: isDark
            ? 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.95) 10%, rgba(255, 255, 255, 1) 35%, rgba(255, 255, 255, 1) 65%, rgba(255, 255, 255, 0.95) 90%, rgba(255, 255, 255, 0) 100%)'
            : 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.95) 5%, rgba(255, 255, 255, 1) 15%, rgba(255, 255, 255, 1) 85%, rgba(255, 255, 255, 0.95) 95%, rgba(255, 255, 255, 0) 100%)',
          filter: 'blur(0.3px)',
        }}
      />
      
      {/* Top hemisphere light catch */}
      <div 
        className="absolute inset-x-0 top-0 rounded-full pointer-events-none"
        style={{
          height: '55%',
          background: isDark
            ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.15) 30%, rgba(255, 255, 255, 0.04) 60%, rgba(255, 255, 255, 0) 100%)'
            : 'linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.25) 30%, rgba(255, 255, 255, 0.10) 60%, rgba(255, 255, 255, 0) 100%)',
        }}
      />
      
      {/* Directional light - top left */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.30) 0%, rgba(255, 255, 255, 0.12) 20%, rgba(255, 255, 255, 0.04) 40%, rgba(255, 255, 255, 0) 65%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.40) 0%, rgba(255, 255, 255, 0.20) 20%, rgba(255, 255, 255, 0.08) 40%, rgba(255, 255, 255, 0) 65%)',
        }}
      />
      
      {/* Premium gloss reflection - main */}
      <div 
        className="absolute rounded-full pointer-events-none"
        style={{
          left: expanded ? '15%' : '14%',
          top: '14%',
          width: expanded ? '140px' : '60px',
          height: '12px',
          background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.70) 0%, rgba(255, 255, 255, 0.35) 40%, rgba(255, 255, 255, 0.10) 70%, rgba(255, 255, 255, 0) 100%)',
          filter: 'blur(3px)',
          transform: 'rotate(-10deg)',
          transition: 'all 0.3s ease',
        }}
      />
      
      {/* Secondary gloss accent - only show when expanded */}
      {expanded && (
        <div 
          className="absolute rounded-full pointer-events-none"
          style={{
            right: '20%',
            top: '18%',
            width: '80px',
            height: '9px',
            background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.50) 0%, rgba(255, 255, 255, 0.15) 60%, rgba(255, 255, 255, 0) 100%)',
            filter: 'blur(2.5px)',
            transform: 'rotate(7deg)',
          }}
        />
      )}
      
      {/* Left edge illumination */}
      {expanded && (
        <div 
          className="absolute inset-y-0 left-0 rounded-l-full pointer-events-none"
          style={{
            width: '30%',
            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.08) 40%, transparent 100%)',
          }}
        />
      )}
      
      {/* Right edge shadow */}
      {expanded && (
        <div 
          className="absolute inset-y-0 right-0 rounded-r-full pointer-events-none"
          style={{
            width: '30%',
            background: 'linear-gradient(270deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.08) 40%, transparent 100%)',
          }}
        />
      )}
      
      {/* Bottom curvature - deep shadow */}
      <div 
        className="absolute inset-x-0 bottom-0 rounded-b-full pointer-events-none"
        style={{
          height: '45%',
          background: isDark
            ? 'linear-gradient(0deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.15) 50%, transparent 100%)'
            : 'linear-gradient(0deg, rgba(0, 0, 0, 0.14) 0%, rgba(0, 0, 0, 0.08) 25%, rgba(0, 0, 0, 0.03) 50%, rgba(0, 0, 0, 0) 100%)',
        }}
      />

      {/* Inner diffuse glow */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: isDark
            ? 'inset 0 0 30px rgba(255, 255, 255, 0.18)'
            : 'inset 0 0 40px rgba(255, 255, 255, 0.22)',
          opacity: 0.8,
        }}
      />
      
      {/* Micro edge definition */}
      <div 
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow: isDark
            ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.22)'
            : 'inset 0 0 0 0.5px rgba(0, 0, 0, 0.10)',
        }}
      />

      {/* Navigation items container */}
      <div 
        ref={containerRef}
        className="relative z-10 h-full flex items-center justify-center px-4"
        style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "SF Pro", Poppins, sans-serif',
        }}
      >
        {/* Collapsed state - show active section with smooth transition & 3D text emboss */}
        {!expanded && (
          <div className="flex items-center justify-center relative w-full">
            <AnimatePresence mode="wait">
              {activeItem && (
                <motion.span
                  key={activeItem.id}
                  initial={{ opacity: 0, y: 6, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -6, filter: 'blur(3px)' }}
                  transition={{
                    duration: 0.28,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: isDark ? '#ffffff' : '#1a1a1a',
                    letterSpacing: '0.4px',
                    whiteSpace: 'nowrap',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textShadow: isDark
                      ? `
                        0 1px 2px rgba(0, 0, 0, 0.9),
                        0 0 10px rgba(255, 255, 255, 0.4),
                        0 -1px 0 rgba(255, 255, 255, 0.3)
                      `
                      : `
                        0 1px 0 rgba(0, 0, 0, 0.35),
                        0 -1px 0 rgba(255, 255, 255, 0.8),
                        1px 1px 0 rgba(0, 0, 0, 0.18),
                        -1px 1px 0 rgba(0, 0, 0, 0.15)
                      `,
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]" />
                  <span>{activeItem.label}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Expanded state - show all sections with stagger and interactive spring hover */}
        {expanded && (
          <div className="flex items-center justify-between w-full gap-1">
            {navItems.map((item, index) => {
              const isActive = item.id === currentActive
              
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ 
                    delay: index * 0.05,
                    duration: 0.22,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  onClick={() => handleSectionClick(item.id)}
                  className="relative cursor-pointer transition-all duration-200 px-3 py-1.5 rounded-full flex items-center justify-center"
                  style={{
                    fontSize: isActive ? '13.5px' : '13px',
                    fontWeight: isActive ? 700 : 500,
                    color: isDark
                      ? isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.65)'
                      : isActive ? '#1a1a1a' : '#656565',
                    textDecoration: 'none',
                    letterSpacing: '0.35px',
                    background: isActive ? (isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.05)') : 'transparent',
                    border: 'none',
                    outline: 'none',
                    whiteSpace: 'nowrap',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                    boxShadow: isActive ? 'inset 0 1px 1px rgba(255, 255, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)' : 'none',
                    textShadow: isDark
                      ? isActive
                        ? `
                          0 1px 2px rgba(0, 0, 0, 0.9),
                          0 0 10px rgba(255, 255, 255, 0.5)
                        `
                        : '0 1px 2px rgba(0, 0, 0, 0.6)'
                      : isActive 
                      ? `
                        0 1px 0 rgba(0, 0, 0, 0.35),
                        0 -1px 0 rgba(255, 255, 255, 0.8),
                        1px 1px 0 rgba(0, 0, 0, 0.18),
                        -1px 1px 0 rgba(0, 0, 0, 0.15)
                      `
                      : `
                        0 1px 0 rgba(0, 0, 0, 0.22),
                        0 -1px 0 rgba(255, 255, 255, 0.65),
                        1px 1px 0 rgba(0, 0, 0, 0.12),
                        -1px 1px 0 rgba(0, 0, 0, 0.10)
                      `,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = isDark ? '#ffffff' : '#3a3a3a'
                      e.currentTarget.style.transform = 'translateY(-1px) scale(1.04)'
                      e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.03)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = isDark ? 'rgba(255, 255, 255, 0.65)' : '#656565'
                      e.currentTarget.style.transform = 'translateY(0) scale(1)'
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {item.label}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </motion.nav>
  )
}
