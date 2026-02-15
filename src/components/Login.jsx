import foodLogo from '../assets/food-logo.png'
import foodLogoWhite from '../assets/food-logo-white.png'

const Login = ({
  theme,
  email,
  password,
  authError,
  onEmailChange,
  onPasswordChange,
  onSubmit
}) => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand auth-brand">
          <img
            src={theme === 'dark' ? foodLogo : foodLogoWhite}
            alt="Food logo"
            style={{ width: 140, height: 70, objectFit: 'contain' }}
          />
          <p className="eyebrow brand-title">Smart Food Splitter</p>
        </div>
        <h2>Sign in</h2>
        <form className="auth-form" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
          </label>
          {authError && <p className="error">{authError}</p>}
          <button className="primary" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
