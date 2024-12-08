import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, Alert, TextInput, Switch, SafeAreaView } from "react-native";
import MapView, { Marker, Polygon, Callout } from "react-native-maps";

import * as Location from "expo-location";

// Interfaces for data structures
interface ParkingFeature {
  properties: {
    name: string;
    tyyppi: string;
    status: string;
    autopaikk: number;
    sahkoauto: boolean;
    inva: boolean;
  };
  geometry: {
    coordinates: number[][][];
  };
}

interface LocationState {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export default function App() {
  const [parkingData, setParkingData] = useState<ParkingFeature[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationState | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    electric: false,
    disability: false,
  });

  // Get current location
  useEffect(() => {
    const getLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location access is required to use this app.");
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (error) {
        console.error("Error getting location:", error);
        Alert.alert("Error", "Failed to get location.");
      }
    };

    getLocation();
  }, []);

  // Fetch parking data
  useEffect(() => {
    const fetchParkingData = async () => {
      try {
        // Replace with your local server IP
        const response = await fetch("http://192.168.137.74:3300/proxy");
        const data = await response.json();

        // Debug: Log data to verify structure
        console.log("Fetched parking data:", data);

        if (data && data.features) {
          setParkingData(data.features);
        } else {
          Alert.alert("Error", "Invalid data format received from the server.");
        }
      } catch (error) {
        console.error("Error fetching parking data:", error);
        Alert.alert("Error", "Failed to fetch parking data.");
      }
    };

    fetchParkingData();
  }, []);

  // Filter parking data based on user inputs
  const filteredParkingData = parkingData.filter((record) => {
    const { sahkoauto, inva, name, tyyppi } = record.properties;
    return (
      (!filters.electric || sahkoauto) &&
      (!filters.disability || inva) &&
      (name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tyyppi.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  if (!currentLocation) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Parking App</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={currentLocation}
          showsUserLocation
        >
          {parkingData.map((feature, index) => {
            if (!Array.isArray(feature.geometry.coordinates[0])) {
              console.error("Invalid polygon data:", feature.geometry.coordinates);
              return null; // Skip invalid data
            }

            // Map polygons
            return (
              <Polygon
                key={index}
                coordinates={feature.geometry.coordinates[0].map(
                  ([lng, lat]) => ({
                    latitude: lat,
                    longitude: lng,
                  })
                )}
                strokeColor="#FF0000"
                strokeWidth={2}
                fillColor="rgba(0, 255, 255, 0.5)"
              />
            );
          })}
          {filteredParkingData.map((feature, index) => {
            const [lng, lat] = feature.geometry.coordinates[0][0];

            return (
              <Marker
                key={index}
                coordinate={{ latitude: lat, longitude: lng }}
              >
                <Image
                  source={require('./assets/map-marker.png')}
                  style={{ width: 35, height: 35 }}
                />
                <Callout
                  onPress={() => {
                    console.log('Callout pressed');
                  }}
                  style={{ width: 250, height: 150 }}
                >
                  <View style={styles.calloutContainer}>
                    <Text style={styles.calloutTitle}>{feature.properties.name}</Text>
                    <Text style={styles.calloutText}>Type: {feature.properties.tyyppi}</Text>
                    <Text style={styles.calloutText}>Status: {feature.properties.status}</Text>
                    <Text style={styles.calloutText}>Spaces: {feature.properties.autopaikk}</Text>
                    <Text style={styles.calloutText}>Electric: {feature.properties.sahkoauto ? "Yes" : "No"}</Text>
                    <Text style={styles.calloutText}>Disability: {feature.properties.inva ? "Yes" : "No"}</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>

        <TextInput
          style={styles.searchInputAbsolute}
          placeholder="Search parking spots"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        <View style={styles.filtersOverlay}>
          <View style={styles.filterCard}>
            <View style={styles.filterRow}>
              <Text style={styles.filterText}>Electric Vehicle</Text>
              <Switch
                value={filters.electric}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, electric: value }))
                }
              />
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterText}>Disability Spaces</Text>
              <Switch
                value={filters.disability}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, disability: value }))
                }
              />
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Styles for the app
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop : 28,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    height: '8%', // Reduced height for just the title
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',

    color: '#333',
    textAlign: 'center', // Centers the text itself
  },
  mapContainer: {
    flex: 1, // Takes remaining space
    position: 'relative',
    marginTop: 8,

  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchInputAbsolute: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filtersOverlay: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    zIndex: 1,
    alignItems: 'center',
    width: '50%',
  },
  filterCard: {
    backgroundColor: 'rgba(255, 255, 255, 1)', // Semi-transparent white
    borderRadius: 12,

    padding: 6,
    marginLeft: 38,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%', // Set a specific width
    alignSelf: 'center', // Center itself
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  filterText: {
    fontSize: 12,
    marginRight: 12,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  calloutContainer: {
    width: 250,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    minHeight: 150,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  calloutText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
  },
});
