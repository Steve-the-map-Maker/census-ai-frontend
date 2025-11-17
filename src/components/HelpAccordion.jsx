import { useState } from 'react'
import PropTypes from 'prop-types'

function HelpAccordion({ sections, onSelectPrompt }) {
  const [openSection, setOpenSection] = useState(sections[0]?.id ?? null)

  const toggleSection = (id) => {
    setOpenSection((prev) => (prev === id ? null : id))
  }

  return (
    <div className="help-accordion" role="region" aria-label="Helpful shortcuts">
      {sections.map((section) => {
        const isOpen = openSection === section.id
        return (
          <article key={section.id} className={`accordion-item ${isOpen ? 'open' : ''}`}>
            <button
              type="button"
              className="accordion-trigger"
              aria-expanded={isOpen}
              onClick={() => toggleSection(section.id)}
            >
              <div>
                <p className="accordion-eyebrow">{section.eyebrow}</p>
                <h4>{section.title}</h4>
              </div>
              <span aria-hidden>{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className="accordion-panel">
                {section.body && <p className="accordion-body-text">{section.body}</p>}
                {Array.isArray(section.list) && (
                  <ul>
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {Array.isArray(section.prompts) && (
                  <div className="accordion-prompts">
                    {section.prompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="pill"
                        onClick={() => onSelectPrompt(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

HelpAccordion.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      eyebrow: PropTypes.string,
      body: PropTypes.string,
      list: PropTypes.arrayOf(PropTypes.string),
      prompts: PropTypes.arrayOf(PropTypes.string),
    })
  ).isRequired,
  onSelectPrompt: PropTypes.func.isRequired,
}

export default HelpAccordion
