const parseNumber = (string, isInteger = false) => {
    if (!string) return null;
    const cleaned = string.replace(/[^\d,.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    return isInteger ? Math.round(num) : num;
  };

module.exports = { parseNumber };