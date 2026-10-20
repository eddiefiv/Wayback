import {Link} from 'react-router-dom';
import React from 'react';
import './css/Header.css';

function Header() {

  return (
        <header className="header">
             <div className="logo">
                 WayBack
            </div>
            <nav className="nav">
                <a className="nav-link" href="/">Home</a>
                <a className="nav-link" href="/browse">Browse</a>
                <a className="nav-link" href="/post">Post</a>
                <a className="nav-link" href="/login">Login</a>
            </nav>
        </header>
  );
}

export default Header;