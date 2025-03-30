import React from 'react'

type IndicatorProps = {
  isActive: boolean
  title: string
  label: string
  color?: string
}

const Indicator: React.FC<IndicatorProps> = ({ isActive, title, label, color = '#f44336' }) => {
  return (
    <div className="indicator-with-label">
      <div 
        className={`indicator ${isActive ? 'active' : ''}`} 
        title={title}
        style={{ '--indicator-color': color } as React.CSSProperties}
      />
      <span className="indicator-label">{label}</span>
    </div>
  )
}

export default Indicator
