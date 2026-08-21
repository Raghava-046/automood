const { createClient } = supabase;
const sb = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

const loginView = document.getElementById('login-view');
const dashView = document.getElementById('dash-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

let currentPage = 1;
const pageSize = 25;
let currentTotal = 0;

async function getToken() {
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.access_token : null;
}

async function apiFetch(path, options = {}) {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    await sb.auth.signOut();
    showLogin();
    throw new Error('Session expired');
  }
  return res.json();
}

function showLogin() {
  loginView.style.display = 'flex';
  dashView.style.display = 'none';
}
function showDashboard() {
  loginView.style.display = 'none';
  dashView.style.display = 'block';
  loadStats();
  loadLeads();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    loginError.textContent = 'Invalid email or password.';
    loginError.style.display = 'block';
    return;
  }
  showDashboard();
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
  showLogin();
});

async function loadStats() {
  try {
    const result = await apiFetch('/api/admin/stats');
    if (!result.success) return;
    const s = result.stats;
    document.getElementById('stat-total').textContent = s.total;
    document.getElementById('stat-new').textContent = s.new;
    document.getElementById('stat-contacted').textContent = s.contacted;
    document.getElementById('stat-qualified').textContent = s.qualified;
    document.getElementById('stat-demo_booked').textContent = s.demo_booked;
    document.getElementById('stat-converted').textContent = s.converted;
  } catch (e) { /* handled by apiFetch redirect on 401 */ }
}

function statusOptions(selected) {
  const statuses = ['new', 'contacted', 'qualified', 'demo_booked', 'converted', 'not_interested'];
  return statuses
    .map((s) => `<option value="${s}" ${s === selected ? 'selected' : ''}>${s.replace('_', ' ')}</option>`)
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

async function loadLeads() {
  const search = document.getElementById('search-input').value.trim();
  const status = document.getElementById('status-filter').value;

  const params = new URLSearchParams({ page: currentPage, pageSize });
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  try {
    const result = await apiFetch(`/api/admin/leads?${params.toString()}`);
    if (!result.success) return;
    currentTotal = result.total;
    renderLeads(result.leads);
    renderPager();
  } catch (e) { /* handled */ }
}

function renderLeads(leads) {
  const tbody = document.getElementById('leads-tbody');
  const emptyState = document.getElementById('empty-state');
  tbody.innerHTML = '';

  if (!leads || leads.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  for (const lead of leads) {
    const tr = document.createElement('tr');
    const date = new Date(lead.created_at).toLocaleDateString();
    tr.innerHTML = `
      <td>${escapeHtml(lead.full_name)}</td>
      <td>${escapeHtml(lead.business_name)}</td>
      <td>${escapeHtml(lead.phone)}</td>
      <td>${escapeHtml(lead.email)}</td>
      <td>${escapeHtml(lead.business_type)}</td>
      <td><span class="status-pill status-${lead.status}">${lead.status.replace('_', ' ')}</span></td>
      <td class="mono">${date}</td>
      <td>
        <div class="row-actions">
          <select data-id="${lead.id}" class="status-select">${statusOptions(lead.status)}</select>
          <button class="del-btn" data-id="${lead.id}">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  tbody.querySelectorAll('.status-select').forEach((sel) => {
    sel.addEventListener('change', async (e) => {
      const id = e.target.getAttribute('data-id');
      const newStatus = e.target.value;
      try {
        await apiFetch(`/api/admin/leads/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        });
        loadStats();
      } catch (err) { /* handled */ }
    });
  });

  tbody.querySelectorAll('.del-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (!confirm('Delete this lead? This cannot be undone.')) return;
      try {
        await apiFetch(`/api/admin/leads/${id}`, { method: 'DELETE' });
        loadStats();
        loadLeads();
      } catch (err) { /* handled */ }
    });
  });
}

function renderPager() {
  const totalPages = Math.max(Math.ceil(currentTotal / pageSize), 1);
  document.getElementById('page-label').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prev-page').disabled = currentPage <= 1;
  document.getElementById('next-page').disabled = currentPage >= totalPages;
}

document.getElementById('prev-page').addEventListener('click', () => {
  if (currentPage > 1) { currentPage--; loadLeads(); }
});
document.getElementById('next-page').addEventListener('click', () => {
  currentPage++; loadLeads();
});

let searchTimeout;
document.getElementById('search-input').addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => { currentPage = 1; loadLeads(); }, 350);
});
document.getElementById('status-filter').addEventListener('change', () => {
  currentPage = 1;
  loadLeads();
});

// Boot: check for existing session
(async () => {
  const { data } = await sb.auth.getSession();
  if (data.session) showDashboard();
  else showLogin();
})();
