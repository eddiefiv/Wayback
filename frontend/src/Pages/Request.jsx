
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { submitClaim } from "../api.js";
import "./css/Request.css";

function RetrievalRequest({ items, token, user, loading }) {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [explanation, setExplanation] = useState("");
  const [evidence, setEvidence] = useState([{ file_path: "", description: "" }]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const item = items.find(
    (item) => String(item.item_id ?? item.id) === itemId
  );

  if (loading) {
    return (
      <main className="details-page">
        <p>Loading item...</p>
      </main>
    );
  }

  if (!item || item.type !== "Found" || item.status !== "open") {
    return (
      <main className="details-page">
        <h2>Item Not Available to Claim</h2>
        <button onClick={() => navigate("/browse")}>
          Back to Browse
        </button>
      </main>
    );
  }

  function updateEvidence(index, field, value) {
    setEvidence((currentEvidence) =>
      currentEvidence.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  }

  function addEvidence() {
    setEvidence((currentEvidence) => [
      ...currentEvidence,
      { file_path: "", description: "" }
    ]);
  }

  function removeEvidence(index) {
    setEvidence((currentEvidence) =>
      currentEvidence.filter((_, entryIndex) => entryIndex !== index)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (evidence.some((entry) => !entry.file_path.trim())) {
      setError("Provide a cloud-file link for each evidence entry.");
      return;
    }

    setSubmitting(true);

    try {
      await submitClaim(
        itemId,
        {
          explanation,
          evidence: evidence.map((entry) => ({
            file_path: entry.file_path.trim(),
            description: entry.description.trim()
          }))
        },
        token
      );
      setSuccess(true);
    } catch (requestError) {
      console.error("Claim submission failed:", requestError);
      setError(requestError.message || "Could not submit claim. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="details-page">
      <div className="modal-content retrieval-content">
        <button
        type="button"
        className="retrieval-close"
        onClick={() => navigate("/browse")}
        aria-label="Close retrieval request"
    >
        ×
    </button>
        {success ? (
          <>
            <h2>Claim Submitted</h2>
            <p>Your claim and evidence have been submitted for review.</p>
            <button
              className="confirm-button"
              onClick={() => navigate("/browse")}
            >
              Back to Browse
            </button>
          </>
        ) : !user ? (
          <>
            <h2>Log in to claim this item</h2>
            <p>You must be signed in before you can submit an ownership claim.</p>
            <Link to="/login">Log in</Link>
          </>
        ) : user.role !== "community" ? (
          <>
            <h2>Community account required</h2>
            <p>Security staff accounts cannot submit ownership claims.</p>
          </>
        ) : (
          <>
            <h2>Claim {item.title}</h2>
            <form className="claim-form" onSubmit={handleSubmit}>
              <p>Explain how this found item belongs to you.</p>
              <label htmlFor="claim-explanation">Ownership explanation</label>
              <textarea
                id="claim-explanation"
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                maxLength={2000}
                required
              />

              <fieldset>
                <legend>Evidence links</legend>
                <p>Provide HTTPS links to cloud files (photos, videos, audio, or documents).</p>
                {evidence.map((entry, index) => (
                  <div className="claim-evidence-entry" key={index}>
                    <label htmlFor={`evidence-link-${index}`}>Cloud-file link</label>
                    <input
                      id={`evidence-link-${index}`}
                      type="url"
                      value={entry.file_path}
                      onChange={(event) =>
                        updateEvidence(index, "file_path", event.target.value)
                      }
                      maxLength={2048}
                      placeholder="https://cloud.example.com/shared-file"
                      required
                    />
                    <label htmlFor={`evidence-description-${index}`}>
                      Description (optional)
                    </label>
                    <input
                      id={`evidence-description-${index}`}
                      type="text"
                      value={entry.description}
                      onChange={(event) =>
                        updateEvidence(index, "description", event.target.value)
                      }
                      maxLength={500}
                    />
                    {evidence.length > 1 && (
                      <button
                        type="button"
                        className="remove-evidence"
                        onClick={() => removeEvidence(index)}
                      >
                        Remove link
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="add-evidence"
                  onClick={addEvidence}
                  disabled={evidence.length >= 10}
                >
                  Add another evidence link
                </button>
              </fieldset>

              {error && <p className="error-message" role="alert">{error}</p>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => navigate("/browse")}
                >
                  Cancel
                </button>
                <button type="submit" className="confirm-button" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit claim"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default RetrievalRequest;
