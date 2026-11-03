const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "The request could not be completed.");
  }

  return data;
}

export function getItems() {
  return request("/items");
}

export function getMySubmissions(token) {
  return request("/items/mine", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function saveItem(item, token) {
  return request("/items", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(item)
  });
}

export function login(email, password) {
  return request("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
}

export function register(name, email, password) {
  return request("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ name, email, password })
  });
}

export function submitClaim(itemId, claim, token) {
  return request(`/claims/${itemId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(claim)
  });
}

export function getMyClaims(token) {
  return request("/claims/mine", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getStaffItems(token) {
  return request("/items/staff", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function updateItem(itemId, item, token) {
  return request(`/items/${itemId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(item)
  });
}

export function removeItem(itemId, token) {
  return request(`/items/${itemId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getClaimsForReview(token) {
  return request("/claims/review", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function reviewClaim(claimId, status, adminNotes, token) {
  return request(`/claims/${claimId}/review`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status, admin_notes: adminNotes })
  });
}
