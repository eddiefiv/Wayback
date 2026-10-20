
const STORAGE_KEY = "wayback-items";

// Get all saved items
export function getItems() {
  try {
    const items = JSON.parse(
      localStorage.getItem(STORAGE_KEY)
    );
  return Array.isArray(items) ? items : [];
  } 
  catch {
    return [];
  }
}


// Save a new item
export function saveItem(item) {
  const items = getItems();

  const newItem = {
    ...item,
    item_id: crypto.randomUUID()
  };

  const updatedItems = [...items, newItem];

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedItems)
  );

  return updatedItems;
}

// Clear all test items
export function clearItems() {
  localStorage.removeItem(STORAGE_KEY);
}
