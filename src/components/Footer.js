import { useState } from 'react';

const shopLinks = [
  { label: "Today's Deals", target: 'department:all' },
  { label: 'Men', target: 'department:men' },
  { label: 'Women', target: 'department:women' },
  { label: 'Kids', target: 'department:kids' },
  { label: 'Beauty', target: 'department:beauty' },
  { label: 'Accessories', target: 'department:accessories' },
];

const accountLinks = [
  { label: 'My profile', target: 'profile' },
  { label: 'My cart', target: 'cart' },
  { label: 'Wishlist', target: 'wishlist' },
  { label: 'Order history', target: 'profile' },
];

function Footer({ isSignedIn, onBackToTop, onHome, onNavigate }) {
  const [email, setEmail] = useState('');
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [newsletterError, setNewsletterError] = useState(false);
  const [legalNotice, setLegalNotice] = useState('');
  const currentYear = new Date().getFullYear();

  const handleSubscribe = (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    setNewsletterError(!isValid);
    setNewsletterMessage(isValid ? 'Thank you! ProCart offers will be sent to your inbox.' : 'Enter a valid email address to subscribe.');
    if (isValid) setEmail('');
  };

  return (
    <footer className="site-footer" id="site-footer">
      <button className="back-to-top" type="button" onClick={onBackToTop}><span aria-hidden="true">↑</span> Back to top</button>
      <div className="footer-main professional-footer">
        <section className="footer-about" aria-labelledby="footer-brand-title">
          <button className="brand footer-brand" type="button" onClick={onHome} aria-label="ProCart home">
            <span className="brand-mark">pc</span><span className="brand-title" id="footer-brand-title">ProCart</span>
          </button>
          <p>Simple, secure shopping with trusted products, quick delivery and helpful support.</p>
          <div className="footer-contact">
            <a href="mailto:support@procart.com">support@procart.com</a>
            <a href="tel:+919876543210">+91 98765 43210</a>
            <span>Mon–Sat · 9:00 AM–6:00 PM</span>
          </div>
        </section>
        <section className="footer-column" aria-labelledby="footer-shop-title">
          <h2 id="footer-shop-title">Shop</h2>
          {shopLinks.map((link) => <button type="button" onClick={() => onNavigate(link.target)} key={link.label}>{link.label}</button>)}
        </section>
        <section className="footer-column" aria-labelledby="footer-account-title">
          <h2 id="footer-account-title">My account</h2>
          {!isSignedIn && <button type="button" onClick={() => onNavigate('login')}>Account access</button>}
          {accountLinks.map((link) => <button type="button" onClick={() => onNavigate(link.target)} key={link.label}>{link.label}</button>)}
        </section>
        <section className="footer-newsletter" aria-labelledby="newsletter-title">
          <p className="footer-kicker">Offers & updates</p>
          <h2 id="newsletter-title">Stay in the ProCart loop</h2>
          <p>Get new arrivals, useful shopping tips and member-only deals.</p>
          <form onSubmit={handleSubscribe} noValidate>
            <label htmlFor="footer-email">Email address</label>
            <div className="newsletter-control">
              <input id="footer-email" type="email" value={email} placeholder="you@example.com" onChange={(event) => setEmail(event.target.value)} aria-describedby={newsletterMessage ? 'newsletter-message' : undefined} />
              <button type="submit">Subscribe</button>
            </div>
          </form>
          {newsletterMessage && <p className={`newsletter-message${newsletterError ? ' error' : ''}`} id="newsletter-message" role={newsletterError ? 'alert' : 'status'}>{newsletterMessage}</p>}
        </section>
      </div>
      <section className="footer-trust" aria-label="Shopping benefits">
        <span><strong>Secure payments</strong><small>Protected checkout</small></span>
        <span><strong>Fast delivery</strong><small>Reliable dispatch</small></span>
        <span><strong>Easy returns</strong><small>7-day replacement</small></span>
        <span><strong>Customer support</strong><small>Help when needed</small></span>
      </section>
      <div className="footer-payment-row">
        <span>Accepted payments</span>
        <div aria-label="Accepted payment methods">{['UPI', 'Visa', 'Mastercard', 'RuPay', 'Net Banking', 'Cash on Delivery'].map((method) => <span key={method}>{method}</span>)}</div>
      </div>
      <div className="footer-bottom">
        <div className="footer-legal-links">
          {['Terms of use', 'Privacy notice', 'Returns policy'].map((item) => <button type="button" onClick={() => setLegalNotice(`${item} information is available from ProCart support.`)} key={item}>{item}</button>)}
        </div>
        <strong>© {currentYear} ProCart. All rights reserved.</strong>
        {legalNotice && <span className="footer-legal-notice" role="status">{legalNotice}</span>}
      </div>
    </footer>
  );
}

export default Footer;
