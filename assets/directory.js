(() => {
  const cards = Array.from(document.querySelectorAll('[data-provider-card]'));
  if (!cards.length) return;

  const search = document.getElementById('installer-search');
  const filters = {
    city: document.getElementById('city-filter'),
    charger: document.getElementById('charger-filter'),
    property: document.getElementById('property-filter'),
    electrical: document.getElementById('electrical-filter')
  };
  const resultsCount = document.getElementById('results-count');
  const emptyState = document.getElementById('empty-results');
  const clearFilters = document.getElementById('clear-filters');
  const tray = document.getElementById('compare-tray');
  const compareResults = document.getElementById('compare-results');
  const compareCount = document.getElementById('compare-count');
  const compareMessage = document.getElementById('compare-message');
  const clearCompare = document.getElementById('clear-compare');
  const selected = new Map();

  function tokenize(value) {
    return (value || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  function cardTokens(card, key) {
    return tokenize(card.dataset[key] || '');
  }

  function hasToken(card, key, value) {
    return !value || cardTokens(card, key).includes(value);
  }

  function selectedFromCard(card) {
    const summary = card.dataset.featureLabels || 'Public-source profile needs provider confirmation';
    return {
      slug: card.dataset.provider || '',
      name: card.dataset.name || 'Installer',
      base: card.dataset.base || 'Base location: DFW',
      summary,
      hidden: card.hidden
    };
  }

  function renderCompare() {
    if (!tray || !compareResults) return;
    compareResults.replaceChildren();
    const items = Array.from(selected.values());
    if (compareCount) {
      compareCount.textContent = `${items.length} of 3 selected`;
    }
    tray.hidden = items.length === 0;
    items.forEach((item) => {
      const result = document.createElement('div');
      result.className = 'compare-result';

      const name = document.createElement('strong');
      name.textContent = item.name;
      result.append(name);

      const base = document.createElement('p');
      base.className = 'meta';
      base.textContent = item.hidden ? `${item.base} (hidden by current filters)` : item.base;
      result.append(base);

      const summary = document.createElement('p');
      summary.textContent = item.summary;
      result.append(summary);

      compareResults.append(result);
    });
  }

  function syncSelectedCards() {
    cards.forEach((card) => {
      const slug = card.dataset.provider || '';
      if (selected.has(slug)) {
        selected.set(slug, selectedFromCard(card));
      }
    });
    renderCompare();
  }

  function updateUrl() {
    if (!window.history || !window.URLSearchParams) return;
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const q = search ? search.value.trim() : '';
    const pairs = [
      ['q', q],
      ['city', filters.city ? filters.city.value : ''],
      ['charger', filters.charger ? filters.charger.value : ''],
      ['property', filters.property ? filters.property.value : ''],
      ['electrical', filters.electrical ? filters.electrical.value : '']
    ];
    pairs.forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    const next = `${url.pathname}${params.toString() ? `?${params.toString()}` : ''}${url.hash}`;
    window.history.replaceState(null, '', next);
  }

  function matches(card) {
    const query = search ? search.value.trim().toLowerCase() : '';
    if (query && !(card.dataset.search || '').includes(query)) return false;
    if (!hasToken(card, 'cities', filters.city ? filters.city.value : '')) return false;
    if (!hasToken(card, 'features', filters.charger ? filters.charger.value : '')) return false;
    if (!hasToken(card, 'propertyTypes', filters.property ? filters.property.value : '')) return false;
    if (!hasToken(card, 'electrical', filters.electrical ? filters.electrical.value : '')) return false;
    return true;
  }

  function applyFilters({replaceUrl = true} = {}) {
    let count = 0;
    cards.forEach((card) => {
      const shown = matches(card);
      card.hidden = !shown;
      card.classList.toggle('is-hidden', !shown);
      if (shown) count += 1;
    });
    if (resultsCount) {
      resultsCount.textContent = `${count} installer profile${count === 1 ? '' : 's'} shown`;
    }
    if (emptyState) {
      emptyState.hidden = count !== 0;
    }
    if (replaceUrl) updateUrl();
    syncSelectedCards();
  }

  function hydrateFromUrl() {
    if (!window.URLSearchParams) return;
    const params = new URLSearchParams(window.location.search);
    if (search && params.has('q')) search.value = params.get('q') || '';
    Object.keys(filters).forEach((key) => {
      const control = filters[key];
      if (control && params.has(key)) control.value = params.get(key) || '';
    });
  }

  const controls = [search, filters.city, filters.charger, filters.property, filters.electrical].filter(Boolean);
  controls.forEach((control) => {
    control.addEventListener('input', () => applyFilters());
    control.addEventListener('change', () => applyFilters());
  });

  if (clearFilters) {
    clearFilters.addEventListener('click', () => {
      controls.forEach((control) => {
        control.value = '';
      });
      applyFilters();
      if (search) search.focus();
    });
  }

  document.querySelectorAll('.compare-toggle').forEach((toggle) => {
    toggle.addEventListener('change', (event) => {
      const input = event.currentTarget;
      const card = input.closest('[data-provider-card]');
      if (!card) return;
      const slug = card.dataset.provider || input.value;
      if (input.checked) {
        if (card.hidden || selected.size >= 3) {
          input.checked = false;
          if (compareMessage) compareMessage.textContent = 'Select up to 3 visible providers to compare.';
          return;
        }
        selected.set(slug, selectedFromCard(card));
        if (compareMessage) compareMessage.textContent = 'Compare selected providers by public-source signals.';
      } else {
        selected.delete(slug);
        if (compareMessage) compareMessage.textContent = 'Compare selected providers by public-source signals.';
      }
      renderCompare();
    });
  });

  if (clearCompare) {
    clearCompare.addEventListener('click', () => {
      selected.clear();
      document.querySelectorAll('.compare-toggle').forEach((toggle) => {
        toggle.checked = false;
      });
      if (compareMessage) compareMessage.textContent = 'Compare selected providers by public-source signals.';
      renderCompare();
    });
  }

  hydrateFromUrl();
  applyFilters({replaceUrl: false});
})();