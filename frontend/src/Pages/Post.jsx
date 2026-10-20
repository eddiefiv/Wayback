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

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  function handleSubmit(e) {
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

    try {
      addItem(form);
      setSuccess("Item posted successfully!");

      setTimeout(() => {
        navigate("/browse");
      }, 2000);
    } catch{
      setError("Failed to post item.");
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
        />

        <label>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
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
        />

        <label>Location</label>
        <input

          name="location"
          value={form.location}
          onChange={handleChange}
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

      <button type="submit" disabled={!!success}>
        {success ? "Submitted!" : "Submit"}
      </button>
      </form>
    </main>
  );
}

export default Post;