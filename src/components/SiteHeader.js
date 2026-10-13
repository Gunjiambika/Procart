function SiteHeader({
  authStatus,
  cartItemCount,
  currentUser,
  firstName,
  isAdmin,
  navItems,
  onAdmin,
  onAdminLogin,
  onCart,
  onDepartment,
  onHome,
  onLogin,
  onLogout,
  onProfile,
  onSearch,
  onSearchTermChange,
  onWishlist,
  searchOptions,
  searchTerm,
  wishlistCount,
}) {
  return (
    <header className="site-header">
      <div className="header-main">
        <div className="brand-cluster">
          <button className="brand" type="button" onClick={onHome} aria-label="ProCart home">
            <span className="brand-mark">pc</span>
            <span className="brand-title">ProCart</span>
          </button>
        </div>

        <form className="search" aria-label="Product search" onSubmit={onSearch}>
          <input
            type="search"
            list="procart-search-options"
            placeholder="Search products, brands and deals"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
          />
          <datalist id="procart-search-options">
            {searchOptions.map((option) => (
              <option value={option} key={option} />
            ))}
          </datalist>
          <button type="submit" aria-label="Search">
            Search
          </button>
        </form>

        <nav className="account-nav" aria-label="Account navigation">
          {currentUser ? (
            <>
              <button type="button" onClick={onProfile}>
                Hi, {firstName}
              </button>
              {isAdmin && (
                <button type="button" onClick={onAdmin}>
                  Admin
                </button>
              )}
              <button type="button" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onLogin}>
                {authStatus === 'checking' ? 'Checking' : 'Login'}
              </button>
              <button type="button" onClick={onAdminLogin}>
                Admin Login
              </button>
            </>
          )}
          <button type="button" onClick={onWishlist}>
            Wishlist
            <span>{wishlistCount}</span>
          </button>
          <button className="cart-link" type="button" onClick={onCart}>
            Cart
            <span className="cart-count">{cartItemCount}</span>
          </button>
        </nav>
      </div>

      <nav className="primary-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button type="button" onClick={() => onDepartment(item.departmentId)} key={item.label}>
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

export default SiteHeader;
