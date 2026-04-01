import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const user = JSON.parse(sessionStorage.getItem('user'));

  const isLoggedIn = user !== null;

  const handleLogout = () => {
    sessionStorage.removeItem('user');

    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-white shadow z-50 px-4 py-3 flex justify-between items-center">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="font-bold text-xl">
          Stay Easy
        </Link>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 focus:outline-none"
        >
          ☰
        </button>

        <div className="hidden md:flex space-x-4 items-center">
          <Link to="/">Home</Link>
          {isLoggedIn && <Link to="/upload">Upload Listing</Link>}
          {isLoggedIn && <Link to="/profile">Profile</Link>}
          {isLoggedIn ? (
            <button onClick={handleLogout} className="hover:underline">
              Logout
            </button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden mt-4">
          <Link to="/" className="block py-2">Home</Link>
          {isLoggedIn && <Link to="/upload" className="block py-2">Upload Listing</Link>}
          {isLoggedIn && <Link to="/profile" className="block py-2">Profile</Link>}
          {isLoggedIn ? (
            <button onClick={handleLogout} className="block py-2 w-full text-left hover:underline">
              Logout
            </button>
          ) : (
            <Link to="/login" className="block py-2">Login</Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;