const Stadium = require("../models/StadiumModel");
const { uploadFileToCloudinary } = require("../utils/CloudinaryUtils");
const fs = require("fs");


const generateAutoZones = (totalSeats, seatsPerZone = 20, zonePrices = []) => {
  const zones = [];
  const zoneCount = Math.ceil(totalSeats / seatsPerZone);
  let seatCounter = 1;

  for (let i = 0; i < zoneCount; i++) {
    const zoneName = String.fromCharCode(65 + i); // 'A', 'B', ...
    const seatLabels = [];

    for (let j = 1; j <= seatsPerZone && seatCounter <= totalSeats; j++) {
      seatLabels.push(`${zoneName}${j}`);
      seatCounter++;
    }

    const price = parseFloat(zonePrices[i]) || 100; // Default ₹100 if not specified

    zones.push({ name: zoneName, seatLabels, price });
  }

  return zones;
};

const addStadium = async (req, res) => {
  try {
    const {
      name,
      totalSeats,
      address,
      latitude,
      longitude,
      seatsPerZone = 20,
      zonePrices = []
    } = req.body;

    if (!name || !totalSeats || !address || !latitude || !longitude) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const location = {
      address: address.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };

    if (isNaN(location.latitude) || isNaN(location.longitude)) {
      return res.status(400).json({ message: "Invalid latitude/longitude" });
    }

    const parsedZonePrices = typeof zonePrices === 'string'
      ? JSON.parse(zonePrices)
      : zonePrices;

    const zones = generateAutoZones(
      parseInt(totalSeats),
      parseInt(seatsPerZone),
      parsedZonePrices
    );

    let imageUrl = "";
    if (req.file) {
      const cloudRes = await uploadFileToCloudinary(req.file);
      imageUrl = cloudRes.secure_url;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    } else {
      return res.status(400).json({ message: "Image is required (file or URL)" });
    }

    const newStadium = new Stadium({
      name: name.trim(),
      totalSeats: parseInt(totalSeats),
      location,
      zones,
      imageUrl,
    });

    await newStadium.save();
    res.status(201).json({ message: "Stadium added successfully", stadium: newStadium });
  } catch (err) {
    console.error("Error adding stadium:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};

const updateStadium = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      totalSeats,
      address,
      latitude,
      longitude,
      seatsPerZone = 20,
      zonePrices = [],
    } = req.body;

    const stadium = await Stadium.findById(id);
    if (!stadium) return res.status(404).json({ message: "Stadium not found" });

    const parsedZonePrices = typeof zonePrices === 'string'
      ? JSON.parse(zonePrices)
      : zonePrices;

    const zones = generateAutoZones(
      parseInt(totalSeats),
      parseInt(seatsPerZone),
      parsedZonePrices
    );

    let imageUrl = stadium.imageUrl;
    if (req.file) {
      const cloudRes = await uploadFileToCloudinary(req.file);
      imageUrl = cloudRes.secure_url;
    }

    stadium.name = name.trim();
    stadium.totalSeats = parseInt(totalSeats);
    stadium.location = {
      address: address.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
    };
    stadium.zones = zones;
    stadium.imageUrl = imageUrl;

    await stadium.save();
    res.status(200).json({ message: "Stadium updated successfully", stadium });

  } catch (err) {
    console.error("Error updating stadium:", err);
    res.status(500).json({ message: "Internal Server Error", error: err.message });
  }
};



const getAllStadiums = async (req, res) => {
  try {
    const stadiums = await Stadium.find();
    res.status(200).json(stadiums);
  } catch (err) {
    res.status(500).json({ message: "Error fetching stadiums", error: err.message });
  }
};


const getStadiumById = async (req, res) => {
  try {
    const stadium = await Stadium.findById(req.params.id);
    if (!stadium) return res.status(404).json({ message: "Not found" });
    res.status(200).json(stadium);
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
};

const getMyStadiums = async (req, res) => {
  try {
    const organizerId = req.user._id;
    const stadiums = await Stadium.find({ organizerId });

    res.status(200).json({ stadiums });
  } catch (err) {
    res.status(500).json({ message: "Error fetching stadiums", error: err.message });
  }
};

module.exports = { addStadium, getAllStadiums, getStadiumById, getMyStadiums, updateStadium };

