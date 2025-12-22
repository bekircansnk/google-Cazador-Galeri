import React from 'react'

interface PageHeroProps {
    title: string
    subtitle?: React.ReactNode
    backgroundUrl?: string | null
    actions?: React.ReactNode
}

export default function PageHero({ title, subtitle, actions }: PageHeroProps) {
    return (
        <div className="page-hero">


            <div className="page-hero-content">
                <div className="hero-brand">
                    <img src="/logo-new.png" alt="Cazador" className="hero-logo" />
                </div>

                <h1 className="hero-title">{title}</h1>

                {subtitle && <div className="hero-subtitle">{subtitle}</div>}

                {actions && <div className="hero-actions">{actions}</div>}
            </div>
        </div>
    )
}
