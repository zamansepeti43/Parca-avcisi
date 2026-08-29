// Registration form input guard: keeps mobile/desktop text entry working.
// Some global UI handlers use capture/bubbling; never let them cancel native typing in forms.
const isEditable = (target) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (tag === 'input' || tag === 'textarea' || tag === 'select') && !target.disabled && !target.readOnly;
};

const normalizeEditableFields = (root = document) => {
  root.querySelectorAll?.('#signupForm input, #signupForm textarea, #signupForm select').forEach((field) => {
    field.disabled = false;
    field.readOnly = false;
    field.removeAttribute('disabled');
    field.removeAttribute('readonly');
    field.style.pointerEvents = 'auto';
    field.style.userSelect = 'text';
    field.style.webkitUserSelect = 'text';
  });
};

// Run after the modal is rendered and also after dynamic modal replacements.
const observer = new MutationObserver(() => normalizeEditableFields());
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'readonly'] });
normalizeEditableFields();

// Capture phase runs before document-level keyboard shortcuts. Preserve native input behavior.
document.addEventListener('keydown', (event) => {
  if (isEditable(event.target)) event.stopImmediatePropagation();
}, true);

document.addEventListener('beforeinput', (event) => {
  if (isEditable(event.target)) event.stopImmediatePropagation();
}, true);

document.addEventListener('input', (event) => {
  if (isEditable(event.target)) event.stopImmediatePropagation();
}, true);

document.addEventListener('click', (event) => {
  const target = event.target;
  if (isEditable(target)) {
    target.focus({ preventScroll: true });
  }
}, true);
