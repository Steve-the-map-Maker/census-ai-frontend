export function deriveAvailableYears(metadata = {}, data = []) {
  const yearSet = new Set();

  if (Array.isArray(metadata.years_available)) {
    metadata.years_available.forEach((year) => {
      const numericYear = Number(year);
      if (!Number.isNaN(numericYear)) {
        yearSet.add(numericYear);
      }
    });
  }

  if (yearSet.size === 0 && Array.isArray(metadata.years_requested)) {
    metadata.years_requested.forEach((year) => {
      const numericYear = Number(year);
      if (!Number.isNaN(numericYear)) {
        yearSet.add(numericYear);
      }
    });
  }

  if (yearSet.size === 0 && Number.isInteger(metadata.start_year) && Number.isInteger(metadata.end_year)) {
    for (let year = metadata.start_year; year <= metadata.end_year; year += 1) {
      yearSet.add(year);
    }
  }

  if (yearSet.size === 0 && Array.isArray(data)) {
    data.forEach((row) => {
      const numericYear = Number(row?.year);
      if (!Number.isNaN(numericYear)) {
        yearSet.add(numericYear);
      }
    });
  }

  return Array.from(yearSet).sort((a, b) => a - b);
}

export function resolveDefaultYear(years, metadata = {}) {
  if (Array.isArray(years) && years.length) {
    return years[years.length - 1];
  }
  if (Number.isInteger(metadata.end_year)) {
    return Number(metadata.end_year);
  }
  if (Number.isInteger(metadata.start_year)) {
    return Number(metadata.start_year);
  }
  return null;
}
