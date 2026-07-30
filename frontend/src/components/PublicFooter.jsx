import { Link } from 'react-router-dom';

export default function PublicFooter() {
  return (
    <footer className="public-footer" role="contentinfo">
      <div className="public-footer-inner">
        <span className="public-footer-text">
          डिजिटल संचार साथी · Jharkhand Health WiFi Complaint Management
        </span>
        <Link to="/login" className="public-footer-link">
          कर्मचारी प्रवेश · Staff access
        </Link>
      </div>
    </footer>
  );
}
