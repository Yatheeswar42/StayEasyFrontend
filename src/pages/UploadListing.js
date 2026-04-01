import React, { useState, useRef, useEffect } from "react";
import { FaCheckCircle, FaTimesCircle, FaMapMarkerAlt, FaUpload } from "react-icons/fa";
import { AiOutlineArrowRight, AiOutlineArrowLeft } from "react-icons/ai";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DefaultIcon = L.icon({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const LocationMarker = ({ onLocationSelect, position }) => {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });

  return position ? (
    <Marker position={position}>
      <Popup>Property Location</Popup>
    </Marker>
  ) : null;
};

const UploadListing = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    propertyName: "",
    category: "Hostel",
    address: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
      coordinates: null,
    },
    landmarks: "",
    roomType: "Private Room",
    rent: "",
    deposit: "",
    availability: "Available Now",
    maxOccupancy: "",
    amenities: [],
    rules: "",
    images: [],
  });
  const [userLocation, setUserLocation] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          if (!formData.address.coordinates) {
            handleLocationSelect({ lat: latitude, lng: longitude });
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          // Default to a central location if geolocation fails
          const defaultLocation = { lat: 20.5937, lng: 78.9629 }; // Center of India
          setUserLocation([defaultLocation.lat, defaultLocation.lng]);
          handleLocationSelect(defaultLocation);
        }
      );
    }
  }, []);

  // Enhanced location selection with reverse geocoding
  const handleLocationSelect = async (latlng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`
      );
      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        address: {
          street: data.address?.road || prev.address.street,
          city: data.address?.city || data.address?.town || prev.address.city,
          state: data.address?.state || prev.address.state,
          postalCode: data.address?.postcode || prev.address.postalCode,
          country: data.address?.country || "India",
          coordinates: [latlng.lat, latlng.lng]
        }
      }));
    } catch (error) {
      console.error("Geocoding error:", error);
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          coordinates: [latlng.lat, latlng.lng]
        }
      }));
    }
  };

  // Update map position when address fields change
  const handleAddressChange = async (e) => {
    const { name, value } = e.target;
    const field = name.split(".")[1];
    
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value
      }
    }));
    
    // If all address fields are filled, try to geocode
    if (field !== 'coordinates' && 
        formData.address.street && 
        formData.address.city && 
        formData.address.state) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${
            encodeURIComponent(
              `${formData.address.street}, ${formData.address.city}, ${formData.address.state}, India`
            )
          }`
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setFormData(prev => ({
            ...prev,
            address: {
              ...prev.address,
              coordinates: [parseFloat(lat), parseFloat(lon)]
            }
          }));
        }
      } catch (error) {
        console.error("Forward geocoding error:", error);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith("address.")) {
      handleAddressChange(e);
    } else if (type === "checkbox") {
      setFormData(prev => ({
        ...prev,
        amenities: checked
          ? [...prev.amenities, name]
          : prev.amenities.filter(amenity => amenity !== name),
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files || e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const uploadedImageUrls = [];

    try {
      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} is too large (max 5MB)`);
          continue;
        }
        if (!file.type.startsWith("image/")) {
          alert(`File ${file.name} is not an image`);
          continue;
        }

        const imageData = new FormData();
        imageData.append("file", file);
        imageData.append("upload_preset", "stay-easy-preset");
        imageData.append("folder", "stay-easy-listings");

        const response = await fetch("https://api.cloudinary.com/v1_1/dkfoj6lom/image/upload", {
          method: "POST",
          body: imageData,
        });
        
        const data = await response.json();
        if (data.secure_url) {
          uploadedImageUrls.push(data.secure_url);
        }
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImageUrls],
      }));
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Some images failed to upload. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleImageUpload(e);
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => setStep(prev => prev - 1);

  const validateStep = (step) => {
    const newErrors = {};
    let isValid = true;

    switch (step) {
      case 1:
        if (!formData.propertyName.trim()) {
          newErrors.propertyName = "Property Name is required";
          isValid = false;
        }
        if (!formData.address.coordinates) {
          newErrors.location = "Please select a location on the map";
          isValid = false;
        }
        if (!formData.address.street.trim()) {
          newErrors.street = "Street address is required";
          isValid = false;
        }
        if (!formData.address.city.trim()) {
          newErrors.city = "City is required";
          isValid = false;
        }
        break;
      
      case 2:
        if (!formData.rent || isNaN(formData.rent)) {
          newErrors.rent = "Valid rent amount is required";
          isValid = false;
        }
        if (!formData.deposit || isNaN(formData.deposit)) {
          newErrors.deposit = "Valid deposit amount is required";
          isValid = false;
        }
        break;
      
      case 4:
        if (formData.images.length < 3) {
          newErrors.images = "At least 3 images are required";
          isValid = false;
        }
        break;
      
      default:
        break;
    }

    setErrors(newErrors);
    return isValid;
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const setAsCoverImage = (index) => {
    if (index === 0) return;
    
    const newImages = [
      formData.images[index],
      ...formData.images.filter((_, i) => i !== index)
    ];
    
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(5)) return;
    
    setIsSubmitting(true);
    setSubmitStatus(null);
  
    try {
      // Get user ID from localStorage (using either method)
      const userId = sessionStorage.getItem("userId");
const userData = JSON.parse(sessionStorage.getItem("user"));

      
      // Verify we have a valid user ID
      if (!userId && (!userData || !userData.id)) {
        throw new Error("You must be logged in to create a listing");
      }
  
      const ownerId = userId || userData.id;
  
      const payload = {
        ...formData,
        rent: Number(formData.rent),
        deposit: Number(formData.deposit),
        maxOccupancy: Number(formData.maxOccupancy) || 1,
        ownerId: ownerId // Include the owner ID in payload
      };
  
      const response = await axios.post(
        "http://localhost:8080/api/listings/create",
        payload
      );
  
      setSubmitStatus("success");
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } catch (error) {
      console.error("Submission error:", error);
      setSubmitStatus("error");
      
      if (error.response?.status === 401) {
        alert("Session expired. Please login again.");
        navigate('/login');
      } else {
        alert(error.message || "Failed to submit listing");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">List Your Property</h1>
      
      <div className="mb-6">
        <div className="flex justify-between mb-1 text-sm">
          <span>Step {step} of 5</span>
          <span>{Math.round((step / 5) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 h-2 rounded">
          <div
            className="bg-blue-500 h-2 rounded transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      {submitStatus === "success" && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4 flex items-center">
          <FaCheckCircle className="mr-2" /> 
          Listing submitted successfully! Redirecting...
        </div>
      )}

      {submitStatus === "error" && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4 flex items-center">
          <FaTimesCircle className="mr-2" /> 
          Failed to submit listing. Please try again.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Property Information</h2>
            
            <div>
              <label className="block text-gray-700 mb-1">Property Name*</label>
              <input
                type="text"
                name="propertyName"
                placeholder="e.g., Sunshine Hostel"
                value={formData.propertyName}
                onChange={handleChange}
                className={`border p-2 w-full rounded ${errors.propertyName ? "border-red-500" : ""}`}
              />
              {errors.propertyName && <p className="text-red-500 text-sm mt-1">{errors.propertyName}</p>}
            </div>

            <div>
              <label className="block text-gray-700 mb-1">Property Type*</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="border p-2 w-full rounded"
              >
                <option value="Hostel">Hostel</option>
                <option value="PG">PG Accommodation</option>
                <option value="Apartment">Apartment</option>
                <option value="House">House</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 mb-1">Property Location*</label>
              <div className="text-sm text-gray-600 mb-2 flex items-center">
                <FaMapMarkerAlt className="mr-1" /> 
                {userLocation ? (
                  <span>Detected your location automatically</span>
                ) : (
                  <span>Click on the map to mark your property location</span>
                )}
                {formData.address.coordinates && (
                  <span className="ml-2 text-blue-500">
                    ({formData.address.coordinates[0].toFixed(4)}, {formData.address.coordinates[1].toFixed(4)})
                  </span>
                )}
              </div>
              <div className="h-64 w-full rounded-md border">
                <MapContainer 
                  center={formData.address.coordinates || userLocation || [20.5937, 78.9629]} 
                  zoom={formData.address.coordinates ? 15 : (userLocation ? 15 : 5)} 
                  style={{ height: '100%', width: '100%' }}
                  key={formData.address.coordinates ? formData.address.coordinates.join(',') : 'default'}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <LocationMarker 
                    onLocationSelect={handleLocationSelect}
                    position={formData.address.coordinates && L.latLng(formData.address.coordinates)}
                  />
                </MapContainer>
              </div>
              {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
            </div>

            <div>
              <label className="block text-gray-700 mb-1">Street Address*</label>
              <input
                type="text"
                name="address.street"
                placeholder="e.g., 123 Main Street"
                value={formData.address.street}
                onChange={handleChange}
                className={`border p-2 w-full rounded ${errors.street ? "border-red-500" : ""}`}
              />
              {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">City*</label>
                <input
                  type="text"
                  name="address.city"
                  placeholder="e.g., Mumbai"
                  value={formData.address.city}
                  onChange={handleChange}
                  className={`border p-2 w-full rounded ${errors.city ? "border-red-500" : ""}`}
                />
                {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="block text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  name="address.state"
                  placeholder="e.g., Maharashtra"
                  value={formData.address.state}
                  onChange={handleChange}
                  className="border p-2 w-full rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">Postal Code</label>
                <input
                  type="text"
                  name="address.postalCode"
                  placeholder="e.g., 400001"
                  value={formData.address.postalCode}
                  onChange={handleChange}
                  className="border p-2 w-full rounded"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleChange}
                  className="border p-2 w-full rounded bg-gray-100"
                  disabled
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={nextStep}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center"
              >
                Next <AiOutlineArrowRight className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Pricing & Availability</h2>
            
            <div>
  <label className="block text-gray-700 mb-1">Room Type*</label>
  <select
    name="roomType"
    value={formData.roomType}
    onChange={handleChange}
    className="border p-2 w-full rounded"
  >
    <option value="Private Room">Private Room</option>
    <option value="Shared Room">Shared Room</option>
  </select>
</div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>
    <label className="block text-gray-700 mb-1">Monthly Rent (₹)*</label>
    <div className="relative">
      <span className="absolute left-3 top-2">₹</span>
      <input
        type="number"
        name="rent"
        placeholder="e.g., 10000"
        value={formData.rent}
        onChange={handleChange}
        className={`border p-2 w-full rounded pl-8 ${errors.rent ? "border-red-500" : ""}`}
        min="0"
      />
    </div>
    {errors.rent && <p className="text-red-500 text-sm mt-1">{errors.rent}</p>}
  </div>
  <div>
    <label className="block text-gray-700 mb-1">Security Deposit (₹)*</label>
    <div className="relative">
      <span className="absolute left-3 top-2">₹</span>
      <input
        type="number"
        name="deposit"
        placeholder="e.g., 20000"
        value={formData.deposit}
        onChange={handleChange}
        className={`border p-2 w-full rounded pl-8 ${errors.deposit ? "border-red-500" : ""}`}
        min="0"
      />
    </div>
    {errors.deposit && <p className="text-red-500 text-sm mt-1">{errors.deposit}</p>}
  </div>
</div>

<div>
  <label className="block text-gray-700 mb-1">Maximum Occupancy</label>
  <input
    type="number"
    name="maxOccupancy"
    placeholder="e.g., 2"
    value={formData.maxOccupancy}
    onChange={handleChange}
    className={`border p-2 w-full rounded ${formData.roomType === "Private Room" ? "bg-gray-100 cursor-not-allowed" : ""}`}
    min="1"
    disabled={formData.roomType === "Private Room"}
  />
  {formData.roomType === "Private Room" && (
    <p className="text-gray-500 text-sm mt-1">
      Maximum occupancy doesn't apply to private rooms
    </p>
  )}
</div>
            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={prevStep}
                className="text-gray-600 hover:text-gray-800 py-2 px-4 rounded flex items-center"
              >
                <AiOutlineArrowLeft className="mr-2" /> Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center"
              >
                Next <AiOutlineArrowRight className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Amenities & Rules</h2>
            
            <div>
              <label className="block text-gray-700 mb-2">Select Amenities:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "WiFi", "AC", "Kitchen", "Parking", 
                  "Laundry", "Security", "Power Backup", 
                  "Housekeeping", "TV", "Geyser", 
                  "Furnished", "Washing Machine"
                ].map((amenity) => (
                  <label key={amenity} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-500"
                    />
                    <span>{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={prevStep}
                className="text-gray-600 hover:text-gray-800 py-2 px-4 rounded flex items-center"
              >
                <AiOutlineArrowLeft className="mr-2" /> Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center"
              >
                Next <AiOutlineArrowRight className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Property Images</h2>
            <p className="text-gray-600 mb-4">
              Upload at least 3 photos (maximum 10). First image will be used as the cover photo.
            </p>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer 
                ${errors.images ? "border-red-500" : "border-gray-300 hover:border-blue-500"}`}
              onClick={() => fileInputRef.current.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <FaUpload className="mx-auto text-3xl text-gray-400 mb-2" />
              <p className="text-gray-600">Drag & drop images here or click to browse</p>
              <p className="text-sm text-gray-500 mt-1">Supports JPG, PNG (Max 5MB each)</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                multiple
                accept="image/*"
                className="hidden"
              />
            </div>
            {errors.images && <p className="text-red-500 text-sm">{errors.images}</p>}

            {formData.images.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Uploaded Images ({formData.images.length}/10)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={img}
                        alt={`Property ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => setAsCoverImage(index)}
                            className="bg-white text-xs p-1 rounded m-1"
                          >
                            Set as Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="bg-white text-xs p-1 rounded m-1"
                        >
                          Remove
                        </button>
                      </div>
                      {index === 0 && (
                        <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isUploading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-2">Uploading images...</p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={prevStep}
                className="text-gray-600 hover:text-gray-800 py-2 px-4 rounded flex items-center"
              >
                <AiOutlineArrowLeft className="mr-2" /> Back
              </button>
              <button
                type="button"
                onClick={nextStep}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded flex items-center"
              >
                Next <AiOutlineArrowRight className="ml-2" />
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Review Your Listing</h2>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 pb-2 border-b">Property Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Property Name</p>
                  <p>{formData.propertyName}</p>
                </div>
                <div>
                  <p className="font-semibold">Property Type</p>
                  <p>{formData.category}</p>
                </div>
                <div>
                  <p className="font-semibold">Room Type</p>
                  <p>{formData.roomType}</p>
                </div>
                <div>
                  <p className="font-semibold">Availability</p>
                  <p>{formData.availability}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="font-semibold">Address</p>
                  <p>
                    {formData.address.street}, {formData.address.city}, {formData.address.state}, 
                    {formData.address.postalCode && ` ${formData.address.postalCode},`} {formData.address.country}
                  </p>
                  {formData.address.coordinates && (
                    <a
                      href={`https://www.google.com/maps?q=${formData.address.coordinates[0]},${formData.address.coordinates[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 text-sm inline-block mt-1"
                    >
                      View on Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 pb-2 border-b">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Monthly Rent</p>
                  <p>₹{formData.rent}</p>
                </div>
                <div>
                  <p className="font-semibold">Security Deposit</p>
                  <p>₹{formData.deposit}</p>
                </div>
                <div>
                  <p className="font-semibold">Max Occupancy</p>
                  <p>{formData.maxOccupancy || "Not specified"}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 pb-2 border-b">Amenities</h3>
              {formData.amenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {amenity}
                    </span>
                  ))}
                </div>
              ) : (
                <p>No amenities specified</p>
              )}
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-3 pb-2 border-b">Property Images ({formData.images.length})</h3>
              {formData.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img}
                        alt={`Property ${index + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                      {index === 0 && (
                        <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded">
                          Cover
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No images uploaded</p>
              )}
            </div>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={prevStep}
                className="text-gray-600 hover:text-gray-800 py-2 px-4 rounded flex items-center"
              >
                <AiOutlineArrowLeft className="mr-2" /> Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded flex items-center"
              >
                {isSubmitting ? "Submitting..." : "Submit Listing"}{" "}
                <FaCheckCircle className="ml-2" />
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadListing;