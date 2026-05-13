// Global animations helper with keyframes and utilities

export const animationStyles = `
  @keyframes riseIn {
    from { transform: translateY(16px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @keyframes slideInLeft {
    from { transform: translateX(-16px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideInRight {
    from { transform: translateX(16px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.92); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes shimmer {
    0% { background-position: -1000px 0; }
    100% { background-position: 1000px 0; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @keyframes streak {
    0% { transform: translateX(-26%) rotate(-7deg); opacity: 0; }
    10% { opacity: 0.35; }
    80% { opacity: 0.25; }
    100% { transform: translateX(18%) rotate(-7deg); opacity: 0; }
  }

  @keyframes slideDown {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  .anime-container {
    --stagger: 0.06s;
  }

  .anime-item {
    animation: riseIn 0.6s ease-out backwards;
  }

  .anime-header {
    animation: riseIn 0.6s ease-out 0.05s backwards;
  }

  .anime-card {
    animation: scaleIn 0.5s ease-out backwards;
  }

  .anime-row {
    animation: slideInLeft 0.5s ease-out backwards;
  }

  .anime-badge {
    animation: pulse 2s ease-in-out infinite;
  }
`;

// Helper to generate staggered animation delay
export const getStaggerDelay = (index, delayUnit = 0.06) => ({
  animation: `riseIn 0.6s ease-out ${index * delayUnit}s backwards`
});

// Helper to create shimmer effect
export const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 100%)',
  backgroundSize: '1000px 100%',
  animation: 'shimmer 2s infinite'
};
