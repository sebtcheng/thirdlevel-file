export const APPLICANT_EXAM_DATA = {
  scenarios: [
    {
      id: 1,
      title: 'Scenario 1: Stakeholder Alignment',
      prompt: 'During an executive sprint review with regional directors, conflicting strategic priorities emerge regarding division budget allocations. How would you prioritize deliverables?',
      options: [
        'Convene an emergency executive session with division heads to align on statutory priorities.',
        'Adopt a data-driven resource allocation model weighted by regional enrollment and need.',
        'Defer contentious items to the next planning cycle while maintaining baseline operations.',
        'Escalate the trade-offs directly to the Executive Committee for institutional determination.'
      ]
    },
    ...Array.from({ length: 9 }, (_, i) => ({
      id: i + 2,
      title: `Scenario ${i + 2}: Executive Leadership`,
      prompt: `Strategic operational scenario ${i + 2} addressing institutional leadership and compliance governance.`,
      options: ['Option A', 'Option B', 'Option C', 'Option D']
    }))
  ],
  essays: [
    {
      id: 1,
      title: 'Essay 1: Mentorship and Accountability',
      prompt: 'Reflect on a close colleague who helped you settle into an executive leadership position. How did you balance mutual loyalty with institutional accountability during difficult management decisions?'
    },
    ...Array.from({ length: 4 }, (_, i) => ({
      id: i + 2,
      title: `Essay ${i + 2}: Strategic Governance`,
      prompt: `Discuss your executive strategy and operational methodology for managing complex public sector administrative challenges in case study ${i + 2}.`
    }))
  ],
  statements: [
    { id: 1, text: 'I am the life of the party.' },
    ...Array.from({ length: 49 }, (_, i) => ({
      id: i + 2,
      text: `Executive behavioral and leadership statement ${i + 2}.`
    }))
  ],
  sets: [
    {
      id: 1,
      options: [
        'Decisive in crises',
        'Consensus-builder across diverse stakeholder groups',
        'Strictly adheres to procedural guidelines'
      ]
    },
    ...Array.from({ length: 19 }, (_, i) => ({
      id: i + 2,
      options: [`Set ${i + 2} Attribute A`, `Set ${i + 2} Attribute B`, `Set ${i + 2} Attribute C`]
    }))
  ]
};

