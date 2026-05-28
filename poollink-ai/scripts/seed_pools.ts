import { db } from '../src/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const pools = [
  // CITY OF CALGARY INDOOR
  {
    id: "renfrew",
    name: "Renfrew Aquatic Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "1311 8 Ave NE, Calgary, AB T2E 0T2",
    lat: 51.0593,
    lng: -114.0326,
    type: "Indoor",
    features: ["Swimming Pool", "Dive Pool", "Fitness Centre", "Steam Room"],
    description: "Centrally located in Renfrew, this aquatic centre offers a variety of public swimming sessions and fitness classes.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/RenfrewDropIn"
  },
  {
    id: "bob-bahan",
    name: "Bob Bahan Aquatic Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "4812 14 Ave SE, Calgary, AB T2A 0K4",
    lat: 51.0401,
    lng: -113.9634,
    type: "Indoor",
    features: ["Swimming Pool", "Dive Pool", "Weights", "Hot Tub"],
    description: "A community hub in the SE, Bob Bahan offers classic aquatic experiences for all ages.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/BobBahanDropIn"
  },
  {
    id: "canyon-meadows",
    name: "Canyon Meadows Aquatic Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "89 Can-400 Plaza Canyon Meadows Dr SW, Calgary, AB T2W 0K4",
    lat: 50.9382,
    lng: -114.0754,
    type: "Indoor",
    features: ["Salt Water Pool", "Dive Pool", "Fitness Centre"],
    description: "Featuring a cleaner salt-water system, Canyon Meadows is a favorite in the deep south.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/CanyonMeadowsDropIn"
  },
  {
    id: "killarney",
    name: "Killarney Aquatic & Fitness Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "1917 29 St SW, Calgary, AB T3E 2J7",
    lat: 51.0365,
    lng: -114.1258,
    type: "Indoor",
    features: ["Swimming Pool", "Dive Pool", "Fitness Centre", "Steam Room"],
    description: "A vibrant fitness hub in the heart of Killarney, popular with lane swimmers.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/KillarneyDropIn"
  },

  {
    id: "acadia",
    name: "Acadia Aquatic & Fitness Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "9009 Fairmount Dr SE, Calgary, AB T2H 0Z4",
    lat: 50.9714,
    lng: -114.0484,
    type: "Indoor",
    features: ["Swimming Pool", "Dive Pool", "Fitness Centre"],
    description: "A dedicated community facility in the SE with a focus on swim lessons and open swim.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/AcadiaDropIn"
  },
  {
    id: "foothills",
    name: "Foothills Aquatic Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "2915 24 Ave NW, Calgary, AB T2N 4H9",
    lat: 51.0744,
    lng: -114.1284,
    type: "Indoor",
    features: ["Swimming Pool", "Dive Pool", "Fitness Centre"],
    description: "Providing essential aquatic services to the university area and NW Calgary.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/FoothillsDropIn"
  },
  {
    id: "glenmore",
    name: "Glenmore Aquatic Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "5330 19 St SW, Calgary, AB T3E 1P2",
    lat: 51.0094,
    lng: -114.1028,
    type: "Indoor",
    features: ["Swimming Pool", "Hot Tub", "Steam Room", "Weight Room"],
    description: "Located in the SW, Glenmore offers a quiet atmosphere for lane swimming and relaxing.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/GlenmoreDropIn"
  },
  {
    id: "inglewood",
    name: "Inglewood Aquatic Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "1527 17 Ave SE, Calgary, AB T2G 1J9",
    lat: 51.0374,
    lng: -114.0252,
    type: "Indoor",
    features: ["Swimming Pool", "Climbing Wall", "Fitness Centre"],
    description: "A charming historic pool in Inglewood featuring a climbing wall over the water.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/InglewoodDropIn"
  },
  {
    id: "shouldice",
    name: "Shouldice Aquatic Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "5303 Bowness Rd NW, Calgary, AB T3B 1C4",
    lat: 51.0694,
    lng: -114.1684,
    type: "Indoor",
    features: ["Swimming Pool", "Dive Pool", "Steam Room"],
    description: "A specialized aquatic facility known for its diving boards and deep-water training options.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/ShouldiceDropIn"
  },
  {
    id: "sir-winston-churchill",
    name: "Sir Winston Churchill Aquatic & Recreation Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "1520 Northmount Dr NW, Calgary, AB T2L 0G6",
    lat: 51.0964,
    lng: -114.1352,
    type: "Indoor",
    features: ["Swimming Pool", "Pickleball", "Fitness Centre"],
    description: "Located near the high school, this centre is a staple for competitive training and public recreation.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/SirWinstonChurchillDropIn"
  },
  {
    id: "thornhill",
    name: "Thornhill Aquatic & Recreation Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "6715 Centre St NW, Calgary, AB T2K 4Y5",
    lat: 51.1124,
    lng: -114.0628,
    type: "Indoor",
    features: ["Swimming Pool", "Hot Tub", "Fitness Centre", "Gymnasium"],
    description: "A major hub for the north-central communities with a focus on family swimming and fitness.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/ThornhillDropIn"
  },

  // LEISURE CENTRES
  {
    id: "southland",
    name: "Southland Leisure Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "2000 Southland Dr SW, Calgary, AB T2W 0K4",
    lat: 50.9632,
    lng: -114.1084,
    type: "Leisure Centre",
    features: ["Wave Pool", "Water Slides", "Steam Room", "Skating Rinks"],
    description: "One of Calgary's premier leisure centres, famous for its massive wave pool and twin water slides.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/SouthlandLeisureDropIn"
  },
  {
    id: "village-square",
    name: "Village Square Leisure Centre",
    operator: "City of Calgary",
    location: "Calgary, AB",
    address: "2623 56 St NE, Calgary, AB T1Y 6E7",
    lat: 51.0772,
    lng: -113.9534,
    type: "Leisure Centre",
    features: ["Wave Pool", "Safari Theme Splash Park", "Dive Pool", "Gym"],
    description: "A massive safari-themed water park and wave pool in the NE, perfect for families.",
    scheduleUrl: "https://liveandplay.calgary.ca/REGPROG/public/category/browse/VillageSquareLeisureDropIn"
  },

  // YMCA
  {
    id: "ymca-brookfield",
    name: "Brookfield Residential YMCA at Seton",
    operator: "YMCA",
    location: "Calgary, AB",
    address: "4995 Market St SE, Calgary, AB T3M 2P9",
    lat: 50.8805,
    lng: -113.9352,
    type: "Indoor",
    features: ["Competition Pool", "FlowRider", "Leisure Pool", "Library"],
    description: "One of the largest YMCAs in the world, featuring a massive aquatic park and surf simulator.",
    scheduleUrl: "https://www.ymcacalgary.org/locations/brookfield-residential-ymca-seton"
  },
  {
    id: "ymca-shane-homes",
    name: "Shane Homes YMCA at Rocky Ridge",
    operator: "YMCA",
    location: "Calgary, AB",
    address: "11300 Rocky Ridge Rd NW, Calgary, AB T3G 5H3",
    lat: 51.1542,
    lng: -114.2384,
    type: "Indoor",
    features: ["8-lane Pool", "Wave Pool", "Waterslide", "Climbing Wall"],
    description: "Iconic curved architecture in the NW, housing a full wave pool and competition lanes.",
    scheduleUrl: "https://www.ymcacalgary.org/locations/shane-homes-ymca-rocky-ridge"
  },
  {
    id: "ymca-remington",
    name: "Remington YMCA at Quarry Park",
    operator: "YMCA",
    location: "Calgary, AB",
    address: "108 Quarry Park Rd SE, Calgary, AB T2C 5R1",
    lat: 50.9635,
    lng: -114.0042,
    type: "Indoor",
    features: ["Lap Pool", "Leisure Pool", "Fitness Centre", "Childcare"],
    description: "Modern facility serving the Quarry Park business and residential districts.",
    scheduleUrl: "https://www.ymcacalgary.org/locations/remington-ymca-quarry-park"
  },

  // MNP
  {
    id: "mnp-centre",
    name: "MNP Community & Sport Centre",
    operator: "MNP",
    location: "Calgary, AB",
    address: "2225 Macleod Trail SW, Calgary, AB T2G 5B6",
    lat: 51.0335,
    lng: -114.0592,
    type: "Indoor",
    features: ["Two 50m Pools", "Dive Tank", "Tracks", "Huge Gym"],
    description: "Formerly Talisman Centre, this is Calgary's elite aquatic training facility with world-class pools.",
    scheduleUrl: "https://mnpcentre.com/schedules"
  },

  // OUTDOOR POOLS
  {
    id: "silver-springs",
    name: "Silver Springs Outdoor Pool",
    operator: "Community Association",
    location: "Calgary, AB",
    address: "5720 Silver Ridge Dr NW, Calgary, AB T3B 5E5",
    lat: 51.1042,
    lng: -114.1842,
    type: "Outdoor",
    features: ["Lanes", "Slide", "Grassy Area"],
    description: "A beloved summer spot in the NW, operated by the community association through COSPA.",
    scheduleUrl: "https://www.silverspringscommunity.ca/pool"
  },
  {
    id: "highwood-pool",
    name: "Highwood Outdoor Pool",
    operator: "Community Association",
    location: "Calgary, AB",
    address: "25 Holmwood Ave NW, Calgary, AB T2K 2G5",
    lat: 51.0965,
    lng: -114.0784,
    type: "Outdoor",
    features: ["Heated Outdoor Pool", "Wading Pool"],
    description: "A community-run outdoor pool in Highwood, perfect for sunny Calgary afternoons.",
    scheduleUrl: "https://highwoodoutdoorpool.com/"
  },
  {
    id: "bowview",
    name: "Bowview Outdoor Pool",
    operator: "Community Association",
    location: "Calgary, AB",
    address: "1910 6 Ave NW, Calgary, AB T2N 0W3",
    lat: 51.0583,
    lng: -114.1084,
    type: "Outdoor",
    features: ["Main Pool", "Wading Pool", "Playground"],
    description: "A vibrant outdoor pool in Hillhurst Sunnyside, popular with families since the 1950s.",
    scheduleUrl: "https://www.bowviewoutdoorpool.ca/"
  },
  {
    id: "millican-ogden",
    name: "Millican Ogden Outdoor Pool",
    operator: "Community Association",
    location: "Calgary, AB",
    address: "6907 20A St SE, Calgary, AB T2C 0R1",
    lat: 51.0014,
    lng: -114.0152,
    type: "Outdoor",
    features: ["Outdoor Pool", "Picnic Area"],
    description: "A friendly community-operated pool in the SE with a large deck area for sunbathing.",
    scheduleUrl: "https://www.millicanogdencommunity.com/pool"
  },
  {
    id: "stanley-park",
    name: "Stanley Park Outdoor Pool",
    operator: "Community Association",
    location: "Calgary, AB",
    address: "4011 1A St SW, Calgary, AB T2S 1M3",
    lat: 51.0164,
    lng: -114.0652,
    type: "Outdoor",
    features: ["Outdoor Pool", "Wading Pool", "Concession"],
    description: "Iconic pool located within Stanley Park, offering a resort-like atmosphere in the city centre.",
    scheduleUrl: "https://www.stanleyparkoutdoorpool.ca/"
  },
  {
    id: "forest-lawn-outdoor",
    name: "Forest Lawn Outdoor Pool",
    operator: "Community Association",
    location: "Calgary, AB",
    address: "1706 39 St SE, Calgary, AB T2A 1G9",
    lat: 51.0374,
    lng: -113.9784,
    type: "Outdoor",
    features: ["Outdoor Pool", "Lanes", "Slide"],
    description: "Serving the Forest Lawn community, this pool is a key summer destination in the East.",
    scheduleUrl: "https://www.forestlawnoutdoorpool.ca/"
  },
  {
    id: "south-calgary",
    name: "South Calgary Outdoor Pool",
    operator: "Community Association",
    location: "Calgary, AB",
    address: "3130 16 St SW, Calgary, AB T2T 4G7",
    lat: 51.0254,
    lng: -114.0984,
    type: "Outdoor",
    features: ["Large Pool", "Lanes", "Diving Board"],
    description: "A high-capacity outdoor pool in Marda Loop, known for its deep end and diving facilities.",
    scheduleUrl: "https://www.southcalgaryoutdoorpool.ca/"
  },
  {
    id: "mount-pleasant",
    name: "Mount Pleasant Outdoor Pool",
    operator: "Community Association",
    location: "Calgary, AB",
    address: "2310 6 St NW, Calgary, AB T2M 3E6",
    lat: 51.0734,
    lng: -114.0752,
    type: "Outdoor",
    features: ["Outdoor Pool", "Lanes", "Slide"],
    description: "A popular NW outdoor pool located in the heart of Mount Pleasant, featuring a large basin and an exciting slide.",
    scheduleUrl: "https://www.mountpleasantoutdoorpool.ca/"
  }
];

async function seed() {
  console.log("Seeding pools...");
  for (const pool of pools) {
    try {
      await setDoc(doc(db, "pools", pool.id), pool);
      console.log(`Seeded ${pool.name}`);
    } catch (error) {
      console.error(`Error seeding ${pool.name}:`, error);
    }
  }
  process.exit(0);
}

seed();
