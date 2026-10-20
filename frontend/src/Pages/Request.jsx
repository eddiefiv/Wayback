
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";


function RetrievalRequest({ items }) {
  const { itemId } = useParams();
  const navigate = useNavigate();

  const [confirmed, setConfirmed] = useState(false);

  const item = items.find(
    (item) => String(item.item_id ?? item.id) === itemId
  );

  if (!item || item.type !== "Found") {
    return (
      <main className="details-page">
        <h2>Item Not Available</h2>
        <button onClick={() => navigate("/browse")}>
          Back to Browse
        </button>
      </main>
    );
  }

  function handleConfirm() {
    setConfirmed(true);
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
        {confirmed ? (
          <>
            <h2>Request Confirmed</h2>
            <p>
              You confirmed that you want to retrieve this item.
            </p>
            <button
              className="confirm-button"
              onClick={() => navigate("/browse")}
            >
              Back to Browse
            </button>
          </>
        ) : (
          <>
            <h2>Request to Retrieve</h2>

            <p className="modal-question">
              Are you sure you want to request to retrieve this item?
            </p>

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={() => navigate("/browse")}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-button"
                onClick={handleConfirm}
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default RetrievalRequest;
