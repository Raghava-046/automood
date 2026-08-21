const LIMITS = {
  full_name: 100,
  business_name: 120,
  phone: 20,
  email: 150,
  business_type: 60,
  monthly_calls: 60,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts +, digits, spaces, dashes, parens; 7-20 chars total.
const PHONE_RE = /^[+()\-\s\d]{7,20}$/;

const VALID_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'demo_booked',
  'converted',
  'not_interested',
];

function clean(str) {
  return typeof str === 'string' ? str.trim() : '';
}

function validateLeadInput(body) {
  const errors = [];

  const full_name = clean(body.full_name);
  const business_name = clean(body.business_name);
  const phone = clean(body.phone);
  const email = clean(body.email).toLowerCase();
  const business_type = clean(body.business_type);
  const monthly_calls = clean(body.monthly_calls);

  if (!full_name) errors.push('Name is required.');
  else if (full_name.length > LIMITS.full_name) errors.push('Name is too long.');

  if (!business_name) errors.push('Business name is required.');
  else if (business_name.length > LIMITS.business_name) errors.push('Business name is too long.');

  if (!phone) errors.push('Phone number is required.');
  else if (phone.length > LIMITS.phone || !PHONE_RE.test(phone)) errors.push('Phone number is invalid.');

  if (!email) errors.push('Email is required.');
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) errors.push('Email is invalid.');

  if (business_type && business_type.length > LIMITS.business_type) errors.push('Business type is too long.');
  if (monthly_calls && monthly_calls.length > LIMITS.monthly_calls) errors.push('Monthly calls value is too long.');

  return {
    valid: errors.length === 0,
    errors,
    data: { full_name, business_name, phone, email, business_type, monthly_calls },
  };
}

function isValidStatus(status) {
  return VALID_STATUSES.includes(status);
}

module.exports = { validateLeadInput, isValidStatus, VALID_STATUSES, LIMITS };
