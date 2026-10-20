import { Link } from "react-router-dom";
import "./css/Home.css";

function Home() {
  return (
    <main className="home">
      <h1>WayBack</h1>

      <p>Lost something? Found something?</p>

      <p>Help lost items find their way back home.</p>

       <div className="home-buttons">
        <Link to="/browse" className="home-btn">
          Browse Items
        </Link>
        <Link to="/post" className="home-btn">
          Post an Item
        </Link>
      </div>
    </main>
  );
}

export default Home;