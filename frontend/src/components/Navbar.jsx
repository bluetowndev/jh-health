import useTheme from '../hooks/useTheme';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar-inner navbar-inner--public">
        <div className="navbar-public-center">
          <span className="navbar-public-title">डिजिटल संचार साथी</span>
          <span className="navbar-public-subtitle">स्वास्थ्य और संचार, हर कदम आपके साथ</span>
        </div>
        <div className="navbar-public-right">
          <button type="button" className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? '☀️' : '🌙'}</button>
        </div>
      </div>
    </nav>
  );
}
