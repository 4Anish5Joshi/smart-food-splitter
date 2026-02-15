import foodLogo from '../assets/food-logo.png'
import foodLogoWhite from '../assets/food-logo-white.png'

const Header = ({
  theme,
  hasSplit,
  onToggleTheme,
  onLogout,
  onOpenAnalyzer
}) => {
  return (
    <div className="brand">
      <img
        src={theme === 'dark' ? foodLogo : foodLogoWhite}
        alt="Food logo"
        style={{ width: 140, height: 70, objectFit: 'contain' }}
      />
      <p className="eyebrow brand-title">Smart Food Splitter</p>
      <button className="ghost small logout-btn" onClick={onLogout}>
        Logout
      </button>
      {hasSplit && (
        <button
          className="ghost small"
          onClick={onOpenAnalyzer}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          📊 Spend analyzer
        </button>
      )}
      <button className="ghost small theme-toggle" onClick={onToggleTheme}>
        {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
      </button>
    </div>
  )
}

export default Header
