/**
 * Seed script - run once to create admin user and seed facilities
 * Usage: node seed.js
 */
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/complaint-portal';
console.log('Connecting to:', MONGO_URI);

const User = require('./models/User');
const Facility = require('./models/Facility');

const facilities = [
  {
    "sno": 1,
    "district": "Bokaro",
    "facility_name": "Bokaro Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 23.61,
    "longitude": 86.18,
    "facility_code": "JHDHBOK001_GW1"
  },
  {
    "sno": 2,
    "district": "Bokaro",
    "facility_name": "SDH PHUSRO-SDH",
    "facility_type": "SDH",
    "Lat ": 23.75,
    "longitude": 85.99,
    "facility_code": "JHSDHBOK002_GW1"
  },
  {
    "sno": 3,
    "district": "Bokaro",
    "facility_name": "Chas-SDH",
    "facility_type": "SDH",
    "Lat ": 23.6131,
    "longitude": 86.1808,
    "facility_code": "JHSDHBOK003_GW1"
  },
  {
    "sno": 4,
    "district": "Bokaro",
    "facility_name": "Tenughat-SDH",
    "facility_type": "SDH",
    "Lat ": 23.69,
    "longitude": 85.78,
    "facility_code": "JHSDHBOK004_GW1"
  },
  {
    "sno": 5,
    "district": "Bokaro",
    "facility_name": "Bermo-CHC",
    "facility_type": "CHC",
    "Lat ": 23.79,
    "longitude": 85.96,
    "facility_code": "JHCHCBOK005_GW1"
  },
  {
    "sno": 6,
    "district": "Bokaro",
    "facility_name": "CHC GOBINPUR PHASE 2-CHC",
    "facility_type": "CHC",
    "Lat ": 23.8,
    "longitude": 85.88,
    "facility_code": "JHCHCBOK006_GW1"
  },
  {
    "sno": 7,
    "district": "Bokaro",
    "facility_name": "Chandankiyari-CHC",
    "facility_type": "CHC",
    "Lat ": 23.57,
    "longitude": 86.36,
    "facility_code": "JHCHCBOK007_GW1"
  },
  {
    "sno": 8,
    "district": "Bokaro",
    "facility_name": "Chas-CHC",
    "facility_type": "CHC",
    "Lat ": 23.6244,
    "longitude": 86.1783,
    "facility_code": "JHCHCBOK008_GW1"
  },
  {
    "sno": 9,
    "district": "Bokaro",
    "facility_name": "UCHC Chas-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCBOK009_GW1"
  },
  {
    "sno": 10,
    "district": "Bokaro",
    "facility_name": "Gomia-CHC",
    "facility_type": "CHC",
    "Lat ": 23.83,
    "longitude": 85.85,
    "facility_code": "JHCHCBOK010_GW1"
  },
  {
    "sno": 11,
    "district": "Bokaro",
    "facility_name": "CHC GANGJORI-CHC",
    "facility_type": "CHC",
    "Lat ": 23.58892,
    "longitude": 86.00998,
    "facility_code": "JHCHCBOK011_GW1"
  },
  {
    "sno": 12,
    "district": "Bokaro",
    "facility_name": "Jaridih-CHC",
    "facility_type": "CHC",
    "Lat ": 23.67,
    "longitude": 86.01,
    "facility_code": "JHCHCBOK012_GW1"
  },
  {
    "sno": 13,
    "district": "Bokaro",
    "facility_name": "Kasmar-CHC",
    "facility_type": "CHC",
    "Lat ": 23.57,
    "longitude": 85.95,
    "facility_code": "JHCHCBOK013_GW1"
  },
  {
    "sno": 14,
    "district": "Bokaro",
    "facility_name": "Nawadih-CHC",
    "facility_type": "CHC",
    "Lat ": 23.68,
    "longitude": 85.98,
    "facility_code": "JHCHCBOK014_GW1"
  },
  {
    "sno": 15,
    "district": "Bokaro",
    "facility_name": "Peterwar-CHC",
    "facility_type": "CHC",
    "Lat ": 23.61,
    "longitude": 85.65,
    "facility_code": "JHCHCBOK015_GW1"
  },
  {
    "sno": 16,
    "district": "Bokaro",
    "facility_name": "PHC GANDHINAGAR-PHC",
    "facility_type": "PHC",
    "Lat ": 23.78,
    "longitude": 85.94,
    "facility_code": "JHPHCBOK016_GW1"
  },
  {
    "sno": 17,
    "district": "Bokaro",
    "facility_name": "PHC RANCHI DHAURA-PHC",
    "facility_type": "PHC",
    "Lat ": 23.34,
    "longitude": 85.3,
    "facility_code": "JHPHCBOK017_GW1"
  },
  {
    "sno": 18,
    "district": "Bokaro",
    "facility_name": "Ratari-PHC",
    "facility_type": "PHC",
    "Lat ": 23.74,
    "longitude": 85.96,
    "facility_code": "JHPHCBOK018_GW1"
  },
  {
    "sno": 19,
    "district": "Bokaro",
    "facility_name": "UPHC Dhori-PHC",
    "facility_type": "PHC",
    "Lat ": 23.77073,
    "longitude": 85.98731,
    "facility_code": "JHPHCBOK019_GW1"
  },
  {
    "sno": 20,
    "district": "Bokaro",
    "facility_name": "UPHC Kargali-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCBOK020_GW1"
  },
  {
    "sno": 21,
    "district": "Bokaro",
    "facility_name": "Barmasia-PHC",
    "facility_type": "PHC",
    "Lat ": 23.56647,
    "longitude": 86.33856,
    "facility_code": "JHPHCBOK021_GW1"
  },
  {
    "sno": 22,
    "district": "Bokaro",
    "facility_name": "Kodia-PHC",
    "facility_type": "PHC",
    "Lat ": 23.61,
    "longitude": 86.37,
    "facility_code": "JHPHCBOK022_GW1"
  },
  {
    "sno": 23,
    "district": "Bokaro",
    "facility_name": "Chira Chas-PHC",
    "facility_type": "PHC",
    "Lat ": 23.61,
    "longitude": 86.18,
    "facility_code": "JHPHCBOK023_GW1"
  },
  {
    "sno": 24,
    "district": "Bokaro",
    "facility_name": "ESI Dispensary, Bokaro-PHC",
    "facility_type": "PHC",
    "Lat ": 23.66618,
    "longitude": 86.15333,
    "facility_code": "JHPHCBOK024_GW1"
  },
  {
    "sno": 25,
    "district": "Bokaro",
    "facility_name": "PHC BIJULIYA-PHC",
    "facility_type": "PHC",
    "Lat ": 23.70382,
    "longitude": 86.29084,
    "facility_code": "JHPHCBOK025_GW1"
  },
  {
    "sno": 26,
    "district": "Bokaro",
    "facility_name": "Pindrajora-PHC",
    "facility_type": "PHC",
    "Lat ": 23.48,
    "longitude": 86.23,
    "facility_code": "JHPHCBOK026_GW1"
  },
  {
    "sno": 27,
    "district": "Bokaro",
    "facility_name": "State Dispensary-PHC",
    "facility_type": "PHC",
    "Lat ": 23.61,
    "longitude": 86.18,
    "facility_code": "JHPHCBOK027_GW1"
  },
  {
    "sno": 28,
    "district": "Bokaro",
    "facility_name": "Tupra-PHC",
    "facility_type": "PHC",
    "Lat ": 23.52,
    "longitude": 86.24,
    "facility_code": "JHPHCBOK028_GW1"
  },
  {
    "sno": 29,
    "district": "Bokaro",
    "facility_name": "UPHC Bhawanipur-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCBOK029_GW1"
  },
  {
    "sno": 30,
    "district": "Bokaro",
    "facility_name": "UPHC Chira Chas-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCBOK030_GW1"
  },
  {
    "sno": 31,
    "district": "Bokaro",
    "facility_name": "UPHC Dundibag-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCBOK031_GW1"
  },
  {
    "sno": 32,
    "district": "Bokaro",
    "facility_name": "UPHC Kailash Nagar-PHC",
    "facility_type": "PHC",
    "Lat ": 23.61,
    "longitude": 86.18,
    "facility_code": "JHPHCBOK032_GW1"
  },
  {
    "sno": 33,
    "district": "Bokaro",
    "facility_name": "UPHC Kurmidih-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCBOK033_GW1"
  },
  {
    "sno": 34,
    "district": "Bokaro",
    "facility_name": "UPHC Siwandih-PHC",
    "facility_type": "PHC",
    "Lat ": 23.61,
    "longitude": 86.18,
    "facility_code": "JHPHCBOK034_GW1"
  },
  {
    "sno": 35,
    "district": "Bokaro",
    "facility_name": "UPHC Telidih-PHC",
    "facility_type": "PHC",
    "Lat ": 23.62171,
    "longitude": 86.16818,
    "facility_code": "JHPHCBOK035_GW1"
  },
  {
    "sno": 36,
    "district": "Bokaro",
    "facility_name": "Chatrochati-PHC",
    "facility_type": "PHC",
    "Lat ": 23.41,
    "longitude": 85.7,
    "facility_code": "JHPHCBOK036_GW1"
  },
  {
    "sno": 37,
    "district": "Bokaro",
    "facility_name": "Mahuwatand-PHC",
    "facility_type": "PHC",
    "Lat ": 23.79455,
    "longitude": 85.71593,
    "facility_code": "JHPHCBOK037_GW1"
  },
  {
    "sno": 38,
    "district": "Bokaro",
    "facility_name": "Saram-PHC",
    "facility_type": "PHC",
    "Lat ": 23.76,
    "longitude": 85.82,
    "facility_code": "JHPHCBOK038_GW1"
  },
  {
    "sno": 39,
    "district": "Bokaro",
    "facility_name": "Pathuria-PHC",
    "facility_type": "PHC",
    "Lat ": 23.59,
    "longitude": 85.98,
    "facility_code": "JHPHCBOK039_GW1"
  },
  {
    "sno": 40,
    "district": "Bokaro",
    "facility_name": "PHC BARADIH-PHC",
    "facility_type": "PHC",
    "Lat ": 23.64438,
    "longitude": 85.9919,
    "facility_code": "JHPHCBOK040_GW1"
  },
  {
    "sno": 41,
    "district": "Bokaro",
    "facility_name": "PHC BIRSASRAM-PHC",
    "facility_type": "PHC",
    "Lat ": 23.58171,
    "longitude": 85.98734,
    "facility_code": "JHPHCBOK041_GW1"
  },
  {
    "sno": 42,
    "district": "Bokaro",
    "facility_name": "PHC TANTRI-PHC",
    "facility_type": "PHC",
    "Lat ": 23.7255,
    "longitude": 86.04076,
    "facility_code": "JHPHCBOK042_GW1"
  },
  {
    "sno": 43,
    "district": "Bokaro",
    "facility_name": "Kherachatar-PHC",
    "facility_type": "PHC",
    "Lat ": 23.56,
    "longitude": 85.87,
    "facility_code": "JHPHCBOK043_GW1"
  },
  {
    "sno": 44,
    "district": "Bokaro",
    "facility_name": "PHC KARMA-PHC",
    "facility_type": "PHC",
    "Lat ": 23.51483,
    "longitude": 85.93776,
    "facility_code": "JHPHCBOK044_GW1"
  },
  {
    "sno": 45,
    "district": "Bokaro",
    "facility_name": "Bhendra-PHC",
    "facility_type": "PHC",
    "Lat ": 23.74,
    "longitude": 85.75,
    "facility_code": "JHPHCBOK045_GW1"
  },
  {
    "sno": 46,
    "district": "Bokaro",
    "facility_name": "Harladih-PHC",
    "facility_type": "PHC",
    "Lat ": 23.85,
    "longitude": 85.94,
    "facility_code": "JHPHCBOK046_GW1"
  },
  {
    "sno": 47,
    "district": "Bokaro",
    "facility_name": "Kanjkiro-PHC",
    "facility_type": "PHC",
    "Lat ": 23.83,
    "longitude": 85.89,
    "facility_code": "JHPHCBOK047_GW1"
  },
  {
    "sno": 48,
    "district": "Bokaro",
    "facility_name": "PHC PENK-PHC",
    "facility_type": "PHC",
    "Lat ": 23.89496,
    "longitude": 85.89246,
    "facility_code": "JHPHCBOK048_GW1"
  },
  {
    "sno": 49,
    "district": "Bokaro",
    "facility_name": "PHC TELO-PHC",
    "facility_type": "PHC",
    "Lat ": 23.8192,
    "longitude": 86.05536,
    "facility_code": "JHPHCBOK049_GW1"
  },
  {
    "sno": 50,
    "district": "Bokaro",
    "facility_name": "Chalkari-PHC",
    "facility_type": "PHC",
    "Lat ": 23.74,
    "longitude": 85.94,
    "facility_code": "JHPHCBOK050_GW1"
  },
  {
    "sno": 51,
    "district": "Bokaro",
    "facility_name": "PHC CHANDO-PHC",
    "facility_type": "PHC",
    "Lat ": 23.69495,
    "longitude": 85.94365,
    "facility_code": "JHPHCBOK051_GW1"
  },
  {
    "sno": 52,
    "district": "Chatra",
    "facility_name": "Chatra Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 24.21253,
    "longitude": 84.86013,
    "facility_code": "JHDHCHT001_GW1"
  },
  {
    "sno": 53,
    "district": "Chatra",
    "facility_name": "Chatra Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCCHT002_GW1"
  },
  {
    "sno": 54,
    "district": "Chatra",
    "facility_name": "Itkhori-CHC",
    "facility_type": "CHC",
    "Lat ": 24.28253,
    "longitude": 85.14956,
    "facility_code": "JHCHCCHT003_GW1"
  },
  {
    "sno": 55,
    "district": "Chatra",
    "facility_name": "Pratappur-CHC",
    "facility_type": "CHC",
    "Lat ": 24.29537,
    "longitude": 84.63748,
    "facility_code": "JHCHCCHT004_GW1"
  },
  {
    "sno": 56,
    "district": "Chatra",
    "facility_name": "Hunterganj-CHC",
    "facility_type": "CHC",
    "Lat ": 24.43549,
    "longitude": 84.81277,
    "facility_code": "JHCHCCHT005_GW1"
  },
  {
    "sno": 57,
    "district": "Chatra",
    "facility_name": "Ref. HospitalSimaria-CHC",
    "facility_type": "CHC",
    "Lat ": 24.06147,
    "longitude": 84.93871,
    "facility_code": "JHCHCCHT006_GW1"
  },
  {
    "sno": 58,
    "district": "Chatra",
    "facility_name": "Tandwa-CHC",
    "facility_type": "CHC",
    "Lat ": 23.84962,
    "longitude": 85.02941,
    "facility_code": "JHCHCCHT007_GW1"
  },
  {
    "sno": 59,
    "district": "Chatra",
    "facility_name": "Kanhachatti-PHC",
    "facility_type": "PHC",
    "Lat ": 24.29275,
    "longitude": 85.0251,
    "facility_code": "JHPHCCHT008_GW1"
  },
  {
    "sno": 60,
    "district": "Chatra",
    "facility_name": "Unta-PHC",
    "facility_type": "PHC",
    "Lat ": 24.21863,
    "longitude": 84.96169,
    "facility_code": "JHPHCCHT009_GW1"
  },
  {
    "sno": 61,
    "district": "Chatra",
    "facility_name": "UPHC Raj Talab-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCCHT010_GW1"
  },
  {
    "sno": 62,
    "district": "Chatra",
    "facility_name": "Giddhour-PHC",
    "facility_type": "PHC",
    "Lat ": 24.17688,
    "longitude": 85.0176,
    "facility_code": "JHPHCCHT011_GW1"
  },
  {
    "sno": 63,
    "district": "Chatra",
    "facility_name": "Kunda-PHC",
    "facility_type": "PHC",
    "Lat ": 24.20917,
    "longitude": 84.65495,
    "facility_code": "JHPHCCHT012_GW1"
  },
  {
    "sno": 64,
    "district": "Chatra",
    "facility_name": "Yadav Nagar Tandwa-PHC",
    "facility_type": "PHC",
    "Lat ": 24.37815,
    "longitude": 84.61721,
    "facility_code": "JHPHCCHT013_GW1"
  },
  {
    "sno": 65,
    "district": "Chatra",
    "facility_name": "Jori-PHC",
    "facility_type": "PHC",
    "Lat ": 24.31277,
    "longitude": 84.79267,
    "facility_code": "JHPHCCHT014_GW1"
  },
  {
    "sno": 66,
    "district": "Chatra",
    "facility_name": "Jabra-PHC",
    "facility_type": "PHC",
    "Lat ": 24.01042,
    "longitude": 84.84791,
    "facility_code": "JHPHCCHT015_GW1"
  },
  {
    "sno": 67,
    "district": "Chatra",
    "facility_name": "Lawalong-PHC",
    "facility_type": "PHC",
    "Lat ": 24.07575,
    "longitude": 84.73662,
    "facility_code": "JHPHCCHT016_GW1"
  },
  {
    "sno": 68,
    "district": "Deoghar",
    "facility_name": "Deoghar Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 24.4913,
    "longitude": 86.69419,
    "facility_code": "JHDHDEO001_GW1"
  },
  {
    "sno": 69,
    "district": "Deoghar",
    "facility_name": "Madhupur-SDH",
    "facility_type": "SDH",
    "Lat ": 24.26731,
    "longitude": 86.6466,
    "facility_code": "JHSDHDEO002_GW1"
  },
  {
    "sno": 70,
    "district": "Deoghar",
    "facility_name": "Jasidih-CHC",
    "facility_type": "CHC",
    "Lat ": 24.51674,
    "longitude": 86.64724,
    "facility_code": "JHCHCDEO003_GW1"
  },
  {
    "sno": 71,
    "district": "Deoghar",
    "facility_name": "Devipur-CHC",
    "facility_type": "CHC",
    "Lat ": 24.39875,
    "longitude": 86.5892,
    "facility_code": "JHCHCDEO004_GW1"
  },
  {
    "sno": 72,
    "district": "Deoghar",
    "facility_name": "Karon-CHC",
    "facility_type": "CHC",
    "Lat ": 24.11594,
    "longitude": 86.73297,
    "facility_code": "JHCHCDEO005_GW1"
  },
  {
    "sno": 73,
    "district": "Deoghar",
    "facility_name": "Mohanpur-CHC",
    "facility_type": "CHC",
    "Lat ": 24.51232,
    "longitude": 86.8164,
    "facility_code": "JHCHCDEO006_GW1"
  },
  {
    "sno": 74,
    "district": "Deoghar",
    "facility_name": "Palajori-CHC",
    "facility_type": "CHC",
    "Lat ": 24.24045,
    "longitude": 87.00261,
    "facility_code": "JHCHCDEO007_GW1"
  },
  {
    "sno": 75,
    "district": "Deoghar",
    "facility_name": "Sarath-CHC",
    "facility_type": "CHC",
    "Lat ": 24.25756,
    "longitude": 86.83993,
    "facility_code": "JHCHCDEO008_GW1"
  },
  {
    "sno": 76,
    "district": "Deoghar",
    "facility_name": "Sarwan-CHC",
    "facility_type": "CHC",
    "Lat ": 24.38761,
    "longitude": 86.78359,
    "facility_code": "JHCHCDEO009_GW1"
  },
  {
    "sno": 77,
    "district": "Deoghar",
    "facility_name": "Baghmara-PHC",
    "facility_type": "PHC",
    "Lat ": 24.48147,
    "longitude": 86.63082,
    "facility_code": "JHPHCDEO010_GW1"
  },
  {
    "sno": 78,
    "district": "Deoghar",
    "facility_name": "ESI Dispensary, Jasidih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.48628,
    "longitude": 86.69318,
    "facility_code": "JHPHCDEO011_GW1"
  },
  {
    "sno": 79,
    "district": "Deoghar",
    "facility_name": "Kushmil-PHC",
    "facility_type": "PHC",
    "Lat ": 24.40662,
    "longitude": 86.67439,
    "facility_code": "JHPHCDEO012_GW1"
  },
  {
    "sno": 80,
    "district": "Deoghar",
    "facility_name": "UPHC Kalyanpur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.50278,
    "longitude": 86.68139,
    "facility_code": "JHPHCDEO013_GW1"
  },
  {
    "sno": 81,
    "district": "Deoghar",
    "facility_name": "UPHC Karnibag-PHC",
    "facility_type": "PHC",
    "Lat ": 24.47728,
    "longitude": 86.71859,
    "facility_code": "JHPHCDEO014_GW1"
  },
  {
    "sno": 82,
    "district": "Deoghar",
    "facility_name": "UPHC Rampur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.50533,
    "longitude": 86.72315,
    "facility_code": "JHPHCDEO015_GW1"
  },
  {
    "sno": 83,
    "district": "Deoghar",
    "facility_name": "UPHC Tower Chowk-PHC",
    "facility_type": "PHC",
    "Lat ": 24.49139,
    "longitude": 86.69583,
    "facility_code": "JHPHCDEO016_GW1"
  },
  {
    "sno": 84,
    "district": "Deoghar",
    "facility_name": "Govindpur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.34763,
    "longitude": 86.75848,
    "facility_code": "JHPHCDEO017_GW1"
  },
  {
    "sno": 85,
    "district": "Deoghar",
    "facility_name": "Burhai-PHC",
    "facility_type": "PHC",
    "Lat ": 24.35601,
    "longitude": 86.54202,
    "facility_code": "JHPHCDEO018_GW1"
  },
  {
    "sno": 86,
    "district": "Deoghar",
    "facility_name": "ESI Dispensary, Madhupur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.29484,
    "longitude": 86.63691,
    "facility_code": "JHPHCDEO019_GW1"
  },
  {
    "sno": 87,
    "district": "Deoghar",
    "facility_name": "UPHC Madhupur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.26616,
    "longitude": 86.64096,
    "facility_code": "JHPHCDEO020_GW1"
  },
  {
    "sno": 88,
    "district": "Deoghar",
    "facility_name": "Kunda-PHC",
    "facility_type": "PHC",
    "Lat ": 24.34763,
    "longitude": 86.75848,
    "facility_code": "JHPHCDEO021_GW1"
  },
  {
    "sno": 89,
    "district": "Dhanbad",
    "facility_name": "Shahid Nirmal Mahato Medical College Dhanbad-MC",
    "facility_type": "MC",
    "Lat ": 23.78,
    "longitude": 86.43,
    "facility_code": "JHMEDDHA001_GW1"
  },
  {
    "sno": 90,
    "district": "Dhanbad",
    "facility_name": "Dhanbad Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 23.7984,
    "longitude": 86.4371,
    "facility_code": "JHDHDHA002_GW1"
  },
  {
    "sno": 91,
    "district": "Dhanbad",
    "facility_name": "ESIC Hospital Maithan-SDH",
    "facility_type": "SDH",
    "Lat ": 23.7676,
    "longitude": 86.7921,
    "facility_code": "JHSDHDHA003_GW1"
  },
  {
    "sno": 92,
    "district": "Dhanbad",
    "facility_name": "Baghmara-CHC",
    "facility_type": "CHC",
    "Lat ": 23.79,
    "longitude": 86.2,
    "facility_code": "JHCHCDHA004_GW1"
  },
  {
    "sno": 93,
    "district": "Dhanbad",
    "facility_name": "Baliapur-CHC",
    "facility_type": "CHC",
    "Lat ": 23.72,
    "longitude": 86.52,
    "facility_code": "JHCHCDHA005_GW1"
  },
  {
    "sno": 94,
    "district": "Dhanbad",
    "facility_name": "Central Hospital, BCCL-CHC",
    "facility_type": "CHC",
    "Lat ": 23.7957,
    "longitude": 86.4304,
    "facility_code": "JHCHCDHA006_GW1"
  },
  {
    "sno": 95,
    "district": "Dhanbad",
    "facility_name": "Dhanbad Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCDHA007_GW1"
  },
  {
    "sno": 96,
    "district": "Dhanbad",
    "facility_name": "UCHC Kenduadih-CHC",
    "facility_type": "CHC",
    "Lat ": 23.77745,
    "longitude": 86.37569,
    "facility_code": "JHCHCDHA008_GW1"
  },
  {
    "sno": 97,
    "district": "Dhanbad",
    "facility_name": "Govindpur-CHC",
    "facility_type": "CHC",
    "Lat ": 23.84,
    "longitude": 86.52,
    "facility_code": "JHCHCDHA009_GW1"
  },
  {
    "sno": 98,
    "district": "Dhanbad",
    "facility_name": "Jharia Cum Jorapokhar-CHC",
    "facility_type": "CHC",
    "Lat ": 23.75,
    "longitude": 86.42,
    "facility_code": "JHCHCDHA010_GW1"
  },
  {
    "sno": 99,
    "district": "Dhanbad",
    "facility_name": "UCHC Gausala Sindri-CHC",
    "facility_type": "CHC",
    "Lat ": 23.79565,
    "longitude": 86.43039,
    "facility_code": "JHCHCDHA011_GW1"
  },
  {
    "sno": 100,
    "district": "Dhanbad",
    "facility_name": "Nirsa-CHC",
    "facility_type": "CHC",
    "Lat ": 23.78,
    "longitude": 86.71,
    "facility_code": "JHCHCDHA012_GW1"
  },
  {
    "sno": 101,
    "district": "Dhanbad",
    "facility_name": "Topchachi-CHC",
    "facility_type": "CHC",
    "Lat ": 23.9,
    "longitude": 86.2,
    "facility_code": "JHCHCDHA013_GW1"
  },
  {
    "sno": 102,
    "district": "Dhanbad",
    "facility_name": "Tundi-CHC",
    "facility_type": "CHC",
    "Lat ": 23.98,
    "longitude": 86.45,
    "facility_code": "JHCHCDHA014_GW1"
  },
  {
    "sno": 103,
    "district": "Dhanbad",
    "facility_name": "Jogta-PHC",
    "facility_type": "PHC",
    "Lat ": 23.79,
    "longitude": 86.33,
    "facility_code": "JHPHCDHA015_GW1"
  },
  {
    "sno": 104,
    "district": "Dhanbad",
    "facility_name": "Katras-PHC",
    "facility_type": "PHC",
    "Lat ": 23.8,
    "longitude": 86.28,
    "facility_code": "JHPHCDHA016_GW1"
  },
  {
    "sno": 105,
    "district": "Dhanbad",
    "facility_name": "Mahuda-PHC",
    "facility_type": "PHC",
    "Lat ": 23.72,
    "longitude": 86.28,
    "facility_code": "JHPHCDHA017_GW1"
  },
  {
    "sno": 106,
    "district": "Dhanbad",
    "facility_name": "Rajganj-PHC",
    "facility_type": "PHC",
    "Lat ": 23.87,
    "longitude": 86.33,
    "facility_code": "JHPHCDHA018_GW1"
  },
  {
    "sno": 107,
    "district": "Dhanbad",
    "facility_name": "UPHC Katras-PHC",
    "facility_type": "PHC",
    "Lat ": 23.8624,
    "longitude": 86.2927,
    "facility_code": "JHPHCDHA019_GW1"
  },
  {
    "sno": 108,
    "district": "Dhanbad",
    "facility_name": "ESI Dispensary, Joraphatak-PHC",
    "facility_type": "PHC",
    "Lat ": 23.79191,
    "longitude": 86.44326,
    "facility_code": "JHPHCDHA020_GW1"
  },
  {
    "sno": 109,
    "district": "Dhanbad",
    "facility_name": "UPHC Basaria-PHC",
    "facility_type": "PHC",
    "Lat ": 23.79565,
    "longitude": 86.43039,
    "facility_code": "JHPHCDHA021_GW1"
  },
  {
    "sno": 110,
    "district": "Dhanbad",
    "facility_name": "UPHC Bishunpur-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCDHA022_GW1"
  },
  {
    "sno": 111,
    "district": "Dhanbad",
    "facility_name": "UPHC Chandanmari-PHC",
    "facility_type": "PHC",
    "Lat ": 23.795,
    "longitude": 86.43,
    "facility_code": "JHPHCDHA023_GW1"
  },
  {
    "sno": 112,
    "district": "Dhanbad",
    "facility_name": "UPHC Kankani-PHC",
    "facility_type": "PHC",
    "Lat ": 23.795,
    "longitude": 86.436,
    "facility_code": "JHPHCDHA024_GW1"
  },
  {
    "sno": 113,
    "district": "Dhanbad",
    "facility_name": "UPHC Kolakusma-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCDHA025_GW1"
  },
  {
    "sno": 114,
    "district": "Dhanbad",
    "facility_name": "UPHC Shivpuri Bhuli-PHC",
    "facility_type": "PHC",
    "Lat ": 23.81346,
    "longitude": 86.39088,
    "facility_code": "JHPHCDHA026_GW1"
  },
  {
    "sno": 115,
    "district": "Dhanbad",
    "facility_name": "Birajpur-PHC",
    "facility_type": "PHC",
    "Lat ": 23.73,
    "longitude": 86.56,
    "facility_code": "JHPHCDHA027_GW1"
  },
  {
    "sno": 116,
    "district": "Dhanbad",
    "facility_name": "Chutiyaro-PHC",
    "facility_type": "PHC",
    "Lat ": 23.89,
    "longitude": 86.36,
    "facility_code": "JHPHCDHA028_GW1"
  },
  {
    "sno": 117,
    "district": "Dhanbad",
    "facility_name": "ESI Dispensary, Govindpur-PHC",
    "facility_type": "PHC",
    "Lat ": 23.83302,
    "longitude": 86.50849,
    "facility_code": "JHPHCDHA029_GW1"
  },
  {
    "sno": 118,
    "district": "Dhanbad",
    "facility_name": "Nagarkiyari-PHC",
    "facility_type": "PHC",
    "Lat ": 23.88,
    "longitude": 86.47,
    "facility_code": "JHPHCDHA030_GW1"
  },
  {
    "sno": 119,
    "district": "Dhanbad",
    "facility_name": "Tilaiya-PHC",
    "facility_type": "PHC",
    "Lat ": 23.69,
    "longitude": 86.62,
    "facility_code": "JHPHCDHA031_GW1"
  },
  {
    "sno": 120,
    "district": "Dhanbad",
    "facility_name": "Bhaga-PHC",
    "facility_type": "PHC",
    "Lat ": 23.70198,
    "longitude": 86.43008,
    "facility_code": "JHPHCDHA032_GW1"
  },
  {
    "sno": 121,
    "district": "Dhanbad",
    "facility_name": "Jharia-PHC",
    "facility_type": "PHC",
    "Lat ": 23.74,
    "longitude": 86.42,
    "facility_code": "JHPHCDHA033_GW1"
  },
  {
    "sno": 122,
    "district": "Dhanbad",
    "facility_name": "UPHC Digwadih-PHC",
    "facility_type": "PHC",
    "Lat ": 23.77923,
    "longitude": 86.41387,
    "facility_code": "JHPHCDHA034_GW1"
  },
  {
    "sno": 123,
    "district": "Dhanbad",
    "facility_name": "UPHC Rajbari-PHC",
    "facility_type": "PHC",
    "Lat ": 23.79565,
    "longitude": 86.43039,
    "facility_code": "JHPHCDHA035_GW1"
  },
  {
    "sno": 124,
    "district": "Dhanbad",
    "facility_name": "UPHC Sindri-PHC",
    "facility_type": "PHC",
    "Lat ": 23.79882,
    "longitude": 86.70076,
    "facility_code": "JHPHCDHA036_GW1"
  },
  {
    "sno": 125,
    "district": "Dhanbad",
    "facility_name": "Ambona-PHC",
    "facility_type": "PHC",
    "Lat ": 23.82,
    "longitude": 86.72,
    "facility_code": "JHPHCDHA037_GW1"
  },
  {
    "sno": 126,
    "district": "Dhanbad",
    "facility_name": "Bengaria1-PHC",
    "facility_type": "PHC",
    "Lat ": 23.7782,
    "longitude": 86.70027,
    "facility_code": "JHPHCDHA038_GW1"
  },
  {
    "sno": 127,
    "district": "Dhanbad",
    "facility_name": "Bengaria 2-PHC",
    "facility_type": "PHC",
    "Lat ": 23.78,
    "longitude": 86.71,
    "facility_code": "JHPHCDHA039_GW1"
  },
  {
    "sno": 128,
    "district": "Dhanbad",
    "facility_name": "Chirkunda-PHC",
    "facility_type": "PHC",
    "Lat ": 23.74,
    "longitude": 86.8,
    "facility_code": "JHPHCDHA040_GW1"
  },
  {
    "sno": 129,
    "district": "Dhanbad",
    "facility_name": "ESI Dispensary, Kumardhubi-PHC",
    "facility_type": "PHC",
    "Lat ": 23.74637,
    "longitude": 86.78881,
    "facility_code": "JHPHCDHA041_GW1"
  },
  {
    "sno": 130,
    "district": "Dhanbad",
    "facility_name": "ESI Dispensary, Nirsachatti-PHC",
    "facility_type": "PHC",
    "Lat ": 23.79343,
    "longitude": 86.71183,
    "facility_code": "JHPHCDHA042_GW1"
  },
  {
    "sno": 131,
    "district": "Dhanbad",
    "facility_name": "Jaipur-PHC",
    "facility_type": "PHC",
    "Lat ": 23.82,
    "longitude": 86.62,
    "facility_code": "JHPHCDHA043_GW1"
  },
  {
    "sno": 132,
    "district": "Dhanbad",
    "facility_name": "Madanpur-PHC",
    "facility_type": "PHC",
    "Lat ": 23.79,
    "longitude": 86.76,
    "facility_code": "JHPHCDHA044_GW1"
  },
  {
    "sno": 133,
    "district": "Dhanbad",
    "facility_name": "Salukchapda-PHC",
    "facility_type": "PHC",
    "Lat ": 23.73,
    "longitude": 86.6,
    "facility_code": "JHPHCDHA045_GW1"
  },
  {
    "sno": 134,
    "district": "Dhanbad",
    "facility_name": "Tetulia-PHC",
    "facility_type": "PHC",
    "Lat ": 23.7782,
    "longitude": 86.70027,
    "facility_code": "JHPHCDHA046_GW1"
  },
  {
    "sno": 135,
    "district": "Dhanbad",
    "facility_name": "Gomo-PHC",
    "facility_type": "PHC",
    "Lat ": 23.87,
    "longitude": 86.15,
    "facility_code": "JHPHCDHA047_GW1"
  },
  {
    "sno": 136,
    "district": "Dhanbad",
    "facility_name": "Ramakunda-PHC",
    "facility_type": "PHC",
    "Lat ": 23.86,
    "longitude": 86.2,
    "facility_code": "JHPHCDHA048_GW1"
  },
  {
    "sno": 137,
    "district": "Dhanbad",
    "facility_name": "Rowm-PHC",
    "facility_type": "PHC",
    "Lat ": 23.86,
    "longitude": 86.29,
    "facility_code": "JHPHCDHA049_GW1"
  },
  {
    "sno": 138,
    "district": "Dhanbad",
    "facility_name": "Topchanchi-PHC",
    "facility_type": "PHC",
    "Lat ": 23.9,
    "longitude": 86.2,
    "facility_code": "JHPHCDHA050_GW1"
  },
  {
    "sno": 139,
    "district": "Dhanbad",
    "facility_name": "Balkush-PHC",
    "facility_type": "PHC",
    "Lat ": 23.79,
    "longitude": 86.62,
    "facility_code": "JHPHCDHA051_GW1"
  },
  {
    "sno": 140,
    "district": "Dhanbad",
    "facility_name": "Garhrahunathpur-PHC",
    "facility_type": "PHC",
    "Lat ": 23.83,
    "longitude": 86.78,
    "facility_code": "JHPHCDHA052_GW1"
  },
  {
    "sno": 141,
    "district": "Dhanbad",
    "facility_name": "Maniadih-PHC",
    "facility_type": "PHC",
    "Lat ": 23.8,
    "longitude": 86.71,
    "facility_code": "JHPHCDHA053_GW1"
  },
  {
    "sno": 142,
    "district": "Dhanbad",
    "facility_name": "Tundi maharajganj-PHC",
    "facility_type": "PHC",
    "Lat ": 23.9,
    "longitude": 86.51,
    "facility_code": "JHPHCDHA054_GW1"
  },
  {
    "sno": 143,
    "district": "Dumka",
    "facility_name": "Phulo Jhano Medical College and Hospital-MC",
    "facility_type": "MC",
    "Lat ": 24.2675,
    "longitude": 87.2511,
    "facility_code": "JHMEDDUM001_GW1"
  },
  {
    "sno": 144,
    "district": "Dumka",
    "facility_name": "Dumka Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCDUM002_GW1"
  },
  {
    "sno": 145,
    "district": "Dumka",
    "facility_name": "Gopikandar-CHC",
    "facility_type": "CHC",
    "Lat ": 24.4258,
    "longitude": 87.48639,
    "facility_code": "JHCHCDUM003_GW1"
  },
  {
    "sno": 146,
    "district": "Dumka",
    "facility_name": "Jama-CHC",
    "facility_type": "CHC",
    "Lat ": 24.3503,
    "longitude": 87.14611,
    "facility_code": "JHCHCDUM004_GW1"
  },
  {
    "sno": 147,
    "district": "Dumka",
    "facility_name": "Jarmundi-CHC",
    "facility_type": "CHC",
    "Lat ": 24.3936,
    "longitude": 87.05,
    "facility_code": "JHCHCDUM005_GW1"
  },
  {
    "sno": 148,
    "district": "Dumka",
    "facility_name": "Kathikund-CHC",
    "facility_type": "CHC",
    "Lat ": 24.3583,
    "longitude": 87.42083,
    "facility_code": "JHCHCDUM006_GW1"
  },
  {
    "sno": 149,
    "district": "Dumka",
    "facility_name": "Masalia-CHC",
    "facility_type": "CHC",
    "Lat ": 24.1594,
    "longitude": 87.18139,
    "facility_code": "JHCHCDUM007_GW1"
  },
  {
    "sno": 150,
    "district": "Dumka",
    "facility_name": "Ramgarh-CHC",
    "facility_type": "CHC",
    "Lat ": 24.5739,
    "longitude": 87.25694,
    "facility_code": "JHCHCDUM008_GW1"
  },
  {
    "sno": 151,
    "district": "Dumka",
    "facility_name": "Ranishwar-CHC",
    "facility_type": "CHC",
    "Lat ": 24.0458,
    "longitude": 87.40972,
    "facility_code": "JHCHCDUM009_GW1"
  },
  {
    "sno": 152,
    "district": "Dumka",
    "facility_name": "Saraiyahat-CHC",
    "facility_type": "CHC",
    "Lat ": 24.5889,
    "longitude": 87.02111,
    "facility_code": "JHCHCDUM010_GW1"
  },
  {
    "sno": 153,
    "district": "Dumka",
    "facility_name": "Shikaripara-CHC",
    "facility_type": "CHC",
    "Lat ": 24.2378,
    "longitude": 87.47639,
    "facility_code": "JHCHCDUM011_GW1"
  },
  {
    "sno": 154,
    "district": "Dumka",
    "facility_name": "Asansol-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2272,
    "longitude": 87.2725,
    "facility_code": "JHPHCDUM012_GW1"
  },
  {
    "sno": 155,
    "district": "Dumka",
    "facility_name": "Chitadih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.1689,
    "longitude": 87.35556,
    "facility_code": "JHPHCDUM013_GW1"
  },
  {
    "sno": 156,
    "district": "Dumka",
    "facility_name": "Gando-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2647,
    "longitude": 87.37944,
    "facility_code": "JHPHCDUM014_GW1"
  },
  {
    "sno": 157,
    "district": "Dumka",
    "facility_name": "Karamdih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.3878,
    "longitude": 87.22556,
    "facility_code": "JHPHCDUM015_GW1"
  },
  {
    "sno": 158,
    "district": "Dumka",
    "facility_name": "Kathijoriya-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2336,
    "longitude": 87.33694,
    "facility_code": "JHPHCDUM016_GW1"
  },
  {
    "sno": 159,
    "district": "Dumka",
    "facility_name": "Koriya-PHC",
    "facility_type": "PHC",
    "Lat ": 24.3181,
    "longitude": 87.29389,
    "facility_code": "JHPHCDUM017_GW1"
  },
  {
    "sno": 160,
    "district": "Dumka",
    "facility_name": "Makro-PHC",
    "facility_type": "PHC",
    "Lat ": 24.3611,
    "longitude": 87.29389,
    "facility_code": "JHPHCDUM018_GW1"
  },
  {
    "sno": 161,
    "district": "Dumka",
    "facility_name": "UPHC Rasikpur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2767,
    "longitude": 87.26833,
    "facility_code": "JHPHCDUM019_GW1"
  },
  {
    "sno": 162,
    "district": "Dumka",
    "facility_name": "Karudih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.369,
    "longitude": 87.56,
    "facility_code": "JHPHCDUM020_GW1"
  },
  {
    "sno": 163,
    "district": "Dumka",
    "facility_name": "Barapalashi-PHC",
    "facility_type": "PHC",
    "Lat ": 24.3769,
    "longitude": 87.18417,
    "facility_code": "JHPHCDUM021_GW1"
  },
  {
    "sno": 164,
    "district": "Dumka",
    "facility_name": "Chikiniya-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2825,
    "longitude": 87.125,
    "facility_code": "JHPHCDUM022_GW1"
  },
  {
    "sno": 165,
    "district": "Dumka",
    "facility_name": "Lakshmipur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.3314,
    "longitude": 87.10028,
    "facility_code": "JHPHCDUM023_GW1"
  },
  {
    "sno": 166,
    "district": "Dumka",
    "facility_name": "Haripur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.3036,
    "longitude": 87.0672,
    "facility_code": "JHPHCDUM024_GW1"
  },
  {
    "sno": 167,
    "district": "Dumka",
    "facility_name": "Raikinari-PHC",
    "facility_type": "PHC",
    "Lat ": 24.47,
    "longitude": 87.0136,
    "facility_code": "JHPHCDUM025_GW1"
  },
  {
    "sno": 168,
    "district": "Dumka",
    "facility_name": "Sahara-PHC",
    "facility_type": "PHC",
    "Lat ": 24.4106,
    "longitude": 86.975,
    "facility_code": "JHPHCDUM026_GW1"
  },
  {
    "sno": 169,
    "district": "Dumka",
    "facility_name": "Taljhari-PHC",
    "facility_type": "PHC",
    "Lat ": 24.4236,
    "longitude": 86.9152,
    "facility_code": "JHPHCDUM027_GW1"
  },
  {
    "sno": 170,
    "district": "Dumka",
    "facility_name": "AAM BHANDARO-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCDUM028_GW1"
  },
  {
    "sno": 171,
    "district": "Dumka",
    "facility_name": "Madhuban-PHC",
    "facility_type": "PHC",
    "Lat ": 24.344,
    "longitude": 87.348,
    "facility_code": "JHPHCDUM029_GW1"
  },
  {
    "sno": 172,
    "district": "Dumka",
    "facility_name": "Narganj-PHC",
    "facility_type": "PHC",
    "Lat ": 24.423,
    "longitude": 87.392,
    "facility_code": "JHPHCDUM030_GW1"
  },
  {
    "sno": 173,
    "district": "Dumka",
    "facility_name": "Dalahi-PHC",
    "facility_type": "PHC",
    "Lat ": 24.085,
    "longitude": 87.16028,
    "facility_code": "JHPHCDUM031_GW1"
  },
  {
    "sno": 174,
    "district": "Dumka",
    "facility_name": "Mohanpur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.0631,
    "longitude": 87.21972,
    "facility_code": "JHPHCDUM032_GW1"
  },
  {
    "sno": 175,
    "district": "Dumka",
    "facility_name": "Daro-PHC",
    "facility_type": "PHC",
    "Lat ": 24.424,
    "longitude": 87.249,
    "facility_code": "JHPHCDUM033_GW1"
  },
  {
    "sno": 176,
    "district": "Dumka",
    "facility_name": "Gamhariya-PHC",
    "facility_type": "PHC",
    "Lat ": 24.5764,
    "longitude": 87.18528,
    "facility_code": "JHPHCDUM034_GW1"
  },
  {
    "sno": 177,
    "district": "Dumka",
    "facility_name": "Karbindha-PHC",
    "facility_type": "PHC",
    "Lat ": 24.4236,
    "longitude": 87.3097,
    "facility_code": "JHPHCDUM035_GW1"
  },
  {
    "sno": 178,
    "district": "Dumka",
    "facility_name": "Nonihat-PHC",
    "facility_type": "PHC",
    "Lat ": 24.589,
    "longitude": 87.026,
    "facility_code": "JHPHCDUM036_GW1"
  },
  {
    "sno": 179,
    "district": "Dumka",
    "facility_name": "AAMJORA-PHC",
    "facility_type": "PHC",
    "Lat ": 23.9967,
    "longitude": 87.42444,
    "facility_code": "JHPHCDUM037_GW1"
  },
  {
    "sno": 180,
    "district": "Dumka",
    "facility_name": "Aasanbani-PHC",
    "facility_type": "PHC",
    "Lat ": 24.1269,
    "longitude": 87.44833,
    "facility_code": "JHPHCDUM038_GW1"
  },
  {
    "sno": 181,
    "district": "Dumka",
    "facility_name": "BANSKULI-PHC",
    "facility_type": "PHC",
    "Lat ": 24.0628,
    "longitude": 87.33639,
    "facility_code": "JHPHCDUM039_GW1"
  },
  {
    "sno": 182,
    "district": "Dumka",
    "facility_name": "DIGGHI-PHC",
    "facility_type": "PHC",
    "Lat ": 24.547,
    "longitude": 86.947,
    "facility_code": "JHPHCDUM040_GW1"
  },
  {
    "sno": 183,
    "district": "Dumka",
    "facility_name": "HANSDIHA-PHC",
    "facility_type": "PHC",
    "Lat ": 24.207,
    "longitude": 87.56,
    "facility_code": "JHPHCDUM041_GW1"
  },
  {
    "sno": 184,
    "district": "Dumka",
    "facility_name": "KENDUA-PHC",
    "facility_type": "PHC",
    "Lat ": 24.546,
    "longitude": 87.053,
    "facility_code": "JHPHCDUM042_GW1"
  },
  {
    "sno": 185,
    "district": "Dumka",
    "facility_name": "MOHRA-PHC",
    "facility_type": "PHC",
    "Lat ": 24.518,
    "longitude": 87.026,
    "facility_code": "JHPHCDUM043_GW1"
  },
  {
    "sno": 186,
    "district": "Dumka",
    "facility_name": "Dhanghara-PHC",
    "facility_type": "PHC",
    "Lat ": 24.1978,
    "longitude": 87.655,
    "facility_code": "JHPHCDUM044_GW1"
  },
  {
    "sno": 187,
    "district": "Dumka",
    "facility_name": "Maluti-PHC",
    "facility_type": "PHC",
    "Lat ": 24.1608,
    "longitude": 87.67472,
    "facility_code": "JHPHCDUM045_GW1"
  },
  {
    "sno": 188,
    "district": "Dumka",
    "facility_name": "Rajbandh-PHC",
    "facility_type": "PHC",
    "Lat ": 24.1719,
    "longitude": 87.475,
    "facility_code": "JHPHCDUM046_GW1"
  },
  {
    "sno": 189,
    "district": "Dumka",
    "facility_name": "Sarasdangal-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2131,
    "longitude": 87.59778,
    "facility_code": "JHPHCDUM047_GW1"
  },
  {
    "sno": 190,
    "district": "East Singhbum",
    "facility_name": "MGM Jamshedpur-MC",
    "facility_type": "MC",
    "Lat ": 22.80457,
    "longitude": 86.20288,
    "facility_code": "JHMEDESB001_GW1"
  },
  {
    "sno": 667,
    "district": "East Singhbum",
    "facility_name": "PHC LAWJORA",
    "facility_type": "PHC",
    "Lat ": 22.95114,
    "longitude": 86.33395,
    "facility_code": "JHPHCESB043_GW1"
  },
  {
    "sno": 668,
    "district": "East Singhbum",
    "facility_name": "PHC Shyamsundarpur",
    "facility_type": "PHC",
    "Lat ": 22.95114,
    "longitude": 86.33395,
    "facility_code": "JHPHCESB044_GW1"
  },
  {
    "sno": 191,
    "district": "East Singhbum",
    "facility_name": "Purbi Singhbhum Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 22.75,
    "longitude": 86.2,
    "facility_code": "JHDHESB002_GW1"
  },
  {
    "sno": 192,
    "district": "East Singhbum",
    "facility_name": "Ghatshila-SDH",
    "facility_type": "SDH",
    "Lat ": 22.56,
    "longitude": 86.48,
    "facility_code": "JHSDHESB003_GW1"
  },
  {
    "sno": 193,
    "district": "East Singhbum",
    "facility_name": "Baharagora-CHC",
    "facility_type": "CHC",
    "Lat ": 22.27,
    "longitude": 86.72,
    "facility_code": "JHCHCESB004_GW1"
  },
  {
    "sno": 194,
    "district": "East Singhbum",
    "facility_name": "Chakulia-CHC",
    "facility_type": "CHC",
    "Lat ": 22.48,
    "longitude": 86.71,
    "facility_code": "JHCHCESB005_GW1"
  },
  {
    "sno": 195,
    "district": "East Singhbum",
    "facility_name": "Dhalbhumgadh-CHC",
    "facility_type": "CHC",
    "Lat ": 22.51,
    "longitude": 86.54,
    "facility_code": "JHCHCESB006_GW1"
  },
  {
    "sno": 196,
    "district": "East Singhbum",
    "facility_name": "Dumaria-CHC",
    "facility_type": "CHC",
    "Lat ": 22.44,
    "longitude": 86.43,
    "facility_code": "JHCHCESB007_GW1"
  },
  {
    "sno": 197,
    "district": "East Singhbum",
    "facility_name": "Jugsalai Sah Golmuri-CHC",
    "facility_type": "CHC",
    "Lat ": 22.76,
    "longitude": 86.18,
    "facility_code": "JHCHCESB008_GW1"
  },
  {
    "sno": 198,
    "district": "East Singhbum",
    "facility_name": "UCHC Birsa Nagar-CHC",
    "facility_type": "CHC",
    "Lat ": 22.78,
    "longitude": 86.24,
    "facility_code": "JHCHCESB009_GW1"
  },
  {
    "sno": 199,
    "district": "East Singhbum",
    "facility_name": "UCHC Mango-CHC",
    "facility_type": "CHC",
    "Lat ": 22.83,
    "longitude": 86.22,
    "facility_code": "JHCHCESB010_GW1"
  },
  {
    "sno": 200,
    "district": "East Singhbum",
    "facility_name": "Musaboni-CHC",
    "facility_type": "CHC",
    "Lat ": 22.49,
    "longitude": 86.45,
    "facility_code": "JHCHCESB011_GW1"
  },
  {
    "sno": 201,
    "district": "East Singhbum",
    "facility_name": "Patamda-CHC",
    "facility_type": "CHC",
    "Lat ": 22.9,
    "longitude": 86.38,
    "facility_code": "JHCHCESB012_GW1"
  },
  {
    "sno": 202,
    "district": "East Singhbum",
    "facility_name": "Potka-CHC",
    "facility_type": "CHC",
    "Lat ": 22.62,
    "longitude": 86.21,
    "facility_code": "JHCHCESB013_GW1"
  },
  {
    "sno": 203,
    "district": "East Singhbum",
    "facility_name": "Ref Juri Hospital-CHC",
    "facility_type": "CHC",
    "Lat ": 22.6,
    "longitude": 86.17,
    "facility_code": "JHCHCESB014_GW1"
  },
  {
    "sno": 204,
    "district": "East Singhbum",
    "facility_name": "Chitreshwar-PHC",
    "facility_type": "PHC",
    "Lat ": 22.22178,
    "longitude": 86.78939,
    "facility_code": "JHPHCESB015_GW1"
  },
  {
    "sno": 205,
    "district": "East Singhbum",
    "facility_name": "Manushmuriya-PHC",
    "facility_type": "PHC",
    "Lat ": 22.36,
    "longitude": 86.78,
    "facility_code": "JHPHCESB016_GW1"
  },
  {
    "sno": 206,
    "district": "East Singhbum",
    "facility_name": "Ramchandrapur-PHC",
    "facility_type": "PHC",
    "Lat ": 22.27,
    "longitude": 86.88,
    "facility_code": "JHPHCESB017_GW1"
  },
  {
    "sno": 207,
    "district": "East Singhbum",
    "facility_name": "Sindurgori-PHC",
    "facility_type": "PHC",
    "Lat ": 22.45,
    "longitude": 86.74,
    "facility_code": "JHPHCESB018_GW1"
  },
  {
    "sno": 208,
    "district": "East Singhbum",
    "facility_name": "Kokhparah-PHC",
    "facility_type": "PHC",
    "Lat ": 22.47,
    "longitude": 86.64,
    "facility_code": "JHPHCESB019_GW1"
  },
  {
    "sno": 209,
    "district": "East Singhbum",
    "facility_name": "Singhpura-PHC",
    "facility_type": "PHC",
    "Lat ": 22.36,
    "longitude": 86.57,
    "facility_code": "JHPHCESB020_GW1"
  },
  {
    "sno": 210,
    "district": "East Singhbum",
    "facility_name": "Galudih-PHC",
    "facility_type": "PHC",
    "Lat ": 22.64,
    "longitude": 86.4,
    "facility_code": "JHPHCESB021_GW1"
  },
  {
    "sno": 211,
    "district": "East Singhbum",
    "facility_name": "Jhanti Jharna-PHC",
    "facility_type": "PHC",
    "Lat ": 22.69,
    "longitude": 86.54,
    "facility_code": "JHPHCESB022_GW1"
  },
  {
    "sno": 212,
    "district": "East Singhbum",
    "facility_name": "Karaduba-PHC",
    "facility_type": "PHC",
    "Lat ": 22.63,
    "longitude": 86.58,
    "facility_code": "JHPHCESB023_GW1"
  },
  {
    "sno": 213,
    "district": "East Singhbum",
    "facility_name": "Khariya Colony-PHC",
    "facility_type": "PHC",
    "Lat ": 22.68,
    "longitude": 86.39,
    "facility_code": "JHPHCESB024_GW1"
  },
  {
    "sno": 214,
    "district": "East Singhbum",
    "facility_name": "Belajuri-PHC",
    "facility_type": "PHC",
    "Lat ": 22.73,
    "longitude": 86.35,
    "facility_code": "JHPHCESB025_GW1"
  },
  {
    "sno": 215,
    "district": "East Singhbum",
    "facility_name": "ESI Dispensary, Jugsalai-PHC",
    "facility_type": "PHC",
    "Lat ": 22.77338,
    "longitude": 86.19058,
    "facility_code": "JHPHCESB026_GW1"
  },
  {
    "sno": 216,
    "district": "East Singhbum",
    "facility_name": "ESI Dispensary, Maango-PHC",
    "facility_type": "PHC",
    "Lat ": 22.82927,
    "longitude": 86.21353,
    "facility_code": "JHPHCESB027_GW1"
  },
  {
    "sno": 217,
    "district": "East Singhbum",
    "facility_name": "ESI Dispensary, Sakchi-PHC",
    "facility_type": "PHC",
    "Lat ": 22.79018,
    "longitude": 86.21425,
    "facility_code": "JHPHCESB028_GW1"
  },
  {
    "sno": 218,
    "district": "East Singhbum",
    "facility_name": "Ghorabandha-PHC",
    "facility_type": "PHC",
    "Lat ": 22.77,
    "longitude": 86.27,
    "facility_code": "JHPHCESB029_GW1"
  },
  {
    "sno": 219,
    "district": "East Singhbum",
    "facility_name": "UPHC Bagunhatu-PHC",
    "facility_type": "PHC",
    "Lat ": 22.81,
    "longitude": 86.239,
    "facility_code": "JHPHCESB030_GW1"
  },
  {
    "sno": 220,
    "district": "East Singhbum",
    "facility_name": "UPHC Baliguma-PHC",
    "facility_type": "PHC",
    "Lat ": 22.77085,
    "longitude": 86.27643,
    "facility_code": "JHPHCESB031_GW1"
  },
  {
    "sno": 221,
    "district": "East Singhbum",
    "facility_name": "UPHC Chota govindpur-PHC",
    "facility_type": "PHC",
    "Lat ": 22.80457,
    "longitude": 86.20288,
    "facility_code": "JHPHCESB032_GW1"
  },
  {
    "sno": 222,
    "district": "East Singhbum",
    "facility_name": "UPHC Laxmi Nagar-PHC",
    "facility_type": "PHC",
    "Lat ": 22.80457,
    "longitude": 86.20282,
    "facility_code": "JHPHCESB033_GW1"
  },
  {
    "sno": 223,
    "district": "East Singhbum",
    "facility_name": "UPHC Lions club notified Area-PHC",
    "facility_type": "PHC",
    "Lat ": 22.83402,
    "longitude": 86.21958,
    "facility_code": "JHPHCESB034_GW1"
  },
  {
    "sno": 224,
    "district": "East Singhbum",
    "facility_name": "UPHC Ramjanam Nagar-PHC",
    "facility_type": "PHC",
    "Lat ": 22.79817,
    "longitude": 86.16564,
    "facility_code": "JHPHCESB035_GW1"
  },
  {
    "sno": 225,
    "district": "East Singhbum",
    "facility_name": "UPHC Roop Nagar Sonari-PHC",
    "facility_type": "PHC",
    "Lat ": 22.77085,
    "longitude": 86.27643,
    "facility_code": "JHPHCESB036_GW1"
  },
  {
    "sno": 226,
    "district": "East Singhbum",
    "facility_name": "UPHC Sidhgora-PHC",
    "facility_type": "PHC",
    "Lat ": 22.77085,
    "longitude": 86.27643,
    "facility_code": "JHPHCESB037_GW1"
  },
  {
    "sno": 227,
    "district": "East Singhbum",
    "facility_name": "UPHC Zone5 Birsa Nagar-PHC",
    "facility_type": "PHC",
    "Lat ": 22.784,
    "longitude": 86.238,
    "facility_code": "JHPHCESB038_GW1"
  },
  {
    "sno": 228,
    "district": "East Singhbum",
    "facility_name": "Jadugora-PHC",
    "facility_type": "PHC",
    "Lat ": 22.64,
    "longitude": 86.36,
    "facility_code": "JHPHCESB039_GW1"
  },
  {
    "sno": 229,
    "district": "East Singhbum",
    "facility_name": "Bangurda-PHC",
    "facility_type": "PHC",
    "Lat ": 22.96,
    "longitude": 86.41,
    "facility_code": "JHPHCESB040_GW1"
  },
  {
    "sno": 230,
    "district": "East Singhbum",
    "facility_name": "Haldipokhar-PHC",
    "facility_type": "PHC",
    "Lat ": 22.59,
    "longitude": 86.13,
    "facility_code": "JHPHCESB041_GW1"
  },
  {
    "sno": 231,
    "district": "East Singhbum",
    "facility_name": "Manpur-PHC",
    "facility_type": "PHC",
    "Lat ": 22.59081,
    "longitude": 86.23699,
    "facility_code": "JHPHCESB042_GW1"
  },
  {
    "sno": 232,
    "district": "Garhwa",
    "facility_name": "Garhwa Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 24.1549,
    "longitude": 83.79956,
    "facility_code": "JHDHGAR001_GW1"
  },
  {
    "sno": 233,
    "district": "Garhwa",
    "facility_name": "Nagar Untari-SDH",
    "facility_type": "SDH",
    "Lat ": 24.28429,
    "longitude": 83.50064,
    "facility_code": "JHSDHGAR002_GW1"
  },
  {
    "sno": 234,
    "district": "Garhwa",
    "facility_name": "Bhandaria-CHC",
    "facility_type": "CHC",
    "Lat ": 23.7385,
    "longitude": 83.82874,
    "facility_code": "JHCHCGAR003_GW1"
  },
  {
    "sno": 235,
    "district": "Garhwa",
    "facility_name": "Bhawnathpur-CHC",
    "facility_type": "CHC",
    "Lat ": 24.39,
    "longitude": 83.57,
    "facility_code": "JHCHCGAR004_GW1"
  },
  {
    "sno": 236,
    "district": "Garhwa",
    "facility_name": "Dhurki-CHC",
    "facility_type": "CHC",
    "Lat ": 24.14025,
    "longitude": 83.44835,
    "facility_code": "JHCHCGAR005_GW1"
  },
  {
    "sno": 237,
    "district": "Garhwa",
    "facility_name": "Garhwa Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCGAR006_GW1"
  },
  {
    "sno": 238,
    "district": "Garhwa",
    "facility_name": "Majhiaon-CHC",
    "facility_type": "CHC",
    "Lat ": 24.31829,
    "longitude": 83.81861,
    "facility_code": "JHCHCGAR007_GW1"
  },
  {
    "sno": 239,
    "district": "Garhwa",
    "facility_name": "Meral-CHC",
    "facility_type": "CHC",
    "Lat ": 24.1875,
    "longitude": 83.7075,
    "facility_code": "JHCHCGAR008_GW1"
  },
  {
    "sno": 240,
    "district": "Garhwa",
    "facility_name": "Ranka-CHC",
    "facility_type": "CHC",
    "Lat ": 23.99152,
    "longitude": 83.78629,
    "facility_code": "JHCHCGAR009_GW1"
  },
  {
    "sno": 241,
    "district": "Garhwa",
    "facility_name": "Arangi-PHC",
    "facility_type": "PHC",
    "Lat ": 24.46,
    "longitude": 83.49,
    "facility_code": "JHPHCGAR010_GW1"
  },
  {
    "sno": 242,
    "district": "Garhwa",
    "facility_name": "Danda-PHC",
    "facility_type": "PHC",
    "Lat ": 24.13716,
    "longitude": 83.94796,
    "facility_code": "JHPHCGAR011_GW1"
  },
  {
    "sno": 243,
    "district": "Garhwa",
    "facility_name": "Medna-PHC",
    "facility_type": "PHC",
    "Lat ": 24.14212,
    "longitude": 83.83797,
    "facility_code": "JHPHCGAR012_GW1"
  },
  {
    "sno": 244,
    "district": "Garhwa",
    "facility_name": "UPHC Tandwa-PHC",
    "facility_type": "PHC",
    "Lat ": 24.108,
    "longitude": 83.677,
    "facility_code": "JHPHCGAR013_GW1"
  },
  {
    "sno": 245,
    "district": "Garhwa",
    "facility_name": "Kandi-PHC",
    "facility_type": "PHC",
    "Lat ": 24.47641,
    "longitude": 83.76426,
    "facility_code": "JHPHCGAR014_GW1"
  },
  {
    "sno": 246,
    "district": "Garhwa",
    "facility_name": "Kharaudha-PHC",
    "facility_type": "PHC",
    "Lat ": 24.48804,
    "longitude": 83.842,
    "facility_code": "JHPHCGAR015_GW1"
  },
  {
    "sno": 247,
    "district": "Garhwa",
    "facility_name": "Morbey-PHC",
    "facility_type": "PHC",
    "Lat ": 24.48804,
    "longitude": 83.842,
    "facility_code": "JHPHCGAR016_GW1"
  },
  {
    "sno": 248,
    "district": "Garhwa",
    "facility_name": "Chataniya-PHC",
    "facility_type": "PHC",
    "Lat ": 24.1875,
    "longitude": 83.7075,
    "facility_code": "JHPHCGAR017_GW1"
  },
  {
    "sno": 249,
    "district": "Garhwa",
    "facility_name": "Dandai-PHC",
    "facility_type": "PHC",
    "Lat ": 24.1875,
    "longitude": 83.7075,
    "facility_code": "JHPHCGAR018_GW1"
  },
  {
    "sno": 250,
    "district": "Garhwa",
    "facility_name": "Duldulwa-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCGAR019_GW1"
  },
  {
    "sno": 251,
    "district": "Garhwa",
    "facility_name": "Gerua-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCGAR020_GW1"
  },
  {
    "sno": 252,
    "district": "Garhwa",
    "facility_name": "Chiniya-PHC",
    "facility_type": "PHC",
    "Lat ": 23.92638,
    "longitude": 83.72935,
    "facility_code": "JHPHCGAR021_GW1"
  },
  {
    "sno": 253,
    "district": "Garhwa",
    "facility_name": "Ramkanda-PHC",
    "facility_type": "PHC",
    "Lat ": 23.84914,
    "longitude": 83.87314,
    "facility_code": "JHPHCGAR022_GW1"
  },
  {
    "sno": 254,
    "district": "Giridih",
    "facility_name": "Giridih Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 24.18,
    "longitude": 86.28,
    "facility_code": "JHDHGIR001_GW1"
  },
  {
    "sno": 255,
    "district": "Giridih",
    "facility_name": "Bagodar-CHC",
    "facility_type": "CHC",
    "Lat ": 24.08,
    "longitude": 85.83,
    "facility_code": "JHCHCGIR002_GW1"
  },
  {
    "sno": 256,
    "district": "Giridih",
    "facility_name": "Bengabad-CHC",
    "facility_type": "CHC",
    "Lat ": 24.3,
    "longitude": 86.36,
    "facility_code": "JHCHCGIR003_GW1"
  },
  {
    "sno": 257,
    "district": "Giridih",
    "facility_name": "Birni-CHC",
    "facility_type": "CHC",
    "Lat ": 24.27,
    "longitude": 85.93,
    "facility_code": "JHCHCGIR004_GW1"
  },
  {
    "sno": 258,
    "district": "Giridih",
    "facility_name": "Deori-CHC",
    "facility_type": "CHC",
    "Lat ": 24.51,
    "longitude": 86.19,
    "facility_code": "JHCHCGIR005_GW1"
  },
  {
    "sno": 259,
    "district": "Giridih",
    "facility_name": "Ref Rajdhanwar Hospital-CHC",
    "facility_type": "CHC",
    "Lat ": 24.41,
    "longitude": 85.98,
    "facility_code": "JHCHCGIR006_GW1"
  },
  {
    "sno": 260,
    "district": "Giridih",
    "facility_name": "Ref Dumri Hospital-CHC",
    "facility_type": "CHC",
    "Lat ": 23.98,
    "longitude": 86.03,
    "facility_code": "JHCHCGIR007_GW1"
  },
  {
    "sno": 261,
    "district": "Giridih",
    "facility_name": "Gandey-CHC",
    "facility_type": "CHC",
    "Lat ": 24.18,
    "longitude": 86.43,
    "facility_code": "JHCHCGIR008_GW1"
  },
  {
    "sno": 262,
    "district": "Giridih",
    "facility_name": "Gawan-CHC",
    "facility_type": "CHC",
    "Lat ": 24.62,
    "longitude": 85.95,
    "facility_code": "JHCHCGIR009_GW1"
  },
  {
    "sno": 263,
    "district": "Giridih",
    "facility_name": "Giridih Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCGIR010_GW1"
  },
  {
    "sno": 264,
    "district": "Giridih",
    "facility_name": "Jamua-CHC",
    "facility_type": "CHC",
    "Lat ": 24.37,
    "longitude": 86.15,
    "facility_code": "JHCHCGIR011_GW1"
  },
  {
    "sno": 265,
    "district": "Giridih",
    "facility_name": "Pirtand-CHC",
    "facility_type": "CHC",
    "Lat ": 24.04,
    "longitude": 86.16,
    "facility_code": "JHCHCGIR012_GW1"
  },
  {
    "sno": 266,
    "district": "Giridih",
    "facility_name": "Tisri-CHC",
    "facility_type": "CHC",
    "Lat ": 24.57,
    "longitude": 86.03,
    "facility_code": "JHCHCGIR013_GW1"
  },
  {
    "sno": 267,
    "district": "Giridih",
    "facility_name": "Atka-PHC",
    "facility_type": "PHC",
    "Lat ": 24.18,
    "longitude": 86.3,
    "facility_code": "JHPHCGIR014_GW1"
  },
  {
    "sno": 268,
    "district": "Giridih",
    "facility_name": "Saria-PHC",
    "facility_type": "PHC",
    "Lat ": 24.18,
    "longitude": 85.89,
    "facility_code": "JHPHCGIR015_GW1"
  },
  {
    "sno": 269,
    "district": "Giridih",
    "facility_name": "Barmasia-PHC",
    "facility_type": "PHC",
    "Lat ": 24.6,
    "longitude": 86.05,
    "facility_code": "JHPHCGIR016_GW1"
  },
  {
    "sno": 270,
    "district": "Giridih",
    "facility_name": "Tuladih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.21,
    "longitude": 86.02,
    "facility_code": "JHPHCGIR017_GW1"
  },
  {
    "sno": 271,
    "district": "Giridih",
    "facility_name": "Balhara-PHC",
    "facility_type": "PHC",
    "Lat ": 24.48,
    "longitude": 85.92,
    "facility_code": "JHPHCGIR018_GW1"
  },
  {
    "sno": 272,
    "district": "Giridih",
    "facility_name": "Bhandaro-PHC",
    "facility_type": "PHC",
    "Lat ": 24.42,
    "longitude": 86.04,
    "facility_code": "JHPHCGIR019_GW1"
  },
  {
    "sno": 273,
    "district": "Giridih",
    "facility_name": "Nimiaghat-PHC",
    "facility_type": "PHC",
    "Lat ": 23.95,
    "longitude": 86.08,
    "facility_code": "JHPHCGIR020_GW1"
  },
  {
    "sno": 274,
    "district": "Giridih",
    "facility_name": "Pihra-PHC",
    "facility_type": "PHC",
    "Lat ": 24.64,
    "longitude": 85.81,
    "facility_code": "JHPHCGIR021_GW1"
  },
  {
    "sno": 275,
    "district": "Giridih",
    "facility_name": "ESI Dispensary, Makatpur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.18861,
    "longitude": 86.30668,
    "facility_code": "JHPHCGIR022_GW1"
  },
  {
    "sno": 276,
    "district": "Giridih",
    "facility_name": "Pachamba-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2,
    "longitude": 86.28,
    "facility_code": "JHPHCGIR023_GW1"
  },
  {
    "sno": 277,
    "district": "Giridih",
    "facility_name": "Senadoni-PHC",
    "facility_type": "PHC",
    "Lat ": 24.25,
    "longitude": 86.18,
    "facility_code": "JHPHCGIR024_GW1"
  },
  {
    "sno": 278,
    "district": "Giridih",
    "facility_name": "Udnabad-PHC",
    "facility_type": "PHC",
    "Lat ": 24.15,
    "longitude": 86.36,
    "facility_code": "JHPHCGIR025_GW1"
  },
  {
    "sno": 279,
    "district": "Giridih",
    "facility_name": "UPHC Kalyandih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2,
    "longitude": 86.28,
    "facility_code": "JHPHCGIR026_GW1"
  },
  {
    "sno": 280,
    "district": "Giridih",
    "facility_name": "UPHC Sihodih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.201,
    "longitude": 86.281,
    "facility_code": "JHPHCGIR027_GW1"
  },
  {
    "sno": 281,
    "district": "Giridih",
    "facility_name": "Mirjaganj-PHC",
    "facility_type": "PHC",
    "Lat ": 24.39,
    "longitude": 86.17,
    "facility_code": "JHPHCGIR028_GW1"
  },
  {
    "sno": 282,
    "district": "Giridih",
    "facility_name": "Navdiha-PHC",
    "facility_type": "PHC",
    "Lat ": 24.38,
    "longitude": 86.27,
    "facility_code": "JHPHCGIR029_GW1"
  },
  {
    "sno": 283,
    "district": "Giridih",
    "facility_name": "Palganj-PHC",
    "facility_type": "PHC",
    "Lat ": 24.07,
    "longitude": 86.22,
    "facility_code": "JHPHCGIR030_GW1"
  },
  {
    "sno": 284,
    "district": "Giridih",
    "facility_name": "Ghanghrikuran-PHC",
    "facility_type": "PHC",
    "Lat ": 24.55,
    "longitude": 85.94,
    "facility_code": "JHPHCGIR031_GW1"
  },
  {
    "sno": 285,
    "district": "Godda",
    "facility_name": "Godda Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 24.82397,
    "longitude": 87.21416,
    "facility_code": "JHDHGOD001_GW1"
  },
  {
    "sno": 286,
    "district": "Godda",
    "facility_name": "Boarijore-CHC",
    "facility_type": "CHC",
    "Lat ": 25.06364,
    "longitude": 87.47224,
    "facility_code": "JHCHCGOD002_GW1"
  },
  {
    "sno": 287,
    "district": "Godda",
    "facility_name": "Godda Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCGOD003_GW1"
  },
  {
    "sno": 288,
    "district": "Godda",
    "facility_name": "Mahagama-CHC",
    "facility_type": "CHC",
    "Lat ": 25.03,
    "longitude": 87.32,
    "facility_code": "JHCHCGOD004_GW1"
  },
  {
    "sno": 289,
    "district": "Godda",
    "facility_name": "Meharma-CHC",
    "facility_type": "CHC",
    "Lat ": 25.18086,
    "longitude": 87.34943,
    "facility_code": "JHCHCGOD005_GW1"
  },
  {
    "sno": 290,
    "district": "Godda",
    "facility_name": "ThakurGangti-CHC",
    "facility_type": "CHC",
    "Lat ": 25.1301,
    "longitude": 87.45421,
    "facility_code": "JHCHCGOD006_GW1"
  },
  {
    "sno": 291,
    "district": "Godda",
    "facility_name": "Pathargama-CHC",
    "facility_type": "CHC",
    "Lat ": 24.94533,
    "longitude": 87.28114,
    "facility_code": "JHCHCGOD007_GW1"
  },
  {
    "sno": 292,
    "district": "Godda",
    "facility_name": "Poraiyahat-CHC",
    "facility_type": "CHC",
    "Lat ": 24.67555,
    "longitude": 87.1717,
    "facility_code": "JHCHCGOD008_GW1"
  },
  {
    "sno": 293,
    "district": "Godda",
    "facility_name": "Sunderpahari-CHC",
    "facility_type": "CHC",
    "Lat ": 24.75354,
    "longitude": 87.3637,
    "facility_code": "JHCHCGOD009_GW1"
  },
  {
    "sno": 294,
    "district": "Godda",
    "facility_name": "Rajabhita-PHC",
    "facility_type": "PHC",
    "Lat ": 25.11346,
    "longitude": 87.41284,
    "facility_code": "JHPHCGOD010_GW1"
  },
  {
    "sno": 295,
    "district": "Godda",
    "facility_name": "Motia-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCGOD011_GW1"
  },
  {
    "sno": 296,
    "district": "Godda",
    "facility_name": "Sarouni-PHC",
    "facility_type": "PHC",
    "Lat ": 24.81953,
    "longitude": 87.31585,
    "facility_code": "JHPHCGOD012_GW1"
  },
  {
    "sno": 297,
    "district": "Godda",
    "facility_name": "UPHC Routara-PHC",
    "facility_type": "PHC",
    "Lat ": 24.82396,
    "longitude": 87.21416,
    "facility_code": "JHPHCGOD013_GW1"
  },
  {
    "sno": 298,
    "district": "Godda",
    "facility_name": "Parsa-PHC",
    "facility_type": "PHC",
    "Lat ": 24.82552,
    "longitude": 87.21352,
    "facility_code": "JHPHCGOD014_GW1"
  },
  {
    "sno": 299,
    "district": "Godda",
    "facility_name": "Balbadda-PHC",
    "facility_type": "PHC",
    "Lat ": 25.13418,
    "longitude": 87.32283,
    "facility_code": "JHPHCGOD015_GW1"
  },
  {
    "sno": 300,
    "district": "Godda",
    "facility_name": "Kasba-PHC",
    "facility_type": "PHC",
    "Lat ": 25.18681,
    "longitude": 87.38794,
    "facility_code": "JHPHCGOD016_GW1"
  },
  {
    "sno": 301,
    "district": "Godda",
    "facility_name": "SINGHARI-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCGOD017_GW1"
  },
  {
    "sno": 302,
    "district": "Godda",
    "facility_name": "Basantrai-PHC",
    "facility_type": "PHC",
    "Lat ": 24.99591,
    "longitude": 87.20023,
    "facility_code": "JHPHCGOD018_GW1"
  },
  {
    "sno": 303,
    "district": "Godda",
    "facility_name": "BHALSUNDIHYA-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCGOD019_GW1"
  },
  {
    "sno": 304,
    "district": "Godda",
    "facility_name": "Rupchuk-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCGOD020_GW1"
  },
  {
    "sno": 305,
    "district": "Godda",
    "facility_name": "Danre-PHC",
    "facility_type": "PHC",
    "Lat ": 24.82552,
    "longitude": 87.21352,
    "facility_code": "JHPHCGOD021_GW1"
  },
  {
    "sno": 306,
    "district": "Godda",
    "facility_name": "Deodare-PHC",
    "facility_type": "PHC",
    "Lat ": 24.67552,
    "longitude": 87.21352,
    "facility_code": "JHPHCGOD022_GW1"
  },
  {
    "sno": 307,
    "district": "Godda",
    "facility_name": "Damruhat-PHC",
    "facility_type": "PHC",
    "Lat ": 24.61752,
    "longitude": 87.38851,
    "facility_code": "JHPHCGOD023_GW1"
  },
  {
    "sno": 308,
    "district": "Gumla",
    "facility_name": "Gumla Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 23.05,
    "longitude": 84.54,
    "facility_code": "JHDHGUM001_GW1"
  },
  {
    "sno": 309,
    "district": "Gumla",
    "facility_name": "Basia-CHC",
    "facility_type": "CHC",
    "Lat ": 22.87,
    "longitude": 84.82,
    "facility_code": "JHCHCGUM002_GW1"
  },
  {
    "sno": 310,
    "district": "Gumla",
    "facility_name": "Bharno-CHC",
    "facility_type": "CHC",
    "Lat ": 23.23,
    "longitude": 84.89,
    "facility_code": "JHCHCGUM003_GW1"
  },
  {
    "sno": 311,
    "district": "Gumla",
    "facility_name": "Bishunpur-CHC",
    "facility_type": "CHC",
    "Lat ": 23.2,
    "longitude": 84.2,
    "facility_code": "JHCHCGUM004_GW1"
  },
  {
    "sno": 312,
    "district": "Gumla",
    "facility_name": "Chainpur-CHC",
    "facility_type": "CHC",
    "Lat ": 23.14,
    "longitude": 84.24,
    "facility_code": "JHCHCGUM005_GW1"
  },
  {
    "sno": 313,
    "district": "Gumla",
    "facility_name": "Dumri-CHC",
    "facility_type": "CHC",
    "Lat ": 23.16,
    "longitude": 84.14,
    "facility_code": "JHCHCGUM006_GW1"
  },
  {
    "sno": 314,
    "district": "Gumla",
    "facility_name": "Ghaghra-CHC",
    "facility_type": "CHC",
    "Lat ": 23.26,
    "longitude": 84.56,
    "facility_code": "JHCHCGUM007_GW1"
  },
  {
    "sno": 315,
    "district": "Gumla",
    "facility_name": "Gumla Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCGUM008_GW1"
  },
  {
    "sno": 316,
    "district": "Gumla",
    "facility_name": "Kamdara-CHC",
    "facility_type": "CHC",
    "Lat ": 22.91,
    "longitude": 84.92,
    "facility_code": "JHCHCGUM009_GW1"
  },
  {
    "sno": 317,
    "district": "Gumla",
    "facility_name": "Palkot-CHC",
    "facility_type": "CHC",
    "Lat ": 22.87,
    "longitude": 84.65,
    "facility_code": "JHCHCGUM010_GW1"
  },
  {
    "sno": 318,
    "district": "Gumla",
    "facility_name": "Raidih-CHC",
    "facility_type": "CHC",
    "Lat ": 22.95,
    "longitude": 84.46,
    "facility_code": "JHCHCGUM011_GW1"
  },
  {
    "sno": 319,
    "district": "Gumla",
    "facility_name": "Sisai-CHC",
    "facility_type": "CHC",
    "Lat ": 23.17,
    "longitude": 84.76,
    "facility_code": "JHCHCGUM012_GW1"
  },
  {
    "sno": 320,
    "district": "Gumla",
    "facility_name": "UPHC Azaad Basti-PHC",
    "facility_type": "PHC",
    "Lat ": 23.07431,
    "longitude": 84.57636,
    "facility_code": "JHPHCGUM013_GW1"
  },
  {
    "sno": 321,
    "district": "Gumla",
    "facility_name": "Kurgi-PHC",
    "facility_type": "PHC",
    "Lat ": 23.1701,
    "longitude": 84.7602,
    "facility_code": "JHPHCGUM014_GW1"
  },
  {
    "sno": 322,
    "district": "Hazaribagh",
    "facility_name": "Sheikh Bhikhari Medical College and Hospital-MC",
    "facility_type": "MC",
    "Lat ": 23.99662,
    "longitude": 85.36911,
    "facility_code": "JHMEDHAZ001_GW1"
  },
  {
    "sno": 323,
    "district": "Hazaribagh",
    "facility_name": "Barhi-SDH",
    "facility_type": "SDH",
    "Lat ": 24.3,
    "longitude": 85.4,
    "facility_code": "JHSDHHAZ002_GW1"
  },
  {
    "sno": 324,
    "district": "Hazaribagh",
    "facility_name": "Barkagaon-CHC",
    "facility_type": "CHC",
    "Lat ": 23.8486,
    "longitude": 85.2158,
    "facility_code": "JHCHCHAZ003_GW1"
  },
  {
    "sno": 325,
    "district": "Hazaribagh",
    "facility_name": "Barkatta-CHC",
    "facility_type": "CHC",
    "Lat ": 24.196,
    "longitude": 85.62974,
    "facility_code": "JHCHCHAZ004_GW1"
  },
  {
    "sno": 326,
    "district": "Hazaribagh",
    "facility_name": "Bishnugarh-CHC",
    "facility_type": "CHC",
    "Lat ": 24.0162,
    "longitude": 85.7468,
    "facility_code": "JHCHCHAZ005_GW1"
  },
  {
    "sno": 327,
    "district": "Hazaribagh",
    "facility_name": "Chouparan-CHC",
    "facility_type": "CHC",
    "Lat ": 24.40301,
    "longitude": 85.2786,
    "facility_code": "JHCHCHAZ006_GW1"
  },
  {
    "sno": 328,
    "district": "Hazaribagh",
    "facility_name": "Churchu-CHC",
    "facility_type": "CHC",
    "Lat ": 23.9,
    "longitude": 85.5,
    "facility_code": "JHCHCHAZ007_GW1"
  },
  {
    "sno": 329,
    "district": "Hazaribagh",
    "facility_name": "Hazaribagh Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCHAZ008_GW1"
  },
  {
    "sno": 330,
    "district": "Hazaribagh",
    "facility_name": "Ichak-CHC",
    "facility_type": "CHC",
    "Lat ": 24.0,
    "longitude": 85.4,
    "facility_code": "JHCHCHAZ009_GW1"
  },
  {
    "sno": 331,
    "district": "Hazaribagh",
    "facility_name": "KATKAMSANDI-CHC",
    "facility_type": "CHC",
    "Lat ": 24.1,
    "longitude": 85.2,
    "facility_code": "JHCHCHAZ010_GW1"
  },
  {
    "sno": 332,
    "district": "Hazaribagh",
    "facility_name": "Keredari-CHC",
    "facility_type": "CHC",
    "Lat ": 23.86127,
    "longitude": 85.10315,
    "facility_code": "JHCHCHAZ011_GW1"
  },
  {
    "sno": 333,
    "district": "Hazaribagh",
    "facility_name": "Champadih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2,
    "longitude": 85.4,
    "facility_code": "JHPHCHAZ012_GW1"
  },
  {
    "sno": 334,
    "district": "Hazaribagh",
    "facility_name": "Gouriya Karma-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2,
    "longitude": 85.3,
    "facility_code": "JHPHCHAZ013_GW1"
  },
  {
    "sno": 335,
    "district": "Hazaribagh",
    "facility_name": "Padma-PHC",
    "facility_type": "PHC",
    "Lat ": 24.1,
    "longitude": 85.3,
    "facility_code": "JHPHCHAZ014_GW1"
  },
  {
    "sno": 336,
    "district": "Hazaribagh",
    "facility_name": "Badam-PHC",
    "facility_type": "PHC",
    "Lat ": 23.8,
    "longitude": 85.2,
    "facility_code": "JHPHCHAZ015_GW1"
  },
  {
    "sno": 337,
    "district": "Hazaribagh",
    "facility_name": "Chamgadha-PHC",
    "facility_type": "PHC",
    "Lat ": 23.99,
    "longitude": 85.37,
    "facility_code": "JHPHCHAZ016_GW1"
  },
  {
    "sno": 338,
    "district": "Hazaribagh",
    "facility_name": "Harli-PHC",
    "facility_type": "PHC",
    "Lat ": 24.02,
    "longitude": 85.52,
    "facility_code": "JHPHCHAZ017_GW1"
  },
  {
    "sno": 339,
    "district": "Hazaribagh",
    "facility_name": "Chalkussa-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2,
    "longitude": 85.7,
    "facility_code": "JHPHCHAZ018_GW1"
  },
  {
    "sno": 340,
    "district": "Hazaribagh",
    "facility_name": "Bankharo-PHC",
    "facility_type": "PHC",
    "Lat ": 23.9,
    "longitude": 85.8,
    "facility_code": "JHPHCHAZ019_GW1"
  },
  {
    "sno": 341,
    "district": "Hazaribagh",
    "facility_name": "Tatijharia-PHC",
    "facility_type": "PHC",
    "Lat ": 24.03301,
    "longitude": 85.61588,
    "facility_code": "JHPHCHAZ020_GW1"
  },
  {
    "sno": 342,
    "district": "Hazaribagh",
    "facility_name": "Basaria-PHC",
    "facility_type": "PHC",
    "Lat ": 24.2,
    "longitude": 85.4,
    "facility_code": "JHPHCHAZ021_GW1"
  },
  {
    "sno": 343,
    "district": "Hazaribagh",
    "facility_name": "Karma-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCHAZ022_GW1"
  },
  {
    "sno": 344,
    "district": "Hazaribagh",
    "facility_name": "Ango-PHC",
    "facility_type": "PHC",
    "Lat ": 23.9,
    "longitude": 85.5,
    "facility_code": "JHPHCHAZ023_GW1"
  },
  {
    "sno": 345,
    "district": "Hazaribagh",
    "facility_name": "Charhi-PHC",
    "facility_type": "PHC",
    "Lat ": 23.8,
    "longitude": 85.4,
    "facility_code": "JHPHCHAZ024_GW1"
  },
  {
    "sno": 346,
    "district": "Hazaribagh",
    "facility_name": "Jarba-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCHAZ025_GW1"
  },
  {
    "sno": 347,
    "district": "Hazaribagh",
    "facility_name": "Daru-PHC",
    "facility_type": "PHC",
    "Lat ": 24.01,
    "longitude": 85.56,
    "facility_code": "JHPHCHAZ026_GW1"
  },
  {
    "sno": 348,
    "district": "Hazaribagh",
    "facility_name": "Harli - Daru-PHC",
    "facility_type": "PHC",
    "Lat ": 24.02067,
    "longitude": 85.52865,
    "facility_code": "JHPHCHAZ027_GW1"
  },
  {
    "sno": 349,
    "district": "Hazaribagh",
    "facility_name": "UPHC Kadma-PHC",
    "facility_type": "PHC",
    "Lat ": 23.96918,
    "longitude": 85.4149,
    "facility_code": "JHPHCHAZ028_GW1"
  },
  {
    "sno": 350,
    "district": "Hazaribagh",
    "facility_name": "UPHC Khirgaon-PHC",
    "facility_type": "PHC",
    "Lat ": 23.7537,
    "longitude": 85.28314,
    "facility_code": "JHPHCHAZ029_GW1"
  },
  {
    "sno": 351,
    "district": "Hazaribagh",
    "facility_name": "UPHC Mandaikala-PHC",
    "facility_type": "PHC",
    "Lat ": 23.99155,
    "longitude": 85.36207,
    "facility_code": "JHPHCHAZ030_GW1"
  },
  {
    "sno": 352,
    "district": "Hazaribagh",
    "facility_name": "Jharpo-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCHAZ031_GW1"
  },
  {
    "sno": 353,
    "district": "Hazaribagh",
    "facility_name": "Sultana-PHC",
    "facility_type": "PHC",
    "Lat ": 23.9,
    "longitude": 85.2,
    "facility_code": "JHPHCHAZ032_GW1"
  },
  {
    "sno": 354,
    "district": "Hazaribagh",
    "facility_name": "Bundu-PHC",
    "facility_type": "PHC",
    "Lat ": 23.73281,
    "longitude": 85.12115,
    "facility_code": "JHPHCHAZ033_GW1"
  },
  {
    "sno": 355,
    "district": "Jamtara",
    "facility_name": "Jamtara Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 23.95055,
    "longitude": 86.81701,
    "facility_code": "JHDHJAM001_GW1"
  },
  {
    "sno": 356,
    "district": "Jamtara",
    "facility_name": "Jamtara Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 23.96,
    "longitude": 86.82,
    "facility_code": "JHCHCJAM002_GW1"
  },
  {
    "sno": 357,
    "district": "Jamtara",
    "facility_name": "Ref Kundhit Hospital-CHC",
    "facility_type": "CHC",
    "Lat ": 23.96848,
    "longitude": 87.16507,
    "facility_code": "JHCHCJAM003_GW1"
  },
  {
    "sno": 358,
    "district": "Jamtara",
    "facility_name": "Nala-CHC",
    "facility_type": "CHC",
    "Lat ": 23.92209,
    "longitude": 87.03514,
    "facility_code": "JHCHCJAM004_GW1"
  },
  {
    "sno": 359,
    "district": "Jamtara",
    "facility_name": "Narayanpur-CHC",
    "facility_type": "CHC",
    "Lat ": 24.04312,
    "longitude": 86.61615,
    "facility_code": "JHCHCJAM005_GW1"
  },
  {
    "sno": 360,
    "district": "Jamtara",
    "facility_name": "Dakshinbahal-PHC",
    "facility_type": "PHC",
    "Lat ": 23.99688,
    "longitude": 86.83512,
    "facility_code": "JHPHCJAM006_GW1"
  },
  {
    "sno": 361,
    "district": "Jamtara",
    "facility_name": "Karmatarh-PHC",
    "facility_type": "PHC",
    "Lat ": 24.08773,
    "longitude": 86.70406,
    "facility_code": "JHPHCJAM007_GW1"
  },
  {
    "sno": 362,
    "district": "Jamtara",
    "facility_name": "Ladna-PHC",
    "facility_type": "PHC",
    "Lat ": 23.87584,
    "longitude": 86.79066,
    "facility_code": "JHPHCJAM008_GW1"
  },
  {
    "sno": 363,
    "district": "Jamtara",
    "facility_name": "Mihizam-PHC",
    "facility_type": "PHC",
    "Lat ": 23.85218,
    "longitude": 86.87612,
    "facility_code": "JHPHCJAM009_GW1"
  },
  {
    "sno": 364,
    "district": "Jamtara",
    "facility_name": "Amba-PHC",
    "facility_type": "PHC",
    "Lat ": 23.9721,
    "longitude": 87.15974,
    "facility_code": "JHPHCJAM010_GW1"
  },
  {
    "sno": 365,
    "district": "Jamtara",
    "facility_name": "Bagdehri-PHC",
    "facility_type": "PHC",
    "Lat ": 23.9721,
    "longitude": 87.15974,
    "facility_code": "JHPHCJAM011_GW1"
  },
  {
    "sno": 366,
    "district": "Jamtara",
    "facility_name": "Fatehpur-PHC",
    "facility_type": "PHC",
    "Lat ": 23.9721,
    "longitude": 87.15974,
    "facility_code": "JHPHCJAM012_GW1"
  },
  {
    "sno": 367,
    "district": "Jamtara",
    "facility_name": "Khajuri-PHC",
    "facility_type": "PHC",
    "Lat ": 23.9721,
    "longitude": 87.15974,
    "facility_code": "JHPHCJAM013_GW1"
  },
  {
    "sno": 368,
    "district": "Jamtara",
    "facility_name": "Bindapathar-PHC",
    "facility_type": "PHC",
    "Lat ": 23.98843,
    "longitude": 86.92735,
    "facility_code": "JHPHCJAM014_GW1"
  },
  {
    "sno": 369,
    "district": "Jamtara",
    "facility_name": "Geriya-PHC",
    "facility_type": "PHC",
    "Lat ": 23.93446,
    "longitude": 86.91147,
    "facility_code": "JHPHCJAM015_GW1"
  },
  {
    "sno": 370,
    "district": "Jamtara",
    "facility_name": "Paikber-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCJAM016_GW1"
  },
  {
    "sno": 371,
    "district": "Jamtara",
    "facility_name": "Saraskunda-PHC",
    "facility_type": "PHC",
    "Lat ": 23.86826,
    "longitude": 87.08609,
    "facility_code": "JHPHCJAM017_GW1"
  },
  {
    "sno": 372,
    "district": "Jamtara",
    "facility_name": "Bagrudih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.04312,
    "longitude": 86.61615,
    "facility_code": "JHPHCJAM018_GW1"
  },
  {
    "sno": 373,
    "district": "Jamtara",
    "facility_name": "Pabiya-PHC",
    "facility_type": "PHC",
    "Lat ": 24.04312,
    "longitude": 86.61615,
    "facility_code": "JHPHCJAM019_GW1"
  },
  {
    "sno": 374,
    "district": "Khunti",
    "facility_name": "Khunti Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 23.07,
    "longitude": 85.28,
    "facility_code": "JHDHKHU001_GW1"
  },
  {
    "sno": 375,
    "district": "Khunti",
    "facility_name": "Arki-CHC",
    "facility_type": "CHC",
    "Lat ": 22.99,
    "longitude": 85.53,
    "facility_code": "JHCHCKHU002_GW1"
  },
  {
    "sno": 376,
    "district": "Khunti",
    "facility_name": "Karra-CHC",
    "facility_type": "CHC",
    "Lat ": 22.89543,
    "longitude": 84.99632,
    "facility_code": "JHCHCKHU003_GW1"
  },
  {
    "sno": 377,
    "district": "Khunti",
    "facility_name": "Khunti Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCKHU004_GW1"
  },
  {
    "sno": 378,
    "district": "Khunti",
    "facility_name": "CHC Murhu-CHC",
    "facility_type": "CHC",
    "Lat ": 22.96,
    "longitude": 85.29,
    "facility_code": "JHCHCKHU005_GW1"
  },
  {
    "sno": 379,
    "district": "Khunti",
    "facility_name": "Rania-CHC",
    "facility_type": "CHC",
    "Lat ": 22.77,
    "longitude": 85.1,
    "facility_code": "JHCHCKHU006_GW1"
  },
  {
    "sno": 380,
    "district": "Khunti",
    "facility_name": "Torpa-CHC",
    "facility_type": "CHC",
    "Lat ": 22.93026,
    "longitude": 85.09331,
    "facility_code": "JHCHCKHU007_GW1"
  },
  {
    "sno": 381,
    "district": "Khunti",
    "facility_name": "Birbanki-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCKHU008_GW1"
  },
  {
    "sno": 382,
    "district": "Khunti",
    "facility_name": "Tubid-PHC",
    "facility_type": "PHC",
    "Lat ": 22.96675,
    "longitude": 85.47378,
    "facility_code": "JHPHCKHU009_GW1"
  },
  {
    "sno": 383,
    "district": "Khunti",
    "facility_name": "Ulihatu-PHC",
    "facility_type": "PHC",
    "Lat ": 22.97685,
    "longitude": 85.49239,
    "facility_code": "JHPHCKHU010_GW1"
  },
  {
    "sno": 384,
    "district": "Khunti",
    "facility_name": "Govindpur-PHC",
    "facility_type": "PHC",
    "Lat ": 23.07262,
    "longitude": 84.99779,
    "facility_code": "JHPHCKHU011_GW1"
  },
  {
    "sno": 385,
    "district": "Khunti",
    "facility_name": "Maranghada-PHC",
    "facility_type": "PHC",
    "Lat ": 23.07689,
    "longitude": 85.40531,
    "facility_code": "JHPHCKHU012_GW1"
  },
  {
    "sno": 386,
    "district": "Khunti",
    "facility_name": "UPHC Harizan Tola-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCKHU013_GW1"
  },
  {
    "sno": 387,
    "district": "Koderma",
    "facility_name": "Koderma Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 24.46808,
    "longitude": 85.59163,
    "facility_code": "JHDHKOD001_GW1"
  },
  {
    "sno": 388,
    "district": "Koderma",
    "facility_name": "Jainagar-CHC",
    "facility_type": "CHC",
    "Lat ": 24.36989,
    "longitude": 85.64606,
    "facility_code": "JHCHCKOD002_GW1"
  },
  {
    "sno": 389,
    "district": "Koderma",
    "facility_name": "Koderma Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCKOD003_GW1"
  },
  {
    "sno": 390,
    "district": "Koderma",
    "facility_name": "Ref. Hospital Domchanch-CHC",
    "facility_type": "CHC",
    "Lat ": 24.47186,
    "longitude": 85.68715,
    "facility_code": "JHCHCKOD004_GW1"
  },
  {
    "sno": 391,
    "district": "Koderma",
    "facility_name": "CHC Markacho-CHC",
    "facility_type": "CHC",
    "Lat ": 24.32623,
    "longitude": 85.83455,
    "facility_code": "JHCHCKOD005_GW1"
  },
  {
    "sno": 392,
    "district": "Koderma",
    "facility_name": "Satgawan-CHC",
    "facility_type": "CHC",
    "Lat ": 24.72091,
    "longitude": 85.7711,
    "facility_code": "JHCHCKOD006_GW1"
  },
  {
    "sno": 393,
    "district": "Koderma",
    "facility_name": "PHC Parsabad-PHC",
    "facility_type": "PHC",
    "Lat ": 24.29663,
    "longitude": 85.73743,
    "facility_code": "JHPHCKOD007_GW1"
  },
  {
    "sno": 394,
    "district": "Koderma",
    "facility_name": "PHC Rupaidih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.35522,
    "longitude": 85.72044,
    "facility_code": "JHPHCKOD008_GW1"
  },
  {
    "sno": 395,
    "district": "Koderma",
    "facility_name": "Telaiya Dam-PHC",
    "facility_type": "PHC",
    "Lat ": 24.35198,
    "longitude": 85.66252,
    "facility_code": "JHPHCKOD009_GW1"
  },
  {
    "sno": 396,
    "district": "Koderma",
    "facility_name": "ESI Dispensary, Jhumritilaiya-PHC",
    "facility_type": "PHC",
    "Lat ": 24.43261,
    "longitude": 85.52178,
    "facility_code": "JHPHCKOD010_GW1"
  },
  {
    "sno": 397,
    "district": "Koderma",
    "facility_name": "PHC Chandwara-PHC",
    "facility_type": "PHC",
    "Lat ": 24.38865,
    "longitude": 85.47623,
    "facility_code": "JHPHCKOD011_GW1"
  },
  {
    "sno": 398,
    "district": "Koderma",
    "facility_name": "PHC Jhumri Telaiya-PHC",
    "facility_type": "PHC",
    "Lat ": 24.4296,
    "longitude": 85.53596,
    "facility_code": "JHPHCKOD012_GW1"
  },
  {
    "sno": 399,
    "district": "Koderma",
    "facility_name": "PHC Pathaldiha-PHC",
    "facility_type": "PHC",
    "Lat ": 24.39924,
    "longitude": 85.63578,
    "facility_code": "JHPHCKOD013_GW1"
  },
  {
    "sno": 400,
    "district": "Koderma",
    "facility_name": "UPHC Gumo-PHC",
    "facility_type": "PHC",
    "Lat ": 24.43,
    "longitude": 85.52,
    "facility_code": "JHPHCKOD014_GW1"
  },
  {
    "sno": 401,
    "district": "Koderma",
    "facility_name": "UPHC Pharinda-PHC",
    "facility_type": "PHC",
    "Lat ": 24.47,
    "longitude": 85.6,
    "facility_code": "JHPHCKOD015_GW1"
  },
  {
    "sno": 402,
    "district": "Koderma",
    "facility_name": "PHC Dardahi-PHC",
    "facility_type": "PHC",
    "Lat ": 24.392,
    "longitude": 85.81771,
    "facility_code": "JHPHCKOD016_GW1"
  },
  {
    "sno": 403,
    "district": "Koderma",
    "facility_name": "PHC Phulwariya-PHC",
    "facility_type": "PHC",
    "Lat ": 24.41914,
    "longitude": 85.65762,
    "facility_code": "JHPHCKOD017_GW1"
  },
  {
    "sno": 404,
    "district": "Koderma",
    "facility_name": "PHC Itai-PHC",
    "facility_type": "PHC",
    "Lat ": 24.72091,
    "longitude": 85.7711,
    "facility_code": "JHPHCKOD018_GW1"
  },
  {
    "sno": 405,
    "district": "Latehar",
    "facility_name": "Latehar Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 23.74,
    "longitude": 84.5,
    "facility_code": "JHDHLAT001_GW1"
  },
  {
    "sno": 406,
    "district": "Latehar",
    "facility_name": "Balumath-CHC",
    "facility_type": "CHC",
    "Lat ": 23.829,
    "longitude": 84.789,
    "facility_code": "JHCHCLAT002_GW1"
  },
  {
    "sno": 407,
    "district": "Latehar",
    "facility_name": "Barwadih-CHC",
    "facility_type": "CHC",
    "Lat ": 23.85,
    "longitude": 84.111,
    "facility_code": "JHCHCLAT003_GW1"
  },
  {
    "sno": 408,
    "district": "Latehar",
    "facility_name": "Chandwa-CHC",
    "facility_type": "CHC",
    "Lat ": 23.676,
    "longitude": 84.74,
    "facility_code": "JHCHCLAT004_GW1"
  },
  {
    "sno": 409,
    "district": "Latehar",
    "facility_name": "Garu-CHC",
    "facility_type": "CHC",
    "Lat ": 23.671,
    "longitude": 84.235,
    "facility_code": "JHCHCLAT005_GW1"
  },
  {
    "sno": 410,
    "district": "Latehar",
    "facility_name": "Latehar Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCLAT006_GW1"
  },
  {
    "sno": 411,
    "district": "Latehar",
    "facility_name": "Mahuadar-CHC",
    "facility_type": "CHC",
    "Lat ": 23.396,
    "longitude": 84.106,
    "facility_code": "JHCHCLAT007_GW1"
  },
  {
    "sno": 412,
    "district": "Latehar",
    "facility_name": "Manika-CHC",
    "facility_type": "CHC",
    "Lat ": 23.896,
    "longitude": 84.3,
    "facility_code": "JHCHCLAT008_GW1"
  },
  {
    "sno": 413,
    "district": "Latehar",
    "facility_name": "HERHANJ-PHC",
    "facility_type": "PHC",
    "Lat ": 23.948,
    "longitude": 84.611,
    "facility_code": "JHPHCLAT009_GW1"
  },
  {
    "sno": 414,
    "district": "Latehar",
    "facility_name": "Chippadohar-PHC",
    "facility_type": "PHC",
    "Lat ": 23.817,
    "longitude": 84.195,
    "facility_code": "JHPHCLAT010_GW1"
  },
  {
    "sno": 415,
    "district": "Latehar",
    "facility_name": "Mandal-PHC",
    "facility_type": "PHC",
    "Lat ": 23.737,
    "longitude": 84.012,
    "facility_code": "JHPHCLAT011_GW1"
  },
  {
    "sno": 416,
    "district": "Latehar",
    "facility_name": "MURUP-PHC",
    "facility_type": "PHC",
    "Lat ": 23.82,
    "longitude": 84.603,
    "facility_code": "JHPHCLAT012_GW1"
  },
  {
    "sno": 417,
    "district": "Latehar",
    "facility_name": "NAWAGARH-PHC",
    "facility_type": "PHC",
    "Lat ": 23.697,
    "longitude": 84.467,
    "facility_code": "JHPHCLAT013_GW1"
  },
  {
    "sno": 418,
    "district": "Latehar",
    "facility_name": "Bardauni-PHC",
    "facility_type": "PHC",
    "Lat ": 23.471,
    "longitude": 84.155,
    "facility_code": "JHPHCLAT014_GW1"
  },
  {
    "sno": 419,
    "district": "Latehar",
    "facility_name": "Netrahat-PHC",
    "facility_type": "PHC",
    "Lat ": 23.48626,
    "longitude": 84.26814,
    "facility_code": "JHPHCLAT015_GW1"
  },
  {
    "sno": 420,
    "district": "Latehar",
    "facility_name": "PALLEHYA-PHC",
    "facility_type": "PHC",
    "Lat ": 23.891,
    "longitude": 84.42,
    "facility_code": "JHPHCLAT016_GW1"
  },
  {
    "sno": 421,
    "district": "Lohardaga",
    "facility_name": "Lohardaga Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 23.44179,
    "longitude": 84.68526,
    "facility_code": "JHDHLOH001_GW1"
  },
  {
    "sno": 422,
    "district": "Lohardaga",
    "facility_name": "Bhandra-CHC",
    "facility_type": "CHC",
    "Lat ": 23.36243,
    "longitude": 84.77725,
    "facility_code": "JHCHCLOH002_GW1"
  },
  {
    "sno": 423,
    "district": "Lohardaga",
    "facility_name": "Kisko-CHC",
    "facility_type": "CHC",
    "Lat ": 23.51434,
    "longitude": 84.66553,
    "facility_code": "JHCHCLOH003_GW1"
  },
  {
    "sno": 424,
    "district": "Lohardaga",
    "facility_name": "Kuru-CHC",
    "facility_type": "CHC",
    "Lat ": 23.54189,
    "longitude": 84.81899,
    "facility_code": "JHCHCLOH004_GW1"
  },
  {
    "sno": 425,
    "district": "Lohardaga",
    "facility_name": "Lohardaga Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCLOH005_GW1"
  },
  {
    "sno": 426,
    "district": "Lohardaga",
    "facility_name": "Senha-CHC",
    "facility_type": "CHC",
    "Lat ": 23.385,
    "longitude": 84.651,
    "facility_code": "JHCHCLOH006_GW1"
  },
  {
    "sno": 427,
    "district": "Lohardaga",
    "facility_name": "Nagjua-PHC",
    "facility_type": "PHC",
    "Lat ": 23.386,
    "longitude": 84.886,
    "facility_code": "JHPHCLOH007_GW1"
  },
  {
    "sno": 428,
    "district": "Lohardaga",
    "facility_name": "PHC PESHRAR-PHC",
    "facility_type": "PHC",
    "Lat ": 23.53438,
    "longitude": 84.62498,
    "facility_code": "JHPHCLOH008_GW1"
  },
  {
    "sno": 429,
    "district": "Lohardaga",
    "facility_name": "Chiri-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCLOH009_GW1"
  },
  {
    "sno": 430,
    "district": "Lohardaga",
    "facility_name": "Kairo-PHC",
    "facility_type": "PHC",
    "Lat ": 23.44871,
    "longitude": 84.82812,
    "facility_code": "JHPHCLOH010_GW1"
  },
  {
    "sno": 431,
    "district": "Lohardaga",
    "facility_name": "Salgi-PHC",
    "facility_type": "PHC",
    "Lat ": 23.5419,
    "longitude": 84.819,
    "facility_code": "JHPHCLOH011_GW1"
  },
  {
    "sno": 432,
    "district": "Lohardaga",
    "facility_name": "Irgaon-PHC",
    "facility_type": "PHC",
    "Lat ": 23.42341,
    "longitude": 84.78116,
    "facility_code": "JHPHCLOH012_GW1"
  },
  {
    "sno": 433,
    "district": "Lohardaga",
    "facility_name": "Rampur-PHC",
    "facility_type": "PHC",
    "Lat ": 23.446,
    "longitude": 84.76,
    "facility_code": "JHPHCLOH013_GW1"
  },
  {
    "sno": 434,
    "district": "Lohardaga",
    "facility_name": "UPHC Hatia Garden-PHC",
    "facility_type": "PHC",
    "Lat ": 23.46079,
    "longitude": 84.72562,
    "facility_code": "JHPHCLOH014_GW1"
  },
  {
    "sno": 435,
    "district": "Lohardaga",
    "facility_name": "Ugra-PHC",
    "facility_type": "PHC",
    "Lat ": 23.39021,
    "longitude": 84.67668,
    "facility_code": "JHPHCLOH015_GW1"
  },
  {
    "sno": 436,
    "district": "Pakur",
    "facility_name": "Pakur Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 24.64,
    "longitude": 87.79,
    "facility_code": "JHDHPAK001_GW1"
  },
  {
    "sno": 437,
    "district": "Pakur",
    "facility_name": "Amrapara-CHC",
    "facility_type": "CHC",
    "Lat ": 24.57659,
    "longitude": 87.53661,
    "facility_code": "JHCHCPAK002_GW1"
  },
  {
    "sno": 438,
    "district": "Pakur",
    "facility_name": "Hiranpur-CHC",
    "facility_type": "CHC",
    "Lat ": 24.7,
    "longitude": 87.7,
    "facility_code": "JHCHCPAK003_GW1"
  },
  {
    "sno": 439,
    "district": "Pakur",
    "facility_name": "Littipara-CHC",
    "facility_type": "CHC",
    "Lat ": 24.69,
    "longitude": 87.61,
    "facility_code": "JHCHCPAK004_GW1"
  },
  {
    "sno": 440,
    "district": "Pakur",
    "facility_name": "Maheshpur-CHC",
    "facility_type": "CHC",
    "Lat ": 24.48,
    "longitude": 87.75,
    "facility_code": "JHCHCPAK005_GW1"
  },
  {
    "sno": 441,
    "district": "Pakur",
    "facility_name": "Pakur Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCPAK006_GW1"
  },
  {
    "sno": 442,
    "district": "Pakur",
    "facility_name": "Pakuria-CHC",
    "facility_type": "CHC",
    "Lat ": 24.33,
    "longitude": 87.64,
    "facility_code": "JHCHCPAK007_GW1"
  },
  {
    "sno": 443,
    "district": "Pakur",
    "facility_name": "Dharampur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.59,
    "longitude": 87.75,
    "facility_code": "JHPHCPAK008_GW1"
  },
  {
    "sno": 444,
    "district": "Pakur",
    "facility_name": "DUMRIYA-PHC",
    "facility_type": "PHC",
    "Lat ": 24.51,
    "longitude": 87.6,
    "facility_code": "JHPHCPAK009_GW1"
  },
  {
    "sno": 445,
    "district": "Pakur",
    "facility_name": "KAIRACHHATAR-PHC",
    "facility_type": "PHC",
    "Lat ": 24.63,
    "longitude": 87.84,
    "facility_code": "JHPHCPAK010_GW1"
  },
  {
    "sno": 446,
    "district": "Pakur",
    "facility_name": "Sahargram-PHC",
    "facility_type": "PHC",
    "Lat ": 24.63,
    "longitude": 87.84,
    "facility_code": "JHPHCPAK011_GW1"
  },
  {
    "sno": 447,
    "district": "Pakur",
    "facility_name": "Barhabad-PHC",
    "facility_type": "PHC",
    "Lat ": 24.61,
    "longitude": 87.78,
    "facility_code": "JHPHCPAK012_GW1"
  },
  {
    "sno": 448,
    "district": "Pakur",
    "facility_name": "BELDANGA-PHC",
    "facility_type": "PHC",
    "Lat ": 24.62,
    "longitude": 87.85,
    "facility_code": "JHPHCPAK013_GW1"
  },
  {
    "sno": 449,
    "district": "Pakur",
    "facility_name": "Jhikarhatti-PHC",
    "facility_type": "PHC",
    "Lat ": 24.59,
    "longitude": 87.89,
    "facility_code": "JHPHCPAK014_GW1"
  },
  {
    "sno": 450,
    "district": "Pakur",
    "facility_name": "UPHC Pakur Sadar-PHC",
    "facility_type": "PHC",
    "Lat ": 24.63,
    "longitude": 87.83,
    "facility_code": "JHPHCPAK015_GW1"
  },
  {
    "sno": 451,
    "district": "Pakur",
    "facility_name": "Salgapara-PHC",
    "facility_type": "PHC",
    "Lat ": 24.37,
    "longitude": 87.59,
    "facility_code": "JHPHCPAK016_GW1"
  },
  {
    "sno": 452,
    "district": "Palamu",
    "facility_name": "Medni Rai Medical College Hospital-MC",
    "facility_type": "MC",
    "Lat ": 24.02,
    "longitude": 84.04,
    "facility_code": "JHMEDPAL001_GW1"
  },
  {
    "sno": 453,
    "district": "Palamu",
    "facility_name": "Chhatarpur-SDH",
    "facility_type": "SDH",
    "Lat ": 24.37249,
    "longitude": 84.19228,
    "facility_code": "JHSDHPAL002_GW1"
  },
  {
    "sno": 454,
    "district": "Palamu",
    "facility_name": "Husainabad-SDH",
    "facility_type": "SDH",
    "Lat ": 24.31,
    "longitude": 84.0,
    "facility_code": "JHSDHPAL003_GW1"
  },
  {
    "sno": 455,
    "district": "Palamu",
    "facility_name": "Bishrampur-CHC",
    "facility_type": "CHC",
    "Lat ": 24.26325,
    "longitude": 83.92438,
    "facility_code": "JHCHCPAL004_GW1"
  },
  {
    "sno": 456,
    "district": "Palamu",
    "facility_name": "Chainpur-CHC",
    "facility_type": "CHC",
    "Lat ": 23.97982,
    "longitude": 83.99379,
    "facility_code": "JHCHCPAL005_GW1"
  },
  {
    "sno": 457,
    "district": "Palamu",
    "facility_name": "Hariharganj-CHC",
    "facility_type": "CHC",
    "Lat ": 24.54209,
    "longitude": 84.27852,
    "facility_code": "JHCHCPAL006_GW1"
  },
  {
    "sno": 458,
    "district": "Palamu",
    "facility_name": "Manatu-CHC",
    "facility_type": "CHC",
    "Lat ": 24.13234,
    "longitude": 84.23956,
    "facility_code": "JHCHCPAL007_GW1"
  },
  {
    "sno": 459,
    "district": "Palamu",
    "facility_name": "Daltonganj Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCPAL008_GW1"
  },
  {
    "sno": 460,
    "district": "Palamu",
    "facility_name": "Lesliganj-CHC",
    "facility_type": "CHC",
    "Lat ": 24.02509,
    "longitude": 84.209,
    "facility_code": "JHCHCPAL009_GW1"
  },
  {
    "sno": 461,
    "district": "Palamu",
    "facility_name": "Panki-CHC",
    "facility_type": "CHC",
    "Lat ": 24.03569,
    "longitude": 84.47765,
    "facility_code": "JHCHCPAL010_GW1"
  },
  {
    "sno": 462,
    "district": "Palamu",
    "facility_name": "Patan-CHC",
    "facility_type": "CHC",
    "Lat ": 24.20212,
    "longitude": 84.17784,
    "facility_code": "JHCHCPAL011_GW1"
  },
  {
    "sno": 463,
    "district": "Palamu",
    "facility_name": "Pandu-PHC",
    "facility_type": "PHC",
    "Lat ": 24.02,
    "longitude": 84.04,
    "facility_code": "JHPHCPAL012_GW1"
  },
  {
    "sno": 464,
    "district": "Palamu",
    "facility_name": "UPHC Dandila Khurd-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCPAL013_GW1"
  },
  {
    "sno": 465,
    "district": "Palamu",
    "facility_name": "Huntar-PHC",
    "facility_type": "PHC",
    "Lat ": 23.97982,
    "longitude": 83.99379,
    "facility_code": "JHPHCPAL014_GW1"
  },
  {
    "sno": 466,
    "district": "Palamu",
    "facility_name": "Pathra-PHC",
    "facility_type": "PHC",
    "Lat ": 23.97982,
    "longitude": 83.99379,
    "facility_code": "JHPHCPAL015_GW1"
  },
  {
    "sno": 467,
    "district": "Palamu",
    "facility_name": "Ramgarh-PHC",
    "facility_type": "PHC",
    "Lat ": 23.88639,
    "longitude": 83.95509,
    "facility_code": "JHPHCPAL016_GW1"
  },
  {
    "sno": 468,
    "district": "Palamu",
    "facility_name": "Naudiha Bazar-PHC",
    "facility_type": "PHC",
    "Lat ": 24.37705,
    "longitude": 84.1449,
    "facility_code": "JHPHCPAL017_GW1"
  },
  {
    "sno": 469,
    "district": "Palamu",
    "facility_name": "Saraidih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.31392,
    "longitude": 84.3095,
    "facility_code": "JHPHCPAL018_GW1"
  },
  {
    "sno": 470,
    "district": "Palamu",
    "facility_name": "Telari-PHC",
    "facility_type": "PHC",
    "Lat ": 24.31774,
    "longitude": 84.09865,
    "facility_code": "JHPHCPAL019_GW1"
  },
  {
    "sno": 471,
    "district": "Palamu",
    "facility_name": "Babhandi-PHC",
    "facility_type": "PHC",
    "Lat ": 24.02,
    "longitude": 84.04,
    "facility_code": "JHPHCPAL020_GW1"
  },
  {
    "sno": 472,
    "district": "Palamu",
    "facility_name": "Audhara-PHC",
    "facility_type": "PHC",
    "Lat ": 24.50195,
    "longitude": 84.02118,
    "facility_code": "JHPHCPAL021_GW1"
  },
  {
    "sno": 473,
    "district": "Palamu",
    "facility_name": "Begampura-PHC",
    "facility_type": "PHC",
    "Lat ": 24.33,
    "longitude": 84.03,
    "facility_code": "JHPHCPAL022_GW1"
  },
  {
    "sno": 474,
    "district": "Palamu",
    "facility_name": "Bulandbigha-PHC",
    "facility_type": "PHC",
    "Lat ": 24.32,
    "longitude": 84.02,
    "facility_code": "JHPHCPAL023_GW1"
  },
  {
    "sno": 475,
    "district": "Palamu",
    "facility_name": "Haidernagar-PHC",
    "facility_type": "PHC",
    "Lat ": 24.50195,
    "longitude": 84.02118,
    "facility_code": "JHPHCPAL024_GW1"
  },
  {
    "sno": 476,
    "district": "Palamu",
    "facility_name": "Majuraha-PHC",
    "facility_type": "PHC",
    "Lat ": 24.29,
    "longitude": 84.03,
    "facility_code": "JHPHCPAL025_GW1"
  },
  {
    "sno": 477,
    "district": "Palamu",
    "facility_name": "UPHC Hussainabad-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCPAL026_GW1"
  },
  {
    "sno": 478,
    "district": "Palamu",
    "facility_name": "Tarhansi-PHC",
    "facility_type": "PHC",
    "Lat ": 24.05054,
    "longitude": 84.183,
    "facility_code": "JHPHCPAL027_GW1"
  },
  {
    "sno": 479,
    "district": "Palamu",
    "facility_name": "Jamune-PHC",
    "facility_type": "PHC",
    "Lat ": 24.02,
    "longitude": 84.04,
    "facility_code": "JHPHCPAL028_GW1"
  },
  {
    "sno": 480,
    "district": "Palamu",
    "facility_name": "UPHC Chainpur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.03336,
    "longitude": 84.07393,
    "facility_code": "JHPHCPAL029_GW1"
  },
  {
    "sno": 481,
    "district": "Palamu",
    "facility_name": "UPHC Nai Mohalla-PHC",
    "facility_type": "PHC",
    "Lat ": 24.03,
    "longitude": 84.07,
    "facility_code": "JHPHCPAL030_GW1"
  },
  {
    "sno": 482,
    "district": "Palamu",
    "facility_name": "UPHC Nimia-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCPAL031_GW1"
  },
  {
    "sno": 483,
    "district": "Palamu",
    "facility_name": "Bansdih-PHC",
    "facility_type": "PHC",
    "Lat ": 24.0226,
    "longitude": 84.16438,
    "facility_code": "JHPHCPAL032_GW1"
  },
  {
    "sno": 484,
    "district": "Palamu",
    "facility_name": "Gentha-PHC",
    "facility_type": "PHC",
    "Lat ": 24.01448,
    "longitude": 84.16215,
    "facility_code": "JHPHCPAL033_GW1"
  },
  {
    "sno": 485,
    "district": "Palamu",
    "facility_name": "Goradih khash-PHC",
    "facility_type": "PHC",
    "Lat ": 24.0343,
    "longitude": 84.13576,
    "facility_code": "JHPHCPAL034_GW1"
  },
  {
    "sno": 486,
    "district": "Palamu",
    "facility_name": "Konwai-PHC",
    "facility_type": "PHC",
    "Lat ": 24.02,
    "longitude": 84.04,
    "facility_code": "JHPHCPAL035_GW1"
  },
  {
    "sno": 487,
    "district": "Palamu",
    "facility_name": "Loharshi-PHC",
    "facility_type": "PHC",
    "Lat ": 24.02,
    "longitude": 84.04,
    "facility_code": "JHPHCPAL036_GW1"
  },
  {
    "sno": 488,
    "district": "Palamu",
    "facility_name": "Kishanpur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.02,
    "longitude": 84.04,
    "facility_code": "JHPHCPAL037_GW1"
  },
  {
    "sno": 489,
    "district": "Palamu",
    "facility_name": "Nawajaipur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.02,
    "longitude": 84.04,
    "facility_code": "JHPHCPAL038_GW1"
  },
  {
    "sno": 490,
    "district": "Ramgarh",
    "facility_name": "Ramgarh Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 23.62,
    "longitude": 85.52,
    "facility_code": "JHDHRAM001_GW1"
  },
  {
    "sno": 491,
    "district": "Ramgarh",
    "facility_name": "Gola-CHC",
    "facility_type": "CHC",
    "Lat ": 23.52548,
    "longitude": 85.71766,
    "facility_code": "JHCHCRAM002_GW1"
  },
  {
    "sno": 492,
    "district": "Ramgarh",
    "facility_name": "Mandu-CHC",
    "facility_type": "CHC",
    "Lat ": 23.79372,
    "longitude": 85.48383,
    "facility_code": "JHCHCRAM003_GW1"
  },
  {
    "sno": 493,
    "district": "Ramgarh",
    "facility_name": "Ref. Hospital Bharech Nagar-CHC",
    "facility_type": "CHC",
    "Lat ": 23.68923,
    "longitude": 85.51137,
    "facility_code": "JHCHCRAM004_GW1"
  },
  {
    "sno": 494,
    "district": "Ramgarh",
    "facility_name": "Patratu-CHC",
    "facility_type": "CHC",
    "Lat ": 23.63493,
    "longitude": 85.30331,
    "facility_code": "JHCHCRAM005_GW1"
  },
  {
    "sno": 495,
    "district": "Ramgarh",
    "facility_name": "Military Hospital-CHC",
    "facility_type": "CHC",
    "Lat ": 23.63615,
    "longitude": 85.50728,
    "facility_code": "JHCHCRAM006_GW1"
  },
  {
    "sno": 496,
    "district": "Ramgarh",
    "facility_name": "Ramgarh Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCRAM007_GW1"
  },
  {
    "sno": 497,
    "district": "Ramgarh",
    "facility_name": "Bariyatu-PHC",
    "facility_type": "PHC",
    "Lat ": 23.5122,
    "longitude": 85.68904,
    "facility_code": "JHPHCRAM008_GW1"
  },
  {
    "sno": 498,
    "district": "Ramgarh",
    "facility_name": "Barlanga-PHC",
    "facility_type": "PHC",
    "Lat ": 23.44253,
    "longitude": 85.85196,
    "facility_code": "JHPHCRAM009_GW1"
  },
  {
    "sno": 499,
    "district": "Ramgarh",
    "facility_name": "PHC Murpa-PHC",
    "facility_type": "PHC",
    "Lat ": 23.734719,
    "longitude": 85.514712,
    "facility_code": "JHPHCRAM010_GW1"
  },
  {
    "sno": 500,
    "district": "Ramgarh",
    "facility_name": "Chaingada-PHC",
    "facility_type": "PHC",
    "Lat ": 23.63022,
    "longitude": 85.41176,
    "facility_code": "JHPHCRAM011_GW1"
  },
  {
    "sno": 501,
    "district": "Ramgarh",
    "facility_name": "PHC Barkakana-PHC",
    "facility_type": "PHC",
    "Lat ": 23.615408,
    "longitude": 85.464497,
    "facility_code": "JHPHCRAM012_GW1"
  },
  {
    "sno": 502,
    "district": "Ramgarh",
    "facility_name": "Chittarpur-PHC",
    "facility_type": "PHC",
    "Lat ": 23.57473,
    "longitude": 85.65119,
    "facility_code": "JHPHCRAM013_GW1"
  },
  {
    "sno": 503,
    "district": "Ramgarh",
    "facility_name": "ESI Dispensary, Ramgarh-PHC",
    "facility_type": "PHC",
    "Lat ": 23.63763,
    "longitude": 85.51171,
    "facility_code": "JHPHCRAM014_GW1"
  },
  {
    "sno": 504,
    "district": "Ramgarh",
    "facility_name": "Ganrke-PHC",
    "facility_type": "PHC",
    "Lat ": 23.56844,
    "longitude": 85.5425,
    "facility_code": "JHPHCRAM015_GW1"
  },
  {
    "sno": 505,
    "district": "Ramgarh",
    "facility_name": "PHC Bhuchungdih-PHC",
    "facility_type": "PHC",
    "Lat ": 23.6115,
    "longitude": 85.6923,
    "facility_code": "JHPHCRAM016_GW1"
  },
  {
    "sno": 506,
    "district": "Ramgarh",
    "facility_name": "UPHC Bazar Tand-PHC",
    "facility_type": "PHC",
    "Lat ": 23.63458,
    "longitude": 85.51382,
    "facility_code": "JHPHCRAM017_GW1"
  },
  {
    "sno": 507,
    "district": "Ramgarh",
    "facility_name": "UPHC Golpar-PHC",
    "facility_type": "PHC",
    "Lat ": 23.6347,
    "longitude": 85.51475,
    "facility_code": "JHPHCRAM018_GW1"
  },
  {
    "sno": 508,
    "district": "Ramgarh",
    "facility_name": "UPHC Patratu Basti-PHC",
    "facility_type": "PHC",
    "Lat ": 23.63322,
    "longitude": 85.51487,
    "facility_code": "JHPHCRAM019_GW1"
  },
  {
    "sno": 509,
    "district": "Ranchi",
    "facility_name": "RIMS Ranchi-MC",
    "facility_type": "MC",
    "Lat ": 23.39022,
    "longitude": 85.34745,
    "facility_code": "JHMEDRAN001_GW1"
  },
  {
    "sno": 510,
    "district": "Ranchi",
    "facility_name": "NHM Ranchi-NHM",
    "facility_type": "NHM",
    "Lat ": 23.3466,
    "longitude": 85.3704,
    "facility_code": "JHNHMRAN002_GW1"
  },
  {
    "sno": 511,
    "district": "Ranchi",
    "facility_name": "Ranchi Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 23.36,
    "longitude": 85.32,
    "facility_code": "JHDHRAN003_GW1"
  },
  {
    "sno": 512,
    "district": "Ranchi",
    "facility_name": "Bundu-SDH",
    "facility_type": "SDH",
    "Lat ": 23.16294,
    "longitude": 85.59643,
    "facility_code": "JHSDHRAN004_GW1"
  },
  {
    "sno": 513,
    "district": "Ranchi",
    "facility_name": "ESIC Model Hospital Namkum-SDH",
    "facility_type": "SDH",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHSDHRAN005_GW1"
  },
  {
    "sno": 514,
    "district": "Ranchi",
    "facility_name": "Angara-CHC",
    "facility_type": "CHC",
    "Lat ": 23.40306,
    "longitude": 85.48813,
    "facility_code": "JHCHCRAN006_GW1"
  },
  {
    "sno": 515,
    "district": "Ranchi",
    "facility_name": "Bero-CHC",
    "facility_type": "CHC",
    "Lat ": 23.30334,
    "longitude": 85.01428,
    "facility_code": "JHCHCRAN007_GW1"
  },
  {
    "sno": 516,
    "district": "Ranchi",
    "facility_name": "Burmo-CHC",
    "facility_type": "CHC",
    "Lat ": 23.56984,
    "longitude": 85.13329,
    "facility_code": "JHCHCRAN008_GW1"
  },
  {
    "sno": 517,
    "district": "Ranchi",
    "facility_name": "Chano-CHC",
    "facility_type": "CHC",
    "Lat ": 23.50568,
    "longitude": 84.97928,
    "facility_code": "JHCHCRAN009_GW1"
  },
  {
    "sno": 518,
    "district": "Ranchi",
    "facility_name": "Kanke-CHC",
    "facility_type": "CHC",
    "Lat ": 23.43,
    "longitude": 85.31,
    "facility_code": "JHCHCRAN010_GW1"
  },
  {
    "sno": 519,
    "district": "Ranchi",
    "facility_name": "UCHC Rajkiya Aushadhalaya Doranda-CHC",
    "facility_type": "CHC",
    "Lat ": 23.33734,
    "longitude": 85.31829,
    "facility_code": "JHCHCRAN011_GW1"
  },
  {
    "sno": 520,
    "district": "Ranchi",
    "facility_name": "UCHC Reshaldar Nagar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCRAN012_GW1"
  },
  {
    "sno": 521,
    "district": "Ranchi",
    "facility_name": "Lapung-CHC",
    "facility_type": "CHC",
    "Lat ": 23.32604,
    "longitude": 84.91497,
    "facility_code": "JHCHCRAN013_GW1"
  },
  {
    "sno": 522,
    "district": "Ranchi",
    "facility_name": "Mandar-CHC",
    "facility_type": "CHC",
    "Lat ": 23.46306,
    "longitude": 85.09003,
    "facility_code": "JHCHCRAN014_GW1"
  },
  {
    "sno": 523,
    "district": "Ranchi",
    "facility_name": "Namkom-CHC",
    "facility_type": "CHC",
    "Lat ": 21.33032,
    "longitude": 80.18234,
    "facility_code": "JHCHCRAN015_GW1"
  },
  {
    "sno": 524,
    "district": "Ranchi",
    "facility_name": "Ormanjhi-CHC",
    "facility_type": "CHC",
    "Lat ": 23.53241,
    "longitude": 85.49911,
    "facility_code": "JHCHCRAN016_GW1"
  },
  {
    "sno": 525,
    "district": "Ranchi",
    "facility_name": "Ratu-CHC",
    "facility_type": "CHC",
    "Lat ": 23.41719,
    "longitude": 85.22962,
    "facility_code": "JHCHCRAN017_GW1"
  },
  {
    "sno": 526,
    "district": "Ranchi",
    "facility_name": "Silli-CHC",
    "facility_type": "CHC",
    "Lat ": 23.36007,
    "longitude": 85.84182,
    "facility_code": "JHCHCRAN018_GW1"
  },
  {
    "sno": 527,
    "district": "Ranchi",
    "facility_name": "Sonahatu-CHC",
    "facility_type": "CHC",
    "Lat ": 23.1833,
    "longitude": 85.70708,
    "facility_code": "JHCHCRAN019_GW1"
  },
  {
    "sno": 528,
    "district": "Ranchi",
    "facility_name": "Tamar-CHC",
    "facility_type": "CHC",
    "Lat ": 23.04668,
    "longitude": 85.64992,
    "facility_code": "JHCHCRAN020_GW1"
  },
  {
    "sno": 529,
    "district": "Ranchi",
    "facility_name": "HWC Getalsudh-PHC",
    "facility_type": "PHC",
    "Lat ": 23.40109,
    "longitude": 85.51125,
    "facility_code": "JHPHCRAN021_GW1"
  },
  {
    "sno": 530,
    "district": "Ranchi",
    "facility_name": "Jonha-PHC",
    "facility_type": "PHC",
    "Lat ": 23.36973,
    "longitude": 85.63364,
    "facility_code": "JHPHCRAN022_GW1"
  },
  {
    "sno": 531,
    "district": "Ranchi",
    "facility_name": "Itki-PHC",
    "facility_type": "PHC",
    "Lat ": 23.33943,
    "longitude": 85.11629,
    "facility_code": "JHPHCRAN023_GW1"
  },
  {
    "sno": 532,
    "district": "Ranchi",
    "facility_name": "Narkopi-PHC",
    "facility_type": "PHC",
    "Lat ": 23.38083,
    "longitude": 84.96712,
    "facility_code": "JHPHCRAN024_GW1"
  },
  {
    "sno": 533,
    "district": "Ranchi",
    "facility_name": "Tuko-PHC",
    "facility_type": "PHC",
    "Lat ": 23.31512,
    "longitude": 84.94922,
    "facility_code": "JHPHCRAN025_GW1"
  },
  {
    "sno": 534,
    "district": "Ranchi",
    "facility_name": "Taimara-PHC",
    "facility_type": "PHC",
    "Lat ": 23.19474,
    "longitude": 85.4911,
    "facility_code": "JHPHCRAN026_GW1"
  },
  {
    "sno": 535,
    "district": "Ranchi",
    "facility_name": "MacluskiGanj-PHC",
    "facility_type": "PHC",
    "Lat ": 23.65628,
    "longitude": 84.95212,
    "facility_code": "JHPHCRAN027_GW1"
  },
  {
    "sno": 536,
    "district": "Ranchi",
    "facility_name": "Thakurgaon-PHC",
    "facility_type": "PHC",
    "Lat ": 23.34,
    "longitude": 85.3,
    "facility_code": "JHPHCRAN028_GW1"
  },
  {
    "sno": 537,
    "district": "Ranchi",
    "facility_name": "Byasi-PHC",
    "facility_type": "PHC",
    "Lat ": 23.41373,
    "longitude": 84.9112,
    "facility_code": "JHPHCRAN029_GW1"
  },
  {
    "sno": 538,
    "district": "Ranchi",
    "facility_name": "DJD Ranchi-PHC",
    "facility_type": "PHC",
    "Lat ": 23.34021,
    "longitude": 85.31937,
    "facility_code": "JHPHCRAN030_GW1"
  },
  {
    "sno": 539,
    "district": "Ranchi",
    "facility_name": "ESI Dispensary, Kokar-PHC",
    "facility_type": "PHC",
    "Lat ": 23.36715,
    "longitude": 85.35044,
    "facility_code": "JHPHCRAN031_GW1"
  },
  {
    "sno": 540,
    "district": "Ranchi",
    "facility_name": "HWC Pithoriya-PHC",
    "facility_type": "PHC",
    "Lat ": 23.23,
    "longitude": 85.54,
    "facility_code": "JHPHCRAN032_GW1"
  },
  {
    "sno": 541,
    "district": "Ranchi",
    "facility_name": "UPHC Adelhatu-PHC",
    "facility_type": "PHC",
    "Lat ": 23.43454,
    "longitude": 85.32138,
    "facility_code": "JHPHCRAN033_GW1"
  },
  {
    "sno": 542,
    "district": "Ranchi",
    "facility_name": "UPHC Hatia-PHC",
    "facility_type": "PHC",
    "Lat ": 23.28558,
    "longitude": 85.30586,
    "facility_code": "JHPHCRAN034_GW1"
  },
  {
    "sno": 543,
    "district": "Ranchi",
    "facility_name": "UPHC Hindpiri-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCRAN035_GW1"
  },
  {
    "sno": 544,
    "district": "Ranchi",
    "facility_name": "UPHC Jagarnathpur-PHC",
    "facility_type": "PHC",
    "Lat ": 23.33,
    "longitude": 85.24,
    "facility_code": "JHPHCRAN036_GW1"
  },
  {
    "sno": 545,
    "district": "Ranchi",
    "facility_name": "UPHC Kantatoli-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCRAN037_GW1"
  },
  {
    "sno": 546,
    "district": "Ranchi",
    "facility_name": "UPHC Krishna Nagar-PHC",
    "facility_type": "PHC",
    "Lat ": 23.34,
    "longitude": 85.3,
    "facility_code": "JHPHCRAN038_GW1"
  },
  {
    "sno": 547,
    "district": "Ranchi",
    "facility_name": "UPHC Lem Bargai-PHC",
    "facility_type": "PHC",
    "Lat ": 23.43454,
    "longitude": 85.32138,
    "facility_code": "JHPHCRAN039_GW1"
  },
  {
    "sno": 548,
    "district": "Ranchi",
    "facility_name": "UPHC Madhukam-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCRAN040_GW1"
  },
  {
    "sno": 549,
    "district": "Ranchi",
    "facility_name": "UPHC Pandra-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCRAN041_GW1"
  },
  {
    "sno": 550,
    "district": "Ranchi",
    "facility_name": "UPHC Tupudana-PHC",
    "facility_type": "PHC",
    "Lat ": 23.26,
    "longitude": 85.3,
    "facility_code": "JHPHCRAN042_GW1"
  },
  {
    "sno": 551,
    "district": "Ranchi",
    "facility_name": "Kokariya-PHC",
    "facility_type": "PHC",
    "Lat ": 23.16265,
    "longitude": 85.02736,
    "facility_code": "JHPHCRAN043_GW1"
  },
  {
    "sno": 552,
    "district": "Ranchi",
    "facility_name": "Tangarbasli-PHC",
    "facility_type": "PHC",
    "Lat ": 23.37515,
    "longitude": 85.05982,
    "facility_code": "JHPHCRAN044_GW1"
  },
  {
    "sno": 553,
    "district": "Ranchi",
    "facility_name": "Dundiharh-PHC",
    "facility_type": "PHC",
    "Lat ": 23.28586,
    "longitude": 85.31142,
    "facility_code": "JHPHCRAN045_GW1"
  },
  {
    "sno": 554,
    "district": "Ranchi",
    "facility_name": "ESI Dispensary, Dhurva-PHC",
    "facility_type": "PHC",
    "Lat ": 23.335618,
    "longitude": 85.313177,
    "facility_code": "JHPHCRAN046_GW1"
  },
  {
    "sno": 555,
    "district": "Ranchi",
    "facility_name": "ESI Dispensary, Tatisilwai-PHC",
    "facility_type": "PHC",
    "Lat ": 23.37823,
    "longitude": 85.42902,
    "facility_code": "JHPHCRAN047_GW1"
  },
  {
    "sno": 556,
    "district": "Ranchi",
    "facility_name": "ESI Dispensary, Tupudana-PHC",
    "facility_type": "PHC",
    "Lat ": 23.29896,
    "longitude": 85.32173,
    "facility_code": "JHPHCRAN048_GW1"
  },
  {
    "sno": 557,
    "district": "Ranchi",
    "facility_name": "UPHC Chutia-PHC",
    "facility_type": "PHC",
    "Lat ": 23.34,
    "longitude": 85.3,
    "facility_code": "JHPHCRAN049_GW1"
  },
  {
    "sno": 558,
    "district": "Ranchi",
    "facility_name": "ESI Dispensary, Ormanjhi-PHC",
    "facility_type": "PHC",
    "Lat ": 23.48393,
    "longitude": 85.47849,
    "facility_code": "JHPHCRAN050_GW1"
  },
  {
    "sno": 559,
    "district": "Ranchi",
    "facility_name": "Kuchu-PHC",
    "facility_type": "PHC",
    "Lat ": 23.48671,
    "longitude": 85.39708,
    "facility_code": "JHPHCRAN051_GW1"
  },
  {
    "sno": 560,
    "district": "Ranchi",
    "facility_name": "Siladri-PHC",
    "facility_type": "PHC",
    "Lat ": 23.47668,
    "longitude": 85.45653,
    "facility_code": "JHPHCRAN052_GW1"
  },
  {
    "sno": 561,
    "district": "Ranchi",
    "facility_name": "GURUBAZPUR-PHC",
    "facility_type": "PHC",
    "Lat ": 23.36758,
    "longitude": 85.17779,
    "facility_code": "JHPHCRAN053_GW1"
  },
  {
    "sno": 562,
    "district": "Ranchi",
    "facility_name": "NAGRI-PHC",
    "facility_type": "PHC",
    "Lat ": 23.32353,
    "longitude": 85.18556,
    "facility_code": "JHPHCRAN054_GW1"
  },
  {
    "sno": 563,
    "district": "Ranchi",
    "facility_name": "UPHC Hesal-PHC",
    "facility_type": "PHC",
    "Lat ": 23.41898,
    "longitude": 85.22092,
    "facility_code": "JHPHCRAN055_GW1"
  },
  {
    "sno": 564,
    "district": "Ranchi",
    "facility_name": "Patratu-PHC",
    "facility_type": "PHC",
    "Lat ": 23.35373,
    "longitude": 85.82144,
    "facility_code": "JHPHCRAN056_GW1"
  },
  {
    "sno": 565,
    "district": "Ranchi",
    "facility_name": "Rangamatti-PHC",
    "facility_type": "PHC",
    "Lat ": 23.29802,
    "longitude": 85.71365,
    "facility_code": "JHPHCRAN057_GW1"
  },
  {
    "sno": 566,
    "district": "Ranchi",
    "facility_name": "Pandidih-PHC",
    "facility_type": "PHC",
    "Lat ": 23.17163,
    "longitude": 85.8264,
    "facility_code": "JHPHCRAN058_GW1"
  },
  {
    "sno": 567,
    "district": "Ranchi",
    "facility_name": "RAHE-PHC",
    "facility_type": "PHC",
    "Lat ": 23.26309,
    "longitude": 85.64508,
    "facility_code": "JHPHCRAN059_GW1"
  },
  {
    "sno": 568,
    "district": "Ranchi",
    "facility_name": "Duria-PHC",
    "facility_type": "PHC",
    "Lat ": 23.06438,
    "longitude": 85.65885,
    "facility_code": "JHPHCRAN060_GW1"
  },
  {
    "sno": 569,
    "district": "Ranchi",
    "facility_name": "SARJAMDIH-PHC",
    "facility_type": "PHC",
    "Lat ": 23.07,
    "longitude": 85.72,
    "facility_code": "JHPHCRAN061_GW1"
  },
  {
    "sno": 570,
    "district": "Ranchi",
    "facility_name": "ULILOHRA-PHC",
    "facility_type": "PHC",
    "Lat ": 23.35151,
    "longitude": 85.36674,
    "facility_code": "JHPHCRAN062_GW1"
  },
  {
    "sno": 571,
    "district": "Sahebganj",
    "facility_name": "Sahibganj Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 25.23583,
    "longitude": 87.63422,
    "facility_code": "JHDHSAH001_GW1"
  },
  {
    "sno": 572,
    "district": "Sahebganj",
    "facility_name": "Rajmahal-SDH",
    "facility_type": "SDH",
    "Lat ": 25.05,
    "longitude": 87.82,
    "facility_code": "JHSDHSAH002_GW1"
  },
  {
    "sno": 573,
    "district": "Sahebganj",
    "facility_name": "Barhait-CHC",
    "facility_type": "CHC",
    "Lat ": 24.88,
    "longitude": 87.6,
    "facility_code": "JHCHCSAH003_GW1"
  },
  {
    "sno": 574,
    "district": "Sahebganj",
    "facility_name": "Barharwa-CHC",
    "facility_type": "CHC",
    "Lat ": 24.85,
    "longitude": 87.77,
    "facility_code": "JHCHCSAH004_GW1"
  },
  {
    "sno": 575,
    "district": "Sahebganj",
    "facility_name": "Borio-CHC",
    "facility_type": "CHC",
    "Lat ": 25.03,
    "longitude": 87.59,
    "facility_code": "JHCHCSAH005_GW1"
  },
  {
    "sno": 576,
    "district": "Sahebganj",
    "facility_name": "CHC Pathna-CHC",
    "facility_type": "CHC",
    "Lat ": 24.98,
    "longitude": 87.61,
    "facility_code": "JHCHCSAH006_GW1"
  },
  {
    "sno": 577,
    "district": "Sahebganj",
    "facility_name": "Sahibganj Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 25.23812,
    "longitude": 87.64536,
    "facility_code": "JHCHCSAH007_GW1"
  },
  {
    "sno": 578,
    "district": "Sahebganj",
    "facility_name": "Taljhari-CHC",
    "facility_type": "CHC",
    "Lat ": 25.1,
    "longitude": 87.73,
    "facility_code": "JHCHCSAH008_GW1"
  },
  {
    "sno": 579,
    "district": "Sahebganj",
    "facility_name": "Borbandh-PHC",
    "facility_type": "PHC",
    "Lat ": 24.98,
    "longitude": 87.61,
    "facility_code": "JHPHCSAH009_GW1"
  },
  {
    "sno": 580,
    "district": "Sahebganj",
    "facility_name": "Phulbanga-PHC",
    "facility_type": "PHC",
    "Lat ": 24.98,
    "longitude": 87.62,
    "facility_code": "JHPHCSAH010_GW1"
  },
  {
    "sno": 581,
    "district": "Sahebganj",
    "facility_name": "Gowalkohr-PHC",
    "facility_type": "PHC",
    "Lat ": 24.98,
    "longitude": 87.61,
    "facility_code": "JHPHCSAH011_GW1"
  },
  {
    "sno": 582,
    "district": "Sahebganj",
    "facility_name": "Kotalpokhar-PHC",
    "facility_type": "PHC",
    "Lat ": 24.80978,
    "longitude": 87.81421,
    "facility_code": "JHPHCSAH012_GW1"
  },
  {
    "sno": 583,
    "district": "Sahebganj",
    "facility_name": "Banjhi-PHC",
    "facility_type": "PHC",
    "Lat ": 25.03,
    "longitude": 87.59,
    "facility_code": "JHPHCSAH013_GW1"
  },
  {
    "sno": 584,
    "district": "Sahebganj",
    "facility_name": "Mandro-PHC",
    "facility_type": "PHC",
    "Lat ": 25.14,
    "longitude": 87.51,
    "facility_code": "JHPHCSAH014_GW1"
  },
  {
    "sno": 585,
    "district": "Sahebganj",
    "facility_name": "MIRJACHOWKI-PHC",
    "facility_type": "PHC",
    "Lat ": 25.25,
    "longitude": 87.5,
    "facility_code": "JHPHCSAH015_GW1"
  },
  {
    "sno": 586,
    "district": "Sahebganj",
    "facility_name": "Fudikipur-PHC",
    "facility_type": "PHC",
    "Lat ": 24.98,
    "longitude": 87.61,
    "facility_code": "JHPHCSAH016_GW1"
  },
  {
    "sno": 587,
    "district": "Sahebganj",
    "facility_name": "TINPAHAR-PHC",
    "facility_type": "PHC",
    "Lat ": 24.99,
    "longitude": 87.74,
    "facility_code": "JHPHCSAH017_GW1"
  },
  {
    "sno": 588,
    "district": "Sahebganj",
    "facility_name": "Udhwa-PHC",
    "facility_type": "PHC",
    "Lat ": 25.19,
    "longitude": 87.61,
    "facility_code": "JHPHCSAH018_GW1"
  },
  {
    "sno": 589,
    "district": "Sahebganj",
    "facility_name": "UPHC Matiyal-PHC",
    "facility_type": "PHC",
    "Lat ": 25.051,
    "longitude": 87.822,
    "facility_code": "JHPHCSAH019_GW1"
  },
  {
    "sno": 590,
    "district": "Sahebganj",
    "facility_name": "UPHC Chota Pachgarh-PHC",
    "facility_type": "PHC",
    "Lat ": 25.231,
    "longitude": 87.631,
    "facility_code": "JHPHCSAH020_GW1"
  },
  {
    "sno": 591,
    "district": "Saraikela Kharsawan",
    "facility_name": "Saraikela Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 22.7,
    "longitude": 85.92,
    "facility_code": "JHDHSKH001_GW1"
  },
  {
    "sno": 592,
    "district": "Saraikela Kharsawan",
    "facility_name": "ESIC Hospital, Adityapur-SDH",
    "facility_type": "SDH",
    "Lat ": 22.7959,
    "longitude": 86.1525,
    "facility_code": "JHSDHSKH002_GW1"
  },
  {
    "sno": 593,
    "district": "Saraikela Kharsawan",
    "facility_name": "Chandil-SDH",
    "facility_type": "SDH",
    "Lat ": 22.95,
    "longitude": 86.05,
    "facility_code": "JHSDHSKH003_GW1"
  },
  {
    "sno": 594,
    "district": "Saraikela Kharsawan",
    "facility_name": "Gamharia-CHC",
    "facility_type": "CHC",
    "Lat ": 22.8,
    "longitude": 86.1,
    "facility_code": "JHCHCSKH004_GW1"
  },
  {
    "sno": 595,
    "district": "Saraikela Kharsawan",
    "facility_name": "Rajnagar-CHC",
    "facility_type": "CHC",
    "Lat ": 22.62,
    "longitude": 86.01,
    "facility_code": "JHCHCSKH005_GW1"
  },
  {
    "sno": 596,
    "district": "Saraikela Kharsawan",
    "facility_name": "Ichagarh-CHC",
    "facility_type": "CHC",
    "Lat ": 23.0,
    "longitude": 85.95,
    "facility_code": "JHCHCSKH006_GW1"
  },
  {
    "sno": 597,
    "district": "Saraikela Kharsawan",
    "facility_name": "Kharsawan-CHC",
    "facility_type": "CHC",
    "Lat ": 22.78,
    "longitude": 85.82,
    "facility_code": "JHCHCSKH007_GW1"
  },
  {
    "sno": 598,
    "district": "Saraikela Kharsawan",
    "facility_name": "Kuchai-CHC",
    "facility_type": "CHC",
    "Lat ": 22.85,
    "longitude": 85.73,
    "facility_code": "JHCHCSKH008_GW1"
  },
  {
    "sno": 599,
    "district": "Saraikela Kharsawan",
    "facility_name": "Nimdih-CHC",
    "facility_type": "CHC",
    "Lat ": 23.0,
    "longitude": 86.133,
    "facility_code": "JHCHCSKH009_GW1"
  },
  {
    "sno": 600,
    "district": "Saraikela Kharsawan",
    "facility_name": "Saraikela Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCSKH010_GW1"
  },
  {
    "sno": 601,
    "district": "Saraikela Kharsawan",
    "facility_name": "ESI Dispensary, Adityapur-PHC",
    "facility_type": "PHC",
    "Lat ": 22.79809,
    "longitude": 86.13279,
    "facility_code": "JHPHCSKH011_GW1"
  },
  {
    "sno": 602,
    "district": "Saraikela Kharsawan",
    "facility_name": "ESI Dispensary, Gamharia-PHC",
    "facility_type": "PHC",
    "Lat ": 22.81566,
    "longitude": 86.10762,
    "facility_code": "JHPHCSKH012_GW1"
  },
  {
    "sno": 603,
    "district": "Saraikela Kharsawan",
    "facility_name": "ESI Dispensary, Kandra-PHC",
    "facility_type": "PHC",
    "Lat ": 22.85446,
    "longitude": 86.04845,
    "facility_code": "JHPHCSKH013_GW1"
  },
  {
    "sno": 604,
    "district": "Saraikela Kharsawan",
    "facility_name": "Hudu-PHC",
    "facility_type": "PHC",
    "Lat ": 22.76184,
    "longitude": 85.96128,
    "facility_code": "JHPHCSKH014_GW1"
  },
  {
    "sno": 605,
    "district": "Saraikela Kharsawan",
    "facility_name": "UPHC Adityapur-PHC",
    "facility_type": "PHC",
    "Lat ": 22.78572,
    "longitude": 86.16271,
    "facility_code": "JHPHCSKH015_GW1"
  },
  {
    "sno": 606,
    "district": "Saraikela Kharsawan",
    "facility_name": "UPHC Krishnapuri-PHC",
    "facility_type": "PHC",
    "Lat ": 22.79714,
    "longitude": 86.13187,
    "facility_code": "JHPHCSKH016_GW1"
  },
  {
    "sno": 607,
    "district": "Saraikela Kharsawan",
    "facility_name": "UPHC Sapada-PHC",
    "facility_type": "PHC",
    "Lat ": 22.79953,
    "longitude": 86.12068,
    "facility_code": "JHPHCSKH017_GW1"
  },
  {
    "sno": 608,
    "district": "Saraikela Kharsawan",
    "facility_name": "Chowka-PHC",
    "facility_type": "PHC",
    "Lat ": 22.91955,
    "longitude": 86.05374,
    "facility_code": "JHPHCSKH018_GW1"
  },
  {
    "sno": 609,
    "district": "Saraikela Kharsawan",
    "facility_name": "Chowlibasa-PHC",
    "facility_type": "PHC",
    "Lat ": 22.9582,
    "longitude": 85.96416,
    "facility_code": "JHPHCSKH019_GW1"
  },
  {
    "sno": 610,
    "district": "Saraikela Kharsawan",
    "facility_name": "UPHC Ghous Nagar-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCSKH020_GW1"
  },
  {
    "sno": 611,
    "district": "Saraikela Kharsawan",
    "facility_name": "Brahman Kutumb-PHC",
    "facility_type": "PHC",
    "Lat ": 22.62808,
    "longitude": 86.12127,
    "facility_code": "JHPHCSKH021_GW1"
  },
  {
    "sno": 612,
    "district": "Saraikela Kharsawan",
    "facility_name": "Chaliyama-PHC",
    "facility_type": "PHC",
    "Lat ": 22.56592,
    "longitude": 86.05411,
    "facility_code": "JHPHCSKH022_GW1"
  },
  {
    "sno": 613,
    "district": "Saraikela Kharsawan",
    "facility_name": "Govindpur-PHC",
    "facility_type": "PHC",
    "Lat ": 22.63337,
    "longitude": 86.0693,
    "facility_code": "JHPHCSKH023_GW1"
  },
  {
    "sno": 614,
    "district": "Saraikela Kharsawan",
    "facility_name": "Tiruldih-PHC",
    "facility_type": "PHC",
    "Lat ": 23.01973,
    "longitude": 85.96808,
    "facility_code": "JHPHCSKH024_GW1"
  },
  {
    "sno": 615,
    "district": "Saraikela Kharsawan",
    "facility_name": "Hunterpathardih-PHC",
    "facility_type": "PHC",
    "Lat ": 22.98967,
    "longitude": 86.14441,
    "facility_code": "JHPHCSKH025_GW1"
  },
  {
    "sno": 616,
    "district": "Saraikela Kharsawan",
    "facility_name": "Mangudih-PHC",
    "facility_type": "PHC",
    "Lat ": 22.79366,
    "longitude": 85.77948,
    "facility_code": "JHPHCSKH026_GW1"
  },
  {
    "sno": 617,
    "district": "Saraikela Kharsawan",
    "facility_name": "Sini-PHC",
    "facility_type": "PHC",
    "Lat ": 22.78612,
    "longitude": 85.94834,
    "facility_code": "JHPHCSKH027_GW1"
  },
  {
    "sno": 618,
    "district": "Simdega",
    "facility_name": "Simdega Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 22.6167,
    "longitude": 84.5167,
    "facility_code": "JHDHSIM001_GW1"
  },
  {
    "sno": 619,
    "district": "Simdega",
    "facility_name": "Bano-CHC",
    "facility_type": "CHC",
    "Lat ": 22.652,
    "longitude": 84.91842,
    "facility_code": "JHCHCSIM002_GW1"
  },
  {
    "sno": 620,
    "district": "Simdega",
    "facility_name": "Bolba-CHC",
    "facility_type": "CHC",
    "Lat ": 22.42931,
    "longitude": 84.34781,
    "facility_code": "JHCHCSIM003_GW1"
  },
  {
    "sno": 621,
    "district": "Simdega",
    "facility_name": "Jaldega-CHC",
    "facility_type": "CHC",
    "Lat ": 22.56765,
    "longitude": 84.81117,
    "facility_code": "JHCHCSIM004_GW1"
  },
  {
    "sno": 622,
    "district": "Simdega",
    "facility_name": "Kolebira-CHC",
    "facility_type": "CHC",
    "Lat ": 22.69821,
    "longitude": 84.69896,
    "facility_code": "JHCHCSIM005_GW1"
  },
  {
    "sno": 623,
    "district": "Simdega",
    "facility_name": "Kurdeg-CHC",
    "facility_type": "CHC",
    "Lat ": 22.5454,
    "longitude": 84.11976,
    "facility_code": "JHCHCSIM006_GW1"
  },
  {
    "sno": 624,
    "district": "Simdega",
    "facility_name": "Simdega Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHCHCSIM007_GW1"
  },
  {
    "sno": 625,
    "district": "Simdega",
    "facility_name": "Thetaitanger-CHC",
    "facility_type": "CHC",
    "Lat ": 22.49991,
    "longitude": 84.51435,
    "facility_code": "JHCHCSIM008_GW1"
  },
  {
    "sno": 626,
    "district": "Simdega",
    "facility_name": "Hurda-PHC",
    "facility_type": "PHC",
    "Lat ": 22.5049,
    "longitude": 85.03634,
    "facility_code": "JHPHCSIM009_GW1"
  },
  {
    "sno": 627,
    "district": "Simdega",
    "facility_name": "Bansjor-PHC",
    "facility_type": "PHC",
    "Lat ": 22.43269,
    "longitude": 84.72633,
    "facility_code": "JHPHCSIM010_GW1"
  },
  {
    "sno": 628,
    "district": "Simdega",
    "facility_name": "Lachragarh-PHC",
    "facility_type": "PHC",
    "Lat ": 22.64071,
    "longitude": 84.86591,
    "facility_code": "JHPHCSIM011_GW1"
  },
  {
    "sno": 629,
    "district": "Simdega",
    "facility_name": "Kinkel-PHC",
    "facility_type": "PHC",
    "Lat ": 22.63,
    "longitude": 84.24,
    "facility_code": "JHPHCSIM012_GW1"
  },
  {
    "sno": 630,
    "district": "Simdega",
    "facility_name": "Sewai-PHC",
    "facility_type": "PHC",
    "Lat ": 22.65066,
    "longitude": 84.32265,
    "facility_code": "JHPHCSIM013_GW1"
  },
  {
    "sno": 631,
    "district": "Simdega",
    "facility_name": "UPHC Thakurtoli-PHC",
    "facility_type": "PHC",
    "Lat ": 0.0,
    "longitude": 0.0,
    "facility_code": "JHPHCSIM014_GW1"
  },
  {
    "sno": 632,
    "district": "Simdega",
    "facility_name": "Bombelkera-PHC",
    "facility_type": "PHC",
    "Lat ": 22.59,
    "longitude": 84.63,
    "facility_code": "JHPHCSIM015_GW1"
  },
  {
    "sno": 633,
    "district": "Simdega",
    "facility_name": "Salgaposh-PHC",
    "facility_type": "PHC",
    "Lat ": 22.44,
    "longitude": 84.41,
    "facility_code": "JHPHCSIM016_GW1"
  },
  {
    "sno": 634,
    "district": "West Singhbhum",
    "facility_name": "Pashchimi Singhbhum Sadar Hospital-DH",
    "facility_type": "DH",
    "Lat ": 22.55052,
    "longitude": 85.80548,
    "facility_code": "JHDHWSB001_GW1"
  },
  {
    "sno": 635,
    "district": "West Singhbhum",
    "facility_name": "Chakradharpur-SDH",
    "facility_type": "SDH",
    "Lat ": 22.67655,
    "longitude": 85.6255,
    "facility_code": "JHSDHWSB002_GW1"
  },
  {
    "sno": 636,
    "district": "West Singhbhum",
    "facility_name": "Bandgaon-CHC",
    "facility_type": "CHC",
    "Lat ": 22.86336,
    "longitude": 85.33098,
    "facility_code": "JHCHCWSB003_GW1"
  },
  {
    "sno": 637,
    "district": "West Singhbhum",
    "facility_name": "Chaibasa Sadar-CHC",
    "facility_type": "CHC",
    "Lat ": 22.54582,
    "longitude": 85.80496,
    "facility_code": "JHCHCWSB004_GW1"
  },
  {
    "sno": 638,
    "district": "West Singhbhum",
    "facility_name": "Goilkera-CHC",
    "facility_type": "CHC",
    "Lat ": 22.50954,
    "longitude": 85.3774,
    "facility_code": "JHCHCWSB005_GW1"
  },
  {
    "sno": 639,
    "district": "West Singhbhum",
    "facility_name": "Jaganathpur-CHC",
    "facility_type": "CHC",
    "Lat ": 22.21888,
    "longitude": 85.64048,
    "facility_code": "JHCHCWSB006_GW1"
  },
  {
    "sno": 640,
    "district": "West Singhbhum",
    "facility_name": "Jhinkpani-CHC",
    "facility_type": "CHC",
    "Lat ": 22.39251,
    "longitude": 85.79229,
    "facility_code": "JHCHCWSB007_GW1"
  },
  {
    "sno": 641,
    "district": "West Singhbhum",
    "facility_name": "Khuntpani-CHC",
    "facility_type": "CHC",
    "Lat ": 22.64459,
    "longitude": 85.80717,
    "facility_code": "JHCHCWSB008_GW1"
  },
  {
    "sno": 642,
    "district": "West Singhbhum",
    "facility_name": "Kumardungi-CHC",
    "facility_type": "CHC",
    "Lat ": 22.21553,
    "longitude": 85.87856,
    "facility_code": "JHCHCWSB009_GW1"
  },
  {
    "sno": 643,
    "district": "West Singhbhum",
    "facility_name": "Majhgaon-CHC",
    "facility_type": "CHC",
    "Lat ": 22.09321,
    "longitude": 85.88323,
    "facility_code": "JHCHCWSB010_GW1"
  },
  {
    "sno": 644,
    "district": "West Singhbhum",
    "facility_name": "Manjhari-CHC",
    "facility_type": "CHC",
    "Lat ": 22.33525,
    "longitude": 85.92961,
    "facility_code": "JHCHCWSB011_GW1"
  },
  {
    "sno": 645,
    "district": "West Singhbhum",
    "facility_name": "Manoharpur-CHC",
    "facility_type": "CHC",
    "Lat ": 22.37302,
    "longitude": 85.19718,
    "facility_code": "JHCHCWSB012_GW1"
  },
  {
    "sno": 646,
    "district": "West Singhbhum",
    "facility_name": "Barajamda Referral Hospital-CHC",
    "facility_type": "CHC",
    "Lat ": 22.16692,
    "longitude": 85.42383,
    "facility_code": "JHCHCWSB013_GW1"
  },
  {
    "sno": 647,
    "district": "West Singhbhum",
    "facility_name": "Sonua-CHC",
    "facility_type": "CHC",
    "Lat ": 22.5709,
    "longitude": 85.46076,
    "facility_code": "JHCHCWSB014_GW1"
  },
  {
    "sno": 648,
    "district": "West Singhbhum",
    "facility_name": "Tantnagar-CHC",
    "facility_type": "CHC",
    "Lat ": 22.45245,
    "longitude": 85.94424,
    "facility_code": "JHCHCWSB015_GW1"
  },
  {
    "sno": 649,
    "district": "West Singhbhum",
    "facility_name": "Tonto-CHC",
    "facility_type": "CHC",
    "Lat ": 22.352,
    "longitude": 85.926,
    "facility_code": "JHCHCWSB016_GW1"
  },
  {
    "sno": 650,
    "district": "West Singhbhum",
    "facility_name": "Dudhkundi-PHC",
    "facility_type": "PHC",
    "Lat ": 22.68312,
    "longitude": 85.70383,
    "facility_code": "JHPHCWSB017_GW1"
  },
  {
    "sno": 651,
    "district": "West Singhbhum",
    "facility_name": "Karaikela-PHC",
    "facility_type": "PHC",
    "Lat ": 22.87024,
    "longitude": 85.32716,
    "facility_code": "JHPHCWSB018_GW1"
  },
  {
    "sno": 652,
    "district": "West Singhbhum",
    "facility_name": "UPHC Hind Chwok-PHC",
    "facility_type": "PHC",
    "Lat ": 22.5474,
    "longitude": 85.81727,
    "facility_code": "JHPHCWSB019_GW1"
  },
  {
    "sno": 653,
    "district": "West Singhbhum",
    "facility_name": "Hathiya-PHC",
    "facility_type": "PHC",
    "Lat ": 22.69901,
    "longitude": 85.62135,
    "facility_code": "JHPHCWSB020_GW1"
  },
  {
    "sno": 654,
    "district": "West Singhbhum",
    "facility_name": "UPHC Banglatand-PHC",
    "facility_type": "PHC",
    "Lat ": 22.67655,
    "longitude": 85.6255,
    "facility_code": "JHPHCWSB021_GW1"
  },
  {
    "sno": 655,
    "district": "West Singhbhum",
    "facility_name": "Jaitgarh-PHC",
    "facility_type": "PHC",
    "Lat ": 22.22,
    "longitude": 85.66,
    "facility_code": "JHPHCWSB022_GW1"
  },
  {
    "sno": 656,
    "district": "West Singhbhum",
    "facility_name": "Hatgamria-PHC",
    "facility_type": "PHC",
    "Lat ": 22.26976,
    "longitude": 85.74001,
    "facility_code": "JHPHCWSB023_GW1"
  },
  {
    "sno": 657,
    "district": "West Singhbhum",
    "facility_name": "Anandpur-PHC",
    "facility_type": "PHC",
    "Lat ": 22.47,
    "longitude": 85.18,
    "facility_code": "JHPHCWSB024_GW1"
  },
  {
    "sno": 658,
    "district": "West Singhbhum",
    "facility_name": "Chotanagra-PHC",
    "facility_type": "PHC",
    "Lat ": 22.24144,
    "longitude": 85.29802,
    "facility_code": "JHPHCWSB025_GW1"
  },
  {
    "sno": 659,
    "district": "West Singhbhum",
    "facility_name": "Jarikela-PHC",
    "facility_type": "PHC",
    "Lat ": 22.41,
    "longitude": 85.2,
    "facility_code": "JHPHCWSB026_GW1"
  },
  {
    "sno": 660,
    "district": "West Singhbhum",
    "facility_name": "Jetia-PHC",
    "facility_type": "PHC",
    "Lat ": 22.2,
    "longitude": 85.53,
    "facility_code": "JHPHCWSB027_GW1"
  },
  {
    "sno": 661,
    "district": "West Singhbhum",
    "facility_name": "Nowamundi-PHC",
    "facility_type": "PHC",
    "Lat ": 22.1574,
    "longitude": 85.50844,
    "facility_code": "JHPHCWSB028_GW1"
  },
  {
    "sno": 662,
    "district": "West Singhbhum",
    "facility_name": "Kharimati-PHC",
    "facility_type": "PHC",
    "Lat ": 22.56378,
    "longitude": 85.4195,
    "facility_code": "JHPHCWSB029_GW1"
  },
  {
    "sno": 663,
    "district": "West Singhbhum",
    "facility_name": "Kathbhari-PHC",
    "facility_type": "PHC",
    "Lat ": 22.37729,
    "longitude": 86.01471,
    "facility_code": "JHPHCWSB030_GW1"
  },
  {
    "sno": 664,
    "district": "West Singhbhum",
    "facility_name": "Jangalhat-PHC",
    "facility_type": "PHC",
    "Lat ": 22.34,
    "longitude": 85.42,
    "facility_code": "JHPHCWSB031_GW1"
  },
  {
    "sno": 665,
    "district": "West Singhbhum",
    "facility_name": "Tonto Gram-PHC",
    "facility_type": "PHC",
    "Lat ": 22.349,
    "longitude": 85.363,
    "facility_code": "JHPHCWSB032_GW1"
  },
  {
    "sno": 666,
    "district": "West Singhbhum",
    "facility_name": "Tonto H.Q.-PHC",
    "facility_type": "PHC",
    "Lat ": 22.39111,
    "longitude": 85.60502,
    "facility_code": "JHPHCWSB033_GW1"
  }
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Create default admin
  const adminPwd = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
  const adminExists = await User.findOne({ email: 'admin@jhhealthwifi.gov.in' });
  if (!adminExists) {
    await User.create({
      name: 'System Admin',
      email: 'admin@jhhealthwifi.gov.in',
      password: adminPwd,
      role: 'admin'
    });
    console.log(`✅ Admin user created: admin@jhhealthwifi.gov.in / ${adminPwd}`);
  } else {
    console.log('ℹ️  Admin already exists');
  }

  // Create sample engineer
  const engPwd = process.env.SEED_ENGINEER_PASSWORD || 'Eng@1234';
  const engExists = await User.findOne({ email: 'engineer1@jhhealthwifi.gov.in' });
  if (!engExists) {
    await User.create({
      name: 'Rajesh Kumar',
      email: 'engineer1@jhhealthwifi.gov.in',
      password: engPwd,
      role: 'engineer',
      assignedDistricts: ['Bokaro', 'Dhanbad']
    });
    console.log(`✅ Engineer created: engineer1@jhhealthwifi.gov.in / ${engPwd}`);
  }

  // Seed facilities
  if (facilities.length > 0) {
    await Facility.deleteMany({});
    await Facility.insertMany(facilities);
    console.log(`✅ ${facilities.length} facilities seeded`);
  }

  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch(console.error);
