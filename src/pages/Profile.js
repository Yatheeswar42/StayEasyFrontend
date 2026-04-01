import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import PropTypes from "prop-types";
import { FaTrash, FaMapMarkerAlt, FaUser, FaPhone, FaEnvelope } from 'react-icons/fa';

const API_BASE_URL = "http://localhost:8080";

const Profile = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const navigate = useNavigate();

  const fetchUserListings = async () => {
    try {
      const userId = sessionStorage.getItem("userId");
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const response = await axios.get(`${API_BASE_URL}/api/listings/user`, {
        params: { userId }
       
      });

      if (Array.isArray(response.data)) {
        setListings(response.data);
      } else {
        throw new Error("Unexpected data format");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setError(error.message);
      toast.error(error.response?.data?.message || "Failed to load your listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserListings();
  }, []);

  useEffect(() => {
    const fetchOwner = async () => {
      if (!selectedListing?.ownerId) return;
      try {
        const response = await axios.get(`${API_BASE_URL}/api/users/${selectedListing.ownerId}`);
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

  const handleDelete = async (listingId, e) => {
    e.stopPropagation(); // Prevent triggering the listing click
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
  
    try {
      const userId = sessionStorage.getItem("userId");
      if (!userId) {
        toast.error("Session expired. Please login again.");
        return;
      }
  
      const response = await axios.delete(
        `${API_BASE_URL}/api/listings/${listingId}`,
        {
          params: { userId },
          headers: { 'Content-Type': 'application/json' }
        }
      );
  
      if (response.status === 204) {
        setListings(prev => prev.filter(l => (l._id || l.id) !== listingId));
        toast.success("Listing deleted successfully");
      }
    } catch (error) {
      console.error("Full error:", error);
      const errorMessage = error.response?.data?.error || 
                          error.message || 
                          "Failed to delete listing. Please try again.";
      toast.error(errorMessage);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Listings</h1>
      <button
        onClick={() => navigate("/upload")}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-6 hover:bg-blue-600"
        aria-label="Add new listing"
      >
        Add New Listing
      </button>

      {listings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">You haven't listed any properties yet.</p>
          <button
            onClick={() => navigate("/upload")}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            aria-label="Create your first listing"
          >
            Create Your First Listing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => {
            const listingId = listing._id || listing.id;
            return (
              <div 
                key={listingId} 
                className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg cursor-pointer"
                onClick={() => handleListingClick(listing)}
              >
                <div className="h-48 bg-gray-200">
                  {listing.images?.length > 0 ? (
                    <img
                      src={listing.images[0]}
                      alt={`Property: ${listing.propertyName}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/placeholder-image.jpg";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <img src="/placeholder-image.jpg" alt="No image available" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-semibold">{listing.propertyName}</h2>
                  <p className="text-gray-600">{listing.address?.city}, {listing.address?.state}</p>
                  <p className="font-bold">₹{listing.rent}/month</p>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={(e) => handleDelete(listingId, e)}
                      className="text-red-500 hover:text-red-700 transition-colors p-2"
                      aria-label={`Delete listing ${listing.propertyName}`}
                    >
                      <FaTrash className="text-4xl" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Listing Modal - Same as in Home.js */}
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
    </div>
  );
};

Profile.propTypes = {
  listings: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      id: PropTypes.string,
      propertyName: PropTypes.string.isRequired,
      address: PropTypes.shape({
        city: PropTypes.string,
        state: PropTypes.string
      }),
      rent: PropTypes.number.isRequired,
      images: PropTypes.arrayOf(PropTypes.string)
    })
  )
};

export default Profile;