// Home.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "aos/dist/aos.css";
import Navbar from "../components/Navbar";
import SearchBar from "../components/SearchBar";
import { FaMapMarkerAlt, FaSearch, FaUserCheck, FaMapMarkedAlt, FaUser, FaPhone, FaEnvelope } from "react-icons/fa";
import { motion } from "framer-motion";

const Home = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    roomType: "",
    propertyType: "",
    rentMin: "",
    rentMax: "",
  });

  const fetchListings = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:8080/api/listings/", {
        params: {
          search: searchTerm.trim(),
          roomType: filters.roomType,
          propertyType: filters.propertyType,
          rentMin: filters.rentMin,
          rentMax: filters.rentMax,
        },
      });
      setListings(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to load listings");
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, filters]);

  useEffect(() => {
    const fetchOwner = async () => {
      if (!selectedListing?.ownerId) return;
      try {
        const response = await axios.get(`http://localhost:8080/api/users/${selectedListing.ownerId}`);
        setOwnerInfo(response.data);
      } catch (error) {
        console.error("Error fetching owner:", error);
        setOwnerInfo(null);
      }
    };
    if (selectedListing) fetchOwner();
  }, [selectedListing]);

  const formatAddress = (address) => {
    if (!address) return "Location not specified";
    return `${address.street}, ${address.city}, ${address.state}`;
  };

  const handleListingClick = (listing) => {
    setSelectedListing(listing);
  };

  const closeListingDetail = () => {
    setSelectedListing(null);
    setOwnerInfo(null);
  };

  return (
    <div className="min-h-screen scroll-smooth relative">
      <Navbar />

      {/* Hero */}
      <section className="relative h-96 flex items-center justify-center">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551882547-ff40c63fe5fa')] bg-cover bg-center z-0" />
        <div className="relative z-10 bg-black bg-opacity-40 w-full h-full flex flex-col items-center justify-center p-4">
          <div className="text-center max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Discover Your Perfect Stay</h1>
            <div className="w-full max-w-2xl mx-auto">
              <SearchBar
                placeholder="Search by location or property name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <select value={filters.roomType} onChange={(e) => setFilters(prev => ({ ...prev, roomType: e.target.value }))} className="border p-2 rounded">
            <option value="">Room Type</option>
            <option value="Single">Private Room</option>
            <option value="Shared">Shared Room</option>
          </select>
          <select value={filters.propertyType} onChange={(e) => setFilters(prev => ({ ...prev, propertyType: e.target.value }))} className="border p-2 rounded">
            <option value="">Property Type</option>
            <option value="Apartment">Apartment</option>
            <option value="PG">PG Accommodation</option>
            <option value="House">House</option>
            <option value="Hostel">Hostel</option>
          </select>
          <input type="number" placeholder="Min Rent" value={filters.rentMin} onChange={(e) => setFilters(prev => ({ ...prev, rentMin: e.target.value }))} className="border p-2 rounded" />
          <input type="number" placeholder="Max Rent" value={filters.rentMax} onChange={(e) => setFilters(prev => ({ ...prev, rentMax: e.target.value }))} className="border p-2 rounded" />
        </div>

        {/* Listings */}
        {loading ? (
          <p className="text-center py-8">Loading listings...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : listings.length === 0 ? (
          <p className="text-center text-gray-600">No listings found matching your criteria.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg cursor-pointer" onClick={() => handleListingClick(listing)}>
                <div className="h-48 bg-gray-200 mb-3">
                  {listing.images && listing.images[0] ? (
                    <img src={listing.images[0]} alt={listing.propertyName} className="w-full h-full object-cover rounded" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">No Image</div>
                  )}
                </div>
                <h3 className="font-bold text-lg mb-1">{listing.propertyName}</h3>
                <p className="text-gray-600 text-sm mb-1">{formatAddress(listing.address)}</p>
                <p className="font-medium">₹{listing.rent}/month • {listing.roomType}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Listing Modal */}
      {selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">{selectedListing.propertyName}</h2>
              <button onClick={closeListingDetail} className="text-gray-500 text-2xl">✕</button>
            </div>

            {/* Image Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {selectedListing.images?.map((img, i) => (
                <img key={i} src={img} alt={`Listing ${i}`} className="w-full h-48 object-cover rounded" />
              ))}
            </div>

            {/* Address & Google Maps Link */}
            <div className="mb-6">
              <p className="font-semibold">Address</p>
              <div className="flex items-start text-sm text-gray-700">
                <FaMapMarkerAlt className="mt-1 mr-2 text-gray-500" />
                <p>
                  {formatAddress(selectedListing.address)}
                  {selectedListing.address?.postalCode && `, ${selectedListing.address.postalCode}`}
                  {selectedListing.address?.country && `, ${selectedListing.address.country}`}
                </p>
              </div>
              {selectedListing.address?.coordinates && (
                <a
                  href={`https://www.google.com/maps?q=${selectedListing.address.coordinates[0]},${selectedListing.address.coordinates[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm mt-1 inline-block"
                >
                  View on Google Maps
                </a>
              )}
            </div>

            {/* Owner Info */}
            {ownerInfo && (
              <div className="bg-blue-50 p-4 rounded mb-6">
                <h3 className="font-semibold text-lg mb-3">Owner Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center"><FaUser className="mr-2 text-blue-500" /> {ownerInfo.name}</div>
                  <div className="flex items-center"><FaPhone className="mr-2 text-blue-500" /> {ownerInfo.phone}</div>
                  <div className="flex items-center"><FaEnvelope className="mr-2 text-blue-500" /> {ownerInfo.email}</div>
                </div>
              </div>
            )}

            {/* Pricing */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">Pricing</h3>
              <p>Rent: ₹{selectedListing.rent} / month</p>
              <p>Deposit: ₹{selectedListing.deposit || "Not specified"}</p>
              <p>Max Occupancy: {selectedListing.maxOccupancy || "Not specified"}</p>
            </div>

            {/* Amenities */}
            {selectedListing.amenities?.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedListing.amenities.map((item, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">{item}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feature Cards */}
      <section className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16 text-gray-800">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[{
              icon: <FaSearch className="text-indigo-600 text-4xl mb-4" />,
              title: "Intelligent Search",
              desc: "Filter by location, room type, and budget with precision. Our system helps you discover listings that actually match your needs."
            }, {
              icon: <FaUserCheck className="text-green-600 text-4xl mb-4" />,
              title: "Verified Owners",
              desc: "Every listing features owner-verified details. Connect with confidence and eliminate middlemen from your rental journey."
            }, {
              icon: <FaMapMarkedAlt className="text-blue-600 text-4xl mb-4" />,
              title: "Interactive Maps",
              desc: "Explore your future neighborhood visually before booking. Get a feel for the surroundings with just a click."
            }].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                viewport={{ once: true }}
                className="bg-gray-50 p-8 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 text-center"
              >
                <div className="flex justify-center">{feature.icon}</div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
