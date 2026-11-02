
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./Pages/Header.jsx";
import Home from "./Pages/Home.jsx";
import Browse from "./Pages/Browse.jsx";
import Post from "./Pages/Post.jsx";
import "./App.css";
import RetrievalRequest from "./Pages/Request.jsx";

function App() {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [itemsError, setItemsError] = useState("");

  useEffect(() => {
    async function loadItems() {
      try {
        const response = await fetch("http://localhost:3000/api/items");

        if (!response.ok) {
          throw new Error("Failed to load items.");
        }

        const data = await response.json();

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

  return (
    <BrowserRouter>
      <Header />

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
          element={<Post addItem={addItem} />}
        />

        <Route
          path="/retrieve/:itemId"
          element={<RetrievalRequest items={items} />}
        />

        <Route
          path="/login"
          element={<h2>Login Coming Soon</h2>}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
