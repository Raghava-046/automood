const { supabaseAdmin } = require('./supabaseClient');
const { isValidStatus } = require('./validators');

const TABLE = 'early_access_leads';

// Generic wrapper: never leak raw Supabase/Postgres error internals to callers.
function sanitizeError(error, fallbackMessage) {
  const err = new Error(fallbackMessage);
  err.code = error && error.code ? error.code : 'unknown';
  err.status = 500;
  return err;
}

/**
 * Checks whether a lead already exists with this email or phone.
 */
async function findDuplicateLead({ email, phone }) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('id')
    .or(`email.eq.${email},phone.eq.${phone}`)
    .limit(1);

  if (error) throw sanitizeError(error, 'Could not check for existing leads.');
  return data && data.length > 0;
}

/**
 * Creates a new lead. Returns { duplicate: true } if one already exists.
 */
async function createLead(input) {
  const { full_name, business_name, phone, email, business_type, monthly_calls } = input;

  const isDuplicate = await findDuplicateLead({ email, phone });
  if (isDuplicate) {
    return { duplicate: true };
  }

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert([
      {
        full_name,
        business_name,
        phone,
        email,
        business_type: business_type || null,
        monthly_calls: monthly_calls || null,
        status: 'new',
        source: 'website',
      },
    ])
    .select()
    .single();

  if (error) {
    // Unique-constraint race condition (two simultaneous submits) -> treat as duplicate.
    if (error.code === '23505') {
      return { duplicate: true };
    }
    throw sanitizeError(error, 'Could not save lead.');
  }

  return { duplicate: false, lead: data };
}

/**
 * Fetches leads with optional search, status filter, and pagination.
 */
async function getLeads({ search, status, page = 1, pageSize = 25 } = {}) {
  let query = supabaseAdmin.from(TABLE).select('*', { count: 'exact' });

  if (status && isValidStatus(status)) {
    query = query.eq('status', status);
  }

  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `full_name.ilike.${term},business_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw sanitizeError(error, 'Could not fetch leads.');

  return { leads: data, total: count };
}

async function getLeadById(id) {
  const { data, error } = await supabaseAdmin.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw sanitizeError(error, 'Could not fetch lead.');
  return data;
}

async function updateLeadStatus(id, status) {
  if (!isValidStatus(status)) {
    const err = new Error('Invalid status value.');
    err.status = 400;
    throw err;
  }

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .update({ status })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw sanitizeError(error, 'Could not update lead.');
  return data;
}

async function deleteLead(id) {
  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) throw sanitizeError(error, 'Could not delete lead.');
  return true;
}

async function getLeadStats() {
  const { data, error } = await supabaseAdmin.from(TABLE).select('status');
  if (error) throw sanitizeError(error, 'Could not fetch stats.');

  const stats = {
    total: data.length,
    new: 0,
    contacted: 0,
    qualified: 0,
    demo_booked: 0,
    converted: 0,
    not_interested: 0,
  };

  for (const row of data) {
    if (stats[row.status] !== undefined) stats[row.status] += 1;
  }

  return stats;
}

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  deleteLead,
  getLeadStats,
  findDuplicateLead,
};
