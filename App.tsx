import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Switch,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";
import Icon from "react-native-vector-icons/FontAwesome";
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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedParking, setSelectedParking] = useState<ParkingFeature | null>(null);

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return `${distance.toFixed(2)} km`;
  };

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
        const response = await fetch("http://192.168.137.163:3300/proxy");
        const data = await response.json();

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
          {/* Render Polygons */}
          {parkingData.map((feature, index) => {
            if (!Array.isArray(feature.geometry.coordinates[0])) {
              console.error("Invalid polygon data:", feature.geometry.coordinates);
              return null;
            }

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

          {/* Render Markers */}
          {filteredParkingData.map((feature, index) => {
            const [lng, lat] = feature.geometry.coordinates[0][0];
            const distance = calculateDistance(currentLocation.latitude, currentLocation.longitude, lat, lng);

            return (
              <Marker
                key={index}
                coordinate={{ latitude: lat, longitude: lng }}
                onPress={() => {
                  setSelectedParking(feature);
                  setModalVisible(true);
                }}
              >
                <Icon name="map-marker" size={35} color="red" />
              </Marker>
            );
          })}
        </MapView>

        {/* Search Input */}
        <TextInput
          style={styles.searchInputAbsolute}
          placeholder="Search parking spots"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        {/* Filters */}
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

      {/* Custom Modal for Parking Details */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedParking && (
              <>
                <Text style={styles.modalTitle}>{selectedParking.properties.name}</Text>
                <Text style={styles.modalText}>Distance: {calculateDistance(currentLocation.latitude, currentLocation.longitude, selectedParking.geometry.coordinates[0][0][1], selectedParking.geometry.coordinates[0][0][0])}</Text>
                <Text style={styles.modalText}>Type: {selectedParking.properties.tyyppi}</Text>
                <Text style={styles.modalText}>Status: {selectedParking.properties.status}</Text>
                <Text style={styles.modalText}>Spaces: {selectedParking.properties.autopaikk}</Text>
                <Text style={styles.modalText}>Electric: {selectedParking.properties.sahkoauto ? "Yes" : "No"}</Text>
                <Text style={styles.modalText}>Disability: {selectedParking.properties.inva ? "Yes" : "No"}</Text>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles for the app
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 28,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    height: "8%",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  searchInputAbsolute: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 3,
  },
  filtersOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    
    zIndex: 1,
    alignItems: 'center',
    width: '50%',
  },
  filterCard: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filterText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    width: 300,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#FF6347",
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
