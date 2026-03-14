import PropTypes from 'prop-types'

const quickPrompts = [
  {
    label: 'Map Population Hotspots',
    prompt: 'Show population by state and highlight the top 5 states',
    icon: '📊',
  },
  {
    label: 'Spot Gender Imbalances',
    prompt: 'Which states have more men than women?',
    icon: '👥',
  },
  {
    label: 'Median Income Map',
    prompt: 'Map median household income by county in California',
    icon: '💰',
  },
  {
    label: 'Time-Series Story',
    prompt: 'How has unemployment changed over time for Texas?',
    icon: '⏱️',
  },
]

const highlightCards = [
  {
    title: 'Natural-language chat',
    body: 'Ask plain-English questions and we orchestrate the right Census tools for you.',
    icon: '💬',
  },
  {
    title: 'Interactive dashboards',
    body: 'Let the AI build charts, tables, and filtering controls automatically.',
    icon: '📈',
  },
  {
    title: 'Animated time-series',
    body: 'Scrub through years or auto-play to watch demographic shifts unfold.',
    icon: '🎞️',
  },
]

const steps = [
  'Pick a question or use a quick-start prompt',
  'AI fetches Census APIs + enriches the results',
  'Explore maps, dashboards, and time-series views',
]

const insightStats = [
  { label: 'States covered', value: '50 + DC' },
  { label: 'County records', value: '3,143' },
  { label: 'Variables mapped', value: '120+' },
]

function HomeLanding({ onStartChat, onSelectPrompt }) {
  return (
    <div className="home-landing">
      <section className="home-hero"> 
        <h1>Ask anything about U.S. Census data and watch it visualize instantly.</h1>
        <p className="hero-body">
          Combine conversational AI with geo visualizations, dashboards, and time-series sliders built
          on top of official Census Bureau datasets.
        </p>
        <div className="home-hero-actions">
          <button className="btn primary" onClick={onStartChat}>
            Start asking
          </button>
          <button className="btn ghost" onClick={() => onSelectPrompt('Give me a guided tour of the Census AI Visualizer features')}>
            See a guided tour
          </button>
        </div>
      </section>

      <section className="home-panel">
        <div className="panel-header">
          <h2>Jump in with a quick-start prompt</h2>
          <p>Tap to auto-fill the composer. You can edit the text before sending.</p>
        </div>
        <div className="home-quick-grid">
          {quickPrompts.map((item) => (
            <button
              key={item.label}
              className="quick-card"
              onClick={() => onSelectPrompt(item.prompt)}
            >
              <span className="quick-icon" aria-hidden>
                {item.icon}
              </span>
              <div>
                <p className="quick-label">{item.label}</p>
                <p className="quick-prompt">{item.prompt}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="home-panel">
        <div className="panel-header">
          <h2>Why analysts love this workspace</h2>
          <p>Purpose-built for demos—fast, delightful, and optimized for every screen size.</p>
        </div>
        <div className="home-highlight-cards">
          {highlightCards.map((card) => (
            <article key={card.title} className="highlight-card">
              <span className="highlight-icon" aria-hidden>
                {card.icon}
              </span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-panel split">
        <div className="panel-stack">
          <h2>How it works</h2>
          <ol className="flow-list">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <div className="panel-stack stats">
          <h2>Coverage snapshot</h2>
          <div className="insight-stats">
            {insightStats.map((stat) => (
              <div key={stat.label} className="stat">
                <p className="stat-value">{stat.value}</p>
                <p className="stat-label">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

HomeLanding.propTypes = {
  onStartChat: PropTypes.func.isRequired,
  onSelectPrompt: PropTypes.func.isRequired,
}

export default HomeLanding
