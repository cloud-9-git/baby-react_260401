const listenerStoreKey = Symbol("listenerStore");
let currentDebugOwner = null;

export function withDebugOwner(owner, callback) {
  const previousOwner = currentDebugOwner;
  currentDebugOwner = owner;

  try {
    return callback();
  } finally {
    currentDebugOwner = previousOwner;
  }
}

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
  const owner = currentDebugOwner;
  const wrappedHandler =
    owner && typeof owner.recordDebugAction === "function"
      ? function debugWrappedHandler(event) {
        owner.recordDebugAction(createDebugAction(getEventName(key), event));
        return handler(event);
      }
      : handler;

  element.addEventListener(getEventName(key), wrappedHandler);
  store[key] = wrappedHandler;
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

function createDebugAction(eventName, event) {
  const source = event?.currentTarget ?? event?.target ?? null;
  const payload = {};

  if (source?.dataset?.taskId) {
    payload.taskId = source.dataset.taskId;
  }

  if (typeof source?.name === "string" && source.name !== "") {
    payload.name = source.name;
  }

  if (
    typeof source?.value === "string" &&
    source.value !== "" &&
    (eventName === "input" || eventName === "change")
  ) {
    payload.value = source.value;
  }

  if (source?.tagName) {
    payload.tag = source.tagName.toLowerCase();
  }

  if (eventName === "click") {
    const label = normalizeText(source?.textContent);

    if (label) {
      payload.label = label;
    }
  }

  const actionType = source?.dataset?.action || eventName;

  return {
    type: actionType,
    payload,
  };
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}
