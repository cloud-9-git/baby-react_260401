/**
 * 담당: 이진혁
 */
import { NodeType, PatchType } from "../constants.js";
import { normalizeVnode } from "./vnodeUtils.js";

export function diff(oldVdom, newVdom) {
  const patches = [];
  walk(normalizeNullableVnode(oldVdom), normalizeNullableVnode(newVdom), [], patches);
  return patches;
}

function normalizeNullableVnode(vnode) {
  if (vnode == null) {
    return null;
  }

  return normalizeVnode(vnode);
}

function walk(oldNode, newNode, path, patches) {
  if (oldNode == null && newNode == null) {
    return;
  }

  if (oldNode == null) {
    patches.push({
      type: PatchType.ADD,
      path,
      node: newNode,
    });
    return;
  }

  if (newNode == null) {
    patches.push({
      type: PatchType.REMOVE,
      path,
    });
    return;
  }

  if (oldNode.nodeType !== newNode.nodeType) {
    patches.push({
      type: PatchType.REPLACE,
      path,
      node: newNode,
    });
    return;
  }

  if (oldNode.nodeType === NodeType.TEXT) {
    if (oldNode.value !== newNode.value) {
      patches.push({
        type: PatchType.TEXT,
        path,
        value: newNode.value,
      });
    }

    return;
  }

  if (oldNode.type !== newNode.type) {
    patches.push({
      type: PatchType.REPLACE,
      path,
      node: newNode,
    });
    return;
  }

  if (!sameVnodeKey(oldNode, newNode)) {
    patches.push({
      type: PatchType.REPLACE,
      path,
      node: newNode,
    });
    return;
  }

  const propChanges = diffProps(oldNode.props, newNode.props);
  if (propChanges) {
    patches.push({
      type: PatchType.PROPS,
      path,
      props: propChanges,
    });
  }

  const oldChildren = oldNode.children ?? [];
  const newChildren = newNode.children ?? [];

  diffChildren(oldChildren, newChildren, path, patches);
}

function isDeepEqual(a, b) {
  if (a === b) {
    return true;
  }

  if (a == null || b == null) {
    return false;
  }

  if (a.nodeType !== b.nodeType) {
    return false;
  }

  if (a.nodeType === NodeType.TEXT) {
    return a.value === b.value;
  }

  if (a.type !== b.type) {
    return false;
  }

  if (!sameVnodeKey(a, b)) {
    return false;
  }

  const aProps = a.props ?? {};
  const bProps = b.props ?? {};
  const aKeys = Object.keys(aProps);
  const bKeys = Object.keys(bProps);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (const key of aKeys) {
    if (aProps[key] !== bProps[key]) {
      return false;
    }
  }

  const aChildren = a.children ?? [];
  const bChildren = b.children ?? [];

  if (aChildren.length !== bChildren.length) {
    return false;
  }

  for (let i = 0; i < aChildren.length; i += 1) {
    if (!isDeepEqual(aChildren[i], bChildren[i])) {
      return false;
    }
  }

  return true;
}

function tryFindRemoved(oldChildren, newChildren) {
  if (oldChildren.length !== newChildren.length + 1) {
    return -1;
  }

  let k = 0;

  while (k < newChildren.length && isDeepEqual(oldChildren[k], newChildren[k])) {
    k += 1;
  }

  for (let i = k; i < newChildren.length; i += 1) {
    if (!isDeepEqual(oldChildren[i + 1], newChildren[i])) {
      return -1;
    }
  }

  return k === newChildren.length ? k : -1;
}

function tryFindAdded(oldChildren, newChildren) {
  if (newChildren.length !== oldChildren.length + 1) {
    return -1;
  }

  let k = 0;

  while (k < oldChildren.length && isDeepEqual(oldChildren[k], newChildren[k])) {
    k += 1;
  }

  for (let i = k; i < oldChildren.length; i += 1) {
    if (!isDeepEqual(oldChildren[i], newChildren[i + 1])) {
      return -1;
    }
  }

  return k === oldChildren.length ? k : -1;
}

