const listenerStoreKey = Symbol("listenerStore");

export function setDomProp(element, key, value) {
  const normalizedKey = key === "class" ? "className" : key;
  const attributeName = normalizedKey === "className" ? "class" : normalizedKey;

  if (isEventProp(normalizedKey)) {
    setEventProp(element, normalizedKey, value);
    return;
  }

  if (normalizedKey === "style" && value && typeof value === "object") {
    Object.assign(element.style, value);
    return;
  }

  if (value === false || value == null) {
    removeDomProp(element, normalizedKey);
    return;
  }

  if (value === true) {
    element.setAttribute(attributeName, "");
    return;
  }

  if (
    normalizedKey in element &&
    typeof value !== "object" &&
    !attributeName.startsWith("data-") &&
    !attributeName.startsWith("aria-")
  ) {
    element[normalizedKey] = value;
    return;
  }

  element.setAttribute(attributeName, String(value));
}

export function removeDomProp(element, key) {
  const normalizedKey = key === "class" ? "className" : key;
  const attributeName = normalizedKey === "className" ? "class" : normalizedKey;

  if (isEventProp(normalizedKey)) {
    removeEventProp(element, normalizedKey);
    return;
  }

  if (normalizedKey === "className") {
    element.className = "";
  } else if (normalizedKey === "value") {
    element.value = "";
  } else if (normalizedKey === "checked") {
    element.checked = false;
  } else if (normalizedKey === "style") {
    element.removeAttribute("style");
    return;
  }

  element.removeAttribute(attributeName);
}

function isEventProp(key) {
  return /^on[A-Z]/.test(key);
}

function getEventName(key) {
  return key.slice(2).toLowerCase();
}

function setEventProp(element, key, handler) {
  removeEventProp(element, key);

  if (typeof handler !== "function") {
    return;
  }

  const store = element[listenerStoreKey] ?? (element[listenerStoreKey] = {});

  element.addEventListener(getEventName(key), handler);
  store[key] = handler;
}

function removeEventProp(element, key) {
  const store = element[listenerStoreKey];
  const previousHandler = store?.[key];

  if (!previousHandler) {
    return;
  }

  element.removeEventListener(getEventName(key), previousHandler);
  delete store[key];
}
