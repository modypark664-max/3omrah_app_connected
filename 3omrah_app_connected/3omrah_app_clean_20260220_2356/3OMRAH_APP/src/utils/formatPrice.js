const DEFAULT_OPTIONS = {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0
};

const formatPrice = (value = 0, options = {}) => {
  const numericValue = Number(value) || 0;
  const formatterOptions = {
    ...DEFAULT_OPTIONS,
    ...options
  };

  try {
    const formatter = new Intl.NumberFormat('en-US', formatterOptions);
    return formatter.format(numericValue);
  } catch (_error) {
    return `${numericValue}`;
  }
};

export default formatPrice;
