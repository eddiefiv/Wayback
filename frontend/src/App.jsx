
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Header from "./Pages/Header.jsx";
import Home from "./Pages/Home.jsx";
import Browse from "./Pages/Browse.jsx";
import Post from "./Pages/Post.jsx";
import "./App.css";
import RetrievalRequest from "./Pages/Request.jsx";
import Login from "./Pages/Login.jsx";
import Register from "./Pages/Register.jsx";
import { getItems } from "./api.js";

function readStoredAuth() {
  try {
    const storedAuth = JSON.parse(sessionStorage.getItem("wayback-auth"));
    return storedAuth?.token && storedAuth?.user ? storedAuth : null;
  } catch {
    return null;
  }
}

function App() {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [auth, setAuth] = useState(readStoredAuth);

  useEffect(() => {
    async function loadItems() {
      try {
        const data = await getItems();

        // Convert database fields to the format the frontend expects.
        const formattedItems = data.map((item) => ({
          ...item,
          item_id: item.id,
          type: item.item_type === "found" ? "Found" : "Lost",
          date: item.event_date,
          location: item.location_text ?? ""
        }));

        setItems(formattedItems);
      } catch (error) {
        console.error("Error loading items:", error);
        setItemsError("Could not load items. Please check that the backend is running.");
      } finally {
        setLoadingItems(false);
      }
    }

    loadItems();
  }, []);

  function addItem(item) {
    const formattedItem = {
      ...item,
      item_id: item.id,
      type: item.item_type === "found" ? "Found" : "Lost",
      date: item.event_date,
      location: item.location_text ?? ""
    };

    setItems((currentItems) => [formattedItem, ...currentItems]);
  }

  function handleLogin(authData) {
    sessionStorage.setItem("wayback-auth", JSON.stringify(authData));
    setAuth(authData);
  }

  function handleLogout() {
    sessionStorage.removeItem("wayback-auth");
    setAuth(null);
  }

  return (
    <BrowserRouter>
      <Header user={auth?.user} onLogout={handleLogout} />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/browse"
          element={
            loadingItems ? (
              <p>Loading items...</p>
            ) : itemsError ? (
              <p>{itemsError}</p>
            ) : (
              <Browse items={items} />
            )
          }
        />

        <Route
          path="/post"
          element={
            auth ? (
              <Post addItem={addItem} token={auth.token} />
            ) : (
              <p>Please <Link to="/login">log in</Link> to post an item.</p>
            )
          }
        />

        <Route
          path="/retrieve/:itemId"
          element={<RetrievalRequest items={items} />}
        />

        <Route
          path="/login"
          element={<Login onLogin={handleLogin} user={auth?.user} />}
        />

        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
