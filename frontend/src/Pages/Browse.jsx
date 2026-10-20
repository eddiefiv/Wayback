import { useState } from "react";
import { Link } from "react-router-dom";
import "./css/Browse.css";

function formatDate(dateString) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function Browse({ items = [] }) {
  const [search, setSearch] = useState("");

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="browse-page">
      <h2>Lost and Found Items</h2>

      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredItems.length === 0 ? (
        <p>No matching items found.</p>
      ) : (
        filteredItems.map((item) => (
          <Link
            to={
              item.type === "Found"
                ? `/retrieve/${item.item_id ?? item.id}`
                : "#"
            }
            className="item-card item-link"
            key={item.item_id ?? item.id}
            onClick={(e) => {
              if (item.type !== "Found") {
                e.preventDefault();
              }
            }}
          >
            <div className="item-info">
              <h3>{item.title}</h3>

              <span
                className={`status ${
                  item.type === "Lost" ? "lost" : "found"
                }`}
              >
                {item.type}
              </span>

              <p>
                {formatDate(item.date)} • {item.location}
              </p>

              <p>{item.description}</p>
            </div>

            <span className="item-arrow">›</span>
          </Link>
        ))
      )}
    </main>
  );
}

export default Browse;