import { useCallback, useEffect, useState } from "react";
import {
  getClaimsForReview,
  getStaffItems,
  removeItem,
  reviewClaim,
  updateItem
} from "../api.js";
import "./css/StaffDashboard.css";

function formatDate(value) {
  if (!value) return "Not provided";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function StaffDashboard({ token }) {
  const [claims, setClaims] = useState([]);
  const [items, setItems] = useState([]);
  const [reviewNotes, setReviewNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    const [claimsData, itemsData] = await Promise.all([
      getClaimsForReview(token),
      getStaffItems(token)
    ]);
    setClaims(claimsData);
    setItems(itemsData);
  }, [token]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [claimsData, itemsData] = await Promise.all([
          getClaimsForReview(token),
          getStaffItems(token)
        ]);
        if (active) {
          setClaims(claimsData);
          setItems(itemsData);
        }
      } catch (requestError) {
        console.error("Could not load staff dashboard:", requestError);
        if (active) setError(requestError.message || "Could not load the staff dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleReview(claim, status) {
    setSavingId(`claim-${claim.id}`);
    setActionError("");
    setMessage("");

    try {
      await reviewClaim(
        claim.id,
        status,
        reviewNotes[claim.id] || "",
        token
      );
      await loadDashboard();
      setMessage(`Claim ${status}.`);
    } catch (requestError) {
      console.error("Could not review claim:", requestError);
      setActionError(requestError.message || "Could not update the claim.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleItemUpdate(event, item) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSavingId(`item-${item.id}`);
    setActionError("");
    setMessage("");

    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      item_type: formData.get("item_type"),
      category: formData.get("category") || null,
      color: formData.get("color") || null,
      brand: formData.get("brand") || null,
      location_text: formData.get("location_text") || null,
      event_date: formData.get("event_date") || null,
      status: formData.get("status")
    };

    try {
      await updateItem(item.id, payload, token);
      await loadDashboard();
      setMessage(`Item "${payload.title}" updated.`);
    } catch (requestError) {
      console.error("Could not update item:", requestError);
      setActionError(requestError.message || "Could not update the item.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleRemove(item) {
    if (!window.confirm(`Remove "${item.title}" from public listings?`)) return;

    setSavingId(`item-${item.id}`);
    setActionError("");
    setMessage("");

    try {
      await removeItem(item.id, token);
      await loadDashboard();
      setMessage(`Item "${item.title}" removed from public listings.`);
    } catch (requestError) {
      console.error("Could not remove item:", requestError);
      setActionError(requestError.message || "Could not remove the item.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <main className="staff-dashboard"><p>Loading staff dashboard...</p></main>;
  }

  if (error) {
    return <main className="staff-dashboard"><p className="error-message" role="alert">{error}</p></main>;
  }

  const pendingClaims = claims.filter((claim) => claim.status === "pending").length;
  const activeItems = items.filter((item) => !item.deleted_at).length;

  return (
    <main className="staff-dashboard">
      <h2>Security Staff Dashboard</h2>
      <div className="staff-summary">
        <span>{pendingClaims} pending claim{pendingClaims === 1 ? "" : "s"}</span>
        <span>{activeItems} active listing{activeItems === 1 ? "" : "s"}</span>
      </div>
      {actionError && <p className="error-message" role="alert">{actionError}</p>}
      {message && <p className="success-message" role="status">{message}</p>}

      <section>
        <h3>Claims for review</h3>
        {claims.length === 0 ? (
          <p>No claims have been submitted.</p>
        ) : (
          <div className="staff-card-list">
            {claims.map((claim) => (
              <article className="staff-card" key={claim.id}>
                <div className="staff-card-heading">
                  <h4>{claim.item_title}</h4>
                  <span className={`claim-status ${claim.status}`}>{claim.status}</span>
                </div>
                <p>
                  Claimant: {claim.claimant_name} ({claim.claimant_email})
                </p>
                <p>Submitted {formatDate(claim.created_at)} · {claim.location_text || "Location not provided"}</p>
                <p><strong>Explanation:</strong> {claim.explanation}</p>
                {claim.item_deleted_at && (
                  <p className="staff-warning">This item has been removed from public listings.</p>
                )}
                <h5>Evidence</h5>
                <ul>
                  {claim.evidence.map((entry, index) => (
                    <li key={`${claim.id}-${index}`}>
                      <a href={entry.file_path} target="_blank" rel="noreferrer">
                        {entry.description || entry.file_path}
                      </a>
                    </li>
                  ))}
                </ul>
                {claim.admin_notes && <p><strong>Review notes:</strong> {claim.admin_notes}</p>}
                {claim.status === "pending" && (
                  <div className="claim-review-controls">
                    <label htmlFor={`review-notes-${claim.id}`}>Review notes (optional)</label>
                    <textarea
                      id={`review-notes-${claim.id}`}
                      maxLength={2000}
                      value={reviewNotes[claim.id] || ""}
                      onChange={(event) =>
                        setReviewNotes((current) => ({
                          ...current,
                          [claim.id]: event.target.value
                        }))
                      }
                    />
                    <div className="staff-actions">
                      <button
                        type="button"
                        className="deny-button"
                        disabled={savingId === `claim-${claim.id}`}
                        onClick={() => handleReview(claim, "rejected")}
                      >
                        Deny claim
                      </button>
                      <button
                        type="button"
                        disabled={savingId === `claim-${claim.id}` || !!claim.item_deleted_at}
                        onClick={() => handleReview(claim, "approved")}
                      >
                        Approve claim
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3>Item listings</h3>
        {items.length === 0 ? (
          <p>No listings have been posted.</p>
        ) : (
          <div className="staff-card-list">
            {items.map((item) => (
              <article
                className={`staff-card ${item.deleted_at ? "removed-item" : ""}`}
                key={item.id}
              >
                <div className="staff-card-heading">
                  <h4>{item.title}</h4>
                  <span>{item.deleted_at ? "Removed" : item.status}</span>
                </div>
                <p>Posted by {item.poster_name} ({item.poster_email})</p>
                {item.deleted_at && (
                  <p className="staff-warning">
                    Removed {formatDate(item.deleted_at)}
                    {item.deleted_by ? ` by staff user ${item.deleted_by}` : ""}
                  </p>
                )}
                {!item.deleted_at && (
                  <form
                    className="item-edit-form"
                    onSubmit={(event) => handleItemUpdate(event, item)}
                  >
                    <label>
                      Title
                      <input name="title" defaultValue={item.title} maxLength={150} required />
                    </label>
                    <label>
                      Description
                      <textarea name="description" defaultValue={item.description} required />
                    </label>
                    <div className="item-edit-grid">
                      <label>
                        Type
                        <select name="item_type" defaultValue={item.item_type}>
                          <option value="lost">Lost</option>
                          <option value="found">Found</option>
                        </select>
                      </label>
                      <label>
                        Status
                        <select name="status" defaultValue={item.status}>
                          <option value="open">Open</option>
                          <option value="claimed">Claimed</option>
                          <option value="returned">Returned</option>
                          <option value="closed">Closed</option>
                        </select>
                      </label>
                      <label>
                        Event date
                        <input name="event_date" type="date" defaultValue={item.event_date || ""} />
                      </label>
                      <label>
                        Location
                        <input name="location_text" defaultValue={item.location_text || ""} maxLength={255} />
                      </label>
                      <label>
                        Category
                        <input name="category" defaultValue={item.category || ""} maxLength={80} />
                      </label>
                      <label>
                        Color
                        <input name="color" defaultValue={item.color || ""} maxLength={60} />
                      </label>
                      <label>
                        Brand
                        <input name="brand" defaultValue={item.brand || ""} maxLength={100} />
                      </label>
                    </div>
                    <div className="staff-actions">
                      <button type="submit" disabled={savingId === `item-${item.id}`}>
                        Save changes
                      </button>
                      <button
                        type="button"
                        className="deny-button"
                        disabled={savingId === `item-${item.id}`}
                        onClick={() => handleRemove(item)}
                      >
                        Remove listing
                      </button>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default StaffDashboard;
