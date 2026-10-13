import { applyFallbackImage, formatPrice, getFallbackImage } from '../data/catalog';

function ProductQuantityControl({ product, cartQuantity, stockQuantity, hasStockLimit, isUnavailableForCart, onDecrease, onIncrease, showStockDetails = false, className = '' }) {
  const progress = showStockDetails && hasStockLimit && stockQuantity > 0
    ? Math.min(100, Math.round((cartQuantity / stockQuantity) * 100))
    : 0;
  const readoutTitle = isUnavailableForCart
    ? 'Unavailable'
    : showStockDetails && cartQuantity > 0 && hasStockLimit
      ? `${cartQuantity} / ${stockQuantity}`
      : cartQuantity > 0 ? `Qty ${cartQuantity}` : 'Add';
  const readoutDetail = showStockDetails && hasStockLimit
    ? isUnavailableForCart
      ? `${cartQuantity} in cart`
      : cartQuantity > 0
        ? `${Math.max(0, stockQuantity - cartQuantity)} left`
        : `${stockQuantity} in stock`
    : cartQuantity > 0 ? 'In cart' : 'Ready';

  return (
    <div className={`product-quantity-stepper inventory-widget${isUnavailableForCart ? ' unavailable' : ''} ${className}`.trim()} aria-label={`${product.name} cart quantity`}>
      <button type="button" aria-label={`Decrease ${product.name}`} disabled={cartQuantity === 0} onClick={onDecrease}>-</button>
      <div className="inventory-readout">
        <strong>{readoutTitle}</strong>
        <small>{readoutDetail}</small>
        {showStockDetails && hasStockLimit && <span className="inventory-bar" aria-hidden="true"><span style={{ width: `${progress}%` }} /></span>}
      </div>
      <button type="button" aria-label={isUnavailableForCart ? `${product.name} unavailable` : `Increase ${product.name}`} disabled={isUnavailableForCart} onClick={onIncrease}>+</button>
    </div>
  );
}

function ProductCard({ cartQuantity, hasStockLimit, isSaved, isUnavailableForCart, onDecrease, onIncrease, onOpen, onToggleWishlist, product, showStockDetails, stockLabel, stockQuantity }) {
  const displayStockLabel = isUnavailableForCart ? 'Unavailable' : stockLabel;

  return (
    <article className={`product-card${isUnavailableForCart ? ' stock-unavailable-card' : ''}`}>
      <span className={`product-badge${isUnavailableForCart ? ' unavailable-badge' : ''}`}>{isUnavailableForCart ? 'Unavailable' : product.badge}</span>
      <button className="image-button" type="button" onClick={onOpen}>
        <img src={product.image} alt={product.name} onError={(event) => applyFallbackImage(event, getFallbackImage(product.department))} />
      </button>
      <div className="product-info">
        <h3><button className="title-button" type="button" onClick={onOpen}>{product.name}</button></h3>
        <div className="rating" aria-label={`${product.rating} stars`}>
          <span>{product.rating}</span><span className="stars">*****</span>
          <button className="review-link" type="button" onClick={onOpen}>{product.reviews}</button>
        </div>
        <div className="price-row"><strong>{formatPrice(product.price)}</strong><span>{formatPrice(product.mrp)}</span></div>
        {displayStockLabel && <p className={`stock-status${isUnavailableForCart ? ' unavailable' : ''}`}>{displayStockLabel}</p>}
        <p>{product.details}</p>
        <div className="card-actions">
          <ProductQuantityControl product={product} cartQuantity={cartQuantity} stockQuantity={stockQuantity} hasStockLimit={hasStockLimit} isUnavailableForCart={isUnavailableForCart} onDecrease={onDecrease} onIncrease={onIncrease} showStockDetails={showStockDetails} />
          <button className="secondary-action" type="button" onClick={onToggleWishlist}>{isSaved ? 'Saved' : 'Wishlist'}</button>
        </div>
      </div>
    </article>
  );
}

export { ProductQuantityControl };
export default ProductCard;
