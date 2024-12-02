import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  loaded: boolean;
  coordinates: { lat: number; lng: number };
  error?: string;
}

const useGeoLocation = () => {
  const [location, setLocation] = useState<LocationState>({
    loaded: false,
    coordinates: { lat: 60.1699, lng: 24.9384 }, // Default to Helsinki coordinates
  });

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocation({
            loaded: true,
            coordinates: { lat: 60.1699, lng: 24.9384 },
            error: 'Permission to access location was denied',
          });
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          loaded: true,
          coordinates: {
            lat: currentLocation.coords.latitude,
            lng: currentLocation.coords.longitude,
          },
        });
      } catch (error) {
        setLocation({
          loaded: true,
          coordinates: { lat: 60.1699, lng: 24.9384 },
          error: 'Error getting location',
        });
      }
    })();
  }, []);

  const refreshLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        loaded: true,
        coordinates: {
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
        },
      });
    } catch (error) {
      setLocation(prev => ({
        ...prev,
        error: 'Error refreshing location',
      }));
    }
  };

  return { ...location, refreshLocation };
};

export default useGeoLocation;
