import { useEffect, useState } from "react";
import { getMySubmissions } from "../api.js";
import "./css/MyClaims.css";

function formatDate(value) {
    if (!value) return "Not provided";
    return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function MySubmissions({ token }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

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

    return (
        <main className="my-claims-page">
            <h2>My Activity</h2>
            {loading ? (
                <p>Loading your submissions...</p>
            ) : error ? (
                <p className="error-message" role="alert">{error}</p>
            ) : items.length === 0 ? (
                <p>You have not posted any items yet.</p>
            ) : (
                <div className="my-claims-list">
                    {items.map((item) => (
                        <article className="my-claim-card" key={item.id}>
                            <div className="my-claim-heading">
                                <h3>{item.title}</h3>
                                <div className="submission-badges">
                                    <span className={`submission-type ${item.item_type}`}>
                                        {item.item_type}
                                    </span>
                                    <span className={`claim-status ${item.deleted_at ? "rejected" : `submission-${item.status}`}`}>
                                        {item.deleted_at ? "removed" : item.status}
                                    </span>
                                </div>
                            </div>
                            <p className="claim-item-details">
                                {item.location_text || "Location not provided"}
                                {" · "}
                                Event date: {formatDate(item.event_date)}
                            </p>
                            <p><strong>Posted:</strong> {formatDate(item.created_at)}</p>
                            <p>{item.description}</p>
                            {item.deleted_at && (
                                <p className="submission-removed-notice">
                                    This listing has been removed from public browse by security staff.
                                </p>
                            )}
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}

export default MySubmissions;