function diffChildren(oldChildren, newChildren, path, patches) {
  const oldList = oldChildren ?? [];
  const newList = newChildren ?? [];

  if (!childListUsesKeys(oldList) && !childListUsesKeys(newList)) {
    const removedIndex = tryFindRemoved(oldList, newList);

    if (removedIndex !== -1) {
      patches.push({ type: PatchType.REMOVE, path: [...path, removedIndex] });
      return;
    }

    const addedIndex = tryFindAdded(oldList, newList);

    if (addedIndex !== -1) {
      patches.push({ type: PatchType.ADD, path: [...path, addedIndex], node: newList[addedIndex] });
      return;
    }
    const maxLength = Math.max(oldList.length, newList.length);
    for (let index = 0; index < maxLength; index += 1) {
      walk(oldList[index], newList[index], [...path, index], patches);
    }
    return;
  }

  // keyed reconciliation: key가 있으면 sibling 범위에서 key를 우선 매칭한다.
  // MOVE 패치는 금지이므로, 위치가 바뀐 key는 REMOVE + ADD로 표현한다.
  const oldKeyToIndex = createKeyToIndexMap(oldList);
  const newKeySet = new Set(
    newList
      .map((child) => vnodeKeyForCompare(child))
      .filter((key) => key != null),
  );
  const removedOldIndices = new Set();
  const maxLength = Math.max(oldList.length, newList.length);

  for (let index = 0; index < maxLength; index += 1) {
    const oldChild = oldList[index];
    const newChild = newList[index];
    const newKey = vnodeKeyForCompare(newChild);

    if (newKey == null) {
      // key가 없는 child는 기존 index fallback 유지
      walk(oldChild, newChild, [...path, index], patches);
      continue;
    }

    const matchedOldIndex = oldKeyToIndex.get(newKey);

    if (matchedOldIndex == null) {
      // 새 keyed child
      walk(null, newChild, [...path, index], patches);
      continue;
    }

    if (matchedOldIndex === index) {
      // 동일 key + 동일 위치
      walk(oldChild, newChild, [...path, index], patches);
      continue;
    }

    // 이동은 REMOVE + ADD 조합으로 처리
    if (!removedOldIndices.has(matchedOldIndex)) {
      patches.push({ type: PatchType.REMOVE, path: [...path, matchedOldIndex] });
      removedOldIndices.add(matchedOldIndex);
    }
    patches.push({
      type: PatchType.ADD,
      path: [...path, index],
      node: newChild,
    });
  }

  for (let oldIndex = 0; oldIndex < oldList.length; oldIndex += 1) {
    const oldKey = vnodeKeyForCompare(oldList[oldIndex]);

    if (oldKey == null || removedOldIndices.has(oldIndex)) {
      continue;
    }

    // old key가 new 리스트에 없으면 제거
    if (!newKeySet.has(oldKey)) {
      patches.push({
        type: PatchType.REMOVE,
        path: [...path, oldIndex],
      });
      removedOldIndices.add(oldIndex);
    }
  }
}

function vnodeKeyForCompare(vnode) {
  if (!vnode || vnode.nodeType !== NodeType.ELEMENT) {
    return null;
  }

  const key = vnode.key;
  if (key === undefined || key === null || key === "") {
    return null;
  }

  return key;
}

function childListUsesKeys(children) {
  return (children ?? []).some((child) => vnodeKeyForCompare(child) != null);
}

function sameVnodeKey(a, b) {
  return vnodeKeyForCompare(a) === vnodeKeyForCompare(b);
}

function createKeyToIndexMap(children) {
  const map = new Map();

  for (let index = 0; index < children.length; index += 1) {
    const key = vnodeKeyForCompare(children[index]);
    if (key == null || map.has(key)) {
      continue;
    }

    map.set(key, index);
  }

  return map;
}

function diffProps(oldProps = {}, newProps = {}) {
  const changes = {};
  const keys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  for (const key of keys) {
    if (oldProps[key] === newProps[key]) {
      continue;
    }

    changes[key] = newProps[key];
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
