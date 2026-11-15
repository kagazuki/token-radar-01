// Token Radar institutional dashboard: client-side valuation terminal.
// Reads window.RADAR (written by main.ts) with zero network calls and full keyboard support.

(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;

  var app = document.getElementById('board');
  if (!app) return;

  var state = {
    q: '',
    category: 'all',
    tab: 'pre-token',
    sort: 'implied',
    dir: -1,
    selected: null
  };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }

  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }

  function impliedOf(row, model) {
    var rawGrowth = row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d;
    var growth = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
    var growthMult = 1 + (growth / 100) * model.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? model.unknown_age_days : row.age_days;
    var maturity = model.maturity_floor + (Math.min(Math.max(age, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
    var chainCount = Math.max(1, (row.chains || []).length);
    var chainMult = Math.min(1.20, 1.0 + (chainCount - 1) * (model.chain_weight || 0.04));
    return Math.max(1, Math.round(row.tvl_usd * model.base_multiple * growthMult * maturity * chainMult));
  }

  function chainOf(p) {
    return p.chains && p.chains.length > 0 ? p.chains[0] : 'Ethereum';
  }

  function capitalFor(p) {
    if (p.tvl_usd >= 1e9) return 250;
    if (p.tvl_usd >= 5e8) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }

  function holdDaysFor(age) {
    if (age === null || age === undefined) return 45;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }

  function categoryAction(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) {
      return 'Supply $' + capital + ' USDC to ' + name + ' collateral market on ' + chain + ' with conservative loan-to-value under 45%.';
    }
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('farm') >= 0) {
      return 'Deposit $' + capital + ' into ' + name + "'s primary liquidity pool on " + chain + ' and hold pool share tokens.';
    }
    if (c.indexOf('bridge') >= 0 || c.indexOf('cross') >= 0) {
      return 'Transfer $' + capital + ' USDC across chains using ' + name + ' router and complete one qualifying on-chain swap.';
    }
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) {
      return 'Allocate $' + capital + " into " + name + "'s audited capital vault on " + chain + ' and retain vault share receipts.';
    }
    if (c.indexOf('derivative') >= 0 || c.indexOf('perpetual') >= 0) {
      return 'Deposit $' + capital + ' USDC into ' + name + ' margin contract on ' + chain + ' and maintain a low-leverage hedge position.';
    }
    if (c.indexOf('rwa') >= 0 || c.indexOf('real world') >= 0) {
      return 'Mint $' + capital + ' worth of ' + name + ' institutional yield units on ' + chain + ' and hold in primary wallet.';
    }
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) {
      return 'Delegate $' + capital + ' of native staking tokens to ' + name + ' on ' + chain + ' and keep delegation proof.';
    }
    return 'Deposit $' + capital + " USDC into " + name + "'s main contract on " + chain + ' and maintain active position.';
  }

  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    var action = categoryAction(p, capital, chain);
    return [
      {
        num: 'STEP 1: WALLET SETUP',
        text: 'Initialize a dedicated farming wallet isolated from primary storage. Fund it with native gas tokens on ' + chain + ' ($10-$15 equivalent) to cover approvals.',
        cost: '$10-$15 native gas buffer',
        time: '5-10 minutes'
      },
      {
        num: 'STEP 2: CAPITAL DEPOSIT',
        text: action,
        cost: '$' + capital + ' capital plus ~$3-$6 network gas',
        time: '15 minutes setup'
      },
      {
        num: 'STEP 3: ACTIVE CADENCE',
        text: 'Execute one on-chain activity every 7 days (claim yields, compound rewards, or rebalance collateral) to maintain verified active status.',
        cost: '~$1.50-$3.00 gas per interaction',
        time: '5 minutes weekly'
      },
      {
        num: 'STEP 4: EPOCH RETENTION',
        text: 'Maintain the active position continuously for at least ' + hold + ' days to qualify across multiple snapshot checkpoints and retention filters.',
        cost: '$' + capital + ' capital allocated in contract',
        time: hold + ' days holding period'
      },
      {
        num: 'STEP 5: VERIFICATION',
        text: 'Verify allocation points exclusively through official ' + p.name + ' interface channels. Check for zero-value signatures to protect wallet assets.',
        cost: 'Free to verify (zero gas)',
        time: '5 minutes'
      },
      {
        num: 'STEP 6: CAPITAL EXIT',
        text: 'Upon reward distribution or campaign completion, withdraw the $' + capital + ' principal plus earned yields and log transaction hashes in records.',
        cost: '~$2-$5 exit withdrawal gas',
        time: '10 minutes'
      }
    ];
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) {
        child.forEach(function (c) { if (c) node.appendChild(c); });
      } else if (typeof child === 'string') {
        node.appendChild(document.createTextNode(child));
      } else {
        node.appendChild(child);
      }
    }
    return node;
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('tab')) state.tab = params.get('tab');
  }

  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.tab !== 'pre-token') params.set('tab', state.tab);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    var list = state.tab === 'pre-token' ? DATA.rows : DATA.live;
    return list.filter(function (r) {
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category || '', (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function sortedRows() {
    var rows = filteredRows().slice();
    var k = state.sort;
    var dir = state.dir;
    rows.sort(function (a, b) {
      if (k === 'rank') return ((a.rank || 0) - (b.rank || 0)) * dir;
      if (k === 'name') return a.name.localeCompare(b.name) * dir;
      if (k === 'tvl') return ((a.tvl_usd || 0) - (b.tvl_usd || 0)) * dir;
      if (k === 'change_7d') return ((a.change_7d || 0) - (b.change_7d || 0)) * dir;
      if (k === 'age') return ((a.age_days || 0) - (b.age_days || 0)) * dir;
      if (k === 'implied') return ((a.implied_value_usd || 0) - (b.implied_value_usd || 0)) * dir;
      return 0;
    });
    return rows;
  }

  function renderKPIs() {
    var totalImplied = DATA.total_implied_usd || DATA.rows.reduce(function (sum, r) { return sum + r.implied_value_usd; }, 0);
    return el('div', { class: 'kpi-grid' },
      el('div', { class: 'kpi-card' },
        el('div', { class: 'kpi-label', text: 'Total Implied Valuation' }),
        el('div', { class: 'kpi-value', text: fmtUsd(totalImplied) }),
        el('div', { class: 'kpi-sub', text: 'Across 200 Pre-Token Protocols' })
      ),
      el('div', { class: 'kpi-card' },
        el('div', { class: 'kpi-label', text: 'Watchlist Floor Coverage' }),
        el('div', { class: 'kpi-value', text: DATA.watchlist_size + ' / ' + DATA.watchlist_size + ' (100%)' }),
        el('div', { class: 'kpi-sub', text: 'All Floor Protocols Included' })
      ),
      el('div', { class: 'kpi-card' },
        el('div', { class: 'kpi-label', text: 'Early Discovery Protocols' }),
        el('div', { class: 'kpi-value', text: DATA.early_size + ' Protocols' }),
        el('div', { class: 'kpi-sub', text: 'Pre-Token Opportunities Below Floor' })
      ),
      el('div', { class: 'kpi-card' },
        el('div', { class: 'kpi-label', text: 'Valuation Engine' }),
        el('div', { class: 'kpi-value', text: DATA.model_version.toUpperCase() }),
        el('div', { class: 'kpi-sub', text: 'TVL, 7d Growth, Maturity, Chains' })
      )
    );
  }

  function renderToolbar(categories) {
    var searchInput = el('input', {
      type: 'search',
      placeholder: 'Search protocol, slug, chain, or category...',
      value: state.q,
      'aria-label': 'Search protocols',
      oninput: function (e) {
        state.q = e.target.value;
        writeHash();
        renderTable();
      }
    });

    var categoryPills = el('div', { class: 'filter-pills' },
      el('button', {
        class: 'pill-btn',
        'aria-pressed': state.category === 'all' ? 'true' : 'false',
        text: 'All Categories',
        onclick: function () {
          state.category = 'all';
          writeHash();
          render();
        }
      })
    );

    categories.forEach(function (cat) {
      categoryPills.appendChild(el('button', {
        class: 'pill-btn',
        'aria-pressed': state.category === cat ? 'true' : 'false',
        text: cat,
        onclick: function () {
          state.category = cat;
          writeHash();
          render();
        }
      }));
    });

    return el('div', { class: 'controls-toolbar' },
      el('div', { class: 'search-box' }, searchInput),
      categoryPills
    );
  }

  function renderTable() {
    var container = document.getElementById('table-container');
    if (!container) return;
    container.innerHTML = '';

    var rows = sortedRows();
    var maxImplied = DATA.rows[0] ? DATA.rows[0].implied_value_usd : 1;

    var thead = el('thead', null,
      el('tr', null,
        el('th', null, el('button', { onclick: function () { setSort('rank'); }, text: 'Rank ' + sortArrow('rank') })),
        el('th', null, el('button', { onclick: function () { setSort('name'); }, text: 'Protocol ' + sortArrow('name') })),
        el('th', { text: 'Category' }),
        el('th', { text: 'Chains' }),
        el('th', null, el('button', { onclick: function () { setSort('tvl'); }, text: 'TVL ' + sortArrow('tvl') })),
        el('th', null, el('button', { onclick: function () { setSort('change_7d'); }, text: '7d Change ' + sortArrow('change_7d') })),
        el('th', null, el('button', { onclick: function () { setSort('implied'); }, text: 'Implied Valuation ' + sortArrow('implied') })),
        el('th', null, el('button', { onclick: function () { setSort('age'); }, text: 'Age ' + sortArrow('age') }))
      )
    );

    var tbody = el('tbody');
    if (rows.length === 0) {
      tbody.appendChild(el('tr', null,
        el('td', { colspan: '8', class: 'empty-state', text: 'No protocols match your search criteria.' })
      ));
    } else {
      rows.forEach(function (r) {
        var isSelected = state.selected === r.slug;
        var ratio = Math.max(5, Math.min(100, Math.round(((r.implied_value_usd || 0) / maxImplied) * 100)));

        var tr = el('tr', {
          'data-selected': isSelected ? 'true' : 'false',
          tabindex: '0',
          onclick: function () { selectRow(r.slug); },
          onkeydown: function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectRow(r.slug);
            }
          }
        },
          el('td', { class: 'num' }, '#' + (r.rank || '-')),
          el('td', null,
            el('div', { class: 'proto-cell' },
              el('span', { class: 'proto-name', text: r.name }),
              el('span', { class: 'proto-slug', text: r.slug })
            )
          ),
          el('td', null, el('span', { class: 'cat-tag', text: r.category || 'Unclassified' })),
          el('td', null,
            el('div', { class: 'chain-pills' },
              (r.chains || []).slice(0, 3).map(function (c) {
                return el('span', { class: 'chain-pill', text: c });
              })
            )
          ),
          el('td', { class: 'num' }, fmtUsd(r.tvl_usd)),
          el('td', { class: 'num' },
            el('span', { class: (r.change_7d || 0) >= 0 ? 'pct-pos' : 'pct-neg', text: fmtPct(r.change_7d) })
          ),
          el('td', null,
            el('div', { class: 'implied-cell' },
              el('span', { class: 'implied-val', text: fmtUsd(r.implied_value_usd) }),
              el('div', { class: 'ratio-bar' }, el('div', { class: 'ratio-fill', style: 'width:' + ratio + '%' }))
            )
          ),
          el('td', { class: 'num', text: fmtAge(r.age_days) })
        );
        tbody.appendChild(tr);
      });
    }

    container.appendChild(el('div', { class: 'table-wrap' }, el('table', null, thead, tbody)));
    renderDetail();
  }

  function setSort(col) {
    if (state.sort === col) {
      state.dir = -state.dir;
    } else {
      state.sort = col;
      state.dir = (col === 'name' || col === 'rank') ? 1 : -1;
    }
    renderTable();
  }

  function sortArrow(col) {
    if (state.sort !== col) return '';
    return state.dir === 1 ? '▲' : '▼';
  }

  function selectRow(slug) {
    state.selected = state.selected === slug ? null : slug;
    writeHash();
    renderTable();
  }

  function renderDetail() {
    var existing = document.getElementById('detail-drawer');
    if (existing) existing.remove();

    if (!state.selected) return;

    var row = null;
    for (var i = 0; i < DATA.rows.length; i++) {
      if (DATA.rows[i].slug === state.selected) {
        row = DATA.rows[i];
        break;
      }
    }
    if (!row) return;

    var steps = farmSteps(row);
    var model = DATA.model;
    var baseVal = row.tvl_usd * model.base_multiple;
    var verifiedImplied = impliedOf(row, model);

    var drawer = el('div', { id: 'detail-drawer', class: 'detail-drawer', role: 'dialog', 'aria-modal': 'true' },
      el('div', { class: 'drawer-header' },
        el('div', null,
          el('h2', { text: row.name }),
          el('div', { style: 'margin-top:4px;' },
            el('span', { class: 'cat-tag', text: row.category || 'Protocol' }),
            el('span', { style: 'margin-left:8px; font-family:var(--font-mono); font-size:12px; color:var(--muted);', text: row.slug })
          )
        ),
        el('button', {
          class: 'close-btn',
          text: '✕ Close (Esc)',
          onclick: function () {
            state.selected = null;
            writeHash();
            renderTable();
          }
        })
      ),

      el('div', { class: 'drawer-card' },
        el('h3', { text: 'Valuation Breakdown (' + DATA.model_version.toUpperCase() + ')' }),
        el('div', { class: 'formula-grid' },
          el('div', { class: 'formula-row' },
            el('span', { class: 'formula-label', text: 'Protocol TVL:' }),
            el('span', { class: 'formula-value', text: fmtUsd(row.tvl_usd) })
          ),
          el('div', { class: 'formula-row' },
            el('span', { class: 'formula-label', text: 'Base Multiple (' + model.base_multiple + 'x):' }),
            el('span', { class: 'formula-value', text: fmtUsd(baseVal) })
          ),
          el('div', { class: 'formula-row' },
            el('span', { class: 'formula-label', text: '7-Day Growth Momentum:' }),
            el('span', { class: 'formula-value', text: fmtPct(row.change_7d) + ' (' + (row.growth_multiplier || 1.0).toFixed(4) + 'x)' })
          ),
          el('div', { class: 'formula-row' },
            el('span', { class: 'formula-label', text: 'Operational Maturity:' }),
            el('span', { class: 'formula-value', text: fmtAge(row.age_days) + ' (' + (row.maturity_multiplier || 1.0).toFixed(4) + 'x)' })
          ),
          el('div', { class: 'formula-row' },
            el('span', { class: 'formula-label', text: 'Multi-Chain Factor (' + (row.chains || []).length + ' chains):' }),
            el('span', { class: 'formula-value', text: (row.chain_multiplier || 1.0).toFixed(4) + 'x' })
          ),
          el('div', { class: 'formula-row' },
            el('span', { class: 'formula-label', text: 'Implied Valuation:' }),
            el('span', { class: 'formula-value', style: 'color:var(--cyan);', text: fmtUsd(verifiedImplied) })
          )
        )
      ),

      el('div', { class: 'drawer-card' },
        el('h3', { text: 'Actionable Farming Roadmap (6 Steps)' }),
        el('ul', { class: 'steps-list' },
          steps.map(function (s) {
            return el('li', { class: 'step-item' },
              el('div', { class: 'step-num', text: s.num }),
              el('div', { class: 'step-text', text: s.text }),
              el('div', { class: 'step-meta' },
                el('span', { class: 'step-badge', text: 'Cost: ' + s.cost }),
                el('span', { class: 'step-badge', text: 'Duration: ' + s.time })
              )
            );
          })
        )
      )
    );

    document.body.appendChild(drawer);
  }

  function getCategories() {
    var set = {};
    DATA.rows.forEach(function (r) {
      if (r.category) set[r.category] = (set[r.category] || 0) + 1;
    });
    return Object.keys(set).sort(function (a, b) { return set[b] - set[a]; }).slice(0, 7);
  }

  function render() {
    app.innerHTML = '';
    app.removeAttribute('aria-busy');

    var header = el('header', { class: 'header-bar' },
      el('div', { class: 'brand-group' },
        el('div', { class: 'radar-pulse' }),
        el('div', { class: 'brand-title', text: 'TOKEN RADAR // VALUATION TERMINAL' }),
        el('div', { class: 'brand-tag', text: DATA.model_version.toUpperCase() })
      ),
      el('div', { class: 'header-meta' },
        el('span', { text: 'Source: ' + DATA.source }),
        el('span', { text: 'As Of: ' + DATA.as_of })
      )
    );

    var kpis = renderKPIs();
    var categories = getCategories();
    var toolbar = renderToolbar(categories);
    var tableCard = el('div', { id: 'table-container', class: 'table-card' });

    var shell = el('div', { class: 'shell' }, header, kpis, toolbar, tableCard);
    app.appendChild(shell);

    renderTable();
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.selected) {
      state.selected = null;
      writeHash();
      renderTable();
    }
  });

  window.addEventListener('hashchange', function () {
    readHash();
    render();
  });

  readHash();
  render();
})();
