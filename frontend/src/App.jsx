
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Header from "./Pages/Header.jsx";
import Home from "./Pages/Home.jsx";
import Browse from "./Pages/Browse.jsx";
import Post from "./Pages/Post.jsx";
import "./App.css";
import RetrievalRequest from "./Pages/Request.jsx";
import Login from "./Pages/Login.jsx";
import Register from "./Pages/Register.jsx";
import MyClaims from "./Pages/MyClaims.jsx";
import StaffDashboard from "./Pages/StaffDashboard.jsx";
import MySubmissions from "./Pages/MySubmissions.jsx";
import SystemAdmin from "./Pages/SystemAdmin.jsx";
import { getItems } from "./api.js";

function readStoredAuth() {
  try {
    const storedAuth = JSON.parse(sessionStorage.getItem("wayback-auth"));
    return storedAuth?.token && storedAuth?.user ? storedAuth : null;
  } catch {
    return null;
  }
}

function StatusPage({ code, title, description }) {
  return (
    <main className="status-page">
      <p className="status-code">{code}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link to="/">Return home</Link>
    </main>
  );
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
        <Route path="/" element={<Home user={auth?.user} />} />

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
            auth?.user.role === "security_staff" || auth?.user.role === "system_administrator" ? (
              <Navigate to="/unauthorized" replace />
            ) : auth?.user.role === "community" ? (
              auth.user.can_post ? (
                <Post addItem={addItem} token={auth.token} />
              ) : (
                <StatusPage code="403" title="Posting disabled" description="Your account does not have permission to post listings." />
              )
            ) : (
              <p>Please <Link to="/login">log in</Link> to post an item.</p>
            )
          }
        />

        <Route
          path="/retrieve/:itemId"
          element={
            <RetrievalRequest
              items={items}
              token={auth?.token}
              user={auth?.user}
              loading={loadingItems}
            />
          }
        />

        <Route
          path="/login"
          element={<Login onLogin={handleLogin} user={auth?.user} />}
        />

        <Route path="/register" element={<Register />} />

        <Route
          path="/claims"
          element={
            auth?.user.role === "security_staff" || auth?.user.role === "system_administrator" ? (
              <Navigate to="/unauthorized" replace />
            ) : auth?.user.role === "community" ? (
              auth.user.can_claim ? (
                <MyClaims token={auth.token} />
              ) : (
                <StatusPage code="403" title="Claiming disabled" description="Your account does not have permission to submit claims." />
              )
            ) : (
              <p>Please <Link to="/login">log in</Link> to view your claims.</p>
            )
          }
        />

        <Route
          path="/submissions"
          element={
            auth?.user.role === "community" ? (
              <MySubmissions token={auth.token} canEdit={auth.user.can_post} />
            ) : auth?.user ? (
              <Navigate to="/unauthorized" replace />
            ) : (
              <p>Please <Link to="/login">log in</Link> to view your submissions.</p>
            )
          }
        />

        <Route
          path="/submissions/:itemId"
          element={
            auth?.user.role === "community" ? (
              <MySubmissions token={auth.token} canEdit={auth.user.can_post} />
            ) : auth?.user ? (
              <Navigate to="/unauthorized" replace />
            ) : (
              <p>Please <Link to="/login">log in</Link> to view your submissions.</p>
            )
          }
        />

        <Route
          path="/staff"
          element={
            auth?.user.role === "security_staff" ? (
              <StaffDashboard token={auth.token} />
            ) : (
              <p>This dashboard is available to security staff only.</p>
            )
          }
        />

        <Route
          path="/admin"
          element={
            auth?.user.role === "system_administrator" ? (
              <SystemAdmin token={auth.token} />
            ) : (
              <Navigate to="/unauthorized" replace />
            )
          }
        />

        <Route
          path="/admin/reports"
          element={
            auth?.user.role === "system_administrator" ? (
              <SystemAdmin token={auth.token} section="reports" />
            ) : (
              <Navigate to="/unauthorized" replace />
            )
          }
        />

        <Route
          path="/admin/users/:userId"
          element={
            auth?.user.role === "system_administrator" ? (
              <SystemAdmin token={auth.token} />
            ) : (
              <Navigate to="/unauthorized" replace />
            )
          }
        />

        <Route
          path="/unauthorized"
          element={<StatusPage code="401" title="Unauthorized" description="You do not have permission to view this page." />}
        />

        <Route
          path="*"
          element={<StatusPage code="404" title="Page not found" description="The page you are looking for could not be found." />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
