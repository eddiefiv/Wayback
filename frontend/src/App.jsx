import { useState } from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./Pages/Header.jsx";
import Home from "./Pages/Home.jsx";
import Browse from "./Pages/Browse.jsx";
import Post from "./Pages/Post.jsx";
import "./App.css";
import RetrievalRequest from "./Pages/Request.jsx";
import {getItems, saveItem} from "./temporary.js";

function App() {
  const [items, setItems] = useState(getItems);

  function addItem(newItem) {
    const updatedItems = saveItem(newItem);
    setItems(updatedItems);
  }

  return (
    <BrowserRouter>
      <Header />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/browse"
          element={<Browse items={items} />}
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