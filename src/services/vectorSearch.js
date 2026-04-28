const Event = require("../models/EventsModel");
const Stadium = require("../models/StadiumModel");
const City = require("../models/CityModel");

async function vectorSearchEvents(queryText, cityName, category) {
  const baseQuery = {
    approvalStatus: "Approved",
    startDate: { $gte: new Date() }
  };

  if (category) {
    baseQuery.eventType = category;
  }

  let cityDoc = null;
  let stadiumIds = [];

  // 1️⃣ Outdoor → cityId
  if (cityName) {
    cityDoc = await City.findOne({
      name: new RegExp(`^${cityName}$`, "i")
    });

    stadiumIds = await Stadium.find({
      "location.address": { $regex: cityName, $options: "i" }
    }).distinct("_id");
  }

  // 2️⃣ Combine BOTH Indoor + Outdoor
  if (cityName) {
    baseQuery.$or = [
      // 🌿 Outdoor events
      {
        eventCategory: "Outdoor",
        ...(cityDoc ? { cityId: cityDoc._id } : {})
      },

      // 🏟 Indoor events
      {
        eventCategory: "Indoor",
        stadiumId: { $in: stadiumIds }
      }
    ];
  }

  return Event.find(baseQuery)
    .populate("cityId")
    .populate("stadiumId")
    .limit(5);
}

module.exports = vectorSearchEvents;



// const Event = require("../models/EventsModel");
// const City = require("../models/CityModel");

// async function vectorSearchEvents(queryText, cityName, category) {
//   const query = {
//     approvalStatus: "Approved",
//     startDate: { $gte: new Date() }
//   };

// //   if (cityId) query.cityId = cityId;
//   if (cityName) {
//     const cityDoc = await City.findOne({
//       name: cityName.toLowerCase()
//     });

//     if (cityDoc) {
//       query.cityId = cityDoc._id; // ✅ ObjectId
//     }
//   }
//   if (category) query.eventType = category;

//   return Event.find(query)
//     .populate("cityId")
//     .limit(5);
// }

// module.exports = vectorSearchEvents;
 

// const createEmbedding = require("./embeddingService");
// const Event = require("../models/EventsModel");

// async function vectorSearchEvents(queryText, city) {
//   const embedding = await createEmbedding(queryText);

//   const pipeline = [
//     {
//       $vectorSearch: {
//         index: "eventVectorIndex",
//         path: "embedding",
//         queryVector: embedding,
//         numCandidates: 100,
//         limit: 5
//       }
//     },
//     {
//       $match: {
//         status: "published",
//         date: { $gte: new Date() },
//         ...(city && { city })
//       }
//     }
//   ];

//   return Event.aggregate(pipeline);
// }

// module.exports = vectorSearchEvents;
