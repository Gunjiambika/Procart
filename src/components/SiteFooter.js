function SiteFooter({ sections, onBackToTop, onHome }) {
  return (
    <footer className="site-footer">
      <button className="back-to-top" type="button" onClick={onBackToTop}>
        Back to top
      </button>
      <div className="footer-main">
        {sections.map((section) => (
          <section className="footer-column" key={section.title}>
            <h2>{section.title}</h2>
            {section.links.map((link) => (
              <a href="#footer" key={link}>
                {link}
              </a>
            ))}
          </section>
        ))}
      </div>
      <div className="footer-brand-row">
        <button className="brand footer-brand" type="button" onClick={onHome} aria-label="ProCart home">
          <span className="brand-mark">pc</span>
          <span className="brand-title">ProCart</span>
        </button>
        <div className="footer-pills">
          <span>English</span>
          <span>India</span>
          <span>Secure shopping</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>Conditions of Use</span>
        <span>Privacy Notice</span>
        <span>Interest-Based Ads</span>
        <strong>2026 ProCart marketplace</strong>
      </div>
    </footer>
  );
}

export default SiteFooter;
