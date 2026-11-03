import { Link } from "react-router-dom";
import "./css/Header.css";

function Header({ user, onLogout }) {
  return (
    <header className="header">
      <Link className="logo" to="/">WayBack</Link>
      <nav className="nav">
        <Link className="nav-link" to="/">Home</Link>
        <Link className="nav-link" to="/browse">Browse</Link>
        <Link className="nav-link" to="/post">Post</Link>
        {user ? (
          <>
            <span className="nav-link">Hi, {user.name}</span>
            <button className="nav-link" type="button" onClick={onLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/login">Login</Link>
            <Link className="nav-link" to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Header;