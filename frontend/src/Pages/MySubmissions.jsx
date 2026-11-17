import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getMySubmissions, updateItem } from "../api.js";
import "./css/MyClaims.css";
import "./css/MySubmissions.css";

function formatDate(value) {
    if (!value) return "Not provided";
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function MySubmissions({ token, canEdit }) {
    const { itemId } = useParams();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        let active = true;

        async function loadSubmissions() {
            try {
                const data = await getMySubmissions(token);
                if (active) setItems(data);
            } catch (requestError) {
                console.error("Could not load submissions:", requestError);
                if (active) {
                    setError(requestError.message || "Could not load your submissions.");
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadSubmissions();
        return () => {
            active = false;
        };
    }, [token]);

    async function handleSave(event) {
        event.preventDefault();
        setError("");
        setMessage("");
        const formData = new FormData(event.currentTarget);
        const changes = {
            title: formData.get("title"),
            description: formData.get("description"),
            item_type: formData.get("item_type"),
            event_date: formData.get("event_date") || null,
            location_text: formData.get("location_text")
        };

        setSaving(true);
        try {
            const updatedItem = await updateItem(itemId, changes, token);
            setItems((current) =>
                current.map((item) => item.id === updatedItem.id ? updatedItem : item)
            );
            setEditing(false);
            setMessage("Listing updated successfully.");
        } catch (requestError) {
            console.error("Could not update listing:", requestError);
            setError(requestError.message || "Could not update this listing.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <main className="my-claims-page"><p>Loading your activity...</p></main>;
    }

    if (error && items.length === 0) {
        return (
            <main className="my-claims-page">
                <p className="error-message" role="alert">{error}</p>
            </main>
        );
    }

    if (itemId) {
        const item = items.find((entry) => String(entry.id) === itemId);

        if (!item) {
            return (
                <main className="my-claims-page">
                    <h2>404 — Listing not found</h2>
                    <p>This listing does not exist in your activity.</p>
                    <Link to="/submissions">Back to My Activity</Link>
                </main>
            );
        }

        return (
            <main className="my-claims-page">
                <Link to="/submissions" className="activity-back-link">← My Activity</Link>
                <article className="my-claim-card activity-detail">
                    <div className="my-claim-heading">
                        <h2>{item.title}</h2>
                        <div className="submission-badges">
                            <span className={`submission-type ${item.item_type}`}>{item.item_type}</span>
                            <span className={`claim-status ${item.deleted_at ? "rejected" : `submission-${item.status}`}`}>
                                {item.deleted_at ? "removed" : item.status}
                            </span>
                        </div>
                    </div>
                    {editing ? (
                        <form className="activity-edit-form" onSubmit={handleSave}>
                            <label>
                                Title
                                <input name="title" defaultValue={item.title} maxLength={150} required />
                            </label>
                            <label>
                                Description
                                <textarea name="description" defaultValue={item.description} required />
                            </label>
                            <div className="activity-edit-grid">
                                <label>
                                    Type
                                    <select name="item_type" defaultValue={item.item_type}>
                                        <option value="lost">Lost</option>
                                        <option value="found">Found</option>
                                    </select>
                                </label>
                                <label>
                                    Event date
                                    <input
                                        name="event_date"
                                        type="date"
                                        defaultValue={item.event_date ? item.event_date.slice(0, 10) : ""}
                                    />
                                </label>
                                <label>
                                    Location
                                    <input name="location_text" defaultValue={item.location_text || ""} maxLength={255} />
                                </label>
                            </div>
                            {error && <p className="error-message" role="alert">{error}</p>}
                            <div className="activity-actions">
                                <button type="button" className="secondary-button" onClick={() => setEditing(false)}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}>
                                    {saving ? "Saving..." : "Save Listing"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <>
                            <p className="claim-item-details">
                                {item.location_text || "Location not provided"} · Event date: {formatDate(item.event_date)}
                            </p>
                            <p><strong>Posted:</strong> {formatDate(item.created_at)}</p>
                            <p>{item.description}</p>
                            {item.deleted_at && (
                                <p className="submission-removed-notice">
                                    This listing has been removed from public browse by security staff.
                                </p>
                            )}
                            {message && <p className="success-message" role="status">{message}</p>}
                            {error && <p className="error-message" role="alert">{error}</p>}
                            {!item.deleted_at && canEdit && (
                                <button type="button" onClick={() => setEditing(true)}>Edit Listing</button>
                            )}
                        </>
                    )}
                </article>
            </main>
        );
    }

    return (
        <main className="my-claims-page">
            <h2>My Activity</h2>
            {error && <p className="error-message" role="alert">{error}</p>}
            {items.length === 0 ? (
                <p>You have not posted any items yet.</p>
            ) : (
                <div className="my-claims-list">
                    {items.map((item) => (
                        <Link className="my-claim-card activity-listing-link" to={`/submissions/${item.id}`} key={item.id}>
                            <div className="my-claim-heading">
                                <h3>{item.title}</h3>
                                <div className="submission-badges">
                                    <span className={`submission-type ${item.item_type}`}>{item.item_type}</span>
                                    <span className={`claim-status ${item.deleted_at ? "rejected" : `submission-${item.status}`}`}>
                                        {item.deleted_at ? "removed" : item.status}
                                    </span>
                                </div>
                            </div>
                            <p className="claim-item-details">
                                {item.location_text || "Location not provided"} · Event date: {formatDate(item.event_date)}
                            </p>
                            <p>{item.description}</p>
                            <span className="activity-open-link">View listing ›</span>
                        </Link>
                    ))}
                </div>
            )}
        </main>
    );
}

export default MySubmissions;
