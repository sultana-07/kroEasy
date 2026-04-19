import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Circle, Autocomplete } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '12px',
};

const MAP_LIBRARIES = ['places'];

const MapPicker = ({ 
  center = { lat: 28.6139, lng: 77.2090 }, 
  onLocationSelect, 
  radius = 5,
  showRadius = false 
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES
  });

  const [markerPos, setMarkerPos] = useState(center);
  const [mapCenter, setMapCenter] = useState(center);
  const [autocomplete, setAutocomplete] = useState(null);

  useEffect(() => {
    setMarkerPos(center);
    setMapCenter(center);
  }, [center]);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const newPos = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
        setMarkerPos(newPos);
        setMapCenter(newPos);
        if (onLocationSelect) onLocationSelect(newPos);
      }
    }
  };

  const onMapClick = useCallback((e) => {
    const newPos = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };
    setMarkerPos(newPos);
    if (onLocationSelect) onLocationSelect(newPos);
  }, [onLocationSelect]);

  const onMarkerDragEnd = (e) => {
    const newPos = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };
    setMarkerPos(newPos);
    if (onLocationSelect) onLocationSelect(newPos);
  };

  return isLoaded ? (
    <div className="map-picker-container" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 10, width: '90%', maxWidth: '400px' }}>
        <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
          <input 
            type="text" 
            placeholder="🔍 Search address or landmark..." 
            style={{ width: '100%', padding: '10px 16px', borderRadius: '24px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', fontWeight: '500' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault(); // Prevent form submission if MapPicker is in a form
            }}
          />
        </Autocomplete>
      </div>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={13}
        onClick={onMapClick}
        options={{
            disableDefaultUI: true,
            zoomControl: true,
        }}
      >
        <Marker
          position={markerPos}
          draggable={true}
          onDragEnd={onMarkerDragEnd}
        />
        {showRadius && (
          <Circle
            center={markerPos}
            radius={radius * 1000} // radius in meters
            options={{
              fillColor: '#3B82F6',
              fillOpacity: 0.2,
              strokeColor: '#3B82F6',
              strokeOpacity: 0.5,
              strokeWeight: 1,
            }}
          />
        )}
      </GoogleMap>
    </div>
  ) : <div className="map-placeholder">Loading Map...</div>;
};

export default React.memo(MapPicker);
