import { useEffect, useState } from "react";
import { getMyClaims } from "../api.js";
import "./css/MyClaims.css";

function formatDate(dateString) {
  if (!dateString) return "Date not provided";

  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function MyClaims({ token }) {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadClaims() {
      try {
        const data = await getMyClaims(token);
        if (active) setClaims(data);
      } catch (requestError) {
        console.error("Could not load claims:", requestError);
        if (active) setError(requestError.message || "Could not load your claims.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadClaims();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <main className="my-claims-page">
      <h2>My Claims</h2>
      {loading ? (
        <p>Loading your claims...</p>
      ) : error ? (
        <p className="error-message" role="alert">{error}</p>
      ) : claims.length === 0 ? (
        <p>You have not submitted any claims yet.</p>
      ) : (
        <div className="my-claims-list">
          {claims.map((claim) => (
            <article className="my-claim-card" key={claim.id}>
              <div className="my-claim-heading">
                <h3>{claim.item_title}</h3>
                <span className={`claim-status ${claim.status}`}>
                  {claim.status}
                </span>
              </div>
              <p className="claim-item-details">
                {claim.item_type === "found" ? "Found item" : "Lost item"}
                {claim.location_text ? ` · ${claim.location_text}` : ""}
              </p>
              <p><strong>Submitted:</strong> {formatDate(claim.created_at)}</p>
              <p><strong>Your explanation:</strong> {claim.explanation}</p>
              {claim.admin_notes && (
                <p><strong>Review notes:</strong> {claim.admin_notes}</p>
              )}
              {claim.reviewed_at && (
                <p><strong>Reviewed:</strong> {formatDate(claim.reviewed_at)}</p>
              )}
              <h4>Evidence</h4>
              <ul>
                {claim.evidence.map((entry, index) => (
                  <li key={`${claim.id}-${index}`}>
                    <a href={entry.file_path} target="_blank" rel="noreferrer">
                      {entry.description || entry.file_path}
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default MyClaims;
