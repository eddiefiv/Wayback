
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./css/Post.css";

function Post({ addItem }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "Lost",
    date: "",
    location: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.date ||
      !form.location.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("http://localhost:3000/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to post item.");
      }

      addItem(data);
      setSuccess("Item posted successfully!");

      setTimeout(() => {
        navigate("/browse");
      }, 1000);
    } catch (error) {
      console.error("Error posting item:", error);
      setError(
        error.message || "Could not connect to the server. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="post-page">
      <h2>Post an Item</h2>

      <form onSubmit={handleSubmit} noValidate>
        <label>Title</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          required
        />

        <label>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          required
        />

        <label>Type</label>
        <select
          name="type"
          value={form.type}
          onChange={handleChange}
        >
          <option value="Lost">Lost</option>
          <option value="Found">Found</option>
        </select>

        <label>Date</label>
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          required
        />

        <label>Location</label>
        <input
          name="location"
          value={form.location}
          onChange={handleChange}
          required
        />

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="success-message" role="status">
            {success}
          </p>
        )}

        <button type="submit" disabled={submitting || !!success}>
          {submitting ? "Submitting..." : success ? "Submitted!" : "Submit"}
        </button>
      </form>
    </main>
  );
}

export default Post;
