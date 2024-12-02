require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3300;

app.use(cors());
app.use(express.json());

app.get('/proxy', async (req, res) => {
    const apiUrl = 'https://services1.arcgis.com/sswNXkUiRoWtrx0t/arcgis/rest/services/LIIPI_Autoliitynt%C3%A4pys%C3%A4k%C3%B6inti/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson';

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Add detailed logging
        console.log("Received data structure:");
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: error.message });
    }
});

//start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Access the server at:');
    console.log(`- Local: http://localhost:${PORT}`);
    console.log(`- Network: http://192.168.53.74:${PORT}`);
});
