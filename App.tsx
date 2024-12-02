import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, TextInput, Switch, SafeAreaView } from "react-native";
import MapView, { Marker, Polygon, Callout } from "react-native-maps";
import useGeoLocation from "./geoLocation";
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

  // Fetch parking data
  useEffect(() => {
    const fetchParkingData = async () => {
      try {
        // Replace with your local server IP
        const response = await fetch("http://192.168.53.74:3300/proxy");
        const data = await response.json();

        // Debug: Log data structure
        console.log("Received data structure:", {
          type: data.type,
          featureCount: data.features?.length || 0,
          sampleFeature: data.features?.[0]
        });

        if (data && data.features) {
          // Validate the data structure
          const validFeatures = data.features.filter(feature => {
            const hasValidCoordinates = feature.geometry?.coordinates?.[0]?.length > 0;
            if (!hasValidCoordinates) {
              console.warn('Invalid feature coordinates:', feature);
              return false;
            }
            return true;
          });

          console.log(`Valid features: ${validFeatures.length} out of ${data.features.length}`);
          setParkingData(validFeatures);
        } else {
          throw new Error("Invalid data format received");
        }
      } catch (error) {
        console.error("Error fetching parking data:", error);
        Alert.alert(
          "Error",
          "Failed to fetch parking data. Please check your connection and try again."
        );
      }
    };

    fetchParkingData();
  }, []);

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
        <Text style={styles.title}>Parking Finder</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search parking spots"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <View style={styles.filters}>
          <View style={styles.filterRow}>
            <Text>Electric Vehicle</Text>
            <Switch
              value={filters.electric}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, electric: value }))
              }
            />
          </View>
          <View style={styles.filterRow}>
            <Text>Disability Spaces</Text>
            <Switch
              value={filters.disability}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, disability: value }))
              }
            />
          </View>
        </View>
      </View>

      <MapView
        style={styles.map}
        initialRegion={currentLocation}
        showsUserLocation
      >
        {parkingData.map((feature, index) => {
          console.log(`Rendering feature ${index}:`, feature.geometry.coordinates[0]);
          
          if (!Array.isArray(feature.geometry.coordinates[0])) {
            console.error("Invalid polygon data:", feature.geometry.coordinates);
            return null;
          }

          const coordinates = feature.geometry.coordinates[0].map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          }));

          return (
            <React.Fragment key={index}>
              <Polygon
                coordinates={coordinates}
                strokeColor="#FF0000"
                strokeWidth={2}
                fillColor="rgba(0, 255, 255, 0.5)"
              />
              <Marker
                coordinate={coordinates[0]}
                title={feature.properties.name}
              >
                <Callout>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{feature.properties.name}</Text>
                    <Text>Type: {feature.properties.tyyppi}</Text>
                    <Text>Status: {feature.properties.status}</Text>
                    <Text>Spaces: {feature.properties.autopaikk}</Text>
                    <Text>Electric: {feature.properties.sahkoauto ? "Yes" : "No"}</Text>
                    <Text>Disability: {feature.properties.inva ? "Yes" : "No"}</Text>
                  </View>
                </Callout>
              </Marker>
            </React.Fragment>
          );
        })}
        {filteredParkingData.map((feature, index) => {
          const [lng, lat] = feature.geometry.coordinates[0][0];
          return (
            <Marker
              key={index}
              coordinate={{ latitude: lat, longitude: lng }}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{feature.properties.name}</Text>
                  <Text>Type: {feature.properties.tyyppi}</Text>
                  <Text>Status: {feature.properties.status}</Text>
                  <Text>Spaces: {feature.properties.autopaikk}</Text>
                  <Text>Electric: {feature.properties.sahkoauto ? "Yes" : "No"}</Text>
                  <Text>Disability: {feature.properties.inva ? "Yes" : "No"}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </SafeAreaView>
  );
}

// Styles for the app
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  filters: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  map: {
    flex: 1,
  },
  callout: {
    padding: 8,
    maxWidth: 200,
  },
  calloutTitle: {
    fontWeight: "bold",
    marginBottom: 4,
  },
});
